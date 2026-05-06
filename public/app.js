const apiBase = '/api';
const searchSection = document.getElementById('searchSection');
const detailsSection = document.getElementById('detailsSection');
const authSection = document.getElementById('authSection');
const postJobSection = document.getElementById('postJobSection');
const dashboardSection = document.getElementById('dashboardSection');
const jobList = document.getElementById('jobList');
const jobCount = document.getElementById('jobCount');
const jobDetails = document.getElementById('jobDetails');
const dashboardContent = document.getElementById('dashboardContent');
const authMessage = document.getElementById('authMessage');
const postJobMessage = document.getElementById('postJobMessage');

const homeBtn = document.getElementById('homeBtn');
const dashboardBtn = document.getElementById('dashboardBtn');
const postJobBtn = document.getElementById('postJobBtn');
const authBtn = document.getElementById('authBtn');
const backToListBtn = document.getElementById('backToListBtn');

const searchForm = document.getElementById('searchForm');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const postJobForm = document.getElementById('postJobForm');

const authTokenKey = 'jobfinder_token';
const authUserKey = 'jobfinder_user';

function getToken() {
  return localStorage.getItem(authTokenKey);
}

function setSession(user, token) {
  localStorage.setItem(authTokenKey, token);
  localStorage.setItem(authUserKey, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(authTokenKey);
  localStorage.removeItem(authUserKey);
}

function getUser() {
  const value = localStorage.getItem(authUserKey);
  return value ? JSON.parse(value) : null;
}

function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function showSection(section) {
  [searchSection, detailsSection, authSection, postJobSection, dashboardSection].forEach((el) => {
    el.classList.add('hidden');
  });
  section.classList.remove('hidden');
}

function showMessage(element, message, duration = 3500) {
  element.textContent = message;
  setTimeout(() => {
    element.textContent = '';
  }, duration);
}

async function fetchJobs(params = {}) {
  const query = new URLSearchParams(params);
  const response = await fetch(`${apiBase}/jobs?${query.toString()}`);
  if (!response.ok) throw new Error('Failed to load jobs');
  return response.json();
}

function renderJobs(jobs) {
  jobList.innerHTML = '';
  jobCount.textContent = `${jobs.length} job(s) found`;
  if (jobs.length === 0) {
    jobList.innerHTML = '<p>No jobs match your search.</p>';
    return;
  }
  jobs.forEach((job) => {
    const card = document.createElement('article');
    card.className = 'job-card';
    card.innerHTML = `
      <h3>${job.title}</h3>
      <div class="job-meta">
        <span>${job.company}</span>
        <span>${job.location}</span>
        <span>${job.type}</span>
        <span>${job.remote ? 'Remote' : 'On-site'}</span>
      </div>
      <p>${job.description.slice(0, 120)}...</p>
      <button data-id="${job.id}">View details</button>
    `;
    card.querySelector('button').addEventListener('click', () => showJobDetails(job.id));
    jobList.appendChild(card);
  });
}

async function showJobDetails(jobId) {
  const response = await fetch(`${apiBase}/jobs/${jobId}`);
  if (!response.ok) {
    alert('Job details not available');
    return;
  }
  const { job } = await response.json();
  jobDetails.innerHTML = `
    <div class="job-details">
      <h2>${job.title}</h2>
      <div class="job-meta">
        <span>${job.company}</span>
        <span>${job.location}</span>
        <span>${job.type}</span>
        <span>${job.remote ? 'Remote' : 'On-site'}</span>
      </div>
      <p><strong>Salary:</strong> ${job.salary}</p>
      <p>${job.description}</p>
      <h3>Requirements</h3>
      <ul>${job.requirements.map((item) => `<li>${item}</li>`).join('')}</ul>
      <h3>Benefits</h3>
      <ul>${job.benefits.map((item) => `<li>${item}</li>`).join('')}</ul>
      <button id="applyButton">Apply to this job</button>
    </div>
  `;
  const applyButton = document.getElementById('applyButton');
  applyButton.addEventListener('click', () => applyToJob(job.id));
  showSection(detailsSection);
}

async function applyToJob(jobId) {
  const user = getUser();
  if (!user) {
    showMessage(authMessage, 'Please log in as a job seeker first');
    showSection(authSection);
    return;
  }
  if (user.role !== 'jobseeker') {
    showMessage(authMessage, 'Only job seekers can apply for jobs');
    showSection(authSection);
    return;
  }
  const coverLetter = prompt('Enter a brief cover letter or application note:', 'I am excited about this opportunity.');
  if (coverLetter === null) return;
  const response = await fetch(`${apiBase}/jobs/${jobId}/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ coverLetter })
  });
  const result = await response.json();
  if (!response.ok) {
    showMessage(authMessage, result.error || 'Application failed');
    return;
  }
  showMessage(authMessage, 'Application submitted successfully');
  showSection(searchSection);
}

async function loadSearch() {
  const query = document.getElementById('searchQuery').value.trim();
  const location = document.getElementById('searchLocation').value.trim();
  const type = document.getElementById('searchType').value;
  const remote = document.getElementById('searchRemote').checked;
  const params = { q: query, location, type, remote: remote ? 'true' : '' };
  const data = await fetchJobs(params);
  renderJobs(data.jobs);
  showSection(searchSection);
}

async function handleAuthForms(event) {
  event.preventDefault();
  const form = event.target;
  const isLogin = form.id === 'loginForm';
  const url = `${apiBase}/auth/${isLogin ? 'login' : 'register'}`;
  const body = isLogin
    ? {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
      }
    : {
        name: document.getElementById('registerName').value,
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value,
        role: document.getElementById('registerRole').value
      };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) {
    showMessage(authMessage, result.error || 'Authentication failed');
    return;
  }
  setSession(result.user, result.token);
  showMessage(authMessage, `Welcome, ${result.user.name}!`);
  renderDashboard();
  showSection(dashboardSection);
}

async function renderDashboard() {
  const user = getUser();
  if (!user) {
    dashboardContent.innerHTML = '<p>Please login or register to view your dashboard.</p>';
    return;
  }
  const response = await fetch(`${apiBase}/users/me`, {
    headers: getAuthHeaders()
  });
  const userData = await response.json();
  if (!response.ok) {
    clearSession();
    dashboardContent.innerHTML = '<p>Session expired. Please login again.</p>';
    return;
  }
  const applicationsResponse = await fetch(`${apiBase}/applications`, {
    headers: getAuthHeaders()
  });
  const applicationData = await applicationsResponse.json();
  dashboardContent.innerHTML = `
    <div class="dashboard-grid">
      <div>
        <h3>Welcome, ${userData.user.name}</h3>
        <p>Role: ${userData.user.role}</p>
        <p>Email: ${userData.user.email}</p>
      </div>
      <div>
        <button id="logoutButton">Logout</button>
      </div>
    </div>
    <div>
      <h3>Your applications</h3>
      ${applicationData.applications.length === 0 ? '<p>No applications yet.</p>' : '<ul>' + applicationData.applications.map((application) => `<li>${application.jobTitle} at ${application.company} — applied on ${new Date(application.appliedAt).toLocaleDateString()}</li>`).join('') + '</ul>'}
    </div>
  `;
  document.getElementById('logoutButton').addEventListener('click', () => {
    clearSession();
    dashboardContent.innerHTML = '<p>You have been logged out.</p>';
    showSection(homeBtn ? searchSection : searchSection);
  });
}

async function postJob(event) {
  event.preventDefault();
  const user = getUser();
  if (!user || user.role !== 'employer') {
    showMessage(postJobMessage, 'You must be logged in as an employer to post jobs');
    return;
  }
  const payload = {
    title: document.getElementById('jobTitle').value,
    company: document.getElementById('jobCompany').value,
    location: document.getElementById('jobLocation').value,
    type: document.getElementById('jobType').value,
    remote: document.getElementById('jobRemote').checked,
    salary: document.getElementById('jobSalary').value,
    description: document.getElementById('jobDescription').value,
    requirements: document.getElementById('jobRequirements').value.split(',').map((item) => item.trim()).filter(Boolean),
    benefits: document.getElementById('jobBenefits').value.split(',').map((item) => item.trim()).filter(Boolean)
  };
  const response = await fetch(`${apiBase}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) {
    showMessage(postJobMessage, result.error || 'Job posting failed');
    return;
  }
  showMessage(postJobMessage, 'Job posted successfully!');
  postJobForm.reset();
  loadSearch();
}

homeBtn.addEventListener('click', () => loadSearch());
dashboardBtn.addEventListener('click', () => {
  renderDashboard();
  showSection(dashboardSection);
});
postJobBtn.addEventListener('click', () => {
  const user = getUser();
  if (!user) {
    showSection(authSection);
    showMessage(authMessage, 'Please login as an employer');
    return;
  }
  if (user.role !== 'employer') {
    showMessage(authMessage, 'Only employers can access the job posting form');
    showSection(dashboardSection);
    return;
  }
  showSection(postJobSection);
});
authBtn.addEventListener('click', () => showSection(authSection));
backToListBtn.addEventListener('click', () => showSection(searchSection));
searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await loadSearch();
});
loginForm.addEventListener('submit', handleAuthForms);
registerForm.addEventListener('submit', handleAuthForms);
postJobForm.addEventListener('submit', postJob);

window.addEventListener('load', async () => {
  await loadSearch();
  const user = getUser();
  if (user) {
    authBtn.textContent = `Logged in as ${user.name}`;
  }
});
