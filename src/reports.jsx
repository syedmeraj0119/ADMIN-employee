import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Reports(){
  const navigate = useNavigate();
  return (
    <div className="p-6 max-w-[900px] mx-auto">
  <button type="button" onClick={()=> navigate(-1)} className="px-2 py-1 elevated">← Back</button>
      <h1 className="text-2xl font-semibold mt-4">Reports</h1>
      <p className="mt-2 text-sm text-muted">This page will host downloadable reports and scheduled exports.</p>

      <div className="mt-6 elevated p-4">
        <h2 className="font-medium">Available reports</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <button type="button" className="px-3 py-1 border rounded">Export trips CSV</button>
          </li>
          <li>
            <button type="button" className="px-3 py-1 border rounded">Expense summary (PDF)</button>
          </li>
          <li>
            <button type="button" className="px-3 py-1 border rounded">Top destinations (XLSX)</button>
          </li>
        </ul>
      </div>
    </div>
  );
}
