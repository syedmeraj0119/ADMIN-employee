import React from 'react';

export default function DocPreview({ doc, onClose, onDownload }){
  if(!doc) return null;
  const isImage = (doc.dataUrl||'').startsWith('data:image/');
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="elevated p-4 rounded z-70 bg-white max-w-[80%] max-h-[80%] overflow-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">{doc.filename}</div>
          <div>
            <button className="px-2 py-1 border rounded mr-2" onClick={()=> onDownload(doc)}>Download</button>
            <button className="px-2 py-1 border rounded" onClick={onClose}>Close</button>
          </div>
        </div>
        <div>
          { isImage ? <img src={doc.dataUrl} alt={doc.filename} style={{maxWidth:'100%'}}/> : <div className="text-sm">Preview not available for this file type.</div> }
        </div>
      </div>
    </div>
  );
}
