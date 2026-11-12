import { useEffect, useRef, useState } from 'react';
import { useLiveEvents } from '../live/useLiveEvents';
import type { GiftEvent, LiveStatus } from '../live/types';
import { voice, speakableName } from '../live/voice';
import { containsBanned } from '../live/bannedWords';
import { NameBatcher } from '../live/scoreboard';
import { detectWish, GiftThanker, makePicker, OncePerPerson, RecentPeople, WishLimiter } from '../live/chatter';
import { IS_STAGE } from '../live/page';
import { GAME } from './config';
import { enqueue, ordered, takeNext, type Queue } from './queue';
import { music, sfx } from './audio';

/** Cài đặt ở trang điều khiển (server nhớ trong settings.json, gửi lại khi trang mở) */
export interface Prefs {
  speed: 'cham' | 'vua' | 'nhanh';
  music: '1' | '0';
  musicVol: string; // 0..200 (%)
  sfxVol: string; // 0..100 (%)
  mc: string; // tên giọng VieNeu ('Adam bựa'), '' = giọng Edge
}
export const DEFAULT_PREFS: Prefs = { speed: 'vua', music: '1', musicVol: '100', sfxVol: '60', mc: GAME.vieneuVoice };
const SPEED = { cham: 1.6, vua: 1, nhanh: 0.6 };

const pick = makePicker();
voice.defaultWho = GAME.voice; // server gửi lại giọng đã chọn (setVoice) ngay khi trang nối vào
voice.vieneu = GAME.vieneuVoice;

// Bỏ dấu, thường hoá, bỏ khoảng trắng: "Tham Gia" -> "thamgia"
const compact = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]/g, '');

export interface Splat {
  id: number;
  x: number; // tâm vệt sơn trong khung 1080x1920
  y: number;
  rot: number;
  shape: number;
  color: string;
  name: string;
  avatar: string;
  coins: number; // > 0: người có quà, vệt to hơn + tem THANK YOU
  size: number; // cạnh vệt sơn (px)
  until: number; // người có quà: giữ trên tường tới lúc này, không bị vệt mới đẩy đi
}

const NORMAL_SIZE = 330;
/** Vệt của người có quà còn được giữ không */
export const isHeld = (s: Splat, now = Date.now()) => s.coins > 0 && now < s.until;

// Vùng tường để bắn (khung 1080x1920): chừa thanh trên, cạnh phải cho TikTok, phần dưới là sàn + súng
const WALL = { x0: 190, x1: 840, y0: 520, y1: 1100 };
let splatId = 0;

/** Chọn chỗ bắn: thử 10 điểm ngẫu nhiên, lấy điểm xa các vệt mới nhất nhất. */
function pickSpot(splats: Splat[], size: number) {
  const recent = splats.slice(-5);
  // vệt to thì thu vùng bắn vào giữa cho khỏi tràn khung
  const pad = size > NORMAL_SIZE ? (size - NORMAL_SIZE) / 2 + 90 : 0; // +90: chừa chỗ sticker tên + THANK YOU
  const W = { x0: WALL.x0 + pad, x1: Math.max(WALL.x0 + pad, WALL.x1 - pad), y0: WALL.y0 + pad * 0.5, y1: Math.max(WALL.y0 + pad * 0.5, WALL.y1 - pad) };
  let best = { x: 540, y: 800 };
  let bestD = -1;
  for (let i = 0; i < 10; i++) {
    const p = { x: W.x0 + Math.random() * (W.x1 - W.x0), y: W.y0 + Math.random() * (W.y1 - W.y0) };
    const d = Math.min(...recent.map((s) => Math.hypot(s.x - p.x, s.y - p.y)), 9999);
    if (d > bestD) [best, bestD] = [p, d];
  }
  return best;
}

/**
 * Luật chơi: comment = vào hàng chờ; quà = cộng xu, xu cao bắn trước; cứ vài giây súng bắn 1 người, avatar dính lên tường.
 * Tim đầy thanh = mưa sơn, bắn nhanh trong 30 giây.
 */
export function useGame() {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [queue, setQueue] = useState<Queue>([]);
  const [splats, setSplats] = useState<Splat[]>([]);
  const [shots, setShots] = useState(0); // tổng số phát đã bắn
  const [lastGift, setLastGift] = useState<GiftEvent | null>(null);
  const [likeProgress, setLikeProgress] = useState(0); // 0..likesPerBoost
  const [boostUntil, setBoostUntil] = useState(0);
  const [voiceWho, setVoiceWho] = useState(voice.defaultWho);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const likeBase = useRef<number | null>(null);
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const pauseMs = useRef(0); // thêm thời gian chờ sau phát bắn người có quà
  const lastQueueLine = useRef(0);

  const [channelName, setChannelName] = useState(GAME.defaultChannelName);
  const kenh = useRef(channelName);
  kenh.current = channelName;

  const [talk] = useState(() => ({
    greeter: new NameBatcher(
      GAME.greetEveryMs,
      GAME.namesPerGreeting,
      (names, more) => voice.say(GAME.greeting(joinNames(names, more > 0), kenh.current, more)),
      () => voice.waiting >= 2,
    ),
    gifts: new GiftThanker(GAME.giftThanksCooldownMs, GAME.bigGiftCoins),
    follows: new OncePerPerson(),
    wishes: new WishLimiter(GAME.wishPerUserMs, GAME.wishGlobalMs),
    recent: new RecentPeople(),
  }));

  const safeName = (nickname: string, username: string) => (containsBanned(nickname) ? username : nickname);

  useLiveEvents({
    onStatus: setStatus,

    onChat: (e) => {
      const name = safeName(e.nickname, e.username);
      talk.recent.note(e.username, speakableName(name));

      const topic = containsBanned(e.comment) ? null : detectWish(e.comment);
      const reply = topic && pick(GAME.wishReplies[topic] ?? []);
      if (reply && talk.wishes.allow(e.username)) voice.say(reply(speakableName(name)));

      // Comment bậy thì không cho lên tường lần này
      if (containsBanned(e.comment)) return;
      if (GAME.joinKeywords.length && !GAME.joinKeywords.some((k) => compact(e.comment).includes(k))) return;
      const isNew = !queueRef.current.some((x) => x.username === e.username);
      setQueue((q) => enqueue(q, { ...e, nickname: name }, 0, GAME.maxQueue));
      // Gọi tên người mới vào hàng, thưa thôi, chỉ khi MC đang rảnh
      const spoken = speakableName(name);
      if (isNew && spoken !== 'bạn' && voice.waiting === 0 && Date.now() - lastQueueLine.current > GAME.queueLineEveryMs) {
        lastQueueLine.current = Date.now();
        voice.say(GAME.queueLine(spoken, queueRef.current.length));
      }
    },

    onGift: (e) => {
      const name = safeName(e.nickname, e.username);
      const coins = e.diamondCount * e.repeatCount;
      setQueue((q) => enqueue(q, { ...e, nickname: name }, coins, GAME.maxQueue));
      setLastGift({ ...e, nickname: name });
      sfx.play('qua');
      talk.recent.note(e.username, speakableName(name));

      if (talk.gifts.shouldThank(e.username, coins, voice.waitingPriority)) {
        voice.say(GAME.thankGift(speakableName(name), e.giftName, kenh.current), true);
        const wish = pick(GAME.giftWishes);
        if (wish) voice.say(wish, true);
      }
    },

    onMember: (e) => {
      const spoken = speakableName(safeName(e.nickname, e.username));
      if (spoken !== 'bạn') talk.greeter.add(e.username, spoken);
    },

    onFollow: (e) => {
      const name = safeName(e.nickname, e.username);
      if (talk.follows.first(e.username)) voice.say(GAME.thankFollow(speakableName(name), kenh.current));
    },

    onLike: (e) => {
      if (likeBase.current === null) likeBase.current = e.totalLikes - e.likeCount;
      const since = e.totalLikes - likeBase.current;
      if (since >= GAME.likesPerBoost) {
        likeBase.current += GAME.likesPerBoost;
        setBoostUntil(Date.now() + GAME.boostSeconds * 1000);
        voice.say(GAME.boostLine, true);
        sfx.play('muason');
      }
      setLikeProgress(Math.max(0, e.totalLikes - likeBase.current));
    },

    onControl: (c) => {
      if (c.action === 'setName' && c.text) setChannelName(c.text);
      if (c.action === 'setPrefs' && c.text) {
        try {
          const p = { ...DEFAULT_PREFS, ...JSON.parse(c.text) } as Prefs;
          setPrefs(p);
          music.on = p.music === '1';
          music.level = Number(p.musicVol) / 100 || 0;
          sfx.volume = Number(p.sfxVol) / 100 || 0;
          voice.vieneu = p.mc;
        } catch {
          // sai dạng: giữ cài đặt cũ
        }
      }
      if (c.action === 'setVoice' && (c.text === 'M' || c.text === 'F')) {
        voice.defaultWho = c.text;
        setVoiceWho(c.text);
      }
      // Ẩn/xoá 1 người khỏi hàng chờ và tường (lệnh custom "xoa:<username>")
      if (c.action === 'custom' && c.text?.startsWith('xoa:')) {
        const u = c.text.slice(4).trim();
        setQueue((q) => q.filter((x) => x.username !== u && x.nickname !== u));
        setSplats((s) => s.filter((x) => x.name !== u));
      }
      if (c.action === 'reset') {
        setQueue([]);
        setSplats([]);
        setShots(0);
      }
      if (!IS_STAGE) return;
      if (c.action === 'speak' && c.text) voice.say(c.text, true);
      if (c.action === 'setRate' && c.text) voice.rate = Number(c.text) || 1;
      if (c.action === 'reset') {
        voice.stop();
        talk.greeter.reset();
        talk.gifts.reset();
        talk.follows.reset();
        talk.wishes.reset();
        talk.recent.reset();
      }
    },
  });

  const boosting = Date.now() < boostUntil;

  // Súng: cứ vài giây bắn người đứng đầu hàng
  useEffect(() => {
    const fast = boosting || queue.length > GAME.crowdAt;
    const t = setTimeout(
      () => {
        const [who, rest] = takeNext(queueRef.current);
        if (!who) return;
        setQueue(rest);
        setShots((n) => n + 1);
        sfx.play('ban');
        setTimeout(() => sfx.play('splat'), 230);
        if (who.coins > 0) setTimeout(() => sfx.play('splat'), 780); // sticker THANK YOU dính lên
        const size = who.coins > 0 ? GAME.giftSize(who.coins) : NORMAL_SIZE;
        pauseMs.current = who.coins > 0 ? GAME.giftPauseMs(who.coins) : 0;
        setSplats((s) => {
          const spot = pickSpot(s, size);
          const splat: Splat = {
            id: ++splatId,
            ...spot,
            rot: Math.random() * 50 - 25,
            shape: Math.floor(Math.random() * 3),
            color: pick(GAME.splatColors) ?? '#7CFC3A',
            name: who.nickname,
            avatar: who.avatar,
            coins: who.coins,
            size,
            until: Date.now() + (who.coins > 0 ? GAME.giftHoldMs(who.coins) : 0),
          };
          // Quá trần thì bỏ vệt cũ nhất, trừ vệt người có quà còn đang được giữ
          const next = [...s, splat];
          while (next.length > GAME.maxSplats) {
            const i = next.findIndex((x) => !isHeld(x));
            if (i < 0 || i === next.length - 1) break;
            next.splice(i, 1);
          }
          return next;
        });
        const spoken = speakableName(who.nickname);
        if (who.coins > 0) voice.say(pick(GAME.giftShotLines)!(spoken), true);
        else if (voice.waiting === 0 && spoken !== 'bạn') voice.say(pick(GAME.shotLines)!(spoken));
      },
      (fast ? GAME.fastShotEveryMs : GAME.shotEveryMs) * SPEED[prefs.speed] + pauseMs.current,
    );
    return () => clearTimeout(t);
  }, [shots, queue.length > 0, boosting, queue.length > GAME.crowdAt, prefs.speed]);

  useEffect(() => {
    if (!IS_STAGE) return;
    music.start();
    sfx.load();
    const timers: ReturnType<typeof setInterval>[] = [];
    if (GAME.shareReminderEveryMs > 0) {
      timers.push(
        setInterval(() => {
          const names = talk.recent.latest(3, GAME.shareReminderEveryMs);
          const line = names.length ? GAME.shareWithNames(joinNames(names), kenh.current) : pick(GAME.shareLines);
          if (line) voice.say(line);
        }, GAME.shareReminderEveryMs),
      );
    }
    if (GAME.idleAfterMs > 0) {
      timers.push(
        setInterval(() => {
          if (voice.quietForMs() < GAME.idleAfterMs) return;
          const line = pick(GAME.idleLines);
          if (line) voice.say(line);
        }, 15_000),
      );
    }
    return () => timers.forEach(clearInterval);
  }, []);

  useEffect(() => {
    if (!lastGift) return;
    const t = setTimeout(() => setLastGift(null), 5000);
    return () => clearTimeout(t);
  }, [lastGift]);

  const [, force] = useState(0);
  useEffect(() => {
    if (!boostUntil) return;
    const t = setTimeout(() => force((x) => x + 1), boostUntil - Date.now() + 50);
    return () => clearTimeout(t);
  }, [boostUntil]);

  return {
    status,
    channelName,
    voiceWho,
    prefs,
    queue: ordered(queue),
    splats,
    shots,
    lastGift,
    likeProgress,
    boosting,
  };
}

export type GameState = ReturnType<typeof useGame>;

function joinNames(names: string[], commasOnly = false) {
  const spoken = names.map((n) => (n === 'bạn' ? n : `bạn ${n}`));
  if (commasOnly) return spoken.join(', ');
  return spoken.length > 1 ? `${spoken.slice(0, -1).join(', ')} và ${spoken[spoken.length - 1]}` : spoken[0] ?? '';
}
