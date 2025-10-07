import React, { useEffect, useState } from 'react';

export default function RiskFeed({ pollInterval = 15000 }){
  const [items, setItems] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let mounted = true;
    function fetchMock(){
      // mock items
      const now = new Date();
      const mock = [
        { id: 'who-1', source: 'WHO', timestamp: now.toISOString(), severity: 'moderate', region: 'Europe', summary: 'Localized outbreak advisory in Region X', link: '#' },
        { id: 'cdc-1', source: 'CDC', timestamp: now.toISOString(), severity: 'low', region: 'North America', summary: 'Travel advisory updated for Country Y', link: '#' },
      ];
      if(!mounted) return;
      setItems(mock);
      setLastUpdated(new Date());
    }
    fetchMock();
    const t = setInterval(fetchMock, pollInterval);
    return () => { mounted = false; clearInterval(t); };
  }, [pollInterval]);

  return (
    <div className="risk-feed bg-white rounded border p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">Real-time risk feed</div>
        <div className="text-xs text-gray-500">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}</div>
      </div>
      <div className="space-y-2 max-h-48 overflow-auto">
        {items.map(it => (
          <div key={it.id} className="p-2 border rounded hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium">{it.summary}</div>
                <div className="text-xs text-gray-500">{it.source} • {it.region}</div>
              </div>
              <div className="text-xs font-semibold text-red-600">{it.severity}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
