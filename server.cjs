const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if(!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

function readJSON(name){ const p = path.join(DATA_DIR, name); try{ return JSON.parse(fs.readFileSync(p,'utf8')||'null') || []; }catch(e){ return []; } }
function writeJSON(name, v){ const p = path.join(DATA_DIR, name); fs.writeFileSync(p, JSON.stringify(v, null, 2)); }

// ensure baseline files
['trips.json','documents.json','expenses.json','users.json','notifications.json'].forEach(f => { const p = path.join(DATA_DIR, f); if(!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify([])); });

const upload = multer({ dest: UPLOADS_DIR, limits: { fileSize: 10 * 1024 * 1024 } });
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function authenticate(req,res,next){
  const h = req.headers.authorization;
  if(!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
  const token = h.slice(7);
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  }catch(e){ return res.status(401).json({ error: 'invalid token' }); }
}

const app = express();
app.use(cors({ origin: true }));
app.use(bodyParser.json({ limit: '5mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Simple health
app.get('/api/health', (req,res) => res.json({ ok:true, ts: Date.now() }));

// Auth (demo) - accept any login and return a simple user object and token
app.post('/api/auth/login', (req,res) => {
  const { email, password } = req.body || {};
  if(!email) return res.status(400).json({ error: 'email required' });
  const users = readJSON('users.json');
  let user = users.find(u => u.email === email);
  if(!user){ user = { id: 'u_' + Date.now(), email, name: email.split('@')[0], role: 'employee' }; users.push(user); writeJSON('users.json', users); }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  return res.json({ token, user });
});

// Policies
app.get('/api/policies', (req,res) => {
  // dump a small default policy if none exist
  const policies = [ { id:'default', meta:{ name:'Default Policy'}, rules:{ booking:{airfareClass:'economy', advanceDays:14}, accommodation:{nightlyLimit:150}, riskApproval:{ type:'manual'} } } ];
  res.json(policies);
});

// Create trip
app.post('/api/trips', authenticate, (req,res) => {
  const body = req.body || {};
  if(!body.requester || !body.destination || !body.start) return res.status(400).json({ error: 'requester, destination and start are required' });
  const trips = readJSON('trips.json');
  const id = 'trip_' + Date.now();
  const newTrip = { id, status: 'pending', createdAt: new Date().toISOString(), timeline: [{ ts: new Date().toISOString(), status: 'requested', user: req.user?.email || body.requester?.email || 'unknown' }], ...body };
  trips.unshift(newTrip);
  writeJSON('trips.json', trips);
  // notify ops
  const notif = { id: 'notif_' + Date.now(), to: 'ops@example.com', subject: `New trip request: ${body.destination}`, body: `Trip ${id} requested by ${body.requester?.name || body.requester}`, ts: new Date().toISOString() };
  const notifs = readJSON('notifications.json'); notifs.unshift(notif); writeJSON('notifications.json', notifs);
  res.status(201).json({ id, status: 'pending' });
});

// Attach file to trip (multipart)
app.post('/api/trips/:id/attachments', authenticate, upload.array('files', 6), (req,res) => {
  const id = req.params.id;
  const trips = readJSON('trips.json');
  const trip = trips.find(t => t.id === id);
  if(!trip) return res.status(404).json({ error: 'trip not found' });
  const files = (req.files || []).map(f => ({ originalName: f.originalname, path: '/uploads/' + path.basename(f.path), size: f.size, mime: f.mimetype }));
  trip.attachments = (trip.attachments||[]).concat(files);
  writeJSON('trips.json', trips);
  res.json({ uploaded: files.length, files });
});

// Create document (file upload)
app.post('/api/documents', authenticate, upload.single('file'), (req,res) => {
  const file = req.file;
  const meta = req.body || {};
  if(!file) return res.status(400).json({ error: 'file required' });
  const docs = readJSON('documents.json');
  const id = 'doc_' + Date.now();
  const rec = { id, employeeId: meta.employeeId || 'unknown', filename: file.originalname, storedPath: '/uploads/' + path.basename(file.path), type: meta.type || 'other', expiry: meta.expiry || null, uploadedAt: new Date().toISOString() };
  docs.unshift(rec); writeJSON('documents.json', docs);
  res.status(201).json(rec);
});

// Sign document (attach signature dataURL)
app.post('/api/documents/:id/sign', authenticate, (req,res) => {
  const id = req.params.id; const { signature } = req.body || {};
  if(!signature) return res.status(400).json({ error: 'signature required' });
  const docs = readJSON('documents.json'); const doc = docs.find(d=> d.id === id);
  if(!doc) return res.status(404).json({ error: 'document not found' });
  doc.signed = true; doc.signature = signature; doc.signedAt = new Date().toISOString(); writeJSON('documents.json', docs);
  res.json({ ok:true });
});

// Create expense
app.post('/api/expenses', authenticate, (req,res) => {
  const body = req.body || {};
  if(!body.employeeId || !body.amount) return res.status(400).json({ error: 'employeeId and amount required' });
  const ex = readJSON('expenses.json'); const id = 'exp_' + Date.now(); const rec = { id, ...body, createdAt: new Date().toISOString(), status: 'submitted' }; ex.unshift(rec); writeJSON('expenses.json', ex);
  res.status(201).json(rec);
});

// Upload receipt for expense
app.post('/api/expenses/:id/receipt', authenticate, upload.single('receipt'), (req,res) => {
  const id = req.params.id; const file = req.file;
  const ex = readJSON('expenses.json'); const rec = ex.find(e=> e.id === id);
  if(!rec) return res.status(404).json({ error: 'expense not found' });
  if(!file) return res.status(400).json({ error: 'receipt file required' });
  rec.receipt = { filename: file.originalname, path: '/uploads/' + path.basename(file.path), size: file.size, mime: file.mimetype };
  writeJSON('expenses.json', ex);
  res.json({ ok:true, receipt: rec.receipt });
});

// Get single trip
app.get('/api/trips/:id', authenticate, (req,res) => {
  const id = req.params.id; const trips = readJSON('trips.json'); const t = trips.find(x=> x.id === id);
  if(!t) return res.status(404).json({ error: 'not found' });
  res.json(t);
});

// Update trip (approve/reject/status changes)
app.put('/api/trips/:id', authenticate, (req,res) => {
  const id = req.params.id; const patch = req.body || {};
  const trips = readJSON('trips.json'); const idx = trips.findIndex(x=> x.id === id);
  if(idx === -1) return res.status(404).json({ error: 'not found' });
  const t = trips[idx];
  // apply limited updates
  if(patch.status) {
    t.status = patch.status;
    t.timeline = t.timeline || [];
    t.timeline.unshift({ ts: new Date().toISOString(), status: patch.status, user: req.user?.email || 'system', note: patch.note || '' });
    // send notification to requester if exists
    const notif = { id: 'notif_' + Date.now(), to: t.requester?.email || 'ops@example.com', subject: `Trip ${t.id} ${t.status}`, body: `Your trip to ${t.destination} is now ${t.status}`, ts: new Date().toISOString() };
    const nots = readJSON('notifications.json'); nots.unshift(notif); writeJSON('notifications.json', nots);
  }
  // merge other allowed fields
  ['destination','start','end','costEstimate','purpose'].forEach(k=> { if(patch[k] !== undefined) t[k] = patch[k]; });
  trips[idx] = t; writeJSON('trips.json', trips);
  res.json(t);
});

// List endpoints for trips/documents/expenses
app.get('/api/trips', (req,res) => res.json(readJSON('trips.json')));
app.get('/api/documents', (req,res) => res.json(readJSON('documents.json')));
app.get('/api/expenses', (req,res) => res.json(readJSON('expenses.json')));

// Notifications
app.get('/api/notifications', authenticate, (req,res) => res.json(readJSON('notifications.json')));
app.post('/api/notifications', authenticate, (req,res) => { const body = req.body || {}; if(!body.to || !body.subject) return res.status(400).json({ error: 'to and subject required' }); const nots = readJSON('notifications.json'); const n = { id: 'notif_' + Date.now(), to: body.to, subject: body.subject, body: body.body || '', ts: new Date().toISOString() }; nots.unshift(n); writeJSON('notifications.json', nots); res.status(201).json(n); });

// Start server
const port = process.env.PORT || 4001;
app.listen(port, () => console.log('API server listening on', port));
