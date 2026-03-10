# PROMPT: Build QR Pallet Scanner App

## Yêu cầu tổng quát

Hãy xây dựng hoàn chỉnh ứng dụng **Box-by-Box QR Pallet Scanner** theo đúng spec dưới đây.
Viết toàn bộ code, không bỏ qua bước nào, không placeholder, không "TODO".

---

## Stack bắt buộc

- **Backend:** Python, FastAPI, pyzbar, OpenCV, SQLite, WebSocket
- **Frontend:** React + Vite, plain CSS (không dùng UI lib ngoài)
- **Cấu trúc:** Monorepo — thư mục `backend/` và `frontend/`

---

## Cấu trúc thư mục cần tạo

```
qr-pallet-scanner/
├── backend/
│   ├── main.py               # FastAPI app, định nghĩa tất cả routes
│   ├── scanner.py            # Xử lý ảnh: preprocessing + QR decode
│   ├── session_manager.py    # Quản lý session, lưu DB
│   ├── database.py           # SQLite init, CRUD
│   ├── models.py             # Pydantic schemas
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── components/
        │   ├── CameraCapture.jsx   # Chụp ảnh từ camera
        │   ├── ScanResult.jsx      # Hiển thị kết quả từng ảnh
        │   └── SessionSummary.jsx  # Màn hình kết quả cuối
        └── api.js                  # Gọi backend API
```

---

## Backend — Chi tiết từng file

### `backend/main.py`
Tạo FastAPI app với các routes sau:

```
POST   /sessions/new                     → Tạo session mới
POST   /sessions/{session_id}/photos     → Upload ảnh, trả kết quả ngay
POST   /sessions/{session_id}/confirm    → Xác nhận xong, trả full result
GET    /sessions/{session_id}            → Lấy thông tin session hiện tại
WS     /ws/{session_id}                  → WebSocket push kết quả real-time
```

CORS cho phép `http://localhost:5173`.

---

### `backend/scanner.py`
Hàm chính: `process_image(image_bytes: bytes, manifest: list | None) -> dict`

Thực hiện đúng pipeline sau theo thứ tự:

1. **Kiểm tra chất lượng ảnh**
   - Tính Laplacian variance
   - Nếu < 100 → trả về `{"decode_status": "blurry"}`
   - Nếu mean brightness < 40 → thêm warning `"too_dark"`

2. **Preprocessing** (áp dụng tuần tự)
   - Chuyển Grayscale
   - CLAHE `clipLimit=2.0, tileGridSize=(8,8)`
   - Gaussian blur kernel `(3,3)`
   - Sharpen nếu Laplacian variance 100–200
   - Auto-deskew bằng HoughLinesP

3. **Decode QR**
   - Chạy `pyzbar.decode()` lấy tất cả QR trong ảnh
   - Fallback: `cv2.QRCodeDetector().detectAndDecodeMulti()`
   - Nếu vẫn 0 kết quả → thử lại với 3 bộ lọc: OTSU, Adaptive threshold, invert màu
   - Nếu vẫn 0 → trả `{"decode_status": "failed"}`

4. **Validate từng QR**
   - Trim whitespace
   - Nếu có manifest: so sánh, gắn `status = "ok"` hoặc `"unknown"`
   - Nếu không có manifest: tất cả `status = "ok"`
   - Dedup trong cùng 1 ảnh

5. **Trả về dict** theo schema:
```python
{
    "decode_status": "success",   # hoặc "blurry" / "failed"
    "image_quality": "ok",        # hoặc "blurry" / "dark"
    "qr_codes": [
        {"data": "SKU-001", "type": "QR_CODE", "status": "ok"}
    ],
    "qr_count": 1,
    "box_status": "ok",           # "ok" / "warning" / "failed"
    "warnings": []
}
```

---

### `backend/session_manager.py`
Các hàm cần viết:

- `create_session(pallet_id, operator_id, manifest)` → trả session object
- `add_photo(session_id, photo_index, timestamp, image_path, qr_result)` → lưu ảnh vào session
- `get_session(session_id)` → lấy toàn bộ session
- `confirm_session(session_id)` → tổng hợp kết quả, sort theo photo_index ASC, sinh export_text

`export_text` là chuỗi plain-text dạng:
```
Ảnh #01 | SKU-ABC-001 | LOT-20241201
Ảnh #02 | SKU-ABC-002
Ảnh #03 | SKU-ABC-003 | LOT-20241201 | SHIP-VN-0099
```

---

### `backend/database.py`
Dùng SQLite. Tạo 2 bảng:

**`sessions`**
```sql
session_id TEXT PRIMARY KEY,
pallet_id TEXT,
operator_id TEXT,
manifest TEXT,        -- JSON array string
status TEXT,          -- active / confirmed
started_at TEXT,
confirmed_at TEXT
```

**`photos`**
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
session_id TEXT,
photo_index INTEGER,
timestamp TEXT,
image_path TEXT,
qr_codes TEXT,        -- JSON array string
qr_count INTEGER,
box_status TEXT
```

---

### `backend/models.py`
Pydantic models cho:
- `NewSessionRequest`
- `PhotoUploadRequest` (nhận `image_data` base64 + `photo_index`)
- `PhotoResult` (response sau xử lý ảnh)
- `ConfirmResponse` (response sau confirm)

---

### `backend/requirements.txt`
```
fastapi
uvicorn
pyzbar
opencv-python
scikit-image
python-multipart
websockets
pillow
```

---

## Frontend — Chi tiết từng file

### `src/App.jsx`
Quản lý 3 màn hình bằng state:
- `"home"` → Form nhập pallet_id, operator_id → nút "Bắt đầu quét"
- `"scanning"` → Màn hình quét chính
- `"result"` → Màn hình kết quả sau confirm

---

### `src/components/CameraCapture.jsx`
- Dùng `navigator.mediaDevices.getUserMedia` để truy cập camera
- Hiển thị live preview trong thẻ `<video>`
- Nút **"Chụp ảnh"** → capture frame ra `<canvas>` → convert sang base64
- Gọi `POST /sessions/{session_id}/photos` với base64
- Hiển thị loading spinner khi đang xử lý
- Sau khi có kết quả: hiển thị thông báo ngắn (xanh = ok, vàng = warning, đỏ = failed)
- Nút **"Xác nhận hoàn thành"** → gọi confirm API → chuyển sang màn hình result

---

### `src/components/ScanResult.jsx`
Hiển thị kết quả của ảnh vừa chụp:
- Số thứ tự ảnh + thời gian
- Danh sách QR codes đọc được, mỗi QR 1 dòng
- Badge màu xanh/vàng/đỏ cho từng QR theo status
- Warnings nếu có

---

### `src/components/SessionSummary.jsx`
Màn hình cuối sau khi confirm:
- Tiêu đề: `PALLET {pallet_id} — XÁC NHẬN HOÀN THÀNH`
- Bảng: mỗi hàng = 1 ảnh, cột = photo_index | timestamp | danh sách QR contents
- Footer: Tổng ảnh / Tổng QR / Trạng thái
- Nút **"Copy danh sách"** → copy `export_text` vào clipboard
- Nút **"Quét pallet mới"** → về màn hình home

---

### `src/api.js`
Các hàm fetch:
```js
createSession(palletId, operatorId, manifest)
uploadPhoto(sessionId, photoIndex, imageBase64)
confirmSession(sessionId)
getSession(sessionId)
```
Base URL đọc từ `import.meta.env.VITE_API_URL` (default `http://localhost:8000`).

---

## Yêu cầu quan trọng khi viết code

1. **Không dùng any / unknown không cần thiết** — type đầy đủ
2. **Xử lý lỗi** — mọi API call phải có try/catch, hiển thị lỗi ra UI bằng tiếng Việt
3. **Mỗi ảnh xử lý xong trong < 500ms** — scanner.py phải async-friendly
4. **WebSocket** — backend push event sau mỗi ảnh, frontend lắng nghe và cập nhật live
5. **Lưu ảnh gốc** vào thư mục `sessions/{session_id}/photo_NNN.jpg`
6. **README.md** — viết hướng dẫn chạy local:
   ```
   cd backend && pip install -r requirements.txt && uvicorn main:app --reload
   cd frontend && npm install && npm run dev
   ```

---

## Bắt đầu

Viết lần lượt từng file theo thứ tự:
1. `backend/database.py`
2. `backend/models.py`
3. `backend/scanner.py`
4. `backend/session_manager.py`
5. `backend/main.py`
6. `frontend/src/api.js`
7. `frontend/src/components/CameraCapture.jsx`
8. `frontend/src/components/ScanResult.jsx`
9. `frontend/src/components/SessionSummary.jsx`
10. `frontend/src/App.jsx`
11. `frontend/src/main.jsx`
12. `frontend/index.html`
13. `frontend/package.json`
14. `backend/requirements.txt`
15. `README.md`

Viết đầy đủ, không tóm tắt, không bỏ qua file nào.
