// sketch.js

// ─────────────────────────────────────────────────────────────────────────────
// 1) GLOBAL CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

// Canvas scale: 1 = 160×144, 2 = 320×288, etc.
let size_ratio   = 2;

// Name-box coordinates (in 160×144 space):
const BACK_NAME_END_X    = 144;  // your Pokémon (back), right-aligned here
const BACK_NAME_Y        = 63;

const FRONT_NAME_START_X = 14;   // opponent (front), left-& right-bounds here
const FRONT_NAME_END_X   = 80;
const FRONT_NAME_Y       = 7;

// ─────────────────────────────────────────────────────────────────────────────
// 2) STATE & ASSETS
// ─────────────────────────────────────────────────────────────────────────────

let bg, gameboyFont;
let pokemonList = [];      // loaded in preload()

// Current battle info:
let frontSprite, backSprite;
let frontName, backName;
let hpFront,    hpBack;
let frontPokemonData, backPokemonData; // To store the full Pokémon objects

// Battle variables
let currentTurn    = 0; // 0 for front (opponent), 1 for back (your pokemon)
const turnInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
let lastTurnTime   = 0;
let battleActive   = false;
let winner         = null; // Stores the winning Pokémon data for the next round
let lastWinnerPosition = null; // Stores 'front' or 'back'
let winnerDisplayTime = 0; // Time when winner was announced
const winnerDisplayDuration = 2000; // 2 seconds
let winnerHpFillStart = 0; // HP before win, for animation
let processingBattleEnd = false; // Flag to prevent further turns during battle end sequence
let battleEndedTimestamp = 0; // Timestamp when a battle officially ended

// Attack animation variables
let isAnimatingAttack = false;
let attackAnimationStartTime = 0;
const attackAnimationDuration = 300; // milliseconds for the lunge animation
let attackingPokemon = null; // 'front' or 'back'
let hitAnimationTriggered = false; // Ensures hit animation is started only once per attack

// Hit animation variables
let isAnimatingHit = false;
let hitAnimationStartTime = 0;
const hitAnimationDuration = 400; // Total duration of the hit flash (e.g., 2 flashes)
const flashInterval = 100; // How long each flash (on/off) lasts
let defendingPokemon = null; // 'front' or 'back' - the pokemon that is being hit

// Front sprite transition variables
let frontCurrentY = 5; // The dynamic Y position of the front sprite
let frontTransitionPhase = 'idle'; // 'idle', 'exiting', 'entering'
let frontTransitionStartTime = 0;
const FRONT_TRANSITION_DURATION = 500; // ms for slide animation
const FRONT_SPRITE_ORIGINAL_Y = 5; // Base Y position for front sprite
const FRONT_SPRITE_OFFSCREEN_TOP_Y = -50; // Y when off-screen upwards

// Back sprite transition variables
let backCurrentX = 10; // The dynamic X position of the back sprite
let backTransitionPhase = 'idle'; // 'idle', 'exiting', 'entering'
let backTransitionStartTime = 0;
const BACK_TRANSITION_DURATION = 500; // ms for slide animation
const BACK_SPRITE_ORIGINAL_X = 10; // Base X position for back sprite
const BACK_SPRITE_OFFSCREEN_LEFT_X = -50; // X when off-screen to the left

// ─────────────────────────────────────────────────────────────────────────────
// 3) PRELOAD — load BG, FONT, & JSON roster
// ─────────────────────────────────────────────────────────────────────────────

function preload() {
  // 3.1) background + font
  bg          = loadImage('bg.png');
  gameboyFont = loadFont('PressStart2P-Regular.ttf');

  // 3.2) synchronous JSON load (blocks until parsed)
  pokemonList = loadJSON('pokemonList.json');
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) SETUP — canvas & initial Pokémon pick
// ─────────────────────────────────────────────────────────────────────────────

function setup() {
  pixelDensity(1);
  createCanvas(160 * size_ratio, 144 * size_ratio);
  noSmooth();
  textFont(gameboyFont);

  // in case loadJSON returned an object, coerce to array:
  if (!Array.isArray(pokemonList)) {
    pokemonList = Object.values(pokemonList);
  }

  // initial pick
  startNewBattle();
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) DRAW LOOP — background, sprites, UI
// ─────────────────────────────────────────────────────────────────────────────

function draw() {
  background(0);

  // Calculate current sprite X positions, applying attack animation offset if active
  let currentFrontSpriteX = 111;
  // Use a local variable to apply attack animation offset
  let currentBackSpriteXForAttack = 10;

  if (isAnimatingAttack) {
      let elapsedTime = millis() - attackAnimationStartTime;
      if (elapsedTime < attackAnimationDuration) {
          let progress = elapsedTime / attackAnimationDuration;
          // Use a sine wave to create a smooth outward and return motion
          let offset = sin(progress * PI) * 10; // Max 10 pixels outward and back

          if (attackingPokemon === 'front') {
              currentFrontSpriteX -= offset; // Move left for front attacker
          } else if (attackingPokemon === 'back') {
              currentBackSpriteXForAttack += offset; // Move right for back attacker
          }

          // Trigger hit animation when attacker reaches peak of lunge (approx halfway)
          if (!hitAnimationTriggered && progress >= 0.4 && progress <= 0.6 ) { // Check around 0.5 to trigger once
               isAnimatingHit = true;
               hitAnimationStartTime = millis();
               hitAnimationTriggered = true; // Set flag to true to prevent re-triggering
          }

      } else {
          // Attack animation finished
          isAnimatingAttack = false;
          attackingPokemon = null; // Reset attacker flag
          hitAnimationTriggered = false; // Reset for next attack
      }
  }

  // Front sprite slide animation logic
  if (frontTransitionPhase === 'exiting') {
      let elapsedTime = millis() - frontTransitionStartTime;
      if (elapsedTime < FRONT_TRANSITION_DURATION) {
          let progress = elapsedTime / FRONT_TRANSITION_DURATION;
          frontCurrentY = map(progress, 0, 1, FRONT_SPRITE_ORIGINAL_Y, FRONT_SPRITE_OFFSCREEN_TOP_Y); // Slide up
      } else {
          frontCurrentY = FRONT_SPRITE_OFFSCREEN_TOP_Y; // Ensure it stays off-screen
      }
  } else if (frontTransitionPhase === 'entering') {
      let elapsedTime = millis() - frontTransitionStartTime;
      if (elapsedTime < FRONT_TRANSITION_DURATION) {
          let progress = elapsedTime / FRONT_TRANSITION_DURATION;
          frontCurrentY = map(progress, 0, 1, FRONT_SPRITE_OFFSCREEN_TOP_Y, FRONT_SPRITE_ORIGINAL_Y); // Slide down
      } else {
          frontCurrentY = FRONT_SPRITE_ORIGINAL_Y; // Ensure it ends at original position
          frontTransitionPhase = 'idle'; // Animation complete
      }
  } else { // 'idle' phase
      frontCurrentY = FRONT_SPRITE_ORIGINAL_Y;
  }

    // Back sprite slide animation logic
    // This position is independent of attack animation, it's for switch-in/out
    if (backTransitionPhase === 'exiting') {
        let elapsedTime = millis() - backTransitionStartTime;
        if (elapsedTime < BACK_TRANSITION_DURATION) {
            let progress = elapsedTime / BACK_TRANSITION_DURATION;
            backCurrentX = map(progress, 0, 1, BACK_SPRITE_ORIGINAL_X, BACK_SPRITE_OFFSCREEN_LEFT_X); // Slide left
        } else {
            backCurrentX = BACK_SPRITE_OFFSCREEN_LEFT_X; // Ensure it stays off-screen
        }
    } else if (backTransitionPhase === 'entering') {
        let elapsedTime = millis() - backTransitionStartTime;
        if (elapsedTime < BACK_TRANSITION_DURATION) {
            let progress = elapsedTime / BACK_TRANSITION_DURATION;
            backCurrentX = map(progress, 0, 1, BACK_SPRITE_OFFSCREEN_LEFT_X, BACK_SPRITE_ORIGINAL_X); // Slide right
        } else {
            backCurrentX = BACK_SPRITE_ORIGINAL_X; // Ensure it ends at original position
            backTransitionPhase = 'idle'; // Animation complete
        }
    } else { // 'idle' phase
        backCurrentX = BACK_SPRITE_ORIGINAL_X;
    }

  // Determine if defending sprite should be drawn based on hit animation
  let drawFrontSprite = true;
  let drawBackSprite = true;

  if (isAnimatingHit) {
      let elapsedTime = millis() - hitAnimationStartTime;
      if (elapsedTime < hitAnimationDuration) {
          let flashCycleTime = elapsedTime % (2 * flashInterval); // On-off cycle (e.g., 0-99ms on, 100-199ms off)
          if (flashCycleTime >= flashInterval) { // If in the "off" part of the cycle
              if (defendingPokemon === 'front') {
                  drawFrontSprite = false;
              } else if (defendingPokemon === 'back') {
                  drawBackSprite = false;
              }
          }
      } else {
          isAnimatingHit = false; // Hit animation finished
          defendingPokemon = null; // Reset defender flag
      }
  }

  // 5.2) draw background & sprites
  image(bg, 0, 0, 160 * size_ratio, 144 * size_ratio);
  // Draw back sprite: its x position is affected by its slide transition AND attack animation
  if (backSprite && backCurrentX > (BACK_SPRITE_OFFSCREEN_LEFT_X - 5) && drawBackSprite) {
    // Add the attack animation offset to the current transition X
    image(backSprite,  (backCurrentX + currentBackSpriteXForAttack - BACK_SPRITE_ORIGINAL_X) * size_ratio, 43 * size_ratio, 50 * size_ratio, 50 * size_ratio);
  }
  // Draw front sprite only if it exists and is above the off-screen threshold, and not hidden by flash
  if (frontSprite && frontCurrentY > (FRONT_SPRITE_OFFSCREEN_TOP_Y - 5) && drawFrontSprite) {
    image(frontSprite, currentFrontSpriteX * size_ratio, frontCurrentY * size_ratio, 40 * size_ratio, 40 * size_ratio);
  }

  // 5.3) UI overlays
  drawNames();
  drawHp();
  drawClock();

  // 5.4) Winner display logic
  if (winner && millis() - winnerDisplayTime < winnerDisplayDuration) {
    drawWinnerText();
    animateWinnerHp();
  }

  // Battle logic: Only allow takeTurn if battle is active AND not currently processing battle end
  // Added a small buffer (50ms) after battleEndedTimestamp to prevent race conditions after battle ends
  if (battleActive && !processingBattleEnd && millis() - lastTurnTime > turnInterval && millis() - battleEndedTimestamp > 50) {
    takeTurn();
    lastTurnTime = millis();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) DRAW NAMES — trims & aligns both front/back names
// ─────────────────────────────────────────────────────────────────────────────

function drawNames() {
  textSize(6 * size_ratio);
  fill(0);
  noStroke();

  // FRONT (opponent) name: left-aligned, trimmed to fit box
  textAlign(LEFT, TOP);
  {
    let s    = frontName || '';
    const maxW = (FRONT_NAME_END_X - FRONT_NAME_START_X) * size_ratio;
    while (textWidth(s) > maxW && s.length) {
      s = s.slice(0, -1);
    }
    text(s, FRONT_NAME_START_X * size_ratio, FRONT_NAME_Y * size_ratio);
  }

  // BACK (your Pokémon) name: right-aligned
  textAlign(RIGHT, TOP);
  text(backName || '', BACK_NAME_END_X * size_ratio, BACK_NAME_Y * size_ratio);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) DRAW HP — labels + pill bars
// ─────────────────────────────────────────────────────────────────────────────

function drawHp() {
  textSize(6 * size_ratio);
  fill(0);
  textAlign(RIGHT, TOP);

  text('HP', 28 * size_ratio, 19 * size_ratio);
  text('HP', 88 * size_ratio, 78 * size_ratio);

  drawHpBar(30 * size_ratio, 19 * size_ratio, 50 * size_ratio, 5 * size_ratio, hpFront);
  drawHpBar(90 * size_ratio, 78 * size_ratio, 50 * size_ratio, 5 * size_ratio, hpBack);
}

function drawHpBar(x, y, w, h, pct) {
  pct = constrain(pct, 0, 1);
  noStroke(); fill(100);
  rect(x, y, pct * w, h, h);
  noFill(); stroke(0); strokeWeight(1);
  rect(x, y, w,    h, h);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) DRAW CLOCK — centered, large time display
// ─────────────────────────────────────────────────────────────────────────────

function drawClock() {
  textSize(24 * size_ratio);
  textAlign(CENTER, CENTER);
  fill(0);

  const hrs  = nf(hour(),   2),
        mins = nf(minute(), 2);

  // y = 120 to stay inside the bottom border
  text(`${hrs}:${mins}`, 80 * size_ratio, 120 * size_ratio);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) startNewBattle — handles pokemon selection & transition
// ─────────────────────────────────────────────────────────────────────────────

// This function starts the entire new battle sequence including transitions
function startNewBattle() {
  if (pokemonList.length === 0) return;

  let nextFrontPokemon, nextBackPokemon;
  let shouldFrontAnimateExit = false;
  let shouldBackAnimateExit = false;

  // --- 1. Determine which Pokémon will be in the next battle and if they should animate ---
  if (winner) {
      if (lastWinnerPosition === 'front') { // Front Pokémon won, so Front stays. Back is replaced.
          nextFrontPokemon = winner;
          shouldBackAnimateExit = true; // Old Back Pokémon needs to exit

          // Pick a new back Pokémon distinct from the staying front
          let newBackPIndex;
          do { newBackPIndex = floor(random(pokemonList.length)); }
          while (pokemonList[newBackPIndex].name === nextFrontPokemon.name);
          nextBackPokemon = pokemonList[newBackPIndex];

      } else { // Back Pokémon won, so Back stays. Front is replaced.
          nextBackPokemon = winner;
          shouldFrontAnimateExit = true; // Old Front Pokémon needs to exit

          // Pick a new front Pokémon distinct from the staying back
          let newFrontPIndex;
          do { newFrontPIndex = floor(random(pokemonList.length)); }
          while (pokemonList[newFrontPIndex].name === nextBackPokemon.name);
          nextFrontPokemon = pokemonList[newFrontPIndex];
      }
      // Consume winner and lastWinnerPosition now that they've been used
      winner = null;
      lastWinnerPosition = null;
  } else { // Initial load or double KO (no explicit winner), both are replaced.
      shouldFrontAnimateExit = true;
      shouldBackAnimateExit = true;

      // Pick two distinct random Pokémon
      let i = floor(random(pokemonList.length)), j;
      do { j = floor(random(pokemonList.length)); } while (j === i);
      nextFrontPokemon = pokemonList[i];
      nextBackPokemon = pokemonList[j];
  }

  // Assign to actual battle data
  frontPokemonData = nextFrontPokemon;
  backPokemonData = nextBackPokemon;

  // Set names and HP for new Pokémon immediately when their data is known
  frontName = frontPokemonData.name;
  hpFront = 1;
  backName = backPokemonData.name;
  hpBack = 1;

  // Reset general battle state flags here to be ready for the new battle,
  // before any specific sprite loading/animation logic.
  battleActive = true;
  processingBattleEnd = false;
  currentTurn = floor(random(2));
  lastTurnTime = millis();
  isAnimatingAttack = false;
  attackingPokemon = null;
  hitAnimationTriggered = false;
  isAnimatingHit = false;
  defendingPokemon = null;
  battleEndedTimestamp = 0; // Reset timestamp for new battle


  // --- 2. Initiate Sprite Transitions and Loading ---

  // Handle Back Sprite Transition
  if (shouldBackAnimateExit) {
      backTransitionPhase = 'exiting';
      backTransitionStartTime = millis();

      // Schedule new back sprite to load and enter after exit animation
      setTimeout(() => {
          loadImage(`back/${backPokemonData.file}`, img => {
              backSprite = img;
              backTransitionPhase = 'entering';
              backTransitionStartTime = millis();
          }, () => console.warn(`⚠ back/${backPokemonData.file} failed`));
      }, BACK_TRANSITION_DURATION);
  } else { // Back Pokémon stays (winner or initial load where no old sprite exists yet)
      loadImage(`back/${backPokemonData.file}`, img => { // Load the staying sprite if not already loaded, or re-assign
          backSprite = img;
          backTransitionPhase = 'idle'; // It just stays in place (no enter animation)
      }, () => console.warn(`⚠ back/${backPokemonData.file} failed`));
  }

  // Handle Front Sprite Transition
  if (shouldFrontAnimateExit) {
      frontTransitionPhase = 'exiting';
      frontTransitionStartTime = millis();

      // Schedule new front sprite to load and enter after exit animation
      setTimeout(() => {
          loadImage(`front/${frontPokemonData.file}`, img => {
              frontSprite = img;
              frontTransitionPhase = 'entering';
              frontTransitionStartTime = millis();
          }, () => console.warn(`⚠ front/${frontPokemonData.file} failed`));
      }, FRONT_TRANSITION_DURATION);
  } else { // Front Pokémon stays (winner or initial load where no old sprite exists yet)
      loadImage(`front/${frontPokemonData.file}`, img => { // Load the staying sprite if not already loaded, or re-assign
          frontSprite = img;
          frontTransitionPhase = 'idle'; // It just stays in place (no enter animation)
      }, () => console.warn(`⚠ front/${frontPokemonData.file} failed`));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 10) takeTurn — simulate a battle turn
// ─────────────────────────────────────────────────────────────────────────────
function takeTurn() {
  // Defensive check: If battle is already over or ending, don't proceed with a new attack.
  if (!battleActive || processingBattleEnd) {
    return;
  }

  // Initiate attack animation
  isAnimatingAttack = true;
  attackAnimationStartTime = millis();
  hitAnimationTriggered = false; // Reset for this new attack

  let damageAmount = random(0.1, 0.3); // Damage between 10% and 30% of HP

  if (currentTurn === 0) { // Front Pokémon (opponent) attacks
    attackingPokemon = 'front'; // Set attacker for animation
    defendingPokemon = 'back';  // Set defender for hit animation
    hpBack -= damageAmount;
    hpBack = constrain(hpBack, 0, 1);
    console.log(`${frontName} attacked! ${backName} HP: ${nf(hpBack * 100, 0, 0)}%`);
  } else { // Back Pokémon (your Pokémon) attacks
    attackingPokemon = 'back'; // Set attacker for animation
    defendingPokemon = 'front'; // Set defender for hit animation
    hpFront -= damageAmount;
    hpFront = constrain(hpFront, 0, 1);
    console.log(`${backName} attacked! ${frontName} HP: ${nf(hpFront * 100, 0, 0)}%`);
  }

  // Check for battle end
  if (hpFront <= 0 || hpBack <= 0) {
    battleActive = false;
    processingBattleEnd = true; // Set flag to true immediately
    winnerDisplayTime = millis();
    battleEndedTimestamp = millis(); // Mark the time battle ended

    if (hpFront <= 0 && hpBack <= 0) {
      console.log("Both Pokémon fainted! New battle starts.");
      winner = null; // No clear winner if both faint
      lastWinnerPosition = null;
    } else if (hpFront <= 0) { // Front fainted, Back (your) Pokémon wins
      console.log(`${backName} wins!`);
      winner = backPokemonData;
      lastWinnerPosition = 'back';
      winnerHpFillStart = hpBack; // Store starting HP for animation
    } else { // Back fainted, Front (opponent) Pokémon wins
      console.log(`${frontName} wins!`);
      winner = frontPokemonData;
      lastWinnerPosition = 'front';
      winnerHpFillStart = hpFront; // Store starting HP for animation
    }

    // Schedule the loading of new Pokémon after a delay, now using startNewBattle
    setTimeout(startNewBattle, 3000);
    return; // Crucial: Stop further execution in this turn after battle end.
  } else {
    currentTurn = 1 - currentTurn; // Switch turns
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 11) MOUSE CLICKED — click on canvas to manually force a turn
// ─────────────────────────────────────────────────────────────────────────────

function mouseClicked() {
  // Only allow forced turn if battle is active and not processing battle end AND not just ended
  if (battleActive && !processingBattleEnd && millis() - battleEndedTimestamp > 50) {
    takeTurn();
    lastTurnTime = millis(); // Reset the timer so the next *timed* turn is 5 minutes from now
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 12) drawWinnerText — Displays the winning Pokémon's name
// ─────────────────────────────────────────────────────────────────────────────
function drawWinnerText() {
  if (!winner) return;

  textSize(15);
  textAlign(CENTER, CENTER);
  fill(0);
  text(`${winner.name} Wins!`, 80 * size_ratio, 103 * size_ratio);
}

// ─────────────────────────────────────────────────────────────────────────────
// 13) animateWinnerHp — Animates the winning Pokémon's HP bar
// ─────────────────────────────────────────────────────────────────────────────
function animateWinnerHp() {
    let elapsedTime = millis() - winnerDisplayTime;
    let fillPercentage = map(elapsedTime, 0, winnerDisplayDuration, winnerHpFillStart, 1);
    fillPercentage = constrain(fillPercentage, 0, 1);

    if (lastWinnerPosition === 'front') {
        hpFront = fillPercentage; // Update hpFront for drawing
    } else if (lastWinnerPosition === 'back') {
        hpBack = fillPercentage; // Update hpBack for drawing
    }
}