 import React, { useState, useEffect } from 'react';

const DEFAULT = ['tripFrequency','topDestinations','riskFeed'];

export default function WidgetManager({ onChange, initial }){
  const [widgets, setWidgets] = useState(() => {
    try{
      const raw = localStorage.getItem('dashboard_widgets');
      if(raw) return JSON.parse(raw);
    }catch{}
    return initial || DEFAULT;
  });

  useEffect(() => {
    try{ localStorage.setItem('dashboard_widgets', JSON.stringify(widgets)); }catch{}
    onChange && onChange(widgets);
  }, [widgets]);

  function toggle(id){
    setWidgets(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id]);
  }

  return (
    <div className="widget-manager elevated p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">Widget configuration</div>
        <div className="text-xs text-gray-500">Saved locally</div>
      </div>
      <div className="space-y-2">
        <label className="flex items-center justify-between">
          <span>Trip frequency</span>
          <input type="checkbox" checked={widgets.includes('tripFrequency')} onChange={() => toggle('tripFrequency')} />
        </label>

        <label className="flex items-center justify-between">
          <span>Top destinations</span>
          <input type="checkbox" checked={widgets.includes('topDestinations')} onChange={() => toggle('topDestinations')} />
        </label>

        <label className="flex items-center justify-between">
          <span>Risk feed</span>
          <input type="checkbox" checked={widgets.includes('riskFeed')} onChange={() => toggle('riskFeed')} />
        </label>

        {/* Compliance and Carbon removed from widget toggles */}
      </div>
    </div>
  );
}
