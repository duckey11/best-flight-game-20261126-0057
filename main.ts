import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? join(here, "out"));

mkdirSync(outDir, { recursive: true });
// Never remove outDir itself: in the grader /output is a volume mount
// point, so rmSync on it throws EBUSY ("Device or resource busy") and
// kills the run. Clearing only the contents is equivalent for a fresh
// output directory and stays safe when outDir did not exist before,
// because the mkdirSync above creates it first.
for (const child of readdirSync(outDir)) {
  rmSync(join(outDir, child), { recursive: true, force: true });
}

cpSync(join(here, "game"), join(outDir, "game"), { recursive: true });
cpSync(join(here, "screenshots"), join(outDir, "screenshots"), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

const dossierPath = join(outDir, "dossier.json");
// buildDossier returns the dossier as raw bytes (a Uint8Array of JSON
// text), so write them as-is; stringifying would wrap them in an
// offset map instead of a valid dossier.
writeFileSync(dossierPath, dossier);
console.log(`Wrote ${dossierPath} (${dossier.length} bytes)`);
