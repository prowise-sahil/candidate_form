const mysql = require('mysql2/promise');

const poolConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

// A single createConnection socket is fragile with remote cPanel MySQL servers:
// shared hosts often close idle TCP connections, which can surface later as
// ECONNRESET. A pool borrows a live connection per query, replaces broken
// sockets automatically, and prevents one stale connection from crashing work.
const pool = mysql.createPool(poolConfig);

pool.on('connection', () => {
    console.log('[DB] MySQL pool connection established');
});

pool.on('enqueue', () => {
    console.log('[DB] Waiting for an available MySQL pool connection');
});

async function testDbConnection() {
    let connection;

    try {
        console.log('[DB] Checking MySQL connection...');
        connection = await pool.getConnection();
        await connection.query('SELECT 1');
        console.log('[DB] MySQL pool is ready');
    } catch (error) {
        console.error('[DB] MySQL pool connection failed:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

function logQueryError(error) {
    console.error('[DB] Query failed:', {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        message: error.message
    });

    if (['ECONNRESET', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT'].includes(error.code)) {
        console.log('[DB] Connection was reset or lost; the pool will retry with a fresh connection on the next query');
    }
}

// Backward-compatible query adapter:
// - callback style: db.query(sql, values, cb)
// - promise style: const [rows] = await db.promise().query(sql, values)
function query(sql, values, callback) {
    if (typeof values === 'function') {
        callback = values;
        values = [];
    }

    if (typeof callback === 'function') {
        pool.query(sql, values)
            .then(([rows, fields]) => callback(null, rows, fields))
            .catch((error) => {
                logQueryError(error);
                callback(error);
            });
        return;
    }

    return pool.query(sql, values).catch((error) => {
        logQueryError(error);
        throw error;
    });
}

async function closePool() {
    await pool.end();
    console.log('[DB] MySQL pool closed');
}

module.exports = {
    pool,
    query,
    promise: () => pool,
    testDbConnection,
    closePool
};
