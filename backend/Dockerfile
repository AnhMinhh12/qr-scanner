# Sử dụng Python image chính thức
FROM python:3.9-slim

# Cài đặt các thư viện hệ thống cần thiết cho OpenCV và PyZbar
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libzbar0 \
    && rm -rf /var/lib/apt/lists/*

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy file requirements và cài đặt dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ code backend vào container
COPY . .

# Expose port mà FastAPI sẽ chạy
EXPOSE 8000

# Lệnh khởi chạy server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
