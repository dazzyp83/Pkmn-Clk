// sketch.js

// ─────────────────────────────────────────────────────────────────────────────
// 1) GLOBAL CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

// Canvas dimensions: Match the Game Boy Color's native resolution.
// This is the logical resolution for all drawing. External hardware/drivers will scale this to the physical screen.
const CANVAS_WIDTH = 160;
const CANVAS_HEIGHT = 144;

// !!! DEVELOPMENT ZOOM FACTOR !!!
// Set this to a value > 1 for better visibility on a computer monitor during development.
// Set to 1 (or remove scaling in draw()) when deploying to actual Game Boy hardware,
// as the hardware drivers will handle the final scaling.
const DISPLAY_ZOOM_FACTOR = 3;

// Overlay transparency (0-255, where 255 is opaque)
const OVERLAY_ALPHA = 255; // Example: 50% transparency

// All coordinates and sizes below are now in raw 1x Game Boy logical pixel values.

// Name-box coordinates (1x Game Boy logical space):
const BACK_NAME_END_X    = 149;  // your Pokémon (back), right-aligned here
const BACK_NAME_Y        = 72;

const FRONT_NAME_START_X = 11;   // opponent (front), left-& right-bounds here
const FRONT_NAME_END_X   = 80;
const FRONT_NAME_Y       = 7;

// Sprite dimensions and base positions (1x Game Boy logical space):
// IMPORTANT: Your sprite image files must be pre-scaled to these exact pixel dimensions.
const BACK_SPRITE_W = 80;   // Player's Pokémon (original size)
const BACK_SPRITE_H = 80;
const BACK_SPRITE_BASE_X = 0;
const BACK_SPRITE_BASE_Y = 35;

const FRONT_SPRITE_W = 90;  // Opponent's Pokémon (original size)
const FRONT_SPRITE_H = 90;
const FRONT_SPRITE_BASE_X = 77;
const FRONT_SPRITE_BASE_Y = -15;

// HP Bar dimensions and positions (1x Game Boy logical space):
const HP_LABEL_TEXT_SIZE = 6; 

const FRONT_HP_LABEL_X = 40; // These coordinates are now effectively just for HP bar alignment
const FRONT_HP_LABEL_Y = 19;

const FRONT_HP_BAR_X = 30;
const FRONT_HP_BAR_Y = 17;

const BACK_HP_LABEL_X = 88; // These coordinates are now effectively just for HP bar alignment
const BACK_HP_LABEL_Y = 78;

const BACK_HP_BAR_X = 93;
const BACK_HP_BAR_Y = 83.5;

const HP_BAR_W = 50;
const HP_BAR_H = 5;
const HP_BAR_RADIUS = 2.5; // Half of HP_BAR_H for rounding

// Clock position and text size (1x Game Boy logical space):
const CLOCK_TEXT_SIZE = 24;
const CLOCK_X_POS = 82;    // Center of 160
const CLOCK_Y_POS = 117;

// Winner text position and size (1x Game Boy logical space):
const WINNER_TEXT_SIZE = 10;
const WINNER_TEXT_X = 82;
const WINNER_TEXT_Y = CLOCK_Y_POS - (WINNER_TEXT_SIZE / 2); // Adjusted for two lines
const WINNER_TEXT_LINE_HEIGHT = WINNER_TEXT_SIZE + 2; // Added a small gap between lines

// Winner text box dimensions (These constants are now only for reference/history, not used for drawing)
const WINNER_BOX_WIDTH = 100;
const WINNER_BOX_HEIGHT = 20;
const WINNER_BOX_X = (CANVAS_WIDTH / 2) - (WINNER_BOX_WIDTH / 2); // Center X
const WINNER_BOX_Y = WINNER_TEXT_Y - (WINNER_BOX_HEIGHT / 2) + 2; // Center Y around text, adjusted for baseline

// Day Screen Box (1x Game Boy logical space):
const DAY_BOX_WIDTH = 120;
const DAY_BOX_HEIGHT = 30;
const DAY_BOX_X = (160 - 120) / 2; // 20
const DAY_BOX_Y = ((144 - 30) / 2) - 10; // 57 - 10 = 47
const DAY_TEXT_SIZE_LABEL = 8;
const DAY_TEXT_SIZE_DAY = 14;

// Pokedex Screen (1x Game Boy logical space):
const POKEDEX_TITLE_TEXT_SIZE = 10;
const POKEDEX_TITLE_X = 80;
const POKEDEX_TITLE_Y = 20;
const POKEDEX_LOADING_TEXT_SIZE = 8;
const POKEDEX_LOADING_TEXT_X = 80;
const POKEDEX_LOADING_TEXT_Y = 72;
const POKEDEX_TEXT_SIZE = 8;
const POKEDEX_TEXT_WIDTH_LIMIT = 140;
const POKEDEX_TEXT_START_X = 10;
const POKEDEX_TEXT_START_Y = 40;


// ─────────────────────────────────────────────────────────────────────────────
// 2) STATE & ASSETS
// ─────────────────────────────────────────────────────────────────────────────

let bg; // Background image (must be 160x144 pixels)
let overlay; // Declare a variable for the overlay image
let pokemonList = [];      // loaded in preload()
let gameboyFont; // Variable to hold the loaded font

// Current battle info:
let frontSprite, backSprite;
let frontName, backName;
let hpFront,    hpBack;
let frontPokemonData, backPokemonData; // To store the full Pokémon objects

// Battle variables
let currentTurn    = 0;
const turnInterval = 5 * 60 * 1000;
let lastTurnTime   = 0;
let battleActive   = false;
let winner         = null;
let lastWinnerPosition = null;
let winnerDisplayTime = 0;
const winnerDisplayDuration = 2000;
let winnerHpFillStart = 0;
let processingBattleEnd = false;
let battleEndedTimestamp = 0;
let turnLock = false;

// Attack animation variables (offsets are now 1x logical pixels)
let isAnimatingAttack = false;
let attackAnimationStartTime = 0;
const attackAnimationDuration = 300;
const ATTACK_LUNGE_OFFSET = 10; // 10 pixels for the lunge
let attackingPokemon = null;
let hitAnimationTriggered = false;

// Hit animation variables
let isAnimatingHit = false;
let hitAnimationStartTime = 0;
const hitAnimationDuration = 400;
const flashInterval = 100;
let defendingPokemon = null;

// Front sprite transition variables (Y positions are now 1x logical pixels)
let frontCurrentY = FRONT_SPRITE_BASE_Y;
let frontTransitionPhase = 'idle';
let frontTransitionStartTime = 0;
const FRONT_TRANSITION_DURATION = 500;
const FRONT_SPRITE_OFFSCREEN_TOP_Y = 0 - FRONT_SPRITE_H - 10; // Off-screen upwards

// Back sprite transition variables (X positions are now 1x logical pixels)
let backCurrentX = BACK_SPRITE_BASE_X;
let backTransitionPhase = 'idle';
let backTransitionStartTime = 0;
const BACK_TRANSITION_DURATION = 500;
const BACK_SPRITE_OFFSCREEN_LEFT_X = 0 - BACK_SPRITE_W - 10; // Off-screen to the left

// Screen Management
let currentScreen = 'battle';

// Pokedex Screen Variables
let pokedexEntryText = "Loading Pokedex Entry...";
let isLoadingPokedex = false;
let pokedexEntryLoadedTime = 0;
const POKEDEX_DISPLAY_DURATION = 5000;

// Flag to control clock visibility
let showTime = true;

// NEW: Winner text flashing variables
let isFlashingWinnerText = false;
const winnerFlashInterval = 300; // Increased to 300 milliseconds for slower flash (on/off)

// ─────────────────────────────────────────────────────────────────────────────
// 3) PRELOAD — load BG, FONT, & JSON roster
// ─────────────────────────────────────────────────────────────────────────────

function preload() {
  // 3.1) background (must be 160x144 pixels)
  bg = loadImage('bg.png');

  // 3.2) Load the custom Game Boy font
  // Ensure 'pokemon-gsc-font.ttf' is in the same directory as sketch.js
  gameboyFont = loadFont('pokemon-gsc-font.ttf'); 

  // 3.3) synchronous JSON load (blocks until parsed)
  pokemonList = loadJSON('pokemonList.json');

  // 3.4) Load the overlay image
  overlay = loadImage('overlay.png');
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) SETUP — canvas & initial Pokémon pick
// ─────────────────────────────────────────────────────────────────────────────

function setup() {
  pixelDensity(1);
  // Create canvas with temporary zoom for development visibility
  createCanvas(CANVAS_WIDTH * DISPLAY_ZOOM_FACTOR, CANVAS_HEIGHT * DISPLAY_ZOOM_FACTOR);
  noSmooth();
  textFont(gameboyFont); // Apply the loaded font here
  textAlign(CENTER, CENTER);
  blendMode(BLEND); // Set blend mode once in setup for transparent images

  if (!Array.isArray(pokemonList)) {
    pokemonList = Object.values(pokemonList);
  }

  startNewBattle();
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) DRAW LOOP — dispatches to current screen
// ─────────────────────────────────────────────────────────────────────────────

function draw() {
  background(0); // This fills the entire canvas with black

  push(); // Save current transformation state
  scale(DISPLAY_ZOOM_FACTOR); // Apply temporary zoom for development visibility

  switch (currentScreen) {
    case 'battle':
      drawBattleScreen();
      break;
    case 'day':
      drawDayScreen();
      break;
    case 'pokedex':
      drawPokedexScreen();
      break;
  }

  // Draw the overlay with transparency
  tint(255, OVERLAY_ALPHA); // Apply transparency
  image(overlay, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // Draw the overlay
  noTint(); // Reset tint so it doesn't affect subsequent drawings

  pop(); // Restore original transformation state
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.1) drawBattleScreen — renders the main battle UI and animations
// ─────────────────────────────────────────────────────────────────────────────
function drawBattleScreen() {
  // The bg.png is now the full 160x144 Game Boy "screen"
  image(bg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // Draw background image (must be 160x144 pixels)

  // Calculate current sprite X/Y positions, applying attack animation offset if active
  let currentFrontSpriteDrawX = FRONT_SPRITE_BASE_X;
  let currentBackSpriteDrawX = BACK_SPRITE_BASE_X;

  if (isAnimatingAttack) {
      let elapsedTime = millis() - attackAnimationStartTime;
      if (elapsedTime < attackAnimationDuration) {
          let progress = elapsedTime / attackAnimationDuration;
          let offset = sin(progress * PI) * ATTACK_LUNGE_OFFSET;

          if (attackingPokemon === 'front') {
              currentFrontSpriteDrawX -= offset;
          } else if (attackingPokemon === 'back') {
              currentBackSpriteDrawX += offset;
          }

          if (!hitAnimationTriggered && progress >= 0.4 && progress <= 0.6 ) {
               isAnimatingHit = true;
               hitAnimationStartTime = millis();
               hitAnimationTriggered = true;
          }
      } else {
          isAnimatingAttack = false;
          attackingPokemon = null;
          hitAnimationTriggered = false;
      }
  }

  // Front sprite slide animation logic
  if (frontTransitionPhase === 'exiting') {
      let elapsedTime = millis() - frontTransitionStartTime;
      if (elapsedTime < FRONT_TRANSITION_DURATION) {
          let progress = elapsedTime / FRONT_TRANSITION_DURATION;
          frontCurrentY = map(progress, 0, 1, FRONT_SPRITE_BASE_Y, FRONT_SPRITE_OFFSCREEN_TOP_Y);
      } else {
          frontCurrentY = FRONT_SPRITE_OFFSCREEN_TOP_Y;
      }
  } else if (frontTransitionPhase === 'entering') {
      let elapsedTime = millis() - frontTransitionStartTime;
      if (elapsedTime < FRONT_TRANSITION_DURATION) {
          let progress = elapsedTime / FRONT_TRANSITION_DURATION;
          frontCurrentY = map(progress, 0, 1, FRONT_SPRITE_OFFSCREEN_TOP_Y, FRONT_SPRITE_BASE_Y);
      } else {
          frontCurrentY = FRONT_SPRITE_BASE_Y;
          frontTransitionPhase = 'idle';
      }
  } else {
      frontCurrentY = FRONT_SPRITE_BASE_Y;
  }

    // Back sprite slide animation logic
    if (backTransitionPhase === 'exiting') {
        let elapsedTime = millis() - backTransitionStartTime;
        if (elapsedTime < BACK_TRANSITION_DURATION) {
            let progress = elapsedTime / BACK_TRANSITION_DURATION;
            backCurrentX = map(progress, 0, 1, BACK_SPRITE_BASE_X, BACK_SPRITE_OFFSCREEN_LEFT_X);
        } else {
            backCurrentX = BACK_SPRITE_OFFSCREEN_LEFT_X;
        }
    } else if (backTransitionPhase === 'entering') {
        let elapsedTime = millis() - backTransitionStartTime;
        if (elapsedTime < BACK_TRANSITION_DURATION) {
            let progress = elapsedTime / BACK_TRANSITION_DURATION;
            backCurrentX = map(progress, 0, 1, BACK_SPRITE_OFFSCREEN_LEFT_X, BACK_SPRITE_BASE_X);
        } else {
            backCurrentX = BACK_SPRITE_BASE_X;
            backTransitionPhase = 'idle';
        }
    } else {
        backCurrentX = BACK_SPRITE_BASE_X;
    }

  // Determine if defending sprite should be drawn based on hit animation
  let drawFrontSprite = true;
  let drawBackSprite = true;

  if (isAnimatingHit) {
      let elapsedTime = millis() - hitAnimationStartTime;
      if (elapsedTime < hitAnimationDuration) {
          let flashCycleTime = elapsedTime % (2 * flashInterval);
          if (flashCycleTime >= flashInterval) {
              if (defendingPokemon === 'front') {
                  drawFrontSprite = false;
              } else if (defendingPokemon === 'back') {
                  drawBackSprite = false;
              }
          }
      } else {
          isAnimatingHit = false;
          defendingPokemon = null;
      }
  }

  // Set blend mode to ensure transparency (just before drawing sprites)
  blendMode(BLEND);

  // Draw sprites using their now absolute pixel positions and dimensions
  if (backSprite && backCurrentX > (BACK_SPRITE_OFFSCREEN_LEFT_X - BACK_SPRITE_W) && drawBackSprite) {
    image(backSprite,  backCurrentX + (currentBackSpriteDrawX - BACK_SPRITE_BASE_X), BACK_SPRITE_BASE_Y, BACK_SPRITE_W, BACK_SPRITE_H);
  }
  if (frontSprite && frontCurrentY > (FRONT_SPRITE_OFFSCREEN_TOP_Y - FRONT_SPRITE_H) && drawFrontSprite) {
    image(frontSprite, currentFrontSpriteDrawX, frontCurrentY, FRONT_SPRITE_W, FRONT_SPRITE_H);
  }

  // UI overlays
  drawNames();
  drawHp();
  
  // Conditionally draw the clock based on showTime flag
  if (showTime) {
    drawClock();
  }

  // Winner display logic
  if (winner && millis() - winnerDisplayTime < winnerDisplayDuration) {
    // Check if the current time is within the display duration
    let elapsedTime = millis() - winnerDisplayTime;
    let flashOn = (elapsedTime % (2 * winnerFlashInterval)) < winnerFlashInterval;

    if (flashOn) { // Only draw if flash is "on"
      drawWinnerText();
    }
    
    animateWinnerHp();
    showTime = false; // Hide time during winner display
  } else {
    showTime = true; // Show time otherwise
  }


  // Battle logic: Only allow takeTurn if battle is active AND not currently processing battle end
  if (battleActive && !processingBattleEnd && !turnLock && millis() - lastTurnTime > turnInterval && millis() - battleEndedTimestamp > 50) {
    takeTurn();
    lastTurnTime = millis();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.2) drawDayScreen — renders the day of the week UI
// ─────────────────────────────────────────────────────────────────────────────
function drawDayScreen() {
    // Background is now part of the 160x144 canvas.
    image(bg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // Draw background image (must be 160x144 pixels)

    // --- Draw the central "Day" display box ---
    noFill();
    stroke(0);
    strokeWeight(2);
    rect(DAY_BOX_X, DAY_BOX_Y, DAY_BOX_WIDTH, DAY_BOX_HEIGHT, HP_BAR_RADIUS);

    fill(0);
    noStroke();

    textSize(DAY_TEXT_SIZE_LABEL);
    text("DAY:", DAY_BOX_X + DAY_BOX_WIDTH / 2, DAY_BOX_Y + (DAY_TEXT_SIZE_LABEL / 2) + 2);

    textSize(DAY_TEXT_SIZE_DAY);
    let currentDayIndex = new Date().getDay();
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    text(days[currentDayIndex], DAY_BOX_X + DAY_BOX_WIDTH / 2, DAY_BOX_Y + DAY_BOX_HEIGHT - (DAY_TEXT_SIZE_DAY / 2) - 2);

    if (showTime) { // Conditionally draw clock
      drawClock();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.3) drawPokedexScreen — renders the Pokedex entry UI
// ─────────────────────────────────────────────────────────────────────────────
function drawPokedexScreen() {
    // Background is now part of the 160x144 canvas.
    image(bg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // Draw background image (must be 160x144 pixels)

    fill(0);
    noStroke();
    textAlign(CENTER, CENTER);

    textSize(POKEDEX_TITLE_TEXT_SIZE);
    text("POKEDEX ENTRY", POKEDEX_TITLE_X, POKEDEX_TITLE_Y);

    if (isLoadingPokedex) {
        textSize(POKEDEX_LOADING_TEXT_SIZE);
        text("LOADING...", POKEDEX_LOADING_TEXT_X, POKEDEX_LOADING_TEXT_Y);
    } else {
        textAlign(LEFT, TOP);
        textSize(POKEDEX_TEXT_SIZE);

        let words = pokedexEntryText.split(' ');
        let currentLine = '';
        let y = POKEDEX_TEXT_START_Y;

        for (let i = 0; i < words.length; i++) {
            let testLine = currentLine + words[i] + ' ';
            if (textWidth(testLine) < POKEDEX_TEXT_WIDTH_LIMIT) {
                currentLine = testLine;
            } else {
                text(currentLine, POKEDEX_TEXT_START_X, y);
                currentLine = words[i] + ' ';
                y += textSize() + 4;
            }
        }
        text(currentLine, POKEDEX_TEXT_START_X, y);

        if (millis() - pokedexEntryLoadedTime > POKEDEX_DISPLAY_DURATION) {
            currentScreen = 'battle';
            pokedexEntryText = "Loading Pokedex Entry...";
        }
    }
    if (showTime) { // Conditionally draw clock
      drawClock();
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// 6) DRAW NAMES — trims & aligns both front/back names
// ─────────────────────────────────────────────────────────────────────────────

function drawNames() {
  textSize(HP_LABEL_TEXT_SIZE);
  fill(0);
  noStroke();

  textAlign(LEFT, TOP);
  {
    let s    = frontName || '';
    const maxW = (FRONT_NAME_END_X - FRONT_NAME_START_X);
    while (textWidth(s) > maxW && s.length) {
      s = s.slice(0, -1);
    }
    text(s, FRONT_NAME_START_X, FRONT_NAME_Y);
  }

  textAlign(RIGHT, TOP);
  text(backName || '', BACK_NAME_END_X, BACK_NAME_Y);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) DRAW HP — labels + pill bars
// ─────────────────────────────────────────────────────────────────────────────

function drawHp() {
  drawHpBar(FRONT_HP_BAR_X, FRONT_HP_BAR_Y, HP_BAR_W, HP_BAR_H, hpFront);
  drawHpBar(BACK_HP_BAR_X, BACK_HP_BAR_Y, HP_BAR_W, HP_BAR_H, hpBack);
}

function drawHpBar(x, y, w, h, pct) {
  pct = constrain(pct, 0, 1);
  noStroke(); fill(100);
  rect(x, y, pct * w, h, HP_BAR_RADIUS);
  noFill(); stroke(0); strokeWeight(1);
  rect(x, y, w,    h, HP_BAR_RADIUS);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) DRAW CLOCK — centered, large time display
// ─────────────────────────────────────────────────────────────────────────────

function drawClock() {
  textSize(CLOCK_TEXT_SIZE);
  textAlign(CENTER, CENTER);
  fill(0);

  const hrs  = nf(hour(),   2),
        mins = nf(minute(), 2);

  text(`${hrs}:${mins}`, CLOCK_X_POS, CLOCK_Y_POS);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) startNewBattle — handles pokemon selection & transition
// ─────────────────────────────────────────────────────────────────────────────

function getNextFrontPokemonData() {
    let newFrontP;
    if (winner && lastWinnerPosition === 'front') {
        newFrontP = winner;
    } else {
        let i;
        do { i = floor(random(pokemonList.length)); }
        while ((backPokemonData && pokemonList[i].name === backPokemonData.name) || (winner && lastWinnerPosition === 'back' && pokemonList[i].name === winner.name));
        newFrontP = pokemonList[i];
    }
    return newFrontP;
}

function getNextBackPokemonData() {
    let newBackP;
    if (winner && lastWinnerPosition === 'back') {
        newBackP = winner;
    } else {
        let j;
        do { j = floor(random(pokemonList.length)); }
        while ((frontPokemonData && pokemonList[j].name === frontPokemonData.name) || (winner && lastWinnerPosition === 'front' && pokemonList[j].name === winner.name));
        newBackP = pokemonList[j];
    }
    return newBackP;
}

function startNewBattle() {
  if (pokemonList.length === 0) return;

  let nextFrontPokemon, nextBackPokemon;
  let shouldFrontAnimateExit = false;
  let shouldBackAnimateExit = false;

  if (winner) {
      if (lastWinnerPosition === 'front') {
          nextFrontPokemon = winner;
          shouldBackAnimateExit = true;
          let newBackPIndex;
          do { newBackPIndex = floor(random(pokemonList.length)); }
          while (pokemonList[newBackPIndex].name === nextFrontPokemon.name);
          nextBackPokemon = pokemonList[newBackPIndex];
      } else {
          nextBackPokemon = winner;
          shouldFrontAnimateExit = true;
          let newFrontPIndex;
          do { newFrontPIndex = floor(random(pokemonList.length)); }
          while (pokemonList[newFrontPIndex].name === nextBackPokemon.name);
          nextFrontPokemon = pokemonList[newFrontPIndex];
      }
      winner = null;
      lastWinnerPosition = null;
  } else {
      shouldFrontAnimateExit = true;
      shouldBackAnimateExit = true;
      let i = floor(random(pokemonList.length)), j;
      do { j = floor(random(pokemonList.length)); } while (j === i);
      nextFrontPokemon = pokemonList[i];
      nextBackPokemon = pokemonList[j];
  }

  frontPokemonData = nextFrontPokemon;
  backPokemonData = nextBackPokemon;

  frontName = frontPokemonData.name;
  hpFront = 1;
  backName = backPokemonData.name;
  hpBack = 1;

  battleActive = true;
  processingBattleEnd = false;
  currentTurn = floor(random(2));
  lastTurnTime = millis();
  isAnimatingAttack = false;
  attackingPokemon = null;
  hitAnimationTriggered = false;
  isAnimatingHit = false;
  defendingPokemon = null;
  battleEndedTimestamp = 0;
  turnLock = false;

  // Handle Back Sprite Transition
  if (shouldBackAnimateExit) {
      backTransitionPhase = 'exiting';
      backTransitionStartTime = millis();
      setTimeout(() => {
          // Sprite image file must be 50x50px
          loadImage(`back/${backPokemonData.file}`, img => {
              backSprite = img;
              backTransitionPhase = 'entering';
              backTransitionStartTime = millis();
          }, () => console.warn(`⚠ back/${backPokemonData.file} failed`));
      }, BACK_TRANSITION_DURATION);
  } else {
      // Sprite image file must be 50x50px
      loadImage(`back/${backPokemonData.file}`, img => {
          backSprite = img;
          backTransitionPhase = 'idle';
      }, () => console.warn(`⚠ back/${backPokemonData.file} failed`));
  }

  // Handle Front Sprite Transition
  if (shouldFrontAnimateExit) {
      frontTransitionPhase = 'exiting';
      frontTransitionStartTime = millis();
      setTimeout(() => {
          // Sprite image file must be 40x40px
          loadImage(`front/${frontPokemonData.file}`, img => {
              frontSprite = img;
              frontTransitionPhase = 'entering';
              frontTransitionStartTime = millis();
          }, () => console.warn(`⚠ front/${pokemonData.file} failed`));
      }, FRONT_TRANSITION_DURATION);
  } else {
      // Sprite image file must be 40x40px
      loadImage(`front/${frontPokemonData.file}`, img => {
          frontSprite = img;
          frontTransitionPhase = 'idle';
      }, () => console.warn(`⚠ front/${frontPokemonData.file} failed`));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 10) takeTurn — simulate a battle turn
// ─────────────────────────────────────────────────────────────────────────────
function takeTurn() {
  if (turnLock) {
    console.log("Turn locked, preventing re-entry.");
    return;
  }
  turnLock = true;

  if (!battleActive || processingBattleEnd) {
    turnLock = false;
    return;
  }

  isAnimatingAttack = true;
  attackAnimationStartTime = millis();
  hitAnimationTriggered = false;

  let damageAmount = random(0.1, 0.3);

  if (currentTurn === 0) {
    attackingPokemon = 'front';
    defendingPokemon = 'back';
    hpBack -= damageAmount;
    hpBack = constrain(hpBack, 0, 1);
    console.log(`${frontName} attacked! ${backName} HP: ${nf(hpBack * 100, 0, 0)}%`);
  } else {
    attackingPokemon = 'back';
    defendingPokemon = 'front';
    hpFront -= damageAmount;
    hpFront = constrain(hpFront, 0, 1);
    console.log(`${backName} attacked! ${frontName} HP: ${nf(hpFront * 100, 0, 0)}%`);
  }

  if (hpFront <= 0 || hpBack <= 0) {
    battleActive = false;
    processingBattleEnd = true;
    winnerDisplayTime = millis();
    battleEndedTimestamp = millis();

    // Start winner text flashing
    isFlashingWinnerText = true; 

    if (hpFront <= 0 && hpBack <= 0) {
      console.log("Both Pokémon fainted! New battle starts.");
      winner = null;
      lastWinnerPosition = null;
    } else if (hpFront <= 0) {
      console.log(`${backName} wins!`);
      winner = backPokemonData;
      lastWinnerPosition = 'back';
      winnerHpFillStart = hpBack;
    } else {
      console.log(`${frontName} wins!`);
      winner = frontPokemonData;
      lastWinnerPosition = 'front';
      winnerHpFillStart = hpFront;
    }

    setTimeout(startNewBattle, 3000);
    return;
  } else {
    currentTurn = 1 - currentTurn;
    turnLock = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 11) MOUSE CLICKED — cycles through screens, or forces turn on battle screen
// ─────────────────────────────────────────────────────────────────────────────

function mouseClicked() {
  if (currentScreen === 'battle') {
    if (battleActive && !processingBattleEnd && !turnLock && millis() - battleEndedTimestamp > 50) {
      takeTurn();
      lastTurnTime = millis();
    }
  } else if (currentScreen === 'day') {
    currentScreen = 'pokedex';
    fetchPokedexEntry(frontPokemonData.name);
  } else if (currentScreen === 'pokedex') {
    currentScreen = 'battle';
    pokedexEntryText = "Loading Pokedex Entry...";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 12) drawWinnerText — Displays the winning Pokémon's name
// ─────────────────────────────────────────────────────────────────────────────
function drawWinnerText() {
  if (!winner) return;

  // Only draw text if isFlashingWinnerText is true AND the current flash cycle is "on"
  let flashOn = (millis() - winnerDisplayTime) % (2 * winnerFlashInterval) < winnerFlashInterval;
  if (!isFlashingWinnerText || !flashOn) { // If not flashing, or if it's the "off" phase, return
      return;
  }

  textSize(WINNER_TEXT_SIZE);
  textAlign(CENTER, CENTER);
  fill(0); // Black text
  noStroke(); // No stroke for text itself

  // Split winner text over two lines, all caps
  text(winner.name.toUpperCase(), WINNER_TEXT_X, WINNER_TEXT_Y);
  text("WINS!", WINNER_TEXT_X, WINNER_TEXT_Y + WINNER_TEXT_LINE_HEIGHT);
}

// ─────────────────────────────────────────────────────────────────────────────
// 13) animateWinnerHp — Animates the winning Pokémon's HP bar
// ─────────────────────────────────────────────────────────────────────────────
function animateWinnerHp() {
    let elapsedTime = millis() - winnerDisplayTime;
    let fillPercentage = map(elapsedTime, 0, winnerDisplayDuration, winnerHpFillStart, 1);
    fillPercentage = constrain(fillPercentage, 0, 1);

    if (lastWinnerPosition === 'front') {
        hpFront = fillPercentage;
    } else if (lastWinnerPosition === 'back') {
        hpBack = fillPercentage;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 14) fetchPokedexEntry — Calls Gemini API for Pokedex entry
// ─────────────────────────────────────────────────────────────────────────────
async function fetchPokedexEntry(pokemonName) {
    isLoadingPokedex = true;
    pokedexEntryText = "LOADING...";

    const prompt = `Give a very brief, 1-sentence Pokedex entry for ${pokemonName}, similar to what would be found in a Gen 1 Pokémon game. Focus on a key characteristic.`;
    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    const payload = { contents: chatHistory };
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            pokedexEntryText = result.candidates[0].content.parts[0].text;
        } else {
            pokedexEntryText = "ERROR: Could not fetch entry.";
            console.error("Gemini API response structure unexpected:", result);
        }
    } catch (error) {
        pokedexEntryText = "ERROR: Network or API issue.";
        console.error("Error fetching Pokedex entry:", error);
    } finally {
        isLoadingPokedex = false;
        pokedexEntryLoadedTime = millis();
    }
}