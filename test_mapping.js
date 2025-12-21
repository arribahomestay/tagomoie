const mysql = require('mysql2/promise');
require('dotenv').config();

// Copy the mapStatus function from server.js
function mapStatus(status, priority) {
    const s = (status || '').toLowerCase();

    // Explicit mapping to match Kanban columns
    if (s === 'pending') return 'Pending';
    if (s === 'in progress' || s === 'ongoing') return 'In Review';
    if (s === 'resolved' || s === 'completed') return 'Resolved';

    // Fallback
    return 'Pending';
}

async function testMapping() {
    const url = new URL(process.env.DATABASE_URL);
    const connection = await mysql.createConnection({
        host: url.hostname,
        user: url.username,
        password: url.password,
        database: url.pathname.substring(1),
        port: url.port || 3306
    });

    const [reports] = await connection.query("SELECT id, report_id, title, report_status, priority_level FROM reports");

    console.log("Testing mapStatus function:");
    reports.forEach(r => {
        const mappedStatus = mapStatus(r.report_status, r.priority_level);
        console.log(`Report ${r.report_id}: DB status='${r.report_status}' -> Mapped to='${mappedStatus}'`);
    });

    await connection.end();
}

testMapping().catch(console.error);
