// Validates crossword layouts for SpellWhiz.
//   node tools/validate-crossword.js          -> checks every puzzle in crosswordData.js
// Also imported by gen-crossword.js, which refuses to print a layout that fails.
//
// A layout is valid when:
//  - every listed word is placed in bounds, once, spelled correctly in its cells;
//  - crossing cells agree on the letter, and no two same-direction words overlap;
//  - the grid contains NO accidental words: every run of 2+ adjacent letters is
//    exactly one listed word (this catches words sitting side by side);
//  - `signature` matches the words, and the grid is portrait-friendly.
// Unconnected words are allowed (standalone) but reported as a note.

const MAX_COLS = 10; // portrait phone
const MAX_ROWS = 12;

function validatePuzzle(p) {
  const errors = [];
  const notes = [];
  const cells = new Map(); // "r,c" -> letter
  const across = new Map(); // "r,c" -> word index (across)
  const down = new Map();

  const words = p.words.map((w) => w.word);
  if (new Set(words).size !== words.length) errors.push("duplicate word in puzzle");
  const sig = words.map((w) => w.toLowerCase()).sort().join("|");
  if (sig !== p.signature) errors.push(`signature mismatch (expected "${sig}")`);

  p.words.forEach((w, idx) => {
    if (w.word.length < 2) errors.push(`"${w.word}" is too short`);
    if (w.word !== w.word.toLowerCase()) errors.push(`"${w.word}" must be lowercase`);
    for (let i = 0; i < w.word.length; i++) {
      const r = w.row + (w.dir === "D" ? i : 0);
      const c = w.col + (w.dir === "A" ? i : 0);
      if (r < 0 || c < 0 || r >= p.rows || c >= p.cols) {
        errors.push(`"${w.word}" leaves the ${p.rows}x${p.cols} grid`);
        return;
      }
      const k = r + "," + c;
      if (cells.has(k) && cells.get(k) !== w.word[i]) errors.push(`letter clash at ${k} ("${w.word}")`);
      cells.set(k, w.word[i]);
      const map = w.dir === "A" ? across : down;
      if (map.has(k)) errors.push(`"${w.word}" overlaps another ${w.dir === "A" ? "across" : "down"} word at ${k}`);
      map.set(k, idx);
    }
  });

  // Every run of 2+ letters must be exactly one listed word.
  const checkRuns = (dir) => {
    const map = dir === "A" ? across : down;
    const outer = dir === "A" ? p.rows : p.cols;
    const inner = dir === "A" ? p.cols : p.rows;
    for (let o = 0; o < outer; o++) {
      let start = -1;
      for (let i = 0; i <= inner; i++) {
        const k = dir === "A" ? o + "," + i : i + "," + o;
        const filled = i < inner && cells.has(k);
        if (filled && start < 0) start = i;
        if (!filled && start >= 0) {
          const len = i - start;
          if (len >= 2) {
            const k0 = dir === "A" ? o + "," + start : start + "," + o;
            const idx = map.get(k0);
            const ok = idx !== undefined && p.words[idx].word.length === len && p.words[idx][dir === "A" ? "col" : "row"] === start;
            if (!ok) {
              let text = "";
              for (let j = start; j < i; j++) text += cells.get(dir === "A" ? o + "," + j : j + "," + o);
              errors.push(`accidental ${dir === "A" ? "across" : "down"} run "${text}" at row ${dir === "A" ? o : start}, col ${dir === "A" ? start : o}`);
            }
          }
          start = -1;
        }
      }
    }
  };
  checkRuns("A");
  checkRuns("D");

  if (p.cols > MAX_COLS || p.rows > MAX_ROWS) errors.push(`grid ${p.rows}x${p.cols} exceeds portrait limit ${MAX_ROWS}x${MAX_COLS}`);

  // Connectivity (informational): words are connected if they share a cell.
  const parent = p.words.map((_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const owner = new Map();
  p.words.forEach((w, idx) => {
    for (let i = 0; i < w.word.length; i++) {
      const k = w.row + (w.dir === "D" ? i : 0) + "," + (w.col + (w.dir === "A" ? i : 0));
      if (owner.has(k)) parent[find(idx)] = find(owner.get(k));
      else owner.set(k, idx);
    }
  });
  const groups = new Set(p.words.map((_, i) => find(i))).size;
  if (groups > 1) notes.push(`${groups} separate groups of words (standalone words present)`);

  return { errors, notes };
}

module.exports = { validatePuzzle };

if (require.main === module) {
  const fs = require("fs");
  const path = require("path");
  const src = fs.readFileSync(path.join(__dirname, "..", "crosswordData.js"), "utf8");
  const puzzles = new Function(src + "\nreturn crosswordPuzzles;")();
  let bad = 0;
  puzzles.forEach((p) => {
    const { errors, notes } = validatePuzzle(p);
    console.log(`${errors.length ? "FAIL" : "ok  "}  ${p.title} (${p.words.length} words, ${p.rows}x${p.cols})`);
    errors.forEach((e) => console.log("      ✗ " + e));
    notes.forEach((n) => console.log("      note: " + n));
    bad += errors.length;
  });
  process.exit(bad ? 1 : 0);
}
