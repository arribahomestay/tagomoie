require('dotenv').config();
const mysql = require('mysql2/promise');

async function addStatusColumn() {
    if (!process.env.DATABASE_URL) process.exit(1);
    const pool = mysql.createPool(process.env.DATABASE_URL);
    try {
        console.log('Adding status column...');
        await pool.query("ALTER TABLE users ADD COLUMN status ENUM('active', 'deactivated') DEFAULT 'active' AFTER role");
        console.log('Column added successfully.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column already exists.');
        } else {
            console.error(err);
        }
    } finally {
        await pool.end();
    }
}
addStatusColumn();
