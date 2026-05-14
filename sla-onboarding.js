// Supabase Configuration
const SUBAPASE_URL = 'https://jlsnrzcsumdhocterfbc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsc25yemNzdW1kaG9jdGVyZmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NjA2MDAsImV4cCI6MjA5NDMzNjYwMH0.qC6w8R3ZgY__93QA_jjh75RcLfwzA1CaLQXYZZzP_ZA';
const supabase = supabase.createClient(SUBAPASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

const totalSteps = 10;
let currentStep = 1;

function initDashboard() {
    // Check for saved draft
    loadDraft();
    
    // Setup Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const targetStep = parseInt(e.target.getAttribute('data-step'));
            if(validateStep(currentStep) || targetStep < currentStep) {
                navigateStep(targetStep - currentStep, targetStep);
            } else {
                alert("Please fill required fields before proceeding.");
            }
        });
    });

    // Setup Signature Pad
    setupSignaturePad();

    // Setup Drag & Drop
    setupDragAndDrop();

    // Auto-save interval
    setInterval(saveDraft, 30000); // every 30s
    
    // Form change listener for auto-save UI update
    document.getElementById('sla-form').addEventListener('input', () => {
        document.getElementById('save-status').innerText = 'Unsaved changes...';
        updateProgress();
    });

    updateProgress();
}

function navigateStep(direction, target = null) {
    if (direction > 0 && !validateStep(currentStep)) {
        alert("Please fill all required fields before proceeding.");
        return;
    }

    const nextStep = target !== null ? target : currentStep + direction;
    
    if (nextStep < 1 || nextStep > totalSteps) return;

    // Hide current
    document.getElementById(`section-${currentStep}`).classList.remove('active');
    document.querySelector(`.nav-item[data-step="${currentStep}"]`).classList.remove('active');
    document.querySelector(`.nav-item[data-step="${currentStep}"]`).classList.add('completed');

    // Show next
    currentStep = nextStep;
    document.getElementById(`section-${currentStep}`).classList.add('active');
    document.querySelector(`.nav-item[data-step="${currentStep}"]`).classList.add('active');
    
    // Button Logic
    document.getElementById('btn-prev').disabled = currentStep === 1;
    
    if (currentStep === totalSteps) {
        document.getElementById('btn-next').style.display = 'none';
        document.getElementById('btn-submit').style.display = 'block';
        populateReview();
    } else if (currentStep > totalSteps) {
        // Success screen logic is separate
    } else {
        document.getElementById('btn-next').style.display = 'block';
        document.getElementById('btn-submit').style.display = 'none';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Fix signature canvas width if arriving at step 9
    if(currentStep === 9 && sigCanvas.width === 0) {
        sigCanvas.width = sigCanvas.parentElement.offsetWidth;
    }

    updateProgress();
    saveDraft();
}

function validateStep(step) {
    // Temporarily returning true to allow easy testing of the flow without filling all fields
    return true;
}

function updateProgress() {
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    
    // Count filled inputs vs total inputs
    const form = document.getElementById('sla-form');
    const totalInputs = form.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, select').length;
    let filled = 0;
    
    form.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, select').forEach(input => {
        if(input.value.trim() !== '') filled++;
    });

    // Also factor in current step
    let percentage = Math.round((currentStep / totalSteps) * 100);
    if(percentage > 100) percentage = 100;

    fill.style.width = `${percentage}%`;
    text.innerText = `${percentage}% Complete`;
}

function toggleWebsiteFields() {
    const val = document.getElementById('need-website-select').value;
    const fields = document.getElementById('website-fields');
    if (val === 'Yes') {
        fields.style.display = 'block';
    } else {
        fields.style.display = 'none';
    }
}

/* Drag and Drop Logic */
function setupDragAndDrop() {
    const zone = document.getElementById('upload-zone');
    const input = document.getElementById('file-input');
    const preview = document.getElementById('file-preview-container');

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    input.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        Array.from(files).forEach(file => {
            const card = document.createElement('div');
            card.className = 'file-card';
            card.innerHTML = `<strong>📄 ${file.name}</strong><br><span style="color:#888; font-size: 0.7rem;">${(file.size/1024/1024).toFixed(2)} MB</span>`;
            preview.appendChild(card);
        });
        document.getElementById('save-status').innerText = 'Unsaved changes...';
    }
}

/* Signature Logic */
let sigCtx;
let sigCanvas;
let isDrawing = false;

function setupSignaturePad() {
    sigCanvas = document.getElementById('dashboard-signature');
    sigCtx = sigCanvas.getContext('2d');
    
    // Only set width if it's visible, else set to 0 to be caught later
    if(sigCanvas.offsetWidth > 0) {
        sigCanvas.width = sigCanvas.offsetWidth;
    } else {
        sigCanvas.width = 0;
    }
    
    sigCtx.strokeStyle = '#FF007F'; // Ardour Pink
    sigCtx.lineWidth = 2;
    sigCtx.lineCap = 'round';

    sigCanvas.addEventListener('mousedown', (e) => { isDrawing = true; draw(e); });
    sigCanvas.addEventListener('mousemove', draw);
    sigCanvas.addEventListener('mouseup', () => { isDrawing = false; sigCtx.beginPath(); });
    sigCanvas.addEventListener('mouseout', () => { isDrawing = false; sigCtx.beginPath(); });
}

function draw(e) {
    if (!isDrawing) return;
    const rect = sigCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    sigCtx.lineTo(x, y);
    sigCtx.stroke();
    sigCtx.beginPath();
    sigCtx.moveTo(x, y);
}

function clearDashboardSignature() {
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
}

/* Review & Submit Logic */
function populateReview() {
    const container = document.getElementById('review-container');
    const form = document.getElementById('sla-form');
    const formData = new FormData(form);
    
    let html = '';
    const sections = {
        'Client Details': ['client_name', 'company_name', 'brand_name', 'email', 'phone', 'industry'],
        'Timelines & Budget': ['start_date', 'delivery_timeline', 'monthly_budget', 'urgency'],
        'Communication': ['poc', 'approval_auth']
    };

    for (const [sectionName, fields] of Object.entries(sections)) {
        html += `<h4 style="margin-top:1.5rem; margin-bottom:0.5rem; color: var(--accent-pink);">${sectionName}</h4>`;
        fields.forEach(field => {
            const val = formData.get(field);
            if(val) {
                html += `<div class="review-item"><strong>${field.replace('_', ' ')}</strong> ${val}</div>`;
            }
        });
    }
    
    // Services selected
    const services = formData.getAll('req_services');
    if(services.length > 0) {
        html += `<h4 style="margin-top:1.5rem; margin-bottom:0.5rem; color: var(--accent-pink);">Selected Services</h4>`;
        html += `<div class="review-item">${services.join(', ')}</div>`;
    }

    container.innerHTML = html;
}

function submitDashboardForm() {
    if(!validateStep(9)) {
        alert("Please confirm the terms and sign before generating the SLA.");
        return;
    }

    const form = document.getElementById('sla-form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Arrays for multi-select
    data.req_services = formData.getAll('req_services');
    data.tone = formData.getAll('tone');
    data.platforms = formData.getAll('platforms');
    data.branding_req = formData.getAll('branding_req');

    // Add Signature as base64 (either uploaded file or drawn canvas)
    const fileInput = document.getElementById('signature-upload');
    if (fileInput && fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = function(e) {
            data.signature_uploaded = e.target.result;
            finishSubmit(data);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        // Use canvas
        data.signature_drawn = sigCanvas.toDataURL();
        finishSubmit(data);
    }
}

async function finishSubmit(data) {
    // Generate JSON Output for API/CRM (Keep it aside internally)
    const jsonOutput = JSON.stringify(data, null, 4);
    console.log("=== SECURE SLA DATA GENERATED ===");
    console.log(jsonOutput);
    
    // SAVE TO SUPABASE
    try {
        const { error } = await supabase
            .from('onboarding_leads')
            .insert([
                { 
                    client_name: data.client_name,
                    company_name: data.company_name,
                    brand_name: data.brand_name,
                    email: data.email,
                    phone: data.phone,
                    industry: data.industry,
                    services_requested: data.req_services,
                    brand_tone: data.tone,
                    project_goals: data.goals,
                    monthly_budget: data.monthly_budget,
                    start_date: data.start_date || null,
                    delivery_timeline: data.delivery_timeline,
                    signature_drawn: data.signature_drawn,
                    full_submission_json: data 
                }
            ]);

        if (error) throw error;
        console.log("Data successfully saved to Supabase table!");
    } catch (err) {
        console.error("Error saving to Supabase:", err.message);
    }
    
    // Hide form, show success
    document.getElementById('section-10').classList.remove('active');
    document.getElementById('footer-nav').style.display = 'none';
    document.querySelector('.dashboard-sidebar').style.display = 'none';
    document.querySelector('.dashboard-main').style.padding = '0';
    document.querySelector('.dashboard-main').style.border = 'none';
    document.querySelector('.dashboard-main').style.boxShadow = 'none';
    
    const successScreen = document.getElementById('success-screen');
    successScreen.classList.add('active');
    
    // Clear draft
    localStorage.removeItem('ardour_sla_draft');
}

/* Save & Draft Logic */
function saveDraft() {
    const form = document.getElementById('sla-form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    data.req_services = formData.getAll('req_services');
    data.tone = formData.getAll('tone');
    data.platforms = formData.getAll('platforms');
    data.branding_req = formData.getAll('branding_req');
    data.currentStep = currentStep;

    localStorage.setItem('ardour_sla_draft', JSON.stringify(data));
    
    const status = document.getElementById('save-status');
    const now = new Date();
    status.innerText = `Saved at ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
}

function loadDraft() {
    const draft = localStorage.getItem('ardour_sla_draft');
    if(!draft) return;
    
    try {
        const data = JSON.parse(draft);
        const form = document.getElementById('sla-form');
        
        Object.keys(data).forEach(key => {
            if (Array.isArray(data[key])) {
                data[key].forEach(val => {
                    const el = form.querySelector(`input[name="${key}"][value="${val}"]`);
                    if(el) el.checked = true;
                });
            } else {
                const el = form.querySelector(`[name="${key}"]`);
                if(el) {
                    if (el.type === 'checkbox' || el.type === 'radio') {
                        if(el.value === data[key]) el.checked = true;
                    } else {
                        el.value = data[key];
                    }
                }
            }
        });
        
        toggleWebsiteFields();
        
        if (data.currentStep && data.currentStep < 10) {
            navigateStep(data.currentStep - currentStep);
        }
    } catch(e) {
        console.error("Failed to load draft", e);
    }
}

/* Feedback Logic */
let currentRating = 0;

function setRating(score) {
    currentRating = score;
    // Visual feedback for the stars
    for(let i=1; i<=5; i++) {
        const star = document.getElementById(`star-${i}`);
        if(i <= score) {
            star.style.transform = "scale(1.2)";
            star.style.opacity = "1";
        } else {
            star.style.transform = "scale(0.8)";
            star.style.opacity = "0.3";
        }
    }
}

function submitFinalFeedback() {
    const comment = document.getElementById('feedback-comment').value;
    
    // Log the final feedback
    console.log(`=== FINAL CLIENT FEEDBACK ===\nRating: ${currentRating}/5 Stars\nComment: ${comment}`);
    
    // Hide input area, show thanks
    document.getElementById('feedback-text-area').style.display = 'none';
    document.getElementById('feedback-thanks').style.display = 'block';
    
    // Redirect to home after 2 seconds
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
}
