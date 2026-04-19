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

function setRulesMode(mode) {
  const labels = {
    original: 'Original (1980 Bally)',
    classic:  'SBM23 (Custom Rules)',
    frg:      'FRG (Spinner Jackpot)',
  };
  if (!labels[mode] || G.rulesMode === mode) return;
  G.rulesMode = mode;
  updateRulesToggle();
  addLog('Rules: ' + labels[mode], 'mode');
  restartGame();
}
function updateRulesToggle() {
  document.querySelectorAll('#rules-toggle button').forEach(b => {
    const active = b.dataset.mode === G.rulesMode;
    b.style.background = active ? 'var(--magenta)' : 'rgba(0,0,0,0.02)';
    b.style.color = active ? '#fff' : 'var(--pewter)';
  });
}
function restartGame() {
  turnOffAllLamps();
  G.currentNumPlayers = 0;
  G.currentBallInPlay = 0;
  G.currentPlayer = 0;
  G.scores = [0,0,0,0];
  G.samePlayerShootsAgain = false;
  G.machineState = MS_ATTRACT;
  G.stateChanged = true;
  addLog('Game reset — ready for new game', 'mode');
}
window.setRulesMode = setRulesMode;
window.restartGame = restartGame;

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
  buildRulesContent();
  buildAboutContent();
  updateRulesToggle();
  G.machineState = MS_ATTRACT;
  G.stateChanged = true;
  addLog('Silverball Mania simulator ready', 'mode');
  addLog('Insert coin (C) and press Start (Enter)', 'event');
  requestAnimationFrame(gameLoop);
});

function buildRulesContent() {
  const h = (tag,text,style) => `<${tag} style="${style||''}">${text}</${tag}>`;
  const hd = text => h('h2',text,"font-family:'Oswald',sans-serif;font-size:20px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#D42A80;margin:24px 0 8px;");
  const sh = text => h('h3',text,"font-family:'Oswald',sans-serif;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#1A1A1A;margin:16px 0 6px;");
  const p = text => h('p',text,"font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.6;color:#2D2D2D;margin:0 0 8px;");
  const row = (a,b) => `<tr><td style="font-family:'Source Serif 4',serif;font-size:13px;padding:3px 12px 3px 0;color:#1A1A1A;">${a}</td><td style="font-family:'Space Mono',monospace;font-size:12px;color:#D42A80;">${b}</td></tr>`;

  const el = document.getElementById('rules-content');
  el.innerHTML = `
${h('h1','Silverball Mania Rules',"font-family:'Oswald',sans-serif;font-size:28px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;color:#0A0A0A;margin:0 0 4px;")}
${h('div','Toggle rules mode in Controls panel',"font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#8A8680;margin-bottom:20px;")}

${hd('Original (1980 Bally)')}
${p('Factory rules from the original machine.')}

${sh('Scoring')}
<table style="border-collapse:collapse;margin-bottom:12px;">
${row('Lit targets / rollovers','1,000')}
${row('Unlit targets / rollovers','500')}
${row('Spinners (lit / unlit)','1,000 / 100')}
${row('Center hoop (horseshoe)','5,000')}
${row('Top center lane','5,000 (always)')}
${row('Top outer lanes','500 (always)')}
${row('Thumper bumpers','100')}
${row('Passive bumpers / rebounds','50')}
${row('Slingshots','20')}
${row('Kicker (lit / unlit)','5,000 / 500')}
</table>

${sh('Center Hoop')}
${p('The key shot. Each hit: 5K points, spots a letter, advances bonus X, lights kicker.')}

${sh('Bonus Multiplier')}
${p('Advanced only by horseshoe. 1X &rarr; 2X &rarr; 3X &rarr; 4X &rarr; 5X &rarr; Extra Ball lit at N target. Resets each ball.')}

${sh('SILVERBALL MANIA Letters')}
${p('15 letters collected via targets, rollovers, lane spots, and horseshoe. Letters carry ball-to-ball. On completion they reset for next round.')}
${p('1st completion: 15K Wizard Bonus. 2nd: 30K Supreme Wizard. 3rd+: Special (free credit).')}

${sh('Spinners')}
${p('Lit by spelling MANIA. Only left or right lit at a time, toggled by bumpers and slingshots. Unlit at ball start.')}

${sh('Kicker')}
${p('Lit by center lane or horseshoe. Stays up until ball hits it. Drops after each use.')}

${sh('Top Lanes')}
${p('Center or outer lanes lit (toggled by bumpers/slings). Center lit at ball start (skillshot). Lit lanes spot a letter.')}

${hd('SBM23 (Custom Rules)')}
${p('Enhanced rules by Dick Hamill, replacing the original Bally ROM.')}

${sh('Skill Shot')}
${p('At ball start: lit top lanes and horseshoe award 10K-20K. Horseshoe qualifies super skill shot at N target (+15K, advances base bonus X).')}

${sh('Silverball Modes')}
${p('<b>Knock Out</b> (1st): All targets lit, hit to collect.')}
${p('<b>Word Groups</b> (2nd): Collect SILVER, then BALL, then MANIA in order.')}
${p('<b>Fadeaway</b> (3rd+): Letters must be collected in strict S-I-L-V-E-R-B-A-L-L-M-A-N-I-A order. Out-of-order hits held 20s.')}

${sh('Alternating Combo')}
${p('1. Ball through inlane starts combo. 2. Alternate left/right spinners (2-4 hits). 3. Horseshoe to qualify bonus. 4. Kicker to collect.')}
${p('Awards: 15K &rarr; 30K &rarr; 60K added bonus.')}

${sh('Bonus X')}
${p('Two ways: horseshoe + N target within timed window, or complete all 3 top lanes. Window shrinks as X increases.')}

${sh('Ball Save')}
${p('15-second ball save at ball start. No ball save in original mode.')}

${sh('Scoring')}
<table style="border-collapse:collapse;margin-bottom:12px;">
${row('Skill shot (lanes)','10,000')}
${row('Horseshoe (skill shot)','20,000')}
${row('Horseshoe (combo)','15,000')}
${row('Horseshoe (normal)','5,000')}
${row('Spinner (combo advance)','1,500')}
${row('Spinner (lit)','1,000')}
${row('Spinner (unlit)','100')}
${row('Lit target','1,000')}
${row('Unlit target','100')}
${row('Bumpers','100')}
${row('Slingshots','10')}
${row('SBM completion','20K &times; mode level')}
</table>

${hd('FRG (Spinner Jackpot)')}
${p('Based on the Original 1980 Bally rules with additions: modified horseshoe, powered-up bumpers, and spinner jackpot.')}

${sh('Center Hoop (Modified)')}
${p('The horseshoe spots MANIA letters only (not SILVERBALL). Once MANIA is complete, further horseshoe hits advance the bonus multiplier instead. Kicker is always lit by horseshoe.')}

${sh('Top Lanes (Modified)')}
${p('Completing all 3 top lanes (left, center, right) advances the bonus multiplier and resets the lanes.')}

${sh('Bumpers (Powered Up)')}
${p('Once SILVER (first 6 letters) is complete, bumpers score 1K instead of 100 for the rest of the ball.')}

${sh('Spinner Jackpot')}
${p('Each spinner hit adds to a collectible pot:')}
<table style="border-collapse:collapse;margin-bottom:12px;">
${row('Base spin (100pt)','+1K to pot')}
${row('Lit spinner (1K)','+5K to pot')}
</table>
${p('Hit the horseshoe to collect the pot (added to horseshoe score). Pot resets each ball. Max 255K.')}

${sh('Display')}
${p('The pot value (in units of 1K) is shown on the second-next player display. In a 1-player game this is Display 3 (Player 3). In multiplayer, it temporarily replaces another player\'s score during the current player\'s turn.')}

${sh('Lamp Feedback')}
${p('Both spinner lamps flash when pot reaches 10K+ (slow pulse). At 25K+ the flash speeds up. Only active when no other spinner state (lit spinner) is driving the lamps.')}
`;
}

function buildAboutContent() {
  const h = (tag,text,style) => `<${tag} style="${style||''}">${text}</${tag}>`;
  const hd = text => h('h1',text,"font-family:'Oswald',sans-serif;font-size:28px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;color:#0A0A0A;margin:0 0 4px;");
  const sub = text => h('div',text,"font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#8A8680;margin-bottom:20px;");
  const sh = text => h('h3',text,"font-family:'Oswald',sans-serif;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#D42A80;margin:20px 0 6px;");
  const p = text => h('p',text,"font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.6;color:#2D2D2D;margin:0 0 8px;");
  const link = (href,label) => `<a href="${href}" target="_blank" rel="noopener" style="color:#D42A80;text-decoration:none;border-bottom:1px solid rgba(212,42,128,0.3);">${label}</a>`;
  const linkRow = (href,label,desc) => `<div style="margin:0 0 10px;font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.6;color:#2D2D2D;">${link(href,label)}<div style="font-size:12px;color:#6a6660;margin-top:2px;">${desc}</div></div>`;

  const el = document.getElementById('about-content');
  el.innerHTML = `
${hd('About This Project')}
${sub('Silverball Mania - Custom Ruleset &amp; Simulator')}

${sh('The Machine')}
${p('SBM23 is custom game code for a 1980 Bally Silverball Mania pinball machine. Silverball Mania was produced by Bally in early 1980 (approx. 10,800 units) using the Bally MPU-35 platform - an 80 KHz 6800-based board set that was the standard for Bally solid-state games of the era.')}

${p('The original factory ROM is replaced with a C++ Arduino sketch that runs on an Arduino MEGA 2560 PRO. The Arduino interfaces directly with the original playfield wiring (switches, lamps, solenoids, displays) via an adapter board, letting a modern MCU drive a 45-year-old machine without any playfield changes.')}

${sh('Our Workflow: Fork, Simulate, Ship')}
${p('The premise: anyone with an idea for a new pinball ruleset should be able to prototype it in an afternoon, feel it play before ever touching hardware, and hand a finished sketch to a physical machine. The loop we settled on:')}
<ol style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.7;color:#2D2D2D;margin:0 0 8px;padding-left:22px;">
<li><b>Fork a game from RetroPinUpgrade.</b> Start from the closest existing sketch (<code>SBM23</code> here) — hardware map, RPU OS, and a working ruleset already wired up.</li>
<li><b>Build a simulator for it.</b> A browser replica of the playfield: switches as buttons, lamps as dots, displays as HTML. Same state machine as the sketch, same scoring, same timings — just running in JS instead of on the MEGA.</li>
<li><b>Design your ruleset.</b> Sketch out what you want: which shots matter, what builds, what collects. Write it as prose first, then drop it into the simulator as a third "mode" next to the originals.</li>
<li><b>Play it.</b> Not just click-test — actually play. The simulator surfaces the stuff a spec sheet hides: is the combo hittable? does the jackpot grow fast enough to feel worth chasing? is a ball too punishing without the save? Iterate the rules until the game feels right.</li>
<li><b>Port to the sketch.</b> Once the behavior is dialed in, the JS translates cleanly back to C++ — the simulator mirrors the sketch\'s structure on purpose. Compile, flash, play on the cabinet.</li>
</ol>
${p('All of it — the simulator, the rule iteration, this About page — is built with <b>Claude Code</b> as the pair programmer. Rules get described in natural language, translated to code, played, critiqued, and refined in the same conversation. The tight loop is the whole point: from "what if spinners built a jackpot?" to a playable version is measured in minutes, not evenings.')}

${sh('Installing on a Real Machine')}
${p('The end-to-end path from code in this repo to a running cabinet, per the RPU project docs:')}
<ol style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.7;color:#2D2D2D;margin:0 0 8px;padding-left:22px;">
<li>Get an <b>Arduino MEGA 2560 PRO</b>.</li>
<li>Get an <b>RPU interface board</b> (RoyGBev sells them on Pinside). If the board ships pre-flashed, skip the compile step below.</li>
<li>Download the game code (e.g. <code>SBM23</code> from the RetroPinUpgrade GitHub), compile, and flash it to the Arduino.</li>
<li>Install the board onto the machine\'s MPU via the <b>J5 connector</b>.</li>
<li>Wire up a remote switch (or jumper) to enable/disable the original code — the same switch that toggles Original vs. new rules at runtime.</li>
<li>Configure the WAV Trigger board to play the new sound effects.</li>
<li>Power up and play.</li>
</ol>
${p('Source: ' + link('https://pinballindex.com/index.php/How_to_Build_and_Install_on_Your_Machine','Custom Pinball Index — How to Build and Install on Your Machine') + '.')}

${sh('Three Rulesets')}
${p('<b>1980 (Original)</b> — Faithful recreation of the factory Bally rules. Horseshoe spots any letter and advances bonus X. MANIA lights the spinners. Kicker stays up until hit.')}
${p('<b>SBM23 (Custom Rules)</b> — Enhanced ruleset by Dick Hamill: skill shots, silverball modes (Knock Out / Word Groups / Fadeaway), alternating spinner combo, added bonuses, 15-second ball save.')}
${p('<b>FRG (Spinner Jackpot)</b> — Built strictly on top of the 1980 rules with surgical additions: horseshoe spots MANIA letters only (then advances bonus X), completing all top lanes advances bonus X, bumpers score 1K after SILVER is lit, and spinners build a collectible jackpot redeemed at the horseshoe. No SBM23 features leak in — FRG is the "original, improved" mode.')}

${sh('Resources &amp; Credits')}
${linkRow('https://www.pinballrefresh.com/retro-pin-upgrade-rpu','Pinball Refresh — Retro Pin Upgrade (RPU)','RPU is a custom PCB that expands the functionality of solid-state pinball machines (Bally, Stern, Williams, Atari). It is a low-cost add-on — not a board replacement — and a physical switch on the machine lets you toggle between the original rules and new rules. All plans and software are free and open source under GPL 3.0. Created by Dick Hamill.')}
${linkRow('https://github.com/RetroPinUpgrade','github.com/RetroPinUpgrade','Open-source home of the RPU framework. The org currently hosts 33 repositories — new rule rewrites for classic machines like Stars (Stern 1978), Black Jack (Bally 1977), Trident, Scorpion, Black Knight, Firepower, and of course SBM23. The <code>RPU.h</code> / <code>RPU.cpp</code> in this project are vendored from here.')}
${linkRow('https://pinballindex.com/index.php/Main_Page','Custom Pinball Index (Wiki)','MediaWiki-based documentation hub for RPU: hardware schematics, installation guides, API reference, and per-machine rule documentation. Note: the project was originally called BSOS (Bally/Stern Operating System) and was renamed to RPU — older references may use either name.')}
${linkRow('https://www.roygbev.com/shop','RoyGBev Pinball Shop','The storefront where RPU boards and adapter kits ship from. Tagline: "Update your classic with new rules and sound, without removing or replacing the original hardware and software."')}
${linkRow('https://www.jeff-z.com/pinball/sbm/rules/rules.html','Jeff Z — Silverball Mania Rules','Jeff Zweizig\'s detailed fan-written rulesheet for the original 1980 SBM ruleset, based on his own game running in replay mode with factory-recommended settings. Cross-referenced line-by-line while implementing the Original mode in this simulator.')}

${p('RPU OS v5.4 and the base SBM23 ruleset: Dick Hamill. FRG ruleset, browser simulator, and this build: Frank Goeltl.')}
`;
}
