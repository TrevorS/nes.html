// Extracts the DOM-free core from nes.html and evaluates it, returning NESCore.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export function loadCore() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const html = readFileSync(join(root, 'nes.html'), 'utf8');
  const m = html.match(/\/\/<NES-CORE>([\s\S]*?)\/\/<\/NES-CORE>/);
  if (!m) throw new Error('NES-CORE markers not found in nes.html');
  new Function(m[1])();
  return globalThis.NESCore;
}
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
