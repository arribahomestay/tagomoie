require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkReactions() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('=== REACTIONS TABLE SCHEMA ===\n');

        const [schema] = await pool.query('DESCRIBE reactions');
        console.log('Columns:', schema);

        console.log('\n=== SAMPLE REACTIONS DATA ===\n');
        const [reactions] = await pool.query('SELECT * FROM reactions LIMIT 10');
        console.log('Sample data:', reactions);

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkReactions();
