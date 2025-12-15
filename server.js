const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve Static Files
app.use(express.static(__dirname));

// Database Connection (Only if DATABASE_URL is present)
let pool;
if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    console.log('Database configuration found. Attempting to connect...');
} else {
    console.log('No DATABASE_URL found. Running in static mode.');
}

// API Routes

// Test DB Connection
app.get('/api/health', async (req, res) => {
    if (!pool) return res.status(503).json({ status: 'error', message: 'No database connection' });
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'ok', time: result.rows[0].now });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Example: Get Reports
app.get('/api/reports', async (req, res) => {
    if (!pool) return res.status(503).json({ status: 'error', message: 'No database connection' });
    try {
        const result = await pool.query('SELECT * FROM reports ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Fallback to index.html for SPA routing (if using client-side router, though this is multi-page)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
