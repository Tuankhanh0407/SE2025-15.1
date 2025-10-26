# BÁO CÁO TÌM HIỂU CẤU TRÚC DỮ LIỆU TRONG DỰ ÁN MOZILLA HUBS

## 1. Giới thiệu tổng quan về Mozilla Hubs:
Mozilla Hubs là một nền tảng không gian 3D đa người dùng trên trình duyệt (WebVR/WebXR) mã nguồn mở do Mozilla phát triển. Hubs hoạt động như một ứng dụng web chạy trên trình duyệt, chứa mã HTML/CSS/JS để mô phỏng một "thế giới 3D mạng" và hiển thị giao diện người dùng 2D cho các menu và điều khiển (tham khảo tại [tài liệu 1](https://docs.hubsfoundation.org/dev-client-basics.html) và [tài liệu 2](https://github.com/Hubs-Foundation/hubs)). Hubs dùng công nghệ A-Frame (với `Three.js`) để dựng cảnh 3D và BitECS cho kiến trúc ECS (quản lý trạng thái game). Hệ thống Hubs bao gồm cả phần client và các dịch vụ backend như là: Reticulum (server Phoenix quản lý trạng thái và hiện diện mạng), Dialog (NodeJS/Janus SFU xử lý truyền âm thanh/hình ảnh), cùng các thành phần khác như Networked-AFrame adapter và Janus Gateway (tham khảo tại [tài liệu 2](https://zachfox.io/hubs-webrtc-tester/about/) và [tài liệu 3](https://docs.hubsfoundation.org/dev-client-networking.html)). 

## 2. Cấu trúc thư mục mã nguồn Hubs:
Mã nguồn chính của Hubs được chia thành các phần lớn (thư mục chính):
- **admin:** Ứng dụng điều khiển (admin panel) riêng biệt.
- **react-components:** Thư viện các thành phần React dùng cho giao diện 2D (menu, cửa sổ, toolbar) của client.
- **src:** Toàn bộ mã logic của ứng dụng 3D, bao gồm hệ thống ECS, các thành phần cho thực thể 3D, hệ thống mạng... (entry point và cấu hình được xác định trong `webpack.config.js` (tham khảo tại [tài liệu 1](https://docs.hubsfoundation.org/dev-client-basics.html))).
- Ngoài ra còn có các thư mục phụ trợ như **scripts** (công cụ tiện ích), **test** (kiểm thử), **types** (định nghĩa TypeScript), cùng các file cấu hình (.env, tsconfig, package.json...) và file cảnh (scene) hoặc giao diện mẫu (ví dụ **habitat** lưu asset mặc định).

Trong thư mục `src`, mã được tổ chức thành các module chính như **components** (định nghĩa dữ liệu ECS và thành phần), **systems** (hệ thống xử lý liên quan), **app** (khởi tạo thế giới và luồng chính), **utils** (hàm tiện ích cho mạng, JSON schema,...), **scenes** (các scene 3D), **networking** (đồng bộ hóa trạng thái)... Ví dụ, file `src/utils/hub-channel.js` định nghĩa kênh Phoenix (HubChannel) dùng để đồng bộ dữ liệu giữa client và server (tham khảo tại [tài liệu 4](https://docs.hubsfoundation.org/dev-client-networking.html)).

## 3. Mô hình dữ hiệu của Hubs:
Mô hình dữ liệu của Hubs bao gồm nhiều thành phần: 
- **Cảnh 3D:** Các phòng (rooms) trong Hubs được thiết kế bằng công cụ Spoke và xuất ra định dạng GLB (glTF). Client tải GLB này qua HTTP và nhúng vào A-Frame scene với `Three.js` quản lý. Cảnh 3D bao gồm địa hình, vật thể, ánh sáng... và được tổ chức theo cây cảnh (scene graph) của `Three.js`. Dữ liệu GLB chứa mesh, texture, animation... cho avatar và môi trường.
- **Thực thể và trạng thái các thành phần:** Bên cạnh cây cảnh, Hubs giữ trạng thái thế giới bằng hệ thống ECS của *bitECS* (tham khảo tại [tài liệu 1](https://docs.hubsfoundation.org/dev-client-basics.html)). Mỗi **thực thể** là một đối tượng có ID độc nhất, và đi kèm một tập *thành phần dữ liệu** (ví dụ như vị trí, góc quay, animation state, avatar customisation). Dữ liệu thành phần được lưu trong các `TypeArray` tối ưu. Ví dụ, vị trí (position) và góc xoay (rotation) được **đồng bộ hóa** liên tục; thông tin biểu cảm, avatar attachment, trạng thái điều khiển (ví dụ đang nói) cũng có thể được lưu trong các thành phần tương ứng. Khi cần đồng bộ client chỉ gửi những thành phần thuộc *schema mạng* đã định nghĩa. Các schema này (định nghĩa trong mã nguồn như trong `src/utils/network-schemas.js`) chỉ rõ các trường dữ liệu nào sẽ đồng bộ (tham khảo tại [tài liệu 4](https://docs.hubsfoundation.org/dev-client-networking.html)).
- **Avatar state:** Avatar của người dùng được tạo từ mô hình 3D cơ sở (robot template) có thể tùy chỉnh skin. Trạng thái avatar bao gồm kiểu mô hình, texture, và các thành phần vị trí (vị trí thân, tay, chân, đầu). Hubs đồng bộ hóa các biến dạng đốt xương (joint) hoặc các trigger animation để khi người dùng vận động (chạy, nhảy, giơ tay) thì biểu diễn nhất quán trên các client. Dữ liệu này được biểu diễn dưới dạng giá trị số (float) trong component (ví dụ giá trị xoay khớp) và được gửi qua Phoenix dưới dạng JSON.
- **Định dạng dữ liệu mạng:** Các thống báo qua WebSocket chủ yếu là các payload JSON chứa thông tin entity ID và giá trị thành phần đã cập nhật. Ví dụ một message có thể giống `{"m": "update", "e": 123, "c": {"p": {"x": 1.0, "y": 2.0, "z": 3.0}, "r": {"x": 0, "y": 90, "z": 0}}}`, trong đó `e` là entity ID, `c` chứa thành phần `p` (position) và `r` (rotation). Dữ liệu WebRTC (âm thanh/video) không dùng JSON mà là các luồng nhị phân (MediaStream); tuy nhiên việc khởi tạo phiên WebRTC giữa client và Janus cũng sử dụng signaling (SDP) qua WecSocket.
- **Đồng bộ hóa:** Mạng đồng bộ theo cơ chế "eventual consistency": Reticulum chỉ biết gửi tín hiệu, còn mỗi client tự nhận và áp dụng dữ liệu theo cách của mình. Client thường gửi cập nhật định kỳ (ví dụ 10 lần/giây) chứ không mỗi khi trạng thái thay đổi ngay lập tức. Khi client rời phòng, các thực thể do client đó tạo ra sẽ bị xóa trừ khi được đánh dấu pinned (lưu vào DB) (tham khảo tại [tài liệu 4](https://docs.hubsfoundation.org/dev-client-networking.html)).

## 4. Tài liệu tham khảo:

Các tài liệu và nguồn mã nguồn mở được sử dụng để phân tích cấu trúc dữ liệu của Mozilla Hubs bao gồm:

1. **Tài liệu 1:** [Hubs Client development Basics](https://docs.hubsfoundation.org/dev-client-basics.html)
2. **Tài liệu 2:** [GitHub - Hubs-Foundation/hubs: Duck-themed multi-user virtual spaces in WebVR. Built with A-Frame](https://github.com/Hubs-Foundation/hubs)
3. **Tài liệu 3:** [How Mozilla Hubs Uses WebRTC](https://zachfox.io/hubs-webrtc-tester/about/)
4. **Tài liệu 4:** [Hubs Client development Networking](https://docs.hubsfoundation.org/dev-client-networking.html)
