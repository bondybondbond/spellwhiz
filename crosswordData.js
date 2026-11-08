// Pre-generated crossword layouts for the premade weekly lists.
// Generate a new entry each term with:
//   node tools/gen-crossword.js "Week 8" word1 word2 ...
// and paste the printed block into the array below.
//
// `signature` = the list's words, lowercased, sorted, joined with "|".
// The Crossword button only appears when the list on screen matches a signature,
// so editing a premade list (or making your own) simply hides the mode.
// dir: "A" = across, "D" = down. row/col are 0-based from the top-left.
const crosswordPuzzles = [
  // --- Week 1 ---
  {
    title: "Week 1",
    signature: "every|everybody|eye|fast|funny|runny|saggy|yummy",
    rows: 9, cols: 9,
    words: [
      { word: "everybody", row: 4, col: 0, dir: "A" },
      { word: "saggy", row: 0, col: 4, dir: "D" },
      { word: "fast", row: 1, col: 3, dir: "A" },
      { word: "yummy", row: 0, col: 8, dir: "D" },
      { word: "every", row: 2, col: 0, dir: "D" },
      { word: "eye", row: 2, col: 2, dir: "D" },
      { word: "runny", row: 4, col: 3, dir: "D" },
      { word: "funny", row: 7, col: 1, dir: "A" },
    ],
  },
  // --- Week 2 ---
  {
    title: "Week 2",
    signature: "breezy|father|find|floor|gold|lazy|shiny|spicy",
    rows: 9, cols: 8,
    words: [
      { word: "breezy", row: 8, col: 0, dir: "A" },
      { word: "father", row: 3, col: 1, dir: "D" },
      { word: "spicy", row: 4, col: 5, dir: "D" },
      { word: "shiny", row: 6, col: 3, dir: "A" },
      { word: "lazy", row: 3, col: 7, dir: "D" },
      { word: "find", row: 3, col: 1, dir: "A" },
      { word: "gold", row: 0, col: 4, dir: "D" },
      { word: "floor", row: 1, col: 1, dir: "A" },
    ],
  },
  // --- Week 3 ---
  {
    title: "Week 3",
    signature: "crazy|grass|great|half|hold|simply|smoky|wavy",
    rows: 10, cols: 9,
    words: [
      { word: "simply", row: 4, col: 3, dir: "A" },
      { word: "grass", row: 0, col: 3, dir: "D" },
      { word: "great", row: 2, col: 0, dir: "A" },
      { word: "hold", row: 2, col: 7, dir: "D" },
      { word: "smoky", row: 3, col: 5, dir: "D" },
      { word: "wavy", row: 7, col: 2, dir: "A" },
      { word: "half", row: 6, col: 3, dir: "D" },
      { word: "crazy", row: 1, col: 1, dir: "D" },
    ],
  },
  // --- Week 4 ---
  {
    title: "Week 4",
    signature: "bravely|hour|improve|kind|last|loudly|sadly|slowly",
    rows: 10, cols: 8,
    words: [
      { word: "bravely", row: 4, col: 0, dir: "A" },
      { word: "sadly", row: 0, col: 6, dir: "D" },
      { word: "kind", row: 2, col: 3, dir: "A" },
      { word: "last", row: 0, col: 4, dir: "A" },
      { word: "loudly", row: 4, col: 5, dir: "D" },
      { word: "improve", row: 1, col: 1, dir: "D" },
      { word: "hour", row: 6, col: 3, dir: "A" },
      { word: "slowly", row: 9, col: 0, dir: "A" },
    ],
  },
  // --- Week 5 ---
  {
    title: "Week 5",
    signature: "kindly|many|mind|money|must|normally|quickly|quietly",
    rows: 9, cols: 10,
    words: [
      { word: "must", row: 4, col: 6, dir: "A" },
      { word: "normally", row: 1, col: 6, dir: "D" },
      { word: "mind", row: 1, col: 4, dir: "A" },
      { word: "quietly", row: 0, col: 9, dir: "D" },
      { word: "quickly", row: 6, col: 1, dir: "A" },
      { word: "kindly", row: 8, col: 1, dir: "A" },
      { word: "many", row: 1, col: 4, dir: "D" },
      { word: "money", row: 4, col: 0, dir: "A" },
    ],
  },
  // --- Week 6 ---
  {
    title: "Week 6",
    signature: "knife|knight|knot|know|move|mr|mrs|old",
    rows: 11, cols: 8,
    words: [
      { word: "knife", row: 4, col: 1, dir: "A" },
      { word: "knight", row: 2, col: 3, dir: "D" },
      { word: "knot", row: 7, col: 0, dir: "A" },
      { word: "know", row: 7, col: 0, dir: "D" },
      { word: "old", row: 7, col: 2, dir: "D" },
      { word: "move", row: 1, col: 5, dir: "D" },
      { word: "mrs", row: 1, col: 5, dir: "A" },
      { word: "mr", row: 0, col: 6, dir: "D" },
    ],
  },
  // --- Week 7 ---
  {
    title: "Week 7",
    signature: "knead|kneel|knew|knock|only|parents|pass|past",
    rows: 8, cols: 9,
    words: [
      { word: "parents", row: 3, col: 0, dir: "A" },
      { word: "knock", row: 2, col: 4, dir: "D" },
      { word: "kneel", row: 6, col: 4, dir: "A" },
      { word: "knead", row: 0, col: 1, dir: "D" },
      { word: "only", row: 1, col: 0, dir: "A" },
      { word: "knew", row: 4, col: 7, dir: "D" },
      { word: "pass", row: 0, col: 6, dir: "D" },
      { word: "past", row: 1, col: 5, dir: "A" },
    ],
  },
];

function findCrossword(words) {
  const sig = words.map((w) => w.trim().toLowerCase()).filter(Boolean).sort().join("|");
  return crosswordPuzzles.find((p) => p.signature === sig) || null;
}
