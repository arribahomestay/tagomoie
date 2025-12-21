require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkReportsSchema() {
    if (!process.env.DATABASE_URL) process.exit(1);
    const pool = mysql.createPool(process.env.DATABASE_URL);
    try {
        const [rows] = await pool.query("DESCRIBE reports"); // Assuming table is 'reports'
        console.table(rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
checkReportsSchema();
