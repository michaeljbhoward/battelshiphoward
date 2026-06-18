// Battleship Game Logic

const BOARD_SIZE = 10;
const SHIPS = {
    carrier: { length: 5, name: 'Carrier' },
    battleship: { length: 4, name: 'Battleship' },
    cruiser: { length: 3, name: 'Cruiser' },
    submarine: { length: 3, name: 'Submarine' },
    destroyer: { length: 2, name: 'Destroyer' }
};

// Game state
const gameState = {
    playerBoard: [],
    aiBoard: [],
    playerShips: [],
    aiShips: [],
    selectedShip: null,
    isPlayerTurn: true,
    gameOver: false,
    placedShips: new Set(),
    aiHits: new Set(),
    aiMisses: new Set(),
    aiTargetMode: false,
    aiTargetCells: [],
    playerName: '',
    placementHistory: [],
    dragging: false,
    dragStart: null,
    dragOrientation: true,
    currentOrientation: true,
    lastHoverCell: null
};

// Initialize boards
function createBoard() {
    return Array(BOARD_SIZE).fill(null).map(() => 
        Array(BOARD_SIZE).fill(null).map(() => ({
            hasShip: false,
            shipName: null,
            isHit: false,
            isMiss: false
        }))
    );
}

// Render board
function renderBoard(boardElement, board, isSetup = false, isAI = false) {
    boardElement.innerHTML = '';
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const cellData = board[row][col];
            
            if (cellData.hasShip && !isAI) {
                cell.classList.add('ship');
            }
            
            if (cellData.isHit) {
                cell.classList.add('hit');
            }
            
            if (cellData.isMiss) {
                cell.classList.add('miss');
            }
            
            if (isSetup) {
                cell.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    handleSetupDragStart(row, col);
                });
                cell.addEventListener('mouseenter', () => handleSetupCellEnter(row, col));
                cell.addEventListener('mouseleave', () => {
                    if (!gameState.dragging) clearPreview();
                });
                cell.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    handleSetupDragStart(row, col);
                }, { passive: false });
            } else if (isAI) {
                // Always listen; handlePlayerAttack guards turn/game-over state
                cell.addEventListener('click', () => handlePlayerAttack(row, col));
            }
            
            boardElement.appendChild(cell);
        }
    }
}

// Setup phase
function initSetup() {
    gameState.playerBoard = createBoard();
    gameState.placedShips = new Set();
    gameState.selectedShip = null;
    gameState.playerShips = [];
    gameState.placementHistory = [];
    gameState.playerName = '';
    gameState.dragging = false;
    gameState.dragStart = null;
    gameState.dragOrientation = true;
    gameState.currentOrientation = true;
    gameState.lastHoverCell = null;
    gameState.gameOver = false;
    gameState.isPlayerTurn = true;
    gameState.aiHits = new Set();
    gameState.aiMisses = new Set();
    gameState.aiTargetMode = false;
    gameState.aiTargetCells = [];
    
    const setupBoard = document.getElementById('player-board-setup');
    renderBoard(setupBoard, gameState.playerBoard, true, false);
    
    // Setup ship buttons (use onclick to avoid stacking listeners across games)
    document.querySelectorAll('.ship-btn').forEach(btn => {
        btn.onclick = () => selectShip(btn);
        btn.classList.remove('placed');
        btn.classList.remove('selected');
    });
    
    // Enable start button - validation will happen on click
    document.getElementById('start-game-btn').disabled = false;
    
    // Reset undo button
    document.getElementById('undo-btn').disabled = true;
    
    // Reset name input
    document.getElementById('player-name').value = '';
}

function selectShip(btn) {
    const shipName = btn.dataset.ship;
    
    if (gameState.placedShips.has(shipName)) {
        return;
    }
    
    document.querySelectorAll('.ship-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    gameState.selectedShip = shipName;
}

// Show a preview of where the ship would be placed
function showPlacementPreview(row, col, isHorizontal) {
    if (!gameState.selectedShip) return;
    
    const ship = SHIPS[gameState.selectedShip];
    const cells = getShipCells(row, col, ship.length, isHorizontal);
    
    clearPreview();
    
    const isValid = isValidPlacement(cells);
    const board = document.getElementById('player-board-setup');
    
    cells.forEach(([r, c]) => {
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            const cell = board.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                cell.classList.add(isValid ? 'preview' : 'preview-invalid');
            }
        }
    });
}

// Begin placing a ship: press down on the starting cell
function handleSetupDragStart(row, col) {
    if (!gameState.selectedShip) return;
    
    gameState.dragging = true;
    gameState.dragStart = { row, col };
    // Start from the current orientation; dragging can change it
    gameState.dragOrientation = gameState.currentOrientation;
    showPlacementPreview(row, col, gameState.dragOrientation);
}

// While hovering/dragging across cells
function handleSetupCellEnter(row, col) {
    if (!gameState.selectedShip) return;
    
    gameState.lastHoverCell = { row, col };
    
    if (gameState.dragging && gameState.dragStart) {
        const dr = row - gameState.dragStart.row;
        const dc = col - gameState.dragStart.col;
        // Only change orientation once the drag actually leaves the start cell
        if (dr !== 0 || dc !== 0) {
            const isHorizontal = Math.abs(dc) >= Math.abs(dr);
            gameState.dragOrientation = isHorizontal;
            gameState.currentOrientation = isHorizontal;
        }
        showPlacementPreview(gameState.dragStart.row, gameState.dragStart.col, gameState.dragOrientation);
    } else {
        // Not dragging: preview under the cursor in the current orientation
        showPlacementPreview(row, col, gameState.currentOrientation);
    }
}

// Flip orientation (R key / right-click) and refresh the preview in place
function toggleOrientation() {
    gameState.currentOrientation = !gameState.currentOrientation;
    gameState.dragOrientation = gameState.currentOrientation;
    if (gameState.dragging && gameState.dragStart) {
        showPlacementPreview(gameState.dragStart.row, gameState.dragStart.col, gameState.currentOrientation);
    } else if (gameState.lastHoverCell && gameState.selectedShip) {
        showPlacementPreview(gameState.lastHoverCell.row, gameState.lastHoverCell.col, gameState.currentOrientation);
    }
}

// Release to place the ship
function handleSetupDragEnd() {
    if (!gameState.dragging) return;
    gameState.dragging = false;
    
    const start = gameState.dragStart;
    gameState.dragStart = null;
    
    if (!gameState.selectedShip || !start) return;
    
    placeShipAt(start.row, start.col, gameState.dragOrientation);
}

function clearPreview() {
    const board = document.getElementById('player-board-setup');
    board.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('preview', 'preview-invalid');
    });
}

function getShipCells(row, col, length, isHorizontal) {
    const cells = [];
    for (let i = 0; i < length; i++) {
        if (isHorizontal) {
            cells.push([row, col + i]);
        } else {
            cells.push([row + i, col]);
        }
    }
    return cells;
}

function isValidPlacement(cells) {
    for (const [row, col] of cells) {
        if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
            return false;
        }
        if (gameState.playerBoard[row][col].hasShip) {
            return false;
        }
    }
    return true;
}

function placeShipAt(row, col, isHorizontal) {
    if (!gameState.selectedShip) return;
    
    const ship = SHIPS[gameState.selectedShip];
    const cells = getShipCells(row, col, ship.length, isHorizontal);
    
    if (!isValidPlacement(cells)) {
        clearPreview();
        showModal('Invalid Placement', 'Ships cannot overlap or go off the board.');
        return;
    }
    
    // Save placement history for undo
    gameState.placementHistory.push({
        shipName: gameState.selectedShip,
        cells: cells.map(([r, c]) => [r, c]),
        isHorizontal: isHorizontal
    });
    
    // Place the ship
    cells.forEach(([r, c]) => {
        gameState.playerBoard[r][c].hasShip = true;
        gameState.playerBoard[r][c].shipName = gameState.selectedShip;
    });
    
    // Mark ship as placed
    gameState.placedShips.add(gameState.selectedShip);
    gameState.playerShips.push({
        name: gameState.selectedShip,
        cells: cells,
        hits: 0,
        length: ship.length
    });
    
    // Update UI
    const btn = document.querySelector(`[data-ship="${gameState.selectedShip}"]`);
    btn.classList.add('placed');
    btn.classList.remove('selected');
    gameState.selectedShip = null;
    
    // Enable undo button
    document.getElementById('undo-btn').disabled = false;
    
    renderBoard(document.getElementById('player-board-setup'), gameState.playerBoard, true, false);
}

function undoLastPlacement() {
    if (gameState.placementHistory.length === 0) return;
    
    const lastPlacement = gameState.placementHistory.pop();
    
    // Remove ship from board
    lastPlacement.cells.forEach(([r, c]) => {
        gameState.playerBoard[r][c].hasShip = false;
        gameState.playerBoard[r][c].shipName = null;
    });
    
    // Remove from placed ships
    gameState.placedShips.delete(lastPlacement.shipName);
    
    // Remove from player ships array
    gameState.playerShips = gameState.playerShips.filter(s => s.name !== lastPlacement.shipName);
    
    // Update UI
    const btn = document.querySelector(`[data-ship="${lastPlacement.shipName}"]`);
    btn.classList.remove('placed');
    
    // Disable undo button if no more placements
    if (gameState.placementHistory.length === 0) {
        document.getElementById('undo-btn').disabled = true;
    }
    
    renderBoard(document.getElementById('player-board-setup'), gameState.playerBoard, true, false);
}

// Modal functions
function showModal(title, message) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    document.getElementById('modal').classList.remove('hidden');
}

function hideModal() {
    document.getElementById('modal').classList.add('hidden');
}

function startGame() {
    // Get player name
    const nameInput = document.getElementById('player-name');
    gameState.playerName = nameInput.value.trim() || 'Player';
    
    // Check if all ships are placed
    if (gameState.placedShips.size < Object.keys(SHIPS).length) {
        const remaining = Object.keys(SHIPS).length - gameState.placedShips.size;
        showModal('Ships Not Placed', `Please place all ${Object.keys(SHIPS).length} ships before starting the game. You still need to place ${remaining} ship(s).`);
        return;
    }
    
    // Initialize AI board and place ships randomly
    gameState.aiBoard = createBoard();
    gameState.aiShips = [];
    
    for (const [shipName, ship] of Object.entries(SHIPS)) {
        placeAIShip(shipName, ship.length);
    }
    
    // Switch screens
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    
    // Render game boards
    renderBoard(document.getElementById('player-board'), gameState.playerBoard, false, false);
    renderBoard(document.getElementById('ai-board'), gameState.aiBoard, false, true);
    
    gameState.isPlayerTurn = true;
    gameState.gameOver = false;
    gameState.aiHits = new Set();
    gameState.aiMisses = new Set();
    gameState.aiTargetMode = false;
    gameState.aiTargetCells = [];
    
    updateTurnIndicator();
    updateStats();
}

function placeAIShip(shipName, length) {
    let placed = false;
    
    while (!placed) {
        const isHorizontal = Math.random() < 0.5;
        const row = Math.floor(Math.random() * BOARD_SIZE);
        const col = Math.floor(Math.random() * BOARD_SIZE);
        
        const cells = getShipCells(row, col, length, isHorizontal);
        
        if (isValidAIPlacement(cells)) {
            cells.forEach(([r, c]) => {
                gameState.aiBoard[r][c].hasShip = true;
                gameState.aiBoard[r][c].shipName = shipName;
            });
            
            gameState.aiShips.push({
                name: shipName,
                cells: cells,
                hits: 0,
                length: length
            });
            
            placed = true;
        }
    }
}

function isValidAIPlacement(cells) {
    for (const [row, col] of cells) {
        if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
            return false;
        }
        if (gameState.aiBoard[row][col].hasShip) {
            return false;
        }
    }
    return true;
}

// Player attack
function handlePlayerAttack(row, col) {
    if (!gameState.isPlayerTurn || gameState.gameOver) return;
    
    const cell = gameState.aiBoard[row][col];
    
    if (cell.isHit || cell.isMiss) {
        showMessage('You already attacked this cell!');
        return;
    }
    
    if (cell.hasShip) {
        cell.isHit = true;
        showMessage('Hit! 🎯');
        
        // Check if ship is sunk
        checkAIShipSunk(cell.shipName);
    } else {
        cell.isMiss = true;
        showMessage('Miss! 💨');
        gameState.isPlayerTurn = false;
        updateTurnIndicator();
        
        // AI's turn
        setTimeout(aiTurn, 1000);
    }
    
    renderBoard(document.getElementById('ai-board'), gameState.aiBoard, false, true);
    updateStats();
    checkGameOver();
}

function checkAIShipSunk(shipName) {
    const ship = gameState.aiShips.find(s => s.name === shipName);
    if (!ship) return;
    
    // Don't increment if already sunk
    if (ship.hits >= ship.length) return;
    
    ship.hits++;
    
    if (ship.hits === ship.length) {
        showMessage(`You sunk the AI's ${ship.name}! 🚢💥`);
    }
}

// AI turn
function aiTurn() {
    if (gameState.gameOver) return;
    
    let row, col;
    
    // Prefer target-mode cells that haven't been attacked yet
    while (gameState.aiTargetMode && gameState.aiTargetCells.length > 0) {
        const target = gameState.aiTargetCells.shift();
        const candidate = gameState.playerBoard[target.row][target.col];
        if (!candidate.isHit && !candidate.isMiss) {
            row = target.row;
            col = target.col;
            break;
        }
    }
    
    // Otherwise pick a random un-attacked cell (no infinite-loop risk)
    if (row === undefined) {
        const available = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const candidate = gameState.playerBoard[r][c];
                if (!candidate.isHit && !candidate.isMiss) {
                    available.push({ row: r, col: c });
                }
            }
        }
        if (available.length === 0) return; // safety: nothing left to attack
        const pick = available[Math.floor(Math.random() * available.length)];
        row = pick.row;
        col = pick.col;
        if (gameState.aiTargetCells.length === 0) {
            gameState.aiTargetMode = false;
        }
    }
    
    const cell = gameState.playerBoard[row][col];
    let wasHit = false;
    
    if (cell.hasShip) {
        wasHit = true;
        cell.isHit = true;
        gameState.aiHits.add(`${row},${col}`);
        showMessage('AI hit your ship! 💥');
        
        // Enter target mode and add adjacent cells
        gameState.aiTargetMode = true;
        const adjacent = getAdjacentCells(row, col);
        adjacent.forEach(adj => {
            const key = `${adj.row},${adj.col}`;
            // Check if not already attacked and not already in target list
            if (!gameState.aiHits.has(key) && !gameState.aiMisses.has(key)) {
                const alreadyInTarget = gameState.aiTargetCells.some(t => t.row === adj.row && t.col === adj.col);
                if (!alreadyInTarget) {
                    gameState.aiTargetCells.push(adj);
                }
            }
        });
        
        // Check if ship is sunk; stop hunting around a finished ship
        const sunk = checkPlayerShipSunk(cell.shipName);
        if (sunk) {
            gameState.aiTargetMode = false;
            gameState.aiTargetCells = [];
        }
    } else {
        cell.isMiss = true;
        gameState.aiMisses.add(`${row},${col}`);
        showMessage('AI missed! 😌');
        
        if (gameState.aiTargetCells.length === 0) {
            gameState.aiTargetMode = false;
        }
    }
    
    renderBoard(document.getElementById('player-board'), gameState.playerBoard, false, false);
    updateStats();
    checkGameOver();
    
    if (gameState.gameOver) return;
    
    if (wasHit) {
        // A hit earns another shot — same rule the player enjoys
        setTimeout(aiTurn, 1000);
    } else {
        gameState.isPlayerTurn = true;
        updateTurnIndicator();
        // Re-render the opponent board so attack clicks work again
        renderBoard(document.getElementById('ai-board'), gameState.aiBoard, false, true);
    }
}

function getAdjacentCells(row, col) {
    const adjacent = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    for (const [dr, dc] of directions) {
        const newRow = row + dr;
        const newCol = col + dc;
        
        if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
            adjacent.push({ row: newRow, col: newCol });
        }
    }
    
    return adjacent;
}

function checkPlayerShipSunk(shipName) {
    const ship = gameState.playerShips.find(s => s.name === shipName);
    if (!ship) return false;
    
    // Don't increment if already sunk
    if (ship.hits >= ship.length) return false;
    
    ship.hits++;
    
    if (ship.hits === ship.length) {
        showMessage(`AI sunk your ${ship.name}! 😢`);
        return true;
    }
    return false;
}

// UI updates
function updateTurnIndicator() {
    const indicator = document.getElementById('turn-indicator');
    const displayName = gameState.playerName || 'Player';
    indicator.textContent = gameState.isPlayerTurn ? `${displayName}'s Turn` : 'AI Turn';
    indicator.style.color = gameState.isPlayerTurn ? '#00d4ff' : '#ff6b6b';
}

function showMessage(msg) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = msg;
    setTimeout(() => {
        if (messageEl.textContent === msg) {
            messageEl.textContent = '';
        }
    }, 3000);
}

function updateStats() {
    const totalShips = Object.keys(SHIPS).length;
    const playerSunk = gameState.playerShips.filter(s => s.hits >= s.length).length;
    const aiSunk = gameState.aiShips.filter(s => s.hits >= s.length).length;
    const playerRemaining = gameState.playerShips.length - playerSunk;
    const aiRemaining = gameState.aiShips.length - aiSunk;
    
    document.getElementById('player-ships').textContent = playerRemaining;
    document.getElementById('ai-ships').textContent = aiRemaining;
    
    // Scoreboard: how many enemy ships each side has sunk
    const playerSunkEl = document.getElementById('player-sunk');
    const aiSunkEl = document.getElementById('ai-sunk');
    if (playerSunkEl) playerSunkEl.textContent = aiSunk;
    if (aiSunkEl) aiSunkEl.textContent = playerSunk;
    
    document.querySelectorAll('.score-total').forEach(el => {
        el.textContent = `/ ${totalShips}`;
    });
    
    const scoreName = document.getElementById('score-player-name');
    if (scoreName) scoreName.textContent = gameState.playerName || 'You';
}

function checkGameOver() {
    const playerRemaining = gameState.playerShips.filter(s => s.hits < s.length).length;
    const aiRemaining = gameState.aiShips.filter(s => s.hits < s.length).length;
    
    if (playerRemaining === 0 || aiRemaining === 0) {
        gameState.gameOver = true;
        
        const gameOverScreen = document.getElementById('game-over-screen');
        const title = document.getElementById('game-over-title');
        const message = document.getElementById('game-over-message');
        
        document.getElementById('game-screen').classList.add('hidden');
        gameOverScreen.classList.remove('hidden');
        
        if (playerRemaining === 0) {
            gameOverScreen.classList.add('loser');
            gameOverScreen.classList.remove('winner');
            title.textContent = 'Game Over - You Lost! 😢';
            message.textContent = 'The AI sank all your ships. Better luck next time!';
        } else {
            gameOverScreen.classList.add('winner');
            gameOverScreen.classList.remove('loser');
            title.textContent = 'Congratulations! You Won! 🎉';
            message.textContent = 'You sank all the AI ships!';
        }
    }
}

// Wire up all event listeners and start the game
function init() {
    // Finish ship placement when the mouse/touch is released anywhere
    document.addEventListener('mouseup', handleSetupDragEnd);
    document.addEventListener('touchend', handleSetupDragEnd);

    // Track finger movement across cells during a touch drag
    document.addEventListener('touchmove', (e) => {
        if (!gameState.dragging) return;
        const touch = e.touches[0];
        if (!touch) return;
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && target.classList.contains('cell') && target.dataset.row !== undefined) {
            handleSetupCellEnter(parseInt(target.dataset.row, 10), parseInt(target.dataset.col, 10));
        }
    }, { passive: true });

    // Press "R" to rotate the ship orientation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') {
            toggleOrientation();
        }
    });

    // Right-click on the setup board also flips orientation
    const setupBoard = document.getElementById('player-board-setup');
    if (setupBoard) {
        setupBoard.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            toggleOrientation();
        });
    }

    // Modal close button
    const modalCloseBtn = document.getElementById('modal-close-btn');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', hideModal);
    }

    // Undo button
    const undoBtn = document.getElementById('undo-btn');
    if (undoBtn) {
        undoBtn.addEventListener('click', undoLastPlacement);
    }

    // Start game button
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', startGame);
    }

    // Play again button
    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            document.getElementById('game-over-screen').classList.add('hidden');
            document.getElementById('setup-screen').classList.remove('hidden');
            initSetup();
        });
    }

    // Restart button
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            document.getElementById('game-screen').classList.add('hidden');
            document.getElementById('setup-screen').classList.remove('hidden');
            initSetup();
        });
    }

    initSetup();
}

// Run init whether or not the DOM has already finished loading
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
