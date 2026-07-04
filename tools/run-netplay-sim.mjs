// Headless netplay simulation: two full emulator instances joined by piped
// NetSessions with artificial latency. Verifies: host->guest state sync,
// lockstep input exchange (each side plays different inputs), no desync over
// 900 frames, and bit-identical machine state at the end.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCore, ROOT } from './core.mjs';

const { NES, NetSession } = loadCore();
const rom = new Uint8Array(readFileSync(join(ROOT, 'tests', 'lj65.nes')));

const nesA = new NES(); nesA.loadROM(rom);
const nesB = new NES(); nesB.loadROM(rom);
// desync the guest's power-on state on purpose — host state transfer must fix it
for (let i = 0; i < 37; i++) nesB.stepFrame(0xFF, 0xFF);

// piped transport with ~2 ticks (~33ms) of latency each way
const QA = [], QB = [];  // inbound queues
const LAT = 2;
let tick = 0;
const sesA = new NetSession(nesA, true,  m => QB.push({ at: tick + LAT, m: JSON.parse(JSON.stringify(m)) }), () => tick * 16.7);
const sesB = new NetSession(nesB, false, m => QA.push({ at: tick + LAT, m: JSON.parse(JSON.stringify(m)) }), () => tick * 16.7);
let statuses = { A: [], B: [] };
sesA.onStatus = s => statuses.A.push(s);
sesB.onStatus = s => statuses.B.push(s);

const deliverNow = () => {
  while (QA.length && QA[0].at <= tick) sesA.onMessage(QA.shift().m);
  while (QB.length && QB[0].at <= tick) sesB.onMessage(QB.shift().m);
};
const pump = (n) => { for (let i = 0; i < n; i++) { tick++; deliverNow(); } };

sesA.begin(12345); sesB.begin(12345);
pump(5);                                      // hello + ping cross the wire
await new Promise(r => setTimeout(r, 500));   // host's 300ms pre-sync timer fires
pump(5);                                      // guest receives state chunks + start

const inputA = f => (f * 2654435761 >>> 13) & 0xC3;      // host presses things
const inputB = f => (f * 40503 >>> 7) & 0x4B;            // guest presses different things
const deliver = () => {
  while (QA.length && QA[0].at <= tick) sesA.onMessage(QA.shift().m);
  while (QB.length && QB[0].at <= tick) sesB.onMessage(QB.shift().m);
};

let stallsA = 0, stallsB = 0;
for (tick = 0; tick < 1400 && (sesA.frame < 900 || sesB.frame < 900); tick++) {
  deliver();
  if (sesA.frame < 900 && !sesA.tryStep(inputA(sesA.frame))) stallsA++;
  if (sesB.frame < 900 && !sesB.tryStep(inputB(sesB.frame))) stallsB++;
  await 0;
}
deliver();

console.log(`host:  frame=${sesA.frame} state=${sesA.state} stalls=${stallsA}`);
console.log(`guest: frame=${sesB.frame} state=${sesB.state} stalls=${stallsB}`);
console.log(`status history: A=[${statuses.A}] B=[${statuses.B}]`);
const same = nesA.hashLite() === nesB.hashLite();
const fbSame = Buffer.from(nesA.framebuffer).equals(Buffer.from(nesB.framebuffer));
console.log(`final state hash: ${same ? 'IDENTICAL' : 'DIVERGED'}  framebuffer: ${fbSame ? 'IDENTICAL' : 'DIVERGED'}`);
const desynced = statuses.A.includes('resync') || statuses.B.includes('desync');
console.log(`desync events: ${desynced ? 'YES (bad)' : 'none'}`);
process.exit(same && fbSame && !desynced && sesA.frame >= 900 && sesB.frame >= 900 ? 0 : 1);
