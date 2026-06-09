const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const LEADERBOARD_FILE = path.join(DATA_DIR, "leaderboard.json");
const MAX_ENTRIES = 50;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function ensureDataFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LEADERBOARD_FILE)) {
    fs.writeFileSync(LEADERBOARD_FILE, "[]", "utf8");
  }
}

function readLeaderboard() {
  ensureDataFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Leaderboard file was reset because it could not be parsed.", error);
    fs.writeFileSync(LEADERBOARD_FILE, "[]", "utf8");
    return [];
  }
}

function writeLeaderboard(entries) {
  ensureDataFile();
  const sorted = entries
    .filter(entry => entry && entry.name && Number.isFinite(entry.score))
    .sort((a, b) => b.score - a.score || b.wave - a.wave || b.kills - a.kills)
    .slice(0, MAX_ENTRIES);
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(sorted, null, 2), "utf8");
  return sorted;
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 20_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function sanitizeName(value) {
  return String(value || "")
    .replace(/[^\p{L}\p{N}_ .-]/gu, "")
    .trim()
    .slice(0, 18) || "Survivor";
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const cleanPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, cleanPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/leaderboard" && req.method === "GET") {
      sendJson(res, 200, { entries: readLeaderboard().slice(0, 10) });
      return;
    }

    if (url.pathname === "/api/leaderboard" && req.method === "POST") {
      const body = await readRequestBody(req);
      const payload = JSON.parse(body || "{}");
      const entry = {
        name: sanitizeName(payload.name),
        score: Math.max(0, Math.floor(Number(payload.score) || 0)),
        wave: Math.max(0, Math.floor(Number(payload.wave) || 0)),
        kills: Math.max(0, Math.floor(Number(payload.kills) || 0)),
        time: Math.max(0, Math.floor(Number(payload.time) || 0)),
        createdAt: new Date().toISOString()
      };
      const entries = writeLeaderboard([...readLeaderboard(), entry]);
      sendJson(res, 201, { ok: true, entries: entries.slice(0, 10) });
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Server error" });
  }
});

server.listen(PORT, () => {
  ensureDataFile();
  console.log(`Dead Zone server running on http://localhost:${PORT}`);
  console.log(`Leaderboard data: ${LEADERBOARD_FILE}`);
});
