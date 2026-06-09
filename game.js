(() => {
  "use strict";

  // Canvas setup
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const minimap = document.getElementById("minimap");
  const miniCtx = minimap.getContext("2d");

  const SAVE_KEY = "deadZoneNeonOutbreakSave";
  const STATES = {
    MENU: "mainMenu",
    PLAYING: "playing",
    PAUSED: "paused",
    SHOP: "shop",
    BREAK: "waveBreak",
    GAME_OVER: "gameOver"
  };

  const QUALITY = {
    low: { particles: 150, decorDensity: 0.55, fog: 0.42 },
    medium: { particles: 290, decorDensity: 0.9, fog: 0.35 },
    high: { particles: 470, decorDensity: 1.15, fog: 0.3 }
  };

  const MAP_TIERS = [
    { maxWave: 5, size: 1000 },
    { maxWave: 10, size: 2000 },
    { maxWave: Infinity, size: 3000 }
  ];

  const MAP = { width: 1000, height: 1000, tile: 96 };
  const PI2 = Math.PI * 2;

  let state = STATES.MENU;
  let previousState = STATES.PLAYING;
  let activeShopTab = "weapons";
  let lastTime = 0;
  let gameTime = 0;
  let survivalTime = 0;
  let damageFlash = 0;
  let screenShake = 0;
  let hitStop = 0;
  let slowMotion = 0;
  let minimapVisible = true;
  let bannerTimer = 0;
  let bannerText = "";
  let worldReady = false;
  let currentMapSize = 1000;
  let playerName = "";
  let leaderboardData = [];

  const camera = { x: 0, y: 0, width: 0, height: 0, offsetX: 0, offsetY: 0 };
  const world = {
    obstacles: [],
    decor: [],
    roads: [],
    lights: [],
    spawnHoles: [],
    barrels: [],
    supplyCrates: [],
    hazardZones: []
  };

  let player = null;
  let projectiles = [];
  let zombies = [];
  let pickups = [];
  let particles = [];
  let floatingTexts = [];
  let areaEffects = [];
  let turrets = [];
  let landmines = [];
  let drones = [];
  let toastQueue = [];
  const touchInput = {
    active: false,
    stickId: null,
    stickX: 0,
    stickY: 0,
    stickCenterX: 0,
    stickCenterY: 0,
    firing: false,
    usingTouch: false
  };

  const dom = {
    hud: document.getElementById("hud"),
    hpBar: document.getElementById("hpBar"),
    hpText: document.getElementById("hpText"),
    armorBar: document.getElementById("armorBar"),
    armorText: document.getElementById("armorText"),
    staminaBar: document.getElementById("staminaBar"),
    staminaText: document.getElementById("staminaText"),
    moneyText: document.getElementById("moneyText"),
    scoreText: document.getElementById("scoreText"),
    killsText: document.getElementById("killsText"),
    waveText: document.getElementById("waveText"),
    zombiesLeftText: document.getElementById("zombiesLeftText"),
    waveTimerText: document.getElementById("waveTimerText"),
    bossHud: document.getElementById("bossHud"),
    bossName: document.getElementById("bossName"),
    bossBar: document.getElementById("bossBar"),
    weaponSlots: document.getElementById("weaponSlots"),
    weaponName: document.getElementById("weaponName"),
    ammoText: document.getElementById("ammoText"),
    reloadWrap: document.getElementById("reloadWrap"),
    reloadBar: document.getElementById("reloadBar"),
    grenadeSkill: document.getElementById("grenadeSkill"),
    mineSkill: document.getElementById("mineSkill"),
    turretSkill: document.getElementById("turretSkill"),
    medkitSkill: document.getElementById("medkitSkill"),
    muteButton: document.getElementById("muteButton"),
    centerBanner: document.getElementById("centerBanner"),
    toastLayer: document.getElementById("toastLayer"),
    mainMenu: document.getElementById("mainMenu"),
    howToPlayPanel: document.getElementById("howToPlayPanel"),
    settingsPanel: document.getElementById("settingsPanel"),
    shopOverlay: document.getElementById("shopOverlay"),
    shopMoney: document.getElementById("shopMoney"),
    shopItems: document.getElementById("shopItems"),
    pauseOverlay: document.getElementById("pauseOverlay"),
    gameOverOverlay: document.getElementById("gameOverOverlay"),
    playerNameInput: document.getElementById("playerNameInput"),
    nameError: document.getElementById("nameError"),
    leaderboardList: document.getElementById("leaderboardList"),
    leaderboardStatus: document.getElementById("leaderboardStatus"),
    refreshLeaderboardBtn: document.getElementById("refreshLeaderboardBtn"),
    mobileControls: document.getElementById("mobileControls"),
    mobileStick: document.getElementById("mobileStick"),
    mobileFire: document.getElementById("mobileFire"),
    mobileDash: document.getElementById("mobileDash"),
    mobileReload: document.getElementById("mobileReload"),
    mobileShop: document.getElementById("mobileShop"),
    mobileGrenade: document.getElementById("mobileGrenade"),
    mobileMedkit: document.getElementById("mobileMedkit"),
    menuBestScore: document.getElementById("menuBestScore"),
    menuBestWave: document.getElementById("menuBestWave"),
    menuTotalKills: document.getElementById("menuTotalKills"),
    qualitySelect: document.getElementById("qualitySelect"),
    settingsMuteBtn: document.getElementById("settingsMuteBtn"),
    pauseMuteBtn: document.getElementById("pauseMuteBtn"),
    finalWave: document.getElementById("finalWave"),
    finalScore: document.getElementById("finalScore"),
    finalKills: document.getElementById("finalKills"),
    finalTime: document.getElementById("finalTime"),
    finalBestScore: document.getElementById("finalBestScore")
  };

  // Utility functions
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (min, max) => min + Math.random() * (max - min);
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const dist = (a, b, c, d) => Math.hypot(a - c, b - d);
  const angleTo = (a, b, c, d) => Math.atan2(d - b, c - a);
  const chance = value => Math.random() < value;
  const formatMoney = value => `$${Math.floor(value)}`;
  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };
  const sanitizePlayerName = value => String(value || "")
    .replace(/[^\p{L}\p{N}_ .-]/gu, "")
    .trim()
    .slice(0, 18);
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));

  function resizeCanvas() {
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    camera.width = window.innerWidth;
    camera.height = window.innerHeight;
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // Save system
  const save = {
    data: {
      bestScore: 0,
      highestWave: 0,
      totalKills: 0,
      playerName: "",
      muted: false,
      quality: "medium",
      keybinds: {
        moveUp: "KeyW",
        moveLeft: "KeyA",
        moveDown: "KeyS",
        moveRight: "KeyD",
        reload: "KeyR",
        shop: "KeyB",
        dash: "Space"
      }
    },
    load() {
      try {
        const stored = JSON.parse(localStorage.getItem(SAVE_KEY));
        if (stored) this.data = { ...this.data, ...stored };
      } catch (error) {
        console.warn("Save data could not be loaded.", error);
      }
      dom.qualitySelect.value = this.data.quality;
      dom.playerNameInput.value = this.data.playerName || "";
      playerName = this.data.playerName || "";
      audio.muted = Boolean(this.data.muted);
      updateMenuStats();
      updateMuteButtons();
    },
    write() {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    },
    recordRun(score, wave, kills) {
      this.data.bestScore = Math.max(this.data.bestScore, Math.floor(score));
      this.data.highestWave = Math.max(this.data.highestWave, Math.floor(wave));
      this.data.totalKills += Math.floor(kills);
      this.write();
      updateMenuStats();
    }
  };

  const leaderboard = {
    localKey: "deadZoneLocalLeaderboard",
    async load() {
      try {
        const response = await fetch("/api/leaderboard", { cache: "no-store" });
        if (!response.ok) throw new Error("Leaderboard server unavailable");
        const data = await response.json();
        leaderboardData = Array.isArray(data.entries) ? data.entries : [];
        dom.leaderboardStatus.textContent = "Online leaderboard";
      } catch (error) {
        leaderboardData = this.readLocal();
        dom.leaderboardStatus.textContent = "Offline/local leaderboard";
      }
      this.render();
    },
    readLocal() {
      try {
        const stored = JSON.parse(localStorage.getItem(this.localKey));
        return Array.isArray(stored) ? stored : [];
      } catch (error) {
        return [];
      }
    },
    writeLocal(entry) {
      const entries = [...this.readLocal(), entry]
        .sort((a, b) => b.score - a.score || b.wave - a.wave || b.kills - a.kills)
        .slice(0, 10);
      localStorage.setItem(this.localKey, JSON.stringify(entries));
      leaderboardData = entries;
      this.render();
    },
    async submit(entry) {
      const cleanEntry = {
        name: sanitizePlayerName(entry.name),
        score: Math.max(0, Math.floor(entry.score || 0)),
        wave: Math.max(0, Math.floor(entry.wave || 0)),
        kills: Math.max(0, Math.floor(entry.kills || 0)),
        time: Math.max(0, Math.floor(entry.time || 0))
      };
      try {
        const response = await fetch("/api/leaderboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanEntry)
        });
        if (!response.ok) throw new Error("Leaderboard submit failed");
        const data = await response.json();
        leaderboardData = Array.isArray(data.entries) ? data.entries : [];
        dom.leaderboardStatus.textContent = "Score sent to online leaderboard";
        this.render();
      } catch (error) {
        this.writeLocal(cleanEntry);
        dom.leaderboardStatus.textContent = "Score saved locally because server is offline";
      }
    },
    render() {
      const entries = leaderboardData.slice(0, 10);
      if (!entries.length) {
        dom.leaderboardList.innerHTML = "<li><b>No scores yet</b><small>Be the first survivor</small><strong>0</strong></li>";
        return;
      }
      dom.leaderboardList.innerHTML = entries.map(entry => `
        <li>
          <span><b>${escapeHtml(entry.name || "Survivor")}</b><small>Wave ${Math.floor(entry.wave || 0)} / ${Math.floor(entry.kills || 0)} kills</small></span>
          <strong>${Math.floor(entry.score || 0)}</strong>
        </li>
      `).join("");
    }
  };

  // Input manager
  const input = {
    keys: new Set(),
    pressed: new Set(),
    released: new Set(),
    isDown(code) {
      return this.keys.has(code);
    },
    justPressed(code) {
      return this.pressed.has(code);
    },
    endFrame() {
      this.pressed.clear();
      this.released.clear();
      mouse.clicked = false;
    }
  };

  const mouse = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    worldX: MAP.width / 2,
    worldY: MAP.height / 2,
    down: false,
    clicked: false
  };

  window.addEventListener("keydown", event => {
    if (["Tab", "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) input.pressed.add(event.code);
    input.keys.add(event.code);
    audio.unlock();
    handleKeyCommand(event.code);
  });

  window.addEventListener("keyup", event => {
    input.keys.delete(event.code);
    input.released.add(event.code);
  });

  window.addEventListener("mousemove", event => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });

  window.addEventListener("mousedown", event => {
    if (event.button === 0) {
      mouse.down = true;
      mouse.clicked = true;
      audio.unlock();
    }
  });

  window.addEventListener("mouseup", event => {
    if (event.button === 0) mouse.down = false;
  });

  window.addEventListener("contextmenu", event => event.preventDefault());

  // Audio manager
  const audio = {
    ctx: null,
    muted: false,
    unlock() {
      if (this.muted) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === "suspended") this.ctx.resume();
    },
    tone(freq, duration, type, gain, slide) {
      if (this.muted) return;
      this.unlock();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const amp = this.ctx.createGain();
      osc.type = type || "square";
      osc.frequency.setValueAtTime(freq, now);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), now + duration);
      amp.gain.setValueAtTime(gain || 0.08, now);
      amp.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(amp);
      amp.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    },
    noise(duration, gain) {
      if (this.muted) return;
      this.unlock();
      if (!this.ctx) return;
      const samples = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
      const buffer = this.ctx.createBuffer(1, samples, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
      const source = this.ctx.createBufferSource();
      const amp = this.ctx.createGain();
      amp.gain.setValueAtTime(gain || 0.05, this.ctx.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      source.buffer = buffer;
      source.connect(amp);
      amp.connect(this.ctx.destination);
      source.start();
    },
    playShootSound(type) {
      const map = {
        pistol: [420, 0.055, "square", 0.045, 0.4],
        smg: [540, 0.035, "sawtooth", 0.035, 0.55],
        shotgun: [220, 0.11, "triangle", 0.075, 0.28],
        rifle: [520, 0.055, "square", 0.05, 0.42],
        sniper: [160, 0.17, "sawtooth", 0.08, 0.2],
        heavy: [110, 0.08, "square", 0.07, 0.32],
        flame: [85, 0.045, "sawtooth", 0.03, 1.15],
        rocket: [95, 0.16, "sawtooth", 0.08, 0.22],
        laser: [880, 0.05, "sine", 0.045, 1.45],
        plasma: [180, 0.12, "triangle", 0.075, 2.2]
      };
      const s = map[type] || map.pistol;
      this.tone(s[0], s[1], s[2], s[3], s[4]);
      if (["shotgun", "heavy", "rocket"].includes(type)) this.noise(0.08, 0.035);
    },
    playExplosionSound() {
      this.tone(80, 0.18, "sawtooth", 0.12, 0.18);
      this.noise(0.22, 0.09);
    },
    playHitSound() {
      this.tone(240, 0.035, "triangle", 0.025, 0.55);
    },
    playZombieSound() {
      this.tone(rand(70, 120), 0.16, "sawtooth", 0.026, 0.72);
    },
    playPickupSound() {
      this.tone(620, 0.05, "sine", 0.04, 1.8);
    },
    playReloadSound() {
      this.tone(170, 0.08, "square", 0.034, 1.6);
      setTimeout(() => this.tone(310, 0.05, "square", 0.03, 1.1), 90);
    },
    playShopSound() {
      this.tone(740, 0.06, "sine", 0.035, 1.25);
    }
  };

  window.playShootSound = type => audio.playShootSound(type);
  window.playExplosionSound = () => audio.playExplosionSound();
  window.playHitSound = () => audio.playHitSound();
  window.playZombieSound = () => audio.playZombieSound();
  window.playPickupSound = () => audio.playPickupSound();
  window.playReloadSound = () => audio.playReloadSound();
  window.playShopSound = () => audio.playShopSound();

  // Weapon definitions
  const WEAPON_DEFS = {
    pistol: {
      id: "pistol", name: "Pistol", rarity: "common", price: 0, automatic: false,
      description: "Reliable starter sidearm. Cheap ammo, steady damage, and fast reloads.",
      damage: 28, fireRate: 2.7, bulletSpeed: 920, range: 780, spread: 0.035, bulletsPerShot: 1,
      magazineSize: 12, reserveAmmo: 48, reloadTime: 1.05, color: "#ffd35a", soundType: "pistol",
      projectileType: "normal", pierce: 0, knockback: 82, critChance: 0.08, burnChance: 0,
      explosionRadius: 0, ammoClass: "bullet", shake: 3
    },
    smg: {
      id: "smg", name: "SMG", rarity: "uncommon", price: 320, automatic: true,
      description: "High fire rate, light recoil, and enough spread to sweep a crowd.",
      damage: 14, fireRate: 10.8, bulletSpeed: 980, range: 700, spread: 0.13, bulletsPerShot: 1,
      magazineSize: 35, reserveAmmo: 140, reloadTime: 1.35, color: "#31ff9b", soundType: "smg",
      projectileType: "normal", pierce: 0, knockback: 45, critChance: 0.04, burnChance: 0,
      explosionRadius: 0, ammoClass: "bullet", shake: 2
    },
    shotgun: {
      id: "shotgun", name: "Shotgun", rarity: "rare", price: 540, automatic: false,
      description: "Eight pellets, massive close-range punch, slow reload.",
      damage: 18, fireRate: 1.15, bulletSpeed: 820, range: 430, spread: 0.5, bulletsPerShot: 8,
      magazineSize: 6, reserveAmmo: 36, reloadTime: 1.9, color: "#ff8a2a", soundType: "shotgun",
      projectileType: "pellet", pierce: 0, knockback: 142, critChance: 0.05, burnChance: 0,
      explosionRadius: 0, ammoClass: "shell", shake: 8
    },
    assault: {
      id: "assault", name: "Assault Rifle", rarity: "rare", price: 760, automatic: true,
      description: "Balanced automatic rifle with clean accuracy and strong sustained damage.",
      damage: 22, fireRate: 7.1, bulletSpeed: 1080, range: 900, spread: 0.065, bulletsPerShot: 1,
      magazineSize: 30, reserveAmmo: 120, reloadTime: 1.55, color: "#f1f7ff", soundType: "rifle",
      projectileType: "normal", pierce: 0, knockback: 72, critChance: 0.07, burnChance: 0,
      explosionRadius: 0, ammoClass: "bullet", shake: 4
    },
    sniper: {
      id: "sniper", name: "Sniper Rifle", rarity: "epic", price: 1180, automatic: false,
      description: "Slow, brutal, precise. Bullets pierce entire lines of infected.",
      damage: 135, fireRate: 0.72, bulletSpeed: 1650, range: 1400, spread: 0.008, bulletsPerShot: 1,
      magazineSize: 5, reserveAmmo: 25, reloadTime: 2.25, color: "#48d8ff", soundType: "sniper",
      projectileType: "sniper", pierce: 4, knockback: 220, critChance: 0.24, burnChance: 0,
      explosionRadius: 0, ammoClass: "heavy", shake: 10
    },
    minigun: {
      id: "minigun", name: "Minigun", rarity: "epic", price: 1750, automatic: true,
      description: "Spin-up barrel that becomes a bullet storm. Slows movement while firing.",
      damage: 15, fireRate: 18, bulletSpeed: 1030, range: 850, spread: 0.18, bulletsPerShot: 1,
      magazineSize: 120, reserveAmmo: 360, reloadTime: 3.1, color: "#b8c2cc", soundType: "heavy",
      projectileType: "normal", pierce: 0, knockback: 50, critChance: 0.03, burnChance: 0,
      explosionRadius: 0, ammoClass: "bullet", shake: 5, movePenalty: 0.72
    },
    flamethrower: {
      id: "flamethrower", name: "Flamethrower", rarity: "rare", price: 1320, automatic: true,
      description: "Short-range flame stream that burns enemies over time.",
      damage: 7, fireRate: 22, bulletSpeed: 470, range: 300, spread: 0.42, bulletsPerShot: 1,
      magazineSize: 90, reserveAmmo: 220, reloadTime: 2.2, color: "#ff5a20", soundType: "flame",
      projectileType: "flame", pierce: 3, knockback: 16, critChance: 0, burnChance: 0.75,
      explosionRadius: 0, ammoClass: "fuel", shake: 2
    },
    rocket: {
      id: "rocket", name: "Rocket Launcher", rarity: "legendary", price: 2200, automatic: false,
      description: "Expensive rockets with huge splash damage and heavy screen shake.",
      damage: 85, fireRate: 0.58, bulletSpeed: 540, range: 900, spread: 0.025, bulletsPerShot: 1,
      magazineSize: 1, reserveAmmo: 9, reloadTime: 2.4, color: "#ff3a58", soundType: "rocket",
      projectileType: "rocket", pierce: 0, knockback: 360, critChance: 0.03, burnChance: 0.32,
      explosionRadius: 190, ammoClass: "rocket", shake: 16
    },
    laser: {
      id: "laser", name: "Laser Rifle", rarity: "legendary", price: 2600, automatic: true,
      description: "Precise energy beam that cuts through infected and never drops.",
      damage: 34, fireRate: 5.8, bulletSpeed: 2200, range: 1080, spread: 0.002, bulletsPerShot: 1,
      magazineSize: 36, reserveAmmo: 126, reloadTime: 1.8, color: "#48d8ff", soundType: "laser",
      projectileType: "laser", pierce: 5, knockback: 105, critChance: 0.14, burnChance: 0,
      explosionRadius: 0, ammoClass: "energy", shake: 3
    },
    crossbow: {
      id: "crossbow", name: "Crossbow", rarity: "uncommon", price: 680, automatic: false,
      description: "Quiet, high-critical bolts that pierce with little recoil.",
      damage: 62, fireRate: 1.45, bulletSpeed: 880, range: 860, spread: 0.018, bulletsPerShot: 1,
      magazineSize: 1, reserveAmmo: 40, reloadTime: 0.95, color: "#c58a4a", soundType: "pistol",
      projectileType: "bolt", pierce: 2, knockback: 130, critChance: 0.32, burnChance: 0,
      explosionRadius: 0, ammoClass: "bolt", shake: 2
    },
    dual: {
      id: "dual", name: "Dual Pistols", rarity: "rare", price: 900, automatic: true,
      description: "Alternating left-right shots with strong tempo and wider spread.",
      damage: 20, fireRate: 8.2, bulletSpeed: 930, range: 720, spread: 0.12, bulletsPerShot: 1,
      magazineSize: 24, reserveAmmo: 96, reloadTime: 1.6, color: "#ffe38b", soundType: "pistol",
      projectileType: "normal", pierce: 0, knockback: 64, critChance: 0.1, burnChance: 0,
      explosionRadius: 0, ammoClass: "bullet", shake: 3
    },
    plasma: {
      id: "plasma", name: "Plasma Cannon", rarity: "mythic", price: 5000, automatic: false,
      description: "End-game energy cannon. Plasma impact knocks back and detonates electricity.",
      damage: 155, fireRate: 0.55, bulletSpeed: 640, range: 930, spread: 0.018, bulletsPerShot: 1,
      magazineSize: 4, reserveAmmo: 20, reloadTime: 2.8, color: "#9b72ff", soundType: "plasma",
      projectileType: "plasma", pierce: 1, knockback: 420, critChance: 0.12, burnChance: 0,
      explosionRadius: 140, ammoClass: "energy", shake: 13
    }
  };

  const WEAPON_ORDER = Object.keys(WEAPON_DEFS);
  const RARITY_COLORS = {
    common: "#d8e5e2",
    uncommon: "#31ff9b",
    rare: "#48d8ff",
    epic: "#b47cff",
    legendary: "#ff8a2a",
    mythic: "#ff3a58"
  };

  // Zombie definitions
  const ZOMBIE_DEFS = {
    walker: { name: "Walker", behavior: "chase", hp: 58, speed: 82, size: 33, damage: 9, reward: 12, color: "#52d66b", unlock: 1, weight: 7, knockResist: 0.1 },
    runner: { name: "Runner", behavior: "chase", hp: 38, speed: 142, size: 28, damage: 8, reward: 16, color: "#cfff4a", unlock: 2, weight: 3, knockResist: 0.02 },
    tank: { name: "Tank", behavior: "chase", hp: 260, speed: 58, size: 54, damage: 22, reward: 42, color: "#317c41", unlock: 4, weight: 1.4, knockResist: 0.65 },
    swarm: { name: "Swarm", behavior: "chase", hp: 22, speed: 172, size: 20, damage: 5, reward: 7, color: "#ff73d7", unlock: 3, weight: 4, knockResist: 0 },
    spitter: { name: "Bone Spitter", behavior: "ranged", hp: 72, speed: 76, size: 34, damage: 13, reward: 22, color: "#d7e6aa", unlock: 3, weight: 2.1, range: 420, knockResist: 0.12 },
    boomer: { name: "Boomer", behavior: "boomer", hp: 64, speed: 88, size: 45, damage: 26, reward: 20, color: "#ff9a2a", unlock: 4, weight: 1.8, knockResist: 0.24 },
    dodger: { name: "Dodger", behavior: "dodger", hp: 62, speed: 124, size: 30, damage: 10, reward: 24, color: "#b267ff", unlock: 5, weight: 1.7, knockResist: 0.08 },
    armored: { name: "Armored", behavior: "armored", hp: 150, speed: 74, size: 39, damage: 15, reward: 32, color: "#81909b", unlock: 6, weight: 1.5, armor: 0.42, knockResist: 0.45 },
    healer: { name: "Healer", behavior: "healer", hp: 92, speed: 84, size: 34, damage: 7, reward: 36, color: "#f1fff9", unlock: 7, weight: 1.1, knockResist: 0.16 },
    screamer: { name: "Screamer", behavior: "screamer", hp: 100, speed: 78, size: 36, damage: 8, reward: 38, color: "#ff5a93", unlock: 8, weight: 0.9, knockResist: 0.1 },
    crawler: { name: "Crawler", behavior: "crawler", hp: 46, speed: 136, size: 22, damage: 9, reward: 18, color: "#86a06c", unlock: 5, weight: 2.4, knockResist: 0.03 },
    splitter: { name: "Splitter", behavior: "splitter", hp: 130, speed: 82, size: 42, damage: 14, reward: 34, color: "#bcff7a", unlock: 9, weight: 1, knockResist: 0.18 },
    berserker: { name: "Berserker", behavior: "chase", hp: 112, speed: 92, size: 37, damage: 18, reward: 30, color: "#46ff55", unlock: 10, weight: 1.3, knockResist: 0.12 },
    charger: { name: "Charger", behavior: "charger", hp: 145, speed: 92, size: 42, damage: 24, reward: 42, color: "#ff544f", unlock: 11, weight: 1, knockResist: 0.28 },
    brute: { name: "Mutant Brute", behavior: "brute", hp: 420, speed: 62, size: 66, damage: 28, reward: 82, color: "#b63a32", unlock: 12, weight: 0.45, knockResist: 0.72 }
  };

  const BOSS_DEFS = [
    { name: "Mutant Boss", behavior: "bossMutant", hp: 1450, speed: 65, size: 92, damage: 32, reward: 520, color: "#d93838" },
    { name: "Necro Queen", behavior: "bossQueen", hp: 1200, speed: 78, size: 84, damage: 24, reward: 560, color: "#b55cff" },
    { name: "Butcher", behavior: "bossButcher", hp: 1680, speed: 88, size: 98, damage: 38, reward: 620, color: "#ff5a38" },
    { name: "Iron Titan", behavior: "bossTitan", hp: 1950, speed: 54, size: 112, damage: 34, reward: 720, color: "#59ff68" }
  ];

  const PICKUP_DEFS = {
    coin: { name: "Money Coin", color: "#ffd35a", radius: 9, life: 18 },
    cash: { name: "Cash Bundle", color: "#31ff9b", radius: 12, life: 18 },
    medkit: { name: "Medkit", color: "#ff3a58", radius: 12, life: 20 },
    armor: { name: "Armor Plate", color: "#48d8ff", radius: 12, life: 20 },
    ammo: { name: "Ammo Box", color: "#ffd35a", radius: 13, life: 20 },
    grenade: { name: "Grenade", color: "#ff8a2a", radius: 11, life: 22 },
    damageBoost: { name: "Damage Boost", color: "#ff3159", radius: 12, life: 17 },
    speedBoost: { name: "Speed Boost", color: "#8cffea", radius: 12, life: 17 },
    nuke: { name: "Nuke", color: "#ffffff", radius: 16, life: 16 },
    freeze: { name: "Freeze Bomb", color: "#7ee7ff", radius: 14, life: 18 },
    turretKit: { name: "Turret Kit", color: "#b8c2cc", radius: 13, life: 22 }
  };

  // Base entity
  class Entity {
    constructor(x, y, radius) {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.active = true;
    }
  }

  // Player class
  class Player extends Entity {
    constructor(x, y) {
      super(x, y, 15);
      this.maxHp = 100;
      this.hp = 100;
      this.maxArmor = 50;
      this.armor = 50;
      this.baseSpeed = 205;
      this.stamina = 100;
      this.maxStamina = 100;
      this.staminaRegen = 24;
      this.dashCooldown = 0;
      this.dashTime = 0;
      this.dashVx = 0;
      this.dashVy = 0;
      this.invincibleTime = 0;
      this.money = 150;
      this.score = 0;
      this.kills = 0;
      this.runKills = 0;
      this.combo = 1;
      this.comboTimer = 0;
      this.currentSlot = 0;
      this.loadout = ["pistol", null, null, null, null, null];
      this.ownedWeapons = new Set(["pistol"]);
      this.weaponStates = {};
      this.cooldown = 0;
      this.dualSide = 1;
      this.status = {};
      this.boosts = { damage: 0, speed: 0 };
      this.upgrades = {
        hp: 0, armor: 0, speed: 0, stamina: 0, fireRate: 0, reload: 0,
        damage: 0, crit: 0, pierce: 0, magnet: 0, money: 0, drone: 0
      };
      this.upgradeCosts = {
        hp: 200, armor: 180, speed: 260, stamina: 220, fireRate: 340, reload: 320,
        damage: 360, crit: 380, pierce: 520, magnet: 240, money: 420, drone: 900
      };
      this.skills = {
        grenades: 2,
        mines: 1,
        turrets: 0,
        medkits: 1,
        grenadeCooldown: 0,
        mineCooldown: 0,
        turretCooldown: 0,
        medkitCooldown: 0
      };
      for (const id of WEAPON_ORDER) {
        const def = WEAPON_DEFS[id];
        this.weaponStates[id] = {
          ammoInMag: def.magazineSize,
          reserveAmmo: def.reserveAmmo,
          reloading: false,
          reloadTimer: 0,
          reloadTotal: 0,
          spin: 0
        };
      }
    }

    get currentWeaponId() {
      return this.loadout[this.currentSlot] || "pistol";
    }

    get weapon() {
      return WEAPON_DEFS[this.currentWeaponId];
    }

    get weaponState() {
      return this.weaponStates[this.currentWeaponId];
    }

    switchSlot(slot) {
      if (slot < 0 || slot > 5) return;
      if (!this.loadout[slot]) {
        addToast(`Slot ${slot + 1} is empty`);
        return;
      }
      this.currentSlot = slot;
      this.cooldown = Math.min(this.cooldown, 0.08);
      addFloatingText(this.x, this.y - 38, WEAPON_DEFS[this.currentWeaponId].name, "#ffd35a", 15);
    }

    equipWeapon(id) {
      if (!this.ownedWeapons.has(id)) return false;
      if (this.loadout.includes(id)) {
        this.currentSlot = this.loadout.indexOf(id);
        return true;
      }
      const empty = this.loadout.findIndex(value => !value);
      const slot = empty >= 0 ? empty : this.currentSlot;
      this.loadout[slot] = id;
      this.currentSlot = slot;
      return true;
    }

    buyWeapon(id) {
      const def = WEAPON_DEFS[id];
      if (!def || this.ownedWeapons.has(id) || this.money < def.price) return false;
      this.money -= def.price;
      this.ownedWeapons.add(id);
      this.equipWeapon(id);
      addToast(`${def.name} acquired`);
      audio.playShopSound();
      return true;
    }

    addMoney(value) {
      const bonus = 1 + this.upgrades.money * 0.08;
      this.money += Math.floor(value * bonus);
    }

    heal(value) {
      const before = this.hp;
      this.hp = Math.min(this.maxHp, this.hp + value);
      if (this.hp > before) addFloatingText(this.x, this.y - 30, `+${Math.floor(this.hp - before)}`, "#31ff9b", 16);
    }

    repairArmor(value) {
      const before = this.armor;
      this.armor = Math.min(this.maxArmor, this.armor + value);
      if (this.armor > before) addFloatingText(this.x, this.y - 48, `+${Math.floor(this.armor - before)} armor`, "#48d8ff", 14);
    }

    takeDamage(amount, source) {
      if (!["melee", "selfExplosion", "bossSkill", "zombieProjectile"].includes(source)) return;
      if (this.invincibleTime > 0 || this.dashTime > 0) return;
      let incoming = amount;
      if (this.armor > 0) {
        const absorbed = Math.min(this.armor, incoming * 0.72);
        this.armor -= absorbed;
        incoming -= absorbed;
      }
      this.hp -= incoming;
      this.invincibleTime = 0.46;
      damageFlash = Math.min(1, damageFlash + 0.55);
      screenShake = Math.max(screenShake, 9);
      spawnBurst(this.x, this.y, "#ff3a58", 14, 120);
      addFloatingText(this.x, this.y - 28, `-${Math.ceil(amount)}`, "#ff3a58", 17);
      if (this.hp <= 0) endGame();
    }

    startReload() {
      const def = this.weapon;
      const stateForWeapon = this.weaponState;
      if (stateForWeapon.reloading || stateForWeapon.ammoInMag >= def.magazineSize || stateForWeapon.reserveAmmo <= 0) return;
      stateForWeapon.reloading = true;
      stateForWeapon.reloadTotal = Math.max(0.35, def.reloadTime * (1 - this.upgrades.reload * 0.06));
      stateForWeapon.reloadTimer = stateForWeapon.reloadTotal;
      audio.playReloadSound();
    }

    finishReload() {
      const def = this.weapon;
      const stateForWeapon = this.weaponState;
      const need = def.magazineSize - stateForWeapon.ammoInMag;
      const moved = Math.min(need, stateForWeapon.reserveAmmo);
      stateForWeapon.ammoInMag += moved;
      stateForWeapon.reserveAmmo -= moved;
      stateForWeapon.reloading = false;
      stateForWeapon.reloadTimer = 0;
    }

    update(dt) {
      if (this.hp <= 0) return;
      const def = this.weapon;
      const stateForWeapon = this.weaponState;

      this.invincibleTime = Math.max(0, this.invincibleTime - dt);
      this.dashCooldown = Math.max(0, this.dashCooldown - dt);
      this.cooldown = Math.max(0, this.cooldown - dt);
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer <= 0) this.combo = 1;
      this.skills.grenadeCooldown = Math.max(0, this.skills.grenadeCooldown - dt);
      this.skills.mineCooldown = Math.max(0, this.skills.mineCooldown - dt);
      this.skills.turretCooldown = Math.max(0, this.skills.turretCooldown - dt);
      this.skills.medkitCooldown = Math.max(0, this.skills.medkitCooldown - dt);

      if (this.status.burn) {
        this.status.burn -= dt;
      }

      this.boosts.damage = Math.max(0, this.boosts.damage - dt);
      this.boosts.speed = Math.max(0, this.boosts.speed - dt);

      if (stateForWeapon.reloading) {
        stateForWeapon.reloadTimer -= dt;
        if (stateForWeapon.reloadTimer <= 0) this.finishReload();
      }

      if (stateForWeapon.spin !== undefined) {
        const shooting = mouse.down && def.id === "minigun" && !stateForWeapon.reloading;
        stateForWeapon.spin = clamp(stateForWeapon.spin + (shooting ? dt * 1.7 : -dt * 2.1), 0, 1);
      }

      this.updateMovement(dt);
      this.updateShooting(dt);
    }

    updateMovement(dt) {
      let ix = 0;
      let iy = 0;
      if (input.isDown("KeyW")) iy -= 1;
      if (input.isDown("KeyS")) iy += 1;
      if (input.isDown("KeyA")) ix -= 1;
      if (input.isDown("KeyD")) ix += 1;
      if (touchInput.active) {
        ix += touchInput.stickX;
        iy += touchInput.stickY;
      }

      const len = Math.hypot(ix, iy) || 1;
      ix /= len;
      iy /= len;

      const current = this.weapon;
      let speed = this.baseSpeed + this.upgrades.speed * 13;
      if (this.boosts.speed > 0) speed *= 1.3;
      if (this.status.slow) speed *= 0.62;
      if (current.movePenalty && mouse.down) speed *= current.movePenalty;

      const wantsSprint = input.isDown("ShiftLeft") || input.isDown("ShiftRight");
      if (wantsSprint && this.stamina > 2 && (ix || iy)) {
        speed *= 1.45;
        this.stamina = Math.max(0, this.stamina - 32 * dt);
      } else {
        this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen * dt);
      }

      if (input.justPressed("Space") && this.dashCooldown <= 0 && this.stamina >= 26) {
        const dashAngle = ix || iy ? Math.atan2(iy, ix) : angleTo(this.x, this.y, mouse.worldX, mouse.worldY);
        this.dashVx = Math.cos(dashAngle) * 690;
        this.dashVy = Math.sin(dashAngle) * 690;
        this.dashTime = 0.16;
        this.dashCooldown = 0.72;
        this.invincibleTime = Math.max(this.invincibleTime, 0.22);
        this.stamina -= 26;
        spawnBurst(this.x, this.y, "#48d8ff", 16, 180);
      }

      if (this.dashTime > 0) {
        this.dashTime -= dt;
        moveCircle(this, this.dashVx * dt, this.dashVy * dt);
      } else {
        moveCircle(this, ix * speed * dt, iy * speed * dt);
      }

      this.x = clamp(this.x, this.radius, MAP.width - this.radius);
      this.y = clamp(this.y, this.radius, MAP.height - this.radius);
    }

    updateShooting(dt) {
      if (![STATES.PLAYING, STATES.BREAK].includes(state)) return;
      const def = this.weapon;
      const stateForWeapon = this.weaponState;
      const canHold = def.automatic;
      const wantsShoot = canHold ? (mouse.down || touchInput.firing) : (mouse.clicked || touchInput.firing);
      if (input.justPressed("KeyR")) this.startReload();
      if (!wantsShoot) return;
      if (stateForWeapon.reloading) return;
      if (stateForWeapon.ammoInMag <= 0) {
        this.startReload();
        addToast("Reloading");
        return;
      }
      if (this.cooldown > 0) return;

      let fireRate = def.fireRate * (1 + this.upgrades.fireRate * 0.055);
      if (def.id === "minigun") fireRate *= lerp(0.28, 1, stateForWeapon.spin || 0);
      this.cooldown = 1 / Math.max(0.1, fireRate);

      stateForWeapon.ammoInMag -= 1;
      this.shootWeapon(def);
      if (stateForWeapon.ammoInMag <= 0) this.startReload();
    }

    shootWeapon(def) {
      const baseAngle = angleTo(this.x, this.y, mouse.worldX, mouse.worldY);
      const muzzleDist = this.radius + 19;
      const spreadBase = def.spread;
      const damageBoost = 1 + this.upgrades.damage * 0.08 + (this.boosts.damage > 0 ? 0.45 : 0);
      const extraPierce = this.upgrades.pierce > 0 ? Math.floor(this.upgrades.pierce / 2) : 0;
      let sideOffset = 0;

      if (def.id === "dual") {
        sideOffset = this.dualSide * 9;
        this.dualSide *= -1;
      }

      const count = def.bulletsPerShot;
      for (let i = 0; i < count; i++) {
        const patternOffset = count > 1 ? (i - (count - 1) / 2) * (spreadBase / Math.max(1, count - 1)) : 0;
        const randomSpread = (Math.random() - 0.5) * spreadBase;
        const angle = baseAngle + patternOffset + randomSpread;
        const sideAngle = baseAngle + Math.PI / 2;
        const sx = this.x + Math.cos(baseAngle) * muzzleDist + Math.cos(sideAngle) * sideOffset;
        const sy = this.y + Math.sin(baseAngle) * muzzleDist + Math.sin(sideAngle) * sideOffset;
        projectiles.push(new Projectile({
          x: sx, y: sy, angle,
          owner: "player",
          type: def.projectileType,
          damage: def.damage * damageBoost,
          speed: def.bulletSpeed,
          range: def.range,
          radius: def.projectileType === "flame" ? rand(7, 14) : def.projectileType === "rocket" ? 9 : def.projectileType === "plasma" ? 12 : 4,
          color: def.color,
          pierce: def.pierce + extraPierce,
          knockback: def.knockback,
          critChance: def.critChance + this.upgrades.crit * 0.035,
          burnChance: def.burnChance,
          explosionRadius: def.explosionRadius
        }));
      }

      spawnMuzzle(this.x + Math.cos(baseAngle) * 28, this.y + Math.sin(baseAngle) * 28, baseAngle, def.color);
      spawnShell(this.x, this.y, baseAngle);
      screenShake = Math.max(screenShake, def.shake);
      audio.playShootSound(def.soundType);
    }

    addKill(zombie) {
      this.kills += 1;
      this.runKills += 1;
      this.combo = Math.min(5, this.combo + 0.08);
      this.comboTimer = 3.2;
      const scoreGain = Math.floor((zombie.maxHp + zombie.reward * 8) * this.combo);
      this.score += scoreGain;
      this.addMoney(zombie.reward);
      addFloatingText(zombie.x, zombie.y - zombie.radius - 14, `+$${zombie.reward}`, "#ffd35a", 14);
      if (this.kills === 100) achievement("100 Kills!");
    }

    draw(context) {
      const aim = angleTo(this.x, this.y, mouse.worldX, mouse.worldY);
      context.save();
      context.translate(this.x, this.y);
      context.rotate(aim);

      context.fillStyle = "rgba(0,0,0,0.38)";
      context.beginPath();
      context.ellipse(0, 12, 21, 10, 0, 0, PI2);
      context.fill();

      const invuln = this.invincibleTime > 0 && Math.sin(gameTime * 42) > 0;
      context.globalAlpha = invuln ? 0.48 : 1;

      context.shadowColor = "#48d8ff";
      context.shadowBlur = 22;
      context.fillStyle = "#4fb6ff";
      context.beginPath();
      context.arc(0, 0, this.radius + 3, 0, PI2);
      context.fill();
      context.shadowBlur = 0;
      context.strokeStyle = "#ffffff";
      context.lineWidth = 4;
      context.stroke();

      context.fillStyle = "#06131d";
      context.beginPath();
      context.arc(6, -6, 5, 0, PI2);
      context.arc(6, 6, 5, 0, PI2);
      context.fill();

      const def = this.weapon;
      context.fillStyle = def.color;
      context.fillRect(8, -5, 32, 10);
      context.fillStyle = "#dce7ea";
      context.fillRect(22, -3, 22, 6);

      context.rotate(-aim);
      context.strokeStyle = "rgba(255,255,255,0.72)";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, this.radius + 10 + Math.sin(gameTime * 7) * 2, 0, PI2);
      context.stroke();

      context.restore();
    }
  }

  class Projectile extends Entity {
    constructor(options) {
      super(options.x, options.y, options.radius);
      this.owner = options.owner;
      this.type = options.type;
      this.angle = options.angle;
      this.vx = Math.cos(options.angle) * options.speed;
      this.vy = Math.sin(options.angle) * options.speed;
      this.speed = options.speed;
      this.damage = options.damage;
      this.range = options.range;
      this.traveled = 0;
      this.color = options.color;
      this.pierce = options.pierce || 0;
      this.knockback = options.knockback || 0;
      this.critChance = options.critChance || 0;
      this.burnChance = options.burnChance || 0;
      this.explosionRadius = options.explosionRadius || 0;
      this.life = this.type === "laser" ? 0.075 : 4;
      this.hit = new Set();
      this.didLaser = false;
    }

    update(dt) {
      if (this.type === "laser") {
        this.updateLaser(dt);
        return;
      }

      const step = this.speed * dt;
      const oldX = this.x;
      const oldY = this.y;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.traveled += step;
      this.life -= dt;

      if (this.type === "flame") {
        this.radius += 28 * dt;
        this.damage *= 0.995;
        spawnParticle(this.x, this.y, rand(-45, 45), rand(-45, 45), rand(4, 10), this.color, rand(0.18, 0.36), "soft");
      } else if (this.type === "rocket") {
        spawnParticle(oldX, oldY, rand(-30, 30), rand(-30, 30), rand(5, 12), "rgba(180,180,180,0.85)", rand(0.32, 0.58), "smoke");
      } else if (this.type === "plasma") {
        spawnParticle(this.x, this.y, rand(-70, 70), rand(-70, 70), rand(2, 6), "#9b72ff", rand(0.12, 0.24), "spark");
      }

      if (this.traveled > this.range || this.life <= 0 || outsideMap(this.x, this.y, this.radius)) {
        this.expire();
        return;
      }

      if (collidesWorld(this.x, this.y, this.radius)) {
        this.expire();
        return;
      }

      if (this.owner === "player") {
        this.checkBarrels();
        for (const zombie of zombies) {
          if (!zombie.active || this.hit.has(zombie.id)) continue;
          if (dist(this.x, this.y, zombie.x, zombie.y) <= this.radius + zombie.radius) {
            this.hitZombie(zombie);
            if (!this.active) break;
          }
        }
      } else if (player && dist(this.x, this.y, player.x, player.y) <= this.radius + player.radius) {
        this.active = false;
        spawnBurst(this.x, this.y, this.color, 10, 90);
        if (this.type === "boss") player.takeDamage(this.damage, "bossSkill");
        if (this.type === "spike") player.takeDamage(this.damage, "zombieProjectile");
      }
    }

    updateLaser(dt) {
      this.life -= dt;
      if (!this.didLaser) {
        this.didLaser = true;
        const endX = this.x + Math.cos(this.angle) * this.range;
        const endY = this.y + Math.sin(this.angle) * this.range;
        const candidates = zombies
          .filter(zombie => zombie.active && lineCircleDistance(this.x, this.y, endX, endY, zombie.x, zombie.y) < zombie.radius + 5)
          .sort((a, b) => dist(this.x, this.y, a.x, a.y) - dist(this.x, this.y, b.x, b.y));
        let remaining = this.pierce + 1;
        for (const zombie of candidates) {
          if (remaining <= 0) break;
          this.hitZombie(zombie);
          this.active = true;
          remaining -= 1;
        }
        for (let i = 0; i < 18; i++) {
          const t = Math.random();
          spawnParticle(lerp(this.x, endX, t), lerp(this.y, endY, t), rand(-30, 30), rand(-30, 30), rand(2, 5), "#48d8ff", rand(0.12, 0.24), "spark");
        }
      }
      if (this.life <= 0) this.active = false;
    }

    checkBarrels() {
      for (const barrel of world.barrels) {
        if (!barrel.active) continue;
        if (dist(this.x, this.y, barrel.x, barrel.y) <= this.radius + barrel.r) {
          barrel.hp -= this.damage;
          spawnBurst(barrel.x, barrel.y, "#ff8a2a", 8, 120);
          if (barrel.hp <= 0) explodeBarrel(barrel);
          this.expire();
          return;
        }
      }
    }

    hitZombie(zombie) {
      this.hit.add(zombie.id);
      const critical = chance(this.critChance);
      const amount = this.damage * (critical ? 1.85 : 1);
      zombie.takeDamage(amount, this, critical);
      if (this.burnChance && chance(this.burnChance)) zombie.status.burn = Math.max(zombie.status.burn || 0, 3.5);
      if (this.type === "flame") zombie.status.burn = Math.max(zombie.status.burn || 0, 2.3);
      if (this.type === "plasma") zombie.status.slow = Math.max(zombie.status.slow || 0, 1.6);
      if (this.knockback) {
        const a = angleTo(this.x, this.y, zombie.x, zombie.y);
        zombie.knockX += Math.cos(a) * this.knockback * (1 - zombie.knockResist);
        zombie.knockY += Math.sin(a) * this.knockback * (1 - zombie.knockResist);
      }
      if (this.explosionRadius > 0) {
        createExplosion(this.x, this.y, this.explosionRadius, this.damage * 0.95, this.owner, this.color);
        this.active = false;
        return;
      }
      this.pierce -= 1;
      if (this.pierce < 0 && this.type !== "flame") this.active = false;
      spawnBurst(this.x, this.y, critical ? "#ffffff" : "#ff3a58", critical ? 16 : 9, critical ? 220 : 120);
      audio.playHitSound();
    }

    expire() {
      if (this.explosionRadius > 0) createExplosion(this.x, this.y, this.explosionRadius, this.damage, this.owner, this.color);
      this.active = false;
    }

    draw(context) {
      context.save();
      if (this.type === "laser") {
        context.globalAlpha = clamp(this.life / 0.075, 0, 1);
        context.strokeStyle = this.color;
        context.lineWidth = 5;
        context.shadowColor = this.color;
        context.shadowBlur = 18;
        context.beginPath();
        context.moveTo(this.x, this.y);
        context.lineTo(this.x + Math.cos(this.angle) * this.range, this.y + Math.sin(this.angle) * this.range);
        context.stroke();
        context.restore();
        return;
      }
      context.translate(this.x, this.y);
      context.rotate(this.angle);
      context.fillStyle = this.color;
      context.shadowColor = this.color;
      context.shadowBlur = this.type === "plasma" || this.type === "rocket" ? 18 : 8;
      if (["rocket", "bolt", "sniper"].includes(this.type)) {
        context.fillRect(-this.radius * 1.8, -this.radius * 0.5, this.radius * 3.6, this.radius);
      } else {
        context.beginPath();
        context.arc(0, 0, this.radius, 0, PI2);
        context.fill();
      }
      context.restore();
    }
  }

  class Zombie extends Entity {
    constructor(typeKey, x, y, wave, bossDef) {
      const def = bossDef || ZOMBIE_DEFS[typeKey];
      super(x, y, def.size / 2);
      this.id = Zombie.nextId++;
      this.typeKey = typeKey;
      this.name = def.name;
      this.behavior = def.behavior;
      this.color = def.color;
      this.isBoss = Boolean(bossDef);
      const waveScale = 1 + wave * 0.11;
      const bossScale = this.isBoss ? 1 + wave * 0.13 : 1;
      this.maxHp = Math.round(def.hp * waveScale * bossScale);
      this.hp = this.maxHp;
      const earlyEase = wave <= 5 ? 0.78 + wave * 0.04 : 1;
      this.speed = def.speed * earlyEase * (1 + wave * 0.012) * (waveManager.modifier?.id === "fast" ? 1.22 : 1);
      this.damage = def.damage * (wave <= 5 ? 0.62 + wave * 0.055 : 1 + wave * 0.035);
      this.reward = Math.round(def.reward * (1 + wave * 0.05) * (waveManager.modifier?.id === "double" ? 2 : 1));
      this.armor = def.armor || 0;
      this.knockResist = def.knockResist || (this.isBoss ? 0.78 : 0.12);
      this.attackCooldown = rand(0.2, 0.7);
      this.specialCooldown = rand(1.2, 3.4);
      this.shootCooldown = rand(0.3, 1.4);
      this.windup = 0;
      this.chargeTime = 0;
      this.chargeAngle = 0;
      this.knockX = 0;
      this.knockY = 0;
      this.status = {};
      this.phaseTimer = Math.random() * 10;
      this.stuckTime = 0;
      this.repathDelay = rand(3, 5);
      this.waypoint = null;
    }

    update(dt) {
      if (!this.active) return;
      this.phaseTimer += dt;
      this.attackCooldown -= dt;
      this.specialCooldown -= dt;
      this.shootCooldown -= dt;

      this.applyStatus(dt);
      if (!this.active) return;

      if (this.knockX || this.knockY) {
        moveCircle(this, this.knockX * dt, this.knockY * dt);
        this.knockX *= Math.pow(0.035, dt);
        this.knockY *= Math.pow(0.035, dt);
      }

      if (this.chargeTime > 0) {
        this.chargeTime -= dt;
        moveCircle(this, Math.cos(this.chargeAngle) * 520 * dt, Math.sin(this.chargeAngle) * 520 * dt);
        this.tryMelee();
        return;
      }

      if (this.windup > 0) {
        this.windup -= dt;
        if (this.windup <= 0) {
          this.chargeAngle = angleTo(this.x, this.y, player.x, player.y);
          this.chargeTime = this.isBoss ? 0.55 : 0.42;
          spawnBurst(this.x, this.y, "#ff3a58", 18, 180);
        }
        return;
      }

      if (this.waypoint) {
        this.waypoint.life -= dt;
        if (this.waypoint.life <= 0 || dist(this.x, this.y, this.waypoint.x, this.waypoint.y) < this.radius + 30) {
          this.waypoint = null;
        }
      }

      const targetX = this.waypoint ? this.waypoint.x : player.x;
      const targetY = this.waypoint ? this.waypoint.y : player.y;
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const distanceToPlayer = Math.hypot(dx, dy) || 1;
      const normalX = dx / distanceToPlayer;
      const normalY = dy / distanceToPlayer;
      let moveX = normalX;
      let moveY = normalY;

      if (this.behavior === "ranged") {
        const preferred = 420;
        if (distanceToPlayer < preferred - 80) {
          moveX = -normalX;
          moveY = -normalY;
        } else if (distanceToPlayer < preferred + 80) {
          moveX = 0;
          moveY = 0;
        }
        if (this.shootCooldown <= 0 && distanceToPlayer < 620) {
          this.fireEnemyProjectile("spike", this.damage, 560, "#d7e6aa");
          this.shootCooldown = rand(1.4, 2.2);
        }
      } else if (this.behavior === "healer") {
        if (distanceToPlayer < 470) {
          moveX = -normalX;
          moveY = -normalY;
        }
        if (this.specialCooldown <= 0) {
          this.healAllies();
          this.specialCooldown = 2.2;
        }
      } else if (this.behavior === "dodger") {
        const side = Math.sin(this.phaseTimer * 6) * 1.15;
        moveX = normalX + -normalY * side;
        moveY = normalY + normalX * side;
      } else if (this.behavior === "charger" || this.behavior === "bossButcher") {
        if (this.specialCooldown <= 0 && distanceToPlayer < 650) {
          this.windup = this.isBoss ? 0.88 : 0.62;
          this.specialCooldown = this.isBoss ? 4.2 : 5.6;
          createWarning(player.x, player.y, this.isBoss ? 130 : 90, this.windup, this.damage * 0.7);
        }
      } else if (this.behavior === "screamer") {
        if (this.specialCooldown <= 0) {
          this.scream();
          this.specialCooldown = rand(5, 7);
        }
      } else if (this.behavior === "brute" || this.behavior === "bossMutant") {
        if (this.specialCooldown <= 0 && distanceToPlayer < 520) {
          createExplosion(this.x, this.y, this.isBoss ? 170 : 120, this.damage * 0.6, "enemy", "#ff3a58", false);
          createShockwave(this.x, this.y, this.isBoss ? 190 : 135, this.damage * 0.7);
          this.specialCooldown = this.isBoss ? 4.3 : 5.2;
        }
      } else if (this.behavior === "bossQueen") {
        if (this.specialCooldown <= 0) {
          this.scream(true);
          this.fireEnemyProjectile("boss", 18, 430, "#b55cff", 5);
          this.specialCooldown = 3.6;
        }
      } else if (this.behavior === "bossTitan") {
        if (this.specialCooldown <= 0) {
          createWarning(player.x + rand(-120, 120), player.y + rand(-120, 120), 116, 0.9, this.damage * 0.8);
          this.fireEnemyProjectile("boss", 16, 430, "#59ff68", 3);
          this.specialCooldown = 3.1;
        }
      }

      const sep = this.separation();
      moveX += sep.x;
      moveY += sep.y;
      const moveLen = Math.hypot(moveX, moveY) || 1;
      moveX /= moveLen;
      moveY /= moveLen;
      let speed = this.speed;
      if (this.status.slow) speed *= 0.48;
      if (this.status.freeze) speed *= 0.15;
      if (this.behavior === "crawler") speed *= 1.08;
      const beforeX = this.x;
      const beforeY = this.y;
      moveCircle(this, moveX * speed * dt, moveY * speed * dt);
      const moved = dist(beforeX, beforeY, this.x, this.y);
      if (dist(this.x, this.y, player.x, player.y) > 260 && moved < speed * dt * 0.18) {
        this.stuckTime += dt;
      } else {
        this.stuckTime = Math.max(0, this.stuckTime - dt * 1.5);
      }
      if (this.stuckTime > this.repathDelay) {
        this.waypoint = chooseNavigationPoint(this);
        this.repathDelay = rand(3, 5);
        this.stuckTime = 0;
      }
      this.tryMelee();
    }

    applyStatus(dt) {
      if (this.status.burn) {
        this.status.burn -= dt;
        this.hp -= 18 * dt;
        spawnParticle(this.x + rand(-this.radius, this.radius), this.y + rand(-this.radius, this.radius), rand(-20, 20), rand(-50, 5), rand(3, 7), "#ff8a2a", rand(0.18, 0.32), "soft");
      }
      if (this.status.slow) this.status.slow -= dt;
      if (this.status.freeze) this.status.freeze -= dt;
      if (this.hp <= 0) this.die();
    }

    separation() {
      let sx = 0;
      let sy = 0;
      let count = 0;
      const range = this.radius + 38;
      let checked = 0;
      const step = zombies.length > 95 ? 3 : zombies.length > 65 ? 2 : 1;
      for (const other of zombies) {
        if (step > 1 && other.id % step !== this.id % step) continue;
        if (other === this || !other.active) continue;
        checked++;
        const d = dist(this.x, this.y, other.x, other.y);
        if (d > 0 && d < range) {
          const force = (range - d) / range;
          sx += ((this.x - other.x) / d) * force;
          sy += ((this.y - other.y) / d) * force;
          count++;
        }
        if (checked > 42) break;
      }
      if (!count) return { x: 0, y: 0 };
      return { x: sx / count * 1.35, y: sy / count * 1.35 };
    }

    tryMelee() {
      if (!player || this.attackCooldown > 0) return;
      if (dist(this.x, this.y, player.x, player.y) < this.radius + player.radius + 4) {
        player.takeDamage(this.damage, "melee");
        this.attackCooldown = this.isBoss ? 0.95 : 0.68;
        if (this.behavior === "boomer") this.die(true);
      }
    }

    fireEnemyProjectile(type, damage, speed, color, count) {
      const shots = count || 1;
      const base = angleTo(this.x, this.y, player.x, player.y);
      for (let i = 0; i < shots; i++) {
        const angle = base + (i - (shots - 1) / 2) * 0.16 + rand(-0.035, 0.035);
        projectiles.push(new Projectile({
          x: this.x + Math.cos(angle) * this.radius,
          y: this.y + Math.sin(angle) * this.radius,
          angle,
          owner: "enemy",
          type,
          damage,
          speed,
          range: 720,
          radius: type === "boss" ? 10 : 8,
          color,
          pierce: 0,
          knockback: 80,
          critChance: 0,
          burnChance: 0,
          explosionRadius: type === "boss" ? 70 : 0
        }));
      }
      audio.playZombieSound();
    }

    healAllies() {
      spawnBurst(this.x, this.y, "#f1fff9", 16, 80);
      for (const zombie of zombies) {
        if (zombie !== this && zombie.active && dist(this.x, this.y, zombie.x, zombie.y) < 210) {
          zombie.hp = Math.min(zombie.maxHp, zombie.hp + 34);
          addFloatingText(zombie.x, zombie.y - zombie.radius, "+heal", "#31ff9b", 12);
        }
      }
    }

    scream(isBoss) {
      const count = isBoss ? 4 : 2;
      for (let i = 0; i < count; i++) {
        const point = getSpawnPoint();
        zombies.push(new Zombie(i % 2 ? "runner" : "walker", point.x, point.y, waveManager.wave));
      }
      addFloatingText(this.x, this.y - this.radius - 20, "SCREAM", "#ff5a93", 18);
      screenShake = Math.max(screenShake, 6);
      audio.playZombieSound();
    }

    takeDamage(amount, projectile, critical) {
      let final = amount;
      if (this.armor) final *= 1 - this.armor;
      if (waveManager.modifier?.id === "armored" && !this.isBoss) final *= 0.85;
      this.hp -= final;
      const color = critical ? "#ffffff" : projectile?.color || "#ff3a58";
      addFloatingText(this.x + rand(-8, 8), this.y - this.radius - rand(8, 22), `${critical ? "CRIT " : ""}${Math.ceil(final)}`, color, critical ? 18 : 14);
      if (this.hp <= 0) this.die(false);
    }

    die(forcedExplosion) {
      if (!this.active) return;
      this.active = false;
      spawnBurst(this.x, this.y, "#c41024", this.isBoss ? 80 : 24, this.isBoss ? 260 : 150);
      if (this.behavior === "boomer" || forcedExplosion) createExplosion(this.x, this.y, 145, 58, "enemy", "#ff8a2a");
      if (this.behavior === "splitter") {
        for (let i = 0; i < 4; i++) zombies.push(new Zombie("swarm", this.x + rand(-22, 22), this.y + rand(-22, 22), waveManager.wave));
      }
      if (this.isBoss) {
        achievement("Boss Slayer!");
        slowMotion = 0.5;
        screenShake = Math.max(screenShake, 22);
      }
      player.addKill(this);
      maybeDropPickup(this);
    }

    draw(context) {
      context.save();
      context.translate(this.x, this.y);
      const aim = angleTo(this.x, this.y, player.x, player.y);
      context.rotate(aim);

      context.fillStyle = "rgba(0,0,0,0.34)";
      context.beginPath();
      context.ellipse(0, this.radius * 0.55, this.radius * 0.95, this.radius * 0.4, 0, 0, PI2);
      context.fill();

      context.fillStyle = this.color;
      context.beginPath();
      if (this.behavior === "crawler") {
        context.ellipse(0, 0, this.radius * 1.15, this.radius * 0.68, 0, 0, PI2);
      } else {
        context.arc(0, 0, this.radius, 0, PI2);
      }
      context.fill();

      context.strokeStyle = this.status.freeze ? "#8cf2ff" : this.status.burn ? "#ff8a2a" : "rgba(0,0,0,0.42)";
      context.lineWidth = this.isBoss ? 5 : 3;
      context.stroke();

      context.fillStyle = "#090c0e";
      context.beginPath();
      context.arc(this.radius * 0.28, -this.radius * 0.28, Math.max(3, this.radius * 0.11), 0, PI2);
      context.arc(this.radius * 0.28, this.radius * 0.28, Math.max(3, this.radius * 0.11), 0, PI2);
      context.fill();

      if (this.isBoss) {
        context.strokeStyle = "#111";
        context.lineWidth = 8;
        context.beginPath();
        context.moveTo(-this.radius * 0.2, -this.radius * 0.8);
        context.lineTo(this.radius * 0.34, -this.radius * 1.22);
        context.moveTo(-this.radius * 0.2, this.radius * 0.8);
        context.lineTo(this.radius * 0.34, this.radius * 1.22);
        context.stroke();
      }

      context.restore();

      if (!this.isBoss) {
        const w = this.radius * 2;
        context.fillStyle = "rgba(0,0,0,0.62)";
        context.fillRect(this.x - this.radius, this.y - this.radius - 12, w, 5);
        context.fillStyle = this.hp / this.maxHp < 0.35 ? "#ff3a58" : "#31ff9b";
        context.fillRect(this.x - this.radius, this.y - this.radius - 12, w * clamp(this.hp / this.maxHp, 0, 1), 5);
      }
    }
  }
  Zombie.nextId = 1;

  class Pickup extends Entity {
    constructor(type, x, y, value) {
      const def = PICKUP_DEFS[type];
      super(x, y, def.radius);
      this.type = type;
      this.def = def;
      this.value = value || 1;
      this.life = def.life;
      this.age = 0;
      this.spin = Math.random() * PI2;
    }

    update(dt) {
      this.life -= dt;
      this.age += dt;
      this.spin += dt * 4;
      if (this.life <= 0) this.active = false;
      const magnet = 72 + player.upgrades.magnet * 26;
      const d = dist(this.x, this.y, player.x, player.y);
      if (d < magnet || (input.isDown("KeyE") && d < magnet * 1.75)) {
        const a = angleTo(this.x, this.y, player.x, player.y);
        const pull = lerp(180, 700, clamp(1 - d / (magnet * 1.75), 0, 1));
        this.x += Math.cos(a) * pull * dt;
        this.y += Math.sin(a) * pull * dt;
      }
      if (d < this.radius + player.radius + 6) this.collect();
    }

    collect() {
      this.active = false;
      audio.playPickupSound();
      const p = player;
      const label = this.def.name;
      if (this.type === "coin") p.addMoney(this.value);
      if (this.type === "cash") p.addMoney(this.value);
      if (this.type === "medkit") p.skills.medkits += 1;
      if (this.type === "armor") p.repairArmor(28);
      if (this.type === "ammo") addAmmoToAll(0.22);
      if (this.type === "grenade") p.skills.grenades += 1;
      if (this.type === "damageBoost") p.boosts.damage = 12;
      if (this.type === "speedBoost") p.boosts.speed = 10;
      if (this.type === "nuke") {
        createExplosion(p.x, p.y, 900, 360, "player", "#ffffff", false);
        screenShake = Math.max(screenShake, 30);
      }
      if (this.type === "freeze") {
        for (const zombie of zombies) zombie.status.freeze = Math.max(zombie.status.freeze || 0, 4);
        addToast("Freeze bomb detonated");
      }
      if (this.type === "turretKit") p.skills.turrets += 1;
      addFloatingText(this.x, this.y - 20, label, this.def.color, 14);
    }

    draw(context) {
      context.save();
      context.translate(this.x, this.y);
      context.rotate(this.spin);
      const blink = 0.72 + Math.sin(this.age * 8) * 0.18;
      context.globalAlpha = this.life < 4 ? blink : 1;
      context.shadowColor = this.def.color;
      context.shadowBlur = 16;
      context.fillStyle = this.def.color;
      context.beginPath();
      context.roundRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2, 4);
      context.fill();
      context.strokeStyle = "rgba(255,255,255,0.7)";
      context.strokeRect(-this.radius * 0.55, -this.radius * 0.55, this.radius * 1.1, this.radius * 1.1);
      context.restore();
    }
  }

  class Turret extends Entity {
    constructor(x, y) {
      super(x, y, 18);
      this.life = 20;
      this.cooldown = 0;
      this.angle = 0;
    }

    update(dt) {
      this.life -= dt;
      if (this.life <= 0) this.active = false;
      this.cooldown -= dt;
      const target = nearestZombie(this.x, this.y, 520);
      if (target) {
        this.angle = angleTo(this.x, this.y, target.x, target.y);
        if (this.cooldown <= 0) {
          this.cooldown = 0.18;
          projectiles.push(new Projectile({
            x: this.x + Math.cos(this.angle) * 18,
            y: this.y + Math.sin(this.angle) * 18,
            angle: this.angle,
            owner: "player",
            type: "normal",
            damage: 18 + player.upgrades.damage * 2,
            speed: 860,
            range: 580,
            radius: 4,
            color: "#48d8ff",
            pierce: 0,
            knockback: 35,
            critChance: 0.06,
            burnChance: 0,
            explosionRadius: 0
          }));
          spawnMuzzle(this.x, this.y, this.angle, "#48d8ff");
        }
      }
    }

    draw(context) {
      context.save();
      context.translate(this.x, this.y);
      context.fillStyle = "#101820";
      context.strokeStyle = "#48d8ff";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, this.radius, 0, PI2);
      context.fill();
      context.stroke();
      context.rotate(this.angle);
      context.fillStyle = "#48d8ff";
      context.fillRect(2, -4, 26, 8);
      context.restore();
    }
  }

  class Drone extends Entity {
    constructor(index) {
      super(player.x, player.y, 10);
      this.index = index;
      this.angle = index * PI2 / 3;
      this.cooldown = 0;
    }

    update(dt) {
      this.angle += dt * 2.4;
      this.x = player.x + Math.cos(this.angle) * 78;
      this.y = player.y + Math.sin(this.angle) * 78;
      this.cooldown -= dt;
      const target = nearestZombie(this.x, this.y, 390);
      if (target && this.cooldown <= 0) {
        this.cooldown = 0.46;
        const a = angleTo(this.x, this.y, target.x, target.y);
        projectiles.push(new Projectile({
          x: this.x, y: this.y, angle: a, owner: "player", type: "laser",
          damage: 16, speed: 1600, range: 420, radius: 3, color: "#31ff9b",
          pierce: 1, knockback: 30, critChance: 0.05, burnChance: 0, explosionRadius: 0
        }));
      }
    }

    draw(context) {
      context.save();
      context.translate(this.x, this.y);
      context.fillStyle = "#31ff9b";
      context.shadowColor = "#31ff9b";
      context.shadowBlur = 12;
      context.beginPath();
      context.arc(0, 0, 9, 0, PI2);
      context.fill();
      context.fillStyle = "#04100c";
      context.fillRect(-3, -3, 6, 6);
      context.restore();
    }
  }

  class Particle {
    constructor(x, y, vx, vy, size, color, life, type) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.size = size;
      this.color = color;
      this.life = life;
      this.maxLife = life;
      this.type = type || "circle";
      this.active = true;
    }

    update(dt) {
      this.life -= dt;
      if (this.life <= 0) this.active = false;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= Math.pow(0.5, dt);
      this.vy *= Math.pow(0.5, dt);
      if (this.type === "smoke") this.size += 12 * dt;
    }

    draw(context) {
      const alpha = clamp(this.life / this.maxLife, 0, 1);
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = this.color;
      if (this.type === "spark") {
        context.strokeStyle = this.color;
        context.lineWidth = Math.max(1, this.size * 0.35);
        context.beginPath();
        context.moveTo(this.x, this.y);
        context.lineTo(this.x - this.vx * 0.035, this.y - this.vy * 0.035);
        context.stroke();
      } else {
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, PI2);
        context.fill();
      }
      context.restore();
    }
  }

  class FloatingText {
    constructor(x, y, text, color, size) {
      this.x = x;
      this.y = y;
      this.text = text;
      this.color = color;
      this.size = size;
      this.life = 0.82;
      this.maxLife = this.life;
      this.vy = -48;
      this.active = true;
    }

    update(dt) {
      this.life -= dt;
      if (this.life <= 0) this.active = false;
      this.y += this.vy * dt;
      this.vy *= Math.pow(0.72, dt);
    }

    draw(context) {
      context.save();
      context.globalAlpha = clamp(this.life / this.maxLife, 0, 1);
      context.font = `800 ${this.size}px Segoe UI, Arial`;
      context.textAlign = "center";
      context.lineWidth = 4;
      context.strokeStyle = "rgba(0,0,0,0.75)";
      context.fillStyle = this.color;
      context.strokeText(this.text, this.x, this.y);
      context.fillText(this.text, this.x, this.y);
      context.restore();
    }
  }

  class AreaEffect {
    constructor(x, y, radius, duration, type, options) {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.duration = duration;
      this.life = duration;
      this.type = type;
      this.options = options || {};
      this.tick = 0;
      this.active = true;
    }

    update(dt) {
      this.life -= dt;
      if (this.life <= 0) {
        this.active = false;
        if (this.type === "warning") {
          createExplosion(this.x, this.y, this.radius, this.options.damage || 28, "enemy", "#ff3a58");
          if (player && dist(this.x, this.y, player.x, player.y) < this.radius + player.radius) {
            player.takeDamage(this.options.damage || 28, "bossSkill");
          }
        }
        return;
      }
    }

    draw(context) {
      const t = clamp(this.life / this.duration, 0, 1);
      context.save();
      if (this.type === "warning") {
        context.globalAlpha = 0.18 + Math.sin(gameTime * 22) * 0.08;
        context.fillStyle = "#ff3a58";
        context.beginPath();
        context.arc(this.x, this.y, this.radius * (1 + (1 - t) * 0.08), 0, PI2);
        context.fill();
        context.globalAlpha = 0.9;
        context.strokeStyle = "#ff3a58";
        context.lineWidth = 3;
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, PI2);
        context.stroke();
      } else if (this.type === "shockwave") {
        context.globalAlpha = t;
        context.strokeStyle = this.options.color || "#ffffff";
        context.lineWidth = 5;
        context.beginPath();
        context.arc(this.x, this.y, this.radius * (1 - t), 0, PI2);
        context.stroke();
      }
      context.restore();
    }
  }

  // Map generation
  function configureMapForWave(wave, force) {
    const tier = MAP_TIERS.find(item => wave <= item.maxWave) || MAP_TIERS[MAP_TIERS.length - 1];
    if (!force && tier.size === currentMapSize) return false;
    currentMapSize = tier.size;
    MAP.width = tier.size;
    MAP.height = tier.size;
    return true;
  }

  function generateMap() {
    world.obstacles = [];
    world.decor = [];
    const center = MAP.width / 2;
    const roadSize = clamp(MAP.width * 0.12, 120, 320);
    world.roads = [
      { x: 0, y: center - roadSize / 2, w: MAP.width, h: roadSize },
      { x: center - roadSize / 2, y: 0, w: roadSize, h: MAP.height }
    ];
    if (MAP.width >= 1800) {
      world.roads.push({ x: MAP.width * 0.1, y: MAP.height * 0.22, w: MAP.width * 0.46, h: roadSize * 0.58 });
      world.roads.push({ x: MAP.width * 0.58, y: MAP.height * 0.74, w: MAP.width * 0.34, h: roadSize * 0.62 });
    }
    world.lights = [];
    const edge = clamp(MAP.width * 0.09, 82, 220);
    const holeR = clamp(MAP.width * 0.055, 48, 72);
    world.spawnHoles = [
      { x: edge, y: edge, r: holeR }, { x: MAP.width - edge, y: edge, r: holeR },
      { x: edge, y: MAP.height - edge, r: holeR }, { x: MAP.width - edge, y: MAP.height - edge, r: holeR },
      { x: center, y: edge * 0.62, r: holeR * 0.92 }, { x: center, y: MAP.height - edge * 0.62, r: holeR * 0.92 },
      { x: edge * 0.62, y: center, r: holeR * 0.92 }, { x: MAP.width - edge * 0.62, y: center, r: holeR * 0.92 }
    ];
    world.barrels = [];
    world.supplyCrates = [];
    world.hazardZones = [];

    const addObstacle = (x, y, w, h, type, color) => world.obstacles.push({ x, y, w, h, type, color });

    const scale = MAP.width / 1000;
    const obstacleCount = MAP.width <= 1000 ? 9 : MAP.width <= 2000 ? 20 : 34;
    for (let i = 0; i < obstacleCount; i++) {
      const x = rand(120, MAP.width - 220);
      const y = rand(120, MAP.height - 220);
      if (dist(x, y, center, center) < 180 * scale || collidesWorld(x, y, 70)) continue;
      const horizontal = chance(0.5);
      addObstacle(
        x,
        y,
        horizontal ? rand(110, 260) * Math.min(scale, 1.25) : rand(48, 72),
        horizontal ? rand(48, 76) : rand(110, 260) * Math.min(scale, 1.25),
        chance(0.25) ? "car" : chance(0.35) ? "container" : "debris",
        chance(0.5) ? "#32383d" : "#464b38"
      );
    }

    const barrelCount = MAP.width <= 1000 ? 7 : MAP.width <= 2000 ? 16 : 24;
    for (let i = 0; i < barrelCount; i++) {
      const spot = randomOpenPoint(180);
      world.barrels.push({ x: spot.x, y: spot.y, r: 18, hp: 60, active: true });
    }

    const crateCount = MAP.width <= 1000 ? 3 : MAP.width <= 2000 ? 5 : 7;
    for (let i = 0; i < crateCount; i++) {
      const spot = randomOpenPoint(220);
      world.supplyCrates.push({ x: spot.x, y: spot.y, r: 22, opened: false });
    }

    const lightCount = MAP.width <= 1000 ? 10 : MAP.width <= 2000 ? 21 : 32;
    for (let i = 0; i < lightCount; i++) {
      const x = rand(120, MAP.width - 120);
      const y = rand(120, MAP.height - 120);
      world.lights.push({ x, y, r: rand(145, 220), color: chance(0.7) ? "#ffd35a" : "#48d8ff" });
    }

    world.decor = [];
    const density = QUALITY[save.data.quality]?.decorDensity || 1;
    const decorCount = Math.floor((70 + MAP.width / 20) * density);
    for (let i = 0; i < decorCount; i++) {
      world.decor.push({
        x: rand(0, MAP.width),
        y: rand(0, MAP.height),
        r: rand(5, 32),
        type: chance(0.35) ? "blood" : chance(0.5) ? "crack" : "scrap",
        rot: rand(0, PI2),
        color: chance(0.35) ? "#3f0d15" : "#232a2e"
      });
    }
  }

  function seedMapPickups() {
    const count = MAP.width <= 1000 ? 8 : MAP.width <= 2000 ? 15 : 24;
    for (let i = 0; i < count; i++) {
      const spot = randomOpenPoint(120);
      const type = chance(0.55) ? "ammo" : chance(0.45) ? "coin" : chance(0.35) ? "armor" : "cash";
      pickups.push(new Pickup(type, spot.x, spot.y, type === "coin" ? randInt(5, 18) : type === "cash" ? randInt(20, 55) : 1));
    }
  }

  // Collision system
  function outsideMap(x, y, r) {
    return x < r || y < r || x > MAP.width - r || y > MAP.height - r;
  }

  function circleRectCollision(cx, cy, r, rect) {
    const closestX = clamp(cx, rect.x, rect.x + rect.w);
    const closestY = clamp(cy, rect.y, rect.y + rect.h);
    return dist(cx, cy, closestX, closestY) < r;
  }

  function collidesWorld(x, y, r) {
    if (outsideMap(x, y, r)) return true;
    for (const obstacle of world.obstacles) {
      if (circleRectCollision(x, y, r, obstacle)) return true;
    }
    return false;
  }

  function collidesBarrel(x, y, r) {
    for (const barrel of world.barrels) {
      if (barrel.active && dist(x, y, barrel.x, barrel.y) < r + barrel.r) return true;
    }
    return false;
  }

  function moveCircle(entity, dx, dy) {
    const nx = entity.x + dx;
    if (!collidesWorld(nx, entity.y, entity.radius) && !collidesBarrel(nx, entity.y, entity.radius * 0.7)) entity.x = nx;
    const ny = entity.y + dy;
    if (!collidesWorld(entity.x, ny, entity.radius) && !collidesBarrel(entity.x, ny, entity.radius * 0.7)) entity.y = ny;
  }

  function lineCircleDistance(x1, y1, x2, y2, cx, cy) {
    const lengthSq = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (lengthSq === 0) return dist(x1, y1, cx, cy);
    const t = clamp(((cx - x1) * (x2 - x1) + (cy - y1) * (y2 - y1)) / lengthSq, 0, 1);
    return dist(cx, cy, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
  }

  function randomOpenPoint(margin) {
    for (let attempts = 0; attempts < 500; attempts++) {
      const x = rand(margin, MAP.width - margin);
      const y = rand(margin, MAP.height - margin);
      if (!collidesWorld(x, y, 48) && dist(x, y, MAP.width / 2, MAP.height / 2) > Math.min(220, MAP.width * 0.18)) return { x, y };
    }
    return { x: MAP.width / 2 + rand(-MAP.width * 0.16, MAP.width * 0.16), y: MAP.height / 2 + rand(-MAP.height * 0.16, MAP.height * 0.16) };
  }

  function chooseNavigationPoint(zombie) {
    const baseAngle = angleTo(zombie.x, zombie.y, player.x, player.y);
    const options = [
      baseAngle + Math.PI / 2,
      baseAngle - Math.PI / 2,
      baseAngle + Math.PI * 0.72,
      baseAngle - Math.PI * 0.72,
      rand(0, PI2)
    ];
    for (const option of options) {
      for (const radius of [140, 220, 320, 430]) {
        const x = clamp(player.x + Math.cos(option) * radius, 70, MAP.width - 70);
        const y = clamp(player.y + Math.sin(option) * radius, 70, MAP.height - 70);
        if (!collidesWorld(x, y, zombie.radius + 10)) return { x, y, life: 3.8 };
      }
    }
    const fallback = randomOpenPoint(90);
    return { ...fallback, life: 3.8 };
  }

  // Particle system
  function particleCap() {
    return QUALITY[save.data.quality]?.particles || QUALITY.medium.particles;
  }

  function maxActiveZombies() {
    if (save.data.quality === "low") return 58;
    if (save.data.quality === "high") return 115;
    return 86;
  }

  function spawnParticle(x, y, vx, vy, size, color, life, type) {
    if (particles.length > particleCap()) return;
    particles.push(new Particle(x, y, vx, vy, size, color, life, type));
  }

  function spawnBurst(x, y, color, count, force) {
    const capScale = particles.length > particleCap() * 0.72 ? 0.45 : 1;
    const total = Math.max(1, Math.floor(count * capScale));
    for (let i = 0; i < total; i++) {
      const a = rand(0, PI2);
      const s = rand(force * 0.25, force);
      spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(2, 7), color, rand(0.25, 0.72), chance(0.35) ? "spark" : "circle");
    }
  }

  function spawnMuzzle(x, y, angle, color) {
    for (let i = 0; i < 7; i++) {
      const a = angle + rand(-0.45, 0.45);
      spawnParticle(x, y, Math.cos(a) * rand(80, 240), Math.sin(a) * rand(80, 240), rand(3, 8), color, rand(0.09, 0.2), "spark");
    }
  }

  function spawnShell(x, y, angle) {
    const side = angle + Math.PI / 2 + rand(-0.4, 0.4);
    spawnParticle(x, y, Math.cos(side) * rand(70, 130), Math.sin(side) * rand(70, 130), rand(2, 4), "#c8a35a", rand(0.35, 0.65), "spark");
  }

  function addFloatingText(x, y, text, color, size) {
    floatingTexts.push(new FloatingText(x, y, text, color, size));
  }

  function updateObjectList(list, dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      list[i].update(dt);
      if (!list[i].active) list.splice(i, 1);
    }
  }

  // Explosion and area effects
  function createExplosion(x, y, radius, damage, owner, color, damagePlayer = true) {
    spawnBurst(x, y, color || "#ff8a2a", Math.min(90, radius / 2), radius * 2.2);
    areaEffects.push(new AreaEffect(x, y, radius, 0.42, "shockwave", { color: color || "#ff8a2a" }));
    screenShake = Math.max(screenShake, clamp(radius / 7, 8, 28));
    hitStop = Math.max(hitStop, radius > 150 ? 0.055 : 0.02);
    audio.playExplosionSound();

    if (owner === "player") {
      for (const zombie of zombies) {
        if (!zombie.active) continue;
        const d = dist(x, y, zombie.x, zombie.y);
        if (d < radius + zombie.radius) {
          const falloff = 1 - d / (radius + zombie.radius);
          zombie.takeDamage(damage * (0.35 + falloff * 0.9), { color, knockback: radius * 1.4 }, false);
          const a = angleTo(x, y, zombie.x, zombie.y);
          zombie.knockX += Math.cos(a) * radius * 2.4 * (1 - zombie.knockResist);
          zombie.knockY += Math.sin(a) * radius * 2.4 * (1 - zombie.knockResist);
          if (chance(0.35)) zombie.status.burn = Math.max(zombie.status.burn || 0, 2.4);
        }
      }
      for (const barrel of world.barrels) {
        if (barrel.active && dist(x, y, barrel.x, barrel.y) < radius + barrel.r) explodeBarrel(barrel);
      }
      if (damagePlayer && dist(x, y, player.x, player.y) < radius + player.radius) {
        const d = dist(x, y, player.x, player.y);
        player.takeDamage(damage * (1 - d / (radius + player.radius)) + 8, "selfExplosion");
      }
    }
  }

  function createShockwave(x, y, radius, damage) {
    areaEffects.push(new AreaEffect(x, y, radius, 0.5, "shockwave", { color: "#ff3a58" }));
    if (player && dist(x, y, player.x, player.y) < radius + player.radius) player.takeDamage(damage, "bossSkill");
  }

  function createWarning(x, y, radius, delay, damage) {
    areaEffects.push(new AreaEffect(x, y, radius, delay, "warning", { damage }));
  }

  function explodeBarrel(barrel) {
    if (!barrel.active) return;
    barrel.active = false;
    createExplosion(barrel.x, barrel.y, 175, 110, "player", "#ff8a2a");
  }

  // Pickups
  function maybeDropPickup(zombie) {
    const dropChance = zombie.isBoss ? 1 : zombie.behavior === "swarm" ? 0.18 : 0.42;
    if (!chance(dropChance)) return;
    const roll = Math.random();
    let type = "coin";
    if (roll > 0.18) type = "cash";
    if (roll > 0.38) type = "ammo";
    if (roll > 0.64) type = "armor";
    if (roll > 0.75) type = "medkit";
    if (roll > 0.84) type = "grenade";
    if (roll > 0.9) type = chance(0.5) ? "damageBoost" : "speedBoost";
    if (roll > 0.965) type = chance(0.5) ? "freeze" : "turretKit";
    if (zombie.isBoss) type = chance(0.45) ? "nuke" : "turretKit";
    const value = type === "coin" ? randInt(5, 14) : type === "cash" ? randInt(18, 54) : 1;
    pickups.push(new Pickup(type, zombie.x + rand(-16, 16), zombie.y + rand(-16, 16), value));
  }

  function addAmmoToAll(percent) {
    for (const id of player.ownedWeapons) {
      const def = WEAPON_DEFS[id];
      const stateForWeapon = player.weaponStates[id];
      stateForWeapon.reserveAmmo += Math.max(1, Math.round(def.magazineSize * percent + def.reserveAmmo * percent * 0.3));
    }
    addToast("Ammo restocked");
  }

  function openSupplyCrates() {
    for (const crate of world.supplyCrates) {
      if (!crate.opened && dist(player.x, player.y, crate.x, crate.y) < 70) {
        crate.opened = true;
        addToast("Supply crate opened");
        for (let i = 0; i < 4; i++) {
          const types = ["cash", "ammo", "armor", "medkit", "grenade", "turretKit"];
          pickups.push(new Pickup(types[randInt(0, types.length - 1)], crate.x + rand(-28, 28), crate.y + rand(-28, 28)));
        }
        audio.playPickupSound();
      }
    }
  }

  // Skill / equipment
  function useGrenade() {
    if (state !== STATES.PLAYING && state !== STATES.BREAK) return;
    if (player.skills.grenades <= 0 || player.skills.grenadeCooldown > 0) return;
    player.skills.grenades -= 1;
    player.skills.grenadeCooldown = 1.1;
    const a = angleTo(player.x, player.y, mouse.worldX, mouse.worldY);
    projectiles.push(new Projectile({
      x: player.x, y: player.y, angle: a, owner: "player", type: "rocket",
      damage: 105, speed: 620, range: Math.min(560, dist(player.x, player.y, mouse.worldX, mouse.worldY)),
      radius: 10, color: "#ff8a2a", pierce: 0, knockback: 300, critChance: 0,
      burnChance: 0.25, explosionRadius: 170
    }));
    addToast("Grenade thrown");
  }

  function placeMine() {
    if (player.skills.mines <= 0 || player.skills.mineCooldown > 0) return;
    player.skills.mines -= 1;
    player.skills.mineCooldown = 1.25;
    landmines.push({ x: player.x, y: player.y, r: 17, active: true, age: 0 });
    addToast("Mine armed");
  }

  function deployTurret() {
    if (player.skills.turrets <= 0 || player.skills.turretCooldown > 0) return;
    player.skills.turrets -= 1;
    player.skills.turretCooldown = 2;
    turrets.push(new Turret(player.x, player.y));
    addToast("Turret deployed");
  }

  function useMedkit() {
    if (player.skills.medkits <= 0 || player.skills.medkitCooldown > 0 || player.hp >= player.maxHp) return;
    player.skills.medkits -= 1;
    player.skills.medkitCooldown = 6;
    player.heal(58);
    audio.playPickupSound();
  }

  function updateLandmines(dt) {
    for (let i = landmines.length - 1; i >= 0; i--) {
      const mine = landmines[i];
      mine.age += dt;
      for (const zombie of zombies) {
        if (zombie.active && dist(mine.x, mine.y, zombie.x, zombie.y) < mine.r + zombie.radius) {
          createExplosion(mine.x, mine.y, 150, 95, "player", "#ff8a2a");
          mine.active = false;
          break;
        }
      }
      if (!mine.active) landmines.splice(i, 1);
    }
  }

  function syncDrones() {
    const wanted = player.upgrades.drone;
    while (drones.length < wanted) drones.push(new Drone(drones.length));
    while (drones.length > wanted) drones.pop();
  }

  // Wave manager
  const waveManager = {
    wave: 0,
    active: false,
    spawnRemaining: 0,
    spawnTimer: 0,
    breakTimer: 0,
    bossAlive: null,
    modifier: null,
    reset() {
      this.wave = 0;
      this.active = false;
      this.spawnRemaining = 0;
      this.spawnTimer = 0;
      this.breakTimer = 0;
      this.bossAlive = null;
      this.modifier = null;
    },
    beginNextWave() {
      this.wave += 1;
      if (configureMapForWave(this.wave, false)) {
        generateMap();
        projectiles = [];
        pickups = [];
        turrets = [];
        landmines = [];
        player.x = MAP.width / 2;
        player.y = MAP.height / 2 + Math.min(90, MAP.height * 0.08);
        seedMapPickups();
        addToast(`Map expanded to ${MAP.width}x${MAP.height}`, true);
      }
      this.active = true;
      this.breakTimer = 0;
      this.bossAlive = null;
      this.modifier = chooseWaveModifier(this.wave);
      const bossWave = this.wave % 5 === 0;
      const baseCount = randInt(10, 12) + Math.floor((this.wave - 1) * 4.4);
      this.spawnRemaining = bossWave ? Math.floor(baseCount * 0.75) : baseCount;
      this.spawnTimer = 0.1;
      state = STATES.PLAYING;
      closeShop(false);
      announce(bossWave ? "Boss Incoming" : `Wave ${this.wave}`);
      addToast(bossWave ? "Boss Incoming" : `Wave ${this.wave} started`, bossWave);
      if (this.modifier) addToast(`Modifier: ${this.modifier.name}`);
      if (bossWave) {
        const bossDef = BOSS_DEFS[Math.floor((this.wave / 5 - 1) % BOSS_DEFS.length)];
        const point = getSpawnPoint(true);
        const boss = new Zombie("boss", point.x, point.y, this.wave, bossDef);
        zombies.push(boss);
        this.bossAlive = boss;
        createExplosion(point.x, point.y, 180, 0, "enemy", boss.color, false);
      }
    },
    update(dt) {
      if (state === STATES.BREAK) {
        this.breakTimer -= dt;
        if (this.breakTimer <= 0) this.beginNextWave();
        return;
      }
      if (!this.active) return;
      this.spawnTimer -= dt;
      const interval = clamp(1.18 - this.wave * 0.035, 0.24, 1.18);
      if (this.spawnRemaining > 0 && this.spawnTimer <= 0 && zombies.length < maxActiveZombies()) {
        const batch = this.wave > 12 ? 2 : 1;
        for (let i = 0; i < batch && this.spawnRemaining > 0; i++) {
          spawnWaveZombie();
          this.spawnRemaining -= 1;
        }
        this.spawnTimer = interval;
      }
      if (this.spawnRemaining <= 0 && zombies.length === 0) this.clearWave();
    },
    clearWave() {
      this.active = false;
      const bonus = Math.round(75 + this.wave * 32 + (this.wave % 5 === 0 ? 250 : 0));
      player.addMoney(bonus);
      player.score += bonus * 6;
      announce("Wave Cleared");
      addToast(`Wave cleared - bonus ${formatMoney(bonus)}`, true);
      if (this.wave % 3 === 0) callSupplyDrop();
      this.breakTimer = 5;
      state = STATES.BREAK;
      setTimeout(() => {
        if (state === STATES.BREAK) openShop(true);
      }, 450);
    }
  };

  function chooseWaveModifier(wave) {
    if (wave < 4 || !chance(0.38)) return null;
    const mods = [
      { id: "fast", name: "Fast Zombies" },
      { id: "double", name: "Double Rewards" },
      { id: "armored", name: "Thick Skulls" }
    ];
    return mods[randInt(0, mods.length - 1)];
  }

  function spawnWaveZombie() {
    const point = getSpawnPoint();
    const type = pickZombieType();
    zombies.push(new Zombie(type, point.x, point.y, waveManager.wave));
    spawnBurst(point.x, point.y, "#53605e", 14, 110);
  }

  function pickZombieType() {
    const available = Object.entries(ZOMBIE_DEFS).filter(([, def]) => waveManager.wave >= def.unlock);
    let total = 0;
    for (const [, def] of available) total += def.weight;
    let roll = Math.random() * total;
    for (const [key, def] of available) {
      roll -= def.weight;
      if (roll <= 0) return key;
    }
    return "walker";
  }

  function getSpawnPoint(allowBoss) {
    const holes = [...world.spawnHoles].sort(() => Math.random() - 0.5);
    for (const hole of holes) {
      for (let i = 0; i < 16; i++) {
        const a = rand(0, PI2);
        const r = rand(hole.r * 0.15, hole.r * (allowBoss ? 0.65 : 0.9));
        const x = hole.x + Math.cos(a) * r;
        const y = hole.y + Math.sin(a) * r;
        if (dist(x, y, player.x, player.y) > (allowBoss ? 600 : 480) && !collidesWorld(x, y, allowBoss ? 60 : 30)) {
          return { x, y };
        }
      }
    }
    return randomOpenPoint(200);
  }

  function callSupplyDrop() {
    announce("Supply Drop Incoming");
    addToast("Supply drop marked on the map", true);
    const spot = randomOpenPoint(250);
    world.supplyCrates.push({ x: spot.x, y: spot.y, r: 22, opened: false });
    spawnBurst(spot.x, spot.y, "#ffd35a", 35, 180);
  }

  // Shop system
  const SHOP_UPGRADES = [
    { id: "hp", name: "Max HP +20", desc: "Increases health and heals the same amount.", apply: () => { player.maxHp += 20; player.hp += 20; } },
    { id: "armor", name: "Armor +20", desc: "Increases armor capacity and repairs it.", apply: () => { player.maxArmor += 20; player.armor = Math.min(player.maxArmor, player.armor + 20); } },
    { id: "speed", name: "Speed +", desc: "Improves normal movement and sprint control.", apply: () => { player.baseSpeed += 8; } },
    { id: "stamina", name: "Stamina +20", desc: "More sprint and dash stamina.", apply: () => { player.maxStamina += 20; player.stamina += 20; } },
    { id: "fireRate", name: "Fire Rate +", desc: "All weapons cycle faster.", apply: () => {} },
    { id: "reload", name: "Reload Speed +", desc: "Shortens reload time for every weapon.", apply: () => {} },
    { id: "damage", name: "Damage +", desc: "All player damage increases.", apply: () => {} },
    { id: "crit", name: "Critical Chance +", desc: "More frequent headshot-style critical hits.", apply: () => {} },
    { id: "pierce", name: "Bullet Pierce +", desc: "Every two levels adds extra pierce to shots.", apply: () => {} },
    { id: "magnet", name: "Magnet Range +", desc: "Pickups fly to you from farther away.", apply: () => {} },
    { id: "money", name: "Money Bonus +", desc: "Earn more cash from every kill.", apply: () => {} },
    { id: "drone", name: "Combat Drone", desc: "Adds one orbiting auto-firing drone.", max: 3, apply: () => syncDrones() }
  ];

  function openShop(auto) {
    if (!player || state === STATES.GAME_OVER || state === STATES.MENU) return;
    previousState = auto ? STATES.BREAK : state;
    state = STATES.SHOP;
    dom.shopOverlay.classList.remove("hidden");
    renderShop();
    audio.playShopSound();
  }

  function closeShop(returnToPrevious = true) {
    dom.shopOverlay.classList.add("hidden");
    if (!returnToPrevious || state !== STATES.SHOP) return;
    state = previousState === STATES.BREAK ? STATES.BREAK : STATES.PLAYING;
  }

  function renderShop() {
    if (!player) return;
    dom.shopMoney.textContent = formatMoney(player.money);
    document.querySelectorAll(".shop-tab").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.tab === activeShopTab);
    });
    let html = "";
    if (activeShopTab === "weapons") {
      html = WEAPON_ORDER.map(id => {
        const def = WEAPON_DEFS[id];
        const owned = player.ownedWeapons.has(id);
        const equipped = player.loadout.includes(id);
        const disabled = !owned && player.money < def.price;
        const label = owned ? (equipped ? "Equipped" : "Equip Current Slot") : `Buy ${formatMoney(def.price)}`;
        return shopCard(def.name, def.description, [
          def.rarity.toUpperCase(),
          `DMG ${def.damage}`,
          `${def.fireRate}/s`,
          `${def.magazineSize} mag`,
          def.projectileType
        ], label, `weapon:${id}`, disabled || (owned && equipped), owned, RARITY_COLORS[def.rarity], !disabled && !owned ? "can-buy" : "", !disabled && !owned ? "Can buy" : "");
      }).join("");
    } else if (activeShopTab === "ammo") {
      html = [
        ammoCard("General Ammo", "Adds bullets, shells, bolts, and heavy rounds to owned weapons.", 120, "ammo:general"),
        ammoCard("Rocket Ammo", "Adds 8 rockets for launchers.", 260, "ammo:rocket"),
        ammoCard("Energy Cells", "Adds energy and fuel for laser, plasma, and flame weapons.", 220, "ammo:energy"),
        ammoCard("Fill All", "Refills all owned weapon reserve ammo heavily.", 650, "ammo:fill")
      ].join("");
    } else if (activeShopTab === "upgrades") {
      const recommendedId = getRecommendedUpgradeId();
      html = SHOP_UPGRADES.map(upgrade => {
        const level = player.upgrades[upgrade.id];
        const maxed = upgrade.max && level >= upgrade.max;
        const cost = player.upgradeCosts[upgrade.id];
        const affordable = !maxed && player.money >= cost;
        const recommended = upgrade.id === recommendedId && affordable;
        return shopCard(upgrade.name, `${upgrade.desc} Current level: ${level}${upgrade.max ? `/${upgrade.max}` : ""}.`, [
          `Level ${level}`,
          maxed ? "MAX" : formatMoney(cost),
          affordable ? "READY" : "Need cash"
        ], maxed ? "Maxed" : `Upgrade ${formatMoney(cost)}`, `upgrade:${upgrade.id}`, maxed || player.money < cost, false, "#31ff9b", `${affordable ? "can-buy" : ""} ${recommended ? "recommended" : ""}`, recommended ? "Recommended" : affordable ? "Can upgrade" : "");
      }).join("");
    } else {
      html = [
        shopCard("Heal 50 HP", "Emergency heal for damaged survivors.", ["Instant", "$60"], "Buy $60", "heal:small", player.money < 60 || player.hp >= player.maxHp, false, "#31ff9b"),
        shopCard("Full Heal", "Restore health to maximum.", ["Instant", "$180"], "Buy $180", "heal:full", player.money < 180 || player.hp >= player.maxHp, false, "#31ff9b"),
        shopCard("Repair Armor", "Restore armor plating to maximum.", ["Instant", "$150"], "Buy $150", "heal:armor", player.money < 150 || player.armor >= player.maxArmor, false, "#48d8ff"),
        shopCard("Grenade Pack", "Adds three grenades.", ["x3", "$210"], "Buy $210", "gear:grenade", player.money < 210, false, "#ff8a2a"),
        shopCard("Landmine Pack", "Adds two landmines.", ["x2", "$180"], "Buy $180", "gear:mine", player.money < 180, false, "#ffd35a"),
        shopCard("Turret Kit", "Adds one 20-second auto turret.", ["x1", "$340"], "Buy $340", "gear:turret", player.money < 340, false, "#48d8ff")
      ].join("");
    }
    dom.shopItems.innerHTML = html;
  }

  function getRecommendedUpgradeId() {
    if (player.hp < player.maxHp * 0.55 && player.upgrades.hp < 6) return "hp";
    if (player.armor < player.maxArmor * 0.45 && player.upgrades.armor < 6) return "armor";
    if (player.stamina < player.maxStamina * 0.5 && player.upgrades.stamina < 5) return "stamina";
    if (player.upgrades.damage < 5) return "damage";
    if (player.upgrades.fireRate < 4) return "fireRate";
    if (player.upgrades.reload < 4) return "reload";
    if (player.upgrades.drone < 1 && player.money >= player.upgradeCosts.drone) return "drone";
    return "magnet";
  }

  function shopCard(title, desc, meta, label, action, disabled, owned, borderColor, extraClass = "", ribbon = "") {
    return `
      <article class="shop-card ${owned ? "owned" : ""} ${extraClass}" style="border-color:${borderColor || "rgba(255,255,255,0.12)"}">
        ${ribbon ? `<span class="recommend">${ribbon}</span>` : ""}
        <h3>${title}</h3>
        <p>${desc}</p>
        <div class="shop-meta">${meta.map(item => `<span>${item}</span>`).join("")}</div>
        <button type="button" data-shop-action="${action}" ${disabled ? "disabled" : ""}>${label}</button>
      </article>
    `;
  }

  function ammoCard(title, desc, cost, action) {
    return shopCard(title, desc, [formatMoney(cost)], `Buy ${formatMoney(cost)}`, action, player.money < cost, false, "#ffd35a");
  }

  function handleShopAction(action) {
    const [kind, id] = action.split(":");
    if (kind === "weapon") {
      if (player.ownedWeapons.has(id)) {
        player.loadout[player.currentSlot] = id;
        addToast(`${WEAPON_DEFS[id].name} equipped`);
      } else {
        player.buyWeapon(id);
      }
    }
    if (kind === "ammo") buyAmmo(id);
    if (kind === "upgrade") buyUpgrade(id);
    if (kind === "heal") buyHeal(id);
    if (kind === "gear") buyGear(id);
    renderShop();
  }

  function buyAmmo(id) {
    const costs = { general: 120, rocket: 260, energy: 220, fill: 650 };
    const cost = costs[id];
    if (player.money < cost) return;
    player.money -= cost;
    for (const weaponId of player.ownedWeapons) {
      const def = WEAPON_DEFS[weaponId];
      const stateForWeapon = player.weaponStates[weaponId];
      if (id === "fill") stateForWeapon.reserveAmmo += Math.ceil(def.reserveAmmo * 0.75 + def.magazineSize);
      if (id === "general" && ["bullet", "shell", "bolt", "heavy"].includes(def.ammoClass)) stateForWeapon.reserveAmmo += Math.ceil(def.magazineSize * 2.6);
      if (id === "rocket" && def.ammoClass === "rocket") stateForWeapon.reserveAmmo += 8;
      if (id === "energy" && ["energy", "fuel"].includes(def.ammoClass)) stateForWeapon.reserveAmmo += Math.ceil(def.magazineSize * 2.8);
    }
    audio.playShopSound();
  }

  function buyUpgrade(id) {
    const upgrade = SHOP_UPGRADES.find(item => item.id === id);
    if (!upgrade) return;
    const level = player.upgrades[id];
    if (upgrade.max && level >= upgrade.max) return;
    const cost = player.upgradeCosts[id];
    if (player.money < cost) return;
    player.money -= cost;
    player.upgrades[id] += 1;
    player.upgradeCosts[id] = Math.round(cost * 1.36 + 40);
    upgrade.apply();
    syncDrones();
    audio.playShopSound();
  }

  function buyHeal(id) {
    const costs = { small: 60, full: 180, armor: 150 };
    if (player.money < costs[id]) return;
    player.money -= costs[id];
    if (id === "small") player.heal(50);
    if (id === "full") player.heal(player.maxHp);
    if (id === "armor") player.repairArmor(player.maxArmor);
    audio.playShopSound();
  }

  function buyGear(id) {
    const costs = { grenade: 210, mine: 180, turret: 340 };
    if (player.money < costs[id]) return;
    player.money -= costs[id];
    if (id === "grenade") player.skills.grenades += 3;
    if (id === "mine") player.skills.mines += 2;
    if (id === "turret") player.skills.turrets += 1;
    audio.playShopSound();
  }

  // Game state manager
  function startGame() {
    const name = sanitizePlayerName(dom.playerNameInput.value);
    if (!name) {
      dom.playerNameInput.closest(".name-entry").classList.add("invalid");
      dom.playerNameInput.focus();
      addToast("Enter a leaderboard name first", true);
      return;
    }
    playerName = name;
    save.data.playerName = name;
    save.write();
    clearOverlays();
    configureMapForWave(1, true);
    generateMap();
    player = new Player(MAP.width / 2, MAP.height / 2 + Math.min(90, MAP.height * 0.08));
    projectiles = [];
    zombies = [];
    pickups = [];
    particles = [];
    floatingTexts = [];
    areaEffects = [];
    turrets = [];
    landmines = [];
    drones = [];
    seedMapPickups();
    damageFlash = 0;
    screenShake = 0;
    hitStop = 0;
    slowMotion = 0;
    survivalTime = 0;
    waveManager.reset();
    worldReady = true;
    dom.hud.classList.remove("hidden");
    state = STATES.PLAYING;
    waveManager.beginNextWave();
    updateHud();
  }

  function restartGame() {
    startGame();
  }

  function returnToMenu() {
    clearOverlays();
    state = STATES.MENU;
    dom.hud.classList.add("hidden");
    dom.mainMenu.classList.remove("hidden");
    updateMenuStats();
  }

  function pauseGame() {
    if (![STATES.PLAYING, STATES.BREAK].includes(state)) return;
    previousState = state;
    state = STATES.PAUSED;
    dom.pauseOverlay.classList.remove("hidden");
  }

  function resumeGame() {
    if (state !== STATES.PAUSED) return;
    state = previousState === STATES.BREAK ? STATES.BREAK : STATES.PLAYING;
    dom.pauseOverlay.classList.add("hidden");
  }

  function endGame() {
    if (state === STATES.GAME_OVER) return;
    state = STATES.GAME_OVER;
    player.hp = Math.max(0, player.hp);
    save.recordRun(player.score, waveManager.wave, player.runKills);
    leaderboard.submit({
      name: playerName || "Survivor",
      score: player.score,
      wave: waveManager.wave,
      kills: player.runKills,
      time: survivalTime
    });
    dom.finalWave.textContent = waveManager.wave;
    dom.finalScore.textContent = Math.floor(player.score);
    dom.finalKills.textContent = player.runKills;
    dom.finalTime.textContent = formatTime(survivalTime);
    dom.finalBestScore.textContent = save.data.bestScore;
    clearOverlays();
    dom.hud.classList.remove("hidden");
    dom.gameOverOverlay.classList.remove("hidden");
  }

  function clearOverlays() {
    dom.mainMenu.classList.add("hidden");
    dom.howToPlayPanel.classList.add("hidden");
    dom.settingsPanel.classList.add("hidden");
    dom.shopOverlay.classList.add("hidden");
    dom.pauseOverlay.classList.add("hidden");
    dom.gameOverOverlay.classList.add("hidden");
  }

  function handleKeyCommand(code) {
    if (code === "Escape") {
      if (state === STATES.SHOP) closeShop();
      else if (state === STATES.PAUSED) resumeGame();
      else if (state === STATES.PLAYING || state === STATES.BREAK) pauseGame();
      else if (state === STATES.MENU) showMainMenuOnly();
      return;
    }
    if (code === "KeyP") {
      if (state === STATES.PAUSED) resumeGame();
      else pauseGame();
      return;
    }
    if (code === "KeyB" || code === "Tab") {
      if (state === STATES.SHOP) closeShop();
      else if (state === STATES.PLAYING || state === STATES.BREAK) openShop(false);
      return;
    }
    if (code === "KeyM") {
      minimapVisible = !minimapVisible;
      document.querySelector(".minimap-panel").classList.toggle("hidden", !minimapVisible);
      return;
    }
    if (!player || ![STATES.PLAYING, STATES.BREAK].includes(state)) return;
    if (code.startsWith("Digit")) {
      const slot = Number(code.replace("Digit", "")) - 1;
      if (slot >= 0 && slot < 6) player.switchSlot(slot);
    }
    if (code === "KeyG") useGrenade();
    if (code === "KeyF") placeMine();
    if (code === "KeyT") deployTurret();
    if (code === "KeyQ") useMedkit();
    if (code === "KeyE") openSupplyCrates();
  }

  function showMainMenuOnly() {
    clearOverlays();
    dom.mainMenu.classList.remove("hidden");
  }

  function announce(text) {
    bannerText = text;
    bannerTimer = 2.1;
    dom.centerBanner.textContent = text;
    dom.centerBanner.classList.add("show");
  }

  function achievement(text) {
    addToast(text, true);
    announce(text);
  }

  function addToast(text, important = false) {
    toastQueue.push({ text, life: important ? 4 : 3, important });
    renderToasts();
  }

  function updateToasts(dt) {
    for (const toast of toastQueue) toast.life -= dt;
    toastQueue = toastQueue.filter(toast => toast.life > 0);
    renderToasts();
  }

  function renderToasts() {
    dom.toastLayer.innerHTML = toastQueue.slice(-5).map(toast => `<div class="toast ${toast.important ? "important" : ""}">${toast.text}</div>`).join("");
  }

  // Update loop
  function updateGame(dt) {
    if (!player) return;
    gameTime += dt;
    if (state === STATES.PLAYING || state === STATES.BREAK) survivalTime += dt;
    damageFlash = Math.max(0, damageFlash - dt * 1.45);
    screenShake = Math.max(0, screenShake - dt * 20);
    updateMouseWorld();
    updateTouchAim();

    if (state === STATES.PLAYING || state === STATES.BREAK) {
      player.update(dt);
      waveManager.update(dt);
      updateObjectList(projectiles, dt);
      updateObjectList(zombies, dt);
      updateObjectList(pickups, dt);
      updateObjectList(areaEffects, dt);
      updateObjectList(turrets, dt);
      updateObjectList(drones, dt);
      updateLandmines(dt);
      applyHazards(dt);
      syncDrones();
    }

    updateObjectList(particles, dt);
    updateObjectList(floatingTexts, dt);
    updateCamera(dt);
    updateToasts(dt);
    updateBanner(dt);
    cleanupLists();
    updateHud();
  }

  function updateMouseWorld() {
    mouse.worldX = mouse.x - camera.offsetX + camera.x;
    mouse.worldY = mouse.y - camera.offsetY + camera.y;
  }

  function updateTouchAim() {
    if (!player || !touchInput.firing) return;
    const target = nearestZombie(player.x, player.y, 760) || nearestZombie(player.x, player.y, 1400);
    if (target) {
      mouse.worldX = target.x;
      mouse.worldY = target.y;
      return;
    }
    if (touchInput.active && (touchInput.stickX || touchInput.stickY)) {
      mouse.worldX = player.x + touchInput.stickX * 280;
      mouse.worldY = player.y + touchInput.stickY * 280;
    }
  }

  function updateCamera(dt) {
    if (!player) {
      camera.offsetX = Math.max(0, (camera.width - MAP.width) / 2);
      camera.offsetY = Math.max(0, (camera.height - MAP.height) / 2);
      camera.x = Math.max(0, MAP.width / 2 - camera.width / 2);
      camera.y = Math.max(0, MAP.height / 2 - camera.height / 2);
      return;
    }
    camera.offsetX = Math.max(0, (camera.width - MAP.width) / 2);
    camera.offsetY = Math.max(0, (camera.height - MAP.height) / 2);
    const viewW = Math.min(camera.width, MAP.width);
    const viewH = Math.min(camera.height, MAP.height);
    const targetX = player.x - viewW / 2;
    const targetY = player.y - viewH / 2;
    camera.x = lerp(camera.x, targetX, clamp(dt * 9, 0, 1));
    camera.y = lerp(camera.y, targetY, clamp(dt * 9, 0, 1));
    camera.x = clamp(camera.x, 0, Math.max(0, MAP.width - viewW));
    camera.y = clamp(camera.y, 0, Math.max(0, MAP.height - viewH));
  }

  function applyHazards(dt) {
    // No ambient floor damage. Player damage comes from zombie attacks, boss skills, and player-owned explosions.
  }

  function updateBanner(dt) {
    if (bannerTimer > 0) {
      bannerTimer -= dt;
      if (bannerTimer <= 0) dom.centerBanner.classList.remove("show");
    }
  }

  function cleanupLists() {
    if (projectiles.length > 360) projectiles.splice(0, projectiles.length - 360);
    if (particles.length > particleCap() + 80) particles.splice(0, particles.length - particleCap());
    const zombieLimit = maxActiveZombies() + 28;
    if (zombies.length > zombieLimit) {
      zombies
        .filter(zombie => !zombie.isBoss)
        .sort((a, b) => dist(player.x, player.y, b.x, b.y) - dist(player.x, player.y, a.x, a.y))
        .slice(0, zombies.length - zombieLimit)
        .forEach(zombie => {
          zombie.active = false;
          waveManager.spawnRemaining += 1;
        });
    }
    zombies = zombies.filter(zombie => zombie.active);
    world.barrels = world.barrels.filter(barrel => barrel.active);
  }

  // Render loop
  function render() {
    ctx.clearRect(0, 0, camera.width, camera.height);
    if (!worldReady) drawMenuBackground();
    else drawWorld();
    drawScreenEffects();
    drawPlayerVisibilityOverlay();
    drawZombieDirectionHints();
    if (minimapVisible && player && state !== STATES.MENU) drawMinimap();
  }

  function drawMenuBackground() {
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, camera.width, camera.height);
    ctx.save();
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 30; i++) {
      const x = (i * 173 + gameTime * 16) % (camera.width + 120) - 60;
      const y = (i * 89) % (camera.height + 80) - 40;
      ctx.fillStyle = i % 3 ? "#1f2c32" : "#3f0d15";
      ctx.fillRect(x, y, 90, 16);
    }
    ctx.restore();
  }

  function drawWorld() {
    const shakeX = screenShake > 0 ? rand(-screenShake, screenShake) : 0;
    const shakeY = screenShake > 0 ? rand(-screenShake, screenShake) : 0;
    ctx.save();
    ctx.translate(camera.offsetX - camera.x + shakeX, camera.offsetY - camera.y + shakeY);
    drawMap(ctx);
    for (const effect of areaEffects) effect.draw(ctx);
    for (const mine of landmines) drawMine(ctx, mine);
    for (const pickup of pickups) pickup.draw(ctx);
    for (const turret of turrets) turret.draw(ctx);
    for (const projectile of projectiles) projectile.draw(ctx);
    for (const zombie of zombies) zombie.draw(ctx);
    for (const drone of drones) drone.draw(ctx);
    if (player) player.draw(ctx);
    for (const particle of particles) particle.draw(ctx);
    for (const text of floatingTexts) text.draw(ctx);
    ctx.restore();
  }

  function drawMap(context) {
    context.fillStyle = "#0b0f13";
    context.fillRect(0, 0, MAP.width, MAP.height);

    for (const road of world.roads) {
      context.fillStyle = "#15191d";
      context.fillRect(road.x, road.y, road.w, road.h);
      context.strokeStyle = "rgba(255,255,255,0.05)";
      context.lineWidth = 4;
      context.setLineDash([34, 40]);
      context.beginPath();
      if (road.w > road.h) {
        context.moveTo(road.x, road.y + road.h / 2);
        context.lineTo(road.x + road.w, road.y + road.h / 2);
      } else {
        context.moveTo(road.x + road.w / 2, road.y);
        context.lineTo(road.x + road.w / 2, road.y + road.h);
      }
      context.stroke();
      context.setLineDash([]);
    }

    const startX = Math.floor(camera.x / MAP.tile) * MAP.tile;
    const startY = Math.floor(camera.y / MAP.tile) * MAP.tile;
    context.strokeStyle = "rgba(255,255,255,0.035)";
    context.lineWidth = 1;
    for (let x = startX; x < camera.x + camera.width + MAP.tile; x += MAP.tile) {
      context.beginPath();
      context.moveTo(x, camera.y - 40);
      context.lineTo(x, camera.y + camera.height + 40);
      context.stroke();
    }
    for (let y = startY; y < camera.y + camera.height + MAP.tile; y += MAP.tile) {
      context.beginPath();
      context.moveTo(camera.x - 40, y);
      context.lineTo(camera.x + camera.width + 40, y);
      context.stroke();
    }

    for (const item of world.decor) {
      if (!inCamera(item.x, item.y, item.r + 60)) continue;
      context.save();
      context.translate(item.x, item.y);
      context.rotate(item.rot);
      if (item.type === "blood") {
        context.fillStyle = "rgba(120, 10, 22, 0.42)";
        context.beginPath();
        context.ellipse(0, 0, item.r, item.r * 0.48, 0, 0, PI2);
        context.fill();
      } else if (item.type === "crack") {
        context.strokeStyle = "rgba(120, 130, 130, 0.18)";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(-item.r, 0);
        context.lineTo(-item.r * 0.2, -item.r * 0.22);
        context.lineTo(item.r * 0.35, item.r * 0.12);
        context.lineTo(item.r, -item.r * 0.15);
        context.stroke();
      } else {
        context.fillStyle = item.color;
        context.fillRect(-item.r * 0.6, -item.r * 0.25, item.r * 1.2, item.r * 0.5);
      }
      context.restore();
    }

    for (const hole of world.spawnHoles) {
      context.fillStyle = "#050505";
      context.beginPath();
      context.arc(hole.x, hole.y, hole.r, 0, PI2);
      context.fill();
      context.strokeStyle = "rgba(49,255,155,0.22)";
      context.lineWidth = 5;
      context.stroke();
      context.strokeStyle = "rgba(0,0,0,0.5)";
      context.lineWidth = 12;
      context.beginPath();
      context.arc(hole.x, hole.y, hole.r * 0.65, 0, PI2);
      context.stroke();
    }

    for (const crate of world.supplyCrates) {
      if (!crate.opened) drawSupplyCrate(context, crate);
    }

    for (const barrel of world.barrels) drawBarrel(context, barrel);

    for (const obstacle of world.obstacles) {
      if (!rectInCamera(obstacle)) continue;
      context.fillStyle = obstacle.color || "#444b51";
      context.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      context.strokeStyle = "rgba(0,0,0,0.5)";
      context.lineWidth = 4;
      context.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      context.strokeStyle = "rgba(255,255,255,0.08)";
      context.lineWidth = 1;
      context.strokeRect(obstacle.x + 6, obstacle.y + 6, Math.max(4, obstacle.w - 12), Math.max(4, obstacle.h - 12));
    }
  }

  function drawBarrel(context, barrel) {
    context.save();
    context.translate(barrel.x, barrel.y);
    context.fillStyle = "#7c2024";
    context.beginPath();
    context.arc(0, 0, barrel.r, 0, PI2);
    context.fill();
    context.strokeStyle = "#ff8a2a";
    context.lineWidth = 3;
    context.stroke();
    context.fillStyle = "#ff8a2a";
    context.fillRect(-barrel.r * 0.55, -3, barrel.r * 1.1, 6);
    context.restore();
  }

  function drawSupplyCrate(context, crate) {
    context.save();
    context.translate(crate.x, crate.y);
    context.fillStyle = "#2c3b35";
    context.strokeStyle = "#31ff9b";
    context.lineWidth = 2;
    context.fillRect(-22, -18, 44, 36);
    context.strokeRect(-22, -18, 44, 36);
    context.fillStyle = "#31ff9b";
    context.fillRect(-4, -18, 8, 36);
    context.fillRect(-22, -4, 44, 8);
    context.restore();
  }

  function drawMine(context, mine) {
    context.save();
    context.translate(mine.x, mine.y);
    context.fillStyle = "#171b1f";
    context.strokeStyle = Math.sin(mine.age * 8) > 0 ? "#ff3a58" : "#ffd35a";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, mine.r, 0, PI2);
    context.fill();
    context.stroke();
    context.restore();
  }

  function drawScreenEffects() {
    if (!player || state === STATES.MENU) return;
    ctx.save();
    const quality = QUALITY[save.data.quality] || QUALITY.medium;
    const px = player.x - camera.x + camera.offsetX;
    const py = player.y - camera.y + camera.offsetY;
    ctx.fillStyle = `rgba(0, 0, 0, ${quality.fog})`;
    ctx.fillRect(0, 0, camera.width, camera.height);
    ctx.globalCompositeOperation = "destination-out";
    let light = ctx.createRadialGradient(px, py, 90, px, py, 390);
    light.addColorStop(0, "rgba(255,255,255,0.92)");
    light.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(px, py, 390, 0, PI2);
    ctx.fill();
    for (const lamp of world.lights) {
      const sx = lamp.x - camera.x + camera.offsetX;
      const sy = lamp.y - camera.y + camera.offsetY;
      if (sx < -250 || sx > camera.width + 250 || sy < -250 || sy > camera.height + 250) continue;
      const g = ctx.createRadialGradient(sx, sy, 15, sx, sy, lamp.r);
      g.addColorStop(0, "rgba(255,255,255,0.5)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, lamp.r, 0, PI2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    const vignette = ctx.createRadialGradient(camera.width / 2, camera.height / 2, camera.width * 0.18, camera.width / 2, camera.height / 2, camera.width * 0.7);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.62)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, camera.width, camera.height);

    let lowHp = 0;
    if (player.hp < player.maxHp * 0.32 && player.hp > 0) lowHp = 0.18 + Math.sin(gameTime * 8) * 0.12;
    const red = Math.max(damageFlash, lowHp);
    if (red > 0) {
      const hurt = ctx.createRadialGradient(camera.width / 2, camera.height / 2, camera.width * 0.26, camera.width / 2, camera.height / 2, camera.width * 0.68);
      hurt.addColorStop(0, "rgba(255,0,0,0)");
      hurt.addColorStop(1, `rgba(255, 18, 42, ${red * 0.65})`);
      ctx.fillStyle = hurt;
      ctx.fillRect(0, 0, camera.width, camera.height);
    }
    ctx.restore();
  }

  function drawPlayerVisibilityOverlay() {
    if (!player || state === STATES.MENU) return;
    const sx = player.x - camera.x + camera.offsetX;
    const sy = player.y - camera.y + camera.offsetY;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.88)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#48d8ff";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(sx, sy, player.radius + 15 + Math.sin(gameTime * 8) * 2, 0, PI2);
    ctx.stroke();
    ctx.fillStyle = "rgba(72, 216, 255, 0.2)";
    ctx.beginPath();
    ctx.arc(sx, sy, player.radius + 8, 0, PI2);
    ctx.fill();
    ctx.restore();
  }

  function drawZombieDirectionHints() {
    if (!player || state === STATES.MENU || zombies.length < 1) return;
    const offscreen = zombies
      .filter(zombie => zombie.active && !inCamera(zombie.x, zombie.y, zombie.radius + 30))
      .sort((a, b) => dist(player.x, player.y, a.x, a.y) - dist(player.x, player.y, b.x, b.y))
      .slice(0, 6);
    ctx.save();
    for (const zombie of offscreen) {
      const a = angleTo(player.x, player.y, zombie.x, zombie.y);
      const edgeX = clamp(camera.width / 2 + Math.cos(a) * camera.width * 0.46, 28, camera.width - 28);
      const edgeY = clamp(camera.height / 2 + Math.sin(a) * camera.height * 0.43, 72, camera.height - 180);
      ctx.save();
      ctx.translate(edgeX, edgeY);
      ctx.rotate(a);
      ctx.fillStyle = "#ff3a58";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -9);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.font = "800 11px Segoe UI, Arial";
      ctx.textAlign = "center";
      ctx.fillText("Z", edgeX, edgeY + 24);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
    ctx.restore();
  }

  function drawMinimap() {
    const w = minimap.width;
    const h = minimap.height;
    miniCtx.clearRect(0, 0, w, h);
    miniCtx.fillStyle = "#071014";
    miniCtx.fillRect(0, 0, w, h);
    const sx = w / MAP.width;
    const sy = h / MAP.height;
    miniCtx.fillStyle = "rgba(255,255,255,0.08)";
    for (const obstacle of world.obstacles) miniCtx.fillRect(obstacle.x * sx, obstacle.y * sy, obstacle.w * sx, obstacle.h * sy);
    miniCtx.fillStyle = "rgba(49,255,155,0.22)";
    for (const hole of world.spawnHoles) {
      miniCtx.beginPath();
      miniCtx.arc(hole.x * sx, hole.y * sy, Math.max(2, hole.r * sx), 0, PI2);
      miniCtx.fill();
    }
    miniCtx.fillStyle = "#ff3a58";
    for (const zombie of zombies) {
      miniCtx.beginPath();
      miniCtx.arc(zombie.x * sx, zombie.y * sy, zombie.isBoss ? 3.6 : 1.8, 0, PI2);
      miniCtx.fill();
    }
    miniCtx.fillStyle = "#ffd35a";
    for (const pickup of pickups) miniCtx.fillRect(pickup.x * sx - 1, pickup.y * sy - 1, 2, 2);
    miniCtx.fillStyle = "#48d8ff";
    miniCtx.beginPath();
    miniCtx.arc(player.x * sx, player.y * sy, 3.8, 0, PI2);
    miniCtx.fill();
    miniCtx.strokeStyle = "rgba(72,216,255,0.7)";
    const viewW = Math.min(camera.width, MAP.width);
    const viewH = Math.min(camera.height, MAP.height);
    miniCtx.strokeRect(camera.x * sx, camera.y * sy, viewW * sx, viewH * sy);
  }

  function inCamera(x, y, r) {
    return x + r > camera.x && y + r > camera.y && x - r < camera.x + camera.width && y - r < camera.y + camera.height;
  }

  function rectInCamera(rect) {
    return rect.x + rect.w > camera.x && rect.y + rect.h > camera.y && rect.x < camera.x + camera.width && rect.y < camera.y + camera.height;
  }

  // UI manager
  function updateHud() {
    if (!player) return;
    dom.hpBar.style.width = `${clamp(player.hp / player.maxHp, 0, 1) * 100}%`;
    dom.hpText.textContent = `${Math.ceil(Math.max(0, player.hp))}/${player.maxHp}`;
    dom.armorBar.style.width = `${clamp(player.armor / player.maxArmor, 0, 1) * 100}%`;
    dom.armorText.textContent = `${Math.ceil(Math.max(0, player.armor))}/${player.maxArmor}`;
    dom.staminaBar.style.width = `${clamp(player.stamina / player.maxStamina, 0, 1) * 100}%`;
    dom.staminaText.textContent = Math.ceil(player.stamina);
    dom.moneyText.textContent = formatMoney(player.money);
    dom.scoreText.textContent = Math.floor(player.score);
    dom.killsText.textContent = player.kills;
    dom.waveText.textContent = waveManager.wave;
    dom.zombiesLeftText.textContent = `${zombies.length + waveManager.spawnRemaining} infected`;
    dom.waveTimerText.textContent = state === STATES.BREAK ? `Next wave ${Math.ceil(waveManager.breakTimer)}s` : (waveManager.modifier ? waveManager.modifier.name : "Survive");
    updateWeaponUi();
    updateSkillUi();
    updateBossUi();
    updateMuteButtons();
  }

  function updateWeaponUi() {
    const slotHtml = player.loadout.map((id, index) => {
      const def = id ? WEAPON_DEFS[id] : null;
      const color = def ? RARITY_COLORS[def.rarity] : "rgba(255,255,255,0.18)";
      return `<div class="weapon-slot ${index === player.currentSlot ? "active" : ""}" style="border-color:${index === player.currentSlot ? color : "rgba(255,255,255,0.13)"}">
        <b>${index + 1}</b>
        <span>${def ? def.name : "Empty"}</span>
      </div>`;
    }).join("");
    dom.weaponSlots.innerHTML = slotHtml;
    const def = player.weapon;
    const weaponState = player.weaponState;
    dom.weaponName.textContent = def.name;
    dom.weaponName.style.color = RARITY_COLORS[def.rarity];
    dom.ammoText.textContent = `${weaponState.ammoInMag} / ${def.magazineSize} | ${weaponState.reserveAmmo}`;
    if (weaponState.reloading) {
      dom.reloadWrap.classList.remove("hidden");
      dom.reloadBar.style.width = `${(1 - weaponState.reloadTimer / weaponState.reloadTotal) * 100}%`;
    } else {
      dom.reloadWrap.classList.add("hidden");
    }
  }

  function updateSkillUi() {
    setSkill(dom.grenadeSkill, player.skills.grenades, player.skills.grenadeCooldown);
    setSkill(dom.mineSkill, player.skills.mines, player.skills.mineCooldown);
    setSkill(dom.turretSkill, player.skills.turrets, player.skills.turretCooldown);
    setSkill(dom.medkitSkill, player.skills.medkits, player.skills.medkitCooldown);
  }

  function setSkill(element, count, cooldown) {
    element.classList.toggle("cooling", cooldown > 0);
    const em = element.querySelector("em");
    em.textContent = cooldown > 0 ? `${cooldown.toFixed(1)}s` : `x${count}`;
  }

  function updateBossUi() {
    const boss = zombies.find(zombie => zombie.isBoss && zombie.active);
    if (!boss) {
      dom.bossHud.classList.add("hidden");
      return;
    }
    dom.bossHud.classList.remove("hidden");
    dom.bossName.textContent = boss.name;
    dom.bossBar.style.width = `${clamp(boss.hp / boss.maxHp, 0, 1) * 100}%`;
  }

  function updateMenuStats() {
    dom.menuBestScore.textContent = save.data.bestScore;
    dom.menuBestWave.textContent = save.data.highestWave;
    dom.menuTotalKills.textContent = save.data.totalKills;
  }

  function updateMuteButtons() {
    const label = audio.muted ? "Sound Off" : "Sound On";
    dom.muteButton.textContent = label;
    dom.settingsMuteBtn.textContent = label;
    dom.pauseMuteBtn.textContent = label;
  }

  function toggleMute() {
    audio.muted = !audio.muted;
    save.data.muted = audio.muted;
    save.write();
    updateMuteButtons();
  }

  function setupMobileControls() {
    const knob = dom.mobileStick.querySelector("i");
    const resetStick = () => {
      touchInput.active = false;
      touchInput.stickId = null;
      touchInput.stickX = 0;
      touchInput.stickY = 0;
      knob.style.transform = "translate(-50%, -50%)";
    };
    const updateStick = event => {
      if (touchInput.stickId !== event.pointerId) return;
      const dx = event.clientX - touchInput.stickCenterX;
      const dy = event.clientY - touchInput.stickCenterY;
      const length = Math.hypot(dx, dy);
      const max = 44;
      const scale = length > max ? max / length : 1;
      const nx = dx * scale;
      const ny = dy * scale;
      touchInput.stickX = clamp(dx / max, -1, 1);
      touchInput.stickY = clamp(dy / max, -1, 1);
      knob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
    };

    dom.mobileStick.addEventListener("pointerdown", event => {
      event.preventDefault();
      touchInput.usingTouch = true;
      touchInput.active = true;
      touchInput.stickId = event.pointerId;
      const rect = dom.mobileStick.getBoundingClientRect();
      touchInput.stickCenterX = rect.left + rect.width / 2;
      touchInput.stickCenterY = rect.top + rect.height / 2;
      dom.mobileStick.setPointerCapture(event.pointerId);
      updateStick(event);
    });
    dom.mobileStick.addEventListener("pointermove", updateStick);
    dom.mobileStick.addEventListener("pointerup", resetStick);
    dom.mobileStick.addEventListener("pointercancel", resetStick);

    const holdButton = (button, down, up) => {
      button.addEventListener("pointerdown", event => {
        event.preventDefault();
        touchInput.usingTouch = true;
        down();
      });
      button.addEventListener("pointerup", event => {
        event.preventDefault();
        up();
      });
      button.addEventListener("pointercancel", up);
      button.addEventListener("pointerleave", up);
    };

    holdButton(dom.mobileFire, () => {
      touchInput.firing = true;
      mouse.clicked = true;
      audio.unlock();
    }, () => {
      touchInput.firing = false;
    });

    const tap = (button, action) => {
      button.addEventListener("click", event => {
        event.preventDefault();
        touchInput.usingTouch = true;
        action();
      });
    };
    tap(dom.mobileDash, () => input.pressed.add("Space"));
    tap(dom.mobileReload, () => input.pressed.add("KeyR"));
    tap(dom.mobileShop, () => {
      if (state === STATES.SHOP) closeShop();
      else if (state === STATES.PLAYING || state === STATES.BREAK) openShop(false);
    });
    tap(dom.mobileGrenade, useGrenade);
    tap(dom.mobileMedkit, useMedkit);
  }

  // Helpers
  function nearestZombie(x, y, range) {
    let best = null;
    let bestD = range;
    for (const zombie of zombies) {
      if (!zombie.active) continue;
      const d = dist(x, y, zombie.x, zombie.y);
      if (d < bestD) {
        bestD = d;
        best = zombie;
      }
    }
    return best;
  }

  // DOM events
  document.getElementById("startGameBtn").addEventListener("click", startGame);
  document.getElementById("howToPlayBtn").addEventListener("click", () => {
    dom.mainMenu.classList.add("hidden");
    dom.howToPlayPanel.classList.remove("hidden");
  });
  document.getElementById("settingsBtn").addEventListener("click", () => {
    dom.mainMenu.classList.add("hidden");
    dom.settingsPanel.classList.remove("hidden");
  });
  document.querySelectorAll(".backToMenuBtn").forEach(button => button.addEventListener("click", showMainMenuOnly));
  document.getElementById("closeShopBtn").addEventListener("click", () => closeShop());
  document.getElementById("resumeBtn").addEventListener("click", resumeGame);
  document.getElementById("restartBtn").addEventListener("click", restartGame);
  document.getElementById("pauseMenuBtn").addEventListener("click", returnToMenu);
  document.getElementById("gameOverRestartBtn").addEventListener("click", restartGame);
  document.getElementById("gameOverMenuBtn").addEventListener("click", returnToMenu);
  dom.playerNameInput.addEventListener("input", () => {
    const name = sanitizePlayerName(dom.playerNameInput.value);
    dom.playerNameInput.closest(".name-entry").classList.toggle("invalid", !name);
    save.data.playerName = name;
    save.write();
  });
  dom.refreshLeaderboardBtn.addEventListener("click", () => leaderboard.load());
  dom.muteButton.addEventListener("click", toggleMute);
  dom.settingsMuteBtn.addEventListener("click", toggleMute);
  dom.pauseMuteBtn.addEventListener("click", toggleMute);
  dom.qualitySelect.addEventListener("change", event => {
    save.data.quality = event.target.value;
    save.write();
    addToast(`Graphics: ${save.data.quality}`);
  });
  document.querySelectorAll(".shop-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      activeShopTab = tab.dataset.tab;
      renderShop();
    });
  });
  dom.shopItems.addEventListener("click", event => {
    const button = event.target.closest("button[data-shop-action]");
    if (!button) return;
    handleShopAction(button.dataset.shopAction);
  });

  // Init game
  function init() {
    save.load();
    setupMobileControls();
    generateMap();
    worldReady = false;
    updateMenuStats();
    leaderboard.load();
    requestAnimationFrame(loop);
  }

  function loop(timestamp) {
    const seconds = timestamp / 1000;
    let dt = Math.min(0.033, seconds - lastTime || 0.016);
    lastTime = seconds;
    if (hitStop > 0) {
      hitStop -= dt;
      dt = 0;
    }
    if (slowMotion > 0) {
      slowMotion -= dt;
      dt *= 0.38;
    }
    if (state !== STATES.MENU && state !== STATES.PAUSED && state !== STATES.SHOP && state !== STATES.GAME_OVER) {
      updateGame(dt);
    } else {
      gameTime += dt;
      updateToasts(dt);
      updateBanner(dt);
      if (state === STATES.MENU) updateCamera(dt);
      updateObjectList(particles, dt);
    }
    render();
    input.endFrame();
    requestAnimationFrame(loop);
  }

  init();
})();
