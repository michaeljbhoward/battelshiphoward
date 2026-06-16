# Battleship Game

A web-based Battleship game where you can play against an AI opponent.

## How to Play

1. **Place Your Ships**: Click on a ship button at the top, then click on your board to place it. Use the rotate button to change orientation.
2. **Start the Game**: Once all 5 ships are placed, click "Start Game".
3. **Take Turns**: Click on the AI board to attack. The AI will attack your board after your turn.
4. **Win**: Sink all of the AI's ships to win!

## Ships

- Carrier (5 cells)
- Battleship (4 cells)
- Cruiser (3 cells)
- Submarine (3 cells)
- Destroyer (2 cells)

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript

## Running Locally

1. Clone this repository
2. Open `index.html` in a web browser
3. Or use a local server:
   ```bash
   python3 -m http.server 8000
   ```
   Then visit `http://localhost:8000`

## Features

- Interactive ship placement with preview
- AI opponent with smart targeting
- Hit/miss indicators
- Ship sinking notifications
- Turn-based gameplay
- Responsive design
