/**
 * Unit tests for Battleship core game logic.
 *
 * game.js was designed as a browser script; the conditional module.exports
 * block at the bottom lets us require it from Node/Jest without changing
 * any runtime behaviour.  A minimal DOM is wired up before the require so
 * that init() can attach its listeners.
 */

// ---------------------------------------------------------------------------
// DOM scaffold – mirrors the elements referenced by game.js
// ---------------------------------------------------------------------------
function buildDOM() {
  document.body.innerHTML = `
    <div id="setup-screen" class="screen">
      <input type="text" id="player-name" value="" />
      <button class="ship-btn" data-ship="carrier" data-length="5">Carrier (5)</button>
      <button class="ship-btn" data-ship="battleship" data-length="4">Battleship (4)</button>
      <button class="ship-btn" data-ship="cruiser" data-length="3">Cruiser (3)</button>
      <button class="ship-btn" data-ship="submarine" data-length="3">Submarine (3)</button>
      <button class="ship-btn" data-ship="destroyer" data-length="2">Destroyer (2)</button>
      <button id="undo-btn" disabled>Undo</button>
      <div id="player-board-setup" class="board"></div>
      <button id="start-game-btn">Start Game</button>
    </div>
    <div id="game-screen" class="screen hidden">
      <div id="turn-indicator"></div>
      <div id="message"></div>
      <div id="player-board" class="board"></div>
      <div id="ai-board" class="board"></div>
      <div id="player-ships">5</div>
      <div id="ai-ships">5</div>
      <div id="player-sunk">0</div>
      <div id="ai-sunk">0</div>
      <div id="score-player-name">You</div>
      <span class="score-total">/ 5</span>
      <button id="restart-btn">New Game</button>
    </div>
    <div id="game-over-screen" class="screen hidden">
      <h2 id="game-over-title"></h2>
      <p id="game-over-message"></p>
      <button id="play-again-btn">Play Again</button>
    </div>
    <div id="modal" class="modal hidden">
      <h3 id="modal-title"></h3>
      <p id="modal-message"></p>
      <button id="modal-close-btn">OK</button>
    </div>
  `;
}

// Build the DOM once before requiring the module so init() can run
buildDOM();

const game = require('../game.js');

const {
  BOARD_SIZE, SHIPS, gameState,
  createBoard, getShipCells, isValidPlacement, isValidAIPlacement,
  getAdjacentCells, checkAIShipSunk, checkPlayerShipSunk, checkGameOver,
  handlePlayerAttack, aiTurn, placeAIShip, initSetup,
  placeShipAt, undoLastPlacement, renderBoard,
  showModal, hideModal, toggleOrientation,
} = game;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset game state to a clean starting point between tests. */
function resetState() {
  buildDOM();
  initSetup();
}

/** Place a ship directly onto a board (bypasses DOM rendering). */
function placeShipOnBoard(board, ships, name, cells, length) {
  cells.forEach(([r, c]) => {
    board[r][c].hasShip = true;
    board[r][c].shipName = name;
  });
  ships.push({ name, cells, hits: 0, length });
}

/** Place all five ships on a board for quick full-fleet setup. */
function placeAllShips(board, ships) {
  placeShipOnBoard(board, ships, 'carrier',    [[0,0],[0,1],[0,2],[0,3],[0,4]], 5);
  placeShipOnBoard(board, ships, 'battleship', [[1,0],[1,1],[1,2],[1,3]],       4);
  placeShipOnBoard(board, ships, 'cruiser',    [[2,0],[2,1],[2,2]],             3);
  placeShipOnBoard(board, ships, 'submarine',  [[3,0],[3,1],[3,2]],             3);
  placeShipOnBoard(board, ships, 'destroyer',  [[4,0],[4,1]],                   2);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.useFakeTimers();
  resetState();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Constants ──────────────────────────────────────────────────────────────

describe('constants', () => {
  test('BOARD_SIZE is 10', () => {
    expect(BOARD_SIZE).toBe(10);
  });

  test('SHIPS defines five ships with correct lengths', () => {
    expect(Object.keys(SHIPS)).toHaveLength(5);
    expect(SHIPS.carrier.length).toBe(5);
    expect(SHIPS.battleship.length).toBe(4);
    expect(SHIPS.cruiser.length).toBe(3);
    expect(SHIPS.submarine.length).toBe(3);
    expect(SHIPS.destroyer.length).toBe(2);
  });

  test('total ship cells equal 17', () => {
    const total = Object.values(SHIPS).reduce((s, ship) => s + ship.length, 0);
    expect(total).toBe(17);
  });
});

// ── createBoard ────────────────────────────────────────────────────────────

describe('createBoard', () => {
  test('returns a 10×10 grid', () => {
    const board = createBoard();
    expect(board).toHaveLength(BOARD_SIZE);
    board.forEach(row => expect(row).toHaveLength(BOARD_SIZE));
  });

  test('every cell starts empty and un-attacked', () => {
    const board = createBoard();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        expect(board[r][c]).toEqual({
          hasShip: false,
          shipName: null,
          isHit: false,
          isMiss: false,
        });
      }
    }
  });

  test('rows are independent objects (mutating one does not affect another)', () => {
    const board = createBoard();
    board[0][0].hasShip = true;
    expect(board[1][0].hasShip).toBe(false);
  });

  test('cells within the same row are independent', () => {
    const board = createBoard();
    board[0][0].isHit = true;
    expect(board[0][1].isHit).toBe(false);
  });
});

// ── getShipCells ───────────────────────────────────────────────────────────

describe('getShipCells', () => {
  test('horizontal placement returns correct cells', () => {
    expect(getShipCells(0, 0, 3, true)).toEqual([[0,0],[0,1],[0,2]]);
  });

  test('vertical placement returns correct cells', () => {
    expect(getShipCells(0, 0, 3, false)).toEqual([[0,0],[1,0],[2,0]]);
  });

  test('length-1 ship returns a single cell', () => {
    expect(getShipCells(5, 5, 1, true)).toEqual([[5,5]]);
  });

  test('ship extending beyond the board generates out-of-bounds coords', () => {
    const cells = getShipCells(0, 8, 5, true);
    expect(cells).toHaveLength(5);
    expect(cells[4]).toEqual([0, 12]); // off-board
  });

  test('horizontal carrier from (3,5)', () => {
    const cells = getShipCells(3, 5, 5, true);
    expect(cells).toEqual([[3,5],[3,6],[3,7],[3,8],[3,9]]);
  });

  test('vertical battleship from (6,2)', () => {
    const cells = getShipCells(6, 2, 4, false);
    expect(cells).toEqual([[6,2],[7,2],[8,2],[9,2]]);
  });
});

// ── isValidPlacement / isValidAIPlacement ──────────────────────────────────

describe('isValidPlacement', () => {
  test('valid placement on an empty board', () => {
    const cells = getShipCells(0, 0, 3, true);
    expect(isValidPlacement(cells)).toBe(true);
  });

  test('rejects placement extending off the right edge', () => {
    const cells = getShipCells(0, 8, 5, true);
    expect(isValidPlacement(cells)).toBe(false);
  });

  test('rejects placement extending off the bottom edge', () => {
    const cells = getShipCells(8, 0, 5, false);
    expect(isValidPlacement(cells)).toBe(false);
  });

  test('rejects overlapping ships', () => {
    // Place a ship first
    gameState.playerBoard[0][0].hasShip = true;
    const cells = getShipCells(0, 0, 2, true);
    expect(isValidPlacement(cells)).toBe(false);
  });

  test('allows placement next to (but not overlapping) a ship', () => {
    gameState.playerBoard[0][0].hasShip = true;
    const cells = getShipCells(1, 0, 2, true);
    expect(isValidPlacement(cells)).toBe(true);
  });

  test('rejects negative row coordinate', () => {
    expect(isValidPlacement([[-1, 0]])).toBe(false);
  });

  test('rejects negative col coordinate', () => {
    expect(isValidPlacement([[0, -1]])).toBe(false);
  });

  test('allows placement in the bottom-right corner', () => {
    const cells = getShipCells(9, 8, 2, true);
    expect(isValidPlacement(cells)).toBe(true);
  });

  test('rejects single cell that is out of bounds', () => {
    expect(isValidPlacement([[10, 0]])).toBe(false);
    expect(isValidPlacement([[0, 10]])).toBe(false);
  });
});

describe('isValidAIPlacement', () => {
  test('valid placement on empty AI board', () => {
    gameState.aiBoard = createBoard();
    const cells = getShipCells(0, 0, 3, true);
    expect(isValidAIPlacement(cells)).toBe(true);
  });

  test('rejects overlap on AI board', () => {
    gameState.aiBoard = createBoard();
    gameState.aiBoard[0][0].hasShip = true;
    expect(isValidAIPlacement([[0, 0]])).toBe(false);
  });

  test('rejects out-of-bounds on AI board', () => {
    gameState.aiBoard = createBoard();
    expect(isValidAIPlacement([[0, 10]])).toBe(false);
  });
});

// ── getAdjacentCells ───────────────────────────────────────────────────────

describe('getAdjacentCells', () => {
  test('center cell returns 4 neighbours', () => {
    const adj = getAdjacentCells(5, 5);
    expect(adj).toHaveLength(4);
    expect(adj).toEqual(expect.arrayContaining([
      { row: 4, col: 5 },
      { row: 6, col: 5 },
      { row: 5, col: 4 },
      { row: 5, col: 6 },
    ]));
  });

  test('top-left corner returns 2 neighbours', () => {
    expect(getAdjacentCells(0, 0)).toHaveLength(2);
  });

  test('top-right corner returns 2 neighbours', () => {
    expect(getAdjacentCells(0, 9)).toHaveLength(2);
  });

  test('bottom-left corner returns 2 neighbours', () => {
    expect(getAdjacentCells(9, 0)).toHaveLength(2);
  });

  test('bottom-right corner returns 2 neighbours', () => {
    expect(getAdjacentCells(9, 9)).toHaveLength(2);
  });

  test('edge cell (not corner) returns 3 neighbours', () => {
    expect(getAdjacentCells(0, 5)).toHaveLength(3);
    expect(getAdjacentCells(5, 0)).toHaveLength(3);
    expect(getAdjacentCells(9, 5)).toHaveLength(3);
    expect(getAdjacentCells(5, 9)).toHaveLength(3);
  });

  test('returned cells are all within bounds', () => {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        getAdjacentCells(r, c).forEach(({ row, col }) => {
          expect(row).toBeGreaterThanOrEqual(0);
          expect(row).toBeLessThan(BOARD_SIZE);
          expect(col).toBeGreaterThanOrEqual(0);
          expect(col).toBeLessThan(BOARD_SIZE);
        });
      }
    }
  });
});

// ── Ship sinking (checkAIShipSunk / checkPlayerShipSunk) ───────────────────

describe('checkAIShipSunk', () => {
  beforeEach(() => {
    gameState.aiShips = [
      { name: 'destroyer', cells: [[0,0],[0,1]], hits: 0, length: 2 },
    ];
  });

  test('increments hits on a valid ship', () => {
    checkAIShipSunk('destroyer');
    expect(gameState.aiShips[0].hits).toBe(1);
  });

  test('ship is sunk when hits equal length', () => {
    checkAIShipSunk('destroyer');
    checkAIShipSunk('destroyer');
    expect(gameState.aiShips[0].hits).toBe(2);
  });

  test('hit guard: does not increment past ship length', () => {
    gameState.aiShips[0].hits = 2; // already sunk
    checkAIShipSunk('destroyer');
    expect(gameState.aiShips[0].hits).toBe(2);
  });

  test('no-op for non-existent ship name', () => {
    checkAIShipSunk('nonexistent');
    expect(gameState.aiShips[0].hits).toBe(0);
  });
});

describe('checkPlayerShipSunk', () => {
  beforeEach(() => {
    gameState.playerShips = [
      { name: 'cruiser', cells: [[0,0],[0,1],[0,2]], hits: 0, length: 3 },
    ];
  });

  test('returns false when ship is not yet sunk', () => {
    expect(checkPlayerShipSunk('cruiser')).toBe(false);
    expect(gameState.playerShips[0].hits).toBe(1);
  });

  test('returns true when the final hit sinks the ship', () => {
    gameState.playerShips[0].hits = 2;
    expect(checkPlayerShipSunk('cruiser')).toBe(true);
    expect(gameState.playerShips[0].hits).toBe(3);
  });

  test('hit guard: returns false for already-sunk ship', () => {
    gameState.playerShips[0].hits = 3;
    expect(checkPlayerShipSunk('cruiser')).toBe(false);
    expect(gameState.playerShips[0].hits).toBe(3);
  });

  test('returns false for unknown ship name', () => {
    expect(checkPlayerShipSunk('unknown')).toBe(false);
  });
});

// ── checkGameOver ──────────────────────────────────────────────────────────

describe('checkGameOver', () => {
  beforeEach(() => {
    // Set up a battle-ready state with both fleets
    gameState.playerBoard = createBoard();
    gameState.aiBoard = createBoard();
    gameState.playerShips = [];
    gameState.aiShips = [];
    placeAllShips(gameState.playerBoard, gameState.playerShips);
    placeAllShips(gameState.aiBoard, gameState.aiShips);
    gameState.gameOver = false;

    // Ensure game-screen is visible for checkGameOver DOM ops
    document.getElementById('game-screen').classList.remove('hidden');
  });

  test('game is not over when ships remain on both sides', () => {
    checkGameOver();
    expect(gameState.gameOver).toBe(false);
  });

  test('player wins when all AI ships are sunk', () => {
    gameState.aiShips.forEach(s => { s.hits = s.length; });
    checkGameOver();
    expect(gameState.gameOver).toBe(true);
    expect(document.getElementById('game-over-title').textContent).toMatch(/won/i);
  });

  test('AI wins when all player ships are sunk', () => {
    gameState.playerShips.forEach(s => { s.hits = s.length; });
    checkGameOver();
    expect(gameState.gameOver).toBe(true);
    expect(document.getElementById('game-over-title').textContent).toMatch(/lost/i);
  });

  test('sinking only some ships does not end the game', () => {
    gameState.aiShips[0].hits = gameState.aiShips[0].length;
    gameState.aiShips[1].hits = gameState.aiShips[1].length;
    checkGameOver();
    expect(gameState.gameOver).toBe(false);
  });
});

// ── handlePlayerAttack ─────────────────────────────────────────────────────

describe('handlePlayerAttack', () => {
  beforeEach(() => {
    gameState.playerBoard = createBoard();
    gameState.aiBoard = createBoard();
    gameState.playerShips = [];
    gameState.aiShips = [];
    placeAllShips(gameState.playerBoard, gameState.playerShips);
    placeAllShips(gameState.aiBoard, gameState.aiShips);
    gameState.isPlayerTurn = true;
    gameState.gameOver = false;
    gameState.aiHits = new Set();
    gameState.aiMisses = new Set();
    gameState.aiTargetMode = false;
    gameState.aiTargetCells = [];
    // Render the AI board so click handlers exist
    renderBoard(document.getElementById('ai-board'), gameState.aiBoard, false, true);
    document.getElementById('game-screen').classList.remove('hidden');
  });

  test('miss marks cell and switches turn', () => {
    // cell (9,9) is empty
    handlePlayerAttack(9, 9);
    expect(gameState.aiBoard[9][9].isMiss).toBe(true);
    expect(gameState.isPlayerTurn).toBe(false);
  });

  test('hit marks cell and keeps the turn', () => {
    // (0,0) has a ship
    handlePlayerAttack(0, 0);
    expect(gameState.aiBoard[0][0].isHit).toBe(true);
    expect(gameState.isPlayerTurn).toBe(true);
  });

  test('already-attacked cell is a no-op', () => {
    gameState.aiBoard[5][5].isMiss = true;
    const turnBefore = gameState.isPlayerTurn;
    handlePlayerAttack(5, 5);
    expect(gameState.isPlayerTurn).toBe(turnBefore);
  });

  test('does nothing when it is not the player turn', () => {
    gameState.isPlayerTurn = false;
    handlePlayerAttack(0, 0);
    expect(gameState.aiBoard[0][0].isHit).toBe(false);
  });

  test('does nothing when the game is over', () => {
    gameState.gameOver = true;
    handlePlayerAttack(0, 0);
    expect(gameState.aiBoard[0][0].isHit).toBe(false);
  });

  test('sinking the last AI ship ends the game', () => {
    // Sink first four ships
    gameState.aiShips.forEach((s, i) => {
      if (i < 4) s.hits = s.length;
    });
    // Last ship: destroyer at [4,0],[4,1]
    const last = gameState.aiShips[4];
    last.hits = last.length - 1;
    handlePlayerAttack(4, 1);
    expect(gameState.gameOver).toBe(true);
  });
});

// ── AI turn ────────────────────────────────────────────────────────────────

describe('aiTurn', () => {
  beforeEach(() => {
    gameState.playerBoard = createBoard();
    gameState.aiBoard = createBoard();
    gameState.playerShips = [];
    gameState.aiShips = [];
    placeAllShips(gameState.playerBoard, gameState.playerShips);
    placeAllShips(gameState.aiBoard, gameState.aiShips);
    gameState.isPlayerTurn = false;
    gameState.gameOver = false;
    gameState.aiHits = new Set();
    gameState.aiMisses = new Set();
    gameState.aiTargetMode = false;
    gameState.aiTargetCells = [];
    document.getElementById('game-screen').classList.remove('hidden');
    renderBoard(document.getElementById('player-board'), gameState.playerBoard, false, false);
    renderBoard(document.getElementById('ai-board'), gameState.aiBoard, false, true);
  });

  test('AI attacks exactly one cell per turn', () => {
    // Mark all cells as attacked except one empty cell
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (r !== 9 || c !== 9) {
          gameState.playerBoard[r][c].isMiss = true;
        }
      }
    }
    // (9,9) has no ship, so AI will miss and return turn
    aiTurn();
    expect(gameState.playerBoard[9][9].isMiss).toBe(true);
    expect(gameState.isPlayerTurn).toBe(true);
  });

  test('AI miss gives the turn back to the player', () => {
    // Leave only one un-attacked cell which does NOT have a ship
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!(r === 9 && c === 9)) {
          gameState.playerBoard[r][c].isMiss = true;
        }
      }
    }
    // (9,9) has no ship – forced miss
    gameState.playerBoard[9][9].hasShip = false;
    gameState.playerBoard[9][9].shipName = null;
    aiTurn();
    expect(gameState.playerBoard[9][9].isMiss).toBe(true);
    expect(gameState.isPlayerTurn).toBe(true);
  });

  test('AI does nothing when game is already over', () => {
    gameState.gameOver = true;
    const boardBefore = JSON.stringify(gameState.playerBoard);
    aiTurn();
    expect(JSON.stringify(gameState.playerBoard)).toBe(boardBefore);
  });

  test('AI enters target mode after a hit', () => {
    // Leave only one un-attacked cell which has a ship
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!(r === 0 && c === 0)) {
          gameState.playerBoard[r][c].isMiss = true;
        }
      }
    }
    // (0,0) has a ship (carrier)
    aiTurn();
    expect(gameState.playerBoard[0][0].isHit).toBe(true);
    expect(gameState.aiHits.has('0,0')).toBe(true);
  });

  test('AI target mode populates adjacent cells after a hit', () => {
    // Force AI to hit (5,5) by leaving only that cell un-attacked
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!(r === 5 && c === 5)) {
          gameState.playerBoard[r][c].isMiss = true;
        }
      }
    }
    // Put a ship on (5,5) that is large enough not to sink from 1 hit
    gameState.playerBoard[5][5].hasShip = true;
    gameState.playerBoard[5][5].shipName = 'cruiser';
    // Ensure cruiser has hits < length so sinking check doesn't clear target mode
    const cruiser = gameState.playerShips.find(s => s.name === 'cruiser');
    cruiser.hits = 0;
    cruiser.length = 3;

    aiTurn();
    expect(gameState.aiTargetMode).toBe(true);
  });
});

// ── placeAIShip ────────────────────────────────────────────────────────────

describe('placeAIShip', () => {
  beforeEach(() => {
    gameState.aiBoard = createBoard();
    gameState.aiShips = [];
  });

  test('places a ship of the correct length on the AI board', () => {
    placeAIShip('destroyer', 2);
    expect(gameState.aiShips).toHaveLength(1);
    expect(gameState.aiShips[0].length).toBe(2);
    expect(gameState.aiShips[0].cells).toHaveLength(2);
  });

  test('all placed cells are marked on the board', () => {
    placeAIShip('carrier', 5);
    const cells = gameState.aiShips[0].cells;
    cells.forEach(([r, c]) => {
      expect(gameState.aiBoard[r][c].hasShip).toBe(true);
      expect(gameState.aiBoard[r][c].shipName).toBe('carrier');
    });
  });

  test('placing all five ships produces no overlaps', () => {
    for (const [name, ship] of Object.entries(SHIPS)) {
      placeAIShip(name, ship.length);
    }
    expect(gameState.aiShips).toHaveLength(5);

    const occupied = new Set();
    gameState.aiShips.forEach(s => {
      s.cells.forEach(([r, c]) => {
        const key = `${r},${c}`;
        expect(occupied.has(key)).toBe(false);
        occupied.add(key);
      });
    });
  });

  test('ships stay within board bounds', () => {
    for (const [name, ship] of Object.entries(SHIPS)) {
      placeAIShip(name, ship.length);
    }
    gameState.aiShips.forEach(s => {
      s.cells.forEach(([r, c]) => {
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(BOARD_SIZE);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(BOARD_SIZE);
      });
    });
  });
});

// ── placeShipAt (player placement) ─────────────────────────────────────────

describe('placeShipAt', () => {
  test('places a ship and marks cells on the player board', () => {
    gameState.selectedShip = 'destroyer';
    placeShipAt(0, 0, true);
    expect(gameState.playerBoard[0][0].hasShip).toBe(true);
    expect(gameState.playerBoard[0][1].hasShip).toBe(true);
    expect(gameState.placedShips.has('destroyer')).toBe(true);
  });

  test('records placement in history for undo', () => {
    gameState.selectedShip = 'cruiser';
    placeShipAt(3, 3, true);
    expect(gameState.placementHistory).toHaveLength(1);
    expect(gameState.placementHistory[0].shipName).toBe('cruiser');
  });

  test('rejects invalid placement (overlap) without modifying state', () => {
    gameState.selectedShip = 'destroyer';
    placeShipAt(0, 0, true);
    const shipsBefore = gameState.playerShips.length;

    gameState.selectedShip = 'submarine';
    placeShipAt(0, 0, true); // overlaps
    expect(gameState.playerShips.length).toBe(shipsBefore);
    expect(gameState.placedShips.has('submarine')).toBe(false);
  });

  test('rejects placement off the board', () => {
    gameState.selectedShip = 'carrier';
    placeShipAt(0, 8, true); // carrier is length 5, would extend to col 12
    expect(gameState.placedShips.has('carrier')).toBe(false);
  });

  test('does nothing when no ship is selected', () => {
    gameState.selectedShip = null;
    const shipsBefore = gameState.playerShips.length;
    placeShipAt(0, 0, true);
    expect(gameState.playerShips.length).toBe(shipsBefore);
  });

  test('vertical placement works', () => {
    gameState.selectedShip = 'battleship';
    placeShipAt(0, 5, false);
    expect(gameState.playerBoard[0][5].hasShip).toBe(true);
    expect(gameState.playerBoard[1][5].hasShip).toBe(true);
    expect(gameState.playerBoard[2][5].hasShip).toBe(true);
    expect(gameState.playerBoard[3][5].hasShip).toBe(true);
    expect(gameState.placedShips.has('battleship')).toBe(true);
  });
});

// ── undoLastPlacement ──────────────────────────────────────────────────────

describe('undoLastPlacement', () => {
  test('removes the most recently placed ship', () => {
    gameState.selectedShip = 'destroyer';
    placeShipAt(0, 0, true);
    expect(gameState.playerBoard[0][0].hasShip).toBe(true);

    undoLastPlacement();
    expect(gameState.playerBoard[0][0].hasShip).toBe(false);
    expect(gameState.playerBoard[0][1].hasShip).toBe(false);
    expect(gameState.placedShips.has('destroyer')).toBe(false);
  });

  test('no-op when history is empty', () => {
    const boardBefore = JSON.stringify(gameState.playerBoard);
    undoLastPlacement();
    expect(JSON.stringify(gameState.playerBoard)).toBe(boardBefore);
  });

  test('multiple undos work in LIFO order', () => {
    gameState.selectedShip = 'destroyer';
    placeShipAt(0, 0, true);
    gameState.selectedShip = 'cruiser';
    placeShipAt(2, 0, true);

    undoLastPlacement();
    expect(gameState.placedShips.has('cruiser')).toBe(false);
    expect(gameState.placedShips.has('destroyer')).toBe(true);

    undoLastPlacement();
    expect(gameState.placedShips.has('destroyer')).toBe(false);
  });
});

// ── toggleOrientation ──────────────────────────────────────────────────────

describe('toggleOrientation', () => {
  test('flips currentOrientation', () => {
    gameState.currentOrientation = true;
    toggleOrientation();
    expect(gameState.currentOrientation).toBe(false);
    toggleOrientation();
    expect(gameState.currentOrientation).toBe(true);
  });

  test('syncs dragOrientation', () => {
    gameState.dragOrientation = true;
    toggleOrientation();
    expect(gameState.dragOrientation).toBe(false);
  });
});

// ── renderBoard ────────────────────────────────────────────────────────────

describe('renderBoard', () => {
  test('renders 100 cells for a standard board', () => {
    const container = document.getElementById('player-board');
    const board = createBoard();
    renderBoard(container, board, false, false);
    expect(container.querySelectorAll('.cell')).toHaveLength(100);
  });

  test('ship cells receive the "ship" class on the player board', () => {
    const container = document.getElementById('player-board');
    const board = createBoard();
    board[0][0].hasShip = true;
    renderBoard(container, board, false, false);
    const cell = container.querySelector('[data-row="0"][data-col="0"]');
    expect(cell.classList.contains('ship')).toBe(true);
  });

  test('ship cells do NOT receive the "ship" class on the AI board', () => {
    const container = document.getElementById('ai-board');
    const board = createBoard();
    board[0][0].hasShip = true;
    renderBoard(container, board, false, true);
    const cell = container.querySelector('[data-row="0"][data-col="0"]');
    expect(cell.classList.contains('ship')).toBe(false);
  });

  test('hit cells get the "hit" class', () => {
    const container = document.getElementById('player-board');
    const board = createBoard();
    board[3][4].isHit = true;
    renderBoard(container, board, false, false);
    const cell = container.querySelector('[data-row="3"][data-col="4"]');
    expect(cell.classList.contains('hit')).toBe(true);
  });

  test('miss cells get the "miss" class', () => {
    const container = document.getElementById('player-board');
    const board = createBoard();
    board[7][2].isMiss = true;
    renderBoard(container, board, false, false);
    const cell = container.querySelector('[data-row="7"][data-col="2"]');
    expect(cell.classList.contains('miss')).toBe(true);
  });
});

// ── showModal / hideModal ──────────────────────────────────────────────────

describe('showModal / hideModal', () => {
  test('showModal populates title and message and removes hidden class', () => {
    showModal('Test Title', 'Test message');
    expect(document.getElementById('modal-title').textContent).toBe('Test Title');
    expect(document.getElementById('modal-message').textContent).toBe('Test message');
    expect(document.getElementById('modal').classList.contains('hidden')).toBe(false);
  });

  test('hideModal adds the hidden class back', () => {
    showModal('X', 'Y');
    hideModal();
    expect(document.getElementById('modal').classList.contains('hidden')).toBe(true);
  });
});

// ── initSetup ──────────────────────────────────────────────────────────────

describe('initSetup', () => {
  test('resets boards, ships, and placement state', () => {
    // Dirty the state
    gameState.playerBoard[0][0].hasShip = true;
    gameState.placedShips.add('carrier');
    gameState.playerShips.push({ name: 'carrier', cells: [], hits: 0, length: 5 });
    gameState.gameOver = true;

    initSetup();

    expect(gameState.playerBoard[0][0].hasShip).toBe(false);
    expect(gameState.placedShips.size).toBe(0);
    expect(gameState.playerShips).toHaveLength(0);
    expect(gameState.gameOver).toBe(false);
    expect(gameState.isPlayerTurn).toBe(true);
  });

  test('clears AI tracking state', () => {
    gameState.aiHits = new Set(['1,1']);
    gameState.aiMisses = new Set(['2,2']);
    gameState.aiTargetMode = true;
    gameState.aiTargetCells = [{ row: 3, col: 3 }];

    initSetup();

    expect(gameState.aiHits.size).toBe(0);
    expect(gameState.aiMisses.size).toBe(0);
    expect(gameState.aiTargetMode).toBe(false);
    expect(gameState.aiTargetCells).toHaveLength(0);
  });

  test('renders the setup board with 100 cells', () => {
    initSetup();
    const setupBoard = document.getElementById('player-board-setup');
    expect(setupBoard.querySelectorAll('.cell')).toHaveLength(100);
  });
});

// ── Integration-style: full placement then game-over ───────────────────────

describe('integration: placement through game-over', () => {
  test('placing all ships via placeShipAt records five ships', () => {
    const placements = [
      ['carrier',    0, 0, true],
      ['battleship', 1, 0, true],
      ['cruiser',    2, 0, true],
      ['submarine',  3, 0, true],
      ['destroyer',  4, 0, true],
    ];
    placements.forEach(([name, r, c, h]) => {
      gameState.selectedShip = name;
      placeShipAt(r, c, h);
    });
    expect(gameState.placedShips.size).toBe(5);
    expect(gameState.playerShips).toHaveLength(5);
  });

  test('sinking all ships on one side triggers game over', () => {
    gameState.playerBoard = createBoard();
    gameState.aiBoard = createBoard();
    gameState.playerShips = [];
    gameState.aiShips = [];
    placeAllShips(gameState.playerBoard, gameState.playerShips);
    placeAllShips(gameState.aiBoard, gameState.aiShips);
    gameState.gameOver = false;
    document.getElementById('game-screen').classList.remove('hidden');

    // Sink every AI ship
    gameState.aiShips.forEach(s => { s.hits = s.length; });
    checkGameOver();

    expect(gameState.gameOver).toBe(true);
    const title = document.getElementById('game-over-title').textContent;
    expect(title).toMatch(/won/i);
  });

  test('undo all placements returns board to initial state', () => {
    const placements = [
      ['carrier',    0, 0, true],
      ['battleship', 1, 0, true],
      ['cruiser',    2, 0, true],
    ];
    placements.forEach(([name, r, c, h]) => {
      gameState.selectedShip = name;
      placeShipAt(r, c, h);
    });

    undoLastPlacement();
    undoLastPlacement();
    undoLastPlacement();

    expect(gameState.placedShips.size).toBe(0);
    expect(gameState.playerShips).toHaveLength(0);
    // Board should be clear
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        expect(gameState.playerBoard[r][c].hasShip).toBe(false);
      }
    }
  });
});
