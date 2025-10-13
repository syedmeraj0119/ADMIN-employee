import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeDestination } from './risk';
import RiskModal from './components/RiskModal';

const TRIPS_KEY = 'td_trips_v1';
const STATUSES = ['pending', 'approved', 'rejected', 'active', 'completed'];

function generateId(){
  return `trip_${Date.now()}_${Math.floor(Math.random()*9000+1000)}`;
}

function defaultTrips(){
  return [
    {
      id: generateId(),
      requester: 'Alice Johnson',
      requesterEmail: 'alice.johnson@example.com',
      department: 'Sales',
      destination: 'London, UK',
      start: '2025-10-20',
      end: '2025-10-24',
      purpose: 'Client meeting',
      costEstimate: 2800,
      riskLevel: 'Medium',
      status: 'pending',
      attachments: [],
      timeline: [{ts: new Date().toISOString(), status: 'requested', user: 'Alice Johnson'}],
      comments: [],
    },
    {
      id: generateId(),
      requester: 'Bob Smith',
      requesterEmail: 'bob.smith@example.com',
      department: 'Engineering',
      destination: 'San Francisco, USA',
      start: '2025-11-02',
      end: '2025-11-06',
      purpose: 'Conference',
      costEstimate: 4200,
      riskLevel: 'Low',
      status: 'approved',
      attachments: [],
      timeline: [{ts: new Date().toISOString(), status: 'requested', user: 'Bob Smith'},{ts: new Date().toISOString(), status: 'approved', user: 'Manager'}],
      comments: [{by: 'Manager', ts: new Date().toISOString(), text: 'Approved for conference.'}],
    }
  ];
}

function readLS(key, fallback){ try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }catch{ return fallback; } }

export default function Trips(){
  const navigate = useNavigate();
  const [uiCollapsed, setUiCollapsed] = useState({});
  const [trips, setTrips] = useState(()=>{
    try{ const raw = localStorage.getItem(TRIPS_KEY); if(raw) return JSON.parse(raw); }catch(e){}
    return defaultTrips();
  });

  const [currentRole, setCurrentRole] = useState(() => {
    try{ return localStorage.getItem('currentRole') || 'employee'; }catch{return 'employee'}
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try{ return JSON.parse(localStorage.getItem('currentUser')) || { name: currentRole === 'manager' ? 'Manager' : 'User', email: '' }; }catch{return {name:'User', email:''}};
  });

  // notifications log
  const NOTIF_KEY = 'td_notifications';
  const [notifications, setNotifications] = useState(()=>{
    try{ const r = localStorage.getItem(NOTIF_KEY); if(r) return JSON.parse(r); }catch{}; return [];
  });

  // load policies so trips can enforce policy rules
  const [policies, setPolicies] = useState(() => readLS('td_policies_v1', []));

  useEffect(()=>{
    function onStorage(e){
      if(e.key === 'currentRole') setCurrentRole(e.newValue || 'employee');
      if(e.key === 'currentUser') { try{ setCurrentUser(JSON.parse(e.newValue)); }catch{} }
      if(e.key === 'td_policies_v1') { try{ setPolicies(JSON.parse(e.newValue || '[]')); }catch{} }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const [filter, setFilter] = useState({ status: 'all', department: '', destination: '', requester: '' });
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef();
  const [pendingTripPayload, setPendingTripPayload] = useState(null);
  const [pendingAnalysis, setPendingAnalysis] = useState(null);
  const [showRiskModal, setShowRiskModal] = useState(false);

  useEffect(()=>{
    try{ localStorage.setItem(TRIPS_KEY, JSON.stringify(trips)); }catch(e){}
  }, [trips]);

  // derived list
  const visible = trips.filter(t => {
    if(filter.status !== 'all' && t.status !== filter.status) return false;
    if(filter.department && !t.department.toLowerCase().includes(filter.department.toLowerCase())) return false;
    if(filter.destination && !t.destination.toLowerCase().includes(filter.destination.toLowerCase())) return false;
    if(filter.requester && !t.requester.toLowerCase().includes(filter.requester.toLowerCase())) return false;
    return true;
  });

  async function addTrip(payload){
    const trip = {
      id: generateId(),
      ...payload,
      status: 'pending',
      attachments: [],
      timeline: [{ts: new Date().toISOString(), status: 'requested', user: payload.requester || 'requester'}],
      comments: [],
    };
    // run risk analysis before adding - but show a modal for confirm on medium/high
    try{
      const analysis = analyzeDestination(payload.destination, payload.start);
      trip.riskLevel = analysis.riskLevel || payload.riskLevel || 'Low';
      trip.riskAnalysis = analysis;
      // enforce policy rules if a policy was selected
      const policy = policies.find(p => p.id === payload.policyId) || null;
      const policyViolations = [];
      if(policy){
        try{
          // check advance days
          const advanceDays = policy.rules?.booking?.advanceDays || 0;
          if(payload.start){
            const msPerDay = 24*60*60*1000;
            const daysUntil = Math.ceil((new Date(payload.start) - new Date())/msPerDay);
            if(daysUntil < advanceDays) policyViolations.push(`Trip must be requested at least ${advanceDays} days in advance (only ${daysUntil} days)`);
          }
          // check nightly limit implied by costEstimate
          if(payload.start && payload.end && payload.costEstimate){
            const msPerDay = 24*60*60*1000;
            const nights = Math.max(1, Math.round((new Date(payload.end) - new Date(payload.start))/msPerDay));
            const impliedNight = payload.costEstimate / Math.max(1, nights);
            const nightlyLimit = policy.rules?.accommodation?.nightlyLimit || Infinity;
            if(impliedNight > nightlyLimit) policyViolations.push(`Implied nightly cost $${Math.round(impliedNight)} exceeds policy nightly limit $${nightlyLimit}`);
          }
        }catch(e){ console.warn('Policy checks failed', e); }
      }

      // If risk is medium/high or there are policy violations, surface modal for confirmation/approval
      if(analysis.riskLevel === 'High' || analysis.riskLevel === 'Medium' || (policyViolations && policyViolations.length>0)){
        // set pending payload and show modal
        // attach policyViolations into the analysis object so modal can show them
        const augmented = { ...analysis, policyViolations };
        setPendingTripPayload({ ...trip, policyId: payload.policyId });
        setPendingAnalysis(augmented);
        setShowRiskModal(true);
        return; // wait for user decision
      }
    }catch(e){ console.warn('Risk analysis failed', e); }

    // if a policy is present and allows auto-approval, auto-approve
    try{
      const policy = policies.find(p => p.id === payload.policyId) || null;
      if(policy && policy.rules?.riskApproval?.type === 'auto'){
        const thresh = Number(policy.rules?.riskApproval?.autoThreshold || 0);
        if(payload.costEstimate && payload.costEstimate <= thresh){
          trip.status = 'approved';
          trip.timeline = [{ts: new Date().toISOString(), status: 'requested', user: payload.requester || 'requester'}, {ts: new Date().toISOString(), status: 'approved', user: 'Policy Auto-Approve'}];
        }
      }
    }catch(e){ }

    // safe to add
    setTrips(t => [trip, ...t]);
    setShowForm(false);
    setSelected(trip);
  }

  function confirmPendingTrip(){
    if(!pendingTripPayload) return;
    setTrips(t => [pendingTripPayload, ...t]);
    setSelected(pendingTripPayload);
    setPendingTripPayload(null);
    setPendingAnalysis(null);
    setShowRiskModal(false);
    setShowForm(false);
  }

  function requestApprovalForPending(){
    if(!pendingTripPayload) return;
    // mark the trip as pending (awaiting approval) and persist a notification to managers
    const notif = sendNotification(pendingTripPayload.id, 'managers@example.com', `Approval requested for trip to ${pendingTripPayload.destination}`, `Trip by ${pendingTripPayload.requester} requires approval. Reasons: ${pendingAnalysis?.policyViolations?.join('; ') || pendingAnalysis?.reasons?.join('; ') || 'See details.'}`);
    // keep the trip in pending state but persist it so managers can see it
    setTrips(t => [{ ...pendingTripPayload, status: 'pending' }, ...t]);
    setSelected(pendingTripPayload);
    setPendingTripPayload(null);
    setPendingAnalysis(null);
    setShowRiskModal(false);
    setShowForm(false);
    alert('Approval requested. A notification was sent to managers.');
  }

  function cancelPendingTrip(){ setPendingTripPayload(null); setPendingAnalysis(null); setShowRiskModal(false); }

  function updateTrip(id, patch){
    setTrips(t => t.map(x => x.id === id ? ({...x, ...patch}) : x));
  }

  function pushTimeline(id, status, user){
    setTrips(t => t.map(x => x.id === id ? ({...x, timeline: [{ts: new Date().toISOString(), status, user}, ...(x.timeline||[])]}) : x));
  }

  function sendNotification(tripId, to, subject, body){
    const n = { id: `notif_${Date.now()}_${Math.floor(Math.random()*9000)}`, tripId, to, subject, body, ts: new Date().toISOString() };
    setNotifications(ns => { const next = [n, ...ns].slice(0,100); try{ localStorage.setItem(NOTIF_KEY, JSON.stringify(next)); }catch{}; return next; });
    // also persist notifications in local storage
    try{ localStorage.setItem(NOTIF_KEY, JSON.stringify([n, ...(JSON.parse(localStorage.getItem(NOTIF_KEY))||[])])); }catch{}
    return n;
  }

  function addComment(id, by, text){
    setTrips(t => t.map(x => x.id === id ? ({...x, comments: [{by, ts: new Date().toISOString(), text}, ...(x.comments||[])]}) : x));
  }

  function handleApprove(id, by='Approver', comment=''){
    // role-based check moved into UI handlers; function still executes approve
    updateTrip(id, { status: 'approved' });
    pushTimeline(id, 'approved', by);
    if(comment) addComment(id, by, comment);
  }

  function handleReject(id, by='Approver', comment=''){
    updateTrip(id, { status: 'rejected' });
    pushTimeline(id, 'rejected', by);
    if(comment) addComment(id, by, comment);
  }

  function handleStart(id){
    updateTrip(id, { status: 'active' });
    pushTimeline(id, 'active', 'System');
  }

  function handleComplete(id){
    updateTrip(id, { status: 'completed' });
    pushTimeline(id, 'completed', 'System');
  }

  function handleAttach(id, files){
    if(!files || files.length===0) return;
    const arr = Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type, ts: new Date().toISOString() }));
    setTrips(t => t.map(x => x.id === id ? ({...x, attachments: [...(x.attachments||[]), ...arr]}) : x));
  }

  function handleDelete(id){
    if(!confirm('Delete this trip request?')) return;
    setTrips(t => t.filter(x => x.id !== id));
    if(selected && selected.id === id) setSelected(null);
  }

  // small form
  function NewTripForm({ onCreate }){
    const [form, setForm] = useState({ requester: '', department: '', destination: '', start: '', end: '', purpose: '', costEstimate: '', riskLevel: 'Low' });

    return (
  <div className="elevated p-4">
        <h3 className="font-semibold mb-2">New trip request</h3>
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Requester" className="border p-2" value={form.requester} onChange={(e)=> setForm({...form, requester: e.target.value})} />
          <input placeholder="Department" className="border p-2" value={form.department} onChange={(e)=> setForm({...form, department: e.target.value})} />
          <input placeholder="Destination" className="border p-2" value={form.destination} onChange={(e)=> setForm({...form, destination: e.target.value})} />
          <input type="date" className="border p-2" value={form.start} onChange={(e)=> setForm({...form, start: e.target.value})} />
          <input type="date" className="border p-2" value={form.end} onChange={(e)=> setForm({...form, end: e.target.value})} />
          <select className="border p-2" value={form.riskLevel} onChange={(e)=> setForm({...form, riskLevel: e.target.value})}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
          <select className="border p-2" value={form.policyId || ''} onChange={(e)=> setForm({...form, policyId: e.target.value})}>
            <option value="">No policy</option>
            {policies.map(p => (<option key={p.id} value={p.id}>{p.meta?.name || 'Policy'}</option>))}
          </select>
          <input placeholder="Cost estimate" type="number" className="border p-2" value={form.costEstimate} onChange={(e)=> setForm({...form, costEstimate: Number(e.target.value)})} />
          <textarea placeholder="Purpose" className="border p-2 col-span-2" value={form.purpose} onChange={(e)=> setForm({...form, purpose: e.target.value})} />
        </div>

        <div className="flex gap-2 mt-3">
          <button type="button" onClick={()=> { onCreate(form); }} className="px-3 py-2 bg-purple-700 text-white rounded">Create</button>
          <button type="button" onClick={()=> setShowForm(false)} className="px-3 py-2 elevated">Cancel</button>
        </div>
      </div>
    );
  }

  function TripDetails({ trip, onClose }){
    const [comment, setComment] = useState('');
    const [approverName, setApproverName] = useState('Manager');
    const [notify, setNotify] = useState(true);

    if(!trip) return null;
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
        <div className="elevated shadow-lg w-full max-w-3xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">Trip details — {trip.destination}</h3>
              <div className="text-xs text-gray-500">Requested by {trip.requester} — {trip.department}</div>
            </div>
            <div className="text-right">
              <div className="text-sm">Status: <span className="font-medium">{trip.status}</span></div>
              <div className="text-xs text-gray-400">Cost est: ${trip.costEstimate}</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500">Dates</div>
              <div className="font-medium">{trip.start} → {trip.end}</div>

              <div className="mt-3 text-xs text-gray-500">Purpose</div>
              <div className="mt-1">{trip.purpose}</div>

              <div className="mt-3 text-xs text-gray-500">Risk level</div>
              <div className={`px-2 py-1 inline-block rounded ${trip.riskLevel==='High'?'bg-red-100 text-red-700':trip.riskLevel==='Medium'?'bg-yellow-100 text-yellow-700':'bg-green-100 text-green-700'}`}>{trip.riskLevel}</div>

              <div className="mt-3 text-xs text-gray-500">Attachments</div>
              <div className="mt-1 space-y-1">
                { (trip.attachments||[]).length === 0 && <div className="text-xs text-gray-400">No attachments</div> }
                { (trip.attachments||[]).map((a,i)=> (
                  <div key={i} className="text-sm flex items-center justify-between elevated p-2">
                    <div className="truncate mr-2">{a.name} <span className="text-xs text-gray-400">({Math.round(a.size/1024)} KB)</span></div>
                    <div className="flex gap-2">
                      <button type="button" onClick={()=> alert('Download simulated in demo') } className="text-xs px-2 py-1 elevated">Download</button>
                    </div>
                  </div>
                ))}

                <div className="mt-2 flex items-center gap-2">
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e)=> { handleAttach(trip.id, e.target.files); e.target.value=null; }} />
                  <button type="button" onClick={()=> fileInputRef.current && fileInputRef.current.click()} className="px-3 py-2 elevated text-sm">Attach files</button>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Timeline</div>
              <div className="mt-2 space-y-2 max-h-64 overflow-auto text-sm">
                { (trip.timeline||[]).map((s,i)=> (
                  <div key={i} className="p-2 border rounded flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500">{new Date(s.ts).toLocaleString()}</div>
                      <div className="font-medium">{s.status}</div>
                      <div className="text-xs text-gray-400">by {s.user}</div>
                    </div>
                    <div className="text-xs text-gray-400">{i === 0 ? 'latest' : ''}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <div className="text-xs text-gray-500">Comments</div>
                <div className="mt-2 space-y-2 max-h-40 overflow-auto">
                  { (trip.comments||[]).length === 0 && <div className="text-xs text-gray-400">No comments</div> }
                  { (trip.comments||[]).map((c,i)=> (
                    <div key={i} className="p-2 border rounded text-sm">
                      <div className="text-xs text-gray-500">{c.by} — {new Date(c.ts).toLocaleString()}</div>
                      <div className="mt-1">{c.text}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex gap-2">
                  <input placeholder="Your name" value={approverName} onChange={(e)=> setApproverName(e.target.value)} className="border p-2 text-sm" />
                </div>

                <div className="mt-2 flex gap-2">
                  <input placeholder="Add a comment (optional)" className="border p-2 flex-1 text-sm" value={comment} onChange={(e)=> setComment(e.target.value)} />
                </div>

                <div className="mt-3 flex gap-2 items-center">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={notify} onChange={(e)=> setNotify(e.target.checked)} /> Notify requester</label>

                  { trip.status === 'pending' && (
                    <>
                      <button type="button" onClick={()=> {
                        // role check
                        if(!(currentRole === 'manager' || currentRole === 'finance')){ alert('Only managers or finance can approve requests.'); return; }
                        handleApprove(trip.id, approverName || currentUser?.name || 'Approver', comment);
                        if(notify && trip.requesterEmail){ sendNotification(trip.id, trip.requesterEmail, `Your trip request to ${trip.destination} is approved`, `Hi ${trip.requester},\n\nYour trip to ${trip.destination} (${trip.start} → ${trip.end}) has been approved.\n\nComments: ${comment || '-'}\n\nRegards`); }
                        setComment('');
                      }} className="px-3 py-2 bg-green-600 text-white rounded">Approve</button>

                      <button type="button" onClick={()=> {
                        if(!(currentRole === 'manager' || currentRole === 'finance')){ alert('Only managers or finance can reject requests.'); return; }
                        const reason = comment || prompt('Reason for rejection');
                        if(reason!==null) {
                          handleReject(trip.id, approverName || currentUser?.name || 'Approver', reason);
                          if(notify && trip.requesterEmail){ sendNotification(trip.id, trip.requesterEmail, `Your trip request to ${trip.destination} was rejected`, `Hi ${trip.requester},\n\nYour trip to ${trip.destination} (${trip.start} → ${trip.end}) has been rejected.\n\nReason: ${reason}\n\nRegards`); }
                        }
                        setComment('');
                      }} className="px-3 py-2 bg-red-50 text-red-600 rounded border">Reject</button>
                    </>
                  )}

                  { trip.status === 'approved' && (
                    <>
                      <button type="button" onClick={()=> handleStart(trip.id)} className="px-3 py-2 bg-indigo-600 text-white rounded">Mark Active</button>
                      <button type="button" onClick={()=> { if(!(currentRole === 'manager' || currentRole === 'finance')){ alert('Only managers or finance can reject requests.'); return; } handleReject(trip.id, approverName || currentUser?.name || 'Approver', comment || 'Withdrawn by approver'); if(notify && trip.requesterEmail){ sendNotification(trip.id, trip.requesterEmail, `Your trip request to ${trip.destination} was rejected`, `Hi ${trip.requester},\n\nYour trip to ${trip.destination} (${trip.start} → ${trip.end}) has been rejected.\n\nReason: ${comment || '-'}\n\nRegards`); } setComment(''); }} className="px-3 py-2 bg-red-50 text-red-600 rounded border">Reject</button>
                    </>
                  )}

                  { trip.status === 'active' && (
                    <button type="button" onClick={()=> handleComplete(trip.id)} className="px-3 py-2 bg-slate-700 text-white rounded">Complete</button>
                  )}

                  <button type="button" onClick={()=> onClose()} className="px-3 py-2 elevated">Close</button>
                  <button type="button" onClick={()=> handleDelete(trip.id)} className="px-3 py-2 bg-red-50 text-red-600 rounded">Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
          <div className="card-header mb-4">
          <div className="card-title">
            <h1 className="text-2xl font-semibold">Trips management</h1>
            <div className="card-subtitle">View, approve, and monitor employee trips</div>
          </div>
          <div className="card-actions">
            <button type="button" onClick={()=> setShowForm(s => !s)} className="px-3 py-2 bg-purple-700 text-white rounded">New trip</button>
            <button type="button" onClick={()=> { localStorage.removeItem(TRIPS_KEY); setTrips(defaultTrips()); }} className="px-3 py-2 elevated">Reset demo</button>
            <button className="card-collapse" aria-expanded={uiCollapsed.list ? 'true' : 'false'} onClick={() => setUiCollapsed(s => ({ ...s, list: !s.list }))}>{uiCollapsed.list ? 'Expand' : 'Collapse'}</button>
            <button type="button" onClick={() => navigate(-1)} className="back-btn px-2 py-1 elevated">← Back</button>
          </div>
        </div>

  { showForm && <NewTripForm onCreate={addTrip} /> }

          <div className="mt-4 elevated p-4">
          <div className="flex gap-2 items-center sticky-card">
            <select className="border p-2 text-sm" value={filter.status} onChange={(e)=> setFilter(f => ({...f, status: e.target.value}))}>
              <option value="all">All statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input placeholder="Department" className="border p-2 text-sm" value={filter.department} onChange={(e)=> setFilter(f=>({...f, department: e.target.value}))} />
            <input placeholder="Destination" className="border p-2 text-sm" value={filter.destination} onChange={(e)=> setFilter(f=>({...f, destination: e.target.value}))} />
            <input placeholder="Requester" className="border p-2 text-sm" value={filter.requester} onChange={(e)=> setFilter(f=>({...f, requester: e.target.value}))} />

            <div className="ml-auto text-sm text-gray-500">Showing {visible.length} of {trips.length}</div>
          </div>

            <div className={uiCollapsed.list ? 'card-body-collapsed' : 'mt-3 grid grid-cols-12 gap-3'}>
            <div className="col-span-8">
              <ul className="space-y-2">
                {visible.map(t => (
                  <li key={t.id} className="p-3 elevated flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center">{t.requester ? t.requester.charAt(0) : 'U'}</div>
                      <div>
                        <div className="font-medium">{t.requester} <span className="text-xs text-gray-400">— {t.department}</span></div>
                        <div className="text-sm text-gray-500">{t.destination} • {t.start} → {t.end} • ${t.costEstimate}</div>
                        {t.riskLevel && (
                          <div className="text-xs mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs ${t.riskLevel==='High'?'bg-red-100 text-red-700':t.riskLevel==='Medium'?'bg-yellow-100 text-yellow-700':'bg-green-100 text-green-700'}`}>Risk: {t.riskLevel}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-1 rounded text-xs ${t.status==='pending'?'bg-yellow-100 text-yellow-800':t.status==='approved'?'bg-green-100 text-green-800':t.status==='rejected'?'bg-red-100 text-red-800':t.status==='active'?'bg-indigo-100 text-indigo-800':'bg-slate-100 text-slate-700'}`}>{t.status}</div>

                      <button type="button" onClick={()=> { setSelected(t); }} className="px-3 py-1 elevated text-sm">Details</button>
                    </div>
                  </li>
                ))}

                { visible.length === 0 && (
                  <li className="p-3 border rounded text-sm text-gray-500">No trip requests found</li>
                ) }
              </ul>
            </div>

            <div className="col-span-4">
              <div className="bg-gray-50 p-3 rounded">
                <h3 className="font-semibold mb-2">Quick Actions</h3>
                <div className="space-y-2 text-sm">
                  <button type="button" onClick={()=> { const p = visible[0]; if(p){ handleApprove(p.id, 'AutoApprover', 'Bulk approve'); alert('Approved first visible request'); } else alert('No visible trip'); }} className="w-full px-3 py-2 bg-green-600 text-white rounded">Approve first</button>
                  <button type="button" onClick={()=> { const p = visible[0]; if(p){ handleReject(p.id, 'AutoApprover', 'Bulk reject'); alert('Rejected first visible request'); } else alert('No visible trip'); }} className="w-full px-3 py-2 bg-red-50 text-red-600 rounded border">Reject first</button>
                  <button type="button" onClick={()=> { const stats = trips.reduce((acc,t)=> { acc[t.status] = (acc[t.status]||0)+1; return acc; }, {}); alert('Counts: '+ JSON.stringify(stats)); }} className="w-full px-3 py-2 elevated">Stats</button>
                </div>

                <div className="mt-4 text-xs text-gray-500">Filters are applied to the list. Use Details to manage a request.</div>
              </div>

              <div className="mt-3 elevated p-3">
                <h3 className="font-semibold mb-2">Notifications</h3>
                <div className="text-sm text-gray-500">
                  Sent notifications to requesters. Click to open email client.
                </div>
                <div className="mt-2 max-h-40 overflow-auto text-sm space-y-2">
                  { notifications.length === 0 && <div className="text-xs text-gray-400">No notifications sent</div> }
                  { notifications.map(n => (
                    <div key={n.id} className="p-2 elevated flex items-center justify-between">
                      <div className="truncate">
                        <div className="font-medium">{n.subject}</div>
                        <div className="text-xs text-gray-400">to {n.to} • {new Date(n.ts).toLocaleString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <a className="text-xs px-2 py-1 elevated" href={`mailto:${n.to}?subject=${encodeURIComponent(n.subject)}&body=${encodeURIComponent(n.body)}`} target="_blank" rel="noreferrer">Open</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        { showRiskModal && pendingAnalysis && (
          <RiskModal analysis={pendingAnalysis} onConfirm={confirmPendingTrip} onCancel={cancelPendingTrip} onRequestApproval={requestApprovalForPending} />
        )}

        { selected && <TripDetails trip={selected} onClose={()=> setSelected(null)} /> }
      </div>
    </div>
  );
}
