require('dotenv').config();
const mysql = require('mysql2/promise');

async function debugUsers() {
    if (!process.env.DATABASE_URL) process.exit(1);
    const pool = mysql.createPool(process.env.DATABASE_URL);
    try {
        console.log("\n--- Admins & Departments ---");
        const [users] = await pool.query(`
            SELECT u.id, u.username, u.email, u.role, u.department_id, d.department_name 
            FROM users u 
            LEFT JOIN departments d ON u.department_id = d.id 
            WHERE u.role = 'admin'
        `);
        console.table(users);

        console.log("\n--- Reports & Departments ---");
        const [reports] = await pool.query(`
            SELECT r.id, r.title, r.department_id, d.department_name 
            FROM reports r 
            LEFT JOIN departments d ON r.department_id = d.id
        `);
        console.table(reports);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
debugUsers();
