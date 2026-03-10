# Box-by-Box QR Pallet Scanner

Ứng dụng quét QR code trên từng thùng hàng cho kho bãi. Dòng ứng dụng chia làm 2 phần: **Frontend (React)** và **Backend (FastAPI)**.

## Yêu cầu hệ thống
- Python 3.9+
- Node.js 18+

---

## Cách chạy ứng dụng trên máy cục bộ (Local)

### 1. Chạy Backend (Python)

Mở terminal, chuyển vào thư mục `backend/`:
```bash
cd backend
```

Tạo môi trường ảo (tùy chọn nhưng khuyên dùng):
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate
```

Cài đặt các thư viện cần thiết:
```bash
pip install -r requirements.txt
```

Khởi động server FastAPI:
```bash
uvicorn main:app --reload
```
Server chạy tại: `http://127.0.0.1:8000`

---

### 2. Chạy Frontend (React + Vite)

Mở thêm một terminal mới, chuyển vào thư mục `frontend/`:
```bash
cd frontend
```

Cài đặt dependencies:
```bash
npm install
```

Khởi động ứng dụng React:
```bash
npm run dev
```

Mở trình duyệt truy cập đường dẫn hiển thị trên terminal (thường là `http://localhost:5173`).

---

## Luồng hoạt động cơ bản
1. **Trang chủ:** Nhập ID Pallet và ID Người vận hành -> nhấn Bắt đầu.
2. **Quét:** Đưa camera vào thùng hàng -> Nhấn Chụp. Hệ thống tự nhận diện các mã QR và hiển thị trạng thái OK/Cảnh báo.
3. **Hoàn thành:** Sau khi quét hết các thùng, nhấn Xác nhận xong.
4. **Kết quả:** Hiển thị tổng kết số lượng và danh sách mã. User có thể bấm Copy để xuất dữ liệu.
