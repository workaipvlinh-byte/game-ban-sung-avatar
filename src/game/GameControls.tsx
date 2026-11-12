import { useState, type ReactNode } from 'react';
import { emitTest, sendControl } from '../live/page';
import type { Prefs } from './useGame';

// Cài đặt + nút thử riêng của game Bắn Sơn (trang điều khiển)
const NAMES = ['Lan Anh', 'Minh Tuấn', 'Bé Na 🌸', 'Hoàng Long', 'Thu Trang', 'Quốc Bảo', 'duyanh99', 'Ngọc Hân', 'Gia Huy', 'Khánh Linh', 'Mai Phương', 'Tuấn Kiệt'];
let n = 0;
const someone = () => {
  const i = n++;
  return { nickname: NAMES[i % NAMES.length], username: `khach${i}`, avatar: `https://i.pravatar.cc/150?u=khach${i}` };
};
const chat = () => emitTest('chat', { ...someone(), comment: 'bắn em đi' });
const gift = (diamondCount: number, giftName: string) => emitTest('gift', { ...someone(), giftName, giftId: 1, diamondCount, repeatCount: 1 });
const many = (k: number, f: () => void) => {
  for (let i = 0; i < k; i++) setTimeout(f, i * 120);
};
const setPref = (p: Partial<Prefs>) => void sendControl('setPrefs', JSON.stringify(p));

export function GameControls({ prefs }: { prefs: Prefs }) {
  const [hide, setHide] = useState('');
  return (
    <section className="space-y-2 rounded-2xl bg-slate-900 p-3 ring-1 ring-slate-800">
      <Row label="Cài đặt">
        <span className="text-xs text-slate-400">Tốc độ bắn</span>
        {(['cham', 'vua', 'nhanh'] as const).map((s) => (
          <B key={s} on={prefs.speed === s} onClick={() => setPref({ speed: s })}>
            {{ cham: 'Chậm', vua: 'Vừa', nhanh: 'Nhanh' }[s]}
          </B>
        ))}
        <B on={prefs.music === '1'} onClick={() => setPref({ music: prefs.music === '1' ? '0' : '1' })}>
          {prefs.music === '1' ? '🎵 Nhạc nền: BẬT' : '🔇 Nhạc nền: TẮT'}
        </B>
        <Slider label="Nhạc" max={200} value={prefs.musicVol} onChange={(v) => setPref({ musicVol: v })} />
        <Slider label="Tiếng súng" max={100} value={prefs.sfxVol} onChange={(v) => setPref({ sfxVol: v })} />
      </Row>
      <Row label="Giọng MC">
        <B on={prefs.mc === 'Adam bựa'} onClick={() => setPref({ mc: 'Adam bựa' })}>
          🤪 Adam bựa
        </B>
        <B on={!prefs.mc} onClick={() => setPref({ mc: '' })}>
          🎙 Giọng thường (Edge)
        </B>
        <B onClick={() => void sendControl('speak', '[cười] Ai comment là lên tường hết nha! | Tặng quà thì được bắn trước, avatar to đùng luôn.')}>
          ▶ Nghe thử trên stage
        </B>
        <span className="text-xs text-slate-500">Adam cần bật VieNeu-TTS (BAT-LIVE tự bật). Chưa bật thì tự đọc giọng thường.</span>
      </Row>
      <Row label="Người xem">
        <input
          value={hide}
          onChange={(e) => setHide(e.target.value)}
          placeholder="tên hoặc username"
          className="w-40 rounded-lg bg-slate-800 px-2 py-1 text-xs"
        />
        <B
          onClick={() => {
            if (hide.trim()) void sendControl('custom', `xoa:${hide.trim()}`);
            setHide('');
          }}
        >
          🙈 Xoá khỏi hàng + tường
        </B>
        <B onClick={() => confirm('Xoá hết hàng chờ và tường?') && void sendControl('reset')}>🧽 Lau tường</B>
      </Row>
      <Row label="Thử">
        <B onClick={chat}>💬 1 comment</B>
        <B onClick={() => many(20, chat)}>💬 20 comment</B>
        <B onClick={() => many(100, chat)}>💬 100 comment</B>
        <B onClick={() => gift(1, 'Hoa hồng')}>🌹 1 xu</B>
        <B onClick={() => gift(99, 'Mũ')}>🎩 99 xu</B>
        <B onClick={() => gift(1000, 'Thiên hà')}>💎 1000 xu</B>
        <B onClick={() => emitTest('like', { ...someone(), likeCount: 100 })}>❤️ 100 tim</B>
      </Row>
    </section>
  );
}

function Slider({ label, max, value, onChange }: { label: string; max: number; value: string; onChange: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <label className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1 text-xs">
      {label}
      <input
        type="range"
        min={0}
        max={max}
        step={10}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onPointerUp={() => onChange(v)}
        onKeyUp={() => onChange(v)}
        className="w-24 accent-pink-500"
      />
      <b className="w-9 text-right">{v}%</b>
    </label>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-20 flex-none text-xs font-semibold text-slate-400">{label}</span>
      {children}
    </div>
  );
}

function B({ children, onClick, on }: { children: ReactNode; onClick: () => void; on?: boolean }) {
  return (
    <button onClick={onClick} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${on ? 'bg-pink-500 text-white' : 'bg-slate-800 hover:bg-slate-700'}`}>
      {children}
    </button>
  );
}
