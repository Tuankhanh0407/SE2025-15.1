# BÁO CÁO TÌM HIỂU CẤU TRÚC DỮ LIỆU TRONG DỰ ÁN MOZILLA HUBS

## 1. Giới thiệu tổng quan về Mozilla Hubs:
Mozilla Hubs là một nền tảng không gian 3D đa người dùng trên trình duyệt (WebVR/WebXR) mã nguồn mở do Mozilla phát triển. Hubs hoạt động như một ứng dụng web chạy trên trình duyệt, chứa mã HTML/CSS/JS để mô phỏng một "thế giới 3D mạng" và hiển thị giao diện người dùng 2D cho các menu và điều khiển (tham khảo tại [đây](https://docs.hubsfoundation.org/dev-client-basics.html)
). Hubs dùng công nghệ A-Frame (với `Three.js`) để dựng cảnh 3D và BitECS cho kiến trúc ECS (quản lý trạng thái game). Hệ thống Hubs bao gồm cả phần client và các dịch vụ backend như là: Reticulum (server Phoenix quản lý trạng thái và hiện diện mạng), Dialog (NodeJS/Janus SFU xử lý truyền âm thanh/hình ảnh), cùng các thành phần khác như Networked-AFrame adapter và Janus Gateway. 

## 2. Cấu trúc thư mục mã nguồn Hubs:
Mã nguồn chính của Hubs được chia thành các phần lớn (thư mục chính):
