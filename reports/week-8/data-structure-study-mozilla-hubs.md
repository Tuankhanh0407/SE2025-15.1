# BÁO CÁO TÌM HIỂU CẤU TRÚC DỮ LIỆU TRONG DỰ ÁN MOZILLA HUBS

Dự án Mozilla Hubs là một hệ thống Metaverse/WebVR phức tạp, được xây dựng dựa trên kiến trúc **phân tán (distributed)**. Cấu trúc dữ liệu của dự án được tổ chức chặt chẽ trên ba cấp độ chính: **Client (bộ nhớ 3D)**, **Mạng (đồng bộ hóa)** và **Server (lưu trữ bền vững)**.

---

## 1. Cấu trúc dữ liệu phía Client (A-Frame/Three.js)

Dữ liệu quan trọng nhất ở phía Client là mô hình tổ chức các đối tượng 3D, được thực hiện thông qua kiến trúc **Entity-Component-System (ECS)** của framework **A-Frame**.

### 1.1. Mô hình Entity-Component-System (ECS)

ECS là mô hình cốt lõi để xây dựng các đối tượng và hành vi trong môi trường Hubs.

| Thành phần | Vai trò | Cấu trúc dữ liệu chính | Ví dụ chi tiết |
| :--- | :--- | :--- | :--- |
| **Entity** (Thực thể) | Là một đối tượng container rỗng, đại diện cho một vật thể trong không gian (ví dụ: avatar, bức tranh, mô hình 3D). | Về cơ bản là một **ID** duy nhất (UUID) để nhận dạng và một danh sách các **Components** đính kèm. | Thẻ HTML `<a-entity>` |
| **Component** (Thành phần) | Chứa **Dữ liệu (Data)** và **Logic (Behavior)** cụ thể cho Entity. Một Entity có thể có nhiều Components. | **Cặp khóa-giá trị (Key-Value Pair)**. Các loại dữ liệu thường gặp là:<br>- **Vector3**: Vị trí, tỉ lệ.<br>- **String/URL**: Đường dẫn tài sản (asset).<br>- **Boolean/Number**: Trạng thái (mute/unmute, độ lớn âm thanh). | `position`: Vector 3D `(x, y, z)`<br>`rotation`: Quaternion hoặc Euler Angles<br>`gltf-model`: Chuỗi URL của file `.glb`<br>`networked`: ID đối tượng, ID người tạo |
| **System** (Hệ thống) | Chứa **Logic** toàn cục và quản lý tất cả các Entities có cùng một Component. | Các cấu trúc dữ liệu toàn cục như **Hash Map** để tra cứu nhanh các Entities/Components. | `networked-system`: Quản lý đồng bộ hóa trạng thái qua mạng. |

**Liên hệ với đề tài:** Khi xây dựng một số features mới (ví dụ: một bài kiểm tra tương tác), sẽ tạo ra một **Component** mới để lưu trữ dữ liệu của bài kiểm tra (câu hỏi, đáp án, trạng thái làm bài) và một **System** để xử lý logic chấm điểm và tương tác.

### 1.2. Cấu trúc dữ liệu 3D (glTF/gB)

Tất cả các mô hình 3D và môi trường trong Hubs được lưu trữ dưới định dạng **glTF (GL Transmission Format)** hoặc bản nhị phân **.glb** (GLB Binary).

* **glTF (.glb):** Là một định dạng chuẩn mở, hoạt động như một "Scene Graph" (đồ thị cảnh), lưu trữ dữ liệu theo cấu trúc:
    * **Nodes:** Tổ chức phân cấp của các đối tượng 3D (vị trí, xoay, tỉ lệ).
    * **Meshes & Geometry:** Dữ liệu hình học (Vertices, Normals, UVs, Indices) được lưu trữ dưới dạng mảng nhị phân (**Typed Arrays** trong JavaScript) để tối ưu hiệu suất GPU.
    * **Materials & Textures:** Thông số vật liệu (PBR - Physically Based Rendering) và dữ liệu hình ảnh (textures) được nhúng trong file `.glb`.
    * **Animations:** Dữ liệu hoạt hình (ví dụ: avatar, cửa mở) dưới dạng các kênh (channels) keyframe.

---

## 2. Cấu trúc dữ liệu đồng bộ hóa (Networking)

Hubs sử dụng giao thức **WebSockets** (qua Reticulum) để đồng bộ hóa trạng thái đối tượng và **WebRTC** (qua Dialog) để truyền tải âm thanh/video.

### 2.1. Dữ liệu trạng thái phòng (Room State)

Đây là dữ liệu quan trọng nhất cần được đồng bộ hóa giữa tất cả Clients trong thời gian thực.

| Danh mục dữ liệu | Các trường dữ liệu chính | Cấu trúc dữ liệu |
| :--- | :--- | :--- |
| **Room Metadata** | `roomId`, `sceneId`, `roomName`, `policy`, `creatorId` | **JSON Object** |
| **User/Avatar State** | `userId`, `networkId`, `avatarId`, `displayName`, `isMuted`, `isTalking` | **JSON Object** (được gửi qua WebSockets) |
| **Transform Data** | `position`, `rotation` | **Vector3** và **Quaternion** (để tránh Gimbal Lock) |
| **Networked Object Data** | `objectId`, `creatorId`, `template`, `componentsData` | **JSON Object**. Trường `componentsData` lưu trữ dữ liệu của các Components tùy chỉnh cần đồng bộ. |

### 2.2. Truyền tải dữ liệu

Dữ liệu được truyền dưới dạng các gói tin (packets) **JSON** qua **WebSockets**. Để đảm bảo hiệu suất, chỉ các thay đổi nhỏ (delta) của **Transform Data** (vị trí/xoay) được gửi đi liên tục, không phải toàn bộ trạng thái.

---

## 3. Cấu trúc dữ liệu phía server (Reticulum)

**Reticulum** là server API được xây dựng bằng **Elixir/Phoenix**, chịu trách nhiệm quản lý phiên (session) và dữ liệu bền vững (persistent data), thường sử dụng một hệ quản trị cơ sở dữ liệu quan hệ như **PostgreSQL** hoặc **MySQL**.

Các bảng (tables) cơ sở dữ liệu chính bao gồm:

| Tên Bảng | Dữ liệu lưu trữ | Mục đích |
| :--- | :--- | :--- |
| **Scenes** | `id`, `slug`, `data` (JSON), `url` (file `.glb`) | Lưu trữ các môi trường 3D có sẵn, bao gồm cả dữ liệu JSON mô tả cảnh (được tạo từ Spoke). |
| **Rooms** | `id`, `sceneId`, `name`, `locked`, `createdAt`, `expiresAt` | Lưu trữ thông tin về các phòng được tạo ra và trạng thái của chúng (ví dụ: thời gian hết hạn của phòng tạm thời). |
| **Assets** | `id`, `ownerId`, `mimeType`, `url` | Lưu trữ siêu dữ liệu (metadata) của các tài sản 3D/Media đã được upload lên Hubs. |
| **SpokeProjects** | `id`, `ownerId`, `name`, `data` (JSON) | Lưu trữ chi tiết các dự án đang được chỉnh sửa trong Spoke. |
| **Users** | `id`, `username`, `email`, `hashedPassword`, `permissions` | Thông tin người dùng (chỉ áp dụng cho các phiên bản Hubs Cloud có đăng ký). |

### 3.1. Dữ liệu Spoke Project

Dữ liệu của dự án Spoke là một file **JSON** lớn. Cấu trúc JSON này là bản mô tả chi tiết của **Scene Graph**, bao gồm:

* Danh sách các **Object** (vật thể).
* Thuộc tính **Transform** (vị trí, xoay, tỉ lệ) cho từng Object.
* Các **Component** được gán cho từng Object (ví dụ: Component `video-texture`, Component `box-collider`).
* Các thiết lập toàn cảnh (Lighting, Fog, Ambient Audio).

---

## 4. Tóm tắt & Ứng dụng vào đề tài

| Mục tiêu đề tài | Cấu trúc dữ liệu cần can thiệp | Mô tả công việc |
| :--- | :--- | :--- |
| **Xây dựng Features mới** (ví dụ: tương tác giáo dục) | **Client ECS (Component & System)**, **Networked Object Data**. | Tạo Component mới để lưu trữ dữ liệu Feature (ví dụ: nội dung bài giảng, trạng thái tương tác). Đảm bảo Component này được đánh dấu là `networked` để đồng bộ hóa. |
| **Sửa UI/UX demo** | **Client A-Frame/React (DOM)**. | Thường là can thiệp vào cách dữ liệu **Component** được hiển thị hoặc cách các hành vi được xử lý trong **System** hiện có. |
| **Bài toán metaverse trong giáo dục** | **Server Database (`Scenes`, `Assets`)**. | Có thể cần lưu trữ các tài sản giáo dục (bài giảng 3D, mô hình khoa học) một cách bền vững bằng cách tạo các bản ghi (records) trong bảng **Assets** và tham chiếu chúng trong cảnh. |

---

## 5. Tài liệu tham khảo

Các tài liệu và nguồn mã nguồn mở được sử dụng để phân tích cấu trúc dữ liệu của Mozilla Hubs bao gồm:

1.  **Mã nguồn chính thức trên GitHub:**
    * [Hubs Repository (Hubs-Foundation/hubs)](https://github.com/Hubs-Foundation/hubs): Nguồn chính cho Client (A-Frame) và các Components.
    * [Spoke Repository (Hubs-Foundation/Spoke)](https://github.com/Hubs-Foundation/Spoke): Nguồn chính cho công cụ chỉnh sửa cảnh, mô tả cấu trúc dữ liệu Scene JSON.
    * [Reticulum Repository (Hubs-Foundation/reticulum)](https://github.com/Hubs-Foundation/reticulum): Nguồn chính cho Server API (Elixir/Phoenix), tiết lộ cấu trúc Database và API đồng bộ hóa.
2.  **Tài liệu A-Frame:**
    * [A-Frame Documentation - Entity-Component-System](https://aframe.io/docs/): Tài liệu chi tiết về mô hình ECS, cách tổ chức dữ liệu Component và System.
3.  **Tài liệu GLTF/GLB:**
    * [glTF™ (GL Transmission Format) - Khronos Group](https://www.khronos.org/gltf/): Mô tả cấu trúc dữ liệu của mô hình 3D tiêu chuẩn được Hubs sử dụng.
