#!/usr/bin/env node
/**
 * One-off generator: downloads the lichess-org/chess-openings TSV files
 * (eco, name, pgn) and converts them into public/data/chess-openings.json —
 * a flat array of { id, eco, name, moves } consumed at runtime by the
 * Opening Trainer game. Not part of the build/CI pipeline — re-run manually
 * whenever the upstream dataset should be refreshed:
 *
 *   node scripts/generate-chess-openings.mjs
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const SOURCE_FILES = ['a.tsv', 'b.tsv', 'c.tsv', 'd.tsv', 'e.tsv'];
const BASE_URL =
  'https://raw.githubusercontent.com/lichess-org/chess-openings/master/';
const OUTPUT_PATH = fileURLToPath(
  new URL('../public/data/chess-openings.json', import.meta.url),
);

function slugify(eco, name) {
  return `${eco}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseTsv(text) {
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  const [, ...rows] = lines; // drop header row (eco  name  pgn)
  return rows.map((line) => {
    const [eco, name, pgn] = line.split('\t');
    return { eco: eco.trim(), name: name.trim(), pgn: pgn.trim() };
  });
}

function pgnToSanMoves(pgn) {
  const chess = new Chess();
  chess.loadPgn(pgn);
  return chess.history();
}

async function main() {
  const openings = [];
  const seenIds = new Set();

  for (const file of SOURCE_FILES) {
    const response = await fetch(`${BASE_URL}${file}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${file}: ${response.status}`);
    }
    const text = await response.text();
    for (const { eco, name, pgn } of parseTsv(text)) {
      const moves = pgnToSanMoves(pgn);
      if (moves.length === 0) continue;

      let id = slugify(eco, name);
      let suffix = 2;
      while (seenIds.has(id)) {
        id = `${slugify(eco, name)}-${suffix++}`;
      }
      seenIds.add(id);

      openings.push({ id, eco, name, moves });
    }
  }

  openings.sort((a, b) => a.eco.localeCompare(b.eco) || a.name.localeCompare(b.name));

  await writeFile(OUTPUT_PATH, JSON.stringify(openings), 'utf-8');
  console.log(`Wrote ${openings.length} openings to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
