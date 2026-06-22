const { test, expect } = require('@playwright/test');

const SHIP_ROWS = [
  ['carrier', 0],
  ['battleship', 1],
  ['cruiser', 2],
  ['submarine', 3],
  ['destroyer', 4],
];

/** Place all five ships horizontally, each starting at column 0 of its own row. */
async function placeAllShips(page) {
  for (const [ship, row] of SHIP_ROWS) {
    await page.locator(`.ship-btn[data-ship="${ship}"]`).click();
    await page
      .locator(`#player-board-setup .cell[data-row="${row}"][data-col="0"]`)
      .click();
    // Button should now be marked placed
    await expect(page.locator(`.ship-btn[data-ship="${ship}"]`)).toHaveClass(/placed/);
  }
}

/** Start a game with all ships placed; returns once the game screen is visible. */
async function startGame(page, name = 'Tester') {
  await page.goto('/');
  await page.locator('#player-name').fill(name);
  await placeAllShips(page);
  await page.locator('#start-game-btn').click();
  await expect(page.locator('#game-screen')).toBeVisible();
}

test.describe('Battleship UI', () => {
  test('setup: all ships placed and game starts', async ({ page }) => {
    await startGame(page);
    await expect(page.locator('#ai-board .cell')).toHaveCount(100);
    await expect(page.locator('#player-board .cell')).toHaveCount(100);
    await expect(page.locator('#turn-indicator')).toContainText("Tester");
  });

  test('player can win by sinking every AI ship', async ({ page }) => {
    await startGame(page);

    const aiShipCells = await page.evaluate(() =>
      window.gameState.aiShips.flatMap((s) => s.cells)
    );
    expect(aiShipCells.length).toBe(17); // 5+4+3+3+2

    for (const [r, c] of aiShipCells) {
      await page.locator(`#ai-board .cell[data-row="${r}"][data-col="${c}"]`).click();
    }

    await expect(page.locator('#game-over-screen')).toBeVisible();
    await expect(page.locator('#game-over-title')).toContainText('Won');
    // Score should reflect all 5 enemy ships sunk
    await expect(page.locator('#player-sunk')).toHaveText('5');
  });

  test('re-attacking the same cell is rejected', async ({ page }) => {
    await startGame(page);
    const target = await page.evaluate(() => {
      const cells = window.gameState.aiShips[0].cells;
      return cells[0];
    });
    const sel = `#ai-board .cell[data-row="${target[0]}"][data-col="${target[1]}"]`;
    await page.locator(sel).click();
    await expect(page.locator(sel)).toHaveClass(/hit/);
    // Click again -> should show the "already attacked" message
    await page.locator(sel).click();
    await expect(page.locator('#message')).toContainText('already attacked');
  });

  test('R key rotates orientation (vertical placement)', async ({ page }) => {
    await page.goto('/');
    await page.locator('.ship-btn[data-ship="cruiser"]').click();
    await page.keyboard.press('r'); // flip to vertical
    await page
      .locator('#player-board-setup .cell[data-row="2"][data-col="2"]')
      .click();

    const cells = await page.evaluate(
      () => window.gameState.playerShips.find((s) => s.name === 'cruiser').cells
    );
    // All cells share the same column and span consecutive rows => vertical
    const cols = new Set(cells.map((c) => c[1]));
    const rows = cells.map((c) => c[0]).sort((a, b) => a - b);
    expect(cols.size).toBe(1);
    expect(rows).toEqual([2, 3, 4]);
  });

  test('regression: New Game during the AI delay does not cause a false loss', async ({
    page,
  }) => {
    await startGame(page);

    // Find an AI cell with no ship -> guarantees a miss, which schedules the AI turn
    const emptyCell = await page.evaluate(() => {
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          if (!window.gameState.aiBoard[r][c].hasShip) return { r, c };
        }
      }
      return null;
    });
    expect(emptyCell).not.toBeNull();

    await page
      .locator(`#ai-board .cell[data-row="${emptyCell.r}"][data-col="${emptyCell.c}"]`)
      .click();
    await expect(page.locator('#turn-indicator')).toContainText('AI');

    // Immediately restart while the AI's 1s timer is pending
    await page.locator('#restart-btn').click();
    await expect(page.locator('#setup-screen')).toBeVisible();

    // Wait past the original AI delay; no spurious game-over should appear
    await page.waitForTimeout(1500);
    await expect(page.locator('#game-over-screen')).toBeHidden();
    await expect(page.locator('#setup-screen')).toBeVisible();
  });
});
