// --- CROSSWORD CHALLENGE ---
// A pre-generated crossword (see crosswordData.js) is solved one word at a time:
// tap a word in the grid, hear it, then swipe across the letter wheel to spell it.
// The wheel holds exactly the word's letters (shuffled) and every letter must be used.
// Depends on helpers from game.js: lists, currentListId, saveLists, getEmoji,
// speakText, shuffleArray, playFixerSound, vibrateDevice, startConfetti, stopConfetti, audioCtx.

let cw = null; // active puzzle state, null when the screen is closed

const cwEl = (id) => document.getElementById(id);

// --- ENTRY POINT (setup screen button) ---
// Only offered when the words on screen exactly match a pre-generated puzzle,
// so editing a premade list (or making your own) hides the mode.
// Three states:
//  - words match a prepared puzzle        -> button enabled
//  - an originally prepared weekly list, but edited -> button disabled + hint
//  - a custom list                        -> button hidden
function refreshCrosswordButton() {
  const btn = cwEl("btn-crossword");
  const hint = cwEl("cw-hint");
  if (!btn || typeof findCrossword !== "function") return;
  const l = lists.find((x) => x.id === currentListId);
  const playable = !!(l && findCrossword(l.words));
  const original = l && defaultLists.find((d) => d.id === l.id);
  const edited = !playable && !!(original && findCrossword(original.words));
  btn.classList.toggle("hidden", !(playable || edited));
  btn.disabled = !playable;
  hint.classList.toggle("hidden", !edited);
}

function openCrossword() {
  saveLists();
  const l = lists.find((x) => x.id === currentListId);
  const puzzle = l && findCrossword(l.words);
  if (!puzzle) return refreshCrosswordButton();

  const entries = puzzle.words.map((w) => ({
    word: w.word,
    row: w.row,
    col: w.col,
    dir: w.dir,
    solved: false,
    order: null, // shuffled wheel letters, fixed per word until the shuffle button is used
    cells: [],
  }));
  entries.forEach((e) => {
    for (let i = 0; i < e.word.length; i++) {
      e.cells.push([e.row + (e.dir === "D" ? i : 0), e.col + (e.dir === "A" ? i : 0)]);
    }
  });
  // Reading order decides which word comes "next" after one is solved.
  entries.sort((a, b) => a.row - b.row || a.col - b.col || (a.dir === "A" ? -1 : 1));

  cw = {
    puzzle,
    entries,
    rows: puzzle.rows,
    cols: puzzle.cols,
    revealed: new Set(),
    cellEls: new Map(),
    selected: -1,
    tiles: [],
    path: [],
    dragging: false,
    pointer: null,
    finished: false,
  };

  cwEl("setup-screen").classList.add("hidden");
  cwEl("crossword-screen").classList.remove("hidden");
  cwEl("cw-done").classList.add("hidden");
  cwEl("cw-title").innerText = puzzle.title;

  renderCwGrid();
  updateCwProgress();
  cwSelect(0);
  // Measure last: the clue row must have its content so the grid gets only the space left over.
  layoutCrossword();
  buildWheel(cw.entries[cw.selected]); // wheel size may have just changed
}

function exitCrossword() {
  cw = null;
  stopConfetti();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  cwEl("crossword-screen").classList.add("hidden");
  cwEl("setup-screen").classList.remove("hidden");
}

// --- LAYOUT ---
function layoutCrossword() {
  if (!cw) return;
  const screen = cwEl("crossword-screen");
  const W = screen.clientWidth;
  const H = screen.clientHeight;
  const wheel = Math.max(190, Math.min(W - 50, H * 0.37, 320));
  screen.style.setProperty("--cw-wheel", wheel + "px");
  const wrap = cwEl("cw-grid-wrap");
  const cell = Math.floor(
    Math.max(20, Math.min((wrap.clientWidth - 16) / cw.cols, (wrap.clientHeight - 16) / cw.rows, 52))
  );
  screen.style.setProperty("--cw-cell", cell + "px");
}

window.addEventListener("resize", () => {
  if (!cw) return;
  layoutCrossword();
  if (cw.selected >= 0) buildWheel(cw.entries[cw.selected]);
});

// --- GRID ---
function renderCwGrid() {
  const g = cwEl("cw-grid");
  g.innerHTML = "";
  g.style.gridTemplateColumns = `repeat(${cw.cols}, var(--cw-cell))`;
  g.style.gridTemplateRows = `repeat(${cw.rows}, var(--cw-cell))`;
  cw.cellEls = new Map();
  const info = new Map(); // "r,c" -> {r, c, letter}
  cw.entries.forEach((e) => {
    e.cells.forEach(([r, c], i) => {
      const k = r + "," + c;
      if (!info.has(k)) info.set(k, { r, c, letter: e.word[i] });
    });
  });
  info.forEach((v, k) => {
    const el = document.createElement("div");
    el.className = "cw-cell";
    el.style.gridRow = v.r + 1;
    el.style.gridColumn = v.c + 1;
    el.innerHTML = '<span class="cw-letter"></span>';
    el.onclick = () => cwTapCell(k);
    cw.cellEls.set(k, { el, letter: v.letter });
    g.appendChild(el);
  });
}

function updateCwGrid(newKeys) {
  const sel = cw.selected >= 0 ? cw.entries[cw.selected] : null;
  const selKeys = new Set(sel ? sel.cells.map(([r, c]) => r + "," + c) : []);
  cw.cellEls.forEach((v, k) => {
    const shown = cw.revealed.has(k);
    v.el.classList.toggle("revealed", shown);
    v.el.classList.toggle("sel", selKeys.has(k));
    v.el.querySelector(".cw-letter").innerText = shown ? v.letter : "";
  });
  if (newKeys) {
    newKeys.forEach(([k, delay]) => {
      const el = cw.cellEls.get(k).el;
      el.style.animationDelay = delay + "ms";
      el.classList.add("pop");
      setTimeout(() => {
        el.classList.remove("pop");
        el.style.animationDelay = "";
      }, delay + 600);
    });
  }
}

// Tapping a letter square selects the unsolved word running through it.
// Where two words cross, tapping again switches to the other one.
function cwTapCell(key) {
  if (!cw || cw.finished || cw.dragging) return;
  const [r, c] = key.split(",").map(Number);
  const hits = cw.entries
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => !e.solved && e.cells.some(([er, ec]) => er === r && ec === c));
  if (!hits.length) return;
  const other = hits.find((h) => h.i !== cw.selected);
  cwSelect((other || hits[0]).i);
}

function updateCwProgress() {
  const done = cw.entries.filter((e) => e.solved).length;
  cwEl("cw-progress").innerText = `${done}/${cw.entries.length}`;
}

// --- CLUE (picture + the one speaker button) ---
function updateCwClue() {
  const e = cw.entries[cw.selected];
  cwEl("cw-clue-emoji").innerText = e ? getEmoji(e.word) || "📝" : "";
}

function speakCwWord() {
  if (cw && cw.selected >= 0) speakText(cw.entries[cw.selected].word, 0.9, 1.1);
}

// --- SELECTION + WHEEL ---
function cwShuffledLetters(word) {
  const letters = word.split("");
  if (new Set(letters).size < 2) return letters;
  let out;
  let tries = 0;
  do {
    out = shuffleArray(letters.slice());
    tries++;
  } while (out.join("") === word && tries < 20); // never show the word already spelled in order
  return out;
}

function cwSelect(i, speak = true) {
  cw.selected = i;
  const e = cw.entries[i];
  if (!e.order) e.order = cwShuffledLetters(e.word);
  cw.path = [];
  updateCwGrid();
  updateCwClue();
  buildWheel(e);
  setCwPreview("");
  if (speak) speakText(e.word, 0.9, 1.1);
}

function shuffleCwWheel() {
  if (!cw || cw.selected < 0 || cw.dragging) return;
  const e = cw.entries[cw.selected];
  e.order = cwShuffledLetters(e.word);
  buildWheel(e);
}

function buildWheel(entry) {
  const wheel = cwEl("cw-wheel");
  wheel.querySelectorAll(".cw-tile").forEach((t) => t.remove());
  const size = wheel.clientWidth;
  const n = entry.order.length;
  const ts = Math.floor(size * (n <= 7 ? 0.19 : n <= 10 ? 0.165 : 0.15));
  const R = size / 2 - ts / 2 - 6;
  cw.tileSize = ts;
  cw.tiles = entry.order.map((letter, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const cx = size / 2 + R * Math.cos(a);
    const cy = size / 2 + R * Math.sin(a);
    const el = document.createElement("div");
    el.className = "cw-tile";
    el.style.width = el.style.height = ts + "px";
    el.style.left = cx - ts / 2 + "px";
    el.style.top = cy - ts / 2 + "px";
    el.style.fontSize = Math.floor(ts * 0.55) + "px";
    el.innerText = letter;
    wheel.appendChild(el);
    return { letter, cx, cy, el };
  });
  cw.path = [];
  drawCwLine();
}

// --- DRAG / SWIPE ---
function cwHitTile(x, y) {
  let best = null;
  let bestD = cw.tileSize * 0.62;
  cw.tiles.forEach((t) => {
    const d = Math.hypot(t.cx - x, t.cy - y);
    if (d < bestD) {
      best = t;
      bestD = d;
    }
  });
  return best;
}

function cwPointerPos(e) {
  const r = cwEl("cw-wheel").getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function cwAddTile(t) {
  cw.path.push(t);
  t.el.classList.add("on");
  cwBlip(cw.path.length - 1);
  setCwPreview(cw.path.map((p) => p.letter).join(""));
}

function cwPopTile() {
  const t = cw.path.pop();
  if (t) t.el.classList.remove("on");
  setCwPreview(cw.path.map((p) => p.letter).join(""));
}

function drawCwLine() {
  const line = cwEl("cw-line");
  if (!cw || !cw.path.length) {
    line.setAttribute("points", "");
    return;
  }
  const pts = cw.path.map((t) => `${t.cx},${t.cy}`);
  if (cw.dragging && cw.pointer) pts.push(`${cw.pointer.x},${cw.pointer.y}`);
  line.setAttribute("points", pts.join(" "));
  line.setAttribute("stroke-width", Math.floor(cw.tileSize * 0.28));
}

function cwFinishDrag() {
  if (!cw || !cw.dragging) return;
  cw.dragging = false;
  const word = cw.path.map((t) => t.letter).join("");
  cw.tiles.forEach((t) => t.el.classList.remove("on"));
  cw.path = [];
  cw.pointer = null;
  drawCwLine();
  if (word.length < 2) return setCwPreview(""); // a stray tap is not an attempt

  // Correct only if every letter was used to spell the selected word.
  if (word === cw.entries[cw.selected].word) return cwSolve(cw.selected, word);
  playFixerSound("error");
  vibrateDevice(120);
  flashCwPreview(word, "wrong");
}

(function initCwWheel() {
  const wheel = cwEl("cw-wheel");
  wheel.addEventListener("pointerdown", (e) => {
    if (!cw || cw.finished || e.target.closest("#cw-shuffle")) return;
    const p = cwPointerPos(e);
    const t = cwHitTile(p.x, p.y);
    if (!t) return;
    e.preventDefault();
    try {
      wheel.setPointerCapture(e.pointerId); // keeps the swipe alive if the finger leaves the wheel
    } catch (err) {}
    clearTimeout(cw.flashTimer);
    cw.dragging = true;
    cw.path = [];
    cw.pointer = p;
    cwAddTile(t);
    drawCwLine();
  });
  wheel.addEventListener("pointermove", (e) => {
    if (!cw || !cw.dragging) return;
    const p = cwPointerPos(e);
    cw.pointer = p;
    const t = cwHitTile(p.x, p.y);
    if (t) {
      const prev = cw.path[cw.path.length - 2];
      if (t === prev) cwPopTile(); // slid back over the previous letter: undo
      else if (!cw.path.includes(t)) cwAddTile(t);
    }
    drawCwLine();
  });
  wheel.addEventListener("pointerup", cwFinishDrag);
  wheel.addEventListener("pointercancel", cwFinishDrag);
})();

// --- PREVIEW + FEEDBACK ---
function setCwPreview(text) {
  const p = cwEl("cw-preview");
  p.className = "";
  p.innerText = text.toUpperCase();
  p.classList.toggle("idle", !text);
}

function flashCwPreview(word, cls) {
  const p = cwEl("cw-preview");
  p.innerText = word.toUpperCase();
  p.className = cls;
  clearTimeout(cw.flashTimer);
  cw.flashTimer = setTimeout(() => cw && setCwPreview(""), 900);
}

function cwBlip(step) {
  try {
    if (audioCtx.state === "suspended") audioCtx.resume();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.value = 330 * Math.pow(1.122, Math.min(step, 12));
    o.connect(g);
    g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.12, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    o.start();
    o.stop(audioCtx.currentTime + 0.12);
  } catch (e) {}
}

// --- SOLVING ---
function cwSolve(idx, word) {
  const e = cw.entries[idx];
  e.solved = true;
  const fresh = [];
  e.cells.forEach(([r, c], i) => {
    const k = r + "," + c;
    if (!cw.revealed.has(k)) {
      cw.revealed.add(k);
      fresh.push([k, i * 80]);
    }
  });
  updateCwGrid(fresh);
  updateCwProgress();
  flashCwPreview(word, "right");
  playFixerSound("complete");
  speakText(word, 0.9, 1.1);

  if (cw.entries.every((x) => x.solved)) {
    cw.finished = true;
    setTimeout(cwComplete, 1400);
    return;
  }
  // Move to the next unsolved word, then say it once the praise has finished.
  const n = cw.entries.length;
  let next = -1;
  for (let step = 1; step <= n; step++) {
    const j = (idx + step) % n;
    if (!cw.entries[j].solved) {
      next = j;
      break;
    }
  }
  cwSelect(next, false);
  setTimeout(() => {
    if (cw && cw.selected === next && !cw.dragging && !cw.finished) speakCwWord();
  }, 1500);
}

function cwComplete() {
  if (!cw) return;
  cwEl("cw-done").classList.remove("hidden");
  startConfetti();
  speakText("Well done! You solved the whole puzzle!");
}

function replayCrossword() {
  cwEl("cw-done").classList.add("hidden");
  stopConfetti();
  openCrossword();
}
