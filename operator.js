/**
 * OPERATOR DASHBOARD CONTROLLER
 * Lucky Draw Smartfren Fun Run Palembang
 * Communicates with Display View via BroadcastChannel ('sf_lucky_draw_channel')
 */

(function () {
  'use strict';

  // --- BROADCAST CHANNEL SYNC ---
  const CHANNEL_NAME = 'sf_lucky_draw_channel';
  let broadcastChannel = null;
  if ('BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }

  // --- APPLICATION STATE ---
  const STATE = {
    totalParticipants: 1000,  // jumlah peserta (8000 - 7001 + 1)
    format4Digits: true,
    availableNumbers: [],
    winnerHistory: [],

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
    currentPendingWinner: null,
    isSpinning: false,

    soundEnabled: true,
    displayConnected: false,

    calibration: {
      left: '53.1%',
      top: '43.7%',
      width: '35.4%',
      height: '16.1%',
      radius: '36px',
      fontSize: '110px'
    }
  };

  // --- DOM ELEMENTS ---
  const DOM = {
    // Header & Status
    syncDot: document.getElementById('sync-dot'),
    syncStatusText: document.getElementById('sync-status-text'),
    opCounterText: document.getElementById('op-counter-text'),
    btnOpenDisplay: document.getElementById('btn-open-display'),
    btnToggleSound: document.getElementById('btn-toggle-sound'),
    iconSoundOn: document.getElementById('icon-sound-on'),
    iconSoundOff: document.getElementById('icon-sound-off'),

    // Doorprize Tabs & Upload
    opDoorprizeTabs: document.getElementById('op-doorprize-tabs'),
    bgUploadInput: document.getElementById('bg-upload-input'),
    opActivePrizeName: document.getElementById('op-active-prize-name'),

    // Live Mirror Preview
    opMirrorBg: document.getElementById('op-mirror-bg'),
    opMirrorBox: document.getElementById('op-mirror-box'),
    opMirrorNumber: document.getElementById('op-mirror-number'),

    // Spin Button & Area
    btnOpSpin: document.getElementById('btn-op-spin'),
    btnOpSpinLabel: document.getElementById('btn-op-spin-label'),
    spinTargetPrize: document.getElementById('spin-target-prize'),

    // Action Menus
    btnOpenDataModal: document.getElementById('btn-open-data-modal'),
    btnOpenHistoryModal: document.getElementById('btn-open-history-modal'),
    btnOpenCalibrateModal: document.getElementById('btn-open-calibrate-modal'),
    btnOpResetAll: document.getElementById('btn-op-reset-all'),
    btnQuickExport: document.getElementById('btn-quick-export'),
    recentWinnersList: document.getElementById('recent-winners-list'),
    emptyRecentState: document.getElementById('empty-recent-state'),
    historySummaryText: document.getElementById('history-summary-text'),

    // Winner Decision Modal (HAPUS & KEEP)
    modalOpWinner: document.getElementById('modal-op-winner'),
    opWinnerPrizeTag: document.getElementById('op-winner-prize-tag'),
    opWinnerNumberDisplay: document.getElementById('op-winner-number-display'),
    btnOpWinnerDelete: document.getElementById('btn-op-winner-delete'),
    btnOpWinnerKeep: document.getElementById('btn-op-winner-keep'),

    // Data Modal
    modalOpData: document.getElementById('modal-op-data'),
    opStatTotal: document.getElementById('op-stat-total'),
    opStatRemaining: document.getElementById('op-stat-remaining'),
    opStatRemoved: document.getElementById('op-stat-removed'),
    btnOpGenerate1000: document.getElementById('btn-op-generate-1000'),
    opFormatRadios: document.querySelectorAll('input[name="op-format-type"]'),
    opExcelInput: document.getElementById('op-excel-input'),
    btnOpBrowseExcel: document.getElementById('btn-op-browse-excel'),
    opExcelDropZone: document.getElementById('op-excel-drop-zone'),
    opExcelFileName: document.getElementById('op-excel-file-name'),

    // History Modal
    modalOpHistory: document.getElementById('modal-op-history'),
    opHistoryTableBody: document.getElementById('op-history-table-body'),
    opHistoryEmpty: document.getElementById('op-history-empty'),
    btnOpExportExcel: document.getElementById('btn-op-export-excel'),
    btnOpClearHistory: document.getElementById('btn-op-clear-history'),

    // Calibration Modal
    modalOpCalibrate: document.getElementById('modal-op-calibrate'),
    opCalibLeft: document.getElementById('op-calib-left'),
    opCalibTop: document.getElementById('op-calib-top'),
    opCalibWidth: document.getElementById('op-calib-width'),
    opCalibHeight: document.getElementById('op-calib-height'),
    opCalibRadius: document.getElementById('op-calib-radius'),
    opCalibFontSize: document.getElementById('op-calib-font-size'),
    opValCalibLeft: document.getElementById('op-val-calib-left'),
    opValCalibTop: document.getElementById('op-val-calib-top'),
    opValCalibWidth: document.getElementById('op-val-calib-width'),
    opValCalibHeight: document.getElementById('op-val-calib-height'),
    opValCalibRadius: document.getElementById('op-val-calib-radius'),
    opValCalibFontSize: document.getElementById('op-val-calib-font-size'),
    btnOpResetCalibration: document.getElementById('btn-op-reset-calibration'),

    // Doorprize - Hapus Semua
    btnClearAllDoorprize: document.getElementById('btn-clear-all-doorprize')
  };

  // --- INDEXEDDB STORAGE FOR CUSTOM BACKGROUNDS ---
  const DB_NAME = 'SF_LuckyDraw_DB';
  const STORE_BG = 'custom_backgrounds';

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_BG)) {
          db.createObjectStore(STORE_BG, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveBackgroundToDb(bgObj) {
    try {
      const db = await openDatabase();
      const tx = db.transaction(STORE_BG, 'readwrite');
      tx.objectStore(STORE_BG).put(bgObj);
    } catch (e) {
      console.warn('DB Save Error:', e);
    }
  }

  async function loadCustomBackgroundsFromDb() {
    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_BG, 'readonly');
        const req = tx.objectStore(STORE_BG).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch (e) {
      return [];
    }
  }

  async function clearAllCustomBackgroundsFromDb() {
    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_BG, 'readwrite');
        tx.objectStore(STORE_BG).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch (e) { }
  }

  // --- INITIALIZATION ---
  function initOperator() {
    loadSavedState();
    setupBroadcastListeners();
    setupEventListeners();
    setupCalibrationControls();
    renderDoorprizeTabs();
    updateLiveMirror();
    updateCounters();
    renderRecentWinners();
    renderHistoryTable();

    // Check if stage display is already active or prompt
    sendBroadcastMessage('CMD_REQUEST_SYNC', {});
  }

  function loadSavedState() {
    const savedPool = localStorage.getItem('sf_available_numbers');
    const savedFormat = localStorage.getItem('sf_format_4digits');
    if (savedFormat !== null) {
      STATE.format4Digits = savedFormat === 'true';
    }

    if (savedPool) {
      try {
        STATE.availableNumbers = JSON.parse(savedPool);
      } catch (e) {
        generateNumbers1To1000();
      }
    } else {
      generateNumbers1To1000();
    }

    const savedHistory = localStorage.getItem('sf_winner_history');
    if (savedHistory) {
      try {
        STATE.winnerHistory = JSON.parse(savedHistory);
      } catch (e) {
        STATE.winnerHistory = [];
      }
    }

    const savedCalib = localStorage.getItem('sf_box_calibration');
    if (savedCalib) {
      try {
        STATE.calibration = JSON.parse(savedCalib);
      } catch (e) { }
    }

    loadCustomBackgroundsFromDb().then((customBgs) => {
      if (customBgs && customBgs.length > 0) {
        STATE.backgrounds = [...STATE.backgrounds, ...customBgs];
        renderDoorprizeTabs();
        updateLiveMirror();
        broadcastFullSync();
      }
    });
  }

  function generateNumbers1To1000() {
    STATE.availableNumbers = [];
    for (let i = 7001; i <= 8000; i++) {
      STATE.availableNumbers.push(i);
    }
    STATE.totalParticipants = STATE.availableNumbers.length;
    saveState();
  }

  function saveState() {
    localStorage.setItem('sf_available_numbers', JSON.stringify(STATE.availableNumbers));
    localStorage.setItem('sf_format_4digits', STATE.format4Digits);
    localStorage.setItem('sf_winner_history', JSON.stringify(STATE.winnerHistory));
    updateCounters();
    broadcastFullSync();
  }

  function formatNumber(num) {
    if (num === undefined || num === null) return '0000';
    if (typeof num === 'string') return num;
    if (STATE.format4Digits) return String(num).padStart(4, '0');
    return String(num);
  }

  function updateCounters() {
    const remaining = STATE.availableNumbers.length;
    const removed = STATE.totalParticipants - remaining;

    if (DOM.opCounterText) {
      DOM.opCounterText.textContent = `Sisa: ${remaining} / ${STATE.totalParticipants} Peserta`;
    }
    if (DOM.opStatTotal) DOM.opStatTotal.textContent = STATE.totalParticipants;
    if (DOM.opStatRemaining) DOM.opStatRemaining.textContent = remaining;
    if (DOM.opStatRemoved) DOM.opStatRemoved.textContent = removed;
    if (DOM.historySummaryText) {
      DOM.historySummaryText.textContent = `${STATE.winnerHistory.length} Pemenang Tercatat &bull; Export Excel`;
    }
  }

  // --- BROADCAST MESSAGING ---
  function sendBroadcastMessage(type, payload = {}) {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type, payload, timestamp: Date.now() });
    }
  }

  function broadcastFullSync() {
    sendBroadcastMessage('CMD_SYNC_ALL', {
      backgrounds: STATE.backgrounds,
      activeBgIndex: STATE.activeBgIndex,
      availableCount: STATE.availableNumbers.length,
      totalCount: STATE.totalParticipants,
      format4Digits: STATE.format4Digits,
      calibration: STATE.calibration,
      soundEnabled: STATE.soundEnabled
    });
  }

  function setupBroadcastListeners() {
    if (!broadcastChannel) return;

    broadcastChannel.onmessage = (event) => {
      const { type, payload } = event.data || {};

      switch (type) {
        case 'DISPLAY_PING':
        case 'DISPLAY_READY':
          // Display view is open and connected!
          setSyncStatus(true);
          broadcastFullSync();
          break;

        case 'DISPLAY_SPIN_FINISHED':
          // Stage has completed rolling animation and landed on winner!
          handleStageSpinFinished(payload);
          break;

        case 'DISPLAY_CLOSED':
          setSyncStatus(false);
          break;
      }
    };
  }

  function setSyncStatus(connected) {
    STATE.displayConnected = connected;
    if (connected) {
      DOM.syncDot.className = 'sync-dot connected';
      DOM.syncStatusText.textContent = 'Layar Videotron Terhubung';
    } else {
      DOM.syncDot.className = 'sync-dot waiting';
      DOM.syncStatusText.textContent = 'Mencari Layar Videotron...';
    }
  }

  // --- BUTTON NAMA-NAMA DOORPRIZE & TABS ---
  function renderDoorprizeTabs() {
    DOM.opDoorprizeTabs.innerHTML = '';

    if (STATE.backgrounds.length === 0) {
      // Empty state: tampilkan info + tombol pulihkan default
      const empty = document.createElement('div');
      empty.className = 'op-tabs-empty-state';
      empty.innerHTML = `
        <span>Tidak ada doorprize. Upload background baru atau pulihkan default.</span>
        <button id="btn-restore-defaults" class="btn-secondary-action" style="margin-top:10px;font-size:12px;padding:7px 16px;">
          🔄 Pulihkan 5 Doorprize Default
        </button>
      `;
      DOM.opDoorprizeTabs.appendChild(empty);

      // Wire up restore button
      const btnRestore = document.getElementById('btn-restore-defaults');
      if (btnRestore) {
        btnRestore.addEventListener('click', () => {
          STATE.backgrounds = [
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
          ];
          STATE.activeBgIndex = 0;
          renderDoorprizeTabs();
          updateLiveMirror();
          broadcastFullSync();
        });
      }

      if (DOM.opActivePrizeName) DOM.opActivePrizeName.textContent = '(Kosong)';
      if (DOM.spinTargetPrize) DOM.spinTargetPrize.textContent = '(Kosong)';
      return;
    }

    STATE.backgrounds.forEach((bg, index) => {
      const btn = document.createElement('button');
      btn.className = `btn-op-doorprize ${index === STATE.activeBgIndex ? 'active' : ''}`;
      btn.innerHTML = `
        <span class="tab-badge">${index + 1}</span>
        <span class="tab-name">${bg.name}</span>
      `;
      btn.addEventListener('click', () => {
        if (STATE.isSpinning) return;
        selectDoorprize(index);
      });
      DOM.opDoorprizeTabs.appendChild(btn);
    });

    const activeBg = STATE.backgrounds[STATE.activeBgIndex];
    if (activeBg) {
      if (DOM.opActivePrizeName) DOM.opActivePrizeName.textContent = activeBg.name;
      if (DOM.spinTargetPrize) DOM.spinTargetPrize.textContent = activeBg.name;
    }
  }

  function selectDoorprize(index) {
    if (index === STATE.activeBgIndex) return;
    STATE.activeBgIndex = index;
    renderDoorprizeTabs();
    updateLiveMirror();

    // Send command to Stage Display
    sendBroadcastMessage('CMD_SWITCH_BG', {
      index,
      background: STATE.backgrounds[index]
    });
  }

  // Live Mirror Preview on Operator Screen
  function updateLiveMirror() {
    const activeBg = STATE.backgrounds[STATE.activeBgIndex];
    if (activeBg && DOM.opMirrorBg) {
      DOM.opMirrorBg.style.backgroundImage = `url("${activeBg.url}")`;
    }
    if (DOM.opMirrorBox) {
      DOM.opMirrorBox.style.left = STATE.calibration.left;
      DOM.opMirrorBox.style.top = STATE.calibration.top;
      DOM.opMirrorBox.style.width = STATE.calibration.width;
      DOM.opMirrorBox.style.height = STATE.calibration.height;
      DOM.opMirrorBox.style.borderRadius = STATE.calibration.radius;
    }
    const sampleNumber = STATE.availableNumbers[0] || 1;
    if (DOM.opMirrorNumber) {
      DOM.opMirrorNumber.textContent = formatNumber(sampleNumber);
    }
  }

  // BUTTON UPLOAD BG: Batch Multi-Upload
  function handleBgUpload(event) {
    const files = Array.from(event.target.files);
    if (!files || files.length === 0) return;

    let loaded = 0;
    files.forEach((file) => {
      let cleanName = file.name.replace(/\.[^/.]+$/, '');
      cleanName = cleanName.replace(/^[\d\s._-]+/, '');
      cleanName = cleanName.replace(/[_-]+/g, ' ').trim();
      if (!cleanName) cleanName = 'Doorprize ' + (STATE.backgrounds.length + 1);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const bgData = {
          id: 'bg-custom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          name: cleanName,
          url: e.target.result,
          isDefault: false
        };

        STATE.backgrounds.push(bgData);
        await saveBackgroundToDb(bgData);

        loaded++;
        if (loaded === files.length) {
          STATE.activeBgIndex = STATE.backgrounds.length - files.length;
          renderDoorprizeTabs();
          updateLiveMirror();
          broadcastFullSync();
          selectDoorprize(STATE.activeBgIndex);
        }
      };
      reader.readAsDataURL(file);
    });

    event.target.value = '';
  }

  // --- BUTTON SPIN ENGINE ---
  function startOperatorSpin() {
    if (STATE.isSpinning) return;

    if (STATE.availableNumbers.length === 0) {
      alert('Semua 1000 nomor peserta sudah diundi! Silakan reset ulang di Kelola Data. (7001-8000)');
      return;
    }

    STATE.isSpinning = true;
    DOM.btnOpSpin.classList.add('spinning');
    DOM.btnOpSpinLabel.textContent = 'MENGUNDI DI STAGE...';

    // Pick random winner from remaining pool
    const randomIndex = Math.floor(Math.random() * STATE.availableNumbers.length);
    const chosenNum = STATE.availableNumbers[randomIndex];
    const currentPrize = STATE.backgrounds[STATE.activeBgIndex]?.name || 'Doorprize';

    STATE.currentPendingWinner = {
      number: chosenNum,
      doorprize: currentPrize,
      indexInPool: randomIndex
    };

    // Send SPIN command to Stage Display View
    sendBroadcastMessage('CMD_START_SPIN', {
      winningNumber: chosenNum,
      doorprizeName: currentPrize,
      duration: 4500
    });

    // In case display is not open, handle fallback local timer
    setTimeout(() => {
      if (STATE.isSpinning) {
        handleStageSpinFinished({ winningNumber: chosenNum, doorprize: currentPrize });
      }
    }, 4800);
  }

  function handleStageSpinFinished(payload) {
    STATE.isSpinning = false;
    DOM.btnOpSpin.classList.remove('spinning');
    DOM.btnOpSpinLabel.textContent = 'PUTAR UNDIAN';

    const winNum = payload?.winningNumber || STATE.currentPendingWinner?.number;
    const prize = payload?.doorprize || STATE.currentPendingWinner?.doorprize;

    if (DOM.opMirrorNumber) {
      DOM.opMirrorNumber.textContent = formatNumber(winNum);
    }

    // Open Modal for Operator decision: HAPUS or KEEP
    DOM.opWinnerPrizeTag.textContent = (prize || 'DOORPRIZE').toUpperCase();
    DOM.opWinnerNumberDisplay.textContent = formatNumber(winNum);
    openModal(DOM.modalOpWinner);
  }

  // --- BUTTON HAPUS & KEEP ACTIONS ---
  function handleWinnerDelete() {
    if (!STATE.currentPendingWinner) return;

    const winNum = STATE.currentPendingWinner.number;
    // 1. Remove from available numbers
    STATE.availableNumbers = STATE.availableNumbers.filter((n) => n !== winNum);

    // 2. Add to history
    STATE.winnerHistory.unshift({
      number: winNum,
      doorprize: STATE.currentPendingWinner.doorprize,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: 'DELETED'
    });

    saveState();
    renderRecentWinners();
    renderHistoryTable();

    // 3. Inform stage display
    sendBroadcastMessage('CMD_WINNER_DECISION', {
      action: 'DELETED',
      number: winNum,
      doorprize: STATE.currentPendingWinner.doorprize
    });

    closeModal(DOM.modalOpWinner);
    STATE.currentPendingWinner = null;
  }

  function handleWinnerKeep() {
    if (!STATE.currentPendingWinner) return;

    const winNum = STATE.currentPendingWinner.number;

    // 1. Keep in pool, add to history as KEPT
    STATE.winnerHistory.unshift({
      number: winNum,
      doorprize: STATE.currentPendingWinner.doorprize,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: 'KEPT'
    });

    saveState();
    renderRecentWinners();
    renderHistoryTable();

    // 2. Inform stage display
    sendBroadcastMessage('CMD_WINNER_DECISION', {
      action: 'KEPT',
      number: winNum,
      doorprize: STATE.currentPendingWinner.doorprize
    });

    closeModal(DOM.modalOpWinner);
    STATE.currentPendingWinner = null;
  }

  // --- RECENT WINNERS LIST & EXPORT ---
  function renderRecentWinners() {
    if (!DOM.recentWinnersList) return;
    DOM.recentWinnersList.innerHTML = '';

    if (STATE.winnerHistory.length === 0) {
      DOM.recentWinnersList.appendChild(DOM.emptyRecentState);
      return;
    }

    // Show last 6 winners in sidebar
    const top6 = STATE.winnerHistory.slice(0, 6);
    top6.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'recent-winner-item';
      const isDel = item.status === 'DELETED';
      card.innerHTML = `
        <div class="winner-item-main">
          <span class="winner-item-num">#${formatNumber(item.number)}</span>
          <span class="winner-item-prize">${item.doorprize}</span>
        </div>
        <div class="winner-item-badge ${isDel ? 'del' : 'keep'}">
          ${isDel ? 'Hapus' : 'Keep'}
        </div>
      `;
      DOM.recentWinnersList.appendChild(card);
    });
  }

  function renderHistoryTable() {
    if (!DOM.opHistoryTableBody) return;
    DOM.opHistoryTableBody.innerHTML = '';

    if (STATE.winnerHistory.length === 0) {
      DOM.opHistoryEmpty.classList.remove('hidden');
      return;
    }

    DOM.opHistoryEmpty.classList.add('hidden');
    STATE.winnerHistory.forEach((item, index) => {
      const tr = document.createElement('tr');
      const isDel = item.status === 'DELETED';
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td><strong>#${formatNumber(item.number)}</strong></td>
        <td>${item.doorprize}</td>
        <td>${item.timestamp}</td>
        <td><span class="${isDel ? 'badge-status-deleted' : 'badge-status-kept'}">${isDel ? 'Dihapus dari Pool' : 'Disimpan di Pool'}</span></td>
      `;
      DOM.opHistoryTableBody.appendChild(tr);
    });
  }

  function exportHistoryToExcel() {
    if (typeof XLSX === 'undefined' || STATE.winnerHistory.length === 0) {
      alert('Belum ada data pemenang untuk diekspor!');
      return;
    }

    const data = STATE.winnerHistory.map((item, idx) => ({
      No: idx + 1,
      'Nomor Pemenang': formatNumber(item.number),
      'Hadiah Doorprize': item.doorprize,
      'Waktu Undian': item.timestamp,
      'Status Pool': item.status === 'DELETED' ? 'Dihapus (Tidak bisa keluar lagi)' : 'Disimpan (Bisa menang lagi)'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pemenang Doorprize');
    XLSX.writeFile(wb, `Pemenang_Smartfren_Fun_Run_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // --- CALIBRATION CONTROLS ---
  function setupCalibrationControls() {
    const update = () => {
      STATE.calibration = {
        left: DOM.opCalibLeft.value + '%',
        top: DOM.opCalibTop.value + '%',
        width: DOM.opCalibWidth.value + '%',
        height: DOM.opCalibHeight.value + '%',
        radius: DOM.opCalibRadius.value + 'px',
        fontSize: DOM.opCalibFontSize.value + 'px'
      };

      DOM.opValCalibLeft.textContent = STATE.calibration.left;
      DOM.opValCalibTop.textContent = STATE.calibration.top;
      DOM.opValCalibWidth.textContent = STATE.calibration.width;
      DOM.opValCalibHeight.textContent = STATE.calibration.height;
      DOM.opValCalibRadius.textContent = STATE.calibration.radius;
      DOM.opValCalibFontSize.textContent = STATE.calibration.fontSize;

      localStorage.setItem('sf_box_calibration', JSON.stringify(STATE.calibration));
      updateLiveMirror();

      // Send live calibration to stage display
      sendBroadcastMessage('CMD_UPDATE_CALIBRATION', { calibration: STATE.calibration });
    };

    [DOM.opCalibLeft, DOM.opCalibTop, DOM.opCalibWidth, DOM.opCalibHeight, DOM.opCalibRadius, DOM.opCalibFontSize].forEach((slider) => {
      if (slider) slider.addEventListener('input', update);
    });

    if (DOM.btnOpResetCalibration) {
      DOM.btnOpResetCalibration.addEventListener('click', () => {
        DOM.opCalibLeft.value = 53.1;
        DOM.opCalibTop.value = 43.7;
        DOM.opCalibWidth.value = 35.4;
        DOM.opCalibHeight.value = 16.1;
        DOM.opCalibRadius.value = 36;
        DOM.opCalibFontSize.value = 110;
        update();
      });
    }
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // 1. BUTTON SPIN
    DOM.btnOpSpin.addEventListener('click', startOperatorSpin);

    // 2. Open Stage Display in New Window
    DOM.btnOpenDisplay.addEventListener('click', () => {
      const displayWin = window.open('display.html', 'SF_Stage_Display', 'width=1280,height=750,menubar=no,toolbar=no');
      if (displayWin) {
        displayWin.focus();
        setSyncStatus(true);
      }
    });

    // 3. Sound Toggle
    DOM.btnToggleSound.addEventListener('click', () => {
      STATE.soundEnabled = !STATE.soundEnabled;
      if (STATE.soundEnabled) {
        DOM.iconSoundOn.classList.remove('hidden');
        DOM.iconSoundOff.classList.add('hidden');
      } else {
        DOM.iconSoundOn.classList.add('hidden');
        DOM.iconSoundOff.classList.remove('hidden');
      }
      sendBroadcastMessage('CMD_SET_SOUND', { soundEnabled: STATE.soundEnabled });
    });

    // 4. Upload BG
    DOM.bgUploadInput.addEventListener('change', handleBgUpload);

    // 4b. Hapus Semua Doorprize
    if (DOM.btnClearAllDoorprize) {
      DOM.btnClearAllDoorprize.addEventListener('click', async () => {
        const total = STATE.backgrounds.length;
        if (total === 0) {
          alert('Tidak ada doorprize yang tersisa untuk dihapus.');
          return;
        }
        if (!confirm(`Hapus SEMUA ${total} doorprize?\n\nSetelah ini daftar doorprize akan kosong. Upload ulang background sesuai kebutuhan.`)) return;

        // Hapus semua custom backgrounds dari IndexedDB
        await clearAllCustomBackgroundsFromDb();

        // Kosongkan seluruh daftar backgrounds
        STATE.backgrounds = [];
        STATE.activeBgIndex = 0;

        // Re-render tabs (tampil kosong)
        renderDoorprizeTabs();

        // Reset mirror preview
        if (DOM.opMirrorBg) DOM.opMirrorBg.style.backgroundImage = 'none';
        if (DOM.opActivePrizeName) DOM.opActivePrizeName.textContent = '(Kosong)';
        if (DOM.spinTargetPrize) DOM.spinTargetPrize.textContent = '(Kosong)';

        // Sync ke layar videotron
        broadcastFullSync();
      });
    }

    // 5. Winner Modal Buttons
    DOM.btnOpWinnerDelete.addEventListener('click', handleWinnerDelete);
    DOM.btnOpWinnerKeep.addEventListener('click', handleWinnerKeep);

    // 6. Navigation Modals
    DOM.btnOpenDataModal.addEventListener('click', () => openModal(DOM.modalOpData));
    DOM.btnOpenHistoryModal.addEventListener('click', () => {
      renderHistoryTable();
      openModal(DOM.modalOpHistory);
    });
    DOM.btnOpenCalibrateModal.addEventListener('click', () => openModal(DOM.modalOpCalibrate));

    DOM.btnOpResetAll.addEventListener('click', () => {
      if (confirm('PERINGATAN: Apakah Anda yakin ingin me-reset seluruh undian ke nomor 7001-8000 dan mengosongkan riwayat?')) {
        STATE.winnerHistory = [];
        generateNumbers1To1000();
        renderRecentWinners();
        renderHistoryTable();
        alert('Undian berhasil direset ke 1000 nomor peserta! (7001-8000)');
      }
    });

    // 7. Modal Close Buttons
    document.querySelectorAll('.modal-close, [data-close]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute('data-close');
        if (targetId) closeModal(document.getElementById(targetId));
      });
    });

    // Backdrop Click to Close
    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          closeModal(backdrop);
        }
      });
    });

    // 8. Excel Import & Export
    DOM.btnOpExportExcel.addEventListener('click', exportHistoryToExcel);
    DOM.btnQuickExport.addEventListener('click', exportHistoryToExcel);
    DOM.btnOpClearHistory.addEventListener('click', () => {
      if (confirm('Kosongkan tabel riwayat pemenang?')) {
        STATE.winnerHistory = [];
        saveState();
        renderRecentWinners();
        renderHistoryTable();
      }
    });

    DOM.btnOpGenerate1000.addEventListener('click', () => {
      if (confirm('Reset ulang daftar ke nomor 7001 s/d 8000?')) {
        generateNumbers1To1000();
        alert('Nomor peserta berhasil direset ke 7001-8000.');
      }
    });

    DOM.opFormatRadios.forEach((r) => {
      r.addEventListener('change', (e) => {
        STATE.format4Digits = e.target.value === '4digits';
        saveState();
        updateLiveMirror();
      });
    });

    DOM.btnOpBrowseExcel.addEventListener('click', () => DOM.opExcelInput.click());
    DOM.opExcelInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) parseExcelFile(e.target.files[0]);
    });

    // 9. Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Winner Modal Active
      if (DOM.modalOpWinner.classList.contains('active')) {
        if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          handleWinnerDelete();
          return;
        }
        if (e.key === 'k' || e.key === 'K') {
          e.preventDefault();
          handleWinnerKeep();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          closeModal(DOM.modalOpWinner);
          return;
        }
      }

      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Spacebar: Spin
      if (e.code === 'Space') {
        e.preventDefault();
        startOperatorSpin();
        return;
      }

      // Arrows: Switch Doorprize
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (!STATE.isSpinning) {
          const next = (STATE.activeBgIndex + 1) % STATE.backgrounds.length;
          selectDoorprize(next);
        }
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (!STATE.isSpinning) {
          const prev = (STATE.activeBgIndex - 1 + STATE.backgrounds.length) % STATE.backgrounds.length;
          selectDoorprize(prev);
        }
        return;
      }

      // M: Mute
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        DOM.btnToggleSound.click();
        return;
      }

      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.active').forEach((m) => closeModal(m));
      }
    });
  }

  function parseExcelFile(file) {
    if (!file || typeof XLSX === 'undefined') return;
    DOM.opExcelFileName.textContent = `Memproses: ${file.name}...`;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const nums = [];
        json.forEach((row) => {
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              const val = parseInt(cell, 10);
              if (!isNaN(val) && val > 0 && !nums.includes(val)) nums.push(val);
            });
          }
        });

        if (nums.length > 0) {
          STATE.availableNumbers = nums.sort((a, b) => a - b);
          STATE.totalParticipants = STATE.availableNumbers.length;
          saveState();
          DOM.opExcelFileName.textContent = `✓ Berhasil memuat ${nums.length} nomor dari ${file.name}`;
          alert(`Sukses! ${nums.length} nomor peserta berhasil diimpor.`);
        } else {
          DOM.opExcelFileName.textContent = `❌ Tidak ditemukan kolom nomor di file.`;
        }
      } catch (err) {
        DOM.opExcelFileName.textContent = `❌ Gagal membaca: ${err.message}`;
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function openModal(el) {
    if (el) el.classList.add('active');
  }

  function closeModal(el) {
    if (el) el.classList.remove('active');
  }

  window.addEventListener('DOMContentLoaded', initOperator);
})();
