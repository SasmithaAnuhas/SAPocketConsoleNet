/**
 * TypeWriter Application Engine
 * High-performance Monkeytype clone specialized for Java learning students.
 */

class TypeWriterApp {
  constructor() {
    // Application State
    this.mode = 'code'; // 'code', 'time', 'words', 'symbols', 'custom'
    this.category = 'all';
    this.difficulty = 'easy';
    this.snippetIndex = 0;
    this.timeLimit = 30; // seconds
    this.wordCount = 25; // count
    this.customCode = '';
    
    // Test Runtime State
    this.isActive = false;
    this.isFinished = false;
    this.startTime = null;
    this.timerInterval = null;
    this.elapsedSeconds = 0;
    
    // Content & Typing Tracker
    this.currentSnippet = null;
    this.lines = []; // Array of strings (for code mode)
    this.charsData = []; // Flattened list of character objects
    this.currentIndex = 0;
    this.totalKeystrokes = 0;
    this.correctKeystrokes = 0;
    this.incorrectKeystrokes = 0;
    this.errorCount = 0;
    
    // Second-by-second analytics for post-test graph
    this.statsHistory = []; // { second, wpm, rawWpm, errors }
    this.errorsPerSecond = 0;

    // DOM Elements Cache
    this.cacheDOMElements();

    // Sound and preferences
    this.theme = localStorage.getItem('typewriter_theme') || 'darcula';
    this.soundProfile = localStorage.getItem('typewriter_sound') || 'cherry-blue';
    this.fontSize = localStorage.getItem('typewriter_fontsize') || 'medium';
    
    // Stats Storage
    this.userStats = JSON.parse(localStorage.getItem('typewriter_stats') || JSON.stringify({
      testsCompleted: 0,
      highWpm: 0,
      totalTimeSeconds: 0,
      totalWords: 0
    }));

    this.init();
  }

  cacheDOMElements() {
    this.wordsContainer = document.getElementById('wordsContainer');
    this.hiddenInput = document.getElementById('hiddenInput');
    this.caret = document.getElementById('smoothCaret');
    this.liveStatsBar = document.getElementById('liveStatsBar');
    this.liveTimerEl = document.getElementById('liveTimer');
    this.liveWpmEl = document.getElementById('liveWpm');
    this.liveAccEl = document.getElementById('liveAcc');
    this.snippetBanner = document.getElementById('snippetMetaBanner');
    this.snippetTitleEl = document.getElementById('snippetTitle');
    this.snippetDiffEl = document.getElementById('snippetDifficulty');
    this.snippetExpEl = document.getElementById('snippetExplanation');
    
    // Modals
    this.resultsModal = document.getElementById('resultsModal');
    this.settingsModal = document.getElementById('settingsModal');
    this.customModal = document.getElementById('customCodeModal');
    this.statsModal = document.getElementById('statsModal');
    this.leaderboardModal = document.getElementById('leaderboardModal');

    // Google Auth & Leaderboard UI
    this.openLeaderboardBtn = document.getElementById('openLeaderboardBtn');
    this.loginGoogleBtn = document.getElementById('loginGoogleBtn');
    this.logoutBtn = document.getElementById('logoutBtn');
    this.userProfileBadge = document.getElementById('userProfileBadge');
    this.userAvatarImg = document.getElementById('userAvatarImg');
    this.userDisplayName = document.getElementById('userDisplayName');
    this.userRankPill = document.getElementById('userRankPill');

    this.leaderboardTbody = document.getElementById('leaderboardTbody');
    this.spotlightAvatar = document.getElementById('spotlightAvatar');
    this.spotlightPlayerName = document.getElementById('spotlightPlayerName');
    this.spotlightSubText = document.getElementById('spotlightSubText');
    this.spotlightRankVal = document.getElementById('spotlightRankVal');
    this.spotlightWpmVal = document.getElementById('spotlightWpmVal');

    this.resRankText = document.getElementById('resRankText');
    this.resLoginGoogleBtn = document.getElementById('resLoginGoogleBtn');
  }

  init() {
    this.applyTheme(this.theme);
    this.applyFontSize(this.fontSize);
    
    if (window.soundEffects) {
      window.soundEffects.setProfile(this.soundProfile);
    }

    const diffEl = document.getElementById('difficultySelect');
    if (diffEl) {
      diffEl.value = 'easy';
    }

    this.setupEventListeners();
    this.setupLightDismissFallbacks();
    this.setupAuthAndLeaderboard();
    this.loadSnippetOrMode(false);
  }

  /* -------------------------------------------------------------
   * Setup & Event Listeners
   * ----------------------------------------------------------- */
  setupEventListeners() {
    // Focus handling: ensure typing box is focused on click
    if (this.wordsContainer) {
      this.wordsContainer.addEventListener('click', () => this.focusInput());
    }
    const typingArena = document.querySelector('.typing-arena-wrapper');
    if (typingArena) {
      typingArena.addEventListener('click', (e) => {
        if (!e.target.closest('button, select, input, textarea, a, dialog')) {
          this.focusInput();
        }
      });
    }

    if (this.hiddenInput) {
      this.hiddenInput.addEventListener('keydown', (e) => {
        // Prevent tab from navigating away from typing input
        if (e.key === 'Tab') {
          e.preventDefault();
          this.retrySameSnippet();
        }
      });

      this.hiddenInput.addEventListener('focus', () => {
        this.ensureCaret();
        if (this.caret) this.caret.style.display = 'block';
      });

      this.hiddenInput.addEventListener('blur', () => {
        // Keep caret visible and blinking in the typing box area
        this.ensureCaret();
        if (this.caret) this.caret.style.display = 'block';
      });
    }

    // Keystroke typing listener
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Mode Selector Pills
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const selectedMode = e.currentTarget.dataset.mode;
        this.setMode(selectedMode);
      });
    });

    // Category Selector
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        this.category = e.target.value;
        this.snippetIndex = 0;
        this.loadSnippetOrMode(false);
      });
    }

    // Difficulty Selector
    const difficultySelect = document.getElementById('difficultySelect');
    if (difficultySelect) {
      difficultySelect.addEventListener('change', (e) => {
        this.difficulty = e.target.value;
        this.snippetIndex = 0;
        this.loadSnippetOrMode(false);
      });
    }

    // Time limit pills
    document.querySelectorAll('.time-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.time-pill').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.timeLimit = parseInt(e.currentTarget.dataset.time, 10);
        this.resetTest();
      });
    });

    // Word count pills
    document.querySelectorAll('.words-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.words-pill').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.wordCount = parseInt(e.currentTarget.dataset.words, 10);
        this.resetTest();
      });
    });

    // Restart buttons (Retries the exact same code mid-session or anytime)
    document.querySelectorAll('.js-restart-btn, #restartBtn, #bannerRestartBtn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.retrySameSnippet();
      });
    });

    // Next snippet buttons (Advances to the next code snippet mid-session or anytime)
    document.querySelectorAll('.js-next-btn, #nextSnippetBtn, #bannerNextBtn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.nextSnippet();
      });
    });

    // Modal buttons
    document.getElementById('openSettingsBtn').addEventListener('click', () => {
      this.openModal(this.settingsModal);
    });

    document.getElementById('openStatsBtn').addEventListener('click', () => {
      this.renderUserStatsModal();
      this.openModal(this.statsModal);
    });

    // Leaderboard button
    if (this.openLeaderboardBtn) {
      this.openLeaderboardBtn.addEventListener('click', () => {
        this.openModal(this.leaderboardModal);
      });
    }

    // Google Sign-in button (top nav)
    if (this.loginGoogleBtn) {
      this.loginGoogleBtn.addEventListener('click', async () => {
        if (window.typeWriterAuth) {
          await window.typeWriterAuth.login();
        }
      });
    }

    // Google Sign-in button (results banner)
    if (this.resLoginGoogleBtn) {
      this.resLoginGoogleBtn.addEventListener('click', async () => {
        if (window.typeWriterAuth) {
          const user = await window.typeWriterAuth.login();
          if (user && this.lastFinishedStats) {
            await window.typeWriterAuth.submitScore(
              this.lastFinishedStats.wpm,
              this.lastFinishedStats.acc,
              this.lastFinishedStats.rank.title,
              this.lastFinishedStats.rank.badge
            );
          }
        }
      });
    }

    // Logout button
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', async () => {
        if (window.typeWriterAuth) {
          await window.typeWriterAuth.logout();
        }
      });
    }

    const openCustomBtn = document.getElementById('openCustomBtn');
    if (openCustomBtn) {
      openCustomBtn.addEventListener('click', () => {
        this.openModal(this.customModal);
      });
    }

    // Custom code apply button
    document.getElementById('applyCustomCodeBtn').addEventListener('click', () => {
      const code = document.getElementById('customCodeTextarea').value.trim();
      if (code) {
        this.customCode = code;
        this.setMode('custom');
        this.customModal.close();
      }
    });

    // Results modal buttons
    document.getElementById('resultsRestartBtn').addEventListener('click', () => {
      this.resultsModal.close();
      this.retrySameSnippet();
    });

    document.getElementById('resultsNextBtn').addEventListener('click', () => {
      this.resultsModal.close();
      this.nextSnippet();
    });

    // Theme selector cards
    document.querySelectorAll('.theme-card-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const theme = e.currentTarget.dataset.theme;
        this.applyTheme(theme);
      });
    });

    // Sound selector
    const soundSelect = document.getElementById('soundSelect');
    if (soundSelect) {
      soundSelect.value = this.soundProfile;
      soundSelect.addEventListener('change', (e) => {
        this.soundProfile = e.target.value;
        localStorage.setItem('typewriter_sound', this.soundProfile);
        if (window.soundEffects) {
          window.soundEffects.setProfile(this.soundProfile);
        }
      });
    }

    // Font size selector
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    if (fontSizeSelect) {
      fontSizeSelect.value = this.fontSize;
      fontSizeSelect.addEventListener('change', (e) => {
        this.applyFontSize(e.target.value);
      });
    }

    // Window resize -> reposition caret accurately
    window.addEventListener('resize', () => {
      this.updateCaretPosition();
    });
  }

  /* -------------------------------------------------------------
   * Light-Dismiss Fallback (Modern Web Guidance Compliance)
   * ----------------------------------------------------------- */
  setupLightDismissFallbacks() {
    const dialogs = document.querySelectorAll('dialog');
    dialogs.forEach(dialog => {
      if (!('closedBy' in HTMLDialogElement.prototype)) {
        dialog.addEventListener('click', (event) => {
          if (event.target !== dialog) return;
          const rect = dialog.getBoundingClientRect();
          const isDialogContent = (
            rect.top <= event.clientY &&
            event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX &&
            event.clientX <= rect.left + rect.width
          );
          if (!isDialogContent) dialog.close();
        });
      }
    });
  }

  openModal(modal) {
    if (!modal) return;
    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }
  }

  /* -------------------------------------------------------------
   * Modes & Snippet Selection
   * ----------------------------------------------------------- */
  setMode(mode) {
    this.mode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    // Toggle sub-bars (time vs words vs code categories)
    document.getElementById('timeSubBar').style.display = mode === 'time' ? 'flex' : 'none';
    document.getElementById('wordsSubBar').style.display = mode === 'words' ? 'flex' : 'none';
    document.getElementById('codeSubBar').style.display = (mode === 'code' || mode === 'symbols') ? 'flex' : 'none';
    
    this.loadSnippetOrMode();
  }

  loadSnippetOrMode(advanceNext = false) {
    this.resetTestState();

    if (this.mode === 'code') {
      const candidates = filterSnippets(this.category, this.difficulty);
      const list = candidates.length > 0 ? candidates : JAVA_SNIPPETS;

      if (advanceNext) {
        this.snippetIndex = (this.snippetIndex + 1) % list.length;
      } else if (typeof this.snippetIndex !== 'number' || this.snippetIndex < 0 || this.snippetIndex >= list.length) {
        this.snippetIndex = 0;
      }

      this.currentSnippet = list[this.snippetIndex];
      this.renderSnippet(this.currentSnippet);
      this.snippetBanner.style.display = 'flex';
      this.updateSnippetBanner(this.currentSnippet);
    } else if (this.mode === 'symbols') {
      const symbolsSnippets = JAVA_SNIPPETS.filter(s => s.category === 'symbols');
      const list = symbolsSnippets.length > 0 ? symbolsSnippets : JAVA_SNIPPETS;
      if (advanceNext) {
        this.snippetIndex = (this.snippetIndex + 1) % list.length;
      } else if (typeof this.snippetIndex !== 'number' || this.snippetIndex < 0 || this.snippetIndex >= list.length) {
        this.snippetIndex = 0;
      }
      this.currentSnippet = list[this.snippetIndex] || JAVA_SNIPPETS[0];
      this.renderSnippet(this.currentSnippet);
      this.snippetBanner.style.display = 'flex';
      this.updateSnippetBanner(this.currentSnippet);
    } else if (this.mode === 'time') {
      this.currentSnippet = null;
      this.snippetBanner.style.display = 'none';
      const text = generateJavaWords(80);
      this.renderContinuousText(text);
    } else if (this.mode === 'words') {
      this.currentSnippet = null;
      this.snippetBanner.style.display = 'none';
      const text = generateJavaWords(this.wordCount);
      this.renderContinuousText(text);
    } else if (this.mode === 'custom') {
      this.snippetBanner.style.display = 'flex';
      this.currentSnippet = {
        title: 'Custom Java Snippet',
        difficulty: 'Custom',
        explanation: 'Custom Java code provided by the user for personalized speed and muscle memory training.',
        code: this.customCode || 'public class Test {\n    public static void main(String[] args) {\n        System.out.println("Custom Code!");\n    }\n}'
      };
      this.renderSnippet(this.currentSnippet);
      this.updateSnippetBanner(this.currentSnippet);
    }

    this.focusInput();
    this.updateCaretPosition();
    requestAnimationFrame(() => this.updateCaretPosition());
  }

  // Retry the exact same code snippet without changing it
  retrySameSnippet() {
    this.resetTestState();
    if (this.currentSnippet && (this.mode === 'code' || this.mode === 'symbols' || this.mode === 'custom')) {
      this.renderSnippet(this.currentSnippet);
      this.snippetBanner.style.display = 'flex';
      this.updateSnippetBanner(this.currentSnippet);
      this.focusInput();
      this.updateCaretPosition();
      requestAnimationFrame(() => this.updateCaretPosition());
    } else {
      this.loadSnippetOrMode(false);
    }
  }

  // Advance to the next code snippet in sequence
  nextSnippet() {
    this.loadSnippetOrMode(true);
  }

  updateSnippetBanner(snippet) {
    if (!snippet) return;
    this.snippetTitleEl.textContent = snippet.title;
    this.snippetDiffEl.textContent = snippet.difficulty;
    this.snippetDiffEl.className = 'difficulty-tag ' + snippet.difficulty.toLowerCase();
    this.snippetExpEl.textContent = snippet.explanation || '';
  }

  /* -------------------------------------------------------------
   * DOM Rendering for Code & Continuous Text
   * ----------------------------------------------------------- */
  renderSnippet(snippet) {
    this.wordsContainer.innerHTML = '';
    this.charsData = [];
    this.currentIndex = 0;

    const wrapper = document.createElement('div');
    wrapper.className = 'code-lines-wrapper';

    const lines = snippet.code.replace(/\r\n/g, '\n').split('\n');
    this.lines = lines;

    lines.forEach((lineText, lineIdx) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'code-line';
      lineEl.dataset.lineIndex = lineIdx;

      // Line number
      const lineNum = document.createElement('span');
      lineNum.className = 'line-number';
      lineNum.textContent = (lineIdx + 1);
      lineEl.appendChild(lineNum);

      // Line content
      const contentEl = document.createElement('span');
      contentEl.className = 'line-content';

      // Parse characters of the line
      for (let charIdx = 0; charIdx < lineText.length; charIdx++) {
        const char = lineText[charIdx];
        const charSpan = document.createElement('span');
        charSpan.className = 'char';
        charSpan.textContent = char;
        if (char === ' ') {
          charSpan.classList.add('space');
        }
        contentEl.appendChild(charSpan);

        this.charsData.push({
          char: char,
          element: charSpan,
          lineIndex: lineIdx,
          isNewline: false,
          isLeadingIndent: this.isIndexLeadingIndent(lineText, charIdx)
        });
      }

      // Add virtual newline at the end of line (unless last line)
      if (lineIdx < lines.length - 1) {
        const newlineSpan = document.createElement('span');
        newlineSpan.className = 'char newline';
        newlineSpan.textContent = ' ↵';
        contentEl.appendChild(newlineSpan);

        this.charsData.push({
          char: '\n',
          element: newlineSpan,
          lineIndex: lineIdx,
          isNewline: true,
          isLeadingIndent: false
        });
      }

      lineEl.appendChild(contentEl);
      wrapper.appendChild(lineEl);
    });

    this.wordsContainer.appendChild(wrapper);
    this.ensureCaret();
    this.updateLiveStats();
    
    // Auto-skip leading indent on first line if any
    this.checkAndSkipLeadingIndent();
  }

  renderContinuousText(text) {
    this.wordsContainer.innerHTML = '';
    this.charsData = [];
    this.currentIndex = 0;

    const words = text.split(' ');
    words.forEach((word, wIdx) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'word';
      wordSpan.style.display = 'inline-block';
      wordSpan.style.marginRight = '0.55em';

      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        const charSpan = document.createElement('span');
        charSpan.className = 'char';
        charSpan.textContent = char;
        wordSpan.appendChild(charSpan);

        this.charsData.push({
          char: char,
          element: charSpan,
          lineIndex: 0,
          isNewline: false,
          isLeadingIndent: false
        });
      }

      // Add trailing space if not last word
      if (wIdx < words.length - 1) {
        const spaceSpan = document.createElement('span');
        spaceSpan.className = 'char space';
        spaceSpan.textContent = ' ';
        wordSpan.appendChild(spaceSpan);

        this.charsData.push({
          char: ' ',
          element: spaceSpan,
          lineIndex: 0,
          isNewline: false,
          isLeadingIndent: false
        });
      }

      this.wordsContainer.appendChild(wordSpan);
    });

    this.ensureCaret();
    this.updateLiveStats();
  }

  isIndexLeadingIndent(line, charIdx) {
    for (let i = 0; i < charIdx; i++) {
      if (line[i] !== ' ' && line[i] !== '\t') return false;
    }
    return line[charIdx] === ' ' || line[charIdx] === '\t';
  }

  // Smart Indent Helper: Automatically marks leading indentation as correct
  // so students don't need to manually press spacebar 4, 8, or 12 times per line!
  checkAndSkipLeadingIndent() {
    while (
      this.currentIndex < this.charsData.length &&
      this.charsData[this.currentIndex].isLeadingIndent
    ) {
      const cur = this.charsData[this.currentIndex];
      cur.element.classList.add('correct');
      cur.state = 'correct';
      this.currentIndex++;
    }
    this.updateCaretPosition();
  }

  /* -------------------------------------------------------------
   * Keystroke Processing & Engine
   * ----------------------------------------------------------- */
  handleKeyDown(e) {
    // If user is focused on an input, select, or textarea (e.g. custom code), don't intercept typing
    if (e.target && ['TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
      return;
    }
    if (e.target && e.target.tagName === 'INPUT' && e.target !== this.hiddenInput) {
      return;
    }

    // Check if results modal is open -> allow Tab/r to retry same code, Enter to advance to next
    if (this.resultsModal.open) {
      if (e.key === 'Tab' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        this.resultsModal.close();
        this.retrySameSnippet();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        this.resultsModal.close();
        this.nextSnippet();
        return;
      }
      return;
    }

    // Check if other modals are open
    if (this.settingsModal.open || this.customModal.open || this.statsModal.open || this.leaderboardModal?.open) {
      return;
    }

    // Shortcut: Tab or Escape -> Instant Restart/Retry of same code (works anytime, including mid-session!)
    if (e.key === 'Tab' || e.key === 'Escape') {
      e.preventDefault();
      this.retrySameSnippet();
      return;
    }

    // Shortcut: Ctrl+Enter, Alt+Enter, or Alt+ArrowRight -> Switch to next code (works anytime, including mid-session!)
    if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey || e.altKey)) ||
        (e.key === 'ArrowRight' && (e.altKey || e.ctrlKey)) ||
        (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      this.nextSnippet();
      return;
    }

    // Prevent scrolling on Space or Arrow keys inside words container
    if ([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(e.key)) {
      e.preventDefault();
    }

    // Ignore non-printable modifier keys
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Escape', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      return;
    }

    if (this.isFinished) return;

    // Start test on first valid keydown
    if (!this.isActive) {
      this.startTest();
    }

    this.resetCaretBlink();

    // Handle Backspace
    if (e.key === 'Backspace') {
      this.handleBackspace(e.ctrlKey || e.metaKey);
      return;
    }

    // Expected current character
    if (this.currentIndex >= this.charsData.length) {
      this.finishTest();
      return;
    }

    const target = this.charsData[this.currentIndex];
    let typedKey = e.key;
    if (typedKey === 'Enter') {
      typedKey = '\n';
    }

    this.totalKeystrokes++;

    // Check Match
    const isMatch = (typedKey === target.char);

    if (isMatch) {
      this.correctKeystrokes++;
      target.element.classList.remove('incorrect');
      target.element.classList.add('correct');
      target.state = 'correct';

      if (window.soundEffects) {
        window.soundEffects.playKeySound(typedKey === ' ', typedKey === '\n', false);
      }

      this.currentIndex++;

      // If we just entered a new line, automatically skip leading whitespace!
      if (typedKey === '\n') {
        this.checkAndSkipLeadingIndent();
      }

    } else {
      this.incorrectKeystrokes++;
      this.errorCount++;
      this.errorsPerSecond++;
      target.element.classList.remove('correct');
      target.element.classList.add('incorrect');
      target.state = 'incorrect';

      if (window.soundEffects) {
        window.soundEffects.playKeySound(typedKey === ' ', typedKey === '\n', true);
      }

      this.currentIndex++;
    }

    this.updateCaretPosition();
    this.updateLiveStats();

    // Check if test completed (for code/words modes)
    if (this.currentIndex >= this.charsData.length) {
      this.finishTest();
    }
  }

  handleBackspace(isWordDelete = false) {
    if (this.currentIndex <= 0) return;

    // If previous character was auto-skipped leading indent, skip back past all indents
    let prev = this.charsData[this.currentIndex - 1];
    while (prev && prev.isLeadingIndent && this.currentIndex > 0) {
      prev.element.classList.remove('correct', 'incorrect');
      delete prev.state;
      this.currentIndex--;
      prev = this.charsData[this.currentIndex - 1];
    }

    if (this.currentIndex <= 0) return;

    this.currentIndex--;
    const cur = this.charsData[this.currentIndex];
    cur.element.classList.remove('correct', 'incorrect');
    delete cur.state;

    if (window.soundEffects) {
      window.soundEffects.playKeySound(false, false, false);
    }

    this.updateCaretPosition();
    this.updateLiveStats();
  }

  /* -------------------------------------------------------------
   * Caret Positioning & Auto-Scroll
   * ----------------------------------------------------------- */
  ensureCaret() {
    if (!this.caret || !this.wordsContainer.contains(this.caret)) {
      let caretEl = document.getElementById('smoothCaret');
      if (!caretEl) {
        caretEl = document.createElement('div');
        caretEl.className = 'smooth-caret blink';
        caretEl.id = 'smoothCaret';
      }
      this.wordsContainer.appendChild(caretEl);
      this.caret = caretEl;
    }
    this.caret.style.display = 'block';
  }

  resetCaretBlink() {
    if (!this.caret) return;
    this.caret.classList.remove('blink');
    if (this._blinkTimeout) clearTimeout(this._blinkTimeout);
    this._blinkTimeout = setTimeout(() => {
      if (this.caret) {
        this.caret.classList.add('blink');
      }
    }, 450);
  }

  updateCaretPosition() {
    this.ensureCaret();
    if (!this.caret) return;

    const cur = this.charsData[this.currentIndex];
    if (!cur || !cur.element) {
      // Caret at the end of last character
      const last = this.charsData[this.charsData.length - 1];
      if (last && last.element) {
        const rect = last.element.getBoundingClientRect();
        const containerRect = this.wordsContainer.getBoundingClientRect();
        this.caret.style.left = `${Math.round(rect.right - containerRect.left + this.wordsContainer.scrollLeft)}px`;
        this.caret.style.top = `${Math.round(rect.top - containerRect.top + this.wordsContainer.scrollTop)}px`;
        this.caret.style.height = `${Math.round(rect.height || 26)}px`;
        this.caret.style.display = 'block';
      }
      return;
    }

    const rect = cur.element.getBoundingClientRect();
    const containerRect = this.wordsContainer.getBoundingClientRect();

    const targetLeft = rect.left - containerRect.left + this.wordsContainer.scrollLeft;
    const targetTop = rect.top - containerRect.top + this.wordsContainer.scrollTop;

    this.caret.style.left = `${Math.round(targetLeft)}px`;
    this.caret.style.top = `${Math.round(targetTop)}px`;
    this.caret.style.height = `${Math.round(rect.height || 26)}px`;
    this.caret.style.display = 'block';

    // Smooth auto-scroll if caret moves below viewing window
    const relativeY = rect.top - containerRect.top;
    if (relativeY > containerRect.height - 70) {
      this.wordsContainer.scrollTop += 60;
    } else if (relativeY < 30 && this.wordsContainer.scrollTop > 0) {
      this.wordsContainer.scrollTop = Math.max(0, this.wordsContainer.scrollTop - 60);
    }
  }

  focusInput() {
    if (this.hiddenInput) {
      this.hiddenInput.focus();
    }
    this.ensureCaret();
    if (this.caret) {
      this.caret.style.display = 'block';
    }
  }

  /* -------------------------------------------------------------
   * Timer & Real-time Live Stats
   * ----------------------------------------------------------- */
  startTest() {
    this.isActive = true;
    this.isFinished = false;
    this.startTime = performance.now();
    this.elapsedSeconds = 0;
    this.statsHistory = [];
    this.errorsPerSecond = 0;

    this.timerInterval = setInterval(() => {
      this.elapsedSeconds++;
      
      const currentWpm = this.calculateWpm();
      const currentRaw = this.calculateRawWpm();

      this.statsHistory.push({
        second: this.elapsedSeconds,
        wpm: currentWpm,
        rawWpm: currentRaw,
        errors: this.errorsPerSecond
      });
      this.errorsPerSecond = 0;

      // Check time limit for timed mode
      if (this.mode === 'time') {
        const remaining = Math.max(0, this.timeLimit - this.elapsedSeconds);
        this.liveTimerEl.textContent = `${remaining}s`;
        if (remaining <= 0) {
          this.finishTest();
        }
      } else {
        this.liveTimerEl.textContent = `${this.elapsedSeconds}s`;
      }

      this.updateLiveStats();
    }, 1000);
  }

  calculateWpm() {
    if (this.elapsedSeconds <= 0) return 0;
    const minutes = this.elapsedSeconds / 60;
    return Math.round((this.correctKeystrokes / 5) / minutes) || 0;
  }

  calculateRawWpm() {
    if (this.elapsedSeconds <= 0) return 0;
    const minutes = this.elapsedSeconds / 60;
    return Math.round((this.totalKeystrokes / 5) / minutes) || 0;
  }

  calculateAccuracy() {
    if (this.totalKeystrokes <= 0) return 100;
    return Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100);
  }

  updateLiveStats() {
    const wpm = this.calculateWpm();
    const acc = this.calculateAccuracy();
    this.liveWpmEl.textContent = `${wpm}`;
    this.liveAccEl.textContent = `${acc}%`;
  }

  resetTestState() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this._blinkTimeout) {
      clearTimeout(this._blinkTimeout);
      this._blinkTimeout = null;
    }
    this.isActive = false;
    this.isFinished = false;
    this.startTime = null;
    this.elapsedSeconds = 0;
    this.currentIndex = 0;
    this.totalKeystrokes = 0;
    this.correctKeystrokes = 0;
    this.incorrectKeystrokes = 0;
    this.errorCount = 0;
    this.statsHistory = [];
    this.errorsPerSecond = 0;

    if (this.hiddenInput) {
      this.hiddenInput.value = '';
    }

    if (this.mode === 'time') {
      this.liveTimerEl.textContent = `${this.timeLimit}s`;
    } else {
      this.liveTimerEl.textContent = '0s';
    }
    this.liveWpmEl.textContent = '0';
    this.liveAccEl.textContent = '100%';

    if (this.wordsContainer) {
      this.wordsContainer.scrollTop = 0;
    }
  }

  resetTest() {
    this.retrySameSnippet();
  }

  /* -------------------------------------------------------------
   * Finish Test & Post-Test Analytics
   * ----------------------------------------------------------- */
  finishTest() {
    if (this.isFinished) return;
    this.isFinished = true;
    this.isActive = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    const finalWpm = this.calculateWpm();
    const finalRawWpm = this.calculateRawWpm();
    const finalAcc = this.calculateAccuracy();
    const totalTime = Math.max(1, this.elapsedSeconds);

    // Play completion chime
    if (window.soundEffects) {
      window.soundEffects.playCompleteChime();
    }

    // Save to user stats
    this.saveUserStats(finalWpm, totalTime);

    // Open Results Modal
    this.showResultsModal(finalWpm, finalRawWpm, finalAcc, totalTime);
  }

  saveUserStats(wpm, timeSeconds) {
    this.userStats.testsCompleted = (this.userStats.testsCompleted || 0) + 1;
    if (wpm > (this.userStats.highWpm || 0)) {
      this.userStats.highWpm = wpm;
    }
    this.userStats.totalTimeSeconds = (this.userStats.totalTimeSeconds || 0) + timeSeconds;
    this.userStats.totalWords = (this.userStats.totalWords || 0) + Math.round(this.correctKeystrokes / 5);
    localStorage.setItem('typewriter_stats', JSON.stringify(this.userStats));
  }

  showResultsModal(wpm, rawWpm, acc, timeSeconds) {
    // Populate Hero Stats
    document.getElementById('resWpm').textContent = wpm;
    document.getElementById('resAcc').textContent = `${acc}%`;
    document.getElementById('resRaw').textContent = rawWpm;
    document.getElementById('resTime').textContent = `${timeSeconds}s`;

    // Typist Rank & Badge
    const rank = getJavaTypistRank(wpm, acc);
    const badgeEl = document.getElementById('resBadge');
    badgeEl.textContent = `${rank.badge} ${rank.title}`;

    // Consistency %
    const consistency = this.calculateConsistency();
    document.getElementById('resConsistency').textContent = `${consistency}%`;

    // Character Counts
    document.getElementById('resChars').textContent = 
      `${this.correctKeystrokes}/${this.incorrectKeystrokes}/${this.errorCount}`;

    // Educational Insight
    const eduTitle = document.getElementById('resEduTitle');
    const eduBody = document.getElementById('resEduBody');
    if (this.currentSnippet && this.currentSnippet.explanation) {
      eduTitle.textContent = `☕ Java Concept: ${this.currentSnippet.title}`;
      eduBody.textContent = this.currentSnippet.explanation;
      document.getElementById('resEduCard').style.display = 'block';
    } else {
      eduTitle.textContent = `☕ Java Practice Tip`;
      eduBody.textContent = 'Keep your fingers relaxed on the home row and maintain steady rhythm while navigating semicolons, braces {}, and angle brackets <>.';
      document.getElementById('resEduCard').style.display = 'block';
    }

    // Cache last finished stats for 1-click Google Sign-in submission
    this.lastFinishedStats = { wpm, acc, rank };

    // Global Leaderboard rank submission
    if (window.typeWriterAuth && window.typeWriterAuth.currentUser) {
      window.typeWriterAuth.submitScore(wpm, acc, rank.title, rank.badge);
      if (this.resRankText) {
        const curRank = window.typeWriterAuth.currentPlayerRank?.rank;
        this.resRankText.textContent = curRank
          ? `Score recorded! Your current global standing is #${curRank}.`
          : `Score recorded to the Global Leaderboard! Calculating live rank...`;
      }
      if (this.resLoginGoogleBtn) this.resLoginGoogleBtn.style.display = 'none';
    } else {
      if (this.resRankText) {
        this.resRankText.textContent = `Sign in with Google to rank on the Global Leaderboard with this ${wpm} WPM run!`;
      }
      if (this.resLoginGoogleBtn) this.resLoginGoogleBtn.style.display = 'inline-flex';
    }

    // Open Results Modal first so canvas element has real layout dimensions
    this.openModal(this.resultsModal);

    // Draw Performance Chart on next animation frame
    requestAnimationFrame(() => {
      this.drawChart(this.statsHistory, wpm);
    });
  }

  calculateConsistency() {
    if (this.statsHistory.length < 2) return 100;
    const wpms = this.statsHistory.map(s => s.wpm);
    const mean = wpms.reduce((a, b) => a + b, 0) / wpms.length;
    if (mean === 0) return 100;
    const variance = wpms.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / wpms.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / mean) * 100; // coefficient of variation
    return Math.max(0, Math.min(100, Math.round(100 - cv)));
  }

  drawChart(data, avgWpm) {
    const canvas = document.getElementById('resultsChartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // High-DPI Canvas scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    if (data.length === 0) {
      data = [{ second: 1, wpm: avgWpm, errors: 0 }];
    }

    const padding = { top: 20, bottom: 30, left: 40, right: 20 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const maxWpm = Math.max(60, ...data.map(d => Math.max(d.wpm, d.rawWpm || 0))) * 1.15;
    const maxSeconds = Math.max(data.length, 5);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '10px sans-serif';

    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const yVal = Math.round((maxWpm / ySteps) * i);
      const yPos = padding.top + chartH - (i / ySteps) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(w - padding.right, yPos);
      ctx.stroke();
      ctx.fillText(`${yVal}`, 10, yPos + 3);
    }

    // Points calculation
    const points = data.map((d, idx) => ({
      x: padding.left + (idx / Math.max(1, data.length - 1)) * chartW,
      y: padding.top + chartH - (d.wpm / maxWpm) * chartH,
      rawY: padding.top + chartH - ((d.rawWpm || d.wpm) / maxWpm) * chartH,
      errors: d.errors || 0
    }));

    // Area gradient under WPM curve
    const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    gradient.addColorStop(0, 'rgba(255, 198, 109, 0.35)');
    gradient.addColorStop(1, 'rgba(255, 198, 109, 0.0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartH);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // WPM line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = '#ffc66d';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw error markers (red cross dots)
    points.forEach(p => {
      if (p.errors > 0) {
        ctx.fillStyle = '#ff5252';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Time labels on X-axis
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('1s', padding.left, h - 8);
    ctx.fillText(`${data.length}s`, w - padding.right - 15, h - 8);
  }

  /* -------------------------------------------------------------
   * Themes, Fonts & Customization
   * ----------------------------------------------------------- */
  applyTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('typewriter_theme', theme);

    document.querySelectorAll('.theme-card-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
  }

  applyFontSize(size) {
    this.fontSize = size;
    localStorage.setItem('typewriter_fontsize', size);
    
    let rem = '1.35rem';
    if (size === 'small') rem = '1.1rem';
    else if (size === 'medium') rem = '1.35rem';
    else if (size === 'large') rem = '1.65rem';
    else if (size === 'xlarge') rem = '2.0rem';

    document.documentElement.style.setProperty('--font-size', rem);
    setTimeout(() => this.updateCaretPosition(), 50);
  }

  renderUserStatsModal() {
    const s = this.userStats;
    document.getElementById('statTotalTests').textContent = s.testsCompleted || 0;
    document.getElementById('statHighWpm').textContent = s.highWpm || 0;
    const mins = Math.round((s.totalTimeSeconds || 0) / 60);
    document.getElementById('statTotalTime').textContent = `${mins} mins`;
    document.getElementById('statTotalWords').textContent = s.totalWords || 0;
  }

  /* -------------------------------------------------------------
   * Global Leaderboard & Google OAuth Integration
   * ----------------------------------------------------------- */
  setupAuthAndLeaderboard() {
    const defaultAvatar = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="32" fill="#313335"/>
        <circle cx="32" cy="24" r="11" fill="#a9b7c6"/>
        <path d="M12 56c0-11 9-20 20-20s20 9 20 20" fill="#a9b7c6"/>
      </svg>
    `);

    // Poll for window.typeWriterAuth module initialization
    const tryBind = () => {
      if (!window.typeWriterAuth) {
        setTimeout(tryBind, 80);
        return;
      }

      // 1. Auth Change
      window.typeWriterAuth.onAuthChange((user) => {
        if (user) {
          if (this.loginGoogleBtn) this.loginGoogleBtn.style.display = 'none';
          if (this.userProfileBadge) this.userProfileBadge.style.display = 'inline-flex';
          if (this.userAvatarImg) this.userAvatarImg.src = user.photoURL || defaultAvatar;
          if (this.userDisplayName) this.userDisplayName.textContent = user.displayName || 'Player';
          if (this.resLoginGoogleBtn) this.resLoginGoogleBtn.style.display = 'none';

          if (this.spotlightAvatar) this.spotlightAvatar.src = user.photoURL || defaultAvatar;
          if (this.spotlightPlayerName) this.spotlightPlayerName.textContent = user.displayName || 'Player';
          if (this.spotlightSubText) this.spotlightSubText.textContent = 'Signed in with ' + (user.email || 'Google Account');
        } else {
          if (this.loginGoogleBtn) this.loginGoogleBtn.style.display = 'inline-flex';
          if (this.userProfileBadge) this.userProfileBadge.style.display = 'none';
          if (this.userRankPill) this.userRankPill.textContent = 'Rank #--';
          if (this.resLoginGoogleBtn) this.resLoginGoogleBtn.style.display = 'inline-flex';

          if (this.spotlightAvatar) this.spotlightAvatar.src = defaultAvatar;
          if (this.spotlightPlayerName) this.spotlightPlayerName.textContent = 'Your Global Standing';
          if (this.spotlightSubText) this.spotlightSubText.textContent = 'Sign in with Google to claim your spot on the live ranking board.';
          if (this.spotlightRankVal) this.spotlightRankVal.textContent = 'Unranked';
          if (this.spotlightWpmVal) this.spotlightWpmVal.textContent = '—';
        }
      });

      // 2. Rank Change
      window.typeWriterAuth.onRankChange((rankInfo) => {
        if (rankInfo && rankInfo.rank) {
          const rankText = `Rank #${rankInfo.rank}`;
          if (this.userRankPill) this.userRankPill.textContent = rankText;
          if (this.spotlightRankVal) this.spotlightRankVal.textContent = `#${rankInfo.rank}`;
          if (this.spotlightWpmVal && rankInfo.entry) this.spotlightWpmVal.textContent = `${rankInfo.entry.wpm} WPM`;
          if (this.resRankText) {
            this.resRankText.textContent = `Score recorded! Your global rank is #${rankInfo.rank} of ${rankInfo.totalPlayers} players.`;
          }
        } else if (window.typeWriterAuth.currentUser) {
          if (this.userRankPill) this.userRankPill.textContent = 'Unranked';
          if (this.spotlightRankVal) this.spotlightRankVal.textContent = 'Unranked';
          if (this.resRankText) {
            this.resRankText.textContent = 'Complete your first test to appear on the Global Leaderboard!';
          }
        }
      });

      // 3. Leaderboard Table Update
      window.typeWriterAuth.onLeaderboardChange((entries) => {
        this.renderLeaderboardTable(entries);
      });
    };

    tryBind();
  }

  renderLeaderboardTable(entries) {
    if (!this.leaderboardTbody) return;
    this.leaderboardTbody.innerHTML = '';

    if (!entries || entries.length === 0) {
      const row = document.createElement('tr');
      row.className = 'empty-row';
      row.innerHTML = `<td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
        No players on the leaderboard yet. Be the first to complete a test and claim Rank #1!
      </td>`;
      this.leaderboardTbody.appendChild(row);
      return;
    }

    const currentUid = window.typeWriterAuth?.currentUser?.uid;

    entries.forEach((entry, idx) => {
      const rankNum = idx + 1;
      const isCurrentPlayer = (currentUid && entry.uid === currentUid);

      let rankDisplay = `#${rankNum}`;
      let rankClass = 'rank-badge-cell';
      if (rankNum === 1) {
        rankDisplay = '🥇 #1';
        rankClass += ' rank-gold';
      } else if (rankNum === 2) {
        rankDisplay = '🥈 #2';
        rankClass += ' rank-silver';
      } else if (rankNum === 3) {
        rankDisplay = '🥉 #3';
        rankClass += ' rank-bronze';
      }

      const tr = document.createElement('tr');
      if (isCurrentPlayer) {
        tr.className = 'current-player-row';
      }

      const fallbackAvatar = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="32" fill="#313335"/>
          <circle cx="32" cy="24" r="11" fill="#a9b7c6"/>
          <path d="M12 56c0-11 9-20 20-20s20 9 20 20" fill="#a9b7c6"/>
        </svg>
      `);
      const avatarSrc = entry.photoURL || fallbackAvatar;

      tr.innerHTML = `
        <td class="${rankClass}">${rankDisplay}</td>
        <td>
          <div class="player-cell-content">
            <img class="player-table-avatar" src="${avatarSrc}" alt="${entry.displayName}" onerror="this.src='${fallbackAvatar}'" />
            <span>${entry.displayName}</span>
            ${isCurrentPlayer ? '<span class="you-tag">YOU</span>' : ''}
          </div>
        </td>
        <td><strong style="color: var(--accent); font-family: var(--font-mono);">${entry.wpm}</strong></td>
        <td>${entry.accuracy}%</td>
        <td><span class="badge-pill" style="font-size: 0.75rem; padding: 0.15rem 0.5rem;">${entry.rankBadge} ${entry.rankTitle}</span></td>
        <td>${entry.testsCompleted || 1}</td>
      `;

      this.leaderboardTbody.appendChild(tr);
    });
  }
}

// Instantiate App when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.typeWriterApp = new TypeWriterApp();
});
