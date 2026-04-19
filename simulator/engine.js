// Core state machine - attract, init, gameplay management, bonus, match, ball-over

function insertCoinInternal() {
  G.credits++;
  playSound('credit');
  addLog('Coin inserted. Credits: ' + G.credits);
}

function addPlayer(fromAttract) {
  if (G.credits < 1 && !G.freePlay) return false;
  if (G.currentNumPlayers >= 4) return false;
  if (!G.freePlay) { G.credits--; }
  G.currentNumPlayers++;
  G.scores[G.currentNumPlayers-1] = 0;
  playSound('start');
  addLog('Player ' + G.currentNumPlayers + ' added', 'mode');
  return true;
}

function initGameplay() {
  turnOffAllLamps();
  for (let i=0;i<4;i++) {
    G.bonusX[i]=1; G.baseBonusX[i]=1;
    G.addedBonusQualified[i]=0; G.addedBonusAchieved[i]=0;
    G.bonus[i]=0; G.silverballMode[i]=SB_KNOCK_OUT;
  }
  resetSilverballStatus();
  for (let i=0;i<4;i++) G.scores[i]=0;
  G.samePlayerShootsAgain = false;
  G.currentBallInPlay = 1;
  G.currentPlayer = 0;
  G.machineState = MS_INIT_NEW_BALL;
  G.stateChanged = true;
  addLog('Game started!', 'mode');
}

function initNewBall() {
  const p = G.currentPlayer;
  G.gameMode = G.rulesMode === 'classic' ? GM_SKILL_SHOT : GM_UNSTRUCTURED_PLAY;
  G.ballFirstSwitch = 0;
  G.ballSaveUsed = false;
  G.extraBallCollected = false;
  G.bonus[p] = 0;
  G.currentBonus = 0;
  // Classic: carry via baseBonusX. Original/FRG: reset per ball
  G.bonusX[p] = G.rulesMode === 'classic' ? G.baseBonusX[p] : 1;
  G.scoreMultiplier = 1;
  G.kickerTimeout = 0; G.kickerRolloverWatch = 0; G.kickerStatus = 0;
  G.lastHorseshoe = 0;
  G.superSkillshot = false;
  G.toplaneProgress = 0;
  G.toplanePhase = 0; // 0=center lit (skillshot), toggled by bumpers/slings
  G.toplaneAnimEnd = 0;
  G.silverballHighlightEnd.fill(0);
  G.currentSilverballWord = getCurrentSilverballWord();
  G.lastSilverballSwitch = 0; G.lastSilverballLetter = 0;
  G.spinner1kPhase = 0; G.spinnerAccumulated = 0; G.totalSpins = 0;
  G.altComboPhase = 0; G.altCombosHit = 0; G.altComboExpiration = 0;
  G.addedBonusQualified[p] = 0;
  G.silverballBonusShotTimeout = 0;
  G.numTiltWarnings = 0;
  G.scoreAnimation = 0; G.scoreAnimStart = 0;
  G.awardLightAnimEnd = 0; G.bonusXAnimStart = 0;
  G.extraBallHurryUp = 0;
  G.silverballPhase = 0;
  G.machineState = MS_NORMAL_GAMEPLAY;
  G.stateChanged = true;
  addLog('Ball ' + G.currentBallInPlay + ', Player ' + (p+1), 'mode');
}

function manageGameMode() {
  const t = G.currentTime;
  const p = G.currentPlayer;

  // Expire timers
  if (G.lastHorseshoe && (t - G.lastHorseshoe) > nextHorseshoeTime()) G.lastHorseshoe = 0;
  for (let i=0;i<15;i++) {
    if (G.silverballHighlightEnd[i] && t > G.silverballHighlightEnd[i]) G.silverballHighlightEnd[i]=0;
  }
  // Original/FRG: kicker has no timeout. Classic: timed.
  if (G.rulesMode === 'classic' && G.kickerTimeout && t > G.kickerTimeout) { setKicker(false); }
  if (G.kickerRolloverWatch && t > G.kickerRolloverWatch) {
    setKicker(false); G.kickerRolloverWatch = 0;
    playSound('kicker');
  }
  if (G.toplaneProgress === 0x07) {
    increaseBonusX();
    G.awardLightAnimEnd = t + 2000;
    G.toplaneProgress = 0;
  }
  if (G.extraBallHurryUp && t > G.extraBallHurryUp) G.extraBallHurryUp = 0;
  if (G.altComboExpiration && t > G.altComboExpiration) {
    G.altComboExpiration = 0; G.altCombosHit = 0; G.altComboPhase = 0;
  }
  if (G.silverballBonusShotTimeout && t > G.silverballBonusShotTimeout) G.silverballBonusShotTimeout = 0;

  // Skill shot -> unstructured play on first switch
  if (G.gameMode === GM_SKILL_SHOT && G.ballFirstSwitch) {
    G.gameMode = GM_UNSTRUCTURED_PLAY;
    addLog('Entering normal play', 'event');
  }

  // Score animation tick
  if (G.scoreAnimation > 0 && G.scoreAnimStart) {
    const elapsed = t - G.scoreAnimStart;
    if (elapsed > 2000) {
      G.scores[p] += G.scoreAnimation;
      G.scoreAnimation = 0; G.scoreAnimStart = 0;
    }
  }
}

function runCountdownBonus() {
  const t = G.currentTime;
  const p = G.currentPlayer;
  if (G.stateChanged) {
    G.bonus[p] = G.currentBonus;
    G.bonusCountdownProgress = 0;
    G.lastCountdownTime = t + 600;
    G.bonusCountdownEnd = 0;
    playSound('bonus_1k');
    G.stateChanged = false;
    addLog('Counting bonus...', 'event');
  }

  let delay = G.bonusCountdownProgress >= 25 ? 100 : 50;
  if (G.numTiltWarnings > G.maxTiltWarnings) delay /= 2;

  if (t > G.lastCountdownTime + delay) {
    if (G.bonusCountdownProgress < 25) {
      // Count playfield letters
      while (G.bonusCountdownProgress < 25) {
        const li = G.bonusCountdownProgress < 10 ? G.bonusCountdownProgress : G.bonusCountdownProgress - 10;
        const status = G.silverballStatus[p][li];
        const check = G.bonusCountdownProgress < 10 ? (status >= 0x10) : ((status & 0x0F) > 0);
        if (check) {
          if (G.numTiltWarnings <= G.maxTiltWarnings) {
            playSound('bonus_1k');
            G.scores[p] += 1000 * G.bonusX[p];
          }
          G.bonusCountdownProgress++;
          break;
        }
        G.bonusCountdownProgress++;
      }
    } else if (G.bonusCountdownProgress < 55) {
      // Added bonus stages (simplified)
      const abLevel = G.addedBonusAchieved[p];
      if (G.bonusCountdownProgress < 40 && abLevel >= 60) {
        if (G.numTiltWarnings <= G.maxTiltWarnings) {
          playSound('bonus_1k'); G.scores[p] += 3000 * G.bonusX[p];
        }
        G.bonusCountdownProgress++;
      } else if (G.bonusCountdownProgress < 50 && abLevel >= 30) {
        G.bonusCountdownProgress = Math.max(G.bonusCountdownProgress, 40);
        if (G.numTiltWarnings <= G.maxTiltWarnings) {
          playSound('bonus_1k'); G.scores[p] += 3000 * G.bonusX[p];
        }
        G.bonusCountdownProgress++;
      } else if (abLevel >= 15) {
        G.bonusCountdownProgress = Math.max(G.bonusCountdownProgress, 50);
        if (G.numTiltWarnings <= G.maxTiltWarnings) {
          playSound('bonus_1k'); G.scores[p] += 3000 * G.bonusX[p];
        }
        G.bonusCountdownProgress++;
      } else {
        G.bonusCountdownProgress = 55;
      }
    } else if (!G.bonusCountdownEnd) {
      playSound('bonus_over');
      G.bonusCountdownEnd = t + 1000;
      addLog('Bonus total: ' + G.scores[p].toLocaleString(), 'score');
    }
    G.lastCountdownTime = t;
  }

  if (G.bonusCountdownEnd && t > G.bonusCountdownEnd) {
    G.machineState = MS_BALL_OVER;
    G.stateChanged = true;
  }
}

function runBallOver() {
  if (G.stateChanged) {
    G.stateChanged = false;
    if (G.samePlayerShootsAgain) {
      G.samePlayerShootsAgain = false;
      G.machineState = MS_INIT_NEW_BALL;
      G.stateChanged = true;
      addLog('Shoot again!', 'mode');
      return;
    }
    // Next player or next ball
    G.currentPlayer++;
    if (G.currentPlayer >= G.currentNumPlayers) {
      G.currentPlayer = 0;
      G.currentBallInPlay++;
    }
    if (G.currentBallInPlay > 3) {
      // Game over
      G.machineState = MS_MATCH_MODE;
      G.stateChanged = true;
      addLog('Game Over!', 'mode');
      return;
    }
    G.machineState = MS_INIT_NEW_BALL;
    G.stateChanged = true;
  }
}

function runMatchMode() {
  const t = G.currentTime;
  if (G.stateChanged) {
    G.matchStart = t; G.matchDelay = 1500;
    G.matchDigit = t % 10; G.matchSpins = 0;
    G.scoreMatches = 0; G.stateChanged = false;
    addLog('Match...', 'event');
  }
  if (G.matchSpins < 40) {
    if (t > G.matchStart + G.matchDelay) {
      G.matchDigit = (G.matchDigit+1)%10;
      playSound('match');
      G.matchDelay += 50 + 4*G.matchSpins;
      G.matchSpins++;
      if (G.matchSpins === 40) {
        // Check matches
        for (let i=0; i<G.currentNumPlayers; i++) {
          if (Math.floor(G.scores[i]/10)%10 === G.matchDigit) {
            G.scoreMatches |= (1<<i);
            G.credits++;
            addLog('Player ' + (i+1) + ' matched!', 'score');
          }
        }
        G.matchDelay = (t - G.matchStart) + 3000;
      }
    }
  } else if (t > G.matchStart + G.matchDelay) {
    G.machineState = MS_ATTRACT;
    G.stateChanged = true;
  }
}

function runAttractMode() {
  if (G.stateChanged) {
    turnOffAllLamps();
    G.currentBallInPlay = 0;
    G.stateChanged = false;
  }
  // Cycle head lamps
  const phase = Math.floor(G.currentTime / 150) % 10;
  for (let i=0; i<10; i++) setLamp('head-'+i, i<=phase);
  setLamp('hl-gameover', true, 0, Math.floor(G.currentTime/8000)%2 ? 0 : 500);
  setLamp('hl-highscore', false, 0, Math.floor(G.currentTime/8000)%2 ? 500 : 0);
  applyLampsToDom();
}
