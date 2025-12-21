const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now
        methods: ["GET", "POST"]
    }
});
const port = process.env.PORT || 3000;

// Socket.io Connection with Messaging Support
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join conversation room
    socket.on('join_conversation', (conversationId) => {
        socket.join(`conversation_${conversationId}`);
        console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId) => {
        socket.leave(`conversation_${conversationId}`);
        console.log(`Socket ${socket.id} left conversation ${conversationId}`);
    });

    // Handle new message (will be saved via API, this is for real-time broadcast)
    socket.on('send_message', (data) => {
        const { conversationId, message, senderId, senderName } = data;
        // Broadcast to all users in this conversation room
        io.to(`conversation_${conversationId}`).emit('new_message', {
            conversationId,
            message,
            senderId,
            senderName,
            timestamp: new Date()
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Middleware

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Serve Static Files
app.use(express.static(__dirname));

// Database Connection
let pool;
if (process.env.DATABASE_URL) {
    try {
        const url = new URL(process.env.DATABASE_URL);
        pool = mysql.createPool({
            host: url.hostname,
            user: url.username,
            password: url.password,
            database: url.pathname.substring(1),
            port: url.port || 3306,
            waitForConnections: true,
            connectionLimit: 10,
            timezone: 'Z'
        });
        console.log('Database configuration found. Pool created with UTC Timezone.');
    } catch (err) {
        console.error('Invalid DB URL:', err);
    }
} else {
    console.log('No DATABASE_URL found. Running in static mode.');
}

// API Routes

// Test DB Connection
app.get('/api/health', async (req, res) => {
    if (!pool) return res.status(503).json({ status: 'error', message: 'No database connection' });
    try {
        const [rows] = await pool.query('SELECT NOW() as now');
        res.json({ status: 'ok', time: rows[0].now });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Get Barangays
app.get('/api/barangays', async (req, res) => {
    if (pool) {
        try {
            const [rows] = await pool.query('SELECT * FROM barangays ORDER BY barangay_name ASC');
            return res.json(rows);
        } catch (err) {
            console.error('DB Error getting barangays:', err);
            res.status(500).json({ error: err.message });
        }
    } else {
        res.status(503).json({ error: 'No DB connection' });
    }
});

app.get('/api/debug', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    try {
        const [tables] = await pool.query('SHOW TABLES');
        let reportCount = 'Table not found';
        try {
            const [rows] = await pool.query('SELECT COUNT(*) as c FROM reports');
            reportCount = rows[0].c;
        } catch (e) { reportCount = e.message; }

        res.json({
            connected: true,
            tables: tables,
            reportCount: reportCount,
            dbUrlMasked: process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1] : 'Unknown'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Reports
// Duplicate /api/reports handler removed.
// See the correct handler with filtering logic below.

// Get Users (Standard Users Only)
app.get('/api/users', async (req, res) => {
    if (!pool) return res.status(503).json({ status: 'error', message: 'No database connection' });
    try {
        const [rows] = await pool.query("SELECT id, first_name, last_name, email, email_verified_at, username, profile_photo, created_at, status FROM users WHERE role = 'user' ORDER BY created_at DESC");
        res.json(rows);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: err.message });
    }
});

// Initialize Database Tables
app.get('/api/init-db', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });

    // Split the schema by semi-colons to execute statement by statement
    // Using standard MySQL syntax compatible with Railway
    // DROP tables in reverse dependency order first to ensure clean init
    const schemaSql = `
        DROP TABLE IF EXISTS post_images;
        DROP TABLE IF EXISTS reactions;
        DROP TABLE IF EXISTS comments;
        DROP TABLE IF EXISTS messages;
        DROP TABLE IF EXISTS conversations;
        DROP TABLE IF EXISTS reports;
        DROP TABLE IF EXISTS users;
        DROP TABLE IF EXISTS departments;
        DROP TABLE IF EXISTS barangays;

        CREATE TABLE barangays (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            barangay_name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE departments (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            department_name VARCHAR(255) NOT NULL,
            category VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE users (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            first_name VARCHAR(255) NOT NULL,
            last_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE,
            email_verified_at TIMESTAMP,
            username VARCHAR(255),
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'user',
            profile_photo VARCHAR(2048),
            address VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE reports (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            report_id VARCHAR(255) UNIQUE NOT NULL,
            user_id INT UNSIGNED,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            barangay_id INT UNSIGNED,
            department_id INT UNSIGNED,
            street_purok VARCHAR(255),
            address_details VARCHAR(255),
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            report_status VARCHAR(50) DEFAULT 'pending',
            post_status VARCHAR(50) DEFAULT 'pending',
            rejection_reason VARCHAR(255),
            priority_level VARCHAR(50) DEFAULT 'low',
            reviewed_by INT UNSIGNED,
            reviewed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (barangay_id) REFERENCES barangays(id),
            FOREIGN KEY (department_id) REFERENCES departments(id),
            FOREIGN KEY (reviewed_by) REFERENCES users(id)
        );
        CREATE TABLE post_images (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            report_id INT UNSIGNED,
            cdn_url VARCHAR(255) NOT NULL,
            mime_type VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
        );
        CREATE TABLE comments (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNSIGNED,
            report_id INT UNSIGNED,
            body TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
        );
    `;

    try {
        const statements = schemaSql.split(';').filter(s => s.trim().length > 0);
        for (const statement of statements) {
            await pool.query(statement);
        }
        res.json({ message: 'Database tables created successfully.' });
    } catch (err) {
        console.error('Schema Init Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update Report Post Status (Approve/Decline)
app.post('/api/reports/:id/post-status', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { id } = req.params; // report_id like EO4475
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        console.log(`Moderating report ${id} to status ${status}`);

        // Check current status first
        const [rows] = await pool.query('SELECT post_status FROM reports WHERE report_id = ? OR id = ?', [id, id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const currentPostStatus = (rows[0].post_status || '').toLowerCase();
        if (currentPostStatus !== 'pending' && currentPostStatus !== '') {
            return res.status(400).json({ error: `This report is already ${currentPostStatus}.` });
        }

        const [result] = await pool.query('UPDATE reports SET post_status = ? WHERE report_id = ? OR id = ?', [status, id, id]);

        if (result.affectedRows === 0) {
            console.warn(`No report found to moderate with ID: ${id}`);
            return res.status(404).json({ error: 'Report not found for moderation' });
        }

        io.emit('dashboard_update', { type: 'post_status', id: id, status: status });
        res.json({ success: true, message: `Report ${status} successfully.` });
    } catch (err) {
        console.error('Moderation Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Post a Comment
app.post('/api/reports/:id/comments', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { id } = req.params; // report_id like EO4475
    const { body, userId } = req.body;

    if (!body) return res.status(400).json({ error: 'Comment body is required' });

    try {
        // Find the internal id of the report
        const [reports] = await pool.query('SELECT id FROM reports WHERE report_id = ? OR id = ?', [id, id]);
        if (reports.length === 0) return res.status(404).json({ error: 'Report not found' });

        const internalId = reports[0].id;
        const finalUserId = userId || 1; // Default to admin if no user provided

        await pool.query('INSERT INTO comments (user_id, report_id, body, created_at) VALUES (?, ?, ?, ?)',
            [finalUserId, internalId, body, new Date()]);

        res.json({ success: true, message: 'Comment posted successfully.' });
    } catch (err) {
        console.error('Comment error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Comments for a Report
app.get('/api/reports/:id/comments', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { id } = req.params;

    try {
        let whereClause = 'WHERE r.report_id = ?';
        let params = [id];

        if (!isNaN(id)) {
            whereClause += ' OR r.id = ?';
            params.push(id);
        }

        const query = `
            SELECT c.*, u.username, u.first_name, u.last_name, d.department_name
            FROM comments c 
            JOIN users u ON c.user_id = u.id 
            LEFT JOIN departments d ON u.department_id = d.id
            JOIN reports r ON c.report_id = r.id 
            ${whereClause}
            ORDER BY c.created_at ASC
        `;
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Seed Database
app.get('/api/seed-db', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });

    try {
        // 1. Seed Barangays
        const barangays = [
            'Apokon', 'Bincungan', 'Busaon', 'Canocotan', 'Cuambogan',
            'La Filipina', 'Liboganon', 'Madaum', 'Magdum', 'Mankilam',
            'New Balamban', 'Nueva Fuerza', 'Pagsabangan', 'Pandapan',
            'Magugpo Poblacion', 'San Agustin', 'San Isidro', 'San Miguel', 'Visayan Village'
        ];
        for (const b of barangays) {
            await pool.query('INSERT INTO barangays (barangay_name) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM barangays WHERE barangay_name = ?)', [b, b]);
        }

        // 2. Seed Users
        // Railway schema match: id, first_name, last_name, email, email_verified_at, username, password, role, address
        await pool.query(`
            INSERT INTO users(first_name, last_name, email, username, password, role) 
            SELECT 'long', 'time ago', NULL, 'onen', '$2y$12$NvlptvOLQR3qvKmQcoDK/el1C1elSSo...', 'user'
            WHERE NOT EXISTS(SELECT 1 FROM users WHERE username = 'onen')
        `);

        // 3. Seed Reports - Removed sample reports as per user request
        /*
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM reports');
        if (rows[0].count == 0) {
            const userId = (await pool.query('SELECT id FROM users WHERE username = "onen" LIMIT 1'))[0]?.[0]?.id;
            if (userId) {
                await pool.query(`
                    INSERT INTO reports (report_id, user_id, title, content, report_status, post_status, priority_level, created_at) VALUES 
                    ('EO4475', ?, 'long time ago', 'in bethlehem', 'pending', 'approved', 'low', NOW()),
                    ('GS1270', ?, 'in bethlehem', 'long time ago', 'pending', 'approved', 'low', NOW())
                `, [userId, userId]);
            }
        }
        if (rows[0].count == 0) {
            const userId = (await pool.query('SELECT id FROM users LIMIT 1'))[0][0].id; // Get valid user ID
            const brgyId = (await pool.query('SELECT id FROM barangays LIMIT 1'))[0][0].id; // Get valid brgy ID

            await pool.query(`
                INSERT INTO reports(report_id, user_id, title, content, report_status, priority_level, barangay_id, created_at) VALUES
    ('#1027', ?, 'Walay Kuryente', 'Walay kuryente sa among area sukad pa ganihang hapon.', 'Pending', 'high', ?, NOW()),
    ('#1025', ?, 'Guba ang Dalan', 'Naay dako nga bangag sa dalan dapit sa Purok 3.', 'In Progress', 'medium', ?, NOW() - INTERVAL 1 DAY)
`, [userId, brgyId, userId, brgyId]);
        }
        */

        res.json({ message: 'Database seeded successfully.' });
    } catch (err) {
        console.error('Seeding Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Fallback to index.html for SPA routing (if using client-side router, though this is multi-page)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Update Report Status (Pending/Ongoing/Resolved)
app.post('/api/reports/:id/status', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { id } = req.params;
    const { status } = req.body;

    try {
        const normalizedStatus = (status || '').toLowerCase();
        let dbStatus = normalizedStatus;
        let newPostStatus = null;

        if (normalizedStatus === 'ongoing' || normalizedStatus === 'in progress' || normalizedStatus === 'in review') {
            dbStatus = 'in_review';  // Database uses underscore
            newPostStatus = 'approved';
        } else if (normalizedStatus === 'resolved' || normalizedStatus === 'completed') {
            dbStatus = 'resolved';
            newPostStatus = 'approved';
        } else if (normalizedStatus === 'pending') {
            dbStatus = 'pending';
            newPostStatus = 'pending';
        }

        console.log(`Updating report ${id}: status=${dbStatus}, post_status=${newPostStatus}`);

        let result;
        // Check if id is numeric (internal ID) or string (report_id like EO4947)
        const isNumericId = !isNaN(id);

        if (newPostStatus) {
            if (isNumericId) {
                [result] = await pool.query(
                    'UPDATE reports SET report_status = ?, post_status = ? WHERE id = ?',
                    [dbStatus, newPostStatus, parseInt(id)]
                );
            } else {
                [result] = await pool.query(
                    'UPDATE reports SET report_status = ?, post_status = ? WHERE report_id = ?',
                    [dbStatus, newPostStatus, id]
                );
            }
        } else {
            if (isNumericId) {
                [result] = await pool.query(
                    'UPDATE reports SET report_status = ? WHERE id = ?',
                    [dbStatus, parseInt(id)]
                );
            } else {
                [result] = await pool.query(
                    'UPDATE reports SET report_status = ? WHERE report_id = ?',
                    [dbStatus, id]
                );
            }
        }

        if (result.affectedRows === 0) {
            console.warn(`No report found to update status with ID: ${id}`);
            return res.status(404).json({ error: 'Report not found' });
        }
        io.emit('dashboard_update', { type: 'report_status', id: id, status: dbStatus });
        res.json({ success: true, message: 'Status updated successfully.' });
    } catch (err) {
        console.error('Status Update Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete Report
app.delete('/api/reports/:id', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { id } = req.params;

    try {
        let query = 'DELETE FROM reports WHERE report_id = ?';
        let params = [id];

        // If 'id' is numeric, also try matching the internal auto-increment ID
        if (!isNaN(id)) {
            query += ' OR id = ?';
            params.push(id);
        }

        const [result] = await pool.query(query, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Report not found for deletion' });
        }
        io.emit('dashboard_update', { type: 'delete', id: id });
        res.json({ success: true, message: 'Report deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Analytics Endpoint
app.get('/api/analytics', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { department_id } = req.query;
    const hasDept = department_id && department_id !== 'null' && department_id !== 'undefined';

    try {
        console.log(`Fetching analytics data for Dept: ${department_id || 'All'}...`);

        let query = '';
        const params = [];

        if (hasDept) {
            query = `
                SELECT 
                    (SELECT COUNT(*) FROM reports WHERE department_id = ?) as totalReports,
                    (SELECT COUNT(*) FROM users) as totalUsers,
                    (SELECT COUNT(*) FROM reports WHERE department_id = ? AND report_status IN ('Pending', 'In Progress')) as activeReports,
                    (SELECT COUNT(*) FROM reports WHERE department_id = ? AND report_status = 'Resolved') as resolvedReports,
                    (SELECT COUNT(*) FROM reports WHERE department_id = ? AND created_at >= CURDATE()) as newReportsToday
            `;
            params.push(department_id, department_id, department_id, department_id);
        } else {
            query = `
                SELECT 
                    (SELECT COUNT(*) FROM reports) as totalReports,
                    (SELECT COUNT(*) FROM users) as totalUsers,
                    (SELECT COUNT(*) FROM reports WHERE report_status IN ('Pending', 'In Progress')) as activeReports,
                    (SELECT COUNT(*) FROM reports WHERE report_status = 'Resolved') as resolvedReports,
                    (SELECT COUNT(*) FROM reports WHERE created_at >= CURDATE()) as newReportsToday
            `;
        }

        const [rows] = await pool.query(query, params);
        res.json(rows[0]);
    } catch (err) {
        console.error('Analytics Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Find user by email OR username (form sends 'email' param as identifier)
        const [users] = await pool.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, email]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email/username or password' });
        }

        const user = users[0];

        // Verify Password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check if deactivated
        if (user.status === 'deactivated') {
            return res.status(403).json({ error: 'This account has been deactivated. Please contact your admin.' });
        }

        // Return User Info (exclude password)
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                firstName: user.first_name,
                lastName: user.last_name,
                department_id: user.department_id,
                status: user.status
            }
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Seed Specific Admin User
app.get('/api/seed-admin', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });

    try {
        const username = 'admin';
        const email = 'admin@gmail.com'; // Matching the login form placeholder/request
        const passwordPlain = 'admin123';
        const hashedPassword = await bcrypt.hash(passwordPlain, 10);

        // Check if exists
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existing.length > 0) {
            return res.json({ message: 'Admin user already exists.' });
        }

        // Insert
        await pool.query(`
            INSERT INTO users (
                first_name, last_name, email, username, password, role, 
                address, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, NULL, NOW(), NOW())
        `, ['ej', 'ok', email, username, hashedPassword, 'admin']);

        res.json({ success: true, message: 'Admin user "ej ok" created successfully.' });
    } catch (err) {
        console.error('Seed Admin Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- TECHNICIAN ENDPOINTS ---

const mult = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "deklle0es",
    api_key: process.env.CLOUDINARY_API_KEY || "584775371466268",
    api_secret: process.env.CLOUDINARY_API_SECRET || "sgm6MbcawkQGkZZ5AdjkTAojOSo"
});

// Multer Setup
const upload = mult({ dest: 'uploads/' });

// Upload Avatar Endpoint
app.post('/api/upload/avatar', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
        console.log('Uploading to Cloudinary:', req.file.path);
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'avatars',
            use_filename: true
        });
        // Cleanup local file
        try { fs.unlinkSync(req.file.path); } catch (e) { }

        console.log('Cloudinary URL:', result.secure_url);
        res.json({ url: result.secure_url });
    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ error: 'Upload failed: ' + err.message });
    }
});

// Generic Update User Endpoint
app.put('/api/users/:id', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { id } = req.params;
    const { first_name, last_name, username, email, profile_photo } = req.body;

    try {
        const updates = [];
        const params = [];

        if (first_name !== undefined) { updates.push('first_name = ?'); params.push(first_name); }
        if (last_name !== undefined) { updates.push('last_name = ?'); params.push(last_name); }
        if (username !== undefined) { updates.push('username = ?'); params.push(username); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email); }
        if (profile_photo !== undefined) { updates.push('profile_photo = ?'); params.push(profile_photo); }

        if (updates.length === 0) return res.json({ message: 'No changes provided' });

        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        params.push(id);

        await pool.query(sql, params);
        res.json({ success: true, message: 'User updated successfully' });
    } catch (err) {
        console.error('Update User Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Departments
app.get('/api/departments', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    try {
        const [rows] = await pool.query('SELECT * FROM departments ORDER BY department_name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Total Staff Count
app.get('/api/stats/staff', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    try {
        const [rows] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role != 'user' AND role != 'technician'");
        res.json({ count: rows[0].count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get All Reports (with optional filtering)
app.get('/api/reports', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { department_id } = req.query;
    console.log(`[GET /api/reports] Filtering by department_id: '${department_id}' (Type: ${typeof department_id})`);

    try {
        console.log('Fetching filtered reports...');
        let sql = `
            SELECT r.*, 
                   CONCAT(u.first_name, ' ', u.last_name) as reporter_name,
                   u.username as reporter_username,
                   u.profile_photo,
                   d.department_name,
                   b.barangay_name
            FROM reports r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN departments d ON r.department_id = d.id
            LEFT JOIN barangays b ON r.barangay_id = b.id
        `;

        const params = [];
        if (department_id && department_id !== 'null' && department_id !== 'undefined') {
            sql += ' WHERE r.department_id = ?';
            params.push(department_id);
        }

        sql += ' ORDER BY r.created_at DESC';

        const [rows] = await pool.query(sql, params);
        console.log(`[Reports] Found ${rows.length} reports.`);

        const reports = rows.map(r => {
            const firstName = r.first_name || '';
            const lastName = r.last_name || '';
            const reporterDisplay = (firstName + ' ' + lastName).trim() || r.reporter_username || 'Anonymous';

            return {
                id: r.report_id,
                internalId: r.id,
                department_id: r.department_id,
                name: r.title,
                reporter: reporterDisplay,
                avatar: r.profile_photo ? `<img src="${r.profile_photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : reporterDisplay.substring(0, 2).toUpperCase(),
                avStyle: r.profile_photo ? '' : 'background:#e0e7ff;color:#4f46e5;',
                date: new Date(r.created_at).toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                }),
                status: mapStatus(r.report_status, r.priority_level),
                postStatus: r.post_status,
                priority: r.priority_level || 'Low',
                desc: r.content,
                icon: getCategoryIcon(r.title),
                barangay: r.barangay_name || 'Unknown',
                street: r.street_purok || '',
                landmarks: r.address_details || '',
                lat: r.latitude ? parseFloat(r.latitude) : null,
                lng: r.longitude ? parseFloat(r.longitude) : null,
                department: r.department_name,
                images: []
            };
        });

        res.json(reports);
    } catch (err) {
        console.error('API /api/reports Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Only Admin/Staff Users
app.get('/api/users/admins', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { department_id } = req.query;

    try {
        let query = `
            SELECT u.id, u.first_name, u.last_name, u.email, u.username, u.role, u.department_id, u.status, u.profile_photo, d.department_name, u.created_at
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.role != 'user'
        `;
        const params = [];

        if (department_id && department_id !== 'null' && department_id !== 'undefined') {
            query += ' AND u.department_id = ?';
            params.push(department_id);
        }

        query += ' ORDER BY u.created_at DESC';

        const [rows] = await pool.query(query, params);

        // Map data for consistent frontend usage
        const staff = rows.map(s => ({
            ...s,
            full_name: `${s.first_name} ${s.last_name}`,
            initials: (s.first_name[0] || '') + (s.last_name[0] || ''),
            date_joined: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        }));

        res.json(staff);
    } catch (err) {
        console.error('API /api/users/admins Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update Admin Department
app.put('/api/users/:id/department', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { id } = req.params;
    const { department_id } = req.body;

    try {
        await pool.query('UPDATE users SET department_id = ? WHERE id = ?', [department_id || null, id]);
        res.json({ success: true, message: 'Department updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Admin User
app.post('/api/users/admins', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { first_name, last_name, email, username, password, department_id } = req.body;

    // Password Validation (At least 8 chars, 1 letter, 1 number, 1 special char)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            error: 'Password must be at least 8 characters long and include a letter, a number, and a special character.'
        });
    }

    try {
        // Check duplicate Email
        const [emailCheck] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (emailCheck.length > 0) return res.status(400).json({ error: 'Email address is already in use.' });

        // Check duplicate Username
        const [userCheck] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (userCheck.length > 0) return res.status(400).json({ error: 'Username is already taken.' });

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(`
            INSERT INTO users (first_name, last_name, email, username, password, role, department_id, created_at)
            VALUES (?, ?, ?, ?, ?, 'admin', ?, NOW())
        `, [first_name, last_name, email, username, hashedPassword, department_id || null]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Admin/User Status (Deactivate/Activate)
app.put('/api/users/:id/status', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { status } = req.body; // 'active' or 'deactivated'
    try {
        await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete User
app.delete('/api/users/:id', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Change User Password
app.post('/api/users/:id/password', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    try {
        // Get current password hash from database
        const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [id]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, users[0].password);

        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in database
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error('Password change error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ===== MESSAGING API ENDPOINTS =====

// Get all conversations for a user (or admin filtered by department)
app.get('/api/conversations/:userId', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { userId } = req.params;
    const { department_id, role } = req.query;

    try {
        let query = `
            SELECT 
                c.id,
                c.user_id,
                c.department_id,
                c.created_at,
                c.updated_at,
                d.department_name,
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                u.profile_photo,
                (SELECT message FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
            FROM conversations c
            LEFT JOIN departments d ON c.department_id = d.id
            LEFT JOIN users u ON c.user_id = u.id
        `;

        const params = [];

        // If admin, filter by their department
        if (role === 'admin' && department_id) {
            query += ' WHERE c.department_id = ?';
            params.push(department_id);
        } else {
            // If user, show only their conversations
            query += ' WHERE c.user_id = ?';
            params.push(userId);
        }

        query += ' ORDER BY c.updated_at DESC';

        const [conversations] = await pool.query(query, params);
        res.json(conversations);
    } catch (err) {
        console.error('Error fetching conversations:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create new conversation
app.post('/api/conversations', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { user_id, department_id } = req.body;

    if (!user_id || !department_id) {
        return res.status(400).json({ error: 'user_id and department_id are required' });
    }

    try {
        // Check if conversation already exists
        const [existing] = await pool.query(
            'SELECT id FROM conversations WHERE user_id = ? AND department_id = ?',
            [user_id, department_id]
        );

        if (existing.length > 0) {
            return res.json({ id: existing[0].id, message: 'Conversation already exists' });
        }

        // Create new conversation
        const [result] = await pool.query(
            'INSERT INTO conversations (user_id, department_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
            [user_id, department_id]
        );

        res.json({ id: result.insertId, message: 'Conversation created successfully' });
    } catch (err) {
        console.error('Error creating conversation:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get messages for a conversation
app.get('/api/conversations/:id/messages', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { id } = req.params;

    try {
        const [messages] = await pool.query(`
            SELECT 
                m.id,
                m.sender_id,
                m.conversation_id,
                m.message,
                m.created_at,
                CONCAT(u.first_name, ' ', u.last_name) as sender_name,
                u.profile_photo,
                u.role
            FROM messages m
            LEFT JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at ASC
        `, [id]);

        res.json(messages);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({ error: err.message });
    }
});

// Send a new message
app.post('/api/messages', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { sender_id, conversation_id, message } = req.body;

    if (!sender_id || !conversation_id || !message) {
        return res.status(400).json({ error: 'sender_id, conversation_id, and message are required' });
    }

    try {
        // Insert message
        const [result] = await pool.query(
            'INSERT INTO messages (sender_id, conversation_id, message, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
            [sender_id, conversation_id, message]
        );

        // Update conversation's updated_at
        await pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = ?', [conversation_id]);

        // Get sender info for real-time broadcast
        const [senderInfo] = await pool.query(
            'SELECT CONCAT(first_name, " ", last_name) as name FROM users WHERE id = ?',
            [sender_id]
        );

        // Emit real-time message via Socket.IO
        io.to(`conversation_${conversation_id}`).emit('new_message', {
            id: result.insertId,
            sender_id,
            conversation_id,
            message,
            sender_name: senderInfo[0]?.name || 'Unknown',
            created_at: new Date()
        });

        res.json({
            success: true,
            id: result.insertId,
            message: 'Message sent successfully'
        });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ error: err.message });
    }
});

// ===== REACTIONS API ENDPOINTS =====

// Get reaction counts for a report
app.get('/api/reports/:id/reactions', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const { id } = req.params;

    try {
        // Resolve numeric ID
        // Try to match either custom ID or numeric ID
        const [reportRows] = await pool.query('SELECT id FROM reports WHERE report_id = ? OR CAST(id AS CHAR) = ?', [id, id]);
        if (reportRows.length === 0) return res.status(404).json({ error: 'Report not found' });
        const numericId = reportRows[0].id;

        const [reactions] = await pool.query(`
            SELECT 
                reaction_type,
                COUNT(*) as count
            FROM reactions
            WHERE report_id = ?
            GROUP BY reaction_type
        `, [numericId]);

        const result = {
            like_count: 0,
            dislike_count: 0
        };

        reactions.forEach(r => {
            if (r.reaction_type === 'like') {
                result.like_count = r.count;
            } else if (r.reaction_type === 'dislike') {
                result.dislike_count = r.count;
            }
        });

        res.json(result);
    } catch (err) {
        console.error('Error fetching reactions:', err);
        res.status(500).json({ error: err.message });
    }
});



// Toggle reaction (Like/Dislike)
app.post('/api/reports/:id/reactions', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'No DB connection' });
    const reportIdParam = req.params.id;
    const { userId, reactionType } = req.body; // 'like' or 'dislike'

    if (!userId || !reactionType) {
        return res.status(400).json({ error: 'Missing userId or reactionType' });
    }

    try {
        // Resolve numeric ID
        const [reportRows] = await pool.query('SELECT id FROM reports WHERE report_id = ? OR CAST(id AS CHAR) = ?', [reportIdParam, reportIdParam]);
        if (reportRows.length === 0) return res.status(404).json({ error: 'Report not found' });
        const numericId = reportRows[0].id;

        // Check if reaction exists
        const [existing] = await pool.query(
            'SELECT * FROM reactions WHERE report_id = ? AND user_id = ?',
            [numericId, userId]
        );

        if (existing.length > 0) {
            const currentReaction = existing[0];

            if (currentReaction.reaction_type === reactionType) {
                // Same reaction? Remove it (Toggle off)
                await pool.query('DELETE FROM reactions WHERE id = ?', [currentReaction.id]);
                return res.json({ action: 'removed', message: 'Reaction removed' });
            } else {
                // Different reaction? Update it
                await pool.query('UPDATE reactions SET reaction_type = ? WHERE id = ?', [reactionType, currentReaction.id]);
                return res.json({ action: 'updated', message: 'Reaction updated' });
            }
        } else {
            // New reaction
            await pool.query(
                'INSERT INTO reactions (report_id, user_id, reaction_type) VALUES (?, ?, ?)',
                [numericId, userId, reactionType]
            );
            return res.json({ action: 'added', message: 'Reaction added' });
        }
    } catch (err) {
        console.error('Error toggling reaction:', err);
        res.status(500).json({ error: err.message });
    }
});



// Helper Functions
function mapStatus(status, priority) {
    const s = (status || '').toLowerCase().trim();

    // Explicit mapping to match Kanban columns (case-insensitive)
    // Database uses: 'pending', 'in_review', 'resolved'
    if (s === 'pending') return 'Pending';
    if (s === 'in_review' || s === 'in progress' || s === 'ongoing') return 'In Review';
    if (s === 'resolved' || s === 'completed') return 'Resolved';

    // Fallback - return Pending for any unknown status
    return 'Pending';
}

function getCategoryIcon(title) {
    const t = (title || '').toLowerCase();
    if (t.includes('road') || t.includes('dalan')) return 'alert-triangle';
    if (t.includes('flood') || t.includes('water') || t.includes('drainage')) return 'droplets';
    if (t.includes('electric') || t.includes('kuryente') || t.includes('light')) return 'zap';
    if (t.includes('noise') || t.includes('karaoke') || t.includes('saba')) return 'volume-2';
    if (t.includes('accident') || t.includes('vehicle') || t.includes('traffic')) return 'car';
    if (t.includes('animal')) return 'dog';
    return 'alert-circle';
}

server.listen(port, () => {
    console.log(`Server running on port ${port} `);
});
