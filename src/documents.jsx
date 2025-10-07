import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function uid(prefix='d'){ return `${prefix}_${Date.now()}_${Math.floor(Math.random()*9000+1000)}` }
function readLS(key, fallback){ try{ const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }catch{ return fallback; } }
function writeLS(key, v){ try{ localStorage.setItem(key, JSON.stringify(v)); }catch{}
}

export default function Documents(){
  const navigate = useNavigate();
  const [employees, setEmployees] = useState(()=> readLS('td_employees', [{ id:'e1', name:'Alice' }, { id:'e2', name:'Bob' }]));
  const [trips, setTrips] = useState(()=> readLS('td_trips_v2', []));
  const [docs, setDocs] = useState(()=> readLS('td_docs_v1', []));
  const [policies, setPolicies] = useState(()=> readLS('td_doc_policies', { /* destinationName: [ 'passport','vaccine' ] */ }));
  const [selectedEmployee, setSelectedEmployee] = useState(employees[0]?.id || '');
  const [selectedTrip, setSelectedTrip] = useState('');
  const [reminders, setReminders] = useState(()=> readLS('td_doc_reminders', []));
  const [showSignModal, setShowSignModal] = useState(false);
  const [signTargetDoc, setSignTargetDoc] = useState(null);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Document & Compliance</h1>
          <div className="text-sm text-gray-500">Store passports, visas, vaccine certs, insurance & validate per policy</div>
        </div>
        <div>
          <button onClick={()=> navigate(-1)} className="px-3 py-1 border rounded">← Back</button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-3 bg-white rounded border p-3">
          <h3 className="font-semibold mb-2">Employees</h3>
          <ul className="space-y-2 text-sm">
            {employees.map(e => (
              <li key={e.id}>
                <button className={`w-full text-left px-2 py-1 rounded ${selectedEmployee===e.id ? 'bg-gray-100':''}`} onClick={()=> setSelectedEmployee(e.id)}>{e.name}</button>
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

        <main className="col-span-6 bg-white rounded border p-4">
          <h3 className="font-semibold">Documents</h3>
          {!selectedEmployee && <div className="text-sm text-gray-500">Select an employee to manage documents</div>}
          {selectedEmployee && (
            <div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <input type="file" id="docfile" className="border p-2 rounded" onChange={(e)=>{ const f = e.target.files && e.target.files[0]; if(!f) return; const type = prompt('Document type (passport/visa/vaccine/insurance/other):', 'passport'); const expiry = prompt('Expiry date (YYYY-MM-DD) or empty:',''); const notes = prompt('Notes (optional)',''); handleFileUpload(f, { employeeId: selectedEmployee, type: type || 'other', expiry: expiry || null, notes }); e.target.value = null; }} />
                <button className="px-3 py-2 border rounded" onClick={()=>{ const dest = prompt('Destination name to require docs for (e.g., India)'); if(!dest) return; const types = prompt('Required types (comma separated, e.g., passport,visa)'); addPolicy(dest, (types||'').split(',').map(s=>s.trim()).filter(Boolean)); alert('Policy saved'); }}>Add policy</button>
              </div>

              <div className="mt-4 space-y-2">
                {docs.filter(d=> d.employeeId===selectedEmployee).map(d => (
                  <div key={d.id} className="p-2 border rounded flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{d.type} — {d.filename}</div>
                      <div className="text-xs text-muted">Uploaded {new Date(d.uploadedAt).toLocaleDateString()} {d.expiry ? `• Expires ${new Date(d.expiry).toLocaleDateString()}`:''}</div>
                      {d.notes && <div className="text-xs mt-1">{d.notes}</div>}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button className="px-2 py-1 border rounded text-xs" onClick={()=> downloadDoc(d)}>Download</button>
                      <button className="px-2 py-1 border rounded text-xs" onClick={()=> { setSignTargetDoc(d.id); setShowSignModal(true); }}>Sign</button>
                      <button className="px-2 py-1 border rounded text-xs" onClick={()=> setDocs(s => s.filter(x=>x.id!==d.id))}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        <aside className="col-span-3 bg-white rounded border p-3">
          <h3 className="font-semibold">Trips & Validation</h3>
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
                          <button className="px-2 py-0.5 border rounded text-xs" onClick={()=> attachDocToTrip(d.id, selectedTrip)}>Attach</button>
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
        </aside>
      </div>

      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={()=> setShowSignModal(false)} />
          <div className="bg-white p-4 rounded z-60" style={{width:520}}>
            <h4 className="font-semibold">Sign document</h4>
            <div className="mt-2">
              <canvas ref={canvasRef} width={480} height={160} style={{border:'1px solid #ddd', borderRadius:6}} onMouseDown={(e)=>{ isDrawing.current=true; const ctx = canvasRef.current.getContext('2d'); const rect = canvasRef.current.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo(e.clientX-rect.left, e.clientY-rect.top); }} onMouseUp={()=>{ isDrawing.current=false; }} onMouseMove={(e)=>{ if(!isDrawing.current) return; const ctx = canvasRef.current.getContext('2d'); const rect = canvasRef.current.getBoundingClientRect(); ctx.lineTo(e.clientX-rect.left, e.clientY-rect.top); ctx.stroke(); }} />
            </div>
            <div className="mt-3 flex gap-2">
              <button className="px-3 py-1 border rounded" onClick={()=>{ const c=canvasRef.current; const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); }}>Clear</button>
              <button className="px-3 py-1 bg-purple-600 text-white rounded" onClick={()=>{ const c=canvasRef.current; const data=c.toDataURL('image/png'); if(signTargetDoc){ setDocs(s=> s.map(d => d.id===signTargetDoc ? ({ ...d, signed:true, signature:data, signedAt: new Date().toISOString() }) : d)); } setShowSignModal(false); setSignTargetDoc(null); }}>Save signature</button>
              <button className="px-3 py-1 border rounded" onClick={()=> { setShowSignModal(false); setSignTargetDoc(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
