// Tự kiểm hàng chờ: npx tsx src/game/queue.check.ts
import assert from 'node:assert/strict';
import { enqueue, takeNext, type Queue } from './queue';

const u = (n: string) => ({ username: n, nickname: n });
let q: Queue = [];
q = enqueue(q, u('a'));
q = enqueue(q, u('b'));
q = enqueue(q, u('a')); // comment lại: không thêm
assert.equal(q.length, 2);
q = enqueue(q, u('c'), 1); // hoa 1 xu -> chen lên
q = enqueue(q, u('d'), 99);
q = enqueue(q, u('b'), 100); // b đang chờ, tặng thêm -> cao nhất
const order: string[] = [];
for (let e; ([e, q] = takeNext(q))[0]; ) order.push(e!.username);
assert.deepEqual(order, ['b', 'd', 'c', 'a']);

// Trần: quá đông thì bỏ người không quà mới nhất, giữ người có quà
q = [];
q = enqueue(q, u('x'), 0, 2);
q = enqueue(q, u('y'), 5, 2);
q = enqueue(q, u('z'), 0, 2);
assert.deepEqual(q.map((e) => e.username), ['x', 'y']);
q = enqueue(q, u('w'), 10, 2);
assert.deepEqual(q.map((e) => e.username), ['y', 'w']);
console.log('queue OK');
