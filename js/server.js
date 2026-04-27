const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();

function formatDate(value) {
    return value && String(value).trim() !== '' ? value : null;
}

function text(value) {
    return String(value ?? '').trim();
}

function booleanValue(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
}

function hasData(values) {
    return values.some((value) => text(value) !== '');
}

const skillColumns = [
    { column: 'internalAudit', label: 'Internal Audit' },
    { column: 'statutoryAudit', label: 'Statutory Audit' },
    { column: 'ifcSox', label: 'IFC/SOX' },
    { column: 'gst', label: 'GST Compliances' },
    { column: 'tds', label: 'TDS Compliances' },
    { column: 'finalization', label: 'Finalization of Accounts' },
    { column: 'budgeting', label: 'Budgeting' },
    { column: 'mis', label: 'MIS Reporting' }
];

function normalizeSelectedSkills(data = {}) {
    const selectedLabels = new Set(
        (Array.isArray(data.skills) ? data.skills : [])
            .map((skill) => text(skill).toLowerCase())
    );

    return Object.fromEntries(
        skillColumns.map(({ column, label }) => [
            column,
            booleanValue(data[column]) || selectedLabels.has(label.toLowerCase()) ? 1 : 0
        ])
    );
}

function normalizeApplicationPayload(data = {}) {
    const education = Array.isArray(data.education) ? data.education : [];
    const employment = Array.isArray(data.employment) ? data.employment : [];
    const references = Array.isArray(data.references) ? data.references : [];

    const tenth = education[0] || {};
    const twelfth = education[1] || {};
    const grad = education[2] || {};
    const pg = education[3] || {};

    const c1 = employment[0] || {};
    const c2 = employment[1] || {};
    const c3 = employment[2] || {};

    const ref1 = references[0] || {};
    const ref2 = references[1] || {};

    return {
        isFresher: data.isFresher ? '1' : '0',
        position: text(data.position),
        department: text(data.department),
        joiningDate: formatDate(data.joiningDate),

        fullName: text(data.fullName),
        dob: formatDate(data.dob),
        gender: text(data.gender),
        maritalStatus: text(data.maritalStatus),
        phone: text(data.phone),
        email: text(data.email),
        nationality: text(data.nationality),
        address: text(data.address),

        certification: text(data.certification),

        tenth_institute: text(tenth.inst),
        tenth_board: text(tenth.univ),
        tenth_year: text(tenth.year),
        tenth_score: text(tenth.cgpa),
        tenth_mode: text(tenth.mode),

        twelfth_institute: text(twelfth.inst),
        twelfth_board: text(twelfth.univ),
        twelfth_year: text(twelfth.year),
        twelfth_score: text(twelfth.cgpa),
        twelfth_mode: text(twelfth.mode),

        grad_institute: text(grad.inst),
        grad_university: text(grad.univ),
        grad_year: text(grad.year),
        grad_score: text(grad.cgpa),
        grad_mode: text(grad.mode),

        pg_institute: text(pg.inst),
        pg_university: text(pg.univ),
        pg_year: text(pg.year),
        pg_score: text(pg.cgpa),
        pg_mode: text(pg.mode),

        c1_name: text(c1.company),
        c1_industry: text(c1.industry),
        c1_designation: text(c1.designation),
        c1_ctc: text(c1.ctc),
        c1_from: formatDate(c1.from),
        c1_to: formatDate(c1.to),
        c1_reason: text(c1.reason),

        c2_name: text(c2.company),
        c2_industry: text(c2.industry),
        c2_designation: text(c2.designation),
        c2_ctc: text(c2.ctc),
        c2_from: formatDate(c2.from),
        c2_to: formatDate(c2.to),
        c2_reason: text(c2.reason),

        c3_name: text(c3.company),
        c3_industry: text(c3.industry),
        c3_designation: text(c3.designation),
        c3_ctc: text(c3.ctc),
        c3_from: formatDate(c3.from),
        c3_to: formatDate(c3.to),
        c3_reason: text(c3.reason),

        currentOrg: text(data.currentOrg),
        currentDesignation: text(data.currentDesignation),
        reportingTo: text(data.reportingTo),
        currentCTC: text(data.currentCTC),
        noticePeriod: text(data.noticePeriod),
        lastWorkingDay: formatDate(data.lastWorkingDay),
        expectedCTC: text(data.expectedCTC),

        ...normalizeSelectedSkills(data),
        excelLevel: text(data.excelLevel),

        bgVerification: text(data.bgVerification),
        ref1_name: text(ref1.name),
        ref1_org: text(ref1.org),
        ref1_designation: text(ref1.desig),
        ref1_contact: text(ref1.contact),
        ref1_relation: text(ref1.rel),
        ref2_name: text(ref2.name),
        ref2_org: text(ref2.org),
        ref2_designation: text(ref2.desig),
        ref2_contact: text(ref2.contact),
        ref2_relation: text(ref2.rel),

        declaration: data.declarationAccepted ? 1 : 0,
        formDate: formatDate(data.formDate)
    };
}

function normalizeApplicationRow(row = {}) {
    const education = [
        { qual: '10th', inst: row.tenth_institute, univ: row.tenth_board, year: row.tenth_year, cgpa: row.tenth_score, mode: row.tenth_mode },
        { qual: '12th', inst: row.twelfth_institute, univ: row.twelfth_board, year: row.twelfth_year, cgpa: row.twelfth_score, mode: row.twelfth_mode },
        { qual: 'Graduation', inst: row.grad_institute, univ: row.grad_university, year: row.grad_year, cgpa: row.grad_score, mode: row.grad_mode },
        { qual: 'Post Graduation', inst: row.pg_institute, univ: row.pg_university, year: row.pg_year, cgpa: row.pg_score, mode: row.pg_mode }
    ].filter((item) => hasData([item.inst, item.univ, item.year, item.cgpa, item.mode]));

    const employment = [
        { company: row.c1_name, industry: row.c1_industry, designation: row.c1_designation, ctc: row.c1_ctc, from: row.c1_from, to: row.c1_to, reason: row.c1_reason },
        { company: row.c2_name, industry: row.c2_industry, designation: row.c2_designation, ctc: row.c2_ctc, from: row.c2_from, to: row.c2_to, reason: row.c2_reason },
        { company: row.c3_name, industry: row.c3_industry, designation: row.c3_designation, ctc: row.c3_ctc, from: row.c3_from, to: row.c3_to, reason: row.c3_reason }
    ].filter((item) => hasData([item.company, item.industry, item.designation, item.ctc, item.from, item.to, item.reason]));

    const references = [
        { name: row.ref1_name, org: row.ref1_org, desig: row.ref1_designation, contact: row.ref1_contact, rel: row.ref1_relation },
        { name: row.ref2_name, org: row.ref2_org, desig: row.ref2_designation, contact: row.ref2_contact, rel: row.ref2_relation }
    ].filter((item) => hasData([item.name, item.org, item.desig, item.contact, item.rel]));

    return {
        ...row,
        status: row.status || 'new',
        submittedAt: row.created_at,
        declarationAccepted: booleanValue(row.declaration),
        education,
        employment,
        references,
        skills: skillColumns
            .filter(({ column }) => booleanValue(row[column]))
            .map(({ label }) => label)
    };
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

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'prowise@123',
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

async function ensureApplicationColumns() {
    const columns = await query('SHOW COLUMNS FROM applications');
    const existing = new Set(columns.map((column) => column.Field));
    const additions = [
        ['status', "VARCHAR(20) NOT NULL DEFAULT 'new'"],
        ['certification', "VARCHAR(100) DEFAULT ''"],
        ['bgVerification', "VARCHAR(10) DEFAULT ''"]
    ];

    for (const [column, definition] of additions) {
        if (!existing.has(column)) {
            await query(`ALTER TABLE applications ADD COLUMN ${column} ${definition}`);
        }
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
        await ensureApplicationColumns();
        console.log('Admin table ready');
    } catch (err) {
        console.log('Table setup error:', err);
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
    const flatData = normalizeApplicationPayload(req.body);

    try {
        await query('INSERT INTO applications SET ?', flatData);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/applications', async (req, res) => {
    try {
        const result = await query('SELECT * FROM applications ORDER BY id DESC');
        res.json(result.map(normalizeApplicationRow));
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

app.post('/admin-auth', async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();

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

app.listen(4000, () => {
    console.log('Server running on http://localhost:4000');
});
