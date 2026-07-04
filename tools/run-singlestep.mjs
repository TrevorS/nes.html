// Runs SingleStepTests/65x02 JSON tests (tests/singlestep/*.json) against the CPU core.
// Verifies final registers, final RAM, and cycle count for every test case.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadCore, ROOT } from './core.mjs';

const { CPU6502 } = loadCore();
const dir = process.env.SST_DIR || join(ROOT, 'tests', 'singlestep');
const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort();
if (!files.length) { console.log('no json tests found'); process.exit(1); }

let totalPass = 0, totalFail = 0;
for (const f of files) {
  const tests = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  let pass = 0, fail = 0;
  for (const t of tests) {
    const mem = new Uint8Array(0x10000);
    const busLog = [];
    const cpu = new CPU6502({
      cpuRead: a => { busLog.push([a, mem[a], 'read']); return mem[a]; },
      cpuWrite: (a, v) => { busLog.push([a, v, 'write']); mem[a] = v; },
    });
    cpu.bcd = true; // SingleStepTests model a real NMOS 6502 (with decimal mode)
    cpu.pc = t.initial.pc; cpu.sp = t.initial.s; cpu.a = t.initial.a;
    cpu.x = t.initial.x; cpu.y = t.initial.y; cpu.p = t.initial.p; cpu.cycles = 0;
    for (const [a, v] of t.initial.ram) mem[a] = v;
    const cyc = cpu.step();
    const errs = [];
    // exact bus activity: address, value, and read/write of every cycle
    if (busLog.length !== t.cycles.length) errs.push(`buslen ${busLog.length}!=${t.cycles.length}`);
    else for (let i = 0; i < t.cycles.length; i++) {
      const [wa, wv, wt] = t.cycles[i], [ga, gv, gt] = busLog[i];
      if (wa !== ga || wv !== gv || wt !== gt)
        errs.push(`bus[${i}] got ${gt}@${ga.toString(16)}=${gv} want ${wt}@${wa.toString(16)}=${wv}`);
    }
    if (cpu.pc !== t.final.pc) errs.push(`pc ${cpu.pc.toString(16)}!=${t.final.pc.toString(16)}`);
    if (cpu.sp !== t.final.s) errs.push(`s ${cpu.sp}!=${t.final.s}`);
    if (cpu.a !== t.final.a) errs.push(`a ${cpu.a}!=${t.final.a}`);
    if (cpu.x !== t.final.x) errs.push(`x ${cpu.x}!=${t.final.x}`);
    if (cpu.y !== t.final.y) errs.push(`y ${cpu.y}!=${t.final.y}`);
    if (cpu.p !== t.final.p) errs.push(`p ${cpu.p.toString(2)}!=${t.final.p.toString(2)}`);
    for (const [a, v] of t.final.ram) if (mem[a] !== v) errs.push(`ram[${a.toString(16)}] ${mem[a]}!=${v}`);
    if (cyc !== t.cycles.length) errs.push(`cycles ${cyc}!=${t.cycles.length}`);
    if (errs.length) {
      fail++;
      if (fail <= 3) console.log(`  ${f} "${t.name}": ${errs.join('; ')}`);
    } else pass++;
  }
  totalPass += pass; totalFail += fail;
  console.log(`${f}: ${pass}/${pass + fail}${fail ? '  <-- FAILURES' : ''}`);
}
console.log(`\nTOTAL: ${totalPass} pass, ${totalFail} fail`);
process.exit(totalFail ? 1 : 0);
