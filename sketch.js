// ─────────────────────────────────────────────────────────────────────────────
// 1) GLOBAL CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

// Canvas scale: 1 = 160×144, 2 = 320×288, etc.
let size_ratio    = 2;

// Auto‐swap every 30 minutes:
const swapInterval = 30 * 60 * 1000;

// Name‐box coordinates (in 160×144 space):
// ─ BACK name (your Pokémon), right‐aligned here:
const BACK_NAME_END_X = 144;
const BACK_NAME_Y     = 63;

// ─ FRONT name (opponent), left‐& right‐bounds here:
const FRONT_NAME_START_X = 14;
const FRONT_NAME_END_X   = 80;
const FRONT_NAME_Y       = 7;

// ─────────────────────────────────────────────────────────────────────────────
// 2) STATE & ASSETS
// ─────────────────────────────────────────────────────────────────────────────
let bg, gameboyFont;       // background image & pixel font
let pokemonList = [];      // filled from JSON in preload()

// Current battle info:
let frontSprite, backSprite;
let frontName, backName;
let hpFront,    hpBack;

// Swap timer:
let lastSwapTime = 0;

// ─────────────────────────────────────────────────────────────────────────────
// 3) PRELOAD — load BG, FONT, & JSON list
// ─────────────────────────────────────────────────────────────────────────────
function preload() {
  console.log('▶ preload() start');

  // 3.1) Background + font
  bg = loadImage('bg.png',    () => console.log('✅ bg.png loaded'));
  gameboyFont = loadFont(
    'PressStart2P-Regular.ttf',
    () => console.log('✅ font loaded'),
    () => console.warn('⚠ font failed to load')
  );

  // 3.2) Pokémon roster JSON
  //   - must be in same folder as sketch.js
  pokemonList = loadJSON(
    'pokemonList.json',
    () => console.log(`✅ roster loaded: ${pokemonList.length} entries`),
    err => {
      console.warn('❌ JSON load failed, using 3-entry fallback:', err);
      pokemonList = [
        { file:'bulbasaur.png', name:'BULBASAUR'   },
        { file:'charmander.png',name:'CHARMANDER'  },
        { file:'mew.png',       name:'MEW'         }
      ];
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) SETUP — canvas & initial Pokémon pick
// ─────────────────────────────────────────────────────────────────────────────
function setup() {
  pixelDensity(1);  // 1:1 pixel mapping
  createCanvas(160 * size_ratio, 144 * size_ratio);
  noSmooth();
  textFont(gameboyFont);

  // loadJSON sometimes returns object—coerce to array:
  if (!Array.isArray(pokemonList)) {
    pokemonList = Object.values(pokemonList);
  }

  loadRandomPokemon();
  lastSwapTime = millis();
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) DRAW LOOP — background, sprites, UI
// ─────────────────────────────────────────────────────────────────────────────
function draw() {
  background(0);

  // 5.1) Auto‐swap timer
  if (millis() - lastSwapTime > swapInterval) {
    loadRandomPokemon();
    lastSwapTime = millis();
  }

  // 5.2) Draw BG & sprites (in 160×144 coords, scaled up)
  image(bg, 0, 0, 160*size_ratio, 144*size_ratio);
  if (backSprite)  image(backSprite,  10*size_ratio, 43*size_ratio, 50*size_ratio, 50*size_ratio);
  if (frontSprite) image(frontSprite,111*size_ratio, 5*size_ratio, 40*size_ratio, 40*size_ratio);

  // 5.3) UI Overlays
  drawNames();
  drawHp();
  drawClock();
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) DRAW NAMES — trims & aligns both front/back names
// ─────────────────────────────────────────────────────────────────────────────
function drawNames() {
  textSize(6 * size_ratio);
  fill(0);
  noStroke();

  // FRONT name ─ left‐aligned, trimmed to fit box
  textAlign(LEFT, TOP);
  {
    let s    = frontName || '';
    const maxW = (FRONT_NAME_END_X - FRONT_NAME_START_X) * size_ratio;
    while (textWidth(s) > maxW && s.length) {
      s = s.slice(0, -1);
    }
    text(s, FRONT_NAME_START_X * size_ratio, FRONT_NAME_Y * size_ratio);
  }

  // BACK name ─ right‐aligned
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

function drawHpBar(x,y,w,h,pct) {
  pct = constrain(pct, 0, 1);
  noStroke(); fill(100);
  rect(x,y, pct*w, h, h);
  noFill(); stroke(0); strokeWeight(1);
  rect(x,y, w,    h, h);
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

  // y=120 to stay inside bottom border
  text(`${hrs}:${mins}`, 80*size_ratio, 120*size_ratio);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) loadRandomPokemon — pick & asynchronously load 2 sprites
// ─────────────────────────────────────────────────────────────────────────────
function loadRandomPokemon() {
  if (!pokemonList.length) return;

  let i = floor(random(pokemonList.length)),
      j;
  do { j = floor(random(pokemonList.length)); }
  while (j === i);

  const frontP = pokemonList[i],
        backP  = pokemonList[j];

  // stash values so we only swap on load completion
  const nextFrontName = frontP.name,
        nextBackName  = backP.name,
        nextHPFront   = random(0.3, 1),
        nextHPBack    = random(0.3, 1);

  // load enemy sprite
  loadImage(`front/${frontP.file}`,
    img => {
      frontSprite = img;
      frontName   = nextFrontName;
      hpFront     = nextHPFront;
    },
    () => console.warn(`⚠ front/${frontP.file} failed`)
  );

  // load your sprite
  loadImage(`back/${backP.file}`,
    img => {
      backSprite = img;
      backName   = nextBackName;
      hpBack     = nextHPBack;
    },
    () => console.warn(`⚠ back/${backP.file} failed`)
  );

  lastSwapTime = millis();
}

// ─────────────────────────────────────────────────────────────────────────────
// 10) KEYBOARD — spacebar to manually swap
// ─────────────────────────────────────────────────────────────────────────────
function keyPressed() {
  if (key === ' ') {
    loadRandomPokemon();
    lastSwapTime = millis();
  }
}
