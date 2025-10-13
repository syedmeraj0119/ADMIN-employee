import React from 'react';

export default function DocSearch({ filterText, setFilterText, sortBy, setSortBy, showExpiringOnly, setShowExpiringOnly }){
  return (
    <div className="flex items-center gap-2 mt-2">
      <input placeholder="Search filename or notes..." value={filterText} onChange={e=> setFilterText(e.target.value)} className="border p-2 rounded flex-1 text-sm" />
      <select value={sortBy} onChange={e=> setSortBy(e.target.value)} className="border p-2 rounded text-sm">
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="expiry">Expiry</option>
      </select>
      <label className="text-sm items-center flex gap-2"><input type="checkbox" checked={showExpiringOnly} onChange={e=> setShowExpiringOnly(e.target.checked)} /> Expiring (30d)</label>
    </div>
  );
}
