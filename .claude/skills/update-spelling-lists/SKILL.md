Update SpellWhiz spelling lists with new words, emojis, git commit, and zip.

Input is typically a screenshot of a spelling sheet — each column maps to a week (e.g. Week 2, Week 3, Week 4). Read the words directly from the image.

If provided as text instead: week label followed by comma-separated words, one week per line.

$ARGUMENTS

## Steps

### 1. Parse the input
- If $ARGUMENTS contains an image, read the words from each column and assign week labels in order (Week 2, Week 3, Week 4 — or as labelled)
- If text, extract each week's label and word list
- Normalise all words to lowercase

### 2. Add missing emojis to `emojiData.js`
- Read `emojiData.js` and collect all words that already have an entry in `emojiMap`
- For every word across all weeks that is NOT already in `emojiMap`, choose an emoji:
  - Pick the most visually obvious / kid-friendly emoji
  - Prefer concrete over abstract (e.g. 🥄 for "spoon", not 🍽️)
  - For abstract words use a representative action or concept emoji
  - Avoid reusing emojis already in the map
- Append all new entries as a block just before the closing `};` of `emojiMap`:
  ```js
    // --- SPELLING SHEET (Week X-Y) ---
    word: "🔤",
  ```
- Skip any words already in the map (note them to the user)

### 3. Update default lists in `game.js`
- Read `game.js` and find the `defaultLists` array (the seed data used when localStorage is empty)
- Replace it entirely with the new weeks provided, preserving the existing format:
  ```js
  let defaultLists = [
    { id: "list_1", name: "Week X", words: ["word1","word2",...] },
    { id: "list_2", name: "Week Y", words: ["word1","word2",...] },
    ...
  ];
  ```

### 4. Verify in preview
- Start (or reuse) the preview server via `preview_start` with config name `spellingwhiz`
- Clear localStorage and reload: `localStorage.removeItem("spellWhizLists"); location.reload();`
- Click through the splash screen to the setup screen
- Use `preview_snapshot` to confirm:
  - The dropdown shows all the new week names
  - The first week's words are listed with emojis (not ❓)
- If anything looks wrong, fix it before continuing

### 5. Commit to git
- Stage only `game.js` and `emojiData.js`
- Commit with message: `Add Week X/Y/Z words and update default lists`
- Push to origin

### 6. Zip up the game
- Check `backup/` for the highest existing `SpellWhiz_v1.XX_*.zip` version number
- Increment by 0.01
- Use a short label describing the change (e.g. `week2-4`, `new-words`)
- Run:
  ```
  powershell Compress-Archive -Path index.html,game.js,emojiData.js,style.css,wizard-mascot.jpg,wizard-perfect.jpg -DestinationPath SpellWhiz_vX.XX_<label>.zip -Force
  ```
- Report the filename and size to the user

## Rules
- All word keys in `emojiMap` must be lowercase
- Do not modify any existing emoji entries
- Do not include `backup/`, `temp/`, `.claude/`, or `CLAUDE.md` in the zip
- If $ARGUMENTS is empty, ask the user to provide the word lists
