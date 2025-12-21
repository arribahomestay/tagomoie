const mysql = require('mysql2/promise');
require('dotenv').config();

async function restoreRealReports() {
    try {
        const pool = mysql.createPool(process.env.DATABASE_URL);
        console.log('Connected to Railway DB.');

        // 1. Delete the accidental "sample" ones I put back in my last mistake
        await pool.query('DELETE FROM reports WHERE report_id IN ("#1027", "#1025")');
        console.log('Removed incorrect samples.');

        // 2. Insert the REAL reports shown in your image
        await pool.query(`
            INSERT INTO reports (report_id, user_id, title, content, report_status, post_status, priority_level, created_at)
            VALUES 
            ('EO4475', 1, 'long time ago', 'in bethlehem', 'pending', 'approved', 'low', NOW()),
            ('GS1270', 1, 'in bethlehem', 'long time ago', 'pending', 'approved', 'low', NOW())
        `);

        console.log('Restored the REAL reports: EO4475 and GS1270.');
        process.exit(0);
    } catch (err) {
        console.error('Error restoring reports:', err);
        process.exit(1);
    }
}

restoreRealReports();
