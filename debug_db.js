const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    try {
        const pool = mysql.createPool(process.env.DATABASE_URL);
        console.log('Connected');

        const [count] = await pool.query('SELECT COUNT(*) as c FROM reports');
        console.log('Count:', count[0].c);

        const [rows] = await pool.query('SELECT * FROM reports');
        console.log('Rows:', rows);

        const query = `
            SELECT 
                r.report_id as displayId
            FROM reports r
            LEFT JOIN users u ON r.user_id = u.id
        `;
        const [simpleJoin] = await pool.query(query);
        console.log('Simple Join:', simpleJoin);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
