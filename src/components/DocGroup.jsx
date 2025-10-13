import React from 'react';
import DocItem from './DocItem';

export default function DocGroup({ type, items, collapsed, onToggle, onDownloadAll, onDownload, onSign, onDelete, onPreview }){
  return (
    <div className="border rounded p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <button type="button" className="px-2 py-1 border rounded text-xs" onClick={()=> onToggle(type)}>{collapsed ? '▸' : '▾'}</button>
          <div className="font-semibold">{type} <span className="text-sm text-muted">({items.length})</span></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted">Most recent: {items[0] ? new Date(items[0].uploadedAt).toLocaleDateString() : '—'}</div>
          <button type="button" className="px-2 py-1 border rounded text-xs" onClick={()=> onDownloadAll(type)}>Download all</button>
        </div>
      </div>
      {!collapsed && (
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {items.map(d => ( (d.dataUrl||'').startsWith('data:image/') ? <img key={d.id} src={d.dataUrl} alt={d.filename} style={{width:96, height:64, objectFit:'cover', borderRadius:6}} /> : null ))}
          </div>
          <div className="space-y-2">
            {items.map(d => (
              <DocItem key={d.id} d={d} onDownload={onDownload} onSign={onSign} onDelete={onDelete} onPreview={onPreview} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
