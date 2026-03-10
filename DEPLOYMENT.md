# Hướng dẫn triển khai (Deployment Guide) - QR Pallet Scanner

Tài liệu này hướng dẫn bạn cách đưa ứng dụng vào sử dụng thực tế.

## Cách 1: Sử dụng Docker (Khuyên dùng)

Cách này giúp bạn chạy cả Backend và Frontend chỉ bằng một lệnh duy nhất.

### Bước 1: Cài đặt Docker
Đảm bảo máy chủ của bạn đã cài đặt **Docker** và **Docker Compose**.

### Bước 2: Khởi chạy
Tại thư mục gốc của dự án (`camera/`), chạy lệnh:
```bash
docker-compose up -d --build
```
- **Port 80**: Giao diện người dùng (Frontend).
- **Port 8000**: API (Backend).

---

## Cách 2: Triển khai trong mạng nội bộ (LAN)

Thường dùng khi bạn muốn chạy ứng dụng trên một máy tính trong kho và dùng điện thoại/máy tính bảng để quét.

### 1. Tìm địa chỉ IP của máy chủ
Mở CMD và gõ: `ipconfig`. Tìm dòng `IPv4 Address` (Ví dụ: `192.168.1.15`).

### 2. Cấu hình Frontend
Trước khi build frontend, bạn cần cho nó biết địa chỉ IP của backend. 
Trong file `frontend/src/api.js`, hãy đổi `BASE_URL` hoặc tạo file `frontend/.env.production`:
```env
VITE_API_URL=http://192.168.1.15:8000
```
Sau đó build lại:
```bash
cd frontend
npm install
npm run build
```

### 3. Cho phép qua Firewall
Đảm bảo Firewall trên Windows cho phép truy cập qua port 80 và 8000.

---

## LƯU Ý QUAN TRỌNG: Quyền Camera & HTTPS

Trình duyệt (Chrome, Safari) bảo mật rất kỹ việc sử dụng Camera:
1. **Làm việc tốt nhất trên:** `localhost` hoặc `127.0.0.1`.
2. **Khi truy cập qua IP LAN:** Trình duyệt sẽ chặn Camera vì không có HTTPS.

### Cách xử lý (Dùng trong mạng nội bộ):
**Cách A: Bật flag Chrome (Cho mục đích thử nghiệm/nội bộ)**
Trên điện thoại/máy tính bảng Android (Chrome), truy cập: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.
1. Nhập địa chỉ IP của máy chủ vào (ví dụ: `http://192.168.1.15`).
2. Chọn **Enabled**.
3. Relaunch Chrome.

**Cách B: Sử dụng Nginx + SSL (Tốt nhất cho sản phẩm thật)**
Cần cấu hình HTTPS (Sử dụng chứng chỉ tự ký hoặc Let's Encrypt).

---

## Cách 3: Deploy lên Cloud (Render/Railway)

### Render.com
1. Đẩy code lên GitHub.
2. Tạo **Web Service** mới cho Backend.
    - Build Command: `pip install -r requirements.txt`
    - Start Command: `uvicorn main:app --host 0.0.0.0 --port 8000`
3. Tạo **Static Site** cho Frontend.
    - Build Command: `npm install && npm run build`
    - Publish directory: `dist`
    - Environment Variable: `VITE_API_URL=https://your-backend-url.onrender.com`

---

## Kiểm tra trạng thái
Sau khi deploy, hãy kiểm tra:
1. [ ] Frontend hiển thị trang chủ thành công.
2. [ ] Backend có thể truy cập tại `/docs` (ví dụ: `http://localhost:8000/docs`).
3. [ ] Camera bật lên được và không bị lỗi "Permission denied".
