/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  AUTHENTIC WINDY.COM METEOROLOGICAL MAP ENGINE v8.0 (ULTRA-CLEAR EDITION)
 *  ─ Dual-Stroke Vector Coastlines & Borders (Visible on Both Dark & Bright Colors!)
 *  ─ Balanced Translucent Weather Heatmap Over Clean Terrain (Zero Watermarks!)
 *  ─ Quick Region Switcher: Toàn Việt Nam, Bắc Bộ, Trung Bộ, Nam Bộ, Biển Đông, ĐNÁ
 *  ─ 56 Vietnam Provinces/Islands & Asian Cities with High-Contrast Value Pills
 *  ─ Subtle, Airy 60 FPS Wind Streamlines + On-Map Windy Flag Picker
 *  ─ 100% Real Open-Meteo 169-Point Grid + 56-Station Multi-Batch API
 * ═══════════════════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
     CONSTANTS & CONFIGURATION
  ══════════════════════════════════════════════════════════════ */
  const DEG2RAD      = Math.PI / 180;
  const RAD2DEG      = 180 / Math.PI;
  const GRID_ROWS    = 13; // 13 x 13 = 169 real Open-Meteo grid points
  const GRID_COLS    = 13;
  const RASTER_SCALE = 4;
  const LUT_SIZE     = 1024;

  /* Các vùng xem nhanh giúp quan sát Việt Nam & khu vực cực kỳ thuận tiện */
  const QUICK_REGIONS = [
    { id: 'vn',      label: '🇻🇳 Toàn Việt Nam', lat: 16.10, lon: 107.20, zoom: 6 },
    { id: 'north',   label: '⛰️ Bắc Bộ',        lat: 21.25, lon: 105.65, zoom: 7 },
    { id: 'central', label: '🌊 Trung Bộ',      lat: 15.65, lon: 108.05, zoom: 7 },
    { id: 'south',   label: '🌴 Nam Bộ',        lat: 10.35, lon: 105.85, zoom: 7 },
    { id: 'sea',     label: '🏝️ Biển Đông',     lat: 13.50, lon: 112.20, zoom: 6 },
    { id: 'asia',    label: '🌏 Đông Nam Á',    lat: 15.20, lon: 106.50, zoom: 5 }
  ];

  /* 56 Tỉnh thành, Hải đảo Việt Nam & Thành phố Châu Á (100% Dữ liệu thực Open-Meteo) */
  const NOTABLE_CITIES = [
    // Việt Nam - Trọng điểm & Quần đảo tiền tiêu (Priority 1 - Luôn ưu tiên hiển thị)
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
    // Việt Nam - Tỉnh thành miền Bắc (Priority 2 & 3)
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
    // Việt Nam - Miền Trung & Tây Nguyên (Priority 2 & 3)
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
    // Việt Nam - Miền Nam (Priority 2 & 3)
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
    // Quốc tế lân cận
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

  /* Nhãn Quốc gia & Vùng biển tinh tế */
  const GEO_REGIONS = [
    { name: 'VIỆT NAM',      lat: 16.3, lon: 107.6, type: 'country', minZoom: 4 },
    { name: 'BIỂN ĐÔNG',     lat: 14.0, lon: 113.8, type: 'sea',     minZoom: 4 },
    { name: 'VỊNH BẮC BỘ',   lat: 19.7, lon: 107.5, type: 'sea',     minZoom: 5 },
    { name: 'VỊNH THÁI LAN', lat: 9.6,  lon: 102.0, type: 'sea',     minZoom: 5 },
    { name: 'LÀO',           lat: 19.2, lon: 103.3, type: 'country', minZoom: 4 },
    { name: 'CAMPUCHIA',     lat: 12.7, lon: 104.9, type: 'country', minZoom: 4 },
    { name: 'THÁI LAN',      lat: 15.6, lon: 101.0, type: 'country', minZoom: 4 },
    { name: 'ĐẢO HẢI NAM',   lat: 19.1, lon: 109.7, type: 'island',  minZoom: 5 },
    { name: 'PHILIPPINES',   lat: 12.8, lon: 122.2, type: 'country', minZoom: 4 },
    { name: 'ĐÀI LOAN',      lat: 23.7, lon: 121.0, type: 'island',  minZoom: 4 }
  ];

  /* ══════════════════════════════════════════════════════════════
     BALANCED TRANSLUCENT WINDY.COM COLOR PALETTES (SÁNG RÕ, DỊU MẮT)
  ══════════════════════════════════════════════════════════════ */
  const COLOR_PALETTES = {
    temp: [
      [0,   68,  78,  175, 138], // <= 0°C  (Tím lam)
      [18,  52,  112, 198, 136], // ~7°C    (Xanh chàm)
      [34,  45,  156, 192, 135], // ~14°C   (Xanh ngọc)
      [48,  58,  182, 138, 136], // ~19°C   (Xanh lục lam mát)
      [62,  96,  188, 76,  138], // ~25°C   (Xanh lá dịu)
      [74,  202, 182, 56,  144], // ~29°C   (Vàng lục ấm)
      [86,  232, 128, 42,  152], // ~34°C   (Cam hổ phách)
      [100, 205, 42,  52,  164]  // >= 40°C (Đỏ thẫm)
    ],
    wind: [
      [0,   58,  115, 178, 108], // Gió nhẹ
      [16,  48,  162, 178, 128], // ~10 km/h
      [32,  75,  188, 108, 142], // ~20 km/h
      [50,  198, 190, 52,  154], // ~32 km/h
      [68,  235, 118, 42,  168], // ~45 km/h
      [85,  218, 48,  78,  182], // ~58 km/h
      [100, 175, 38,  188, 198]  // Bão > 70 km/h
    ],
    rain: [
      [0,   0,   0,   0,   0],   // Không mưa: Trong suốt 100% để thấy rõ địa hình!
      [4,   56,  152, 225, 115], // Mưa nhỏ 0.5mm
      [18,  42,  188, 205, 148], // 2mm
      [40,  62,  202, 96,  166], // 5mm
      [66,  228, 195, 45,  182], // 8mm
      [85,  235, 92,  38,  196], // 11mm
      [100, 195, 38,  205, 210]  // Mưa rất to > 14mm
    ],
    cloud: [
      [0,   0,   0,   0,   0],
      [25,  125, 152, 182, 72],
      [55,  162, 182, 204, 122],
      [80,  198, 212, 226, 158],
      [100, 235, 242, 250, 188]
    ],
    pressure: [
      [0,   202, 48,  92,  152],
      [28,  225, 132, 52,  144],
      [50,  62,  162, 196, 136],
      [75,  72,  188, 122, 144],
      [100, 108, 88,  215, 158]
    ],
    humidity: [
      [0,   218, 135, 48,  138],
      [35,  208, 192, 62,  138],
      [62,  72,  186, 136, 146],
      [82,  48,  142, 208, 156],
      [100, 72,  78,  198, 168]
    ]
  };

  const LAYER_RANGES = {
    temp:     { min: 0,   max: 40,   unit: '°C',   field: 'temp',     labels: ['0', '8', '16', '24', '32', '40'] },
    wind:     { min: 0,   max: 70,   unit: 'km/h', field: 'ws',       labels: ['0', '15', '30', '45', '60', '70+'] },
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
  let mapInstance    = null;
  let colorCanvas    = null;
  let colorCtx       = null;
  let topCanvas      = null;
  let topCtx         = null;
  let animFrameId    = null;

  let offscreenRasterCanvas = null;
  let offscreenRasterCtx    = null;
  let trailCanvas           = null;
  let trailCtx              = null;

  let currentLayer   = 'temp';
  let currentBasemap = 'terrain'; // 'terrain' | 'street' | 'satellite'
  let tileLayers     = {};
  let borderHaloLayer = null;
  let borderCoreLayer = null;

  let showParticles  = true;
  let showIsobars    = false;
  let showCityLabels = true;

  // Mặc định mở bản đồ đóng khung TOÀN VIỆT NAM & BIỂN ĐÔNG ở chính giữa màn hình (Zoom 6) để dễ quan sát nhất!
  let centerLat = 16.10, centerLon = 107.20;
  let gridLatMin = -2, gridLatMax = 34, gridLonMin = 86, gridLonMax = 128;
  let lastFetchedBounds = null;
  let fetchDebounceTimer = null;

  let rawGridNodes     = [];
  let meteoGrid        = [];
  let rawCityNodes     = [];
  let cityWeatherCache = [];
  let activeCityBadges = [];

  let numParticles = 700;
  let pX, pY, pAge, pLife;

  let windGridCols = 0, windGridRows = 0, windGridStep = 12;
  let screenGridU = null, screenGridV = null, screenGridSpd = null;

  let isTimelinePlaying  = false;
  let timelineHourOffset = 0;
  let timelinePos        = 0;
  let lastTimestamp      = 0;
  let isMapMoving        = false;

  let probeCoords   = null;
  let pinnedProbe   = null;
  let spotAbortCtrl = null;

  buildAllColorLUTs(1.0);

  /* ══════════════════════════════════════════════════════════════
     OPEN / CLOSE
  ══════════════════════════════════════════════════════════════ */
  function openMeteoMap() {
    const modal = document.getElementById('meteoModal');
    if (!modal) return;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    if (!mapInstance) {
      // Khởi tạo góc nhìn mặc định bao trọn Toàn Việt Nam & Biển Đông ở chính giữa
      centerLat = 16.10;
      centerLon = 107.20;
      requestAnimationFrame(() => {
        initLeafletMap();
        injectWindyControls();
        loadDualStrokeVectorBorders();
        setTimeout(() => {
          if (mapInstance) {
            mapInstance.invalidateSize();
            resizeCanvases();
            fetchMeteorologicalData(true);
          }
        }, 60);
      });
    } else {
      setTimeout(() => {
        if (!mapInstance) return;
        mapInstance.invalidateSize();
        resizeCanvases();
        const needRefetch = !lastFetchedBounds ||
          (Date.now() - lastFetchedBounds.ts > 10 * 60 * 1000);
        if (needRefetch) {
          fetchMeteorologicalData(true);
        } else {
          rebuildScreenCaches();
          startRenderEngine();
        }
      }, 50);
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
     HIGH-CLARITY TERRAIN BASEMAP + DUAL-STROKE VECTOR BORDERS
  ══════════════════════════════════════════════════════════════ */
  function initLeafletMap() {
    const mapEl = document.getElementById('meteoLeafletMap');
    if (!mapEl || !window.L) return;

    mapInstance = L.map(mapEl, {
      center: [centerLat, centerLon],
      zoom: 6,
      minZoom: 3,
      maxZoom: 12,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
      preferCanvas: true
    });

    // Thứ tự 4 lớp hiển thị trong suốt, không làm tối bản đồ:
    // 1. tilePane (z=200): Bản đồ Địa hình Sáng Esri Topo / Physical Relief (100% không watermark!)
    // 2. windyColorPane (z=380): Lớp màu thời tiết bán trong suốt (alpha ~0.55) giúp thấy rõ cả màu nhiệt lẫn địa hình bên dưới
    // 3. windyBordersPane (z=420): Đường bờ biển & biên giới 2 lớp (Dual-Stroke: viền sáng + lõi đậm) nổi bật trên mọi màu nền!
    // 4. windyTopPane (z=450): Hạt gió mảnh + Nhãn tỉnh thành kèm viên thuốc nhiệt độ + Cờ đo thời tiết
    mapInstance.createPane('windyColorPane');
    mapInstance.getPane('windyColorPane').style.zIndex = 380;
    mapInstance.getPane('windyColorPane').style.pointerEvents = 'none';

    mapInstance.createPane('windyBordersPane');
    mapInstance.getPane('windyBordersPane').style.zIndex = 420;
    mapInstance.getPane('windyBordersPane').style.pointerEvents = 'none';

    mapInstance.createPane('windyTopPane');
    mapInstance.getPane('windyTopPane').style.zIndex = 450;
    mapInstance.getPane('windyTopPane').style.pointerEvents = 'none';

    // 1. Nền Địa hình Sáng rõ Esri World Topo Map (Thấy rõ núi đồi, sông ngòi, biển đảo & ranh giới tỉnh)
    tileLayers.terrain = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    );

    // 2. Nền Đường sá & Hành chính (Esri Street Map)
    tileLayers.street = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    );

    // 3. Nền Vệ tinh (Esri World Imagery)
    tileLayers.satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    );

    // 4. Lớp ranh giới & tên địa danh quốc tế sắc nét nằm TRÊN lớp màu
    tileLayers.refBoundaries = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, pane: 'windyBordersPane', opacity: 0.72 }
    );

    tileLayers.terrain.addTo(mapInstance);
    tileLayers.refBoundaries.addTo(mapInstance);

    colorCanvas = document.getElementById('meteoCanvas');
    topCanvas   = document.getElementById('meteoTopCanvas');
    colorCtx    = colorCanvas.getContext('2d');
    topCtx      = topCanvas.getContext('2d');

    mapInstance.getPane('windyColorPane').appendChild(colorCanvas);
    mapInstance.getPane('windyTopPane').appendChild(topCanvas);

    colorCanvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
    topCanvas.style.cssText   = 'position:absolute;top:0;left:0;pointer-events:none;';

    mapInstance.on('movestart zoomstart', () => {
      isMapMoving = true;
      clearTrailBuffer();
      if (topCtx && topCanvas) topCtx.clearRect(0, 0, topCanvas.width, topCanvas.height);
    });

    mapInstance.on('move', () => {
      if (!mapInstance) return;
      const topLeft = mapInstance.containerPointToLayerPoint([0, 0]);
      if (colorCanvas) L.DomUtil.setPosition(colorCanvas, topLeft);
      if (topCanvas) L.DomUtil.setPosition(topCanvas, topLeft);
    });

    mapInstance.on('moveend zoomend resize', () => {
      isMapMoving = false;
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
        fetchDebounceTimer = setTimeout(() => fetchMeteorologicalData(false), 350);
      }
    });

    resizeCanvases();
    mapEl.addEventListener('mousemove', handleMapHover);
    mapEl.addEventListener('mouseleave', () => {
      probeCoords = null;
      const tip = document.getElementById('meteoTooltip');
      if (tip) tip.style.display = 'none';
    });
    mapEl.addEventListener('click', handleMapClick);
  }

  // Đường bờ biển & biên giới 2 lớp (Dual-Stroke: Halo trắng mảnh + Lõi than đậm) giúp nổi bật 100% trên mọi nền màu!
  async function loadDualStrokeVectorBorders() {
    if (!mapInstance || borderCoreLayer) return;
    const urls = [
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson',
      'https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json'
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const geojson = await res.json();

        // Lớp 1: Viền sáng bảo vệ (Halo)
        borderHaloLayer = L.geoJSON(geojson, {
          pane: 'windyBordersPane',
          interactive: false,
          style: {
            color: 'rgba(255, 255, 255, 0.55)',
            weight: 2.6,
            fill: false
          }
        }).addTo(mapInstance);

        // Lớp 2: Đường bờ biển & biên giới lõi đậm sắc nét
        borderCoreLayer = L.geoJSON(geojson, {
          pane: 'windyBordersPane',
          interactive: false,
          style: {
            color: '#0f172a',
            weight: 1.25,
            opacity: 0.88,
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
    computeWindGrid();
    buildOffscreenColorRaster();
    renderColorCanvasOnce();
    clearTrailBuffer();
  }

  function setBasemap(type) {
    if (!mapInstance) return;
    currentBasemap = type;

    ['terrain', 'street', 'satellite'].forEach(k => {
      if (tileLayers[k] && mapInstance.hasLayer(tileLayers[k])) {
        mapInstance.removeLayer(tileLayers[k]);
      }
    });

    if (type === 'satellite') {
      tileLayers.satellite.addTo(mapInstance);
      buildAllColorLUTs(0.82);
    } else if (type === 'street') {
      tileLayers.street.addTo(mapInstance);
      buildAllColorLUTs(0.92);
    } else {
      tileLayers.terrain.addTo(mapInstance);
      buildAllColorLUTs(1.0);
    }

    buildOffscreenColorRaster();
    renderColorCanvasOnce();
  }

  /* ══════════════════════════════════════════════════════════════
     AUTHENTIC WINDY.COM FLOATING UI & QUICK VIETNAM REGION BAR
  ══════════════════════════════════════════════════════════════ */
  function injectWindyControls() {
    const wrap = document.querySelector('.meteo-map-wrap');
    if (!wrap) return;

    // 1. Top-Left: Thanh Tìm kiếm trắng + Dải nút Chuyển vùng nhanh Việt Nam
    if (!wrap.querySelector('.windy-top-left')) {
      const tlBox = document.createElement('div');
      tlBox.className = 'windy-top-left';

      const regionBtns = QUICK_REGIONS.map((r, i) =>
        `<button type="button" class="wqr-btn${i === 0 ? ' active' : ''}" data-region="${r.id}">${r.label}</button>`
      ).join('');

      tlBox.innerHTML = `
        <div class="windy-search-pill">
          <span class="wsp-icon">🔍</span>
          <input type="search" id="meteoSearchInput" placeholder="Tìm tỉnh thành, đảo, tọa độ..." autocomplete="off" />
          <button type="button" id="meteoLocateBtn" class="wsp-gps" title="Định vị GPS của tôi">◎</button>
        </div>
        <div class="windy-quick-regions" id="windyQuickRegions">${regionBtns}</div>
      `;
      wrap.appendChild(tlBox);

      const sInp = tlBox.querySelector('#meteoSearchInput');
      sInp?.addEventListener('keydown', async e => {
        if (e.key === 'Enter' && sInp.value.trim()) {
          const q = sInp.value.trim();
          sInp.disabled = true;
          try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=vi&format=json`);
            const data = res.ok ? await res.json() : null;
            if (data?.results?.[0]) {
              const loc = data.results[0];
              flyToAndInspect(loc.latitude, loc.longitude, `${loc.name}${loc.admin1 ? ', ' + loc.admin1 : ''}`);
            }
          } catch (_) {}
          sInp.disabled = false;
        }
      });

      tlBox.querySelector('#meteoLocateBtn')?.addEventListener('click', () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(pos => {
          flyToAndInspect(pos.coords.latitude, pos.coords.longitude, 'Vị trí GPS của bạn');
        });
      });

      tlBox.querySelectorAll('.wqr-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          tlBox.querySelectorAll('.wqr-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const reg = QUICK_REGIONS.find(r => r.id === btn.dataset.region);
          if (reg && mapInstance) {
            mapInstance.flyTo([reg.lat, reg.lon], reg.zoom, { duration: 0.75 });
          }
        });
      });
    }

    // 2. Top-Right: Đổi bản đồ nền + Phóng to/Thu nhỏ + Đóng
    if (!wrap.querySelector('.windy-top-right')) {
      const tr = document.createElement('div');
      tr.className = 'windy-top-right';
      tr.innerHTML = `
        <div class="meteo-basemap-toggle" id="meteoBasemapToggle">
          <button class="bm-btn active" data-map="terrain" title="Nền Địa hình Sáng chuẩn Windy">🗺️ Địa hình</button>
          <button class="bm-btn" data-map="street" title="Bản đồ Đường sá & Hành chính">🛣️ Đường sá</button>
          <button class="bm-btn" data-map="satellite" title="Ảnh Vệ tinh">🛰️ Vệ tinh</button>
        </div>
        <button class="windy-zoom-btn" id="windyZoomIn" title="Phóng to">+</button>
        <button class="windy-zoom-btn" id="windyZoomOut" title="Thu nhỏ">−</button>
        <button class="meteo-close-btn" id="meteoCloseBtnFloating" title="Đóng bản đồ (Esc)">✕</button>
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

    // 3. Right-Side Layer Menu (Chữ nổi bên trái + Nút tròn màu bên phải giống Windy.com)
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

    // Bottom-Right Toggles
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

    // 4. Spot Forecast Card
    if (!wrap.querySelector('#meteoSpotCard')) {
      const spot = document.createElement('div');
      spot.id = 'meteoSpotCard';
      spot.className = 'meteo-spot-card hidden';
      wrap.appendChild(spot);
    }

    // 5. Bottom-Left Windy Play + Multi-Day Timeline Strip
    if (!wrap.querySelector('.windy-timeline')) {
      const tl = document.createElement('div');
      tl.className = 'windy-timeline';
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

      scrubTrack?.addEventListener('mousedown', e => {
        isScrubbing = true;
        handleScrub(e.clientX);
      });
      window.addEventListener('mousemove', e => {
        if (isScrubbing) handleScrub(e.clientX);
      });
      window.addEventListener('mouseup', () => {
        isScrubbing = false;
      });

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
    mapInstance.flyTo([lat, lon], 7, { duration: 0.8 });
    setTimeout(() => {
      pinLocationAndFetchRealSpot(lat, lon, label);
    }, 850);
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
      <button class="wtl-play-circle" id="wtlPlay" title="Phát dự báo 72 giờ thực tế">▶</button>
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
    updateActiveTimeSlice(timelineHourOffset);
    computeWindGrid();
    buildOffscreenColorRaster();
    renderColorCanvasOnce();
  }

  /* ══════════════════════════════════════════════════════════════
     HIGH-RES 13x13 (169 POINTS) + 56 REAL STATIONS BATCH FETCH
  ══════════════════════════════════════════════════════════════ */
  async function fetchMeteorologicalData(showSpinner = true) {
    if (showSpinner) showLoadingSpinner(true);

    const latSpan = 34;
    const lonSpan = 42;
    gridLatMin = Math.max(-70, centerLat - latSpan / 2);
    gridLatMax = Math.min(70, centerLat + latSpan / 2);
    gridLonMin = centerLon - lonSpan / 2;
    gridLonMax = centerLon + lonSpan / 2;

    const samplePoints = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      const lat = gridLatMin + (r / (GRID_ROWS - 1)) * (gridLatMax - gridLatMin);
      for (let c = 0; c < GRID_COLS; c++) {
        const lon = gridLonMin + (c / (GRID_COLS - 1)) * (gridLonMax - gridLonMin);
        samplePoints.push({ r, c, lat: Number(lat.toFixed(2)), lon: Number(lon.toFixed(2)) });
      }
    }

    const c1 = samplePoints.slice(0, 57);
    const c2 = samplePoints.slice(57, 114);
    const c3 = samplePoints.slice(114);

    const buildBatchUrl = pts => {
      const lats = pts.map(p => p.lat).join(',');
      const lons = pts.map(p => p.lon).join(',');
      return `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code&hourly=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,cloud_cover,wind_speed_10m,wind_direction_10m&forecast_days=4&timezone=auto`;
    };

    try {
      const [r1, r2, r3, rCities] = await Promise.all([
        fetch(buildBatchUrl(c1)).then(r => r.ok ? r.json() : null),
        fetch(buildBatchUrl(c2)).then(r => r.ok ? r.json() : null),
        fetch(buildBatchUrl(c3)).then(r => r.ok ? r.json() : null),
        fetch(buildBatchUrl(NOTABLE_CITIES)).then(r => r.ok ? r.json() : null)
      ]);

      const toArr = x => Array.isArray(x) ? x : (x ? [x] : []);
      const combined = [...toArr(r1), ...toArr(r2), ...toArr(r3)];

      if (combined.length === samplePoints.length) {
        rawGridNodes = samplePoints.map((pt, idx) => parseOpenMeteoNode(pt, combined[idx]));
        lastFetchedBounds = { lat: centerLat, lon: centerLon, ts: Date.now() };
      }

      const cityArr = toArr(rCities);
      if (cityArr.length === NOTABLE_CITIES.length) {
        rawCityNodes = NOTABLE_CITIES.map((city, idx) => ({
          ...city,
          node: parseOpenMeteoNode(city, cityArr[idx])
        }));
      }

      updateActiveTimeSlice(timelineHourOffset);
      computeWindGrid();
      if (!pX) initParticles();
      buildOffscreenColorRaster();
      renderColorCanvasOnce();
      showLoadingSpinner(false);
      startRenderEngine();
    } catch (err) {
      console.error('Lỗi tải dữ liệu lưới Open-Meteo:', err);
      showLoadingSpinner(false);
    }
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
        ws: cur.wind_speed_10m ?? hr.wind_speed_10m?.[baseIdx] ?? 12,
        wd: cur.wind_direction_10m ?? hr.wind_direction_10m?.[baseIdx] ?? 90,
        gust: cur.wind_gusts_10m ?? (cur.wind_speed_10m ? cur.wind_speed_10m * 1.3 : 16),
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

    return { lat: node.lat, lon: node.lon, temp, humidity, rain, pressure, cloud, ws, wd, code: node.current.code, wu, wv };
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
        for (let i = 0; i < cityWeatherCache.length; i++) {
          const st = cityWeatherCache[i];
          const d2 = (st.lat - base.lat) * (st.lat - base.lat) + (st.lon - base.lon) * (st.lon - base.lon);
          if (d2 < 3.0) {
            const w = Math.exp(-d2 / 0.85) * 0.7;
            wSum += w;
            tSum += st.tempExact * w;
            rSum += st.rain * w;
          }
        }
        base.temp = tSum / wSum;
        base.rain = rSum / wSum;
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
     SMOOTH COLOR HEATMAP RASTER
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
     DELICATE, AIRY WINDY.COM STREAMLINES
  ══════════════════════════════════════════════════════════════ */
  function initParticles() {
    const W = (topCanvas && topCanvas.width) || 1280;
    const H = (topCanvas && topCanvas.height) || 720;

    numParticles = Math.max(380, Math.min(820, Math.round((W * H) / 2100)));

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
    pAge[i]  = initial ? Math.random() * 60 : 0;
    pLife[i] = 42 + Math.random() * 42;
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

    // 1. Hạt gió thanh mảnh, thưa thoáng kiểu Windy.com
    if (showParticles && trailCtx && trailCanvas && !isMapMoving) {
      trailCtx.save();
      trailCtx.globalCompositeOperation = 'destination-in';
      trailCtx.fillStyle = 'rgba(0, 0, 0, 0.83)';
      trailCtx.fillRect(0, 0, W, H);
      trailCtx.restore();

      const zoom = mapInstance ? mapInstance.getZoom() : 6;
      const zoomScale = Math.max(0.5, Math.min(1.35, Math.pow(1.08, zoom - 5)));
      const moveStep = 0.23 * zoomScale * delta;

      const pathLight  = new Path2D();
      const pathStrong = new Path2D();

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

        const spd = Math.max(2.8, w2.spd);
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
      }

      trailCtx.lineCap = 'round';

      trailCtx.lineWidth = 1.05;
      trailCtx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      trailCtx.stroke(pathLight);

      trailCtx.lineWidth = 1.35;
      trailCtx.strokeStyle = 'rgba(255, 255, 255, 0.64)';
      trailCtx.stroke(pathStrong);

      topCtx.drawImage(trailCanvas, 0, 0);
    }

    // 2. Đường đẳng áp thực
    if ((showIsobars || currentLayer === 'pressure') && !isMapMoving) {
      drawRealMarchingSquaresIsobars(W, H);
    }

    // 3. Nhãn tên Quốc gia & Vùng biển
    if (!isMapMoving) {
      drawGeographicWatermarks(W, H);
    }

    // 4. Nhãn Tỉnh thành & Viên thuốc nhiệt độ tương phản cao
    if (showCityLabels && !isMapMoving) {
      drawWindyStyleCityLabels(W, H);
    }

    // 5. Cờ đo thời tiết tại điểm ghim (Windy Weather Picker Flag)
    drawWeatherProbeMarker();

    animFrameId = requestAnimationFrame(renderLoop);
  }

  function drawGeographicWatermarks(W, H) {
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
      topCtx.lineJoin = 'round';
      topCtx.lineWidth = 2.6;
      topCtx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
      topCtx.strokeText(reg.name, pt.x, pt.y);
      topCtx.fillStyle = reg.type === 'sea' ? 'rgba(224, 242, 254, 0.72)' : 'rgba(255, 255, 255, 0.68)';
      topCtx.fillText(reg.name, pt.x, pt.y);
    });

    topCtx.restore();
  }

  /* ══════════════════════════════════════════════════════════════
     HIGH-CLARITY CITY LABELS WITH COMPACT VALUE PILL
     (Tên địa danh chữ trắng viền đậm + Viên thuốc số liệu vàng/cyan tách biệt rõ ràng!)
  ══════════════════════════════════════════════════════════════ */
  function drawWindyStyleCityLabels(W, H) {
    if (!mapInstance || !topCtx || !cityWeatherCache.length) return;
    const zoom = mapInstance.getZoom();
    const occupied = [];
    activeCityBadges = [];

    topCtx.save();
    topCtx.lineJoin = 'round';
    topCtx.miterLimit = 2;

    cityWeatherCache.forEach(city => {
      if (city.priority === 3 && zoom < 7) return;
      if (city.priority === 2 && zoom < 5) return;

      const pt = mapInstance.latLngToContainerPoint([city.lat, city.lon]);
      if (pt.x < 45 || pt.x > W - 105 || pt.y < 52 || pt.y > H - 75) return;

      let valStr = `${city.temp}°`;
      let valColor = '#fde047'; // Vàng sáng nổi bật cho nhiệt độ
      if (currentLayer === 'wind') {
        valStr = `${city.wind}km/h`;
        valColor = '#38bdf8';
      } else if (currentLayer === 'rain') {
        valStr = city.rain > 0.05 ? `${city.rain.toFixed(1)}mm` : `${city.temp}°`;
        valColor = city.rain > 0.05 ? '#7dd3fc' : '#fde047';
      } else if (currentLayer === 'pressure') {
        valStr = `${city.pressure}`;
        valColor = '#e9d5ff';
      } else if (currentLayer === 'humidity') {
        valStr = `${city.humidity}%`;
        valColor = '#6ee7b7';
      } else if (currentLayer === 'cloud') {
        valStr = `${city.cloud}%`;
        valColor = '#e2e8f0';
      }

      topCtx.font = '700 11.5px "Be Vietnam Pro", -apple-system, sans-serif';
      const nameW = topCtx.measureText(city.n).width;
      topCtx.font = '800 10.5px "Be Vietnam Pro", -apple-system, sans-serif';
      const valW  = topCtx.measureText(valStr).width + 10;

      const totalW = Math.max(nameW, valW) + 8;
      const totalH = 34;
      const boxX   = pt.x - totalW / 2;
      const boxY   = pt.y - 28;

      const pad = zoom >= 7 ? 4 : zoom >= 6 ? 7 : 11;
      const collides = occupied.some(b =>
        boxX - pad < b.x + b.w &&
        boxX + totalW + pad > b.x &&
        boxY - pad < b.y + b.h &&
        boxY + totalH + pad > b.y
      );
      if (collides) return;

      occupied.push({ x: boxX, y: boxY, w: totalW, h: totalH });
      activeCityBadges.push({ city, x: boxX - 4, y: boxY - 4, w: totalW + 8, h: totalH + 10 });

      // 1. Chấm tròn màu tại đúng tọa độ địa lý
      let dotColor = '#22c55e';
      if (city.rain >= 0.3 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(city.code)) {
        dotColor = '#38bdf8';
      } else if (city.wind >= 28 || city.temp >= 34) {
        dotColor = '#f59e0b';
      } else if (city.isIsland) {
        dotColor = '#2dd4bf';
      }

      topCtx.beginPath();
      topCtx.arc(pt.x, pt.y + 3, 3.2, 0, Math.PI * 2);
      topCtx.fillStyle = dotColor;
      topCtx.fill();
      topCtx.lineWidth = 1.3;
      topCtx.strokeStyle = '#0f172a';
      topCtx.stroke();

      // 2. Tên thành phố (Chữ trắng viền đen sắc nét phía trên)
      topCtx.font = city.priority === 1
        ? '700 11.5px "Be Vietnam Pro", -apple-system, sans-serif'
        : '600 11px "Be Vietnam Pro", -apple-system, sans-serif';
      topCtx.textAlign = 'center';
      topCtx.textBaseline = 'bottom';
      topCtx.lineWidth = 3.2;
      topCtx.strokeStyle = 'rgba(10, 15, 28, 0.92)';
      topCtx.strokeText(city.n, pt.x, pt.y - 13);
      topCtx.fillStyle = city.isIsland ? '#bae6fd' : '#ffffff';
      topCtx.fillText(city.n, pt.x, pt.y - 13);

      // 3. Viên thuốc nhỏ gọn chứa nhiệt độ / tốc độ gió ngay dưới tên thành phố (Cực dễ đọc, không lẫn với hạt gió!)
      const pillW = valW;
      const pillH = 14;
      const pillX = pt.x - pillW / 2;
      const pillY = pt.y - 13;

      topCtx.beginPath();
      if (topCtx.roundRect) {
        topCtx.roundRect(pillX, pillY, pillW, pillH, 7);
      } else {
        topCtx.rect(pillX, pillY, pillW, pillH);
      }
      topCtx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      topCtx.fill();
      topCtx.lineWidth = 0.8;
      topCtx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      topCtx.stroke();

      topCtx.font = '800 10.5px "Be Vietnam Pro", -apple-system, sans-serif';
      topCtx.textBaseline = 'middle';
      topCtx.fillStyle = valColor;
      topCtx.fillText(valStr, pt.x, pillY + pillH / 2 + 0.5);
    });

    topCtx.restore();
  }

  /* ══════════════════════════════════════════════════════════════
     MARCHING SQUARES ISOBAR CONTOURS
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
    topCtx.lineWidth = 1.2;

    levels.forEach(level => {
      const isMajor = level === 1012 || level % 8 === 0;
      topCtx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.4)';

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

    topCtx.restore();
  }

  /* ══════════════════════════════════════════════════════════════
     INTERACTIVE WEATHER PICKER FLAG & LIVE REAL SPOT FORECAST
  ══════════════════════════════════════════════════════════════ */
  function handleMapHover(e) {
    if (!mapInstance || !topCanvas || isMapMoving) return;
    const rect = topCanvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const latlng = mapInstance.containerPointToLatLng([px, py]);
    probeCoords = { px, py, lat: latlng.lat, lon: latlng.lng };
    updateHoverTooltip(probeCoords);
  }

  function handleMapClick(e) {
    if (!mapInstance || !topCanvas) return;
    const rect = topCanvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const hitBadge = activeCityBadges.find(b => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h);
    if (hitBadge) {
      pinLocationAndFetchRealSpot(hitBadge.city.lat, hitBadge.city.lon, hitBadge.city.n);
      return;
    }

    const latlng = mapInstance.containerPointToLatLng([px, py]);
    pinLocationAndFetchRealSpot(latlng.lat, latlng.lng, null);
  }

  function drawWeatherProbeMarker() {
    if (!topCtx || !mapInstance || !pinnedProbe) return;

    const pt = mapInstance.latLngToContainerPoint([pinnedProbe.lat, pinnedProbe.lon]);
    const wind = sampleWindVector(pinnedProbe.lat, pinnedProbe.lon);
    const temp = sampleGridScalarO1(pinnedProbe.lat, pinnedProbe.lon, 'temp').toFixed(1);

    topCtx.save();

    // Vòng tròn tâm điểm đo
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

    // Cây kim & Cờ hiển thị trực tiếp tại điểm chạm (Giống hệt Weather Picker của Windy.com!)
    const flagY = pt.y - 34;
    topCtx.beginPath();
    topCtx.moveTo(pt.x, pt.y - 5);
    topCtx.lineTo(pt.x, flagY);
    topCtx.strokeStyle = '#ffffff';
    topCtx.lineWidth = 2;
    topCtx.stroke();

    const flagTxt = `${pinnedProbe.tempStr || (temp + '°C')} · 💨 ${pinnedProbe.windStr || (Math.round(wind.spd) + ' km/h')}`;
    topCtx.font = '800 11.5px "Be Vietnam Pro", sans-serif';
    const fw = topCtx.measureText(flagTxt).width + 18;
    const fh = 24;

    topCtx.beginPath();
    if (topCtx.roundRect) {
      topCtx.roundRect(pt.x - 4, flagY - fh, fw, fh, 7);
    } else {
      topCtx.rect(pt.x - 4, flagY - fh, fw, fh);
    }
    topCtx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    topCtx.fill();
    topCtx.lineWidth = 1.2;
    topCtx.strokeStyle = '#fbbf24';
    topCtx.stroke();

    topCtx.fillStyle = '#fde047';
    topCtx.textAlign = 'left';
    topCtx.textBaseline = 'middle';
    topCtx.fillText(flagTxt, pt.x + 5, flagY - fh / 2);

    topCtx.restore();
  }

  function updateHoverTooltip(probe) {
    const tip = document.getElementById('meteoTooltip');
    if (!tip) return;

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
    const y = Math.max(84, probe.py - 46);
    tip.style.left = `${x}px`;
    tip.style.top  = `${y}px`;
  }

  async function pinLocationAndFetchRealSpot(lat, lon, knownName) {
    pinnedProbe = { lat, lon };
    const spotCard = document.getElementById('meteoSpotCard');
    if (!spotCard) return;

    const coordStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
    spotCard.classList.remove('hidden');
    spotCard.innerHTML = `
      <div class="spot-header">
        <div>
          <div class="spot-title">${knownName || 'Đang đo tọa độ thực tế...'}</div>
          <div class="spot-coord">📍 ${coordStr}</div>
        </div>
        <button type="button" class="spot-close" id="btnCloseSpot" title="Đóng">✕</button>
      </div>
      <div class="spot-loading">⏳ Đang lấy dữ liệu thực Open-Meteo...</div>
    `;

    spotCard.querySelector('#btnCloseSpot')?.addEventListener('click', () => {
      pinnedProbe = null;
      spotCard.classList.add('hidden');
    });

    if (spotAbortCtrl) spotAbortCtrl.abort();
    spotAbortCtrl = new AbortController();

    try {
      const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index&hourly=temperature_2m,precipitation_probability,wind_speed_10m&forecast_days=2&timezone=auto`;
      const geoUrl = knownName
        ? null
        : `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=11&addressdetails=1&accept-language=vi`;

      const [wxRes, geoRes] = await Promise.all([
        fetch(wxUrl, { signal: spotAbortCtrl.signal }).then(r => r.ok ? r.json() : null),
        geoUrl ? fetch(geoUrl, { signal: spotAbortCtrl.signal }).then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null)
      ]);

      if (!wxRes || !wxRes.current) return;

      const addr = geoRes?.address || {};
      const resolvedName = knownName ||
        [addr.city || addr.town || addr.village || addr.county || addr.island, addr.state || addr.country]
          .filter(Boolean).slice(0, 2).join(', ') ||
        `Tọa độ (${coordStr})`;

      const c = wxRes.current;
      if (pinnedProbe) {
        pinnedProbe.tempStr = `${c.temperature_2m.toFixed(1)}°C`;
        pinnedProbe.windStr = `${Math.round(c.wind_speed_10m)} km/h`;
      }

      const dirs = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
      const dirLabel = dirs[Math.round((c.wind_direction_10m || 0) / 45) % 8];

      const hr = wxRes.hourly || {};
      let startIdx = 0;
      if (c.time && hr.time) {
        const idx = hr.time.findIndex(t => t.slice(0, 13) === c.time.slice(0, 13));
        if (idx !== -1) startIdx = idx;
      }
      const miniHours = [];
      for (let i = 0; i < 18; i += 3) {
        const hi = startIdx + i;
        if (!hr.time?.[hi]) break;
        miniHours.push(`
          <div class="spot-h-item">
            <span>${i === 0 ? 'Bây giờ' : hr.time[hi].slice(11, 16)}</span>
            <strong>${Math.round(hr.temperature_2m[hi])}°</strong>
            <small>💨${Math.round(hr.wind_speed_10m[hi])}</small>
          </div>
        `);
      }

      spotCard.innerHTML = `
        <div class="spot-header">
          <div>
            <div class="spot-title">📍 ${resolvedName}</div>
            <div class="spot-coord">${coordStr} · Dữ liệu thực Open-Meteo</div>
          </div>
          <button type="button" class="spot-close" id="btnCloseSpot" title="Đóng">✕</button>
        </div>
        <div class="spot-metrics-grid">
          <div class="spot-metric">
            <span class="sm-label">🌡️ Nhiệt độ</span>
            <strong class="sm-val sm-temp">${c.temperature_2m.toFixed(1)}°C</strong>
            <small>Cảm giác ${Math.round(c.apparent_temperature)}°C</small>
          </div>
          <div class="spot-metric">
            <span class="sm-label">💨 Gió (${dirLabel})</span>
            <strong class="sm-val sm-wind">${Math.round(c.wind_speed_10m)} km/h</strong>
            <small>Giật ${Math.round(c.wind_gusts_10m || c.wind_speed_10m)} km/h</small>
          </div>
          <div class="spot-metric">
            <span class="sm-label">🌧️ Mưa & Ẩm</span>
            <strong class="sm-val">${c.precipitation.toFixed(1)} mm</strong>
            <small>Ẩm ${Math.round(c.relative_humidity_2m)}% · UV ${(c.uv_index ?? 0).toFixed(1)}</small>
          </div>
          <div class="spot-metric">
            <span class="sm-label">📊 Khí áp & Mây</span>
            <strong class="sm-val">${Math.round(c.surface_pressure)} hPa</strong>
            <small>Mây ${Math.round(c.cloud_cover)}%</small>
          </div>
        </div>
        <div class="spot-hourly-strip">${miniHours.join('')}</div>
        <div class="spot-actions">
          <button type="button" class="spot-sync-btn" id="btnSyncToMain">📊 Xem biểu đồ chi tiết 7 ngày tại trang chính</button>
        </div>
      `;

      spotCard.querySelector('#btnCloseSpot')?.addEventListener('click', () => {
        pinnedProbe = null;
        spotCard.classList.add('hidden');
      });

      spotCard.querySelector('#btnSyncToMain')?.addEventListener('click', () => {
        if (window.selectLocationFromMeteoMap) {
          window.selectLocationFromMeteoMap(lat, lon, resolvedName);
        }
        closeMeteoMap();
      });
    } catch (err) {
      if (err.name !== 'AbortError') spotCard.classList.add('hidden');
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

  function bindEvents() {
    document.getElementById('btnMeteoMap')?.addEventListener('click', openMeteoMap);
    document.getElementById('btnMeteoMapLeft')?.addEventListener('click', openMeteoMap);
    document.getElementById('meteoModal')?.addEventListener('click', e => {
      if (e.target === document.getElementById('meteoModal')) closeMeteoMap();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.getElementById('meteoModal')?.classList.contains('show')) {
        closeMeteoMap();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }

  window.openMeteoMap  = openMeteoMap;
  window.closeMeteoMap = closeMeteoMap;
})();
