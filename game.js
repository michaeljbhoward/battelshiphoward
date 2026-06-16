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
let gameState = {
    playerBoard: [],
    aiBoard: [],
    playerShips: [],
    aiShips: [],
    selectedShip: null,
    isHorizontal: true,
    isPlayerTurn: true,
    gameOver: false,
    placedShips: new Set(),
    aiHits: new Set(),
    aiMisses: new Set(),
    aiTargetMode: false,
    aiTargetCells: []
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
                cell.addEventListener('click', () => handleSetupClick(row, col));
                cell.addEventListener('mouseenter', () => handleSetupHover(row, col));
                cell.addEventListener('mouseleave', () => clearPreview());
            } else if (!isAI && gameState.isPlayerTurn && !gameState.gameOver) {
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
    gameState.isHorizontal = true;
    gameState.playerShips = [];
    
    const setupBoard = document.getElementById('player-board-setup');
    renderBoard(setupBoard, gameState.playerBoard, true, false);
    
    // Setup ship buttons
    document.querySelectorAll('.ship-btn').forEach(btn => {
        btn.addEventListener('click', () => selectShip(btn));
        btn.classList.remove('placed');
    });
    
    document.getElementById('start-game-btn').disabled = true;
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

function handleSetupHover(row, col) {
    if (!gameState.selectedShip) return;
    
    const ship = SHIPS[gameState.selectedShip];
    const cells = getShipCells(row, col, ship.length, gameState.isHorizontal);
    
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

function handleSetupClick(row, col) {
    if (!gameState.selectedShip) return;
    
    const ship = SHIPS[gameState.selectedShip];
    const cells = getShipCells(row, col, ship.length, gameState.isHorizontal);
    
    if (!isValidPlacement(cells)) {
        showMessage('Invalid placement! Ships cannot overlap or go off the board.');
        return;
    }
    
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
    
    renderBoard(document.getElementById('player-board-setup'), gameState.playerBoard, true, false);
    
    // Check if all ships are placed
    if (gameState.placedShips.size === Object.keys(SHIPS).length) {
        document.getElementById('start-game-btn').disabled = false;
    }
}

// Rotate ship
document.getElementById('rotate-btn').addEventListener('click', () => {
    gameState.isHorizontal = !gameState.isHorizontal;
    document.getElementById('rotate-btn').textContent = 
        `🔄 Rotate (${gameState.isHorizontal ? 'Horizontal' : 'Vertical'})`;
});

// Start game
document.getElementById('start-game-btn').addEventListener('click', startGame);

function startGame() {
    // Check if all ships are placed
    if (gameState.placedShips.size < Object.keys(SHIPS).length) {
        showMessage('Please place all your ships before starting the game!');
        return;
    }
    
    // Initialize AI board and place ships randomly
    gameState.aiBoard = createBoard();
    gameState.aiShips = [];
    // Reset player ships array to ensure clean state
    gameState.playerShips = gameState.playerShips.filter(s => s.hits < s.length);
    
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
    let validCell = false;
    
    // Keep trying until we find a valid cell
    while (!validCell) {
        if (gameState.aiTargetMode && gameState.aiTargetCells.length > 0) {
            // Target mode: attack adjacent cells
            const target = gameState.aiTargetCells.shift();
            row = target.row;
            col = target.col;
        } else {
            // Random mode
            do {
                row = Math.floor(Math.random() * BOARD_SIZE);
                col = Math.floor(Math.random() * BOARD_SIZE);
            } while (gameState.aiHits.has(`${row},${col}`) || gameState.aiMisses.has(`${row},${col}`));
        }
        
        const cell = gameState.playerBoard[row][col];
        
        if (!cell.isHit && !cell.isMiss) {
            validCell = true;
        }
    }
    
    if (cell.hasShip) {
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
        
        // Check if ship is sunk
        checkPlayerShipSunk(cell.shipName);
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
    
    if (!gameState.gameOver) {
        gameState.isPlayerTurn = true;
        updateTurnIndicator();
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
    if (!ship) return;
    
    // Don't increment if already sunk
    if (ship.hits >= ship.length) return;
    
    ship.hits++;
    
    if (ship.hits === ship.length) {
        showMessage(`AI sunk your ${ship.name}! 😢`);
    }
}

// UI updates
function updateTurnIndicator() {
    const indicator = document.getElementById('turn-indicator');
    indicator.textContent = gameState.isPlayerTurn ? 'Your Turn' : 'AI Turn';
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
    const playerRemaining = gameState.playerShips.filter(s => s.hits < s.length).length;
    const aiRemaining = gameState.aiShips.filter(s => s.hits < s.length).length;
    
    document.getElementById('player-ships').textContent = playerRemaining;
    document.getElementById('ai-ships').textContent = aiRemaining;
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

// Restart buttons
document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');
    initSetup();
});

document.getElementById('play-again-btn').addEventListener('click', () => {
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');
    initSetup();
});

// Initialize game on load
initSetup();
