# Tài Liệu Yêu Cầu

## Giới Thiệu

Game đánh bài Sâm 10 lá (Sam Lốc 10 lá) là một trò chơi bài dân gian Việt Nam dành cho 2–4 người chơi. Mỗi người được chia 10 lá bài từ bộ bài 52 lá tiêu chuẩn. Người chơi lần lượt đánh bài theo luật, người hết bài trước thắng. Game hỗ trợ chế độ chơi với AI (bot) và chơi nhiều người trên cùng thiết bị (local multiplayer).

---

## Bảng Thuật Ngữ

- **Game**: Hệ thống game đánh bài Sâm 10 lá.
- **Player**: Người chơi (con người hoặc bot AI).
- **Bot**: Người chơi do máy tính điều khiển.
- **Hand**: Bộ bài trên tay của một Player (10 lá khi bắt đầu).
- **Deck**: Bộ bài 52 lá tiêu chuẩn (4 chất: Bích, Cơ, Rô, Nhép). Chất chỉ dùng để phân biệt lá bài, KHÔNG dùng để so sánh độ lớn.
- **Pile**: Chồng bài đã đánh trên bàn (pile hiện tại).
- **Turn**: Lượt đánh của một Player.
- **Combination**: Tổ hợp bài hợp lệ được đánh ra trong một Turn (Rác, Đôi, Sám, Tứ Quý, Sảnh).
- **Pass**: Hành động bỏ lượt của một Player.
- **Round**: Một ván bài từ khi chia bài đến khi có người thắng.
- **Rank**: Thứ hạng của lá bài (3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2). Lá 2 là lớn nhất.
- **Rác**: Combination gồm 1 lá bài bất kỳ.
- **Đôi**: Combination gồm 2 lá cùng Rank.
- **Sám**: Combination gồm 3 lá cùng Rank.
- **Tứ Quý**: Combination gồm 4 lá cùng Rank.
- **Sảnh**: Combination gồm 3 lá trở lên có Rank liên tiếp. Lá 2 được phép xuất hiện trong Sảnh nếu nằm trong chuỗi liên tiếp tự nhiên (ví dụ: A-2-3 hoặc 2-3-4). Lá 2 đứng độc lập (không trong chuỗi) không được dùng trong Sảnh.
- **Báo Sâm**: Hành động tuyên bố sẽ đánh hết bài mà không ai chặn được.
- **Cóng**: Trạng thái của Player không đánh được lá nào trong suốt Round.
- **Thối 2**: Trạng thái bị phạt khi toàn bộ Hand còn lại của Player thua chỉ gồm các lá 2 (1, 2, 3, hoặc 4 lá 2) khi Round kết thúc.
- **Dealer**: Thành phần chịu trách nhiệm xáo và chia bài.
- **Validator**: Thành phần kiểm tra tính hợp lệ của Combination.
- **AI_Engine**: Thành phần điều khiển logic đánh bài của Bot.
- **Score_Tracker**: Thành phần theo dõi và tính điểm sau mỗi Round.
- **UI**: Giao diện người dùng hiển thị trạng thái game.

---

## Yêu Cầu

### Yêu Cầu 1: Khởi Tạo Ván Bài

**User Story:** Là một người chơi, tôi muốn bắt đầu một ván bài mới, để có thể chơi game sâm 10 lá.

#### Tiêu Chí Chấp Nhận

1. THE Game SHALL hỗ trợ từ 2 đến 4 Player trong một Round.
2. WHEN một Round mới bắt đầu, THE Dealer SHALL xáo ngẫu nhiên bộ Deck 52 lá.
3. WHEN Deck đã được xáo, THE Dealer SHALL chia đúng 10 lá cho mỗi Player.
4. WHEN Round đầu tiên bắt đầu, THE Game SHALL chọn ngẫu nhiên một Player để đánh trước.
5. WHEN các Round tiếp theo bắt đầu, THE Game SHALL cho phép người thắng Round trước đánh trước.
6. IF số lượng Player không nằm trong khoảng từ 2 đến 4, THEN THE Game SHALL hiển thị thông báo lỗi và không bắt đầu Round.

---

### Yêu Cầu 2: Luật Đánh Bài và Tổ Hợp Hợp Lệ

**User Story:** Là một người chơi, tôi muốn hệ thống kiểm tra bài đánh của tôi có hợp lệ không, để đảm bảo game diễn ra đúng luật.

#### Tiêu Chí Chấp Nhận

1. THE Validator SHALL chấp nhận các Combination sau: Rác (1 lá), Đôi (2 lá cùng Rank), Sám (3 lá cùng Rank), Tứ Quý (4 lá cùng Rank), Sảnh (3 lá trở lên có Rank liên tiếp).
2. THE Validator SHALL chấp nhận Sảnh có chứa lá 2 khi lá 2 nằm trong chuỗi Rank liên tiếp tự nhiên (ví dụ: A-2-3 hoặc 2-3-4), và SHALL từ chối Sảnh khi lá 2 không nằm trong chuỗi liên tiếp.
3. WHEN so sánh hai Sảnh cùng số lá, THE Validator SHALL xác định Sảnh lớn hơn dựa trên Rank của lá cao nhất trong chuỗi (ví dụ: A-2-3 có lá cao nhất là 3, thua 2-3-4 có lá cao nhất là 4).
4. WHEN một Player đánh Combination, THE Validator SHALL kiểm tra Combination đó có cùng loại với Combination trên Pile hiện tại không.
5. WHEN một Player đánh Combination cùng loại với Pile, THE Validator SHALL kiểm tra Combination mới có Rank cao hơn Combination trên Pile không, chỉ dựa trên Rank mà không phân biệt chất.
6. IF một Player đánh Combination không hợp lệ, THEN THE Validator SHALL từ chối và yêu cầu Player chọn lại.
7. WHEN Pile trống (lượt đầu hoặc sau khi tất cả Pass), THE Validator SHALL chấp nhận bất kỳ Combination hợp lệ nào.
8. THE Validator SHALL cho phép Tứ Quý chặt một lá 2 đơn (Rác là lá 2) theo luật đặc biệt.
9. THE Validator SHALL cho phép Tứ Quý chặt Đôi 2 (Đôi gồm 2 lá 2) theo luật đặc biệt.
10. WHERE luật bàn cho phép, THE Validator SHALL cho phép 3 Đôi liên tiếp (6 lá) chặt một lá 2 đơn theo luật đặc biệt.

---

### Yêu Cầu 3: Quản Lý Lượt Chơi

**User Story:** Là một người chơi, tôi muốn game tự động quản lý thứ tự lượt chơi, để trò chơi diễn ra trơn tru.

#### Tiêu Chí Chấp Nhận

1. THE Game SHALL cho phép Player thực hiện đúng một trong hai hành động trong Turn: đánh Combination hợp lệ hoặc Pass.
2. WHEN một Player đánh Combination hợp lệ, THE Game SHALL cập nhật Pile và chuyển Turn sang Player tiếp theo theo chiều kim đồng hồ.
3. WHEN một Player chọn Pass, THE Game SHALL ghi nhận Pass và chuyển Turn sang Player tiếp theo.
4. WHEN tất cả Player còn lại đều Pass sau lượt đánh của một Player, THE Game SHALL xóa Pile và cho phép Player vừa đánh được đánh tự do (Pile trống).
5. WHILE một Player đang trong Turn, THE Game SHALL hiển thị thời gian còn lại để đánh bài (30 giây mặc định).
6. IF một Player không thực hiện hành động trong 30 giây, THEN THE Game SHALL tự động Pass cho Player đó.

---

### Yêu Cầu 4: Điều Kiện Thắng và Kết Thúc Ván

**User Story:** Là một người chơi, tôi muốn game xác định người thắng khi ai đó hết bài, để biết kết quả ván đấu.

#### Tiêu Chí Chấp Nhận

1. WHEN một Player đánh lá bài cuối cùng trong Hand, THE Game SHALL tuyên bố Player đó thắng Round.
2. WHEN Round kết thúc, THE Score_Tracker SHALL tính điểm phạt cho các Player thua dựa trên số lá bài còn lại trong Hand.
3. THE Score_Tracker SHALL tính 1 điểm phạt cho mỗi lá bài còn lại trong Hand của Player thua.
4. THE Score_Tracker SHALL tính 2 điểm phạt cho mỗi lá 2 còn lại trong Hand của Player thua (luật Thối 2).
5. WHEN tổng điểm phạt của một Player đạt hoặc vượt ngưỡng thua (mặc định 30 điểm), THE Game SHALL kết thúc toàn bộ game và hiển thị bảng xếp hạng.
6. WHEN game kết thúc, THE UI SHALL hiển thị bảng xếp hạng cuối cùng với tên Player và tổng điểm phạt.

---

### Yêu Cầu 5: Luật Báo Sâm

**User Story:** Là một người chơi, tôi muốn có thể báo sâm khi tôi tự tin đánh hết bài mà không ai chặn được, để giành thắng lợi lớn.

#### Tiêu Chí Chấp Nhận

1. WHEN đến Turn của một Player, THE Game SHALL cho phép Player đó thực hiện hành động Báo Sâm thay vì đánh bài thông thường.
2. WHEN một Player thực hiện Báo Sâm, THE Game SHALL cho phép Player đó đánh lần lượt toàn bộ Hand mà không bị gián đoạn bởi lượt của Player khác.
3. WHEN Player Báo Sâm đánh hết toàn bộ Hand mà không có Player nào chặn được, THE Score_Tracker SHALL áp dụng mức thưởng đặc biệt cho Player thắng và mức phạt đặc biệt cho các Player thua.
4. WHEN một Player chặn được bài của Player đang Báo Sâm, THE Score_Tracker SHALL áp dụng mức phạt nặng cho Player đã Báo Sâm.
5. IF một Player Báo Sâm nhưng bị chặn, THEN THE Game SHALL hủy trạng thái Báo Sâm và tiếp tục Round theo luật thông thường từ lượt bị chặn.

---

### Yêu Cầu 6: Luật Cóng

**User Story:** Là một người chơi, tôi muốn game ghi nhận trường hợp cóng để tính phạt đúng luật, để đảm bảo sự công bằng.

#### Tiêu Chí Chấp Nhận

1. WHEN Round kết thúc, THE Score_Tracker SHALL kiểm tra từng Player thua xem có bị Cóng không.
2. THE Score_Tracker SHALL xác định một Player bị Cóng khi Player đó không đánh được bất kỳ lá bài nào trong suốt Round (chỉ Pass hoặc bị bỏ qua toàn bộ).
3. WHEN một Player bị Cóng, THE Score_Tracker SHALL áp dụng mức phạt Cóng nặng hơn mức phạt thông thường cho Player đó.
4. THE UI SHALL hiển thị thông báo "Cóng" rõ ràng cho Player bị Cóng khi Round kết thúc.

---

### Yêu Cầu 7: Luật Thối 2

**User Story:** Là một người chơi, tôi muốn game áp dụng phạt Thối 2 đúng luật, để khuyến khích đánh lá 2 đúng thời điểm.

#### Tiêu Chí Chấp Nhận

1. WHEN Round kết thúc, THE Score_Tracker SHALL kiểm tra Hand của từng Player thua xem toàn bộ các lá còn lại có phải đều là lá 2 không.
2. WHEN toàn bộ Hand còn lại của một Player thua chỉ gồm lá 2 (1, 2, 3, hoặc 4 lá 2), THE Score_Tracker SHALL áp dụng mức phạt Thối 2 cho Player đó.
3. IF Hand còn lại của một Player thua có ít nhất một lá không phải lá 2, THEN THE Score_Tracker SHALL KHÔNG áp dụng luật Thối 2 cho Player đó.
4. THE UI SHALL hiển thị thông báo "Thối 2" cho Player bị phạt khi Round kết thúc.

---

### Yêu Cầu 8: Chế Độ Chơi Với Bot (AI)

**User Story:** Là một người chơi, tôi muốn chơi với bot AI khi không có đủ người, để có thể chơi một mình.

#### Tiêu Chí Chấp Nhận

1. THE Game SHALL hỗ trợ từ 1 đến 3 Bot thay thế cho Player người trong một Round.
2. WHEN đến Turn của Bot, THE AI_Engine SHALL tự động chọn và đánh Combination hợp lệ trong vòng 1 giây.
3. WHEN Bot không có Combination hợp lệ nào để đánh, THE AI_Engine SHALL tự động Pass.
4. THE AI_Engine SHALL ưu tiên đánh Combination có Rank thấp nhất có thể thắng Pile hiện tại để giữ bài mạnh.
5. WHERE chế độ khó (Hard) được chọn, THE AI_Engine SHALL theo dõi các lá bài đã đánh để đưa ra quyết định tối ưu hơn.

---

### Yêu Cầu 9: Giao Diện Người Dùng

**User Story:** Là một người chơi, tôi muốn giao diện hiển thị rõ ràng trạng thái game, để tôi có thể đưa ra quyết định đánh bài.

#### Tiêu Chí Chấp Nhận

1. THE UI SHALL hiển thị Hand của Player hiện tại (người dùng) dưới dạng hình ảnh lá bài.
2. THE UI SHALL hiển thị số lá bài còn lại trong Hand của mỗi Player khác (không hiển thị mặt bài).
3. THE UI SHALL hiển thị Combination trên Pile hiện tại.
4. THE UI SHALL hiển thị Player nào đang trong Turn.
5. WHEN một Player chọn lá bài để đánh, THE UI SHALL highlight các lá bài được chọn.
6. WHEN một Combination không hợp lệ được chọn, THE UI SHALL hiển thị thông báo lỗi rõ ràng trong vòng 500ms.
7. THE UI SHALL hiển thị đồng hồ đếm ngược 30 giây trong Turn của Player người dùng.
8. WHEN Round kết thúc, THE UI SHALL hiển thị màn hình kết quả với thứ hạng và điểm phạt của từng Player.

---

### Yêu Cầu 10: Lưu Trữ và Tiếp Tục Ván Đấu

**User Story:** Là một người chơi,ftôi muốn có thể thoát và quay lại tiếp tục ván đấu, để không mất tiến trình khi bị gián đoạn.

#### Tiêu Chí Chấp Nhận

1. WHEN người dùng thoát khỏi game trong khi Round đang diễn ra, THE Game SHALL tự động lưu trạng thái hiện tại của Round.
2. WHEN người dùng quay lại game, THE Game SHALL tải lại trạng thái Round đã lưu và tiếp tục từ Turn hiện tại.
3. THE Game SHALL lưu trữ: Hand của mỗi Player, Pile hiện tại, Turn hiện tại, và tổng điểm phạt tích lũy.
4. IF dữ liệu lưu trữ bị lỗi hoặc không hợp lệ, THEN THE Game SHALL bắt đầu một Round mới thay vì tải dữ liệu lỗi.
