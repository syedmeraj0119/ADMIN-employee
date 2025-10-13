import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import CorporateDonut from './components/CorporateDonut';
import TimeSeriesChart from './components/TimeSeriesChart';
import TripDetailModal from './components/TripDetailModal';

// Utilities
function csvDownload(filename, rows) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
function jsonDownload(filename, obj){
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

// Mock data (same as before)
const MOCK_TRIPS = [
  { id: 't1', employee: 'Alice', dept: 'Sales', region: 'EMEA', destination: 'London', spend: 3200, date: '2025-09-10', status: 'Approved' },
  { id: 't2', employee: 'Bob', dept: 'Engineering', region: 'APAC', destination: 'Tokyo', spend: 4200, date: '2025-09-14', status: 'Pending' },
  { id: 't3', employee: 'Alice', dept: 'Sales', region: 'EMEA', destination: 'Paris', spend: 1200, date: '2025-08-04', status: 'Completed' },
  { id: 't4', employee: 'Carlos', dept: 'Finance', region: 'AMER', destination: 'New York', spend: 5400, date: '2025-07-22', status: 'Approved' },
  { id: 't5', employee: 'Dee', dept: 'Engineering', region: 'APAC', destination: 'Seoul', spend: 900, date: '2025-09-02', status: 'Approved' },
];
const MOCK_EXPENSES = [
  { id:'e1', tripId:'t1', category: 'Airline', vendor: 'Airways', amount: 1200 },
  { id:'e2', tripId:'t1', category: 'Hotel', vendor: 'Grand Inn', amount: 1500 },
  { id:'e3', tripId:'t2', category: 'Airline', vendor: 'NipponAir', amount: 2200 },
  { id:'e4', tripId:'t4', category: 'Hotel', vendor: 'NY Suites', amount: 3000 },
  { id:'e5', tripId:'t5', category: 'Car', vendor: 'RentMe', amount: 200 },
];
const MOCK_INCIDENTS = [
  { id:'i1', date:'2025-09-11', tripId:'t1', severity: 'Low', note: 'Missed connection, rebooked' },
  { id:'i2', date:'2025-09-14', tripId:'t2', severity: 'High', note: 'Medical evacuation' },
];

const COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#ef4444', '#10b981'];

function fmtMoney(n){ return `$${Number(n||0).toLocaleString()}` }

export default function Analytics(){
  const navigate = useNavigate();
  const [collapsedSections, setCollapsedSections] = useState({});
  const [announce, setAnnounce] = useState('');
  const [trips] = useState(MOCK_TRIPS);
  const [expenses, setExpenses] = useState(() => {
    try{ const raw = localStorage.getItem('td_expenses'); if(raw) return JSON.parse(raw); }catch{}; return MOCK_EXPENSES;
  });

  // keep expenses in sync with localStorage (simple polling + storage event)
  useEffect(()=>{
    function onStorage(e){ if(e.key === 'td_expenses'){ try{ setExpenses(JSON.parse(e.newValue || '[]')); }catch{} } }
    window.addEventListener('storage', onStorage);
    const t = setInterval(()=>{
      try{ const raw = localStorage.getItem('td_expenses'); if(raw){ const parsed = JSON.parse(raw); if(JSON.stringify(parsed) !== JSON.stringify(expenses)) setExpenses(parsed); } }catch(e){}
    }, 1200);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(t); }
  }, [expenses]);
  const [incidents] = useState(MOCK_INCIDENTS);

  // UI state
  const [deptFilter, setDeptFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [q, setQ] = useState('');
  const [startDate, setStartDate] = useState('2025-07-01');
  const [endDate, setEndDate] = useState('2025-12-31');
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const departments = useMemo(()=>['All', ...Array.from(new Set(trips.map(t=>t.dept)))], [trips]);
  const regions = useMemo(()=>['All', ...Array.from(new Set(trips.map(t=>t.region)))], [trips]);

  const filteredTrips = useMemo(()=> trips.filter(t => {
    if(deptFilter !== 'All' && t.dept !== deptFilter) return false;
    if(regionFilter !== 'All' && t.region !== regionFilter) return false;
    if(q && !(t.employee.toLowerCase().includes(q.toLowerCase()) || t.destination.toLowerCase().includes(q.toLowerCase()))) return false;
    if(startDate && t.date < startDate) return false;
    if(endDate && t.date > endDate) return false;
    if(selectedSlice && t.destination !== selectedSlice) return false;
    return true;
  }), [trips, deptFilter, regionFilter, q, startDate, endDate, selectedSlice]);

  // Frequency by employee
  const freqByEmployee = useMemo(()=>{
    const map = {};
    filteredTrips.forEach(t => map[t.employee] = (map[t.employee]||0)+1);
    return Object.entries(map).map(([k,v])=>({ name:k, trips:v }));
  }, [filteredTrips]);

  // Spend by category
  const spendByCategory = useMemo(()=>{
    const map = {};
    (expenses||[]).forEach(e => { const cat = e.category || 'Other'; map[cat] = (map[cat]||0) + (Number(e.amount)||0); });
    return Object.entries(map).map(([k,v])=>({ name:k, value:v }));
  }, [expenses]);

  // KPI quick cards for Airfare, Hotel, Car
  const kpiAir = useMemo(()=> (expenses||[]).filter(e=>/air|flight|airline/i.test(e.category)).reduce((s,e)=>s+(Number(e.amount)||0),0), [expenses]);
  const kpiHotel = useMemo(()=> (expenses||[]).filter(e=>/hotel/i.test(e.category)).reduce((s,e)=>s+(Number(e.amount)||0),0), [expenses]);
  const kpiCar = useMemo(()=> (expenses||[]).filter(e=>/car|taxi|uber|rent/i.test(e.category)).reduce((s,e)=>s+(Number(e.amount)||0),0), [expenses]);

  const compliance = useMemo(()=>{
    const approved = trips.filter(t=>t.status==='Approved').length;
    const pending = trips.filter(t=>t.status==='Pending').length;
    const completed = trips.filter(t=>t.status==='Completed').length;
    return [ { name:'Approved', value:approved }, { name:'Pending', value:pending }, { name:'Completed', value:completed } ];
  }, [trips]);

  const co2ByDestination = useMemo(()=>{
    const map = {};
    trips.forEach(t => map[t.destination] = (map[t.destination]||0) + Math.round(t.spend/100));
    return Object.entries(map).map(([k,v])=>({ name:k, value:v }));
  }, [trips]);

  // Table data + sort
  const tableData = useMemo(()=>{
    const arr = filteredTrips.map(t=>({ id:t.id, date:t.date, employee:t.employee, dept:t.dept, dest:t.destination, spend:t.spend, status:t.status }));
    arr.sort((a,b)=>{
      const mul = sortDir === 'asc' ? 1 : -1;
      if(sortKey === 'spend') return (a.spend - b.spend) * mul;
      if(sortKey === 'employee') return a.employee.localeCompare(b.employee) * mul;
      return (a.date.localeCompare(b.date)) * mul;
    });
    return arr;
  }, [filteredTrips, sortKey, sortDir]);

  const [activeTrip, setActiveTrip] = useState(null);

  function toggleSort(k){ if(sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(k); setSortDir('desc'); } }

  function downloadTripsCSV(){
    const rows = [['id','employee','dept','region','destination','spend','date','status'], ...filteredTrips.map(t=>[t.id,t.employee,t.dept,t.region,t.destination,t.spend,t.date,t.status])];
    csvDownload('trips-filtered.csv', rows);
  }
  function downloadExpensesCSV(){
    const rows = [['id','tripId','category','vendor','amount'], ...expenses.map(e=>[e.id,e.tripId,e.category,e.vendor,e.amount])];
    csvDownload('expenses.csv', rows);
  }
  function exportSnapshot(){ jsonDownload('analytics_snapshot.json', { trips, expenses, incidents, generatedAt: new Date().toISOString() }); }

  return (
    <div className="min-h-screen app-root p-8 font-sans text-gray-800">
      <div className="max-w-[1200px] mx-auto">
        <header className="mb  -6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">Operational insights — trips, spend, compliance and risk incidents.</p>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" aria-label="Export filtered trips as CSV" onClick={downloadTripsCSV} className="px-3 py-2 border rounded text-sm">Export trips</button>
            <button type="button" aria-label="Export all expenses as CSV" onClick={downloadExpensesCSV} className="px-3 py-2 border rounded text-sm">Export expenses</button>
            <button type="button" aria-label="Save analytics snapshot as JSON" onClick={exportSnapshot} className="px-3 py-2 bg-green-600 text-white rounded text-sm">Snapshot</button>
            <button type="button" onClick={()=> navigate(-1)} className="px-3 py-2 border rounded text-sm">← Back</button>
          </div>
        </header>

        {/* Active filters chips + live region for screen readers */}
        <div className="max-w-[1200px] mx-auto mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            { (q || deptFilter !== 'All' || regionFilter !== 'All' || selectedSlice || startDate || endDate) && (
              <>
                {q && <button type="button" onClick={() => { setQ(''); setAnnounce('Search cleared'); }} className="text-xs bg-gray-100 px-2 py-1 rounded">Search: {q} ✕</button>}
                {deptFilter !== 'All' && <button type="button" onClick={() => { setDeptFilter('All'); setAnnounce('Department filter cleared'); }} className="text-xs bg-gray-100 px-2 py-1 rounded">Dept: {deptFilter} ✕</button>}
                {regionFilter !== 'All' && <button type="button" onClick={() => { setRegionFilter('All'); setAnnounce('Region filter cleared'); }} className="text-xs bg-gray-100 px-2 py-1 rounded">Region: {regionFilter} ✕</button>}
                {selectedSlice && <button type="button" onClick={() => { setSelectedSlice(null); setAnnounce('Donut selection cleared'); }} className="text-xs bg-gray-100 px-2 py-1 rounded">Filter: {selectedSlice} ✕</button>}
                {(startDate || endDate) && <button type="button" onClick={() => { setStartDate('2025-07-01'); setEndDate('2025-12-31'); setAnnounce('Date range reset'); }} className="text-xs bg-gray-100 px-2 py-1 rounded">Date: {startDate} → {endDate} ✕</button>}
                <button type="button" onClick={() => { setDeptFilter('All'); setRegionFilter('All'); setQ(''); setSelectedSlice(null); setStartDate('2025-07-01'); setEndDate('2025-12-31'); setAnnounce('All filters cleared'); }} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Clear all</button>
              </>
            )}
          </div>
          <div aria-live="polite" className="sr-only">{announce}</div>
        </div>

        <section className="grid grid-cols-12 gap-6 mb-6">
          <aside className="col-span-3 elevated p-4 space-y-4 sticky-card">
            <div>
              <label className="text-xs">Search (employee or destination)</label>
              <input value={q} onChange={e=>setQ(e.target.value)} className="w-full mt-1 p-2 border rounded text-sm" placeholder="Search..." />
            </div>

            <div>
              <label className="text-xs">Department</label>
              <select value={deptFilter} onChange={e=> setDeptFilter(e.target.value)} className="w-full border p-2 rounded mt-1 text-sm">
                {departments.map(d=> <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs">Region</label>
              <select value={regionFilter} onChange={e=> setRegionFilter(e.target.value)} className="w-full border p-2 rounded mt-1 text-sm">
                {regions.map(r=> <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs">Date range</label>
              <div className="flex gap-2 mt-1">
                <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-1/2 p-2 border rounded text-sm" />
                <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="w-1/2 p-2 border rounded text-sm" />
              </div>
            </div>

            <div>
              <button type="button" onClick={() => { setDeptFilter('All'); setRegionFilter('All'); setQ(''); setSelectedSlice(null); }} className="px-3 py-2 w-full border rounded text-sm">Clear filters</button>
            </div>
          </aside>

          <main className="col-span-9">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="elevated p-0">
                <div className="card-header p-4">
                  <div className="card-title">Total Trips</div>
                  <div className="card-actions">
                    <button className="card-collapse" onClick={() => setCollapsedSections(s => ({ ...s, tripsKpi: !s.tripsKpi }))}>{collapsedSections.tripsKpi ? 'Expand' : 'Collapse'}</button>
                  </div>
                </div>
                <div className={collapsedSections.tripsKpi ? 'card-body-collapsed' : 'p-4'}>
                  <div className="text-2xl font-bold">{filteredTrips.length}</div>
                </div>
              </div>

              <div className="elevated p-0">
                <div className="card-header p-4">
                  <div className="card-title">Total Spend (filtered)</div>
                  <div className="card-actions">
                    <button className="card-collapse" onClick={() => setCollapsedSections(s => ({ ...s, spendKpi: !s.spendKpi }))}>{collapsedSections.spendKpi ? 'Expand' : 'Collapse'}</button>
                  </div>
                </div>
                <div className={collapsedSections.spendKpi ? 'card-body-collapsed' : 'p-4'}>
                  <div className="text-2xl font-bold">{fmtMoney(filteredTrips.reduce((s,t)=>s+t.spend,0))}</div>
                </div>
              </div>

              <div className="elevated p-0">
                <div className="card-header p-4">
                  <div className="card-title">Incidents</div>
                  <div className="card-actions">
                    <button className="card-collapse" onClick={() => setCollapsedSections(s => ({ ...s, incidentsKpi: !s.incidentsKpi }))}>{collapsedSections.incidentsKpi ? 'Expand' : 'Collapse'}</button>
                  </div>
                </div>
                <div className={collapsedSections.incidentsKpi ? 'card-body-collapsed' : 'p-4'}>
                  <div className="text-2xl font-bold">{incidents.length}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="elevated p-4">
                <h4 className="font-semibold mb-2">Travel frequency by employee</h4>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={freqByEmployee} margin={{ left: -20 }}>
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="trips" fill="#7c3aed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="elevated p-4">
                <h4 className="font-semibold mb-2">Spend breakdown</h4>
                <div className="flex items-center justify-center" style={{height:260}}>
                  <CorporateDonut data={spendByCategory} colors={COLORS} size={180} onSliceClick={(it)=>{ setSelectedSlice(it.name); }} />
                </div>
              </div>
            </div>

            {/* Time series spend chart */}
            <div className="mt-4 elevated p-4">
              <h4 className="font-semibold mb-2">Spend over time</h4>
              <TimeSeriesChart data={useMemo(()=>{
                // aggregate spend by month YYYY-MM
                const map = {};
                trips.forEach(t => {
                  const key = t.date.slice(0,7);
                  map[key] = (map[key]||0) + (t.spend||0);
                });
                return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>({ x:k, y:v }));
              }, [trips])} height={200} />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="elevated p-4">
                <h4 className="font-semibold mb-2">Policy compliance</h4>
                <div className="flex items-center justify-center" style={{height:180}}>
                  <CorporateDonut data={compliance} colors={COLORS} size={150} />
                </div>
              </div>

              <div className="elevated p-4">
                <h4 className="font-semibold mb-2">ESG / CO₂ (estimate)</h4>
                <div className="flex items-center justify-center" style={{height:180}}>
                  <CorporateDonut data={co2ByDestination} colors={COLORS} size={150} onSliceClick={(it)=> setSelectedSlice(it.name)} />
                </div>
              </div>
            </div>

            <div className="mt-6 elevated p-0">
              <div className="card-header p-4">
                <div className="card-title">Trips (table)</div>
                <div className="card-actions">
                  <div className="text-xs text-gray-500 mr-2">Sort:</div>
                  <button type="button" className={`px-2 py-1 border rounded text-sm ${sortKey==='date'?'bg-gray-100':''}`} onClick={()=>toggleSort('date')}>Date</button>
                  <button type="button" className={`px-2 py-1 border rounded text-sm ${sortKey==='employee'?'bg-gray-100':''}`} onClick={()=>toggleSort('employee')}>Employee</button>
                  <button type="button" className={`px-2 py-1 border rounded text-sm ${sortKey==='spend'?'bg-gray-100':''}`} onClick={()=>toggleSort('spend')}>Spend</button>
                  <button className="card-collapse" onClick={() => setCollapsedSections(s => ({ ...s, tripsTable: !s.tripsTable }))}>{collapsedSections.tripsTable ? 'Expand' : 'Collapse'}</button>
                </div>
              </div>

              <div className={collapsedSections.tripsTable ? 'card-body-collapsed' : 'overflow-x-auto p-4'}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500"><th>ID</th><th>Date</th><th>Employee</th><th>Dept</th><th>Destination</th><th>Spend</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {tableData.map(r => (
                      <tr
                        key={r.id}
                        className="border-t hover:bg-gray-50 cursor-pointer"
                        onClick={() => setActiveTrip(trips.find(t => t.id === r.id))}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setActiveTrip(trips.find(t => t.id === r.id));
                            e.preventDefault();
                          }
                        }}
                      >
                        <td className="py-2">{r.id}</td>
                        <td>{r.date}</td>
                        <td>{r.employee}</td>
                        <td>{r.dept}</td>
                        <td>{r.dest}</td>
                        <td className="font-semibold">{fmtMoney(r.spend)}</td>
                        <td>{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </section>
        {/* Trip detail modal (drilldown) */}
        <TripDetailModal trip={activeTrip} expenses={expenses} onClose={() => setActiveTrip(null)} />
      </div>
    </div>
  );
}
