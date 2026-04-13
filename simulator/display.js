// Display and UI update functions

function formatScore(score) {
  if (score === 0) return '00';
  return score.toLocaleString();
}

function updateDisplays() {
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById('disp-p' + (i+1));
    if (i < G.currentNumPlayers) {
      el.textContent = formatScore(G.scores[i]);
      el.className = 'display-score' + (i === G.currentPlayer && G.machineState > 0 ? ' active' : '');
    } else {
      el.textContent = '';
      el.className = 'display-score';
    }
  }
  document.getElementById('disp-credits').textContent = G.credits;
  document.getElementById('disp-bip').textContent = G.currentBallInPlay || '';
}

function updateStatus() {
  const p = G.currentPlayer;
  const modeNames = {
    [MS_ATTRACT]: 'Attract', [MS_INIT_GAMEPLAY]: 'Starting...',
    [MS_INIT_NEW_BALL]: 'New Ball', [MS_NORMAL_GAMEPLAY]: 'Playing',
    [MS_COUNTDOWN_BONUS]: 'Bonus', [MS_BALL_OVER]: 'Ball Over',
    [MS_MATCH_MODE]: 'Match',
  };
  const gmNames = { [GM_SKILL_SHOT]: 'Skill Shot', [GM_UNSTRUCTURED_PLAY]: 'Normal Play' };
  const sbNames = { [SB_KNOCK_OUT]: 'Knock Out', [SB_WORD_GROUPS]: 'Word Groups', [SB_FADEAWAY]: 'Fadeaway' };

  let mode = modeNames[G.machineState] || '??';
  if (G.machineState === MS_NORMAL_GAMEPLAY) mode += ' / ' + (gmNames[G.gameMode] || '??');

  const el = id => document.getElementById(id);
  el('st-mode').textContent = mode;
  el('st-bonusx').textContent = G.bonusX[p] + 'X';
  el('st-bonus').textContent = G.currentBonus + 'K';
  el('st-sbmode').textContent = sbNames[G.silverballMode[p]] || '--';

  let litCount = 0;
  if (G.silverballStatus) {
    for (let i=0;i<15;i++) if ((G.silverballStatus[p][i]&0x0F) >= G.silverballMode[p]) litCount++;
  }
  el('st-letters').textContent = litCount + '/15';

  let comboText = '--';
  if (G.altComboPhase === 10) comboText = 'COLLECT!';
  else if (G.altComboPhase > 0) comboText = 'Phase ' + G.altComboPhase + ' (' + G.altCombosHit + ' hits)';
  el('st-combo').textContent = comboText;

  let abText = '--';
  if (G.addedBonusQualified[p]) abText = 'Qualified: ' + G.addedBonusQualified[p] + 'K';
  else if (G.addedBonusAchieved[p]) abText = 'Achieved: ' + G.addedBonusAchieved[p] + 'K';
  el('st-addbonus').textContent = abText;

  el('st-kicker').textContent = G.kickerStatus ? 'ON' : 'OFF';
  el('st-tilt').textContent = G.numTiltWarnings + '/' + G.maxTiltWarnings;
}

function addLog(msg, cls='event') {
  G.log.unshift({msg, cls, t: G.currentTime});
  if (G.log.length > 100) G.log.pop();
  const el = document.getElementById('log');
  el.innerHTML = G.log.slice(0,40).map(e =>
    `<div class="entry ${e.cls}">${e.msg}</div>`
  ).join('');
}
