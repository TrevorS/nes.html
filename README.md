# nes.html

A cycle-accurate NES emulator in a single HTML file, with serverless WebRTC multiplayer.

Open `nes.html` in a browser. That's the whole install.

## Features

- Full 6502 CPU, cycle-accurate at the bus level (every hardware dummy read/write modeled)
- Dot-based PPU: loopy scrolling, sprites, sprite-0 hit, $2002/NMI races, odd-frame skip
- Full APU: 2 pulse, triangle, noise, DMC (with DMA + IRQ), frame counter — AudioWorklet output
- Mappers: NROM, MMC1, UNROM, CNROM, MMC3 (A12-filtered IRQ), AOROM — ~85% of the licensed library
- Savestates, battery-save persistence (localStorage), gamepad support, 2-player keyboard
- **Netplay**: deterministic lockstep over a WebRTC DataChannel with copy-paste signaling —
  no server anywhere. Host sends full state on connect; desyncs auto-heal.
- Built-in freely-licensed game (LJ65 by Damian Yerrick) for zero-setup testing

## Accuracy

Passes: nestest (all 8,991 log lines), blargg instr_test-v5, **all 10 ppu_vbl_nmi tests**,
all 11 sprite-hit tests, all 8 apu_tests, MMC3 1/2/3/5 (+13/14 of scanline_timing), and
SingleStepTests 65x02 with exact per-cycle bus activity. See `DOCS.md` for the full matrix.

## Development

- `DOCS.md` — documentation roadmap, architecture notes, test status
- `tools/run-nestest.mjs` — CPU trace diff vs nestest.log
- `tools/run-singlestep.mjs` — SingleStepTests incl. bus-activity validation (`SST_DIR` env to point elsewhere)
- `tools/run-blargg.mjs <rom>` — blargg $6000-protocol test runner
- `tools/run-determinism.mjs` — replay + savestate-resume hash checks
- `tools/run-netplay-sim.mjs` — two-peer lockstep simulation with latency + desync recovery
- `tests/` — test ROMs (nestest, blargg suites); `tools/fetch-singlestep.sh` re-fetches the big JSON suites

The emulator core is DOM-free between the `//<NES-CORE>` markers in nes.html; the Node
harnesses extract and run it directly, so the single file stays the source of truth.

## Licenses

Emulator code: MIT. `tests/lj65.nes` is free software by Damian Yerrick (see `tests/README.txt`);
test ROMs by blargg and others are redistributed from the community
[nes-test-roms](https://github.com/christopherpow/nes-test-roms) collection.
