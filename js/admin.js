const STORAGE_KEY = 'prowise_applications';
const LEGACY_STORAGE_KEY = 'candidateApplication';
const FORM_VISIBILITY_KEY = 'prowise_form_open';

let currentView = 'dashboard';

let appsData = [];

async function getApps() {
    try {
        const res = await fetch('http://localhost:3000/applications');
        const data = await res.json();

        appsData = data.map(app => ({
            ...app,
            status: app.status || 'new',
            submittedAt: app.created_at || new Date().toISOString()
        }));

        return appsData;

    } catch (err) {
        console.error(err);
        return [];
    }
}

function saveApps(apps) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

function migrateLegacyApplication() {
    const apps = getApps();
    if (apps.length > 0) {
        return;
    }

    try {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || 'null');
        if (legacy && typeof legacy === 'object') {
            saveApps([{
                id: legacy.id || 'APP-001',
                submittedAt: legacy.submittedAt || new Date().toISOString(),
                status: legacy.status || 'new',
                ...legacy
            }]);
        }
    } catch {
        // Ignore malformed legacy data.
    }
}

function getById(id) {
    return getApps().find((app) => app.id === id);
}

function deleteApp(id) {
    saveApps(getApps().filter((app) => app.id !== id));
}

function updateStatus(id, status) {
    const apps = getApps();
    const application = apps.find((item) => item.id === id);

    if (application) {
        application.status = status;
        saveApps(apps);
    }
}

function initials(name) {
    return (name || '')
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'NA';
}

function safeText(value, fallback = 'N/A') {
    return value ? String(value) : fallback;
}

function badgeHtml(status) {
    const safeStatus = status || 'new';
    return `<span class="badge badge-${safeStatus}">${safeStatus}</span>`;
}

function fmtDate(iso) {
    if (!iso) {
        return 'N/A';
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }

    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatDepartment(value) {
    if (!value) {
        return 'N/A';
    }

    return value.toUpperCase();
}

function isFormOpen() {
    return localStorage.getItem(FORM_VISIBILITY_KEY) !== 'false';
}

function setFormAvailability(isOpen) {
    localStorage.setItem(FORM_VISIBILITY_KEY, String(isOpen));
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.getElementById('mainArea').classList.toggle('expanded');
}

function switchView(view) {
    currentView = view;
    document.querySelectorAll('.nav-item').forEach((element) => {
        element.classList.toggle('active', element.dataset.view === view);
    });
    render();
}

async function render() {
    const contentArea = document.getElementById('contentArea');
    const apps = await getApps();

    if (currentView === 'dashboard') {
        contentArea.innerHTML = renderDashboard(apps);
    } else if (currentView === 'applications') {
        contentArea.innerHTML = renderApplications(apps);
    } else if (currentView === 'settings') {
        contentArea.innerHTML = renderSettings();
    } else {
        contentArea.innerHTML = renderPlaceholder(
            currentView.charAt(0).toUpperCase() + currentView.slice(1)
        );
    }
}
function renderDashboard(apps) {
    const total = apps.length;
    const newCount = apps.filter((app) => app.status === 'new').length;
    const shortlistedCount = apps.filter((app) => app.status === 'shortlisted').length;
    const rejectedCount = apps.filter((app) => app.status === 'rejected').length;
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
  <input type="checkbox"
         ${isFormOpen() ? 'checked' : ''}
         onchange="toggleFormAvailability(this.checked)">
  <span class="slider"></span>
</label>
                    </div>
                    <div class="settings-status ${isFormOpen() ? 'open' : 'closed'}">
                        
                    </div>
                </div>
            </div>
            <div class="stats-grid">
                <div class="stat-card" onclick="switchView('applications')"><div class="stat-icon blue"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div><div class="stat-value">${total}</div><div class="stat-label">Total Applications</div></div></div>
                <div class="stat-card" onclick="switchView('applications')"><div class="stat-icon cyan"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><div class="stat-value">${newCount}</div><div class="stat-label">New</div></div></div>
                <div class="stat-card"><div class="stat-icon green"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div><div class="stat-value">${shortlistedCount}</div><div class="stat-label">Shortlisted</div></div></div>
                <div class="stat-card"><div class="stat-icon red"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div><div><div class="stat-value">${rejectedCount}</div><div class="stat-label">Rejected</div></div></div>
            </div>
            <div class="two-col-grid">
                <div class="card"><div class="card-header"><h2>By Department</h2></div><div class="card-body">${deptBars}</div></div>
                <div class="card"><div class="card-header"><h2>Recent Applications</h2></div><div class="card-body">${recentHtml || '<div class="empty-state">No applications submitted yet.</div>'}</div></div>
            </div>
        </div>`;
}

function renderApplications(apps) {
    const rows = apps.map((app) => `
        <tr data-name="${safeText(app.fullName, '').toLowerCase()}" data-email="${safeText(app.email, '').toLowerCase()}" data-pos="${safeText(app.position, '').toLowerCase()}" data-status="${app.status || 'new'}" data-dept="${app.department || ''}">
            <td><div class="candidate-cell"><div class="avatar">${initials(app.fullName)}</div><div><div class="name">${safeText(app.fullName)}</div><div class="email">${safeText(app.email)}</div></div></div></td>
            <td>${safeText(app.position)}</td>
            <td><span class="badge badge-dept">${safeText(app.department, 'n/a')}</span></td>
            <td>${fmtDate(app.submittedAt)}</td>
            <td>${badgeHtml(app.status)}</td>
            <td><div class="action-btns">
                <button class="btn-ghost" title="View" onclick="openDetail('${app.id}')"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                <button class="btn-ghost-danger" title="Delete" onclick="handleDelete('${app.id}')"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </div></td>
        </tr>`)
        .join('');

    return `
        <div class="animate-fade">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.75rem">
                <div><h1 style="font-size:1.5rem;font-weight:700">Applications</h1><p style="font-size:0.85rem;color:var(--fg-muted)" id="appCount">${apps.length} total applications</p></div>
                <button class="btn btn-outline btn-sm" onclick="exportCSV()"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Export CSV</button>
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
                        <label class="toggle-switch" for="formVisibilityToggle">
                            <input type="checkbox" id="formVisibilityToggle" ${formOpen ? 'checked' : ''} onchange="toggleFormAvailability(this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="settings-status ${formOpen ? 'open' : 'closed'}">
                        
                    </div>
                </div>
            </div>
        </div>`;
}

function filterTable() {
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

function handleDelete(id) {
    if (confirm('Delete this application?')) {
        deleteApp(id);
        render();
    }
}

function exportCSV() {
    const apps = getApps();
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Position', 'Department', 'Status', 'Submitted'];
    const rows = apps.map((app) => [
        safeText(app.id, ''),
        safeText(app.fullName, ''),
        safeText(app.email, ''),
        safeText(app.phone, ''),
        safeText(app.position, ''),
        safeText(app.department, ''),
        safeText(app.status, ''),
        fmtDate(app.submittedAt)
    ]);
    const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'prowise_applications.csv';
    link.click();
    URL.revokeObjectURL(link.href);
}

function renderInfoItem(label, value) {
    return `<div class="info-item"><label>${label}</label><span>${safeText(value)}</span></div>`;
}

function openDetail(id) {
    const application = appsData.find(app => app.id == id);
    if (!application) {
        return;
    }

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
                <select class="status-select" onchange="changeStatus('${application.id}',this.value)">
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
            <div class="detail-section"><h3>Skills & Exposure</h3>
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

function changeStatus(id, status) {
    updateStatus(id, status);
    render();
    openDetail(id);
}

function toggleFormAvailability(isOpen) {
    setFormAvailability(isOpen);
    render();
}

function renderPlaceholder(title) {
    return `<div class="empty-state animate-fade" style="margin-top:4rem"><h2 style="font-size:1.25rem;font-weight:600;color:var(--fg);margin-bottom:0.5rem">${title}</h2><p>Coming soon.</p></div>`;
}

migrateLegacyApplication();
render();

window.toggleSidebar = toggleSidebar;
window.switchView = switchView;
window.filterTable = filterTable;
window.handleDelete = handleDelete;
window.exportCSV = exportCSV;
window.openDetail = openDetail;
window.closeDetail = closeDetail;
window.closeDetailOnOverlay = closeDetailOnOverlay;
window.changeStatus = changeStatus;
window.toggleFormAvailability = toggleFormAvailability;
