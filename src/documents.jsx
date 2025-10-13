import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DocSearch from './components/DocSearch';
import DocGroup from './components/DocGroup';
import DocPreview from './components/DocPreview';

function uid(prefix='d'){ return `${prefix}_${Date.now()}_${Math.floor(Math.random()*9000+1000)}` }
function readLS(key, fallback){ try{ const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }catch{ return fallback; } }
function writeLS(key, v){ try{ localStorage.setItem(key, JSON.stringify(v)); }catch{}
}

export default function Documents(){
  const navigate = useNavigate();
  const [collapsedPanels, setCollapsedPanels] = useState({});
  const [employees, setEmployees] = useState(()=> readLS('td_employees', [{ id:'e1', name:'Alice' }, { id:'e2', name:'Bob' }]));
  const [trips, setTrips] = useState(()=> readLS('td_trips_v2', []));
  const [docs, setDocs] = useState(()=> readLS('td_docs_v1', []));
  const [policies, setPolicies] = useState(()=> readLS('td_doc_policies', { /* destinationName: [ 'passport','vaccine' ] */ }));
  const [selectedEmployee, setSelectedEmployee] = useState(employees[0]?.id || '');
  const [selectedTrip, setSelectedTrip] = useState('');
  const [reminders, setReminders] = useState(()=> readLS('td_doc_reminders', []));
  const [showSignModal, setShowSignModal] = useState(false);
  const [signTargetDoc, setSignTargetDoc] = useState(null);
  const [uploadType, setUploadType] = useState('passport');
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest | oldest | expiry
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(()=> writeLS('td_docs_v1', docs), [docs]);
  useEffect(()=> writeLS('td_doc_policies', policies), [policies]);
  useEffect(()=> writeLS('td_doc_reminders', reminders), [reminders]);

  // Upload file and store as base64 dataURL (suitable for small files/demo)
  function handleFileUpload(file, meta){
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const d = {
        id: uid('doc'),
        employeeId: meta.employeeId,
        tripId: meta.tripId || null,
        type: meta.type || 'other',
        filename: file.name,
        dataUrl,
        uploadedAt: new Date().toISOString(),
        expiry: meta.expiry || null,
        signed: false,
        verified: false,
        notes: meta.notes || ''
      };
      setDocs(s => [d, ...s]);
    };
    reader.readAsDataURL(file);
  }

  function downloadDoc(doc){
    try{
      const arr = doc.dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8 = new Uint8Array(n);
      while(n--) u8[n] = bstr.charCodeAt(n);
      const blob = new Blob([u8], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = doc.filename || 'download'; a.click(); URL.revokeObjectURL(url);
    }catch(e){ alert('Download failed'); }
  }

  // reminders for expiring docs (within 30 days)
  useEffect(()=>{
    const now = Date.now();
    const soon = now + 1000*60*60*24*30; // 30 days
    const found = docs.filter(d => d.expiry && new Date(d.expiry).getTime() <= soon).map(d => ({ id: d.id, employeeId: d.employeeId, type: d.type, expiry: d.expiry }));
    setReminders(found);
  }, [docs]);

  // signature canvas helpers
  function startSign(e){
    const c = canvasRef.current; if(!c) return; isDrawing.current = true; const ctx = c.getContext('2d'); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath();
  }
  function endSign(){ isDrawing.current = false; }
  function signMove(e){ if(!isDrawing.current) return; const c = canvasRef.current; const rect = c.getBoundingClientRect(); const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left; const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top; const ctx=c.getContext('2d'); ctx.lineTo(x,y); ctx.stroke(); }
  function clearSign(){ const c = canvasRef.current; const ctx = c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); }
  function saveSignature(){ const c = canvasRef.current; const data = c.toDataURL('image/png'); if(signTargetDoc){ setDocs(s => s.map(d => d.id === signTargetDoc ? ({ ...d, signed: true, signature: data, signedAt: new Date().toISOString() }) : d)); setShowSignModal(false); setSignTargetDoc(null); } }

  // policy validation per trip: required types per destination name
  function validateTrip(tripId){ const trip = trips.find(t=>t.id===tripId); if(!trip) return { ok:true, missing:[] }; const dest = trip.destination || trip.destName || ''; const required = policies[dest] || []; const empDocs = docs.filter(d => d.employeeId === trip.employeeId).map(d=>d.type);
    const missing = required.filter(r => !empDocs.includes(r)); return { ok: missing.length === 0, missing };
  }

  function attachDocToTrip(docId, tripId){ setDocs(s => s.map(d => d.id === docId ? ({ ...d, tripId }) : d)); }

  // add simple policy (destination -> required doc types)
  function addPolicy(dest, types){ setPolicies(p => ({ ...p, [dest]: types })); }

  // group documents by type for UI sections
  const docGroupsByType = useMemo(() => {
    if(!selectedEmployee) return {};
    const empDocs = docs.filter(d => d.employeeId === selectedEmployee);
    const groups = {};
    empDocs.forEach(d => {
      const t = d.type || 'other';
      if(!groups[t]) groups[t] = [];
      groups[t].push(d);
    });
    return groups;
  }, [docs, selectedEmployee]);

  // collapsed state per group (type)
  const [collapsedGroups, setCollapsedGroups] = useState({});
  function toggleGroup(type){ setCollapsedGroups(s => ({ ...s, [type]: !s[type] })); }

  // filtered/sorted groups for display
  const filteredGroups = useMemo(() => {
    const out = {};
    Object.entries(docGroupsByType).forEach(([type, items]) => {
      let list = items.slice();
      if(filterText){ const f = filterText.toLowerCase(); list = list.filter(d => (d.filename||'').toLowerCase().includes(f) || (d.notes||'').toLowerCase().includes(f)); }
      if(showExpiringOnly){ const now = Date.now(); const soon = now + 1000*60*60*24*30; list = list.filter(d => d.expiry && new Date(d.expiry).getTime() <= soon); }
      if(sortBy === 'newest') list.sort((a,b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      else if(sortBy === 'oldest') list.sort((a,b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
      else if(sortBy === 'expiry') list.sort((a,b) => (a.expiry?new Date(a.expiry):0) - (b.expiry?new Date(b.expiry):0));
      if(list.length) out[type] = list;
    });
    return out;
  }, [docGroupsByType, filterText, sortBy, showExpiringOnly]);

  function openPreview(d){ setPreviewDoc(d); }
  function closePreview(){ setPreviewDoc(null); }

  // download all docs in a group sequentially
  async function downloadAllInGroup(type){ const items = filteredGroups[type] || []; for(const d of items){ downloadDoc(d); await new Promise(r=>setTimeout(r,120)); } }

  return (
    <div className="min-h-screen app-root p-8 font-sans text-gray-800">
      <div className="flex gap-6 max-w-[1400px] mx-auto">
        <main className="flex-1">
          <div className="max-w-[1160px] mx-auto elevated p-6 shadow-lg">
              <div className="card-header mb-4">
                <div className="card-title">
                  <h1 className="text-2xl font-semibold">Document & Compliance</h1>
                  <div className="card-subtitle">Store passports, visas, vaccine certs, insurance & validate per policy</div>
                </div>
                <div className="card-actions">
                  <button type="button" onClick={()=> navigate(-1)} className="back-btn px-3 py-2 border rounded text-sm">← Back</button>
                  <button className="card-collapse" onClick={() => setCollapsedPanels(s => ({ ...s, main: !s.main }))}>{collapsedPanels.main ? 'Expand' : 'Collapse'}</button>
                </div>
              </div>

            <div className="grid grid-cols-12 gap-6 items-start">
              <aside className="col-span-3 elevated p-3 self-start">
          <div className="card-header">
            <div className="card-title">Employees</div>
            <div className="card-actions"><button className="card-collapse" onClick={() => setCollapsedPanels(s => ({ ...s, employees: !s.employees }))}>{collapsedPanels.employees ? 'Expand' : 'Collapse'}</button></div>
          </div>
          <ul className="space-y-2 text-sm">
            {employees.map(e => (
              <li key={e.id}>
                <button type="button" className={`w-full text-left px-2 py-1 rounded ${selectedEmployee===e.id ? 'bg-gray-100':''}`} onClick={()=> setSelectedEmployee(e.id)}>{e.name}</button>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <h4 className="text-sm font-medium">Reminders</h4>
            {reminders.length===0 && <div className="text-xs text-muted mt-2">No upcoming expiries</div>}
            {reminders.map(r => (
              <div key={r.id} className="text-xs border rounded p-2 mt-2">
                <div><strong>{employees.find(x=>x.id===r.employeeId)?.name || '—'}</strong></div>
                <div>{r.type} expires {new Date(r.expiry).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </aside>

  <section className="col-span-6 elevated p-4 self-start">
          <div className="card-header">
            <div className="card-title">Documents</div>
            <div className="card-actions"><button className="card-collapse" onClick={() => setCollapsedPanels(s => ({ ...s, documents: !s.documents }))}>{collapsedPanels.documents ? 'Expand' : 'Collapse'}</button></div>
          </div>
          <div className={collapsedPanels.documents ? 'card-body-collapsed' : ''}>
          {!selectedEmployee && <div className="text-sm text-gray-500">Select an employee to manage documents</div>}
          {selectedEmployee && (
            <div>
              <div className="sticky-card">
                <DocSearch filterText={filterText} setFilterText={setFilterText} sortBy={sortBy} setSortBy={setSortBy} showExpiringOnly={showExpiringOnly} setShowExpiringOnly={setShowExpiringOnly} />
              </div>
              <div className="mt-3">
                {/* document type summary */}
                <div className="flex items-center gap-2 text-sm">
                  {(() => { const empDocs = docs.filter(d=> d.employeeId===selectedEmployee); const counts = empDocs.reduce((acc,d)=> { acc[d.type] = (acc[d.type]||0)+1; return acc; }, {}); return Object.entries(counts).length===0 ? <div className="text-xs text-muted">No documents uploaded</div> : Object.entries(counts).map(([t,c]) => <div key={t} className="px-2 py-1 text-xs rounded bg-gray-100">{t}: {c}</div>); })()}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="flex gap-2">
                  <input type="file" id="docfile" className="border p-2 rounded" onChange={(e)=>{ const f = e.target.files && e.target.files[0]; if(!f) return; handleFileUpload(f, { employeeId: selectedEmployee, type: uploadType || 'other', expiry: uploadExpiry || null, notes: uploadNotes || '' }); e.target.value = null; setUploadNotes(''); setUploadExpiry(''); }} />
                  <select value={uploadType} onChange={e=> setUploadType(e.target.value)} className="border p-2 rounded">
                    <option value="passport">Passport</option>
                    <option value="visa">Visa</option>
                    <option value="vaccine">Vaccine</option>
                    <option value="insurance">Insurance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <input placeholder="Expiry (YYYY-MM-DD)" value={uploadExpiry} onChange={e=> setUploadExpiry(e.target.value)} className="border p-2 rounded" />
                  <input placeholder="Notes" value={uploadNotes} onChange={e=> setUploadNotes(e.target.value)} className="border p-2 rounded" />
                </div>
                <div>
                  <button type="button" className="px-3 py-2 border rounded" onClick={()=>{ const dest = prompt('Destination name to require docs for (e.g., India)'); if(!dest) return; const types = prompt('Required types (comma separated, e.g., passport,visa)'); addPolicy(dest, (types||'').split(',').map(s=>s.trim()).filter(Boolean)); alert('Policy saved'); }}>Add policy</button>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {Object.keys(filteredGroups).length === 0 && <div className="text-xs text-muted">No documents uploaded or match filters</div>}
                {Object.entries(filteredGroups).map(([type, items]) => (
                  <DocGroup key={type} type={type} items={items} collapsed={collapsedGroups[type]} onToggle={t=> toggleGroup(t)} onDownloadAll={downloadAllInGroup} onDownload={downloadDoc} onSign={(d)=> { setSignTargetDoc(d.id); setShowSignModal(true); }} onDelete={(d)=> setDocs(s => s.filter(x=>x.id!==d.id))} onPreview={openPreview} />
                ))}
              </div>
            </div>
          )}
          </div>
  </section>

  <aside className="col-span-3 elevated p-3 self-start">
          <div className="card-header">
            <div className="card-title">Trips & Validation</div>
            <div className="card-actions"><button className="card-collapse" onClick={() => setCollapsedPanels(s => ({ ...s, tripsPanel: !s.tripsPanel }))}>{collapsedPanels.tripsPanel ? 'Expand' : 'Collapse'}</button></div>
          </div>
          <div className={collapsedPanels.tripsPanel ? 'card-body-collapsed' : ''}>
          <div className="mt-2">
            <select value={selectedTrip} onChange={e=> setSelectedTrip(e.target.value)} className="w-full border p-2 rounded text-sm">
              <option value="">Select trip (optional)</option>
              {trips.map(t => <option key={t.id} value={t.id}>{t.title || t.id}</option>)}
            </select>
            {selectedTrip && (
              <div className="mt-3 text-sm">
                <div className="font-medium">Trip details</div>
                <div className="text-xs text-muted mt-1">Validation status:</div>
                <div className="mt-2">
                  {(() => { const v = validateTrip(selectedTrip); return v.ok ? <div className="text-green-700">OK • All required docs present</div> : <div className="text-red-600">Blocked • Missing: {v.missing.join(', ')}</div> })()}
                </div>
                <div className="mt-3">
                  <div className="text-xs font-medium">Attach documents to trip</div>
                  <div className="mt-2 space-y-2">
                    {docs.filter(d=> d.employeeId===selectedEmployee).map(d => (
                      <div key={d.id} className="flex items-center justify-between text-sm">
                        <div>{d.type} — {d.filename}</div>
                        <div>
                          <button type="button" className="px-2 py-0.5 border rounded text-xs" onClick={()=> attachDocToTrip(d.id, selectedTrip)}>Attach</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4">
            <h4 className="font-medium">Policies</h4>
            <div className="text-xs text-muted mt-1">Destination → required types</div>
            <div className="mt-2 space-y-2 text-sm">
              {Object.keys(policies).length === 0 && <div className="text-xs text-muted">No policies defined</div>}
              {Object.entries(policies).map(([dest, types]) => (
                <div key={dest} className="flex items-center justify-between">
                  <div>{dest}</div>
                  <div className="text-xs text-muted">{types.join(', ')}</div>
                </div>
              ))}
            </div>
          </div>
          </div>
        </aside>
      </div>

      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={()=> setShowSignModal(false)} />
          <div className="elevated p-4 rounded z-60" style={{width:520}}>
            <h4 className="font-semibold">Sign document</h4>
            <div className="mt-2">
              <canvas ref={canvasRef} width={480} height={160} style={{border:'1px solid #ddd', borderRadius:6}} onMouseDown={(e)=>{ isDrawing.current=true; const ctx = canvasRef.current.getContext('2d'); const rect = canvasRef.current.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo(e.clientX-rect.left, e.clientY-rect.top); }} onMouseUp={()=>{ isDrawing.current=false; }} onMouseMove={(e)=>{ if(!isDrawing.current) return; const ctx = canvasRef.current.getContext('2d'); const rect = canvasRef.current.getBoundingClientRect(); ctx.lineTo(e.clientX-rect.left, e.clientY-rect.top); ctx.stroke(); }} />
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" className="px-3 py-1 border rounded" onClick={()=>{ const c=canvasRef.current; const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); }}>Clear</button>
              <button type="button" className="px-3 py-1 bg-purple-600 text-white rounded" onClick={()=>{ const c=canvasRef.current; const data=c.toDataURL('image/png'); if(signTargetDoc){ setDocs(s=> s.map(d => d.id===signTargetDoc ? ({ ...d, signed:true, signature:data, signedAt: new Date().toISOString() }) : d)); } setShowSignModal(false); setSignTargetDoc(null); }}>Save signature</button>
              <button type="button" className="px-3 py-1 border rounded" onClick={()=> { setShowSignModal(false); setSignTargetDoc(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {previewDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closePreview} />
          <div className="elevated p-4 rounded z-70 bg-white max-w-[80%] max-h-[80%] overflow-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">{previewDoc.filename}</div>
              <div>
                <button className="px-2 py-1 border rounded mr-2" onClick={()=> downloadDoc(previewDoc)}>Download</button>
                <button className="px-2 py-1 border rounded" onClick={closePreview}>Close</button>
              </div>
            </div>
            <div>
              { (previewDoc.dataUrl || '').startsWith('data:image/') ? <img src={previewDoc.dataUrl} alt={previewDoc.filename} style={{maxWidth:'100%'}}/> : <div className="text-sm">Preview not available for this file type.</div> }
            </div>
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  </div>
  );
}
