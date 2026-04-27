const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();

function formatDate(value) {
    return value && String(value).trim() !== '' ? value : null;
}

function normalizeAdminPayload(payload = {}) {
    return {
        name: String(payload.name || payload.Name || '').trim(),
        email: String(payload.email || '').trim().toLowerCase(),
        phone: String(payload.phone || '').trim(),
        role: String(payload.role || 'Admin').trim() || 'Admin',
        status: payload.status === 'inactive' ? 'inactive' : 'active',
        password: String(payload.password || '').trim()
    };
}

function query(sql, values = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, values, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

app.use(cors({
    origin: "http://localhost:5500",
    credentials: true
}));
app.use(cookieParser())
app.use(express.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    port: 8000,
    password: 'root',
    database: 'candidate_form'
});

async function ensureAdminsTable() {
    await query(`
        CREATE TABLE IF NOT EXISTS admins (
            id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            email VARCHAR(190) NOT NULL UNIQUE,
            phone VARCHAR(30) DEFAULT '',
            role VARCHAR(60) NOT NULL DEFAULT 'Admin',
            status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    const rows = await query('SELECT COUNT(*) AS total FROM admins');

    if (!rows[0]?.total) {
        await query(
            `INSERT INTO admins (name, email, phone, role, status, password)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['Admin User', 'admin@prowise.com', '+91 98765 43210', 'Super Admin', 'active', 'Admin@123']
        );
    }
}

db.connect(async (err) => {
    if (err) {
        console.log('DB Error:', err);
        return;
    }

    console.log('MySQL Connected');

    try {
        await ensureAdminsTable();
        console.log('Admin table ready');
    } catch (err) {
        console.log('Admin table setup error:', err);
    }
});

app.use(express.static(path.join(__dirname, '../')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

/* ================= FORM STATUS ================= */

app.get('/form-status', (req, res) => {
    res.json({ isOpen: global.formOpen ?? true });
});

app.post('/form-status', (req, res) => {
    const { isOpen } = req.body;
    global.formOpen = isOpen;
    res.json({ success: true });
});

/* ================= APPLICATIONS ================= */

app.post('/submit', async (req, res) => {
    const data = req.body;

    const flatData = {
        isFresher: data.isFresher,
        position: data.position,
        department: data.department,
        joiningDate: formatDate(data.joiningDate),
        fullName: data.fullName,
        dob: formatDate(data.dob),
        gender: data.gender,
        maritalStatus: data.maritalStatus,
        phone: data.phone,
        email: data.email,
        nationality: data.nationality,
        address: data.address,
        currentOrg: data.currentOrg,
        currentDesignation: data.currentDesignation,
        reportingTo: data.reportingTo,
        currentCTC: data.currentCTC,
        noticePeriod: data.noticePeriod,
        lastWorkingDay: formatDate(data.lastWorkingDay),
        expectedCTC: data.expectedCTC,
        excelLevel: data.excelLevel,
        declaration: data.declarationAccepted,
        formDate: formatDate(data.formDate)
    };

    try {
        await query('INSERT INTO applications SET ?', flatData);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error });
    }
});

app.get('/applications', async (req, res) => {
    try {
        const result = await query('SELECT * FROM applications ORDER BY id DESC');
        res.json(result);
    } catch (error) {
        res.status(500).json(error);
    }
});

app.put('/applications/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    db.query('UPDATE applications SET status = ? WHERE id = ?', [status, id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Status updated' });
    });
});

app.delete('/applications/:id', (req, res) => {
    db.query('DELETE FROM applications WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
});

/* ================= ADMINS ================= */

app.get('/admins', async (req, res) => {
    try {
        const admins = await query(`
            SELECT id, name, email, phone, role, status, created_at, updated_at
            FROM admins
            ORDER BY created_at DESC
        `);
        res.json(admins);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/admins', async (req, res) => {
    const admin = normalizeAdminPayload(req.body);

    if (!admin.name || !admin.email || !admin.password) {
        return res.status(400).json({ error: 'Name, email, password required' });
    }

    try {
        const result = await query(
            `INSERT INTO admins (name, email, phone, role, status, password)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [admin.name, admin.email, admin.phone, admin.role, admin.status, admin.password]
        );

        const created = await query(`SELECT * FROM admins WHERE id = ?`, [result.insertId]);

        res.status(201).json(created[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/admins/:id', async (req, res) => {
    const adminId = Number(req.params.id);
    const admin = normalizeAdminPayload(req.body);

    if (!adminId || !admin.name || !admin.email) {
        return res.status(400).json({ error: 'Invalid data' });
    }

    try {
        let sql = `
            UPDATE admins
            SET name=?, email=?, phone=?, role=?, status=?
        `;

        const values = [admin.name, admin.email, admin.phone, admin.role, admin.status];

        if (admin.password) {
            sql += ', password=?';
            values.push(admin.password);
        }

        sql += ' WHERE id=?';
        values.push(adminId);

        await query(sql, values);

        const updated = await query(`SELECT * FROM admins WHERE id=?`, [adminId]);

        res.json(updated[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/admins/:id', (req, res) => {
    db.query('DELETE FROM admins WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted successfully' });
    });
});

/* ================= LOGIN ================= */

app.get("/me", async (req, res) => {
    console.log("recived")
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ msg: "Unauthorized" });
        }

        const decoded = jwt.verify(token, 'shhhh');
        if (!decoded) {
            return res.status(401).json({ msg: "Unauthorized" });
        }
        res.status(200).json({ user: decoded })

    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: "Internal Server Error" });
    }
})

app.post('/admin-auth', async (req, res) => {
    
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();

    console.log("email: ", email)
    console.log("password: ", password)

    if (!email || !password) {
        return res.status(400).json({ error: 'Email & password required' });
    }

    try {
        const rows = await query(
            `SELECT id, name, email, role, status, password FROM admins WHERE email=? LIMIT 1`,
            [email]
        );

        const admin = rows[0];

        // ✅ SIMPLE PLAIN PASSWORD CHECK
        if (!admin || admin.password !== password) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (admin.status !== 'active') {
            return res.status(403).json({ error: 'Account inactive' });
        }

        const token = jwt.sign({ email }, 'shhhh');

        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "Lax"
        });

        res.json({
            success: true,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/* ================= SERVER ================= */

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});