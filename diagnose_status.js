const mysql = require('mysql2/promise');
require('dotenv').config();

async function diagnose() {
    const url = new URL(process.env.DATABASE_URL);
    const connection = await mysql.createConnection({
        host: url.hostname,
        user: url.username,
        password: url.password,
        database: url.pathname.substring(1),
        port: url.port || 3306
    });

    // Get the EXACT status values with their ASCII codes
    const [reports] = await connection.query("SELECT id, report_id, title, report_status, HEX(report_status) as hex_status FROM reports");

    console.log("DETAILED STATUS ANALYSIS:");
    console.log("=".repeat(80));
    reports.forEach(r => {
        console.log(`Report: ${r.report_id} (${r.title})`);
        console.log(`  Raw value: "${r.report_status}"`);
        console.log(`  Hex value: ${r.hex_status}`);
        console.log(`  First char code: ${r.report_status.charCodeAt(0)} (${r.report_status[0]})`);
        console.log(`  Lowercase: "${r.report_status.toLowerCase()}"`);
        console.log(`  Match 'pending'?: ${r.report_status.toLowerCase() === 'pending'}`);
        console.log(`  Match 'Pending'?: ${r.report_status === 'Pending'}`);
        console.log("");
    });

    await connection.end();
}

diagnose().catch(console.error);
