require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkStats() {
    if (!process.env.DATABASE_URL) {
        console.error('No DATABASE_URL in .env');
        process.exit(1);
    }
    const pool = mysql.createPool(process.env.DATABASE_URL);
    try {
        console.log('--- Checking Database Content ---');

        // Departments
        const [depts] = await pool.query('SELECT * FROM departments');
        console.log(`Departments count: ${depts.length}`);
        if (depts.length > 0) console.table(depts);

        // Admins
        const [admins] = await pool.query("SELECT id, username, role FROM users WHERE role = 'admin'");
        console.log(`Admins count: ${admins.length}`);
        if (admins.length > 0) console.table(admins);

        // Staff
        const [staff] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role != 'user' AND role != 'technician'");
        console.log(`Staff count: ${staff[0].count}`);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}
checkStats();
