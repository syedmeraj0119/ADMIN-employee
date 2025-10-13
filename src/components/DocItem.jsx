import React from 'react';

function Badge({ children, className='' }){ return <span className={`text-xs px-2 py-0.5 rounded ${className}`}>{children}</span>; }

export default function DocItem({ d, onDownload, onSign, onDelete, onPreview }){
  const expiring = d.expiry && (new Date(d.expiry).getTime() <= (Date.now()+1000*60*60*24*30));
  return (
    <div className="p-2 border rounded flex items-start justify-between bg-white shadow-sm">
      <div>
        <div className="flex items-center gap-3">
          <div className="font-semibold cursor-pointer text-blue-600" onClick={()=> onPreview(d)}>{d.filename}</div>
          <div className="flex items-center gap-2">
            {d.signed && <Badge className="bg-green-100 text-green-800">Signed</Badge>}
            {d.verified && <Badge className="bg-blue-100 text-blue-800">Verified</Badge>}
            {expiring && <Badge className="bg-orange-100 text-orange-800">Expiring</Badge>}
          </div>
        </div>
        <div className="text-xs text-muted">Uploaded {new Date(d.uploadedAt).toLocaleDateString()} {d.expiry ? `• Expires ${new Date(d.expiry).toLocaleDateString()}`:''}</div>
        {d.notes && <div className="text-xs mt-1">{d.notes}</div>}
      </div>
      <div className="flex flex-col gap-2">
        <button type="button" className="px-2 py-1 border rounded text-xs" onClick={()=> onDownload(d)}>Download</button>
        <button type="button" className="px-2 py-1 border rounded text-xs" onClick={()=> onSign(d)}>Sign</button>
        <button type="button" className="px-2 py-1 border rounded text-xs" onClick={()=> onDelete(d)}>Delete</button>
      </div>
    </div>
  );
}
