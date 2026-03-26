const STORAGE_KEY = 'prowise_applications';
const FORM_STORAGE_KEY = 'candidateApplication';
const FORM_VISIBILITY_KEY = 'prowise_form_open';
const EDUCATION_ROWS = [
    '10th',
    '12th',
    'Graduation',
    'Post Graduation',
    'Professional (CA/CMA/MBA/etc.)'
];

const SKILL_FIELDS = [
    { id: 'internalAudit', label: 'Internal Audit' },
    { id: 'statutoryAudit', label: 'Statutory Audit' },
    { id: 'ifcSox', label: 'IFC/SOX' },
    { id: 'gst', label: 'GST Compliances' },
    { id: 'tds', label: 'TDS Compliances' },
    { id: 'finalization', label: 'Finalization of Accounts' },
    { id: 'budgeting', label: 'Budgeting' },
    { id: 'mis', label: 'MIS Reporting' }
];

let currentStep = 0;
const totalSteps = 8;
const steps = document.querySelectorAll('.form-step');
const stepDots = document.querySelectorAll('.step-dot');
const progressStep = document.querySelector('.progress-step');
const formOpenState = document.getElementById('formOpenState');
const formClosedState = document.getElementById('formClosedState');

function isFormOpen() {
    return localStorage.getItem(FORM_VISIBILITY_KEY) !== 'false';
}

function setFormDisabledState(disabled) {
    const formElements = document.querySelectorAll('#applicationForm input, #applicationForm select, #applicationForm textarea, #applicationForm button');
    formElements.forEach((element) => {
        element.disabled = disabled;
    });
}

function applyFormAvailability() {
    const isOpen = isFormOpen();

    if (formOpenState) {
        formOpenState.hidden = !isOpen;
    }

    if (formClosedState) {
        formClosedState.hidden = isOpen;
    }

    setFormDisabledState(!isOpen);
}

function updateProgress() {
    const progressPercent = (currentStep / (totalSteps - 1)) * 100;

    stepDots.forEach((dot, index) => {
        dot.classList.toggle('active', index <= currentStep);
    });

    progressStep.style.width = `${progressPercent}%`;

    const labels = document.querySelectorAll('.step-label');
    labels.forEach((label, index) => {
        label.classList.remove('active', 'done');

        if (index < currentStep) {
            label.classList.add('done');
        } else if (index === currentStep) {
            label.classList.add('active');
        }
    });
}

function showStep(index) {
    steps.forEach((step, i) => {
        step.classList.toggle('active', i === index);
    });
    currentStep = index;
    updateProgress();
}

function nextStep() {
    if (validateCurrentStep() && currentStep < totalSteps - 1) {
        showStep(currentStep + 1);
    }
}

function prevStep() {
    if (currentStep > 0) {
        showStep(currentStep - 1);
    }
}

function validateCurrentStep() {
    const currentFormStep = steps[currentStep];
    const requiredInputs = currentFormStep.querySelectorAll('[required]');
    let isValid = true;

    requiredInputs.forEach((input) => {
        const isCheckbox = input.type === 'checkbox';
        const hasValue = isCheckbox ? input.checked : input.value.trim();

        if (!hasValue) {
            input.style.borderColor = '#ef4444';
            isValid = false;
        } else {
            input.style.borderColor = '';
        }
    });

    if (!isValid) {
        alert('Please fill all required fields before proceeding.');
    }

    return isValid;
}

function getInputValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : '';
}

function getTableRows(stepIndex) {
    return steps[stepIndex].querySelectorAll('tbody tr');
}

function collectEducation() {
    const rows = getTableRows(2);

    return Array.from(rows).map((row, index) => {
        const cells = row.querySelectorAll('input');
        return {
            qual: EDUCATION_ROWS[index] || `Qualification ${index + 1}`,
            inst: cells[0]?.value.trim() || '',
            univ: cells[1]?.value.trim() || '',
            year: cells[2]?.value.trim() || '',
            cgpa: cells[3]?.value.trim() || '',
            mode: cells[4]?.value.trim() || ''
        };
    }).filter((item) => Object.values(item).some(Boolean));
}

function collectEmployment() {
    const rows = getTableRows(3);

    return Array.from(rows).map((row) => {
        const cells = row.querySelectorAll('input');
        return {
            company: cells[0]?.value.trim() || '',
            industry: cells[1]?.value.trim() || '',
            designation: cells[2]?.value.trim() || '',
            from: cells[3]?.value.trim() || '',
            to: cells[4]?.value.trim() || '',
            ctc: cells[5]?.value.trim() || '',
            reason: cells[6]?.value.trim() || ''
        };
    }).filter((item) => Object.values(item).some(Boolean));
}

function collectReferences() {
    const rows = getTableRows(6);

    return Array.from(rows).map((row) => {
        const cells = row.querySelectorAll('input');
        return {
            name: cells[0]?.value.trim() || '',
            org: cells[1]?.value.trim() || '',
            desig: cells[2]?.value.trim() || '',
            contact: cells[3]?.value.trim() || '',
            rel: cells[4]?.value.trim() || ''
        };
    }).filter((item) => Object.values(item).some(Boolean));
}

function collectSkills() {
    return SKILL_FIELDS
        .filter((skill) => document.getElementById(skill.id)?.checked)
        .map((skill) => skill.label);
}

function getDepartmentLabel(value) {
    if (!value) {
        return '';
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
}

function createApplicationId(existingApps) {
    const maxId = existingApps.reduce((highest, app) => {
        const value = Number.parseInt(String(app.id || '').replace('APP-', ''), 10);
        return Number.isNaN(value) ? highest : Math.max(highest, value);
    }, 0);

    return `APP-${String(maxId + 1).padStart(3, '0')}`;
}

function getStoredApplications() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

function buildApplicationPayload() {
    const applications = getStoredApplications();
    const department = getInputValue('department');

    return {
        id: createApplicationId(applications),
        submittedAt: new Date().toISOString(),
        status: 'new',
        position: getInputValue('position'),
        department,
        departmentLabel: getDepartmentLabel(department),
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
        currentOrg: getInputValue('currentOrg'),
        currentDesignation: getInputValue('currentDesignation'),
        reportingTo: getInputValue('reportingTo'),
        currentCTC: getInputValue('currentCTC'),
        noticePeriod: getInputValue('noticePeriod'),
        lastWorkingDay: getInputValue('lastWorkingDay'),
        expectedCTC: getInputValue('expectedCTC'),
        skills: collectSkills(),
        excelLevel: getInputValue('excelLevel'),
        bgVerification: getInputValue('backgroundVerification'),
        references: collectReferences(),
        declarationAccepted: document.getElementById('declaration')?.checked || false,
        formDate: getInputValue('formDate')
    };
}

function saveApplication(data) {
    const applications = getStoredApplications();
    applications.push(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(data, null, 2));
}

async function submitForm() {
    if (!isFormOpen()) {
        alert('This form is currently closed.');
        applyFormAvailability();
        return;
    }

    if (!validateCurrentStep()) {
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    try {
        const data = buildApplicationPayload();

        await new Promise((resolve) => setTimeout(resolve, 600));

        saveApplication(data);
        alert('Application submitted successfully. It is now available on the admin page.');
        document.getElementById('applicationForm').reset();
        showStep(0);
        console.log('Submitted Data:', data);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

stepDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        showStep(index);
    });
});

document.querySelectorAll('.step-label').forEach((label, index) => {
    label.addEventListener('click', () => {
        showStep(index);
    });
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        if (event.ctrlKey) {
            nextStep();
        }
    }
});

window.addEventListener('storage', (event) => {
    if (event.key === FORM_VISIBILITY_KEY) {
        applyFormAvailability();
    }
});

applyFormAvailability();
updateProgress();
window.nextStep = nextStep;
window.prevStep = prevStep;
window.submitForm = submitForm;
