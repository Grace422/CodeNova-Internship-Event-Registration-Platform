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
