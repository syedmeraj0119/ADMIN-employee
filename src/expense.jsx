import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function uid(){ return Math.random().toString(36).slice(2,9); }

function readLS(key, fallback){ try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }catch{ return fallback; } }
function writeLS(key, v){ try{ localStorage.setItem(key, JSON.stringify(v)); }catch{} }

export default function ExpensePage(){
  const navigate = useNavigate();
  const [employees, setEmployees] = useState(() => readLS('td_employees', [ { id: 'e1', name: 'Alice', budget: 2000 }, { id: 'e2', name: 'Bob', budget: 1500 } ]));
  const [trips, setTrips] = useState(() => readLS('td_trips_v2', []));
  const [expenses, setExpenses] = useState(() => readLS('td_expenses', []));
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [filter, setFilter] = useState({ employee: '', status: 'all' });
  const [newExpense, setNewExpense] = useState({ date: '', employeeId: '', tripId: '', amount: '', category: '', receiptUrl: '' });
  const fileRef = useRef(null);

  useEffect(()=>{ writeLS('td_employees', employees); }, [employees]);
  useEffect(()=>{ writeLS('td_trips_v2', trips); }, [trips]);
  useEffect(()=>{ writeLS('td_expenses', expenses); }, [expenses]);

  // helpers
  function addEmployee(name, budget){ const e = { id: uid(), name, budget: Number(budget)||0 }; setEmployees(s => [e, ...s]); }
  function addTrip(trip){ const t = { id: uid(), ...trip }; setTrips(s => [t, ...s]); }
  function addExpense(){
    const e = { id: uid(), date: newExpense.date || new Date().toISOString().slice(0,10), employeeId: newExpense.employeeId || (employees[0] && employees[0].id) || '', tripId: newExpense.tripId || null, amount: Number(newExpense.amount)||0, category: newExpense.category||'Other', receiptUrl: newExpense.receiptUrl||'', submitted: Boolean(newExpense.receiptUrl), flagged: false };
    setExpenses(s => [e, ...s]);
    setNewExpense({ date:'', employeeId:'', tripId:'', amount:'', category:'', receiptUrl:'' });
  }

  function updateExpense(id, patch){ setExpenses(s => s.map(x => x.id === id ? {...x, ...patch} : x)); }

  function computeEmployeeUtil(employeeId){
    const e = employees.find(x=>x.id===employeeId);
    const budget = e ? Number(e.budget)||0 : 0;
    const spent = expenses.filter(x=>x.employeeId===employeeId).reduce((s,x)=>s + (Number(x.amount)||0), 0);
    return { budget, spent, remaining: budget - spent, pct: budget ? Math.round((spent/budget)*100) : 0 };
  }

  function exportCSV(){
    const rows = [ ['id','date','employee','trip','amount','category','submitted','flagged'] ];
    for(const r of expenses){
      const emp = employees.find(e=>e.id===r.employeeId)?.name || r.employeeId;
      const trip = trips.find(t=>t.id===r.tripId)?.title || r.tripId || '';
      rows.push([r.id, r.date, emp, trip, r.amount, r.category, r.submitted ? 'yes':'no', r.flagged ? 'yes':'no']);
    }
    const csv = rows.map(r=>r.map(c=>`"${(''+c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'expenses.csv'; a.click(); URL.revokeObjectURL(url);
  }

  function exportPDF(){
    // simple fallback: open print preview of the report area
    window.print();
  }

  // auto-flag overspending or unsubmitted receipts
  useEffect(()=>{
    // flag expenses without receipts older than 14 days
    const threshold = new Date(); threshold.setDate(threshold.getDate() - 14);
    setExpenses(s => s.map(x => ({ ...x, flagged: x.flagged || (!x.submitted && new Date(x.date) < threshold) })))
  }, []);

  // quick variance report
  function varianceReport(){
    const report = employees.map(e => {
      const { budget, spent } = computeEmployeeUtil(e.id);
      return { id: e.id, name: e.name, budget, spent, variance: budget - spent };
    });
    return report;
  }

  const visible = expenses.filter(x => {
    if(filter.employee && x.employeeId !== filter.employee) return false;
    if(filter.status === 'flagged' && !x.flagged) return false;
    if(filter.status === 'unsubmitted' && x.submitted) return false;
    return true;
  });

  return (
    <div className="p-6">
      <button onClick={() => navigate(-1)} className="px-2 py-1 bg-white border rounded text-sm">← Back</button>

      <div className="mt-6 grid grid-cols-12 gap-6">
        <div className="col-span-4 bg-white rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Budgets</h2>
          <div className="mt-3">
            <h3 className="font-medium">Employees</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {employees.map(emp => {
                const util = computeEmployeeUtil(emp.id);
                return (
                  <li key={emp.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{emp.name}</div>
                      <div className="text-xs text-muted">Budget: ${emp.budget} • Spent: ${util.spent}</div>
                    </div>
                    <div className="text-sm font-medium" style={{color: util.remaining < 0 ? '#dc2626' : '#059669'}}>${Math.max(0, util.remaining)}</div>
                  </li>
                )
              })}
            </ul>
            <div className="mt-3">
              <h4 className="text-sm font-medium">Add employee</h4>
              <AddEmployeeForm onAdd={(n,b)=>addEmployee(n,b)} />
            </div>
          </div>
        </div>

        <div className="col-span-8 bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Expenses</h2>
            <div className="flex items-center gap-2">
              <select value={filter.employee} onChange={e=>setFilter(f=>({...f, employee:e.target.value}))} className="px-2 py-1 border rounded text-sm">
                <option value="">All employees</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
              <select value={filter.status} onChange={e=>setFilter(f=>({...f, status:e.target.value}))} className="px-2 py-1 border rounded text-sm">
                <option value="all">All</option>
                <option value="flagged">Flagged</option>
                <option value="unsubmitted">Unsubmitted</option>
              </select>
              <button onClick={exportCSV} className="px-3 py-1 border rounded text-sm">Export CSV</button>
              <button onClick={exportPDF} className="px-3 py-1 border rounded text-sm">Print/PDF</button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <div className="bg-gray-50 border rounded p-3">
                <h4 className="font-medium">Add expense</h4>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input className="border p-2 rounded" placeholder="Date" type="date" value={newExpense.date} onChange={e=>setNewExpense({...newExpense, date:e.target.value})} />
                  <select className="border p-2 rounded" value={newExpense.employeeId} onChange={e=>setNewExpense({...newExpense, employeeId:e.target.value})}>
                    <option value="">Select employee</option>
                    {employees.map(emp=> <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                  <select className="border p-2 rounded" value={newExpense.tripId} onChange={e=>setNewExpense({...newExpense, tripId:e.target.value})}>
                    <option value="">Link to trip (optional)</option>
                    {trips.map(t=> <option key={t.id} value={t.id}>{t.title || t.id}</option>)}
                  </select>
                  <input className="border p-2 rounded" placeholder="Amount" type="number" value={newExpense.amount} onChange={e=>setNewExpense({...newExpense, amount:e.target.value})} />
                  <input className="border p-2 rounded" placeholder="Category" value={newExpense.category} onChange={e=>setNewExpense({...newExpense, category:e.target.value})} />
                  <input className="border p-2 rounded" placeholder="Receipt URL" value={newExpense.receiptUrl} onChange={e=>setNewExpense({...newExpense, receiptUrl:e.target.value})} />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button className="px-3 py-1 bg-purple-600 text-white rounded" onClick={addExpense}>Add expense</button>
                  <input type="file" ref={fileRef} onChange={(e)=>{ const f = e.target.files && e.target.files[0]; if(f){ const url = URL.createObjectURL(f); setNewExpense(ne=>({...ne, receiptUrl: url, submitted:true})); } }} />
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-medium">Expense list</h4>
                <div className="mt-2 space-y-2 max-h-80 overflow-auto">
                  {visible.map(x => (
                    <div key={x.id} className="p-2 border rounded flex items-center justify-between">
                      <div>
                        <div className="font-semibold">${x.amount} — {x.category}</div>
                        <div className="text-xs text-muted">{x.date} • {employees.find(e=>e.id===x.employeeId)?.name || '—'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!x.submitted && <button className="px-2 py-0.5 border rounded text-xs" onClick={()=> updateExpense(x.id, { submitted: true })}>Mark submitted</button>}
                        <button className="px-2 py-0.5 border rounded text-xs" onClick={()=> updateExpense(x.id, { flagged: !x.flagged })}>{x.flagged ? 'Unflag' : 'Flag'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="bg-white border rounded p-3">
                <h4 className="font-medium">Variance report</h4>
                <div className="mt-2 text-sm">
                  {varianceReport().map(r => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b">
                      <div>
                        <div className="font-semibold">{r.name}</div>
                        <div className="text-xs text-muted">Budget ${r.budget} • Spent ${r.spent}</div>
                      </div>
                      <div style={{color: r.variance < 0 ? '#dc2626' : '#059669' }}>${r.variance}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddEmployeeForm({ onAdd }){
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  return (
    <div className="flex items-center gap-2">
      <input className="border p-2 rounded" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
      <input className="border p-2 rounded w-24" placeholder="Budget" value={budget} onChange={e=>setBudget(e.target.value)} />
      <button className="px-2 py-1 border rounded" onClick={()=>{ if(name) { onAdd(name,budget||0); setName(''); setBudget(''); } }}>Add</button>
    </div>
  )
}
