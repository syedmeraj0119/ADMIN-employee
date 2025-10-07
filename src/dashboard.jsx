import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from './theme-toggle';
import GlobalMap from './components/GlobalMap';
import RiskFeed from './components/RiskFeed';
import WidgetManager from './components/WidgetManager';

// TravelDashboard.jsx - cleaned and fixed structure

const summary = {
  airfare: 5863.52,
  hotels: 5772.44,
  cars: 2952.27,
  total: 12586.21,
  trips: 44,
  travelers: 7,
  destinations: 26,
  avgPlanBook: '12h 21m',
  avgApproval: 'N/A',
};

const reasonsData = [
  { name: 'Client Visit', value: 35 },
  { name: 'No Reason', value: 20 },
  { name: 'Company office visit', value: 15 },
  { name: 'Internal event', value: 8 },
  { name: 'Conference', value: 7 },
  { name: 'Deployment', value: 6 },
  { name: 'Team bonding', value: 4 },
  { name: 'Other', value: 3 },
  { name: 'Professional', value: 2 },
];

const COLORS = ['#2d0636', '#5a2d64', '#8a417f', '#b46ca6', '#c79ac1', '#e1cbe0', '#f3e9f4', '#efe6f0', '#efe9f7'];

export default function TravelDashboard() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [chartCard, setChartCard] = useState(null);
  const [visibleWidgets, setVisibleWidgets] = useState(() => {
    try{ const raw = localStorage.getItem('dashboard_widgets'); if(raw) return JSON.parse(raw); }catch{};
    return ['tripFrequency','topDestinations','riskFeed'];
  });
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('currentUser')) || { name: 'Admin Name', email: 'admin@example.com' } } catch { return { name: 'Admin Name', email: 'admin@example.com' } }
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const [roleLocal, setRoleLocal] = useState(() => localStorage.getItem('currentRole') || 'employee');
  const location = useLocation();

  useEffect(()=>{
    function onStorage(e){
      if(e.key === 'currentUser'){
        try{ setUser(JSON.parse(e.newValue)) }catch{ }
      }
      if(e.key === 'currentRole'){
        try{ setRoleLocal(e.newValue || 'employee') }catch{}
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    function onClick(e){
      if(profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  function updateRole(r){
    localStorage.setItem('currentRole', r);
    setRoleLocal(r);
    // notify other components in the same window
    window.dispatchEvent(new CustomEvent('role-updated', { detail: r }));
  }

  function doLogout(){
    localStorage.removeItem('currentRole');
    localStorage.removeItem('currentUser');
    setUser({ name: 'Guest', email: '' });
    setRoleLocal('employee');
    window.dispatchEvent(new Event('logout'));
    navigate('/');
  }

  function isActive(path) {
    return location && location.pathname === path;
  }

  function go(path, opts) {
    if (opts) navigate(path, opts);
    else navigate(path);
  }

  function toggleExpand(id){
    setExpandedCard((s) => s === id ? null : id);
  }

  function openChartCard({ title = 'Details', item = {}, index = 0, dataset = [], colors = [] } = {}){
    const total = (dataset || []).reduce((s, it) => s + (it.value || 0), 0) || 1;
    const pct = Math.round(((item.value || 0) / total) * 100);
    setChartCard({ title, name: item.name || item.label || 'Item', value: item.value || 0, pct, color: colors[index % colors.length] || 'var(--accent)' });
  }

  function closeChartCard(){ setChartCard(null); }

  useEffect(() => {
    function onKey(e){ if(e.key === 'Escape') closeChartCard(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen app-root p-8 font-sans text-gray-800">
      {chartCard && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/40" onClick={closeChartCard} />
          <div className="bg-white rounded-lg p-6 shadow-xl z-50 w-[min(720px,95%)]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{chartCard.title}</h3>
                <div className="text-sm text-muted mt-1">{chartCard.name}</div>
              </div>
              <div>
                <button className="px-3 py-1 border rounded" onClick={closeChartCard} aria-label="Close">Close</button>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div style={{width:64, height:64, borderRadius:8, background:chartCard.color}} />
              <div>
                <div className="text-2xl font-bold">{chartCard.value}</div>
                <div className="text-sm text-muted">{chartCard.pct}% of total</div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-6 max-w-[1400px] mx-auto">
  <aside className={`sidebar ${collapsed ? 'collapsed' : ''} sticky top-8 self-start`}>
          <div className="admin-profile p-3 flex items-center justify-between" ref={profileRef}>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-700 text-white w-10 h-10 flex items-center justify-center">{(user && user.name) ? user.name.charAt(0).toUpperCase() : 'A'}</div>
              <div className="admin-info">
                <div className="admin-name font-semibold" data-fullname={user?.name || 'Admin Name'}>{user?.name || 'Admin Name'}</div>
                <div className="admin-role text-xs text-muted">Administrator</div>
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <button className="toggle-btn" aria-haspopup="true" aria-expanded={profileOpen} onClick={() => setProfileOpen((s) => !s)} aria-label="Open profile menu" title="Profile">⋯</button>

              {profileOpen && (
                <div className="profile-menu" role="menu" aria-label="Profile menu">
                  <div className="profile-menu-header">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.name || 'User avatar'} className="profile-avatar" />
                    ) : (
                      <div className="profile-avatar initials">{(user && user.name) ? user.name.charAt(0).toUpperCase() : 'A'}</div>
                    )}
                    <div style={{marginLeft:10}}>
                      <div className="font-semibold" style={{color:'var(--card-text)'}}>{user?.name || 'Admin Name'}</div>
                      <div className="text-xs text-muted">{user?.email || 'admin@example.com'}</div>
                    </div>
                  </div>

                  <div className="profile-menu-divider" />

                  <button type="button" className="profile-menu-item" onClick={() => { setProfileOpen(false); go('/policy'); }}>Profile</button>
                  <button type="button" className="profile-menu-item" onClick={() => { setProfileOpen(false); go('/reports'); }}>Settings</button>
                  <div className="profile-menu-divider" />
                  <div className="profile-menu-item">
                    <label className="text-xs text-muted" style={{display:'block', marginBottom:6}}>Switch role</label>
                    <select value={roleLocal} onChange={e => updateRole(e.target.value)} className="px-2 py-1 border rounded">
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="finance">Finance</option>
                    </select>
                  </div>
                  <div className="profile-menu-divider" />
                  <button type="button" className="profile-menu-item profile-logout" onClick={() => { doLogout(); }}>Logout</button>
                </div>
              )}
            </div>
          </div>

          <div className="sidebar-top p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gray-900 text-white w-8 h-8 flex items-center justify-center">TD</div>
              <div className="nav-label">Travel</div>
            </div>
            <button className="toggle-btn" onClick={() => setCollapsed((s) => !s)} aria-label="Toggle sidebar">☰</button>
          </div>

          <nav className="nav p-3">
            <button title="Dashboard" aria-current={isActive('/') ? 'page' : undefined} className={`nav-button ${isActive('/') ? 'nav-active' : ''}`} onClick={() => go('/')} type="button">
              <span className="nav-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 11.5L12 4l9 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 21V12h14v9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="nav-label">Dashboard</span>
            </button>
            <button title="Policy" aria-current={isActive('/policy') ? 'page' : undefined} className={`nav-button ${isActive('/policy') ? 'nav-active' : ''}`} onClick={() => go('/policy', { state: { fromDashboard: true } }) } type="button">
              <span className="nav-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 7h10v10H7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="nav-label">Policy</span>
            </button>
            <button title="Trips" aria-current={isActive('/trips') ? 'page' : undefined} className={`nav-button ${isActive('/trips') ? 'nav-active' : ''}`} onClick={() => go('/trips')} type="button">
              <span className="nav-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 7h18v10H3z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 3v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 3v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="nav-label">Trips</span>
            </button>
            <button title="Reports" aria-current={isActive('/reports') ? 'page' : undefined} className={`nav-button ${isActive('/reports') ? 'nav-active' : ''}`} onClick={() => go('/reports')} type="button">
              <span className="nav-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 3h18v4H3z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 11h18v10H3z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="nav-label">Reports</span>
            </button>

            <button title="Documents" aria-current={isActive('/documents') ? 'page' : undefined} className={`nav-button ${isActive('/documents') ? 'nav-active' : ''}`} onClick={() => go('/documents')} type="button">
              <span className="nav-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 3h10v4H7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 7v10a2 2 0 002 2h10a2 2 0 002-2V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="nav-label">Documents</span>
            </button>

            <button title="Risk" aria-current={isActive('/risk') ? 'page' : undefined} className={`nav-button ${isActive('/risk') ? 'nav-active' : ''}`} onClick={() => go('/risk')} type="button">
              <span className="nav-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 22h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7 12l5-7 5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="nav-label">Risk</span>
            </button>

            <button title="Expense" aria-current={isActive('/expense') ? 'page' : undefined} className={`nav-button ${isActive('/expense') ? 'nav-active' : ''}`} onClick={() => go('/expense')} type="button">
              <span className="nav-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8v8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 12h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="nav-label">Expense</span>
            </button>

            <button title="Analytics" aria-current={isActive('/analytics') ? 'page' : undefined} className={`nav-button ${isActive('/analytics') ? 'nav-active' : ''}`} onClick={() => go('/analytics')} type="button">
              <span className="nav-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 14V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 14v-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 14v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="nav-label">Analytics</span>
            </button>
          </nav>
        </aside>

        <main className="flex-1">
          <div className="max-w-[1160px] mx-auto bg-white/80 rounded-2xl p-6 shadow-lg border border-gray-100">
            <header className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-serif text-slate-800">Travel dashboard </h1>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted">Theme</label>
                <ThemeToggle />
              </div>
            </header>

            {/* Top summary row (airfare + hotels + cars = total) */}
            <section className="flex items-center gap-4 mb-6">
              <div className="flex-1 bg-white rounded-lg border p-5 flex flex-col items-center">
                <div className="rounded-full bg-slate-900 text-white w-12 h-12 flex items-center justify-center mb-3">✈️</div>
                <div className="text-2xl font-semibold">${summary.airfare.toLocaleString()}</div>
                <div className="text-sm text-gray-500 mt-1">Total airfare</div>
              </div>

              <div className="text-2xl text-slate-600 font-semibold">+</div>

              <div className="flex-1 bg-white rounded-lg border p-5 flex flex-col items-center">
                <div className="rounded-full bg-slate-900 text-white w-12 h-12 flex items-center justify-center mb-3">🏨</div>
                <div className="text-2xl font-semibold">${summary.hotels.toLocaleString()}</div>
                <div className="text-sm text-gray-500 mt-1">Total hotels</div>
              </div>

              <div className="text-2xl text-slate-600 font-semibold">+</div>

              <div className="flex-1 bg-white rounded-lg border p-5 flex flex-col items-center">
                <div className="rounded-full bg-slate-900 text-white w-12 h-12 flex items-center justify-center mb-3">🚗</div>
                <div className="text-2xl font-semibold">${summary.cars.toLocaleString()}</div>
                <div className="text-sm text-gray-500 mt-1">Total cars</div>
              </div>

              <div className="text-2xl text-slate-600 font-semibold">=</div>

              <div className="flex-1 bg-white rounded-lg border p-5 flex flex-col items-center">
                <div className="rounded-full bg-slate-900 text-white w-12 h-12 flex items-center justify-center mb-3">💰</div>
                <div className="text-2xl font-semibold">${summary.total.toLocaleString()}</div>
                <div className="text-sm text-gray-500 mt-1">Total spend</div>
              </div>
            </section>

            {/* KPI row */}
            <section className="grid grid-cols-5 gap-4 mb-6">
              <div className="col-span-1 bg-white p-4 rounded-lg border flex flex-col items-center">
                <div className="text-2xl font-bold">{summary.trips}</div>
                <div className="text-sm text-gray-500">Trips</div>
              </div>
              <div className="col-span-1 bg-white p-4 rounded-lg border flex flex-col items-center">
                <div className="text-2xl font-bold">{summary.travelers}</div>
                <div className="text-sm text-gray-500">Travelers</div>
              </div>
              <div className="col-span-1 bg-white p-4 rounded-lg border flex flex-col items-center">
                <div className="text-2xl font-bold">{summary.destinations}</div>
                <div className="text-sm text-gray-500">Destinations</div>
              </div>
              <div className="col-span-1 bg-white p-4 rounded-lg border flex flex-col items-center">
                <div className="text-2xl font-bold">{summary.avgPlanBook}</div>
                <div className="text-sm text-gray-500">Avg. plan - book</div>
              </div>
              <div className="col-span-1 bg-white p-4 rounded-lg border flex flex-col items-center">
                <div className="text-2xl font-bold">{summary.avgApproval}</div>
                <div className="text-sm text-gray-500">Avg. time do approval</div>
              </div>
            </section>

            {/* Main content */}
            <section className="grid grid-cols-12 gap-6">
              <div className="col-span-7 bg-white rounded-lg border p-6">
                <h3 className="font-semibold text-lg mb-4 inline-block bg-white/60 px-3 py-1 rounded-full border">Corporate reasons for travelling</h3>
                <div className="flex items-center gap-6">
                  <div style={{ width: 320, height: 320 }}>
                    <DynamicPieChart data={reasonsData} colors={COLORS} onSliceClick={(item, i) => { setSelectedReason(item.name); openChartCard({ title: 'Reason details', item, index: i, dataset: reasonsData, colors: COLORS }); }} />
                    {selectedReason && (
                      <div className="mt-2 text-sm text-slate-600">
                        Filter: <strong>{selectedReason}</strong> <button className="px-2 py-0.5 ml-3 rounded border text-xs" onClick={() => setSelectedReason(null)}>Clear</button>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <ul className="space-y-2 text-sm text-slate-600">
                      {reasonsData.map((r, i) => (
                        <li key={r.name} className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                            <span>{r.name}</span>
                          </div>
                          <div className="font-semibold">{r.value}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="col-span-5 bg-white rounded-lg border p-6">
                <div className="space-y-6">
                  <div
                    className="bg-gradient-to-r from-purple-700 to-purple-600 text-white rounded-lg p-4 flex items-center justify-between kpi-card-clickable"
                    onClick={() => toggleExpand('flights') }
                    role="button"
                    tabIndex={0}
                  >
                    <div>
                      <div className="text-xs uppercase opacity-90">Flights</div>
                      <div className="text-2xl font-bold">21</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">17,499.38</div>
                      <div className="text-xs text-white/80 mt-1">29.14% Business | 72.89% Economy</div>
                    </div>
                  </div>
                  {expandedCard === 'flights' && (
                    <div className="p-3 bg-white border rounded text-sm text-slate-700">Flight details: 21 trips this month — click KPI to collapse.</div>
                  )}

                  <div className="bg-white rounded-lg border p-4 flex items-center justify-between kpi-card-clickable" onClick={() => toggleExpand('hotels')} role="button" tabIndex={0}>
                    <div>
                      <div className="text-xs uppercase text-slate-600">Hotels</div>
                      <div className="text-2xl font-bold">14</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">41 Nights</div>
                      <div className="text-xs text-slate-500 mt-1">Average rating:</div>
                      <div className="mt-1">⭐ ⭐ ⭐ ⭐</div>
                    </div>
                  </div>
                  {expandedCard === 'hotels' && (
                    <div className="p-3 bg-white border rounded text-sm text-slate-700">Hotel breakdown and nightly rates — demo details.</div>
                  )}

                  <div className="bg-white rounded-lg border p-4 flex items-center justify-between kpi-card-clickable" onClick={() => toggleExpand('cars')} role="button" tabIndex={0}>
                    <div>
                      <div className="text-xs uppercase text-slate-500">Cars</div>
                      <div className="text-2xl font-bold">8</div>
                    </div>
                    <div className="text-right text-slate-500">27 Days</div>
                  </div>
                  {expandedCard === 'cars' && (
                    <div className="p-3 bg-white border rounded text-sm text-slate-700">Car rentals summary and vendors.</div>
                  )}
                </div>
              </div>
            </section>

            {/* Faux 3D bar chart removed */}

          {/*}  <footer className="mt-6 text-center text-xs text-gray-400">This graph/chart is linked to excel, and changes automatically based on data. Just left click on it and select "Edit Data".</footer>

            {/* Reporting & Analytics Section */}
            <section className="mt-12 max-w-[1160px] mx-auto">
              <h2 className="text-2xl font-semibold mb-4">Reporting & Analytics</h2>
              <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-7 bg-white rounded-lg border p-6">
                    {visibleWidgets.includes('tripFrequency') && (
                      <>
                        <h3 className="font-semibold text-lg mb-2">Trip Frequency (last 6 months)</h3>
                        <TripFrequencyBarChart />
                      </>
                    )}
                  </div>

                  <div className="col-span-5 bg-white rounded-lg border p-6">
                    {visibleWidgets.includes('topDestinations') && (
                      <>
                        <h3 className="font-semibold text-lg mb-2">Top Destinations</h3>
                        <TopDestinationsChart data={[{label:'London', value:32},{label:'New York', value:28},{label:'Tokyo', value:24},{label:'Paris', value:19},{label:'Sydney', value:15}]} />
                      </>
                    )}
                  </div>
              </div>
            </section>

            {/* Extra row: map and risk feed + widget manager */}
            <section className="mt-8 grid grid-cols-12 gap-6">
              <div className="col-span-8">
                <div className="bg-white rounded-lg border p-6">
                  <GlobalMap locations={[
                    { id: 'lon', label: 'London', lat: 51.5074, lng: -0.1278, count: 27, color: '#7c3aed' },
                    { id: 'ny', label: 'New York', lat: 40.7128, lng: -74.0060, count: 24, color: '#06b6d4' },
                    { id: 'tok', label: 'Tokyo', lat: 35.6762, lng: 139.6503, count: 20, color: '#f59e0b' },
                    { id: 'par', label: 'Paris', lat: 48.8566, lng: 2.3522, count: 16, color: '#ef4444' },
                  ]} />
                </div>
              </div>

              <div className="col-span-4 space-y-4">
                <div className="bg-white rounded-lg border p-4">
                  <WidgetManager initial={visibleWidgets} onChange={(w) => setVisibleWidgets(w)} />
                </div>

                <div className="bg-white rounded-lg border p-4">
                  {visibleWidgets.includes('riskFeed') && <RiskFeed />}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

// Trip Frequency Bar Chart Component
function TripFrequencyBarChart() {
  const data = [
    { month: 'Apr', count: 12 },
    { month: 'May', count: 18 },
    { month: 'Jun', count: 22 },
    { month: 'Jul', count: 15 },
    { month: 'Aug', count: 27 },
    { month: 'Sep', count: 19 },
  ];
  const max = Math.max(...data.map(d => d.count));
  return (
    <div className="flex items-end gap-3 h-32 w-full">
      {data.map((d) => (
        <div key={d.month} className="flex flex-col items-center flex-1">
          <div className="w-7 rounded-t bg-purple-400" style={{ height: `${(d.count / max) * 100}%`, minHeight: 12 }}>
            <div className="sr-only">{d.count} trips</div>
          </div>
          <div className="text-xs text-gray-500 mt-1">{d.month}</div>
          <div className="text-xs font-semibold text-slate-700">{d.count}</div>
        </div>
      ))}
    </div>
  );
}

// DynamicPieChart and Faux3DBarChart helpers
function DynamicPieChart({ data = [], colors = [], onSliceClick, size = 320 }) {
  // size is the total svg size in px. radius and thickness scale with size.
  const radius = Math.max(24, Math.floor(size / 2 - 40));
  const thickness = Math.max(12, Math.floor(size * 0.12));
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const total = (data || []).reduce((s, d) => s + (d.value || 0), 0) || 1;

  const [hoverIndex, setHoverIndex] = React.useState(null);
  const [selectedIndex, setSelectedIndex] = React.useState(null);
  const [mounted, setMounted] = React.useState(false);
  const [tooltip, setTooltip] = React.useState({ visible: false, x: 0, y: 0, text: '' });
  const wrapRef = React.useRef(null);

  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  function onKeyDown(e) {
    if (!data || data.length === 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setHoverIndex((h) => (h === null ? 0 : (h + 1) % data.length));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setHoverIndex((h) => (h === null ? data.length - 1 : (h - 1 + data.length) % data.length));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (hoverIndex !== null) {
        setSelectedIndex(hoverIndex);
        onSliceClick && onSliceClick(data[hoverIndex].name);
      }
    }
  }

  let acc = 0;

  function handleMouseMove(e, d, i) {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setTooltip({ visible: true, x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12, text: `${d.name}: ${d.value} (${((d.value/total)*100).toFixed(1)}%)` });
  }

  function handleMouseLeave() {
    setTooltip({ visible: false, x: 0, y: 0, text: '' });
    setHoverIndex(null);
  }

  return (
    <div ref={wrapRef} className="pie-wrap" style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }} tabIndex={0} onKeyDown={onKeyDown} role="region" aria-label="Donut chart">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden={false}>
        <g style={{ transformOrigin: `${cx}px ${cy}px`, transition: 'transform 360ms cubic-bezier(.22,.9,.3,1)' }} transform={mounted ? undefined : `translate(${cx},${cy}) scale(0.92)`}>
          <g transform={`translate(${cx},${cy}) rotate(-90)`}> 
            {(data || []).map((d, i) => {
              const portion = (d.value || 0) / total;
              const dash = Math.max(0.0001, portion * circumference);
              const accBefore = acc;
              const dashArray = `${dash} ${circumference - dash}`;
              const dashOffset = -accBefore;
              acc += dash;
              const isHover = hoverIndex === i;
              const isSelected = selectedIndex === i;

              const startRatio = accBefore / circumference;
              const midRatio = startRatio + (dash / circumference) / 2;
              const midDeg = midRatio * 360 - 90;
              const rad = (midDeg * Math.PI) / 180;
              const explodePx = isHover ? 12 : isSelected ? 6 : 0;
              const dx = Math.cos(rad) * explodePx;
              const dy = Math.sin(rad) * explodePx;

              return (
                <g key={d.name || i} transform={`translate(${dx},${dy})`} style={{ transition: 'transform 180ms ease, opacity 220ms ease' }}>
                  <circle
                    r={radius}
                    fill="none"
                    stroke={colors[i % colors.length] || 'var(--accent)'}
                    strokeWidth={thickness}
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="butt"
                    onMouseEnter={(e) => { setHoverIndex(i); handleMouseMove(e, d, i); }}
                    onMouseMove={(e) => handleMouseMove(e, d, i)}
                    onMouseLeave={() => handleMouseLeave()}
                    onFocus={(e) => { setHoverIndex(i); const fake = { clientX: e.target.getBoundingClientRect().left + 8, clientY: e.target.getBoundingClientRect().top + 8 }; handleMouseMove(fake, d, i); }}
                    onBlur={() => handleMouseLeave()}
                    onClick={() => { setSelectedIndex(i); onSliceClick && onSliceClick(d, i); }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${d.name}: ${d.value}`}
                    style={{ cursor: 'pointer' }}
                  />
                </g>
              );
            })}
          </g>
        </g>

        <circle cx={cx} cy={cy} r={Math.max(6, radius - thickness / 2)} fill="var(--card)" stroke="rgba(0,0,0,0.04)" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={Math.max(10, Math.floor(size * 0.055))} fill="var(--card-text)" fontWeight={700}>{selectedIndex !== null ? data[selectedIndex].value : total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={Math.max(9, Math.floor(size * 0.035))} fill="var(--muted)">{selectedIndex !== null ? data[selectedIndex].name : 'Total'}</text>
      </svg>

      {tooltip.visible && (
        <div className="pie-tooltip" style={{ position: 'absolute', left: tooltip.x, top: tooltip.y, pointerEvents: 'none', background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 12, whiteSpace: 'nowrap' }}>{tooltip.text}</div>
      )}
    </div>
  );
}

function Faux3DBarChart({ data }){
  const max = Math.max(...data.map(d => d.value));
  return (
    <div className="faux-3d-chart" role="list" aria-label="Carbon by destination">
      {data.map((d, i) => {
        const height = `${(d.value / max) * 220}px`;
        return (
          <div key={d.label} className="f3d-bar-wrap" role="listitem" data-showtooltip={false}>
            <div
              className="f3d-bar"
              role="button"
              tabIndex={0}
              aria-label={`${d.label}: ${d.value} metric tons`}
              style={{height}}
            >
              <div className="f3d-bar-top" />
              <div className="f3d-bar-front">{d.value}</div>
            </div>
            <div className="f3d-tooltip" role="status" aria-live="polite">{d.label}: {d.value}</div>
            <div className="f3d-label">{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}

// Top Destinations horizontal bar chart (simple, accessible, static SVG)
function TopDestinationsChart({ data = [] }){
  // reuse DynamicPieChart for consistent look & interactions
  const colors = ['#7c3aed', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#c084fc', '#60a5fa'];
  const formatted = (data || []).map(d => ({ name: d.label, value: d.value }));

  return (
    <div className="flex items-start gap-4">
      <div className="flex-none">
        <DynamicPieChart data={formatted} colors={colors} size={160} />
      </div>
      <div className="flex-1 min-w-0">
        {(formatted || []).map((a, i) => {
          const total = formatted.reduce((s, it) => s + (it.value || 0), 0) || 1;
          const pct = Math.round(((a.value || 0) / total) * 100);
          return (
            <div key={a.name} className="flex items-center justify-between text-sm mb-3">
              <button onClick={() => openChartCard({ title: 'Destination details', item: a, index: i, dataset: formatted, colors })} className="flex items-center space-x-3 min-w-0 text-left" style={{background:'transparent', border:'none', padding:0}}>
                <span className="inline-block rounded-sm flex-shrink-0" style={{width:14, height:14, background: colors[i % colors.length]}} />
                <span className="truncate text-sm" style={{color:'var(--muted)'}}>{a.name}</span>
              </button>
              <div className="text-sm font-semibold ml-3" style={{color:'var(--card-text)'}}>{pct}%</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
