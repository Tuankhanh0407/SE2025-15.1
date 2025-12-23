# SE2025-15.1 - Mozilla Hubs for Education (Hubs Compose)

Đề tài: **Xây dựng môi trường Metaverse hỗ trợ giảng dạy và học tập trực tuyến** dựa trên nền tảng **Mozilla Hubs (Community Edition)**, triển khai bằng **Hubs Compose**.

## Group information

Nhóm gồm 4 thành viên:

- **Hoàng Lê Tuấn (22001653)** - Team leader
- **Thiều Văn Long (22001611)**
- **Phạm Hưng (22001598)**
- **Vương Sỹ Việt (22001661)**

## Technologies

- **Orchestration/Deployment (Local Dev):** Docker, Docker Compose, Mutagen/Mutagen Compose
- **Core services:**
  - **Reticulum** (backend / identity / room management)
  - **Hubs Client** (frontend WebXR)
  - **Hubs Admin** (admin console)
  - **Dialog** (SFU / mediasoup)
  - **Spoke** (scene editor)
  - **Postgrest + PostgreSQL**
- **Mail testing:** Mailpit (+ reverse proxy `mailpit-https`)

---

## Video demo dự án

Link truy cập video demo dự án:
https://drive.google.com/file/d/1E6jtxwOqJF4xnpo2U_IzBdaBdNt6o8Mm/view?usp=drive_link

---

## Goal and Objective

### Goal

Mục tiêu của dự án là **tái sử dụng và mở rộng Mozilla Hubs (Community Edition)** để xây dựng một **không gian lớp học ảo (metaverse) phục vụ giáo dục**, trong đó hỗ trợ:

- **Học tập đồng bộ theo thời gian thực:** giao tiếp bằng giọng nói, chat, chia sẻ nội dung trong cùng "phòng học ảo".
- **Tổ chức lớp học theo vai trò:** phân quyền giáo viên và học sinh nhằm quản trị lớp học, kiểm soát phát biểu và điều phối hoạt động.
- **Tăng tính tương tác và điều hành lớp học:** cơ chế giơ tay phát biểu, chế độ giảng (lecture mode) và quy trình thuyết trình thông qua chia sẻ màn hình.
- **Nâng cao trải nghiệm người dùng:** cải thiện UI/UX, chuẩn hoá ngôn ngữ tiếng Anh trên các nền tảng và giảm sự gián đoạn trong luồng đăng nhập.
- **Khả năng mở rộng:** đặt nền tảng để bổ sung các tương tác lớp học, giao–nộp bài và poll/quiz thời gian thực.

### Objective

Các mục tiêu nghiệp vụ được định nghĩa theo hướng **đo lường được** và bám sát bài toán giảng dạy trực tuyến.

**(1) Khả năng triển khai và vận hành trong môi trường thực hành môn học**

- Hệ thống chạy được bằng Hubs Compose với quy trình thiết lập rõ ràng.
- Dùng Mailpit để mô phỏng email "magic link" giúp đăng nhập trong môi trường local.

**(2) Hiệu quả điều phối lớp học**

- Cho phép giáo viên:
  - quản trị phát biểu (cấp/thu quyền nói trong lecture mode)
  - xử lý yêu cầu thuyết trình
  - theo dõi điểm danh và xuất dữ liệu
- Cho phép học sinh:
  - giơ tay để xin phát biểu
  - gửi yêu cầu thuyết trình
  - tham gia lớp bằng link/mã phòng

**(3) Tối ưu trải nghiệm người dùng (UX) cho luồng đăng nhập và thao tác lớp học**

- Cung cấp giao diện "Accept/Deny" thân thiện để xử lý đăng nhập qua email trong Mailpit.
- Chuẩn hoá chuỗi tiếng Anh và nâng cấp giao diện trang chủ (Join/Teacher flows, Live Classes).

---

## Mô tả use case

### Use case tổng quan (đã hoàn thành)

1. **Tạo phòng học (Teacher)**
   - Giáo viên tạo phòng với lựa chọn scene, cấu hình public/private và số lượng người tham gia tối đa.
2. **Tham gia lớp học (Student)**
   - Học sinh tham gia bằng link, mã phòng hoặc các phòng học đang hoạt động trên giao diện.
3. **Giơ tay xin phát biểu (Student → Teacher)**
   - Học sinh giơ tay, giáo viên nhận thông báo và có thể cấp quyền nói.
4. **Chế độ giảng (Lecture Mode)**
   - Khi bật lecture mode: học sinh bị hạn chế phát biểu mặc định và phải xin quyền nói.
5. **Điểm danh và xuất báo cáo (Teacher)**
   - Theo dõi người tham gia (trừ giáo viên), ghi thời điểm vào/ra, xuất CSV.
6. **Thuyết trình / chia sẻ màn hình theo cơ chế yêu cầu–phê duyệt**
   - Học sinh gửi "request to present", giáo viên duyệt/từ chối.
   - Khi duyệt, học sinh chủ động bấm "Start Presenting" (đảm bảo user gesture theo yêu cầu trình duyệt).
   - Nội dung chia sẻ được hiển thị lên "board projection" (màn chiếu/bảng) trong phòng.
7. **Danh sách phòng học đang hoạt động (Live Classes)**
   - Trang chủ hiển thị danh sách phòng public có người tham gia (member_count > 0), tự động refresh.
8. **Quản trị người dùng và phân quyền hệ thống (Admin)**
   - Admin panel hỗ trợ tìm kiếm, tạo tài khoản, enable/disable, promote/demote admin, xoá tài khoản.
9. **Luồng đăng nhập magic link được "thân thiện hoá" trên Mailpit**
   - Ngay trong UI email (Mailpit), có nút Accept/Deny cho yêu cầu đăng nhập, thay vì phải copy link thủ công.
10. **Chuẩn hoá giao diện và ngôn ngữ hệ thống**
    - Cải tiến UI/UX toàn hệ thống theo hướng hiện đại, thân thiện và nhất quán.
    - Đảm bảo đầy đủ chức năng và khả năng sử dụng trên các nền tảng khác nhau.
    - Đồng nhất ngôn ngữ hiển thị Tiếng Anh trên mọi trình duyệt và môi trường.

### Use case dự kiến thực hiện

1. **Tương tác vật thể trong phòng học**
   - Kéo ghế, đóng/mở cửa, viết nội dung lên bảng.
2. **Giao–nộp bài tập**
   - Giáo viên giao bài, học sinh nộp bài, quản lý trạng thái và thời hạn.
3. **Poll/Quiz thời gian thực thông qua chat và event**
   - Thực hiện câu hỏi trắc nghiệm/khảo sát ngay trong lớp học, tổng hợp kết quả theo thời gian thực.

---

## Các tính năng đã bổ sung và thay đổi

### 1) Giơ tay phát biểu

- **Mục tiêu:** tăng khả năng điều phối phát biểu trong lớp học ảo.
- **Cơ chế:** học sinh dùng nút "Raise Hand/Lower Hand", trạng thái được sync qua presence, giáo viên nhận thông báo và thao tác cấp quyền nói.

### 2) Hệ thống phân quyền giáo viên và học sinh

- **Mục tiêu:** tách biệt trách nhiệm và quyền thao tác giữa giáo viên và học sinh.
- **Cơ chế:** vai trò được suy ra từ owner/creator và mở rộng qua `profile.isTeacher`, đồng bộ thông qua presence update.

### 3) Tính năng giảng dạy cho giáo viên (Lecture Mode + kiểm soát phát biểu)

- **Mục tiêu:** hỗ trợ kịch bản lớp học "một-nói-nhiều-nghe", giảm nhiễu âm thanh.
- **Cơ chế:**
  - Giáo viên bật/tắt lecture mode.
  - Khi bật, học sinh phải xin quyền nói, giáo viên cấp/thu quyền nói theo session.
  - Hỗ trợ "late joiner state sync" để người vào sau nhận đúng trạng thái.

### 4) Thuyết trình (Presentation Requests) và chia sẻ màn hình lên bảng

- **Mục tiêu:** chuẩn hoá quy trình thuyết trình trong lớp học: học sinh yêu cầu, giáo viên duyệt, học sinh tự bắt đầu chia sẻ.
- **Cơ chế chính:**
  - Học sinh bấm "Request to Present" → gửi message `present_request`.
  - Giáo viên duyệt/từ chối trong modal "Presentation Requests".
  - Sau khi duyệt, học sinh bấm "Start Presenting" để bật `getDisplayMedia` (bắt buộc user gesture).
  - Hệ thống `board-projection-system` tạo entity hiển thị stream lên bảng chiếu.

### 5) Chia sẻ nội dung cho học sinh (focus lock / share-to-students)

- **Mục tiêu:** trong khi giảng, giáo viên có thể hướng sự chú ý của học sinh vào cùng một đối tượng (tài liệu, mô hình, media, ...).
- **Cơ chế:**
  - Khi giáo viên đang inspect một object, có nút "Share with Students".
  - Học sinh nhận banner và có thể bấm "View" để inspect cùng object.

### 6) Điểm danh (Attendance) cho giáo viên

- **Mục tiêu:** ghi nhận tham gia lớp và xuất dữ liệu phục vụ quản lý lớp.
- **Cơ chế:** theo dõi join/leave dựa trên presence và hub events, loại trừ giáo viên khỏi danh sách, xuất CSV.

### 7) Nâng cấp tạo phòng và hiển thị danh sách lớp đang hoạt động

- **Mục tiêu:** tăng khả năng sử dụng ngay từ trang chủ (home) theo hai luồng Teacher/Student.
- **Nâng cấp tạo phòng:**
  - chọn scene
  - đặt tên phòng
  - cấu hình số lượng người tham gia tối đa
  - bật public để xuất hiện trong danh sách "Live Classes"
- **Danh sách lớp đang hoạt động:** hiển thị các phòng public có người tham gia, có refresh và polling.

### 8) Xây dựng giao diện hỗ trợ Accept/Deny cho Magic Link qua Mailpit

- **Vấn đề:** môi trường local không có email thật, việc copy/paste magic link gây bất tiện và dễ sai cho người dùng.
- **Giải pháp:** tích hợp UI vào trang xem email của Mailpit để quản trị viên bấm **Accept** hoặc **Deny** trực tiếp trên giao diện.
- **Kiến trúc:**
  - Nginx `mailpit-https` proxy endpoint `/confirm-signin` về Reticulum.
  - Script `hubs-inject.js` chèn action bar vào trang email (Mailpit) và gọi POST đến:
    - `/confirm-signin/accept`
    - `/confirm-signin/deny`
  - Reticulum xử lý xác thực token và broadcast credential về channel đăng nhập.

### 9) Quản lý & phân quyền người dùng trong hệ thống

- **Mục tiêu:** cung cấp công cụ quản trị tài khoản (phục vụ vận hành lớp học/nhóm người dùng) và phân quyền admin.
- **Chức năng chính (Admin panel):**
  - tạo tài khoản
  - tìm kiếm account theo email
  - enable/disable
  - promote/demote admin
  - xoá tài khoản.

### 10. Chuẩn hoá giao diện và trải nghiệm người dùng (UI/UX)

- **Mục tiêu:**  
  Nâng cao trải nghiệm sử dụng tổng thể, đảm bảo giao diện hiện đại, thân thiện và nhất quán trên các nền tảng, đồng thời chuẩn hoá ngôn ngữ hiển thị sang tiếng Anh.

- **Cơ chế:**
  - Rà soát và tái cấu trúc toàn bộ giao diện hiện tại, cải thiện bố cục, màu sắc, kiểu chữ (typography) và hành vi tương tác của các thành phần UI.
  - Điều chỉnh vị trí và cách hiển thị các thành phần quan trọng nhằm tăng khả năng quan sát và thao tác trong quá trình sử dụng.
  - Chuẩn hoá ngôn ngữ giao diện sang tiếng Anh, xử lý các trường hợp trình duyệt ưu tiên locale hệ thống dẫn đến hiển thị ngôn ngữ không nhất quán.
  - Đảm bảo giao diện và hành vi UI hoạt động ổn định, đồng nhất trên các trình duyệt phổ biến và các môi trường khác nhau.

---

## Cài đặt và chạy dự án (Local Development)

Phần này mô tả quy trình thiết lập các cấu hình và môi trường cần thiết để chạy dự án.

### 1) Chuẩn bị

- Cài Docker + Docker Compose
- Cài Mutagen + Mutagen Compose (**cùng phiên bản**)
- Thêm hosts:

```txt
127.0.0.1   hubs.local
127.0.0.1   hubs-proxy.local
```

### 2) Khởi tạo và chạy Hubs Compose

Thực hiện tại thư mục `SE2025-15.1/hubs-compose`:

- `bin/init`
- `bin/up`

Sau khi chạy, các dịch vụ chính sẽ sẵn sàng.

### 3) Truy cập các dịch vụ

- **Reticulum:** `https://hubs.local:4000`
- **Hubs Client (phòng học):** `https://hubs.local:8080`
- **Hubs Admin:** `https://hubs.local:8989` hoặc `https://hubs.local:4000/admin`
- **Spoke:** `https://hubs.local:9090`
- **Dialog:**: `https://hubs.local:4443`
- **Mailpit (đọc email đăng nhập):** `http://hubs.local:8025`

### 4) Đăng nhập qua email (Magic Link) theo hướng "Accept/Deny"

1. Vào `https://hubs.local:4000` và thực hiện sign-in bằng email.
2. Mở `http://hubs.local:8025` (Mailpit), chọn email mới.
3. Ngay trong email sẽ có thanh thao tác **Accept/Deny**.
4. Bấm **Accept** để hoàn tất đăng nhập trên tab Hubs/Reticulum.

### 5) Quản trị tài khoản (Admin)

Sau khi có account, có thể promote admin (theo hướng dẫn Hubs Compose). Khi có quyền admin, truy cập admin panel để quản lý account.

---

## Đánh giá kết quả

- **Tính khả thi:** hệ thống chạy được trong môi trường local bằng Hubs Compose, phù hợp cho mục tiêu học tập–thực hành môn Công nghệ phần mềm.
- **Tính hỗ trợ giáo dục:** bổ sung được các cơ chế cốt lõi của lớp học trực tuyến trong metaverse:
  - xin phát biểu (giơ tay)
  - lecture mode và cấp quyền nói
  - quản lý thuyết trình dựa trên yêu cầu–phê duyệt
  - điểm danh
  - điều hướng "Live Classes" và tạo phòng theo ngữ cảnh giáo dục
- **Cải thiện UX:** luồng đăng nhập magic link giảm thao tác thủ công, giao diện trang chủ định hướng rõ 2 vai trò Teacher/Student, chuẩn hoá ngôn ngữ hiển thị bằng `react-intl`.

---

## Hạn chế và hướng phát triển

- **Hạn chế hiện tại:**

  - hệ thống mới tập trung vào kịch bản lớp học cơ bản, chưa có giao–nộp bài và đánh giá.
  - các tương tác vật lý trong phòng học (kéo ghế/đóng cửa/viết bảng) chưa được hoàn thiện.
  - việc chuẩn hoá UI/UX vẫn cần tiếp tục tối ưu cho nhiều thiết bị và bối cảnh sử dụng (VR/desktop/mobile)

- **Hướng phát triển (dự kiến):**
  - bổ sung tương tác vật thể và cơ chế "phòng học thông minh"
  - triển khai giao–nộp bài và quản lý tiến độ
  - poll/quiz thời gian thực dựa trên chat/event
  - tăng cường logging/analytics cho mục tiêu quản trị lớp học và nghiên cứu trải nghiệm học tập
