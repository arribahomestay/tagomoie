const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const url = new URL(process.env.DATABASE_URL);
    const connection = await mysql.createConnection({
        host: url.hostname,
        user: url.username,
        password: url.password,
        database: url.pathname.substring(1),
        port: url.port || 3306
    });

    const [reports] = await connection.query("SELECT id, report_id, title, report_status, post_status FROM reports");
    console.log("REPORTS:");
    console.log(JSON.stringify(reports, null, 2));

    await connection.end();
}

check().catch(console.error);
