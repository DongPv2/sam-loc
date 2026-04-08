# Kế Hoạch Implementation: Game Sâm 10 Lá

## Tổng Quan

Triển khai game Sâm 10 lá theo kiến trúc phân lớp: core logic (TypeScript thuần), AI engine, save/load, và UI layer. Mỗi bước build trên bước trước, kết thúc bằng wiring toàn bộ hệ thống.

## Tasks

- [x] 1. Thiết lập cấu trúc dự án và định nghĩa kiểu dữ liệu cốt lõi
  - Khởi tạo dự án TypeScript với Vitest và fast-check
  - Tạo file `src/types.ts` định nghĩa: `Suit`, `Rank`, `Card`, `Combination`, `CombinationType`, `Player`, `GameState`, `RoundHistory`, `PlayAction`, `PenaltyResult`, `AIAction`, `ValidationResult`
  - Tạo cấu trúc thư mục: `src/core/`, `src/ai/`, `src/storage/`, `src/ui/`
  - _Requirements: 1.1, 2.1_

- [x] 2. Implement Dealer (xáo bài và chia bài)
  - [x] 2.1 Implement `Dealer` trong `src/core/dealer.ts`
    - Implement `shuffle(deck)` dùng thuật toán Fisher-Yates
    - Implement `deal(deck, playerCount, cardsPerPlayer)` chia đúng 10 lá/người
    - _Requirements: 1.2, 1.3_

  - [x]* 2.2 Viết property test cho Dealer
    - **Property 1: Shuffle giữ nguyên bộ bài**
    - **Validates: Requirements 1.2**
    - **Property 2: Chia bài đúng số lượng và không trùng lặp**
    - **Validates: Requirements 1.3**

- [x] 3. Implement Validator (kiểm tra và so sánh Combination)
  - [x] 3.1 Implement `getCombinationType` và `isValidCombination` trong `src/core/validator.ts`
    - Nhận diện: Rác, Đôi, Sám, Tứ Quý, Sảnh (≥3 lá liên tiếp)
    - Xử lý Sảnh có lá 2 trong chuỗi liên tiếp tự nhiên (A-2-3, 2-3-4)
    - _Requirements: 2.1, 2.2_

  - [x]* 3.2 Viết property test cho isValidCombination
    - **Property 4: Validator chấp nhận mọi Combination hợp lệ**
    - **Validates: Requirements 2.1**
    - **Property 5: Sảnh với lá 2 — chấp nhận khi liên tiếp, từ chối khi không**
    - **Validates: Requirements 2.2**

  - [x] 3.3 Implement `canBeat(incoming, pile)` trong `src/core/validator.ts`
    - So sánh cùng loại theo `representativeRank`
    - Luật đặc biệt: Tứ Quý chặt Rác-2 và Đôi-2; 3 Đôi liên tiếp chặt Rác-2
    - Pile null → luôn trả về `true`
    - _Requirements: 2.3, 2.4, 2.5, 2.7, 2.8, 2.9, 2.10_

  - [x]* 3.4 Viết property test cho canBeat
    - **Property 6: canBeat — chỉ thắng khi cùng loại và Rank cao hơn (trừ luật đặc biệt)**
    - **Validates: Requirements 2.3, 2.4, 2.5**
    - **Property 7: Pile trống — mọi Combination hợp lệ đều được đánh**
    - **Validates: Requirements 2.7**

  - [x]* 3.5 Viết unit test cho các luật đặc biệt
    - Test Tứ Quý chặt lá 2 đơn (Rác-2)
    - Test Tứ Quý chặt Đôi-2
    - Test 3 Đôi liên tiếp chặt lá 2 đơn
    - _Requirements: 2.8, 2.9, 2.10_

- [x] 4. Checkpoint — Đảm bảo tất cả tests pass
  - Đảm bảo tất cả tests pass, hỏi người dùng nếu có thắc mắc.

- [x] 5. Implement Turn Manager (quản lý lượt chơi)
  - [x] 5.1 Implement `TurnManager` trong `src/core/turnManager.ts`
    - Quản lý `currentPlayerIndex`, danh sách `passedPlayers`
    - `nextTurn()`: chuyển lượt theo chiều kim đồng hồ
    - `recordPass()`, `isAllPassed()`, `resetPile()`
    - `startTimer(onTimeout)` / `stopTimer()`: đếm ngược 30 giây, auto-pass khi hết giờ
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x]* 5.2 Viết property test cho Turn Manager
    - **Property 8: Đánh bài hợp lệ cập nhật Pile và chuyển lượt**
    - **Validates: Requirements 3.2**
    - **Property 9: Tất cả Pass → Pile reset**
    - **Validates: Requirements 3.4**

  - [x]* 5.3 Viết unit test cho timeout auto-pass
    - Test player không hành động trong 30 giây → tự động Pass
    - _Requirements: 3.6_

- [x] 6. Implement Score Tracker (tính điểm phạt)
  - [x] 6.1 Implement `ScoreTracker` trong `src/core/scoreTracker.ts`
    - `calculatePenalty(player, winner)`: 1 điểm/lá thường, 2 điểm/lá 2 (Thối 2)
    - `isConged(player, roundHistory)`: kiểm tra không có hành động PLAY nào
    - `isThoi2(player)`: kiểm tra toàn bộ hand là lá 2 (rank=15)
    - `applyBaoSamBonus` / `applyBaoSamPenalty`
    - `getTotalScore(playerId)`, `isGameOver(threshold=30)`
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3_

  - [x]* 6.2 Viết property test cho Score Tracker
    - **Property 10: Hết bài → thắng ván**
    - **Validates: Requirements 4.1**
    - **Property 11: Tính điểm phạt đúng công thức**
    - **Validates: Requirements 4.2, 4.3, 4.4, 7.2**
    - **Property 12: Game kết thúc khi đạt ngưỡng 30 điểm**
    - **Validates: Requirements 4.5**
    - **Property 15: Phát hiện Cóng chính xác**
    - **Validates: Requirements 6.2**
    - **Property 16: Phạt Cóng nặng hơn phạt thường**
    - **Validates: Requirements 6.3**
    - **Property 17: Phát hiện Thối 2 chính xác**
    - **Validates: Requirements 7.2, 7.3**

  - [x]* 6.3 Viết unit test cho Báo Sâm thưởng/phạt
    - Test Báo Sâm thành công → thưởng đặc biệt
    - Test Báo Sâm bị chặn → phạt nặng
    - _Requirements: 5.3, 5.4_

- [x] 7. Checkpoint — Đảm bảo tất cả tests pass
  - Đảm bảo tất cả tests pass, hỏi người dùng nếu có thắc mắc.

- [x] 8. Implement Game Engine (điều phối luồng game)
  - [x] 8.1 Implement `GameEngine` trong `src/core/gameEngine.ts`
    - Khởi tạo game: validate số người chơi (2–4), gọi Dealer, chọn người đánh đầu tiên
    - Xử lý hành động PLAY: gọi Validator, cập nhật Pile, kiểm tra hết bài
    - Xử lý hành động PASS: gọi TurnManager, kiểm tra all-passed
    - Xử lý Báo Sâm: set `baoSamPlayerId`, enforce chỉ người Báo Sâm được đánh
    - Kết thúc ván: gọi ScoreTracker, kiểm tra game over, chuẩn bị ván mới
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 3.1, 3.2, 3.3, 3.4, 4.1, 5.1, 5.2, 5.5_

  - [x]* 8.2 Viết property test cho Game Engine
    - **Property 3: Người thắng ván trước đánh trước ván sau**
    - **Validates: Requirements 1.5**
    - **Property 13: Báo Sâm — chỉ người Báo Sâm được đánh**
    - **Validates: Requirements 5.2**
    - **Property 14: Báo Sâm bị chặn → reset trạng thái**
    - **Validates: Requirements 5.5**

  - [x]* 8.3 Viết unit test cho khởi tạo game không hợp lệ
    - Test số người chơi < 2 hoặc > 4 → hiển thị lỗi, không bắt đầu
    - _Requirements: 1.6_

- [x] 9. Implement AI Engine
  - [x] 9.1 Implement `AIEngine` trong `src/ai/aiEngine.ts`
    - `chooseAction(hand, pile, gameState, difficulty)` trả về `AIAction`
    - Easy: chọn Combination hợp lệ có `representativeRank` nhỏ nhất
    - Hard: theo dõi lá đã đánh, ưu tiên đánh bài yếu trước
    - Fallback về PASS nếu không có Combination hợp lệ
    - Timeout 1 giây → tự động PASS
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x]* 9.2 Viết property test cho AI Engine
    - **Property 18: AI luôn trả về hành động hợp lệ**
    - **Validates: Requirements 8.2, 8.3**
    - **Property 19: Easy AI chọn Combination nhỏ nhất hợp lệ**
    - **Validates: Requirements 8.4**

- [x] 10. Implement Save Manager (lưu và tải trạng thái)
  - [x] 10.1 Implement `SaveManager` trong `src/storage/saveManager.ts`
    - `save(state)`: serialize `GameState` vào localStorage (web) hoặc file JSON (native)
    - `load()`: deserialize và validate schema; trả về null nếu lỗi
    - `isValid(state)`: type guard kiểm tra schema `GameState`
    - `clear()`: xóa dữ liệu lưu
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x]* 10.2 Viết property test cho Save Manager
    - **Property 20: Save/Load round-trip giữ nguyên trạng thái**
    - **Validates: Requirements 10.2, 10.3**

  - [x]* 10.3 Viết unit test cho dữ liệu lưu bị lỗi
    - Test load dữ liệu corrupt → trả về null → bắt đầu ván mới
    - _Requirements: 10.4_

- [x] 11. Checkpoint — Đảm bảo tất cả tests pass
  - Đảm bảo tất cả tests pass, hỏi người dùng nếu có thắc mắc.

- [x] 12. Implement UI Layer
  - [x] 12.1 Tạo component hiển thị bàn chơi trong `src/ui/`
    - Hiển thị Hand của người chơi (hình ảnh lá bài, có thể chọn)
    - Hiển thị số lá còn lại của các player khác (không lộ mặt bài)
    - Hiển thị Pile hiện tại và player đang trong Turn
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 12.2 Implement tương tác chọn bài và đánh bài
    - Highlight lá bài được chọn
    - Hiển thị thông báo lỗi trong 500ms khi Combination không hợp lệ
    - Nút Pass và nút Báo Sâm
    - _Requirements: 9.5, 9.6_

  - [x] 12.3 Implement đồng hồ đếm ngược và màn hình kết quả
    - Hiển thị countdown 30 giây trong Turn của người chơi
    - Màn hình kết quả ván: thứ hạng, điểm phạt, thông báo Cóng/Thối 2
    - _Requirements: 9.7, 9.8, 6.4, 7.4_

- [x] 13. Wiring — Kết nối tất cả các thành phần
  - [x] 13.1 Kết nối UI với Game Engine
    - UI gọi `GameEngine` để xử lý hành động người chơi
    - `GameEngine` notify UI cập nhật trạng thái sau mỗi hành động
    - Tích hợp `SaveManager`: auto-save khi thoát, auto-load khi khởi động
    - _Requirements: 10.1, 10.2_

  - [x] 13.2 Tích hợp AI Engine vào Game Engine
    - Khi đến lượt Bot, `GameEngine` gọi `AIEngine.chooseAction()` và xử lý kết quả
    - Hiển thị delay nhỏ (≤1s) trước khi Bot đánh để UX tự nhiên hơn
    - _Requirements: 8.1, 8.2_

  - [x]* 13.3 Viết integration test cho luồng game đầy đủ
    - Test từ khởi tạo → đánh bài → kết thúc ván → tính điểm → ván mới
    - Test save/load với trạng thái game thực tế
    - Test AI hoàn thành lượt trong thời gian quy định (≤1s)
    - _Requirements: 1.1–10.4_

- [x] 14. Checkpoint cuối — Đảm bảo tất cả tests pass
  - Đảm bảo tất cả tests pass, hỏi người dùng nếu có thắc mắc.

## Ghi Chú

- Tasks đánh dấu `*` là tùy chọn, có thể bỏ qua để ra MVP nhanh hơn
- Mỗi task tham chiếu requirements cụ thể để đảm bảo traceability
- Property tests dùng fast-check, chạy tối thiểu 100 iterations mỗi property
- Unit tests dùng Vitest
- Tag format cho property tests: `// Feature: sam-10-la-card-game, Property {N}: {tên property}`
