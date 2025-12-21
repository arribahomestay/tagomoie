require('dotenv').config();
const mysql = require('mysql2/promise');

async function debugSchema() {
    if (!process.env.DATABASE_URL) {
        console.error('No DATABASE_URL in .env');
        process.exit(1);
    }
    const pool = mysql.createPool(process.env.DATABASE_URL);
    try {
        const [rows] = await pool.query('DESCRIBE users');
        console.log('Users Table Schema:');
        console.table(rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
debugSchema();
