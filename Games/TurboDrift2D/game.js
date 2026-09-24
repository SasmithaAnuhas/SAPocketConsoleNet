(() => {
  "use strict";

  let worldWidth = 1280;
  let worldHeight = 720;
  const CANVAS = document.getElementById("game");
  const CTX = CANVAS.getContext("2d");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const loadingBar = document.getElementById("loadingBar");
  const loadingText = document.getElementById("loadingText");
  const rotateOverlay = document.getElementById("rotateOverlay");
  const resultOverlay = document.getElementById("resultOverlay");
  const resultTitle = document.getElementById("resultTitle");
  const resultSub = document.getElementById("resultSub");
  const resultPlace = document.getElementById("resultPlace");
  const resultTime = document.getElementById("resultTime");
  const resultBest = document.getElementById("resultBest");

  const ASSETS = {
    car: "assets/cars/car_red_small_4.png",
    obstacle: "kenney_racing-pack/PNG/Objects/cone_straight.png",
    wall: "assets/wall.png",
    checkpoint: "assets/checkpoint.png",
    ground: "assets/ground.png",
    road: "assets/road.png",
    borderRed: "assets/border_red.png",
    borderWhite: "assets/border_white.png",
    engine: "assets/engine.mp3",
    collision: "assets/collision.wav",
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const degToRad = (deg) => (deg * Math.PI) / 180;
  const fmtTime = (ms) => {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const loadAudioContext = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  };

  const loadImage = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  const setLoadingProgress = (value, label) => {
    if (loadingBar) loadingBar.style.width = `${Math.round(value * 100)}%`;
    if (loadingText && label) loadingText.textContent = label;
  };

  const isPortrait = () => window.innerHeight > window.innerWidth;

  const updateRotateOverlay = () => {
    if (!rotateOverlay) return;
    const shouldShow = isPortrait();
    rotateOverlay.classList.toggle("hidden", !shouldShow);
  };

  const requestFullscreen = async () => {
    const root = document.documentElement;
    if (!root || document.fullscreenElement) return;
    try {
      if (root.requestFullscreen) await root.requestFullscreen();
    } catch {
      // ignore: fullscreen can fail without user gesture or on unsupported devices
    }
  };

  const loadImageTracked = (src, onDone) =>
    new Promise((resolve) => {
      const img = new Image();
      const done = () => {
        if (typeof onDone === "function") onDone();
        resolve(img.complete && img.naturalWidth ? img : null);
      };
      img.onload = done;
      img.onerror = done;
      img.src = src;
    });

  const loadAudioBuffer = async (ctx, src) => {
    try {
      const res = await fetch(src);
      const data = await res.arrayBuffer();
      return await ctx.decodeAudioData(data);
    } catch {
      return null;
    }
  };

  const getBestTimeKey = () =>
    `td2d_bestlap_${gameState.selectedMap.id}_${gameState.selectedMode.id}_${raceLaps}`;

  const getBestTime = () => {
    try {
      const raw = localStorage.getItem(getBestTimeKey());
      const val = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(val) && val > 0 ? val : null;
    } catch {
      return null;
    }
  };

  const setBestTime = (ms) => {
    if (!ms || !Number.isFinite(ms)) return;
    const current = getBestTime();
    if (!current || ms < current) {
      try {
        localStorage.setItem(getBestTimeKey(), String(Math.floor(ms)));
      } catch {}
    }
  };

  const CAR_OPTIONS = [
    { id: "red", label: "Red", path: "assets/cars/car_red_small_4.png" },
    { id: "blue", label: "Blue", path: "assets/cars/car_blue_small_4.png" },
    { id: "green", label: "Green", path: "assets/cars/car_green_small_4.png" },
    { id: "yellow", label: "Yellow", path: "assets/cars/car_yellow_small_4.png" },
  ];

  const MODE_OPTIONS = [
    { id: "time_trial", label: "Time Trial", mobs: 0 },
    { id: "race", label: "Race (AI)", mobs: 2 },
  ];

  const MAP_OPTIONS = [
    { id: "default", label: "Default", file: "map.json" },
    { id: "city", label: "City", file: "map_city.json" },
    { id: "desert", label: "Desert", file: "map_desert.json" },
  ];

  const gameState = {
    started: false,
    selectedCar: CAR_OPTIONS[0],
    selectedMode: MODE_OPTIONS[0],
    selectedMap: MAP_OPTIONS[0],
    selectedLaps: 3,
  };

  const getObjectProperty = (obj, key) => {
    if (!obj.properties || !Array.isArray(obj.properties)) return null;
    const hit = obj.properties.find((p) => p.name === key);
    return hit ? hit.value : null;
  };

  const base64ToBytes = (b64) => {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  const decodeLayerData = async (layer) => {
    if (Array.isArray(layer.data)) return layer.data;
    if (!layer.data || layer.encoding !== "base64") return null;
    const bytes = base64ToBytes(layer.data);
    let buffer = bytes.buffer;
    if (layer.compression) {
      if (typeof DecompressionStream === "undefined") return null;
      const format = layer.compression === "zlib" ? "deflate" : layer.compression;
      const stream = new DecompressionStream(format);
      const decompressed = new Response(new Blob([bytes]).stream().pipeThrough(stream));
      buffer = await decompressed.arrayBuffer();
    }
    const view = new DataView(buffer);
    const out = [];
    for (let i = 0; i + 3 < view.byteLength; i += 4) {
      out.push(view.getUint32(i, true));
    }
    return out;
  };

  const FLIP_H = 0x80000000;
  const FLIP_V = 0x40000000;
  const FLIP_D = 0x20000000;

  const resolveTilesetImagePath = (path) => {
    if (!path) return null;
    const normalized = path.replace(/\\\\/g, "/");
    if (normalized.includes("kenney_racing-pack/")) {
      return normalized.slice(normalized.indexOf("kenney_racing-pack/"));
    }
    return normalized;
  };

  let tiledTrackTiles = [];
  let tiledTileLayers = [];
  let tiledRoadLayers = [];
  let tiledGroundLayers = [];
  let tiledTilesetMeta = [];
  let tiledTilesetImages = new Map();
  let tiledMapTileWidth = 32;
  let tiledMapTileHeight = 32;
  let tiledMapWidth = 0;
  let tiledMapHeight = 0;
  let hasMapObjects = false;

  const loadTiledMap = async (mapFile) => {
    try {
      const res = await fetch(mapFile, { cache: "no-store" });
      if (!res.ok) return;
      const map = await res.json();
      const mapProps = Array.isArray(map.properties) ? map.properties : [];
      const lapProp = mapProps.find((p) => p.name === "laps");
      if (lapProp && typeof lapProp.value === "number") {
        mapLaps = Math.max(1, Math.floor(lapProp.value));
      } else {
        mapLaps = null;
      }
      const layers = Array.isArray(map.layers) ? map.layers : [];
      const tilesets = Array.isArray(map.tilesets) ? map.tilesets : [];
      const tilesetImages = new Map();
      const tilesetMeta = tilesets
        .map((ts) => ({
          firstgid: ts.firstgid || 0,
          name: ts.name || "",
          image: ts.image || null,
          imagewidth: ts.imagewidth || 0,
          imageheight: ts.imageheight || 0,
          tilewidth: ts.tilewidth || map.tilewidth || 32,
          tileheight: ts.tileheight || map.tileheight || 32,
          spacing: ts.spacing || 0,
          margin: ts.margin || 0,
          columns: ts.columns || 0,
          tilecount: ts.tilecount || 0,
        }))
        .sort((a, b) => a.firstgid - b.firstgid);

      for (const ts of tilesetMeta) {
        const path = resolveTilesetImagePath(ts.image);
        if (!path) continue;
        const img = await loadImage(path);
        if (img) tilesetImages.set(ts.firstgid, img);
      }

      const findTilesetForGid = (gid) => {
        let chosen = null;
        for (const ts of tilesetMeta) {
          if (gid >= ts.firstgid) chosen = ts;
          else break;
        }
        return chosen;
      };

      tiledTilesetMeta = tilesetMeta;
      tiledTilesetImages = tilesetImages;
      tiledMapTileWidth = map.tilewidth || 32;
      tiledMapTileHeight = map.tileheight || 32;
      tiledMapWidth = map.width || 0;
      tiledMapHeight = map.height || 0;
      for (const ts of tilesetMeta) {
        if (ts.tilewidth > tiledMapTileWidth) tiledMapTileWidth = ts.tilewidth;
        if (ts.tileheight > tiledMapTileHeight) tiledMapTileHeight = ts.tileheight;
      }
      if (map.width && map.height) {
        worldWidth = map.width * tiledMapTileWidth;
        worldHeight = map.height * tiledMapTileHeight;
      }

      const newTiles = [];
      const newTileLayers = [];
      const newAISpawns = [];
      const newAICheckpoints = [];
      const newMapCheckpoints = [];
      const newCollisionObstacles = [];
      for (const layer of layers) {
        if (layer.type === "tilelayer") {
          const decoded = await decodeLayerData(layer);
          if (decoded && decoded.length) {
            newTileLayers.push({
              name: layer.name || "",
              data: decoded,
              width: layer.width || 0,
              height: layer.height || 0,
              opacity: typeof layer.opacity === "number" ? layer.opacity : 1,
              visible: layer.visible !== false,
            });
            const lname = (layer.name || "").toLowerCase();
            if (
              lname.includes("collision") ||
              lname.includes("collison") ||
              lname.includes("object")
            ) {
              const w = layer.width || 0;
              const h = layer.height || 0;
              for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                  const idx = y * w + x;
                  if (!decoded[idx]) continue;
                  newCollisionObstacles.push({
                    x: x * tiledMapTileWidth,
                    y: y * tiledMapTileHeight,
                    w: tiledMapTileWidth,
                    h: tiledMapTileHeight,
                    isRect: true,
                  });
                }
              }
            }
          }
          continue;
        }
        if (layer.type !== "objectgroup") continue;
        const layerName = (layer.name || "").toLowerCase();
        const objects = Array.isArray(layer.objects) ? layer.objects : [];

        const trackObj = objects.find((o) => (o.name || "").toLowerCase() === "track_path" && o.polyline);
        if (layerName === "track" && trackObj) {
          const baseX = trackObj.x || 0;
          const baseY = trackObj.y || 0;
          trackPath = trackObj.polyline.map((p) => ({ x: baseX + p.x, y: baseY + p.y }));
          const w = getObjectProperty(trackObj, "trackWidth");
          if (typeof w === "number") trackWidth = w;
        }

        let foundObjects = false;

        for (const obj of objects) {
          if (typeof obj.gid === "number") {
            const rawGid = obj.gid;
            const flipH = (rawGid & FLIP_H) !== 0;
            const flipV = (rawGid & FLIP_V) !== 0;
            const flipD = (rawGid & FLIP_D) !== 0;
            const gid = rawGid & ~(FLIP_H | FLIP_V | FLIP_D);
            const ts = findTilesetForGid(gid);
            if (!ts) continue;
            const img = tilesetImages.get(ts.firstgid);
            if (!img) continue;
            const columns = ts.columns || Math.max(1, Math.floor(ts.imagewidth / ts.tilewidth));
            const tileId = gid - ts.firstgid;
            const sx = ts.margin + (tileId % columns) * (ts.tilewidth + ts.spacing);
            const sy = ts.margin + Math.floor(tileId / columns) * (ts.tileheight + ts.spacing);
            newTiles.push({
              img,
              sx,
              sy,
              sw: ts.tilewidth,
              sh: ts.tileheight,
              x: obj.x || 0,
              y: obj.y || 0,
              w: obj.width || ts.tilewidth,
              h: obj.height || ts.tileheight,
              rotation: typeof obj.rotation === "number" ? obj.rotation : 0,
              flipH,
              flipV,
              flipD,
            });
            continue;
          }

          const name = (obj.name || obj.type || "").toLowerCase();
          const nameCompact = name.replace(/\s+/g, "");
          if (name === "car") {
            foundObjects = true;
            hasMapObjects = true;
            car.x = obj.x || car.x;
            car.y = obj.y || car.y;
            if (typeof obj.rotation === "number") {
              car.angle = degToRad(obj.rotation);
            }
            startSpawn = { x: car.x, y: car.y, angle: car.angle };
          } else if (/^checkpoint\d+$/.test(name)) {
            const idx = parseInt(name.replace("checkpoint", ""), 10);
            if (!Number.isNaN(idx)) {
              newAICheckpoints.push({
                index: idx,
                x: (obj.x || 0) + (obj.width || 0) / 2,
                y: (obj.y || 0) + (obj.height || 0) / 2,
              });
            }
            foundObjects = true;
            hasMapObjects = true;
            const x1 = obj.x || 0;
            const y1 = obj.y || 0;
            const w = obj.width || 0;
            const h = obj.height || 0;
            const x2 = x1 + w;
            const y2 = y1 + h;
            newMapCheckpoints.push({
              index: Number.isNaN(idx) ? newMapCheckpoints.length : idx,
              x1,
              y1,
              x2,
              y2,
            });
          } else if (name === "ai_spawn") {
            newAISpawns.push({
              x: obj.x || 0,
              y: obj.y || 0,
              angle: typeof obj.rotation === "number" ? degToRad(obj.rotation) : 0,
            });
          } else if (name === "checkpoint") {
            foundObjects = true;
            hasMapObjects = true;
            if (Array.isArray(obj.polyline) && obj.polyline.length >= 2) {
              const baseX = obj.x || 0;
              const baseY = obj.y || 0;
              const p0 = obj.polyline[0];
              const p1 = obj.polyline[obj.polyline.length - 1];
              newMapCheckpoints.push({
                index: newMapCheckpoints.length,
                x1: baseX + p0.x,
                y1: baseY + p0.y,
                x2: baseX + p1.x,
                y2: baseY + p1.y,
              });
            } else {
              const x1 = obj.x || 0;
              const y1 = obj.y || 0;
              const x2 = x1 + (obj.width || 0);
              const y2 = y1 + (obj.height || 0);
              newMapCheckpoints.push({
                index: newMapCheckpoints.length,
                x1,
                y1,
                x2,
                y2,
              });
            }
          }
        }

        if (foundObjects) {
          if (newMapCheckpoints.length) {
            checkpoints = newMapCheckpoints
              .slice()
              .sort((a, b) => a.index - b.index)
              .map(({ x1, y1, x2, y2 }) => ({ x1, y1, x2, y2 }));
            hasMapCheckpoints = true;
          }
          currentCheckpoint = 0;
          lastCheckpointIndex = -1;
        }
      }
      if (newCollisionObstacles.length) {
        obstacles = newCollisionObstacles;
        hasMapObstacles = true;
      }
      if (newTiles.length) tiledTrackTiles = newTiles;
      if (newTileLayers.length) tiledTileLayers = newTileLayers;
      tiledRoadLayers = tiledTileLayers.filter((l) => (l.name || "").toLowerCase().includes("road"));
      tiledGroundLayers = tiledTileLayers.filter((l) => (l.name || "").toLowerCase().includes("ground"));
      aiSpawnPoints = newAISpawns;
      if (checkpoints.length) {
        aiCheckpoints = checkpoints.map((cp) => ({
          x: (cp.x1 + cp.x2) / 2,
          y: (cp.y1 + cp.y2) / 2,
        }));
      } else {
        aiCheckpoints = newAICheckpoints
          .sort((a, b) => a.index - b.index)
          .map((p) => ({ x: p.x, y: p.y }));
      }
      if (tiledTrackTiles.length && !hasMapObjects) {
        obstacles = [];
        checkpoints = [];
        hasMapObstacles = false;
        hasMapCheckpoints = false;
        currentCheckpoint = 0;
        lastCheckpointIndex = -1;
      }
    } catch {
      // no map.json or invalid JSON
    }
  };

  class Joystick {
    constructor(name, anchorX, anchorY, radius, axisLock) {
      this.name = name;
      this.anchorX = anchorX;
      this.anchorY = anchorY;
      this.radius = radius;
      this.axisLock = axisLock;
      this.pointerId = null;
      this.valueX = 0;
      this.valueY = 0;
      this.activeX = anchorX;
      this.activeY = anchorY;
    }

    inZone(x, y) {
      const dx = x - this.anchorX;
      const dy = y - this.anchorY;
      return dx * dx + dy * dy <= (this.radius * 1.4) ** 2;
    }

    start(pointerId, x, y) {
      this.pointerId = pointerId;
      this.activeX = x;
      this.activeY = y;
      this.update(x, y);
    }

    update(x, y) {
      const dx = x - this.anchorX;
      const dy = y - this.anchorY;
      const dist = Math.hypot(dx, dy);
      const clamped = dist > this.radius ? this.radius / dist : 1;
      let vx = dx * clamped;
      let vy = dy * clamped;
      if (this.axisLock === "x") vy = 0;
      if (this.axisLock === "y") vx = 0;
      this.valueX = vx / this.radius;
      this.valueY = vy / this.radius;
      this.activeX = this.anchorX + vx;
      this.activeY = this.anchorY + vy;
    }

    end() {
      this.pointerId = null;
      this.valueX = 0;
      this.valueY = 0;
      this.activeX = this.anchorX;
      this.activeY = this.anchorY;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#e6e6e6";
      ctx.beginPath();
      ctx.arc(this.anchorX, this.anchorY, this.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "#f5f5f5";
      ctx.beginPath();
      ctx.arc(this.activeX, this.activeY, this.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  window.addEventListener("keydown", (e) => {
    if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = true;
    if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = true;
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = false;
    if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = false;
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
  });

  const worldToScreen = (x, y, scale, offsetX, offsetY) => ({
    x: x * scale + offsetX,
    y: y * scale + offsetY,
  });

  const screenToWorld = (x, y, scale, offsetX, offsetY) => ({
    x: (x - offsetX) / scale,
    y: (y - offsetY) / scale,
  });

  const car = {
    x: 320,
    y: 360,
    angle: degToRad(0),
    speed: 0,
    radius: 18,
  };
  const carRenderSize = { w: 32, h: 64 };

  let obstacles = [
    { x: 420, y: 260, r: 18 },
    { x: 880, y: 220, r: 18 },
    { x: 960, y: 500, r: 18 },
    { x: 520, y: 520, r: 18 },
  ];

  const walls = [];

  let trackWidth = 110;
  let trackPath = [
    { x: 180, y: 200 },
    { x: 980, y: 200 },
    { x: 980, y: 360 },
    { x: 760, y: 360 },
    { x: 760, y: 520 },
    { x: 300, y: 520 },
    { x: 300, y: 360 },
    { x: 540, y: 360 },
    { x: 540, y: 200 },
    { x: 180, y: 200 },
  ];

  let checkpoints = [
    { x1: 260, y1: 260, x2: 260, y2: 500 },
    { x1: 980, y1: 260, x2: 980, y2: 480 },
    { x1: 360, y1: 200, x2: 700, y2: 200 },
    { x1: 360, y1: 560, x2: 700, y2: 560 },
  ];
  let hasMapObstacles = false;
  let hasMapCheckpoints = false;
  let startSpawn = { x: car.x, y: car.y, angle: car.angle };
  let aiSpawnPoints = [];
  let aiCars = [];
  let aiCheckpoints = [];
  let raceLaps = 3;
  let mapLaps = null;
  let trackSegments = [];
  let trackLength = 0;

  let currentCheckpoint = 0;
  let lastCheckpointIndex = -1;
  let lap = 1;
  let raceFinished = false;
  let lapStartTime = null;
  let lastX = car.x;
  let lastY = car.y;
  let timerStart = null;
  let lastElapsed = 0;
  let countdownActive = false;
  let countdownStart = 0;
  const countdownDuration = 3500;
  let countdownLabel = "";

  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let uiScale = 1;
  let uiOffsetX = 0;
  let uiOffsetY = 0;
  let uiViewportWidth = 1280;
  let uiViewportHeight = 720;
  let dpr = 1;
  const startZoom = 4;
  let cameraZoom = startZoom;
  const minZoom = 0.4;
  const maxZoom = startZoom;
  const zoomLerpSpeed = 5;

  const uiBase = {
    margin: 120,
    stickRadius: 62,
    pedalW: 90,
    pedalH: 140,
    pedalGap: 18,
    stickOffsetY: 140,
    stickOffsetX: 45,
  };
  const ui = { ...uiBase };
  const steeringStick = new Joystick("steer", ui.margin, 720 - ui.stickOffsetY, ui.stickRadius, "x");
  const pedals = {
    accel: { x: 0, y: 0, w: ui.pedalW, h: ui.pedalH, pressed: false },
    brake: { x: 0, y: 0, w: ui.pedalW, h: ui.pedalH, pressed: false },
  };

  const audio = {
    ctx: null,
    engineGain: null,
    engineBuffer: null,
    engineSource: null,
    collisionBuffer: null,
  };

  let audioUnlocked = false;
  const unlockAudio = async () => {
    if (audioUnlocked) return;
    audioUnlocked = true;
    audio.ctx = loadAudioContext();
    const ctx = audio.ctx;

    const engineBuffer = await loadAudioBuffer(ctx, ASSETS.engine);
    const collisionBuffer = await loadAudioBuffer(ctx, ASSETS.collision);
    audio.engineBuffer = engineBuffer;
    audio.collisionBuffer = collisionBuffer;

    if (engineBuffer) {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = engineBuffer;
      source.loop = true;
      gain.gain.value = 0.0;
      source.connect(gain).connect(ctx.destination);
      source.start();
      audio.engineSource = source;
      audio.engineGain = gain;
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };

  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);

  const pointerMap = new Map();

  const updateUiLayout = () => {
    const minDim = Math.min(uiViewportWidth, uiViewportHeight);
    const uiScaleFactor = clamp(minDim / 720, 0.55, 1);
    ui.margin = Math.round(uiBase.margin * uiScaleFactor);
    ui.stickRadius = Math.round(uiBase.stickRadius * uiScaleFactor);
    ui.pedalW = Math.round(uiBase.pedalW * uiScaleFactor);
    ui.pedalH = Math.round(uiBase.pedalH * uiScaleFactor);
    ui.pedalGap = Math.round(uiBase.pedalGap * uiScaleFactor);
    ui.stickOffsetY = Math.round(uiBase.stickOffsetY * uiScaleFactor);
    ui.stickOffsetX = Math.round(uiBase.stickOffsetX * uiScaleFactor);
  };

  const updateJoystickAnchors = () => {
    updateUiLayout();
    steeringStick.anchorX = ui.margin + ui.stickOffsetX;
    steeringStick.anchorY = uiViewportHeight - ui.stickOffsetY;
    pedals.accel.w = ui.pedalW;
    pedals.accel.h = ui.pedalH;
    pedals.brake.w = ui.pedalW;
    pedals.brake.h = ui.pedalH;
    const baseY = uiViewportHeight - ui.margin - ui.pedalH;
    const stackedTop = baseY - ui.pedalH - ui.pedalGap;
    if (stackedTop < ui.margin) {
      const totalW = ui.pedalW * 2 + ui.pedalGap;
      const leftX = uiViewportWidth - ui.margin - totalW;
      pedals.brake.x = leftX;
      pedals.brake.y = baseY;
      pedals.accel.x = leftX + ui.pedalW + ui.pedalGap;
      pedals.accel.y = baseY;
    } else {
      const rightX = uiViewportWidth - ui.margin - ui.pedalW;
      pedals.brake.x = rightX;
      pedals.brake.y = baseY;
      pedals.accel.x = rightX;
      pedals.accel.y = baseY - ui.pedalH - ui.pedalGap;
    }
    steeringStick.end();
    pedals.accel.pressed = false;
    pedals.brake.pressed = false;
  };

  const handlePointerDown = (pointerId, clientX, clientY) => {
    const uiX = clientX;
    const uiY = clientY;
    if (
      uiX >= pedals.accel.x &&
      uiX <= pedals.accel.x + pedals.accel.w &&
      uiY >= pedals.accel.y &&
      uiY <= pedals.accel.y + pedals.accel.h
    ) {
      pedals.accel.pressed = true;
      pointerMap.set(pointerId, { type: "pedal", name: "accel" });
      return;
    }
    if (
      uiX >= pedals.brake.x &&
      uiX <= pedals.brake.x + pedals.brake.w &&
      uiY >= pedals.brake.y &&
      uiY <= pedals.brake.y + pedals.brake.h
    ) {
      pedals.brake.pressed = true;
      pointerMap.set(pointerId, { type: "pedal", name: "brake" });
      return;
    }
    if (!steeringStick.pointerId && steeringStick.inZone(uiX, uiY)) {
      steeringStick.start(pointerId, uiX, uiY);
      pointerMap.set(pointerId, steeringStick);
      return;
    }
  };

  const handlePointerMove = (pointerId, clientX, clientY) => {
    const stick = pointerMap.get(pointerId);
    if (!stick) return;
    if (stick.type === "pedal") return;
    const uiX = clientX;
    const uiY = clientY;
    stick.update(uiX, uiY);
  };

  const handlePointerUp = (pointerId) => {
    const stick = pointerMap.get(pointerId);
    if (stick) {
      if (stick.type === "pedal") {
        if (stick.name === "accel") pedals.accel.pressed = false;
        if (stick.name === "brake") pedals.brake.pressed = false;
      } else {
        stick.end();
      }
    }
    pointerMap.delete(pointerId);
  };

  const onPointerDown = (e) => handlePointerDown(e.pointerId, e.clientX, e.clientY);
  const onPointerMove = (e) => handlePointerMove(e.pointerId, e.clientX, e.clientY);
  const onPointerUp = (e) => handlePointerUp(e.pointerId);

  CANVAS.addEventListener("pointerdown", onPointerDown);
  CANVAS.addEventListener("pointermove", onPointerMove);
  CANVAS.addEventListener("pointerup", onPointerUp);
  CANVAS.addEventListener("pointercancel", onPointerUp);
  CANVAS.addEventListener("pointerout", onPointerUp);

  CANVAS.addEventListener("touchstart", (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) handlePointerDown(t.identifier, t.clientX, t.clientY);
  }, { passive: false });
  CANVAS.addEventListener("touchmove", (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) handlePointerMove(t.identifier, t.clientX, t.clientY);
  }, { passive: false });
  CANVAS.addEventListener("touchend", (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) handlePointerUp(t.identifier);
  }, { passive: false });
  CANVAS.addEventListener("touchcancel", (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) handlePointerUp(t.identifier);
  }, { passive: false });

  const resize = () => {
    dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    CANVAS.width = Math.floor(w * dpr);
    CANVAS.height = Math.floor(h * dpr);
    const scaleX = CANVAS.width / worldWidth;
    const scaleY = CANVAS.height / worldHeight;
    scale = Math.min(scaleX, scaleY) * cameraZoom;

    uiViewportWidth = w;
    uiViewportHeight = h;
    uiScale = dpr;
    uiOffsetX = 0;
    uiOffsetY = 0;
    updateCamera();
    updateRotateOverlay();
  };

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", updateRotateOverlay);
  resize();
  updateJoystickAnchors();

  const setZoom = (nextZoom) => {
    cameraZoom = Math.max(minZoom, Math.min(maxZoom, nextZoom));
  };

  function updateCamera() {
    const viewW = CANVAS.width / scale;
    const viewH = CANVAS.height / scale;
    let camX = car.x;
    let camY = car.y;
    if (viewW >= worldWidth) {
      camX = worldWidth / 2;
    } else {
      camX = Math.max(viewW / 2, Math.min(worldWidth - viewW / 2, camX));
    }
    if (viewH >= worldHeight) {
      camY = worldHeight / 2;
    } else {
      camY = Math.max(viewH / 2, Math.min(worldHeight - viewH / 2, camY));
    }
    offsetX = CANVAS.width / 2 - camX * scale;
    offsetY = CANVAS.height / 2 - camY * scale;
  }


  const rectCircleCollision = (cx, cy, r, rect) => {
    const closestX = clamp(cx, rect.x, rect.x + rect.w);
    const closestY = clamp(cy, rect.y, rect.y + rect.h);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < r * r;
  };

  const resolveRectCollision = (cx, cy, r, rect) => {
    const closestX = clamp(cx, rect.x, rect.x + rect.w);
    const closestY = clamp(cy, rect.y, rect.y + rect.h);
    const dx = cx - closestX;
    const dy = cy - closestY;
    const dist = Math.hypot(dx, dy) || 1;
    const overlap = r - dist;
    return { x: dx / dist * overlap, y: dy / dist * overlap };
  };

  const circleCircleCollision = (a, b, r) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy < r * r;
  };

  const resolveCircleCollision = (a, b, r) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dist = Math.hypot(dx, dy) || 1;
    const overlap = r - dist;
    return { x: dx / dist * overlap, y: dy / dist * overlap };
  };

  const circleRectCollision = (cx, cy, r, rx, ry, rw, rh) => {
    const nearestX = clamp(cx, rx, rx + rw);
    const nearestY = clamp(cy, ry, ry + rh);
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return dx * dx + dy * dy < r * r;
  };

  const resolveCircleRect = (cx, cy, r, rx, ry, rw, rh) => {
    const nearestX = clamp(cx, rx, rx + rw);
    const nearestY = clamp(cy, ry, ry + rh);
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    const dist = Math.hypot(dx, dy) || 1;
    const overlap = r - dist;
    return { x: (dx / dist) * overlap, y: (dy / dist) * overlap };
  };

  const getCarOBB = (entity) => ({
    x: entity.x,
    y: entity.y,
    angle: entity.angle || 0,
    halfW: carRenderSize.w * 0.42,
    halfH: carRenderSize.h * 0.42,
  });

  const getOBBAxes = (angle) => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
      { x: c, y: s },
      { x: -s, y: c },
    ];
  };

  const projectOBB = (obb, axis) => {
    const axes = getOBBAxes(obb.angle);
    const center = obb.x * axis.x + obb.y * axis.y;
    const r =
      obb.halfW * Math.abs(axis.x * axes[0].x + axis.y * axes[0].y) +
      obb.halfH * Math.abs(axis.x * axes[1].x + axis.y * axes[1].y);
    return { min: center - r, max: center + r };
  };

  const obbMTV = (a, b) => {
    const axes = [...getOBBAxes(a.angle), ...getOBBAxes(b.angle)];
    let minOverlap = Infinity;
    let bestAxis = null;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    for (const axis of axes) {
      const pa = projectOBB(a, axis);
      const pb = projectOBB(b, axis);
      const overlap = Math.min(pa.max, pb.max) - Math.max(pa.min, pb.min);
      if (overlap <= 0) return null;
      if (overlap < minOverlap) {
        minOverlap = overlap;
        bestAxis = axis;
      }
    }
    if (!bestAxis) return null;
    const dir = dx * bestAxis.x + dy * bestAxis.y;
    const sign = dir < 0 ? -1 : 1;
    return { x: bestAxis.x * minOverlap * sign, y: bestAxis.y * minOverlap * sign };
  };

  const segmentIntersect = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (den === 0) return false;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  };

  const pointInRect = (x, y, rect) =>
    x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;

  const segmentIntersectsRect = (x1, y1, x2, y2, rect) => {
    if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) return true;
    const rx1 = rect.x;
    const ry1 = rect.y;
    const rx2 = rect.x + rect.w;
    const ry2 = rect.y + rect.h;
    return (
      segmentIntersect(x1, y1, x2, y2, rx1, ry1, rx2, ry1) ||
      segmentIntersect(x1, y1, x2, y2, rx2, ry1, rx2, ry2) ||
      segmentIntersect(x1, y1, x2, y2, rx2, ry2, rx1, ry2) ||
      segmentIntersect(x1, y1, x2, y2, rx1, ry2, rx1, ry1)
    );
  };

  const checkpointToRect = (cp) => {
    const xMin = Math.min(cp.x1, cp.x2);
    const yMin = Math.min(cp.y1, cp.y2);
    const xMax = Math.max(cp.x1, cp.x2);
    const yMax = Math.max(cp.y1, cp.y2);
    return { x: xMin, y: yMin, w: xMax - xMin, h: yMax - yMin };
  };

  const getCheckpointSpawn = (index) => {
    const cp = checkpoints[index];
    if (!cp) return null;
    const mx = (cp.x1 + cp.x2) / 2;
    const my = (cp.y1 + cp.y2) / 2;
    const lineAngle = Math.atan2(cp.y2 - cp.y1, cp.x2 - cp.x1);
    const trackAngle = lineAngle + Math.PI / 2;
    const backOffset = 30;
    return {
      x: mx - Math.cos(trackAngle) * backOffset,
      y: my - Math.sin(trackAngle) * backOffset,
      angle: trackAngle,
    };
  };

  const respawnToCheckpoint = (index) => {
    const spawn = index >= 0 ? getCheckpointSpawn(index) : null;
    const target = spawn || startSpawn;
    if (!target) return;
    car.x = target.x;
    car.y = target.y;
    if (index >= 0 && checkpoints.length) {
      const nextIndex = (index + 1) % checkpoints.length;
      const next = checkpoints[nextIndex];
      if (next) {
        const nx = (next.x1 + next.x2) / 2;
        const ny = (next.y1 + next.y2) / 2;
        car.angle = Math.atan2(ny - car.y, nx - car.x);
      } else {
        car.angle = target.angle;
      }
    } else {
      car.angle = target.angle;
    }
    car.speed = 0;
    lastX = car.x;
    lastY = car.y;
  };

  const updatePhysics = (dt) => {
    if (!gameState.started || countdownActive || raceFinished) return;
    const steeringInput = keys.left || keys.right ? (keys.left ? -1 : 1) : steeringStick.valueX;
    const throttleInput = (keys.up ? 1 : 0) + (keys.down ? -1 : 0) + (pedals.accel.pressed ? 1 : 0) - (pedals.brake.pressed ? 1 : 0);
    const throttle = clamp(throttleInput, -1, 1);

    const accel = 260;
    const maxSpeed = 440;
    const brake = 340;
    const drag = 0.98;
    const surface = getSurfaceAt(car.x, car.y);
    const groundSlow = 0.92;
    const groundMaxSpeed = 0.55;

    if (throttle > 0) {
      car.speed += accel * throttle * dt;
    } else if (throttle < 0) {
      car.speed += brake * throttle * dt;
    } else {
      car.speed *= drag;
    }

    if (surface === "ground") {
      car.speed *= groundSlow;
    }
    const maxSurfaceSpeed = surface === "ground" ? maxSpeed * groundMaxSpeed : maxSpeed;
    car.speed = clamp(car.speed, -maxSurfaceSpeed * 0.5, maxSurfaceSpeed);

    const speedAbs = Math.abs(car.speed);
    const speedFactor = clamp(speedAbs / maxSpeed, 0, 1);
    const steerStrength = lerp(1.6, 3.2, speedFactor);
    if (speedAbs > 5) {
      car.angle += steeringInput * steerStrength * dt * (car.speed >= 0 ? 1 : -1);
    }

    const vx = Math.cos(car.angle) * car.speed;
    const vy = Math.sin(car.angle) * car.speed;

    lastX = car.x;
    lastY = car.y;
    car.x += vx * dt;
    car.y += vy * dt;

    let collided = false;

    for (const obs of obstacles) {
      if (obs.isRect) {
        if (circleRectCollision(car.x, car.y, car.radius, obs.x, obs.y, obs.w, obs.h)) {
          const push = resolveCircleRect(car.x, car.y, car.radius, obs.x, obs.y, obs.w, obs.h);
          car.x += push.x;
          car.y += push.y;
          car.speed *= 0.6;
          collided = true;
        }
      } else if (circleCircleCollision(car, obs, car.radius + obs.r)) {
        const push = resolveCircleCollision(car, obs, car.radius + obs.r);
        car.x += push.x;
        car.y += push.y;
        car.speed *= 0.6;
        collided = true;
      }
    }

    for (const ai of aiCars) {
      const info = getAIPosAngle(ai);
      if (!info) continue;
      const aiOBB = getCarOBB(info);
      const carOBB = getCarOBB(car);
      const mtv = obbMTV(carOBB, aiOBB);
      if (!mtv) continue;
      car.x -= mtv.x * 0.6;
      car.y -= mtv.y * 0.6;
      if (ai.useTrack) {
        ai.x = info.x;
        ai.y = info.y;
        ai.angle = info.angle;
        ai.useTrack = false;
        ai.bumpTimer = Math.max(ai.bumpTimer || 0, 0.35);
        ai.x += mtv.x * 0.8;
        ai.y += mtv.y * 0.8;
      } else if (typeof ai.x === "number" && typeof ai.y === "number") {
        ai.x += mtv.x * 0.4;
        ai.y += mtv.y * 0.4;
      }
      car.speed *= 0.7;
      ai.hitSlowTimer = Math.max(ai.hitSlowTimer || 0, 0.35);
      collided = true;
    }

    if (collided && audioUnlocked && audio.ctx && audio.collisionBuffer) {
      const ctx = audio.ctx;
      const source = ctx.createBufferSource();
      source.buffer = audio.collisionBuffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.7;
      source.connect(gain).connect(ctx.destination);
      source.start();
    }

    if (checkpoints.length) {
      let crossedIndex = -1;
      for (let i = 0; i < checkpoints.length; i++) {
        const cp = checkpoints[i];
        const rect = checkpointToRect(cp);
        if (segmentIntersectsRect(lastX, lastY, car.x, car.y, rect)) {
          crossedIndex = i;
          break;
        }
      }
      if (crossedIndex !== -1) {
        if (crossedIndex === currentCheckpoint) {
          lastCheckpointIndex = crossedIndex;
          currentCheckpoint += 1;
          if (currentCheckpoint >= checkpoints.length) {
            currentCheckpoint = 0;
            lap += 1;
            const now = performance.now();
            if (lapStartTime !== null) {
              const lapElapsed = now - lapStartTime;
              setBestTime(lapElapsed);
              lapStartTime = now;
            }
            if (lap > raceLaps) {
              raceFinished = true;
              const total = (gameState.selectedMode?.mobs || 0) + 1;
              showRaceResult(true, 1, total, lastElapsed);
            }
          }
        } else if (crossedIndex > currentCheckpoint) {
          respawnToCheckpoint(lastCheckpointIndex);
        }
      }
    }

    if (audioUnlocked && audio.engineGain && audio.ctx) {
      const speed01 = clamp(Math.abs(car.speed) / maxSpeed, 0, 1);
      const ctx = audio.ctx;
      audio.engineGain.gain.setTargetAtTime(0.15 + speed01 * 0.35, ctx.currentTime, 0.05);
      if (audio.engineSource) {
        audio.engineSource.playbackRate.value = 0.8 + speed01 * 0.6;
      }
    }
  };

  const buildTrackSegments = () => {
    trackSegments = [];
    trackLength = 0;
    if (!trackPath || trackPath.length < 2) return;
    for (let i = 0; i < trackPath.length - 1; i++) {
      const a = trackPath[i];
      const b = trackPath[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len <= 0) continue;
      trackSegments.push({ a, b, len, dx, dy });
      trackLength += len;
    }
  };

  const selectAICarImages = (playerId) => {
    const pool = CAR_OPTIONS.filter((c) => c.id !== playerId)
      .map((c) => assets.images.carById.get(c.id))
      .filter(Boolean);
    assets.images.aiCars = pool.length ? pool : [assets.images.car].filter(Boolean);
  };

  const normalize = (x, y) => {
    const len = Math.hypot(x, y);
    if (!len) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
  };

  const getTileAt = (layers, x, y) => {
    if (!layers.length || tiledMapTileWidth <= 0 || tiledMapTileHeight <= 0) return 0;
    const tx = Math.floor(x / tiledMapTileWidth);
    const ty = Math.floor(y / tiledMapTileHeight);
    if (tx < 0 || ty < 0) return 0;
    const mapW = tiledMapWidth || layers[0].width;
    const mapH = tiledMapHeight || layers[0].height;
    if (tx >= mapW || ty >= mapH) return 0;
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible) continue;
      const idx = ty * layer.width + tx;
      const rawGid = layer.data[idx] || 0;
      if (rawGid) return rawGid;
    }
    return 0;
  };

  const getSurfaceFromGid = (rawGid) => {
    const gid = rawGid & ~(FLIP_H | FLIP_V | FLIP_D);
    if (!gid) return "none";
    let chosen = null;
    for (const ts of tiledTilesetMeta) {
      if (gid >= ts.firstgid) chosen = ts;
      else break;
    }
    if (!chosen) return "none";
    const name = (chosen.name || "").toLowerCase();
    if (name.includes("road") || name.includes("asphalt")) return "road";
    if (name.includes("grass") || name.includes("land") || name.includes("dirt") || name.includes("sand")) {
      return "ground";
    }
    return "none";
  };

  const findRoadDirection = (x, y) => {
    const samples = [
      { x: 60, y: 0 },
      { x: -60, y: 0 },
      { x: 0, y: 60 },
      { x: 0, y: -60 },
      { x: 45, y: 45 },
      { x: -45, y: 45 },
      { x: 45, y: -45 },
      { x: -45, y: -45 },
    ];
    let best = null;
    for (const s of samples) {
      const sx = x + s.x;
      const sy = y + s.y;
      if (getSurfaceAt(sx, sy) === "road") {
        const dist = Math.hypot(s.x, s.y);
        if (!best || dist < best.dist) best = { x: s.x, y: s.y, dist };
      }
    }
    return best ? normalize(best.x, best.y) : null;
  };

  const getSurfaceAtAnyLayer = (x, y) => {
    if (!tiledTileLayers.length) return "none";
    const tx = Math.floor(x / tiledMapTileWidth);
    const ty = Math.floor(y / tiledMapTileHeight);
    if (tx < 0 || ty < 0) return "none";
    const mapW = tiledMapWidth || tiledTileLayers[0].width;
    const mapH = tiledMapHeight || tiledTileLayers[0].height;
    if (tx >= mapW || ty >= mapH) return "none";
    let foundGround = false;
    for (let i = tiledTileLayers.length - 1; i >= 0; i--) {
      const layer = tiledTileLayers[i];
      if (!layer.visible) continue;
      const idx = ty * layer.width + tx;
      const rawGid = layer.data[idx] || 0;
      if (!rawGid) continue;
      const surface = getSurfaceFromGid(rawGid);
      if (surface === "road") return "road";
      if (surface === "ground") foundGround = true;
    }
    return foundGround ? "ground" : "none";
  };

  const getSurfaceAt = (x, y) => {
    if (tiledRoadLayers.length) {
      const roadHit = getTileAt(tiledRoadLayers, x, y);
      if (roadHit) return "road";
      if (tiledGroundLayers.length) {
        if (getTileAt(tiledGroundLayers, x, y)) return "ground";
      }
      const tx = Math.floor(x / tiledMapTileWidth);
      const ty = Math.floor(y / tiledMapTileHeight);
      const mapW = tiledMapWidth || (tiledRoadLayers[0]?.width || 0);
      const mapH = tiledMapHeight || (tiledRoadLayers[0]?.height || 0);
      if (tx >= 0 && ty >= 0 && tx < mapW && ty < mapH) return "ground";
      return "none";
    }
    return getSurfaceAtAnyLayer(x, y);
  };

  const computeAvoidance = (x, y, selfAi) => {
    const avoidRadius = 40;
    const avoidRadiusAI = 60;
    let ax = 0;
    let ay = 0;
    for (const obs of obstacles) {
      const cx = obs.isRect ? obs.x + obs.w / 2 : obs.x;
      const cy = obs.isRect ? obs.y + obs.h / 2 : obs.y;
      const or = obs.isRect ? Math.max(obs.w, obs.h) / 2 : obs.r;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < avoidRadius + or) {
        const strength = 1 - dist / (avoidRadius + or);
        ax += (dx / dist) * strength;
        ay += (dy / dist) * strength;
      }
    }
    for (const other of aiCars) {
      if (other === selfAi) continue;
      const dx = x - other.x;
      const dy = y - other.y;
      const dist = Math.hypot(dx, dy);
      const r = (selfAi?.radius || car.radius) + (other.radius || car.radius);
      if (dist > 0 && dist < avoidRadiusAI + r) {
        const strength = 1 - dist / (avoidRadiusAI + r);
        ax += (dx / dist) * strength * 1.2;
        ay += (dy / dist) * strength * 1.2;
      }
    }
    const dxp = x - car.x;
    const dyp = y - car.y;
    const distp = Math.hypot(dxp, dyp);
    if (distp > 0 && distp < avoidRadius + car.radius) {
      const strength = 1 - distp / (avoidRadius + car.radius);
      ax += (dxp / distp) * strength * 1.0;
      ay += (dyp / distp) * strength * 1.0;
    }
    return { x: ax, y: ay };
  };

  const nearestTrackT = (x, y) => {
    if (!trackSegments.length || trackLength <= 0) return 0;
    let bestDist = Number.POSITIVE_INFINITY;
    let bestT = 0;
    let accLen = 0;
    for (const seg of trackSegments) {
      const ax = seg.a.x;
      const ay = seg.a.y;
      const bx = seg.b.x;
      const by = seg.b.y;
      const vx = bx - ax;
      const vy = by - ay;
      const denom = vx * vx + vy * vy || 1;
      const tSeg = clamp(((x - ax) * vx + (y - ay) * vy) / denom, 0, 1);
      const px = ax + vx * tSeg;
      const py = ay + vy * tSeg;
      const dx = x - px;
      const dy = y - py;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestT = (accLen + seg.len * tSeg) / trackLength;
      }
      accLen += seg.len;
    }
    return bestT;
  };

  const initAICars = () => {
    aiCars = [];
    const mobCount = gameState.selectedMode.mobs;
    if (mobCount <= 0) return;
    const useTrack = trackLength > 0;
    const useCheckpoints = aiCheckpoints.length > 0;
    const aiBaseSpeed = 160;
    const aiStepSpeed = 20;
    for (let i = 0; i < mobCount; i++) {
      const aiImage = assets.images.aiCars.length
        ? assets.images.aiCars[i % assets.images.aiCars.length]
        : assets.images.car;
      const spawn = aiSpawnPoints[i];
      if (spawn) {
        const useTrackFromSpawn = useTrack && !useCheckpoints;
        const spawnT = useTrackFromSpawn ? nearestTrackT(spawn.x, spawn.y) : 0;
        aiCars.push({
          x: spawn.x,
          y: spawn.y,
          angle: spawn.angle,
          turnAngle: spawn.angle,
          t: spawnT,
          speed: aiBaseSpeed + i * aiStepSpeed,
          baseSpeed: aiBaseSpeed + i * aiStepSpeed,
          useTrack: useTrackFromSpawn,
          trackMode: useTrackFromSpawn,
          radius: car.radius,
          checkpointIndex: 0,
          lastCheckpointIndex: -1,
          lap: 1,
          finished: false,
          image: aiImage,
          lastX: spawn.x,
          lastY: spawn.y,
          steerX: 0,
          steerY: 0,
          bumpTimer: 0,
          hitSlowTimer: 0,
        });
      } else if (useTrack) {
        aiCars.push({
          t: i / mobCount,
          speed: aiBaseSpeed + i * aiStepSpeed,
          baseSpeed: aiBaseSpeed + i * aiStepSpeed,
          useTrack: true,
          trackMode: true,
          radius: car.radius,
          checkpointIndex: 0,
          lastCheckpointIndex: -1,
          lap: 1,
          finished: false,
          image: aiImage,
          turnAngle: 0,
          steerX: 0,
          steerY: 0,
          bumpTimer: 0,
          hitSlowTimer: 0,
        });
      } else if (useCheckpoints) {
        const first = aiCheckpoints[0];
        aiCars.push({
          x: first.x,
          y: first.y,
          angle: 0,
          turnAngle: 0,
          t: 0,
          speed: aiBaseSpeed + i * aiStepSpeed,
          baseSpeed: aiBaseSpeed + i * aiStepSpeed,
          useTrack: false,
          trackMode: false,
          radius: car.radius,
          checkpointIndex: 0,
          lastCheckpointIndex: -1,
          lap: 1,
          finished: false,
          image: aiImage,
          lastX: first.x,
          lastY: first.y,
          steerX: 0,
          steerY: 0,
          bumpTimer: 0,
          hitSlowTimer: 0,
        });
      }
    }
  };

  const sampleTrack = (t) => {
    if (!trackSegments.length || trackLength === 0) return null;
    let dist = t * trackLength;
    for (const seg of trackSegments) {
      if (dist <= seg.len) {
        const r = dist / seg.len;
        return {
          x: seg.a.x + seg.dx * r,
          y: seg.a.y + seg.dy * r,
          angle: Math.atan2(seg.dy, seg.dx),
        };
      }
      dist -= seg.len;
    }
    const last = trackSegments[trackSegments.length - 1];
    return { x: last.b.x, y: last.b.y, angle: Math.atan2(last.dy, last.dx) };
  };

  const getAIPosition = (ai) => {
    if (ai.useTrack) {
      const p = sampleTrack(ai.t);
      if (!p) return null;
      return { x: p.x, y: p.y };
    }
    if (typeof ai.x === "number" && typeof ai.y === "number") {
      return { x: ai.x, y: ai.y };
    }
    return null;
  };

  const getAIPosAngle = (ai) => {
    if (ai.useTrack) {
      const p = sampleTrack(ai.t);
      if (!p) return null;
      return { x: p.x, y: p.y, angle: p.angle };
    }
    if (typeof ai.x === "number" && typeof ai.y === "number") {
      return { x: ai.x, y: ai.y, angle: ai.angle || 0 };
    }
    return null;
  };

  const updateAICars = (dt) => {
    if (!aiCars.length) return;
    if (countdownActive || raceFinished) return;
    for (const ai of aiCars) {
      if (ai.finished) continue;
      if (ai.hitSlowTimer && ai.hitSlowTimer > 0) {
        ai.hitSlowTimer = Math.max(0, ai.hitSlowTimer - dt);
      }
      if (ai.bumpTimer && ai.bumpTimer > 0) {
        ai.bumpTimer = Math.max(0, ai.bumpTimer - dt);
        if (ai.trackMode && ai.bumpTimer === 0) {
          ai.t = nearestTrackT(ai.x, ai.y);
          ai.useTrack = true;
        }
      }
      let surfacePos = null;
      if (ai.useTrack) {
        surfacePos = sampleTrack(ai.t);
      } else if (typeof ai.x === "number" && typeof ai.y === "number") {
        surfacePos = { x: ai.x, y: ai.y };
      }
      const aiSurface = surfacePos ? getSurfaceAt(surfacePos.x, surfacePos.y) : "none";
      const aiSpeedFactor = aiSurface === "ground" ? 0.55 : 1;
      const baseSpeed = Number.isFinite(ai.baseSpeed) ? ai.baseSpeed : ai.speed;
      const hitSlow = ai.hitSlowTimer > 0 ? 0.7 : 1;
      const stepSpeed = baseSpeed * hitSlow * aiSpeedFactor;
      if (ai.useTrack) {
        ai.t = (ai.t + (stepSpeed * dt) / Math.max(trackLength, 1)) % 1;
        continue;
      }
      if (!aiCheckpoints.length) continue;
      ai.lastX = ai.x;
      ai.lastY = ai.y;
      const target = aiCheckpoints[ai.checkpointIndex % aiCheckpoints.length];
      const dx = target.x - ai.x;
      const dy = target.y - ai.y;
      const targetDist = Math.hypot(dx, dy);
      const avoid = computeAvoidance(ai.x, ai.y, ai);
      const surfaceHere = getSurfaceAt(ai.x, ai.y);
      const roadDir = surfaceHere !== "road" ? findRoadDirection(ai.x, ai.y) : null;
      const targetDir = normalize(dx, dy);
      const avoidDir = normalize(avoid.x, avoid.y);
      const roadBias = roadDir ? 1.2 : 0;
      const avoidBias = 0.6;
      const mixX = targetDir.x + avoidDir.x * avoidBias + (roadDir ? roadDir.x * roadBias : 0);
      const mixY = targetDir.y + avoidDir.y * avoidBias + (roadDir ? roadDir.y * roadBias : 0);
      const desiredDir = normalize(mixX, mixY);
      const steerLerp = 0.18;
      if (!Number.isFinite(ai.steerX) || !Number.isFinite(ai.steerY)) {
        ai.steerX = desiredDir.x;
        ai.steerY = desiredDir.y;
      } else {
        ai.steerX = lerp(ai.steerX, desiredDir.x, steerLerp);
        ai.steerY = lerp(ai.steerY, desiredDir.y, steerLerp);
      }
      const desiredAngle = Math.atan2(ai.steerY, ai.steerX);
      const turnRate = 1.8;
      let angleDiff = desiredAngle - (ai.turnAngle ?? ai.angle);
      angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      ai.turnAngle = (ai.turnAngle ?? ai.angle) + clamp(angleDiff, -turnRate * dt, turnRate * dt);
      ai.angle = ai.turnAngle;
      ai.x += Math.cos(ai.angle) * stepSpeed * dt;
      ai.y += Math.sin(ai.angle) * stepSpeed * dt;

      for (const obs of obstacles) {
        if (obs.isRect) {
          if (circleRectCollision(ai.x, ai.y, ai.radius, obs.x, obs.y, obs.w, obs.h)) {
            const push = resolveCircleRect(ai.x, ai.y, ai.radius, obs.x, obs.y, obs.w, obs.h);
            ai.x += push.x;
            ai.y += push.y;
          }
        } else if (circleCircleCollision(ai, obs, ai.radius + obs.r)) {
          const push = resolveCircleCollision(ai, obs, ai.radius + obs.r);
          ai.x += push.x;
          ai.y += push.y;
        }
      }
      for (const other of aiCars) {
        if (other === ai) continue;
        const aInfo = getAIPosAngle(ai);
        const bInfo = getAIPosAngle(other);
        if (!aInfo || !bInfo) continue;
        const mtv = obbMTV(getCarOBB(aInfo), getCarOBB(bInfo));
        if (!mtv) continue;
        if (ai.useTrack) {
          const sign = mtv.x * Math.cos(aInfo.angle) + mtv.y * Math.sin(aInfo.angle) >= 0 ? 1 : -1;
          ai.t = (ai.t + sign * 0.006 + 1) % 1;
        } else if (typeof ai.x === "number" && typeof ai.y === "number") {
          ai.x -= mtv.x * 0.4;
          ai.y -= mtv.y * 0.4;
        }
        if (other.useTrack) {
          const sign = mtv.x * Math.cos(bInfo.angle) + mtv.y * Math.sin(bInfo.angle) < 0 ? 1 : -1;
          other.t = (other.t + sign * 0.006 + 1) % 1;
        } else if (typeof other.x === "number" && typeof other.y === "number") {
          other.x += mtv.x * 0.4;
          other.y += mtv.y * 0.4;
        }
        ai.hitSlowTimer = Math.max(ai.hitSlowTimer || 0, 0.2);
        other.hitSlowTimer = Math.max(other.hitSlowTimer || 0, 0.2);
      }

      if (checkpoints.length) {
        const expected = ai.checkpointIndex % checkpoints.length;
        let crossedIndex = -1;
        for (let i = 0; i < checkpoints.length; i++) {
          const cp = checkpoints[i];
          const rect = checkpointToRect(cp);
          if (segmentIntersectsRect(ai.lastX, ai.lastY, ai.x, ai.y, rect)) {
            crossedIndex = i;
            break;
          }
        }
        if (crossedIndex !== -1) {
          if (crossedIndex === expected) {
            ai.lastCheckpointIndex = crossedIndex;
            ai.checkpointIndex += 1;
            if (ai.checkpointIndex >= checkpoints.length) {
              ai.checkpointIndex = 0;
              ai.lap += 1;
              if (ai.lap > raceLaps) {
                ai.finished = true;
                raceFinished = true;
                const total = (gameState.selectedMode?.mobs || 0) + 1;
                showRaceResult(false, 2, total, lastElapsed);
              }
            }
          } else if (crossedIndex > expected) {
            const backIdx = ai.lastCheckpointIndex >= 0 ? ai.lastCheckpointIndex : 0;
            const back = aiCheckpoints[backIdx];
            if (back) {
              ai.x = back.x;
              ai.y = back.y;
              ai.speed *= 0.2;
            }
          }
        }
      }
    }
  };

  const updateAutoZoom = (dt) => {
    if (!gameState.started) return;
    const speed01 = clamp(Math.abs(car.speed) / 440, 0, 1);
    const zoomOutAmount = 1.8;
    const targetZoom = clamp(startZoom - speed01 * zoomOutAmount, minZoom, maxZoom);
    cameraZoom += (targetZoom - cameraZoom) * Math.min(1, dt * zoomLerpSpeed);
    resize();
  };

  const drawBackground = (ctx, groundImg) => {
    ctx.save();
    if (!groundImg) return ctx.restore();
    const pattern = ctx.createPattern(groundImg, "repeat");
    if (!pattern) return ctx.restore();
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, worldWidth, worldHeight);
    ctx.restore();
  };

  const drawTrack = (ctx, roadImg) => {
    ctx.save();
    if (!roadImg) return ctx.restore();
    const pattern = ctx.createPattern(roadImg, "repeat");
    if (!pattern) return ctx.restore();
    ctx.strokeStyle = pattern;
    ctx.lineWidth = trackWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(trackPath[0].x, trackPath[0].y);
    for (let i = 1; i < trackPath.length; i++) {
      ctx.lineTo(trackPath[i].x, trackPath[i].y);
    }
    ctx.stroke();
    ctx.restore();
  };

  const drawTileLayers = (ctx) => {
    if (!tiledTileLayers.length || !tiledTilesetMeta.length) return;
    const findTilesetForGid = (gid) => {
      let chosen = null;
      for (const ts of tiledTilesetMeta) {
        if (gid >= ts.firstgid) chosen = ts;
        else break;
      }
      return chosen;
    };
    for (const layer of tiledTileLayers) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      for (let y = 0; y < layer.height; y++) {
        for (let x = 0; x < layer.width; x++) {
          const idx = y * layer.width + x;
          const rawGid = layer.data[idx] || 0;
          if (!rawGid) continue;
          const flipH = (rawGid & FLIP_H) !== 0;
          const flipV = (rawGid & FLIP_V) !== 0;
          const flipD = (rawGid & FLIP_D) !== 0;
          const gid = rawGid & ~(FLIP_H | FLIP_V | FLIP_D);
          const ts = findTilesetForGid(gid);
          if (!ts) continue;
          const img = tiledTilesetImages.get(ts.firstgid);
          if (!img) continue;
          const columns = ts.columns || Math.max(1, Math.floor(ts.imagewidth / ts.tilewidth));
          const tileId = gid - ts.firstgid;
          const sx = ts.margin + (tileId % columns) * (ts.tilewidth + ts.spacing);
          const sy = ts.margin + Math.floor(tileId / columns) * (ts.tileheight + ts.spacing);

          const px = x * tiledMapTileWidth;
          const py = y * tiledMapTileHeight;
          const cx = px + tiledMapTileWidth / 2;
          const cy = py + tiledMapTileHeight / 2;

          ctx.save();
          ctx.translate(cx, cy);
          const scaleX = flipH ? -1 : 1;
          const scaleY = flipV ? -1 : 1;
          ctx.scale(scaleX, scaleY);
          ctx.drawImage(
            img,
            sx,
            sy,
            ts.tilewidth,
            ts.tileheight,
            -ts.tilewidth / 2,
            -ts.tileheight / 2,
            ts.tilewidth,
            ts.tileheight
          );
          ctx.restore();
        }
      }
      ctx.restore();
    }
  };

  const drawTiledTrack = (ctx) => {
    if (!tiledTrackTiles.length) return;
    for (const t of tiledTrackTiles) {
      const cx = t.x + t.w / 2;
      const cy = t.y + t.h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      if (t.rotation) ctx.rotate(degToRad(t.rotation));
      const scaleX = t.flipH ? -1 : 1;
      const scaleY = t.flipV ? -1 : 1;
      ctx.scale(scaleX, scaleY);
      ctx.drawImage(t.img, t.sx, t.sy, t.sw, t.sh, -t.w / 2, -t.h / 2, t.w, t.h);
      ctx.restore();
    }
  };

  const drawBorders = (ctx, redImg, whiteImg) => {
    if (!redImg || !whiteImg) return;
    const borderW = 22;
    const borderH = 10;
    const step = 22;
    let index = 0;
    for (let s = 0; s < trackPath.length - 1; s++) {
      const a = trackPath[s];
      const b = trackPath[s + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 1) continue;
      const angle = Math.atan2(dy, dx);
      const nx = -dy / len;
      const ny = dx / len;
      const count = Math.max(1, Math.floor(len / step));
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const px = a.x + dx * t;
        const py = a.y + dy * t;
        const offset = trackWidth / 2 + borderH * 0.6;
        const img = index % 2 === 0 ? redImg : whiteImg;
        ctx.save();
        ctx.translate(px + nx * offset, py + ny * offset);
        ctx.rotate(angle);
        ctx.drawImage(img, -borderW / 2, -borderH / 2, borderW, borderH);
        ctx.restore();
        ctx.save();
        ctx.translate(px - nx * offset, py - ny * offset);
        ctx.rotate(angle);
        ctx.drawImage(img, -borderW / 2, -borderH / 2, borderW, borderH);
        ctx.restore();
        index++;
      }
    }
  };

  const drawWalls = (ctx, wallImg) => {
    ctx.save();
    if (!wallImg || walls.length === 0) return ctx.restore();
    ctx.fillStyle = "#3b3b3b";
    for (const rect of walls) {
      ctx.drawImage(wallImg, rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();
  };

  const drawObstacles = (ctx, obsImg) => {
    ctx.save();
    if (!obstacles.length) return ctx.restore();
    if (!obsImg) return ctx.restore();
    for (const obs of obstacles) {
      const size = obs.r * 2;
      ctx.drawImage(obsImg, obs.x - size / 2, obs.y - size / 2, size, size);
    }
    ctx.restore();
  };

  const drawCar = (ctx, carImg) => {
    if (!carImg) return;
    ctx.save();
    ctx.translate(car.x, car.y);
    const carRotationOffset = Math.PI / 2;
    ctx.rotate(car.angle + carRotationOffset);
    ctx.drawImage(
      carImg,
      -carRenderSize.w / 2,
      -carRenderSize.h / 2,
      carRenderSize.w,
      carRenderSize.h
    );
    ctx.restore();
  };

  const drawAICars = (ctx) => {
    if (!aiCars.length) return;
    for (const ai of aiCars) {
      let ang = ai.angle || 0;
      const carImg = ai.image || assets.images.car;
      if (!carImg) continue;
      let px;
      let py;
      if (ai.useTrack) {
        const p = sampleTrack(ai.t);
        if (!p) continue;
        px = p.x;
        py = p.y;
        ang = p.angle;
      } else {
        const pos = getAIPosition(ai);
        if (!pos) continue;
        px = pos.x;
        py = pos.y;
      }
      if (typeof px !== "number" || typeof py !== "number") continue;
      ctx.save();
      ctx.translate(px, py);
      const carRotationOffset = Math.PI / 2;
      ctx.rotate(ang + carRotationOffset);
      ctx.globalAlpha = 0.6;
      ctx.drawImage(
        carImg,
        -carRenderSize.w / 2,
        -carRenderSize.h / 2,
        carRenderSize.w,
        carRenderSize.h
      );
      ctx.restore();
    }
  };

  const drawCheckpointArrow = (ctx, img) => {
    if (!checkpoints.length) return;
    if (!img) return;
    const cp = checkpoints[currentCheckpoint];
    const mx = (cp.x1 + cp.x2) / 2;
    const my = (cp.y1 + cp.y2) / 2;
    const angle = Math.atan2(cp.y2 - cp.y1, cp.x2 - cp.x1) + Math.PI / 2;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(angle);
    ctx.drawImage(img, -32, -32, 64, 64);
    ctx.restore();
  };

  const drawHUD = (ctx, elapsed) => {
    ctx.save();
    const hudX = 12;
    const hudY = 10;
    const hudW = 260;
    const hudLineH = 26;
    let hudLines = 2;
    if (gameState.started) {
      hudLines = gameState.selectedMode.id === "race" ? 3 : 3;
      if (checkpoints.length) hudLines += 1;
    }
    const hudH = 16 + hudLines * hudLineH;
    ctx.fillStyle = "rgba(10, 10, 12, 0.6)";
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(hudX, hudY, hudW, hudH, 12);
      ctx.fill();
    } else {
      ctx.fillRect(hudX, hudY, hudW, hudH);
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "24px sans-serif";
    if (!gameState.started) {
      ctx.fillText("Ready", 24, 36);
      ctx.fillText(`Mode: ${gameState.selectedMode.label}`, 24, 64);
      ctx.restore();
      return;
    }
    ctx.fillText(`Mode: ${gameState.selectedMode.label}`, 24, 36);
    const best = getBestTime();
    if (gameState.selectedMode.id === "time_trial") {
      ctx.fillText(`Time: ${fmtTime(elapsed)}`, 24, 64);
      ctx.fillText(`Lap: ${lap}`, 24, 92);
    } else if (gameState.selectedMode.id === "race") {
      ctx.fillText(`Lap: ${lap}`, 24, 64);
      ctx.fillText(`Opponents: ${gameState.selectedMode.mobs}`, 24, 92);
    } else {
      ctx.fillText(`Lap: ${lap}`, 24, 64);
    }
    if (best) {
      ctx.fillText(`Best Lap: ${fmtTime(best)}`, 24, 148);
    }
    if (checkpoints.length) {
      const passed = Math.max(0, Math.min(checkpoints.length, lastCheckpointIndex + 1));
      ctx.fillText(`Checkpoint: ${passed}/${checkpoints.length}`, 24, 120);
    }
    ctx.restore();
    if (countdownActive && countdownLabel) {
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.font = "72px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(countdownLabel, uiViewportWidth / 2, uiViewportHeight / 2);
      ctx.restore();
    }
  };

  const render = (elapsed) => {
    CTX.setTransform(1, 0, 0, 1, 0, 0);
    CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);
    CTX.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    if (tiledTileLayers.length) {
      drawTileLayers(CTX);
    }
    if (tiledTrackTiles.length) {
      drawTiledTrack(CTX);
    }
    drawWalls(CTX, assets.images.wall);
    drawObstacles(CTX, assets.images.obstacle);
    drawCheckpointArrow(CTX, assets.images.checkpoint);
    drawAICars(CTX);
    drawCar(CTX, assets.images.car);
    CTX.save();
    CTX.setTransform(uiScale, 0, 0, uiScale, uiOffsetX, uiOffsetY);
    drawHUD(CTX, elapsed);
    steeringStick.draw(CTX);
    CTX.save();
    const drawPedal = (p, label) => {
      CTX.globalAlpha = p.pressed ? 0.9 : 0.6;
      CTX.fillStyle = "#111";
      CTX.strokeStyle = "#e6e6e6";
      CTX.lineWidth = 3;
      if (typeof CTX.roundRect === "function") {
        CTX.beginPath();
        CTX.roundRect(p.x, p.y, p.w, p.h, 12);
        CTX.fill();
        CTX.stroke();
      } else {
        CTX.fillRect(p.x, p.y, p.w, p.h);
        CTX.strokeRect(p.x, p.y, p.w, p.h);
      }
      CTX.globalAlpha = 0.9;
      CTX.fillStyle = "#fff";
      CTX.font = "18px sans-serif";
      CTX.textAlign = "center";
      CTX.textBaseline = "middle";
      CTX.fillText(label, p.x + p.w / 2, p.y + p.h / 2);
    };
    drawPedal(pedals.brake, "BRAKE");
    drawPedal(pedals.accel, "GAS");
    CTX.restore();
    CTX.restore();
  };

  const showRaceResult = (playerWon, place, total, elapsedMs) => {
    if (!resultOverlay) return;
    if (resultTitle) resultTitle.textContent = playerWon ? "You Win!" : "You Lose";
    if (resultSub) {
      resultSub.textContent = playerWon
        ? "You finished the laps first."
        : "An opponent finished the laps first.";
    }
    if (resultPlace && place && total) {
      resultPlace.textContent = `Place: ${place}/${total}`;
    }
    if (resultTime) {
      resultTime.textContent = `Time: ${fmtTime(elapsedMs || 0)}`;
    }
    if (resultBest) {
      const best = getBestTime();
      resultBest.textContent = best ? `Best Lap: ${fmtTime(best)}` : "Best Lap: --:--";
    }
    resultOverlay.classList.remove("hidden");
  };

  const hideRaceResult = () => {
    if (!resultOverlay) return;
    resultOverlay.classList.add("hidden");
  };

  let lastTime = performance.now();

  const loop = (now) => {
    const dt = Math.min((now - lastTime) / 1000, 0.033);
    lastTime = now;
    if (countdownActive) {
      const t = now - countdownStart;
      if (t < 1000) countdownLabel = "3";
      else if (t < 2000) countdownLabel = "2";
      else if (t < 3000) countdownLabel = "1";
      else if (t < countdownDuration) countdownLabel = "GO!";
      else {
        countdownActive = false;
        countdownLabel = "";
        timerStart = now;
        lapStartTime = now;
      }
    } else {
      countdownLabel = "";
    }
    updatePhysics(dt);
    updateAutoZoom(dt);
    updateAICars(dt);
    updateCamera();
    if (gameState.started && !countdownActive) {
      if (timerStart === null) timerStart = now;
      lastElapsed = now - timerStart;
    } else {
      lastElapsed = 0;
    }
    render(lastElapsed);
    requestAnimationFrame(loop);
  };

  const assets = {
    images: {
      aiCars: [],
      carById: new Map(),
    },
  };

  const init = async () => {
    const assetImages = [
      ASSETS.car,
      ASSETS.obstacle,
      ASSETS.wall,
      ASSETS.checkpoint,
      ASSETS.ground,
      ASSETS.road,
      ASSETS.borderRed,
      ASSETS.borderWhite,
    ];
    const carImagesSources = CAR_OPTIONS.map((c) => c.path);
    const totalSteps = assetImages.length + carImagesSources.length + 1;
    let doneSteps = 0;
    const tick = (label) => {
      doneSteps += 1;
      setLoadingProgress(doneSteps / totalSteps, label);
    };

    setLoadingProgress(0, "Starting up");
    const images = await Promise.all(
      assetImages.map((src) => loadImageTracked(src, () => tick(`Loading ${src.split("/").pop()}`)))
    );
    const carImages = await Promise.all(
      carImagesSources.map((src) => loadImageTracked(src, () => tick(`Loading ${src.split("/").pop()}`)))
    );

    assets.images.car = images[0];
    assets.images.obstacle = images[1];
    assets.images.wall = images[2];
    assets.images.checkpoint = images[3];
    assets.images.ground = images[4];
    assets.images.road = images[5];
    assets.images.borderRed = images[6];
    assets.images.borderWhite = images[7];
    assets.images.carById = new Map();
    carImages.forEach((img, idx) => {
      const opt = CAR_OPTIONS[idx];
      if (img && opt) assets.images.carById.set(opt.id, img);
    });
    selectAICarImages(gameState.selectedCar.id);

    tick(`Loading ${gameState.selectedMap.file}`);
    await loadTiledMap(gameState.selectedMap.file);
    buildTrackSegments();
    resize();
    updateJoystickAnchors();
    setLoadingProgress(1, "Loaded");
    if (loadingOverlay) loadingOverlay.classList.add("hidden");
  };

  const setupMenu = () => {
    const menuOverlay = document.getElementById("menuOverlay");
    const menuMain = document.getElementById("menuMain");
    const menuSingle = document.getElementById("menuSingle");
    const btnSingle = document.getElementById("btnSingle");
    const btnBack = document.getElementById("btnBack");
    const btnStart = document.getElementById("btnStart");
    const btnRestart = document.getElementById("btnRestart");
    const btnQuit = document.getElementById("btnQuit");
    const selectCar = document.getElementById("selectCar");
    const selectLaps = document.getElementById("selectLaps");
    const selectMode = document.getElementById("selectMode");
    const selectMap = document.getElementById("selectMap");

    const showMain = () => {
      menuMain.classList.remove("hidden");
      menuSingle.classList.add("hidden");
    };
    const showSingle = () => {
      menuMain.classList.add("hidden");
      menuSingle.classList.remove("hidden");
    };

    for (const c of CAR_OPTIONS) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.label;
      selectCar.appendChild(opt);
    }
    for (let i = 1; i <= 10; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = String(i);
      selectLaps.appendChild(opt);
    }
    for (const m of MODE_OPTIONS) {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.label;
      selectMode.appendChild(opt);
    }
    for (const m of MAP_OPTIONS) {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.label;
      selectMap.appendChild(opt);
    }

    selectCar.value = gameState.selectedCar.id;
    selectMode.value = gameState.selectedMode.id;
    selectMap.value = gameState.selectedMap.id;
    selectLaps.value = String(gameState.selectedLaps);

    menuOverlay.classList.remove("hidden");
    btnSingle.addEventListener("click", showSingle);
    btnBack.addEventListener("click", showMain);

    const startRace = async (useMenuSelection) => {
      updateRotateOverlay();
      if (isPortrait()) return;
      await requestFullscreen();
      if (useMenuSelection) {
        gameState.selectedCar = CAR_OPTIONS.find((c) => c.id === selectCar.value) || CAR_OPTIONS[0];
        gameState.selectedMode = MODE_OPTIONS.find((m) => m.id === selectMode.value) || MODE_OPTIONS[0];
        gameState.selectedMap = MAP_OPTIONS.find((m) => m.id === selectMap.value) || MAP_OPTIONS[0];
        gameState.selectedLaps = Math.max(1, parseInt(selectLaps.value, 10) || 3);
      }

      const carImg = await loadImage(gameState.selectedCar.path);
      if (carImg) assets.images.car = carImg;
      if (carImg) assets.images.carById.set(gameState.selectedCar.id, carImg);
      selectAICarImages(gameState.selectedCar.id);

      await loadTiledMap(gameState.selectedMap.file);
      raceLaps = gameState.selectedLaps || mapLaps || 3;
      buildTrackSegments();
      initAICars();
      resize();
      updateJoystickAnchors();

      lap = 1;
      currentCheckpoint = 0;
      lastCheckpointIndex = -1;
      respawnToCheckpoint(-1);
      timerStart = null;
      lastElapsed = 0;
      lapStartTime = null;
      raceFinished = false;
      hideRaceResult();
      countdownActive = true;
      countdownStart = performance.now();
      countdownLabel = "3";
      car.speed = 0;
      gameState.started = true;
      menuOverlay.classList.add("hidden");
    };

    btnStart.addEventListener("click", () => startRace(true));
    btnRestart?.addEventListener("click", () => startRace(false));
    btnQuit?.addEventListener("click", () => {
      gameState.started = false;
      raceFinished = false;
      hideRaceResult();
      showMain();
      menuOverlay.classList.remove("hidden");
    });
  };

  init().then(() => {
    setupMenu();
    requestAnimationFrame(loop);
  });
})();
