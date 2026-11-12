import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { isHeld, type GameState, type Splat } from './useGame';
import { GAME } from './config';

// Ảnh chủ kênh làm, bỏ vào public/assets/anh/. Chưa có thì dùng hình vẽ tạm.
const IMG = { wall: '/assets/anh/tuong.jpg', gun: '/assets/anh/sung.png' };
const MUZZLE = { x: 542, y: 1010 }; // đầu nòng súng trong khung 1080x1920

export function GameStage({ game }: { game: GameState }) {
  const likePct = Math.min(100, (game.likeProgress / GAME.likesPerBoost) * 100);
  const last = game.splats[game.splats.length - 1];
  const aim = last ? Math.max(-14, Math.min(14, (last.x - MUZZLE.x) / 30)) : 0;
  const next = game.queue.slice(0, 4);

  return (
    <div className={`relative h-full w-full overflow-hidden ${game.boosting ? 'stage-boost' : ''}`}>
      <Picture src={IMG.wall} className="absolute inset-0 h-full w-full object-cover" fallback={<WallFallback />} />

      {/* Vệt sơn trên tường */}
      {game.splats.map((s, i) => (
        <SplatView key={s.id} s={s} fresh={s === last} faded={i < game.splats.length - 6 && !isHeld(s)} />
      ))}

      {/* Viên sơn bay từ nòng tới tường */}
      <AnimatePresence>
        {last && (
          <motion.div
            key={last.id}
            className="absolute left-0 top-0 h-16 w-16 rounded-full"
            style={{ background: last.color, boxShadow: `0 0 30px ${last.color}` }}
            initial={{ x: MUZZLE.x - 32, y: MUZZLE.y - 32, scale: 1.4, opacity: 1 }}
            animate={{ x: last.x - 32, y: last.y - 32, scale: 0.6, opacity: [1, 1, 0] }}
            transition={{ duration: 0.25, ease: 'easeIn' }}
          />
        )}
      </AnimatePresence>

      {/* Chưa ai trong hàng, tường trống */}
      {game.queue.length === 0 && game.splats.length === 0 && (
        <div className="absolute inset-x-0 top-[720px] text-center">
          <div className="inline-block -rotate-3 rounded-3xl bg-black/70 px-12 py-8 text-[60px] font-extrabold leading-tight text-white">
            Comment 1 câu
            <br />
            <span className="text-lime-300">avatar bạn lên tường!</span>
          </div>
        </div>
      )}

      {/* Súng */}
      <motion.div
        key={game.shots}
        className="absolute bottom-0 left-0 h-[944px] w-[600px] origin-bottom-left"
        initial={{ y: 40, rotate: aim - 3 }}
        animate={{ y: 0, rotate: aim }}
        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      >
        <Picture src={IMG.gun} className="h-full w-full object-contain object-left-bottom" fallback={<GunFallback />} />
      </motion.div>

      {/* Thanh tim (trái trên) */}
      <div className="absolute left-10 top-[150px] flex w-[430px] items-center gap-3 rounded-full bg-slate-900/70 px-5 py-4">
        <span className="text-[40px] leading-none">❤️</span>
        <div className="h-6 flex-1 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-pink-500 transition-[width] duration-500" style={{ width: `${likePct}%` }} />
        </div>
      </div>
      {game.boosting && (
        <div className="absolute left-10 top-[240px] rounded-full bg-pink-500 px-6 py-2 text-[34px] font-extrabold text-white">
          MƯA SƠN x2
        </div>
      )}

      {/* Hàng chờ (phải trên): 4 người kế tiếp + số người còn lại */}
      <div className="absolute right-[110px] top-[140px] flex items-center gap-3">
        <AnimatePresence initial={false}>
          {next.map((p) => (
            <motion.div
              key={p.username}
              layout
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="relative"
            >
              <Avatar
                src={p.avatar}
                name={p.nickname}
                className={`h-[88px] w-[88px] border-4 ${p.coins > 0 ? 'border-amber-400' : 'border-white/80'}`}
              />
              {p.coins > 0 && (
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 text-[22px] font-extrabold text-black">
                  {p.coins}
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {game.queue.length > next.length && (
          <div className="rounded-full bg-slate-900/80 px-4 py-3 text-[32px] font-bold text-white">
            +{game.queue.length - next.length}
          </div>
        )}
      </div>

      {/* Lời nhắc luật */}
      <div className="absolute left-10 top-[300px] rounded-2xl bg-black/55 px-6 py-3 text-[32px] font-semibold text-white">
        💬 {GAME.subtitle}
      </div>

      {/* Banner quà */}
      <AnimatePresence>
        {game.lastGift && (
          <motion.div
            key={game.lastGift.timestamp}
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute left-1/2 top-[390px] -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-10 py-4 text-[38px] font-extrabold text-white shadow-2xl"
          >
            {game.lastGift.nickname} tặng {game.lastGift.repeatCount} × {game.lastGift.giftName}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 3 hình vệt sơn (viewBox 200x200), vẽ tay bằng đường cong
const SPLAT_PATHS = [
  'M100 18c14 0 18 16 30 18s26-14 36 0-6 26 2 36 30 4 28 22-24 14-26 28 14 30-2 40-26-6-38 4-6 30-26 30-18-22-32-24-26 16-36 4 6-24-4-36-30-6-28-24 22-14 22-28-18-24-6-36 26 4 36-6 16-28 32-28z',
  'M98 12c10 4 6 26 20 30s24-20 38-10-2 30 10 40 34-2 32 18-28 8-28 24 22 28 6 38-24-10-36 0 0 32-20 34-14-26-30-26-30 20-40 6 14-26 2-36-36 2-34-18 28-12 26-28-24-22-10-34 28 8 38-2 10-38 24-36z',
  'M104 22c18-2 16 20 30 24s30-10 34 6-16 22-8 34 32 10 26 28-30 4-34 18 18 32 0 38-22-14-36-6-10 30-28 26-6-28-20-32-30 14-38-2 16-22 6-34-34-8-28-26 30-6 30-22-24-26-8-36 26 12 38 2 6-34 24-36z',
];

function SplatView({ s, fresh, faded }: { s: Splat; fresh: boolean; faded: boolean }) {
  const { size } = s;
  const font = Math.round(size / 11); // chữ to theo vệt
  return (
    <motion.div
      className="absolute"
      style={{ left: s.x - size / 2, top: s.y - size / 2, width: size, height: size, zIndex: s.coins > 0 ? 2 + Math.round(size / 100) : 1 }}
      initial={fresh ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: faded ? 0.35 : 1 }}
      transition={fresh ? { delay: 0.22, type: 'spring', stiffness: 420, damping: 14 } : { duration: 0.6 }}
    >
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" style={{ transform: `rotate(${s.rot}deg)` }}>
        <path d={SPLAT_PATHS[s.shape]} fill={s.color} />
        <circle cx="30" cy="150" r="7" fill={s.color} />
        <circle cx="172" cy="40" r="5" fill={s.color} />
        <circle cx="160" cy="176" r="4" fill={s.color} />
      </svg>
      <Avatar
        src={s.avatar}
        name={s.name}
        className={`absolute left-1/2 top-1/2 h-[56%] w-[56%] -translate-x-1/2 -translate-y-1/2 border-[6px] ${s.coins > 0 ? 'border-amber-300' : 'border-black/30'}`}
      />
      {/* Sticker tên, người có quà có thêm sticker THANK YOU bắn dính bên cạnh */}
      <div className="absolute left-1/2 top-[76%] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap">
        <div
          className="-rotate-3 truncate rounded-lg bg-black px-4 py-1 font-extrabold text-white"
          style={{ fontSize: Math.max(30, font * 0.9), maxWidth: Math.max(300, size * 0.75) }}
        >
          {s.name}
        </div>
        {s.coins > 0 && (
          <motion.div
            className="rotate-[8deg] rounded-xl border-4 border-emerald-100 bg-emerald-500 px-3 py-0.5 font-black tracking-wide text-white shadow-lg"
            style={{ fontSize: Math.max(32, font * 0.85) }}
            initial={fresh ? { scale: 2.6, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: fresh ? 0.75 : 0, type: 'spring', stiffness: 500, damping: 16 }}
          >
            THANK YOU
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function Avatar({ src, name, className }: { src: string; name: string; className: string }) {
  const [bad, setBad] = useState(false);
  if (!src || bad)
    return (
      <div className={`${className} flex items-center justify-center rounded-full bg-slate-700 text-[40px] font-extrabold text-white`}>
        {[...name][0]?.toUpperCase() ?? '?'}
      </div>
    );
  return (
    <img
      src={src}
      className={`${className} rounded-full object-cover`}
      referrerPolicy="no-referrer"
      onError={() => setBad(true)}
    />
  );
}

/** Ảnh có sẵn thì hiện, chưa có (404) thì hiện hình tạm. */
function Picture({ src, className, fallback }: { src: string; className: string; fallback: React.ReactNode }) {
  const [bad, setBad] = useState(false);
  if (bad) return <>{fallback}</>;
  return <img src={src} className={className} onError={() => setBad(true)} draggable={false} />;
}

function WallFallback() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-sky-500 to-sky-300" />
      <div
        className="absolute inset-x-0 top-[420px] h-[860px] bg-stone-400"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(0,0,0,.12) 2px, transparent 2px), linear-gradient(rgba(0,0,0,.08) 2px, transparent 2px)',
          backgroundSize: '216px 100%, 100% 215px',
        }}
      />
      <div className="absolute inset-x-0 bottom-0 top-[1280px] bg-gradient-to-b from-stone-600 to-stone-800" />
    </div>
  );
}

function GunFallback() {
  return (
    <svg viewBox="0 0 640 820" className="h-full w-full">
      <g transform="rotate(-38 320 600)">
        <rect x="250" y="250" width="70" height="300" rx="20" fill="#2b2b38" />
        <rect x="235" y="230" width="100" height="40" rx="12" fill="#ff3fb4" />
        <rect x="200" y="420" width="170" height="300" rx="40" fill="#3b3b4f" />
        <circle cx="285" cy="470" r="48" fill="#7cfc3a" stroke="#1b1b26" strokeWidth="10" />
        <rect x="230" y="640" width="110" height="200" rx="30" fill="#ff3fb4" />
      </g>
    </svg>
  );
}
