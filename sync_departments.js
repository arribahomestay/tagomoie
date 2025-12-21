require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkAndFixDepartments() {
    if (!process.env.DATABASE_URL) process.exit(1);
    const pool = mysql.createPool(process.env.DATABASE_URL);

    try {
        console.log("--- Current Departments ---");
        const [currentDepts] = await pool.query("SELECT * FROM departments ORDER BY id");
        console.table(currentDepts);

        // Target Schema from User Image
        const targets = [
            { id: 1, name: 'Engineering Office', category: 'Roads, Streetlights, Drainage' },
            { id: 2, name: 'CENRO', category: 'Garbage, Illegal Dumping' },
            { id: 3, name: 'CDRRMO', category: 'Floods, Hazard Issues' },
            { id: 4, name: 'General Services Office', category: 'Maintenance, Public Facilities' },
            { id: 5, name: 'Public Safety / Traffic Office', category: 'Traffic Concerns' },
            { id: 6, name: 'Health Office', category: 'Health/Environment Sanitary Issues' },
            { id: 7, name: 'Social Welfare', category: 'Welfare/Community Issues' }
        ];

        console.log("\n--- Syncing Departments ---");
        for (const t of targets) {
            // Upsert (Insert or Update on Duplicate Key)
            // Note: users table might reference these IDs, so we shouldn't DELETE blindly.
            // We'll use ON DUPLICATE KEY UPDATE to safeguard references.
            await pool.query(`
                INSERT INTO departments (id, department_name, category) 
                VALUES (?, ?, ?) 
                ON DUPLICATE KEY UPDATE department_name = VALUES(department_name), category = VALUES(category)
            `, [t.id, t.name, t.category]);
            console.log(`Synced ID ${t.id}: ${t.name}`);
        }

        console.log("\n--- Verified Departments ---");
        const [finalDepts] = await pool.query("SELECT * FROM departments ORDER BY id");
        console.table(finalDepts);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkAndFixDepartments();
