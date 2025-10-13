import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function uid() { return Math.random().toString(36).slice(2,9); }
function readLS(key, fallback){ try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }catch{ return fallback; } }
function writeLS(key, v){ try{ localStorage.setItem(key, JSON.stringify(v)); }catch{}
}

const LS_KEY = 'td_policies_v1';

const samplePolicy = () => ({
	id: uid(),
	meta: { name: 'Default Travel Policy', department: 'Global', region: 'All', groups: ['All Employees'], costCenters: [] },
	rules: {
		booking: { airfareClass: 'economy', advanceDays: 14, preferDirect: true },
		accommodation: { nightlyLimit: 150, preferredTypes: ['Hotel'] },
		transport: { taxiAllowed: true, ridesharePreferred: true, carClass: 'standard' },
		insurance: { required: true, provider: '' },
		riskApproval: { type: 'manual', autoThreshold: 0 }
	},
	versions: [ { id: uid(), ts: Date.now(), note: 'Initial', snapshot: null } ],
	createdAt: Date.now(),
});

export default function PolicyBuilder(){
	const navigate = useNavigate();
	const [uiCollapsed, setUiCollapsed] = useState({});
	const [policies, setPolicies] = useState(() => readLS(LS_KEY, [ samplePolicy() ]));
	const [selectedId, setSelectedId] = useState(policies[0]?.id || null);
	const [editing, setEditing] = useState(null); // holds copy being edited
	const [versionNote, setVersionNote] = useState('');
	const fileRef = useRef();
	const mainRef = useRef(null);

	useEffect(()=>{ writeLS(LS_KEY, policies); }, [policies]);

	useEffect(()=>{ if(!selectedId && policies.length) setSelectedId(policies[0].id); }, [policies, selectedId]);

	// helper to select a policy and focus/scroll the main panel
	function selectPolicy(id){
		setSelectedId(id);
		// small timeout to wait for render
		setTimeout(() => {
			try{
				if(mainRef.current){
					mainRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
					// focus the main panel for a11y
					mainRef.current.focus && mainRef.current.focus();
				}
			}catch(e){}
		}, 60);
	}

	function createNew(){
		const p = {
			id: uid(),
			meta: { name: 'New Policy', department: '', region: '', groups: [], costCenters: [] },
			rules: { booking: { airfareClass: 'economy', advanceDays: 14, preferDirect: true }, accommodation: { nightlyLimit: 150, preferredTypes: ['Hotel'] }, transport: { taxiAllowed: true, ridesharePreferred: true, carClass: 'standard' }, insurance: { required: false, provider: '' }, riskApproval: { type: 'manual', autoThreshold: 0 } },
			versions: [],
			createdAt: Date.now()
		};
		setPolicies(s => [p, ...s]);
		setSelectedId(p.id);
		setEditing(p);
	}

	function savePolicy(edit){
		setPolicies(prev => prev.map(p => {
			if(p.id !== edit.id) return p;
			const snapshot = { id: uid(), ts: Date.now(), note: versionNote || 'Saved', snapshot: { meta: edit.meta, rules: edit.rules } };
			const next = { ...p, meta: edit.meta, rules: edit.rules, versions: [snapshot, ...(p.versions||[]) ] };
			return next;
		}));
		setEditing(null);
		setVersionNote('');
	}

	function discardEdit(){ setEditing(null); setVersionNote(''); }

	function deletePolicy(id){
		if(!confirm('Delete this policy? This cannot be undone.')) return;
		setPolicies(s => s.filter(x => x.id !== id));
		if(selectedId === id) setSelectedId(policies[0]?.id || null);
	}

	function duplicatePolicy(id){
		const src = policies.find(p=>p.id===id);
		if(!src) return;
		const copy = { ...src, id: uid(), meta: { ...src.meta, name: src.meta.name + ' (Copy)' }, createdAt: Date.now(), versions: [] };
		setPolicies(s => [copy, ...s]);
		setSelectedId(copy.id);
	}

	function exportPolicy(policy){
		const data = JSON.stringify(policy, null, 2);
		const blob = new Blob([data], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a'); a.href = url; a.download = `${policy.meta?.name || 'policy'}.json`; a.click(); URL.revokeObjectURL(url);
	}

	function exportAll(){
		const data = JSON.stringify(policies, null, 2);
		const blob = new Blob([data], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a'); a.href = url; a.download = `policies-all.json`; a.click(); URL.revokeObjectURL(url);
	}

	function importJSONText(text){
		try{
			const parsed = JSON.parse(text);
			if(Array.isArray(parsed)){
				// merge by adding new copies
				const copies = parsed.map(p => ({ ...p, id: uid(), createdAt: Date.now(), versions: p.versions || [] }));
				setPolicies(s => [...copies, ...s]);
			} else if(parsed && parsed.meta){
				const p = { ...parsed, id: uid(), createdAt: Date.now(), versions: parsed.versions || [] };
				setPolicies(s => [p, ...s]);
			} else {
				alert('Unrecognized policy JSON');
			}
		}catch(e){ alert('Invalid JSON: ' + e.message); }
	}

	function handleFileImport(e){
		const f = e.target.files && e.target.files[0];
		if(!f) return;
		const reader = new FileReader();
		reader.onload = () => { importJSONText(reader.result); fileRef.current.value = null; };
		reader.readAsText(f);
	}

	function restoreVersion(policyId, version){
		const p = policies.find(x=>x.id===policyId);
		if(!p) return;
		if(!confirm('Restore this version as a new saved state?')) return;
		const snapshot = { id: uid(), ts: Date.now(), note: 'Restored from ' + (version.note || ''), snapshot: version.snapshot || { meta: p.meta, rules: p.rules } };
		setPolicies(prev => prev.map(x => x.id === policyId ? { ...x, meta: version.snapshot?.meta || x.meta, rules: version.snapshot?.rules || x.rules, versions: [snapshot, ...(x.versions||[])] } : x));
	}

	const selected = policies.find(p => p.id === selectedId) || null;

	return (
		<div className="p-6">
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-3">
					<h1 className="text-2xl font-semibold">Travel Policy Builder</h1>
				</div>
				<div className="flex items-center gap-2">
					<button type="button" onClick={createNew} className="px-3 py-2 elevated">New policy</button>
					<button type="button" onClick={exportAll} className="px-3 py-2 elevated">Export all</button>
					<label className="elevated px-3 py-2 cursor-pointer">
						Import
						<input ref={fileRef} type="file" accept="application/json" onChange={handleFileImport} className="hidden" />
					</label>
					<button type="button" onClick={() => navigate(-1)} className="px-3 py-2 border rounded text-sm">← Back</button>
				</div>
			</div>

			<div className="grid grid-cols-12 gap-6">
				<aside className="col-span-4 elevated p-4">
					<div className="card-header">
						<div className="card-title">Policies</div>
						<div className="card-actions"><button className="card-collapse" onClick={() => setUiCollapsed(s => ({ ...s, policies: !s.policies }))}>{uiCollapsed.policies ? 'Expand' : 'Collapse'}</button></div>
					</div>
					<div className="mt-3 space-y-2 max-h-[60vh] overflow-auto">
						{policies.map(p => (
							<div key={p.id} className={`p-2 rounded ${p.id === selectedId ? 'border-2 border-indigo-300' : 'border'} flex items-start justify-between` }>
								<div className="flex-1">
									<div className="font-medium">{p.meta?.name}</div>
									<div className="text-xs text-muted">{p.meta?.department || '—'} • {p.meta?.region || '—'}</div>
								</div>
								<div className="ml-2 flex flex-col gap-1">
									<button type="button" className="px-2 py-1 text-xs" onClick={() => selectPolicy(p.id)}>View</button>
									<button type="button" className="px-2 py-1 text-xs" onClick={() => { setEditing(JSON.parse(JSON.stringify(p))); selectPolicy(p.id); }}>Edit</button>
									<button type="button" className="px-2 py-1 text-xs" onClick={() => duplicatePolicy(p.id)}>Dup</button>
								</div>
							</div>
						))}
					</div>
					</aside>

				<main className="col-span-8">
					{!selected && <div className="elevated p-4">No policy selected</div>}
					{selected && (
						<div ref={mainRef} tabIndex={-1} className="elevated p-4">
							<div className="flex items-center justify-between">
								<div>
									<h2 className="text-lg font-semibold">{selected.meta.name}</h2>
									<div className="text-xs text-muted">{selected.meta.department} • {selected.meta.region}</div>
								</div>
								<div className="flex items-center gap-2">
									<button type="button" onClick={() => { setEditing(JSON.parse(JSON.stringify(selected))); }} className="px-3 py-2 elevated">Edit</button>
									<button type="button" onClick={() => exportPolicy(selected)} className="px-3 py-2 elevated">Export</button>
									<button type="button" onClick={() => deletePolicy(selected.id)} className="px-3 py-2 elevated">Delete</button>
								</div>
							</div>

							<section className="mt-4 grid grid-cols-2 gap-4">
								<div className="p-3 border rounded">
									<h4 className="font-medium">Booking</h4>
									<div className="mt-2 text-sm">Class: <strong>{selected.rules.booking.airfareClass}</strong></div>
									<div className="text-sm">Advance days: <strong>{selected.rules.booking.advanceDays}</strong></div>
									<div className="text-sm">Prefer direct flights: <strong>{selected.rules.booking.preferDirect ? 'Yes' : 'No'}</strong></div>
								</div>

								<div className="p-3 border rounded">
									<h4 className="font-medium">Accommodation</h4>
									<div className="mt-2 text-sm">Nightly limit: <strong>${selected.rules.accommodation.nightlyLimit}</strong></div>
									<div className="text-sm">Preferred: <strong>{(selected.rules.accommodation.preferredTypes||[]).join(', ')}</strong></div>
								</div>

								<div className="p-3 border rounded">
									<h4 className="font-medium">Transportation</h4>
									<div className="mt-2 text-sm">Taxi allowed: <strong>{selected.rules.transport.taxiAllowed ? 'Yes' : 'No'}</strong></div>
									<div className="text-sm">Rideshare preferred: <strong>{selected.rules.transport.ridesharePreferred ? 'Yes' : 'No'}</strong></div>
								</div>

								<div className="p-3 border rounded">
									<h4 className="font-medium">Insurance & Risk</h4>
									<div className="mt-2 text-sm">Required: <strong>{selected.rules.insurance.required ? 'Yes' : 'No'}</strong></div>
									<div className="text-sm">Risk approval: <strong>{selected.rules.riskApproval.type}</strong> {selected.rules.riskApproval.type === 'auto' && <span> (auto up to ${selected.rules.riskApproval.autoThreshold})</span>}</div>
								</div>
							</section>

							<section className="mt-4">
								<h4 className="font-medium">Assigned groups / cost centers</h4>
												<div className="mt-2 flex items-center gap-2 flex-wrap">
													{(selected.meta.groups||[]).map((g,i) => <span key={i} className="px-2 py-1 elevated text-xs" style={{paddingLeft:8,paddingRight:8}}>{g}</span>)}
													{(selected.meta.costCenters||[]).map((c,i) => <span key={i} className="px-2 py-1 elevated text-xs" style={{paddingLeft:8,paddingRight:8}}>{c}</span>)}
												</div>
							</section>

					<section className="mt-4">
								<h4 className="font-medium">Versions</h4>
								<div className="mt-2 space-y-2 max-h-40 overflow-auto">
									{(selected.versions||[]).map(v => (
										<div key={v.id} className="p-2 border rounded flex items-center justify-between">
											<div className="text-sm">{new Date(v.ts).toLocaleString()} <span className="text-xs text-muted">{v.note}</span></div>
											<div className="flex items-center gap-2">
												<button type="button" className="px-2 py-1 text-xs" onClick={() => restoreVersion(selected.id, v)}>Restore</button>
											</div>
										</div>
									))}
									{!(selected.versions||[]).length && <div className="text-xs text-muted">No saved versions</div>}
								</div>
							</section>
						</div>
					)}
				</main>
			</div>

			{/* Edit modal / panel */}
			{editing && (
				<div className="fixed inset-0 z-40 flex items-start justify-center p-6">
					<div className="bg-black/40 absolute inset-0" onClick={discardEdit}></div>
					<div className="elevated rounded max-w-3xl w-full z-50 p-4 shadow-lg">
						<div className="flex items-center justify-between">
							<h3 className="font-semibold">Edit policy: {editing.meta.name}</h3>
							<div className="flex items-center gap-2">
								<input placeholder="version note (eg: change nightly limit)" value={versionNote} onChange={e=>setVersionNote(e.target.value)} className="border px-2 py-1 rounded" />
								<button type="button" onClick={() => savePolicy(editing)} className="px-3 py-2 elevated">Save</button>
								<button type="button" onClick={discardEdit} className="px-3 py-2 elevated">Cancel</button>
							</div>
						</div>

						<div className="mt-3 grid grid-cols-2 gap-4">
							<div>
								<label className="block text-xs text-muted">Name</label>
								<input className="border p-2 rounded w-full" value={editing.meta.name} onChange={e=> setEditing(ed => ({ ...ed, meta: { ...ed.meta, name: e.target.value } }))} />

								<label className="block text-xs text-muted mt-2">Department</label>
								<input className="border p-2 rounded w-full" value={editing.meta.department} onChange={e=> setEditing(ed => ({ ...ed, meta: { ...ed.meta, department: e.target.value } }))} />

								<label className="block text-xs text-muted mt-2">Region</label>
								<input className="border p-2 rounded w-full" value={editing.meta.region} onChange={e=> setEditing(ed => ({ ...ed, meta: { ...ed.meta, region: e.target.value } }))} />

								<label className="block text-xs text-muted mt-2">Groups (comma separated)</label>
								<input className="border p-2 rounded w-full" value={(editing.meta.groups||[]).join(', ')} onChange={e=> setEditing(ed => ({ ...ed, meta: { ...ed.meta, groups: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) } }))} />

								<label className="block text-xs text-muted mt-2">Cost centers (comma separated)</label>
								<input className="border p-2 rounded w-full" value={(editing.meta.costCenters||[]).join(', ')} onChange={e=> setEditing(ed => ({ ...ed, meta: { ...ed.meta, costCenters: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) } }))} />
							</div>

							<div>
								<h4 className="font-medium">Booking</h4>
								<label className="block text-xs text-muted mt-2">Airfare class</label>
								<select className="border p-2 rounded w-full" value={editing.rules.booking.airfareClass} onChange={e => setEditing(ed => ({ ...ed, rules: { ...ed.rules, booking: { ...ed.rules.booking, airfareClass: e.target.value } } }))}>
									<option>economy</option>
									<option>premium-economy</option>
									<option>business</option>
									<option>first</option>
								</select>

								<label className="block text-xs text-muted mt-2">Advance days</label>
								<input type="number" className="border p-2 rounded w-full" value={editing.rules.booking.advanceDays} onChange={e => setEditing(ed => ({ ...ed, rules: { ...ed.rules, booking: { ...ed.rules.booking, advanceDays: Number(e.target.value) } } }))} />

								<label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={editing.rules.booking.preferDirect} onChange={e=> setEditing(ed=> ({ ...ed, rules: { ...ed.rules, booking: { ...ed.rules.booking, preferDirect: e.target.checked } } }))} /> Prefer direct flights</label>

								<h4 className="font-medium mt-3">Accommodation</h4>
								<label className="block text-xs text-muted mt-2">Nightly limit (USD)</label>
								<input type="number" className="border p-2 rounded w-full" value={editing.rules.accommodation.nightlyLimit} onChange={e => setEditing(ed => ({ ...ed, rules: { ...ed.rules, accommodation: { ...ed.rules.accommodation, nightlyLimit: Number(e.target.value) } } }))} />

								<label className="block text-xs text-muted mt-2">Preferred types (comma separated)</label>
								<input className="border p-2 rounded w-full" value={(editing.rules.accommodation.preferredTypes||[]).join(', ')} onChange={e => setEditing(ed => ({ ...ed, rules: { ...ed.rules, accommodation: { ...ed.rules.accommodation, preferredTypes: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) } } }))} />

								<h4 className="font-medium mt-3">Transportation</h4>
								<label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={editing.rules.transport.taxiAllowed} onChange={e=> setEditing(ed=> ({ ...ed, rules: { ...ed.rules, transport: { ...ed.rules.transport, taxiAllowed: e.target.checked } } }))} /> Taxi allowed</label>
								<label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={editing.rules.transport.ridesharePreferred} onChange={e=> setEditing(ed=> ({ ...ed, rules: { ...ed.rules, transport: { ...ed.rules.transport, ridesharePreferred: e.target.checked } } }))} /> Rideshare preferred</label>

								<h4 className="font-medium mt-3">Insurance & Risk</h4>
								<label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={editing.rules.insurance.required} onChange={e=> setEditing(ed=> ({ ...ed, rules: { ...ed.rules, insurance: { ...ed.rules.insurance, required: e.target.checked } } }))} /> Insurance required</label>
								<label className="block text-xs text-muted mt-2">Risk approval</label>
								<select className="border p-2 rounded w-full" value={editing.rules.riskApproval.type} onChange={e=> setEditing(ed=> ({ ...ed, rules: { ...ed.rules, riskApproval: { ...ed.rules.riskApproval, type: e.target.value } } }))}>
									<option value="manual">manual</option>
									<option value="auto">auto</option>
								</select>
								{editing.rules.riskApproval.type === 'auto' && (
									<div className="mt-2">
										<label className="text-xs text-muted">Auto-approve up to (USD)</label>
										<input type="number" className="border p-2 rounded w-full" value={editing.rules.riskApproval.autoThreshold} onChange={e=> setEditing(ed=> ({ ...ed, rules: { ...ed.rules, riskApproval: { ...ed.rules.riskApproval, autoThreshold: Number(e.target.value) } } }))} />
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

