// Offline crossword generator for SpellWhiz.
// Usage:  node tools/gen-crossword.js "Week 1" runny saggy funny yummy every everybody eye fast
// Prints a JS object literal to paste into crosswordData.js (crosswordPuzzles array).
//
// Greedy placement on shared letters, many random restarts, keeps the best layout
// (most words connected, then most crossings, then most compact). Any word that
// can't connect is parked as a standalone row so every word is always playable.

const [, , title, ...rawWords] = process.argv;
if (!title || rawWords.length < 2) {
  console.error('Usage: node tools/gen-crossword.js "Week 1" word1 word2 ...');
  process.exit(1);
}
const words = rawWords.map((w) => w.toLowerCase());

function tryBuild(order) {
  const cells = new Map(); // "r,c" -> letter
  const dirsAt = new Map(); // "r,c" -> Set of 'A'/'D' words using that cell
  const placed = []; // {word,row,col,dir}  dir: 'A' across | 'D' down
  let crossings = 0;
  const key = (r, c) => r + "," + c;

  function canPlace(word, row, col, dir) {
    let cross = 0;
    const dr = dir === "D" ? 1 : 0;
    const dc = dir === "A" ? 1 : 0;
    // cell before the first letter and after the last must be empty
    if (cells.has(key(row - dr, col - dc))) return -1;
    if (cells.has(key(row + dr * word.length, col + dc * word.length))) return -1;
    for (let i = 0; i < word.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const existing = cells.get(key(r, c));
      if (existing !== undefined) {
        if (existing !== word[i]) return -1;
        if (dirsAt.get(key(r, c)).has(dir)) return -1; // would overlap a same-direction word
        cross++;
      } else {
        // a fresh cell must not touch neighbours sideways (would form accidental words)
        if (dir === "A") {
          if (cells.has(key(r - 1, c)) || cells.has(key(r + 1, c))) return -1;
        } else {
          if (cells.has(key(r, c - 1)) || cells.has(key(r, c + 1))) return -1;
        }
      }
    }
    // Must not just lie on top of an existing word in the same direction
    if (cross === word.length) return -1;
    return cross;
  }

  function put(word, row, col, dir) {
    const dr = dir === "D" ? 1 : 0;
    const dc = dir === "A" ? 1 : 0;
    for (let i = 0; i < word.length; i++) {
      const k = key(row + dr * i, col + dc * i);
      cells.set(k, word[i]);
      if (!dirsAt.has(k)) dirsAt.set(k, new Set());
      dirsAt.get(k).add(dir);
    }
    placed.push({ word, row, col, dir });
  }

  put(order[0], 0, 0, "A");
  const leftovers = [];
  for (const word of order.slice(1)) {
    let best = null;
    for (const p of placed) {
      const dir = p.dir === "A" ? "D" : "A"; // alternate to the word we cross
      for (let i = 0; i < word.length; i++) {
        for (let j = 0; j < p.word.length; j++) {
          if (word[i] !== p.word[j]) continue;
          const row = p.dir === "A" ? p.row - i : p.row + j;
          const col = p.dir === "A" ? p.col + j : p.col - i;
          const cross = canPlace(word, row, col, dir);
          if (cross > 0) {
            const score = cross * 10 + Math.random();
            if (!best || score > best.score) best = { row, col, dir, cross, score };
          }
        }
      }
    }
    if (best) {
      put(word, best.row, best.col, best.dir);
      crossings += best.cross;
    } else leftovers.push(word);
  }

  // Park unconnected words below the grid, one blank row apart.
  for (const word of leftovers) {
    const maxRow = Math.max(...placed.map((p) => (p.dir === "D" ? p.row + p.word.length - 1 : p.row)));
    put(word, maxRow + 2, 0, "A");
  }

  const minR = Math.min(...placed.map((p) => p.row));
  const minC = Math.min(...placed.map((p) => p.col));
  placed.forEach((p) => {
    p.row -= minR;
    p.col -= minC;
  });
  const rows = Math.max(...placed.map((p) => (p.dir === "D" ? p.row + p.word.length : p.row + 1)));
  const cols = Math.max(...placed.map((p) => (p.dir === "A" ? p.col + p.word.length : p.col + 1)));
  return { placed, rows, cols, crossings, leftovers: leftovers.length };
}

function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const MAX_COLS = 10; // portrait phone: keep the grid narrow
const MAX_ROWS = 10; // generator target; validator allows up to 12
let best = null;
for (let n = 0; n < 4000; n++) {
  // Start with a long word half the time; otherwise fully random order.
  let order = shuffle(words);
  if (n % 2 === 0) order.sort((a, b) => b.length - a.length + (Math.random() - 0.5) * 3);
  const g = tryBuild(order);
  // Prefer: fewest leftovers, then a portrait-friendly (rows >= cols is fine), compact, many crossings.
  const area = g.rows * g.cols;
  const tooBig = Math.max(0, g.cols - MAX_COLS) + Math.max(0, g.rows - MAX_ROWS);
  const score = -g.leftovers * 1000 - tooBig * 200 + g.crossings * 8 - area - Math.abs(g.cols - g.rows) * 3;
  if (!best || score > best.score) best = { ...g, score };
}

const sorted = words.slice().sort();
const out = {
  title,
  signature: sorted.join("|"),
  rows: best.rows,
  cols: best.cols,
  words: best.placed.map((p) => ({ word: p.word, row: p.row, col: p.col, dir: p.dir })),
};

// Never print a layout that fails validation (see tools/validate-crossword.js).
const check = require("./validate-crossword").validatePuzzle(out);
if (check.errors.length) {
  console.error("Generated layout failed validation:\n  " + check.errors.join("\n  "));
  process.exit(2);
}
check.notes.forEach((n) => console.error("note: " + n));

// ASCII preview to stderr, JSON-ish literal to stdout.
const grid = Array.from({ length: best.rows }, () => Array(best.cols).fill("."));
best.placed.forEach((p) => {
  for (let i = 0; i < p.word.length; i++) {
    const r = p.row + (p.dir === "D" ? i : 0);
    const c = p.col + (p.dir === "A" ? i : 0);
    grid[r][c] = p.word[i].toUpperCase();
  }
});
console.error(grid.map((r) => r.join(" ")).join("\n"));
console.error(`\n${best.rows}x${best.cols}, crossings=${best.crossings}, unconnected=${best.leftovers}`);
// Compact, paste-ready entry for the crosswordPuzzles array in crosswordData.js
console.log(
  [
    "  {",
    `    title: ${JSON.stringify(out.title)},`,
    `    signature: ${JSON.stringify(out.signature)},`,
    `    rows: ${out.rows}, cols: ${out.cols},`,
    "    words: [",
    ...out.words.map((w) => `      { word: "${w.word}", row: ${w.row}, col: ${w.col}, dir: "${w.dir}" },`),
    "    ],",
    "  },",
  ].join("\n")
);
