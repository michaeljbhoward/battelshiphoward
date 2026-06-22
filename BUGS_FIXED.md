# Battleship — Bugs Found & Fixes

A short record of the bugs uncovered during development and how each was resolved.

---

## Gameplay Bugs

### 1. Couldn't attack the opponent
- **Symptom:** After Start Game, clicking the enemy board did nothing.
- **Cause:** The attack click listener was attached to *your own* board (`!isAI`) instead of the opponent's board (`isAI`).
- **Fix:** Attached the listener to the AI board. Also made it **always-on**, with turn/game-over checks handled inside `handlePlayerAttack`, so the board can never become "dead."

### 2. Board stopped responding after a miss
- **Symptom:** Attacks worked for a click or two, then stopped.
- **Cause:** After the AI's turn, only the player board was re-rendered, so the opponent board lost its click handlers.
- **Fix:** Re-render the opponent board when control returns to the player (and the always-on listener above makes this robust).

### 3. Unfair turns
- **Symptom:** The player got an extra shot after a hit, but the AI never did.
- **Cause:** Inconsistent turn logic between player and AI.
- **Fix:** The AI now also earns another shot on a hit — rules are symmetric.

### 4. AI wasted shots after sinking a ship
- **Symptom:** The AI kept firing around a ship it had already sunk.
- **Cause:** "Target mode" wasn't cleared after a sink.
- **Fix:** `checkPlayerShipSunk` now reports the sink; the AI clears its target queue and goes back to hunting.

---

## Stability Bugs

### 5. AI turn crashed the game
- **Cause:** A `const cell` was declared inside a loop but used outside it, throwing a `ReferenceError`.
- **Fix:** Declared the variable in the correct scope.

### 6. AI could freeze
- **Cause:** The AI re-picked already-hit cells using infinite recursion / a random retry loop that could spin forever.
- **Fix:** Rewrote cell selection to build a list of un-attacked cells and pick from it — guaranteed to terminate.

### 7. State leaked between games
- **Cause:** `playerShips`, `gameOver`, turn state, and AI tracking weren't fully reset on a new game; ship-button listeners stacked up each replay.
- **Fix:** `initSetup()` now resets all state, and ship buttons use `onclick` assignment so listeners never accumulate.

### 8. Hit counts overflowed
- **Cause:** A sunk ship could keep incrementing its hit total.
- **Fix:** Added a guard that stops counting once `hits >= length`.

### 8b. Stale AI timer caused a false "You Lost" after restart
- **Symptom:** Clicking "New Game" during the AI's 1-second delay could pop a "You Lost!" screen over the fresh setup a moment later.
- **Cause:** The pending `setTimeout(aiTurn)` still fired after `initSetup()` reset the board, then attacked an empty board where `playerShips` was empty, tripping the loss condition.
- **Fix:** The AI timer is now tracked and cancelled on reset, plus `aiTurn` bails early if no game is active. Verified with an automated test.

---

## UI / UX Bugs

### 9. Page required scrolling
- **Cause:** Fixed sizing overflowed shorter screens.
- **Fix:** The board size is derived from the leftover viewport height, and the layout is locked to one screen.

### 10. Orientation control
- **Change:** Replaced the rotate button with **drag-to-place** (drag sideways = horizontal, up/down = vertical), plus **R key** and **right-click** to flip — then removed the leftover button per request while keeping all of that functionality.

### 11. Edits didn't appear in the browser
- **Cause:** The dev server returned cached `304`s, serving stale files.
- **Fix:** Added a **no-cache dev server** and versioned asset URLs so the latest always loads.

---

## How Fixes Were Verified

Beyond manual play-testing, the logic was checked with automated tests run in a JavaScript engine (`jsc`) using a DOM stub:

- Syntax/parse check passes
- Ship placement and validation (including off-board) are correct
- Player can win (all AI ships sunk, score 5/5)
- AI can win (repeated turns sink all player ships)
- Repeated attacks on the same cell don't double-count
- Hit counts never exceed ship length
- All element IDs referenced in JS exist in the HTML

All checks passed.
