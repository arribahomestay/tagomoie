const mysql = require('mysql2/promise');
require('dotenv').config();

async function restoreReports() {
    try {
        const pool = mysql.createPool(process.env.DATABASE_URL);
        console.log('Connected.');

        // Get a valid user and barangay
        const [users] = await pool.query('SELECT id FROM users LIMIT 1');
        const [barangays] = await pool.query('SELECT id FROM barangays LIMIT 1');

        if (users.length === 0 || barangays.length === 0) {
            console.log('No users or barangays found. Cannot restore.');
            process.exit(1);
        }

        const userId = users[0].id;
        const brgyId = barangays[0].id;

        console.log(`Using User ID: ${userId}, Brgy ID: ${brgyId}`);

        await pool.query(`
            INSERT INTO reports (report_id, user_id, title, content, report_status, priority_level, barangay_id, created_at)
            VALUES 
            ('#1027', ?, 'Walay Kuryente', 'Walay kuryente sa among area sukad pa ganihang hapon.', 'Pending', 'high', ?, NOW()),
            ('#1025', ?, 'Guba ang Dalan', 'Naay dako nga bangag sa dalan dapit sa Purok 3.', 'In Progress', 'medium', ?, NOW() - INTERVAL 1 DAY)
            ON DUPLICATE KEY UPDATE title=VALUES(title)
        `, [userId, brgyId, userId, brgyId]);

        console.log('Restored 2 reports successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

restoreReports();
