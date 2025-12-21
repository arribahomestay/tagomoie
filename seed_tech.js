require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seedTechnician() {
    if (!process.env.DATABASE_URL) {
        console.error('No DATABASE_URL in .env');
        process.exit(1);
    }
    const pool = mysql.createPool(process.env.DATABASE_URL);
    try {
        console.log('Connecting to DB...');

        // 1. Ensure 'technician' is in ENUM (it likely is, but good to check or if we modified it earlier and removed it, which we didn't)
        // Previous script set: ENUM('user','employee','technician','admin') -> 'technician' is already there.

        // 2. Insert Technician User
        const email = 'tech@gmail.com';
        const username = 'tech';
        const passwordPlain = 'tech123';
        const hashedPassword = await bcrypt.hash(passwordPlain, 10);

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            console.log('Technician user already exists.');
            // Ensure role is technician
            await pool.query('UPDATE users SET role = "technician" WHERE id = ?', [existing[0].id]);
            console.log('Updated role to technician.');
        } else {
            await pool.query(`
                INSERT INTO users (first_name, last_name, email, username, password, role, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'technician', NOW(), NOW())
            `, ['System', 'Technician', email, username, hashedPassword]);
            console.log('✅ Technician user created.');
        }

        console.log('Credentials: tech@gmail.com / tech123');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}
seedTechnician();
