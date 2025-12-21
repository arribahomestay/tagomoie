const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkMessagingSchema() {
    const url = new URL(process.env.DATABASE_URL);
    const connection = await mysql.createConnection({
        host: url.hostname,
        user: url.username,
        password: url.password,
        database: url.pathname.substring(1),
        port: url.port || 3306
    });

    console.log("=== CONVERSATIONS TABLE ===");
    const [convCols] = await connection.query("SHOW COLUMNS FROM conversations");
    console.log(JSON.stringify(convCols, null, 2));

    console.log("\n=== MESSAGES TABLE ===");
    const [msgCols] = await connection.query("SHOW COLUMNS FROM messages");
    console.log(JSON.stringify(msgCols, null, 2));

    console.log("\n=== SAMPLE DATA ===");
    const [convs] = await connection.query("SELECT * FROM conversations LIMIT 5");
    console.log("Conversations:", JSON.stringify(convs, null, 2));

    const [msgs] = await connection.query("SELECT * FROM messages LIMIT 5");
    console.log("Messages:", JSON.stringify(msgs, null, 2));

    await connection.end();
}

checkMessagingSchema().catch(console.error);
