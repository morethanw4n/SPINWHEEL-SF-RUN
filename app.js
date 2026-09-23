/**
 * STAGE DISPLAY ENGINE (6x3.5m LED SCREEN)
 * Lucky Draw Smartfren Fun Run Palembang
 * Receives commands from operator.js via BroadcastChannel ('sf_lucky_draw_channel')
 */

(function () {
  'use strict';

  // --- BROADCAST CHANNEL SYNC ---
  const CHANNEL_NAME = 'sf_lucky_draw_channel';
  let broadcastChannel = null;
  if ('BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }

  // --- STAGE DISPLAY STATE ---
  const STATE = {
    backgrounds: [
      { id: 'bg-1', name: 'AIR FRYER', url: 'assets/AIR FRYER.png' },
      { id: 'bg-2', name: 'BLENDER', url: 'assets/BLENDER.png' },
      { id: 'bg-3', name: 'DISPENSER', url: 'assets/DISPENSER.png' },
      { id: 'bg-4', name: 'KACAMATA DOODR', url: 'assets/KACAMATA GOODR.png' },
      { id: 'bg-5', name: 'KIPAS ANGIN', url: 'assets/KIPAS ANGIN.png' },
      { id: 'bg-6', name: 'KOMPOR', url: 'assets/KOMPOR.png' },
      { id: 'bg-7', name: 'KULKAS', url: 'assets/KULKAS.png' },
      { id: 'bg-8', name: 'MESIN CUCI', url: 'assets/MESIN CUCI.png' },
      { id: 'bg-9', name: 'MOTOR LISTRIK', url: 'assets/MOTOR LISTRIK.png' },
      { id: 'bg-10', name: 'RICE COOKER', url: 'assets/RICE COOKER.png' },
      { id: 'bg-11', name: 'SMART TV 32', url: 'assets/SMART TV 32.png' },
      { id: 'bg-12', name: 'TUMBLER', url: 'assets/TUMBLER.png' },
      { id: 'bg-13', name: 'VOUCHER BELANJA', url: 'assets/VOUCHER BELANJA.png' }
    ],
    activeBgIndex: 0,
    format4Digits: true,
    soundEnabled: true,
    isSpinning: false,
    activeLayer: 'a',
    audioCtx: null,

    // Standalone fallback pool (if opened without operator.html)
    availableNumbers: [],
    currentWinnerNumber: null
  };

  // --- DOM ELEMENTS ---
  const DOM = {
    stageScreen: document.getElementById('stage-screen'),
    bgLayerA: document.getElementById('bg-layer-a'),
    bgLayerB: document.getElementById('bg-layer-b'),
    bgFadeOverlay: document.getElementById('bg-fade-overlay'),
    luckyNumberBox: document.getElementById('lucky-number-box'),
    boxSublabel: document.getElementById('box-sublabel'),
    digitColumns: document.querySelectorAll('.digit-column'),
    stageWinnerBanner: document.getElementById('stage-winner-banner'),
    stageBannerPrize: document.getElementById('stage-banner-prize'),
    stageBannerNum: document.getElementById('stage-banner-num'),
    stageStatusText: document.getElementById('stage-status-text'),
    btnStageFullscreen: document.getElementById('btn-stage-fullscreen'),
    labelStageFs: document.getElementById('label-stage-fs')
  };

  // --- AUDIO SYNTHESIZER (Web Audio API) ---
  function initAudio() {
    if (!STATE.audioCtx) {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (AudioClass) STATE.audioCtx = new AudioClass();
    }
    if (STATE.audioCtx && STATE.audioCtx.state === 'suspended') {
      STATE.audioCtx.resume();
    }
  }

  function playTickSound(frequency = 750, duration = 0.035) {
    if (!STATE.soundEnabled) return;
    try {
      initAudio();
      if (!STATE.audioCtx) return;
      const osc = STATE.audioCtx.createOscillator();
      const gain = STATE.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, STATE.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.4, STATE.audioCtx.currentTime + duration);

      gain.gain.setValueAtTime(0.3, STATE.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, STATE.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(STATE.audioCtx.destination);

      osc.start();
      osc.stop(STATE.audioCtx.currentTime + duration);
    } catch (e) { }
  }

  function playFanfareSound() {
    if (!STATE.soundEnabled) return;
    try {
      initAudio();
      if (!STATE.audioCtx) return;
      const now = STATE.audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = STATE.audioCtx.createOscillator();
        const gain = STATE.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);

        osc.connect(gain);
        gain.connect(STATE.audioCtx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.7);
      });
    } catch (e) { }
  }

  // --- INITIALIZATION ---
  function initDisplay() {
    loadCachedSettings();
    applyBackground(STATE.activeBgIndex, false);
    updateDisplayNumbers(formatNumber(1));
    setupBroadcastChannel();
    setupEventListeners();

    // Notify Operator that Stage Display is Ready!
    sendBroadcastMessage('DISPLAY_READY', { timestamp: Date.now() });
  }

  function loadCachedSettings() {
    const savedFormat = localStorage.getItem('sf_format_4digits');
    if (savedFormat !== null) STATE.format4Digits = savedFormat === 'true';

    const savedCalib = localStorage.getItem('sf_box_calibration');
    if (savedCalib) {
      try {
        applyCalibration(JSON.parse(savedCalib));
      } catch (e) { }
    }

    // Default standalone pool
    for (let i = 1; i <= 1000; i++) STATE.availableNumbers.push(i);
  }

  function formatNumber(num) {
    if (num === undefined || num === null) return '0000';
    if (typeof num === 'string') return num;
    if (STATE.format4Digits) return String(num).padStart(4, '0');
    return String(num);
  }

  function updateDisplayNumbers(formattedStr) {
    const padded = String(formattedStr).padStart(4, ' ');
    const chars = padded.split('');
    DOM.digitColumns.forEach((col, idx) => {
      const strip = col.querySelector('.digit-strip');
      if (strip) {
        strip.innerHTML = `<span>${chars[idx] || ' '}</span>`;
      }
    });
  }

  // --- BACKGROUND SWITCH: NEW LAYER FADES IN ON TOP, OLD LAYER STAYS VISIBLE ---
  // Durasi harus sinkron dengan CSS animation bgFadeIn (0.7s)
  const BG_FADE_DURATION = 700;

  function applyBackground(index, animate = true) {
    const bg = STATE.backgrounds[index];
    if (!bg) return;

    if (!animate) {
      // Set langsung tanpa animasi
      DOM.bgLayerA.style.backgroundImage = `url("${bg.url}")`;
      DOM.bgLayerA.classList.remove('fading-in');
      DOM.bgLayerA.classList.add('active');
      DOM.bgLayerB.style.backgroundImage = '';
      DOM.bgLayerB.classList.remove('active', 'fading-in');
      STATE.activeLayer = 'a';
      return;
    }

    const nextLayer = STATE.activeLayer === 'a' ? DOM.bgLayerB : DOM.bgLayerA;
    const currentLayer = STATE.activeLayer === 'a' ? DOM.bgLayerA : DOM.bgLayerB;

    // Pastikan tidak ada animasi yang sedang berjalan di nextLayer
    nextLayer.classList.remove('active', 'fading-in');

    // Set gambar bg baru
    nextLayer.style.backgroundImage = `url("${bg.url}")`;

    // Mulai fade-in: bg baru muncul di ATAS bg lama (bg lama tetap active/opacity:1)
    // requestAnimationFrame untuk memastikan backgroundImage sudah dirender sebelum animasi
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        nextLayer.classList.add('fading-in');

        // Setelah animasi selesai: bg lama disembunyikan, bg baru jadi active
        setTimeout(() => {
          nextLayer.classList.remove('fading-in');
          nextLayer.classList.add('active');
          currentLayer.classList.remove('active');
        }, BG_FADE_DURATION);
      });
    });

    STATE.activeLayer = STATE.activeLayer === 'a' ? 'b' : 'a';
  }

  // --- CALIBRATION ---
  function applyCalibration(calib) {
    if (!calib) return;
    const root = document.documentElement;
    if (calib.left) root.style.setProperty('--calib-box-left', calib.left);
    if (calib.top) root.style.setProperty('--calib-box-top', calib.top);
    if (calib.width) root.style.setProperty('--calib-box-width', calib.width);
    if (calib.height) root.style.setProperty('--calib-box-height', calib.height);
    if (calib.radius) root.style.setProperty('--calib-box-radius', calib.radius);
    if (calib.fontSize) root.style.setProperty('--calib-box-font-size', calib.fontSize);
  }

  // --- STAGE SPIN ENGINE ---
  function startStageSpin(winningNum, doorprizeName = '', duration = 4500) {
    if (STATE.isSpinning) return;

    initAudio();
    STATE.isSpinning = true;
    STATE.currentWinnerNumber = winningNum;

    // Reset Box Highlight & Banner
    DOM.luckyNumberBox.classList.remove('winner-highlight');
    DOM.stageWinnerBanner.classList.add('hidden');
    if (DOM.boxSublabel) DOM.boxSublabel.textContent = '';

    DOM.digitColumns.forEach((col) => col.classList.add('spinning'));

    const startTime = performance.now();
    let lastTickTime = 0;

    function animateReel(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Quartic Ease-Out curve for dramatic slow-down
      const easeProgress = 1 - Math.pow(1 - progress, 4);

      // Audio ticks
      const tickInterval = 40 + Math.pow(progress, 3) * 350;
      if (currentTime - lastTickTime > tickInterval) {
        lastTickTime = currentTime;
        playTickSound(800 - progress * 350, 0.04);
      }

      if (progress < 1) {
        // Fast random 4-digit number during roll
        const randomNum = Math.floor(1 + Math.random() * 1000);
        updateDisplayNumbers(formatNumber(randomNum));
        requestAnimationFrame(animateReel);
      } else {
        // Stop & Lock on Winner!
        stopStageSpin(winningNum, doorprizeName);
      }
    }

    requestAnimationFrame(animateReel);
  }

  function stopStageSpin(winningNum, doorprizeName) {
    STATE.isSpinning = false;
    DOM.digitColumns.forEach((col) => col.classList.remove('spinning'));

    // Display Exact Winning Number
    updateDisplayNumbers(formatNumber(winningNum));

    // Box highlight
    DOM.luckyNumberBox.classList.add('winner-highlight');
    if (DOM.boxSublabel) DOM.boxSublabel.textContent = ' ';

    // Celebration Confetti & Fanfare
    playFanfareSound();
    triggerConfetti();

    // Show Stage Celebration Banner
    if (DOM.stageWinnerBanner) {
      DOM.stageBannerPrize.textContent = (doorprizeName || STATE.backgrounds[STATE.activeBgIndex]?.name || 'DOORPRIZE').toUpperCase();
      DOM.stageBannerNum.textContent = '#' + formatNumber(winningNum);
      DOM.stageWinnerBanner.classList.remove('hidden');
    }

    // Inform Operator Dashboard
    sendBroadcastMessage('DISPLAY_SPIN_FINISHED', {
      winningNumber: winningNum,
      doorprize: doorprizeName
    });
  }

  // Confetti Blast
  function triggerConfetti() {
    if (typeof confetti === 'function') {
      const count = 250;
      const defaults = {
        origin: { y: 0.65 },
        zIndex: 200,
        colors: ['#E6007E', '#FF007F', '#FFE600', '#00E5FF', '#FFFFFF', '#FF85C0']
      };

      function fire(particleRatio, opts) {
        confetti(Object.assign({}, defaults, opts, {
          particleCount: Math.floor(count * particleRatio)
        }));
      }

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    }
  }

  // --- BROADCAST MESSAGING ---
  function sendBroadcastMessage(type, payload = {}) {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type, payload, timestamp: Date.now() });
    }
  }

  function setupBroadcastChannel() {
    if (!broadcastChannel) return;

    broadcastChannel.onmessage = (event) => {
      const { type, payload } = event.data || {};

      switch (type) {
        case 'CMD_REQUEST_SYNC':
          sendBroadcastMessage('DISPLAY_READY', { timestamp: Date.now() });
          break;

        case 'CMD_SYNC_ALL':
          if (payload.backgrounds && payload.backgrounds.length > 0) {
            STATE.backgrounds = payload.backgrounds;
          }
          if (typeof payload.activeBgIndex === 'number') {
            STATE.activeBgIndex = payload.activeBgIndex;
            applyBackground(STATE.activeBgIndex, false);
          }
          if (typeof payload.format4Digits === 'boolean') {
            STATE.format4Digits = payload.format4Digits;
          }
          if (typeof payload.soundEnabled === 'boolean') {
            STATE.soundEnabled = payload.soundEnabled;
          }
          if (payload.calibration) {
            applyCalibration(payload.calibration);
          }
          if (DOM.stageStatusText && payload.availableCount !== undefined) {
            DOM.stageStatusText.textContent = `SMARTFREN FUN RUN PALEMBANG • SISA ${payload.availableCount} PESERTA`;
          }
          break;

        case 'CMD_SWITCH_BG':
          if (typeof payload.index === 'number') {
            STATE.activeBgIndex = payload.index;
            if (payload.background) {
              STATE.backgrounds[payload.index] = payload.background;
            }
            applyBackground(payload.index, true);
          }
          break;

        case 'CMD_START_SPIN':
          startStageSpin(payload.winningNumber, payload.doorprizeName, payload.duration || 4500);
          break;

        case 'CMD_WINNER_DECISION':
          // Operator clicked HAPUS or KEEP
          if (DOM.boxSublabel) {
            DOM.boxSublabel.textContent = payload.action === 'DELETED'
              ? 'NOMOR DIHAPUS DARI UNDIAN'
              : 'NOMOR TERSIMPAN DI UNDIAN';
          }
          // Fade out winner banner after 4 seconds
          setTimeout(() => {
            if (DOM.stageWinnerBanner) DOM.stageWinnerBanner.classList.add('hidden');
          }, 3500);
          break;

        case 'CMD_UPDATE_CALIBRATION':
          if (payload.calibration) {
            applyCalibration(payload.calibration);
          }
          break;

        case 'CMD_SET_SOUND':
          if (typeof payload.soundEnabled === 'boolean') {
            STATE.soundEnabled = payload.soundEnabled;
          }
          break;
      }
    };
  }

  // --- FULLSCREEN & KEYBOARD ---
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }

  function handleFullscreenChange() {
    const isFs = !!document.fullscreenElement;
    if (DOM.labelStageFs) {
      DOM.labelStageFs.textContent = isFs ? 'EXIT FULL' : 'FULL SCREEN';
    }
  }

  function setupEventListeners() {
    DOM.btnStageFullscreen.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Double-click stage to toggle fullscreen
    document.addEventListener('dblclick', (e) => {
      if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
        toggleFullscreen();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!STATE.isSpinning) {
          const randNum = Math.floor(7001 + Math.random() * 1000);
          startStageSpin(randNum, STATE.backgrounds[STATE.activeBgIndex]?.name);
        }
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    });

    window.addEventListener('beforeunload', () => {
      sendBroadcastMessage('DISPLAY_CLOSED', {});
    });
  }

  window.addEventListener('DOMContentLoaded', initDisplay);
})();
