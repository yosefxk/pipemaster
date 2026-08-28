/**
 * Main Application Controller & UI Coordinator
 * Handles navigation, settings, custom games, timers, gestures, and modals.
 */

class PipesApp {
    constructor() {
        this.renderer = new PipeRenderer();
        this.sound = soundManager;
        this.engine = null;
        
        // Timer state
        this.timerInterval = null;
        this.startTime = 0;
        this.elapsedSeconds = 0;
        this.isTimerRunning = false;
        
        // Move history for undo
        this.moveHistory = [];
        this.currentLevelNumber = 1;

        // Settings and stats with LocalStorage support
        this.settings = this.loadSettings();
        this.stats = this.loadStats();

        // DOM elements cache
        this.dom = {};
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    getDefaultSettings() {
        return {
            defaultDifficulty: 'medium',
            defaultRows: 6,
            defaultCols: 6,
            wrapEdges: false,
            theme: 'minimal-dark',
            soundEnabled: true,
            hapticsEnabled: true,
            hintsAvailable: 25
        };
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('pipemaster_settings');
            return saved ? { ...this.getDefaultSettings(), ...JSON.parse(saved) } : this.getDefaultSettings();
        } catch (e) {
            return this.getDefaultSettings();
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('pipemaster_settings', JSON.stringify(this.settings));
        } catch (e) {}
    }

    loadStats() {
        try {
            const saved = localStorage.getItem('pipemaster_stats');
            return saved ? JSON.parse(saved) : { levelsCompleted: 0, bestTimes: {} };
        } catch (e) {
            return { levelsCompleted: 0, bestTimes: {} };
        }
    }

    saveStats() {
        try {
            localStorage.setItem('pipemaster_stats', JSON.stringify(this.stats));
        } catch (e) {}
    }

    init() {
        this.cacheDOMElements();
        this.bindEvents();
        this.applyTheme(this.settings.theme);
        this.syncSettingsUI();
        this.showScreen('screen-menu');
    }

    cacheDOMElements() {
        this.dom = {
            // Screens
            screenMenu: document.getElementById('screen-menu'),
            screenGame: document.getElementById('screen-game'),
            
            // Buttons in Menu
            btnQuickPlay: document.getElementById('btn-quick-play'),
            btnCustomPlay: document.getElementById('btn-custom-play'),
            btnMenuSettings: document.getElementById('btn-menu-settings'),
            btnHowToPlay: document.getElementById('btn-how-to-play'),
            
            // Game HUD
            btnBackToMenu: document.getElementById('btn-back-menu'),
            btnGameSettings: document.getElementById('btn-game-settings'),
            btnGameHelp: document.getElementById('btn-game-help'),
            btnNextLevelTop: document.getElementById('btn-next-level-top'),
            levelTitle: document.getElementById('level-title'),
            gameTimer: document.getElementById('game-timer'),
            boardContainer: document.getElementById('board-container'),
            btnHint: document.getElementById('btn-hint'),
            hintBadge: document.getElementById('hint-badge'),
            btnUndo: document.getElementById('btn-undo'),
            btnRestart: document.getElementById('btn-restart'),
            btnMute: document.getElementById('btn-mute'),
            
            // Modals
            modalCustom: document.getElementById('modal-custom'),
            modalSettings: document.getElementById('modal-settings'),
            modalWin: document.getElementById('modal-win'),
            modalHelp: document.getElementById('modal-help'),
            
            // Custom Game Form
            customRows: document.getElementById('custom-rows'),
            customCols: document.getElementById('custom-cols'),
            customRowsVal: document.getElementById('custom-rows-val'),
            customColsVal: document.getElementById('custom-cols-val'),
            customDiff: document.getElementById('custom-diff'),
            customWrap: document.getElementById('custom-wrap'),
            btnStartCustom: document.getElementById('btn-start-custom'),
            
            // Settings Form
            settingDifficulty: document.getElementById('setting-difficulty'),
            settingSize: document.getElementById('setting-size'),
            settingWrap: document.getElementById('setting-wrap'),
            settingTheme: document.getElementById('setting-theme'),
            settingSound: document.getElementById('setting-sound'),
            settingHaptics: document.getElementById('setting-haptics'),
            
            // Win Modal Elements
            winTime: document.getElementById('win-time'),
            winHints: document.getElementById('win-hints'),
            winMoves: document.getElementById('win-moves'),
            winStars: document.getElementById('win-stars'),
            btnWinNext: document.getElementById('btn-win-next'),
            btnWinRestart: document.getElementById('btn-win-restart'),
            btnWinMenu: document.getElementById('btn-win-menu')
        };
    }

    bindEvents() {
        // Menu screen navigation
        this.dom.btnQuickPlay?.addEventListener('click', () => {
            this.sound.playTapSound();
            this.startQuickGame();
        });

        this.dom.btnCustomPlay?.addEventListener('click', () => {
            this.sound.playTapSound();
            this.openModal('modal-custom');
        });

        this.dom.btnMenuSettings?.addEventListener('click', () => {
            this.sound.playTapSound();
            this.openModal('modal-settings');
        });

        this.dom.btnHowToPlay?.addEventListener('click', () => {
            this.sound.playTapSound();
            this.openModal('modal-help');
        });

        // In-game HUD actions
        this.dom.btnBackToMenu?.addEventListener('click', () => {
            this.sound.playTapSound();
            this.stopTimer();
            this.showScreen('screen-menu');
        });

        this.dom.btnGameSettings?.addEventListener('click', () => {
            this.sound.playTapSound();
            this.openModal('modal-settings');
        });

        this.dom.btnGameHelp?.addEventListener('click', () => {
            this.sound.playTapSound();
            this.openModal('modal-help');
        });

        this.dom.btnNextLevelTop?.addEventListener('click', () => {
            this.sound.playTapSound();
            this.nextLevel();
        });

        this.dom.btnHint?.addEventListener('click', () => {
            this.triggerHint();
        });

        this.dom.btnUndo?.addEventListener('click', () => {
            this.undoLastMove();
        });

        this.dom.btnRestart?.addEventListener('click', () => {
            this.restartLevel();
        });

        this.dom.btnMute?.addEventListener('click', () => {
            this.toggleMute();
        });

        // Custom Game Slider adjustments
        this.dom.customRows?.addEventListener('input', (e) => {
            this.dom.customRowsVal.textContent = e.target.value;
        });

        this.dom.customCols?.addEventListener('input', (e) => {
            this.dom.customColsVal.textContent = e.target.value;
        });

        this.dom.btnStartCustom?.addEventListener('click', () => {
            this.sound.playTapSound();
            const rows = parseInt(this.dom.customRows.value, 10);
            const cols = parseInt(this.dom.customCols.value, 10);
            const difficulty = this.dom.customDiff.value;
            const wrapEdges = this.dom.customWrap.checked;

            this.closeModal('modal-custom');
            this.startNewGame({ rows, cols, difficulty, wrapEdges });
        });

        // Settings Form Syncing
        this.dom.settingDifficulty?.addEventListener('change', (e) => {
            this.settings.defaultDifficulty = e.target.value;
            this.saveSettings();
        });

        this.dom.settingSize?.addEventListener('change', (e) => {
            const val = parseInt(e.target.value, 10);
            this.settings.defaultRows = val;
            this.settings.defaultCols = val;
            this.saveSettings();
        });

        this.dom.settingWrap?.addEventListener('change', (e) => {
            this.settings.wrapEdges = e.target.checked;
            this.saveSettings();
        });

        this.dom.settingTheme?.addEventListener('change', (e) => {
            this.settings.theme = e.target.value;
            this.applyTheme(this.settings.theme);
            this.saveSettings();
        });

        this.dom.settingSound?.addEventListener('change', (e) => {
            this.settings.soundEnabled = e.target.checked;
            this.sound.soundEnabled = e.target.checked;
            this.saveSettings();
        });

        this.dom.settingHaptics?.addEventListener('change', (e) => {
            this.settings.hapticsEnabled = e.target.checked;
            this.sound.hapticsEnabled = e.target.checked;
            this.saveSettings();
        });

        // Win Modal Actions
        this.dom.btnWinNext?.addEventListener('click', () => {
            this.sound.playTapSound();
            this.closeModal('modal-win');
            this.nextLevel();
        });

        this.dom.btnWinRestart?.addEventListener('click', () => {
            this.sound.playTapSound();
            this.closeModal('modal-win');
            this.restartLevel();
        });

        this.dom.btnWinMenu?.addEventListener('click', () => {
            this.sound.playTapSound();
            this.closeModal('modal-win');
            this.showScreen('screen-menu');
        });

        // Board Tile Interaction via Event Delegation
        this.dom.boardContainer?.addEventListener('click', (e) => {
            const tileElem = e.target.closest('.pipe-tile');
            if (!tileElem || !this.engine || this.engine.isCompleted) return;

            const r = parseInt(tileElem.getAttribute('data-row'), 10);
            const c = parseInt(tileElem.getAttribute('data-col'), 10);
            this.onTileClick(r, c, true);
        });

        // Secondary Click / Context Menu for counter-clockwise rotation
        this.dom.boardContainer?.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const tileElem = e.target.closest('.pipe-tile');
            if (!tileElem || !this.engine || this.engine.isCompleted) return;

            const r = parseInt(tileElem.getAttribute('data-row'), 10);
            const c = parseInt(tileElem.getAttribute('data-col'), 10);
            this.onTileClick(r, c, false);
        });

        // Modal Close Buttons
        document.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-overlay');
                if (modal) modal.classList.remove('active');
            });
        });

        // Android Hardware Back key hook
        window.addEventListener('popstate', () => {
            if (this.dom.screenGame?.classList.contains('active')) {
                this.showScreen('screen-menu');
            }
        });
    }

    syncSettingsUI() {
        if (this.dom.settingDifficulty) this.dom.settingDifficulty.value = this.settings.defaultDifficulty;
        if (this.dom.settingSize) this.dom.settingSize.value = this.settings.defaultRows;
        if (this.dom.settingWrap) this.dom.settingWrap.checked = this.settings.wrapEdges;
        if (this.dom.settingTheme) this.dom.settingTheme.value = this.settings.theme;
        if (this.dom.settingSound) this.dom.settingSound.checked = this.settings.soundEnabled;
        if (this.dom.settingHaptics) this.dom.settingHaptics.checked = this.settings.hapticsEnabled;
        this.updateHintBadge();
        
        this.sound.soundEnabled = this.settings.soundEnabled;
        this.sound.hapticsEnabled = this.settings.hapticsEnabled;
    }

    updateHintBadge() {
        if (this.dom.hintBadge) {
            this.dom.hintBadge.textContent = this.settings.hintsAvailable;
        }
        if (this.dom.btnHint) {
            this.dom.btnHint.classList.toggle('disabled', this.settings.hintsAvailable <= 0);
        }
    }

    applyTheme(themeName) {
        document.body.className = `theme-${themeName}`;
    }

    showScreen(screenId) {
        document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));
        const activeScreen = document.getElementById(screenId);
        if (activeScreen) {
            activeScreen.classList.add('active');
        }
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }

    // Start Quick Game from settings
    startQuickGame() {
        this.startNewGame({
            rows: this.settings.defaultRows,
            cols: this.settings.defaultCols,
            difficulty: this.settings.defaultDifficulty,
            wrapEdges: this.settings.wrapEdges
        });
    }

    // Start New Game instance
    startNewGame(options) {
        this.engine = new PipesGameEngine(options);
        this.moveHistory = [];
        this.showScreen('screen-game');
        
        const wrapLabel = options.wrapEdges ? ' ✦ Wrap' : '';
        const diffCap = options.difficulty.charAt(0).toUpperCase() + options.difficulty.slice(1);
        if (this.dom.levelTitle) {
            this.dom.levelTitle.textContent = `Pipes ${this.engine.rows}x${this.engine.cols} · ${diffCap}${wrapLabel}`;
        }

        // Render Board
        this.renderer.renderBoard(this.dom.boardContainer, this.engine, this.settings.theme);

        // Reset and Start Timer
        this.startTimer();
    }

    // Tile Click Handler
    onTileClick(r, c, clockwise = true) {
        const tile = this.engine.grid[r][c];
        if (!tile || tile.isHintLocked || tile.canonicalType === '+' || tile.canonicalType === '0') {
            return;
        }

        const rotated = this.engine.rotateTile(r, c, clockwise);
        if (rotated) {
            this.sound.playRotateSound();
            this.moveHistory.push({ r, c, clockwise });

            // Animate tile rotation in DOM
            const tileElem = this.dom.boardContainer.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (tileElem) {
                this.renderer.updateTileElement(tileElem, tile, this.engine);
            }

            // Update all flow indicators across the board
            this.renderer.updateBoardState(this.dom.boardContainer, this.engine);

            if (tile.isFlowing) {
                this.sound.playFlowSound();
            }

            // Check Win Condition
            if (this.engine.isCompleted) {
                this.handleWin();
            }
        }
    }

    // Undo the last rotated tile
    undoLastMove() {
        if (this.moveHistory.length === 0 || this.engine.isCompleted) return;
        const lastMove = this.moveHistory.pop();
        this.engine.rotateTile(lastMove.r, lastMove.c, !lastMove.clockwise);
        this.sound.playRotateSound();
        this.renderer.updateBoardState(this.dom.boardContainer, this.engine);
    }

    // Hint feature: solves one tile and marks it with a lightbulb
    triggerHint() {
        if (!this.engine || this.engine.isCompleted) return;

        // Check if hints are exhausted
        if (this.settings.hintsAvailable <= 0) {
            this.sound.playTapSound();
            this.dom.btnHint?.classList.add('shake-error');
            setTimeout(() => this.dom.btnHint?.classList.remove('shake-error'), 400);
            return;
        }

        const hintResult = this.engine.applyHint();
        if (hintResult) {
            this.sound.playHintSound();

            this.settings.hintsAvailable--;
            this.saveSettings();
            this.updateHintBadge();

            // Update visual state
            this.renderer.updateBoardState(this.dom.boardContainer, this.engine);

            // Highlight the hinted tile with sparkle animation
            const tileElem = this.dom.boardContainer.querySelector(`[data-row="${hintResult.row}"][data-col="${hintResult.col}"]`);
            if (tileElem) {
                tileElem.classList.add('hint-glow-effect');
                setTimeout(() => tileElem.classList.remove('hint-glow-effect'), 1000);
            }

            if (this.engine.isCompleted) {
                this.handleWin();
            }
        }
    }

    // Restart current level board with fresh scramble
    restartLevel() {
        if (!this.engine) return;
        this.moveHistory = [];
        this.engine._scrambleBoard();
        this.engine.moves = 0;
        this.engine.hintsUsed = 0;
        this.engine.isCompleted = false;
        this.engine.updateFlow();
        this.renderer.renderBoard(this.dom.boardContainer, this.engine, this.settings.theme);
        this.startTimer();
    }

    // Advance to next level
    nextLevel() {
        this.currentLevelNumber++;
        if (this.engine) {
            this.startNewGame({
                rows: this.engine.rows,
                cols: this.engine.cols,
                difficulty: this.engine.difficulty,
                wrapEdges: this.engine.wrapEdges
            });
        } else {
            this.startQuickGame();
        }
    }

    // Handle Victory
    handleWin() {
        this.stopTimer();
        this.sound.playWinSound();

        // Calculate Stars
        let stars = 3;
        if (this.engine.hintsUsed >= 3 || this.elapsedSeconds > 180) {
            stars = 1;
        } else if (this.engine.hintsUsed >= 1 || this.elapsedSeconds > 90) {
            stars = 2;
        }

        // Reward player with bonus hints on win!
        const earnedHints = (stars >= 3) ? 2 : 1;
        this.settings.hintsAvailable = (this.settings.hintsAvailable || 0) + earnedHints;
        this.saveSettings();
        this.updateHintBadge();

        // Update stats
        this.stats.levelsCompleted++;
        const timeStr = this.formatTime(this.elapsedSeconds);
        const boardKey = `${this.engine.rows}x${this.engine.cols}_${this.engine.difficulty}`;
        
        if (!this.stats.bestTimes[boardKey] || this.elapsedSeconds < this.stats.bestTimes[boardKey]) {
            this.stats.bestTimes[boardKey] = this.elapsedSeconds;
        }
        this.saveStats();

        // Fill Win Modal Content
        if (this.dom.winTime) this.dom.winTime.textContent = timeStr;
        if (this.dom.winHints) this.dom.winHints.textContent = this.engine.hintsUsed;
        if (this.dom.winMoves) this.dom.winMoves.textContent = this.engine.moves;
        if (this.dom.winStars) {
            this.dom.winStars.innerHTML = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        }

        // Trigger victory celebration glow on board
        this.dom.boardContainer.classList.add('level-won-celebration');
        setTimeout(() => {
            this.dom.boardContainer.classList.remove('level-won-celebration');
            this.openModal('modal-win');
        }, 600);
    }

    // Timer controls
    startTimer() {
        this.stopTimer();
        this.elapsedSeconds = 0;
        this.updateTimerDisplay();
        this.startTime = Date.now();
        this.isTimerRunning = true;
        this.timerInterval = setInterval(() => {
            this.elapsedSeconds++;
            this.updateTimerDisplay();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.isTimerRunning = false;
    }

    updateTimerDisplay() {
        if (this.dom.gameTimer) {
            this.dom.gameTimer.textContent = this.formatTime(this.elapsedSeconds);
        }
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    toggleMute() {
        this.settings.soundEnabled = !this.settings.soundEnabled;
        this.sound.soundEnabled = this.settings.soundEnabled;
        this.saveSettings();
        if (this.dom.settingSound) this.dom.settingSound.checked = this.settings.soundEnabled;
        if (this.dom.btnMute) {
            this.dom.btnMute.classList.toggle('muted', !this.settings.soundEnabled);
        }
    }
}

// Global instance initialization
window.pipesApp = new PipesApp();
