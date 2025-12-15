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

// Get Barangays (Mock or Real)
app.get('/api/barangays', async (req, res) => {
    if (pool) {
        try {
            const result = await pool.query('SELECT * FROM barangays ORDER BY barangay_name ASC');
            return res.json(result.rows);
        } catch (err) {
            console.error('DB Error getting barangays:', err);
            // Fallback to mock on error
        }
    }

    // Mock Data if DB not connected or fails
    const mockBarangays = [
        { id: 1, barangay_name: 'Apokon' },
        { id: 2, barangay_name: 'Bincungan' },
        { id: 3, barangay_name: 'Busaon' },
        { id: 4, barangay_name: 'Canocotan' },
        { id: 5, barangay_name: 'Cuambogan' },
        { id: 6, barangay_name: 'La Filipina' },
        { id: 7, barangay_name: 'Liboganon' },
        { id: 8, barangay_name: 'Madaum' },
        { id: 9, barangay_name: 'Magdum' },
        { id: 10, barangay_name: 'Mankilam' },
        { id: 11, barangay_name: 'New Balamban' },
        { id: 12, barangay_name: 'Nueva Fuerza' },
        { id: 13, barangay_name: 'Pagsabangan' },
        { id: 14, barangay_name: 'Pandapan' },
        { id: 15, barangay_name: 'Magugpo Poblacion' },
        { id: 16, barangay_name: 'San Agustin' },
        { id: 17, barangay_name: 'San Isidro' },
        { id: 18, barangay_name: 'San Miguel' },
        { id: 19, barangay_name: 'Visayan Village' }
    ];
    res.json(mockBarangays);
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
