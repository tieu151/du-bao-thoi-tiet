# 🌤️ Thời Tiết Trực Tiếp — Bản Đồ Khí Tượng Chuẩn Windy.com

🌐 **Xem trực tiếp (Live Demo):** [https://tieu151.github.io/du-bao-thoi-tiet/](https://tieu151.github.io/du-bao-thoi-tiet/)  
📦 **Mã nguồn GitHub:** [https://github.com/tieu151/du-bao-thoi-tiet](https://github.com/tieu151/du-bao-thoi-tiet)

Ứng dụng web dự báo thời tiết theo thời gian thực kết hợp **Bản đồ Khí tượng tương tác 60 FPS kiểu Windy.com**, sử dụng **100% dữ liệu khí tượng thực tế** từ hệ thống **Open-Meteo API** và bản đồ địa lý **Leaflet / Esri / CartoDB**.

---

## ✨ Tính năng nổi bật

- **📊 Dữ liệu thời tiết thực tế 100% (Không giả lập)**:
  - Nhiệt độ thực (`2m`), nhiệt độ cảm nhận (`Apparent Temperature`), biên độ Cao/Thấp trong ngày.
  - Tốc độ gió, gió giật (`10m`), hướng gió chi tiết, áp suất khí quyển (`hPa`), độ ẩm, điểm sương (`Dew Point`) và tầm nhìn xa (`km`).
  - Chỉ số bức xạ **UV thực tế** theo giờ & cực đại ngày.
  - Chất lượng không khí **Châu Âu AQI** và nồng độ bụi mịn **PM2.5 (µg/m³)** trực tiếp từ *Open-Meteo Air Quality API*.
  - Cảnh báo mưa ngắn hạn 15 phút (*Nowcast*).
- **🌐 Bản đồ Khí tượng trực tiếp chuẩn Windy.com (60 FPS)**:
  - **6 lớp dữ liệu thực tế**: 💨 Gió, 🌡️ Nhiệt độ, 🌧️ Mưa & Dông, ☁️ Mây che phủ, 📊 Áp suất khí quyển, 💧 Độ ẩm.
  - **Hiệu ứng dòng chảy hạt gió mượt mà (Streamlines)**: Bộ đệm vệt gió chuyển động 60 FPS kết hợp bảng màu nội suy mượt mà (`Uint32 LUT` + nội suy Hermite 2D).
  - **Đường đẳng áp thực (Marching Squares Isobars)**: Tự động dò đường đồng mức khí áp thực tế và đánh dấu tâm Áp Cao (**H**) / Áp Thấp (**L**).
  - **Thanh trượt dự báo 72 giờ (Timeline)**: Xem diễn biến dự báo thực tế từng giờ trong 4 ngày tiếp theo.
  - **Chạm điểm bất kỳ để đo chính xác (Spot Forecast)**: Click vào bất kỳ tọa độ hay đảo/thành phố nào (bao gồm *QĐ. Hoàng Sa*, *QĐ. Trường Sa*, *Phú Quốc*...) để truy vấn trực tiếp trạm/mô hình tại điểm đó.
- **⚡ Tốc độ phản hồi tức thì**:
  - Tìm kiếm song song (*Open-Meteo Geocoding* + *OpenStreetMap Nominatim*) hỗ trợ tiếng Việt từ cấp thôn/xã đến tỉnh/thành phố và quốc tế.
  - Gộp truy vấn lưới khí tượng đa điểm (*Multi-Point Batch API*) giúp nạp toàn bộ bản đồ chỉ trong vài trăm mili-giây.
  - Giao diện tự động chuyển đổi chủ đề Sáng / Tối (*Dynamic Weather Theme*) và tương thích hoàn hảo trên cả máy tính lẫn điện thoại di động.

---

## 🗂️ Cấu trúc thư mục

```text
├── index.html                   # Giao diện chính & khung Bản đồ Khí tượng Windy
├── style.css                    # Hệ thống giao diện Glassmorphism, Dark Theme & Responsive
├── script.js                    # Xử lý dữ liệu Open-Meteo, tìm kiếm địa điểm, biểu đồ Chart.js
├── meteo-map.js                 # Engine bản đồ khí tượng 60 FPS (Streamlines, Heatmap, Isobars)
├── ảnh/                         # Tài nguyên hình ảnh minh họa thời tiết
├── .nojekyll                    # Cấu hình phục vụ tệp tĩnh trực tiếp trên GitHub Pages
└── .github/workflows/deploy.yml # GitHub Actions tự động triển khai lên GitHub Pages
```

---

## 🚀 Chạy thử trên máy cá nhân

Dự án được xây dựng thuần **HTML5 + CSS3 + Vanilla JavaScript (ES6+)** không cần bước biên dịch phức tạp:

```bash
# Cách 1: Dùng Python HTTP Server
python -m http.server 8080

# Cách 2: Dùng Node.js npx serve
npx serve .
```

Sau đó mở trình duyệt tại địa chỉ `http://localhost:8080`.

---

## 🌍 Triển khai tự động trên GitHub Pages

Dự án đã tích hợp sẵn workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
1. Đẩy mã nguồn lên nhánh `main` của kho lưu trữ GitHub.
2. Trên GitHub, mở **Settings → Pages → Build and deployment → Source** và chọn **GitHub Actions**.
3. Mọi thay đổi đẩy lên nhánh `main` sẽ tự động được phát hành thành trang web trực tuyến tại `https://<username>.github.io/<repo-name>/`.

---

## 📡 Nguồn dữ liệu & Thư viện

- [Open-Meteo Weather Forecast & Air Quality API](https://open-meteo.com/)
- [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/)
- [Leaflet.js](https://leafletjs.com/) & [Chart.js](https://www.chartjs.org/)
- Bản đồ nền: CartoDB Dark Matter & Esri ArcGIS Online

## 📄 Giấy phép

Phát hành theo giấy phép [MIT License](LICENSE).
