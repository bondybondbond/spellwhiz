# SpellWhiz Dev Learnings

Notes worth remembering across sessions. Add new entries at the top.

---

## 2026-06-07 — Summer 2 lists update

### localStorage version migration
When replacing `defaultLists`, existing users won't see the new lists because
`loadLists()` prefers stored data. Fix: bump `LIST_VERSION` constant in `game.js`
and check it in `loadLists()`. Stale version → reset to defaults. Same version →
leave user data alone. See `de4a2cb`.

### Preview server doesn't handle query-string cache busters
`index.html` loads scripts as `emojiData.js?v=1.21`. The Node static server in
`.claude/launch.json` used to map the full URL (including `?v=...`) as a file
path → 404, scripts silently never ran. Fixed by stripping query params:
`req.url.split('?')[0]`. Always verify `typeof emojiMap !== 'undefined'` after
a preview reload before trusting eval results.

### Apostrophe words (i'm, don't) — three places to patch
Handling `'` in a word requires changes in three functions, not one:
1. `renderBlocks()` — render apostrophe as `.apostrophe-marker` span, not a block
2. `handleKey()` — compare `currentInput.length` against stripped target length
3. `commitWord()` — strip apostrophes from both sides before `===` comparison
Missing any one of the three breaks the feature differently (wrong block count,
input never auto-submits, or correct answer marked wrong).

### `getEmoji()` only strips a trailing -s
The fallback in `getEmoji()` is: strip one trailing `s` and retry. It does NOT
handle -es, -ing, -ed, -er, -est, or compound words. Any derived or inflected
form needs an explicit entry in `emojiMap` — don't rely on the fallback for
anything beyond simple plurals.

### Emoji strategy: per-word meaningful, not formula-based
Avoid modifier conventions like `base + ⏳ = -ing`. Kids don't decode those.
Assign each word the emoji that shows its specific meaning directly — e.g.
`helped → 🙏`, `helper → 🦺`, `playing → 🏃`. The emoji is a memory hook,
not a grammar lesson.

### Duplicate key check before adding emojiMap entries
Run a grep for existing entries before appending. Known entries that already
existed and would have been duplicated: `time`, `football`, `bulb`, `subtract`,
`day` (📅 → overridden to ☀️), `farmyard` (🚜 — left as-is, tractor is good),
`make` (🛠️ — left as-is), `add` (➕ — left as-is).

### `innerHTML = ""` triggers the security hook
The pre-commit hook flags `innerHTML` assignments. Use `container.replaceChildren()`
to clear a container safely — same effect, no hook warning.
