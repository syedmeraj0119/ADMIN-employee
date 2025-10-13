import React from 'react';

export default function RiskModal({ open = true, analysis = {}, onConfirm, onCancel, onRequestApproval, title = 'Risk analysis' }){
  // allow conditional rendering or controlled open prop
  if(open === false) return null;
  const levelClass = analysis?.riskLevel === 'High' ? 'bg-red-50 text-red-700' : analysis?.riskLevel === 'Medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700';
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <div role="dialog" aria-modal="true" aria-labelledby="risk-modal-title" className="elevated p-4 rounded z-70 bg-white max-w-lg w-full">
        <div className="flex items-center justify-between">
          <h3 id="risk-modal-title" className="font-semibold">{title}</h3>
          <div className={`px-2 py-1 text-sm rounded ${levelClass}`}>{analysis?.riskLevel || 'Unknown'}</div>
        </div>

        <div className="mt-3 text-sm">
          <div className="font-medium">Summary</div>
          <div className="mt-1 text-sm text-gray-700">{analysis?.reasons?.length ? analysis.reasons.map((r,i) => <div key={i}>• {r}</div>) : 'No issues detected.'}</div>
        </div>

        { analysis?.policyViolations?.length > 0 && (
          <div className="mt-3 text-sm p-3 border-l-4 border-red-200 bg-red-50 rounded">
            <div className="font-medium text-red-700">Policy violations detected</div>
            <div className="mt-1 text-sm text-red-700">{analysis.policyViolations.map((v,i) => <div key={i}>• {v}</div>)}</div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-2 border rounded" onClick={onCancel}>Cancel</button>
          { onRequestApproval && (
            <button className="px-3 py-2 bg-yellow-500 text-white rounded" onClick={onRequestApproval}>Request approval</button>
          )}
          <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={onConfirm}>Proceed anyway</button>
        </div>
      </div>
    </div>
  );
}
