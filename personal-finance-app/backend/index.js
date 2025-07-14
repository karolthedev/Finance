require("dotenv").config();
const express = require("express");
const path = require("path");
const app = express();
const pool = require("./db");

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// GET /users
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch users failed:", err.message);
    res.status(500).json({ error: "Could not fetch users" });
  }
});

// POST /users
app.post("/users", async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO users (name, email)
       VALUES ($1, $2)
       RETURNING *`,
      [name, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create user failed:", err.message);
    if (err.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Could not create user" });
  }
});

// GET /accounts
app.get("/accounts", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM accounts ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch accounts failed:", err.message);
    res.status(500).json({ error: "Could not fetch accounts" });
  }
});

// POST /accounts
app.post("/accounts", async (req, res) => {
  const { user_id, name, type, currency } = req.body;
  if (!user_id || !name || !type) {
    return res.status(400).json({ error: "User, name, and type are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO accounts (user_id, name, type, currency)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, name, type, currency || "CAD"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create account failed:", err.message);
    res.status(500).json({ error: "Could not create account" });
  }
});


app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
