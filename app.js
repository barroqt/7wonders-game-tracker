const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

const dbPath = process.env.DATABASE_URL || "./7wonders.db";
const db = new sqlite3.Database(dbPath);

app.use(express.static(path.join(__dirname, "public")));

// Create or update the necessary tables
db.serialize(() => {
  // Check if the games table exists
  db.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='games'",
    (err, row) => {
      if (err) {
        console.error(err);
        return;
      }

      if (!row) {
        // If the table doesn't exist, create it with the new schema
        db.run(`CREATE TABLE games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        majid_civ TEXT,
        majid_points INTEGER,
        tito_civ TEXT,
        tito_points INTEGER,
        thomas_civ TEXT,
        thomas_points INTEGER
      )`);
      } else {
        // If the table exists, check for and add any missing columns
        const columnsToAdd = [
          "majid_civ TEXT",
          "majid_points INTEGER",
          "tito_civ TEXT",
          "tito_points INTEGER",
          "thomas_civ TEXT",
          "thomas_points INTEGER",
        ];

        columnsToAdd.forEach((column) => {
          const [columnName, columnType] = column.split(" ");
          db.run(
            `ALTER TABLE games ADD COLUMN ${columnName} ${columnType}`,
            (err) => {
              if (err && !err.message.includes("duplicate column name")) {
                console.error(
                  `Error adding column ${columnName}: ${err.message}`
                );
              }
            }
          );
        });
      }
    }
  );
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
const PLAYERS = ["Majid", "Tito", "Thomas"];

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.render("index", { civilizations: CIVILIZATIONS, players: PLAYERS });
});

app.post("/add-game", (req, res) => {
  const {
    majid_civ,
    majid_points,
    tito_civ,
    tito_points,
    thomas_civ,
    thomas_points,
  } = req.body;

  db.run(
    `INSERT INTO games (majid_civ, majid_points, tito_civ, tito_points, thomas_civ, thomas_points) 
          VALUES (?, ?, ?, ?, ?, ?)`,
    [majid_civ, majid_points, tito_civ, tito_points, thomas_civ, thomas_points],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).send("An error occurred");
      }
      // Instead of redirecting, we'll fetch and return the updated game history
      db.all(`SELECT * FROM games ORDER BY id DESC`, (err, games) => {
        if (err) {
          console.error(err);
          return res.status(500).send("An error occurred");
        }
        res.render("partials/game-history", { games, players: PLAYERS });
      });
    }
  );
});

app.get("/game-history", (req, res) => {
  db.all(`SELECT * FROM games ORDER BY id DESC`, (err, games) => {
    if (err) {
      console.error(err);
      return res.status(500).send("An error occurred");
    }
    res.render("partials/game-history", { games, players: PLAYERS });
  });
});

app.get("/stats", (req, res) => {
  db.all(
    `
    WITH player_stats AS (
      SELECT 
        'Majid' as player, 
        majid_civ as civilization, 
        COUNT(*) as total_games,
        SUM(CASE WHEN majid_points >= tito_points AND majid_points >= thomas_points THEN 1 ELSE 0 END) as wins,
        AVG(majid_points) as avg_points,
        MAX(majid_points) as max_points
      FROM games
      GROUP BY majid_civ
      UNION ALL
      SELECT 
        'Tito' as player, 
        tito_civ as civilization, 
        COUNT(*) as total_games,
        SUM(CASE WHEN tito_points >= majid_points AND tito_points >= thomas_points THEN 1 ELSE 0 END) as wins,
        AVG(tito_points) as avg_points,
        MAX(tito_points) as max_points
      FROM games
      GROUP BY tito_civ
      UNION ALL
      SELECT 
        'Thomas' as player, 
        thomas_civ as civilization, 
        COUNT(*) as total_games,
        SUM(CASE WHEN thomas_points >= majid_points AND thomas_points >= tito_points THEN 1 ELSE 0 END) as wins,
        AVG(thomas_points) as avg_points,
        MAX(thomas_points) as max_points
      FROM games
      GROUP BY thomas_civ
    )
    SELECT 
      player,
      civilization,
      total_games,
      wins,
      avg_points,
      max_points,
      SUM(wins) OVER (PARTITION BY player) as total_wins,
      SUM(total_games) OVER (PARTITION BY player) as total_games_all
    FROM player_stats
    `,
    (err, stats) => {
      if (err) {
        console.error(err);
        return res.status(500).send("An error occurred");
      }

      const playerStats = PLAYERS.reduce((acc, player) => {
        acc[player] = {
          totalWins: 0,
          totalGames: 0,
          civilizations: {},
        };
        CIVILIZATIONS.forEach((civ) => {
          acc[player].civilizations[civ] = {
            totalGames: 0,
            wins: 0,
            winrate: "0.00",
            avgPoints: "0.00",
            maxPoints: 0,
          };
        });
        return acc;
      }, {});

      stats.forEach((stat) => {
        if (stat.civilization) {
          playerStats[stat.player].civilizations[stat.civilization] = {
            totalGames: stat.total_games,
            wins: stat.wins,
            winrate:
              stat.total_games > 0
                ? ((stat.wins / stat.total_games) * 100).toFixed(2)
                : "0.00",
            avgPoints: stat.avg_points.toFixed(2),
            maxPoints: stat.max_points,
          };
          playerStats[stat.player].totalWins = stat.total_wins;
          playerStats[stat.player].totalGames = stat.total_games_all;
        }
      });

      res.render("partials/stats", {
        playerStats,
        civilizations: CIVILIZATIONS,
        players: PLAYERS,
      });
    }
  );
});

app.delete("/delete-game/:id", (req, res) => {
  const gameId = req.params.id;

  db.run("DELETE FROM games WHERE id = ?", gameId, function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send("An error occurred while deleting the game");
    }

    if (this.changes === 0) {
      return res.status(404).send("Game not found");
    }

    // After successful deletion, fetch updated game history
    db.all("SELECT * FROM games ORDER BY id DESC", (err, games) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("An error occurred while fetching updated game history");
      }

      // Render the game history partial and send it back
      res.render(
        "partials/game-history",
        { games, players: PLAYERS },
        (err, html) => {
          if (err) {
            console.error(err);
            return res
              .status(500)
              .send("An error occurred while rendering game history");
          }
          res.send(html);
        }
      );
    });
  });
});

app.listen(port, () => {
  console.log(`7 Wonders Tracker app listening at http://localhost:${port}`);
});
