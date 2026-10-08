// Ràng buộc cho đồ thị Góc Tứ Giác (Neo4j 4.4 trở lên).
// Mỗi nút có thuộc tính id duy nhất; email của người dùng không được trùng.

CREATE CONSTRAINT user_id IF NOT EXISTS FOR (n:User) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT user_email IF NOT EXISTS FOR (n:User) REQUIRE n.email IS UNIQUE;
CREATE CONSTRAINT topic_id IF NOT EXISTS FOR (n:Topic) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT lesson_id IF NOT EXISTS FOR (n:Lesson) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT exercise_id IF NOT EXISTS FOR (n:Exercise) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT test_id IF NOT EXISTS FOR (n:Test) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT result_id IF NOT EXISTS FOR (n:Result) REQUIRE n.id IS UNIQUE;
