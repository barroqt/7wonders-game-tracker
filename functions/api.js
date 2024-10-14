const express = require("express");
const serverless = require("serverless-http");
const path = require("path");

const app = express();

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.get("/api", (req, res) => {
  res.json({ message: "Welcome to 7 Wonders Tracker API" });
});
