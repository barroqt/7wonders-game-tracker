# 7 Wonders Game Tracker

## Description

The 7 Wonders Game Tracker is a web application designed to record and analyze games of the board game "7 Wonders".

This tool allows players to input their game results, including player names, chosen civilizations, and final scores.
It then provides a comprehensive history of all recorded games and generates statistics to give insights into player performance and civilization effectiveness.

## Why?

After countless games of 7 wonders with my friends, we wanted to answer questions like:

- What is my winrate with that wonder?
- Is it me or I keep loosing with Babylon?
- Is Rhodos OP?

So now whenever we finish a game I input the results (or write them down and input later) in order to let the data speak for itself.
We have discovered many things about our playstyles since then.

Although the UI is kinda sus at the moment, I hope this can help other 7 wonders players keep track of their games and get some juicy hindsights.

## Installation

### Prerequisites

- Node.js (v14 or later recommended)
- pnpm (v6 or later)

If you don't have Node.js installed, download and install it from [nodejs.org](https://nodejs.org/).

If you don't have pnpm installed, you can install it globally using npm:

```bash
npm install -g pnpm
```

### Setup

1. Clone the repository:

```bash
git clone https://github.com/barroqt/7wonders-game-tracker.git
cd 7wonders-game-tracker
```

2. Install dependencies:

```bash
pnpm install
```

### Running the Application

1. Start the server:

```bash
pnpm start
```

2. Open your web browser and navigate to `http://localhost:3000`
