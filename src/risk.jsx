import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const ADVISORIES_KEY = 'td_advisories_v1';
const TRAVELER_STATE_KEY = 'td_travelers_v1';
const NOTIF_KEY = 'td_notifications';

const SAMPLE_DESTINATIONS = [
  { id: 'lon', name: 'London', lat: 51.5074, lng: -0.1278, risk: 'Low' },
  { id: 'ny', name: 'New York', lat: 40.7128, lng: -74.0060, risk: 'Low' },
  { id: 'tok', name: 'Tokyo', lat: 35.6762, lng: 139.6503, risk: 'Medium' },
  { id: 'par', name: 'Paris', lat: 48.8566, lng: 2.3522, risk: 'Low' },
  { id: 'del', name: 'Delhi', lat: 28.7041, lng: 77.1025, risk: 'High' },
];

function generateId(prefix='id'){
  return `${prefix}_${Date.now()}_${Math.floor(Math.random()*9000+1000)}`;
}

function riskColor(r){
  if(r === 'High') return '#ef4444';
  if(r === 'Medium') return '#f59e0b';
  return '#10b981';
}

export default function Risk(){
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState(()=>{
    try{ const raw = localStorage.getItem('td_destinations'); if(raw) return JSON.parse(raw); }catch{}; return SAMPLE_DESTINATIONS;
  });

  const [advisories, setAdvisories] = useState(()=>{
    try{ const r = localStorage.getItem(ADVISORIES_KEY); if(r) return JSON.parse(r); }catch{}; return [];
  });
  const [showAdvForm, setShowAdvForm] = useState(false);
  const [advForm, setAdvForm] = useState({ destId: destinations[0]?.id || '', type: 'political', severity: 'medium', title: '', description: '' });

  const [travelers, setTravelers] = useState(()=>{
    try{ const r = localStorage.getItem(TRAVELER_STATE_KEY); if(r) return JSON.parse(r); }catch{}; return [
      { id: 't_alice', name: 'Alice Johnson', email: 'alice.johnson@example.com', location: { lat:51.5, lng:-0.12 }, optIn: true, lastCheckIn: new Date().toISOString(), sos: false },
      { id: 't_bob', name: 'Bob Smith', email: 'bob.smith@example.com', location: { lat:40.7, lng:-74.0 }, optIn: true, lastCheckIn: new Date().toISOString(), sos: false },
    ]; }
  );

  const [notifications, setNotifications] = useState(()=>{
    try{ const r = localStorage.getItem(NOTIF_KEY); if(r) return JSON.parse(r); }catch{}; return [];
  });

  useEffect(()=>{
    try{ localStorage.setItem('td_destinations', JSON.stringify(destinations)); }catch{}
  }, [destinations]);

  useEffect(()=>{
    try{ localStorage.setItem(ADVISORIES_KEY, JSON.stringify(advisories)); }catch{}
  }, [advisories]);

  useEffect(()=>{
    try{ localStorage.setItem(TRAVELER_STATE_KEY, JSON.stringify(travelers)); }catch{}
  }, [travelers]);

  useEffect(()=>{
    try{ localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications)); }catch{}
  }, [notifications]);

  // Analyze an advisory and update destination risk; notify travelers/operators
  function processAdvisory(adv){
    // find destination
    const d = destinations.find(x => x.id === adv.destId);
    if(d){
      // map severity to risk level
      const sev = (adv.severity || adv.level || 'medium').toLowerCase();
      const newRisk = sev === 'high' ? 'High' : sev === 'medium' ? 'Medium' : 'Low';
      // only increase risk, never reduce automatically
      const ranks = { 'Low': 1, 'Medium': 2, 'High': 3 };
      if(ranks[newRisk] > (ranks[d.risk] || 1)){
        setDestinations(ds => ds.map(x => x.id === d.id ? ({ ...x, risk: newRisk }) : x));
      }
    }

    // store advisory and send operator notification
    setAdvisories(a => {
      const next = [adv, ...a].slice(0,50);
      try{ localStorage.setItem(ADVISORIES_KEY, JSON.stringify(next)); }catch{}
      return next;
    });

    const notif = { id: generateId('notif'), to: 'ops@example.com', subject: `Advisory: ${adv.title}`, body: adv.description, ts: new Date().toISOString(), advisoryId: adv.id };
    setNotifications(n => { const next = [notif, ...n].slice(0,100); try{ localStorage.setItem(NOTIF_KEY, JSON.stringify(next)); }catch{}; return next; });

    // notify travelers optionally (demo: notify all opt-in travelers)
    travelers.forEach(tr => {
      if(tr.optIn){
        sendNotification(tr.email, `Advisory: ${adv.title}`, `Dear ${tr.name},\n\n${adv.description}\n\nLocation: ${adv.destId}\nSeverity: ${adv.severity || adv.level}\n\nPlease follow instructions.`);
      }
    });
  }

  // Simulate an auto-alert advisory generator (e.g., a new travel advisory appears)
  useEffect(()=>{
    const t = setInterval(()=>{
      // 10% chance every 30s to create a new advisory for a random destination
      if(Math.random() < 0.1){
        const d = destinations[Math.floor(Math.random()*destinations.length)];
        const types = ['political','weather','health','other'];
        const severities = ['low','medium','high'];
        const adv = {
          id: generateId('adv'),
          destId: d.id,
          title: `${types[Math.floor(Math.random()*types.length)]} advisory for ${d.name}`,
          type: types[Math.floor(Math.random()*types.length)],
          severity: severities[Math.floor(Math.random()*severities.length)],
          ts: new Date().toISOString(),
          description: `Auto-generated ${d.name} advisory based on ${d.risk} and random factors.`,
        };
        processAdvisory(adv);
      }
    }, 30000);
    return ()=> clearInterval(t);
  }, [destinations, travelers]);

  // helper: send notification (store + return mailto)
  function sendNotification(to, subject, body){
    const n = { id: generateId('notif'), to, subject, body, ts: new Date().toISOString() };
    setNotifications(s => [n, ...s].slice(0,100));
    try{ localStorage.setItem(NOTIF_KEY, JSON.stringify([n, ...(JSON.parse(localStorage.getItem(NOTIF_KEY))||[])])); }catch{}
    return n;
  }

  // Traveler safety functions
  function toggleOptIn(travelerId){
    setTravelers(t=> t.map(x=> x.id===travelerId ? ({...x, optIn: !x.optIn}) : x));
  }

  function triggerSOS(travelerId){
    setTravelers(t=> t.map(x=> x.id===travelerId ? ({...x, sos: true}) : x));
    const tr = travelers.find(x=> x.id===travelerId);
    if(tr) sendNotification('ops@example.com', `SOS: ${tr.name}`, `${tr.name} triggered SOS at ${new Date().toLocaleString()} — last known location ${JSON.stringify(tr.location)}`);
  }

  function checkIn(travelerId){
    setTravelers(t=> t.map(x=> x.id===travelerId ? ({...x, lastCheckIn: new Date().toISOString(), sos: false}) : x));
  }

  // Escalation workflow: notify HR -> Security -> Crisis Team
  function escalateForTraveler(travelerId){
    const tr = travelers.find(x=> x.id===travelerId);
    if(!tr) return;
    const body = `Escalation for ${tr.name} — last known ${JSON.stringify(tr.location)} at ${tr.lastCheckIn}`;
    sendNotification('hr@example.com', `Escalation: ${tr.name}`, body);
    sendNotification('security@example.com', `Escalation: ${tr.name}`, body);
    sendNotification('crisis@example.com', `Escalation: ${tr.name}`, body);
    alert('Escalation notifications queued to HR, Security and Crisis Team (demo)');
  }

  // risk scoring editor
  function setRisk(destId, risk){
    setDestinations(d => d.map(x=> x.id===destId?({...x, risk}):x));
  }

  function addEmergencyContact(name, phone, notes){
    const ec = { id: generateId('ec'), name, phone, notes };
    try{ const raw = JSON.parse(localStorage.getItem('td_emergency_contacts') || '[]'); raw.unshift(ec); localStorage.setItem('td_emergency_contacts', JSON.stringify(raw)); }catch{}
    alert('Emergency contact saved locally');
  }

  function getEmergencyContacts(){
    try{ return JSON.parse(localStorage.getItem('td_emergency_contacts') || '[]'); }catch{return []}
  }

  // high-risk check-in tracking
  const checkInWarnings = travelers.filter(t => {
    if(!t.optIn) return false;
    // if last checkin older than 24 hours and they're in High risk dest (simple heuristic)
    const last = new Date(t.lastCheckIn || 0);
    const hours = (Date.now() - last.getTime()) / (1000*60*60);
    return hours > 24;
  });

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Risk & Safety</h1>
            <div className="text-sm text-gray-500">Global risk map, traveler safety, advisories and emergency workflows</div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate(-1)} className="px-2 py-1 elevated">← Back</button>
            <button type="button" onClick={()=> { const adv = { id: generateId('adv'), destId: destinations[0].id, title: 'Manual advisory', level: 'Medium', ts: new Date().toISOString(), description: 'Manual advisory created by operator' }; setAdvisories(a => [adv, ...a]); sendNotification('ops@example.com', adv.title, adv.description);} } className="px-3 py-2 bg-purple-700 text-white rounded">Create advisory</button>
            <button type="button" onClick={()=> { const ec = getEmergencyContacts(); if(ec.length===0) alert('No emergency contacts saved'); else alert(JSON.stringify(ec[0], null, 2)); }} className="px-3 py-2 elevated">Emergency contacts</button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8 elevated p-4">
            <h3 className="font-semibold mb-3">Risk map</h3>
            <div className="mb-4 text-sm text-gray-500">Color-coded destinations by risk (Low/Medium/High)</div>
            <div style={{height: 360}} className="border rounded overflow-hidden">
              <MapContainer center={[20,0]} zoom={2} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {destinations.map(d => {
                  const advs = advisories.filter(a => a.destId === d.id);
                  return (
                    <CircleMarker key={d.id} center={[d.lat, d.lng]} radius={8 + (d.risk === 'High' ? 4 : d.risk === 'Medium' ? 2 : 0)} pathOptions={{ color: riskColor(d.risk), fillOpacity: 0.9, weight: 1 }}>
                      <Popup>
                        <div style={{minWidth:200}}>
                          <div className="font-semibold">{d.name}</div>
                          <div className="text-sm" style={{color: riskColor(d.risk)}}>{d.risk} risk</div>
                          {advs.length > 0 && (
                            <div className="mt-2 text-xs">
                              <div className="font-medium">Advisories</div>
                              <ul className="mt-1 space-y-1">
                                {advs.map(a => (
                                  <li key={a.id} className="text-xs elevated p-1">
                                    <div className="font-semibold">{a.title}</div>
                                    <div className="text-xs text-gray-500">{a.type} • {a.severity}</div>
                                    <div className="text-xs mt-1">{a.description}</div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>

            <div className="mt-3 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{background: riskColor('Low')}} /> Low</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{background: riskColor('Medium')}} /> Medium</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{background: riskColor('High')}} /> High</div>
              <div className="ml-6 text-xs text-gray-500">Advisory types: political, weather, health, other — severity influences risk level.</div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {destinations.map(d => (
                <div key={d.id} className="p-3 elevated">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{d.name}</div>
                    <div className="text-sm" style={{color: riskColor(d.risk)}}>{d.risk}</div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">Adjust risk</div>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={()=> setRisk(d.id, 'Low')} className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">Low</button>
                    <button type="button" onClick={()=> setRisk(d.id, 'Medium')} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">Medium</button>
                    <button type="button" onClick={()=> setRisk(d.id, 'High')} className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">High</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-4 space-y-4">
            <div className="elevated p-3">
              <h3 className="font-semibold mb-2">Advisories</h3>
              <div className="text-xs text-gray-500 mb-2">Auto-alerts and advisories</div>
                <div className="flex items-start gap-2 mb-2">
                  <button type="button" onClick={()=> setShowAdvForm(s => !s)} className="px-2 py-1 elevated text-xs">{showAdvForm ? 'Close form' : 'New advisory'}</button>
                  <div className="text-xs text-gray-400">Advisories update risk for destinations. Types: political / weather / health / other.</div>
                </div>

                { showAdvForm && (
                  <div className="p-2 elevated mb-2">
                    <div className="text-xs text-gray-600 mb-2">Create advisory</div>
                    <div className="grid grid-cols-1 gap-2">
                      <select className="border p-2 text-sm" value={advForm.destId} onChange={(e)=> setAdvForm({...advForm, destId: e.target.value})}>
                        {destinations.map(d=> (<option key={d.id} value={d.id}>{d.name}</option>))}
                      </select>
                      <select className="border p-2 text-sm" value={advForm.type} onChange={(e)=> setAdvForm({...advForm, type: e.target.value})}>
                        <option value="political">Political</option>
                        <option value="weather">Weather</option>
                        <option value="health">Health</option>
                        <option value="other">Other</option>
                      </select>
                      <select className="border p-2 text-sm" value={advForm.severity} onChange={(e)=> setAdvForm({...advForm, severity: e.target.value})}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <input className="border p-2 text-sm" placeholder="Title" value={advForm.title} onChange={(e)=> setAdvForm({...advForm, title: e.target.value})} />
                      <textarea className="border p-2 text-sm" placeholder="Description" value={advForm.description} onChange={(e)=> setAdvForm({...advForm, description: e.target.value})} />
                      <div className="flex gap-2">
                        <button type="button" onClick={()=> { const adv = { id: generateId('adv'), destId: advForm.destId, title: advForm.title || 'Manual advisory', type: advForm.type, severity: advForm.severity, description: advForm.description, ts: new Date().toISOString() }; processAdvisory(adv); setShowAdvForm(false); setAdvForm({ ...advForm, title:'', description:'' }); }} className="px-3 py-2 bg-purple-700 text-white rounded text-sm">Create</button>
                        <button type="button" onClick={()=> setShowAdvForm(false)} className="px-3 py-2 elevated text-sm">Cancel</button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="max-h-48 overflow-auto space-y-2">
                  {advisories.length === 0 && <div className="text-xs text-gray-400">No advisories</div>}
                  {advisories.map(a => (
                    <div key={a.id} className="p-2 elevated text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{a.title} <span className="text-xs ml-2 px-2 py-0.5 rounded" style={{background: a.severity==='high' ? '#fee2e2' : a.severity==='medium' ? '#fef3c7' : '#ecfdf5'}}>{a.type} • {a.severity}</span></div>
                          <div className="text-xs text-gray-400">{new Date(a.ts).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{a.description}</div>
                        <div className="mt-2 flex gap-2">
                        <button type="button" onClick={()=> { sendNotification('ops@example.com', `Acknowledge: ${a.title}`, `Acknowledged advisory ${a.title}`); alert('Acknowledged (demo)'); }} className="px-2 py-1 elevated text-xs">Acknowledge</button>
                        <button type="button" onClick={()=> { navigator.clipboard && navigator.clipboard.writeText(a.description); alert('Copied details to clipboard'); }} className="px-2 py-1 elevated text-xs">Copy</button>
                      </div>
                    </div>
                  ))}
                </div>
            </div>

                <div className="elevated p-3">
              <h3 className="font-semibold mb-2">Traveler Safety</h3>
              <div className="text-xs text-gray-500 mb-2">Live locations (opt-in), SOS, check-ins</div>
              <div className="space-y-2">
                {travelers.map(t => (
                  <div key={t.id} className="p-2 elevated text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-gray-400">{t.email}</div>
                      </div>
                      <div className="text-xs text-gray-500">{t.optIn ? 'Sharing' : 'Not sharing'}</div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">Last check-in: {new Date(t.lastCheckIn).toLocaleString()}</div>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={()=> toggleOptIn(t.id)} className="px-2 py-1 elevated text-xs">{t.optIn ? 'Disable sharing' : 'Enable sharing'}</button>
                      <button type="button" onClick={()=> checkIn(t.id)} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Check-in now</button>
                      <button type="button" onClick={()=> triggerSOS(t.id)} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Trigger SOS</button>
                      <button type="button" onClick={()=> escalateForTraveler(t.id)} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Escalate</button>
                    </div>
                  </div>
                ))}

                { checkInWarnings.length > 0 && (
                  <div className="p-2 bg-red-50 text-red-700 rounded text-sm">{checkInWarnings.length} traveler(s) haven't checked in within 24h</div>
                )}
              </div>
            </div>

            <div className="elevated p-3">
              <h3 className="font-semibold mb-2">Emergency Response</h3>
              <div className="text-xs text-gray-500 mb-2">24/7 helpline & contact directory</div>
              <div className="text-sm">
                <div className="mb-2">Helpline: <a className="text-blue-600" href="tel:+18001234567">+1 800 123 4567</a></div>
                <div className="mb-2">Security ops: <a className="text-blue-600" href="mailto:security@example.com">security@example.com</a></div>
                <div className="mb-2">Embassy contacts and hospitals saved in directory</div>
                <div className="mt-2">
                  <input id="ec-name" placeholder="Name" className="border rounded p-2 w-full text-sm mb-2" />
                  <input id="ec-phone" placeholder="Phone" className="border rounded p-2 w-full text-sm mb-2" />
                  <input id="ec-notes" placeholder="Notes" className="border rounded p-2 w-full text-sm mb-2" />
                  <div className="flex gap-2">
                    <button type="button" onClick={()=> { const n = document.getElementById('ec-name'); const p = document.getElementById('ec-phone'); const notes = document.getElementById('ec-notes'); if(n && p) { addEmergencyContact(n.value, p.value, notes?.value); n.value=''; p.value=''; if(notes) notes.value=''; } }} className="px-3 py-2 bg-purple-700 text-white rounded text-sm">Save contact</button>
                    <button type="button" onClick={()=> { const ec = getEmergencyContacts(); alert(JSON.stringify(ec,null,2)); }} className="px-3 py-2 elevated text-sm">View directory</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="elevated p-3">
              <h3 className="font-semibold mb-2">Notifications</h3>
              <div className="text-xs text-gray-500 mb-2">Sent messages & alerts</div>
              <div className="max-h-40 overflow-auto space-y-2 text-sm">
                { notifications.length === 0 && <div className="text-xs text-gray-400">No notifications</div> }
                { notifications.map(n => (
                  <div key={n.id} className="p-2 elevated">
                    <div className="font-medium">{n.subject}</div>
                    <div className="text-xs text-gray-400">to {n.to} • {new Date(n.ts).toLocaleString()}</div>
                    <div className="mt-2 flex gap-2">
                      <a className="text-xs px-2 py-1 elevated" href={`mailto:${n.to}?subject=${encodeURIComponent(n.subject)}&body=${encodeURIComponent(n.body)}`} target="_blank" rel="noreferrer">Open</a>
                    </div>
                  </div>
                )) }
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
