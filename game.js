// --- APP FLOW ---
function enterApp() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  const splash = document.getElementById("splash-screen");
  splash.style.opacity = "0";
  setTimeout(() => {
    splash.classList.add("hidden");
    document.getElementById("setup-screen").classList.remove("hidden");
  }, 500);
}

// --- STATE MANAGED BY LISTS ---
let lists = [];
let currentListId = null;

let defaultList = {
  id: "list_" + Date.now(),
  name: "List 1",
  words: ["owl", "snow", "cried", "field", "glass", "chain", "queen", "love"],
};

let playList = [];
let currentIndex = 0;
let currentInput = "";
let results = [];
const MAX_ROWS = 20;

// --- SPELL FIXER STATE ---
let fixerMistakes = [];
let fixerCurrentIndex = 0;
let fixerTargetWord = "";
let fixerTypedWord = "";
let fixerFilledSlots = 0;

// --- SPELL FIXER SOUND EFFECTS ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playFixerSound(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  if (type === 'complete') {
    // Victory chord
    [523, 659, 784].forEach((freq, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      o.connect(g);
      g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.15, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);
      o.start(audioCtx.currentTime + (i * 0.08));
      o.stop(audioCtx.currentTime + 1);
    });
  } else if (type === 'error') {
    // Buzzer for wrong tap
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  }
}

// Vibration helper (mobile only)
function vibrateDevice(pattern) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

// --- SPELL FIXER FUNCTIONS ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function speakFixerWord(type) {
  const correctBox = document.getElementById("fixer-correct-box");
  
  if (type === 'correct') {
    speakText(fixerTargetWord.toLowerCase());
    // If peeking, briefly show the word
    if (correctBox.classList.contains("peeking")) {
      correctBox.classList.remove("peeking");
      setTimeout(() => {
        if (fixerFilledSlots > 0 && fixerFilledSlots < fixerTargetWord.length) {
          correctBox.classList.add("peeking");
        }
      }, 1500);
    }
  } else {
    speakText(fixerTypedWord.toLowerCase());
  }
}

function startSpellFixer() {
  // Gather mistakes from results
  fixerMistakes = results.filter(r => !r.correct);
  
  if (fixerMistakes.length === 0) return;
  
  fixerCurrentIndex = 0;
  document.getElementById("spell-fixer").classList.remove("hidden");
  loadFixerWord(0);
}

function loadFixerWord(index) {
  if (index >= fixerMistakes.length) {
    // All done!
    playFixerSound('complete');
    speakText("All fixed! Great job!");
    setTimeout(() => {
      document.getElementById("spell-fixer").classList.add("hidden");
    }, 1500);
    return;
  }
  
  const mistake = fixerMistakes[index];
  fixerTargetWord = mistake.target.toUpperCase();
  fixerTypedWord = mistake.input.toUpperCase();
  fixerFilledSlots = 0;
  
  // Update UI
  document.getElementById("fixer-progress").innerText = `${index + 1} / ${fixerMistakes.length}`;
  document.getElementById("fixer-emoji").innerText = mistake.emoji;
  document.getElementById("fixer-correct").innerText = fixerTargetWord;
  document.getElementById("fixer-typed").innerText = fixerTypedWord;
  
  // Reset peek-a-boo (show correct word for new word)
  document.getElementById("fixer-correct-box").classList.remove("peeking");
  
  // Create slots
  const slotsContainer = document.getElementById("fixer-slots");
  slotsContainer.innerHTML = "";
  for (let i = 0; i < fixerTargetWord.length; i++) {
    const slot = document.createElement("div");
    slot.className = "fixer-slot";
    slot.id = `fixer-slot-${i}`;
    slotsContainer.appendChild(slot);
  }
  
  // Create scrambled blocks
  const blocksContainer = document.getElementById("fixer-blocks");
  blocksContainer.innerHTML = "";
  const letters = shuffleArray(fixerTargetWord.split(""));
  
  letters.forEach((letter) => {
    const block = document.createElement("div");
    block.className = "fixer-block";
    block.innerText = letter;
    block.dataset.letter = letter;
    block.onclick = function() { handleFixerBlockClick(this); };
    blocksContainer.appendChild(block);
  });
  
  // Speak the word
  setTimeout(() => speakText(mistake.target), 300);
}

function handleFixerBlockClick(blockElement) {
  if (blockElement.classList.contains("used")) return;
  
  const clickedLetter = blockElement.dataset.letter;
  const targetLetter = fixerTargetWord[fixerFilledSlots];
  
  if (clickedLetter === targetLetter) {
    // Correct! Speak the letter
    speakLetter(clickedLetter);
    
    // Peek-a-boo: Hide correct word after first letter tap
    if (fixerFilledSlots === 0) {
      document.getElementById("fixer-correct-box").classList.add("peeking");
    }
    
    // Fill the slot
    const slot = document.getElementById(`fixer-slot-${fixerFilledSlots}`);
    slot.innerText = clickedLetter;
    slot.classList.add("filled");
    
    // Hide block
    blockElement.classList.add("used");
    
    fixerFilledSlots++;
    
    // Check if word complete
    if (fixerFilledSlots === fixerTargetWord.length) {
      // Reveal correct word again on completion
      document.getElementById("fixer-correct-box").classList.remove("peeking");
      playFixerSound('complete');
      setTimeout(() => {
        fixerCurrentIndex++;
        loadFixerWord(fixerCurrentIndex);
      }, 800);
    }
  } else {
    // Wrong! Buzz + vibrate
    playFixerSound('error');
    vibrateDevice(100);
    blockElement.classList.add("shake");
    setTimeout(() => {
      blockElement.classList.remove("shake");
    }, 400);
  }
}

// --- INITIALIZATION ---
window.onload = function () {
  loadLists();
  renderListSelector();
  renderSetupList();

  // Pre-load voices slightly to ensure they are ready
  if (window.speechSynthesis) {
    // Chrome needs this event to actually load voices sometimes
    window.speechSynthesis.onvoiceschanged = () => {
      console.log("Voices loaded");
    };
    window.speechSynthesis.getVoices();
  }
};

function getEmoji(word) {
  let w = word.toLowerCase().trim();
  if (typeof emojiMap !== "undefined" && emojiMap[w]) return emojiMap[w];
  if (
    typeof emojiMap !== "undefined" &&
    w.endsWith("s") &&
    emojiMap[w.slice(0, -1)]
  )
    return emojiMap[w.slice(0, -1)];
  return "";
}

// --- LIST MANAGEMENT (LocalStorage) ---
function loadLists() {
  const stored = localStorage.getItem("spellWhizLists");
  if (stored) {
    lists = JSON.parse(stored);
  } else {
    lists = [defaultList];
  }
  if (lists.length > 0) currentListId = lists[0].id;
}

function saveLists() {
  updateCurrentListObject();
  localStorage.setItem("spellWhizLists", JSON.stringify(lists));
}

function updateCurrentListObject() {
  if (!currentListId) return;
  const activeList = lists.find((l) => l.id === currentListId);
  if (!activeList) return;

  const newWords = [];
  const rows = document.getElementById("input-list").children;
  for (let i = 0; i < rows.length; i++) {
    let wVal = document.getElementById(`w_${i}`).value.trim();
    if (wVal) newWords.push(wVal);
  }
  activeList.words = newWords;
}

function renderListSelector() {
  const sel = document.getElementById("list-select");
  sel.innerHTML = "";
  lists.forEach((l) => {
    let opt = document.createElement("option");
    opt.value = l.id;
    opt.innerText = l.name;
    if (l.id === currentListId) opt.selected = true;
    sel.appendChild(opt);
  });
}

function switchList(newId) {
  saveLists();
  currentListId = newId;
  renderSetupList();
}

function createNewList() {
  saveLists();
  const newName = prompt("Name for new list?", "List " + (lists.length + 1));
  if (!newName) return;
  const newList = {
    id: "list_" + Date.now(),
    name: newName,
    words: [], // BLANK BY DEFAULT
  };
  lists.push(newList);
  currentListId = newList.id;
  localStorage.setItem("spellWhizLists", JSON.stringify(lists));
  renderListSelector();
  renderSetupList();

  // Create first empty row automatically for better UX
  addNewRow();
}

function renameList() {
  const l = lists.find((x) => x.id === currentListId);
  if (!l) return;
  const newName = prompt("Rename list:", l.name);
  if (newName) {
    l.name = newName;
    saveLists();
    renderListSelector();
  }
}

function deleteList() {
  if (!confirm("Delete this list?")) return;

  lists = lists.filter((l) => l.id !== currentListId);

  // LOGIC FIX: If all deleted, recreate List 1 (Blank)
  if (lists.length === 0) {
    let resetList = {
      id: "list_" + Date.now(),
      name: "List 1",
      words: [],
    };
    lists.push(resetList);
  }

  currentListId = lists[0].id;
  renderListSelector();
  renderSetupList();

  // If the new list is blank, add one row
  const activeList = lists.find((l) => l.id === currentListId);
  if (activeList.words.length === 0) addNewRow();
  localStorage.setItem("spellWhizLists", JSON.stringify(lists));
}

// --- SETUP UI ---
function renderSetupList() {
  const listDiv = document.getElementById("input-list");
  listDiv.innerHTML = "";
  const activeList = lists.find((l) => l.id === currentListId);
  const words = activeList ? activeList.words : [];
  words.forEach((w, index) => {
    createRowUI(index, w);
  });
  updateAddButtonState();
}

function createRowUI(index, val) {
  let displayE = getEmoji(val) || (val ? "❓" : "");
  let row = document.createElement("div");
  row.className = "input-row";
  row.innerHTML = `
      <span class="row-number">${index + 1}.</span>
      <input type="text" class="input-word" id="w_${index}" value="${val}" enterkeyhint="done" oninput="updateEmoji(${index}); autoSave()">
      <input type="text" class="input-emoji" id="e_${index}" value="${displayE}" placeholder="❓">
      <button class="btn-del-row" onclick="deleteRow(this)">❌</button>
  `;
  document.getElementById("input-list").appendChild(row);
  reIndexRows();
}

function autoSave() {
  updateCurrentListObject();
  localStorage.setItem("spellWhizLists", JSON.stringify(lists));
}

function deleteRow(btn) {
  let row = btn.parentNode;
  row.parentNode.removeChild(row);
  reIndexRows();
  updateAddButtonState();
  autoSave();
}

function reIndexRows() {
  let rows = document.getElementById("input-list").children;
  for (let i = 0; i < rows.length; i++) {
    let row = rows[i];
    row.querySelector(".row-number").innerText = i + 1 + ".";
    row.querySelector(".input-word").id = `w_${i}`;
    row
      .querySelector(".input-word")
      .setAttribute("oninput", `updateEmoji(${i}); autoSave()`);
    row.querySelector(".input-emoji").id = `e_${i}`;
  }
}

function addNewRow() {
  if (document.getElementById("input-list").children.length < MAX_ROWS) {
    createRowUI(document.getElementById("input-list").children.length, "");
    // Scroll to bottom
    let container = document.getElementById("input-list-container");
    container.scrollTop = container.scrollHeight;
  }
  updateAddButtonState();
}

function updateAddButtonState() {
  let count = document.getElementById("input-list").children.length;
  let btn = document.getElementById("btn-add");
  btn.disabled = count >= MAX_ROWS;
  btn.innerText =
    count >= MAX_ROWS ? "Max words reached" : "+ Add Another Word";
}

function updateEmoji(index) {
  let w = document.getElementById(`w_${index}`).value;
  let eBox = document.getElementById(`e_${index}`);
  let match = getEmoji(w);
  if (match) eBox.value = match;
  else if (w.trim().length > 0) eBox.value = "❓";
  else eBox.value = "";
}

// --- GAME LOGIC ---

function initGame() {
  playList = [];
  let rows = document.getElementById("input-list").children;
  for (let i = 0; i < rows.length; i++) {
    let wEl = document.getElementById(`w_${i}`);
    let eEl = document.getElementById(`e_${i}`);
    if (wEl && wEl.value.trim()) {
      let finalEmoji = eEl.value === "❓" ? "📝" : eEl.value;
      playList.push({
        word: wEl.value.trim(),
        emoji: finalEmoji || "📝",
      });
    }
  }
  if (playList.length === 0) return alert("Please type at least one word!");

  let gameDeck = JSON.parse(JSON.stringify(playList));
  gameDeck.sort(() => Math.random() - 0.5);
  currentIndex = 0;
  results = [];
  playList = gameDeck;

  document.getElementById("setup-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");
  loadLevel();
}

function returnToMenu() {
  document.getElementById("game-screen").classList.add("hidden");
  document.getElementById("result-screen").classList.add("hidden");
  document.getElementById("perfect-screen").classList.add("hidden");
  document.getElementById("setup-screen").classList.remove("hidden");
  stopConfetti();
}

function loadLevel() {
  currentInput = "";
  const current = playList[currentIndex];
  document.getElementById("visual-emoji").innerText = current.emoji;
  updateProgressUI();
  renderBlocks();
  // 500ms delay gives the previous letter time to finish before the new word cancels it
  setTimeout(() => speakCurrentWord(), 500);
}

function updateProgressUI() {
  const total = playList.length;
  const currentNum = currentIndex + 1;
  const pct = (currentIndex / total) * 100;
  document.getElementById("progress-fill").style.width = pct + "%";
  document.getElementById(
    "progress-text"
  ).innerText = `${currentNum} / ${total}`;
}

function renderBlocks() {
  const container = document.getElementById("block-area");
  container.innerHTML = "";
  const targetLen = playList[currentIndex].word.length;
  for (let i = 0; i < targetLen; i++) {
    let letter = currentInput[i] || "";
    let block = document.createElement("div");
    block.className = "letter-block";
    if (letter) block.classList.add("filled");
    block.innerText = letter;
    container.appendChild(block);
  }
}

function handleKey(key) {
  const targetWord = playList[currentIndex].word;
  if (key === "DEL") {
    currentInput = currentInput.slice(0, -1);
    renderBlocks();
    return;
  }
  if (currentInput.length < targetWord.length) {
    currentInput += key;
    speakLetter(key);
    // Removed Phonics Hint call
    renderBlocks();
    if (currentInput.length === targetWord.length) setTimeout(commitWord, 300);
  }
}

function commitWord() {
  const target = playList[currentIndex].word.toUpperCase();
  results.push({
    target: target,
    input: currentInput,
    correct: currentInput === target,
    emoji: playList[currentIndex].emoji,
  });
  currentIndex++;
  if (currentIndex < playList.length) loadLevel();
  else showResults();
}

function showResults() {
  document.getElementById("game-screen").classList.add("hidden");

  let score = results.filter((r) => r.correct).length;
  let total = results.length;

  // Perfect Score Logic
  if (score === total && total > 0) {
    const perfectScreen = document.getElementById("perfect-screen");
    perfectScreen.classList.remove("hidden");
    speakText("Spectacular! Perfect Score!");
    startConfetti();

    // Wait 3 seconds then show the normal scorecard
    setTimeout(() => {
      perfectScreen.classList.add("hidden");
      renderScoreCard(score, total);
    }, 3000);
  } else {
    renderScoreCard(score, total);
  }
}

function renderScoreCard(score, total) {
  document.getElementById("result-screen").classList.remove("hidden");

  document.getElementById(
    "final-score"
  ).innerText = `Score: ${score} / ${total}`;

  let msg = document.getElementById("result-message");

  if (score === total) {
    msg.innerText = "🌟 AMAZING! PERFECT SCORE! 🌟";
    startConfetti();
  } else {
    msg.innerText = "Good try! Keep practicing!";
    speakText(`You got ${score} out of ${total}. Good job.`);
  }

  const list = document.getElementById("result-list");
  list.innerHTML = "";
  
  // Count mistakes for clinic button
  const mistakeCount = results.filter(r => !r.correct).length;
  
  results.forEach((res) => {
    const div = document.createElement("div");
    div.className = "result-row";
    div.innerHTML = res.correct
      ? `<span>✅ ${res.emoji} <b>${res.target}</b></span>`
      : `<span>❌ ${res.emoji} <b>${
          res.target
        }</b> <br><span style="font-size:14px; color:#666">you typed: ${
          res.input
        }</span></span><button class="mistake-btn" onclick="speakText('${res.input.toLowerCase()}')">👂 Hear Yours</button>`;
    list.appendChild(div);
  });
  
  // Add Spell Fixer button if there are mistakes
  const fixerContainer = document.getElementById("fixer-btn-container");
  if (mistakeCount > 0) {
    const fixerBtn = document.createElement("button");
    fixerBtn.className = "btn-fixer";
    fixerBtn.innerHTML = `🪄 Fix ${mistakeCount} Mistake${mistakeCount > 1 ? 's' : ''}`;
    fixerBtn.onclick = startSpellFixer;
    fixerContainer.innerHTML = "";
    fixerContainer.appendChild(fixerBtn);
    fixerContainer.classList.remove("hidden");
  } else {
    fixerContainer.classList.add("hidden");
  }
}

// --- AUDIO LOGIC ---
function getBestVoice() {
  const voices = window.speechSynthesis.getVoices();
  
  // 1. Try British Female voices first
  let best = voices.find(
    (v) =>
      v.lang.includes("GB") &&
      (v.name.toLowerCase().includes("female") ||
        v.name.includes("Susan") ||
        v.name.includes("Martha") ||
        v.name.includes("Kate") ||
        v.name.includes("Serena"))
  );
  
  // 2. Try any English Female voice (works for Android "Google UK English Female")
  if (!best) {
    best = voices.find(
      (v) => v.lang.includes("en") && v.name.toLowerCase().includes("female")
    );
  }
  
  // 3. Try voices with female-sounding names on iOS/Safari
  if (!best) {
    best = voices.find(
      (v) => v.lang.includes("en") && 
        (v.name.includes("Samantha") ||  // US Female on iOS
         v.name.includes("Karen") ||      // AU Female on iOS
         v.name.includes("Moira") ||      // IE Female on iOS
         v.name.includes("Fiona") ||      // Scottish Female on iOS
         v.name.includes("Tessa"))        // SA Female on iOS
    );
  }
  
  // 4. Fallback: Any British voice
  if (!best) best = voices.find((v) => v.lang.includes("GB"));
  
  // 5. Last resort: Any English voice
  if (!best) best = voices.find((v) => v.lang.includes("en"));
  
  return best;
}

function speakCurrentWord() {
  speakText(playList[currentIndex].word, 0.9, 1.1);
}

function speakLetter(letter) {
  window.speechSynthesis.cancel();
  let textToSay = letter;
  let rate = 0.8;
  let pitch = 1.0;

  if (typeof phoneticSounds !== "undefined") {
    const data = phoneticSounds[letter.toUpperCase()];
    if (data) {
      textToSay = data.sound;
      if (data.rate) rate = data.rate;
      if (data.pitch) pitch = data.pitch;
    }
  }

  speakText(textToSay, rate, pitch);
}

function speakText(text, rate = 0.8, pitch = 1.0) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-GB";
  u.rate = rate;
  u.pitch = pitch;

  const bestVoice = getBestVoice();
  if (bestVoice) u.voice = bestVoice;

  window.speechSynthesis.speak(u);
}

// --- KEYBOARD & INPUT ---
function renderKeyboard() {
  const kb = document.getElementById("keyboard-area");
  kb.innerHTML = ""; // Clear existing

  const rows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

  rows.forEach((rowChars, index) => {
    let rowDiv = document.createElement("div");
    rowDiv.className = "kb-row";

    for (let char of rowChars) {
      let btn = document.createElement("div");
      btn.className = "key";

      // --- SIMPLIFIED VOWEL/CONSONANT COLORING ---
      if (typeof phoneticSounds !== "undefined") {
        const pData = phoneticSounds[char];
        if (pData) {
          if (pData.isVowel) {
            btn.classList.add("vowel");
          } else {
            btn.classList.add("consonant");
          }
        }
      }

      btn.innerText = char;
      btn.onclick = () => handleKey(char);
      rowDiv.appendChild(btn);
    }

    if (index === 2) {
      let del = document.createElement("div");
      del.className = "key key-del";
      del.innerHTML = "⬅️";
      del.onclick = () => handleKey("DEL");
      rowDiv.appendChild(del);
    }
    kb.appendChild(rowDiv);
  });
}

renderKeyboard();

document.addEventListener("keydown", (e) => {
  if (document.getElementById("game-screen").classList.contains("hidden"))
    return;
  if (e.code === "Space") {
    e.preventDefault();
    speakCurrentWord();
    return;
  }
  const key = e.key.toUpperCase();
  if (key === "BACKSPACE") handleKey("DEL");
  else if (key.length === 1 && key >= "A" && key <= "Z") handleKey(key);
});

// --- CONFETTI ---
const canvas = document.getElementById("confetti");
const ctx = canvas.getContext("2d");
let particles = [];
let animationId = null;

function startConfetti() {
  canvas.classList.remove("hidden");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  particles = [];
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`,
      size: Math.random() * 8 + 4,
      speed: Math.random() * 5 + 2,
      angle: Math.random() * 6.2,
    });
  }
  animateConfetti();
}
function stopConfetti() {
  cancelAnimationFrame(animationId);
  canvas.classList.add("hidden");
}
function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((p, i) => {
    p.y += p.speed;
    p.x += Math.sin(p.angle);
    p.angle += 0.05;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    if (p.y > canvas.height) particles[i].y = -10;
  });
  animationId = requestAnimationFrame(animateConfetti);
}