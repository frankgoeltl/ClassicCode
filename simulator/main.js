// Main game loop, keyboard, click handlers, boot

function gameLoop(timestamp) {
  G.currentTime = timestamp;

  switch (G.machineState) {
    case MS_ATTRACT:
      runAttractMode();
      break;
    case MS_INIT_GAMEPLAY:
      initGameplay();
      break;
    case MS_INIT_NEW_BALL:
      initNewBall();
      break;
    case MS_NORMAL_GAMEPLAY:
      manageGameMode();
      updateAllLamps();
      break;
    case MS_COUNTDOWN_BONUS:
      runCountdownBonus();
      break;
    case MS_BALL_OVER:
      runBallOver();
      break;
    case MS_MATCH_MODE:
      runMatchMode();
      break;
  }

  updateDisplays();
  updateStatus();
  requestAnimationFrame(gameLoop);
}

// Public control functions (called from HTML buttons and keyboard)
function insertCoin() { insertCoinInternal(); }
function pressStart() {
  if (G.machineState === MS_ATTRACT) {
    if (addPlayer(true)) initGameplay();
  } else if (G.machineState === MS_NORMAL_GAMEPLAY && G.currentBallInPlay < 2) {
    addPlayer(false);
  }
  // All other states: ignore start button (no restart mid-game)
}
function plunge() {
  if (G.machineState === MS_NORMAL_GAMEPLAY && !G.ballFirstSwitch) {
    addLog('Ball plunged!', 'event');
    // Simulate ball entering toplane area
    const lanes = [SW_TOP_LEFT, SW_TOP_CENTER, SW_TOP_RIGHT];
    const pick = lanes[Math.floor(Math.random()*3)];
    setTimeout(() => handleSwitch(pick), 300);
  }
}
function tilt() { handleSwitch(SW_TILT); }

function toggleRulesMode() {
  G.rulesMode = G.rulesMode === 'classic' ? 'original' : 'classic';
  const btn = document.getElementById('btn-rules');
  if (G.rulesMode === 'classic') {
    btn.textContent = 'SBM23 (Custom Rules)';
    btn.style.background = '#444';
    btn.style.borderColor = '#666';
  } else {
    btn.textContent = 'Original (1980 Bally)';
    btn.style.background = '#224422';
    btn.style.borderColor = '#44aa44';
  }
  addLog('Rules: ' + btn.textContent, 'mode');
}
window.toggleRulesMode = toggleRulesMode;

// Expose to HTML onclick
window.G = G;
window.G.insertCoin = insertCoin;
window.G.pressStart = pressStart;
window.G.plunge = plunge;
window.G.tilt = tilt;

// Keyboard bindings
document.addEventListener('keydown', e => {
  switch(e.key.toLowerCase()) {
    case 'c': insertCoin(); break;
    case 'enter': pressStart(); e.preventDefault(); break;
    case ' ': plunge(); e.preventDefault(); break;
    case 't': tilt(); break;
  }
});

// Click handlers for playfield elements
document.addEventListener('click', e => {
  const el = e.target.closest('[data-sw]');
  if (el) {
    const sw = parseInt(el.dataset.sw);
    handleSwitch(sw);
    // Visual feedback
    el.style.filter = 'brightness(2)';
    setTimeout(() => el.style.filter = '', 150);
  }
  // Plunger
  if (e.target.closest('#plunger')) plunge();
});

// Boot
document.addEventListener('DOMContentLoaded', () => {
  buildPlayfield();
  G.machineState = MS_ATTRACT;
  G.stateChanged = true;
  addLog('Silverball Mania simulator ready', 'mode');
  addLog('Insert coin (C) and press Start (Enter)', 'event');
  requestAnimationFrame(gameLoop);
});
