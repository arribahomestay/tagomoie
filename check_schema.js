const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    const url = new URL(process.env.DATABASE_URL);
    const connection = await mysql.createConnection({
        host: url.hostname,
        user: url.username,
        password: url.password,
        database: url.pathname.substring(1),
        port: url.port || 3306
    });

    // Get the column definition for report_status
    const [columns] = await connection.query("SHOW COLUMNS FROM reports LIKE 'report_status'");
    console.log("report_status column definition:");
    console.log(JSON.stringify(columns, null, 2));

    await connection.end();
}

checkSchema().catch(console.error);
