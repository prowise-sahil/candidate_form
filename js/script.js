var EDUCATION_ROWS = ['10th','12th','Graduation','Post Graduation','Professional (CA/CMA/MBA/etc.)'];

var SKILL_FIELDS = [
    { id: 'internalAudit', label: 'Internal Audit' },
    { id: 'statutoryAudit', label: 'Statutory Audit' },
    { id: 'ifcSox', label: 'IFC/SOX' },
    { id: 'gst', label: 'GST Compliances' },
    { id: 'tds', label: 'TDS Compliances' },
    { id: 'finalization', label: 'Finalization of Accounts' },
    { id: 'budgeting', label: 'Budgeting' },
    { id: 'mis', label: 'MIS Reporting' }
];

var currentStep = 0;
var totalSteps = 8;
var isFresher = false;
var skippedSteps = [3, 4];

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
    stepDots.forEach(function(dot, index) {

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

    labels.forEach(function(label, index) {
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

    steps.forEach(function(step, i) {
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
function validateCurrentStep() {
    var currentFormStep = steps[currentStep];
    var requiredInputs = currentFormStep.querySelectorAll('[required]');
    var isValid = true;

    requiredInputs.forEach(function(input) {
        var value = input.type === 'checkbox' ? input.checked : input.value.trim();

        if (!value) {
            input.style.borderColor = '#ef4444';
            isValid = false;
        } else {
            input.style.borderColor = '';
        }
    });

    if (!isValid) alert('Please fill all required fields');
    return isValid;
}

function getInputValue(id) {
    return document.getElementById(id)?.value.trim() || '';
}

function getTableRows(stepIndex) {
    return steps[stepIndex].querySelectorAll('tbody tr');
}

// ✅ KEEP YOUR COLLECTION LOGIC
function collectEducation() {
    var rows = getTableRows(2);
    return Array.from(rows).map(function(row, index) {
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
    var rows = getTableRows(3);
    return Array.from(rows).map(function(row) {
        var cells = row.querySelectorAll('input');
        return {
            company: cells[0]?.value || '',
            industry: cells[1]?.value || '',
            designation: cells[2]?.value || '',
            from: cells[3]?.value || '',
            to: cells[4]?.value || '',
            ctc: cells[5]?.value || '',
            reason: cells[6]?.value || ''
        };
    });
}

function collectReferences() {
    var rows = getTableRows(6);
    return Array.from(rows).map(function(row) {
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
    if (!validateCurrentStep()) return;

    var btn = document.getElementById('submitBtn');
    var original = btn.textContent;

    btn.textContent = 'Submitting...';
    btn.disabled = true;

    var data = buildApplicationPayload();

    fetch('http://localhost:3000/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(() => {
        alert('Application submitted successfully');
        document.getElementById('applicationForm').reset();
        showStep(0);
    })
    .catch(() => {
        console.log(data); // fallback
        alert('Backend not connected yet');
    })
    .finally(() => {
        btn.textContent = original;
        btn.disabled = false;
    });
}

// ✅ CLICK EVENTS RESTORED
stepDots.forEach((dot, index) => {
    dot.addEventListener('click', () => showStep(index));
});

document.querySelectorAll('.step-label').forEach((label, index) => {
    label.addEventListener('click', () => showStep(index));
});

updateProgress();

window.nextStep = nextStep;
window.prevStep = prevStep;
window.submitForm = submitForm;
window.handleFresherChange = handleFresherChange;