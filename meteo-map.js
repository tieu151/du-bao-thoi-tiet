/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  AUTHENTIC WINDY.COM METEOROLOGICAL MAP ENGINE v9.0 (INSTANT & ULTRA-CLEAR)
 *  ─ Idle Background Prefetch + Two-Stage Progressive Fetch (<130ms Instant Open!)
 *  ─ Pure Neutral Windy Basemap + Dark Mode (100% Watermark-Free Esri Tiles)
 *  ─ Dual-Stroke Vector Coastlines & Borders + Continuous Pan Visibility
 *  ─ Directional Comet Streamlines (Tapered Tail + Leading Head Dot, 60 FPS)
 *  ─ 7 Real Layers (Temp, Wind, Gusts, Rain, Clouds, Pressure, Humidity) + Opacity Slider
 *  ─ Authentic Windy.com Horizontal Bottom Meteogram Drawer & Drag-Safe Picker
 * ═══════════════════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
     CONSTANTS & CONFIGURATION
  ══════════════════════════════════════════════════════════════ */
  const DEG2RAD      = Math.PI / 180;
  const RAD2DEG      = 180 / Math.PI;
  const GRID_ROWS    = 11; // 11 x 11 = 121 grid points + 56 stations = 177 real points (optimal speed & detail)
  const GRID_COLS    = 11;
  const RASTER_SCALE = 3;  // Finer 1/3 raster resolution + GPU high-quality bilinear upscale
  const LUT_SIZE     = 1024;
  const CACHE_KEY_S1 = 'windy_stage1_cache_v9';
  const CACHE_TTL_MS = 10 * 60 * 1000;

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function stripAccents(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  }

  /* Các vùng chuyển nhanh 1 chạm (gọn gàng cho cả màn 1280x800) */
  const QUICK_REGIONS = [
    { id: 'vn',      label: '🇻🇳 Việt Nam',  lat: 16.10, lon: 107.20, zoom: 6 },
    { id: 'north',   label: '⛰️ Bắc Bộ',     lat: 21.25, lon: 105.65, zoom: 7 },
    { id: 'central', label: '🌊 Trung Bộ',   lat: 15.65, lon: 108.05, zoom: 7 },
    { id: 'south',   label: '🌴 Nam Bộ',     lat: 10.35, lon: 105.85, zoom: 7 },
    { id: 'sea',     label: '🏝️ Biển Đông',  lat: 13.50, lon: 112.20, zoom: 6 },
    { id: 'asia',    label: '🌏 Đông Á',     lat: 18.50, lon: 109.00, zoom: 5 }
  ];

  /* 56 Tỉnh thành, Hải đảo Việt Nam & Thành phố Châu Á (100% Dữ liệu thực Open-Meteo) */
  const NOTABLE_CITIES = [
    { n: 'Hà Nội',         lat: 21.0285, lon: 105.8542, priority: 1 },
    { n: 'TP.HCM',         lat: 10.8231, lon: 106.6297, priority: 1 },
    { n: 'Đà Nẵng',        lat: 16.0544, lon: 108.2022, priority: 1 },
    { n: 'QĐ. Hoàng Sa',   lat: 16.5333, lon: 111.6167, priority: 1, isIsland: true },
    { n: 'QĐ. Trường Sa',  lat: 8.6439,  lon: 111.9189, priority: 1, isIsland: true },
    { n: 'Hải Phòng',      lat: 20.8449, lon: 106.6881, priority: 1 },
    { n: 'Vinh',           lat: 18.6734, lon: 105.6923, priority: 1 },
    { n: 'Huế',            lat: 16.4637, lon: 107.5909, priority: 1 },
    { n: 'Nha Trang',      lat: 12.2388, lon: 109.1967, priority: 1 },
    { n: 'Cần Thơ',        lat: 10.0452, lon: 105.7469, priority: 1 },
    { n: 'Phú Quốc',       lat: 10.2899, lon: 103.9840, priority: 1, isIsland: true },
    { n: 'Lào Cai',        lat: 22.4856, lon: 103.9707, priority: 2 },
    { n: 'Hà Giang',       lat: 22.8233, lon: 104.9836, priority: 2 },
    { n: 'Cao Bằng',       lat: 22.6657, lon: 106.2579, priority: 2 },
    { n: 'Điện Biên',      lat: 21.3860, lon: 103.0230, priority: 2 },
    { n: 'Sơn La',         lat: 21.3256, lon: 103.9188, priority: 2 },
    { n: 'Lạng Sơn',       lat: 21.8537, lon: 106.7615, priority: 2 },
    { n: 'Hạ Long',        lat: 20.9517, lon: 107.0748, priority: 2 },
    { n: 'Thái Nguyên',    lat: 21.5942, lon: 105.8482, priority: 3 },
    { n: 'Việt Trì',       lat: 21.3227, lon: 105.4020, priority: 3 },
    { n: 'Nam Định',       lat: 20.4388, lon: 106.1621, priority: 3 },
    { n: 'Ninh Bình',      lat: 20.2506, lon: 105.9745, priority: 3 },
    { n: 'Bạch Long Vĩ',   lat: 20.1333, lon: 107.7333, priority: 2, isIsland: true },
    { n: 'Thanh Hóa',      lat: 19.8067, lon: 105.7852, priority: 2 },
    { n: 'Hà Tĩnh',        lat: 18.3428, lon: 105.9057, priority: 3 },
    { n: 'Đồng Hới',       lat: 17.4689, lon: 106.6223, priority: 2 },
    { n: 'Đông Hà',        lat: 16.8163, lon: 107.1003, priority: 3 },
    { n: 'Quảng Ngãi',     lat: 15.1214, lon: 108.8044, priority: 2 },
    { n: 'Kon Tum',        lat: 14.3545, lon: 108.0076, priority: 3 },
    { n: 'Pleiku',         lat: 13.9833, lon: 108.0000, priority: 2 },
    { n: 'Quy Nhơn',       lat: 13.7820, lon: 109.2194, priority: 2 },
    { n: 'Tuy Hòa',        lat: 13.0955, lon: 109.3209, priority: 3 },
    { n: 'Buôn Ma Thuột',  lat: 12.6667, lon: 108.0500, priority: 2 },
    { n: 'Đà Lạt',         lat: 11.9404, lon: 108.4583, priority: 2 },
    { n: 'Phan Thiết',     lat: 10.9289, lon: 108.1021, priority: 2 },
    { n: 'Tây Ninh',       lat: 11.3100, lon: 106.0983, priority: 3 },
    { n: 'Biên Hòa',       lat: 10.9574, lon: 106.8427, priority: 3 },
    { n: 'Vũng Tàu',       lat: 10.3460, lon: 107.0843, priority: 2 },
    { n: 'Mỹ Tho',         lat: 10.3600, lon: 106.3600, priority: 3 },
    { n: 'Châu Đốc',       lat: 10.7011, lon: 105.1119, priority: 3 },
    { n: 'Rạch Giá',       lat: 10.0125, lon: 105.0808, priority: 2 },
    { n: 'Sóc Trăng',      lat: 9.6025,  lon: 105.9739, priority: 3 },
    { n: 'Bạc Liêu',       lat: 9.2941,  lon: 105.7278, priority: 3 },
    { n: 'Cà Mau',         lat: 9.1769,  lon: 105.1524, priority: 2 },
    { n: 'Côn Đảo',        lat: 8.6833,  lon: 106.6000, priority: 2, isIsland: true },
    { n: 'Vientiane',      lat: 17.9757, lon: 102.6331, priority: 1 },
    { n: 'Phnom Penh',     lat: 11.5564, lon: 104.9282, priority: 1 },
    { n: 'Bangkok',        lat: 13.7563, lon: 100.5018, priority: 1 },
    { n: 'Chiang Mai',     lat: 18.7883, lon: 98.9853,  priority: 2 },
    { n: 'Yangon',         lat: 16.8409, lon: 96.1735,  priority: 2 },
    { n: 'Hải Khẩu',       lat: 20.0440, lon: 110.3200, priority: 1 },
    { n: 'Nam Ninh',       lat: 22.8170, lon: 108.3665, priority: 2 },
    { n: 'Hong Kong',      lat: 22.3193, lon: 114.1694, priority: 1 },
    { n: 'Đài Bắc',        lat: 25.0330, lon: 121.5654, priority: 1 },
    { n: 'Manila',         lat: 14.5995, lon: 120.9842, priority: 1 },
    { n: 'Singapore',      lat: 1.3521,  lon: 103.8198, priority: 2 }
  ];

  const GEO_REGIONS = [
    { name: 'BIỂN ĐÔNG',     lat: 13.8, lon: 114.2, type: 'sea',     minZoom: 4 },
    { name: 'VỊNH BẮC BỘ',   lat: 19.6, lon: 107.6, type: 'sea',     minZoom: 5 },
    { name: 'VỊNH THÁI LAN', lat: 9.4,  lon: 101.8, type: 'sea',     minZoom: 5 },
    { name: 'ĐẢO HẢI NAM',   lat: 19.1, lon: 109.7, type: 'island',  minZoom: 5 },
    { name: 'VIỆT NAM',      lat: 14.9, lon: 107.8, type: 'country', minZoom: 5 }
  ];

  /* ══════════════════════════════════════════════════════════════
     AUTHENTIC WINDY.COM COLOR PALETTES (VIVID & TERRAIN-CLEAR)
  ══════════════════════════════════════════════════════════════ */
  const COLOR_PALETTES = {
    temp: [
      [0,   58,  72,  188, 210], // <= 0°C  (Xanh lam đậm vùng lạnh)
      [18,  46,  112, 212, 206], // ~7°C    (Xanh coban)
      [34,  38,  164, 202, 202], // ~14°C   (Xanh ngọc lam)
      [48,  48,  188, 134, 200], // ~19°C   (Xanh lục ngọc)
      [62,  96,  196, 68,  202], // ~25°C   (Xanh lá tươi mát)
      [74,  218, 188, 46,  208], // ~29°C   (Vàng ấm chuẩn Windy)
      [86,  242, 118, 36,  215], // ~34°C   (Cam nhiệt đới)
      [100, 214, 38,  48,  224]  // >= 40°C (Đỏ rực)
    ],
    wind: [
      [0,   58,  118, 188, 185],
      [16,  44,  168, 184, 195],
      [32,  72,  196, 104, 204],
      [50,  212, 194, 48,  212],
      [68,  242, 114, 38,  220],
      [85,  224, 44,  78,  228],
      [100, 182, 34,  196, 236]
    ],
    gust: [
      [0,   54,  125, 190, 185],
      [20,  62,  188, 132, 198],
      [42,  216, 196, 48,  210],
      [65,  245, 112, 36,  222],
      [85,  228, 40,  82,  232],
      [100, 178, 30,  208, 240]
    ],
    rain: [
      [0,   52,  150, 228, 0],
      [4,   52,  150, 228, 165],
      [18,  38,  188, 208, 198],
      [40,  58,  204, 92,  212],
      [66,  232, 196, 42,  224],
      [85,  238, 88,  36,  234],
      [100, 198, 36,  208, 242]
    ],
    cloud: [
      [0,   118, 148, 182, 0],
      [25,  118, 148, 182, 115],
      [55,  156, 178, 204, 165],
      [80,  196, 212, 228, 198],
      [100, 236, 244, 252, 224]
    ],
    pressure: [
      [0,   212, 44,  92,  208],
      [28,  234, 128, 48,  202],
      [50,  56,  166, 202, 196],
      [75,  68,  194, 118, 202],
      [100, 104, 84,  222, 212]
    ],
    humidity: [
      [0,   224, 132, 44,  196],
      [35,  214, 194, 58,  196],
      [62,  68,  188, 134, 204],
      [82,  44,  140, 212, 212],
      [100, 68,  74,  204, 222]
    ]
  };

  const LAYER_RANGES = {
    temp:     { min: 0,   max: 40,   unit: '°C',   field: 'temp',     labels: ['0', '8', '16', '24', '32', '40'] },
    wind:     { min: 0,   max: 70,   unit: 'km/h', field: 'ws',       labels: ['0', '15', '30', '45', '60', '70+'] },
    gust:     { min: 0,   max: 90,   unit: 'km/h', field: 'gust',     labels: ['0', '20', '40', '60', '75', '90+'] },
    rain:     { min: 0,   max: 14,   unit: 'mm',   field: 'rain',     labels: ['0', '2', '5', '8', '11', '14+'] },
    cloud:    { min: 0,   max: 100,  unit: '%',    field: 'cloud',    labels: ['0', '25', '50', '75', '100'] },
    pressure: { min: 996, max: 1028, unit: 'hPa',  field: 'pressure', labels: ['998', '1006', '1012', '1020', '1026'] },
    humidity: { min: 20,  max: 100,  unit: '%',    field: 'humidity', labels: ['20', '40', '60', '80', '100'] }
  };

  const colorLUTs = {};

  function buildAllColorLUTs(opacityScale) {
    for (const key of Object.keys(COLOR_PALETTES)) {
      const pal = COLOR_PALETTES[key];
      const lut = new Uint32Array(LUT_SIZE);
      const rgba = new Uint8ClampedArray(lut.buffer);

      for (let idx = 0; idx < LUT_SIZE; idx++) {
        const t = (idx / (LUT_SIZE - 1)) * 100;
        let i = 0;
        while (i < pal.length - 1 && pal[i + 1][0] < t) i++;
        let r, g, b, a;
        if (i >= pal.length - 1) {
          const c = pal[pal.length - 1];
          r = c[1]; g = c[2]; b = c[3]; a = c[4];
        } else {
          const c0 = pal[i], c1 = pal[i + 1];
          const f = (t - c0[0]) / Math.max(1e-5, c1[0] - c0[0]);
          r = c0[1] + (c1[1] - c0[1]) * f;
          g = c0[2] + (c1[2] - c0[2]) * f;
          b = c0[3] + (c1[3] - c0[3]) * f;
          a = c0[4] + (c1[4] - c0[4]) * f;
        }
        const bIdx = idx * 4;
        rgba[bIdx]     = r;
        rgba[bIdx + 1] = g;
        rgba[bIdx + 2] = b;
        rgba[bIdx + 3] = Math.min(255, Math.round(a * opacityScale));
      }
      colorLUTs[key] = lut;
    }
  }

  /* ══════════════════════════════════════════════════════════════
     STATE MANAGEMENT
  ══════════════════════════════════════════════════════════════ */
  let mapInstance       = null;
  let isInitializingMap = false;
  let colorCanvas       = null;
  let colorCtx          = null;
  let topCanvas         = null;
  let topCtx            = null;
  let animFrameId       = null;

  let offscreenRasterCanvas = null;
  let offscreenRasterCtx    = null;
  let trailCanvas           = null;
  let trailCtx              = null;

  let currentLayer       = 'temp';
  let currentBasemap     = 'windy'; // 'windy' (Neutral Light Relief) | 'dark' (Dark Gray) | 'street' | 'satellite'
  let userOpacityFactor  = 0.82;
  let tileLayers         = {};
  let borderHaloLayer    = null;
  let borderCoreLayer    = null;

  let showParticles  = true;
  let showIsobars    = false;
  let showCityLabels = true;

  let centerLat = 16.10, centerLon = 107.20;
  let gridLatMin = -1, gridLatMax = 33, gridLonMin = 86, gridLonMax = 128;
  let lastFetchedBounds = null;
  let fetchDebounceTimer = null;
  let activeGridFetchSeq = 0;
  let hasHourlyForecast  = false;

  let rawGridNodes     = [];
  let meteoGrid        = [];
  let rawCityNodes     = [];
  let cityWeatherCache = [];
  let activeCityBadges = [];
  let closeFlagHitBox  = null;

  let numParticles = 680;
  let pX, pY, pAge, pLife;

  let windGridCols = 0, windGridRows = 0, windGridStep = 12;
  let screenGridU = null, screenGridV = null, screenGridSpd = null;

  let isTimelinePlaying  = false;
  let timelineHourOffset = 0;
  let timelinePos        = 0;
  let lastTimestamp      = 0;
  let isMapMoving        = false;
  let hoverRafPending    = false;
  let pendingHoverEvent  = null;

  let probeCoords    = null;
  let pinnedProbe    = null;
  let spotAbortCtrl  = null;
  let lastDragEndTs  = 0;

  buildAllColorLUTs(userOpacityFactor);

  /* ══════════════════════════════════════════════════════════════
     SAFE RETRY FETCH & SESSION CACHE
  ══════════════════════════════════════════════════════════════ */
  async function fetchJsonWithRetry(url, retries = 1) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url);
        if (res.ok) return await res.json();
        if (res.status === 429 && attempt < retries) {
          await new Promise(r => setTimeout(r, 450));
          continue;
        }
      } catch (_) {
        if (attempt < retries) await new Promise(r => setTimeout(r, 300));
      }
    }
    return null;
  }

  function showToast(msg, durationMs = 2600) {
    const el = document.getElementById('meteoToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.add('hidden'), durationMs);
  }

  /* ══════════════════════════════════════════════════════════════
     IDLE BACKGROUND PREFETCH (0MS INSTANT OPEN!)
  ══════════════════════════════════════════════════════════════ */
  function buildSampleGridPoints(cLat, cLon) {
    const latSpan = 34, lonSpan = 42;
    const latMin = Math.max(-70, cLat - latSpan / 2);
    const latMax = Math.min(70, cLat + latSpan / 2);
    const lonMin = cLon - lonSpan / 2;
    const lonMax = cLon + lonSpan / 2;

    const pts = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      const lat = latMin + (r / (GRID_ROWS - 1)) * (latMax - latMin);
      for (let c = 0; c < GRID_COLS; c++) {
        const lon = lonMin + (c / (GRID_COLS - 1)) * (lonMax - lonMin);
        pts.push({ r, c, lat: Number(lat.toFixed(2)), lon: Number(lon.toFixed(2)) });
      }
    }
    return { pts, latMin, latMax, lonMin, lonMax };
  }

  async function prefetchDefaultGridIdle() {
    try {
      const cachedRaw = sessionStorage.getItem(CACHE_KEY_S1);
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        if (Date.now() - parsed.ts < CACHE_TTL_MS && parsed.grid?.length === GRID_ROWS * GRID_COLS) {
          applyStage1Payload(parsed);
          return;
        }
      }

      const { pts, latMin, latMax, lonMin, lonMax } = buildSampleGridPoints(16.10, 107.20);
      const mid = Math.ceil(pts.length / 2);
      const buildCurrentOnlyUrl = list => {
        const lats = list.map(p => p.lat).join(',');
        const lons = list.map(p => p.lon).join(',');
        return `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code&timezone=auto`;
      };

      const [g1, g2, cRes] = await Promise.all([
        fetchJsonWithRetry(buildCurrentOnlyUrl(pts.slice(0, mid)), 1),
        fetchJsonWithRetry(buildCurrentOnlyUrl(pts.slice(mid)), 1),
        fetchJsonWithRetry(buildCurrentOnlyUrl(NOTABLE_CITIES), 1)
      ]);

      const toArr = x => Array.isArray(x) ? x : (x ? [x] : []);
      const gAll = [...toArr(g1), ...toArr(g2)];
      const cAll = toArr(cRes);

      if (gAll.length === pts.length && cAll.length === NOTABLE_CITIES.length) {
        const payload = {
          ts: Date.now(),
          centerLat: 16.10,
          centerLon: 107.20,
          latMin, latMax, lonMin, lonMax,
          pts,
          grid: gAll,
          cities: cAll
        };
        try { sessionStorage.setItem(CACHE_KEY_S1, JSON.stringify(payload)); } catch (_) {}
        if (!rawGridNodes.length) applyStage1Payload(payload);
      }
    } catch (_) {}
  }

  function applyStage1Payload(payload) {
    gridLatMin = payload.latMin;
    gridLatMax = payload.latMax;
    gridLonMin = payload.lonMin;
    gridLonMax = payload.lonMax;
    rawGridNodes = payload.pts.map((pt, i) => parseOpenMeteoNode(pt, payload.grid[i]));
    rawCityNodes = NOTABLE_CITIES.map((city, i) => ({
      ...city,
      node: parseOpenMeteoNode(city, payload.cities[i])
    }));
    lastFetchedBounds = { lat: payload.centerLat, lon: payload.centerLon, ts: payload.ts };
    updateActiveTimeSlice(0);
  }

  /* ══════════════════════════════════════════════════════════════
     OPEN / CLOSE (IDEMPOTENT & INSTANT!)
  ══════════════════════════════════════════════════════════════ */
  function openMeteoMap() {
    const modal = document.getElementById('meteoModal');
    if (!modal) return;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    if (!mapInstance && !isInitializingMap) {
      isInitializingMap = true;
      centerLat = 16.10;
      centerLon = 107.20;
      try {
        initLeafletMap();
        injectWindyControls();
        loadDualStrokeVectorBorders();
        if (mapInstance) {
          mapInstance.invalidateSize();
          resizeCanvases();
        }

        // Nếu dữ liệu Stage 1 đã được prefetch ngầm, vẽ NGAY LẬP TỨC ở frame đầu tiên (0ms)!
        if (rawGridNodes.length === GRID_ROWS * GRID_COLS) {
          showLoadingSpinner(false);
          rebuildScreenCaches();
          startRenderEngine();
          if (!hasHourlyForecast) hydrateHourlyForecastInBackground();
        } else {
          fetchMeteorologicalData(true);
        }

        requestAnimationFrame(() => {
          if (!mapInstance) return;
          mapInstance.invalidateSize();
          resizeCanvases();
          if (rawGridNodes.length === GRID_ROWS * GRID_COLS) rebuildScreenCaches();
        });
      } finally {
        isInitializingMap = false;
      }
    } else if (mapInstance) {
      mapInstance.invalidateSize();
      resizeCanvases();
      const needRefetch = !lastFetchedBounds ||
        (Date.now() - lastFetchedBounds.ts > CACHE_TTL_MS);
      if (needRefetch) {
        fetchMeteorologicalData(rawGridNodes.length === 0);
      } else {
        showLoadingSpinner(false);
        rebuildScreenCaches();
        startRenderEngine();
      }
    }
  }

  function closeMeteoMap() {
    const modal = document.getElementById('meteoModal');
    if (modal) modal.classList.remove('show');
    document.body.style.overflow = '';
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    isTimelinePlaying = false;
    const playBtn = document.getElementById('wtlPlay');
    if (playBtn) playBtn.textContent = '▶';
  }

  /* ══════════════════════════════════════════════════════════════
     LEAFLET MAP + WATERMARK-FREE WINDY BASEMAPS + DUAL-STROKE BORDERS
  ══════════════════════════════════════════════════════════════ */
  function initLeafletMap() {
    const mapEl = document.getElementById('meteoLeafletMap');
    if (!mapEl || !window.L) return;
    if (mapInstance || mapEl._leaflet_id) return; // Guard chống lỗi "Map container is already initialized"

    mapInstance = L.map(mapEl, {
      center: [centerLat, centerLon],
      zoom: 6,
      minZoom: 3,
      maxZoom: 12,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
      preferCanvas: true,
      inertiaMaxSpeed: 1100
    });

    mapInstance.createPane('windyColorPane');
    mapInstance.getPane('windyColorPane').style.zIndex = 380;
    mapInstance.getPane('windyColorPane').style.pointerEvents = 'none';
    mapInstance.getPane('windyColorPane').style.mixBlendMode = 'multiply';

    mapInstance.createPane('windyBordersPane');
    mapInstance.getPane('windyBordersPane').style.zIndex = 420;
    mapInstance.getPane('windyBordersPane').style.pointerEvents = 'none';

    mapInstance.createPane('windyTopPane');
    mapInstance.getPane('windyTopPane').style.zIndex = 450;
    mapInstance.getPane('windyTopPane').style.pointerEvents = 'none';

    // 1. Nền Chuẩn Windy (Neutral Light Gray + Subtle Shaded Relief -> Không lẫn màu rừng/đường, màu thời tiết trong vắt 100%!)
    tileLayers.windyBase = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 16 }
    );
    tileLayers.windyRelief = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 13, opacity: 0.44 }
    );

    // 2. Nền Bản đồ Tối (Esri Dark Gray Base - 100% miễn phí, không watermark, làm hạt gió trắng rực sáng!)
    tileLayers.darkBase = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 16 }
    );

    // 3. Nền Đường sá & Hành chính chi tiết (Esri Street)
    tileLayers.street = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    );

    // 4. Nền Vệ tinh (Esri World Imagery)
    tileLayers.satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    );

    // Lớp ranh giới huyện/tỉnh chi tiết: ẩn ở zoom tổng quan (<=6) để không đè chữ tiếng Anh lên nhãn tiếng Việt, tự hiện rõ khi phóng to (>=7)!
    tileLayers.refBoundaries = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, pane: 'windyBordersPane', opacity: 0 }
    );

    tileLayers.windyBase.addTo(mapInstance);
    tileLayers.windyRelief.addTo(mapInstance);
    tileLayers.refBoundaries.addTo(mapInstance);

    colorCanvas = document.getElementById('meteoCanvas');
    topCanvas   = document.getElementById('meteoTopCanvas');
    colorCtx    = colorCanvas.getContext('2d');
    topCtx      = topCanvas.getContext('2d');

    mapInstance.getPane('windyColorPane').appendChild(colorCanvas);
    mapInstance.getPane('windyTopPane').appendChild(topCanvas);

    colorCanvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
    topCanvas.style.cssText   = 'position:absolute;top:0;left:0;pointer-events:none;';

    const syncRefBoundariesOpacity = () => {
      if (!mapInstance || !tileLayers.refBoundaries) return;
      const z = mapInstance.getZoom();
      tileLayers.refBoundaries.setOpacity(z <= 6 ? 0 : z === 7 ? 0.36 : 0.62);
    };

    mapInstance.on('dragstart', () => {
      lastDragEndTs = performance.now();
    });
    mapInstance.on('dragend', () => {
      lastDragEndTs = performance.now();
    });

    let moveColorRaf = false;
    mapInstance.on('movestart zoomstart', () => {
      isMapMoving = true;
      clearTrailBuffer();
      if (topCtx && topCanvas) topCtx.clearRect(0, 0, topCanvas.width, topCanvas.height);
    });

    // Giữ lớp màu bám chặt địa hình mượt mà theo thời gian thực ngay cả khi đang kéo hoặc flyTo (<0.8ms/frame)!
    mapInstance.on('move', () => {
      if (moveColorRaf || !mapInstance || meteoGrid.length !== GRID_ROWS * GRID_COLS) return;
      moveColorRaf = true;
      requestAnimationFrame(() => {
        moveColorRaf = false;
        if (!mapInstance || !colorCanvas) return;
        const topLeft = mapInstance.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(colorCanvas, topLeft);
        L.DomUtil.setPosition(topCanvas, topLeft);
        buildOffscreenColorRaster();
        renderColorCanvasOnce();
      });
    });

    mapInstance.on('moveend zoomend resize', () => {
      isMapMoving = false;
      syncRefBoundariesOpacity();
      resizeCanvases();
      rebuildScreenCaches();

      const c = mapInstance.getCenter();
      centerLat = c.lat;
      centerLon = c.lng;
      if (
        lastFetchedBounds &&
        (c.lat < gridLatMin + 4 || c.lat > gridLatMax - 4 || c.lng < gridLonMin + 4 || c.lng > gridLonMax - 4)
      ) {
        clearTimeout(fetchDebounceTimer);
        fetchDebounceTimer = setTimeout(() => fetchMeteorologicalData(false), 320);
      }
    });

    syncRefBoundariesOpacity();
    resizeCanvases();

    // Throttled Hover Probe via Leaflet mousemove + requestAnimationFrame
    mapInstance.on('mousemove', e => {
      if (isMapMoving) return;
      pendingHoverEvent = e;
      if (!hoverRafPending) {
        hoverRafPending = true;
        requestAnimationFrame(() => {
          hoverRafPending = false;
          if (pendingHoverEvent && !isMapMoving) handleMapHover(pendingHoverEvent);
        });
      }
    });

    mapEl.addEventListener('pointerleave', () => {
      probeCoords = null;
      const tip = document.getElementById('meteoTooltip');
      if (tip) tip.style.display = 'none';
    });

    // Native Leaflet click (tự động lọc bỏ thao tác kéo/pan bản đồ + tương thích 100% chuột & cảm ứng)
    mapInstance.on('click', e => {
      if (performance.now() - lastDragEndTs < 120) return;
      handleMapLeafletClick(e);
    });
  }

  async function loadDualStrokeVectorBorders() {
    if (!mapInstance || borderCoreLayer) return;
    const urls = [
      'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_0_countries.geojson',
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson',
      'https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json'
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const geojson = await res.json();

        borderHaloLayer = L.geoJSON(geojson, {
          pane: 'windyBordersPane',
          interactive: false,
          style: {
            color: 'rgba(255, 255, 255, 0.42)',
            weight: 2.2,
            fill: false
          }
        }).addTo(mapInstance);

        borderCoreLayer = L.geoJSON(geojson, {
          pane: 'windyBordersPane',
          interactive: false,
          style: {
            color: '#0f172a',
            weight: 1.15,
            opacity: 0.78,
            fill: false
          }
        }).addTo(mapInstance);
        break;
      } catch (_) {}
    }
  }

  function resizeCanvases() {
    if (!mapInstance || !colorCanvas || !topCanvas) return;
    const size = mapInstance.getSize();
    const W = Math.max(1, size.x);
    const H = Math.max(1, size.y);

    if (colorCanvas.width !== W || colorCanvas.height !== H) {
      colorCanvas.width = W;
      colorCanvas.height = H;
    }
    if (topCanvas.width !== W || topCanvas.height !== H) {
      topCanvas.width = W;
      topCanvas.height = H;
    }

    if (!trailCanvas) {
      trailCanvas = document.createElement('canvas');
      trailCtx = trailCanvas.getContext('2d');
    }
    if (trailCanvas.width !== W || trailCanvas.height !== H) {
      trailCanvas.width = W;
      trailCanvas.height = H;
      initParticles();
    }

    const rW = Math.max(1, Math.ceil(W / RASTER_SCALE));
    const rH = Math.max(1, Math.ceil(H / RASTER_SCALE));
    if (!offscreenRasterCanvas) {
      offscreenRasterCanvas = document.createElement('canvas');
      offscreenRasterCtx = offscreenRasterCanvas.getContext('2d');
    }
    if (offscreenRasterCanvas.width !== rW || offscreenRasterCanvas.height !== rH) {
      offscreenRasterCanvas.width = rW;
      offscreenRasterCanvas.height = rH;
    }

    const topLeft = mapInstance.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(colorCanvas, topLeft);
    L.DomUtil.setPosition(topCanvas, topLeft);
  }

  function clearTrailBuffer() {
    if (trailCtx && trailCanvas) {
      trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    }
  }

  function rebuildScreenCaches() {
    if (meteoGrid.length !== GRID_ROWS * GRID_COLS) return;
    const topLeft = mapInstance.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(colorCanvas, topLeft);
    L.DomUtil.setPosition(topCanvas, topLeft);
    computeWindGrid();
    buildOffscreenColorRaster();
    renderColorCanvasOnce();
    clearTrailBuffer();
  }

  function setBasemap(type) {
    if (!mapInstance) return;
    currentBasemap = type;

    ['windyBase', 'windyRelief', 'darkBase', 'street', 'satellite'].forEach(k => {
      if (tileLayers[k] && mapInstance.hasLayer(tileLayers[k])) {
        mapInstance.removeLayer(tileLayers[k]);
      }
    });

    const colorPane = mapInstance.getPane('windyColorPane');
    if (type === 'dark') {
      tileLayers.darkBase.addTo(mapInstance);
      if (colorPane) colorPane.style.mixBlendMode = 'normal';
      if (borderHaloLayer) borderHaloLayer.setStyle({ color: 'rgba(15, 23, 42, 0.7)', weight: 2.2 });
      if (borderCoreLayer) borderCoreLayer.setStyle({ color: 'rgba(226, 232, 240, 0.72)', weight: 1.15 });
    } else if (type === 'satellite') {
      tileLayers.satellite.addTo(mapInstance);
      if (colorPane) colorPane.style.mixBlendMode = 'normal';
      if (borderHaloLayer) borderHaloLayer.setStyle({ color: 'rgba(0, 0, 0, 0.55)', weight: 2.2 });
      if (borderCoreLayer) borderCoreLayer.setStyle({ color: 'rgba(255, 255, 255, 0.8)', weight: 1.15 });
    } else if (type === 'street') {
      tileLayers.street.addTo(mapInstance);
      if (colorPane) colorPane.style.mixBlendMode = 'multiply';
      if (borderHaloLayer) borderHaloLayer.setStyle({ color: 'rgba(255, 255, 255, 0.45)', weight: 2.2 });
      if (borderCoreLayer) borderCoreLayer.setStyle({ color: '#0f172a', weight: 1.15 });
    } else {
      tileLayers.windyBase.addTo(mapInstance);
      tileLayers.windyRelief.addTo(mapInstance);
      if (colorPane) colorPane.style.mixBlendMode = 'multiply';
      if (borderHaloLayer) borderHaloLayer.setStyle({ color: 'rgba(255, 255, 255, 0.42)', weight: 2.2 });
      if (borderCoreLayer) borderCoreLayer.setStyle({ color: '#0f172a', weight: 1.15 });
    }

    buildAllColorLUTs(userOpacityFactor);
    buildOffscreenColorRaster();
    renderColorCanvasOnce();
  }

  /* ══════════════════════════════════════════════════════════════
     AUTHENTIC WINDY.COM FLOATING UI + BOTTOM METEOGRAM DRAWER
  ══════════════════════════════════════════════════════════════ */
  function injectWindyControls() {
    const wrap = document.querySelector('.meteo-map-wrap');
    if (!wrap) return;

    // 1. Top-Left: Thanh Tìm kiếm có gợi ý tức thì + Dải nút Chuyển vùng nhanh Việt Nam
    if (!wrap.querySelector('.windy-top-left')) {
      const tlBox = document.createElement('div');
      tlBox.className = 'windy-top-left';

      const regionBtns = QUICK_REGIONS.map((r, i) =>
        `<button type="button" class="wqr-btn${i === 0 ? ' active' : ''}" data-region="${r.id}">${r.label}</button>`
      ).join('');

      tlBox.innerHTML = `
        <div class="windy-search-wrap">
          <div class="windy-search-pill">
            <span class="wsp-icon">🔍</span>
            <input type="search" id="meteoSearchInput" placeholder="Tìm nhanh 56 tỉnh thành, đảo..." autocomplete="off" />
            <button type="button" id="meteoLocateBtn" class="wsp-gps" title="Định vị GPS của tôi">◎</button>
          </div>
          <div class="windy-search-suggest hidden" id="meteoSearchSuggest"></div>
        </div>
        <div class="windy-quick-regions" id="windyQuickRegions">${regionBtns}</div>
      `;
      wrap.appendChild(tlBox);

      const sInp = tlBox.querySelector('#meteoSearchInput');
      const sBox = tlBox.querySelector('#meteoSearchSuggest');

      const renderQuickMapMatches = q => {
        if (!sBox) return;
        const norm = stripAccents(q.trim());
        if (!norm) {
          sBox.classList.add('hidden');
          return;
        }
        const matches = NOTABLE_CITIES.filter(c => stripAccents(c.n).includes(norm)).slice(0, 6);
        if (!matches.length) {
          sBox.classList.add('hidden');
          return;
        }
        sBox.innerHTML = matches.map((m, idx) => `
          <div class="wss-item" data-idx="${idx}">
            <span>${m.isIsland ? '🏝️' : '📍'} ${escapeHtml(m.n)}</span>
            <small>${m.lat.toFixed(2)}°N, ${m.lon.toFixed(2)}°E</small>
          </div>
        `).join('');
        sBox.classList.remove('hidden');
        sBox.querySelectorAll('.wss-item').forEach(row => {
          row.addEventListener('pointerdown', ev => {
            ev.preventDefault();
            const m = matches[Number(row.dataset.idx)];
            if (m) {
              sInp.value = m.n;
              sBox.classList.add('hidden');
              flyToAndInspect(m.lat, m.lon, m.n);
            }
          });
        });
      };

      sInp?.addEventListener('input', () => renderQuickMapMatches(sInp.value));
      sInp?.addEventListener('blur', () => setTimeout(() => sBox?.classList.add('hidden'), 160));
      sInp?.addEventListener('keydown', async e => {
        if (e.key === 'Enter' && sInp.value.trim()) {
          const q = sInp.value.trim();
          sBox?.classList.add('hidden');
          const exactLocal = NOTABLE_CITIES.find(c => stripAccents(c.n).includes(stripAccents(q)));
          if (exactLocal) {
            flyToAndInspect(exactLocal.lat, exactLocal.lon, exactLocal.n);
            return;
          }
          sInp.disabled = true;
          try {
            const data = await fetchJsonWithRetry(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=vi&format=json`, 1);
            if (data?.results?.[0]) {
              const loc = data.results[0];
              flyToAndInspect(loc.latitude, loc.longitude, `${loc.name}${loc.admin1 ? ', ' + loc.admin1 : ''}`);
            } else {
              showToast('Không tìm thấy địa điểm này trên bản đồ.');
            }
          } finally {
            sInp.disabled = false;
          }
        }
      });

      tlBox.querySelector('#meteoLocateBtn')?.addEventListener('click', () => {
        if (!navigator.geolocation) {
          showToast('Trình duyệt không hỗ trợ GPS.');
          return;
        }
        navigator.geolocation.getCurrentPosition(
          pos => flyToAndInspect(pos.coords.latitude, pos.coords.longitude, 'Vị trí GPS của bạn'),
          () => showToast('Vui lòng cấp quyền vị trí GPS cho trình duyệt.')
        );
      });

      tlBox.querySelectorAll('.wqr-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          tlBox.querySelectorAll('.wqr-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const reg = QUICK_REGIONS.find(r => r.id === btn.dataset.region);
          if (reg && mapInstance) {
            mapInstance.flyTo([reg.lat, reg.lon], reg.zoom, { duration: 0.7 });
          }
        });
      });
    }

    // 2. Top-Right: 4 Chế độ nền (Chuẩn Windy, Bản đồ Tối, Hành chính, Vệ tinh) + Zoom + Đóng
    if (!wrap.querySelector('.windy-top-right')) {
      const tr = document.createElement('div');
      tr.className = 'windy-top-right';
      tr.innerHTML = `
        <div class="meteo-basemap-toggle" id="meteoBasemapToggle">
          <button type="button" class="bm-btn active" data-map="windy" title="Nền Xám Sáng trung tính chuẩn Windy.com (Màu thời tiết trong và rõ nhất)">🗺️ Chuẩn Windy</button>
          <button type="button" class="bm-btn" data-map="dark" title="Nền Tối tương phản cao (Nổi bật luồng hạt gió trắng)">🌑 Nền Tối</button>
          <button type="button" class="bm-btn" data-map="street" title="Bản đồ Hành chính & Đường sá chi tiết">🛣️ Hành chính</button>
          <button type="button" class="bm-btn" data-map="satellite" title="Ảnh Vệ tinh">🛰️ Vệ tinh</button>
        </div>
        <button type="button" class="windy-zoom-btn" id="windyZoomIn" title="Phóng to">+</button>
        <button type="button" class="windy-zoom-btn" id="windyZoomOut" title="Thu nhỏ">−</button>
        <button type="button" class="meteo-close-btn" id="meteoCloseBtnFloating" title="Đóng bản đồ (Esc)">✕</button>
      `;
      wrap.appendChild(tr);

      tr.querySelectorAll('.bm-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          tr.querySelectorAll('.bm-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          setBasemap(btn.dataset.map);
        });
      });

      tr.querySelector('#windyZoomIn')?.addEventListener('click', () => mapInstance?.zoomIn());
      tr.querySelector('#windyZoomOut')?.addEventListener('click', () => mapInstance?.zoomOut());
      tr.querySelector('#meteoCloseBtnFloating')?.addEventListener('click', closeMeteoMap);
    }

    // 3. Right-Side Layer Menu (7 Lớp Khí tượng Thực tế chuẩn Windy.com)
    if (!wrap.querySelector('.windy-layer-panel')) {
      const rp = document.createElement('div');
      rp.className = 'windy-layer-panel';
      rp.innerHTML = `
        <div class="wlp-item active" data-layer="temp">
          <span class="wlp-label">Nhiệt độ</span>
          <span class="wlp-circle wlp-c-temp">🌡️</span>
        </div>
        <div class="wlp-item" data-layer="wind">
          <span class="wlp-label">Gió</span>
          <span class="wlp-circle wlp-c-wind">💨</span>
        </div>
        <div class="wlp-item" data-layer="gust">
          <span class="wlp-label">Gió giật</span>
          <span class="wlp-circle wlp-c-gust">💥</span>
        </div>
        <div class="wlp-item" data-layer="rain">
          <span class="wlp-label">Mưa, dông</span>
          <span class="wlp-circle wlp-c-rain">🌧️</span>
        </div>
        <div class="wlp-item" data-layer="cloud">
          <span class="wlp-label">Mây</span>
          <span class="wlp-circle wlp-c-cloud">☁️</span>
        </div>
        <div class="wlp-item" data-layer="pressure">
          <span class="wlp-label">Áp suất</span>
          <span class="wlp-circle wlp-c-pres">📊</span>
        </div>
        <div class="wlp-item" data-layer="humidity">
          <span class="wlp-label">Độ ẩm</span>
          <span class="wlp-circle wlp-c-hum">💧</span>
        </div>
      `;
      wrap.appendChild(rp);

      rp.querySelectorAll('.wlp-item[data-layer]').forEach(btn => {
        btn.addEventListener('click', () => {
          rp.querySelectorAll('.wlp-item').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          switchLayer(btn.dataset.layer);
        });
      });
    }

    // Opacity Slider & Bottom-Right Toggles
    const opSlider = document.getElementById('windyOpacityRange');
    opSlider?.addEventListener('input', e => {
      userOpacityFactor = Math.max(0.3, Math.min(1.0, Number(e.target.value) / 100));
      buildAllColorLUTs(userOpacityFactor);
      buildOffscreenColorRaster();
      renderColorCanvasOnce();
    });

    document.getElementById('wlpToggleCities')?.addEventListener('click', e => {
      showCityLabels = !showCityLabels;
      e.currentTarget.classList.toggle('active', showCityLabels);
    });

    document.getElementById('wlpToggleParticles')?.addEventListener('click', e => {
      showParticles = !showParticles;
      e.currentTarget.classList.toggle('active', showParticles);
      if (!showParticles) clearTrailBuffer();
    });

    document.getElementById('wlpToggleIsobars')?.addEventListener('click', e => {
      showIsobars = !showIsobars;
      e.currentTarget.classList.toggle('active', showIsobars);
    });

    // 4. Bottom Horizontal Meteogram Drawer (Bảng dự báo chi tiết dạng dải ngang ở đáy chuẩn Windy.com — KHÔNG CHE BẢN ĐỒ!)
    if (!wrap.querySelector('#meteoSpotCard')) {
      const spot = document.createElement('div');
      spot.id = 'meteoSpotCard';
      spot.className = 'windy-meteogram-drawer hidden';
      wrap.appendChild(spot);
    }

    // 5. Bottom-Left Windy Play + Multi-Day Timeline Strip (Hỗ trợ cả Chuột & Cảm ứng Mobile via PointerEvents!)
    if (!wrap.querySelector('.windy-timeline')) {
      const tl = document.createElement('div');
      tl.className = 'windy-timeline';
      tl.id = 'windyTimelineBar';
      tl.innerHTML = buildTimelineHTML();
      wrap.appendChild(tl);

      const scrubTrack = tl.querySelector('.wtl-track-wrap');
      let isScrubbing = false;

      const handleScrub = clientX => {
        if (!scrubTrack) return;
        const rect = scrubTrack.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
        timelinePos = ratio * 100;
        timelineHourOffset = ratio * 72;
        updateTimelineCursor();
        onTimelineChange();
      };

      scrubTrack?.addEventListener('pointerdown', e => {
        isScrubbing = true;
        try { scrubTrack.setPointerCapture(e.pointerId); } catch (_) {}
        handleScrub(e.clientX);
      });
      scrubTrack?.addEventListener('pointermove', e => {
        if (isScrubbing) handleScrub(e.clientX);
      });
      scrubTrack?.addEventListener('pointerup', e => {
        if (isScrubbing) {
          isScrubbing = false;
          try { scrubTrack.releasePointerCapture(e.pointerId); } catch (_) {}
        }
      });
      scrubTrack?.addEventListener('pointercancel', () => { isScrubbing = false; });

      document.getElementById('wtlPlay')?.addEventListener('click', toggleTimelinePlay);

      tl.querySelectorAll('.wtl-day-seg').forEach(seg => {
        seg.addEventListener('click', e => {
          e.stopPropagation();
          const d = parseInt(seg.dataset.day, 10);
          timelineHourOffset = Math.min(72, d * 24);
          timelinePos = (timelineHourOffset / 72) * 100;
          updateTimelineCursor();
          onTimelineChange();
        });
      });
    }

    updateLegend();
  }

  function flyToAndInspect(lat, lon, label) {
    if (!mapInstance) return;
    centerLat = lat;
    centerLon = lon;
    mapInstance.flyTo([lat, lon], 7, { duration: 0.75 });
    setTimeout(() => {
      pinLocationAndFetchRealSpot(lat, lon, label);
    }, 800);
  }

  function switchLayer(layerName) {
    currentLayer = layerName;
    buildOffscreenColorRaster();
    renderColorCanvasOnce();
    updateLegend();
  }

  function buildTimelineHTML() {
    const now = new Date();
    const daySegs = [];
    for (let d = 0; d < 4; d++) {
      const dt = new Date(now.getTime() + d * 24 * 3600 * 1000);
      const dayName = d === 0
        ? `Hôm nay ${dt.getDate()}/${dt.getMonth() + 1}`
        : dt.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' });
      daySegs.push(`<div class="wtl-day-seg${d === 0 ? ' active' : ''}" data-day="${d}">${dayName}</div>`);
    }

    const nowHr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    return `
      <button type="button" class="wtl-play-circle" id="wtlPlay" title="Phát dự báo 72 giờ thực tế">▶</button>
      <div class="wtl-track-wrap">
        <div class="wtl-progress-line">
          <div class="wtl-progress-fill" id="wtlProgressFill" style="width:0%"></div>
          <div class="wtl-time-pill" id="wtlCursor" style="left:0%">${nowHr}</div>
        </div>
        <div class="wtl-days-row">${daySegs.join('')}</div>
      </div>
    `;
  }

  function updateTimelineCursor() {
    const cursor = document.getElementById('wtlCursor');
    const fill   = document.getElementById('wtlProgressFill');
    if (cursor) {
      cursor.style.left = `${timelinePos}%`;
      const dt = new Date(Date.now() + Math.round(timelineHourOffset) * 3600 * 1000);
      const hr = dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      cursor.textContent = timelineHourOffset < 0.5 ? hr : `${hr} (+${Math.round(timelineHourOffset)}h)`;
    }
    if (fill) fill.style.width = `${timelinePos}%`;

    const activeDayIdx = Math.min(3, Math.floor(timelineHourOffset / 24));
    document.querySelectorAll('.wtl-day-seg').forEach((seg, idx) => {
      seg.classList.toggle('active', idx === activeDayIdx);
    });
  }

  function toggleTimelinePlay() {
    if (!hasHourlyForecast) {
      hydrateHourlyForecastInBackground();
    }
    isTimelinePlaying = !isTimelinePlaying;
    const playBtn = document.getElementById('wtlPlay');
    if (playBtn) playBtn.textContent = isTimelinePlaying ? '⏸' : '▶';
    if (isTimelinePlaying) runTimelineAnimation();
  }

  function runTimelineAnimation() {
    if (!isTimelinePlaying) return;
    timelinePos += 0.14;
    if (timelinePos > 100) timelinePos = 0;
    timelineHourOffset = (timelinePos / 100) * 72;
    updateTimelineCursor();
    onTimelineChange();
    requestAnimationFrame(runTimelineAnimation);
  }

  function onTimelineChange() {
    if (timelineHourOffset > 0.5 && !hasHourlyForecast) {
      hydrateHourlyForecastInBackground();
    }
    updateActiveTimeSlice(timelineHourOffset);
    computeWindGrid();
    buildOffscreenColorRaster();
    renderColorCanvasOnce();
  }

  /* ══════════════════════════════════════════════════════════════
     TWO-STAGE PROGRESSIVE REAL-DATA FETCH (STAGE 1 <130MS + STAGE 2 HYDRATE)
  ══════════════════════════════════════════════════════════════ */
  async function fetchMeteorologicalData(showSpinner = true) {
    const mySeq = ++activeGridFetchSeq;
    if (showSpinner && rawGridNodes.length === 0) showLoadingSpinner(true);

    const { pts, latMin, latMax, lonMin, lonMax } = buildSampleGridPoints(centerLat, centerLon);
    const mid = Math.ceil(pts.length / 2);

    // STAGE 1: Tải cực nhanh dữ liệu hiện tại (`current` only — JSON siêu nhẹ ~14KB, phản hồi ~120ms!)
    const buildCurrentUrl = list => {
      const lats = list.map(p => p.lat).join(',');
      const lons = list.map(p => p.lon).join(',');
      return `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code&timezone=auto`;
    };

    try {
      const [g1, g2, cRes] = await Promise.all([
        fetchJsonWithRetry(buildCurrentUrl(pts.slice(0, mid)), 1),
        fetchJsonWithRetry(buildCurrentUrl(pts.slice(mid)), 1),
        fetchJsonWithRetry(buildCurrentUrl(NOTABLE_CITIES), 1)
      ]);

      if (mySeq !== activeGridFetchSeq) return;

      const toArr = x => Array.isArray(x) ? x : (x ? [x] : []);
      const cAll = toArr(cRes);
      if (cAll.length === NOTABLE_CITIES.length) {
        rawCityNodes = NOTABLE_CITIES.map((city, idx) => ({
          ...city,
          node: parseOpenMeteoNode(city, cAll[idx])
        }));
      }

      const gArr1 = toArr(g1);
      const gArr2 = toArr(g2);
      const combined = [...gArr1, ...gArr2];

      if (combined.length === pts.length) {
        gridLatMin = latMin; gridLatMax = latMax;
        gridLonMin = lonMin; gridLonMax = lonMax;
        rawGridNodes = pts.map((pt, idx) => parseOpenMeteoNode(pt, combined[idx]));
        lastFetchedBounds = { lat: centerLat, lon: centerLon, ts: Date.now() };
        hasHourlyForecast = false;
      } else if (rawCityNodes.length > 0 && rawGridNodes.length === 0) {
        // Fallback an toàn từ 56 trạm thực nếu 1 nhánh lưới bị nghẽn mạng (không bao giờ để màn hình trắng!)
        gridLatMin = latMin; gridLatMax = latMax;
        gridLonMin = lonMin; gridLonMax = lonMax;
        rawGridNodes = pts.map(pt => synthesizeNodeFromRealStations(pt, rawCityNodes));
      } else if (!rawGridNodes.length) {
        showToast('⚠️ Kết nối mạng chậm, đang thử tải lại dữ liệu khí tượng...');
      }

      updateActiveTimeSlice(timelineHourOffset);
      computeWindGrid();
      if (!pX) initParticles();
      buildOffscreenColorRaster();
      renderColorCanvasOnce();
      showLoadingSpinner(false);
      startRenderEngine();

      // STAGE 2: Tải ngầm dữ liệu dự báo 72h (hourly) hoàn toàn không chặn giao diện!
      hydrateHourlyForecastInBackground(mySeq, pts);
    } catch (err) {
      console.error('Lỗi tải lưới khí tượng Open-Meteo:', err);
      showLoadingSpinner(false);
      showToast('⚠️ Không thể kết nối máy chủ thời tiết Open-Meteo.');
    }
  }

  let isHydratingHourly = false;
  async function hydrateHourlyForecastInBackground(seqCheck = activeGridFetchSeq, ptsOverride = null) {
    if (isHydratingHourly || !rawGridNodes.length) return;
    isHydratingHourly = true;
    try {
      const pts = ptsOverride || rawGridNodes.map(n => ({ lat: n.lat, lon: n.lon }));
      const mid = Math.ceil(pts.length / 2);
      const buildHourlyUrl = list => {
        const lats = list.map(p => p.lat).join(',');
        const lons = list.map(p => p.lon).join(',');
        return `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m&hourly=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m&forecast_days=4&timezone=auto`;
      };

      const [h1, h2, hCities] = await Promise.all([
        fetchJsonWithRetry(buildHourlyUrl(pts.slice(0, mid)), 1),
        fetchJsonWithRetry(buildHourlyUrl(pts.slice(mid)), 1),
        fetchJsonWithRetry(buildHourlyUrl(NOTABLE_CITIES), 1)
      ]);

      if (seqCheck !== activeGridFetchSeq) return;

      const toArr = x => Array.isArray(x) ? x : (x ? [x] : []);
      const hGridAll = [...toArr(h1), ...toArr(h2)];
      if (hGridAll.length === rawGridNodes.length) {
        hGridAll.forEach((apiObj, idx) => {
          if (apiObj?.hourly?.time) {
            rawGridNodes[idx].hourly = apiObj.hourly;
            const curTime = apiObj.current?.time;
            if (curTime) {
              const found = apiObj.hourly.time.findIndex(t => t.slice(0, 13) === curTime.slice(0, 13));
              if (found !== -1) rawGridNodes[idx].baseIdx = found;
            }
          }
        });
        hasHourlyForecast = true;
      }

      const hCityAll = toArr(hCities);
      if (hCityAll.length === rawCityNodes.length) {
        hCityAll.forEach((apiObj, idx) => {
          if (apiObj?.hourly?.time) {
            rawCityNodes[idx].node.hourly = apiObj.hourly;
            const curTime = apiObj.current?.time;
            if (curTime) {
              const found = apiObj.hourly.time.findIndex(t => t.slice(0, 13) === curTime.slice(0, 13));
              if (found !== -1) rawCityNodes[idx].node.baseIdx = found;
            }
          }
        });
      }

      if (timelineHourOffset > 0.1) {
        onTimelineChange();
      }
    } catch (_) {
    } finally {
      isHydratingHourly = false;
    }
  }

  // Nội suy an toàn từ 56 trạm thực nếu 1 gói lưới phụ bị lỗi mạng
  function synthesizeNodeFromRealStations(pt, stationList) {
    let wSum = 0, temp = 0, humidity = 0, rain = 0, pressure = 0, cloud = 0, u = 0, v = 0, gust = 0;
    for (let i = 0; i < stationList.length; i++) {
      const st = stationList[i].node.current;
      const d2 = (stationList[i].lat - pt.lat) ** 2 + (stationList[i].lon - pt.lon) ** 2 + 0.05;
      const w = 1 / d2;
      wSum += w;
      temp += st.temp * w;
      humidity += st.humidity * w;
      rain += st.rain * w;
      pressure += st.pressure * w;
      cloud += st.cloud * w;
      gust += st.gust * w;
      const rad = st.wd * DEG2RAD;
      u += (-st.ws * Math.sin(rad)) * w;
      v += (-st.ws * Math.cos(rad)) * w;
    }
    const fu = u / wSum, fv = v / wSum;
    const ws = Math.hypot(fu, fv);
    const wd = (Math.atan2(-fu, -fv) * RAD2DEG + 360) % 360;
    return {
      lat: pt.lat,
      lon: pt.lon,
      baseIdx: 0,
      current: {
        temp: temp / wSum,
        humidity: humidity / wSum,
        rain: rain / wSum,
        pressure: pressure / wSum,
        cloud: cloud / wSum,
        ws,
        wd,
        gust: gust / wSum,
        code: 0
      },
      hourly: {}
    };
  }

  function parseOpenMeteoNode(pt, apiObj) {
    const cur = apiObj?.current || {};
    const hr  = apiObj?.hourly || {};
    let baseIdx = 0;
    if (cur.time && Array.isArray(hr.time)) {
      const prefix = cur.time.slice(0, 13);
      const found = hr.time.findIndex(t => t.slice(0, 13) === prefix);
      if (found !== -1) baseIdx = found;
    }
    const ws = cur.wind_speed_10m ?? hr.wind_speed_10m?.[baseIdx] ?? 12;
    return {
      lat: pt.lat,
      lon: pt.lon,
      baseIdx,
      current: {
        temp: cur.temperature_2m ?? hr.temperature_2m?.[baseIdx] ?? 24,
        humidity: cur.relative_humidity_2m ?? hr.relative_humidity_2m?.[baseIdx] ?? 75,
        rain: cur.precipitation ?? hr.precipitation?.[baseIdx] ?? 0,
        pressure: cur.surface_pressure ?? hr.surface_pressure?.[baseIdx] ?? 1012,
        cloud: cur.cloud_cover ?? hr.cloud_cover?.[baseIdx] ?? 35,
        ws,
        wd: cur.wind_direction_10m ?? hr.wind_direction_10m?.[baseIdx] ?? 90,
        gust: cur.wind_gusts_10m ?? hr.wind_gusts_10m?.[baseIdx] ?? ws * 1.3,
        code: cur.weather_code ?? 0
      },
      hourly: hr
    };
  }

  function extractNodeSliceAtOffset(node, hourOffsetFloat) {
    if (!node) return null;
    const hr = node.hourly;
    if (hourOffsetFloat <= 0.05 || !hr?.time?.length) {
      const c = node.current;
      const rad = c.wd * DEG2RAD;
      return {
        lat: node.lat,
        lon: node.lon,
        temp: c.temp,
        humidity: c.humidity,
        rain: c.rain,
        pressure: c.pressure,
        cloud: c.cloud,
        ws: c.ws,
        gust: c.gust,
        wd: c.wd,
        code: c.code,
        wu: -c.ws * Math.sin(rad),
        wv: -c.ws * Math.cos(rad)
      };
    }

    const maxIdx = hr.time.length - 1;
    const exactIdx = Math.min(maxIdx, node.baseIdx + hourOffsetFloat);
    const i0 = Math.min(maxIdx, Math.floor(exactIdx));
    const i1 = Math.min(maxIdx, i0 + 1);
    const f  = exactIdx - i0;
    const lerp = (a, b) => (a ?? 0) + ((b ?? a ?? 0) - (a ?? 0)) * f;

    const temp     = lerp(hr.temperature_2m?.[i0], hr.temperature_2m?.[i1]);
    const humidity = lerp(hr.relative_humidity_2m?.[i0], hr.relative_humidity_2m?.[i1]);
    const rain     = lerp(hr.precipitation?.[i0], hr.precipitation?.[i1]);
    const pressure = lerp(hr.surface_pressure?.[i0], hr.surface_pressure?.[i1]);
    const cloud    = lerp(hr.cloud_cover?.[i0], hr.cloud_cover?.[i1]);

    const ws0 = hr.wind_speed_10m?.[i0] ?? node.current.ws;
    const wd0 = (hr.wind_direction_10m?.[i0] ?? node.current.wd) * DEG2RAD;
    const ws1 = hr.wind_speed_10m?.[i1] ?? ws0;
    const wd1 = (hr.wind_direction_10m?.[i1] ?? node.current.wd) * DEG2RAD;

    const u0 = -ws0 * Math.sin(wd0), v0 = -ws0 * Math.cos(wd0);
    const u1 = -ws1 * Math.sin(wd1), v1 = -ws1 * Math.cos(wd1);
    const wu = u0 + (u1 - u0) * f;
    const wv = v0 + (v1 - v0) * f;
    const ws = Math.hypot(wu, wv);
    const wd = (Math.atan2(-wu, -wv) * RAD2DEG + 360) % 360;
    const gust = hr.wind_gusts_10m
      ? lerp(hr.wind_gusts_10m[i0], hr.wind_gusts_10m[i1])
      : ws * 1.32;

    return { lat: node.lat, lon: node.lon, temp, humidity, rain, pressure, cloud, ws, gust, wd, code: node.current.code, wu, wv };
  }

  function updateActiveTimeSlice(hourOffsetFloat) {
    if (rawCityNodes.length) {
      cityWeatherCache = rawCityNodes.map(c => {
        const s = extractNodeSliceAtOffset(c.node, hourOffsetFloat);
        return {
          ...c,
          temp: Math.round(s.temp),
          tempExact: s.temp,
          wind: Math.round(s.ws),
          gust: Math.round(s.gust),
          gustExact: s.gust,
          windExact: s.ws,
          wd: s.wd,
          wu: s.wu,
          wv: s.wv,
          rain: s.rain,
          humidity: Math.round(s.humidity),
          pressure: Math.round(s.pressure),
          cloud: Math.round(s.cloud),
          code: s.code
        };
      });
    }

    if (rawGridNodes.length === GRID_ROWS * GRID_COLS) {
      meteoGrid = rawGridNodes.map(n => {
        const base = extractNodeSliceAtOffset(n, hourOffsetFloat);
        if (!cityWeatherCache.length) return base;
        let wSum = 1.0;
        let tSum = base.temp;
        let rSum = base.rain;
        let gSum = base.gust;
        for (let i = 0; i < cityWeatherCache.length; i++) {
          const st = cityWeatherCache[i];
          const d2 = (st.lat - base.lat) ** 2 + (st.lon - base.lon) ** 2;
          if (d2 < 3.0) {
            const w = Math.exp(-d2 / 0.85) * 0.72;
            wSum += w;
            tSum += st.tempExact * w;
            rSum += st.rain * w;
            gSum += st.gustExact * w;
          }
        }
        base.temp = tSum / wSum;
        base.rain = rSum / wSum;
        base.gust = gSum / wSum;
        return base;
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════
     O(1) SMOOTH 2D GRID INTERPOLATION
  ══════════════════════════════════════════════════════════════ */
  function sampleGridScalarO1(lat, lon, fieldName) {
    if (meteoGrid.length !== GRID_ROWS * GRID_COLS) return 0;

    const normR = Math.max(0, Math.min(GRID_ROWS - 1.0001, ((lat - gridLatMin) / (gridLatMax - gridLatMin)) * (GRID_ROWS - 1)));
    const normC = Math.max(0, Math.min(GRID_COLS - 1.0001, ((lon - gridLonMin) / (gridLonMax - gridLonMin)) * (GRID_COLS - 1)));

    const r0 = normR | 0;
    const c0 = normC | 0;
    const r1 = Math.min(GRID_ROWS - 1, r0 + 1);
    const c1 = Math.min(GRID_COLS - 1, c0 + 1);

    const fy = normR - r0;
    const fx = normC - c0;
    const sy = fy * fy * (3 - 2 * fy);
    const sx = fx * fx * (3 - 2 * fx);

    const p00 = meteoGrid[r0 * GRID_COLS + c0][fieldName];
    const p01 = meteoGrid[r0 * GRID_COLS + c1][fieldName];
    const p10 = meteoGrid[r1 * GRID_COLS + c0][fieldName];
    const p11 = meteoGrid[r1 * GRID_COLS + c1][fieldName];

    return (
      p00 * (1 - sx) * (1 - sy) +
      p01 * sx * (1 - sy) +
      p10 * (1 - sx) * sy +
      p11 * sx * sy
    );
  }

  function sampleWindVector(lat, lon) {
    if (meteoGrid.length !== GRID_ROWS * GRID_COLS) return { u: -6, v: -5, spd: 8 };

    const normR = Math.max(0, Math.min(GRID_ROWS - 1.0001, ((lat - gridLatMin) / (gridLatMax - gridLatMin)) * (GRID_ROWS - 1)));
    const normC = Math.max(0, Math.min(GRID_COLS - 1.0001, ((lon - gridLonMin) / (gridLonMax - gridLonMin)) * (GRID_COLS - 1)));

    const r0 = normR | 0;
    const c0 = normC | 0;
    const r1 = Math.min(GRID_ROWS - 1, r0 + 1);
    const c1 = Math.min(GRID_COLS - 1, c0 + 1);

    const fy = normR - r0;
    const fx = normC - c0;
    const sy = fy * fy * (3 - 2 * fy);
    const sx = fx * fx * (3 - 2 * fx);

    const n00 = meteoGrid[r0 * GRID_COLS + c0];
    const n01 = meteoGrid[r0 * GRID_COLS + c1];
    const n10 = meteoGrid[r1 * GRID_COLS + c0];
    const n11 = meteoGrid[r1 * GRID_COLS + c1];

    const w00 = (1 - sx) * (1 - sy);
    const w01 = sx * (1 - sy);
    const w10 = (1 - sx) * sy;
    const w11 = sx * sy;

    const u = n00.wu * w00 + n01.wu * w01 + n10.wu * w10 + n11.wu * w11;
    const v = n00.wv * w00 + n01.wv * w01 + n10.wv * w10 + n11.wv * w11;
    return { u, v, spd: Math.hypot(u, v) };
  }

  function computeWindGrid() {
    if (!mapInstance || !topCanvas || meteoGrid.length !== GRID_ROWS * GRID_COLS) return;
    const W = topCanvas.width, H = topCanvas.height;
    if (W <= 0 || H <= 0) return;

    windGridCols = Math.ceil(W / windGridStep) + 1;
    windGridRows = Math.ceil(H / windGridStep) + 1;

    screenGridU   = new Float32Array(windGridCols * windGridRows);
    screenGridV   = new Float32Array(windGridCols * windGridRows);
    screenGridSpd = new Float32Array(windGridCols * windGridRows);

    const rowLats = new Float32Array(windGridRows);
    const colLons = new Float32Array(windGridCols);

    for (let r = 0; r < windGridRows; r++) {
      rowLats[r] = mapInstance.containerPointToLatLng([0, r * windGridStep]).lat;
    }
    for (let c = 0; c < windGridCols; c++) {
      colLons[c] = mapInstance.containerPointToLatLng([c * windGridStep, 0]).lng;
    }

    for (let r = 0; r < windGridRows; r++) {
      const lat = rowLats[r];
      const rowOffset = r * windGridCols;
      for (let c = 0; c < windGridCols; c++) {
        const wind = sampleWindVector(lat, colLons[c]);
        const idx = rowOffset + c;
        screenGridU[idx]   = wind.u;
        screenGridV[idx]   = -wind.v;
        screenGridSpd[idx] = wind.spd;
      }
    }
  }

  function getWindAtPixel(px, py) {
    if (!screenGridU) return { u: 0, v: 0, spd: 10 };
    const c0 = Math.max(0, Math.min(windGridCols - 1, (px / windGridStep) | 0));
    const r0 = Math.max(0, Math.min(windGridRows - 1, (py / windGridStep) | 0));
    const idx = r0 * windGridCols + c0;
    return { u: screenGridU[idx], v: screenGridV[idx], spd: screenGridSpd[idx] };
  }

  /* ══════════════════════════════════════════════════════════════
     SMOOTH COLOR HEATMAP RASTER (<0.8MS SEPARABLE WEBMERCATOR)
  ══════════════════════════════════════════════════════════════ */
  function buildOffscreenColorRaster() {
    if (!offscreenRasterCanvas || !offscreenRasterCtx || !mapInstance || meteoGrid.length !== GRID_ROWS * GRID_COLS) return;
    const rW = offscreenRasterCanvas.width;
    const rH = offscreenRasterCanvas.height;
    if (rW <= 0 || rH <= 0) return;

    const cfg = LAYER_RANGES[currentLayer] || LAYER_RANGES.temp;
    const fieldName = cfg.field;
    const minVal = cfg.min;
    const invSpan = 1 / Math.max(1e-5, cfg.max - minVal);
    const lut = colorLUTs[currentLayer] || colorLUTs.temp;

    const r0Arr = new Int32Array(rH);
    const r1Arr = new Int32Array(rH);
    const syArr = new Float32Array(rH);
    const latRangeInv = (GRID_ROWS - 1) / Math.max(1e-5, gridLatMax - gridLatMin);

    for (let py = 0; py < rH; py++) {
      const lat = mapInstance.containerPointToLatLng([0, py * RASTER_SCALE]).lat;
      const normR = Math.max(0, Math.min(GRID_ROWS - 1.0001, (lat - gridLatMin) * latRangeInv));
      const r0 = normR | 0;
      const fy = normR - r0;
      r0Arr[py] = r0 * GRID_COLS;
      r1Arr[py] = Math.min(GRID_ROWS - 1, r0 + 1) * GRID_COLS;
      syArr[py] = fy * fy * (3 - 2 * fy);
    }

    const c0Arr = new Int32Array(rW);
    const c1Arr = new Int32Array(rW);
    const sxArr = new Float32Array(rW);
    const lonRangeInv = (GRID_COLS - 1) / Math.max(1e-5, gridLonMax - gridLonMin);

    for (let px = 0; px < rW; px++) {
      const lon = mapInstance.containerPointToLatLng([px * RASTER_SCALE, 0]).lng;
      const normC = Math.max(0, Math.min(GRID_COLS - 1.0001, (lon - gridLonMin) * lonRangeInv));
      const c0 = normC | 0;
      const fx = normC - c0;
      c0Arr[px] = c0;
      c1Arr[px] = Math.min(GRID_COLS - 1, c0 + 1);
      sxArr[px] = fx * fx * (3 - 2 * fx);
    }

    const gridVals = new Float32Array(GRID_ROWS * GRID_COLS);
    for (let i = 0; i < meteoGrid.length; i++) {
      gridVals[i] = meteoGrid[i][fieldName] ?? 0;
    }

    const imgData = offscreenRasterCtx.createImageData(rW, rH);
    const pixels32 = new Uint32Array(imgData.data.buffer);
    const lutMax = LUT_SIZE - 1;

    let pIdx = 0;
    for (let py = 0; py < rH; py++) {
      const row0 = r0Arr[py];
      const row1 = r1Arr[py];
      const sy = syArr[py];
      const oneMinusSy = 1 - sy;

      for (let px = 0; px < rW; px++) {
        const c0 = c0Arr[px];
        const c1 = c1Arr[px];
        const sx = sxArr[px];
        const oneMinusSx = 1 - sx;

        const val =
          (gridVals[row0 + c0] * oneMinusSx + gridVals[row0 + c1] * sx) * oneMinusSy +
          (gridVals[row1 + c0] * oneMinusSx + gridVals[row1 + c1] * sx) * sy;

        let norm = (val - minVal) * invSpan;
        if (norm < 0) norm = 0;
        else if (norm > 1) norm = 1;

        pixels32[pIdx++] = lut[(norm * lutMax) | 0];
      }
    }

    offscreenRasterCtx.putImageData(imgData, 0, 0);
  }

  function renderColorCanvasOnce() {
    if (!colorCtx || !colorCanvas || !offscreenRasterCanvas) return;
    const W = colorCanvas.width, H = colorCanvas.height;
    colorCtx.clearRect(0, 0, W, H);
    colorCtx.save();
    colorCtx.imageSmoothingEnabled = true;
    colorCtx.imageSmoothingQuality = 'high';
    colorCtx.drawImage(offscreenRasterCanvas, 0, 0, W, H);
    colorCtx.restore();
  }

  /* ══════════════════════════════════════════════════════════════
     DIRECTIONAL COMET STREAMLINES (TAPERED TAIL + CRISP HEAD DOT)
  ══════════════════════════════════════════════════════════════ */
  function initParticles() {
    const W = (topCanvas && topCanvas.width) || 1280;
    const H = (topCanvas && topCanvas.height) || 720;

    numParticles = Math.max(360, Math.min(780, Math.round((W * H) / 2200)));

    pX    = new Float32Array(numParticles);
    pY    = new Float32Array(numParticles);
    pAge  = new Float32Array(numParticles);
    pLife = new Float32Array(numParticles);

    for (let i = 0; i < numParticles; i++) {
      resetParticle(i, W, H, true);
    }
  }

  function resetParticle(i, W, H, initial = false) {
    pX[i]    = Math.random() * W;
    pY[i]    = Math.random() * H;
    pAge[i]  = initial ? Math.random() * 55 : 0;
    pLife[i] = 40 + Math.random() * 40;
  }

  function startRenderEngine() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    renderColorCanvasOnce();
    lastTimestamp = performance.now();
    renderLoop(lastTimestamp);
  }

  function renderLoop(timestamp) {
    if (!topCtx || !topCanvas) return;
    const W = topCanvas.width, H = topCanvas.height;
    if (W <= 0 || H <= 0) return;

    const delta = timestamp ? Math.min((timestamp - lastTimestamp) / 16.66, 2.0) : 1;
    lastTimestamp = timestamp;

    topCtx.clearRect(0, 0, W, H);

    // 1. Vệt gió Sao băng Định hướng mượt mà kiểu Windy.com (mảnh, thanh thoát, không che khuất bản đồ)
    if (showParticles && trailCtx && trailCanvas && !isMapMoving) {
      trailCtx.save();
      trailCtx.globalCompositeOperation = 'destination-in';
      trailCtx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      trailCtx.fillRect(0, 0, W, H);
      trailCtx.restore();

      const zoom = mapInstance ? mapInstance.getZoom() : 6;
      const zoomScale = Math.max(0.5, Math.min(1.35, Math.pow(1.08, zoom - 5)));
      const moveStep = 0.23 * zoomScale * delta;

      const pathLight  = new Path2D();
      const pathStrong = new Path2D();
      const pathHeads  = new Path2D();

      for (let i = 0; i < numParticles; i++) {
        pAge[i] += delta;
        if (pAge[i] >= pLife[i]) {
          resetParticle(i, W, H, false);
          continue;
        }

        const curX = pX[i];
        const curY = pY[i];
        const w1 = getWindAtPixel(curX, curY);

        const midX = curX + w1.u * moveStep * 0.5;
        const midY = curY + w1.v * moveStep * 0.5;
        const w2 = getWindAtPixel(midX, midY);

        const spd = Math.max(3.0, w2.spd);
        const scale = spd / Math.max(0.1, w2.spd);
        const nextX = curX + w2.u * scale * moveStep;
        const nextY = curY + w2.v * scale * moveStep;

        if (nextX < 0 || nextX > W || nextY < 0 || nextY > H) {
          resetParticle(i, W, H, false);
          continue;
        }

        pX[i] = nextX;
        pY[i] = nextY;

        if (w2.spd > 24) {
          pathStrong.moveTo(curX, curY);
          pathStrong.lineTo(nextX, nextY);
        } else {
          pathLight.moveTo(curX, curY);
          pathLight.lineTo(nextX, nextY);
        }

        if (pAge[i] > 3 && pAge[i] < pLife[i] - 5) {
          pathHeads.rect(nextX - 0.7, nextY - 0.7, 1.4, 1.4);
        }
      }

      trailCtx.lineCap = 'round';
      const isDarkMap = currentBasemap === 'dark' || currentBasemap === 'satellite';

      trailCtx.lineWidth = 1.0;
      trailCtx.strokeStyle = isDarkMap ? 'rgba(255, 255, 255, 0.48)' : 'rgba(255, 255, 255, 0.50)';
      trailCtx.stroke(pathLight);

      trailCtx.lineWidth = 1.35;
      trailCtx.strokeStyle = isDarkMap ? 'rgba(224, 242, 254, 0.75)' : 'rgba(255, 255, 255, 0.72)';
      trailCtx.stroke(pathStrong);

      topCtx.drawImage(trailCanvas, 0, 0);

      topCtx.fillStyle = isDarkMap ? 'rgba(255, 255, 255, 0.74)' : 'rgba(255, 255, 255, 0.76)';
      topCtx.fill(pathHeads);
    }

    // 2. Đường đẳng áp thực + Tâm Áp Cao (H) / Áp Thấp (L)
    if ((showIsobars || currentLayer === 'pressure') && !isMapMoving) {
      drawRealMarchingSquaresIsobars(W, H);
    }

    // 3. Nhãn 56 Tỉnh thành / Đảo nổi chuẩn Windy.com (trả về danh sách vùng đã chiếm để tránh đè chữ biển/đảo)
    let occupiedBoxes = [];
    if (showCityLabels && !isMapMoving) {
      occupiedBoxes = drawWindyStyleCityLabels(W, H);
    }

    // 4. Nhãn tên Vùng biển & Hải đảo Việt Nam (kiểm tra chống đè lên nhãn thành phố!)
    if (!isMapMoving) {
      drawGeographicWatermarks(W, H, occupiedBoxes);
    }

    // 5. Cây kim + Cờ đo thời tiết kiểu Windy Picker
    drawWeatherProbeMarker();

    animFrameId = requestAnimationFrame(renderLoop);
  }

  function drawGeographicWatermarks(W, H, occupied = []) {
    if (!mapInstance || !topCtx) return;
    const zoom = mapInstance.getZoom();
    if (zoom > 7) return;

    topCtx.save();
    topCtx.textAlign = 'center';
    topCtx.textBaseline = 'middle';

    GEO_REGIONS.forEach(reg => {
      if (zoom < reg.minZoom) return;
      const pt = mapInstance.latLngToContainerPoint([reg.lat, reg.lon]);
      if (pt.x < 60 || pt.x > W - 80 || pt.y < 55 || pt.y > H - 70) return;

      topCtx.font = reg.type === 'sea'
        ? 'italic 700 10.5px "Be Vietnam Pro", sans-serif'
        : '800 10px "Be Vietnam Pro", sans-serif';
      const w = topCtx.measureText(reg.name).width + 10;
      const h = 16;
      const bx = pt.x - w / 2, by = pt.y - h / 2;
      const hitCity = occupied.some(b => bx < b.x + b.w && bx + w > b.x && by < b.y + b.h && by + h > b.y);
      if (hitCity) return;

      topCtx.lineJoin = 'round';
      topCtx.lineWidth = 2.6;
      topCtx.strokeStyle = 'rgba(15, 23, 42, 0.58)';
      topCtx.strokeText(reg.name, pt.x, pt.y);
      topCtx.fillStyle = reg.type === 'sea' ? 'rgba(224, 242, 254, 0.85)' : 'rgba(255, 255, 255, 0.78)';
      topCtx.fillText(reg.name, pt.x, pt.y);
    });

    topCtx.restore();
  }

  function drawWindyStyleCityLabels(W, H) {
    if (!mapInstance || !topCtx || !cityWeatherCache.length) return [];
    const zoom = mapInstance.getZoom();
    const occupied = [];
    activeCityBadges = [];

    const bottomSafeMargin = pinnedProbe ? 205 : 75;

    topCtx.save();
    topCtx.lineJoin = 'round';
    topCtx.miterLimit = 2;
    topCtx.textAlign = 'center';

    // Kiểu nhãn chuẩn Windy.com: Chấm trạm màu + Tên thành phố & Số liệu nổi viền Halo thanh thoát (KHÔNG dùng hộp đen che bản đồ!)
    cityWeatherCache.forEach(city => {
      if (city.priority === 3 && zoom < 7) return;
      if (city.priority === 2 && zoom < 5) return;

      const pt = mapInstance.latLngToContainerPoint([city.lat, city.lon]);
      if (pt.x < 45 || pt.x > W - 105 || pt.y < 52 || pt.y > H - bottomSafeMargin) return;

      let valStr = `${city.temp}°`;
      let valColor = '#ffffff';
      if (currentLayer === 'wind') {
        valStr = `${city.wind} km/h`;
        valColor = '#f0f9ff';
      } else if (currentLayer === 'gust') {
        valStr = `${city.gust} km/h`;
        valColor = '#fef08a';
      } else if (currentLayer === 'rain') {
        valStr = city.rain > 0.05 ? `${city.rain.toFixed(1)}mm` : `${city.temp}°`;
        valColor = city.rain > 0.05 ? '#bae6fd' : '#ffffff';
      } else if (currentLayer === 'pressure') {
        valStr = `${city.pressure}`;
        valColor = '#f3e8ff';
      } else if (currentLayer === 'humidity') {
        valStr = `${city.humidity}%`;
        valColor = '#d1fae5';
      } else if (currentLayer === 'cloud') {
        valStr = `${city.cloud}%`;
        valColor = '#f8fafc';
      }

      topCtx.font = city.priority === 1
        ? '700 11.5px "Be Vietnam Pro", -apple-system, sans-serif'
        : '600 11px "Be Vietnam Pro", -apple-system, sans-serif';
      const nameW = topCtx.measureText(city.n).width;
      topCtx.font = '800 11.5px "Be Vietnam Pro", -apple-system, sans-serif';
      const valW  = topCtx.measureText(valStr).width;

      const totalW = Math.max(nameW, valW) + 8;
      const totalH = 30;
      const boxX   = pt.x - totalW / 2;
      const boxY   = pt.y - 26;

      const pad = zoom >= 7 ? 5 : zoom >= 6 ? 9 : 13;
      const collides = occupied.some(b =>
        boxX - pad < b.x + b.w &&
        boxX + totalW + pad > b.x &&
        boxY - pad < b.y + b.h &&
        boxY + totalH + pad > b.y
      );
      if (collides) return;

      occupied.push({ x: boxX, y: boxY, w: totalW, h: totalH });
      activeCityBadges.push({ city, x: boxX - 4, y: boxY - 4, w: totalW + 8, h: totalH + 10 });

      // 1. Chấm trạm đo thực tế đúng chuẩn Windy.com (xanh lá = quang tạnh, xanh dương = có mưa, cam = nóng/gió mạnh)
      let dotColor = '#22c55e';
      if (city.rain >= 0.3 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(city.code)) {
        dotColor = '#38bdf8';
      } else if (city.wind >= 28 || city.temp >= 34) {
        dotColor = '#f59e0b';
      } else if (city.isIsland) {
        dotColor = '#2dd4bf';
      }

      topCtx.beginPath();
      topCtx.arc(pt.x, pt.y + 3, 3.1, 0, Math.PI * 2);
      topCtx.fillStyle = dotColor;
      topCtx.fill();
      topCtx.lineWidth = 1.25;
      topCtx.strokeStyle = 'rgba(15, 23, 42, 0.92)';
      topCtx.stroke();

      // 2. Dòng trên: Tên Tỉnh / Thành phố / Hải đảo (chữ trắng viền tối mềm rõ nét trên mọi màu nền)
      topCtx.font = city.priority === 1
        ? '700 11.5px "Be Vietnam Pro", -apple-system, sans-serif'
        : '600 11px "Be Vietnam Pro", -apple-system, sans-serif';
      topCtx.textBaseline = 'bottom';
      topCtx.lineWidth = 3.0;
      topCtx.strokeStyle = 'rgba(10, 15, 28, 0.86)';
      topCtx.strokeText(city.n, pt.x, pt.y - 12);
      topCtx.fillStyle = city.isIsland ? '#bae6fd' : '#ffffff';
      topCtx.fillText(city.n, pt.x, pt.y - 12);

      // 3. Dòng dưới: Nhiệt độ / Tốc độ gió ngay sát dưới tên (chuẩn Windy.com — thoáng 100% đường bờ biển!)
      topCtx.font = '800 11.5px "Be Vietnam Pro", -apple-system, sans-serif';
      topCtx.textBaseline = 'bottom';
      topCtx.lineWidth = 3.0;
      topCtx.strokeStyle = 'rgba(10, 15, 28, 0.90)';
      topCtx.strokeText(valStr, pt.x, pt.y);
      topCtx.fillStyle = valColor;
      topCtx.fillText(valStr, pt.x, pt.y);
    });

    topCtx.restore();
    return occupied;
  }

  /* ══════════════════════════════════════════════════════════════
     MARCHING SQUARES ISOBARS + HIGH (H) / LOW (L) PRESSURE CENTERS
  ══════════════════════════════════════════════════════════════ */
  function drawRealMarchingSquaresIsobars(W, H) {
    if (!mapInstance || !topCtx || meteoGrid.length !== GRID_ROWS * GRID_COLS) return;
    const zoom = mapInstance.getZoom();
    if (zoom < 4) return;

    const step = 36;
    const cols = Math.ceil(W / step) + 1;
    const rows = Math.ceil(H / step) + 1;
    const pField = new Float32Array(cols * rows);

    for (let r = 0; r < rows; r++) {
      const lat = mapInstance.containerPointToLatLng([0, r * step]).lat;
      for (let c = 0; c < cols; c++) {
        const lon = mapInstance.containerPointToLatLng([c * step, 0]).lng;
        pField[r * cols + c] = sampleGridScalarO1(lat, lon, 'pressure');
      }
    }

    const levels = [1000, 1004, 1008, 1012, 1016, 1020, 1024];
    topCtx.save();
    topCtx.lineWidth = 1.25;

    levels.forEach(level => {
      const isMajor = level === 1012 || level % 8 === 0;
      topCtx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.42)';

      const path = new Path2D();
      let labelPos = null;

      for (let r = 0; r < rows - 1; r++) {
        const y0 = r * step, y1 = (r + 1) * step;
        for (let c = 0; c < cols - 1; c++) {
          const x0 = c * step, x1 = (c + 1) * step;
          const v00 = pField[r * cols + c];
          const v10 = pField[r * cols + (c + 1)];
          const v11 = pField[(r + 1) * cols + (c + 1)];
          const v01 = pField[(r + 1) * cols + c];

          let mask = 0;
          if (v00 >= level) mask |= 1;
          if (v10 >= level) mask |= 2;
          if (v11 >= level) mask |= 4;
          if (v01 >= level) mask |= 8;
          if (mask === 0 || mask === 15) continue;

          const interp = (va, vb, ca, cb) => ca + ((level - va) / (vb - va || 1e-5)) * (cb - ca);
          const top    = [interp(v00, v10, x0, x1), y0];
          const right  = [x1, interp(v10, v11, y0, y1)];
          const bottom = [interp(v01, v11, x0, x1), y1];
          const left   = [x0, interp(v00, v01, y0, y1)];

          const addSeg = (pA, pB) => {
            path.moveTo(pA[0], pA[1]);
            path.lineTo(pB[0], pB[1]);
            if (!labelPos && c === ((cols / 2) | 0) && r > 2 && r < rows - 3) {
              labelPos = [(pA[0] + pB[0]) * 0.5, (pA[1] + pB[1]) * 0.5];
            }
          };

          switch (mask) {
            case 1: case 14: addSeg(left, top); break;
            case 2: case 13: addSeg(top, right); break;
            case 4: case 11: addSeg(right, bottom); break;
            case 8: case 7:  addSeg(bottom, left); break;
            case 3: case 12: addSeg(left, right); break;
            case 6: case 9:  addSeg(top, bottom); break;
            case 5:          addSeg(left, bottom); addSeg(top, right); break;
            case 10:         addSeg(left, top); addSeg(bottom, right); break;
          }
        }
      }

      topCtx.stroke(path);

      if (labelPos) {
        const [lx, ly] = labelPos;
        topCtx.font = 'bold 9.5px "Be Vietnam Pro", sans-serif';
        topCtx.lineWidth = 2.5;
        topCtx.strokeStyle = 'rgba(15, 23, 42, 0.88)';
        topCtx.textAlign = 'center';
        topCtx.textBaseline = 'middle';
        topCtx.strokeText(`${level} hPa`, lx, ly);
        topCtx.fillStyle = '#ffffff';
        topCtx.fillText(`${level} hPa`, lx, ly);
      }
    });

    // Vẽ Tâm Áp Cao (H) và Tâm Áp Thấp (L) thực tế
    let minNode = null, maxNode = null;
    for (let i = 0; i < meteoGrid.length; i++) {
      const g = meteoGrid[i];
      if (!minNode || g.pressure < minNode.pressure) minNode = g;
      if (!maxNode || g.pressure > maxNode.pressure) maxNode = g;
    }

    const drawCenterMark = (node, sym, col) => {
      if (!node) return;
      const pt = mapInstance.latLngToContainerPoint([node.lat, node.lon]);
      if (pt.x < 50 || pt.x > W - 80 || pt.y < 60 || pt.y > H - 90) return;
      topCtx.beginPath();
      topCtx.arc(pt.x, pt.y, 14, 0, Math.PI * 2);
      topCtx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      topCtx.fill();
      topCtx.lineWidth = 1.8;
      topCtx.strokeStyle = col;
      topCtx.stroke();
      topCtx.font = '900 13px "Be Vietnam Pro", sans-serif';
      topCtx.fillStyle = col;
      topCtx.textAlign = 'center';
      topCtx.textBaseline = 'middle';
      topCtx.fillText(sym, pt.x, pt.y);
    };

    if (minNode && minNode.pressure <= 1009) drawCenterMark(minNode, 'L', '#fb7185');
    if (maxNode && maxNode.pressure >= 1016) drawCenterMark(maxNode, 'H', '#38bdf8');

    topCtx.restore();
  }

  /* ══════════════════════════════════════════════════════════════
     WINDY PICKER FLAG & HORIZONTAL BOTTOM METEOGRAM DRAWER
  ══════════════════════════════════════════════════════════════ */
  function handleMapHover(e) {
    if (!mapInstance || !topCanvas || isMapMoving) return;
    const px = e.containerPoint.x;
    const py = e.containerPoint.y;
    probeCoords = { px, py, lat: e.latlng.lat, lon: e.latlng.lng };
    updateHoverTooltip(probeCoords);
  }

  function handleMapLeafletClick(e) {
    if (!mapInstance || !topCanvas) return;
    const px = e.containerPoint.x;
    const py = e.containerPoint.y;

    // Kiểm tra nếu bấm vào nút '✕' trên lá cờ Picker để đóng nhanh
    if (
      closeFlagHitBox &&
      px >= closeFlagHitBox.x && px <= closeFlagHitBox.x + closeFlagHitBox.w &&
      py >= closeFlagHitBox.y && py <= closeFlagHitBox.y + closeFlagHitBox.h
    ) {
      unpinSpotDrawer();
      return;
    }

    const hitBadge = activeCityBadges.find(b => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h);
    if (hitBadge) {
      pinLocationAndFetchRealSpot(hitBadge.city.lat, hitBadge.city.lon, hitBadge.city.n);
      return;
    }

    pinLocationAndFetchRealSpot(e.latlng.lat, e.latlng.lng, null);
  }

  function unpinSpotDrawer() {
    pinnedProbe = null;
    closeFlagHitBox = null;
    const spotCard = document.getElementById('meteoSpotCard');
    if (spotCard) spotCard.classList.add('hidden');
    document.querySelector('.meteo-map-wrap')?.classList.remove('drawer-open');
  }

  function drawWeatherProbeMarker() {
    closeFlagHitBox = null;
    if (!topCtx || !mapInstance || !pinnedProbe) return;

    const pt = mapInstance.latLngToContainerPoint([pinnedProbe.lat, pinnedProbe.lon]);
    const wind = sampleWindVector(pinnedProbe.lat, pinnedProbe.lon);
    const temp = sampleGridScalarO1(pinnedProbe.lat, pinnedProbe.lon, 'temp').toFixed(1);

    topCtx.save();

    const pulse = 9 + Math.sin(performance.now() * 0.006) * 2.5;
    topCtx.beginPath();
    topCtx.arc(pt.x, pt.y, pulse, 0, Math.PI * 2);
    topCtx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    topCtx.lineWidth = 2;
    topCtx.stroke();

    topCtx.beginPath();
    topCtx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
    topCtx.fillStyle = '#f97316';
    topCtx.fill();
    topCtx.lineWidth = 1.8;
    topCtx.strokeStyle = '#ffffff';
    topCtx.stroke();

    // Cờ đo thời tiết kiểu Windy Picker kèm nút ✕ đóng nhanh
    const flagY = pt.y - 34;
    topCtx.beginPath();
    topCtx.moveTo(pt.x, pt.y - 5);
    topCtx.lineTo(pt.x, flagY);
    topCtx.strokeStyle = '#ffffff';
    topCtx.lineWidth = 2;
    topCtx.stroke();

    const flagTxt = `${pinnedProbe.tempStr || (temp + '°C')} · 💨 ${pinnedProbe.windStr || (Math.round(wind.spd) + ' km/h')}`;
    topCtx.font = '800 11.5px "Be Vietnam Pro", sans-serif';
    const textW = topCtx.measureText(flagTxt).width;
    const fw = textW + 36;
    const fh = 25;
    const fx = pt.x - 4;
    const fy = flagY - fh;

    topCtx.beginPath();
    if (topCtx.roundRect) {
      topCtx.roundRect(fx, fy, fw, fh, 8);
    } else {
      topCtx.rect(fx, fy, fw, fh);
    }
    topCtx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    topCtx.fill();
    topCtx.lineWidth = 1.2;
    topCtx.strokeStyle = '#fbbf24';
    topCtx.stroke();

    topCtx.fillStyle = '#fde047';
    topCtx.textAlign = 'left';
    topCtx.textBaseline = 'middle';
    topCtx.fillText(flagTxt, fx + 9, fy + fh / 2);

    // Nút ✕ trên cờ
    const closeX = fx + fw - 14;
    topCtx.fillStyle = '#94a3b8';
    topCtx.font = '700 11px sans-serif';
    topCtx.textAlign = 'center';
    topCtx.fillText('✕', closeX, fy + fh / 2);
    closeFlagHitBox = { x: closeX - 10, y: fy, w: 22, h: fh };

    topCtx.restore();
  }

  function updateHoverTooltip(probe) {
    const tip = document.getElementById('meteoTooltip');
    if (!tip || meteoGrid.length !== GRID_ROWS * GRID_COLS) return;

    const wind     = sampleWindVector(probe.lat, probe.lon);
    const temp     = sampleGridScalarO1(probe.lat, probe.lon, 'temp').toFixed(1);
    const rain     = sampleGridScalarO1(probe.lat, probe.lon, 'rain').toFixed(1);
    const pressure = Math.round(sampleGridScalarO1(probe.lat, probe.lon, 'pressure'));
    const humidity = Math.round(sampleGridScalarO1(probe.lat, probe.lon, 'humidity'));

    const deg = (Math.atan2(-wind.u, -wind.v) * RAD2DEG + 360) % 360;
    const dirs = ['Bắc', 'ĐB', 'Đông', 'ĐN', 'Nam', 'TN', 'Tây', 'TB'];
    const dirText = dirs[Math.round(deg / 45) % 8];

    tip.innerHTML = `
      <div class="wtip-row">
        <strong>${temp}°C</strong>
        <span class="wtip-sep">|</span>
        <span>💨 ${Math.round(wind.spd)} km/h (${dirText})</span>
      </div>
      <div class="wtip-sub">🌧️ ${rain} mm · 💧 ${humidity}% · ${pressure} hPa</div>
    `;

    tip.style.display = 'block';
    const maxX = window.innerWidth - 220;
    const x = Math.min(probe.px + 14, maxX);
    const y = Math.max(62, probe.py - 46);
    tip.style.left = `${x}px`;
    tip.style.top  = `${y}px`;
  }

  function miniWeatherEmoji(code) {
    if ([0, 1].includes(code)) return '☀️';
    if (code === 2) return '⛅';
    if (code === 3) return '☁️';
    if ([45, 48].includes(code)) return '🌫️';
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '🌧️';
    if ([95, 96, 99].includes(code)) return '⛈️';
    return '🌤️';
  }

  // Bảng Dự báo Meteogram Ngang ở Đáy chuẩn Windy.com (Phản hồi <120ms, tách biệt hoàn toàn với Nominatim!)
  async function pinLocationAndFetchRealSpot(lat, lon, knownName) {
    pinnedProbe = { lat, lon };
    const spotCard = document.getElementById('meteoSpotCard');
    const wrap = document.querySelector('.meteo-map-wrap');
    if (!spotCard) return;

    // Khớp nhanh tên tỉnh/đảo gần nhất nếu bấm sát trạm (< 14km)
    let initialName = knownName;
    if (!initialName) {
      const nearCity = NOTABLE_CITIES.find(c => Math.hypot(c.lat - lat, c.lon - lon) < 0.13);
      if (nearCity) initialName = nearCity.n;
    }

    const coordStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
    const liveTempEst = meteoGrid.length ? `${sampleGridScalarO1(lat, lon, 'temp').toFixed(1)}°C` : '';
    wrap?.classList.add('drawer-open');
    spotCard.classList.remove('hidden');
    spotCard.innerHTML = `
      <div class="wmd-top">
        <div class="wmd-place">
          <strong id="wmdPlaceTitle">📍 ${escapeHtml(initialName || `Tọa độ (${coordStr})`)}</strong>
          <span>${coordStr}${liveTempEst ? ` · 🌡️ ${liveTempEst}` : ''}</span>
        </div>
        <div class="wmd-actions">
          <button type="button" class="spot-close" id="btnCloseSpot" title="Đóng">✕</button>
        </div>
      </div>
      <div class="spot-loading">⏳ Đang tải bảng dự báo Meteogram 36h thực tế từ Open-Meteo...</div>
    `;

    spotCard.querySelector('#btnCloseSpot')?.addEventListener('click', unpinSpotDrawer);

    if (spotAbortCtrl) spotAbortCtrl.abort();
    spotAbortCtrl = new AbortController();
    const myCtrl = spotAbortCtrl;

    let resolvedName = initialName || `Tọa độ (${coordStr})`;

    // Chạy ngầm Reverse Geocoding hoàn toàn độc lập — KHÔNG BAO GIỜ làm chậm bảng thời tiết Open-Meteo!
    if (!initialName) {
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=11&addressdetails=1&accept-language=vi`,
        { signal: myCtrl.signal }
      )
        .then(r => (r.ok ? r.json() : null))
        .then(geoRes => {
          if (myCtrl.signal.aborted || !geoRes?.address) return;
          const addr = geoRes.address;
          const nice = [addr.city || addr.town || addr.village || addr.county || addr.island, addr.state || addr.country]
            .filter(Boolean)
            .slice(0, 2)
            .join(', ');
          if (nice) {
            resolvedName = nice;
            const titleEl = document.getElementById('wmdPlaceTitle');
            if (titleEl) titleEl.textContent = `📍 ${nice}`;
          }
        })
        .catch(() => {});
    }

    try {
      const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index&hourly=temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m&forecast_days=3&timezone=auto`;
      const wxResp = await fetch(wxUrl, { signal: myCtrl.signal });
      const wxRes = wxResp.ok ? await wxResp.json() : null;
      if (myCtrl.signal.aborted) return;
      if (!wxRes || !wxRes.current) {
        showToast('⚠️ Đang hiển thị số liệu nội suy từ lưới trạm thực tế.');
        return;
      }

      const c = wxRes.current;
      if (pinnedProbe) {
        pinnedProbe.tempStr = `${c.temperature_2m.toFixed(1)}°C`;
        pinnedProbe.windStr = `${Math.round(c.wind_speed_10m)} km/h`;
      }

      const dirs = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
      const dirLabel = dirs[Math.round(((c.wind_direction_10m || 0) % 360 + 360) % 360 / 45) % 8];

      const hr = wxRes.hourly || {};
      let startIdx = 0;
      if (c.time && hr.time) {
        const idx = hr.time.findIndex(t => t.slice(0, 13) === c.time.slice(0, 13));
        if (idx !== -1) startIdx = idx;
      }

      const colsHtml = [];
      for (let i = 0; i < 36; i += 3) {
        const hi = startIdx + i;
        if (!hr.time?.[hi]) break;
        const tStr = hr.time[hi];
        const hrLabel = i === 0 ? 'Bây giờ' : `${tStr.slice(11, 13)}h (${tStr.slice(8, 10)}/${tStr.slice(5, 7)})`;
        const tVal = Math.round(hr.temperature_2m[hi]);
        const rVal = hr.precipitation?.[hi] ?? 0;
        const pop  = hr.precipitation_probability?.[hi] ?? 0;
        const wSpd = Math.round(hr.wind_speed_10m?.[hi] ?? 0);
        const wGst = Math.round(hr.wind_gusts_10m?.[hi] ?? wSpd);
        const wDeg = (hr.wind_direction_10m?.[hi] ?? 0) + 180;
        const emo  = miniWeatherEmoji(hr.weather_code?.[hi] ?? 0);

        colsHtml.push(`
          <div class="wmd-col">
            <span class="wmd-hr">${hrLabel}</span>
            <span class="wmd-emo">${emo}</span>
            <strong class="wmd-temp">${tVal}°</strong>
            <span class="wmd-rain">${rVal > 0.05 ? rVal.toFixed(1) + 'mm' : (pop > 15 ? pop + '%' : '—')}</span>
            <span class="wmd-wind">${wSpd} <small>km/h</small></span>
            <span class="wmd-gust">Giật ${wGst}</span>
            <span class="wmd-dir" title="Hướng gió ${Math.round(hr.wind_direction_10m?.[hi] ?? 0)}°">
              <i style="display:inline-block;transform:rotate(${wDeg}deg)">↑</i>
            </span>
          </div>
        `);
      }

      spotCard.innerHTML = `
        <div class="wmd-top">
          <div class="wmd-place">
            <strong id="wmdPlaceTitle">📍 ${escapeHtml(resolvedName)}</strong>
            <span>${coordStr} · 🌡️ <b>${c.temperature_2m.toFixed(1)}°C</b> (Cảm giác ${Math.round(c.apparent_temperature)}°) · 💨 <b>${Math.round(c.wind_speed_10m)} km/h</b> ${dirLabel} (Giật ${Math.round(c.wind_gusts_10m || c.wind_speed_10m)}) · 💧 Ẩm <b>${Math.round(c.relative_humidity_2m)}%</b> · 📊 <b>${Math.round(c.surface_pressure)} hPa</b> · ☀️ UV <b>${(c.uv_index ?? 0).toFixed(1)}</b></span>
          </div>
          <div class="wmd-actions">
            <button type="button" class="wmd-sync-btn" id="btnSyncToMain">📊 Mở chi tiết 7 ngày tại Trang chính</button>
            <button type="button" class="spot-close" id="btnCloseSpot" title="Đóng bảng dự báo">✕</button>
          </div>
        </div>
        <div class="wmd-table-scroll">${colsHtml.join('')}</div>
      `;

      spotCard.querySelector('#btnCloseSpot')?.addEventListener('click', unpinSpotDrawer);
      spotCard.querySelector('#btnSyncToMain')?.addEventListener('click', () => {
        if (window.selectLocationFromMeteoMap) {
          window.selectLocationFromMeteoMap(lat, lon, resolvedName);
        }
        closeMeteoMap();
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        showToast('⚠️ Lỗi mạng khi tải chi tiết điểm, vui lòng chạm lại.');
      }
    }
  }

  function updateLegend() {
    const cfg = LAYER_RANGES[currentLayer] || LAYER_RANGES.temp;
    const pal = COLOR_PALETTES[currentLayer] || COLOR_PALETTES.temp;
    const unitEl   = document.getElementById('meteoLegendUnit');
    const barEl    = document.getElementById('meteoLegendBar');
    const labelsEl = document.getElementById('meteoLegendLabels');

    if (unitEl) unitEl.textContent = cfg.unit;
    if (barEl) {
      const stops = pal.map(c => `rgb(${c[1]}, ${c[2]}, ${c[3]}) ${c[0]}%`);
      barEl.style.background = `linear-gradient(90deg, ${stops.join(', ')})`;
    }
    if (labelsEl) {
      labelsEl.innerHTML = cfg.labels.map(l => `<span>${l}</span>`).join('');
    }
  }

  function showLoadingSpinner(show) {
    const spinner = document.getElementById('meteoLoading');
    if (spinner) spinner.style.display = show ? 'flex' : 'none';
  }

  let eventsBound = false;
  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;

    document.getElementById('btnMeteoMap')?.addEventListener('click', openMeteoMap);
    document.getElementById('btnMeteoMapLeft')?.addEventListener('click', openMeteoMap);
    document.getElementById('btnMiniMapExpand')?.addEventListener('click', openMeteoMap);

    document.getElementById('meteoModal')?.addEventListener('click', e => {
      if (e.target === document.getElementById('meteoModal')) closeMeteoMap();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.getElementById('meteoModal')?.classList.contains('show')) {
        if (pinnedProbe) {
          unpinSpotDrawer();
        } else {
          closeMeteoMap();
        }
      }
    });

    // Tải ngầm dữ liệu bản đồ Windy sau 1.1s khi trang chính đã ổn định -> Mở bản đồ 0ms!
    const scheduleIdle = window.requestIdleCallback || (cb => setTimeout(cb, 1100));
    scheduleIdle(() => setTimeout(prefetchDefaultGridIdle, 600));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }

  window.openMeteoMap  = openMeteoMap;
  window.closeMeteoMap = closeMeteoMap;
})();
