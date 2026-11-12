import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { isHeld, type GameState, type Splat } from "./useGame";
import { GAME } from "./config";

// Ảnh chủ kênh làm, bỏ vào public/assets/anh/. Chưa có thì dùng hình vẽ tạm.
const IMG = { wall: "/assets/anh/tuong.jpg", gun: "/assets/anh/sung.png" };
const MUZZLE = { x: 542, y: 1010 }; // đầu nòng súng trong khung 1080x1920

import { TILE, WALK, toWall } from "./walk";

const GUN_TOP = 1920 - 944; // mép trên khung súng
const ball = (c: string) => `radial-gradient(circle at 35% 30%, #fff 0 12%, ${c} 40%, color-mix(in srgb, ${c} 60%, #000) 100%)`;
const GO = WALK.moveMs / 1000; // giây lướt sang tường mới, viên sơn bay sau khi tới nơi
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

export function GameStage({ game }: { game: GameState }) {
  const likePct = Math.min(100, (game.likeProgress / GAME.likesPerBoost) * 100);
  const last = game.splats[game.splats.length - 1];
  const next = game.queue.slice(0, 4);
  const world = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const gun = useRef<HTMLDivElement>(null);
  const muzzle = toWall(MUZZLE.x, MUZZLE.y, game.shots); // đầu nòng nhìn từ tường mới
  const cam = useRef({ from: 0, to: 0, start: 0, now: 0 });

  // Mỗi phát mới: lướt từ chỗ đang đứng sang tường mới
  useEffect(() => {
    const c = cam.current;
    cam.current = { from: c.now, to: game.shots * TILE, start: performance.now(), now: c.now };
  }, [game.shots]);

  // 1 vòng rAF đổi transform trực tiếp, không render lại React
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const t = performance.now();
      const c = cam.current;
      const p = Math.min(1, (t - c.start) / WALK.moveMs);
      const sc = (c.now = c.from + (c.to - c.from) * ease(p));
      const step = p < 1 ? Math.abs(Math.sin((Math.PI * (t - c.start)) / WALK.stepMs)) * Math.sin(Math.PI * p) : 0; // bước đều, êm lúc bắt đầu/dừng
      if (world.current) world.current.style.transform = `translateY(${-WALK.bob * step}px) scale(${WALK.zoom})`;
      if (strip.current) strip.current.style.transform = `translateX(${-(sc % (2 * TILE))}px)`;
      if (layer.current) layer.current.style.transform = `translateX(${-sc}px)`;
      // súng nhún rất nhẹ theo bước chân
      if (gun.current) gun.current.style.transform = `translateY(${step * 5}px) rotate(${step * 0.5}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${game.boosting ? "stage-boost" : ""}`}
    >
      <div ref={world} className="absolute inset-0 will-change-transform">
        {/* 3 tấm tường nối nhau (giữa lật gương), trôi trái rồi quay vòng 2 tấm */}
        <div ref={strip} className="absolute inset-y-0 left-0 w-[3240px] will-change-transform">
          {[0, 1, 2].map((i) => (
            <div key={i} className="absolute inset-y-0 w-[1080px]" style={{ left: i * TILE, transform: i === 1 ? "scaleX(-1)" : undefined }}>
              <Picture src={IMG.wall} className="absolute inset-0 h-full w-full object-cover" fallback={<WallFallback />} />
            </div>
          ))}
        </div>

        <div ref={layer} className="absolute inset-0 will-change-transform">

        {/* Vệt sơn trên tường */}
        {game.splats.map((s, i) => (
          <SplatView
            key={s.id}
            s={s}
            fresh={s === last}
            faded={i < game.splats.length - 6 && !isHeld(s)}
          />
        ))}

        {/* Vệt sơn bay theo viên đạn */}
        <AnimatePresence>
          {last && (
            <motion.div
              key={`trail${last.id}`}
              className="absolute left-0 top-0 h-6 origin-left rounded-full"
              style={{
                width: Math.hypot(last.x - muzzle.x, last.y - muzzle.y),
                rotate: `${(Math.atan2(last.y - muzzle.y, last.x - muzzle.x) * 180) / Math.PI}deg`,
                x: muzzle.x,
                y: muzzle.y - 12,
                background: `linear-gradient(90deg, transparent, ${last.color})`,
              }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: [0, 1, 1], opacity: [0.9, 0.7, 0] }}
              transition={{ duration: 0.4, times: [0, 0.6, 1], delay: GO }}
            />
          )}
        </AnimatePresence>

        {/* Viên sơn bay từ nòng tới tường */}
        <AnimatePresence>
          {last && (
            <motion.div
              key={last.id}
              className="absolute left-0 top-0 h-16 w-16 rounded-full"
              style={{
                background: last.color,
                boxShadow: `0 0 30px ${last.color}`,
              }}
              initial={{
                x: muzzle.x - 32,
                y: muzzle.y - 32,
                scale: 1.4,
                opacity: 0,
              }}
              animate={{
                x: last.x - 32,
                y: last.y - 32,
                scale: 0.6,
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 0.25, ease: "easeIn", delay: GO }}
            />
          )}
        </AnimatePresence>
        {/* Đầu nòng phụt sơn: chớp sáng + giọt sơn văng + khói hơi */}
        {last && <MuzzleBurst key={`m${last.id}`} x={muzzle.x} y={muzzle.y} color={last.color} toward={Math.atan2(last.y - muzzle.y, last.x - muzzle.x)} />}

        </div>

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
      </div>

      {/* Súng: nhún nhẹ khi bước, giật nhẹ khi bắn */}
      <div ref={gun} className="absolute inset-0 will-change-transform">
        <motion.div
          key={game.shots}
          className="absolute bottom-0 left-0 h-[944px] w-[600px] origin-bottom-left"
          initial={false}
          animate={{ y: [0, 14, 0], rotate: [0, -1, 0] }}
          transition={{ duration: 0.22, times: [0, 0.25, 1], delay: GO }}
        >
          <Picture
            src={IMG.gun}
            className="h-full w-full object-contain object-left-bottom"
            fallback={<GunFallback />}
          />
          {/* Viên sơn nạp sẵn ở đầu nòng: bắn đi (sau khi tới tường) rồi nạp viên mới ngay */}
          {last && (
            <motion.div
              key={`a${game.shots}`}
              className="absolute h-14 w-14 rounded-full"
              style={{ left: MUZZLE.x - 28, top: MUZZLE.y - GUN_TOP - 28, background: ball(last.color) }}
              initial={false}
              animate={{ scale: [1, 1, 0] }}
              transition={{ duration: 0.05, delay: GO }}
            />
          )}
          <motion.div
            key={`b${game.shots}`}
            className="absolute h-14 w-14 rounded-full"
            style={{ left: MUZZLE.x - 28, top: MUZZLE.y - GUN_TOP - 28, background: ball(game.ammoColor) }}
            initial={{ scale: last ? 0 : 1 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 600, damping: 15, delay: last ? GO + 0.15 : 0 }}
          />
        </motion.div>
      </div>

      {/* Thanh tim (trái trên) */}
      <div className="absolute left-10 top-[150px] flex w-[430px] items-center gap-3 rounded-full bg-slate-900/70 px-5 py-4">
        <span className="text-[40px] leading-none">❤️</span>
        <div className="h-6 flex-1 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-pink-500 transition-[width] duration-500"
            style={{ width: `${likePct}%` }}
          />
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
                className={`h-[88px] w-[88px] border-4 ${p.coins > 0 ? "border-amber-400" : "border-white/80"}`}
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
            {game.lastGift.nickname} tặng {game.lastGift.repeatCount} ×{" "}
            {game.lastGift.giftName}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 3 hình vệt sơn (viewBox 200x200), vẽ tay bằng đường cong
const SPLAT_PATHS = [
  "M100 18c14 0 18 16 30 18s26-14 36 0-6 26 2 36 30 4 28 22-24 14-26 28 14 30-2 40-26-6-38 4-6 30-26 30-18-22-32-24-26 16-36 4 6-24-4-36-30-6-28-24 22-14 22-28-18-24-6-36 26 4 36-6 16-28 32-28z",
  "M98 12c10 4 6 26 20 30s24-20 38-10-2 30 10 40 34-2 32 18-28 8-28 24 22 28 6 38-24-10-36 0 0 32-20 34-14-26-30-26-30 20-40 6 14-26 2-36-36 2-34-18 28-12 26-28-24-22-10-34 28 8 38-2 10-38 24-36z",
  "M104 22c18-2 16 20 30 24s30-10 34 6-16 22-8 34 32 10 26 28-30 4-34 18 18 32 0 38-22-14-36-6-10 30-28 26-6-28-20-32-30 14-38-2 16-22 6-34-34-8-28-26 30-6 30-22-24-26-8-36 26 12 38 2 6-34 24-36z",
];

/** Hiệu ứng đầu nòng lúc bắn (sau khi camera tới nơi) */
function MuzzleBurst({ x, y, color, toward }: { x: number; y: number; color: string; toward: number }) {
  const drops = [-0.5, -0.3, -0.12, 0, 0.15, 0.32, 0.5, 0.2];
  return (
    <div className="pointer-events-none absolute left-0 top-0" style={{ transform: `translate(${x}px, ${y}px)` }}>
      {/* chớp sáng */}
      <motion.div
        className="absolute -left-20 -top-20 h-40 w-40 rounded-full"
        style={{ background: `radial-gradient(circle, #fff 0%, ${color} 35%, transparent 70%)` }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0.3, 1.5, 1.8], opacity: [1, 0.8, 0] }}
        transition={{ duration: 0.28, delay: GO }}
      />
      {/* khói hơi nén */}
      <motion.div
        className="absolute -left-24 -top-24 h-48 w-48 rounded-full bg-white/50 blur-xl"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0.4, 1.6], opacity: [0.6, 0], x: [0, Math.cos(toward) * 60], y: [0, Math.sin(toward) * 60 - 30] }}
        transition={{ duration: 0.7, delay: GO + 0.03, ease: "easeOut" }}
      />
      {/* giọt sơn văng hình nón theo hướng bắn */}
      {drops.map((a, i) => {
        const ang = toward + a;
        const dist = 90 + (i % 3) * 45;
        return (
          <motion.div
            key={i}
            className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full"
            style={{ background: color }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ x: [0, Math.cos(ang) * dist], y: [0, Math.sin(ang) * dist + 40], scale: [1.2, 0.4], opacity: [1, 0] }}
            transition={{ duration: 0.45, delay: GO, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

function SplatView({
  s,
  fresh,
  faded,
}: {
  s: Splat;
  fresh: boolean;
  faded: boolean;
}) {
  const { size } = s;
  const font = Math.round(size / 11); // chữ to theo vệt
  return (
    <motion.div
      className="absolute"
      style={{
        left: s.x - size / 2,
        top: s.y - size / 2,
        width: size,
        height: size,
        zIndex: s.coins > 0 ? 2 + Math.round(size / 100) : 1,
      }}
      initial={fresh ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: faded ? 0.35 : 1 }}
      transition={
        fresh
          ? { delay: GO + 0.22, type: "spring", stiffness: 420, damping: 14 }
          : { duration: 0.6 }
      }
    >
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full"
        style={{ transform: `rotate(${s.rot}deg)` }}
      >
        <path d={SPLAT_PATHS[s.shape]} fill={s.color} />
        <circle cx="30" cy="150" r="7" fill={s.color} />
        <circle cx="172" cy="40" r="5" fill={s.color} />
        <circle cx="160" cy="176" r="4" fill={s.color} />
      </svg>
      <Avatar
        src={s.avatar}
        name={s.name}
        className={`absolute left-1/2 top-1/2 h-[56%] w-[56%] -translate-x-1/2 -translate-y-1/2 border-[6px] ${s.coins > 0 ? "border-amber-300" : "border-black/30"}`}
      />
      {/* Sticker tên, người có quà có thêm sticker THANK YOU bắn dính bên cạnh */}
      <div className="absolute left-1/2 top-[76%] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap">
        <div
          className="-rotate-3 truncate rounded-lg bg-black px-4 py-1 font-extrabold text-white"
          style={{
            fontSize: Math.max(30, font * 0.9),
            maxWidth: Math.max(300, size * 0.75),
          }}
        >
          {s.name}
        </div>
        {s.coins > 0 && (
          <motion.div
            className="rotate-[8deg] rounded-xl border-4 border-emerald-100 bg-emerald-500 px-3 py-0.5 font-black tracking-wide text-white shadow-lg"
            style={{ fontSize: Math.max(32, font * 0.85) }}
            initial={fresh ? { scale: 2.6, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: fresh ? GO + 0.75 : 0,
              type: "spring",
              stiffness: 500,
              damping: 16,
            }}
          >
            THANK YOU
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function Avatar({
  src,
  name,
  className,
}: {
  src: string;
  name: string;
  className: string;
}) {
  const [bad, setBad] = useState(false);
  if (!src || bad)
    return (
      <div
        className={`${className} flex items-center justify-center rounded-full bg-slate-700 text-[40px] font-extrabold text-white`}
      >
        {[...name][0]?.toUpperCase() ?? "?"}
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
function Picture({
  src,
  className,
  fallback,
}: {
  src: string;
  className: string;
  fallback: React.ReactNode;
}) {
  const [bad, setBad] = useState(false);
  if (bad) return <>{fallback}</>;
  return (
    <img
      src={src}
      className={className}
      onError={() => setBad(true)}
      draggable={false}
    />
  );
}

function WallFallback() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-sky-500 to-sky-300" />
      <div
        className="absolute inset-x-0 top-[420px] h-[860px] bg-stone-400"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(0,0,0,.12) 2px, transparent 2px), linear-gradient(rgba(0,0,0,.08) 2px, transparent 2px)",
          backgroundSize: "216px 100%, 100% 215px",
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
        <circle
          cx="285"
          cy="470"
          r="48"
          fill="#7cfc3a"
          stroke="#1b1b26"
          strokeWidth="10"
        />
        <rect x="230" y="640" width="110" height="200" rx="30" fill="#ff3fb4" />
      </g>
    </svg>
  );
}
