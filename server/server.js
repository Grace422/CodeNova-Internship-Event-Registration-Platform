require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required. Please log in.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required.",
      });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token. Please log in again.",
    });
  }
}

app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required.",
      });
    }

    if (
      !process.env.ADMIN_USERNAME ||
      !process.env.ADMIN_PASSWORD_HASH ||
      !process.env.JWT_SECRET
    ) {
      return res.status(500).json({
        message: "Admin authentication is not configured.",
      });
    }

    const validUsername = username === process.env.ADMIN_USERNAME;
    const validPassword = await bcrypt.compare(
      password,
      process.env.ADMIN_PASSWORD_HASH
    );

    if (!validUsername || !validPassword) {
      return res.status(401).json({
        message: "Invalid username or password.",
      });
    }

    const token = jwt.sign(
      {
        role: "admin",
        username: process.env.ADMIN_USERNAME,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      message: "Login successful.",
      token,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error("Admin login failed:", error.message);

    return res.status(500).json({
      message: "Unable to process login.",
    });
  }
});


app.get("/", (req, res) => {
    res.send("Event Management API is running!");
});

app.get("/api/events", async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.capacity,
        COUNT(r.id)::INTEGER AS registration_count
      FROM events e
      LEFT JOIN registrations r
        ON e.id = r.event_id
        AND r.status = 'Confirmed'
      GROUP BY e.id
      ORDER BY e.event_date ASC
    `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({
            message: "Failed to retrieve events.",
            error: error.message,
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});


app.post("/api/registrations", async (req, res) => {
  try {
    const { event_id, name, email, college, domain_interests } = req.body;

    if (
      !event_id ||
      !name?.trim() ||
      !email?.trim() ||
      !college?.trim() ||
      !Array.isArray(domain_interests) ||
      domain_interests.length === 0
    ) {
      return res.status(400).json({
        message: "Please provide all required registration details.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const eventResult = await pool.query(
      "SELECT id, capacity FROM events WHERE id = $1",
      [event_id]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        message: "Event not found.",
      });
    }

    const event = eventResult.rows[0];

    const countResult = await pool.query(
      `SELECT COUNT(*)::INTEGER AS count
       FROM registrations
       WHERE event_id = $1 AND status = 'Confirmed'`,
      [event_id]
    );

    if (countResult.rows[0].count >= event.capacity) {
      return res.status(409).json({
        message: "This event has reached its capacity.",
      });
    }

    const result = await pool.query(
      `INSERT INTO registrations
       (event_id, name, email, college, domain_interests)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        event_id,
        name.trim(),
        normalizedEmail,
        college.trim(),
        domain_interests,
      ]
    );

    return res.status(201).json({
      message: "Registration successful!",
      registration: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "You have already registered for this event.",
      });
    }

    console.error("Error creating registration:", error);

    return res.status(500).json({
      message: "Failed to register for the event.",
    });
  }
});


app.get("/api/admin/registrations", requireAdmin, async (req, res) => {
  try {
    const search = (req.query.search || "").trim();

    const result = await pool.query(
      `SELECT
        r.id,
        r.event_id,
        r.name,
        r.email,
        r.college,
        r.domain_interests,
        r.status,
        r.registered_at,
        e.title AS event_title,
        e.event_date
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      WHERE
        r.name ILIKE $1 OR
        r.email ILIKE $1 OR
        r.college ILIKE $1 OR
        e.title ILIKE $1
      ORDER BY r.registered_at DESC`,
      [`%${search}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching admin registrations:", error);

    res.status(500).json({
      message: "Failed to retrieve registrations.",
    });
  }
});
