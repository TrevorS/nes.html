// Runs a blargg-protocol test ROM headless.
// Protocol: $6001-6003 = $DE $B0 $61 when valid; $6000 = $80 running, $81 reset
// requested, else final result (0 = pass); zero-terminated text at $6004.
// Usage: node tools/run-blargg.mjs <rom.nes> [max-seconds]
import { readFileSync } from 'node:fs';
import { loadCore } from './core.mjs';

const { NES } = loadCore();
const romPath = process.argv[2];
const maxFrames = (parseFloat(process.argv[3]) || 60) * 60;

const nes = new NES();
nes.loadROM(new Uint8Array(readFileSync(romPath)));
const ram = () => nes.cart.prgRam;                 // $6000 == prgRam[0]

let resetAt = -1, result = null;
for (let f = 0; f < maxFrames; f++) {
  nes.stepFrame(0, 0);
  if (f === resetAt) nes.reset();
  const valid = ram()[1] === 0xDE && ram()[2] === 0xB0 && ram()[3] === 0x61;
  if (!valid) continue;
  const st = ram()[0];
  if (st === 0x80) continue;
  if (st === 0x81) { if (resetAt < f) resetAt = f + 8; continue; }   // reset after ~130ms
  result = st; break;
}
let text = '';
for (let i = 4; i < 8192 && ram()[i]; i++) text += String.fromCharCode(ram()[i]);
console.log(`${romPath.split('/').pop()}: ${result === null ? 'TIMEOUT/no result' : result === 0 ? 'PASS' : 'FAIL code ' + result}`);
if (text.trim()) console.log(text.trim().split('\n').map(l => '  | ' + l).join('\n'));
process.exit(result === 0 ? 0 : 1);
