require('dotenv').config();
const mysql = require('mysql2/promise');

async function testLogic() {
    if (!process.env.DATABASE_URL) process.exit(1);
    const pool = mysql.createPool(process.env.DATABASE_URL);

    // Simulate inputs
    const inputs = [
        '6', // Health
        '1', // Engineering
        'null',
        undefined,
        ''
    ];

    try {
        for (const input of inputs) {
            console.log(`\nTesting input: '${input}' (Type: ${typeof input})`);

            let sql = `
                SELECT r.id, r.title, r.department_id 
                FROM reports r 
            `;

            const params = [];
            // EXACT Logic from server.js
            if (input && input !== 'null' && input !== 'undefined') {
                sql += ' WHERE r.department_id = ?';
                params.push(input);
            } else {
                console.log('Skipping WHERE clause');
            }

            console.log('SQL:', sql.trim());
            console.log('Params:', params);

            const [rows] = await pool.query(sql, params);
            console.log('Result Count:', rows.length);
            rows.forEach(r => console.log(` - ID: ${r.id}, Title: ${r.title}, DeptID: ${r.department_id}`));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

testLogic();
