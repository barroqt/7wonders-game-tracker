const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const port = 3000;

// Set up the database
const db = new sqlite3.Database("7wonders.db");

// Create the necessary tables if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS game_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER,
    player TEXT,
    civilization TEXT,
    points INTEGER,
    FOREIGN KEY(game_id) REFERENCES games(id)
  )`);
});

const CIVILIZATIONS = [
  "Gizeh",
  "Ephesos",
  "Halikarnassus",
  "Babylon",
  "Olympia",
  "Rhodos",
  "Alexandria",
];

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  db.all("SELECT * FROM games", (err, games) => {
    if (err) {
      console.error(err);
      return res.status(500).send("An error occurred");
    }
    res.render("index", { games, civilizations: CIVILIZATIONS });
  });
});

app.post("/add-game", (req, res) => {
  const { players } = req.body;

  db.run("INSERT INTO games DEFAULT VALUES", function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send("An error occurred");
    }

    const gameId = this.lastID;
    const stmt = db.prepare(
      "INSERT INTO game_players (game_id, player, civilization, points) VALUES (?, ?, ?, ?)"
    );

    players.forEach((player) => {
      stmt.run(gameId, player.name, player.civilization, player.points);
    });

    stmt.finalize();

    res.redirect("/");
  });
});

app.get("/game-history", (req, res) => {
  db.all(
    `
    SELECT g.id, gp.player, gp.civilization, gp.points
    FROM games g
    JOIN game_players gp ON g.id = gp.game_id
    ORDER BY g.id DESC, gp.points DESC
  `,
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).send("An error occurred");
      }

      const games = rows.reduce((acc, row) => {
        if (!acc[row.id]) {
          acc[row.id] = { id: row.id, players: [] };
        }
        acc[row.id].players.push({
          name: row.player,
          civilization: row.civilization,
          points: row.points,
        });
        return acc;
      }, {});

      res.render("partials/game-history", { games: Object.values(games) });
    }
  );
});

app.get("/stats", (req, res) => {
  db.all(
    `
    SELECT gp.player, gp.civilization, 
           COUNT(*) as total_games,
           SUM(CASE WHEN gp.points = max_points.max_points THEN 1 ELSE 0 END) as wins,
           AVG(gp.points) as avg_points,
           MAX(gp.points) as max_points
    FROM game_players gp
    JOIN (
      SELECT game_id, MAX(points) as max_points
      FROM game_players
      GROUP BY game_id
    ) max_points ON gp.game_id = max_points.game_id
    GROUP BY gp.player, gp.civilization
  `,
    (err, stats) => {
      if (err) {
        console.error(err);
        return res.status(500).send("An error occurred");
      }

      const playerStats = stats.reduce((acc, stat) => {
        if (!acc[stat.player]) {
          acc[stat.player] = {};
        }
        acc[stat.player][stat.civilization] = {
          totalGames: stat.total_games,
          wins: stat.wins,
          winrate: ((stat.wins / stat.total_games) * 100).toFixed(2),
          avgPoints: stat.avg_points.toFixed(2),
          maxPoints: stat.max_points,
        };
        return acc;
      }, {});

      res.render("partials/stats", {
        playerStats,
        civilizations: CIVILIZATIONS,
      });
    }
  );
});

app.listen(port, () => {
  console.log(`7 Wonders Tracker app listening at http://localhost:3000`);
});
