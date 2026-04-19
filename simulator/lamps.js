// Lamp management system
function setLamp(id, on, dim, flashMs) {
  // Original mode: no flashing, lamps are on or off
  G.lamps[id] = { on:!!on, dim:!!dim, flash: G.rulesMode==='original' ? 0 : (flashMs||0) };
}

function turnOffAllLamps() {
  G.lamps = {};
  document.querySelectorAll('.lamp').forEach(el => {
    el.classList.remove('on','flash','dim');
    el.style.background = '#444';
    el.style.color = '';
  });
}

function applyLampsToDom() {
  // Head lamps: S I L V E R B A L L
  const headIds = ['hl-S','hl-I1','hl-L1','hl-V','hl-E','hl-R','hl-B','hl-A','hl-L2','hl-L3'];
  headIds.forEach((id,i) => {
    const el = document.getElementById(id);
    const st = G.lamps['head-'+i];
    if (!el) return;
    el.classList.toggle('on', st?.on || false);
    el.classList.toggle('flash', (st?.flash || 0) > 0);
    if (st?.flash) el.style.setProperty('--flash-period', st.flash + 'ms');
  });

  // Special head lamps
  ['highscore','gameover','tilt','match'].forEach(k => {
    const el = document.getElementById('hl-'+k);
    const st = G.lamps['hl-'+k];
    if (!el) return;
    el.classList.toggle('on', st?.on || false);
    el.classList.toggle('flash', (st?.flash || 0) > 0);
    if (st?.flash) el.style.setProperty('--flash-period', st.flash + 'ms');
  });

  // Playfield lamps (generic handler)
  document.querySelectorAll('.lamp[data-lamp]').forEach(el => {
    const key = el.dataset.lamp;
    const st = G.lamps[key];
    const on = st?.on || false;
    el.classList.toggle('on', on);
    el.classList.toggle('flash', (st?.flash || 0) > 0);
    el.classList.toggle('dim', st?.dim || false);
    if (st?.flash) el.style.setProperty('--flash-period', st.flash + 'ms');
    el.style.background = on ? '#F5C518' : '#ddd';
    el.style.borderColor = on ? '#F0A500' : '#bbb';
  });
}

function updateAllLamps() {
  if (G.machineState === MS_ATTRACT) return; // attract has its own lamp logic
  const p = G.currentPlayer;
  const t = G.currentTime;

  // Bonus lamps (15K, 30K, Kicker Special)
  setLamp('15k', G.addedBonusQualified[p]===15 || G.addedBonusAchieved[p]>=15, 0, G.addedBonusQualified[p]===15?200:0);
  setLamp('30k', G.addedBonusQualified[p]===30 || G.addedBonusAchieved[p]>=30, 0, G.addedBonusQualified[p]===30?200:0);
  setLamp('special', G.addedBonusQualified[p]===60 || G.addedBonusAchieved[p]>=60, 0, G.addedBonusQualified[p]===60?200:0);

  // Bonus X lamps - only current multiplier is lit
  for (let x=2; x<=5; x++) {
    const horseshoeActive = G.lastHorseshoe && (t-G.lastHorseshoe) < nextHorseshoeTime();
    if (horseshoeActive) setLamp('bx'+x, x===G.bonusX[p]+1, 0, 125); // flash next available
    else setLamp('bx'+x, G.bonusX[p]===x, 0, 0);
  }

  // Extra ball
  setLamp('eb', G.extraBallHurryUp > t, 0, G.extraBallHurryUp > t ? 250 : 0);

  // Spinner lamps
  const leftCombo = G.altComboPhase < 10 && G.altComboPhase % 2;
  const rightCombo = G.altComboPhase && G.altComboPhase < 10 && !(G.altComboPhase % 2);
  if (G.rulesMode==='frg' && !leftCombo && !rightCombo && G.spinner1kPhase===0 && G.spinnerAccumulated>=10) {
    const fp = G.spinnerAccumulated >= 25 ? 125 : 250;
    setLamp('lspin', true, 0, fp);
    setLamp('rspin', true, 0, fp);
  } else {
    setLamp('lspin', G.spinner1kPhase===1 || leftCombo, 0, leftCombo?100:0);
    setLamp('rspin', G.spinner1kPhase===2 || rightCombo, 0, rightCombo?100:0);
  }

  // Toplane lamps
  // toplanePhase 0 = center lit, 1 = outer lit (toggled by bumpers/slings)
  if (G.gameMode === GM_SKILL_SHOT) {
    setLamp('tl-center', G.toplanePhase===0, 0, 0);
    setLamp('tl-outer', G.toplanePhase===1, 0, 0);
  } else {
    setLamp('tl-center', G.toplanePhase===0, 0, 0);
    setLamp('tl-outer', G.toplanePhase===1, 0, 0);
  }

  // Kicker lamp
  if (G.kickerStatus) {
    if (G.kickerTimeout) {
      const remaining = G.kickerTimeout - t;
      setLamp('kicker', true, 0, remaining<5000?125:500);
    } else {
      // Original/FRG: no timeout, solid on
      setLamp('kicker', true, 0, 0);
    }
  } else { setLamp('kicker', false); }

  // Shoot again (ball save is SBM23/classic only)
  if (G.samePlayerShootsAgain) setLamp('again', true, 0, 0);
  else if (G.rulesMode === 'classic' && G.ballFirstSwitch && G.ballSaveSeconds && !G.ballSaveUsed) {
    const remaining = (G.ballFirstSwitch + (G.ballSaveSeconds-1)*1000) - t;
    if (remaining > 0) setLamp('again', true, 0, remaining<1000?100:500);
    else setLamp('again', false);
  } else setLamp('again', false);

  // Silverball spellout lamps
  updateSilverballLamps();

  applyLampsToDom();
}

function updateSilverballLamps() {
  const p = G.currentPlayer;
  for (let i=0; i<15; i++) {
    const status = G.silverballStatus[p][i];
    const collected = (status & 0x0F) >= G.silverballMode[p];
    const highlighted = G.silverballHighlightEnd[i] > G.currentTime;
    setLamp('spell-'+i, collected, 0, highlighted?200:0);
    setLamp('standup-'+i, !collected || highlighted, 0, highlighted?175:0);
  }
  // Head lamps (backglass SILVERBALL, first 10 letters only)
  for (let i=0; i<10; i++) {
    if (G.rulesMode === 'classic') {
      // SBM23: head lamps use high nibble (carry-over progress)
      const headLevel = (G.silverballStatus[p][i] & 0xF0) >> 4;
      setLamp('head-'+i, headLevel > 0, 0, 0);
    } else {
      // Original/FRG: head lamps reflect current letter collection (low nibble)
      setLamp('head-'+i, (G.silverballStatus[p][i] & 0x0F) >= G.silverballMode[p], 0, 0);
    }
  }
}

function nextHorseshoeTime() {
  return 12000 - G.bonusX[G.currentPlayer] * 2000;
}
