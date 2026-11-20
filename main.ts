// Palma Verde Cover Studio — entry program for the cover-art bounty.
// Node 22, standard library only. It takes the app/ folder and the
// screenshots/ folder that sit next to this file, copies both into the
// output directory, and writes dossier.json there with the vendored
// make.fun library. Nothing is fetched, built, or transformed on the way.
//
// Try the app first with `node serve.ts`, then open http://localhost:8080.
// To hand it in locally:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const appDir = join(root, 'app');
const shotsDir = join(root, 'screenshots');

mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
}

// Caps mirror the scorer's gate: at most 4 screenshots, each at most
// 256 KiB; app/ at most 993 files and 48 MiB; source text at most
// 160 KiB; no app path longer than 1000 bytes.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`dossier written to ${join(outDir, 'dossier.json')}`);
