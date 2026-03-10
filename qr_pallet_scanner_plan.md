# 📦 Box-by-Box QR Pallet Scanner
### Bản Kế Hoạch Kỹ Thuật — Phiên bản 1.0

---

## Mục lục

1. [Xác định bài toán](#1-xác-định-bài-toán)
2. [Luồng nghiệp vụ thực tế](#2-luồng-nghiệp-vụ-thực-tế)
3. [Processing Pipeline](#3-processing-pipeline)
4. [Data Model](#4-data-model)
5. [Kết quả trả về cuối session](#5-kết-quả-trả-về-cuối-session)
6. [Điểm kỹ thuật cần xử lý](#6-điểm-kỹ-thuật-cần-xử-lý)
7. [Thiết kế thông báo](#7-thiết-kế-thông-báo)
8. [Tech Stack](#8-tech-stack)
9. [Roadmap triển khai](#9-roadmap-triển-khai)

---

## 1. Xác định bài toán

Hệ thống hỗ trợ quét QR code trên từng thùng hàng một cách tuần tự. Mỗi lần chụp ảnh một thùng, phần mềm tự nhận diện tất cả QR codes hiện có, lưu lại theo thứ tự ảnh chụp và hiển thị tổng hợp toàn bộ nội dung sau khi kết thúc phiên quét.

### Phân biệt đúng/sai

| ❌ Cách hiểu sai | ✅ Bài toán thực tế |
|---|---|
| Quét toàn pallet 1 lần duy nhất | Quét từng thùng, **1 shot / 1 thùng** |
| Camera cố định trên cao | Camera di động, cầm tay |
| Beam sweep qua nhiều thùng | Chụp ảnh rời rạc, tuần tự từng thùng |
| Cần multi-camera 4 góc | 1 camera, đơn giản hơn nhiều |

### Input / Output

**Mỗi lần chụp (1 thùng):**

| | Nội dung |
|---|---|
| **INPUT** | 1 ảnh chụp mặt thùng hàng hiện tại |
| **OUTPUT** | Danh sách QR codes đọc được + cảnh báo nếu có |

**Cuối session (xác nhận xong hết pallet):**

| | Nội dung |
|---|---|
| **INPUT** | Người vận hành nhấn "Xác nhận hoàn thành" |
| **OUTPUT** | Toàn bộ nội dung QR theo thứ tự số ảnh chụp |

---

## 2. Luồng nghiệp vụ thực tế

```
KHỞI TẠO
│
├─ Tạo phiên quét mới
│
▼
VÒNG LẶP QUÉT TỪNG THÙNG
│
├─ [1] Người dùng chụp ảnh 1 thùng
│
├─ [2] Hệ thống nhận diện & trích xuất nội dung QR
│
├─ [3] Hiển thị thông báo: "Đã đọc X mã trên thùng này"
│
└─ Lặp lại cho các thùng tiếp theo
│
▼
KẾT THÚC & XUẤT KẾT QUẢ
│
├─ Nhấn "Hoàn thành"
│
└─ Hiển thị danh sách toàn bộ nội dung QR theo thứ tự ảnh chụp
```

---

## 3. Processing Pipeline

### Xử lý mỗi lần chụp

```
[BƯỚC 1] NHẬN ẢNH
   Camera chụp 1 shot → gửi lên server hoặc xử lý ngay trên device
   Format: JPEG/PNG | Giao thức: base64 API / local file / USB
        │
        ▼
[BƯỚC 2] TIỀN XỬ LÝ (Preprocessing)
   - Chuyển sang Grayscale
   - CLAHE: tăng độ tương phản vùng tối/sáng không đều
   - Gaussian blur nhẹ → giảm noise
   - Sharpen nếu ảnh mờ
   - Auto-deskew: căn chỉnh góc nghiêng
   - Phát hiện và crop ROI chứa thùng hàng
   Thư viện: OpenCV, scikit-image
        │
        ▼
[BƯỚC 3] MULTI-QR DECODE
   - Chạy pyzbar.decode() → trả về LIST tất cả QR trong ảnh
   - Không dừng ở QR đầu tiên — 1 thùng có thể có nhiều QR
   - Mỗi QR trả về: data (nội dung), type, bounding box, polygon
   - Confidence check: retry với threshold khác nếu decode yếu
   Thư viện: pyzbar, ZXing, OpenCV QRCodeDetector
        │
        ▼
[BƯỚC 4] VALIDATE & CHECK
   - Kiểm tra format mã theo quy tắc nghiệp vụ
   - Nếu có manifest: Đối chiếu QR lạ / QR thiếu
   - Nếu KHÔNG manifest: Tự động thêm mã vào danh sách thu thập mới
   - Gắn nhãn status: ok / error
        │
        ▼
[BƯỚC 5] CẬP NHẬT SESSION
   - Lưu QR codes mới vào session với photo_index hiện tại
   - Tăng box_counter
   - Ghi DB: ảnh gốc + metadata + danh sách QR
   - Cập nhật running total
        │
        ▼
[BƯỚC 6] TRẢ KẾT QUẢ VỀ UI
   - JSON response trả về app ngay lập tức
   - Push WebSocket nếu có màn hình ngoài
   - UI hiển thị thông báo theo case (OK / warning / error)
```

### Latency budget mỗi shot

| Bước | Thời gian | Ghi chú |
|---|---|---|
| Capture ảnh → upload | ~200ms | Phụ thuộc network/USB |
| Preprocessing | ~30ms | CPU, OpenCV |
| QR decode | ~50ms | pyzbar |
| Validate + DB write | ~20ms | SQLite hoặc API |
| Response đến UI | ~10ms | JSON + WebSocket |
| **TỔNG** | **~310ms** | Mục tiêu < 500ms |

---

## 4. Data Model

### Session object

```json
{
  "session_id": "PLT-20241201-001",
  "pallet_id": "P-00123",
  "operator_id": "OP-05",
  "started_at": "2024-12-01T10:30:00Z",
  "confirmed_at": "2024-12-01T10:45:22Z",
  "status": "confirmed",

  "photos": [
    {
      "photo_index": 1,
      "timestamp": "2024-12-01T10:30:15Z",
      "image_path": "sessions/PLT-001/photo_001.jpg",
      "qr_codes": [
        {
          "data": "SKU-ABC-001",
          "type": "QR_CODE",
          "status": "ok"
        },
        {
          "data": "LOT-20241201",
          "type": "QR_CODE",
          "status": "ok"
        }
      ],
      "qr_count": 2,
      "box_status": "ok"
    },
    {
      "photo_index": 2,
      "timestamp": "2024-12-01T10:30:42Z",
      "image_path": "sessions/PLT-001/photo_002.jpg",
      "qr_codes": [
        {
          "data": "SKU-ABC-002",
          "type": "QR_CODE",
          "status": "ok"
        }
      ],
      "qr_count": 1,
      "box_status": "ok"
    }
  ],

  "summary": {
    "total_photos": 20,
    "total_qr": 42
  }
}
```

### Giải thích các field quan trọng

| Field | Kiểu | Mô tả |
|---|---|---|
| `session_id` | string | ID duy nhất của phiên quét |
| `pallet_id` | string | Mã pallet đang xử lý |
| `photos[]` | array | Danh sách ảnh theo thứ tự chụp |
| `photo_index` | int | Số thứ tự ảnh — **key để sắp xếp kết quả cuối** |
| `qr_codes[]` | array | Tất cả QR đọc được trong ảnh đó |
| `qr_codes[].data` | string | Nội dung thực của QR code |

---

## 5. Kết quả trả về cuối session

Đây là tính năng cốt lõi: sau khi người vận hành **xác nhận đã quét xong toàn bộ pallet**, hệ thống trả về nội dung đầy đủ của tất cả QR codes, **sắp xếp theo số thứ tự ảnh chụp**.

### API response — `POST /sessions/{session_id}/confirm`

```json
{
  "session_id": "PLT-20241201-001",
  "pallet_id": "P-00123",
  "confirmed_at": "2024-12-01T10:45:22Z",
  "status": "confirmed",

  "result_by_photo": [
    {
      "photo_index": 1,
      "timestamp": "10:30:15",
      "qr_contents": ["SKU-ABC-001", "LOT-20241201"]
    },
    {
      "photo_index": 2,
      "timestamp": "10:30:42",
      "qr_contents": ["SKU-ABC-002"]
    },
    {
      "photo_index": 3,
      "timestamp": "10:31:05",
      "qr_contents": ["SKU-ABC-003", "LOT-20241201", "SHIP-VN-0099"]
    },
    {
      "photo_index": 4,
      "timestamp": "10:31:28",
      "qr_contents": ["SKU-ABC-004"]
    }
  ],

  "summary": {
    "total_photos": 20,
    "total_qr": 42
  }
}
```

### Quy tắc sắp xếp và tổng hợp

```
Khi người vận hành nhấn "Xác nhận xong":

1. Lấy toàn bộ photos[] từ session, sort theo photo_index ASC

2. Với mỗi photo:
   - Lấy danh sách qr_codes[] của ảnh đó
   - Chỉ lấy các QR có status = ok hoặc unknown
   - Ghi vào result_by_photo[photo_index].qr_contents[]

3. Hiển thị danh sách QR_Contents thô theo từng Photo_Index.
```

### Ví dụ hiển thị trên màn hình sau xác nhận

```
════════════════════════════════════════
🏁  PALLET P-00123 — XÁC NHẬN HOÀN THÀNH
════════════════════════════════════════

  Ảnh #01  │  SKU-ABC-001  │  LOT-20241201
 Ảnh #02  │  SKU-ABC-002
 Ảnh #03  │  SKU-ABC-003  │  LOT-20241201  │  SHIP-VN-0099
 Ảnh #04  │  SKU-ABC-004
 Ảnh #05  │  SKU-ABC-005  │  LOT-20241201
 ...
 Ảnh #20  │  SKU-ABC-020

────────────────────────────────────────
 Tổng ảnh chụp   :  20
 Tổng QR đọc được:  42
 Trạng thái       :  ✅ OK
════════════════════════════════════════
```

---

## 6. Điểm kỹ thuật cần xử lý

### 6.1 Ảnh bị mờ / tối / nghiêng

**Mức độ:** Quan trọng

**Nguyên nhân:** Người cầm tay → rung, góc không chuẩn, ánh sáng kho không đều.

**Giải pháp:**
- UI hiển thị khung ngắm căn chỉnh + bật đèn flash bắt buộc
- Auto-reject ảnh blur: tính Laplacian variance, nếu dưới ngưỡng → yêu cầu chụp lại
- Preprocessing: CLAHE contrast enhancement + auto-deskew tự động

---

### 6.2 Độ trễ phản hồi (Real-time Feedback)

**Mức độ:** Cần thiết

**Nguyên nhân:** Người vận hành cần biết ngay kết quả để chuyển sang thùng tiếp theo mà không phải chờ đợi.

**Giải pháp:**
- UI hiển thị trạng thái "Đang xử lý..." ngay khi vừa bấm chụp.
- Hiển thị box xanh/đỏ đè lên ảnh (bounding boxes) để xác nhận hệ thống đã đọc đúng vị trí QR.
- Dùng âm thanh (Bíp / Success sound) để phản hồi nhanh.

---

### 6.3 Một thùng có nhiều QR codes

**Mức độ:** Cần thiết

**Nguyên nhân:** Thùng có nhãn SKU + nhãn LOT + nhãn vận chuyển → 2–4 QR trên 1 ảnh.

**Giải pháp:**
- `pyzbar.decode()` trả về list → xử lý tất cả, không dừng ở QR đầu tiên
- Config: định nghĩa loại QR nào là `primary` (bắt buộc phải có)
- Tất cả QR trong cùng 1 ảnh được ghi chung vào `photo_index` đó
- Thông báo: `Thùng #5: 3 QR — SKU ✓ | LOT ✓ | SHIP ✓`

---

### 6.4 QR không đọc được (rách, mờ nhãn)

**Mức độ:** Cực kỳ quan trọng (do không có nhập tay)

**Nguyên nhân:** Nhãn bị ướt, rách, in kém → decode fail hoàn toàn.

**Giải pháp:**
- **Capture Chế độ liên tục:** Nếu chụp shot đầu fail, hệ thống tự động gợi ý chụp lại ở góc khác hoặc bật Flash.
- **Preprocessing thông minh:** Tự động thử nghiệm 5-10 bộ lọc (threshold, sharpening) khác nhau đồng thời.
- **Super-Resolution:** Sử dụng AI/Deep Learning để tăng độ phân giải vùng chứa QR trước khi decode.
- **Cảnh báo rõ ràng:** Nếu ảnh mờ, UI báo ngay "Ảnh mờ - Vui lòng giữ chắc tay và chụp lại".

---

### 6.5 Xuất dữ liệu

Hệ thống hỗ trợ copy nhanh toàn bộ nội dung QR dưới dạng text/list để dán vào file Excel hoặc gửi qua Zalo/Email.

---

## 7. Thiết kế thông báo

Sau khi xác nhận, hệ thống trả về kết quả đầy đủ nội dung các mã đã quét.

---

## 8. Tech Stack

| Tầng | Công nghệ | Ghi chú |
|---|---|---|
| Camera / Capture | OpenCV VideoCapture, V4L2 | Camera USB hoặc IP, ≥ 2MP |
| QR Decode | pyzbar + OpenCV | Decode song song nhiều QR / ảnh |
| Preprocessing | OpenCV, scikit-image | CLAHE, Gaussian, deskew |
| Backend API | FastAPI (Python) | REST + WebSocket, async |
| Database | SQLite / PostgreSQL | Session, QR log, ảnh gốc |
| Frontend / UI | React + Vite | Giao diện đơn giản, hiển thị kết quả |
| Lưu trữ | Local Storage / SQLite | Lưu tạm phiên quét hiện tại |

Camera
  │ Chụp ảnh
  ▼
Xử lý (Python/OpenCV)
  ├── Nhận diện QR
  └── Trích xuất nội dung
        │
        └──► Hiển thị danh sách kết quả (Text/List)

---

## 9. Roadmap triển khai

| Giai đoạn | Nội dung | Thời gian |
|---|---|---|
| **Tuần 1–2** | Setup môi trường, kết nối camera, capture + hiển thị ảnh thô | 2 tuần |
| **Tuần 3–4** | Preprocessing pipeline + single/multi QR detection | 2 tuần |
| **Tuần 5–6** | Session management, business rules, validate, DB lưu trữ | 2 tuần |
| **Tuần 7–8** | Backend API (FastAPI) + Dashboard UI realtime (React) | 2 tuần |
| **Tuần 9–10** | **Tính năng xác nhận + trả kết quả theo photo_index** | 2 tuần |
| **Tuần 11–12** | Tích hợp WMS/ERP + testing thực tế với pallet thật | 2 tuần |
| **Tuần 13–14** | UAT với người vận hành, tối ưu UX & hiệu năng, deploy | 2 tuần |

### Ước tính chi phí

| Hạng mục | Loại | Chi phí ước tính |
|---|---|---|
| Camera 2MP–4MP + giá đỡ | Hardware | 2–5 triệu VNĐ |
| Tablet / Mini PC xử lý | Hardware | 5–15 triệu VNĐ |
| Phát triển phần mềm | Software | 40–80 triệu VNĐ |
| Testing & UAT | Software | 10–20 triệu VNĐ |
| Tích hợp WMS/ERP | Software | 15–30 triệu VNĐ |
| **TỔNG ƯỚC TÍNH** | | **72–150 triệu VNĐ** |

---

1. **Đầu ra** — Kết quả cuối cùng bạn muốn copy dạng danh sách text hay file Excel?
2. **Thiết bị** — Bạn sẽ dùng điện thoại hay laptop kết nối camera?

---

*Bản kế hoạch v1.0 — Cần xác nhận các câu hỏi ở Phụ lục trước khi bắt đầu phát triển.*
