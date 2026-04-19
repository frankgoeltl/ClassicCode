// SBM23 Browser Simulator — Copyright (C) 2026 Frank Goeltl, Dick Hamill and contributors.
// Licensed under the GNU General Public License v3.0 or later.
// This program comes with ABSOLUTELY NO WARRANTY. See the LICENSE file for details.

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

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  document.querySelectorAll('#topnav .nav-link, #footer .footer-link').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  window.scrollTo(0, 0);
  updateURL({ view: name });
}
window.showView = showView;

function updateURL(overrides) {
  const params = new URLSearchParams(window.location.search);
  if (overrides.lang) params.set('lang', overrides.lang);
  if (overrides.view) {
    if (overrides.view === 'home') params.delete('view');
    else params.set('view', overrides.view);
  }
  const qs = params.toString();
  const url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
  history.replaceState(null, '', url);
}

const I18N = {
  en: {
    'nav.home':'Home', 'nav.simulator':'Simulator', 'nav.rules':'Rules', 'nav.about':'About',
    'nav.imprint':'Imprint', 'nav.privacy':'Privacy',
    'footer.copyright':'Frank Goeltl \u00b7 ClassicCode \u00b7 Built with Claude Code',
  },
  de: {
    'nav.home':'Home', 'nav.simulator':'Simulator', 'nav.rules':'Regeln', 'nav.about':'About',
    'nav.imprint':'Impressum', 'nav.privacy':'Datenschutz',
    'footer.copyright':'Frank Goeltl \u00b7 ClassicCode \u00b7 Erstellt mit Claude Code',
  },
};

function t(key) { return (I18N[G.lang] && I18N[G.lang][key]) || I18N.en[key] || key; }

function setLang(lang) {
  if (lang !== 'en' && lang !== 'de') return;
  G.lang = lang;
  try { localStorage.setItem('sbm23.lang', lang); } catch(e) {}
  document.documentElement.lang = lang;
  applyI18n();
  buildHomeContent();
  buildAboutContent();
  buildRulesContent();
  buildImprintContent();
  buildPrivacyContent();
  buildMobileNotice();
  updateLangToggle();
  updateURL({ lang });
}
function buildMobileNotice() {
  const el = document.getElementById('mobile-sim-notice');
  if (!el) return;
  const de = G.lang === 'de';
  el.innerHTML = `
<div style="font-family:'Space Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.16em;color:#8A8680;margin-bottom:12px;">${de ? 'Nur Desktop' : 'Desktop only'}</div>
<h2 style="font-family:'Oswald',sans-serif;font-size:26px;font-weight:700;text-transform:uppercase;letter-spacing:0.02em;color:#0A0A0A;margin:0 0 14px;">${de ? 'Der Simulator braucht einen gr\u00f6\u00dferen Bildschirm.' : 'The simulator needs a bigger screen.'}</h2>
<p style="font-family:'Source Serif 4',Georgia,serif;font-size:15px;line-height:1.6;color:#2D2D2D;margin:0 0 22px;">${de ? 'Das Schalter-/Lampen-Panel ist dicht gepackt und f\u00fcr Mausklicks auf dem Desktop ausgelegt. Bitte von einem Laptop- oder Desktop-Browser aus besuchen, um die Regeln zu testen.' : 'The switch/lamp control panel is dense and tuned for mouse clicks on a desktop display. Please revisit from a laptop or desktop browser to try the rules.'}</p>
<p style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.55;color:#6a6660;margin:0 0 24px;">${de ? 'In der Zwischenzeit kannst du den Projekthintergrund und die Regeln lesen.' : 'In the meantime you can still read the project background and rules.'}</p>
<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
  <button onclick="showView('home')" style="font-family:'Oswald',sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:12px 22px;border-radius:8px;border:none;background:#D42A80;color:#fff;cursor:pointer;">${de ? 'Zur\u00fcck zur Startseite' : 'Back to Home'}</button>
  <button onclick="showView('about')" style="font-family:'Oswald',sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:12px 22px;border-radius:8px;border:1px solid rgba(0,0,0,0.12);background:#fff;color:#1A1A1A;cursor:pointer;">${de ? '\u00dcber das Projekt' : 'About the Project'}</button>
</div>
`;
}
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  const yearEl = document.getElementById('footer-year');
  const copyEl = document.querySelector('#footer .copyright');
  if (yearEl && copyEl) copyEl.innerHTML = '&copy; <span id="footer-year">' + new Date().getFullYear() + '</span> ' + t('footer.copyright');
}
function updateLangToggle() {
  document.querySelectorAll('#lang-toggle button').forEach(b => {
    const active = b.dataset.lang === G.lang;
    b.style.background = active ? 'var(--magenta)' : 'rgba(0,0,0,0.02)';
    b.style.color = active ? '#fff' : 'var(--pewter)';
  });
}
window.setLang = setLang;

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
  buildImprintContent();
  buildPrivacyContent();
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  const urlView = urlParams.get('view');
  let storedLang = null;
  try { storedLang = localStorage.getItem('sbm23.lang'); } catch(e) {}
  G.lang = (urlLang === 'en' || urlLang === 'de') ? urlLang : (storedLang === 'de' ? 'de' : 'en');
  document.documentElement.lang = G.lang;
  buildHomeContent();
  buildMobileNotice();
  applyI18n();
  updateRulesToggle();
  updateLangToggle();
  const validViews = ['home','simulator','rules','about','imprint','privacy'];
  showView(validViews.includes(urlView) ? urlView : 'home');
  G.machineState = MS_ATTRACT;
  G.stateChanged = true;
  addLog('Silverball Mania simulator ready', 'mode');
  addLog('Insert coin (C) and press Start (Enter)', 'event');
  requestAnimationFrame(gameLoop);
});

function buildRulesContent() {
  const el = document.getElementById('rules-content');
  el.innerHTML = G.lang === 'de' ? rulesContentDE() : rulesContentEN();
}
function rulesHelpers() {
  const h = (tag,text,style) => `<${tag} style="${style||''}">${text}</${tag}>`;
  return {
    h,
    hd: text => h('h2',text,"font-family:'Oswald',sans-serif;font-size:20px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#D42A80;margin:24px 0 8px;"),
    sh: text => h('h3',text,"font-family:'Oswald',sans-serif;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#1A1A1A;margin:16px 0 6px;"),
    p: text => h('p',text,"font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.6;color:#2D2D2D;margin:0 0 8px;"),
    row: (a,b) => `<tr><td style="font-family:'Source Serif 4',serif;font-size:13px;padding:3px 12px 3px 0;color:#1A1A1A;">${a}</td><td style="font-family:'Space Mono',monospace;font-size:12px;color:#D42A80;">${b}</td></tr>`,
  };
}
function rulesContentEN() {
  const { h, hd, sh, p, row } = rulesHelpers();
  return `
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
`;
}

function rulesContentDE() {
  const { h, hd, sh, p, row } = rulesHelpers();
  return `
${h('h1','Silverball Mania Regeln',"font-family:'Oswald',sans-serif;font-size:28px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;color:#0A0A0A;margin:0 0 4px;")}
${h('div','Regelsatz im Controls-Panel umschalten',"font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#8A8680;margin-bottom:20px;")}

${hd('Original (1980 Bally)')}
${p('Werksseitige Regeln des Originalger\u00e4ts.')}

${sh('Scoring')}
<table style="border-collapse:collapse;margin-bottom:12px;">
${row('Beleuchtete Targets / Rollovers','1.000')}
${row('Unbeleuchtete Targets / Rollovers','500')}
${row('Spinners (beleuchtet / unbeleuchtet)','1.000 / 100')}
${row('Center hoop (Horseshoe)','5.000')}
${row('Top center lane','5.000 (immer)')}
${row('Top outer lanes','500 (immer)')}
${row('Thumper bumpers','100')}
${row('Passive bumpers / Rebounds','50')}
${row('Slingshots','20')}
${row('Kicker (beleuchtet / unbeleuchtet)','5.000 / 500')}
</table>

${sh('Center Hoop')}
${p('Der Schl\u00fcsselschuss. Jeder Treffer: 5K Punkte, setzt einen Buchstaben, erh\u00f6ht bonus X, beleuchtet den Kicker.')}

${sh('Bonus Multiplier')}
${p('Ausschlie\u00dflich durch den Horseshoe erh\u00f6ht. 1X &rarr; 2X &rarr; 3X &rarr; 4X &rarr; 5X &rarr; Extra Ball am N target beleuchtet. Setzt sich pro Ball zur\u00fcck.')}

${sh('SILVERBALL MANIA Buchstaben')}
${p('15 Buchstaben werden \u00fcber Targets, Rollovers, Lane-Spots und Horseshoe gesammelt. Buchstaben bleiben \u00fcber mehrere B\u00e4lle erhalten. Bei Abschluss werden sie f\u00fcr die n\u00e4chste Runde zur\u00fcckgesetzt.')}
${p('1. Abschluss: 15K Wizard Bonus. 2.: 30K Supreme Wizard. 3. und weitere: Special (Freispiel).')}

${sh('Spinners')}
${p('Werden durch das Buchstabieren von MANIA beleuchtet. Immer nur der linke oder rechte gleichzeitig, umgeschaltet durch bumpers und slingshots. Zu Ballbeginn unbeleuchtet.')}

${sh('Kicker')}
${p('Beleuchtet durch Top center lane oder Horseshoe. Bleibt oben, bis der Ball ihn trifft. F\u00e4llt nach jeder Benutzung ab.')}

${sh('Top Lanes')}
${p('Entweder die center lane oder die outer lanes sind beleuchtet (umgeschaltet durch bumpers/slings). Center zu Ballbeginn beleuchtet (Skillshot). Beleuchtete lanes setzen einen Buchstaben.')}

${hd('FRG (Spinner Jackpot)')}
${p('Basiert auf den Original 1980 Bally Regeln mit Erweiterungen: modifizierter Horseshoe, aufgewertete bumpers und Spinner Jackpot.')}

${sh('Center Hoop (Modifiziert)')}
${p('Der Horseshoe setzt nur MANIA-Buchstaben (nicht SILVERBALL). Sobald MANIA komplett ist, erh\u00f6hen weitere Horseshoe-Treffer stattdessen den bonus multiplier. Der Kicker wird immer durch den Horseshoe beleuchtet.')}

${sh('Top Lanes (Modifiziert)')}
${p('Alle 3 top lanes (links, Mitte, rechts) zu absolvieren erh\u00f6ht den bonus multiplier und setzt die lanes zur\u00fcck.')}

${sh('Bumpers (Aufgewertet)')}
${p('Sobald SILVER (die ersten 6 Buchstaben) komplett ist, werten bumpers f\u00fcr den Rest des Balls 1K statt 100 Punkte.')}

${sh('Spinner Jackpot')}
${p('Jeder Spinner-Treffer f\u00fcllt einen einsammelbaren Topf:')}
<table style="border-collapse:collapse;margin-bottom:12px;">
${row('Basis-Spin (100pt)','+1K in den Topf')}
${row('Beleuchteter Spinner (1K)','+5K in den Topf')}
</table>
${p('Den Horseshoe treffen, um den Topf einzusammeln (wird zum Horseshoe-Score addiert). Der Topf setzt sich pro Ball zur\u00fcck. Maximum 255K.')}

${sh('Anzeige')}
${p('Der Wert des Topfs (in 1K-Einheiten) wird auf dem \u00fcbern\u00e4chsten Spieler-Display angezeigt. Im Einzelspielerspiel ist das Display 3 (Player 3). Im Mehrspielermodus ersetzt der Wert w\u00e4hrend des aktuellen Zugs vor\u00fcbergehend den Score eines anderen Spielers.')}

${sh('Lampen-Feedback')}
${p('Beide Spinner-Lampen blinken, sobald der Topf 10K+ erreicht (langsamer Puls). Ab 25K+ wird das Blinken schneller. Nur aktiv, wenn kein anderer Spinner-Zustand (beleuchteter Spinner) die Lampen steuert.')}

${hd('SBM23 (Custom Rules)')}
${p('Erweiterte Regeln von Dick Hamill, die das originale Bally-ROM ersetzen.')}

${sh('Skill Shot')}
${p('Zu Ballbeginn: Beleuchtete top lanes und Horseshoe zahlen 10K-20K. Der Horseshoe qualifiziert den Super Skill Shot am N target (+15K, erh\u00f6ht den base bonus X).')}

${sh('Silverball Modes')}
${p('<b>Knock Out</b> (1.): Alle Targets beleuchtet, Treffer zum Einsammeln.')}
${p('<b>Word Groups</b> (2.): SILVER, dann BALL, dann MANIA in dieser Reihenfolge einsammeln.')}
${p('<b>Fadeaway</b> (3. und weitere): Buchstaben m\u00fcssen strikt in der Reihenfolge S-I-L-V-E-R-B-A-L-L-M-A-N-I-A gesammelt werden. Treffer au\u00dferhalb der Reihenfolge werden 20s gehalten.')}

${sh('Alternating Combo')}
${p('1. Ball durch die Inlane startet die Combo. 2. Abwechselnd linke/rechte spinners treffen (2-4 Treffer). 3. Horseshoe zum Qualifizieren des bonus. 4. Kicker zum Einsammeln.')}
${p('Belohnungen: 15K &rarr; 30K &rarr; 60K Added Bonus.')}

${sh('Bonus X')}
${p('Zwei Wege: Horseshoe + N target innerhalb eines Zeitfensters, oder alle 3 top lanes abschlie\u00dfen. Das Fenster wird mit steigendem X k\u00fcrzer.')}

${sh('Ball Save')}
${p('15-Sekunden-Ball-Save zu Ballbeginn. Kein Ball Save im Original-Modus.')}

${sh('Scoring')}
<table style="border-collapse:collapse;margin-bottom:12px;">
${row('Skill Shot (lanes)','10.000')}
${row('Horseshoe (Skill Shot)','20.000')}
${row('Horseshoe (Combo)','15.000')}
${row('Horseshoe (Normal)','5.000')}
${row('Spinner (Combo-Advance)','1.500')}
${row('Spinner (beleuchtet)','1.000')}
${row('Spinner (unbeleuchtet)','100')}
${row('Beleuchtetes Target','1.000')}
${row('Unbeleuchtetes Target','100')}
${row('Bumpers','100')}
${row('Slingshots','10')}
${row('SBM-Abschluss','20K &times; Mode-Level')}
</table>
`;
}

function buildAboutContent() {
  const el = document.getElementById('about-content');
  el.innerHTML = G.lang === 'de' ? aboutContentDE() : aboutContentEN();
}
function aboutHelpers() {
  const h = (tag,text,style) => `<${tag} style="${style||''}">${text}</${tag}>`;
  const link = (href,label) => `<a href="${href}" target="_blank" rel="noopener" style="color:#D42A80;text-decoration:none;border-bottom:1px solid rgba(212,42,128,0.3);">${label}</a>`;
  return {
    hd: text => h('h1',text,"font-family:'Oswald',sans-serif;font-size:28px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;color:#0A0A0A;margin:0 0 4px;"),
    sub: text => h('div',text,"font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#8A8680;margin-bottom:20px;"),
    sh: text => h('h3',text,"font-family:'Oswald',sans-serif;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#D42A80;margin:20px 0 6px;"),
    p: text => h('p',text,"font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.6;color:#2D2D2D;margin:0 0 8px;"),
    link,
    linkRow: (href,label,desc) => `<div style="margin:0 0 10px;font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.6;color:#2D2D2D;">${link(href,label)}<div style="font-size:12px;color:#6a6660;margin-top:2px;">${desc}</div></div>`,
  };
}
function aboutContentEN() {
  const { hd, sub, sh, p, link, linkRow } = aboutHelpers();
  return `
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

<div style="background:#FAFAF7;border-left:3px solid #D42A80;border-radius:0 8px 8px 0;padding:16px 20px;margin:12px 0 20px;">
  <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#D42A80;margin-bottom:4px;">A Note from Frank</div>
  <p style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.6;color:#2D2D2D;margin:0;">Full disclosure: although I know my way around code, I didn\'t write a single line of this project myself. Every file \u2014 simulator, rules, this very About page \u2014 was produced by Claude Code in conversation with me. I described the game, the rules, the bugs, the polish; Claude wrote the code.</p>
</div>

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

${sh('Licenses')}
${p('The Arduino sketch and this browser simulator are licensed under the <b>GNU General Public License v3.0 or later</b> \u2014 the same license as the RPU framework they build on. See the <code>LICENSE</code> file in the repository for the full text.')}
${p('Fonts used on this site are self-hosted under the <b>SIL Open Font License 1.1</b>: <em>Oswald</em> by Vernon Adams, <em>Source Serif 4</em> by Frank Gr\u00e4\u00dfle &amp; Adobe, and <em>Space Mono</em> by Colophon Foundry.')}
`;
}

function aboutContentDE() {
  const { hd, sub, sh, p, link, linkRow } = aboutHelpers();
  return `
${hd('\u00dcber dieses Projekt')}
${sub('Silverball Mania \u2014 Eigener Regelsatz und Simulator')}

${sh('Die Maschine')}
${p('SBM23 ist individueller Spielcode f\u00fcr einen 1980er Bally Silverball Mania Flipperautomaten. Silverball Mania wurde Anfang 1980 von Bally produziert (ca. 10.800 Einheiten) auf Basis der Bally MPU-35 Plattform \u2014 einem 80 kHz 6800-basierten Boardset, das den Standard f\u00fcr Ballys Solid-State-Spiele dieser \u00c4ra darstellte.')}

${p('Das werksseitige ROM wird durch einen C++ Arduino-Sketch ersetzt, der auf einem Arduino MEGA 2560 PRO l\u00e4uft. Der Arduino spricht \u00fcber ein Adapter-Board direkt die Original-Verdrahtung des Playfields an (Schalter, Lampen, Spulen, Displays) und l\u00e4sst so einen modernen MCU eine 45 Jahre alte Maschine steuern \u2014 ohne Eingriffe am Playfield.')}

${sh('Unser Workflow: Forken, Simulieren, Flashen')}
${p('Die Pr\u00e4misse: Wer eine Idee f\u00fcr einen neuen Flipper-Regelsatz hat, soll diesen an einem Nachmittag prototypisieren, am Browser durchspielen und dann einen fertigen Sketch an die echte Maschine \u00fcbergeben k\u00f6nnen. Die Schleife, auf die wir uns eingespielt haben:')}
<ol style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.7;color:#2D2D2D;margin:0 0 8px;padding-left:22px;">
<li><b>Ein Spiel von RetroPinUpgrade forken.</b> Vom n\u00e4chstbesten vorhandenen Sketch starten (hier <code>SBM23</code>) \u2014 Hardware-Map, RPU OS und funktionierender Regelsatz sind bereits verdrahtet.</li>
<li><b>Einen Simulator daf\u00fcr bauen.</b> Eine Browser-Nachbildung des Playfields: Schalter als Buttons, Lampen als Punkte, Displays als HTML. Dieselbe State Machine wie im Sketch, gleiches Scoring, gleiche Timings \u2014 nur in JS statt auf dem MEGA.</li>
<li><b>Regelsatz entwerfen.</b> Skizzieren, was wichtig sein soll: welche Sch\u00fcsse z\u00e4hlen, was sich aufbaut, was eingesammelt wird. Erst als Prosa formulieren, dann als dritten "Modus" neben die Originale in den Simulator kippen.</li>
<li><b>Spielen.</b> Nicht nur klicken \u2014 wirklich spielen. Der Simulator zeigt, was ein Spec-Sheet verbirgt: Ist die Combo treffbar? W\u00e4chst der Jackpot schnell genug, um sich lohnend anzuf\u00fchlen? Ist ein Ball ohne Save zu hart? Regeln iterieren, bis sich das Spiel richtig anf\u00fchlt.</li>
<li><b>Zum Sketch portieren.</b> Wenn das Verhalten passt, l\u00e4sst sich das JS sauber zur\u00fcck nach C++ \u00fcbersetzen \u2014 der Simulator bildet die Struktur des Sketches bewusst ab. Kompilieren, flashen, am Automaten spielen.</li>
</ol>
${p('Das Ganze \u2014 Simulator, Regel-Iteration, diese \u00dcber-Seite \u2014 entsteht mit <b>Claude Code</b> als Pair Programmer. Regeln werden in nat\u00fcrlicher Sprache beschrieben, in Code \u00fcbersetzt, durchgespielt, kritisiert und im selben Gespr\u00e4ch verfeinert. Die enge Schleife ist der Punkt: Von "Was, wenn Spinner einen Jackpot aufbauen?" zu einer spielbaren Version sind es Minuten, nicht Abende.')}

<div style="background:#FAFAF7;border-left:3px solid #D42A80;border-radius:0 8px 8px 0;padding:16px 20px;margin:12px 0 20px;">
  <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#D42A80;margin-bottom:4px;">Ein Wort von Frank</div>
  <p style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.6;color:#2D2D2D;margin:0;">Zur Transparenz: Auch wenn ich mich mit Code auskenne, habe ich in diesem Projekt keine einzige Zeile selbst geschrieben. Jede Datei \u2014 Simulator, Regeln, auch diese Seite \u2014 ist von Claude Code im Gespr\u00e4ch mit mir entstanden. Ich habe das Spiel, die Regeln, die Bugs, den Feinschliff beschrieben; Claude hat den Code geschrieben.</p>
</div>

${sh('Installation an der echten Maschine')}
${p('Der End-to-End-Weg vom Code in diesem Repo zu einem laufenden Automaten, laut RPU-Projektdokumentation:')}
<ol style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.7;color:#2D2D2D;margin:0 0 8px;padding-left:22px;">
<li>Einen <b>Arduino MEGA 2560 PRO</b> beschaffen.</li>
<li>Ein <b>RPU-Interface-Board</b> besorgen (RoyGBev verkauft sie \u00fcber Pinside). Ist das Board vorprogrammiert, kann der Kompilier-Schritt \u00fcbersprungen werden.</li>
<li>Den Spielcode herunterladen (z.B. <code>SBM23</code> vom RetroPinUpgrade-GitHub), kompilieren und auf den Arduino flashen.</li>
<li>Das Board \u00fcber den <b>J5-Stecker</b> an das MPU-Board der Maschine anschlie\u00dfen.</li>
<li>Einen Fernschalter (oder Jumper) zum Aktivieren/Deaktivieren des Original-Codes einbauen \u2014 derselbe Schalter wechselt zur Laufzeit zwischen Original- und neuen Regeln.</li>
<li>Das WAV Trigger Board f\u00fcr die neuen Soundeffekte konfigurieren.</li>
<li>Einschalten und spielen.</li>
</ol>
${p('Quelle: ' + link('https://pinballindex.com/index.php/How_to_Build_and_Install_on_Your_Machine','Custom Pinball Index \u2014 How to Build and Install on Your Machine') + '.')}

${sh('Drei Regels\u00e4tze')}
${p('<b>1980 (Original)</b> \u2014 Originalgetreue Nachbildung der werksseitigen Bally-Regeln. Horseshoe vergibt einen beliebigen Buchstaben und erh\u00f6ht Bonus X. MANIA aktiviert die Spinner. Kicker bleibt aktiv bis zum Treffer.')}
${p('<b>SBM23 (Custom Rules)</b> \u2014 Erweiterter Regelsatz von Dick Hamill: Skill Shots, Silverball-Modi (Knock Out / Word Groups / Fadeaway), alternierender Spinner-Combo, zus\u00e4tzliche Boni, 15-Sekunden-Ball-Save.')}
${p('<b>FRG (Spinner Jackpot)</b> \u2014 Strikt auf den 1980er Regeln aufgebaut mit gezielten Erg\u00e4nzungen: Horseshoe vergibt nur MANIA-Buchstaben (und erh\u00f6ht dann Bonus X), das Absolvieren aller Top Lanes erh\u00f6ht Bonus X, Bumper werten 1K nach beleuchteter SILVER-Reihe, und Spinner bauen einen einsammelbaren Jackpot auf, der am Horseshoe eingel\u00f6st wird. Keine SBM23-Features sickern durch \u2014 FRG ist der "Original, verbessert"-Modus.')}

${sh('Ressourcen &amp; Credits')}
${linkRow('https://www.pinballrefresh.com/retro-pin-upgrade-rpu','Pinball Refresh \u2014 Retro Pin Upgrade (RPU)','RPU ist eine spezielle Platine (PCB), die die Funktionalit\u00e4t von Solid-State-Flippern (Bally, Stern, Williams, Atari) erweitert. Ein kosteng\u00fcnstiger Add-on \u2014 keine Board-Ersetzung \u2014 mit einem physischen Schalter an der Maschine, der zwischen Original- und neuen Regeln umschaltet. Alle Pl\u00e4ne und Software sind frei und quelloffen unter GPL 3.0. Erstellt von Dick Hamill.')}
${linkRow('https://github.com/RetroPinUpgrade','github.com/RetroPinUpgrade','Open-Source-Heimat des RPU-Frameworks. Die Organisation beherbergt derzeit 33 Repositories \u2014 neue Regels\u00e4tze f\u00fcr klassische Maschinen wie Stars (Stern 1978), Black Jack (Bally 1977), Trident, Scorpion, Black Knight, Firepower und nat\u00fcrlich SBM23. Die <code>RPU.h</code> / <code>RPU.cpp</code> in diesem Projekt sind von dort \u00fcbernommen.')}
${linkRow('https://pinballindex.com/index.php/Main_Page','Custom Pinball Index (Wiki)','MediaWiki-basierte Dokumentationsdrehscheibe f\u00fcr RPU: Hardware-Schaltpl\u00e4ne, Installationsanleitungen, API-Referenz und maschinenspezifische Regeldokumentation. Hinweis: Das Projekt hie\u00df urspr\u00fcnglich BSOS (Bally/Stern Operating System) und wurde in RPU umbenannt \u2014 \u00e4ltere Referenzen k\u00f6nnen beide Namen nutzen.')}
${linkRow('https://www.roygbev.com/shop','RoyGBev Pinball Shop','Der Online-Shop, aus dem RPU-Boards und Adapter-Kits verschickt werden. Slogan: "Update your classic with new rules and sound, without removing or replacing the original hardware and software."')}
${linkRow('https://www.jeff-z.com/pinball/sbm/rules/rules.html','Jeff Z \u2014 Silverball Mania Rules','Jeff Zweizigs detaillierter Fan-Regelkatalog f\u00fcr den 1980er SBM-Originalregelsatz, basierend auf seinem eigenen Ger\u00e4t im Replay-Modus mit werksseitig empfohlenen Einstellungen. Zeile f\u00fcr Zeile abgeglichen bei der Umsetzung des Original-Modus in diesem Simulator.')}

${p('RPU OS v5.4 und der Basis-SBM23-Regelsatz: Dick Hamill. FRG-Regelsatz, Browser-Simulator und dieser Build: Frank Goeltl.')}

${sh('Lizenzen')}
${p('Der Arduino-Sketch und dieser Browser-Simulator sind unter der <b>GNU General Public License v3.0 oder sp\u00e4ter</b> lizenziert \u2014 derselben Lizenz wie das zugrundeliegende RPU-Framework. Den vollst\u00e4ndigen Lizenztext findest du in der <code>LICENSE</code>-Datei im Repository.')}
${p('Die Schriftarten dieser Seite werden lokal geliefert und stehen unter der <b>SIL Open Font License 1.1</b>: <em>Oswald</em> von Vernon Adams, <em>Source Serif 4</em> von Frank Gr\u00e4\u00dfle &amp; Adobe sowie <em>Space Mono</em> von Colophon Foundry.')}
`;
}

function buildHomeContent() {
  const el = document.getElementById('home-content');
  el.innerHTML = G.lang === 'de' ? homeContentDE() : homeContentEN();
}
function homeContentEN() {
  return `
<section style="max-width:880px;margin:0 auto;padding:72px 32px 48px;text-align:center;">
  <div style="font-family:'Space Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.16em;color:#8A8680;margin-bottom:16px;">Custom pinball rules &middot; Open source &middot; Made with Claude Code</div>
  <h1 style="font-family:'Oswald',sans-serif;font-size:56px;font-weight:700;text-transform:uppercase;letter-spacing:0.02em;color:#0A0A0A;line-height:1.05;margin:0 0 18px;">Rewrite a pinball<br>classic in a weekend.</h1>
  <p style="font-family:'Source Serif 4',Georgia,serif;font-size:18px;line-height:1.6;color:#2D2D2D;max-width:640px;margin:0 auto 20px;">ClassicCode combines two things: <b>designing custom rules for classic pinball machines in dialogue with an AI</b> \u2014 and <b>playing the rules in the browser</b> before implementing them on top of <a href="https://www.pinballrefresh.com/retro-pin-upgrade-rpu" target="_blank" rel="noopener" style="color:#D42A80;">Pinball Refresh \u2014 Retro Pin Upgrade (RPU)</a>.</p>
  <p style="font-family:'Source Serif 4',Georgia,serif;font-size:16px;line-height:1.6;color:#6a6660;max-width:640px;margin:0 auto 32px;">This site shows both on a 1980 Bally <b>Silverball Mania</b> \u2014 one of around 20 machines the approach transfers to. Three rulesets are here to compare: the factory original, the community-enhanced SBM23, and a fresh FRG ruleset. Click switches, watch the scoring react \u2014 it\'s a rules sandbox, not a physics sim.</p>
  <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
    <button onclick="showView('simulator')" style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:14px 28px;border-radius:8px;border:none;background:#D42A80;color:#fff;cursor:pointer;box-shadow:0 4px 14px rgba(212,42,128,0.3);">Open the Simulator &rarr;</button>
    <button onclick="showView('about')" style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:14px 28px;border-radius:8px;border:1px solid rgba(0,0,0,0.12);background:#fff;color:#1A1A1A;cursor:pointer;">How it Works</button>
  </div>
</section>

<section style="max-width:1000px;margin:0 auto;padding:24px 32px 72px;">
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;">
    <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:14px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#D42A80;margin-bottom:8px;">The Machine</div>
      <h3 style="font-family:'Oswald',sans-serif;font-size:18px;font-weight:600;margin:0 0 8px;color:#0A0A0A;">1980 Bally Silverball Mania</h3>
      <p style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.55;color:#2D2D2D;margin:0;">An Arduino MEGA replaces the factory ROM via the Retro Pin Upgrade (RPU) framework. Original playfield, new brain.</p>
    </div>
    <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:14px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#D42A80;margin-bottom:8px;">The Simulator</div>
      <h3 style="font-family:'Oswald',sans-serif;font-size:18px;font-weight:600;margin:0 0 8px;color:#0A0A0A;">Click switches, read the log</h3>
      <p style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.55;color:#2D2D2D;margin:0;">No ball physics \u2014 just a faithful mirror of the switch matrix, lamps, and displays. Click targets to simulate hits and watch scoring, bonus, and jackpot state update live.</p>
    </div>
    <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:14px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#D42A80;margin-bottom:8px;">The Workflow</div>
      <h3 style="font-family:'Oswald',sans-serif;font-size:18px;font-weight:600;margin:0 0 8px;color:#0A0A0A;">Fork &middot; Simulate &middot; Ship</h3>
      <p style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.55;color:#2D2D2D;margin:0;">Start from an RPU game, prototype in the sim until it feels right, then port the JS back to the C++ sketch.</p>
    </div>
  </div>
</section>

<section style="background:#fff;border-top:1px solid rgba(0,0,0,0.06);border-bottom:1px solid rgba(0,0,0,0.06);padding:56px 32px;">
  <div style="max-width:880px;margin:0 auto;">
    <div style="font-family:'Space Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.16em;color:#8A8680;margin-bottom:8px;">Three rulesets, one machine</div>
    <h2 style="font-family:'Oswald',sans-serif;font-size:28px;font-weight:700;text-transform:uppercase;letter-spacing:0.02em;color:#0A0A0A;margin:0 0 24px;">Pick a ruleset, start tapping.</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;">
      <div style="padding:18px;border-left:3px solid #D42A80;background:#FAFAF7;border-radius:0 8px 8px 0;">
        <div style="font-family:'Oswald',sans-serif;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#D42A80;margin-bottom:4px;">FRG (default)</div>
        <p style="font-family:'Source Serif 4',Georgia,serif;font-size:13px;line-height:1.55;color:#2D2D2D;margin:0;">A new take on the original. Horseshoe spots only MANIA, top lanes advance bonus X, bumpers power up, spinners build a jackpot.</p>
      </div>
      <div style="padding:18px;border-left:3px solid #8A8680;background:#FAFAF7;border-radius:0 8px 8px 0;">
        <div style="font-family:'Oswald',sans-serif;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8A8680;margin-bottom:4px;">1980</div>
        <p style="font-family:'Source Serif 4',Georgia,serif;font-size:13px;line-height:1.55;color:#2D2D2D;margin:0;">The factory Bally rules, faithfully recreated. Shoot the hoop, spell SILVERBALL MANIA, chase the wizard bonus.</p>
      </div>
      <div style="padding:18px;border-left:3px solid #8A8680;background:#FAFAF7;border-radius:0 8px 8px 0;">
        <div style="font-family:'Oswald',sans-serif;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8A8680;margin-bottom:4px;">SBM23</div>
        <p style="font-family:'Source Serif 4',Georgia,serif;font-size:13px;line-height:1.55;color:#2D2D2D;margin:0;">Dick Hamill\'s enhanced ruleset: skill shots, silverball modes, alternating spinner combo, ball save.</p>
      </div>
    </div>
  </div>
</section>

<section style="max-width:880px;margin:0 auto;padding:56px 32px 16px;">
  <div style="font-family:'Space Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.16em;color:#8A8680;margin-bottom:8px;">Not just Silverball Mania</div>
  <h2 style="font-family:'Oswald',sans-serif;font-size:28px;font-weight:700;text-transform:uppercase;letter-spacing:0.02em;color:#0A0A0A;margin:0 0 12px;">This works for a whole generation of pinball.</h2>
  <p style="font-family:'Source Serif 4',Georgia,serif;font-size:16px;line-height:1.6;color:#2D2D2D;margin:0 0 28px;">Thanks to the RPU framework, the same fork &middot; simulate &middot; ship workflow applies to any early solid-state pinball machine whose rules someone has already ported. At the time of writing, the ecosystem covers around 20 classic titles:</p>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin:0 0 24px;">

    <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:10px;padding:18px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
      <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#D42A80;margin-bottom:10px;">Bally</div>
      <ul style="list-style:none;padding:0;margin:0;font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.7;color:#2D2D2D;">
        <li>Silverball Mania <span style="color:#8A8680;font-size:12px;">&middot; 1980</span></li>
        <li>Black Jack <span style="color:#8A8680;font-size:12px;">&middot; 1977</span></li>
        <li>Eight Ball</li>
        <li>Future Spa</li>
        <li>Lost World</li>
      </ul>
    </div>

    <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:10px;padding:18px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
      <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#D42A80;margin-bottom:10px;">Stern</div>
      <ul style="list-style:none;padding:0;margin:0;font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.7;color:#2D2D2D;">
        <li>Stars <span style="color:#8A8680;font-size:12px;">&middot; 1978</span></li>
        <li>Trident <span style="color:#8A8680;font-size:12px;">&middot; 1979</span></li>
        <li>Meteor Strike</li>
        <li>Big Game</li>
        <li>Demon</li>
      </ul>
    </div>

    <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:10px;padding:18px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
      <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#D42A80;margin-bottom:10px;">Williams</div>
      <ul style="list-style:none;padding:0;margin:0;font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.7;color:#2D2D2D;">
        <li>Scorpion <span style="color:#8A8680;font-size:12px;">&middot; 1980</span></li>
        <li>Black Knight <span style="color:#8A8680;font-size:12px;">&middot; 1980</span></li>
        <li>Firepower</li>
        <li>The Getaway</li>
      </ul>
    </div>

    <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:10px;padding:18px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
      <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#D42A80;margin-bottom:10px;">Others</div>
      <ul style="list-style:none;padding:0;margin:0;font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.7;color:#2D2D2D;">
        <li>Blues Brothers <span style="color:#8A8680;font-size:12px;">&middot; Homepin</span></li>
        <li>Solar System</li>
        <li>Space Battle</li>
        <li>Space Rider</li>
        <li>Concord</li>
        <li>Storm</li>
      </ul>
    </div>

  </div>

  <div style="background:#FAFAF7;border-left:3px solid #8A8680;border-radius:0 8px 8px 0;padding:16px 20px;margin:0;">
    <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#8A8680;margin-bottom:4px;">Machine not on the list?</div>
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.55;color:#2D2D2D;margin:0;">Technically doable \u2014 but you\'ll spend most of your time reverse-engineering the switch matrix, lamp layout, and solenoid map before you can start writing rules. The machines above come with that groundwork already done.</p>
  </div>
</section>

<section style="max-width:880px;margin:0 auto;padding:32px 32px 80px;text-align:center;">
  <h2 style="font-family:'Oswald',sans-serif;font-size:24px;font-weight:700;text-transform:uppercase;letter-spacing:0.02em;color:#0A0A0A;margin:0 0 12px;">Ready to tinker?</h2>
  <p style="font-family:'Source Serif 4',Georgia,serif;font-size:16px;line-height:1.55;color:#2D2D2D;margin:0 0 24px;">Insert a coin, press start, plunge, and start clicking switches to see how each ruleset scores. No login, no cookies, no tracking.</p>
  <button onclick="showView('simulator')" style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:14px 32px;border-radius:8px;border:none;background:#D42A80;color:#fff;cursor:pointer;box-shadow:0 4px 14px rgba(212,42,128,0.3);">Open the Simulator &rarr;</button>
</section>
`;
}

function homeContentDE() {
  return `
<section style="max-width:880px;margin:0 auto;padding:72px 32px 48px;text-align:center;">
  <div style="font-family:'Space Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.16em;color:#8A8680;margin-bottom:16px;">Eigene Flipper-Regeln &middot; Open Source &middot; Erstellt mit Claude Code</div>
  <h1 style="font-family:'Oswald',sans-serif;font-size:56px;font-weight:700;text-transform:uppercase;letter-spacing:0.02em;color:#0A0A0A;line-height:1.05;margin:0 0 18px;">Einen Flipper-Klassiker<br>an einem Wochenende<br>neu schreiben.</h1>
  <p style="font-family:'Source Serif 4',Georgia,serif;font-size:18px;line-height:1.6;color:#2D2D2D;max-width:640px;margin:0 auto 20px;">ClassicCode verbindet zwei Dinge: <b>Eigene Regeln f\u00fcr klassische Flipperautomaten im Dialog mit einer KI entwerfen</b> \u2014 und <b>die Regeln im Browser durchspielen</b>, bevor sie auf Basis von <a href="https://www.pinballrefresh.com/retro-pin-upgrade-rpu" target="_blank" rel="noopener" style="color:#D42A80;">Pinball Refresh \u2014 Retro Pin Upgrade (RPU)</a> umgesetzt werden.</p>
  <p style="font-family:'Source Serif 4',Georgia,serif;font-size:16px;line-height:1.6;color:#6a6660;max-width:640px;margin:0 auto 32px;">Hier auf der Seite siehst du beides am Beispiel des 1980er Bally <b>Silverball Mania</b> \u2014 das ist nur eines von rund 20 Ger\u00e4ten, auf die sich der Ansatz \u00fcbertragen l\u00e4sst. Drei Regels\u00e4tze stehen zum Vergleich bereit: das werksseitige Original, das erweiterte SBM23 der Community und ein frischer FRG-Regelsatz. Schalter klicken, Scoring live beobachten \u2014 eine Regel-Sandbox, kein Physik-Simulator.</p>
  <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
    <button onclick="showView('simulator')" style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:14px 28px;border-radius:8px;border:none;background:#D42A80;color:#fff;cursor:pointer;box-shadow:0 4px 14px rgba(212,42,128,0.3);">Simulator \u00f6ffnen &rarr;</button>
    <button onclick="showView('about')" style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:14px 28px;border-radius:8px;border:1px solid rgba(0,0,0,0.12);background:#fff;color:#1A1A1A;cursor:pointer;">Wie es funktioniert</button>
  </div>
</section>

<section style="max-width:1000px;margin:0 auto;padding:24px 32px 72px;">
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;">
    <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:14px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#D42A80;margin-bottom:8px;">Die Maschine</div>
      <h3 style="font-family:'Oswald',sans-serif;font-size:18px;font-weight:600;margin:0 0 8px;color:#0A0A0A;">Bally Silverball Mania, 1980</h3>
      <p style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.55;color:#2D2D2D;margin:0;">Ein Arduino MEGA ersetzt das Original-ROM \u00fcber das Retro Pin Upgrade (RPU) Framework. Originales Playfield, neues Gehirn.</p>
    </div>
    <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:14px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#D42A80;margin-bottom:8px;">Der Simulator</div>
      <h3 style="font-family:'Oswald',sans-serif;font-size:18px;font-weight:600;margin:0 0 8px;color:#0A0A0A;">Schalter klicken, Log lesen</h3>
      <p style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.55;color:#2D2D2D;margin:0;">Keine Ballphysik \u2014 nur eine getreue Nachbildung von Schaltermatrix, Lampen und Displays. Ziele anklicken, Score-, Bonus- und Jackpot-Status live beobachten.</p>
    </div>
    <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:14px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#D42A80;margin-bottom:8px;">Der Workflow</div>
      <h3 style="font-family:'Oswald',sans-serif;font-size:18px;font-weight:600;margin:0 0 8px;color:#0A0A0A;">Forken &middot; Simulieren &middot; Flashen</h3>
      <p style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.55;color:#2D2D2D;margin:0;">Von einem RPU-Projekt starten, im Simulator prototypisieren bis sich alles richtig anf\u00fchlt, dann JS zur\u00fcck in den C++-Sketch portieren.</p>
    </div>
  </div>
</section>

<section style="background:#fff;border-top:1px solid rgba(0,0,0,0.06);border-bottom:1px solid rgba(0,0,0,0.06);padding:56px 32px;">
  <div style="max-width:880px;margin:0 auto;">
    <div style="font-family:'Space Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.16em;color:#8A8680;margin-bottom:8px;">Drei Regels\u00e4tze, eine Maschine</div>
    <h2 style="font-family:'Oswald',sans-serif;font-size:28px;font-weight:700;text-transform:uppercase;letter-spacing:0.02em;color:#0A0A0A;margin:0 0 24px;">Regelsatz w\u00e4hlen, losklicken.</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;">
      <div style="padding:18px;border-left:3px solid #D42A80;background:#FAFAF7;border-radius:0 8px 8px 0;">
        <div style="font-family:'Oswald',sans-serif;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#D42A80;margin-bottom:4px;">FRG (Standard)</div>
        <p style="font-family:'Source Serif 4',Georgia,serif;font-size:13px;line-height:1.55;color:#2D2D2D;margin:0;">Eine neue Variante des Originals. Horseshoe vergibt nur MANIA-Buchstaben, Top Lanes erh\u00f6hen den Bonus-X, Bumper powern sich auf, Spinner bauen einen Jackpot auf.</p>
      </div>
      <div style="padding:18px;border-left:3px solid #8A8680;background:#FAFAF7;border-radius:0 8px 8px 0;">
        <div style="font-family:'Oswald',sans-serif;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8A8680;margin-bottom:4px;">1980</div>
        <p style="font-family:'Source Serif 4',Georgia,serif;font-size:13px;line-height:1.55;color:#2D2D2D;margin:0;">Die werksseitigen Bally-Regeln, originalgetreu nachgebaut. Hoop anschie\u00dfen, SILVERBALL MANIA buchstabieren, Wizard Bonus jagen.</p>
      </div>
      <div style="padding:18px;border-left:3px solid #8A8680;background:#FAFAF7;border-radius:0 8px 8px 0;">
        <div style="font-family:'Oswald',sans-serif;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8A8680;margin-bottom:4px;">SBM23</div>
        <p style="font-family:'Source Serif 4',Georgia,serif;font-size:13px;line-height:1.55;color:#2D2D2D;margin:0;">Dick Hamills erweiterter Regelsatz: Skill Shots, Silverball-Modi, alternierende Spinner-Combos, Ball Save.</p>
      </div>
    </div>
  </div>
</section>

<section style="max-width:880px;margin:0 auto;padding:56px 32px 16px;">
  <div style="font-family:'Space Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.16em;color:#8A8680;margin-bottom:8px;">Nicht nur Silverball Mania</div>
  <h2 style="font-family:'Oswald',sans-serif;font-size:28px;font-weight:700;text-transform:uppercase;letter-spacing:0.02em;color:#0A0A0A;margin:0 0 12px;">Funktioniert f\u00fcr eine ganze Generation Flipper.</h2>
  <p style="font-family:'Source Serif 4',Georgia,serif;font-size:16px;line-height:1.6;color:#2D2D2D;margin:0 0 28px;">Dank des RPU-Frameworks funktioniert derselbe Forken &middot; Simulieren &middot; Flashen-Workflow f\u00fcr jeden fr\u00fchen Solid-State-Flipperautomaten, dessen Regeln bereits portiert wurden. Zum Stand heute deckt das \u00d6kosystem rund 20 Klassiker ab:</p>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin:0 0 24px;">
    <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:10px;padding:18px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
      <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#D42A80;margin-bottom:10px;">Bally</div>
      <ul style="list-style:none;padding:0;margin:0;font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.7;color:#2D2D2D;">
        <li>Silverball Mania <span style="color:#8A8680;font-size:12px;">&middot; 1980</span></li>
        <li>Black Jack <span style="color:#8A8680;font-size:12px;">&middot; 1977</span></li>
        <li>Eight Ball</li>
        <li>Future Spa</li>
        <li>Lost World</li>
      </ul>
    </div>
    <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:10px;padding:18px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
      <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#D42A80;margin-bottom:10px;">Stern</div>
      <ul style="list-style:none;padding:0;margin:0;font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.7;color:#2D2D2D;">
        <li>Stars <span style="color:#8A8680;font-size:12px;">&middot; 1978</span></li>
        <li>Trident <span style="color:#8A8680;font-size:12px;">&middot; 1979</span></li>
        <li>Meteor Strike</li>
        <li>Big Game</li>
        <li>Demon</li>
      </ul>
    </div>
    <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:10px;padding:18px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
      <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#D42A80;margin-bottom:10px;">Williams</div>
      <ul style="list-style:none;padding:0;margin:0;font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.7;color:#2D2D2D;">
        <li>Scorpion <span style="color:#8A8680;font-size:12px;">&middot; 1980</span></li>
        <li>Black Knight <span style="color:#8A8680;font-size:12px;">&middot; 1980</span></li>
        <li>Firepower</li>
        <li>The Getaway</li>
      </ul>
    </div>
    <div style="background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:10px;padding:18px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
      <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#D42A80;margin-bottom:10px;">Weitere</div>
      <ul style="list-style:none;padding:0;margin:0;font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.7;color:#2D2D2D;">
        <li>Blues Brothers <span style="color:#8A8680;font-size:12px;">&middot; Homepin</span></li>
        <li>Solar System</li>
        <li>Space Battle</li>
        <li>Space Rider</li>
        <li>Concord</li>
        <li>Storm</li>
      </ul>
    </div>
  </div>

  <div style="background:#FAFAF7;border-left:3px solid #8A8680;border-radius:0 8px 8px 0;padding:16px 20px;margin:0;">
    <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#8A8680;margin-bottom:4px;">Maschine nicht dabei?</div>
    <p style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.55;color:#2D2D2D;margin:0;">Technisch m\u00f6glich \u2014 aber der Gro\u00dfteil der Zeit flie\u00dft dann ins Reverse Engineering von Schaltermatrix, Lampen-Layout und Spulen-Mapping, bevor \u00fcberhaupt eine Regel geschrieben werden kann. Die oben gelisteten Maschinen haben diese Grundlage bereits fertig.</p>
  </div>
</section>

<section style="max-width:880px;margin:0 auto;padding:32px 32px 80px;text-align:center;">
  <h2 style="font-family:'Oswald',sans-serif;font-size:24px;font-weight:700;text-transform:uppercase;letter-spacing:0.02em;color:#0A0A0A;margin:0 0 12px;">Loslegen?</h2>
  <p style="font-family:'Source Serif 4',Georgia,serif;font-size:16px;line-height:1.55;color:#2D2D2D;margin:0 0 24px;">M\u00fcnze einwerfen, Start dr\u00fccken, abschie\u00dfen und Schalter klicken, um zu sehen wie jeder Regelsatz wertet. Kein Login, keine Cookies, kein Tracking.</p>
  <button onclick="showView('simulator')" style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:14px 32px;border-radius:8px;border:none;background:#D42A80;color:#fff;cursor:pointer;box-shadow:0 4px 14px rgba(212,42,128,0.3);">Simulator \u00f6ffnen &rarr;</button>
</section>
`;
}

function buildImprintContent() {
  const el = document.getElementById('imprint-content');
  el.innerHTML = G.lang === 'en' ? imprintContentEN() : imprintContentDE();
}
function legalHelpers() {
  const h = (tag,text,style) => `<${tag} style="${style||''}">${text}</${tag}>`;
  return {
    hd: text => h('h1',text,"font-family:'Oswald',sans-serif;font-size:28px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;color:#0A0A0A;margin:0 0 4px;"),
    sub: text => h('div',text,"font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#8A8680;margin-bottom:20px;"),
    sh: text => h('h3',text,"font-family:'Oswald',sans-serif;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#D42A80;margin:20px 0 6px;"),
    p: text => h('p',text,"font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.6;color:#2D2D2D;margin:0 0 8px;"),
  };
}
function imprintContentDE() {
  const { hd, sub, sh, p } = legalHelpers();
  return `
${hd('Impressum')}
${sub('Angaben gem\u00e4\u00df \u00a7 5 TMG')}

${sh('Diensteanbieter')}
${p('Frank Goeltl<br>Roemersteinstr. 9<br>73230 Kirchheim unter Teck<br>Deutschland')}

${sh('Kontakt')}
${p('E-Mail: <a href="mailto:frg@silverballmania.com" style="color:#D42A80;">frg@silverballmania.com</a>')}

${sh('Verantwortlich f\u00fcr den Inhalt nach \u00a7 55 Abs. 2 RStV')}
${p('Frank Goeltl<br>Roemersteinstr. 9<br>73230 Kirchheim unter Teck<br>Deutschland')}

${sh('Projektstatus')}
${p('Dies ist ein privates, nicht-kommerzielles Hobbyprojekt \u2014 individueller Spielcode f\u00fcr einen 1980 Bally Silverball Mania Flipperautomaten in Privatbesitz. Keine Gesch\u00e4ftst\u00e4tigkeit, kein Verkauf. Nicht mit Bally Manufacturing, Stern oder anderen Flipper-Hardware-Anbietern affiliiert.')}

${sh('Lizenzierung')}
${p('Der Projektcode leitet sich vom Retro Pin Upgrade (RPU) Framework von Dick Hamill ab, lizenziert unter GPL 3.0. Originale Markenzeichen (Silverball Mania, Bally) sind Eigentum der jeweiligen Rechteinhaber und werden hier ausschlie\u00dflich zur Identifikation der Quellmaschine verwendet.')}

${sh('Haftung f\u00fcr Inhalte')}
${p('Als Diensteanbieter bin ich gem\u00e4\u00df \u00a7 7 Abs.1 TMG f\u00fcr eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach \u00a7\u00a7 8 bis 10 TMG bin ich jedoch nicht verpflichtet, \u00fcbermittelte oder gespeicherte fremde Informationen zu \u00fcberwachen oder nach Umst\u00e4nden zu forschen, die auf eine rechtswidrige T\u00e4tigkeit hinweisen.')}
${p('Der Simulator wird ohne Gew\u00e4hr f\u00fcr Bildungs- und Playtest-Zwecke bereitgestellt. Das Verhalten im Browser ist eine N\u00e4herung der physischen Maschine und kann in subtilen Details vom tats\u00e4chlichen Ger\u00e4t abweichen.')}

${sh('Haftung f\u00fcr Links')}
${p('Dieses Angebot enth\u00e4lt Links zu externen Webseiten Dritter (RPU-Projekt, RoyGBev Pinball, Jeff-Z.com, Pinball Index), auf deren Inhalte ich keinen Einfluss habe. F\u00fcr die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden solche Links umgehend entfernt.')}

${sh('Urheberrecht')}
${p('Die durch den Seitenbetreiber erstellten Inhalte und Werke unterliegen dem deutschen Urheberrecht. Beitr\u00e4ge Dritter sind als solche gekennzeichnet. Projektcode steht unter GPL 3.0 (siehe Lizenzierung).')}

${sh('EU-Streitschlichtung')}
${p('Die Europ\u00e4ische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener" style="color:#D42A80;">https://ec.europa.eu/consumers/odr/</a>. Da dieses Angebot rein privat und nicht-kommerziell betrieben wird, besteht keine Verpflichtung und keine Bereitschaft zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle.')}
`;
}
function imprintContentEN() {
  const { hd, sub, sh, p } = legalHelpers();
  return `
${hd('Legal Notice')}
${sub('Information pursuant to \u00a7 5 TMG (German Telemedia Act)')}

${p('<em style="color:#8A8680;font-size:12px;">English translation for convenience. The German version is the legally binding one.</em>')}

${sh('Service Provider')}
${p('Frank Goeltl<br>Roemersteinstr. 9<br>73230 Kirchheim unter Teck<br>Germany')}

${sh('Contact')}
${p('Email: <a href="mailto:frg@silverballmania.com" style="color:#D42A80;">frg@silverballmania.com</a>')}

${sh('Responsible for Content per \u00a7 55 Abs. 2 RStV')}
${p('Frank Goeltl<br>Roemersteinstr. 9<br>73230 Kirchheim unter Teck<br>Germany')}

${sh('Project Status')}
${p('This is a private, non-commercial hobby project \u2014 custom game code for a 1980 Bally Silverball Mania pinball machine in private ownership. No commercial activity, no sales. Not affiliated with or endorsed by Bally Manufacturing, Stern, or any other pinball hardware vendor.')}

${sh('Licensing')}
${p('The project code is derived from the Retro Pin Upgrade (RPU) framework by Dick Hamill, licensed under GPL 3.0. Original trademarks (Silverball Mania, Bally) are property of their respective rights holders and used here solely to identify the source machine.')}

${sh('Liability for Content')}
${p('As a service provider, I am responsible for my own content on these pages according to \u00a7 7 Abs.1 TMG and general laws. However, under \u00a7\u00a7 8 to 10 TMG, I am not obliged to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.')}
${p('The simulator is provided as-is for educational and playtesting purposes. Behavior in the browser is an approximation of the physical machine and may diverge from the running sketch in subtle ways.')}

${sh('Liability for Links')}
${p('This site contains links to external websites of third parties (RPU project, RoyGBev Pinball, Jeff-Z.com, Pinball Index) over whose content I have no control. The respective provider or operator of those pages is always responsible for their content. Permanent monitoring of linked content is not reasonable without specific indications of a legal violation. Upon becoming aware of infringements, such links will be removed immediately.')}

${sh('Copyright')}
${p('Content and works created by the site operator are subject to German copyright law. Third-party contributions are marked as such. Project code is licensed under GPL 3.0 (see Licensing).')}

${sh('EU Online Dispute Resolution')}
${p('The European Commission provides an Online Dispute Resolution (ODR) platform: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener" style="color:#D42A80;">https://ec.europa.eu/consumers/odr/</a>. As this site is operated purely privately and non-commercially, there is no obligation and no willingness to participate in dispute resolution proceedings before a consumer arbitration board.')}
`;
}

function buildPrivacyContent() {
  const el = document.getElementById('privacy-content');
  el.innerHTML = G.lang === 'en' ? privacyContentEN() : privacyContentDE();
}
function privacyContentDE() {
  const { hd, sub, sh, p } = legalHelpers();
  return `
${hd('Datenschutzerkl\u00e4rung')}
${sub('Privacy Policy')}

${sh('1. Verantwortlicher')}
${p('Verantwortlicher im Sinne der DSGVO ist:')}
${p('Frank Goeltl<br>Roemersteinstr. 9<br>73230 Kirchheim unter Teck<br>Deutschland<br>E-Mail: <a href="mailto:frg@silverballmania.com" style="color:#D42A80;">frg@silverballmania.com</a>')}

${sh('2. Umfang der Datenverarbeitung')}
${p('Dieser Simulator ist eine rein statische Webanwendung. Es werden auf dieser Website <b>keine Cookies gesetzt</b>, <b>keine Tracking-Tools</b> eingesetzt, <b>keine Analyse-Dienste</b> genutzt und <b>keine personenbezogenen Daten aktiv erhoben</b> oder verarbeitet. S\u00e4mtliche Schriftarten (Oswald, Source Serif 4, Space Mono) werden lokal vom Server ausgeliefert; es findet keine Verbindung zu Google Fonts oder anderen Drittanbieter-CDN statt.')}

${sh('3. Server-Logfiles durch den Hoster')}
${p('Beim Aufruf dieser Website werden durch den Hosting-Provider (GitHub Pages, betrieben von GitHub Inc., 88 Colin P Kelly Jr St, San Francisco, CA 94107, USA) automatisch Informationen in Server-Logfiles erfasst, die Ihr Browser \u00fcbermittelt. Dies sind typischerweise:')}
<ul style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.7;color:#2D2D2D;margin:0 0 8px;padding-left:22px;">
<li>IP-Adresse des anfragenden Rechners</li>
<li>Datum und Uhrzeit des Zugriffs</li>
<li>Name und URL der abgerufenen Datei</li>
<li>\u00dcbertragene Datenmenge</li>
<li>Referrer-URL (zuvor besuchte Seite)</li>
<li>Verwendeter Browser und Betriebssystem</li>
</ul>
${p('Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem stabilen, sicheren Betrieb der Website). Die Daten werden durch den Hoster verarbeitet; auf die konkrete Speicherdauer habe ich keinen Einfluss. Siehe dazu die Datenschutzerkl\u00e4rung von GitHub: <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener" style="color:#D42A80;">docs.github.com/site-policy</a>.')}
${p('Hinweis: Da GitHub in den USA ans\u00e4ssig ist, kann eine \u00dcbermittlung personenbezogener Daten in ein Drittland erfolgen. GitHub unterliegt dem EU-US Data Privacy Framework (Angemessenheitsbeschluss der EU-Kommission, 10. Juli 2023).')}

${sh('4. Externe Schriftarten / CDNs')}
${p('Es werden keine externen Schriftarten-Dienste (z.B. Google Fonts) eingebunden. Alle Schriftarten werden lokal ausgeliefert.')}

${sh('5. Externe Links')}
${p('Diese Website enth\u00e4lt Links zu externen Websites (u.a. pinballrefresh.com, github.com, pinballindex.com, roygbev.com, jeff-z.com). Beim Anklicken eines solchen Links verlassen Sie diese Website. Auf die Datenverarbeitung der verlinkten Websites habe ich keinen Einfluss \u2014 bitte informieren Sie sich dort \u00fcber die jeweiligen Datenschutzbestimmungen.')}

${sh('6. Ihre Rechte als betroffene Person')}
${p('Soweit personenbezogene Daten verarbeitet werden, haben Sie nach der DSGVO folgende Rechte:')}
<ul style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.7;color:#2D2D2D;margin:0 0 8px;padding-left:22px;">
<li><b>Auskunft</b> (Art. 15 DSGVO) \u2014 welche Daten zu Ihrer Person verarbeitet werden</li>
<li><b>Berichtigung</b> (Art. 16 DSGVO) \u2014 unrichtige Daten korrigieren lassen</li>
<li><b>L\u00f6schung</b> (Art. 17 DSGVO, "Recht auf Vergessenwerden")</li>
<li><b>Einschr\u00e4nkung der Verarbeitung</b> (Art. 18 DSGVO)</li>
<li><b>Datenportabilit\u00e4t</b> (Art. 20 DSGVO)</li>
<li><b>Widerspruch</b> gegen die Verarbeitung (Art. 21 DSGVO)</li>
<li><b>Beschwerde</b> bei einer Aufsichtsbeh\u00f6rde (Art. 77 DSGVO) \u2014 z.B. beim Landesbeauftragten f\u00fcr den Datenschutz Baden-W\u00fcrttemberg (<a href="https://www.baden-wuerttemberg.datenschutz.de/" target="_blank" rel="noopener" style="color:#D42A80;">baden-wuerttemberg.datenschutz.de</a>)</li>
</ul>
${p('Zur Geltendmachung Ihrer Rechte gen\u00fcgt eine formlose Mitteilung an <a href="mailto:frg@silverballmania.com" style="color:#D42A80;">frg@silverballmania.com</a>.')}

${sh('7. SSL-Verschl\u00fcsselung')}
${p('Die Website wird ausschlie\u00dflich \u00fcber HTTPS/TLS ausgeliefert. Eine \u00dcbertragung \u00fcber unverschl\u00fcsseltes HTTP findet nicht statt.')}

${sh('8. \u00c4nderungen dieser Datenschutzerkl\u00e4rung')}
${p('Diese Datenschutzerkl\u00e4rung kann bei technischen \u00c4nderungen oder ge\u00e4nderten rechtlichen Anforderungen angepasst werden. Stand: ' + new Date().toISOString().slice(0,10) + '.')}
`;
}
function privacyContentEN() {
  const { hd, sub, sh, p } = legalHelpers();
  return `
${hd('Privacy Policy')}
${sub('Datenschutzerkl\u00e4rung')}

${p('<em style="color:#8A8680;font-size:12px;">English translation for convenience. The German version is the legally binding one.</em>')}

${sh('1. Controller')}
${p('The controller within the meaning of the GDPR is:')}
${p('Frank Goeltl<br>Roemersteinstr. 9<br>73230 Kirchheim unter Teck<br>Germany<br>Email: <a href="mailto:frg@silverballmania.com" style="color:#D42A80;">frg@silverballmania.com</a>')}

${sh('2. Scope of Data Processing')}
${p('This simulator is a purely static web application. On this site we set <b>no cookies</b>, use <b>no tracking tools</b>, use <b>no analytics services</b> and do <b>not actively collect or process personal data</b>. All fonts (Oswald, Source Serif 4, Space Mono) are served locally from our server; no connection is made to Google Fonts or any other third-party CDN.')}

${sh('3. Server Log Files by the Hosting Provider')}
${p('When this website is visited, the hosting provider (GitHub Pages, operated by GitHub Inc., 88 Colin P Kelly Jr St, San Francisco, CA 94107, USA) automatically records information in server log files that your browser transmits. This typically includes:')}
<ul style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.7;color:#2D2D2D;margin:0 0 8px;padding-left:22px;">
<li>IP address of the requesting machine</li>
<li>Date and time of access</li>
<li>Name and URL of the retrieved file</li>
<li>Data volume transferred</li>
<li>Referrer URL (previously visited page)</li>
<li>Browser and operating system used</li>
</ul>
${p('The legal basis is Art. 6(1)(f) GDPR (legitimate interest in stable, secure website operation). The data is processed by the hosting provider; I have no influence over the specific retention period. See GitHub\'s privacy statement: <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener" style="color:#D42A80;">docs.github.com/site-policy</a>.')}
${p('Note: Since GitHub is based in the United States, personal data may be transferred to a third country. GitHub is subject to the EU-US Data Privacy Framework (EU Commission adequacy decision of 10 July 2023).')}

${sh('4. External Fonts / CDNs')}
${p('No external font services (e.g. Google Fonts) are embedded. All fonts are delivered locally.')}

${sh('5. External Links')}
${p('This website contains links to external websites (including pinballrefresh.com, github.com, pinballindex.com, roygbev.com, jeff-z.com). When you click such a link, you leave this website. I have no influence on the data processing of the linked sites \u2014 please refer to their respective privacy policies.')}

${sh('6. Your Rights as a Data Subject')}
${p('To the extent that personal data is processed, you have the following rights under the GDPR:')}
<ul style="font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.7;color:#2D2D2D;margin:0 0 8px;padding-left:22px;">
<li><b>Access</b> (Art. 15 GDPR) \u2014 which data concerning you is being processed</li>
<li><b>Rectification</b> (Art. 16 GDPR) \u2014 correction of inaccurate data</li>
<li><b>Erasure</b> (Art. 17 GDPR, "right to be forgotten")</li>
<li><b>Restriction of processing</b> (Art. 18 GDPR)</li>
<li><b>Data portability</b> (Art. 20 GDPR)</li>
<li><b>Objection</b> to processing (Art. 21 GDPR)</li>
<li><b>Complaint</b> to a supervisory authority (Art. 77 GDPR) \u2014 e.g. the State Commissioner for Data Protection of Baden-W\u00fcrttemberg (<a href="https://www.baden-wuerttemberg.datenschutz.de/" target="_blank" rel="noopener" style="color:#D42A80;">baden-wuerttemberg.datenschutz.de</a>)</li>
</ul>
${p('To exercise your rights, an informal message to <a href="mailto:frg@silverballmania.com" style="color:#D42A80;">frg@silverballmania.com</a> is sufficient.')}

${sh('7. SSL Encryption')}
${p('The website is served exclusively via HTTPS/TLS. No transmission via unencrypted HTTP takes place.')}

${sh('8. Changes to This Privacy Policy')}
${p('This privacy policy may be adjusted for technical changes or updated legal requirements. Last updated: ' + new Date().toISOString().slice(0,10) + '.')}
`;
}
