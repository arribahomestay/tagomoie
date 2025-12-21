const mysql = require('mysql2/promise');
require('dotenv').config();

async function fix() {
    const url = new URL(process.env.DATABASE_URL);
    const connection = await mysql.createConnection({
        host: url.hostname,
        user: url.username,
        password: url.password,
        database: url.pathname.substring(1),
        port: url.port || 3306
    });

    // Update all reports with 'pending' status to ensure consistency
    const [result] = await connection.query(
        "UPDATE reports SET report_status = 'pending' WHERE report_status = 'pending'"
    );

    console.log(`Updated ${result.affectedRows} reports to ensure 'pending' status is lowercase`);

    // Show current state
    const [reports] = await connection.query("SELECT id, report_id, title, report_status, post_status FROM reports");
    console.log("\nCurrent Reports:");
    console.log(JSON.stringify(reports, null, 2));

    await connection.end();
}

fix().catch(console.error);
