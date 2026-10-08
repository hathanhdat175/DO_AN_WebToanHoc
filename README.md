# Góc Tứ Giác

Website mini hỗ trợ học sinh THCS học hình học phẳng về tứ giác: lý thuyết, vẽ hình, luyện tập, kiểm tra, theo dõi tiến độ, kèm khu quản lý cho giáo viên và quản trị viên.

- **Backend:** Node.js, Express, `neo4j-driver`, JWT, bcrypt (gói `bcryptjs`)
- **Cơ sở dữ liệu:** Neo4j (đồ thị), là nơi lưu dữ liệu duy nhất
- **Frontend:** HTML, CSS, JavaScript thuần, hình vẽ bằng SVG (không cần bước build)
- **Kiểm thử:** Jest cho công thức và phần chấm điểm, một script kiểm tra toàn bộ API

---

## 1. Hướng dẫn cài đặt và chạy

Làm lần lượt 7 bước. Lần đầu mất khoảng 15 đến 20 phút, chủ yếu là thời gian tải phần mềm.

### Bước 1. Cài phần mềm cần có

| Phần mềm | Tải ở đâu | Kiểm tra đã cài |
|---|---|---|
| **Node.js** bản LTS (từ 18.11 trở lên) | https://nodejs.org | Mở Terminal, gõ `node -v` và `npm -v` |
| **Visual Studio Code** | https://code.visualstudio.com | Mở được VS Code |
| **Neo4j** (chọn 1 trong 3 cách ở Bước 2) | https://neo4j.com/download | Xem Bước 2 |

### Bước 2. Tạo database Neo4j

Chọn **một** trong ba cách. Cách A phù hợp nhất khi làm đồ án trên máy cá nhân.

**Cách A: Neo4j Desktop (chạy trên máy)**

1. Cài và mở Neo4j Desktop.
2. Bấm **Create instance**.
3. Đặt tên instance (ví dụ `goc-tu-giac`), giữ phiên bản Neo4j mặc định, giữ tên người dùng `neo4j` và đặt **mật khẩu ít nhất 8 ký tự**. Ghi lại mật khẩu này.
4. Bấm **Create**, sau đó bấm nút **Start** (hình tam giác) trên thẻ instance và chờ trạng thái chuyển sang đang chạy.
5. Địa chỉ kết nối ghi trên thẻ instance, thường là `neo4j://127.0.0.1:7687`. Dùng địa chỉ đó hoặc `bolt://localhost:7687` đều được.

Neo4j Desktop chỉ chạy được một instance tại một thời điểm, nên hãy dừng instance khác nếu có.

**Cách B: Neo4j AuraDB Free (trên đám mây, không cần cài)**

1. Vào https://console.neo4j.io, đăng ký và tạo một instance **Free**.
2. Khi tạo xong, trang web cho tải một file chứa `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`. Hãy tải về vì mật khẩu chỉ hiện một lần.
3. Địa chỉ có dạng `neo4j+s://xxxxxxxx.databases.neo4j.io`.

**Cách C: Docker**

```bash
docker run -d --name neo4j-goctugiac -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/matkhau123 neo4j:5
```

Địa chỉ là `bolt://localhost:7687`, người dùng `neo4j`, mật khẩu `matkhau123`.

### Bước 3. Mở dự án trong VS Code

1. Giải nén file `goc-tu-giac.zip`.
2. Mở VS Code, chọn **File > Open Folder...** và chọn thư mục `goc-tu-giac` (thư mục có file `package.json`).
3. Mở Terminal trong VS Code: **Terminal > New Terminal** (hoặc nhấn `` Ctrl + ` ``).

VS Code sẽ gợi ý cài hai extension, nên bấm **Install**:

- **Neo4j for VS Code**: tô màu, gợi ý và chạy file `.cypher` ngay trong VS Code.
- **REST Client**: gửi thử API bằng file `api.http`.

### Bước 4. Cài thư viện

Trong Terminal của VS Code, gõ:

```bash
npm install
```

Lệnh này tải Express, neo4j-driver, jsonwebtoken, bcryptjs, dotenv và Jest vào thư mục `node_modules`. Máy cần có mạng.

### Bước 5. Khai báo thông tin kết nối

1. Tạo file `.env` bằng cách sao chép file `.env.example`:
   - Windows (PowerShell hoặc CMD): `copy .env.example .env`
   - macOS / Linux: `cp .env.example .env`
2. Mở file `.env` và sửa theo database của bạn:

```ini
PORT=3000
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=mật-khẩu-bạn-đặt-ở-bước-2
NEO4J_DATABASE=neo4j
JWT_SECRET=một-chuỗi-bí-mật-dài-bất-kỳ
```

Với AuraDB, thay `NEO4J_URI` bằng địa chỉ `neo4j+s://...` và dùng tên người dùng, mật khẩu trong file đã tải.

File `.env` chứa mật khẩu nên đã được liệt kê trong `.gitignore`, không bị đẩy lên GitHub.

### Bước 6. Nạp dữ liệu mẫu

```bash
npm run seed
```

**Lưu ý: lệnh này xóa toàn bộ dữ liệu đang có trong database rồi mới nạp**, nên chỉ chạy trên database dành riêng cho đồ án. Khi thành công, Terminal in ra:

```
Đã kết nối Neo4j.
Đã xóa dữ liệu cũ.
Đã tạo ràng buộc (constraint).
Đã chạy 93 câu lệnh trong db/seed.cypher.
Xong: 39 nút, 83 quan hệ.
```

### Bước 7. Chạy website

```bash
npm start
```

Mở trình duyệt tại **http://localhost:3000** và đăng nhập bằng một tài khoản mẫu (mật khẩu chung là `123456`):

| Vai trò | Email | Thấy gì |
|---|---|---|
| Học sinh | `an@hocsinh.example` | Lý thuyết, Vẽ hình, Luyện tập, Kiểm tra, Tiến độ |
| Giáo viên | `lan@giaovien.example` | Thêm mục Quản lý: bài học, bài tập, bài kiểm tra, kết quả học sinh |
| Quản trị viên | `admin@truong.example` | Thêm phân quyền tài khoản và sao lưu dữ liệu |

Nhấn `Ctrl + C` trong Terminal để dừng. Khi đang sửa code, dùng `npm run dev` để máy chủ tự khởi động lại mỗi lần lưu file.

**Chạy và gỡ lỗi bằng F5:** mở tab **Run and Debug** của VS Code, chọn cấu hình **Chạy website (F5)** rồi nhấn `F5`. Có thể đặt breakpoint trong các file ở thư mục `server/`.

---

## 2. Kiểm tra chương trình

Nên chạy cả hai lệnh sau lần cài đặt đầu tiên.

```bash
npm test
```

Chạy Jest cho thư viện công thức (`public/js/geometry.js`) và phần chấm điểm. Không cần Neo4j.

```bash
npm run smoke
```

Kiểm tra toàn bộ API trên máy chủ thật: mở một Terminal chạy `npm start`, mở Terminal thứ hai chạy `npm run smoke`. Script đăng ký một học sinh tạm, đi qua 41 bước (đăng nhập, phân quyền, lý thuyết, luyện tập, kiểm tra, quản lý, quản trị) rồi tự xóa dữ liệu tạm. Đây là cách nhanh nhất để xác nhận mọi câu Cypher chạy đúng trên phiên bản Neo4j của bạn. Nếu có dòng `✗`, xem Terminal đang chạy `npm start` để biết câu lệnh nào báo lỗi.

---

## 3. Cấu trúc thư mục và phân công

```
goc-tu-giac/
├── server/                    NGƯỜI 1: Backend và Neo4j
│   ├── index.js               Điểm khởi động: đọc .env, kết nối Neo4j, mở cổng
│   ├── app.js                 Dựng Express, gắn route, xử lý lỗi
│   ├── db.js                  Kết nối neo4j-driver, hàm chạy Cypher
│   ├── repo.js                TOÀN BỘ câu Cypher của ứng dụng
│   ├── auth.js                JWT, bcrypt, phân quyền theo vai trò
│   ├── grade.js               Chấm đáp án, thang điểm 10
│   ├── seed.js                Lệnh npm run seed
│   └── routes/
│       ├── auth.js            Đăng ký, đăng nhập, hồ sơ
│       ├── learn.js           Lý thuyết, luyện tập, kiểm tra, tiến độ
│       ├── manage.js          Giáo viên quản lý nội dung
│       └── admin.js           Tài khoản, phân quyền, sao lưu
├── db/
│   ├── schema.cypher          Ràng buộc (constraint)
│   └── seed.cypher            Dữ liệu mẫu
├── postman/                   Postman collection (34 yêu cầu)
├── api.http                   Thử API trong VS Code bằng REST Client
│
├── public/                    NGƯỜI 2: Frontend học sinh
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── api.js             Gọi REST API, giữ token đăng nhập
│       ├── app.js             6 màn hình học sinh + 4 màn hình quản lý (Người 3)
│       └── geometry.js        NGƯỜI 3: thư viện công thức tứ giác
│
├── tests/                     NGƯỜI 3: kiểm thử
│   ├── geometry.test.js       Công thức, nhận dạng hình, kiểm tra dữ kiện
│   └── grade.test.js          Chấm điểm, xuất bản sao lưu
├── scripts/smoke.js           Kiểm tra toàn bộ API (npm run smoke)
├── .vscode/                   Cấu hình F5 và extension gợi ý
├── .env.example               Mẫu file cấu hình
└── package.json
```

Trong `public/js/app.js`, phần của từng người được đánh dấu bằng chú thích: `Màn hình 1` đến `Màn hình 6` (học sinh) và `Quản lý 1` đến `Quản lý 4` (giáo viên, quản trị).

---

## 4. Mô hình dữ liệu đồ thị

```
(:User)-[:STUDIED {at}]->(:Lesson)-[:BELONGS_TO]->(:Topic)
(:User)-[:ATTEMPTED {answer, correct, at}]->(:Exercise)-[:BELONGS_TO]->(:Topic)
(:User)-[:TOOK]->(:Result)-[:OF]->(:Test)-[:CONTAINS {pos}]->(:Exercise)
(:Topic)-[:IS_A {condition}]->(:Topic)
```

| Nút | Thuộc tính |
|---|---|
| `User` | `id`, `name`, `email`, `pass` (băm bcrypt), `role` (`hs`, `gv`, `qt`), `lop` |
| `Topic` | `id`, `name`, `pos` |
| `Lesson` | `id`, `title`, `grade`, `definition`, `traits[]`, `signs[]`, `formulas[]` |
| `Exercise` | `id`, `stem`, `kind` (`so` nhập số, `chon` trắc nghiệm), `level` (1 đến 3), `answer`, `unit`, `choices[]`, `solution` |
| `Test` | `id`, `name`, `minutes`, `published` |
| `Result` | `id`, `score`, `correct`, `total`, `seconds`, `at`, `testName` |

Quan hệ `IS_A` nối hình đặc biệt với hình tổng quát hơn, kèm điều kiện cần thêm. Ví dụ: `(Hình vuông)-[:IS_A {condition: 'một góc vuông'}]->(Hình thoi)`.

### Vài câu Cypher để thử trong Neo4j Browser

Xem toàn bộ "họ nhà tứ giác":

```cypher
MATCH p = (:Topic)-[:IS_A]->(:Topic) RETURN p;
```

Hình vuông còn là những hình nào (đường đi độ dài bất kỳ):

```cypher
MATCH (:Topic {id: 'hinh-vuong'})-[:IS_A*1..]->(a:Topic)
RETURN DISTINCT a.name;
```

Gợi ý bài tập cho một học sinh: thuộc chủ đề đã học nhưng chưa làm đúng:

```cypher
MATCH (u:User {email: 'an@hocsinh.example'})-[:STUDIED]->(:Lesson)-[:BELONGS_TO]->(t:Topic)<-[:BELONGS_TO]-(e:Exercise)
WHERE NOT (u)-[:ATTEMPTED {correct: true}]->(e)
RETURN t.name, e.stem, e.level
ORDER BY e.level;
```

Điểm trung bình của từng học sinh:

```cypher
MATCH (u:User {role: 'hs'})-[:TOOK]->(r:Result)
RETURN u.name AS hocSinh, round(avg(r.score), 1) AS diemTrungBinh, count(r) AS soBai
ORDER BY diemTrungBinh DESC;
```

Những bài tập bị làm sai nhiều nhất:

```cypher
MATCH (:User)-[a:ATTEMPTED {correct: false}]->(e:Exercise)
RETURN e.stem, count(a) AS soLanSai
ORDER BY soLanSai DESC LIMIT 5;
```

---

## 5. Danh sách API

Mọi API nằm dưới `/api`. Trừ đăng ký và đăng nhập, các API khác cần header `Authorization: Bearer <token>`.

| Phương thức | Đường dẫn | Vai trò | Chức năng |
|---|---|---|---|
| POST | `/auth/register` | ai cũng được | Đăng ký tài khoản học sinh |
| POST | `/auth/login` | ai cũng được | Đăng nhập, trả về token |
| GET, PUT | `/me` | đã đăng nhập | Xem và sửa hồ sơ |
| GET | `/topics` | đã đăng nhập | Sáu chủ đề và quan hệ `IS_A` |
| GET | `/topics/:id/lessons` | đã đăng nhập | Bài học của chủ đề, các hình tổng quát hơn |
| GET | `/lessons?q=` | đã đăng nhập | Tìm bài học theo từ khóa |
| POST | `/lessons/:id/studied` | đã đăng nhập | Đánh dấu đã học |
| GET | `/exercises?topic=&level=` | đã đăng nhập | Danh sách bài tập (không kèm đáp án) |
| POST | `/exercises/:id/attempts` | đã đăng nhập | Gửi đáp án, nhận kết quả và lời giải |
| GET | `/tests`, `/tests/:id` | đã đăng nhập | Bài kiểm tra đã công bố, đề bài |
| POST | `/tests/:id/results` | đã đăng nhập | Nộp bài, chấm thang điểm 10 |
| GET | `/me/progress` | đã đăng nhập | Thống kê, lịch sử, gợi ý luyện tiếp |
| GET | `/manage/lessons`, `/manage/exercises`, `/manage/tests` | giáo viên, quản trị | Danh sách đầy đủ để quản lý |
| POST, PUT, DELETE | `/lessons`, `/exercises`, `/tests` (kèm `/:id`) | giáo viên, quản trị | Thêm, sửa, xóa nội dung |
| PUT | `/tests/:id/publish` | giáo viên, quản trị | Công bố hoặc thu hồi bài kiểm tra |
| GET | `/manage/students` | giáo viên, quản trị | Tiến độ và điểm của học sinh |
| GET | `/admin/users` | quản trị | Danh sách tài khoản |
| PUT | `/admin/users/:id/role` | quản trị | Đổi vai trò |
| DELETE | `/admin/users/:id` | quản trị | Xóa tài khoản |
| GET | `/admin/stats`, `/admin/backup` | quản trị | Thống kê đồ thị, bản sao lưu Cypher |

Thử API theo hai cách:

- **Trong VS Code:** mở file `api.http`, bấm **Send Request** ở yêu cầu đăng nhập trước rồi tới các yêu cầu khác.
- **Bằng Postman:** chọn **Import** và mở file `postman/GocTuGiac.postman_collection.json`. Chạy một yêu cầu trong thư mục "1. Xác thực" trước, token sẽ được lưu tự động.

---

## 6. Lỗi thường gặp

| Hiện tượng | Nguyên nhân và cách xử lý |
|---|---|
| `Không kết nối được Neo4j` khi chạy `npm start` hoặc `npm run seed` | Instance chưa được **Start**, hoặc `NEO4J_URI` trong `.env` sai. Với Neo4j Desktop, kiểm tra thẻ instance đang ở trạng thái chạy. |
| Lỗi có chữ `Unauthorized` hoặc `authentication failure` | Sai `NEO4J_USER` hoặc `NEO4J_PASSWORD` trong `.env`. Nếu gõ sai nhiều lần Neo4j sẽ khóa tạm vài giây, chờ rồi thử lại. |
| Lỗi có chữ `DatabaseNotFound` | `NEO4J_DATABASE` không đúng. Để giá trị `neo4j`, hoặc xóa hẳn dòng này để dùng database mặc định. |
| Đăng nhập tài khoản mẫu báo sai mật khẩu | Chưa chạy `npm run seed`, hoặc đã dán thẳng `seed.cypher` vào Neo4j Browser (cách đó chưa đặt mật khẩu). Chạy `npm run seed`. |
| `Error: listen EADDRINUSE :::3000` | Cổng 3000 đang được dùng. Đổi `PORT=3001` trong `.env` rồi mở http://localhost:3001. |
| `npm : File ... npm.ps1 cannot be loaded because running scripts is disabled` (Windows) | PowerShell đang chặn script. Trong Terminal của VS Code, bấm mũi tên cạnh dấu `+` và chọn **Command Prompt**, hoặc chạy một lần lệnh `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| `Cannot find module 'express'` | Chưa chạy `npm install`, hoặc đang đứng sai thư mục. Terminal phải ở thư mục có `package.json`. |
| Trang web báo `Không kết nối được máy chủ` | Lệnh `npm start` đã bị dừng. Chạy lại. |
| Trang web báo `Lỗi máy chủ` | Xem Terminal đang chạy `npm start`: dòng `[LỖI]` cho biết API nào và thông báo từ Neo4j. |
| Chữ hiển thị bằng phông mặc định | Máy không có mạng nên không tải được Google Fonts. Trang vẫn dùng bình thường. |

---

## 7. Đối chiếu với hồ sơ đặc tả

| Yêu cầu | Nơi thực hiện |
|---|---|
| FR-01 đến FR-04: đăng ký, đăng nhập, hồ sơ, phân quyền | `server/auth.js`, `server/routes/auth.js`, `server/routes/admin.js` |
| FR-05 đến FR-08: chủ đề, lý thuyết, hình minh họa, tìm kiếm | Màn hình Lý thuyết, `GET /topics`, `GET /lessons` |
| FR-09 đến FR-13: vẽ hình, tương tác, nhập dữ kiện, tính toán, công thức | Màn hình Vẽ hình, `public/js/geometry.js` |
| FR-14 đến FR-17: bài tập, kiểm tra đáp án, lời giải | Màn hình Luyện tập, `server/grade.js` |
| FR-18 đến FR-21: tạo bài kiểm tra, làm bài, chấm điểm, xem kết quả | Màn hình Kiểm tra, Quản lý bài kiểm tra |
| FR-22 đến FR-24: lịch sử, thống kê, theo dõi học sinh | Màn hình Tiến độ, Quản lý học sinh |
| FR-25 đến FR-27: quản lý bài học, bài tập, ngân hàng câu hỏi | Ba màn hình Quản lý |
| NFR-02, NFR-03: bảo mật, mật khẩu | JWT, kiểm tra vai trò ở từng API, mật khẩu băm bằng bcrypt |
| NFR-05: nhiều kích thước màn hình | Giao diện co giãn từ điện thoại đến máy tính, có giao diện tối |
| NFR-10: sao lưu | Quản trị viên xuất toàn bộ đồ thị thành lệnh Cypher |

### Những điểm đã đơn giản hóa cho bản mini

- Bài tập và câu hỏi kiểm tra dùng chung một ngân hàng (nút `Exercise`).
- "Công bố" một bài kiểm tra nghĩa là giao cho mọi học sinh, chưa chia theo lớp.
- Giải toán theo công thức kèm phép thay số, chưa giải tự động từng bước.
- Các câu trong bài kiểm tra có điểm bằng nhau, quy về thang 10.
- Đồng hồ bài kiểm tra chạy ở trình duyệt; máy chủ chỉ giới hạn thời gian ghi nhận không vượt quá thời lượng của bài.
- Sáu chủ đề là cố định; giáo viên thêm bài học và bài tập vào các chủ đề đó.
- Chưa có kiểm thử giao diện tự động bằng Playwright.
