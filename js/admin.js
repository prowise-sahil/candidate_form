const FORM_VISIBILITY_KEY = 'prowise_form_open';               // used to store whether the form is open/closed (in browser localStorage)
const API_BASE = window.location.port === '4000' ? window.location.origin : 'http://localhost:4000'; // backend API

let currentView = 'dashboard';                             //which page is active (dashboard, applications, admins, settings)
let appsData = [];                                         //stores candidate applications
let adminsData = [];                                       //stores admin users
let currentApplication = null;                            //stores currently displayed application for PDF download

function initials(name) {                                  //Converts "John Doe" → "JD"
    return (name || '')
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'NA';
}

function safeText(value, fallback = 'N/A') {                //Prevents empty/null values → shows "N/A"
    return value ? String(value) : fallback;
}

function fmtDate(iso) {                                  //Converts date into Indian format like:
    if (!iso) {
        return 'N/A';
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return safeText(iso);
    }

    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatDate(val) {                           //Converts "it" → "IT"
    if (!val) {
        return '';
    }

    const date = new Date(val);
    return Number.isNaN(date.getTime()) ? String(val) : date.toLocaleDateString('en-IN');
}

function formatDepartment(value) {
    return value ? String(value).toUpperCase() : 'N/A';
}

function badgeHtml(status) {                                 //Creates colored labels like:[new] [active] [rejected]
    const safeStatus = (status || 'new').toLowerCase();
    return `<span class="badge badge-${safeStatus}">${safeStatus}</span>`;
}

function adminStatusBadge(status) {                             //Creates colored labels like:[new] [active] [rejected]
    const safeStatus = (status || 'active').toLowerCase();
    return `<span class="badge badge-${safeStatus}">${safeStatus}</span>`;
}

let formOpenState = true;

async function fetchFormStatus() {
    try {
        const data = await requestJson(`${API_BASE}/form-status`);
        formOpenState = data.isOpen;
    } catch {
        formOpenState = true;
    }
}

function isFormOpen() {
    return formOpenState;
}    
   
async function toggleFormAvailability(isOpen) {
    try {
        await requestJson(`${API_BASE}/form-status`, {
            method: 'POST',
            body: JSON.stringify({ isOpen })
        });

        // ✅ ADD THIS LINE
        await fetchFormStatus();
        render();
    } catch (err) {
        alert('Failed to update form status');
    }
}

async function requestJson(url, options = {}) {          //This is your main API function
                                               // Calls backend (fetch),Converts response to JSON, Handles errors automatically
 const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok) {
        throw new Error(payload?.error || `Request failed with status ${response.status}`);
    }

    return payload;
}

async function getApps() {                     //GET applications Stores data in appsData

    try {
        const data = await requestJson(`${API_BASE}/applications`);    
        appsData = data.map((app) => ({
            ...app,
            status: app.status || 'new',
            submittedAt: app.created_at || app.submittedAt || new Date().toISOString()
        }));
    } catch (error) {
        console.error(error);
        appsData = [];
    }

    return appsData;
}

async function getAdmins() {                 //stores data in adminsData
    try {
        adminsData = await requestJson(`${API_BASE}/admins`);
    } catch (error) {
        console.error(error);
        adminsData = [];
    }

    return adminsData;
}

function toggleSidebar() {                              //Sidebar toggle
    const sidebar = document.getElementById('sidebar');
    const mainArea = document.getElementById('mainArea');

    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('open');
        return;
    }

    sidebar.classList.toggle('collapsed');
    mainArea.classList.toggle('expanded');
}

function switchView(view) {                            // Changes screen like:Dashboard,Applications,AdminsSettings
    currentView = view;
    document.querySelectorAll('.nav-item').forEach((element) => {
        element.classList.toggle('active', element.dataset.view === view);
    });

    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }

    render();
}

async function render() {                                       //This controls what is shown on screen based on currentview
    const contentArea = document.getElementById('contentArea'); 
     await fetchFormStatus(); // ✅ VERY IMPORTANT

    if (currentView === 'dashboard' || currentView === 'applications') {    //dashboard → renderDashboard()
        await getApps();       
    }

    if (currentView === 'admins') {                                     //applications → renderApplications()
        await getAdmins();
    }

    if (currentView === 'dashboard') {                               //admins → renderAdmins()
        contentArea.innerHTML = renderDashboard(appsData);
        return;
    }

    if (currentView === 'applications') {                      // settings → renderSettings()

        contentArea.innerHTML = renderApplications(appsData);          
        return;
    }

    if (currentView === 'admins') {
        contentArea.innerHTML = renderAdmins(adminsData);
        return;
    }

    if (currentView === 'settings') {
        contentArea.innerHTML = renderSettings();
        return;
    }

    contentArea.innerHTML = renderPlaceholder(
        currentView.charAt(0).toUpperCase() + currentView.slice(1)
        
    );
    
}

function renderDashboard(apps) {            //shows total applications      
    const total = apps.length;                                         //New / shortlisted / rejected counts
    const newCount = apps.filter((app) => app.status === 'new').length; //Department stats (progress bars)
                                                                        //Recent applications list
    const shortlistedCount = apps.filter((app) => app.status === 'shortlisted').length; //Form ON/OFF toggle
    const rejectedCount = apps.filter((app) => app.status === 'rejected').length;
    const reviewedCount = apps.filter((app) => app.status === 'reviewed').length;
    const formStatus = isFormOpen() ? 'Open' : 'Closed';

    const departments = ['audit', 'accounts', 'it', 'hr'];
    const deptBars = departments.map((department) => {
        const count = apps.filter((app) => app.department === department).length;
        const percent = total ? (count / total) * 100 : 0;

        return `
            <div class="dept-row">
                <span class="dept-name">${department.toUpperCase()}</span>
                <div class="dept-bar-wrap">
                    <div class="dept-bar" style="width:${percent}%"></div>
                </div>
                <span class="dept-count">${count}</span>
            </div>`;
    }).join('');

    const recentHtml = [...apps]
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        .slice(0, 5)
        .map((app) => `
            <div class="recent-item" onclick="openDetail('${app.id}')">
                <div class="recent-left">
                    <div class="avatar">${initials(app.fullName)}</div>
                    <div>
                        <div class="recent-name">${safeText(app.fullName)}</div>
                        <div class="recent-meta">${safeText(app.position)} · ${formatDepartment(app.department)}</div>
                    </div>
                </div>
                ${badgeHtml(app.status)}
            </div>`)
        .join('');

    return `
        <div class="animate-fade">
            <div style="margin-bottom:1.25rem">
                <h1 style="font-size:1.5rem;font-weight:700">Dashboard</h1>
                <p style="font-size:0.85rem;color:var(--fg-muted)">Overview of submitted candidate applications</p>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="settings-row">
                        <div>
                            <div class="settings-title">Form Availability</div>
                            <p class="settings-help">Current public form status: <strong>${formStatus}</strong></p>
                        </div>
                        <label class="switch">
                            <input type="checkbox" ${isFormOpen() ? 'checked' : ''} onchange="toggleFormAvailability(this.checked)">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
            <div class="stats-grid">
                <div class="stat-card" onclick="switchView('applications')"><div class="stat-icon blue"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div><div class="stat-value">${total}</div><div class="stat-label">Total Applications</div></div></div>
                <div class="stat-card" onclick="switchView('applications')"><div class="stat-icon cyan"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><div class="stat-value">${newCount}</div><div class="stat-label">New</div></div></div>
                <div class="stat-card" onclick="switchView('applications')"><div class="stat-icon green"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div><div class="stat-value">${shortlistedCount}</div><div class="stat-label">Shortlisted</div></div></div>
                <div class="stat-card" onclick="switchView('applications')"><div class="stat-icon red"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div><div><div class="stat-value">${rejectedCount}</div><div class="stat-label">Rejected</div></div></div>
                </div>
            <div class="two-col-grid">
                <div class="card"><div class="card-header"><h2>By Department</h2></div><div class="card-body">${deptBars}</div></div>
                <div class="card"><div class="card-header"><h2>Recent Applications</h2></div><div class="card-body">${recentHtml || '<div class="empty-state">No applications submitted yet.</div>'}</div></div>
            </div>
        </div>`;
}

function renderApplications(apps) {     //Displays:Candidate list,Filters (search, status, department),Export CSV button
    const rows = apps.map((app) => `
        <tr data-name="${safeText(app.fullName, '').toLowerCase()}" data-email="${safeText(app.email, '').toLowerCase()}" data-pos="${safeText(app.position, '').toLowerCase()}" data-status="${(app.status || 'new').toLowerCase()}" data-dept="${(app.department || '').toLowerCase()}">
            <td><div class="candidate-cell"><div class="avatar">${initials(app.fullName)}</div><div><div class="name">${safeText(app.fullName)}</div><div class="email">${safeText(app.email)}</div></div></div></td>
            <td>${safeText(app.position)}</td>
            <td><span class="badge badge-dept">${safeText(app.department, 'n/a')}</span></td>
            <td>${fmtDate(app.submittedAt)}</td>
            <td>${badgeHtml(app.status)}</td>
            <td><div class="action-btns">
                <button class="btn-ghost" title="View" onclick="openDetail('${app.id}')"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                 <button class="btn-ghost-danger" title="Delete" onclick="handleAppDelete(${app.id}, '${safeText(app.fullName).replace(/'/g, "\\'")}')">
                 <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                </div></td>
        </tr>`)
        .join('');

    return `
        <div class="animate-fade">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.75rem">
                <div>
                    <h1 style="font-size:1.5rem;font-weight:700">Applications</h1>
                    <p style="font-size:0.85rem;color:var(--fg-muted)" id="appCount">${apps.length} total applications</p>
                </div>
                <div style="display:flex;gap:10px;">
                    <button class="btn btn-outline btn-sm" onclick="exportCSV()">Export CSV</button>
                </div>
            </div>
            <div class="filters-bar">
                <div class="search-wrap">
                    <svg class="search-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input class="form-input search-input" id="searchInput" placeholder="Search by name, email, or position..." oninput="filterTable()">
                </div>
                <select class="form-select" id="statusFilter" style="width:150px" onchange="filterTable()"><option value="all">All Status</option><option value="new">New</option><option value="reviewed">Reviewed</option><option value="shortlisted">Shortlisted</option><option value="rejected">Rejected</option></select>
                <select class="form-select" id="deptFilter" style="width:160px" onchange="filterTable()"><option value="all">All Departments</option><option value="audit">Audit</option><option value="accounts">Accounts</option><option value="it">IT</option><option value="hr">HR</option></select>
            </div>
            <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Candidate</th><th>Position</th><th>Department</th><th>Submitted</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody id="appTableBody">${rows || '<tr><td colspan="6" class="empty-state">No applications found.</td></tr>'}</tbody></table></div></div>
        </div>`;
}

function renderAdmins(admins) {     //Shows:Admin list,Role, phone, status,Add/Edit/Delete buttons
    const activeCount = admins.filter((admin) => admin.status === 'active').length;
    const roles = [...new Set(admins.map((admin) => safeText(admin.role, 'Admin')))].sort();
    const rows = admins.map((admin) => `
        <tr data-name="${safeText(admin.name, '').toLowerCase()}" data-email="${safeText(admin.email, '').toLowerCase()}" data-role="${safeText(admin.role, '').toLowerCase()}" data-status="${(admin.status || 'active').toLowerCase()}">
            <td>
                <div class="candidate-cell">
                    <div class="avatar">${initials(admin.name)}</div>
                    <div>
                        <div class="name">${safeText(admin.name)}</div>
                        <div class="email">${safeText(admin.email)}</div>
                    </div>
                </div>
            </td>
            <td>${safeText(admin.role)}</td>
            <td>${safeText(admin.phone, 'Not added')}</td>
            <td>${adminStatusBadge(admin.status)}</td>
            <td>${fmtDate(admin.created_at)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-ghost" title="Edit" onclick="openAdminModal(${admin.id})">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
                   
                    <button class="btn-ghost-danger" title="Delete" onclick="handleAdminDelete(${admin.id}, '${safeText(admin.name).replace(/'/g, "\\'")}')">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                </div>
            </td>
        </tr>
    `).join('');

    return `
        <div class="animate-fade">
            <div class="page-header">
                <div>
                    <h1 style="font-size:1.5rem;font-weight:700">Admins</h1>
                    <p style="font-size:0.85rem;color:var(--fg-muted)" id="adminCount">${admins.length} total admins · ${activeCount} active</p>
                </div>
                <button class="btn btn-primary" onclick="openAdminModal()">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add Admin
                </button>
            </div>
            <div class="card admin-summary-card">
                <div class="card-body admin-summary-grid">
                    <div class="summary-chip"><span class="summary-label">Team Size</span><strong>${admins.length}</strong></div>
                    <div class="summary-chip"><span class="summary-label">Active Admins</span><strong>${activeCount}</strong></div>
                    <div class="summary-chip"><span class="summary-label">Inactive Admins</span><strong>${admins.length - activeCount}</strong></div>
                </div>
            </div>
            <div class="filters-bar">
                <div class="search-wrap">
                    <svg class="search-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input class="form-input search-input" id="adminSearchInput" placeholder="Search by name, email, or role..." oninput="filterAdminTable()">
                </div>
                <select class="form-select" id="adminStatusFilter" style="width:150px" onchange="filterAdminTable()">
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
                <select class="form-select" id="adminRoleFilter" style="width:170px" onchange="filterAdminTable()">
                    <option value="all">All Roles</option>
                    ${roles.map((role) => `<option value="${role.toLowerCase()}">${role}</option>`).join('')}
                </select>
            </div>
            <div class="card" style="overflow:hidden">
                <div style="overflow-x:auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Admin</th>
                                <th>Role</th>
                                <th>Phone</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th style="text-align:right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="adminTableBody">${rows || '<tr><td colspan="6" class="empty-state">No admins available.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderSettings() {
    const formOpen = isFormOpen();
    const statusText = formOpen ? 'The application form is live on index.html.' : 'The application form is hidden and visitors will see the closed message.';

    return `
        <div class="animate-fade">
            <div style="margin-bottom:1.25rem">
                <h1 style="font-size:1.5rem;font-weight:700">Settings</h1>
                <p style="font-size:0.85rem;color:var(--fg-muted)">Control whether candidates can see and use the public form.</p>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="settings-row">
                        <div>
                            <div class="settings-title">Candidate Form Visibility</div>
                            <p class="settings-help">${statusText}</p>
                        </div>
                        <label class="switch">
                            <input type="checkbox" ${formOpen ? 'checked' : ''} onchange="toggleFormAvailability(this.checked)">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        </div>`;
}

function filterTable() {                 // Filters by:Search,Status,Department
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const deptFilter = document.getElementById('deptFilter');

    if (!searchInput || !statusFilter || !deptFilter) {
        return;
    }

    const search = searchInput.value.toLowerCase();
    const status = statusFilter.value;
    const department = deptFilter.value;
    let visibleRows = 0;

    const rows = document.querySelectorAll('#appTableBody tr[data-name]');
    rows.forEach((row) => {
        const matchesSearch =
            row.dataset.name.includes(search) ||
            row.dataset.email.includes(search) ||
            row.dataset.pos.includes(search);
        const matchesStatus = status === 'all' || row.dataset.status === status;
        const matchesDepartment = department === 'all' || row.dataset.dept === department;
        const isVisible = matchesSearch && matchesStatus && matchesDepartment;

        row.style.display = isVisible ? '' : 'none';
        if (isVisible) {
            visibleRows += 1;
        }
    });

    const appCount = document.getElementById('appCount');
    if (appCount) {
        appCount.textContent = `${visibleRows} of ${rows.length} applications`;
    }
}

function filterAdminTable() {                        //Filters by:Name/email,Role,Status
    const searchInput = document.getElementById('adminSearchInput');
    const statusFilter = document.getElementById('adminStatusFilter');
    const roleFilter = document.getElementById('adminRoleFilter');

    if (!searchInput || !statusFilter || !roleFilter) {
        return;
    }

    const search = searchInput.value.toLowerCase();
    const status = statusFilter.value;
    const role = roleFilter.value;
    let visibleRows = 0;

    const rows = document.querySelectorAll('#adminTableBody tr[data-name]');
    rows.forEach((row) => {
        const matchesSearch =
            row.dataset.name.includes(search) ||
            row.dataset.email.includes(search) ||
            row.dataset.role.includes(search);
        const matchesStatus = status === 'all' || row.dataset.status === status;
        const matchesRole = role === 'all' || row.dataset.role === role;
        const isVisible = matchesSearch && matchesStatus && matchesRole;

        row.style.display = isVisible ? '' : 'none';
        if (isVisible) {
            visibleRows += 1;
        }
    });

    const adminCount = document.getElementById('adminCount');
    if (adminCount) {
        adminCount.textContent = `${visibleRows} of ${rows.length} admins visible`;
    }
}

async function exportCSV() {               //Very important feature:Fetches all applications,Converts to CSVDownloads file:

    try {
        const apps = await requestJson(`${API_BASE}/applications`);

        if (!apps.length) {
            alert('No data to export');
            return;
        }

        const headers = [
            'ID', 'Name', 'Email', 'Phone', 'Position', 'Department', 'Joining Date',
            'DOB', 'Gender', 'Marital Status', 'Nationality', 'Address',
            '10th Institute', '10th Board', '10th Year', '10th Score', '10th Mode',
            '12th Institute', '12th Board', '12th Year', '12th Score', '12th Mode',
            'Grad Institute', 'Grad University', 'Grad Year', 'Grad Score', 'Grad Mode',
            'PG Institute', 'PG University', 'PG Year', 'PG Score', 'PG Mode',
            'Company1', 'Designation1', 'CTC1', 'From1', 'To1', 'Reason1',
            'Company2', 'Designation2', 'CTC2', 'From2', 'To2', 'Reason2',
            'Company3', 'Designation3', 'CTC3', 'From3', 'To3', 'Reason3',
            'Current Org', 'Current Designation', 'Reporting To', 'Current CTC',
            'Notice Period', 'Last Working Day', 'Expected CTC',
            'Internal Audit', 'Stat Audit', 'IFC', 'GST', 'TDS', 'Finalization', 'Budgeting', 'MIS', 'Excel',
            'Ref1 Name', 'Ref1 Org', 'Ref1 Designation', 'Ref1 Contact', 'Ref1 Relation',
            'Ref2 Name', 'Ref2 Org', 'Ref2 Designation', 'Ref2 Contact', 'Ref2 Relation',
            'Declaration', 'Form Date'
        ];

        const rows = apps.map((app) => [
            app.id, app.fullName, app.email, app.phone, app.position, app.department, formatDate(app.joiningDate),
            formatDate(app.dob), app.gender, app.maritalStatus, app.nationality, app.address,
            app.tenth_institute, app.tenth_board, app.tenth_year, app.tenth_score, app.tenth_mode,
            app.twelfth_institute, app.twelfth_board, app.twelfth_year, app.twelfth_score, app.twelfth_mode,
            app.grad_institute, app.grad_university, app.grad_year, app.grad_score, app.grad_mode,
            app.pg_institute, app.pg_university, app.pg_year, app.pg_score, app.pg_mode,
            app.c1_name, app.c1_designation, app.c1_ctc, formatDate(app.c1_from), formatDate(app.c1_to), app.c1_reason,
            app.c2_name, app.c2_designation, app.c2_ctc, formatDate(app.c2_from), formatDate(app.c2_to), app.c2_reason,
            app.c3_name, app.c3_designation, app.c3_ctc, formatDate(app.c3_from), formatDate(app.c3_to), app.c3_reason,
            app.currentOrg, app.currentDesignation, app.reportingTo, app.currentCTC, app.noticePeriod, formatDate(app.lastWorkingDay), app.expectedCTC,
            app.internalAudit, app.statutoryAudit, app.ifcSox, app.gst, app.tds, app.finalization, app.budgeting, app.mis, app.excelLevel,
            app.ref1_name, app.ref1_org, app.ref1_designation, app.ref1_contact, app.ref1_relation,
            app.ref2_name, app.ref2_org, app.ref2_designation, app.ref2_contact, app.ref2_relation,
            app.declaration, formatDate(app.formDate)
        ]);

        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'candidate_full_data.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error(error);
        alert(error.message || 'Export failed');
    }
}

function renderInfoItem(label, value) {
    return `<div class="info-item"><label>${label}</label><span>${safeText(value)}</span></div>`;
}

function downloadPDF() {
    if (!currentApplication) {
        alert('Please open a candidate profile first.');
        return;
    }

    const app = currentApplication;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let y = 6;

    // 🔶 FORMAT DATE
    function formatDate(date) {
        if (!date) return "-";
        return new Date(date).toLocaleDateString("en-IN");
    }

    // 🔶 PAGE SPACE CHECK
    function checkPageSpace(requiredHeight = 40, topSpacing = 15) {
    const pageHeight = doc.internal.pageSize.getHeight();

    if (y + requiredHeight > pageHeight - 10) {
        doc.addPage();
        y = topSpacing; // 🔥 CONTROL TOP SPACE HERE
    }
}

    const primaryColor = [255, 153, 51];
    const textColor = [0, 0, 0];

    // 🔥 AUTO MAP EDUCATION (IMPORTANT FIX)
    const education = [
        {
            qual: "10th",
            inst: app.tenth_institute,
            university: app.tenth_board,
            year: app.tenth_year,
            cgpa: app.tenth_score,
            mode: app.tenth_mode
        },
        {
            qual: "12th",
            inst: app.twelfth_institute,
            university: app.twelfth_board,
            year: app.twelfth_year,
            cgpa: app.twelfth_score,
            mode: app.twelfth_mode
        },
        {
            qual: "Graduation",
            inst: app.grad_institute,
            university: app.grad_university,
            year: app.grad_year,
            cgpa: app.grad_score,
            mode: app.grad_mode
        },
        {
            qual: "Post Graduation",
            inst: app.pg_institute,
            university: app.pg_university,
            year: app.pg_year,
            cgpa: app.pg_score,
            mode: app.pg_mode
        }
    ];

    // 🔷 LOGO
    const img = new Image();
    img.src = 'assets/logo_transparent.png';

    img.onload = function () {

        const pageWidth = doc.internal.pageSize.getWidth();
        const imgWidth = 50;
        const imgHeight = 30;
        const x = (pageWidth - imgWidth) / 2;

        doc.addImage(img, 'PNG', x, y, imgWidth, imgHeight);
        y += 30;

        // 🔷 TITLE
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.text("Candidate Application", 14, y);
        y += 8;

        // 🔷 PERSONAL INFO
        checkPageSpace(50);
        doc.setTextColor(...textColor);
        doc.setFontSize(12);
        doc.text("Personal Information", 14, y);

        doc.autoTable({
            startY: y + 2,
            theme: 'grid',
            head: [["Field", "Value"]],
            headStyles: { fillColor: primaryColor },
            styles: { fontStyle: 'bold' },
            body: [
                ["Full Name", app.fullName || "-"],
                ["Email", app.email || "-"],
                ["Phone", app.phone || "-"],
                ["Gender", app.gender || "-"],
                ["DOB", formatDate(app.dob)],
                ["Marital Status", app.maritalStatus || "-"],
                ["Nationality", app.nationality || "-"],
                ["Address", app.address || "-"]
            ]
        });

        y = doc.lastAutoTable.finalY + 12;

        // 🔷 POSITION
        checkPageSpace(40);
        doc.text("Position Details", 14, y);

        doc.autoTable({
            startY: y + 2,
            theme: 'grid',
            head: [["Field", "Value"]],
            headStyles: { fillColor: primaryColor },
            body: [
                ["Position", app.position || "-"],
                ["Department", app.department || "-"],
                ["Joining Date", formatDate(app.joiningDate)]
            ]
        });

        y = doc.lastAutoTable.finalY + 12;

        // 🔷 EDUCATION
        checkPageSpace(60);
        doc.text("Education", 14, y);

        const educationData = education.map(edu => [
            edu.qual,
            edu.inst,
            edu.university,
            edu.year,
            edu.cgpa,
            edu.mode
        ]);

        doc.autoTable({
            startY: y + 2,
            theme: 'grid',
            head: [["Qualification", "Institute", "University", "Year", "CGPA/%", "Mode"]],
            headStyles: { fillColor: primaryColor },
            styles: { fontSize: 10 },
            body: educationData
        });

        y = doc.lastAutoTable.finalY + 12;

        // 🔷 EMPLOYMENT
        checkPageSpace(70,25);
        doc.text("Employment History", 14, y);

        const employmentData = [
            [app.c1_name, app.c1_designation, app.c1_ctc, formatDate(app.c1_from), formatDate(app.c1_to), app.c1_reason],
            [app.c2_name, app.c2_designation, app.c2_ctc, formatDate(app.c2_from), formatDate(app.c2_to), app.c2_reason],
            [app.c3_name, app.c3_designation, app.c3_ctc, formatDate(app.c3_from), formatDate(app.c3_to), app.c3_reason]
        ];

        doc.autoTable({
            startY: y + 2,
            theme: 'grid',
            head: [["Company", "Designation", "CTC", "From", "To", "Reason"]],
            headStyles: { fillColor: primaryColor },
            styles: { fontSize: 10 },
            body: employmentData
        });

        y = doc.lastAutoTable.finalY + 12;

        // 🔷 CURRENT JOB
        checkPageSpace(50);
        doc.text("Current Employment", 14, y);

        doc.autoTable({
            startY: y + 2,
            theme: 'grid',
            head: [["Field", "Value"]],
            headStyles: { fillColor: primaryColor },
            body: [
                ["Organization", app.currentOrg || "-"],
                ["Designation", app.currentDesignation || "-"],
                ["CTC", app.currentCTC || "-"],
                ["Notice Period", app.noticePeriod || "-"],
                ["Expected CTC", app.expectedCTC || "-"]
            ]
        });

        y = doc.lastAutoTable.finalY + 12;

        // 🔷 SKILLS
        checkPageSpace(40);
        doc.text("Skills & Proficiency", 14, y);

        const skills = [
            app.internalAudit && "Internal Audit",
            app.statutoryAudit && "Statutory Audit",
            app.gst && "GST",
            app.tds && "TDS",
            app.finalization && "Finalization",
            app.budgeting && "Budgeting",
            app.mis && "MIS"
        ].filter(Boolean).join(", ");

        doc.autoTable({
            startY: y + 2,
            theme: 'grid',
            head: [["Field", "Value"]],
            headStyles: { fillColor: primaryColor },
            body: [
                ["Skills", skills || "-"],
                ["Excel Level", app.excelLevel || "-"]
            ]
        });

        y = doc.lastAutoTable.finalY + 12;

        // 🔷 REFERENCES
        checkPageSpace(50);
        doc.text("References", 14, y);

        doc.autoTable({
            startY: y + 2,
            theme: 'grid',
            head: [["Name", "Organization", "Designation", "Contact"]],
            headStyles: { fillColor: primaryColor },
            body: [
                [app.ref1_name, app.ref1_org, app.ref1_designation, app.ref1_contact],
                [app.ref2_name, app.ref2_org, app.ref2_designation, app.ref2_contact]
            ]
        });

        y = doc.lastAutoTable.finalY + 12;

        // 🔷 DECLARATION
        checkPageSpace(40);
        doc.text("Declaration", 14, y);

        doc.autoTable({
            startY: y + 2,
            theme: 'grid',
            head: [["Field", "Value"]],
            headStyles: { fillColor: primaryColor },
            body: [
                ["Accepted", app.declaration ? "Yes" : "No"],
                ["Form Date", formatDate(app.formDate)]
            ]
        });

        doc.save(`${app.fullName || "candidate"}.pdf`);
    };
}

function openDetail(id) {              //includes:Contact infoEducationEmployment,Skills,References

    const application = appsData.find((app) => String(app.id) === String(id));
    if (!application) {
        return;
    }

    currentApplication = application;   // Store for PDF download

    const educationRows = (application.education || [])
        .map((item) => `<tr><td>${safeText(item.qual)}</td><td>${safeText(item.inst)}</td><td>${safeText(item.univ)}</td><td>${safeText(item.year)}</td><td>${safeText(item.cgpa)}</td><td>${safeText(item.mode)}</td></tr>`)
        .join('') || '<tr><td colspan="6" style="color:var(--fg-subtle);text-align:center">No education details</td></tr>';

    const employmentRows = (application.employment || [])
        .map((item) => `<tr><td>${safeText(item.company)}</td><td>${safeText(item.industry)}</td><td>${safeText(item.designation)}</td><td>${safeText(item.from)}</td><td>${safeText(item.to)}</td><td>${safeText(item.ctc)}</td><td>${safeText(item.reason)}</td></tr>`)
        .join('') || '<tr><td colspan="7" style="color:var(--fg-subtle);text-align:center">No employment history</td></tr>';

    const referenceRows = (application.references || [])
        .map((item) => `<tr><td>${safeText(item.name)}</td><td>${safeText(item.org)}</td><td>${safeText(item.desig)}</td><td>${safeText(item.contact)}</td><td>${safeText(item.rel)}</td></tr>`)
        .join('') || '<tr><td colspan="5" style="color:var(--fg-subtle);text-align:center">No references added</td></tr>';

    const skillTags = (application.skills || [])
        .map((skill) => `<span class="skill-tag">${skill}</span>`)
        .join('');

    document.getElementById('detailPanel').innerHTML = `
        <div class="detail-header">
            <div>
                <div style="display:flex;align-items:center;gap:10px"><h2>${safeText(application.fullName)}</h2>${badgeHtml(application.status)}</div>
                <div class="meta">${safeText(application.position)} · ${formatDepartment(application.department)} · ${safeText(application.id)}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
                <button class="btn btn-outline btn-sm" onclick="downloadPDF()">PDF</button>
                <select class="status-select" onchange="changeStatus('${application.id}', this.value)">
                    <option value="new" ${application.status === 'new' ? 'selected' : ''}>New</option>
                    <option value="reviewed" ${application.status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
                    <option value="shortlisted" ${application.status === 'shortlisted' ? 'selected' : ''}>Shortlisted</option>
                    <option value="rejected" ${application.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                </select>
                <button class="btn-ghost" onclick="closeDetail()"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
        </div>
        <div class="detail-content">
            <div class="detail-section"><h3>Contact Information</h3>
                <div class="info-grid">
                    ${renderInfoItem('Email', application.email)}
                    ${renderInfoItem('Phone', application.phone)}
                    ${renderInfoItem('Date of Birth', application.dob)}
                    ${renderInfoItem('Gender', application.gender)}
                    ${renderInfoItem('Marital Status', application.maritalStatus)}
                    ${renderInfoItem('Nationality', application.nationality)}
                </div>
                <div class="info-item" style="margin-top:0.5rem"><label>Address</label><span>${safeText(application.address)}</span></div>
            </div>
            <div class="detail-section"><h3>Position Details</h3>
                <div class="info-grid">
                    ${renderInfoItem('Position', application.position)}
                    ${renderInfoItem('Department', application.department)}
                    ${renderInfoItem('Preferred Joining Date', application.joiningDate)}
                    ${renderInfoItem('Submitted On', fmtDate(application.submittedAt))}
                </div>
            </div>
            <div class="detail-section"><h3>Current Employment</h3>
                <div class="info-grid">
                    ${renderInfoItem('Organization', application.currentOrg)}
                    ${renderInfoItem('Designation', application.currentDesignation)}
                    ${renderInfoItem('Reporting To', application.reportingTo)}
                    ${renderInfoItem('Current CTC', application.currentCTC)}
                    ${renderInfoItem('Expected CTC', application.expectedCTC)}
                    ${renderInfoItem('Notice Period', application.noticePeriod)}
                    ${renderInfoItem('Last Working Day', application.lastWorkingDay)}
                </div>
            </div>
            <div class="detail-section"><h3>Education · Certification: ${safeText(application.certification)}</h3>
                <div style="overflow-x:auto"><table class="detail-table"><thead><tr><th>Qualification</th><th>Institute</th><th>University</th><th>Year</th><th>CGPA/%</th><th>Mode</th></tr></thead><tbody>${educationRows}</tbody></table></div>
            </div>
            <div class="detail-section"><h3>Employment History</h3>
                <div style="overflow-x:auto"><table class="detail-table"><thead><tr><th>Company</th><th>Industry</th><th>Designation</th><th>From</th><th>To</th><th>CTC</th><th>Reason</th></tr></thead><tbody>${employmentRows}</tbody></table></div>
            </div>
            <div class="detail-section pdf-keep-together"><h3>Skills & Exposure</h3>
                <div class="skill-tags">${skillTags || '<span style="color:var(--fg-subtle)">No skills listed</span>'}</div>
                <div class="info-item" style="margin-top:0.75rem"><label>Excel Proficiency</label><span>${safeText(application.excelLevel)}</span></div>
            </div>
            <div class="detail-section"><h3>References · BG Verification: ${safeText(application.bgVerification)}</h3>
                <div style="overflow-x:auto"><table class="detail-table"><thead><tr><th>Name</th><th>Organization</th><th>Designation</th><th>Contact</th><th>Relationship</th></tr></thead><tbody>${referenceRows}</tbody></table></div>
            </div>
            <div class="detail-section"><h3>Declaration</h3>
                <div class="info-grid">
                    ${renderInfoItem('Accepted', application.declarationAccepted ? 'Yes' : 'No')}
                    ${renderInfoItem('Form Date', application.formDate)}
                </div>
            </div>
        </div>`;

    document.getElementById('detailOverlay').classList.add('open');
}

function closeDetail() {
    document.getElementById('detailOverlay').classList.remove('open');
}

function closeDetailOnOverlay(event) {
    if (event.target === document.getElementById('detailOverlay')) {
        closeDetail();
    }
}

async function changeStatus(id, status) {
    try {
        // ✅ Call backend API
        await fetch(`${API_BASE}/applications/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        // ✅ Update locally
        const application = appsData.find(app => String(app.id) === String(id));
        if (application) {
            application.status = status;
        }

        // ✅ Refresh data + UI
        await getApps();
        render();

    } catch (err) {
        console.error(err);
        alert("Error updating status");
    }
}

function renderPlaceholder(title) {
    return `<div class="empty-state animate-fade" style="margin-top:4rem"><h2 style="font-size:1.25rem;font-weight:600;color:var(--fg);margin-bottom:0.5rem">${title}</h2><p>Coming soon.</p></div>`;
}

function openAdminModal(adminId) {              //Opens form popup Used for: Create admin,Edit admin
    const admin = adminsData.find((item) => item.id === adminId);
    const overlay = document.getElementById('adminModalOverlay');
    const title = admin ? 'Edit admin' : 'Create admin';
    const description = admin ? 'Update profile details, role, status, or password.' : 'Add another admin account for the team.';

    document.getElementById('adminModalPanel').innerHTML = `
        <div class="modal-header">
            <div>
                <h2>${title}</h2>
                <p>${description}</p>
            </div>
            <button class="btn-ghost" type="button" onclick="closeAdminModal()">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <form class="modal-form" id="adminForm" onsubmit="submitAdminForm(event)">
            <input type="hidden" name="id" value="${admin?.id || ''}">
            <div class="form-grid modal-grid">
                <div class="form-group">
                    <label class="form-label" for="adminName">Full name</label>
                    <input class="form-input" id="adminName" name="name" value="${admin?.name || ''}" placeholder="Enter your name" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="adminEmail">Email</label>
                    <input class="form-input" id="adminEmail" type="email" name="email" value="${admin?.email || ''}" placeholder="Enter your email id" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="adminPhone">Phone</label>
                    <input class="form-input" id="adminPhone" name="phone" value="${admin?.phone || ''}" placeholder="+91 98765 43210">
                </div>
                <div class="form-group">
                    <label class="form-label" for="adminRole">Role</label>
                    <input class="form-input" id="adminRole" name="role" value="${admin?.role || 'Admin'}" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="adminStatus">Status</label>
                    <select class="form-select" id="adminStatus" name="status">
                        <option value="active" ${(admin?.status || 'active') === 'active' ? 'selected' : ''}>Active</option>
                        <option value="inactive" ${(admin?.status || 'active') === 'inactive' ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="adminPassword">${admin ? 'New password' : 'Password'}</label>
                    <input class="form-input" id="adminPassword" type="password" name="password" ${admin ? '' : 'required'} placeholder="${admin ? 'Leave blank to keep current password' : 'Set a strong password'}">
                </div>
            </div>
            <div class="modal-footer">
                <p class="modal-help">${admin ? 'Leave password blank if you only want to update the profile details.' : 'This password will be used on the admin login screen.'}</p>
                <div class="modal-actions">
                    <button class="btn btn-outline" type="button" onclick="closeAdminModal()">Cancel</button>
                    <button class="btn btn-primary" id="adminSubmitBtn" type="submit">${admin ? 'Save Changes' : 'Create Admin'}</button>
                </div>
            </div>
        </form>
    `;

    overlay.classList.add('open');
}

function closeAdminModal() {
    document.getElementById('adminModalOverlay').classList.remove('open');
}

function closeAdminModalOnOverlay(event) {
    if (event.target === document.getElementById('adminModalOverlay')) {
        closeAdminModal();
    }
}

async function submitAdminForm(event) {      //POST → create PUT → update
    event.preventDefault();              //Validations: Name required,Email required,Password required (only for new admin)
    const form = event.target;
    const submitBtn = document.getElementById('adminSubmitBtn');
    const formData = new FormData(form);
    const id = formData.get('id');
    const payload = {
        name: String(formData.get('name') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        phone: String(formData.get('phone') || '').trim(),
        role: String(formData.get('role') || '').trim(),
        status: String(formData.get('status') || 'active').trim(),
        password: String(formData.get('password') || '').trim()
    };

    if (!payload.name || !payload.email || !payload.role) {
        alert('Name, email, and role are required.');
        return;
    }

    if (!id && !payload.password) {
        alert('Password is required for new admins.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = id ? 'Saving...' : 'Creating...';

    try {
        await requestJson(`${API_BASE}/admins${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(payload)
        });

        closeAdminModal();         
        await getAdmins();
        currentView = 'admins';
        render();
    } catch (error) {
        alert(error.message || 'Unable to save admin.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = id ? 'Save Changes' : 'Create Admin';
    }
}    

async function handleAppDelete(id, name) {
    console.log("Deleting Application ID:", id);

    const confirmDelete = confirm(`Delete application of "${name}"?`);
    if (!confirmDelete) return;

    try {
        const res = await fetch(`${API_BASE}/applications/${id}`, {
            method: 'DELETE'
        });

        const data = await res.json();

        if (res.ok) {
            alert("Application deleted successfully");

            // ✅ remove only from applications
            appsData = appsData.filter(app => String(app.id) !== String(id));

            render();
        } else {
            alert(data.error || "Delete failed");
        }
    } catch (err) {
        console.error(err);
        alert("Server error");
    }
}
  async function handleAdminDelete(id, name) {    //Flow: Confirm delete,Call DELETE API,Remove from adminsData,Re-render UI
console.log("Deleting admin:", id);
const confirmDelete = confirm(`Delete admin "${name}"?`);
    if (!confirmDelete) return;

    try {
        const res = await fetch(`${API_BASE}/admins/${id}`, {
            method: 'DELETE'
        });

        const data = await res.json();

        if (res.ok) {
            alert("Admin deleted successfully");

            // ✅ Correct array
            adminsData = adminsData.filter(admin => admin.id !== id);
            // ✅ Re-render properly
            render();

        } else {
            alert(data.error || "Delete failed");
        }
    } catch (err) {
        console.error(err);
        alert("Server error");
    }
}


window.addEventListener('keydown', (event) => { 
    if (event.key === 'Escape') {               //ESC key support
        closeDetail();                        //Close panels
        closeAdminModal();
    }
});

render();

window.toggleSidebar = toggleSidebar;
window.switchView = switchView;
window.filterTable = filterTable;
window.filterAdminTable = filterAdminTable;
window.exportCSV = exportCSV;
window.openDetail = openDetail;
window.closeDetail = closeDetail;
window.closeDetailOnOverlay = closeDetailOnOverlay;
window.changeStatus = changeStatus;
window.toggleFormAvailability = toggleFormAvailability;
window.downloadPDF = downloadPDF;
window.openAdminModal = openAdminModal;
window.closeAdminModal = closeAdminModal;
window.closeAdminModalOnOverlay = closeAdminModalOnOverlay;
window.submitAdminForm = submitAdminForm;
window.handleAdminDelete = handleAdminDelete;
