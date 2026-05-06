const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 4000;
const SECRET = process.env.JWT_SECRET || 'indeed-clone-secret';
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function loadDb() {
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw);
}

function saveDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, SECRET, {
    expiresIn: '7d'
  });
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Authorization required' });
  const token = header.replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/api/jobs', (req, res) => {
  const { q = '', location = '', type = '', remote = '', company = '' } = req.query;
  const db = loadDb();
  const jobs = db.jobs.filter((job) => {
    const text = `${job.title} ${job.company} ${job.description}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (location && !job.location.toLowerCase().includes(location.toLowerCase())) return false;
    if (company && !job.company.toLowerCase().includes(company.toLowerCase())) return false;
    if (type && job.type.toLowerCase() !== type.toLowerCase()) return false;
    if (remote) {
      const wantsRemote = remote.toLowerCase() === 'true';
      if (job.remote !== wantsRemote) return false;
    }
    return true;
  });
  res.json({ jobs });
});

app.get('/api/jobs/:id', (req, res) => {
  const db = loadDb();
  const job = db.jobs.find((item) => item.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ job });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }
  const db = loadDb();
  const exists = db.users.some((user) => user.email.toLowerCase() === email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'Email already in use' });
  const hashed = await bcrypt.hash(password, 10);
  const newUser = {
    id: `user-${Date.now()}`,
    name,
    email,
    password: hashed,
    role
  };
  db.users.push(newUser);
  saveDb(db);
  const token = createToken(newUser);
  res.json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const db = loadDb();
  const user = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = user.password.startsWith('$2')
    ? await bcrypt.compare(password, user.password)
    : user.password === password;
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = createToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get('/api/users/me', authenticate, (req, res) => {
  const db = loadDb();
  const user = db.users.find((item) => item.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.post('/api/jobs', authenticate, (req, res) => {
  if (req.user.role !== 'employer') return res.status(403).json({ error: 'Only employers can post jobs' });
  const { title, company, location, type, remote, salary, description, requirements, benefits } = req.body;
  if (!title || !company || !location || !type || !description) {
    return res.status(400).json({ error: 'Missing required job fields' });
  }
  const db = loadDb();
  const job = {
    id: `job-${Date.now()}`,
    title,
    company,
    location,
    type,
    remote: Boolean(remote),
    salary: salary || 'Competitive',
    description,
    requirements: requirements || [],
    benefits: benefits || [],
    postedAt: new Date().toISOString().split('T')[0],
    employerId: req.user.id
  };
  db.jobs.unshift(job);
  saveDb(db);
  res.json({ job });
});

app.post('/api/jobs/:id/apply', authenticate, (req, res) => {
  if (req.user.role !== 'jobseeker') return res.status(403).json({ error: 'Only jobseekers can apply' });
  const { coverLetter } = req.body;
  const db = loadDb();
  const job = db.jobs.find((item) => item.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const alreadyApplied = db.applications.some(
    (app) => app.jobId === job.id && app.userId === req.user.id
  );
  if (alreadyApplied) return res.status(400).json({ error: 'You have already applied to this job' });
  const application = {
    id: `app-${Date.now()}`,
    jobId: job.id,
    userId: req.user.id,
    jobTitle: job.title,
    company: job.company,
    appliedAt: new Date().toISOString(),
    coverLetter: coverLetter || ''
  };
  db.applications.push(application);
  saveDb(db);
  res.json({ application });
});

app.get('/api/applications', authenticate, (req, res) => {
  const db = loadDb();
  const applications = db.applications.filter((app) => app.userId === req.user.id);
  res.json({ applications });
});

app.get('/api/companies', (req, res) => {
  const db = loadDb();
  const companies = [...new Set(db.jobs.map((job) => job.company))];
  res.json({ companies });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Job board app is running on http://localhost:${PORT}`);
});
