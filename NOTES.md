# Tron Snake — Project Notes

## What we're building
A Tron light cycles game in the browser. 4 racers leave permanent trails. Hitting any trail, your own trail, or the arena wall kills you. Last racer alive wins.

## Tech decisions (locked in)
- **Platform:** Web — single HTML file
- **Libraries:** None. Pure vanilla HTML + CSS + JavaScript.
- **Rendering:** HTML5 Canvas
- **Code style:** Heavy inline comments throughout — written for someone learning to code, not an expert.

## All gameplay decisions (locked in)

### Racers
- 4 racers total: 1 human player + 3 AIs (one of each personality, always)
- AI personalities are fixed — no selection screen needed

### Starting positions
- Each racer starts halfway between the center and their wall (i.e. at 25% and 75% of width/height)
- They point **outward** (away from center) at game start
- Layout:
  - Player → left side, facing left
  - Reckless AI → right side, facing right
  - Survivor AI → top, facing up
  - Balanced AI → bottom, facing down

### Colors (color = identity)
- **Player:** Neon blue
- **Reckless AI:** Neon red/orange (aggressive)
- **Survivor AI:** Neon green (cautious)
- **Balanced AI:** Neon yellow

### Speed
- Constant for now (one fixed speed for all racers)
- Will become a configurable setting in a future version

### Controls
- Human player: arrow keys
- Future multiplayer: player 2 uses WASD

### Win condition
- Game ends when only 1 racer remains alive, OR
- 10 minutes pass with no deaths (draw)

### Scoring
- Every racer earns **1 point per second** while alive
- Dying costs **10 points**
- Kill credit (**+100 pts**) is only awarded if the victim crashes into one of your **last 10 placed trail cells** — old trail doesn't count
- Score is not clamped (can go negative if you die early)
- Scores for all 4 racers shown on screen live

### Timer
- Starts at 10:00 and counts down
- **Resets to 10:00 every time someone dies** — game only ends on time limit if no one dies for a full 10 minutes

### Death & end screen
- When a racer dies their trail stays on the grid (it's still an obstacle)
- When the game ends: show final scores for all 4 racers with a restart button

## Visual style
- Black background
- Neon glowing trails (color matches racer)
- Pixelated/grid-based movement
- Full arena always visible — no scrolling or camera movement
- Hitting the arena edge kills the racer (walls are deadly)

## Deferred for later
- Powerups
- Speed as a configurable game setting
- Local multiplayer (player 1: arrow keys, player 2: WASD)

## Status
All decisions locked in. Ready to build.
