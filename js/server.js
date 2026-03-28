const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
function formatDate(val) {
    return val && val.trim() !== '' ? val : null;
}
// middleware
app.use(cors());
app.use(express.json());

// 🔥 DB CONNECTION
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'prowise@123', // change if needed
    database: 'candidate_form'
});

db.connect(err => {
    if (err) {
        console.log('DB Error:', err);
    } else {
        console.log('MySQL Connected ✅');
    }
});

// 🔥 SUBMIT FORM
app.post('/submit', (req, res) => {
    const data = req.body;

    // 🔥 flatten your data (simple version)
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

    // 🔥 AUTO QUERY (no mismatch ever)
    const query = "INSERT INTO applications SET ?";

    db.query(query, flatData, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: err });
        }

        res.json({ success: true });
    });
});
const path = require('path');

app.use(express.static(path.join(__dirname, '../')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});
// 🔥 GET DATA (ADMIN)
app.get('/applications', (req, res) => {
    db.query('SELECT * FROM applications', (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
});

// 🚀 START SERVER
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000 🚀');
});