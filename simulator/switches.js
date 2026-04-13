// Main switch handler - called when any playfield element is clicked
function handleSwitch(sw) {
  if (G.machineState === MS_ATTRACT) {
    handleAttractSwitch(sw);
    return;
  }
  if (G.machineState !== MS_NORMAL_GAMEPLAY) return;

  // Original mode: simple flat scoring
  if (G.rulesMode === 'original') {
    handleSwitchOriginal(sw);
    return;
  }

  // Classic + New modes (SBM23 rules)
  handleSwitchSBM23(sw);
}

// ============================================================
// ORIGINAL 1980 BALLY RULES
// Based on actual Silverball Mania ruleset
// ============================================================
function handleSwitchOriginal(sw) {
  const p = G.currentPlayer;
  if (G.numTiltWarnings > G.maxTiltWarnings) return;

  // Current completion level (starts at 1 = SB_KNOCK_OUT)
  const curLevel = G.silverballMode[p];
  // Helper: check if a letter is lit at current level
  function isLetterLit(i) { return (G.silverballStatus[p][i] & 0x0F) >= curLevel; }
  // Helper: check if MANIA (10-14) all lit -> spinners should be lit
  function maniaComplete() { for(let i=10;i<15;i++) if(!isLetterLit(i)) return false; return true; }
  // Helper: check if MANIA complete -> light spinners
  // Also handles carry-over: if MANIA was already complete from prior ball,
  // any new SILVERBALL letter relit triggers spinner activation
  function checkManiaSpinners() {
    if (maniaComplete() && !G.spinner1kPhase) {
      G.spinner1kPhase = 1;
      addLog('MANIA complete - spinners lit!','mode');
    }
  }
  // Helper: spot next unlit letter
  function spotNextLetter() {
    for (let i=0;i<15;i++) {
      if (!isLetterLit(i)) {
        G.silverballStatus[p][i] = (G.silverballStatus[p][i]&0xF0)|curLevel;
        G.silverballHighlightEnd[i] = G.currentTime+5000;
        playSound('letter');
        addLog('Spotted '+LETTER_NAMES[i],'event');
        checkManiaSpinners();
        origCheckSBMComplete();
        return;
      }
    }
  }
  // Helper: light a specific letter
  function lightLetter(i) {
    if (i===255 || isLetterLit(i)) return false;
    G.silverballStatus[p][i] = (G.silverballStatus[p][i]&0xF0)|curLevel;
    G.silverballHighlightEnd[i] = G.currentTime+5000;
    playSound('letter');
    addLog('Lit '+LETTER_NAMES[i]+' +1K','score');
    origCheckSBMComplete();
    return true;
  }

  switch (sw) {
    case SW_TILT:
      handleTilt();
      break;

    // --- TOP LANES ---
    // Center: always 5K, always lights kicker, spots letter when lit
    // Outer: 500 always, spot letter when lit
    // Lit state toggled by bumpers/rebounds/slings
    case SW_TOP_CENTER:
      G.scores[p] += 5000;
      setKicker(true);
      if (G.toplanePhase === 0) {
        spotNextLetter();
        // Center lane used — toggle to outer lanes
        G.toplanePhase = 1;
      }
      playSound('rollover');
      addLog('Center lane +5K, kicker lit','score');
      if (!G.ballFirstSwitch) G.ballFirstSwitch = G.currentTime;
      break;

    case SW_TOP_LEFT: case SW_TOP_RIGHT:
      G.scores[p] += 500;
      if (G.toplanePhase === 1) { spotNextLetter(); } // outer lit = spot letter
      playSound('rollover');
      addLog('Outer lane +500','score');
      if (!G.ballFirstSwitch) G.ballFirstSwitch = G.currentTime;
      break;

    // --- PASSIVE BUMPERS (50pt, toggle lanes/spinners) ---
    // These are the 4 bumpers at top in original, but we use SW_REBOUNDS
    case SW_REBOUNDS:
      G.scores[p] += 50;
      G.toplanePhase = (G.toplanePhase + 1) % 2;
      if (G.spinner1kPhase) { G.spinner1kPhase = G.spinner1kPhase===1?2:1; }
      playSound('50pt');
      break;

    // --- THUMPER BUMPERS (100pt) ---
    case SW_LEFT_BUMPER: case SW_RIGHT_BUMPER: case SW_CENTER_BUMPER:
      G.scores[p] += 100;
      playSound('bumper');
      if (!G.ballFirstSwitch) G.ballFirstSwitch = G.currentTime;
      break;

    // --- SLINGSHOTS (20pt, toggle lanes/spinners) ---
    case SW_LEFT_SLING: case SW_RIGHT_SLING:
      G.scores[p] += 20;
      G.toplanePhase = (G.toplanePhase + 1) % 2;
      if (G.spinner1kPhase) { G.spinner1kPhase = G.spinner1kPhase===1?2:1; }
      playSound('sling');
      if (!G.ballFirstSwitch) G.ballFirstSwitch = G.currentTime;
      break;

    // --- SPINNERS (1K lit, 100 unlit) ---
    // Lit by spelling MANIA, toggled by bumpers/slings
    case SW_LEFT_SPINNER: case SW_RIGHT_SPINNER: {
      const spinnerLit = maniaComplete() && (
        (G.spinner1kPhase===1 && sw===SW_LEFT_SPINNER) ||
        (G.spinner1kPhase===2 && sw===SW_RIGHT_SPINNER));
      G.scores[p] += spinnerLit ? 1000 : 100;
      playSound(spinnerLit ? 'spinner_high' : 'spinner_low');
      break; }

    // --- CENTER HOOP (5K, spots letter, advances bonus X, lights kicker) ---
    case SW_HOOP_ROLLOVER:
      G.scores[p] += 5000;
      spotNextLetter();
      increaseBonusX();  // horseshoe directly advances bonus X in original
      setKicker(true);
      playSound('horseshoe');
      addLog('Horseshoe +5K, spot letter, bonus X up, kicker lit','score');
      // Extra ball: lit at N target after bonus X reaches 5X (5th horseshoe hit)
      // In original mode, EB stays lit permanently (no timeout)
      if (G.bonusX[p] >= 5 && !G.extraBallCollected && !G.extraBallHurryUp) {
        G.extraBallHurryUp = 0xFFFFFFFF; // permanent — no timeout
        addLog('Extra Ball lit at N target!','mode');
      }
      if (!G.ballFirstSwitch) G.ballFirstSwitch = G.currentTime;
      break;

    // --- KICKER (5K lit, 500 unlit) ---
    case SW_KICKER_ROLLOVER:
      if (G.kickerStatus) {
        G.scores[p] += 5000;
        playSound('kicker');
        addLog('Kicker collect +5K','score');
        setKicker(false); // kicker drops after each use
      } else {
        G.scores[p] += 500;
        playSound('unlit');
        addLog('Kicker (unlit) +500','score');
      }
      if (!G.ballFirstSwitch) G.ballFirstSwitch = G.currentTime;
      break;

    // --- LETTER TARGETS ---
    // Lit: 1K and collect letter. Unlit: 500.
    case SW_RIGHT_A: case SW_LEFT_B: case SW_LEFT_R: case SW_LEFT_E:
    case SW_TOP_V: case SW_TOP_L: case SW_TOP_I: case SW_TOP_S:
    case SW_RIGHT_OUTLANE_A: case SW_RIGHT_INLANE_I:
    case SW_LEFT_INLANE_A: case SW_LEFT_OUTLANE_M:
    case SW_LOWER_L_SIDE: case SW_UPPER_L_SIDE: {
      const letterNum = SW_TO_LETTER[sw - SW_RIGHT_A];
      if (letterNum !== 255 && lightLetter(letterNum)) {
        G.scores[p] += 1000;
        checkManiaSpinners();
      } else {
        G.scores[p] += 500;
        playSound('unlit');
        addLog('Unlit target +500','score');
      }
      if (!G.ballFirstSwitch) G.ballFirstSwitch = G.currentTime;
      break; }

    // --- CENTER N TARGET ---
    // Collects extra ball when lit, also collects N letter
    case SW_CENTER_TARGET: {
      const nIdx = 12; // N is letter index 12
      if (lightLetter(nIdx)) {
        G.scores[p] += 1000;
        checkManiaSpinners();
      } else {
        G.scores[p] += 500;
        playSound('unlit');
      }
      // Extra ball collection
      if (G.extraBallHurryUp && !G.extraBallCollected) {
        G.extraBallCollected = true;
        G.samePlayerShootsAgain = true;
        G.extraBallHurryUp = 0;
        addLog('EXTRA BALL collected!','mode');
      }
      if (!G.ballFirstSwitch) G.ballFirstSwitch = G.currentTime;
      break; }

    case SW_OUTHOLE:
      handleDrain();
      break;
  }
}

// Check if SILVERBALL MANIA fully spelled (original rules)
function origCheckSBMComplete() {
  const p = G.currentPlayer;
  for (let i=0;i<15;i++) {
    if ((G.silverballStatus[p][i] & 0x0F) < 1) return;
  }
  // All 15 lit! Count completions via silverballMode
  G.silverballMode[p]++;
  // Reset letters for next round (but they carry ball-to-ball, completions stack)
  for (let i=0;i<15;i++) G.silverballStatus[p][i] = G.silverballStatus[p][i] & 0xF0;
  // Awards: 1st=15K wizard, 2nd=30K supreme wizard, 3rd+=special
  if (G.silverballMode[p] === 2) {
    G.addedBonusAchieved[p] = 15;
    addLog('SILVERBALL MANIA! Wizard Bonus 15K lit','mode');
    playSound('completion');
  } else if (G.silverballMode[p] === 3) {
    G.addedBonusAchieved[p] = 30;
    addLog('SILVERBALL MANIA x2! Supreme Wizard 30K lit','mode');
    playSound('completion');
  } else if (G.silverballMode[p] >= 4) {
    G.addedBonusAchieved[p] = 30; // keep supreme wizard bonus
    G.credits++;
    addLog('SILVERBALL MANIA x'+(G.silverballMode[p]-1)+'! SPECIAL - free credit!','mode');
    playSound('completion');
  }
  G.spinner1kPhase = 0; // spinners unlit after completion
}

// ============================================================
// SBM23 RULES (Classic + New)
// ============================================================
function handleSwitchSBM23(sw) {
  const p = G.currentPlayer;
  const m = G.scoreMultiplier;
  if (G.numTiltWarnings > G.maxTiltWarnings) return;

  switch (sw) {
    case SW_TILT:
      handleTilt();
      break;

    case SW_TOP_LEFT: case SW_TOP_RIGHT:
      if (G.gameMode===GM_SKILL_SHOT && G.toplanePhase===1) {
        spotSilverballLetter(); playSound('skill_shot');
        startScoreAnim(m * 10000); addLog('Skill Shot! +10K', 'score');
      } else {
        playSound('rollover'); G.scores[p] += m * 100;
        const bit = sw===SW_TOP_LEFT ? 0x01 : 0x04;
        if (G.toplaneProgress & bit) { startScoreAnim(m*5000); addLog('Top lane +5K','score'); }
        else G.scores[p] += m*100;
      }
      if (sw===SW_TOP_LEFT) G.toplaneProgress |= 0x01; else G.toplaneProgress |= 0x04;
      if (!G.ballFirstSwitch) G.ballFirstSwitch = G.currentTime;
      break;

    case SW_TOP_CENTER:
      if (G.gameMode===GM_SKILL_SHOT && G.toplanePhase===0) {
        playSound('skill_shot'); spotSilverballLetter();
        startScoreAnim(m*10000); setKicker(true, 15000);
        addLog('Center Skill Shot! +10K', 'score');
      } else {
        if (G.toplaneProgress & 0x02) { startScoreAnim(m*5000); addLog('Center lane +5K','score'); }
        else G.scores[p] += m*100;
        playSound('rollover');
      }
      G.toplaneProgress |= 0x02;
      if (!G.ballFirstSwitch) G.ballFirstSwitch = G.currentTime;
      break;

    case SW_LEFT_SPINNER: case SW_RIGHT_SPINNER:
      G.totalSpins++;
      if (G.totalSpins > 20 && G.spinner1kPhase===0) G.spinner1kPhase = 1;
      if (advanceAlternatingCombo(sw)) {
        G.scores[p] += m*1500; playSound('spinner_high');
        addLog('Combo spinner +1.5K','score');
      } else if (G.spinner1kPhase===1 && sw===SW_LEFT_SPINNER) {
        G.scores[p] += m*1000; playSound('spinner_high');
      } else if (G.spinner1kPhase===2 && sw===SW_RIGHT_SPINNER) {
        G.scores[p] += m*1000; playSound('spinner_high');
      } else {
        G.scores[p] += m*100; playSound('spinner_low');
      }
      break;

    case SW_KICKER_ROLLOVER:
      G.kickerRolloverWatch = G.currentTime + 1000;
      if (G.addedBonusQualified[p]) {
        G.awardLightAnimEnd = G.currentTime + 1500;
        playSound('collect');
        G.addedBonusAchieved[p] = G.addedBonusQualified[p];
        addLog('Collected '+G.addedBonusQualified[p]+'K bonus!', 'score');
      }
      if (G.kickerStatus) {
        if (G.addedBonusQualified[p]) startScoreAnim(m*5000*G.addedBonusQualified[p]);
        else { startScoreAnim(m*5000); playSound('kicker'); }
      }
      G.addedBonusQualified[p] = 0;
      if (!G.ballFirstSwitch) G.ballFirstSwitch = G.currentTime;
      break;

    case SW_HOOP_ROLLOVER: {
      let score = 0;
      if (G.gameMode===GM_SKILL_SHOT) {
        score = m*20000; playSound('skill_shot'); G.superSkillshot = true;
        addLog('Horseshoe Skill Shot! +20K','score');
      } else {
        if (advanceAlternatingCombo(sw)) {
          score = m*15000; playSound('collect'); addLog('Combo collect +15K','score');
        } else { score = m*5000; playSound('horseshoe'); addLog('Horseshoe +5K','score'); }
      }
      startScoreAnim(score);
      setKicker(true);
      G.lastHorseshoe = G.currentTime;
      if (!G.silverballBonusShotTimeout) G.silverballBonusShotTimeout = G.currentTime + 15000;
      if (!G.ballFirstSwitch) G.ballFirstSwitch = G.currentTime;
      break; }

    case SW_LEFT_BUMPER: case SW_RIGHT_BUMPER: case SW_CENTER_BUMPER:
      G.scores[p] += m*100; playSound('bumper');
      if (!G.ballFirstSwitch) G.ballFirstSwitch = G.currentTime;
      break;

    case SW_RIGHT_A: case SW_LEFT_B: case SW_LEFT_R: case SW_LEFT_E:
    case SW_TOP_V: case SW_TOP_L: case SW_TOP_I: case SW_TOP_S:
    case SW_RIGHT_OUTLANE_A: case SW_RIGHT_INLANE_I: case SW_CENTER_TARGET:
    case SW_LEFT_INLANE_A: case SW_LEFT_OUTLANE_M:
    case SW_LOWER_L_SIDE: case SW_UPPER_L_SIDE:
      handleSilverballHit(sw);
      advanceAlternatingCombo(sw);
      if (!G.ballFirstSwitch) G.ballFirstSwitch = G.currentTime;
      break;

    case SW_REBOUNDS:
      G.toplanePhase = (G.toplanePhase + 1) % 2;
      if (G.spinner1kPhase) { G.spinner1kPhase++; if (G.spinner1kPhase>2) G.spinner1kPhase=1; }
      if (G.silverballMode[p] < 5) rotateMania();
      playSound('50pt'); G.scores[p] += m*50;
      break;

    case SW_LEFT_SLING: case SW_RIGHT_SLING:
      G.scores[p] += m*10; playSound('sling');
      if (!G.ballFirstSwitch) G.ballFirstSwitch = G.currentTime;
      break;

    case SW_OUTHOLE:
      handleDrain();
      break;
  }
}

// Shared helpers
function handleTilt() {
  if (G.ballFirstSwitch) {
    if ((G.currentTime - G.lastTiltWarning) > TILT_DEBOUNCE) {
      G.lastTiltWarning = G.currentTime;
      G.numTiltWarnings++;
      if (G.numTiltWarnings > G.maxTiltWarnings) {
        turnOffAllLamps();
        playSound('tilt');
        addLog('TILT!', 'mode');
      } else { playSound('tilt_warn'); addLog('Tilt warning ' + G.numTiltWarnings); }
    }
  } else { playSound('tilt_warn'); G.lastTiltWarning = G.currentTime; }
}

function handleAttractSwitch(sw) {
  if (sw===SW_CREDIT_RESET) { if (addPlayer(true)) initGameplay(); }
  if (sw===SW_COIN_1||sw===SW_COIN_2||sw===SW_COIN_3) insertCoinInternal();
}

function startScoreAnim(amount) {
  if (G.scoreAnimation) G.scores[G.currentPlayer] += G.scoreAnimation;
  G.scoreAnimation = amount;
  G.scoreAnimStart = G.currentTime;
}

function setKicker(on, duration) {
  duration = duration || 2000;
  if (on && !G.kickerStatus) {
    G.kickerStatus = 1;
    // Original: kicker stays up until ball hits it (no timeout)
    G.kickerTimeout = G.rulesMode === 'original' ? 0 : G.currentTime + duration;
    playSound('kicker');
  } else if (!on) { G.kickerStatus = 0; G.kickerTimeout = 0; }
}

function handleDrain() {
  if (!G.ballFirstSwitch) { addLog('Ball returned to plunger'); return; }
  const ballSaveEnd = G.ballFirstSwitch + (G.ballSaveSeconds-1)*1000;
  if (G.rulesMode !== 'original' && G.ballSaveSeconds && !G.ballSaveUsed && G.currentTime < ballSaveEnd) {
    G.ballSaveUsed = true;
    G.ballFirstSwitch = 0;
    addLog('Ball saved!', 'event');
    playSound('start');
    return;
  }
  playSound('drain');
  addLog('Ball drained', 'event');
  G.machineState = MS_COUNTDOWN_BONUS;
  G.stateChanged = true;
}
