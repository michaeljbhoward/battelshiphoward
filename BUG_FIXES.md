# Bug Fixes Documentation

## Bugs Found and Fixed

### 1. Game State Persistence Bug
**Location**: `initSetup()` function (line 82)  
**Issue**: The `playerShips` array was not being reset when starting a new game. This caused ships from previous games to accumulate, leading to incorrect ship counts and game state corruption.  
**Fix**: Added `gameState.playerShips = []` to reset the array in `initSetup()`.

### 2. Ship Hit Count Bug
**Location**: `checkAIShipSunk()` and `checkPlayerShipSunk()` functions  
**Issue**: Hit counts were being incremented even after a ship was already sunk. This could lead to hit counts exceeding ship length and incorrect game state.  
**Fix**: Added checks `if (ship.hits >= ship.length) return;` to prevent incrementing hits on already sunk ships.

### 3. AI Infinite Recursion Bug
**Location**: `aiTurn()` function (lines 344-348)  
**Issue**: When the AI selected a cell that was already attacked (in target mode), it would recursively call `aiTurn()` without a proper termination condition. This could cause a stack overflow if the AI kept selecting already-attacked cells.  
**Fix**: Replaced recursive call with a `while` loop that continues until a valid cell is found: `while (!validCell)`.

### 4. AI Target Cell Duplication Bug
**Location**: `aiTurn()` function (lines 356-363)  
**Issue**: When the AI hit a ship, it would add all adjacent cells to the target list without checking if they were already in the list. This could lead to duplicate target cells and inefficient AI behavior.  
**Fix**: Added duplicate checking: `const alreadyInTarget = gameState.aiTargetCells.some(t => t.row === adj.row && t.col === adj.col);` to prevent adding cells that are already in the target list.

### 5. Game State Reset Bug
**Location**: `startGame()` function (line 218)  
**Issue**: The `playerShips` array was not being properly reset when starting a new game from the setup screen. This could cause issues with ship tracking across multiple games.  
**Fix**: Added `gameState.playerShips = gameState.playerShips.filter(s => s.hits < s.length);` to ensure only active ships are tracked when starting a new game.

## Testing Notes

All bugs were identified through code review and logical analysis of the game state management. The fixes ensure:
- Clean game state initialization
- Proper hit tracking without overflow
- AI behavior without infinite loops
- Efficient AI targeting without duplicates
- Consistent game state across multiple play sessions

The game has been tested locally and all identified issues have been resolved.
