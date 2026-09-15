const utterance = new SpeechSynthesisUtterance();
let currentAudioIndex = 0;
let Sentences = [];

// Playlist navigation state
let usePlayListMode = false;
let navIndices = [];
let navPos = 0;

let isSpeaking = false;
let isScrambled = false;

// DOM Elements
const speakEnglishBtn = document.getElementById("speakEnglish");
const speakArabicBtn = document.getElementById("speakArabic");
const speakSelectionBtn = document.getElementById("speakSelection");
const stopBtn = document.getElementById("stop");
const scrambleCheckbox = document.getElementById("scrambleCheckbox");
const speakScrambledCheckbox = document.getElementById("speakScrambledCheckbox");

const q = document.getElementById("q");
const refer_to = document.getElementById("refer_to");
const back_to = document.getElementById("back_to");
const speaker = document.getElementById("speaker");
const keyWords = document.getElementById("keyWords");
const def = document.getElementById("def");
const english = document.getElementById("english");
const arabic = document.getElementById("arabic");
const scrambledText = document.getElementById("scrambledText");
const audio = document.getElementById("audio");
const image = document.getElementById("image");
const illustrationDetails = document.getElementById("illustrations");
const questionBasedOnAudio = document.getElementById("questionBasedOnAudio");
const audioIndexInput = document.getElementById("audioIndex");
const autoPlayCheckbox = document.getElementById("autoPlay");

const playList = document.getElementById("playList");
const usePlayListCheckbox = document.getElementById("usePlayList");

const definitionDetails = document.getElementById("definition");
const englishDetails = document.getElementById("englishDetails");
const arabicDetails = document.getElementById("arabicDetails");
const answer = document.getElementById("answer");
const answerDetails = document.getElementById("answerDetails");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");

const speakingIndicator = document.getElementById("speakingIndicator");

// NEW: File selector element
const jsonFileSelect = document.getElementById("jsonFileSelect");

// ========== LOAD DATA FROM JSON ==========
async function loadData(fileName) {
  // fileName should be something like "data.json"
  console.log("Loading JSON file:", fileName, "Page URL:", location.href);

  try {
    const response = await fetch(fileName, { cache: "no-store" });

    console.log("Fetch status:", response.status, response.statusText);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `HTTP ${response.status} ${response.statusText}. Response starts with: ${text.slice(0, 200)}`
      );
    }

    const data = await response.json();
    console.log("Loaded JSON object. Top-level keys:", Object.keys(data || {}));

    // read title from JSON root
    if (data && data.title) {
      document.title = data.title;
      const titleEl = document.getElementById("lessonTitle");
      if (titleEl) titleEl.textContent = data.title;
    }

    Sentences = data.sentences;
    currentAudioIndex = 0;
    navPos = 0;

    if (!Array.isArray(Sentences)) {
      throw new Error("JSON does not contain `sentences` as an array.");
    }

    buildDefaultNav();
    displayData();
  } catch (error) {
    console.error("Error loading JSON file:", error);
    alert("Failed to load lesson data. See console for details.\n\n" + error.message);
  }
}

// NEW: Handle file selection
jsonFileSelect.addEventListener("change", function () {
  if (this.value) {
    // Reset speech synthesis and UI state
    speechSynthesis.cancel();
    isSpeaking = false;
    updateSpeakingUI();

    // Reset playlist mode
    usePlayListCheckbox.checked = false;
    playList.value = "";

    // Load the selected file
    loadData(this.value);
  }
});

// ========== SCRAMBLE FUNCTION ==========
function scrambleWords(text) {
  const words = text.split(" ");
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  return words.join(" ");
}

function toggleScramble() {
  const englishText = english.textContent.trim();
  if (!englishText) return;

  isScrambled = !isScrambled;
  if (isScrambled) {
    scrambledText.textContent = scrambleWords(englishText);
    scrambledText.style.display = "block";
    englishDetails.open = false;
  } else {
    scrambledText.textContent = "";
    scrambledText.style.display = "none";
    speakScrambledCheckbox.checked = false;
  }
}

scrambleCheckbox.addEventListener("change", toggleScramble);

// ========== SPEAK SCRAMBLED FUNCTION WITH PAUSES ==========
function speakScrambledWithPauses() {
  const scrambledTextContent = document.getElementById("scrambledText").textContent.trim();
  if (!scrambledTextContent) {
    alert("Please scramble the text first before speaking.");
    speakScrambledCheckbox.checked = false;
    return;
  }

  const words = scrambledTextContent.split(" ");
  let wordIndex = 0;

  function speakNextWord() {
    if (wordIndex >= words.length) {
      isSpeaking = false;
      updateSpeakingUI();
      return;
    }

    const word = words[wordIndex];
    const utteranceWord = new SpeechSynthesisUtterance(word);
    utteranceWord.lang = "en-US";
    utteranceWord.rate = 0.8;

    utteranceWord.onstart = function () {
      isSpeaking = true;
      updateSpeakingUI();
    };

    utteranceWord.onend = function () {
      wordIndex++;
      setTimeout(speakNextWord, 500);
    };

    speechSynthesis.speak(utteranceWord);
  }

  speechSynthesis.cancel();
  isSpeaking = true;
  updateSpeakingUI();
  speakNextWord();
}

speakScrambledCheckbox.addEventListener("change", function () {
  if (this.checked) {
    speakScrambledWithPauses();
  } else {
    speechSynthesis.cancel();
    isSpeaking = false;
    updateSpeakingUI();
  }
});

function seqRange(input) {
  let seq = input.split("-")[0];
  seq = seq.split(",").map(Number);

  let rnge = input.split(",").pop();
  const startingRange = rnge.split("-")[0];
  const endingRange = rnge.split("-")[1];

  rnge = range(Number(startingRange), Number(endingRange));
  const combined = [...seq, ...rnge];

  return [...new Set(combined)];
}

// ========== LOOKUP TEXT FUNCTION ==========

function lookupText(txt) {
  const numScripts = [];
  const re = new RegExp(`\\b${txt}\\b`);

  for (const [i, sentence] of Sentences.entries()) {
    if (re.test(sentence.english.toLowerCase())) {
      numScripts.push(i);
    }
  }
  if (numScripts.length === 0) {
    alert("There aren't any scripts that contain this keyword ");
    return "alert";
  }

  return numScripts;
}

// ========== PLAYLIST MODE FUNCTIONS ==========

function buildDefaultNav() {
  navIndices = Array.from({ length: Sentences.length }, (_, i) => i);
  navPos = currentAudioIndex;
  usePlayListMode = false;
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function parsePlayListInput(text) {
  const indices = [];
  const seen = new Set();

  if (!text) return [];

  if (text.includes("-") && text.includes(",")) {
    return seqRange(text);
  } else if (text.includes("-")) {
    var tokens = text.split("-").map((t) => t.trim()).filter(Boolean);

    let start = parseInt(tokens[0], 10);
    if (start === 0) start = 1;

    let end = parseInt(tokens[1], 10);

    if (start > end || start === end) {
      alert("the starting range shouldn't be smaller or equal than the end parameter, recheck the provided range");
      return "alert";
    }

    return range(start - 1, end - 1);
  } else if (text.includes(",")) {
    var tokens = text.split(",").map((t) => t.trim()).filter(Boolean);

    tokens.forEach((tok) => {
      const n = parseInt(tok, 10);
      if (!Number.isFinite(n)) return;

      const idx = n - 1;
      if (idx < 0 || idx >= Sentences.length) return;

      if (!seen.has(idx)) {
        seen.add(idx);
        indices.push(idx);
      }
    });

    return indices;
  } else if (typeof text === "string") {
    return lookupText(text.toLowerCase());
  }
}

function enablePlaylistMode() {
  const indices = parsePlayListInput(playList.value);

  // FIXED: your original check used `|| !'alert'` which is always wrong
  if (!indices || indices === "alert" || indices.length === 0) {
    usePlayListCheckbox.checked = false;
    alert("Playlist is empty or invalid. Enter numbers like: 1, 3, 5");
    return;
  }

  usePlayListMode = true;
  navIndices = indices;

  const currentInList = navIndices.indexOf(currentAudioIndex);
  navPos = currentInList >= 0 ? currentInList : 0;

  displayData();
}

function disablePlaylistMode() {
  buildDefaultNav();
  displayData();
}

usePlayListCheckbox.addEventListener("change", function () {
  if (usePlayListCheckbox.checked) {
    enablePlaylistMode();
  } else {
    disablePlaylistMode();
  }
});

playList.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && usePlayListCheckbox.checked) {
    enablePlaylistMode();
  }
});

// ========== SPEAK BUTTONS ==========
speakEnglishBtn.addEventListener("click", function () {
  const s = Sentences[currentAudioIndex];
  if (s && s.english && s.english.trim()) {
    const cleanedText = s.english.replace(/<br\s*\/?>/gi, " ");
    utterance.text = cleanedText;
    utterance.lang = "en-US";
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
    isSpeaking = true;
    updateSpeakingUI();
    utterance.onend = function () {
      isSpeaking = false;
      updateSpeakingUI();
    };
  }
});

speakArabicBtn.addEventListener("click", function () {
  const s = Sentences[currentAudioIndex];
  if (s && s.arabic && s.arabic.trim()) {
    const cleanedText = s.arabic.replace(/<br\s*\/?>/gi, " ");
    utterance.text = cleanedText;
    utterance.lang = "ar-SA";
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
    isSpeaking = true;
    updateSpeakingUI();
    utterance.onend = function () {
      isSpeaking = false;
      updateSpeakingUI();
    };
  }
});

speakSelectionBtn.addEventListener("click", function () {
  const selectedText = window.getSelection().toString().trim();
  if (!selectedText) return;

  utterance.text = selectedText;
  utterance.lang = "en-US";
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
  isSpeaking = true;
  updateSpeakingUI();
  utterance.onend = function () {
    isSpeaking = false;
    updateSpeakingUI();
  };
});

stopBtn.addEventListener("click", function () {
  speechSynthesis.cancel();
  isSpeaking = false;
  updateSpeakingUI();
});

// ========== NAVIGATION ==========
function updateButtonState() {
  prevBtn.disabled = navPos === 0;
  nextBtn.disabled = navPos === navIndices.length - 1;
}

function displayData() {
  if (navPos < 0) navPos = 0;
  if (navPos > navIndices.length - 1) navPos = navIndices.length - 1;

  currentAudioIndex = navIndices[navPos];
  const s = Sentences[currentAudioIndex];

  q.textContent =
    (navPos + 1) + "/" + navIndices.length +
    " (Clip " + (currentAudioIndex + 1) + "/" + Sentences.length + ")";

  refer_to.textContent = s.refer_to || "";
  back_to.textContent = s.back_to || "";

  const referToContainer = document.getElementById("refer_to_container");
  const backToContainer = document.getElementById("back_to_container");

  referToContainer.style.display = s.refer_to && s.refer_to.trim() ? "block" : "none";
  backToContainer.style.display = s.back_to && s.back_to.trim() ? "block" : "none";

  keyWords.innerHTML = s.keyWord || "";
  speaker.innerHTML = s.speaker || "";
  def.innerHTML = s.definition || "";
  english.innerHTML = s.english || "";
  arabic.innerHTML = s.arabic || "";
  audio.src = s.audio || "";
  audio.load();
  answer.innerHTML = s.answer || "";

  scrambledText.textContent = "";
  isScrambled = false;
  scrambleCheckbox.checked = false;
  speakScrambledCheckbox.checked = false;
  scrambledText.style.display = "none";

  questionBasedOnAudio.innerHTML =
    s.audioQuestion && s.audioQuestion.trim()
      ? "<details aria-label='Audio question'><summary>Question</summary>" + s.audioQuestion + "</details>"
      : "";

  answerDetails.style.display = s.answer && s.answer.trim() ? "block" : "none";
  definitionDetails.style.display = s.definition && s.definition.trim() ? "block" : "none";
  englishDetails.style.display = s.english && s.english.trim() ? "block" : "none";
  arabicDetails.style.display = s.arabic && s.arabic.trim() ? "block" : "none";

  if (s.Image && s.Image.trim() !== "" && s.Image !== ".jpg") {
    image.src = s.Image;
    image.style.display = "block";
    illustrationDetails.style.display = "block";
    illustrationDetails.open = false;
  } else {
    image.removeAttribute("src");
    image.style.display = "none";
    illustrationDetails.style.display = "none";
  }

  updateButtonState();
}

function resetDetails() {
  definitionDetails.open = false;
  englishDetails.open = false;
  arabicDetails.open = false;
  answerDetails.open = false;
  illustrationDetails.open = false;
}

function scrollToTop() {
  document.querySelector("main").scrollTo({ top: 0, behavior: "smooth" });
}

function nextSentence() {
  speechSynthesis.cancel();
  isSpeaking = false;

  if (navPos < navIndices.length - 1) {
    navPos++;
    displayData();
    resetDetails();
    scrollToTop();
    if (autoPlayCheckbox.checked) {
      audio.play().catch(function () {});
    }
  }
}

function prevSentence() {
  speechSynthesis.cancel();
  isSpeaking = false;

  if (navPos > 0) {
    navPos--;
    displayData();
    resetDetails();
    scrollToTop();
    if (autoPlayCheckbox.checked) {
      audio.play().catch(function () {});
    }
  }
}

nextBtn.addEventListener("click", nextSentence);
prevBtn.addEventListener("click", prevSentence);

document.getElementById("search").addEventListener("click", function () {
  const entered = parseInt(audioIndexInput.value, 10);
  if (!Number.isFinite(entered)) {
    alert("Enter a valid number.");
    return;
  }

  const idx = entered - 1;

  if (idx < 0 || idx >= Sentences.length) {
    alert("Enter a number between 1 and " + Sentences.length);
    return;
  }

  if (usePlayListCheckbox.checked) {
    const pos = navIndices.indexOf(idx);
    if (pos === -1) {
      alert("That clip is not in your playlist subset.");
      return;
    }
    navPos = pos;
    displayData();
  } else {
    navPos = idx;
    displayData();
  }
});

audioIndexInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    document.getElementById("search").click();
  }
});

document.addEventListener("keydown", function (e) {
  if (e.key === "ArrowRight") nextSentence();
  if (e.key === "ArrowLeft") prevSentence();
});

function updateSpeakingUI() {
  if (isSpeaking) speakingIndicator.classList.add("active");
  else speakingIndicator.classList.remove("active");
}

// Initialize
let touchStartX = 0;

document.addEventListener("touchstart", function (e) {
  touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener("touchend", function (e) {
  const touchEndX = e.changedTouches[0].screenX;

  if (touchEndX < touchStartX - 50) nextSentence();
  if (touchEndX > touchStartX + 50) prevSentence();
});

// Load the default file on page load
loadData("question_answer.json");