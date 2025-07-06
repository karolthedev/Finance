//index.js
const express = require("express");
require("dotenv").config();
const pool = require("./db.js");

const app = express();
const port = process.env.PORT;

app.use(express.json());

//Check DB connection
app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ status: "ok"});
    } catch (err) {
        res.status(500).json({ error: "DB connection failed"});
    }
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);  
});

//Create new users
app.post("/users", async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
      [name, email]
    );

    // Only respond if insert worked
    if (result.rows && result.rows.length > 0) {
      return res.status(201).json(result.rows[0]);
    } else {
      return res.status(500).json({ error: "User creation failed" });
    }
  } catch (err) {
    // Handle duplicate email error
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email already exists" });
    }

    console.error("Create user failed:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

//Create new accounts
app.post("/accounts", async (req, res) => {
  const { user_id, name, type, currency } = req.body;

  if (!user_id || !name || !type) {
    return res.status(400).json({ error: "user_id, name, and type are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO accounts (user_id, name, type, currency)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, name, type, currency || 'CAD']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create account failed:", err.message);
    res.status(500).json({ error: "Could not create account" });
  }
});

//Create new transactions
app.post("/transactions", async (req, res) => {
  const { account_id, amount, description, category, date } = req.body;

  if (!account_id || !amount) {
    return res.status(400).json({ error: "account_id and amount are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO transactions (account_id, amount, description, category, date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [account_id, amount, description || '', category || '', date || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create transaction failed:", err.message);
    res.status(500).json({ error: "Could not create transaction" });
  }
});

//List transactions for one account
app.get("/accounts/:id/transactions", async (req, res) => {
  const accountId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT * FROM transactions
       WHERE account_id = $1
       ORDER BY date DESC`,
      [accountId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch transactions failed:", err.message);
    res.status(500).json({ error: "Could not fetch transactions" });
  }
});

//List the cashflow 
app.get("/accounts/:id/cashflow", async (req, res) => {
  const accountId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS cashflow
       FROM transactions
       WHERE account_id = $1`,
      [accountId]
    );

    res.json({ account_id: accountId, cashflow: parseFloat(result.rows[0].cashflow) });
  } catch (err) {
    console.error("Fetch cashflow failed:", err.message);
    res.status(500).json({ error: "Could not fetch cashflow" });
  }
});

//List the account with cashflow
app.get("/users/:id/accounts", async (req, res) => {
  const userId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT a.*, 
              COALESCE(SUM(t.amount), 0) AS cashflow
       FROM accounts a
       LEFT JOIN transactions t ON t.account_id = a.id
       WHERE a.user_id = $1
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch accounts failed:", err.message);
    res.status(500).json({ error: "Could not fetch accounts" });
  }
});

//Get account infor
app.get("/accounts/:id/details", async (req, res) => {
  const accountId = req.params.id;

  try {
    const accountResult = await pool.query(
      `SELECT * FROM accounts WHERE id = $1`,
      [accountId]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    const transactionsResult = await pool.query(
      `SELECT * FROM transactions
       WHERE account_id = $1
       ORDER BY date DESC`,
      [accountId]
    );

    res.json({
      ...accountResult.rows[0],
      transactions: transactionsResult.rows,
    });
  } catch (err) {
    console.error("Fetch account details failed:", err.message);
    res.status(500).json({ error: "Could not fetch account details" });
  }
});

//Delete a transaction
app.delete("/transactions/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query(
      `DELETE FROM transactions WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error("Delete transaction failed:", err.message);
    res.status(500).json({ error: "Could not delete transaction" });
  }
});

//Delete an account
app.delete("/accounts/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query(
      `DELETE FROM accounts WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error("Delete account failed:", err.message);
    res.status(500).json({ error: "Could not delete account" });
  }
});

//Delete an user
app.delete("/users/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error("Delete user failed:", err.message);
    res.status(500).json({ error: "Could not delete user" });
  }
});

//Update transactions
app.patch("/transactions/:id", async (req, res) => {
  const id = req.params.id;
  const fields = ["amount", "description", "category", "date"];
  const updates = [];
  const values = [];

  fields.forEach((field, i) => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = $${values.length + 1}`);
      values.push(req.body[field]);
    }
  });

  if (updates.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  try {
    const result = await pool.query(
      `UPDATE transactions SET ${updates.join(", ")} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update transaction failed:", err.message);
    res.status(500).json({ error: "Could not update transaction" });
  }
});

//Update accounts
app.patch("/accounts/:id", async (req, res) => {
  const id = req.params.id;
  const fields = ["name", "type", "currency"];
  const updates = [];
  const values = [];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = $${values.length + 1}`);
      values.push(req.body[field]);
    }
  });

  if (updates.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  try {
    const result = await pool.query(
      `UPDATE accounts SET ${updates.join(", ")} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update account failed:", err.message);
    res.status(500).json({ error: "Could not update account" });
  }
});

//Update users
app.patch("/users/:id", async (req, res) => {
  const id = req.params.id;
  const fields = ["name", "email"];
  const updates = [];
  const values = [];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = $${values.length + 1}`);
      values.push(req.body[field]);
    }
  });

  if (updates.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update user failed:", err.message);
    res.status(500).json({ error: "Could not update user" });
  }
});








