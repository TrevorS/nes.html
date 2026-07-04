# NES Emulator — Documentation Roadmap

Single-file HTML/CSS/JS NES emulator. From-scratch core, common mappers, silent v1, netplay model decided later (but core designed for determinism + savestates from day one).

## Phase 1 — CPU (6502 / 2A03)

- [6502 Reference (Obelisk, mirrored on nesdev)](https://www.nesdev.org/obelisk-6502-guide/reference.html) — the canonical instruction-by-instruction reference: opcodes, addressing modes, flags, cycle counts.
- [Masswerk 6502 Instruction Set](https://www.masswerk.at/6502/6502_instruction_set.html) — great one-page opcode matrix; includes illegal opcodes.
- [NESdev: CPU](https://www.nesdev.org/wiki/CPU) — 2A03 specifics: memory map, power-up state, interrupts (NMI/IRQ/BRK), no decimal mode.
- [SingleStepTests/65x02](https://github.com/SingleStepTests/65x02) — JSON test suite, one file per opcode with full bus activity. Test every instruction in isolation before booting anything.
- [nestest.nes + log](https://github.com/christopherpow/nes-test-roms) — run in "automation mode" (start at $C000), diff your trace line-by-line against nestest.log. The classic CPU milestone.

## Phase 2 — System plumbing

- [NESdev: CPU memory map](https://www.nesdev.org/wiki/CPU_memory_map) — RAM mirroring, PPU register mirroring, cartridge space.
- [NESdev: iNES format](https://www.nesdev.org/wiki/INES) + [NES 2.0](https://www.nesdev.org/wiki/NES_2.0) — ROM file parsing (header, PRG/CHR banks, mapper number, mirroring flag).
- [NESdev: Cycle reference chart](https://www.nesdev.org/wiki/Cycle_reference_chart) — master clock ratios (PPU = 3× CPU on NTSC). Core timing model.
- [NESdev: Catch-up](https://www.nesdev.org/wiki/Catch-up) — scheduling strategy: cycle-step vs catch-up. Decide early; affects determinism.

## Phase 3 — PPU (graphics)

- [NESdev: PPU programmer reference](https://www.nesdev.org/wiki/PPU_programmer_reference) — entry point to all PPU pages.
- [NESdev: PPU registers](https://www.nesdev.org/wiki/PPU_registers) — $2000–$2007 behavior, including the shared internal v/t/x/w latches.
- [NESdev: PPU rendering](https://www.nesdev.org/wiki/PPU_rendering) — the 341×262 dot/scanline timing diagram. Implement this faithfully.
- [NESdev: PPU scrolling](https://www.nesdev.org/wiki/PPU_scrolling) — "loopy" v/t registers. The hardest, most important page; split-scroll games (SMB3, Zelda) break without it.
- NESdev: PPU sprite evaluation, OAM, palettes — linked from the programmer reference.
- Output: single `<canvas>`, 256×240 `ImageData`, scale with `image-rendering: pixelated`.

## Phase 4 — Mappers (target ~80% of library)

- [NESdev: Mapper](https://www.nesdev.org/wiki/Mapper) — overview + numbering.
- Per-mapper pages: NROM (0), MMC1 (1), UNROM (2), CNROM (3), MMC3 (4 — includes the scanline IRQ counter, needed for SMB3/many others).
- [blargg + other test ROMs collection](https://github.com/christopherpow/nes-test-roms) — mmc3_test, ppu_vbl_nmi, sprite_hit tests, etc. [TASVideos accuracy test matrix](https://tasvideos.org/EmulatorResources/NESAccuracyTests) shows what each test covers.

## Phase 5 — Input, savestates, determinism

- [NESdev: Standard controller](https://www.nesdev.org/wiki/Standard_controller) — $4016/$4017 strobe + shift register. Two controllers from day one (multiplayer!).
- Savestates: serialize all component state to a flat typed-array snapshot. Required for any future netplay model (lockstep resync or rollback).
- Determinism rules: no `Math.random`, no wall-clock reads in the core, inputs sampled once per frame, fixed frame stepping (`step(frame, [p1, p2])` as the only way time advances).

## Phase 6 — WebRTC netplay (later, but read early)

- [MDN: RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection) + [RTCDataChannel](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel) — use an unordered/unreliable-tolerant channel for inputs.
- "Humans as signaling servers" (copy-paste SDP offer/answer — note: this replaces the *signaling* server; a public STUN server like Google's is still free and needs no infrastructure):
  - [Jim Fisher: hello-world serverless WebRTC](https://jameshfisher.com/2017/01/16/tiny-serverless-webrtc/)
  - [Minimal WebRTC peer with manual SDP exchange](https://dev.to/hexshift/building-a-minimal-webrtc-peer-without-a-signaling-server-using-only-manual-sdp-exchange-mck)
  - [Working manual-signaling example repo](https://github.com/david-tkalcec/webrtc-manual-sdp-signaling)
  - Tip: wait for ICE gathering to complete, then copy one blob containing SDP + all candidates (one paste per side).
- Netplay theory for when we choose a model: search "GGPO rollback networking" (Infil's fighting-game netcode explainer is the standard read).

## Deferred (v2+)

- APU: [NESdev: APU](https://www.nesdev.org/wiki/APU) — skipped for silent v1, but stub the $4000–$4017 registers and frame counter, since some games poll $4015 or rely on frame-counter IRQs.

## Suggested build order

CPU vs JSON tests → nestest.log parity → iNES loader → background-only PPU (Donkey Kong title screen) → sprites + input (playable DK) → scrolling (SMB) → MMC1/UNROM/CNROM → MMC3 + IRQ (SMB3) → savestates → WebRTC.

## Test status (updated as we go)

| Suite | Result |
|---|---|
| SingleStepTests 65x02 (~60 opcodes × 10k) incl. EXACT per-cycle bus activity | all pass |
| nestest.log (8,991 lines, official+unofficial) | 100% match |
| blargg instr_test-v5 all_instrs + official_only | PASS (all 16) |
| blargg sprite_hit (11 tests incl. timing/order/edge) | all PASSED |
| **ppu_vbl_nmi (all 10 + combined ROM)** | **PASS** — incl. $2002 races, NMI suppression, even/odd timing |
| blargg apu_test (8 tests incl. jitter, len/irq timing, DMC) | PASS (all 8) |
| mmc3_test_2 | 1,2,3,5 PASS; 4: 13/14 subtests (one scanline-239 edge case); 6 = old-revision chip, mutually exclusive with 5 |
| Determinism (replay twice, save/load resume) | IDENTICAL hashes |
| Netplay sim (lockstep + desync recovery) | IDENTICAL state+fb |

Architecture: the CPU is cycle-accurate at the bus level — every cycle is a real bus
access (hardware dummy reads, RMW double-writes, JSR/stack sequences), each ticking the
PPU 3 dots + APU 1 tick via `cpu.tick`. Interrupt polling uses assert-cycle stamps
(final-cycle asserts wait one instruction; NMIs on a cycle's first dot are caught early).
$2002 vbl races, NMI enable/disable races, and the odd-frame skip decision point are
calibrated against blargg's reference tables.

Mappers implemented: 0 NROM, 1 MMC1, 2 UNROM, 3 CNROM, 4 MMC3 (A12-filtered IRQ), 7 AOROM.

APU: all 5 channels (2 pulse w/ sweep+envelope, triangle, noise, DMC w/ DMA+IRQ),
frame counter (4/5-step, IRQ, $4017 write delay), nesdev mixer formulas. Output via
AudioWorklet ring buffer; sample generation never feeds back into emulation state.
The 2A03 IRQ line is properly shared (mapper OR frame OR DMC) via Bus.syncIrq().

Battery saves persist to localStorage keyed by ROM hash (battery-flagged carts only).

## Netplay (implemented)

Deterministic lockstep over a WebRTC DataChannel with copy-paste signaling (no
server; public Google STUN for NAT discovery). Host = P1, guest = P2; both sides
use the P1 keys/gamepad locally.

- `NetSession` (in the core, transport-agnostic): hello/ROM-hash check → host
  streams its full savestate (chunked, base64-typed-array JSON) → lockstep with
  input delay auto-sized from measured RTT (2-8 frames). Frame F steps only when
  both inputs for F are known; local input is scheduled F+delay ahead.
- Desync detection: state fingerprint exchanged every 120 frames; on mismatch the
  host automatically re-syncs (state transfer + restart). Verified by sabotaging
  guest RAM mid-run in `tools/run-netplay-sim.mjs`.
- Sim harness result: 900+ frames, different inputs each side, 33ms simulated
  latency → 0 stalls, bit-identical state and framebuffer, auto-recovery works.
- Pause/resume propagates; reset/savestates are disabled during a session.

| Netplay checks | Result |
|---|---|
| Two-peer lockstep sim (900 frames, different inputs, latency) | IDENTICAL state+fb, 0 stalls |
| Desync sabotage recovery | auto-resync, IDENTICAL after |
