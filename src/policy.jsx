import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
const LOCAL_KEY = "policy_builder_v1";
const POLICIES_KEY = "policy_builder_v1_list";
const TABS = [
  { id: "guidelines", label: "Guidelines" },
  { id: "safety", label: "Safety" },
  { id: "workflow", label: "Approvals" },
  { id: "notifications", label: "Notifications" },
  { id: "expenses", label: "Expenses" },
  { id: "roles", label: "Roles" },
  { id: "audit", label: "Audit" },
  { id: "templates", label: "Templates" },
];

function IconSave() {
  return (
    <svg className="w-5 h-5 inline-block mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3h14v14H5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 3v6h10V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 14h6v4H9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg className="w-4 h-4 inline-block" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ThemeToggle(){
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('siteTheme') || 'light' } catch { return 'light' }
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
      localStorage.setItem('siteTheme', theme);
    } catch (e) {}
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <button
      aria-pressed={theme === 'dark'}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      onClick={toggle}
      className="theme-btn"
    >
      {theme === 'dark' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 7a5 5 0 100 10 5 5 0 000-10z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

function TabButton({ id, label, active, setActive, index, focusableIndex, setFocusableIndex }) {
  const ref = useRef(null);
  useEffect(() => {
    if (focusableIndex === index) ref.current?.focus();
  }, [focusableIndex, index]);

  return (
    <button
      ref={ref}
      role="tab"
      aria-selected={active === id}
      tabIndex={active === id ? 0 : -1}
      onClick={() => setActive(id)}
      onFocus={() => setFocusableIndex(index)}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg focus:outline-none transition-all flex items-center gap-2 ${
        active === id
          ? "bg-gradient-to-r from-purple-700 to-purple-600 text-white shadow-lg"
          : "bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function policy() {
  const navigate = useNavigate();
  // load from localStorage if exists
  const defaultPolicy = {
    meta: { id: `policy_${Date.now()}`, name: "Default policy", updated: new Date().toISOString() },
    bookingClass: "Economy Only",
    budgetLimit: "",
    preferredAirlines: [],
    preferredHotels: [],
    advanceBookingDays: 14,
    mandatoryInsurance: true,
    highRiskDestinations: [],
    emergencyContacts: "",
    advisoriesUrl: "",
    approvalWorkflows: [
      { id: 1, name: "Default", steps: ["Manager"] },
    ],
    // assignment fields
    department: '',
    region: '',
    assignedGroups: [],
    costCenters: [],
    // risk approval rules
    riskApproval: { mode: 'manual', autoThreshold: '' },
    // versioning
    versions: [],
    notificationChannels: { email: true, sms: false, slack: false },
    notificationEmails: "",
    expenseLimits: { Meals: "", Transport: "", Misc: "" },
    roles: [{ role: "Employee", permissions: ["view"] }],
    templates: [],
    auditLog: [{ ts: new Date().toISOString(), user: "system", msg: "Initial policy created" }],
  };

  const [policy, setPolicy] = useState(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : defaultPolicy;
    } catch (e) {
      console.warn("Failed to read local policy, using default", e);
      return defaultPolicy;
    }
  });

  const [policies, setPolicies] = useState(() => {
    try{
      const raw = localStorage.getItem(POLICIES_KEY);
      if(raw) return JSON.parse(raw);
    }catch{}
    return [defaultPolicy];
  });
  const [currentPolicyId, setCurrentPolicyId] = useState(() => policy?.meta?.id || policies[0]?.meta?.id);

  const [activeTab, setActiveTab] = useState("guidelines");
  const [focusableIndex, setFocusableIndex] = useState(0);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [diffsForModal, setDiffsForModal] = useState([]);

  // keyboard navigation for tabs
  function handleKeyDown(e) {
    const currentIndex = TABS.findIndex((t) => t.id === activeTab);
    if (e.key === "ArrowRight") {
      const next = (currentIndex + 1) % TABS.length;
      setActiveTab(TABS[next].id);
      setFocusableIndex(next);
    } else if (e.key === "ArrowLeft") {
      const prev = (currentIndex - 1 + TABS.length) % TABS.length;
      setActiveTab(TABS[prev].id);
      setFocusableIndex(prev);
    } else if (e.key === "Home") {
      setActiveTab(TABS[0].id);
      setFocusableIndex(0);
    } else if (e.key === "End") {
      setActiveTab(TABS[TABS.length - 1].id);
      setFocusableIndex(TABS.length - 1);
    }
  }

  useEffect(() => {
    // persist short debounce for current policy edit (not whole list)
    const id = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(policy));
      } catch (e) {
        console.warn("Failed to persist policy", e);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [policy]);

  // ensure policies list contains the current policy on load
  useEffect(() => {
    try{
      setPolicies((prev) => {
        const exists = prev.find(p => p.meta?.id === policy.meta?.id);
        if(!exists){
          const next = [policy, ...prev];
          localStorage.setItem(POLICIES_KEY, JSON.stringify(next));
          return next;
        }
        return prev;
      });
    }catch{}
  }, []);

  // when selecting a different saved policy id, load it into editor
  useEffect(() => {
    if(!currentPolicyId) return;
    const found = policies.find(p => p.meta?.id === currentPolicyId);
    if(found) setPolicy(JSON.parse(JSON.stringify(found)));
  }, [currentPolicyId, policies]);

  function pushAudit(msg, user = "current-user") {
    const entry = { ts: new Date().toISOString(), user, msg };
    setPolicy((p) => ({ ...p, auditLog: [entry, ...(p.auditLog || [])] }));
  }

  function savePolicy() {
    setPolicy((p) => {
      const updated = { ...p, meta: { ...p.meta, updated: new Date().toISOString() } };
      // add version snapshot
      try{
        const snapshot = JSON.parse(JSON.stringify(updated));
        snapshot.snapshotAt = new Date().toISOString();
        updated.versions = [snapshot, ...(updated.versions || [])].slice(0, 20);
      }catch{}

      // update policies list
      setPolicies(prev => {
        const exists = prev.find(x => x.meta?.id === updated.meta?.id);
        let next;
        if(exists){
          next = prev.map(x => x.meta?.id === updated.meta?.id ? updated : x);
        } else {
          next = [updated, ...prev];
        }
        try{ localStorage.setItem(POLICIES_KEY, JSON.stringify(next)); }catch{}
        return next;
      });

      pushAudit("Saved policy");
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(updated)); } catch (e) {}
      alert("Policy saved locally and added to policies list");
      return updated;
    });
  }

  function loadTemplate(template) {
    // merge template onto policy but keep audit
    setPolicy((p) => ({ ...p, ...template, auditLog: p.auditLog }));
    pushAudit(`Loaded template ${template.meta?.name || template.name || "(template)"}`);
  }

  function createNewPolicyFromCurrent(name){
    const copy = JSON.parse(JSON.stringify(policy));
    copy.meta = { ...(copy.meta||{}), id: `policy_${Date.now()}`, name: name || (`Copy of ${copy.meta?.name||'Policy'}`), updated: new Date().toISOString() };
    copy.versions = [];
    setPolicies(prev => { const next = [copy, ...prev]; try{ localStorage.setItem(POLICIES_KEY, JSON.stringify(next)); }catch{}; return next; });
    setCurrentPolicyId(copy.meta.id);
    pushAudit('Created new policy');
  }

  function deletePolicy(id){
    if(!confirm('Delete this policy? This cannot be undone.')) return;
    setPolicies(prev => {
      const next = prev.filter(p => p.meta?.id !== id);
      try{ localStorage.setItem(POLICIES_KEY, JSON.stringify(next)); }catch{}
      if(next.length) setCurrentPolicyId(next[0].meta.id);
      else {
        // reset to default
        setPolicy(defaultPolicy);
        setCurrentPolicyId(defaultPolicy.meta.id);
        setPolicies([defaultPolicy]);
      }
      return next;
    });
    pushAudit('Deleted policy');
  }

  function exportPolicyObject(obj){ exportObjectAsJSON(obj, `${obj.meta?.name||'policy'}.json`); }

  function addExpenseCategory(name) {
    setPolicy((p) => ({ ...p, expenseLimits: { ...p.expenseLimits, [name]: "" } }));
    pushAudit(`Added expense category ${name}`);
  }

  function removeExpenseCategory(name) {
    setPolicy((p) => {
      const copy = { ...p.expenseLimits };
      delete copy[name];
      return { ...p, expenseLimits: copy };
    });
    pushAudit(`Removed expense category ${name}`);
  }

  function addWorkflow(name) {
    setPolicy((p) => ({ ...p, approvalWorkflows: [...(p.approvalWorkflows || []), { id: Date.now(), name, steps: ["Manager"] }] }));
    pushAudit(`Added workflow ${name}`);
  }

  function rollbackAudit(index) {
    const entry = policy.auditLog[index];
    if (!entry) return;
    // For the demo, rollback will append an audit entry describing rollback.
    pushAudit(`Rolled back to entry: ${entry.msg}`);
    alert(`Rolled back (demo): ${entry.msg}`);
  }

  // Quick action handlers
  function handleAddPerDiem() {
    // keep the quick action simple: add a PerDiem category and notify
    addExpenseCategory('PerDiem');
    alert('PerDiem category added');
  }

  function handleAddWorkflow() {
    // add a default-named workflow; user can rename from the Workflows tab
    addWorkflow('New Workflow');
    alert('New workflow added (rename it in Approvals)');
  }

  function resetPolicy() {
    // restore defaults and record audit entry
    setPolicy(defaultPolicy);
    pushAudit('Reset to default');
    alert('Policy reset to defaults');
  }

  function exportPolicy() {
    const blob = new Blob([JSON.stringify(policy, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${policy.meta?.name || "policy"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportObjectAsJSON(obj, filename = 'template.json'){
    try{
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }catch(e){ console.warn('export failed', e); }
  }

  function importPolicy(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        setPolicy(parsed);
        pushAudit("Imported policy file");
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  }

  // Template preview helpers
  function openTemplatePreview(tpl){
    setPreviewTemplate(tpl);
  }

  function closeTemplatePreview(){
    setPreviewTemplate(null);
  }

  // close on Escape
  useEffect(()=>{
    function onKey(e){ if(e.key === 'Escape') closeTemplatePreview(); }
    if(previewTemplate) document.addEventListener('keydown', onKey);
    return ()=> document.removeEventListener('keydown', onKey);
  }, [previewTemplate]);

  // Helpers for UI small components
  function Chip({ children }) {
    return <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">{children}</span>;
  }

  // simple diff utility: returns array of { path, old, new, type }
  function computeDiff(a, b, prefix=''){
    const out = [];
    const keys = new Set([...(a?Object.keys(a):[]), ...(b?Object.keys(b):[])]);
    keys.forEach(k => {
      const pa = a ? a[k] : undefined;
      const pb = b ? b[k] : undefined;
      const path = prefix ? `${prefix}.${k}` : k;
      if(typeof pa === 'object' && pa !== null && typeof pb === 'object' && pb !== null && !Array.isArray(pa) && !Array.isArray(pb)){
        out.push(...computeDiff(pa, pb, path));
      } else if(Array.isArray(pa) && Array.isArray(pb)){
        if(JSON.stringify(pa) !== JSON.stringify(pb)) out.push({ path, old: pa, new: pb, type: 'modified' });
      } else {
        if(JSON.stringify(pa) !== JSON.stringify(pb)) out.push({ path, old: pa, new: pb, type: pa === undefined ? 'added' : pb === undefined ? 'removed' : 'modified' });
      }
    });
    return out;
  }

  // Modal component to show version diffs
  function VersionDiffModal({ open, onClose, diffs, title }){
    if(!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">{title || 'Version differences'}</h3>
            <button onClick={onClose} className="text-sm px-2 py-1 bg-gray-100 rounded">Close</button>
          </div>
          <div className="max-h-96 overflow-auto text-sm">
            {(!diffs || diffs.length === 0) && <div className="text-gray-500">No differences found</div>}
            {diffs && diffs.map((d, i) => (
              <div key={i} className="p-2 border-b flex items-start gap-3">
                <div className={`w-2 h-6 rounded ${d.type==='modified' ? 'bg-yellow-400' : d.type==='added' ? 'bg-green-400' : 'bg-red-400'}`} />
                <div>
                  <div className="font-medium">{d.path} <span className="text-xs text-gray-400">({d.type})</span></div>
                  <div className="text-xs text-gray-600">Old: <pre className="inline">{JSON.stringify(d.old)}</pre></div>
                  <div className="text-xs text-gray-800">New: <pre className="inline">{JSON.stringify(d.new)}</pre></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const templateExamples = [
    {
      meta: { name: "Standard Travel", updated: new Date().toISOString() },
      bookingClass: "Economy Only",
      budgetLimit: "1000",
      notificationChannels: { email: true, sms: false, slack: false },
    },
    {
      meta: { name: "Exec Travel", updated: new Date().toISOString() },
      bookingClass: "Business Allowed",
      budgetLimit: "5000",
      notificationChannels: { email: true, sms: true, slack: true },
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-8">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <header className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-700 to-purple-600 text-white">
          <div>
            <h1 className="text-2xl font-semibold">Corporate Travel Policy Builder</h1>
            <div className="text-sm text-purple-200">Create, preview and manage travel policies</div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-sm">← Back</button>
            <ThemeToggle />
            <button
              onClick={savePolicy}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-md transition"
              title="Save policy (localStorage)"
            >
              <IconSave /> Save
            </button>

            <button
              onClick={exportPolicy}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-md transition"
              title="Export policy as JSON"
            >
              Export
            </button>

            <label className="cursor-pointer inline-block bg-white/10 hover:bg-white/20 px-4 py-2 rounded-md">
              Import
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => e.target.files && importPolicy(e.target.files[0])}
              />
            </label>
          </div>
        </header>

        <div className="p-6 grid grid-cols-12 gap-6">
          <aside className="col-span-3 bg-gray-50 rounded-lg p-4 sticky top-6 h-fit">
            <div className="mb-4">Policies</div>
            <div className="mb-3">
              <select className="w-full border rounded p-2" value={currentPolicyId} onChange={(e)=> setCurrentPolicyId(e.target.value)}>
                {policies.map(p => (<option key={p.meta.id} value={p.meta.id}>{p.meta.name}</option>))}
              </select>
              <div className="flex gap-2 mt-2">
                <button className="flex-1 px-2 py-1 bg-white border rounded" onClick={()=> { const name = prompt('New policy name'); if(name) createNewPolicyFromCurrent(name); }}>New</button>
                <button className="px-2 py-1 bg-white border rounded" onClick={()=> createNewPolicyFromCurrent(`${policy.meta?.name || 'Copy'}`)}>Duplicate</button>
                <button className="px-2 py-1 bg-red-50 text-red-600 border rounded" onClick={()=> deletePolicy(policy.meta?.id)}>Delete</button>
              </div>
            </div>
            <div className="mb-4">Tabs (use ← → Home End)</div>
            <div role="tablist" aria-label="Policy Tabs" onKeyDown={handleKeyDown} className="flex flex-col gap-2">
              {TABS.map((t, i) => (
                <TabButton key={t.id} id={t.id} label={t.label} active={activeTab} setActive={setActiveTab} index={i} focusableIndex={focusableIndex} setFocusableIndex={setFocusableIndex} />
              ))}
            </div>

            <div className="mt-6">
              <div className="text-xs text-gray-500 mb-2">Quick actions</div>
              <div className="flex flex-col gap-2">
                <button className="text-sm bg-white px-3 py-2 rounded shadow-sm text-left" onClick={handleAddPerDiem}>
                  <IconPlus /> Add PerDiem category
                </button>
                <button className="text-sm bg-white px-3 py-2 rounded shadow-sm text-left" onClick={handleAddWorkflow}>+ Add Workflow</button>
                <button className="text-sm bg-white px-3 py-2 rounded shadow-sm text-left" onClick={resetPolicy}>
                  Reset
                </button>
              </div>
            </div>
          </aside>

          <main className="col-span-6">
            {/* Panels */}
            <div className="space-y-6">
              {activeTab === "guidelines" && (
                <section className="bg-white rounded-lg p-6 shadow-sm transition-transform transform hover:-translate-y-0.5">
                  <h2 className="text-lg font-semibold mb-4">Travel Guidelines</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium">Booking Class</label>
                      <select className="w-full border rounded p-2" value={policy.bookingClass} onChange={(e) => setPolicy({ ...policy, bookingClass: e.target.value })}>
                        <option>Economy Only</option>
                        <option>Business Allowed</option>
                        <option>First Class Allowed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium">Budget Limit (USD)</label>
                      <input type="number" className="w-full border rounded p-2" value={policy.budgetLimit} onChange={(e) => setPolicy({ ...policy, budgetLimit: e.target.value })} />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium">Preferred Airlines (comma separated)</label>
                      <input className="w-full border rounded p-2" value={policy.preferredAirlines.join(",")} onChange={(e) => setPolicy({ ...policy, preferredAirlines: e.target.value.split(",").map(s=>s.trim()).filter(Boolean) })} />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium">Preferred Hotels (comma separated)</label>
                      <input className="w-full border rounded p-2" value={policy.preferredHotels.join(",")} onChange={(e) => setPolicy({ ...policy, preferredHotels: e.target.value.split(",").map(s=>s.trim()).filter(Boolean) })} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium">Department</label>
                      <input className="w-full border rounded p-2" value={policy.department || ''} onChange={(e)=> setPolicy({...policy, department: e.target.value})} placeholder="e.g. Sales, Engineering" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium">Region</label>
                      <input className="w-full border rounded p-2" value={policy.region || ''} onChange={(e)=> setPolicy({...policy, region: e.target.value})} placeholder="e.g. EMEA, APAC" />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium">Assigned Groups (comma separated)</label>
                      <input className="w-full border rounded p-2" value={(policy.assignedGroups||[]).join(',')} onChange={(e)=> setPolicy({...policy, assignedGroups: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} placeholder="e.g. Engineers, Sales Team" />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium">Cost Centers (comma separated)</label>
                      <input className="w-full border rounded p-2" value={(policy.costCenters||[]).join(',')} onChange={(e)=> setPolicy({...policy, costCenters: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} placeholder="e.g. CC1001, CC2002" />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium">Risk approval rule</label>
                      <div className="flex gap-2 items-center mt-2">
                        <label className="flex items-center gap-2"><input type="radio" name="risk-mode" checked={(policy.riskApproval?.mode || 'manual') === 'manual'} onChange={()=> setPolicy(p=>({...p, riskApproval:{...p.riskApproval, mode:'manual'}}))} /> Manual</label>
                        <label className="flex items-center gap-2"><input type="radio" name="risk-mode" checked={(policy.riskApproval?.mode || '') === 'auto'} onChange={()=> setPolicy(p=>({...p, riskApproval:{...p.riskApproval, mode:'auto'}}))} /> Auto</label>
                        <input className="border rounded p-2 ml-2" style={{width:120}} placeholder="Auto threshold" value={policy.riskApproval?.autoThreshold || ''} onChange={(e)=> setPolicy(p=>({...p, riskApproval:{...p.riskApproval, autoThreshold: e.target.value}}))} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium">Advance Booking Rule (days)</label>
                      <input type="number" className="w-full border rounded p-2" value={policy.advanceBookingDays} onChange={(e) => setPolicy({ ...policy, advanceBookingDays: Number(e.target.value) })} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium">Policy name</label>
                      <input className="w-full border rounded p-2" value={policy.meta?.name || ""} onChange={(e) => setPolicy({ ...policy, meta: { ...(policy.meta||{}), name: e.target.value } })} />
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "safety" && (
                <section className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4">Safety Rules</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={policy.mandatoryInsurance} onChange={(e) => setPolicy({ ...policy, mandatoryInsurance: e.target.checked })} />
                      <span>Mandatory Insurance</span>
                    </label>

                    <div>
                      <label className="block text-sm font-medium">High-risk Destinations (comma separated)</label>
                      <input className="w-full border rounded p-2" value={policy.highRiskDestinations.join(",")} onChange={(e) => setPolicy({ ...policy, highRiskDestinations: e.target.value.split(",").map(s=>s.trim()).filter(Boolean) })} />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium">Emergency Contacts</label>
                      <textarea className="w-full border rounded p-2" rows={3} value={policy.emergencyContacts} onChange={(e) => setPolicy({ ...policy, emergencyContacts: e.target.value })} />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium">Travel Advisories Feed URL</label>
                      <input className="w-full border rounded p-2" value={policy.advisoriesUrl} onChange={(e) => setPolicy({ ...policy, advisoriesUrl: e.target.value })} />
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "workflow" && (
                <section className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4">Approval Workflows</h2>
                  <div className="space-y-3">
                    {policy.approvalWorkflows.map((wf) => (
                      <div key={wf.id} className="p-3 border rounded flex items-center justify-between">
                        <div>
                          <div className="font-medium">{wf.name}</div>
                          <div className="text-xs text-gray-500">Steps: {wf.steps.join(' → ')}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => {
                            const name = prompt('Rename workflow', wf.name);
                            if (name) setPolicy(p=>({ ...p, approvalWorkflows: p.approvalWorkflows.map(x=> x.id===wf.id?{...x,name}:x) }));
                          }} className="text-sm px-3 py-1 bg-gray-100 rounded">Rename</button>
                          <button onClick={() => setPolicy(p=>({ ...p, approvalWorkflows: p.approvalWorkflows.filter(x=>x.id!==wf.id) }))} className="text-sm px-3 py-1 bg-red-50 text-red-600 rounded">Delete</button>
                        </div>
                      </div>
                    ))}

                    <div className="flex gap-2">
                      <input id="new-wf" placeholder="New workflow name" className="border rounded p-2 flex-1" />
                      <button onClick={() => { const el = document.getElementById('new-wf'); if(el && el.value.trim()) addWorkflow(el.value.trim()); if(el) el.value=''; }} className="px-3 py-2 bg-purple-700 text-white rounded">Add</button>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "notifications" && (
                <section className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4">Notifications</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={policy.notificationChannels.email} onChange={(e)=> setPolicy({...policy, notificationChannels: {...policy.notificationChannels, email: e.target.checked}})} />
                      <span>Email</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={policy.notificationChannels.sms} onChange={(e)=> setPolicy({...policy, notificationChannels: {...policy.notificationChannels, sms: e.target.checked}})} />
                      <span>SMS</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={policy.notificationChannels.slack} onChange={(e)=> setPolicy({...policy, notificationChannels: {...policy.notificationChannels, slack: e.target.checked}})} />
                      <span>Slack</span>
                    </label>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium">Notification Emails</label>
                      <input className="w-full border rounded p-2" value={policy.notificationEmails} onChange={(e)=> setPolicy({...policy, notificationEmails: e.target.value})} placeholder="comma separated" />
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "expenses" && (
                <section className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4">Expense Categories & Limits</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.keys(policy.expenseLimits).map((k)=> (
                      <div key={k} className="p-3 border rounded">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{k}</div>
                          <button className="text-xs text-red-600" onClick={()=> removeExpenseCategory(k)}>Remove</button>
                        </div>
                        <input className="w-full border rounded mt-2 p-2" value={policy.expenseLimits[k]} onChange={(e)=> setPolicy(p=> ({ ...p, expenseLimits: {...p.expenseLimits, [k]: e.target.value} }))} placeholder="$" />
                      </div>
                    ))}

                    <div className="col-span-3 flex gap-2">
                      <input id="new-exp" placeholder="New category name" className="border rounded p-2 flex-1" />
                      <button onClick={()=>{ const el=document.getElementById('new-exp'); if(el && el.value.trim()) { addExpenseCategory(el.value.trim()); el.value=''; } }} className="px-3 py-2 bg-purple-700 text-white rounded">Add</button>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "roles" && (
                <section className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4">Role-Based Access</h2>
                  <div className="space-y-3">
                    {policy.roles.map((r, idx)=> (
                      <div key={idx} className="p-3 border rounded flex items-center justify-between">
                        <div>
                          <div className="font-medium">{r.role}</div>
                          <div className="text-xs text-gray-500">Permissions: {r.permissions.join(', ')}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={()=> { const name=prompt('Role name', r.role); if(name) setPolicy(p=>({ ...p, roles: p.roles.map((x,i)=> i===idx?{...x,role:name}:x) })); }} className="text-sm px-3 py-1 bg-gray-100 rounded">Edit</button>
                          <button onClick={()=> setPolicy(p=> ({ ...p, roles: p.roles.filter((_,i)=> i!==idx) }))} className="text-sm px-3 py-1 bg-red-50 text-red-600 rounded">Remove</button>
                        </div>
                      </div>
                    ))}

                    <div className="flex gap-2">
                      <input id="new-role" placeholder="Role name" className="border rounded p-2 flex-1" />
                      <button onClick={()=>{ const el=document.getElementById('new-role'); if(el && el.value.trim()) { setPolicy(p=> ({ ...p, roles: [...p.roles, { role: el.value.trim(), permissions: ['view'] }] })); el.value=''; pushAudit(`Added role ${el.value.trim()}`); } }} className="px-3 py-2 bg-purple-700 text-white rounded">Add Role</button>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "audit" && (
                <section className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4">Audit & Versioning</h2>
                  <div className="space-y-3">
                    <div className="text-sm text-gray-500">Most recent changes (click rollback to simulate)</div>
                    <ul className="space-y-2">
                      {policy.auditLog.map((a, i)=> (
                        <li key={i} className="p-3 border rounded flex items-center justify-between">
                          <div>
                            <div className="text-xs text-gray-500">{new Date(a.ts).toLocaleString()}</div>
                            <div className="font-medium">{a.msg}</div>
                            <div className="text-xs text-gray-500">by {a.user}</div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={()=> rollbackAudit(i)} className="text-sm px-3 py-1 bg-yellow-50 text-yellow-700 rounded">Rollback</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              {activeTab === "templates" && (
                <section className="bg-white rounded-lg p-6 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4">Templates</h2>
                  <div className="grid grid-cols-3 gap-4">
                    {templateExamples.map((tpl)=> (
                      <div key={tpl.meta.name} className="p-4 border rounded hover:shadow cursor-pointer">
                        <div className="font-medium">{tpl.meta.name}</div>
                        <div className="text-xs text-gray-500">Budget ${tpl.budgetLimit || 'n/a'}</div>
                        <div className="mt-3 flex gap-2">
                          <button onClick={()=> loadTemplate(tpl)} className="px-3 py-1 bg-purple-700 text-white rounded">Load</button>
                          <button onClick={()=> openTemplatePreview(tpl)} className="px-3 py-1 bg-gray-100 rounded">Preview</button>
                        </div>
                      </div>
                    ))}

                    <div className="p-4 border rounded col-span-3">
                      <div className="flex gap-2">
                        <input id="new-tpl-name" className="border rounded p-2 flex-1" placeholder="Template name" />
                        <button onClick={()=> { const el=document.getElementById('new-tpl-name'); if(el && el.value.trim()) { const tpl={ ...policy, meta:{ ...(policy.meta||{}), name: el.value.trim() } }; setPolicy(p=> ({ ...p, templates: [...(p.templates||[]), tpl] })); pushAudit(`Saved template ${el.value.trim()}`); el.value=''; } }} className="px-3 py-2 bg-green-600 text-white rounded">Save as Template</button>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </main>

          <aside className="col-span-3">
            <div className="bg-gray-50 p-4 rounded-lg sticky top-6 shadow-sm">
              <h3 className="font-medium">Live Preview</h3>
              <div className="text-xs text-gray-500 mb-2">Preview of selected settings</div>
              <div className="bg-white p-3 rounded border max-h-64 overflow-auto text-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-gray-500">Policy</div>
                    <div className="font-medium text-sm">{policy.meta?.name || 'Untitled'}</div>

                    <div className="mt-2 flex gap-2 items-center">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">{policy.bookingClass}</span>
                      {policy.budgetLimit ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Budget ${policy.budgetLimit}</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">No budget set</span>
                      )}
                      {policy.highRiskDestinations && policy.highRiskDestinations.length > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">High risk: {policy.highRiskDestinations.join(', ')}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 text-right">
                    <div>Updated</div>
                    <div className="font-mono text-[11px]">{policy.meta?.updated ? new Date(policy.meta.updated).toLocaleString() : ''}</div>
                  </div>
                </div>

                <hr className="my-2" />

                <div className="text-sm">
                  <div className="text-xs text-gray-500">Approvals</div>
                  <ul className="mt-1 space-y-1">
                    {policy.approvalWorkflows.map((wf) => (
                      <li key={wf.id} className="text-sm">
                        <span className="font-medium">{wf.name}</span>
                        <span className="text-xs text-gray-500"> &nbsp;({wf.steps.join(' → ')})</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-2 text-xs text-gray-500">Notifications</div>
                  <div className="flex gap-2 mt-1">
                    {policy.notificationChannels.email && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Email</span>}
                    {policy.notificationChannels.sms && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">SMS</span>}
                    {policy.notificationChannels.slack && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Slack</span>}
                    {!policy.notificationChannels.email && !policy.notificationChannels.sms && !policy.notificationChannels.slack && (
                      <span className="text-xs text-gray-500">No channels</span>
                    )}
                  </div>

                  <div className="mt-3 text-xs text-gray-500">Expense limits</div>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {Object.keys(policy.expenseLimits).map((k) => (
                      <div key={k} className="text-sm">
                        <div className="text-xs text-gray-500">{k}</div>
                        <div className="font-medium">{policy.expenseLimits[k] || '—'}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 text-xs text-gray-500">Roles</div>
                  <div className="mt-1 flex gap-2 flex-wrap">
                    {policy.roles.map((r, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 rounded text-xs">{r.role}</span>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-gray-500">Assignments</div>
                  <div className="mt-2 text-sm">
                    <div className="text-xs text-gray-400">Assigned Groups</div>
                    <div className="mt-1 flex gap-2 flex-wrap">
                      {(policy.assignedGroups||[]).map((g,i) => (
                        <span key={i} className="px-2 py-1 bg-white border rounded text-xs flex items-center gap-2">{g} <button onClick={()=> setPolicy(p=> ({ ...p, assignedGroups: p.assignedGroups.filter(x=> x!==g) }))} className="text-red-500 text-[10px]">×</button></span>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input id="add-group" className="border rounded p-2 flex-1 text-sm" placeholder="Add group" />
                      <button onClick={()=>{ const el=document.getElementById('add-group'); if(el && el.value.trim()){ setPolicy(p=> ({ ...p, assignedGroups: [...(p.assignedGroups||[]), el.value.trim()] })); el.value=''; } }} className="px-3 py-2 bg-white border rounded text-sm">Add</button>
                    </div>

                    <div className="mt-3 text-xs text-gray-400">Cost Centers</div>
                    <div className="mt-1 flex gap-2 flex-wrap">
                      {(policy.costCenters||[]).map((c,i) => (
                        <span key={i} className="px-2 py-1 bg-white border rounded text-xs flex items-center gap-2">{c} <button onClick={()=> setPolicy(p=> ({ ...p, costCenters: p.costCenters.filter(x=> x!==c) }))} className="text-red-500 text-[10px]">×</button></span>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input id="add-cc" className="border rounded p-2 flex-1 text-sm" placeholder="Add cost center" />
                      <button onClick={()=>{ const el=document.getElementById('add-cc'); if(el && el.value.trim()){ setPolicy(p=> ({ ...p, costCenters: [...(p.costCenters||[]), el.value.trim()] })); el.value=''; } }} className="px-3 py-2 bg-white border rounded text-sm">Add</button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      try {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(JSON.stringify(policy, null, 2));
                        } else {
                          const ta = document.createElement('textarea');
                          ta.value = JSON.stringify(policy, null, 2);
                          document.body.appendChild(ta);
                          ta.select();
                          document.execCommand('copy');
                          document.body.removeChild(ta);
                        }
                        alert('Policy preview JSON copied to clipboard');
                      } catch (e) { alert('Copy failed'); }
                    }}
                    className="flex-1 px-3 py-2 bg-white border rounded text-sm"
                  >
                    Copy JSON
                  </button>

                  <button onClick={() => exportPolicy()} className="px-3 py-2 bg-white border rounded text-sm">Export</button>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs text-gray-500 mb-1">Export / Import</div>
                <div className="flex gap-2">
                  <button onClick={exportPolicy} className="flex-1 px-3 py-2 bg-white border rounded">Export JSON</button>
                  <label className="flex-1 px-3 py-2 bg-white border rounded text-center cursor-pointer">
                    Import
                    <input className="hidden" type="file" accept="application/json" onChange={(e)=> e.target.files && importPolicy(e.target.files[0])} />
                  </label>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 mb-1">Versions</div>
                  <div>
                    <button onClick={()=>{
                      // save current as a version
                      try{
                        const copy = JSON.parse(JSON.stringify(policy));
                        copy.snapshotAt = new Date().toISOString();
                        copy.meta = { ...(copy.meta||{}), name: copy.meta?.name || 'policy' };
                        const updated = { ...policy, versions: [copy, ...(policy.versions||[])] };
                        setPolicy(updated);
                        pushAudit('Saved manual version');
                        // also update policies list storage
                        setPolicies(prev => { const next = prev.map(p => p.meta?.id === updated.meta?.id ? updated : p); try{ localStorage.setItem(POLICIES_KEY, JSON.stringify(next)); }catch{}; return next; });
                        alert('Version saved');
                      }catch(e){ console.warn(e); }
                    }} className="px-2 py-1 bg-white border rounded text-xs">Save version</button>
                  </div>
                </div>

                <div className="max-h-44 overflow-auto bg-white border rounded p-2">
                  { (policy.versions || []).length === 0 && <div className="text-xs text-gray-500">No saved versions</div> }
                  { (policy.versions || []).map((v, i) => (
                    <div key={v.snapshotAt || i} className="flex items-center justify-between p-2 border-b text-xs">
                      <div>
                        <div className="font-medium">{v.meta?.name || policy.meta?.name} <span className="text-gray-400">#{i+1}</span></div>
                        <div className="text-gray-500">{new Date(v.snapshotAt).toLocaleString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>{
                          if(!confirm('Revert to this version? This will overwrite the current editor state.')) return;
                          setPolicy(JSON.parse(JSON.stringify(v)));
                          pushAudit(`Reverted to version ${v.snapshotAt}`);
                        }} className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded text-xs">Revert</button>

                        <button onClick={()=> exportPolicyObject(v)} className="px-2 py-1 bg-white border rounded text-xs">Export</button>

                        <button onClick={()=>{
                          if(!confirm('Delete this version?')) return;
                          setPolicy(p=> ({ ...p, versions: (p.versions||[]).filter((_,idx)=> idx!==i) }));
                          pushAudit('Deleted version');
                        }} className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* diff/compare area */}
                <div className="mt-2 text-xs text-gray-500">Compare a version to current</div>
                <div className="flex gap-2 mt-2">
                  <select id="version-compare-select" className="flex-1 border rounded p-2 text-sm">
                    <option value="">Select version...</option>
                    { (policy.versions||[]).map((v, i) => (<option key={i} value={i}>{new Date(v.snapshotAt).toLocaleString()}</option>)) }
                  </select>
          <button onClick={()=>{
            const sel = document.getElementById('version-compare-select');
            if(!sel || !sel.value) { alert('Choose a version to compare'); return; }
            const idx = Number(sel.value);
            const v = (policy.versions||[])[idx];
            if(!v) { alert('Version not found'); return; }
            const diffs = computeDiff(v, policy);
            setDiffsForModal(diffs);
            setDiffModalOpen(true);
          }} className="px-3 py-2 bg-white border rounded text-sm">Compare</button>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs text-gray-500 mb-1">Shortcuts</div>
                <div className="flex flex-col gap-2">
                  <button onClick={()=> { setActiveTab('audit'); setFocusableIndex(5);}} className="px-3 py-2 bg-white border rounded text-left">Open Audit</button>
                  <button onClick={()=> { setActiveTab('templates'); setFocusableIndex(6);}} className="px-3 py-2 bg-white border rounded text-left">Open Templates</button>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-400">Version: 1.0 — local demo (no server).</div>
          </aside>
        </div>
      </div>
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Template preview — {previewTemplate.meta?.name || 'Template'}</h3>
                <div className="text-xs text-gray-500">Preview of template before loading</div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=> { exportObjectAsJSON(previewTemplate, `${previewTemplate.meta?.name || 'template'}.json`); }} className="px-3 py-1 bg-white border rounded">Export</button>
                <button onClick={()=> { try{ navigator.clipboard.writeText(JSON.stringify(previewTemplate, null, 2)); alert('Template JSON copied'); }catch(e){ alert('Copy failed'); } }} className="px-3 py-1 bg-white border rounded">Copy JSON</button>
                <button onClick={()=> { loadTemplate(previewTemplate); closeTemplatePreview(); }} className="px-3 py-1 bg-purple-700 text-white rounded">Load</button>
                <button onClick={closeTemplatePreview} className="px-3 py-1 bg-gray-100 rounded">Close</button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Metadata</div>
                <div className="p-3 bg-gray-50 rounded mt-1 text-sm font-mono max-h-56 overflow-auto">{JSON.stringify(previewTemplate.meta || {}, null, 2)}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Summary</div>
                <div className="p-3 bg-gray-50 rounded mt-1 text-sm max-h-56 overflow-auto">
                  <div><strong>Booking class:</strong> {previewTemplate.bookingClass}</div>
                  <div><strong>Budget:</strong> {previewTemplate.budgetLimit || '—'}</div>
                  <div className="mt-2"><strong>Notifications:</strong> {Object.keys(previewTemplate.notificationChannels || {}).filter(k=> previewTemplate.notificationChannels[k]).join(', ') || 'None'}</div>
                  <div className="mt-2"><strong>Workflows:</strong>
                    <ul className="mt-1 ml-4 list-disc text-sm">
                      {(previewTemplate.approvalWorkflows || []).map(wf => (<li key={wf.id}>{wf.name} — {wf.steps.join(' → ')}</li>))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <VersionDiffModal open={diffModalOpen} onClose={()=> setDiffModalOpen(false)} diffs={diffsForModal} title="Version Compare" />
    </div>
  );
}
