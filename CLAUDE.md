# SpellWhiz

A vanilla JS mobile-first spelling game for kids. No framework, no build step — pure HTML/CSS/JS.

## Key Files
- `emojiData.js` — emoji dictionary (`emojiMap` object) + phonetic data (`phoneticSounds`)
- `game.js` — all game logic, state management, localStorage persistence
- `style.css` — all styles (mobile-first, portrait orientation)
- `index.html` — app shell

## Word & Emoji Format
Words are added to the `emojiMap` object in `emojiData.js`:
```js
word: "🔤",
```
Words are grouped by category with comment headers. Add new spelling-sheet words at the bottom in a new section block.

## Important Notes
- No package.json / no npm — open index.html directly in browser or serve statically
- Words in `emojiMap` keys must be lowercase
- Duplicate keys are silently ignored (last one wins) — avoid them
- `game.js` uses `localStorage` for word lists and scores
