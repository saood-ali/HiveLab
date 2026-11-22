# Contri
# HiveLab

An interactive web visualizer for the Artificial Bee Colony (ABC) optimization algorithm.

HiveLab is a browser-based educational tool that lets you step through the ABC algorithm one move at a time. It visualizes how a bee swarm explores an objective surface, shares food source quality, and avoids getting trapped in local minima.

Everything runs locally in your browser with pure client-side code and no background automation. The algorithm only advances when you click Next Step or press the right arrow key.

---
##  Demo Video 



https://github.com/user-attachments/assets/8d25d7fc-c476-4738-884d-9647662e53cc




## How It Works

The ABC algorithm solves optimization problems by simulating how honey bees forage for nectar:

1. **Employed Bees:** Each employed bee explores the neighbourhood of an assigned food source. If a newly discovered spot has higher fitness, the bee moves there; otherwise, it stays put and increments a trial counter.
2. **Onlooker Bees:** Back at the hive, onlooker bees watch waggle dances. Food sources with higher fitness have a higher probability of being chosen. When an onlooker selects a source, it searches nearby just like an employed bee.
3. **Scout Bees:** If a food source cannot be improved after a set number of attempts (exceeding the abandonment limit), it is abandoned. A scout bee flies out to find a brand-new random food source to keep the search alive.

---

## Key Features

- **Problem Selection:** Choose from standard 2D benchmark functions:
  - **Sphere:** Smooth convex surface with a single global minimum at (0, 0).
  - **Rosenbrock:** Curved "banana valley" testing navigation through narrow terrain.
  - **Rastrigin:** Highly multimodal surface with many local traps.
- **Configurable Parameters:** Adjust colony size, maximum cycles, abandonment limit, variable bounds, and random seed with instant input validation.
- **2D Contour Landscape:** Interactive plot showing food source coordinates, candidate moves, green arrows for accepted solutions, red arrows for rejected attempts, and blue arrows for scout discoveries.
- **Bee Decision Inspector:** Detailed breakdown for every step showing the partner bee chosen, random weight, boundary clipping, objective/fitness calculations, and whether the move was accepted or rejected.
- **Colony Analytics:** Live population table, comparative fitness and selection probability bars, and a convergence chart tracking the best objective value over cycles.
- **Worked Example:** A built-in, step-by-step walkthrough of a full ABC cycle with clear mathematical calculations alongside the landscape plot.
- **Keyboard Shortcuts:**
  - `Right Arrow` or `Space`: Next Step
  - `Left Arrow`: Back
  - `R`: Reset simulation

---

## Quick Start

Make sure you have Node.js (version 18 or newer) installed.

```bash
# Clone the repository
git clone https://github.com/your-username/HiveLab.git

# Navigate to the project directory
cd HiveLab/actual-project-codebase

# Install dependencies
npm install

# Start the local development server
npm run dev
```

Open `http://localhost:5173` in your browser to start using HiveLab.

---

## Built With

- **React 18**
- **Vite**
- **GSAP** (subtle UI micro-animations)
- **Plain JavaScript & CSS**

---

## License

MIT License
