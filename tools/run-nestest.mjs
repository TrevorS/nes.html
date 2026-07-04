// Runs nestest.nes in automation mode (PC=$C000) and diffs the CPU trace
// against tests/nestest.log field by field (PC, A, X, Y, P, SP, CYC).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCore, ROOT } from './core.mjs';

const { NES } = loadCore();
const rom = new Uint8Array(readFileSync(join(ROOT, 'tests', 'nestest.nes')));
const log = readFileSync(join(ROOT, 'tests', 'nestest.log'), 'utf8').split('\n').filter(l => l.trim());

const nes = new NES();
nes.loadROM(rom);
nes.cpu.pc = 0xC000; nes.cpu.sp = 0xFD; nes.cpu.p = 0x24; nes.cpu.cycles = 7;

const parse = (line) => ({
  pc: parseInt(line.slice(0, 4), 16),
  a: parseInt(line.match(/A:([0-9A-F]{2})/)[1], 16),
  x: parseInt(line.match(/X:([0-9A-F]{2})/)[1], 16),
  y: parseInt(line.match(/Y:([0-9A-F]{2})/)[1], 16),
  p: parseInt(line.match(/P:([0-9A-F]{2})/)[1], 16),
  sp: parseInt(line.match(/SP:([0-9A-F]{2})/)[1], 16),
  cyc: parseInt(line.match(/CYC:(\d+)/)[1], 10),
});

let mismatches = 0;
for (let i = 0; i < log.length; i++) {
  const want = parse(log[i]);
  const cpu = nes.cpu;
  const got = { pc: cpu.pc, a: cpu.a, x: cpu.x, y: cpu.y, p: cpu.p, sp: cpu.sp, cyc: cpu.cycles };
  const bad = Object.keys(want).filter(k => want[k] !== got[k]);
  if (bad.length) {
    mismatches++;
    if (mismatches <= 10) {
      console.log(`line ${i + 1}: MISMATCH [${bad.join(',')}]`);
      console.log(`  want ${JSON.stringify(want)}`);
      console.log(`  got  ${JSON.stringify(got)}`);
      console.log(`  log: ${log[i]}`);
    }
    if (mismatches === 1 && bad.includes('pc')) break; // off the rails; later lines meaningless
  }
  cpu.step();
}
const r2 = nes.bus.cpuRead(2), r3 = nes.bus.cpuRead(3);
console.log(`\n${log.length} log lines, ${mismatches} mismatching`);
console.log(`nestest result bytes: $0002=${r2.toString(16).padStart(2,'0')} $0003=${r3.toString(16).padStart(2,'0')} (00 00 = all pass)`);
process.exit(mismatches || r2 || r3 ? 1 : 0);
