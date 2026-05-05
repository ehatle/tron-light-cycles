# Tron Light Cycles — Project Notes

## What it is
A Tron light cycles game in the browser. 4 racers leave permanent trails. Hitting any trail, your own trail, or the arena wall kills you. Last racer alive wins.

## File structure
| File | Purpose |
|---|---|
| `index.html` | HTML structure and layout only |
| `style.css` | All visual styling |
| `script.js` | All game logic |
| `README.md` | This file |

## Tech
- Pure vanilla HTML + CSS + JavaScript — no libraries
- Rendering via HTML5 Canvas
- Heavy inline comments throughout (written for a non-developer audience)

## Gameplay

### Arena
- 60×60 grid, each cell 10×10 px → 600×600 px canvas
- Full arena always visible, no scrolling
- Walls are deadly — hitting any edge kills the racer

### Racers
- 4 total: 1 human player + 3 AIs (always one of each personality)
- All racers start halfway between the centre and their respective wall, pointing **inward** toward the centre
- Starting layout:
  - **Player 1 (blue)** → left side, facing right
  - **Reckless (red)** → right side, facing left
  - **Survivor (green)** → top, facing down
  - **Balanced (yellow)** → bottom, facing up

### Local multiplayer
- Player 2 can join at any time by pressing a WASD key
- This converts the Balanced (yellow) racer from AI to human control
- The racer is renamed "PLAYER 2" on the score panel and end screen
- Resets to AI at the start of each new game

### AI personalities
| Name | Color | Behaviour |
|---|---|---|
| Reckless | Neon red | Aggressively chases the player, low self-preservation |
| Survivor | Neon green | Flees toward open space, ignores other racers |
| Balanced | Neon yellow | Equal weight between chasing and survival — replaced by player 2 on join |

AIs are aware of all other racers' projected next positions and will not move into them.

### Controls
| Input | Action |
|---|---|
| Arrow keys | Steer player 1 |
| WASD | Join as player 2 / steer player 2 |
| Enter | Reset / new game |

### Scoring
| Event | Points |
|---|---|
| Alive for 1 second | +1 |
| Kill (victim hits your last 10 trail cells) | +100 |
| Death | −10 (minimum 0) |

- Scores are shown live below the canvas for all 4 racers
- Score freezes when a racer is eliminated

### Timer
- Counts down from 10:00
- Resets to 10:00 every time someone is eliminated
- If 10 full minutes pass with no deaths → draw

### Win condition
- Last racer alive wins
- If time runs out with multiple racers alive → draw

### Death
- Dead racer's trail remains on the grid as a permanent obstacle
- Game ends when 1 (or 0) racers remain

## UI layout
Three-column layout — game canvas is centred:
- **Left:** New game (↺) and End game (⏻) icon buttons
- **Centre:** Canvas + live score panel + hint text
- **Right:** How-to-play instructions

## Visual style
- Black background
- Neon glowing trails matching each racer's colour
- Racer head drawn white-hot with stronger glow
- Faint pixel grid beneath the trails
- Sharp corners (0px border radius) on all buttons

## Open items (multiplayer branch)
- Rename "PLAYER" to "PLAYER 1" on the score panel when player 2 joins
- Give player 2 a distinct colour (currently shares yellow with Balanced AI)
- Reposition yellow/player 2 starting spot to the right side (swap with red)
- Update in-game instructions to reflect multiplayer controls
- Update hint text below the canvas

## Deferred for later
- Powerups
- Speed as a configurable setting at game start

## Git
- Repo: `github.com/ehatle/tron-light-cycles`
- AI contributions co-authored as: `Gunnar <gunnnar@real.person>`
