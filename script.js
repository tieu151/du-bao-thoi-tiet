// Cấu hình API Thời tiết Thực tế (100% Real Data từ Open-Meteo & OpenStreetMap)
const GEOCODE_URL_OM  = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_URL     = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const NOMINATIM_URL   = 'https://nominatim.openstreetmap.org/search';

const $ = id => document.getElementById(id);
const setText = (id, txt) => { const el = $(id); if (el) el.textContent = txt; };

let map, marker, hourlyChart = null, modalChartInstance = null, modalPrecipChartInstance = null;
let currentWeatherData = null, currentAirQualityData = null, currentPlaceName = 'Hà Nội';
let activeAcAbortCtrl = null;
let activeWxAbortCtrl = null;

const CACHE_TTL_WEATHER = 10 * 60 * 1000; // 10 phút cho dữ liệu thời tiết thực
const CACHE_TTL_GEOCODE = 7 * 24 * 60 * 60 * 1000;
const CACHE_TTL_AIR     = 15 * 60 * 1000;

function lsSet(key, value, ttl) {
  try {
    localStorage.setItem(key, JSON.stringify({ value, exp: Date.now() + ttl }));
  } catch (e) {}
}

function lsGet(key) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    const { value, exp } = JSON.parse(item);
    if (Date.now() > exp) {
      localStorage.removeItem(key);
      return null;
    }
    return value;
  } catch (e) {
    return null;
  }
}

const geocodeCache    = new Map();
const weatherCache    = new Map();
const airQualityCache = new Map();
const acMemoryCache   = new Map();

function getWeatherEmoji(code, isDay = true) {
  if (code === 0) return isDay ? '☀️' : '🌙';
  if (code === 1) return isDay ? '🌤️' : '🌙';
  if (code === 2) return isDay ? '⛅' : '☁️';
  if (code === 3) return '☁️';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55].includes(code)) return '🌦️';
  if ([56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return isDay ? '🌤️' : '🌙';
}

function windDirectionArrow(deg) {
  if (deg == null || isNaN(deg)) return '';
  const dirs = ['↓ Bắc', '↙ ĐB', '← Đông', '↖ ĐN', '↑ Nam', '↗ TN', '→ Tây', '↘ TB'];
  return dirs[Math.round(deg / 45) % 8] || '';
}

function windDirectionFull(deg) {
  if (deg == null || isNaN(deg)) return 'Không rõ';
  const dirs = ['Bắc (N)', 'Đông Bắc (NE)', 'Đông (E)', 'Đông Nam (SE)', 'Nam (S)', 'Tây Nam (SW)', 'Tây (W)', 'Tây Bắc (NW)'];
  return `${dirs[Math.round(deg / 45) % 8]} (${Math.round(deg)}°)`;
}

function getAqiInfo(aqi) {
  if (aqi <= 20) return { color: '#22c55e', label: 'Tốt', desc: 'Chất lượng không khí rất tốt (Châu Âu AQI)' };
  if (aqi <= 40) return { color: '#84cc16', label: 'Khá', desc: 'Chất lượng không khí chấp nhận được' };
  if (aqi <= 60) return { color: '#eab308', label: 'Trung bình', desc: 'Nhóm nhạy cảm nên hạn chế ở ngoài lâu' };
  if (aqi <= 80) return { color: '#f97316', label: 'Kém', desc: 'Chất lượng không khí kém' };
  if (aqi <= 100) return { color: '#ef4444', label: 'Xấu', desc: 'Chất lượng không khí xấu, có hại sức khỏe' };
  return { color: '#a855f7', label: 'Nguy hại', desc: 'Cảnh báo ô nhiễm không khí nghiêm trọng' };
}

function getUvInfo(uv) {
  if (uv == null || isNaN(uv)) return { color: '#94a3b8', label: 'N/A' };
  if (uv < 3) return { color: '#22c55e', label: 'Thấp' };
  if (uv < 6) return { color: '#eab308', label: 'TB' };
  if (uv < 8) return { color: '#f97316', label: 'Cao' };
  if (uv < 11) return { color: '#ef4444', label: 'Rất cao' };
  return { color: '#a855f7', label: 'Cực đoan' };
}

function getWeatherGradient(code, isDay) {
  if ([0, 1].includes(code) && isDay) return 'linear-gradient(135deg, #38bdf8 0%, #0284c7 60%, #0369a1 100%)';
  if ([0, 1].includes(code) && !isDay) return 'linear-gradient(135deg, #0b132b 0%, #1c2541 60%, #3a506b 100%)';
  if ([2, 3].includes(code)) return isDay ? 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #1d4ed8 100%)' : 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)';
  if ([45, 48].includes(code)) return 'linear-gradient(135deg, #475569 0%, #64748b 50%, #94a3b8 100%)';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a5f 100%)';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'linear-gradient(135deg, #334155 0%, #64748b 50%, #93c5fd 100%)';
  if ([95, 96, 99].includes(code)) return 'linear-gradient(135deg, #090d16 0%, #111827 50%, #1e293b 100%)';
  return isDay ? 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' : 'linear-gradient(135deg, #0b132b 0%, #1c2541 100%)';
}

function wmoToDescription(code) {
  const codes = {
    0: 'Trời quang mây', 1: 'Ít mây, nắng đẹp', 2: 'Mây rải rác', 3: 'Nhiều mây âm u',
    45: 'Sương mù nhẹ', 48: 'Sương mù dày đặc',
    51: 'Mưa phùn nhẹ', 53: 'Mưa phùn vừa', 55: 'Mưa phùn dày',
    56: 'Mưa phùn lạnh nhẹ', 57: 'Mưa phùn lạnh nặng',
    61: 'Mưa nhỏ', 63: 'Mưa vừa', 65: 'Mưa to',
    66: 'Mưa lạnh nhẹ', 67: 'Mưa lạnh to',
    71: 'Tuyết rơi nhẹ', 73: 'Tuyết rơi vừa', 75: 'Tuyết rơi dày', 77: 'Mưa tuyết hạt',
    80: 'Mưa rào nhẹ', 81: 'Mưa rào vừa', 82: 'Mưa rào rất to',
    85: 'Tuyết rào nhẹ', 86: 'Tuyết rào dày',
    95: 'Dông sét', 96: 'Dông kèm mưa đá nhỏ', 99: 'Dông bão & mưa đá lớn'
  };
  return codes[code] ?? 'Không xác định';
}

function wmoToIcon(code, isDay = true) {
  return getWeatherEmoji(code, isDay);
}

function weatherToStyle(code, isDay) {
  const bg = getWeatherGradient(code, isDay);
  const isDark = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code) || !isDay;
  return { bg, text: isDark ? '#ffffff' : '#0b2545', isDark };
}

function initMap(lat = 21.0285, lon = 105.8542) {
  if (!map) {
    map = L.map('map', {
      zoomControl: true,
      attributionControl: false
    }).setView([lat, lon], 10);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    }).addTo(map);

    marker = L.marker([lat, lon]).addTo(map);

    map.on('click', function (e) {
      const { lat: cLat, lng: cLng } = e.latlng;
      marker.setLatLng([cLat, cLng]);
      const coordLabel = `${cLat.toFixed(3)}°N, ${cLng.toFixed(3)}°E`;
      setText('meta', `📍 Đang tải thời tiết thực tế tại ${coordLabel}...`);

      // Tải thời tiết NGAY LẬP TỨC không chờ reverse geocode để phản hồi tức thì
      fetchWeatherAndRender(cLat, cLng, `Tọa độ (${coordLabel})`);

      // Chạy song song reverse geocode để cập nhật tên địa danh chính xác
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${cLat}&lon=${cLng}&zoom=14&addressdetails=1&accept-language=vi`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!data) return;
          const placeName = shortDisplay(data) || data.display_name?.split(',').slice(0, 3).join(',').trim();
          if (placeName) {
            currentPlaceName = placeName;
            setText('location', placeName);
            setText('meta', `✅ Thời tiết thực tế tại: ${placeName}`);
          }
        })
        .catch(() => {});
    });
  } else {
    map.setView([lat, lon], Math.max(9, map.getZoom()));
    marker.setLatLng([lat, lon]);
  }
}

// Tìm kiếm địa chỉ song song cực nhanh (Open-Meteo + Nominatim)
async function lookup(q) {
  try {
    setText('meta', '🔍 Đang định vị địa điểm...');
    const cacheKey = `geo_v2_${q.toLowerCase().trim()}`;
    if (geocodeCache.has(cacheKey)) {
      const cached = geocodeCache.get(cacheKey);
      setText('meta', `✅ Đã chọn: ${cached.name}`);
      return cached;
    }
    const lsCached = lsGet(cacheKey);
    if (lsCached) {
      geocodeCache.set(cacheKey, lsCached);
      setText('meta', `✅ Đã chọn: ${lsCached.name}`);
      return lsCached;
    }

    // Chạy song song Open-Meteo Geocoding và Nominatim để không tốn thời gian chờ tuần tự
    const [omLoc, nomLoc] = await Promise.all([
      lookupOpenMeteo(q),
      lookupNominatim(q)
    ]);

    const loc = omLoc || nomLoc;
    if (!loc) {
      setText('meta', '❌ Không tìm thấy địa điểm. Hãy thử nhập tên quận/huyện/tỉnh.');
      return null;
    }

    geocodeCache.set(cacheKey, loc);
    lsSet(cacheKey, loc, CACHE_TTL_GEOCODE);
    setText('meta', `✅ Đã tải: ${loc.name}`);
    return loc;
  } catch (e) {
    setText('meta', '❌ Lỗi kết nối mạng khi tìm địa chỉ.');
    return null;
  }
}

async function lookupOpenMeteo(q) {
  try {
    const qClean = q.trim();
    const res = await fetch(`${GEOCODE_URL_OM}?name=${encodeURIComponent(qClean)}&count=6&language=vi&format=json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results?.length > 0) {
      const vnMatch = data.results.find(r => (r.country_code || '').toUpperCase() === 'VN');
      const best = vnMatch || data.results[0];
      const sub = [best.name, best.admin1, best.country].filter(Boolean);
      const uniqueSub = [...new Set(sub)];
      return {
        name: uniqueSub.slice(0, 2).join(', '),
        lat: best.latitude,
        lon: best.longitude
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function lookupNominatim(q) {
  try {
    const res = await fetch(
      `${NOMINATIM_URL}?format=json&q=${encodeURIComponent(q)}&limit=2&addressdetails=1&accept-language=vi`,
      { headers: { 'Accept-Language': 'vi' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.length) return null;
    const item = data[0];
    const shortName = shortDisplay(item) || item.display_name.split(',').slice(0, 2).join(',').trim();
    return { name: shortName, lat: parseFloat(item.lat), lon: parseFloat(item.lon) };
  } catch (e) {
    return null;
  }
}

function showSkeleton() {
  if (!currentWeatherData) {
    $('skeletonPanel')?.classList.remove('hidden');
    $('rightPanel')?.classList.add('hidden');
  } else {
    // Khi đã có giao diện, chỉ làm mờ nhẹ để chuyển đổi mượt mà tức thì, không giật layout
    const rp = $('rightPanel');
    if (rp) rp.style.opacity = '0.6';
  }
}

function hideSkeleton() {
  $('skeletonPanel')?.classList.add('hidden');
  const rp = $('rightPanel');
  if (rp) {
    rp.classList.remove('hidden');
    rp.style.opacity = '1';
  }
}

// Tìm chỉ số giờ hiện tại khớp chính xác với múi giờ địa phương từ Open-Meteo
function findCurrentHourlyIndex(weather) {
  if (!weather?.hourly?.time?.length) return 0;
  const curTimeStr = weather.current?.time || weather.current_weather?.time;
  if (curTimeStr) {
    const hourPrefix = curTimeStr.slice(0, 13); // "YYYY-MM-DDTHH"
    const idx = weather.hourly.time.findIndex(t => t.slice(0, 13) === hourPrefix);
    if (idx !== -1) return idx;
  }
  const nowMs = Date.now();
  let bestIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < weather.hourly.time.length; i++) {
    const diff = Math.abs(new Date(weather.hourly.time[i]).getTime() - nowMs);
    if (diff < minDiff) {
      minDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

async function fetchWeatherAndRender(lat, lon, placeName, forceRefresh = false) {
  const numLat = Number(lat);
  const numLon = Number(lon);
  if (isNaN(numLat) || isNaN(numLon)) return;

  currentPlaceName = placeName || currentPlaceName;
  showSkeleton();

  const cacheKeyWx = `wx_v3_${numLat.toFixed(2)},${numLon.toFixed(2)}`;
  const cacheKeyAq = `aq_v3_${numLat.toFixed(2)},${numLon.toFixed(2)}`;

  let weather = !forceRefresh ? (weatherCache.get(cacheKeyWx) || lsGet(cacheKeyWx)) : null;
  let airQuality = !forceRefresh ? (airQualityCache.get(cacheKeyAq) || lsGet(cacheKeyAq)) : null;

  try {
    if (!weather || weather.error || !weather.current) {
      if (activeWxAbortCtrl) activeWxAbortCtrl.abort();
      activeWxAbortCtrl = new AbortController();

      // Sử dụng đầy đủ trường dữ liệu thực tế từ Open-Meteo Forecast API
      const params = new URLSearchParams({
        latitude: numLat.toFixed(4),
        longitude: numLon.toFixed(4),
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'is_day',
          'precipitation',
          'rain',
          'showers',
          'snowfall',
          'weather_code',
          'cloud_cover',
          'pressure_msl',
          'surface_pressure',
          'wind_speed_10m',
          'wind_direction_10m',
          'wind_gusts_10m',
          'uv_index'
        ].join(','),
        hourly: [
          'temperature_2m',
          'relative_humidity_2m',
          'dew_point_2m',
          'apparent_temperature',
          'precipitation_probability',
          'precipitation',
          'weather_code',
          'surface_pressure',
          'cloud_cover',
          'visibility',
          'wind_speed_10m',
          'wind_direction_10m',
          'wind_gusts_10m',
          'uv_index',
          'is_day'
        ].join(','),
        minutely_15: 'precipitation',
        daily: [
          'weather_code',
          'temperature_2m_max',
          'temperature_2m_min',
          'apparent_temperature_max',
          'apparent_temperature_min',
          'sunrise',
          'sunset',
          'uv_index_max',
          'precipitation_sum',
          'precipitation_probability_max',
          'wind_speed_10m_max',
          'wind_gusts_10m_max'
        ].join(','),
        timezone: 'auto',
        forecast_days: 8
      });

      const aqParams = new URLSearchParams({
        latitude: numLat.toFixed(4),
        longitude: numLon.toFixed(4),
        current: 'european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone',
        timezone: 'auto'
      });

      const [wRes, aRes] = await Promise.all([
        fetch(`${WEATHER_URL}?${params.toString()}`, { signal: activeWxAbortCtrl.signal }),
        fetch(`${AIR_QUALITY_URL}?${aqParams.toString()}`, { signal: activeWxAbortCtrl.signal }).catch(() => null)
      ]);

      if (!wRes.ok) throw new Error(`Open-Meteo HTTP ${wRes.status}`);

      weather = await wRes.json();
      airQuality = aRes && aRes.ok ? await aRes.json() : null;

      // Chuẩn hóa tương thích cho các module khác
      if (weather.current) {
        weather.current_weather = {
          temperature: weather.current.temperature_2m,
          windspeed: weather.current.wind_speed_10m,
          winddirection: weather.current.wind_direction_10m,
          weathercode: weather.current.weather_code,
          is_day: weather.current.is_day,
          time: weather.current.time
        };
      }
      if (weather.hourly) {
        weather.hourly.weathercode = weather.hourly.weather_code || weather.hourly.weathercode;
        weather.hourly.relativehumidity_2m = weather.hourly.relative_humidity_2m;
        weather.hourly.windspeed_10m = weather.hourly.wind_speed_10m;
      }
      if (weather.daily) {
        weather.daily.weathercode = weather.daily.weather_code || weather.daily.weathercode;
        weather.daily.windspeed_10m_max = weather.daily.wind_speed_10m_max;
      }

      if (!weather.error) {
        weatherCache.set(cacheKeyWx, weather);
        lsSet(cacheKeyWx, weather, CACHE_TTL_WEATHER);
      }
      if (airQuality && !airQuality.error) {
        airQualityCache.set(cacheKeyAq, airQuality);
        lsSet(cacheKeyAq, airQuality, CACHE_TTL_AIR);
      }
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
    console.error('Lỗi tải dữ liệu thời tiết:', e);
    setText('meta', '❌ Không thể kết nối máy chủ Open-Meteo. Vui lòng thử lại.');
    hideSkeleton();
    return;
  }

  hideSkeleton();
  if (weather && !weather.error) {
    currentWeatherData = weather;
    window.currentWeatherData = weather;
    currentAirQualityData = airQuality;
    window.currentAirQualityData = airQuality;

    // Lưu vị trí gần nhất để lần mở trang tiếp theo tải ngay lập tức (0ms delay)
    lsSet('last_location_v3', { lat: numLat, lon: numLon, name: currentPlaceName }, 30 * 24 * 60 * 60 * 1000);

    render(weather, airQuality, currentPlaceName);
    setText('meta', `✅ Dữ liệu thực tế tại: ${currentPlaceName}`);
  } else {
    setText('meta', `❌ Lỗi dữ liệu API: ${weather?.reason || 'Không xác định'}`);
  }
}

let chartJsLoaded = false;
function loadChartJS() {
  if (chartJsLoaded || window.Chart) {
    chartJsLoaded = true;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload = () => { chartJsLoaded = true; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function renderHourlyChart(weather) {
  const canvas = $('hourlyChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  await loadChartJS();
  if (hourlyChart) {
    hourlyChart.destroy();
    hourlyChart = null;
  }

  const sIdx = findCurrentHourlyIndex(weather);
  const labels = [], temps = [], precips = [], pops = [];

  for (let i = 0; i < 24; i++) {
    const idx = sIdx + i;
    if (idx >= weather.hourly.time.length) break;
    const rawTime = weather.hourly.time[idx];
    const hourStr = rawTime.slice(11, 16) || (new Date(rawTime).getHours().toString().padStart(2, '0') + ':00');
    labels.push(i === 0 ? 'Hiện tại' : hourStr);
    temps.push(Number(weather.hourly.temperature_2m[idx].toFixed(1)));
    precips.push(Number((weather.hourly.precipitation?.[idx] || 0).toFixed(2)));
    pops.push(weather.hourly.precipitation_probability?.[idx] ?? 0);
  }

  const isDark = document.body.classList.contains('dark-theme');
  const tickColor = isDark ? '#e2e8f0' : '#0b2545';
  const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(11,37,69,0.07)';

  hourlyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Nhiệt độ (°C)',
          data: temps,
          borderColor: isDark ? '#fbbf24' : '#f97316',
          backgroundColor: isDark ? 'rgba(251, 191, 36, 0.16)' : 'rgba(249, 115, 22, 0.16)',
          borderWidth: 2.5,
          tension: 0.38,
          pointRadius: 2.5,
          pointHoverRadius: 6,
          fill: true,
          yAxisID: 'yTemp'
        },
        {
          label: 'Lượng mưa (mm)',
          data: precips,
          borderColor: 'rgba(56, 189, 248, 0.9)',
          backgroundColor: 'rgba(56, 189, 248, 0.35)',
          borderRadius: 4,
          type: 'bar',
          yAxisID: 'yPrecip'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.94)',
          titleColor: '#f8fafc',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(56, 189, 248, 0.4)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: c => {
              if (c.datasetIndex === 0) return `🌡️ Nhiệt độ: ${c.raw}°C`;
              const popVal = pops[c.dataIndex] ?? 0;
              return `🌧️ Lượng mưa: ${c.raw} mm (XS mưa: ${popVal}%)`;
            }
          }
        }
      },
      scales: {
        yTemp: {
          type: 'linear',
          position: 'left',
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { weight: '600', size: 11 }, callback: v => v + '°' }
        },
        yPrecip: {
          type: 'linear',
          position: 'right',
          beginAtZero: true,
          suggestedMax: 2,
          grid: { display: false },
          ticks: { color: isDark ? '#38bdf8' : '#0284c7', font: { weight: '600', size: 10 }, callback: v => v + 'mm' }
        },
        x: {
          grid: { display: false },
          ticks: { color: tickColor, font: { weight: '600', size: 10.5 }, maxTicksLimit: 12, maxRotation: 0 }
        }
      }
    }
  });
}

function setupDragScroll(el) {
  if (!el || el._dragInit) return;
  el._dragInit = true;
  let isDown = false, startX = 0, scrollLeft = 0;
  el.addEventListener('mousedown', e => {
    isDown = true;
    el.style.cursor = 'grabbing';
    startX = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
  });
  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    if (el) el.style.cursor = '';
  });
  el.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = scrollLeft - (x - startX) * 1.5;
  });
}

function renderHourlyTiles(weather) {
  const container = $('hourlyTiles');
  if (!container) return;
  container.innerHTML = '';
  setupDragScroll(container);

  const sIdx = findCurrentHourlyIndex(weather);
  const frag = document.createDocumentFragment();

  for (let i = 0; i < 24; i++) {
    const idx = sIdx + i;
    if (idx >= weather.hourly.time.length) break;
    const rawTime = weather.hourly.time[idx];
    const hour = rawTime.slice(11, 16) || '00:00';
    const temp = Math.round(weather.hourly.temperature_2m[idx]);
    const isDayHour = weather.hourly.is_day ? weather.hourly.is_day[idx] === 1 : true;
    const icon = wmoToIcon(weather.hourly.weathercode[idx], isDayHour);
    const pop = weather.hourly.precipitation_probability?.[idx] ?? 0;
    const wind = Math.round(weather.hourly.wind_speed_10m?.[idx] ?? 0);

    const div = document.createElement('div');
    div.className = 'hour-item';
    div.innerHTML = `
      <div class="hour-time">${i === 0 ? 'Bây giờ' : hour}</div>
      <div class="hour-icon">${icon}</div>
      <div class="hour-temp">${temp}°</div>
      <div class="hour-pop" style="opacity:${pop >= 15 ? 1 : 0.45}">💧 ${pop}%</div>
      <div class="hour-wind">💨 ${wind}km/h</div>
    `;
    frag.appendChild(div);
  }
  container.appendChild(frag);
}

function renderDailyForecast(weather) {
  const c = $('dailyForecast');
  if (!c || !weather.daily?.time) return;
  c.innerHTML = '';

  const count = Math.min(7, weather.daily.time.length);
  const allMins = weather.daily.temperature_2m_min.slice(0, count);
  const allMaxs = weather.daily.temperature_2m_max.slice(0, count);
  const weekMin = Math.min(...allMins);
  const weekMax = Math.max(...allMaxs);
  const rangeSpan = Math.max(1, weekMax - weekMin);

  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const d = new Date(weather.daily.time[i] + 'T00:00:00');
    const isToday = i === 0;
    const div = document.createElement('div');
    div.className = 'daily-item';

    const dayLabel = isToday
      ? 'Hôm nay'
      : i === 1
      ? 'Ngày mai'
      : d.toLocaleDateString('vi-VN', { weekday: 'short' }) + ' ' + d.getDate() + '/' + (d.getMonth() + 1);

    const tMax = Math.round(weather.daily.temperature_2m_max[i]);
    const tMin = Math.round(weather.daily.temperature_2m_min[i]);
    const pop = weather.daily.precipitation_probability_max?.[i] ?? 0;
    const rainSum = weather.daily.precipitation_sum?.[i] ?? 0;
    const leftPct = Math.max(0, Math.min(100, ((tMin - weekMin) / rangeSpan) * 100));
    const widthPct = Math.max(12, Math.min(100 - leftPct, ((tMax - tMin) / rangeSpan) * 100));

    div.innerHTML = `
      <div class="daily-day">${dayLabel}</div>
      <div class="daily-icon">${wmoToIcon(weather.daily.weathercode[i], true)}</div>
      <div class="daily-temp">
        <span class="daily-tmax">${tMax}°</span>
        <span class="daily-tmin">${tMin}°</span>
      </div>
      <div class="daily-bar-track">
        <div class="daily-bar-fill" style="left:${leftPct}%;width:${widthPct}%"></div>
      </div>
      <div class="daily-pop">💧 ${pop}%${rainSum > 0.2 ? ` · ${rainSum.toFixed(1)}mm` : ''}</div>
    `;
    div.onclick = () => showDetailModal(weather, currentAirQualityData, i);
    frag.appendChild(div);
  }
  c.appendChild(frag);
}

async function showDetailModal(weather, airQuality, dayIndex) {
  const modal = $('detailModal');
  if (!modal || !weather.daily?.time?.[dayIndex]) return;

  const targetDateStr = weather.daily.time[dayIndex]; // "YYYY-MM-DD"
  const selectedDate = new Date(targetDateStr + 'T00:00:00');
  const dateStr = selectedDate.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Lọc ĐÚNG các giờ của ngày được chọn (Sửa lỗi lấy nhầm weathercode của ngày đầu tiên)
  const dayHours = [];
  for (let i = 0; i < weather.hourly.time.length; i++) {
    const tStr = weather.hourly.time[i];
    if (tStr.startsWith(targetDateStr)) {
      dayHours.push({
        label: tStr.slice(11, 16) || '00:00',
        temp: Math.round(weather.hourly.temperature_2m[i]),
        tempExact: Number(weather.hourly.temperature_2m[i].toFixed(1)),
        feels: weather.hourly.apparent_temperature?.[i] ?? weather.hourly.temperature_2m[i],
        precip: Number((weather.hourly.precipitation?.[i] || 0).toFixed(2)),
        pop: weather.hourly.precipitation_probability?.[i] ?? 0,
        code: weather.hourly.weathercode?.[i] ?? 0,
        wind: Math.round(weather.hourly.wind_speed_10m?.[i] ?? 0),
        isDay: weather.hourly.is_day ? weather.hourly.is_day[i] === 1 : true
      });
    }
  }

  const labels = dayHours.map(h => h.label);
  const temps = dayHours.map(h => h.tempExact);
  const precips = dayHours.map(h => h.precip);

  const tMax = Math.round(weather.daily.temperature_2m_max[dayIndex]);
  const tMin = Math.round(weather.daily.temperature_2m_min[dayIndex]);
  const avgFeels = dayHours.length
    ? Math.round(dayHours.reduce((acc, h) => acc + h.feels, 0) / dayHours.length)
    : tMax;

  setText('modalCity', $('location')?.textContent || currentPlaceName);
  setText('modalDate', dateStr);
  setText('modalTemp', `${tMax}° / ${tMin}°`);
  setText('modalCond', wmoToDescription(weather.daily.weathercode[dayIndex]));

  const tempRow = document.querySelector('.modal-temp-row');
  if (tempRow) {
    let feelsEl = document.getElementById('modalFeelsInner');
    if (!feelsEl) {
      feelsEl = document.createElement('span');
      feelsEl.id = 'modalFeelsInner';
      feelsEl.className = 'modal-feels';
      tempRow.appendChild(feelsEl);
    }
    const uvMaxDay = weather.daily.uv_index_max?.[dayIndex];
    const windMaxDay = weather.daily.wind_speed_10m_max?.[dayIndex];
    feelsEl.textContent = `Cảm giác TB ${avgFeels}°C · Gió tối đa ${Math.round(windMaxDay || 0)} km/h${uvMaxDay != null ? ` · UV ${uvMaxDay.toFixed(1)}` : ''}`;
  }

  await loadChartJS();

  const ctxTemp = $('modalChart')?.getContext('2d');
  if (ctxTemp) {
    if (modalChartInstance) {
      modalChartInstance.destroy();
      modalChartInstance = null;
    }
    modalChartInstance = new Chart(ctxTemp, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Nhiệt độ (°C)',
          data: temps,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249,115,22,0.14)',
          tension: 0.38,
          pointRadius: 3.5,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { font: { size: 12, weight: '600' } } },
          tooltip: { callbacks: { label: c => `🌡️ ${c.raw}°C` } }
        },
        scales: {
          y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => v + '°' } },
          x: { grid: { display: false }, ticks: { maxRotation: 0, maxTicksLimit: 12 } }
        }
      }
    });
  }

  const ctxPrecip = $('modalPrecipChart')?.getContext('2d');
  if (ctxPrecip) {
    if (modalPrecipChartInstance) {
      modalPrecipChartInstance.destroy();
      modalPrecipChartInstance = null;
    }
    modalPrecipChartInstance = new Chart(ctxPrecip, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Lượng mưa thực tế / dự báo (mm)',
          data: precips,
          backgroundColor: 'rgba(2, 132, 199, 0.58)',
          borderColor: '#0284c7',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { font: { size: 12, weight: '600' } } },
          tooltip: { callbacks: { label: c => `🌧️ ${c.raw} mm (XS: ${dayHours[c.dataIndex]?.pop ?? 0}%)` } }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, suggestedMax: 3, ticks: { callback: v => v + 'mm' } },
          x: { grid: { display: false }, ticks: { maxRotation: 0, maxTicksLimit: 12 } }
        }
      }
    });
  }

  // Hourly tiles trong modal với đúng icon và dữ liệu của ngày đã chọn
  const modalHourly = $('modalHourlyTiles');
  if (modalHourly) {
    modalHourly.innerHTML = '';
    setupDragScroll(modalHourly);
    dayHours.forEach(h => {
      const div = document.createElement('div');
      div.className = 'modal-hour-item';
      div.innerHTML = `
        <div class="modal-hour-time">${h.label}</div>
        <div style="font-size:20px;margin:3px 0">${wmoToIcon(h.code, h.isDay)}</div>
        <div class="modal-hour-temp">${h.temp}°</div>
        <div style="font-size:10px;color:#0284c7;font-weight:700;margin-top:2px">💧${h.pop}%</div>
      `;
      modalHourly.appendChild(div);
    });
  }

  const modalDaily = $('modalDailyTiles');
  if (modalDaily) {
    modalDaily.innerHTML = '';
    for (let i = 0; i < Math.min(7, weather.daily.time.length); i++) {
      const d = new Date(weather.daily.time[i] + 'T00:00:00');
      const div = document.createElement('div');
      div.className = 'modal-day-item';
      if (i === dayIndex) {
        div.style.background = 'rgba(2, 132, 199, 0.14)';
        div.style.borderColor = '#0284c7';
      }
      div.innerHTML = `
        <div class="modal-day-name">${i === 0 ? 'Hôm nay' : d.toLocaleDateString('vi-VN', { weekday: 'short' }) + ' ' + d.getDate() + '/' + (d.getMonth() + 1)}</div>
        <div style="font-size:22px;margin:4px 0">${wmoToIcon(weather.daily.weathercode[i], true)}</div>
        <div class="modal-day-temp">${Math.round(weather.daily.temperature_2m_max[i])}° <span style="opacity:0.6">${Math.round(weather.daily.temperature_2m_min[i])}°</span></div>
      `;
      div.onclick = () => showDetailModal(weather, airQuality, i);
      modalDaily.appendChild(div);
    }
  }

  modal.classList.add('show');
}

function render(weather, airQuality, placeName) {
  if (!weather) return;

  const rp = $('rightPanel');
  if (rp) rp.classList.remove('hidden');
  if (map) setTimeout(() => map.invalidateSize(), 100);

  const cur = weather.current || {};
  const cw = weather.current_weather || {};
  const hIdx = findCurrentHourlyIndex(weather);

  const code = cur.weather_code ?? cw.weathercode ?? 0;
  const isDay = (cur.is_day ?? cw.is_day ?? 1) === 1;
  const style = weatherToStyle(code, isDay);

  document.body.style.background = style.bg;
  document.body.style.color = style.text;
  document.body.classList.toggle('dark-theme', !!style.isDark);

  const themeEl = document.querySelector('meta[name="theme-color"]');
  if (themeEl) themeEl.setAttribute('content', isDay ? '#38bdf8' : '#0b132b');

  // Nhiệt độ thực tế hiện tại
  const realTemp = cur.temperature_2m ?? cw.temperature ?? weather.hourly?.temperature_2m?.[hIdx] ?? 0;
  const tempTarget = Math.round(realTemp);
  const tempEl = $('temp');
  if (tempEl) {
    tempEl.textContent = `${tempTarget}°C`;
  }

  setText('condition', wmoToDescription(code));
  setText('location', placeName);

  // Nhiệt độ Cao / Thấp hôm nay từ daily thực tế
  const todayMax = weather.daily?.temperature_2m_max?.[0];
  const todayMin = weather.daily?.temperature_2m_min?.[0];
  if (todayMax != null && todayMin != null) {
    setText('tempMinMax', `Cao: ${Math.round(todayMax)}° · Thấp: ${Math.round(todayMin)}°`);
  }

  // Cảm giác thực tế (apparent_temperature từ Open-Meteo)
  const feelsVal = cur.apparent_temperature ?? weather.hourly?.apparent_temperature?.[hIdx] ?? realTemp;
  setText('feels', `🌡️ Cảm giác ${Math.round(feelsVal)}°C`);

  // Gió giật & Áp suất khí quyển thực tế
  const windGust = cur.wind_gusts_10m ?? weather.hourly?.wind_gusts_10m?.[hIdx];
  const gustBadge = $('windGustBadge');
  if (gustBadge) {
    if (windGust != null) {
      gustBadge.style.display = 'inline-block';
      gustBadge.textContent = `💨 Gió giật ${Math.round(windGust)} km/h`;
    } else {
      gustBadge.style.display = 'none';
    }
  }

  const surfacePres = cur.surface_pressure ?? cur.pressure_msl ?? weather.hourly?.surface_pressure?.[hIdx];
  if (surfacePres != null) {
    setText('pressureBadge', `📊 Áp suất ${Math.round(surfacePres)} hPa`);
  }

  // 1. Độ ẩm & Điểm sương thực tế
  const humidVal = cur.relative_humidity_2m ?? weather.hourly?.relative_humidity_2m?.[hIdx];
  setText('humidity', humidVal != null ? `${Math.round(humidVal)}%` : '--%');
  const dewVal = weather.hourly?.dew_point_2m?.[hIdx];
  setText('dewPoint', dewVal != null ? `Điểm sương ${Math.round(dewVal)}°C` : 'Thực tế từ trạm');

  // 2. Gió & Hướng gió thực tế
  const windSpd = cur.wind_speed_10m ?? cw.windspeed ?? 0;
  const windDir = cur.wind_direction_10m ?? cw.winddirection ?? 0;
  setText('wind', `${Math.round(windSpd)} km/h`);
  setText('windDirSub', windDirectionFull(windDir));

  // 3. Lượng mưa & Độ che phủ mây thực tế
  const precipVal = cur.precipitation ?? weather.hourly?.precipitation?.[hIdx] ?? 0;
  const cloudVal = cur.cloud_cover ?? weather.hourly?.cloud_cover?.[hIdx] ?? 0;
  setText('precip', `${Number(precipVal).toFixed(1)} mm`);
  setText('cloudCoverSub', `Mây che phủ ${Math.round(cloudVal)}%`);

  // 4. Khả năng mưa & Tầm nhìn xa thực tế
  const popVal = weather.hourly?.precipitation_probability?.[hIdx] ?? 0;
  const visMeters = weather.hourly?.visibility?.[hIdx];
  setText('pop', `${popVal}%`);
  setText('visibilitySub', visMeters != null ? `Tầm nhìn ${(visMeters / 1000).toFixed(1)} km` : 'Dự báo theo giờ');

  // 5. Chỉ số UV thực tế 100% từ Open-Meteo (Tuyệt đối KHÔNG tự bịa từ nhiệt độ)
  const realUvNow = cur.uv_index ?? weather.hourly?.uv_index?.[hIdx] ?? 0;
  const realUvMax = weather.daily?.uv_index_max?.[0];
  const uvInfo = getUvInfo(realUvNow);
  const uvStatEl = $('uvStat');
  if (uvStatEl) {
    uvStatEl.textContent = `${Number(realUvNow).toFixed(1)} (${uvInfo.label})`;
    uvStatEl.style.color = uvInfo.color;
  }
  setText('uvMaxSub', realUvMax != null ? `Cực đại ngày: ${Number(realUvMax).toFixed(1)}` : 'Dữ liệu bức xạ thực');

  const uvChip = $('uvIndex');
  if (uvChip) {
    uvChip.textContent = `☀️ UV ${Number(realUvNow).toFixed(1)} (${uvInfo.label})`;
    uvChip.style.display = 'inline-block';
    uvChip.style.color = uvInfo.color;
  }

  // 6. Chất lượng không khí (AQI & PM2.5 thực tế từ Open-Meteo Air Quality API)
  const aqiVal = airQuality?.current?.european_aqi;
  const pm25Val = airQuality?.current?.pm2_5;
  const aqiEl = $('aqi');
  if (aqiEl) {
    if (aqiVal != null) {
      const aqiInfo = getAqiInfo(aqiVal);
      aqiEl.textContent = `${aqiVal} · ${aqiInfo.label}`;
      aqiEl.style.color = aqiInfo.color;
      aqiEl.title = aqiInfo.desc;
    } else {
      aqiEl.textContent = 'Đang cập nhật';
      aqiEl.style.color = '';
    }
  }
  setText('pm25Sub', pm25Val != null ? `PM2.5: ${Number(pm25Val).toFixed(1)} µg/m³` : 'Chuẩn Châu Âu');

  // Cảnh báo mưa ngắn hạn 15 phút (Nowcast thực tế)
  let nowcastTxt = '';
  const now = new Date();
  if (weather.minutely_15?.precipitation && weather.minutely_15?.time) {
    for (let i = 0; i < weather.minutely_15.time.length; i++) {
      const t = new Date(weather.minutely_15.time[i]);
      if (t >= now && t <= new Date(now.getTime() + 90 * 60 * 1000)) {
        const p15 = weather.minutely_15.precipitation[i];
        if (p15 > 0.1) {
          const mins = Math.max(1, Math.round((t - now) / 60000));
          nowcastTxt = `⚠️ Cảnh báo thực tế: Dự kiến có mưa (${p15.toFixed(1)} mm) trong khoảng ${mins} phút tới.`;
          break;
        }
      }
    }
  }
  setText('nowcast', nowcastTxt);

  // Icon thời tiết lớn
  const imgEl = $('weatherImage');
  const iconEl = $('weatherIcon');
  if (imgEl && iconEl) {
    imgEl.style.display = 'none';
    iconEl.textContent = getWeatherEmoji(code, isDay);
  }

  // Bình minh & Hoàng hôn thực tế
  const sr0 = weather.daily?.sunrise?.[0];
  const ss0 = weather.daily?.sunset?.[0];
  const sr = sr0 ? sr0.slice(11, 16) : '--:--';
  const ss = ss0 ? ss0.slice(11, 16) : '--:--';
  setText('sun', `🌅 ${sr} — 🌇 ${ss}`);

  const tz = weather.timezone || 'Asia/Ho_Chi_Minh';
  const utcOffset = weather.utc_offset_seconds != null
    ? `UTC${weather.utc_offset_seconds >= 0 ? '+' : ''}${weather.utc_offset_seconds / 3600}`
    : '';
  setText('tzOffset', `🕐 ${tz.split('/').pop().replace(/_/g, ' ')} (${utcOffset})`);

  setText('timeNow', now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + now.toLocaleDateString('vi-VN'));

  renderHourlyChart(weather);
  renderHourlyTiles(weather);
  renderDailyForecast(weather);

  if (map && marker) {
    marker.setLatLng([weather.latitude, weather.longitude]);
    map.setView([weather.latitude, weather.longitude], Math.max(9, map.getZoom()));
  }

  clearInterval(window._clockInterval);
  window._clockInterval = setInterval(() => {
    const d = new Date();
    setText('timeNow', d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN'));
  }, 1000);
}

// ══════════════════════════════════════════════
//  FAST AUTOCOMPLETE ENGINE (PARALLEL + ABORTABLE)
// ══════════════════════════════════════════════

let acDebounce = null;
let acResults  = [];
let acActive   = -1;
let acOpen     = false;

const PLACE_ICONS = {
  village: '🏘️', hamlet: '🏡', suburb: '🏙️', quarter: '🏙️',
  neighbourhood: '🏘️', town: '🌆', city: '🌇', municipality: '🏛️',
  county: '📍', state_district: '📍', state: '🗺️', country: '🌍',
  administrative: '📍', district: '📍', island: '🏝️'
};

function placeIcon(type) {
  return PLACE_ICONS[type] || '📍';
}

function shortDisplay(item) {
  const addr = item.address || {};
  const parts = [
    addr.village || addr.hamlet || addr.suburb || addr.quarter || addr.neighbourhood || addr.island,
    addr.town || addr.city || addr.municipality || addr.county || addr.state_district,
    addr.state || addr.province
  ].filter(Boolean);
  const unique = [...new Set(parts)];
  if (unique.length >= 2) return unique.join(', ');
  return (item.display_name || '').split(',').slice(0, 3).join(',').trim();
}

async function fetchAutocomplete(q, signal) {
  const cacheKey = q.toLowerCase().trim();
  if (acMemoryCache.has(cacheKey)) return acMemoryCache.get(cacheKey);

  // Chạy song song Open-Meteo Geocoding (cực nhanh < 120ms) & Nominatim (chi tiết thôn/xã)
  const omPromise = fetch(
    `${GEOCODE_URL_OM}?name=${encodeURIComponent(q)}&count=6&language=vi&format=json`,
    { signal }
  )
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data?.results) return [];
      return data.results.map(r => {
        const parts = [...new Set([r.name, r.admin2, r.admin1, r.country].filter(Boolean))];
        return {
          displayName: parts.slice(0, 3).join(', '),
          fullName: parts.join(', '),
          lat: r.latitude,
          lon: r.longitude,
          type: r.feature_code === 'PPLC' ? 'Thủ đô' : r.admin1 ? 'Tỉnh / Thành phố' : 'Địa danh',
          icon: (r.country_code || '').toUpperCase() === 'VN' ? '🇻🇳' : '🌍',
          isVN: (r.country_code || '').toUpperCase() === 'VN'
        };
      });
    })
    .catch(() => []);

  const nomUrl = new URL(NOMINATIM_URL);
  nomUrl.searchParams.set('q', q);
  nomUrl.searchParams.set('format', 'json');
  nomUrl.searchParams.set('limit', '5');
  nomUrl.searchParams.set('addressdetails', '1');
  nomUrl.searchParams.set('accept-language', 'vi');
  nomUrl.searchParams.set('countrycodes', 'vn');

  const nomPromise = fetch(nomUrl.toString(), { signal })
    .then(r => r.ok ? r.json() : [])
    .then(data => data.map(item => ({
      displayName: shortDisplay(item),
      fullName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type || item.addresstype || 'Địa điểm',
      icon: placeIcon(item.type || item.addresstype),
      isVN: true
    })))
    .catch(() => []);

  const [omList, nomList] = await Promise.all([omPromise, nomPromise]);

  // Gộp và khử trùng lặp theo tọa độ gần nhau
  const combined = [...nomList, ...omList].sort((a, b) => (b.isVN ? 1 : 0) - (a.isVN ? 1 : 0));
  const deduped = [];
  for (const item of combined) {
    if (!item.displayName) continue;
    const exists = deduped.some(d =>
      Math.hypot(d.lat - item.lat, d.lon - item.lon) < 0.03 ||
      d.displayName.toLowerCase() === item.displayName.toLowerCase()
    );
    if (!exists) deduped.push(item);
    if (deduped.length >= 8) break;
  }

  if (deduped.length > 0) acMemoryCache.set(cacheKey, deduped);
  return deduped;
}

function getOrCreateDropdown() {
  let el = document.getElementById('ac-dropdown');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ac-dropdown';
    el.className = 'ac-dropdown';
    const searchDiv = document.querySelector('.search');
    searchDiv.style.position = 'relative';
    searchDiv.appendChild(el);
  }
  return el;
}

function renderDropdown(items, query) {
  const dd = getOrCreateDropdown();
  acActive = -1;

  if (!items.length) {
    dd.innerHTML = '<div class="ac-empty">Không tìm thấy địa điểm phù hợp</div>';
    openDropdown();
    return;
  }

  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${esc})`, 'gi');

  dd.innerHTML = '';
  items.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'ac-item';
    row.dataset.idx = i;

    const highlighted = item.displayName.replace(re, '<mark>$1</mark>');

    row.innerHTML = `
      <span class="ac-icon">${item.icon}</span>
      <span class="ac-text">
        <span class="ac-main">${highlighted}</span>
        <span class="ac-sub">${item.type} · ${item.lat.toFixed(2)}°N, ${item.lon.toFixed(2)}°E</span>
      </span>
    `;

    row.addEventListener('mousedown', e => {
      e.preventDefault();
      selectItem(item);
    });
    row.addEventListener('mouseenter', () => {
      setActiveItem(i);
    });

    dd.appendChild(row);
  });

  openDropdown();
}

function openDropdown() {
  const dd = getOrCreateDropdown();
  dd.classList.add('open');
  acOpen = true;
}

function closeDropdown() {
  const dd = document.getElementById('ac-dropdown');
  if (dd) dd.classList.remove('open');
  acOpen = false;
  acActive = -1;
}

function setActiveItem(idx) {
  const dd = document.getElementById('ac-dropdown');
  if (!dd) return;
  const items = dd.querySelectorAll('.ac-item');
  items.forEach((el, i) => el.classList.toggle('ac-item--active', i === idx));
  acActive = idx;
}

function selectItem(item) {
  const inp = $('address');
  if (inp) inp.value = item.displayName;
  $('btnClearSearch')?.classList.remove('hidden');
  closeDropdown();
  fetchWeatherAndRender(item.lat, item.lon, item.displayName);
}

function onAddressInput(e) {
  const q = e.target.value.trim();
  $('btnClearSearch')?.classList.toggle('hidden', q.length === 0);

  if (q.length < 2) {
    closeDropdown();
    return;
  }

  clearTimeout(acDebounce);
  const cacheKey = q.toLowerCase();
  if (acMemoryCache.has(cacheKey)) {
    acResults = acMemoryCache.get(cacheKey);
    renderDropdown(acResults, q);
    return;
  }

  const dd = getOrCreateDropdown();
  dd.innerHTML = '<div class="ac-loading"><span class="ac-spinner"></span> Đang tìm nhanh...</div>';
  openDropdown();

  acDebounce = setTimeout(async () => {
    try {
      if (activeAcAbortCtrl) activeAcAbortCtrl.abort();
      activeAcAbortCtrl = new AbortController();
      const results = await fetchAutocomplete(q, activeAcAbortCtrl.signal);
      acResults = results;
      renderDropdown(results, q);
    } catch (err) {
      if (err.name !== 'AbortError') {
        dd.innerHTML = '<div class="ac-empty">Lỗi kết nối, vui lòng thử lại.</div>';
      }
    }
  }, 140);
}

function onAddressKeydown(e) {
  if (!acOpen) {
    if (e.key === 'Enter') doSearch($('address').value);
    return;
  }

  const dd = document.getElementById('ac-dropdown');
  const items = dd ? dd.querySelectorAll('.ac-item') : [];

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setActiveItem(Math.min(acActive + 1, items.length - 1));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setActiveItem(Math.max(acActive - 1, 0));
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (acActive >= 0 && acResults[acActive]) {
      selectItem(acResults[acActive]);
    } else if (acResults.length > 0) {
      selectItem(acResults[0]);
    } else {
      closeDropdown();
      doSearch($('address').value);
    }
  } else if (e.key === 'Escape') {
    closeDropdown();
  }
}

async function doSearch(q) {
  q = (q || '').trim();
  if (!q) {
    setText('meta', '⚠️ Vui lòng nhập tên địa điểm cần xem.');
    return;
  }
  closeDropdown();
  showSkeleton();
  const loc = await lookup(q);
  if (!loc) {
    hideSkeleton();
    return;
  }
  await fetchWeatherAndRender(loc.lat, loc.lon, loc.name);
}

// Danh sách gợi ý kèm tọa độ thực để khi bấm tải thời tiết TỨC THÌ (0ms geocoding!)
const QUICK_LOCATIONS = [
  { name: 'Hà Nội',      label: '🏛️ Hà Nội',      lat: 21.0285, lon: 105.8542 },
  { name: 'TP.HCM',      label: '🏙️ TP.HCM',      lat: 10.8231, lon: 106.6297 },
  { name: 'Đà Nẵng',     label: '🌊 Đà Nẵng',     lat: 16.0544, lon: 108.2022 },
  { name: 'Hải Phòng',   label: '⚓ Hải Phòng',   lat: 20.8449, lon: 106.6881 },
  { name: 'Huế',         label: '🏯 Huế',         lat: 16.4637, lon: 107.5909 },
  { name: 'Nha Trang',   label: '🏖️ Nha Trang',   lat: 12.2388, lon: 109.1967 },
  { name: 'Đà Lạt',      label: '🌲 Đà Lạt',      lat: 11.9404, lon: 108.4583 },
  { name: 'Cần Thơ',     label: '🌴 Cần Thơ',     lat: 10.0452, lon: 105.7469 }
];

function setDefaultSuggestions() {
  const box = $('suggestion-box');
  if (!box) return;
  box.innerHTML = '';
  QUICK_LOCATIONS.forEach(loc => {
    const b = document.createElement('button');
    b.className = 'example';
    b.textContent = loc.label;
    b.onclick = () => {
      const inp = $('address');
      if (inp) inp.value = loc.name;
      $('btnClearSearch')?.classList.remove('hidden');
      // Bấm gợi ý là tải trực tiếp bằng tọa độ thực, phản hồi tức thì không cần tốn request geocode!
      fetchWeatherAndRender(loc.lat, loc.lon, loc.name);
    };
    box.appendChild(b);
  });
}

function locateUser() {
  if (!navigator.geolocation) {
    setText('meta', '❌ Trình duyệt không hỗ trợ định vị GPS.');
    return;
  }
  setText('meta', '📍 Đang lấy tọa độ GPS thực tế...');
  showSkeleton();
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      if (!map) initMap(lat, lon);
      else {
        map.setView([lat, lon], 11);
        marker.setLatLng([lat, lon]);
      }

      // Tải thời tiết song song với reverse geocode
      const wxPromise = fetchWeatherAndRender(lat, lon, 'Vị trí GPS của bạn');
      const geoPromise = fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1&accept-language=vi`
      )
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);

      const [, geo] = await Promise.all([wxPromise, geoPromise]);
      if (geo) {
        const shortName = shortDisplay(geo) || 'Vị trí hiện tại';
        currentPlaceName = shortName;
        setText('location', shortName);
        setText('meta', `✅ Vị trí GPS: ${shortName}`);
      }
    },
    err => {
      hideSkeleton();
      setText('meta', err.code === 1 ? '⛔ Bạn chưa cấp quyền truy cập vị trí GPS.' : '❌ Không thể lấy vị trí GPS.');
    },
    { timeout: 7000, maximumAge: 60000 }
  );
}

// Cho phép Bản đồ Khí tượng Windy đồng bộ điểm chọn về trang chính
window.selectLocationFromMeteoMap = function (lat, lon, name) {
  const label = name || `${Number(lat).toFixed(2)}°N, ${Number(lon).toFixed(2)}°E`;
  const inp = $('address');
  if (inp) inp.value = label;
  $('btnClearSearch')?.classList.remove('hidden');
  fetchWeatherAndRender(lat, lon, label);
};

// ══════════════════════════════════════════════
//  INIT (TẢI TỨC THÌ - ZERO BLOCKING)
// ══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  const savedLoc = lsGet('last_location_v3') || { lat: 21.0285, lon: 105.8542, name: 'Hà Nội' };

  initMap(savedLoc.lat, savedLoc.lon);
  setDefaultSuggestions();

  // Hiển thị ngay lập tức thời tiết thực tế của vị trí đã lưu / Hà Nội (không chặn chờ Geolocation 8 giây!)
  fetchWeatherAndRender(savedLoc.lat, savedLoc.lon, savedLoc.name);

  const inp = $('address');
  const btnClear = $('btnClearSearch');

  if (inp) {
    inp.addEventListener('input', onAddressInput);
    inp.addEventListener('keydown', onAddressKeydown);
    inp.addEventListener('focus', () => {
      if (inp.value.trim().length >= 2 && acResults.length) openDropdown();
    });
    inp.addEventListener('blur', () => {
      setTimeout(closeDropdown, 180);
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (inp) {
        inp.value = '';
        inp.focus();
      }
      btnClear.classList.add('hidden');
      closeDropdown();
    });
  }

  $('btnSearch')?.addEventListener('click', () => {
    closeDropdown();
    doSearch(inp?.value);
  });

  $('btnLocate')?.addEventListener('click', locateUser);

  const modal = $('detailModal');
  if (modal) {
    window.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
    document.querySelector('.close-modal')?.addEventListener('click', () => modal.classList.remove('show'));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !acOpen) modal.classList.remove('show');
    });
  }

  document.addEventListener('click', e => {
    if (!e.target.closest('.search')) closeDropdown();
  });
});
