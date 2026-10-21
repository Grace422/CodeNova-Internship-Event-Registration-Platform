require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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
