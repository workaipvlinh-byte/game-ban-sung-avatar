// Camera đi ngang 1 chiều, lặp mãi: tường trôi sang trái đều đều, nhún nhẹ theo bước chân.
// Vệt sơn nằm theo toạ độ "trên tường" (x tăng mãi), màn hình = tường dịch trái `scrollAt(t)` px rồi phóng to `zoom`.
export const WALK = {
  speed: 0.04, // px mỗi ms (40px/giây): 1 avatar đi hết bề ngang màn hình trong khoảng 27 giây
  stepMs: 520, // nửa bước chân
  bob: 6, // độ nhún (px)
  zoom: 1.1, // > 1 để mép trên/dưới không lộ khi nhún
};

export const scrollAt = (t: number) => t * WALK.speed;
export const stepAt = (t: number) => Math.abs(Math.sin((Math.PI * t) / WALK.stepMs)); // 0..1

/** Điểm trên màn hình (khung 1080x1920) -> điểm trên tường lúc t */
export const toWall = (sx: number, sy: number, t: number) => ({
  x: 540 + (sx - 540) / WALK.zoom + scrollAt(t),
  y: 960 + (sy - 960) / WALK.zoom,
});

/** Điểm trên tường -> x trên màn hình lúc t */
export const toScreenX = (wx: number, t: number) => 540 + (wx - scrollAt(t) - 540) * WALK.zoom;
