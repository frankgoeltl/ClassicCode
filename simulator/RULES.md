# Silverball Mania - Complete Rulesheet

Two rules modes are available in the simulator. Toggle with the Rules button.

---

## Original (1980 Bally)

The factory rules from the original Bally Silverball Mania machine.

### Scoring

| Feature | Lit | Unlit |
|---------|-----|-------|
| Standup targets (S-I-L-V-E-R-B-A-L-L-M-A-N-I-A) | 1,000 | 500 |
| Inlane rollovers (A, I) | 1,000 | 500 |
| Outlane rollovers (M, A) | 1,000 | 500 |
| Spinners | 1,000 | 100 |
| Center hoop (horseshoe) | 5,000 | -- |
| Top center lane | 5,000 (always) | -- |
| Top outer lanes | 500 (always) | -- |
| Thumper bumpers | 100 | -- |
| Passive bumpers / rebounds | 50 | -- |
| Slingshots | 20 | -- |
| Kicker | 5,000 | 500 |

### Spell SILVERBALL MANIA

The main objective. 15 letters collected via standup targets, inlane/outlane rollovers, and the N center target. Letters can also be spotted by lit top lanes and the center hoop.

- Letters carry from ball to ball per player
- When all 15 letters are collected, they reset for the next round
- **1st completion**: 15,000 Wizard Bonus lit (awarded at end of ball)
- **2nd completion**: 30,000 Supreme Wizard Bonus lit
- **3rd+ completion**: Special (free credit)

Each lit letter is worth 1,000 bonus points at end of ball, multiplied by bonus X. Maximum bonus: 44,000 (before multipliers).

### Center Hoop (Horseshoe)

The most important shot. Each hit:
- Scores 5,000 points
- Spots the next unlit SILVERBALL MANIA letter
- Advances the bonus multiplier
- Lights the disappearing kicker

### Bonus Multiplier

Advanced only by the center hoop. Progression: 1X -> 2X -> 3X -> 4X -> 5X -> Extra Ball lit. Multipliers reset each ball. Only the active multiplier lamp is lit.

### Extra Ball

After the 5th hoop hit (bonus X at 5X), the N center target lights for extra ball. Hit N to collect. Stays lit for the remainder of the ball (no timeout). One extra ball per ball in play.

### Top Lanes

Three lanes at the top. Either the center lane is lit OR the two outer lanes are lit (never both). Toggled by passive bumpers, rebound switches, and slingshots.

- **Center lane** (skillshot): Always scores 5,000. Always lights kicker. Spots a letter when lit. Lit at the start of each ball. After use, toggles to outer lanes.
- **Outer lanes**: Always score 500. Spot a letter when lit.

### Spinners

Left and right spinners flank the center hoop. Only one is lit at a time. Toggled by passive bumpers, rebounds, and slingshots.

- Spinners start unlit each ball
- Lit by spelling MANIA (all 5 letters)
- After a SILVERBALL MANIA completion, spinners go unlit (must spell MANIA again)

### Disappearing Kicker

Located between the flippers and drain. When lit, the kicker arm rises and catches balls heading to the drain, launching them back into play.

- Lit by: center top lane or center hoop
- Scores 5,000 when lit, 500 when unlit
- **Drops after each use** (must be relit)
- No timeout -- stays up until a ball hits it

### Passive Bumpers & Rebounds

The 4 passive bumpers at the top and 4 rebound switches (all wired to same circuit):
- Score 50 points
- Toggle top lane lit state (center <-> outer)
- Toggle which spinner is lit (left <-> right)

### Lamps

All lamps are steady on or off. No flashing effects in original mode.

---

## Classic (SBM23 Custom Rules)

The SBM23 custom rules by Dick Hamill, replacing the original Bally ROM. Adds significantly more depth.

### Key Differences from Original

- **Skill Shot**: At ball start, specific top lanes and horseshoe award 10,000-20,000 points
- **Silverball Modes**: Letter collection progresses through 3 modes:
  - **Knock Out Lights** (1st round): All targets lit, hit to collect
  - **Word Groups** (2nd round): Collect SILVER, then BALL, then MANIA in word groups
  - **Fadeaway** (3rd+ round): Must collect letters in order (S-I-L-V-E-R-B-A-L-L-M-A-N-I-A). Out-of-order letters held for 20 seconds
- **Alternating Combo**: Start from inlane, alternate left/right spinners, collect at horseshoe for 15K/30K/60K added bonus
- **Bonus X**: Advanced by horseshoe + N center target combo within a timed window, OR completing all 3 top lanes. Window shrinks as bonus X increases
- **Ball Save**: 15-second ball save at the start of each ball
- **Kicker**: Timed duration (2-20 seconds depending on context), not permanent
- **Score Multiplier**: Applied to all scoring
- **Spinner 1K Phase**: After 20 spins, one spinner lights for 1,000 points. Toggled by rebounds
- **MANIA Letter Rotation**: Rebounds rotate the MANIA letter positions (first 5 completions)

### Scoring

| Feature | Points |
|---------|--------|
| Standup target (lit) | 1,000 |
| Standup target (unlit) | 100 |
| Spinner (combo advance) | 1,500 |
| Spinner (1K phase lit) | 1,000 |
| Spinner (unlit) | 100 |
| Horseshoe (skill shot) | 20,000 |
| Horseshoe (combo collect) | 15,000 |
| Horseshoe (normal) | 5,000 |
| Top lane (skill shot) | 10,000 |
| Top lane (completed) | 5,000 |
| Top lane (normal) | 100-200 |
| Thumper bumpers | 100 |
| Rebounds / 50pt | 50 |
| Slingshots | 10 |
| Kicker (with bonus) | 5,000 x bonus level |
| Kicker (normal) | 5,000 |
| SILVERBALL MANIA completion | 20,000 x mode level |

### Alternating Combo System

1. Ball passes through left or right inlane -> combo starts
2. Hit the opposite spinner (left inlane -> right spinner, or vice versa)
3. Alternate spinners for 2-4 hits (based on current achievement level)
4. Horseshoe to collect: qualifies 15K, 30K, or 60K added bonus
5. Kicker rollover to cash in the qualified bonus

### Bonus X

Two ways to advance:
- Hit horseshoe, then hit N center target within the time window
- Complete all 3 top lanes (left + center + right)

Time window: 10s at 1X, 8s at 2X, 6s at 3X, 4s at 4X, 2s at 5X.

### Super Skill Shot

At ball start, hitting the horseshoe (20K) qualifies the super skill shot. Then hitting N center target awards an additional 15,000 and advances base bonus X (carries across balls).

---

## Common to All Modes

### Tilt

2 warnings before tilt. Tilt disables flippers and solenoids, cancels end-of-ball bonus.

### End-of-Ball Bonus

Each lit SILVERBALL MANIA letter = 1,000 bonus points, multiplied by current bonus X. Added bonus awards (15K/30K wizard bonuses) counted separately. Bonus is forfeit on tilt.

### Match

After game over, a match sequence runs. If the last two digits of a player's score match the randomly selected number, that player earns a free credit.

### Players

Up to 4 players. Additional players can be added during ball 1 by pressing Start with credits available.
