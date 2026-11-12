// Camera đi ngang 1 chiều theo nhịp bắn: mỗi phát bắn là 1 bức tường mới.
// Tới lượt người kế: lướt nhanh sang tường kế (moveMs), dừng lại, rồi viên sơn mới bay.
// Vệt sơn nằm theo toạ độ "trên tường": tường thứ i nằm ở x = i * TILE.
export const TILE = 1080;
export const WALK = {
  moveMs: 2500, // thời gian lướt sang tường kế
  bob: 10, // độ nhún khi bước (px)
  stepMs: 620, // 1 bước chân
  zoom: 1.1, // > 1 để mép trên/dưới không lộ khi nhún
};

/** Điểm trên màn hình (khung 1080x1920) -> điểm trên tường thứ `wall` (lúc camera đã dừng ở đó) */
export const toWall = (sx: number, sy: number, wall: number) => ({
  x: 540 + (sx - 540) / WALK.zoom + wall * TILE,
  y: 960 + (sy - 960) / WALK.zoom,
});
