// Hàng chờ bắn. Hàm thuần (không React) để dễ test.
// Luật: comment = vào cuối hàng. Tặng quà = cộng xu, xu cao bắn trước; bằng xu thì ai vào hàng trước bắn trước.
// Bắn xong thì ra khỏi hàng, xu ưu tiên cũng hết; muốn lên lại thì comment tiếp.

export interface QueueEntry {
  username: string;
  nickname: string;
  avatar: string;
  coins: number; // xu đã tặng từ lúc vào hàng
  at: number; // thứ tự vào hàng
}

export type Queue = QueueEntry[];

let seq = 0;

export function enqueue(q: Queue, p: { username: string; nickname: string; avatar?: string }, coins = 0, max = 500): Queue {
  const i = q.findIndex((e) => e.username === p.username);
  if (i >= 0) {
    if (!coins) return q; // đang chờ rồi, comment thêm không đổi gì
    const e = q[i];
    return q.map((x, j) => (j === i ? { ...e, coins: e.coins + coins, avatar: p.avatar || e.avatar } : x));
  }
  const next = [...q, { username: p.username, nickname: p.nickname, avatar: p.avatar || '', coins, at: ++seq }];
  if (next.length <= max) return next;
  // Quá đông: bỏ người không quà vào sau cùng (người có quà không bao giờ bị bỏ)
  const drop = next.map((e, j) => [e, j] as const).reverse().find(([e]) => e.coins === 0);
  return drop ? next.filter((_, j) => j !== drop[1]) : next;
}

/** Thứ tự bắn: xu cao trước, bằng xu thì vào trước. */
export function ordered(q: Queue): Queue {
  return [...q].sort((a, b) => b.coins - a.coins || a.at - b.at);
}

/** Lấy người bắn kế tiếp. */
export function takeNext(q: Queue): [QueueEntry | null, Queue] {
  if (!q.length) return [null, q];
  const first = ordered(q)[0];
  return [first, q.filter((e) => e !== first)];
}
