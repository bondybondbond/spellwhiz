Add new words to the SpellWhiz emoji dictionary.

Words to add: $ARGUMENTS

## Steps

1. **Read `emojiData.js`** to check which of the requested words already have entries in `emojiMap`. Skip any that already exist (mention them to the user).

2. **Choose an emoji** for each new word:
   - Pick the most visually obvious / kid-friendly emoji
   - Prefer concrete over abstract (e.g. 🥄 for "spoon", not 🍽️)
   - For abstract words use a representative action or concept emoji
   - Avoid reusing emojis already assigned to other words if possible

3. **Add all new entries** as a block at the bottom of `emojiMap`, just before the closing `};`, using this format:
   ```
     // --- SPELLING SHEET (date or label) ---
     word: "🔤",
   ```

4. **Report back** with a table showing: each word, its chosen emoji, and whether it was added or already existed.

## Rules
- Keys must be lowercase
- One emoji per word (a single character/string value)
- Do not modify any existing entries
- If $ARGUMENTS is empty, ask the user to provide the word list
