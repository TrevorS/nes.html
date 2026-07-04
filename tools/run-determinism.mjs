// Determinism + savestate correctness check (groundwork for netplay):
// 1. Run a scripted 600-frame input sequence twice from power-on -> hashes must match.
// 2. Save state at frame 300, run to 600; then load the state and re-run 300..600
//    -> must reach the identical hash.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCore, ROOT } from './core.mjs';

const { NES } = loadCore();
const rom = new Uint8Array(readFileSync(join(ROOT, 'tests', 'lj65.nes')));

// deterministic pseudo-random input script
const input = (f) => {
  let h = f * 2654435761 >>> 0;
  h ^= h >> 13; h = (h * 2246822519) >>> 0;
  return f < 60 ? 0 : (f % 90 < 5 ? 0x08 : h & 0xC3);   // occasional Start, random A/B/L/R
};
const fnv = (h, arr) => { for (let i = 0; i < arr.length; i++) { h ^= arr[i]; h = (h * 16777619) >>> 0; } return h; };
const hashNes = (nes) => {
  let h = 2166136261 >>> 0;
  h = fnv(h, nes.bus.ram); h = fnv(h, nes.framebuffer); h = fnv(h, nes.ppu.ciram);
  h = fnv(h, nes.ppu.oam); h = fnv(h, nes.ppu.palette); h = fnv(h, nes.cart.prgRam);
  h = fnv(h, [nes.cpu.pc & 0xFF, nes.cpu.pc >> 8, nes.cpu.a, nes.cpu.x, nes.cpu.y, nes.cpu.sp, nes.cpu.p]);
  return h;
};

function run(frames, nes = null, from = 0) {
  if (!nes) { nes = new NES(); nes.loadROM(rom); }
  for (let f = from; f < frames; f++) nes.stepFrame(input(f), 0);
  return nes;
}

const a = hashNes(run(600));
const b = hashNes(run(600));
console.log(`replay twice:        ${a === b ? 'IDENTICAL' : 'DIVERGED'} (${a.toString(16)} vs ${b.toString(16)})`);

const nes1 = run(300);
const snap = nes1.saveState();
for (let f = 300; f < 600; f++) nes1.stepFrame(input(f), 0);
const direct = hashNes(nes1);

const nes2 = new NES(); nes2.loadROM(rom); nes2.loadState(snap);
for (let f = 300; f < 600; f++) nes2.stepFrame(input(f), 0);
const resumed = hashNes(nes2);
console.log(`save/load resume:    ${direct === resumed ? 'IDENTICAL' : 'DIVERGED'} (${direct.toString(16)} vs ${resumed.toString(16)})`);
process.exit(a === b && direct === resumed ? 0 : 1);
