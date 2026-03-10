# Bước 1: Build React app
FROM node:18-alpine as build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Truyền biến môi trường nếu cần lúc build
# ARG VITE_API_URL
# ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Bước 2: Phục vụ bằng Nginx
FROM nginx:stable-alpine

# Copy file build từ bước 1
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy file config nginx tùy chỉnh (tùy chọn)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
