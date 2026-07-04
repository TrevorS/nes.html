# NES CPU (2A03 / 6502) — condensed implementation notes

Condensed from NESdev wiki (Status_flags, CPU_unofficial_opcodes, INES). Full instruction reference: `6502-obelisk-reference.md`.

## Status register P

```
7  bit  0
NV1B DIZC
```

- C carry, Z zero, I IRQ disable, D decimal (no effect on NES but readable/settable), V overflow, N negative.
- Bits 5 and 4 don't exist in the CPU. Bit 5 always pushed as 1. Bit 4 ("B flag") pushed as 1 by BRK/PHP, 0 by NMI/IRQ. Both ignored when pulling (PLP/RTI).
- I-flag effect of SEI/CLI/PLP is delayed one instruction. Interrupts (NMI/IRQ/BRK) set I after pushing flags.
- BIT: bit 7 of operand → N, bit 6 → V.
- nestest starts with P=$24 (that's just bit-5=1, B=0 convention in the log).

## Interrupt vectors

NMI $FFFA/B, RESET $FFFC/D, IRQ/BRK $FFFE/F. BRK is 2 bytes (padding byte skipped). NMI can hijack BRK (B still pushed as 1). IRQ/NMI sequence: 7 cycles, push PCH, PCL, P, set I, fetch vector.

## Power-up state

A=X=Y=0, SP=$FD, P=$34 (I set). RAM $0000-$07FF, mirrored to $1FFF. Reset: SP -= 3, I set.

## Unofficial opcodes (needed for nestest + a few games)

Combined RMW+ALU ops, addressing mode = the corresponding ALU opcode's mode. Column $x3/$x7/$xF/$xB pattern:

| Op | = | Effect |
|----|---|--------|
| SLO | ASL + ORA | mem<<=1, A\|=mem |
| RLA | ROL + AND | rotate left, A&=mem |
| SRE | LSR + EOR | mem>>=1, A^=mem |
| RRA | ROR + ADC | rotate right, A+=mem+C |
| SAX | store A&X | no flags |
| LAX | LDA + LDX | A=X=mem |
| DCP | DEC + CMP | mem--, compare A |
| ISC/ISB | INC + SBC | mem++, A-=mem |
| ANC #i | AND, C=N | $0B/$2B |
| ALR #i | AND + LSR A | $4B |
| ARR #i | AND + ROR A, odd C/V | $6B |
| AXS #i | X=(A&X)-imm | $CB |
| SBC #i $EB | = official SBC | |
| NOPs | $04,$44,$64 (zp), $0C (abs), $14,$34,$54,$74,$D4,$F4 (zp,x), $1A,$3A,$5A,$7A,$DA,$FA (implied), $80,$82,$89,$C2,$E2 (#i), $1C,$3C,$5C,$7C,$DC,$FC (abs,x — page-cross adds cycle) | |
| STP | $02,$12,$22,$32,$42,$52,$62,$72,$92,$B2,$D2,$F2 halt | |

Unstable (implement common behavior, low priority): XAA $8B, AHX $93/$9F, SHY $9C, SHX $9E, TAS $9B, LAS $BB.

Games using them: rare (Puzznic, Super Cars LAX $B3, Aladdin (E) SLO $07, etc.) — but nestest tests them all after pressing Select / in automation mode.

## Cycle rules

- Page-cross penalty (+1) on abs,X / abs,Y / (d),Y **reads** only; write and RMW instructions always take the fixed (longer) count.
- Branches: +1 if taken, +1 more if target crosses page.
- RMW instructions do a dummy write of the unmodified value before the real write.

## iNES header (.nes files)

16-byte header: "NES\x1A", byte4 = PRG ROM size ×16KB, byte5 = CHR ROM ×8KB (0 = CHR RAM), byte6 flags (bit0 nametable arrangement: 0=horizontal-mirror/vertical-arrangement, 1=vertical-mirror; bit1 battery; bit2 512-byte trainer before PRG; bit3 alt layout; bits4-7 mapper low nibble), byte7 (bits4-7 mapper high nibble; if byte7 AND $0C == $08 → NES 2.0). Then trainer (if any), PRG ROM, CHR ROM.
Dirty-header rule: if bytes 12-15 nonzero and not NES 2.0, mask mapper to low nibble ("DiskDude!" problem).

## nestest usage

Automation mode: load, set PC=$C000, run. Compare trace against tests/nestest.log (format: `PC  bytes  disasm  A: X: Y: P: SP: PPU:scanline,dot CYC:`). Log starts CYC:7 (reset takes 7 cycles). Results written to $0002 (official) / $0003 (unofficial) — $00 = pass. See tests/nestest.txt.
