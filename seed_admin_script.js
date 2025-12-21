require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
    if (!process.env.DATABASE_URL) {
        console.error('No DATABASE_URL in .env file. Please check your configuration.');
        process.exit(1);
    }

    console.log('Connecting to database...');
    const pool = mysql.createPool(process.env.DATABASE_URL);

    try {
        // Step 1: Fix the Schema to allow 'admin' role
        console.log('Checking/Updating User Role ENUM...');
        // We modify the column to include 'admin'. We include existing values to be safe.
        // Current: enum('user','employee','technician')
        // New: enum('user','employee','technician','admin')

        try {
            await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('user','employee','technician','admin') NOT NULL DEFAULT 'user'");
            console.log('✅ Schema updated: Added "admin" to role ENUM.');
        } catch (alterErr) {
            console.warn('⚠️ Warning during ALTER TABLE (might already match):', alterErr.message);
        }

        // Step 2: Insert Admin
        const email = 'admin@gmail.com';
        const username = 'admin';
        const passwordText = 'admin123';

        console.log(`Preparing to create admin user: ${username} (${email})`);

        const hashedPassword = await bcrypt.hash(passwordText, 10);

        // Check if exists
        const [existing] = await pool.query('SELECT id, username FROM users WHERE email = ? OR username = ?', [email, username]);

        if (existing.length > 0) {
            console.log(`Admin user already exists (ID: ${existing[0].id}, Username: ${existing[0].username}).`);
            // Optional: Update role to admin if it exists but isn't admin?
            await pool.query('UPDATE users SET role = "admin" WHERE id = ?', [existing[0].id]);
            console.log('✅ Ensured existing user has "admin" role.');
        } else {
            await pool.query(`
                INSERT INTO users (
                    first_name, last_name, email, username, password, role, 
                    address, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, NULL, NOW(), NOW())
            `, ['System', 'Admin', email, username, hashedPassword, 'admin']);
            console.log('✅ Admin user created successfully!');
        }

        console.log('\n-----------------------------------');
        console.log('LOGIN CREDENTIALS:');
        console.log('Email:    admin@gmail.com');
        console.log('Username: admin');
        console.log('Password: admin123');
        console.log('-----------------------------------');

    } catch (err) {
        console.error('❌ Error creating admin user:', err.message);
    } finally {
        await pool.end();
    }
}

seedAdmin();
