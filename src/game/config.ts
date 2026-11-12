// =====================================================
//  CẤU HÌNH GAME - phần lớn thay đổi nhỏ chỉ cần sửa file này
//  Câu đọc: `name` = tên người xem (đã làm sạch), `kenh` = tên kênh (ô "Tên kênh" ở trang điều khiển)
//  Muốn tắt tính năng nào thì để số thời gian = 0 hoặc danh sách câu rỗng [].
// =====================================================

import type { WishTopic } from '../live/chatter';

export const GAME = {
  title: 'AVATAR LÊN TƯỜNG',
  subtitle: 'Comment một câu là vào hàng chờ',

  // ---------- Bắn ----------
  // 1 nhịp = lướt sang tường mới 2,5 giây (walk.ts) + đứng nhìn avatar
  shotEveryMs: 4200, // bình thường: đứng nhìn 1,7 giây rồi đi tiếp
  fastShotEveryMs: 3200, // hàng chờ đông (quá crowdAt người) hoặc đang "mưa sơn": đứng 0,7 giây
  crowdAt: 30,
  maxQueue: 500, // quá thì bỏ người không quà vào sau cùng
  maxSplats: 9, // số vệt sơn giữ trên tường, quá thì vệt cũ mờ đi
  splatColors: ['#7CFC3A', '#21D07A', '#2EE6D6', '#FF3FB4', '#FFB020', '#A66BFF'],
  // Câu MC lúc bắn (người thường chỉ đọc khi giọng đang rảnh, người có quà luôn đọc)
  // [cười] [hắng giọng] chỉ giọng Adam đọc ra cảm xúc, giọng Edge tự bỏ qua
  // Mỗi phát: tên khách + "lên tường nè", đổi giọng cảm xúc cho đỡ đều
  shotLines: [
    (n: string) => `[cười] ${n} lên tường nè!`,
    (n: string) => `^Ê! | ${n} lên tường nè!`,
    (n: string) => `Ối giời ơi, ${n} lên tường nè!`,
    (n: string) => `[cười] Ha ha, ${n} lên tường nè!`,
    (n: string) => `^Bộp! | ${n} lên tường nè!`,
    (n: string) => `Nào nào, ${n} lên tường nè!`,
  ],
  // Comment đông (từ busyComments câu trong busyWindowMs) thì cảm ơn chung, tối đa 1 lần / busyThanksEveryMs
  busyComments: 15,
  busyWindowMs: 30_000,
  busyThanksEveryMs: 90_000,
  busyThanks: [
    '[cười] Cảm ơn cả nhà comment sôi nổi quá, ai cũng sẽ được lên tường nha!',
    'Comment đông vui quá trời, cảm ơn cả nhà nha!',
    '^Đông vui quá! | Cảm ơn mọi người đã comment nha!',
  ],
  giftShotLines: [
    (n: string) => `^Tới lượt bạn ${n}! | Vệt sơn to nhất cho bạn luôn!`,
    (n: string) => `[cười] Đại gia ${n} lên tường! | Thank you bạn nha!`,
    (n: string) => `^Cả nhà vỗ tay cho bạn ${n} nào!`,
  ],
  // Quà: xu càng nhiều avatar càng to (px) và giữ trên tường càng lâu
  giftSize: (coins: number) => Math.min(700, 380 + 75 * Math.log10(Math.max(1, coins))),
  giftHoldMs: (coins: number) => Math.min(90_000, 20_000 + 15_000 * Math.log10(Math.max(1, coins))),
  // Bắn người có quà xong thì dừng thêm chút cho cả phòng kịp nhìn
  giftPauseMs: (coins: number) => Math.min(5000, 1000 + 1000 * Math.log10(Math.max(1, coins))),

  // Tên kênh mặc định, tới khi chủ kênh lưu tên ở trang điều khiển
  defaultChannelName: 'kênh mình',

  // Giọng MC mặc định khi chưa chọn ở trang điều khiển: 'M' = nam NamMinh, 'F' = nữ HoaiMy
  voice: 'M' as 'M' | 'F',
  // Giọng MC mặc định: 'Adam bựa' (VieNeu, cần bật VieNeu-TTS) hoặc '' = giọng Edge. Chọn lại ở trang điều khiển.
  vieneuVoice: 'Adam bựa',

  // Từ khóa trong comment để tham gia (so sánh không dấu, không hoa thường)
  joinKeywords: [] as string[], // trống = comment gì cũng vào hàng

  // Điểm
  pointsPerComment: 1,
  pointsPerCoin: 10, // 1 xu quà = 10 điểm

  // Thanh tim: đủ số tim này thì kích hoạt hiệu ứng
  likesPerBoost: 500,
  boostSeconds: 30, // mưa sơn: bắn nhanh trong 30 giây

  // ---------- Chào người vào ----------
  greetEveryMs: 6000, // gom người mới, 6 giây chào 1 lượt
  namesPerGreeting: 3, // 3 tên mỗi câu
  // more > 0: phòng đông, gộp "chào bạn A, bạn B, bạn C và 25 bạn nữa"
  greeting: (names: string, kenh: string, more = 0) =>
    more > 0 ? `${kenh} chào ${names} và ${more} bạn nữa vừa vào chơi.` : `${kenh} chào ${names} vừa vào chơi.`,

  // ---------- Cảm ơn quà ----------
  // Cùng 1 người tặng liên tục / combo: chỉ cảm ơn 1 lần mỗi 30 giây. Quà từ 99 xu luôn được cảm ơn.
  giftThanksCooldownMs: 30_000,
  bigGiftCoins: 99,
  thankGift: (name: string, gift: string, kenh: string) => `[cười] ${kenh} cảm ơn bạn ${name} tặng ${gift} nha! | Bạn được lên tường trước luôn.`,
  // Đọc thêm 1 câu chúc ngẫu nhiên sau lời cảm ơn quà ([] = không đọc)
  giftWishes: [
    'Chúc bạn một ngày thật vui.',
    'Chúc bạn làm gì cũng suôn sẻ nha.',
    'Chúc cả nhà bạn mạnh khỏe, bình an.',
    'Chúc bạn may mắn cả tuần luôn.',
  ],

  // ---------- Theo dõi kênh (mỗi người cảm ơn 1 lần) ----------
  thankFollow: (name: string, kenh: string) => `${kenh} cảm ơn bạn ${name} đã theo dõi kênh nha.`,

  // ---------- Comment có lời cầu chúc ----------
  // Ai comment kiểu "mong mai thi được điểm cao" thì đọc 1 câu chúc đúng chủ đề.
  // KHÔNG BAO GIỜ đọc nguyên văn comment. Mỗi người 1 lần / 10 phút, cả phòng tối đa 1 lần / 20 giây.
  wishPerUserMs: 10 * 60_000,
  wishGlobalMs: 20_000,
  wishReplies: {
    exam: [
      (name: string) => `Chúc bạn ${name} ôn bài vô đầu, vào phòng thi thật bình tĩnh, điểm cao như mong muốn.`,
      (name: string) => `Chúc bạn ${name} học đâu nhớ đó, thi đâu đậu đó.`,
    ],
    health: [
      (name: string) => `Chúc bạn ${name} với người nhà mau khỏe, ăn ngon ngủ yên.`,
      (name: string) => `Chúc nhà bạn ${name} ai cũng khỏe, người đang mệt thì sớm bình phục.`,
    ],
    love: [
      (name: string) => `Chúc bạn ${name} sớm gặp người thương mình thật lòng.`,
      (name: string) => `Chúc bạn ${name} chuyện tình cảm êm đẹp, thương ai người đó cũng thương lại.`,
    ],
    family: [
      (name: string) => `Chúc nhà bạn ${name} luôn êm ấm, cha mẹ khỏe, con cái ngoan.`,
      (name: string) => `Chúc gia đình bạn ${name} lúc nào cũng vui vẻ, thương nhau.`,
    ],
    work: [
      (name: string) => `Chúc bạn ${name} công việc thuận lợi, sớm được như ý.`,
      (name: string) => `Chúc bạn ${name} tìm được việc ưng ý, làm đâu thuận đó.`,
    ],
    wealth: [
      (name: string) => `Chúc bạn ${name} làm ăn phát đạt, buôn may bán đắt.`,
      (name: string) => `Chúc bạn ${name} tiền vô đều tay, nợ nần sớm xong.`,
    ],
    peace: [
      (name: string) => `Chúc bạn ${name} mọi chuyện bình an, thuận lợi.`,
      (name: string) => `Chúc bạn ${name} gặp nhiều may mắn, đi đâu cũng bình an.`,
    ],
  } as Record<WishTopic, ((name: string) => string)[]>,

  // ---------- Nhắc chia sẻ live ----------
  // Mỗi 5 phút; có người vừa tương tác thì cảm ơn tối đa 3 tên trước.
  shareReminderEveryMs: 10 * 60_000, // giảm tương tác: 10 phút nhắc 1 lần
  shareWithNames: (names: string, kenh: string) =>
    `${kenh} cảm ơn ${names} đã ghé chơi. Mọi người nhớ bấm chia sẻ live cho bạn bè cùng vào nha.`,
  shareLines: [
    'Mọi người thấy vui thì bấm chia sẻ live cho bạn bè cùng vào chơi nha.',
    'Thêm người là thêm vui, cả nhà bấm chia sẻ live giúp kênh nhé.',
  ],

  // ---------- Live im quá lâu ----------
  // Giọng im quá 90 giây thì đọc 1 câu cho đỡ trống.
  idleAfterMs: 90_000,
  idleLines: [
    'Ai mới vào cứ comment một câu là được xếp hàng lên tường nha.',
    'Cả nhà thả tim cho đầy thanh tim, đầy là có mưa sơn, lên tường nhanh gấp đôi.',
  ],

  boostLine: '^Đầy tim rồi! | Mưa sơn tới, lên tường nhanh gấp đôi luôn!',
};
