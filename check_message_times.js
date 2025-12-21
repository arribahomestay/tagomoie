require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkTimes() {
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
        console.log('=== CHECKING MESSAGE TIMESTAMPS ===\n');

        const [messages] = await pool.query(`
            SELECT 
                id,
                message,
                created_at,
                CONVERT_TZ(created_at, @@session.time_zone, '+08:00') as ph_time
            FROM messages 
            ORDER BY id DESC 
            LIMIT 10
        `);

        console.log('Recent messages:');
        messages.forEach(msg => {
            console.log(`\nID: ${msg.id}`);
            console.log(`Message: ${msg.message}`);
            console.log(`DB Time (created_at): ${msg.created_at}`);
            console.log(`PH Time (+8): ${msg.ph_time}`);
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkTimes();
