var STORAGE_KEY = 'prowise_applications';
var FORM_STORAGE_KEY = 'candidateApplication';
var FORM_VISIBILITY_KEY = 'prowise_form_open';
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
var skippedSteps = [3, 4]; // Employment History and Current Employment

var steps = document.querySelectorAll('.form-step');
var stepDots = document.querySelectorAll('.step-dot');
var progressStep = document.querySelector('.progress-step');
var formOpenState = document.getElementById('formOpenState');
var formClosedState = document.getElementById('formClosedState');

function handleFresherChange(fresher) {
    isFresher = fresher;
    var note = document.getElementById('fresherNote');
    if (fresher) {
        note.classList.add('visible');
    } else {
        note.classList.remove('visible');
    }
}

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

function isFormOpen() {
    return localStorage.getItem(FORM_VISIBILITY_KEY) !== 'false';
}

function setFormDisabledState(disabled) {
    var formElements = document.querySelectorAll('#applicationForm input, #applicationForm select, #applicationForm textarea, #applicationForm button');
    formElements.forEach(function(element) { element.disabled = disabled; });
}

function applyFormAvailability() {
    var isOpen = isFormOpen();
    if (formOpenState) formOpenState.hidden = !isOpen;
    if (formClosedState) formClosedState.hidden = isOpen;
    setFormDisabledState(!isOpen);
}

function updateProgress() {
    var visibleSteps = [];
    for (var i = 0; i < totalSteps; i++) {
        if (!isFresher || skippedSteps.indexOf(i) === -1) {
            visibleSteps.push(i);
        }
    }
    var currentVisibleIndex = visibleSteps.indexOf(currentStep);
    var progressPercent = visibleSteps.length > 1 ? (currentVisibleIndex / (visibleSteps.length - 1)) * 100 : 0;

    stepDots.forEach(function(dot, index) {
        if (isFresher && skippedSteps.indexOf(index) !== -1) {
            dot.style.opacity = '0.3';
            dot.style.pointerEvents = 'none';
        } else {
            dot.style.opacity = '1';
            dot.style.pointerEvents = 'auto';
        }
        dot.classList.toggle('active', index <= currentStep && (skippedSteps.indexOf(index) === -1 || !isFresher));
    });

    progressStep.style.width = progressPercent + '%';

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

function showStep(index) {
    if (isFresher && skippedSteps.indexOf(index) !== -1) return;
    steps.forEach(function(step, i) {
        step.classList.toggle('active', i === index);
    });
    currentStep = index;
    updateProgress();
}

function nextStep() {
    if (validateCurrentStep()) {
        var next = getNextVisibleStep(currentStep, 1);
        if (next !== currentStep) showStep(next);
    }
}

function prevStep() {
    var prev = getNextVisibleStep(currentStep, -1);
    if (prev !== currentStep) showStep(prev);
}

function validateCurrentStep() {
    var currentFormStep = steps[currentStep];
    var requiredInputs = currentFormStep.querySelectorAll('[required]');
    var isValid = true;
    requiredInputs.forEach(function(input) {
        var isCheckbox = input.type === 'checkbox';
        var hasValue = isCheckbox ? input.checked : input.value.trim();
        if (!hasValue) { input.style.borderColor = '#ef4444'; isValid = false; }
        else { input.style.borderColor = ''; }
    });
    if (!isValid) alert('Please fill all required fields before proceeding.');
    return isValid;
}

function getInputValue(id) {
    var element = document.getElementById(id);
    return element ? element.value.trim() : '';
}

function getTableRows(stepIndex) {
    return steps[stepIndex].querySelectorAll('tbody tr');
}

function collectEducation() {
    var rows = getTableRows(2);
    return Array.from(rows).map(function(row, index) {
        var cells = row.querySelectorAll('input');
        return { qual: EDUCATION_ROWS[index] || '', inst: cells[0]?.value.trim()||'', univ: cells[1]?.value.trim()||'', year: cells[2]?.value.trim()||'', cgpa: cells[3]?.value.trim()||'', mode: cells[4]?.value.trim()||'' };
    }).filter(function(item) { return Object.values(item).some(Boolean); });
}

function collectEmployment() {
    if (isFresher) return [];
    var rows = getTableRows(3);
    return Array.from(rows).map(function(row) {
        var cells = row.querySelectorAll('input');
        return { company: cells[0]?.value.trim()||'', industry: cells[1]?.value.trim()||'', designation: cells[2]?.value.trim()||'', from: cells[3]?.value.trim()||'', to: cells[4]?.value.trim()||'', ctc: cells[5]?.value.trim()||'', reason: cells[6]?.value.trim()||'' };
    }).filter(function(item) { return Object.values(item).some(Boolean); });
}

function collectReferences() {
    var rows = getTableRows(6);
    return Array.from(rows).map(function(row) {
        var cells = row.querySelectorAll('input');
        return { name: cells[0]?.value.trim()||'', org: cells[1]?.value.trim()||'', desig: cells[2]?.value.trim()||'', contact: cells[3]?.value.trim()||'', rel: cells[4]?.value.trim()||'' };
    }).filter(function(item) { return Object.values(item).some(Boolean); });
}

function collectSkills() {
    return SKILL_FIELDS.filter(function(skill) { return document.getElementById(skill.id)?.checked; }).map(function(skill) { return skill.label; });
}

function getDepartmentLabel(value) {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function createApplicationId(existingApps) {
    var maxId = existingApps.reduce(function(highest, app) {
        var value = parseInt(String(app.id || '').replace('APP-', ''), 10);
        return isNaN(value) ? highest : Math.max(highest, value);
    }, 0);
    return 'APP-' + String(maxId + 1).padStart(3, '0');
}

function getStoredApplications() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch(e) { return []; }
}

function buildApplicationPayload() {
    var applications = getStoredApplications();
    var department = getInputValue('department');
    return {
        id: createApplicationId(applications), submittedAt: new Date().toISOString(), status: 'new',
        isFresher: isFresher,
        position: getInputValue('position'), department: department, departmentLabel: getDepartmentLabel(department),
        joiningDate: getInputValue('joiningDate'), fullName: getInputValue('fullName'), dob: getInputValue('dob'),
        gender: getInputValue('gender'), maritalStatus: getInputValue('maritalStatus'), phone: getInputValue('phone'),
        email: getInputValue('email'), nationality: getInputValue('nationality'), address: getInputValue('address'),
        certification: getInputValue('certification'), education: collectEducation(), employment: collectEmployment(),
        currentOrg: isFresher ? '' : getInputValue('currentOrg'),
        currentDesignation: isFresher ? '' : getInputValue('currentDesignation'),
        reportingTo: isFresher ? '' : getInputValue('reportingTo'),
        currentCTC: isFresher ? '' : getInputValue('currentCTC'),
        noticePeriod: isFresher ? '' : getInputValue('noticePeriod'),
        lastWorkingDay: isFresher ? '' : getInputValue('lastWorkingDay'),
        expectedCTC: getInputValue('expectedCTC'),
        skills: collectSkills(), excelLevel: getInputValue('excelLevel'),
        bgVerification: getInputValue('backgroundVerification'), references: collectReferences(),
        declarationAccepted: document.getElementById('declaration')?.checked || false, formDate: getInputValue('formDate')
    };
}

function saveApplication(data) {
    var applications = getStoredApplications();
    applications.push(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(data, null, 2));
}

function submitForm() {
    if (!isFormOpen()) { alert('This form is currently closed.'); applyFormAvailability(); return; }
    if (!validateCurrentStep()) return;
    var submitBtn = document.getElementById('submitBtn');
    var originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;
    var data = buildApplicationPayload();
    setTimeout(function() {
        saveApplication(data);
        alert('Application submitted successfully. It is now available on the admin page.');
        document.getElementById('applicationForm').reset();
        isFresher = false;
        handleFresherChange(false);
        document.querySelector('input[name="isFresher"][value="no"]').checked = true;
        showStep(0);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }, 600);
}

stepDots.forEach(function(dot, index) {
    dot.addEventListener('click', function() { showStep(index); });
});

document.querySelectorAll('.step-label').forEach(function(label, index) {
    label.addEventListener('click', function() { showStep(index); });
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        if (event.ctrlKey) nextStep();
    }
});

window.addEventListener('storage', function(event) {
    if (event.key === FORM_VISIBILITY_KEY) applyFormAvailability();
});

applyFormAvailability();
updateProgress();
window.nextStep = nextStep;
window.prevStep = prevStep;
window.submitForm = submitForm;
window.handleFresherChange = handleFresherChange;
