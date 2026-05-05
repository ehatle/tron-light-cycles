// ================================================================
//  CONSTANTS
//  These numbers control the size and speed of the game.
//  Changing TICK_MS makes the game faster (lower) or slower (higher).
// ================================================================

const CANVAS_PX    = 600;              // canvas width & height in pixels
const GRID_CELLS   = 60;              // number of cells per row/column
const CELL_PX      = CANVAS_PX / GRID_CELLS;  // pixels per cell = 10
const TICK_MS      = 100;             // milliseconds between game steps (100 = 10 steps/sec)
const TICKS_PER_S  = 1000 / TICK_MS; // how many ticks equal one second = 10
const GAME_SECS    = 10 * 60;        // time limit: 10 minutes in seconds
const KILL_WINDOW  = 10;             // only the last N trail cells count for kill credit
const DEATH_PENALTY = 10;            // points deducted when a racer dies

// ================================================================
//  DIRECTIONS
//  Each direction is a (dx, dy) pair:
//    dx = horizontal change per step (+1 = right, -1 = left)
//    dy = vertical change per step   (+1 = down,  -1 = up)
// ================================================================

const DIR = {
  UP:    { dx:  0, dy: -1 },
  DOWN:  { dx:  0, dy:  1 },
  LEFT:  { dx: -1, dy:  0 },
  RIGHT: { dx:  1, dy:  0 },
};

// ================================================================
//  RACER DEFINITIONS
//  One entry per racer. Starting positions are halfway between the
//  arena centre (cell 30,30) and each wall.
//  Each racer faces outward — away from the centre — at start.
// ================================================================

const RACER_DEFS = [
  {
    name:     'PLAYER',
    color:    '#00aaff',       // neon blue
    startX:   15,              // halfway between centre (30) and left wall (0)
    startY:   30,
    startDir: DIR.RIGHT,       // faces inward → toward centre
    isPlayer: true,
    aiType:   null,
  },
  {
    name:     'RECKLESS',
    color:    '#ff2200',       // neon red — aggressive
    startX:   45,              // halfway between centre (30) and right wall (60)
    startY:   30,
    startDir: DIR.LEFT,        // faces inward → toward centre
    isPlayer: false,
    aiType:   'reckless',
  },
  {
    name:     'SURVIVOR',
    color:    '#00ff55',       // neon green — cautious
    startX:   30,
    startY:   15,              // halfway between centre (30) and top wall (0)
    startDir: DIR.DOWN,        // faces inward → toward centre
    isPlayer: false,
    aiType:   'survivor',
  },
  {
    name:     'BALANCED',
    color:    '#ffee00',       // neon yellow — middle ground
    startX:   30,
    startY:   45,              // halfway between centre (30) and bottom wall (60)
    startDir: DIR.UP,          // faces inward → toward centre
    isPlayer: false,
    aiType:   'balanced',
  },
];

// ================================================================
//  GAME STATE
//  These variables are reset every time a new game starts.
// ================================================================

let canvas, ctx;         // the HTML <canvas> element and its 2D drawing context
let grid;                // 2D array [row][col]: -1 = empty, 0-3 = owned by that racer
let racers;              // array of racer objects (built fresh each game)
let playerNextDir;       // direction buffered from player 1's last arrow key press
let player2NextDir;      // direction buffered from player 2's last WASD key press
let player2Joined;       // true once player 2 has pressed a WASD key and taken over the Balanced AI
let gameInterval;        // reference to the setInterval timer so we can stop it
let tickCount;           // number of game steps taken so far
let gameRunning;         // true while a game is in progress

// ================================================================
//  INITIALISE — runs once when the page finishes loading
// ================================================================

window.onload = function () {
  canvas = document.getElementById('gameCanvas');
  ctx    = canvas.getContext('2d');   // '2d' gives access to drawing functions

  // Listen for arrow key presses anywhere on the page
  document.addEventListener('keydown', function (e) {
    switch (e.key) {
      // ---- Player 1: arrow keys ----
      case 'ArrowUp':    playerNextDir = DIR.UP;    e.preventDefault(); break;
      case 'ArrowDown':  playerNextDir = DIR.DOWN;  e.preventDefault(); break;
      case 'ArrowLeft':  playerNextDir = DIR.LEFT;  e.preventDefault(); break;
      case 'ArrowRight': playerNextDir = DIR.RIGHT; e.preventDefault(); break;

      // ---- Player 2: WASD ----
      // The first WASD press also "joins" player 2, converting the Balanced AI into a human racer
      case 'w': case 'W': joinAndBuffer(DIR.UP);    e.preventDefault(); break;
      case 'a': case 'A': joinAndBuffer(DIR.LEFT);  e.preventDefault(); break;
      case 's': case 'S': joinAndBuffer(DIR.DOWN);  e.preventDefault(); break;
      case 'd': case 'D': joinAndBuffer(DIR.RIGHT); e.preventDefault(); break;

      case 'Enter': startGame(); e.preventDefault(); break;
    }
  });

  document.getElementById('restartBtn').addEventListener('click', startGame);

  buildScorePanel();   // create the four score cards in the HTML
  startGame();         // begin the first game immediately
};

// ================================================================
//  BUILD SCORE PANEL
//  Creates one coloured score card per racer below the canvas.
// ================================================================

function buildScorePanel() {
  const panel = document.getElementById('scorePanel');
  panel.innerHTML = '';

  RACER_DEFS.forEach(function (def, i) {
    const card        = document.createElement('div');
    card.className    = 'score-card';
    card.id           = 'card-' + i;
    card.style.color  = def.color;
    card.style.textShadow = '0 0 6px ' + def.color;

    // Show "(YOU)" next to the player's label so it's obvious
    const label = def.isPlayer ? def.name + ' (YOU)' : def.name;

    card.innerHTML =
      '<div class="score-label">' + label + '</div>' +
      '<div class="score-number" id="score-' + i + '">0</div>';

    panel.appendChild(card);
  });
}

// ================================================================
//  JOIN AND BUFFER (player 2)
//  Called on every WASD key press. If player 2 hasn't joined yet,
//  converts the Balanced AI (racer index 3) into a human-controlled
//  racer. Always buffers the direction for the next tick.
// ================================================================

function joinAndBuffer(dir) {
  if (!gameRunning) return;

  if (!player2Joined) {
    const balanced = racers[3];   // index 3 is always the Balanced AI

    // Only take over if that racer is still alive
    if (balanced && balanced.alive) {
      player2Joined      = true;
      balanced.isPlayer  = true;   // treated as human from now on
      balanced.aiType    = null;   // stop running AI logic for this racer
    }
  }

  player2NextDir = dir;   // buffer the direction regardless
}

// ================================================================
//  START GAME
//  Resets everything and launches a fresh round.
// ================================================================

function startGame() {
  document.getElementById('overlay').style.display = 'none';

  // Reset counters and player 2 join state
  tickCount      = 0;
  gameRunning    = true;
  playerNextDir  = null;
  player2NextDir = null;
  player2Joined  = false;   // Balanced AI is back in control at the start of each game

  // Build a fresh 60×60 grid — every cell starts empty (-1)
  grid = [];
  for (let row = 0; row < GRID_CELLS; row++) {
    grid[row] = new Array(GRID_CELLS).fill(-1);
  }

  // Create racer objects from the definitions
  racers = RACER_DEFS.map(function (def, i) {
    return {
      index:       i,
      name:        def.name,
      color:       def.color,
      x:           def.startX,
      y:           def.startY,
      dir:         { dx: def.startDir.dx, dy: def.startDir.dy },  // copy, not reference
      isPlayer:    def.isPlayer,
      aiType:      def.aiType,
      alive:       true,
      score:       0,
      recentTrail: [],   // stores the last KILL_WINDOW cell positions this racer placed
    };
  });

  // Mark each racer's starting cell as occupied in the grid,
  // and add it as the first entry in their recent trail
  racers.forEach(function (r) {
    grid[r.y][r.x] = r.index;
    r.recentTrail.push({ x: r.x, y: r.y });
  });

  // Reset the score display
  racers.forEach(function (r, i) {
    document.getElementById('score-' + i).textContent = '0';
    document.getElementById('card-'  + i).classList.remove('dead');
  });

  document.getElementById('timer').textContent = 'TIME LEFT: 10:00';

  // Stop any previous game loop and start a fresh one
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(gameTick, TICK_MS);
}

// ================================================================
//  HELPERS
// ================================================================

// Returns true if direction A is the exact opposite of direction B.
// (e.g. LEFT↔RIGHT, UP↔DOWN)
// We use this to stop a racer from doing a 180° U-turn into their own trail.
function isOpposite(a, b) {
  return a.dx === -b.dx && a.dy === -b.dy;
}

// Builds a Set of "x,y" strings representing where every OTHER alive racer
// is projected to step next tick (based on their current direction).
// AIs use this to treat those cells as already blocked when picking a move.
function getProjectedPositions(excludeIndex) {
  const projected = new Set();
  racers.forEach(function (r, i) {
    if (!r.alive || i === excludeIndex) return;
    projected.add((r.x + r.dir.dx) + ',' + (r.y + r.dir.dy));
  });
  return projected;
}

// Returns an array of directions that are safe to move from (x, y):
//   — not a U-turn
//   — stays inside the grid
//   — target cell is empty in the grid (no existing trail)
//   — target cell is not where another racer is projected to step next tick
function getSafeDirs(x, y, currentDir, projected) {
  return Object.values(DIR).filter(function (dir) {
    if (isOpposite(dir, currentDir)) return false;   // no U-turns
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    if (nx < 0 || nx >= GRID_CELLS || ny < 0 || ny >= GRID_CELLS) return false;
    if (grid[ny][nx] !== -1) return false;           // trail already here
    if (projected && projected.has(nx + ',' + ny)) return false;  // racer heading here
    return true;
  });
}

// Counts how many empty cells are reachable from (startX, startY) using BFS.
// A high number means lots of open space; a low number means the racer is
// heading into a dead end. AIs use this to pick the most spacious direction.
function floodFill(startX, startY) {
  const visited = {};   // key = "x,y" string, prevents visiting the same cell twice
  const queue   = [[startX, startY]];
  let   count   = 0;

  while (queue.length > 0) {
    const [x, y] = queue.shift();
    const key    = x + ',' + y;

    if (visited[key]) continue;
    if (x < 0 || x >= GRID_CELLS || y < 0 || y >= GRID_CELLS) continue;
    if (grid[y][x] !== -1) continue;   // occupied — stop expanding here

    visited[key] = true;
    count++;

    // Check all four neighbours
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return count;
}

// ================================================================
//  AI — RECKLESS (red)
//  Aggressively chases the player. Cares very little about survival.
//  Picks the direction that closes the distance to the player fastest.
// ================================================================

function recklessAI(racer) {
  const projected = getProjectedPositions(racer.index);
  const safe = getSafeDirs(racer.x, racer.y, racer.dir, projected);
  if (safe.length === 0) return racer.dir;   // nowhere to go — keep heading into the wall

  const player = racers[0];   // index 0 is always the human player
  let bestDir   = safe[0];
  let bestScore = -Infinity;

  safe.forEach(function (dir) {
    const nx    = racer.x + dir.dx;
    const ny    = racer.y + dir.dy;
    const dist  = Math.abs(nx - player.x) + Math.abs(ny - player.y); // Manhattan distance to player
    const space = floodFill(nx, ny);

    // Heavily weight closing in on the player (negative distance = closer is better).
    // Add a tiny survival bonus so it doesn't suicide immediately.
    const score = -dist * 3 + space * 0.3;

    if (score > bestScore) { bestScore = score; bestDir = dir; }
  });

  return bestDir;
}

// ================================================================
//  AI — SURVIVOR (green)
//  Plays it safe. Always moves toward the largest open area.
//  Ignores other racers — just tries to stay alive as long as possible.
// ================================================================

function survivorAI(racer) {
  const projected = getProjectedPositions(racer.index);
  const safe = getSafeDirs(racer.x, racer.y, racer.dir, projected);
  if (safe.length === 0) return racer.dir;

  let bestDir   = safe[0];
  let bestSpace = -1;

  safe.forEach(function (dir) {
    const nx    = racer.x + dir.dx;
    const ny    = racer.y + dir.dy;
    const space = floodFill(nx, ny);

    if (space > bestSpace) { bestSpace = space; bestDir = dir; }
  });

  return bestDir;
}

// ================================================================
//  AI — BALANCED (yellow)
//  Splits its priorities evenly between open space and chasing.
// ================================================================

function balancedAI(racer) {
  const projected = getProjectedPositions(racer.index);
  const safe = getSafeDirs(racer.x, racer.y, racer.dir, projected);
  if (safe.length === 0) return racer.dir;

  const player = racers[0];
  let bestDir   = safe[0];
  let bestScore = -Infinity;

  safe.forEach(function (dir) {
    const nx    = racer.x + dir.dx;
    const ny    = racer.y + dir.dy;
    const space = floodFill(nx, ny);
    const dist  = Math.abs(nx - player.x) + Math.abs(ny - player.y);

    // Equal weight: survive vs. chase
    const score = space - dist;

    if (score > bestScore) { bestScore = score; bestDir = dir; }
  });

  return bestDir;
}

// ================================================================
//  GAME TICK — called every TICK_MS milliseconds
//  This is the heart of the game. Each call advances the game one step.
// ================================================================

function gameTick() {
  if (!gameRunning) return;
  tickCount++;

  // ---- 1. Apply buffered key presses for human players ----
  // We buffer key presses and apply them at the start of each tick so
  // direction changes take effect in a controlled, simultaneous way.

  // Player 1 (arrow keys)
  const player = racers[0];
  if (player.alive && playerNextDir && !isOpposite(playerNextDir, player.dir)) {
    player.dir = playerNextDir;
  }
  playerNextDir = null;

  // Player 2 (WASD) — only active after they have joined
  if (player2Joined) {
    const player2 = racers[3];
    if (player2.alive && player2NextDir && !isOpposite(player2NextDir, player2.dir)) {
      player2.dir = player2NextDir;
    }
    player2NextDir = null;
  }

  // ---- 2. Compute AI directions ----
  racers.forEach(function (racer) {
    if (!racer.alive || racer.isPlayer) return;
    if (racer.aiType === 'reckless') racer.dir = recklessAI(racer);
    if (racer.aiType === 'survivor') racer.dir = survivorAI(racer);
    if (racer.aiType === 'balanced') racer.dir = balancedAI(racer);
  });

  // ---- 3. Calculate where each alive racer wants to move ----
  // We compute all next positions BEFORE moving anyone, so collisions
  // are resolved simultaneously (fair for all racers).
  const moves = racers.map(function (r) {
    if (!r.alive) return null;
    return { nx: r.x + r.dir.dx, ny: r.y + r.dir.dy };
  });

  // ---- 4. Detect collisions ----
  const dying    = new Array(racers.length).fill(false);
  const killedBy = new Array(racers.length).fill(-1);   // who gets kill credit (-1 = nobody)

  racers.forEach(function (racer, i) {
    if (!racer.alive) return;
    const { nx, ny } = moves[i];

    // Hit a wall (out of bounds)
    if (nx < 0 || nx >= GRID_CELLS || ny < 0 || ny >= GRID_CELLS) {
      dying[i] = true;
      return;
    }

    // Hit a trail (cell is already occupied)
    const trailOwner = grid[ny][nx];
    if (trailOwner !== -1) {
      dying[i] = true;
      if (trailOwner !== i) {
        // Kill credit only if the hit cell is one of the owner's last KILL_WINDOW placements.
        // This rewards active play — old, forgotten trail doesn't score a kill.
        const owner    = racers[trailOwner];
        const isRecent = owner.recentTrail.some(function (c) { return c.x === nx && c.y === ny; });
        if (isRecent) killedBy[i] = trailOwner;
      }
    }
  });

  // Head-on collision: two alive racers trying to enter the same empty cell
  racers.forEach(function (r, i) {
    if (!r.alive || dying[i]) return;
    racers.forEach(function (other, j) {
      if (i >= j || !other.alive || dying[j]) return;
      if (moves[i].nx === moves[j].nx && moves[i].ny === moves[j].ny) {
        dying[i] = true;
        dying[j] = true;
        // Simultaneous head-on = no kill credit for either
      }
    });
  });

  // ---- 5. Move surviving racers forward ----
  // For each racer that isn't dying this tick:
  // — update their (x, y) to the new cell
  // — mark that new cell in the grid (the old cell stays as permanent trail)
  racers.forEach(function (racer, i) {
    if (!racer.alive || dying[i]) return;
    racer.x = moves[i].nx;
    racer.y = moves[i].ny;
    grid[racer.y][racer.x] = i;   // new head cell is now owned by this racer

    // Record this new cell as recently placed for kill-credit purposes
    racer.recentTrail.push({ x: racer.x, y: racer.y });
    if (racer.recentTrail.length > KILL_WINDOW) {
      racer.recentTrail.shift();   // drop the oldest entry once we exceed the window
    }
  });

  // ---- 6. Kill racers, apply death penalty, and award kill points ----
  let anyDeaths = false;
  dying.forEach(function (dead, i) {
    if (!dead) return;
    racers[i].alive = false;
    anyDeaths = true;
    document.getElementById('card-' + i).classList.add('dead');

    // Deduct points for dying — floor at 0, score can never go negative
    racers[i].score = Math.max(0, racers[i].score - DEATH_PENALTY);

    // Give 100 points to whoever's recent trail caused this death
    const k = killedBy[i];
    if (k !== -1) racers[k].score += 100;
  });

  // Reset the 10-minute clock whenever someone dies
  if (anyDeaths) tickCount = 0;

  // ---- 7. Award 1 survival point per second to each alive racer ----
  // TICKS_PER_S = 10, so every 10th tick is exactly 1 second
  if (tickCount % TICKS_PER_S === 0) {
    racers.forEach(function (r) {
      if (r.alive) r.score++;
    });
  }

  // ---- 8. Update live score display ----
  racers.forEach(function (r, i) {
    document.getElementById('score-' + i).textContent = r.score;
  });

  // ---- 9. Update timer ----
  const secsElapsed = Math.floor(tickCount / TICKS_PER_S);
  const secsLeft    = Math.max(0, GAME_SECS - secsElapsed);
  const mins        = Math.floor(secsLeft / 60);
  const secs        = secsLeft % 60;
  document.getElementById('timer').textContent =
    'TIME LEFT: ' + mins + ':' + (secs < 10 ? '0' : '') + secs;

  // ---- 10. Check win/draw conditions ----
  const alive = racers.filter(function (r) { return r.alive; });

  if (alive.length <= 1) {
    // One racer left (or all died simultaneously → alive[0] is undefined → null)
    endGame(alive[0] || null);
    return;
  }

  if (secsLeft === 0) {
    endGame(null);   // time limit reached with multiple survivors → draw
    return;
  }

  // ---- 11. Draw the current frame ----
  render();
}

// ================================================================
//  RENDER — draws everything to the canvas
//  Called at the end of every game tick.
// ================================================================

function render() {
  // Fill the entire canvas with black to clear the previous frame
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

  // Draw a very faint grid — gives the pixelated Tron feel
  ctx.strokeStyle = '#0d0d0d';
  ctx.lineWidth   = 0.5;
  for (let i = 0; i <= GRID_CELLS; i++) {
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(i * CELL_PX, 0);
    ctx.lineTo(i * CELL_PX, CANVAS_PX);
    ctx.stroke();
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(0, i * CELL_PX);
    ctx.lineTo(CANVAS_PX, i * CELL_PX);
    ctx.stroke();
  }

  // Draw every occupied cell in the grid
  for (let row = 0; row < GRID_CELLS; row++) {
    for (let col = 0; col < GRID_CELLS; col++) {
      const owner = grid[row][col];
      if (owner === -1) continue;   // empty cell — nothing to draw

      const racer  = racers[owner];

      // Is this cell the racer's current head position?
      const isHead = racer.alive && col === racer.x && row === racer.y;

      // The head glows brighter than the trail
      ctx.shadowBlur  = isHead ? 20 : 7;
      ctx.shadowColor = racer.color;

      // Head is drawn white-hot; trail is the racer's colour
      ctx.fillStyle = isHead ? '#ffffff' : racer.color;

      // Leave a 1 px gap around each cell to show the grid beneath
      ctx.fillRect(
        col * CELL_PX + 1,
        row * CELL_PX + 1,
        CELL_PX - 2,
        CELL_PX - 2
      );
    }
  }

  // Always reset shadow after drawing — otherwise it leaks into the UI
  ctx.shadowBlur = 0;
}

// ================================================================
//  END GAME — stops the game loop and shows the results overlay
// ================================================================

function endGame(winner) {
  gameRunning = false;
  clearInterval(gameInterval);   // stop the tick timer

  render();   // draw the final game state behind the overlay

  // Determine the title and its colour
  let title, titleColor;
  if (!winner) {
    title      = 'DRAW';
    titleColor = '#ffffff';
  } else if (winner.isPlayer) {
    title      = 'YOU WIN!';
    titleColor = winner.color;
  } else {
    title      = winner.name + ' WINS';
    titleColor = winner.color;
  }

  const titleEl            = document.getElementById('overlayTitle');
  titleEl.textContent      = title;
  titleEl.style.color      = titleColor;
  titleEl.style.textShadow = '0 0 20px ' + titleColor + ', 0 0 40px ' + titleColor;

  // Build the final scoreboard — sorted from highest to lowest score
  const sorted = racers.slice().sort(function (a, b) { return b.score - a.score; });
  const fsEl   = document.getElementById('finalScores');
  fsEl.innerHTML = '';

  sorted.forEach(function (r) {
    const card             = document.createElement('div');
    card.className         = 'final-card';
    card.style.color       = r.color;
    card.style.textShadow  = '0 0 8px ' + r.color;
    card.innerHTML =
      '<div class="fc-name">'  + r.name  + '</div>' +
      '<div class="fc-score">' + r.score + '</div>' +
      '<div class="fc-tag">'   + (r.alive ? 'ALIVE' : 'ELIMINATED') + '</div>';
    fsEl.appendChild(card);
  });

  document.getElementById('overlay').style.display = 'flex';
}
