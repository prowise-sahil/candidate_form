var API_BASE = window.location.port === '4000' ? window.location.origin : 'http://localhost:4000';
var EDUCATION_ROWS = ['10th', '12th', 'Graduation', 'Post Graduation', 'Professional (CA/CMA/MBA/etc.)'];

var SKILL_FIELDS = [
    { id: 'internalAudit', label: 'Internal Audit' },
    { id: 'statutoryAudit', label: 'Statutory Audit' },
    { id: 'ifcSox', label: 'IFC/SOX' },
    { id: 'gst', label: 'GST Compliances' },
    { id: 'tds', label: 'TDS Compliances' },
    { id: 'finalization', label: 'Finalization of Accounts' },
    { id: 'budgeting', label: 'Budgeting' },
    { id: 'mis', label: 'MIS Reporting' },
    { id: 'fresher', label: 'Fresher' }
];

var currentStep = 0;
var totalSteps = 8;
var isFresher = false;
var skippedSteps = [3, 4];
var submittedApplicationData = null;

var steps = document.querySelectorAll('.form-step');
var stepDots = document.querySelectorAll('.step-dot');
var progressStep = document.querySelector('.progress-step');

function handleFresherChange(fresher) {
    isFresher = fresher;
    var note = document.getElementById('fresherNote');
    fresher ? note.classList.add('visible') : note.classList.remove('visible');
}

// ✅ KEEP ORIGINAL SKIP LOGIC
function getNextVisibleStep(from, direction) {
    var next = from + direction;
    while (next >= 0 && next < totalSteps) {
        if (!isFresher || skippedSteps.indexOf(next) === -1) {
            return next;
        }
        next += direction;
    }
    return from;
}

// ✅ FULL ORIGINAL PROGRESS LOGIC (FIXED)
function updateProgress() {
    var visibleSteps = [];
    for (var i = 0; i < totalSteps; i++) {
        if (!isFresher || skippedSteps.indexOf(i) === -1) {
            visibleSteps.push(i);
        }
    }

    var currentVisibleIndex = visibleSteps.indexOf(currentStep);
    var progressPercent = visibleSteps.length > 1
        ? (currentVisibleIndex / (visibleSteps.length - 1)) * 100
        : 0;

    progressStep.style.width = progressPercent + '%';

    // 🔥 restore dot behavior
    stepDots.forEach(function (dot, index) {

        if (isFresher && skippedSteps.indexOf(index) !== -1) {
            dot.style.opacity = '0.3';
            dot.style.pointerEvents = 'none';
        } else {
            dot.style.opacity = '1';
            dot.style.pointerEvents = 'auto';
        }

        dot.classList.toggle('active',
            index <= currentStep &&
            (!isFresher || skippedSteps.indexOf(index) === -1)
        );
    });

    // 🔥 restore label behavior
    var labels = document.querySelectorAll('.step-label');

    labels.forEach(function (label, index) {
        label.classList.remove('active', 'done');

        if (isFresher && skippedSteps.indexOf(index) !== -1) {
            label.style.opacity = '0.3';
            label.style.textDecoration = 'line-through';
            label.style.pointerEvents = 'none';
        } else {
            label.style.opacity = '1';
            label.style.textDecoration = 'none';
            label.style.pointerEvents = 'auto';

            if (index < currentStep) label.classList.add('done');
            else if (index === currentStep) label.classList.add('active');
        }
    });
}

// ✅ FIXED NAVIGATION (NO BLOCKING)
function showStep(index) {

    if (isFresher && skippedSteps.includes(index)) {
        index = index > currentStep ? index + 1 : index - 1;
    }

    steps.forEach(function (step, i) {
        step.classList.toggle('active', i === index);
    });

    currentStep = index;
    updateProgress();
}

function nextStep() {
    if (validateCurrentStep()) {
        var next = currentStep + 1;

        while (isFresher && skippedSteps.includes(next)) {
            next++;
        }

        showStep(next);
    }
}

function prevStep() {
    var prev = currentStep - 1;

    while (isFresher && skippedSteps.includes(prev)) {
        prev--;
    }

    showStep(prev);
}

// ✅ VALIDATION SAME
function validateStep(stepIndex) {
    var currentFormStep = steps[stepIndex];
    var requiredInputs = currentFormStep.querySelectorAll('[required]');
    var isValid = true;

    requiredInputs.forEach(function (input) {
        var value = input.type === 'checkbox' ? input.checked : input.value.trim();

        if (!value) {
            input.style.borderColor = '#ef4444';
            isValid = false;
        } else {
            input.style.borderColor = '';
        }
    });

    if (stepIndex === 5) {
        var hasSkill = SKILL_FIELDS.some(function (skill) {
            return document.getElementById(skill.id)?.checked;
        });
        var skillGroup = currentFormStep.querySelector('.checkbox-group');

        if (!hasSkill) {
            if (skillGroup) skillGroup.style.outline = '2px solid #ef4444';
            isValid = false;
        } else if (skillGroup) {
            skillGroup.style.outline = '';
        }
    }

    return isValid;
}

function validateCurrentStep() {
    var isValid = validateStep(currentStep);

    if (!isValid) alert('Please fill all required fields');
    return isValid;
}

function validateAllRequiredSteps() {
    for (var index = 0; index < totalSteps; index++) {
        if (isFresher && skippedSteps.includes(index)) {
            continue;
        }

        if (!validateStep(index)) {
            showStep(index);
            alert('Please fill all required fields');
            return false;
        }
    }

    return true;
}

function getInputValue(id) {
    return document.getElementById(id)?.value.trim() || '';
}

function getTableRows(stepIndex) {
    return steps[stepIndex].querySelectorAll('tbody tr');
}

function getReferenceInputs() {
    return document.querySelectorAll('#referenceFields input');
}

function handleBackgroundVerificationChange() {
    var bgVerification = getInputValue('backgroundVerification');
    var isRequired = bgVerification === 'yes';
    var isDisabled = bgVerification === 'no';

    getReferenceInputs().forEach(function (input) {
        input.required = isRequired;
        input.disabled = isDisabled;

        if (isDisabled) {
            input.value = '';
            input.style.borderColor = '';
        }
    });

    var referenceFields = document.getElementById('referenceFields');
    if (referenceFields) {
        referenceFields.classList.toggle('disabled-section', isDisabled);
    }
}

function getTodayDateValue() {
    var today = new Date();
    var year = today.getFullYear();
    var month = String(today.getMonth() + 1).padStart(2, '0');
    var day = String(today.getDate()).padStart(2, '0');

    return year + '-' + month + '-' + day;
}

function initializeReportDate() {
    var formDate = document.getElementById('formDate');
    if (!formDate) return;

    formDate.value = getTodayDateValue();
}

// ✅ KEEP YOUR COLLECTION LOGIC
function collectEducation() {
    var rows = getTableRows(2);
    return Array.from(rows).map(function (row, index) {
        var cells = row.querySelectorAll('input');
        return {
            qual: EDUCATION_ROWS[index] || '',
            inst: cells[0]?.value || '',
            univ: cells[1]?.value || '',
            year: cells[2]?.value || '',
            cgpa: cells[3]?.value || '',
            mode: cells[4]?.value || ''
        };
    });
}

function collectEmployment() {
    if (isFresher) return [];

    var sections = steps[3].querySelectorAll('.form-section');
    return Array.from(sections).map(function (section) {
        var cells = section.querySelectorAll('input');
        return {
            company: cells[0]?.value || '',
            industry: cells[1]?.value || '',
            designation: cells[2]?.value || '',
            ctc: cells[3]?.value || '',
            from: cells[4]?.value || '',
            to: cells[5]?.value || '',
            reason: cells[6]?.value || ''
        };
    });
}

function collectReferences() {
    if (getInputValue('backgroundVerification') === 'no') return [];

    var rows = getTableRows(6);
    return Array.from(rows).map(function (row) {
        var cells = row.querySelectorAll('input');
        return {
            name: cells[0]?.value || '',
            org: cells[1]?.value || '',
            desig: cells[2]?.value || '',
            contact: cells[3]?.value || '',
            rel: cells[4]?.value || ''
        };
    });
}

function collectSkills() {
    return SKILL_FIELDS
        .filter(s => document.getElementById(s.id)?.checked)
        .map(s => s.label);
}

// ✅ PAYLOAD (NO LOCALSTORAGE)
function buildApplicationPayload() {
    initializeReportDate();

    return {
        isFresher,
        position: getInputValue('position'),
        department: getInputValue('department'),
        joiningDate: getInputValue('joiningDate'),

        fullName: getInputValue('fullName'),
        dob: getInputValue('dob'),
        gender: getInputValue('gender'),
        maritalStatus: getInputValue('maritalStatus'),
        phone: getInputValue('phone'),
        email: getInputValue('email'),
        nationality: getInputValue('nationality'),
        address: getInputValue('address'),

        certification: getInputValue('certification'),
        education: collectEducation(),
        employment: collectEmployment(),

        currentOrg: isFresher ? '' : getInputValue('currentOrg'),
        currentDesignation: isFresher ? '' : getInputValue('currentDesignation'),
        reportingTo: isFresher ? '' : getInputValue('reportingTo'),
        currentCTC: isFresher ? '' : getInputValue('currentCTC'),
        noticePeriod: isFresher ? '' : getInputValue('noticePeriod'),
        lastWorkingDay: isFresher ? '' : getInputValue('lastWorkingDay'),
        expectedCTC: getInputValue('expectedCTC'),

        skills: collectSkills(),
        excelLevel: getInputValue('excelLevel'),

        bgVerification: getInputValue('backgroundVerification'),
        references: collectReferences(),

        declarationAccepted: document.getElementById('declaration')?.checked || false,
        formDate: getInputValue('formDate')
    };
}

// ✅ FINAL SUBMIT (NODE READY)
function submitForm() {
    if (!validateAllRequiredSteps()) return;

    var btn = document.getElementById('submitBtn');
    var original = btn.textContent;

    btn.textContent = 'Submitting...';
    btn.disabled = true;

    var data = buildApplicationPayload();

    fetch(`${API_BASE}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(async (res) => {
            const payload = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(payload?.error || 'Submission failed');
            }
            return payload;
        })
        .then(() => {
            submittedApplicationData = data;
            // hide form
            document.getElementById('applicationForm').style.display = 'none';
            // show success page
            document.getElementById('successPage').style.display = 'block';
        })
        .catch((error) => {
            console.log(data); // fallback
            alert(error.message || 'Backend not connected yet');
        })
        .finally(() => {
            btn.textContent = original;
            btn.disabled = false;
        });
}

// ✅ CLICK EVENTS RESTORED WITH VALIDATION
function formatPdfDate(date) {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('en-IN');
}

function addPdfSection(doc, title, head, body) {
    var pageHeight = doc.internal.pageSize.getHeight();
    var startY = (doc.lastAutoTable?.finalY || 30) + 10;

    if (startY > pageHeight - 45) {
        doc.addPage();
        startY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 100, 0);
    doc.text(title, 14, startY);

    doc.autoTable({
        startY: startY + 4,
        theme: 'grid',
        head: [head],
        headStyles: { fillColor: [0, 100, 0] },
        styles: { fontSize: 9, cellPadding: 2 },
        body: body.length ? body : [head.map(function () { return '-'; })]
    });
}

function downloadPDF() {
    var data = submittedApplicationData || buildApplicationPayload();

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('PDF library is still loading. Please try again in a moment.');
        return;
    }

    var doc = new window.jspdf.jsPDF();
    if (!doc.autoTable) {
        alert('PDF table library is still loading. Please try again in a moment.');
        return;
    }

    var fileName = (data.fullName || 'candidate').replace(/[^\w\s-]/g, '').trim() || 'candidate';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 100, 0);
    doc.text('Candidate Application Report', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Date of Report: ' + formatPdfDate(data.formDate), 14, 26);

    addPdfSection(doc, 'Position Details', ['Field', 'Value'], [
        ['Position Applied For', data.position || '-'],
        ['Department', data.department || '-'],
        ['Preferred Joining Date', formatPdfDate(data.joiningDate)]
    ]);

    addPdfSection(doc, 'Personal Information', ['Field', 'Value'], [
        ['Full Name', data.fullName || '-'],
        ['Date of Birth', formatPdfDate(data.dob)],
        ['Gender', data.gender || '-'],
        ['Marital Status', data.maritalStatus || '-'],
        ['Phone', data.phone || '-'],
        ['Email', data.email || '-'],
        ['Nationality', data.nationality || '-'],
        ['Address', data.address || '-']
    ]);

    addPdfSection(doc, 'Education', ['Qualification', 'Institute', 'University/Board', 'Year', 'CGPA/%', 'Mode'], data.education.map(function (item) {
        return [item.qual || '-', item.inst || '-', item.univ || '-', item.year || '-', item.cgpa || '-', item.mode || '-'];
    }));

    addPdfSection(doc, 'Employment History', ['Company', 'Industry', 'Designation', 'CTC', 'From', 'To', 'Reason'], data.employment.map(function (item) {
        return [
            item.company || '-',
            item.industry || '-',
            item.designation || '-',
            item.ctc || '-',
            formatPdfDate(item.from),
            formatPdfDate(item.to),
            item.reason || '-'
        ];
    }));

    addPdfSection(doc, 'Current Employment', ['Field', 'Value'], [
        ['Current Organization', data.currentOrg || '-'],
        ['Current Designation', data.currentDesignation || '-'],
        ['Reporting To', data.reportingTo || '-'],
        ['Current CTC', data.currentCTC || '-'],
        ['Notice Period', data.noticePeriod || '-'],
        ['Last Working Day', formatPdfDate(data.lastWorkingDay)],
        ['Expected CTC', data.expectedCTC || '-']
    ]);

    addPdfSection(doc, 'Skills & Proficiency', ['Field', 'Value'], [
        ['Skills', data.skills.length ? data.skills.join(', ') : '-'],
        ['MS Excel Proficiency', data.excelLevel || '-']
    ]);

    addPdfSection(doc, 'Background & References', ['Name', 'Organization', 'Designation', 'Contact', 'Relationship'], data.references.length
        ? data.references.map(function (item) {
            return [item.name || '-', item.org || '-', item.desig || '-', item.contact || '-', item.rel || '-'];
        })
        : [['Background Verification', data.bgVerification || '-', '-', '-', '-']]
    );

    addPdfSection(doc, 'Declaration', ['Field', 'Value'], [
        ['Declaration Accepted', data.declarationAccepted ? 'Yes' : 'No'],
        ['Date of Report', formatPdfDate(data.formDate)]
    ]);

    doc.save(fileName + '.pdf');
}

stepDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        if (validateCurrentStep()) {
            showStep(index);
        }
    });
});

document.querySelectorAll('.step-label').forEach((label, index) => {
    label.addEventListener('click', () => {
        if (validateCurrentStep()) {
            showStep(index);
        }
    });
});

function goHome() {
    window.location.reload();
}

updateProgress();
handleBackgroundVerificationChange();
initializeReportDate();

window.nextStep = nextStep;
window.prevStep = prevStep;
window.submitForm = submitForm;
window.downloadPDF = downloadPDF;
window.downloadPdf = downloadPDF;
window.handleFresherChange = handleFresherChange;
window.handleBackgroundVerificationChange = handleBackgroundVerificationChange;
