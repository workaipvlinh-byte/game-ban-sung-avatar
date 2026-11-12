# Avatar Lên Tường

Game tương tác cho TikTok LIVE. Người xem comment một câu là vào hàng chờ, tới lượt thì súng sơn đồ chơi bắn avatar của họ dính lên tường kèm tên, MC gọi tên "… lên tường nè!". Camera cứ đi dọc bức tường, mỗi người một bức.

Màn hình dọc 1080×1920, chạy trên web, đưa lên live bằng nguồn Link của TikTok LIVE Studio.

## Cách chơi

- **Comment bất kỳ** là vào cuối hàng chờ. Đang chờ thì comment thêm không đổi chỗ. Lên tường rồi muốn lên lại thì comment tiếp. Comment có từ bậy thì không được xếp hàng.
- **Quà:** cộng xu vào chỗ trong hàng, xu cao lên trước, bằng xu thì ai vào trước lên trước. Người tặng có vệt sơn to hơn (xu càng nhiều avatar càng to), viền vàng, sticker THANK YOU, MC cảm ơn đúng tên, camera đứng lâu hơn ở bức tường đó.
- **Tim:** đầy thanh 500 tim thì có mưa sơn, lên tường nhanh hơn trong 30 giây.
- **Nhịp:** camera lướt 2,2 giây sang tường mới, tới nơi mới bắn, đứng lại cho mọi người nhìn rồi đi tiếp. Hàng đông (trên 30 người) thì đứng ngắn hơn. Không ai comment thì vẫn đi và bắn vệt sơn trống cho màn hình không đứng im.
- Góc phải trên hiện 4 người sắp lên và số người còn chờ.

## Hình và tiếng

- Viên sơn phát sáng nạp sẵn ở đầu nòng, bắn đi thì nạp viên màu khác ngay. Lúc bắn có chớp đầu nòng, giọt sơn văng, khói hơi, vệt bay theo viên sơn.
- Tiếng súng sơn ("tách, bụp, xì") và tiếng sơn vỡ trên tường tạo bằng code. Muốn tiếng thật thì bỏ file `ban.mp3`, `splat.mp3`, `qua.mp3`, `muason.mp3` vào `public/assets/sfx/`.
- Nhạc nền: `public/assets/nhac/nhac-nen.mp3`. Không có file thì game tự phát nhạc DJ tạo bằng code. MC nói thì nhạc nhỏ xuống.

## MC

- Mặc định giọng **Adam bựa** (VieNeu-TTS), có cười, có hô. Chưa cài VieNeu thì game tự đọc giọng Nam Minh của Edge, live không bị im.
- MC ít nói: mỗi lần bắn đọc tên + "lên tường nè", cảm ơn quà, cảm ơn chung khi comment đông (tối đa 1 lần mỗi 1,5 phút). Không chào từng người vào phòng, không bao giờ đọc nguyên văn comment.
- Trang điều khiển có mục "Giọng MC": chọn Adam bựa hoặc giọng thường (Edge), nút nghe thử trên stage.

### Cài giọng Adam bựa

Adam bựa là một giọng có sẵn của [VieNeu-TTS](https://github.com/pnnbao97/VieNeu-TTS), phần mềm đọc tiếng Việt chạy ngay trên máy (không mất tiền, không cần mạng khi đọc). Game gọi VieNeu qua địa chỉ `http://127.0.0.1:8000`.

1. Cài `uv` (trình cài Python). Mở PowerShell, chạy:
   ```
   powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
   ```
2. Tải VieNeu về đúng thư mục `E:\02_AI\VieNeu-TTS` (để `BAT-LIVE.bat` tự tìm thấy):
   ```
   git clone https://github.com/pnnbao97/VieNeu-TTS.git E:\02_AI\VieNeu-TTS
   cd E:\02_AI\VieNeu-TTS
   ```
3. Cài thư viện, chọn 1 trong 2:
   - Máy có card NVIDIA (đọc nhanh hơn nhiều): `uv sync --extra cuda`
   - Không có card rời: `uv sync`
4. Chạy thử một lần: `uv run python -m apps.openai_speech`. Lần đầu nó tải model, chờ tới khi thấy dòng `Uvicorn running on http://127.0.0.1:8000` là xong. Mở `http://127.0.0.1:8000/v1/voices` thấy có "Adam bựa" là được, rồi tắt cửa sổ đó.

Từ giờ bấm `BAT-LIVE.bat` là nó tự mở VieNeu trong một cửa sổ riêng nếu chưa chạy. Đừng tắt cửa sổ đó khi đang live.

- Để VieNeu ở thư mục khác: tự bật VieNeu (bước 4) trước khi bấm `BAT-LIVE.bat`. VieNeu chạy ở máy hoặc cổng khác thì đặt `VIENEU_URL=http://địa-chỉ:cổng` trong file `.env`.
- Trong câu MC (`src/game/config.ts`) viết được `[cười]`, `[thở dài]`, `[hắng giọng]`, Adam sẽ cười, thở dài, hắng giọng thật. Giọng Edge tự bỏ mấy thẻ này.
- Máy không có card rời vẫn chạy được nhưng mỗi câu chậm hơn. Trên máy làm game, mỗi câu mất khoảng 1,5 giây.

## Chạy

1. Cài Node.js bản LTS. Bấm đúp `BAT-LIVE.bat`, lần đầu tự cài thư viện 1–2 phút, xong tự mở trang điều khiển `http://localhost:3012`.
2. TikTok LIVE Studio: thêm nguồn **Link** `http://lvh.me:3012/?view=stage`, khổ 1080 × 1920.
3. Bấm Phát trực tiếp trước, rồi nhập username vào trang điều khiển và bấm Kết nối.

Chưa live mà muốn thử: dùng các nút Giả lập và mục "Thử" ở trang điều khiển (1/20/100 comment, quà 1/99/1000 xu, 100 tim). Trang điều khiển còn có tốc độ, bật tắt nhạc, âm lượng nhạc và hiệu ứng, chọn giọng MC, xoá 1 người khỏi hàng và tường, lau tường.

### Lỗi kết nối hay gặp

- **401 "Anonymous access is not available from your network":** tạo key miễn phí ở eulerstream.com, chép `.env.example` thành `.env`, dán vào dòng `EULER_API_KEY=`.
- **DEVICE_BLOCKED:** thường do đang bật VPN (Cloudflare WARP…). Tắt VPN rồi kết nối lại. Vẫn bị thì điền cookie của một nick phụ vào `.env` (hướng dẫn trong `.env.example`).

## Cấu trúc

- `src/game/config.ts`: số liệu và mọi câu MC.
- `src/game/useGame.ts`: luật chơi, hàng chờ, nhịp bắn. `src/game/queue.ts`: thứ tự hàng chờ (tự kiểm: `npx tsx src/game/queue.check.ts`).
- `src/game/GameStage.tsx`: màn hình. `src/game/walk.ts`: camera đi dọc tường. `src/game/audio.ts`: nhạc, tiếng.
- `src/live/`, `server.ts`: phần dùng chung (kết nối TikTok, giọng đọc, trang điều khiển).

## Lưu ý

- Kết nối TikTok qua thư viện không chính thức `tiktok-live-connector`. TikTok không hỗ trợ cách này, có rủi ro với tài khoản, ai dùng tự chịu.
- Ảnh tường và súng tạo bằng Gemini. Nhạc nền tải từ Pixabay.
