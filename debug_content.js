require('dotenv').config();
const mysql = require('mysql2/promise');

async function debugContent() {
    if (!process.env.DATABASE_URL) process.exit(1);
    const pool = mysql.createPool(process.env.DATABASE_URL);
    try {
        console.log("--- Departments ---");
        const [depts] = await pool.query("SELECT * FROM departments");
        console.table(depts);

        console.log("\n--- Users (Admins) ---");
        const [users] = await pool.query("SELECT id, username, email, role, department_id, status FROM users WHERE role = 'admin'");
        console.table(users);

        console.log("\n--- Reports ---");
        const [reports] = await pool.query("SELECT id, title, department_id FROM reports");
        console.table(reports);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
debugContent();
