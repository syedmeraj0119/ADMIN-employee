import React, { useEffect, useRef } from 'react';

export default function TripDetailModal({ trip, expenses = [], onClose }){
  const containerRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!trip) return;
    // focus the close button when modal opens
    const toFocus = closeButtonRef.current || containerRef.current;
    toFocus && toFocus.                             focus();

    function onKey(e){
      if(e.key === 'Escape') onClose && onClose();
      if(e.key === 'Tab'){
        // simple focus trap between close button and container
        const focusable = Array.from(containerRef.current.querySelectorAll('button, [tabindex]')).filter(Boolean);
        if(focusable.length === 0) return;
        const idx = focusable.indexOf(document.activeElement);
        if(e.shiftKey){
          if(idx === 0){ focusable[focusable.length-1].focus(); e.preventDefault(); }
        } else {
          if(idx === focusable.length-1){ focusable[0].focus(); e.preventDefault(); }
        }
      }
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [trip, onClose]);

  if(!trip) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
  <div ref={containerRef} className="elevated p-6 shadow-lg z-60 w-[min(760px,95%)]" tabIndex={-1}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Trip {trip.id} — {trip.destination}</h3>
            <div className="text-sm text-muted">{trip.employee} • {trip.dept} • {trip.region}</div>
          </div>
          <div>
            <button type="button" ref={closeButtonRef} className="px-3 py-1 border rounded" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500">Date</div>
            <div className="font-medium">{trip.date}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Spend</div>
            <div className="font-medium">${trip.spend}</div>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="font-medium">Expenses</h4>
          <ul className="mt-2 text-sm">
            {expenses.filter(e=>e.tripId===trip.id).map(e => (
              <li key={e.id} className="flex items-center justify-between border-t py-2">
                <div>{e.category} — {e.vendor}</div>
                <div className="font-semibold">${e.amount}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
