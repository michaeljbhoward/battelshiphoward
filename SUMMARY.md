# Battleship vs. AI — Project Summary

---

## Slide 1 — What We Built

**A browser-based Battleship game you play against an AI opponent.**

- **Stack:** Plain HTML, CSS, and JavaScript (no frameworks, no build step) — loads instantly and deploys anywhere.
- **Gameplay:** Place your 5 ships, then trade shots with the AI until one fleet is sunk.
- **Smart AI:** Fires randomly until it scores a hit, then switches to "target mode" and hunts adjacent cells to finish off your ships — like a real player.
- **Polished UX:**
  - **Drag-to-place** ships — drag sideways for horizontal, up/down for vertical (no clunky rotate button).
  - **Live placement preview** (blue = valid, red = invalid) and an **Undo** button.
  - **Name entry**, turn indicator, hit/miss/sunk messages, and a **popup** if you start before placing all ships.
  - **Responsive layout** that fits the screen without scrolling.
- **Shipped:** Live on the web + full source in a public GitHub repo.

---

## Slide 2 — Bugs Found & How We Fixed Them

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 1 | **AI turn crashed the game** | `cell` was declared with `const` *inside* a `while` loop but used *outside* it → `ReferenceError` on every AI move | Re-declared `cell` in the correct scope after the loop |
| 2 | **AI could freeze / stack-overflow** | AI re-picked already-hit cells via infinite *recursion* | Replaced recursion with a `while` loop that retries until a valid cell is found |
| 3 | **Ship counts went wrong across games** | `playerShips` array was never reset on a new game, so ships accumulated | Reset all placement state in `initSetup()` |
| 4 | **Hit counts overflowed** | A sunk ship could keep incrementing its hit total | Added a guard: stop counting once `hits >= length` |
| 5 | **Buttons/features "didn't work"** | Event listeners ran before the DOM existed; Start button was hard-disabled | Centralized wiring in one `init()` that runs on `DOMContentLoaded` |
| 6 | **Edits never appeared in the browser** | Dev server returned cached `304`s, serving stale files | Built a **no-cache dev server** + versioned assets so the latest always loads |
| 7 | **Had to scroll up/down to play** | Fixed sizing overflowed shorter screens | Sized the board from leftover viewport height; locked layout to one screen |

**Process:** Found issues through code review + live testing, fixed the **root cause** (not symptoms) each time, and verified in the browser after every change.
