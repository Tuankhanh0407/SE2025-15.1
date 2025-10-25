## Cấu trúc thư mục của mã nguồn Hubs:

Mã nguồn chính của Hubs được chia thành các phần lớn (thư mục chính):
- **admin:** Ứng dụng điều khiển riêng biệt.
- **react-components:** Thư viện chứa các thành phần React dùng cho giao diện 2D (menu, cửa sổ, toolbar) của client.
- **src:** Toàn bộ mã logic của ứng dụng 3D, bao gồm hệ thống ECS, các component cho thực thể 3D, hệ thống mạng... (entry point và cấu hình được xác định trong ```webpack.config.js```).

Ngoài ra còn có các thư mục phụ trợ như **scripts** (công cụ tiện ích), **test** (kiểm thử), **types** (định nghĩa TypeScript), cùng các file cấu hình (.env, tsconfig, package.json...) và file cảnh (scene) hoặc giao diện mẫu (ví dụ **habitat** lưu asset mặc định).

Trong thư mục ```src```, mã được tổ chức thành các module chính như **components** (định nghĩa dữ liệu ECS và component), **systems** (hệ thống xử lý liên quan), **app** (khởi tạo thế giới và luồng chính), **utils** (hàm tiện ích cho mạng, JSON schema...), **scenes** (các scene 3D), **networking** (đồng bộ hóa trạng thái)... Ví dụ, file ```src/utils/hub-channel.js``` định nghĩa kênh Phoenix (HubChannel) dùng để đồng bộ dữ liệu giữa client và server .
