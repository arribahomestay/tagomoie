const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAndFix() {
    const url = new URL(process.env.DATABASE_URL);
    const connection = await mysql.createConnection({
        host: url.hostname,
        user: url.username,
        password: url.password,
        database: url.pathname.substring(1),
        port: url.port || 3306
    });

    // Check current status values (case-sensitive)
    const [reports] = await connection.query("SELECT id, report_id, title, report_status FROM reports");
    console.log("Current status values in database:");
    reports.forEach(r => {
        console.log(`  ${r.report_id}: report_status = "${r.report_status}" (length: ${r.report_status.length})`);
    });

    // Fix: Update all "Pending" (capital P) to "pending" (lowercase)
    const [result] = await connection.query(
        "UPDATE reports SET report_status = 'pending' WHERE report_status = 'Pending' OR report_status = 'PENDING'"
    );

    console.log(`\nUpdated ${result.affectedRows} reports from 'Pending' to 'pending'`);

    // Verify
    const [updated] = await connection.query("SELECT id, report_id, report_status FROM reports");
    console.log("\nAfter fix:");
    updated.forEach(r => {
        console.log(`  ${r.report_id}: report_status = "${r.report_status}"`);
    });

    await connection.end();
}

checkAndFix().catch(console.error);
