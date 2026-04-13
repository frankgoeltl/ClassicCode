// Global game state object
const G = {
  // Core state
  machineState: MS_ATTRACT,
  stateChanged: true,
  currentTime: 0,
  gameMode: GM_SKILL_SHOT,

  // Players
  currentPlayer: 0,
  currentBallInPlay: 0,
  currentNumPlayers: 0,
  scores: [0,0,0,0],
  credits: 0,
  freePlay: false,
  highScore: 100000,

  // Bonus
  bonus: [0,0,0,0],
  currentBonus: 0,
  bonusX: [1,1,1,1],
  baseBonusX: [1,1,1,1],
  scoreMultiplier: 1,
  bonusCountdownProgress: 0,
  lastCountdownTime: 0,
  bonusCountdownEnd: 0,

  // Silverball letters: [4 players][15 letters] - nibbles: low=playfield, high=head
  silverballStatus: null, // initialized in resetAll()
  silverballMode: [SB_KNOCK_OUT, SB_KNOCK_OUT, SB_KNOCK_OUT, SB_KNOCK_OUT],
  silverballPhase: 0,
  silverballHighlightEnd: new Array(15).fill(0),
  currentSilverballWord: 0,
  lastSilverballSwitch: 0,
  lastSilverballLetter: 0,
  silverballBonusShot: 0,
  silverballBonusShotTimeout: 0,
  silverballHeadProgress: 0,

  // Toplane
  toplanePhase: 0,
  toplaneProgress: 0,
  toplaneAnimEnd: 0,

  // Spinners
  totalSpins: 0,
  spinner1kPhase: 0,
  spinnerAccumulated: 0,

  // Alternating combo
  altComboPhase: 0,
  altCombosHit: 0,
  altComboExpiration: 0,

  // Added bonus
  addedBonusQualified: [0,0,0,0],
  addedBonusAchieved: [0,0,0,0],

  // Kicker
  kickerStatus: 0,
  kickerTimeout: 0,
  kickerRolloverWatch: 0,

  // Horseshoe
  lastHorseshoe: 0,
  superSkillshot: false,

  // Ball tracking
  ballFirstSwitch: 0,
  ballSaveUsed: false,
  ballSaveSeconds: 15,
  samePlayerShootsAgain: false,
  extraBallCollected: false,
  extraBallHurryUp: 0,

  // Tilt
  numTiltWarnings: 0,
  maxTiltWarnings: 2,
  lastTiltWarning: 0,

  // Score animation
  scoreAnimation: 0,
  scoreAnimStart: 0,

  // Lamp animation
  awardLightAnimEnd: 0,
  bonusXAnimStart: 0,

  // Match
  matchDigit: 0,
  matchSpins: 0,
  matchDelay: 0,
  matchStart: 0,
  scoreMatches: 0,

  // Attract
  attractHeadMode: 0,
  attractPfMode: 0,

  // Lamp states: map of lampId -> {on, dim, flash}
  lamps: {},

  // Rules mode: 'original' = 1980 Bally, 'classic' = SBM23 custom rules
  rulesMode: 'classic',

  // Log
  log: [],
};

function resetSilverballStatus() {
  G.silverballStatus = Array.from({length:4}, ()=> new Array(15).fill(0));
}
resetSilverballStatus();
