import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

// Small utilities
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

function htmlPrint(title, html){
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>${title}</title><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body>${html}</body></html>`);
  w.document.close();
  w.print();
}

// Mock dataset (small)
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

export default function Analytics(){
  const [trips] = useState(MOCK_TRIPS);
  const [expenses] = useState(MOCK_EXPENSES);
  const [incidents] = useState(MOCK_INCIDENTS);
  const [deptFilter, setDeptFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');

  const departments = useMemo(()=>['All', ...Array.from(new Set(trips.map(t=>t.dept)))], [trips]);
  const regions = useMemo(()=>['All', ...Array.from(new Set(trips.map(t=>t.region)))], [trips]);

  const filteredTrips = useMemo(()=> trips.filter(t => (deptFilter==='All' || t.dept===deptFilter) && (regionFilter==='All' || t.region===regionFilter)), [trips, deptFilter, regionFilter]);

  // Travel frequency by employee
  const freqByEmployee = useMemo(()=>{
    const map = {};
    filteredTrips.forEach(t => map[t.employee] = (map[t.employee]||0)+1);
    return Object.entries(map).map(([k,v])=>({ name:k, trips:v }));
  }, [filteredTrips]);

  // Spend breakdown by category
  const spendByCategory = useMemo(()=>{
    const map = {};
    expenses.forEach(e => map[e.category] = (map[e.category]||0) + e.amount);
    return Object.entries(map).map(([k,v])=>({ name:k, value:v }));
  }, [expenses]);

  // Policy compliance (mock: count approved vs pending)
  const compliance = useMemo(()=>{
    const approved = trips.filter(t=>t.status==='Approved').length;
    const pending = trips.filter(t=>t.status==='Pending').length;
    const completed = trips.filter(t=>t.status==='Completed').length;
    return [ { name:'Approved', value:approved }, { name:'Pending', value:pending }, { name:'Completed', value:completed } ];
  }, [trips]);

  // ESG simple CO2 estimate: assume amount roughly proportional
  const co2ByDestination = useMemo(()=>{
    const map = {};
    trips.forEach(t => map[t.destination] = (map[t.destination]||0) + Math.round(t.spend/100));
    return Object.entries(map).map(([k,v])=>({ name:k, value:v }));
  }, [trips]);

  function downloadTripsCSV(){
    const rows = [['id','employee','dept','region','destination','spend','date','status'], ...trips.map(t=>[t.id,t.employee,t.dept,t.region,t.destination,t.spend,t.date,t.status])];
    csvDownload('trips.csv', rows);
  }

  function downloadExpensesCSV(){
    const rows = [['id','tripId','category','vendor','amount'], ...expenses.map(e=>[e.id,e.tripId,e.category,e.vendor,e.amount])];
    csvDownload('expenses.csv', rows);
  }

  function exportPowerBI(){
    // produce a combined JSON snapshot consumable by Power BI / other tools
    jsonDownload('analytics_snapshot.json', { trips, expenses, incidents, generatedAt: new Date().toISOString() });
  }

  function downloadIncidents(){
    const rows = [['id','date','tripId','severity','note'], ...incidents.map(i=>[i.id,i.date,i.tripId,i.severity,i.note])];
    csvDownload('incidents.csv', rows);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Reports & Analytics</h1>
          <div className="text-sm text-gray-500">Operational insights: frequency, spend, policy compliance, ESG, risk incidents.</div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-3 bg-white rounded border p-4">
          <h3 className="font-semibold mb-2">Filters</h3>
          <div className="mb-3">
            <label className="text-xs">Department</label>
            <select value={deptFilter} onChange={e=> setDeptFilter(e.target.value)} className="w-full border p-2 rounded mt-1 text-sm">
              {departments.map(d=> <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="text-xs">Region</label>
            <select value={regionFilter} onChange={e=> setRegionFilter(e.target.value)} className="w-full border p-2 rounded mt-1 text-sm">
              {regions.map(r=> <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-medium">Exports</h4>
            <div className="flex flex-col gap-2 mt-2">
              <button onClick={downloadTripsCSV} className="px-3 py-2 border rounded text-sm">Download Trips CSV</button>
              <button onClick={downloadExpensesCSV} className="px-3 py-2 border rounded text-sm">Download Expenses CSV</button>
              <button onClick={downloadIncidents} className="px-3 py-2 border rounded text-sm">Download Incidents CSV</button>
              <button onClick={exportPowerBI} className="px-3 py-2 bg-green-600 text-white rounded text-sm">Export snapshot (Power BI/JSON)</button>
            </div>
          </div>
        </aside>

        <main className="col-span-9">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded p-4 border">
              <div className="text-xs text-gray-500">Total Trips</div>
              <div className="text-2xl font-bold">{trips.length}</div>
            </div>
            <div className="bg-white rounded p-4 border">
              <div className="text-xs text-gray-500">Total Spend</div>
              <div className="text-2xl font-bold">${expenses.reduce((s,e)=>s+e.amount,0).toLocaleString()}</div>
            </div>
            <div className="bg-white rounded p-4 border">
              <div className="text-xs text-gray-500">Incidents</div>
              <div className="text-2xl font-bold">{incidents.length}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded p-4 border">
              <h4 className="font-semibold mb-2">Travel frequency by employee</h4>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={freqByEmployee}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="trips" fill="#7c3aed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded p-4 border">
              <h4 className="font-semibold mb-2">Spend breakdown by category</h4>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={spendByCategory} dataKey="value" nameKey="name" outerRadius={80} label>
                      {spendByCategory.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-white rounded p-4 border">
              <h4 className="font-semibold mb-2">Policy compliance</h4>
              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={compliance} dataKey="value" nameKey="name" outerRadius={70} label>
                      {compliance.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded p-4 border">
              <h4 className="font-semibold mb-2">ESG / CO₂ by destination (estimate)</h4>
              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={co2ByDestination} dataKey="value" nameKey="name" outerRadius={70} label>
                      {co2ByDestination.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white rounded p-4 border">
            <h3 className="font-semibold mb-3">Risk & Safety Incidents</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500"><th>ID</th><th>Date</th><th>Trip</th><th>Severity</th><th>Note</th></tr>
                </thead>
                <tbody>
                  {incidents.map(i => (
                    <tr key={i.id} className="border-t"><td className="py-2">{i.id}</td><td>{i.date}</td><td>{i.tripId}</td><td>{i.severity}</td><td>{i.note}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
