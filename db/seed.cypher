// Dữ liệu mẫu cho Góc Tứ Giác.
// Cách nạp khuyên dùng: chạy "npm run seed" (lệnh này xóa dữ liệu cũ, chạy file này rồi đặt mật khẩu 123456 cho các tài khoản mẫu).
// Nếu dán thẳng file này vào Neo4j Browser thì các tài khoản mẫu chưa có mật khẩu; hãy chạy "npm run seed" để đăng nhập được.
// Mỗi câu lệnh kết thúc bằng dấu chấm phẩy ở cuối dòng.

// ---------- 1. Chủ đề (Topic) và quan hệ IS_A: hình đặc biệt -> hình tổng quát ----------
CREATE (:Topic {id: 'tu-giac', name: 'Tứ giác', pos: 1});
CREATE (:Topic {id: 'hinh-thang', name: 'Hình thang', pos: 2});
CREATE (:Topic {id: 'hinh-binh-hanh', name: 'Hình bình hành', pos: 3});
CREATE (:Topic {id: 'hinh-chu-nhat', name: 'Hình chữ nhật', pos: 4});
CREATE (:Topic {id: 'hinh-thoi', name: 'Hình thoi', pos: 5});
CREATE (:Topic {id: 'hinh-vuong', name: 'Hình vuông', pos: 6});
MATCH (a:Topic {id: 'hinh-thang'}), (b:Topic {id: 'tu-giac'}) CREATE (a)-[:IS_A {condition: 'hai cạnh đối song song'}]->(b);
MATCH (a:Topic {id: 'hinh-binh-hanh'}), (b:Topic {id: 'hinh-thang'}) CREATE (a)-[:IS_A {condition: 'hai cạnh bên song song'}]->(b);
MATCH (a:Topic {id: 'hinh-chu-nhat'}), (b:Topic {id: 'hinh-binh-hanh'}) CREATE (a)-[:IS_A {condition: 'một góc vuông'}]->(b);
MATCH (a:Topic {id: 'hinh-thoi'}), (b:Topic {id: 'hinh-binh-hanh'}) CREATE (a)-[:IS_A {condition: 'hai cạnh kề bằng nhau'}]->(b);
MATCH (a:Topic {id: 'hinh-vuong'}), (b:Topic {id: 'hinh-chu-nhat'}) CREATE (a)-[:IS_A {condition: 'hai cạnh kề bằng nhau'}]->(b);
MATCH (a:Topic {id: 'hinh-vuong'}), (b:Topic {id: 'hinh-thoi'}) CREATE (a)-[:IS_A {condition: 'một góc vuông'}]->(b);

// ---------- 2. Bài học (Lesson) thuộc chủ đề ----------
MATCH (t:Topic {id: 'tu-giac'}) CREATE (:Lesson {id: 'bai-1', title: 'Tứ giác', grade: 'Lớp 8', definition: 'Tứ giác ABCD là hình gồm bốn đoạn thẳng AB, BC, CD, DA, trong đó không có hai đoạn thẳng nào cùng nằm trên một đường thẳng. Tứ giác lồi là tứ giác luôn nằm về một phía của đường thẳng chứa bất kì cạnh nào của nó.', traits: ['Tổng số đo bốn góc của một tứ giác bằng 360°.', 'Tứ giác có bốn đỉnh, bốn cạnh, bốn góc và hai đường chéo.', 'Hai đường chéo của tứ giác lồi cắt nhau tại một điểm nằm trong tứ giác.'], signs: [], formulas: ['Tổng các góc: góc A + góc B + góc C + góc D = 360°', 'Chu vi: P = AB + BC + CD + DA', 'Diện tích: chia tứ giác thành hai tam giác bằng một đường chéo rồi cộng hai diện tích'], createdAt: 1})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'hinh-thang'}) CREATE (:Lesson {id: 'bai-2', title: 'Hình thang và hình thang cân', grade: 'Lớp 8', definition: 'Hình thang là tứ giác có hai cạnh đối song song. Hai cạnh song song gọi là hai đáy, hai cạnh còn lại gọi là hai cạnh bên. Hình thang cân là hình thang có hai góc kề một đáy bằng nhau.', traits: ['Hai góc kề một cạnh bên của hình thang có tổng bằng 180°.', 'Trong hình thang cân, hai cạnh bên bằng nhau.', 'Trong hình thang cân, hai đường chéo bằng nhau.'], signs: ['Hình thang có hai góc kề một đáy bằng nhau là hình thang cân.', 'Hình thang có hai đường chéo bằng nhau là hình thang cân.'], formulas: ['Diện tích: S = (a + b) · h : 2, với a, b là hai đáy và h là chiều cao', 'Chu vi: P = tổng độ dài bốn cạnh', 'Đường trung bình: m = (a + b) : 2'], createdAt: 2})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'hinh-binh-hanh'}) CREATE (:Lesson {id: 'bai-3', title: 'Hình bình hành', grade: 'Lớp 8', definition: 'Hình bình hành là tứ giác có các cạnh đối song song.', traits: ['Các cạnh đối bằng nhau.', 'Các góc đối bằng nhau.', 'Hai đường chéo cắt nhau tại trung điểm của mỗi đường.'], signs: ['Tứ giác có các cạnh đối song song là hình bình hành.', 'Tứ giác có các cạnh đối bằng nhau là hình bình hành.', 'Tứ giác có một cặp cạnh đối song song và bằng nhau là hình bình hành.', 'Tứ giác có các góc đối bằng nhau là hình bình hành.', 'Tứ giác có hai đường chéo cắt nhau tại trung điểm của mỗi đường là hình bình hành.'], formulas: ['Diện tích: S = a · h, với a là một cạnh và h là chiều cao tương ứng', 'Chu vi: P = 2 · (a + b)'], createdAt: 3})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'hinh-chu-nhat'}) CREATE (:Lesson {id: 'bai-4', title: 'Hình chữ nhật', grade: 'Lớp 8', definition: 'Hình chữ nhật là tứ giác có bốn góc vuông.', traits: ['Hình chữ nhật có tất cả các tính chất của hình bình hành và của hình thang cân.', 'Hai đường chéo bằng nhau và cắt nhau tại trung điểm của mỗi đường.'], signs: ['Tứ giác có ba góc vuông là hình chữ nhật.', 'Hình thang cân có một góc vuông là hình chữ nhật.', 'Hình bình hành có một góc vuông là hình chữ nhật.', 'Hình bình hành có hai đường chéo bằng nhau là hình chữ nhật.'], formulas: ['Diện tích: S = a · b', 'Chu vi: P = 2 · (a + b)', 'Đường chéo: d = √(a² + b²)'], createdAt: 4})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'hinh-thoi'}) CREATE (:Lesson {id: 'bai-5', title: 'Hình thoi', grade: 'Lớp 8', definition: 'Hình thoi là tứ giác có bốn cạnh bằng nhau.', traits: ['Hình thoi có tất cả các tính chất của hình bình hành.', 'Hai đường chéo vuông góc với nhau.', 'Hai đường chéo là các đường phân giác của các góc của hình thoi.'], signs: ['Tứ giác có bốn cạnh bằng nhau là hình thoi.', 'Hình bình hành có hai cạnh kề bằng nhau là hình thoi.', 'Hình bình hành có hai đường chéo vuông góc với nhau là hình thoi.', 'Hình bình hành có một đường chéo là đường phân giác của một góc là hình thoi.'], formulas: ['Diện tích: S = d₁ · d₂ : 2, với d₁, d₂ là hai đường chéo', 'Chu vi: P = 4 · a'], createdAt: 5})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'hinh-vuong'}) CREATE (:Lesson {id: 'bai-6', title: 'Hình vuông', grade: 'Lớp 8', definition: 'Hình vuông là tứ giác có bốn góc vuông và bốn cạnh bằng nhau.', traits: ['Hình vuông có tất cả các tính chất của hình chữ nhật và của hình thoi.', 'Hai đường chéo bằng nhau, vuông góc với nhau và cắt nhau tại trung điểm của mỗi đường.'], signs: ['Hình chữ nhật có hai cạnh kề bằng nhau là hình vuông.', 'Hình chữ nhật có hai đường chéo vuông góc với nhau là hình vuông.', 'Hình chữ nhật có một đường chéo là đường phân giác của một góc là hình vuông.', 'Hình thoi có một góc vuông là hình vuông.', 'Hình thoi có hai đường chéo bằng nhau là hình vuông.'], formulas: ['Diện tích: S = a²', 'Chu vi: P = 4 · a', 'Đường chéo: d = a · √2'], createdAt: 6})-[:BELONGS_TO]->(t);

// ---------- 3. Bài tập (Exercise): kind = so (nhập đáp số) hoặc chon (trắc nghiệm, answer là vị trí 0-3); level 1 nhận biết, 2 thông hiểu, 3 vận dụng ----------
MATCH (t:Topic {id: 'tu-giac'}) CREATE (:Exercise {id: 'bt-01', level: 1, kind: 'so', stem: 'Tứ giác ABCD có góc A = 80°, góc B = 110°, góc C = 70°. Tính số đo góc D.', answer: 100, unit: '°', choices: [], solution: 'Tổng bốn góc của tứ giác bằng 360°. Góc D = 360° − (80° + 110° + 70°) = 360° − 260° = 100°.', createdAt: 1})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'tu-giac'}) CREATE (:Exercise {id: 'bt-02', level: 3, kind: 'so', stem: 'Bốn góc của một tứ giác tỉ lệ với 1 : 2 : 3 : 4. Tính số đo góc lớn nhất.', answer: 144, unit: '°', choices: [], solution: 'Tổng số phần là 1 + 2 + 3 + 4 = 10. Mỗi phần ứng với 360° : 10 = 36°. Góc lớn nhất chiếm 4 phần: 4 · 36° = 144°.', createdAt: 2})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'hinh-thang'}) CREATE (:Exercise {id: 'bt-03', level: 1, kind: 'so', stem: 'Hình thang có đáy lớn 12 cm, đáy nhỏ 8 cm và chiều cao 5 cm. Tính diện tích hình thang.', answer: 50, unit: 'cm²', choices: [], solution: 'S = (a + b) · h : 2 = (12 + 8) · 5 : 2 = 50 (cm²).', createdAt: 3})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'hinh-thang'}) CREATE (:Exercise {id: 'bt-04', level: 2, kind: 'so', stem: 'Hình thang ABCD có AB song song với CD và góc A = 65°. Tính số đo góc D.', answer: 115, unit: '°', choices: [], solution: 'Vì AB song song với CD nên hai góc A và D kề cạnh bên AD có tổng bằng 180°. Góc D = 180° − 65° = 115°.', createdAt: 4})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'hinh-thang'}) CREATE (:Exercise {id: 'bt-05', level: 3, kind: 'so', stem: 'Hình thang cân có đáy lớn 14 cm, đáy nhỏ 8 cm và chiều cao 4 cm. Tính độ dài cạnh bên.', answer: 5, unit: 'cm', choices: [], solution: 'Kẻ đường cao từ một đỉnh của đáy nhỏ. Đoạn nhô ra ở mỗi bên dài (14 − 8) : 2 = 3 (cm). Theo định lí Pythagore, cạnh bên = √(4² + 3²) = √25 = 5 (cm).', createdAt: 5})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'hinh-binh-hanh'}) CREATE (:Exercise {id: 'bt-06', level: 1, kind: 'chon', stem: 'Tứ giác nào sau đây chắc chắn là hình bình hành?', answer: 1, unit: '', choices: ['Tứ giác có một cặp cạnh đối bằng nhau.', 'Tứ giác có hai đường chéo cắt nhau tại trung điểm của mỗi đường.', 'Tứ giác có hai đường chéo bằng nhau.', 'Tứ giác có hai góc kề một cạnh bù nhau.'], solution: 'Dấu hiệu nhận biết: tứ giác có hai đường chéo cắt nhau tại trung điểm của mỗi đường là hình bình hành. Ba phương án còn lại chưa đủ điều kiện.', createdAt: 6})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'hinh-binh-hanh'}) CREATE (:Exercise {id: 'bt-07', level: 2, kind: 'so', stem: 'Hình bình hành có một cạnh dài 9 cm và chiều cao tương ứng 4 cm. Tính diện tích.', answer: 36, unit: 'cm²', choices: [], solution: 'S = a · h = 9 · 4 = 36 (cm²).', createdAt: 7})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'hinh-binh-hanh'}) CREATE (:Exercise {id: 'bt-08', level: 3, kind: 'so', stem: 'Hình bình hành ABCD có số đo góc A gấp 3 lần số đo góc B. Tính số đo góc A.', answer: 135, unit: '°', choices: [], solution: 'Hai góc A và B kề một cạnh nên có tổng bằng 180°. Góc B = 180° : 4 = 45°, góc A = 3 · 45° = 135°.', createdAt: 8})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'hinh-chu-nhat'}) CREATE (:Exercise {id: 'bt-09', level: 1, kind: 'so', stem: 'Hình chữ nhật có chiều dài 8 cm và chiều rộng 6 cm. Tính độ dài đường chéo.', answer: 10, unit: 'cm', choices: [], solution: 'Theo định lí Pythagore: d = √(8² + 6²) = √100 = 10 (cm).', createdAt: 9})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'hinh-chu-nhat'}) CREATE (:Exercise {id: 'bt-10', level: 2, kind: 'so', stem: 'Hình chữ nhật có chu vi 28 cm và chiều dài 9 cm. Tính diện tích.', answer: 45, unit: 'cm²', choices: [], solution: 'Nửa chu vi là 28 : 2 = 14 (cm), nên chiều rộng là 14 − 9 = 5 (cm). S = 9 · 5 = 45 (cm²).', createdAt: 10})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'hinh-thoi'}) CREATE (:Exercise {id: 'bt-11', level: 1, kind: 'so', stem: 'Hình thoi có hai đường chéo dài 10 cm và 24 cm. Tính diện tích.', answer: 120, unit: 'cm²', choices: [], solution: 'S = d₁ · d₂ : 2 = 10 · 24 : 2 = 120 (cm²).', createdAt: 11})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'hinh-thoi'}) CREATE (:Exercise {id: 'bt-12', level: 3, kind: 'so', stem: 'Hình thoi có hai đường chéo dài 6 cm và 8 cm. Tính chu vi hình thoi.', answer: 20, unit: 'cm', choices: [], solution: 'Hai đường chéo vuông góc và cắt nhau tại trung điểm mỗi đường, nên cạnh = √(3² + 4²) = 5 (cm). Chu vi P = 4 · 5 = 20 (cm).', createdAt: 12})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'hinh-vuong'}) CREATE (:Exercise {id: 'bt-13', level: 1, kind: 'so', stem: 'Hình vuông có chu vi 36 cm. Tính diện tích.', answer: 81, unit: 'cm²', choices: [], solution: 'Cạnh hình vuông là 36 : 4 = 9 (cm). S = 9² = 81 (cm²).', createdAt: 13})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'hinh-vuong'}) CREATE (:Exercise {id: 'bt-14', level: 2, kind: 'chon', stem: 'Hình chữ nhật có thêm điều kiện nào sau đây thì là hình vuông?', answer: 2, unit: '', choices: ['Hai đường chéo bằng nhau.', 'Hai đường chéo cắt nhau tại trung điểm của mỗi đường.', 'Hai đường chéo vuông góc với nhau.', 'Các cạnh đối bằng nhau.'], solution: 'Hình chữ nhật có hai đường chéo vuông góc với nhau là hình vuông. Các điều kiện còn lại hình chữ nhật nào cũng có.', createdAt: 14})-[:BELONGS_TO]->(t);
MATCH (t:Topic {id: 'hinh-vuong'}) CREATE (:Exercise {id: 'bt-15', level: 3, kind: 'so', stem: 'Hình vuông có đường chéo dài 6 cm. Tính diện tích.', answer: 18, unit: 'cm²', choices: [], solution: 'Hình vuông cũng là hình thoi nên S = d · d : 2 = 6 · 6 : 2 = 18 (cm²).', createdAt: 15})-[:BELONGS_TO]->(t);

// ---------- 4. Bài kiểm tra (Test) và các câu hỏi nó chứa ----------
CREATE (:Test {id: 'kt-1', name: 'Kiểm tra 15 phút: Tứ giác đặc biệt', minutes: 15, published: true, createdAt: 1});
MATCH (t:Test {id: 'kt-1'}), (e:Exercise {id: 'bt-03'}) CREATE (t)-[:CONTAINS {pos: 1}]->(e);
MATCH (t:Test {id: 'kt-1'}), (e:Exercise {id: 'bt-06'}) CREATE (t)-[:CONTAINS {pos: 2}]->(e);
MATCH (t:Test {id: 'kt-1'}), (e:Exercise {id: 'bt-09'}) CREATE (t)-[:CONTAINS {pos: 3}]->(e);
MATCH (t:Test {id: 'kt-1'}), (e:Exercise {id: 'bt-11'}) CREATE (t)-[:CONTAINS {pos: 4}]->(e);
MATCH (t:Test {id: 'kt-1'}), (e:Exercise {id: 'bt-13'}) CREATE (t)-[:CONTAINS {pos: 5}]->(e);
MATCH (t:Test {id: 'kt-1'}), (e:Exercise {id: 'bt-14'}) CREATE (t)-[:CONTAINS {pos: 6}]->(e);
CREATE (:Test {id: 'kt-2', name: 'Kiểm tra nhanh: Góc trong tứ giác', minutes: 5, published: true, createdAt: 2});
MATCH (t:Test {id: 'kt-2'}), (e:Exercise {id: 'bt-01'}) CREATE (t)-[:CONTAINS {pos: 1}]->(e);
MATCH (t:Test {id: 'kt-2'}), (e:Exercise {id: 'bt-04'}) CREATE (t)-[:CONTAINS {pos: 2}]->(e);
MATCH (t:Test {id: 'kt-2'}), (e:Exercise {id: 'bt-08'}) CREATE (t)-[:CONTAINS {pos: 3}]->(e);
MATCH (t:Test {id: 'kt-2'}), (e:Exercise {id: 'bt-02'}) CREATE (t)-[:CONTAINS {pos: 4}]->(e);
CREATE (:Test {id: 'kt-3', name: 'Ôn tập cuối chương (45 phút)', minutes: 45, published: false, createdAt: 3});
MATCH (t:Test {id: 'kt-3'}), (e:Exercise {id: 'bt-02'}) CREATE (t)-[:CONTAINS {pos: 1}]->(e);
MATCH (t:Test {id: 'kt-3'}), (e:Exercise {id: 'bt-05'}) CREATE (t)-[:CONTAINS {pos: 2}]->(e);
MATCH (t:Test {id: 'kt-3'}), (e:Exercise {id: 'bt-07'}) CREATE (t)-[:CONTAINS {pos: 3}]->(e);
MATCH (t:Test {id: 'kt-3'}), (e:Exercise {id: 'bt-08'}) CREATE (t)-[:CONTAINS {pos: 4}]->(e);
MATCH (t:Test {id: 'kt-3'}), (e:Exercise {id: 'bt-10'}) CREATE (t)-[:CONTAINS {pos: 5}]->(e);
MATCH (t:Test {id: 'kt-3'}), (e:Exercise {id: 'bt-12'}) CREATE (t)-[:CONTAINS {pos: 6}]->(e);
MATCH (t:Test {id: 'kt-3'}), (e:Exercise {id: 'bt-14'}) CREATE (t)-[:CONTAINS {pos: 7}]->(e);
MATCH (t:Test {id: 'kt-3'}), (e:Exercise {id: 'bt-15'}) CREATE (t)-[:CONTAINS {pos: 8}]->(e);

// ---------- 5. Người dùng (User): role = hs (học sinh), gv (giáo viên), qt (quản trị viên) ----------
CREATE (:User {id: 'hs-an', name: 'Nguyễn Minh An', email: 'an@hocsinh.example', role: 'hs', lop: '8A', pass: '', createdAt: timestamp()});
CREATE (:User {id: 'hs-ha', name: 'Trần Thu Hà', email: 'ha@hocsinh.example', role: 'hs', lop: '8A', pass: '', createdAt: timestamp()});
CREATE (:User {id: 'hs-bao', name: 'Lê Quốc Bảo', email: 'bao@hocsinh.example', role: 'hs', lop: '8B', pass: '', createdAt: timestamp()});
CREATE (:User {id: 'gv-lan', name: 'Phạm Thị Lan', email: 'lan@giaovien.example', role: 'gv', lop: '', pass: '', createdAt: timestamp()});
CREATE (:User {id: 'qt-admin', name: 'Quản trị viên', email: 'admin@truong.example', role: 'qt', lop: '', pass: '', createdAt: timestamp()});

// ---------- 6. Hoạt động học tập mẫu (thời điểm tính lùi từ lúc nạp dữ liệu) ----------
MATCH (u:User {id: 'hs-an'}), (l:Lesson {id: 'bai-1'}) CREATE (u)-[:STUDIED {at: timestamp() - 432000000}]->(l);
MATCH (u:User {id: 'hs-an'}), (l:Lesson {id: 'bai-2'}) CREATE (u)-[:STUDIED {at: timestamp() - 354240000}]->(l);
MATCH (u:User {id: 'hs-an'}), (l:Lesson {id: 'bai-3'}) CREATE (u)-[:STUDIED {at: timestamp() - 276480000}]->(l);
MATCH (u:User {id: 'hs-ha'}), (l:Lesson {id: 'bai-1'}) CREATE (u)-[:STUDIED {at: timestamp() - 518400000}]->(l);
MATCH (u:User {id: 'hs-ha'}), (l:Lesson {id: 'bai-2'}) CREATE (u)-[:STUDIED {at: timestamp() - 440640000}]->(l);
MATCH (u:User {id: 'hs-ha'}), (l:Lesson {id: 'bai-3'}) CREATE (u)-[:STUDIED {at: timestamp() - 362880000}]->(l);
MATCH (u:User {id: 'hs-ha'}), (l:Lesson {id: 'bai-4'}) CREATE (u)-[:STUDIED {at: timestamp() - 285120000}]->(l);
MATCH (u:User {id: 'hs-ha'}), (l:Lesson {id: 'bai-5'}) CREATE (u)-[:STUDIED {at: timestamp() - 207360000}]->(l);
MATCH (u:User {id: 'hs-ha'}), (l:Lesson {id: 'bai-6'}) CREATE (u)-[:STUDIED {at: timestamp() - 129600000}]->(l);
MATCH (u:User {id: 'hs-bao'}), (l:Lesson {id: 'bai-1'}) CREATE (u)-[:STUDIED {at: timestamp() - 259200000}]->(l);
MATCH (u:User {id: 'hs-bao'}), (l:Lesson {id: 'bai-2'}) CREATE (u)-[:STUDIED {at: timestamp() - 181440000}]->(l);
MATCH (u:User {id: 'hs-an'}), (e:Exercise {id: 'bt-01'}) CREATE (u)-[:ATTEMPTED {answer: '100', correct: true, at: timestamp() - 423360000}]->(e);
MATCH (u:User {id: 'hs-an'}), (e:Exercise {id: 'bt-03'}) CREATE (u)-[:ATTEMPTED {answer: '50', correct: true, at: timestamp() - 345600000}]->(e);
MATCH (u:User {id: 'hs-an'}), (e:Exercise {id: 'bt-04'}) CREATE (u)-[:ATTEMPTED {answer: '65', correct: false, at: timestamp() - 341280000}]->(e);
MATCH (u:User {id: 'hs-an'}), (e:Exercise {id: 'bt-04'}) CREATE (u)-[:ATTEMPTED {answer: '115', correct: true, at: timestamp() - 340416000}]->(e);
MATCH (u:User {id: 'hs-an'}), (e:Exercise {id: 'bt-07'}) CREATE (u)-[:ATTEMPTED {answer: '36', correct: true, at: timestamp() - 181440000}]->(e);
MATCH (u:User {id: 'hs-an'}), (e:Exercise {id: 'bt-09'}) CREATE (u)-[:ATTEMPTED {answer: '14', correct: false, at: timestamp() - 95040000}]->(e);
MATCH (u:User {id: 'hs-ha'}), (e:Exercise {id: 'bt-01'}) CREATE (u)-[:ATTEMPTED {answer: '100', correct: true, at: timestamp() - 475200000}]->(e);
MATCH (u:User {id: 'hs-ha'}), (e:Exercise {id: 'bt-03'}) CREATE (u)-[:ATTEMPTED {answer: '50', correct: true, at: timestamp() - 440640000}]->(e);
MATCH (u:User {id: 'hs-ha'}), (e:Exercise {id: 'bt-04'}) CREATE (u)-[:ATTEMPTED {answer: '115', correct: true, at: timestamp() - 406080000}]->(e);
MATCH (u:User {id: 'hs-ha'}), (e:Exercise {id: 'bt-06'}) CREATE (u)-[:ATTEMPTED {answer: '1', correct: true, at: timestamp() - 371520000}]->(e);
MATCH (u:User {id: 'hs-ha'}), (e:Exercise {id: 'bt-07'}) CREATE (u)-[:ATTEMPTED {answer: '36', correct: true, at: timestamp() - 336960000}]->(e);
MATCH (u:User {id: 'hs-ha'}), (e:Exercise {id: 'bt-09'}) CREATE (u)-[:ATTEMPTED {answer: '10', correct: true, at: timestamp() - 302400000}]->(e);
MATCH (u:User {id: 'hs-ha'}), (e:Exercise {id: 'bt-10'}) CREATE (u)-[:ATTEMPTED {answer: '45', correct: true, at: timestamp() - 267840000}]->(e);
MATCH (u:User {id: 'hs-ha'}), (e:Exercise {id: 'bt-11'}) CREATE (u)-[:ATTEMPTED {answer: '120', correct: true, at: timestamp() - 233280000}]->(e);
MATCH (u:User {id: 'hs-ha'}), (e:Exercise {id: 'bt-13'}) CREATE (u)-[:ATTEMPTED {answer: '81', correct: true, at: timestamp() - 198720000}]->(e);
MATCH (u:User {id: 'hs-ha'}), (e:Exercise {id: 'bt-14'}) CREATE (u)-[:ATTEMPTED {answer: '2', correct: true, at: timestamp() - 164160000}]->(e);
MATCH (u:User {id: 'hs-bao'}), (e:Exercise {id: 'bt-01'}) CREATE (u)-[:ATTEMPTED {answer: '100', correct: true, at: timestamp() - 241920000}]->(e);
MATCH (u:User {id: 'hs-bao'}), (e:Exercise {id: 'bt-03'}) CREATE (u)-[:ATTEMPTED {answer: '100', correct: false, at: timestamp() - 233280000}]->(e);
MATCH (u:User {id: 'hs-bao'}), (e:Exercise {id: 'bt-04'}) CREATE (u)-[:ATTEMPTED {answer: '65', correct: false, at: timestamp() - 224640000}]->(e);
MATCH (u:User {id: 'hs-an'}), (t:Test {id: 'kt-2'}) CREATE (u)-[:TOOK]->(:Result {id: 'kq-1', score: 7.5, correct: 3, total: 4, seconds: 190, testName: 'Kiểm tra nhanh: Góc trong tứ giác', at: timestamp() - 259200000})-[:OF]->(t);
MATCH (u:User {id: 'hs-ha'}), (t:Test {id: 'kt-1'}) CREATE (u)-[:TOOK]->(:Result {id: 'kq-2', score: 10, correct: 6, total: 6, seconds: 540, testName: 'Kiểm tra 15 phút: Tứ giác đặc biệt', at: timestamp() - 103680000})-[:OF]->(t);
MATCH (u:User {id: 'hs-ha'}), (t:Test {id: 'kt-2'}) CREATE (u)-[:TOOK]->(:Result {id: 'kq-3', score: 10, correct: 4, total: 4, seconds: 150, testName: 'Kiểm tra nhanh: Góc trong tứ giác', at: timestamp() - 216000000})-[:OF]->(t);
MATCH (u:User {id: 'hs-bao'}), (t:Test {id: 'kt-2'}) CREATE (u)-[:TOOK]->(:Result {id: 'kq-4', score: 5, correct: 2, total: 4, seconds: 285, testName: 'Kiểm tra nhanh: Góc trong tứ giác', at: timestamp() - 172800000})-[:OF]->(t);
