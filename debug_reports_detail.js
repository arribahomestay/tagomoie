require('dotenv').config();
const mysql = require('mysql2/promise');

async function debugReportsDetail() {
    if (!process.env.DATABASE_URL) process.exit(1);
    const pool = mysql.createPool(process.env.DATABASE_URL);
    try {
        console.log("\n--- Reports Detail ---");
        const [reports] = await pool.query(`
            SELECT r.id, r.user_id, r.title, r.department_id, r.report_status, r.post_status, u.username as reporter_username
            FROM reports r 
            LEFT JOIN users u ON r.user_id = u.id
        `);
        console.table(reports);

        console.log("\n--- User IDs Check ---");
        const [users] = await pool.query("SELECT id, username, role FROM users");
        console.table(users);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
debugReportsDetail();
