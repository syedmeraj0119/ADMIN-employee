import React, { useState, useEffect, useRef } from 'react';

const THEMES = [
  { id: 'light', label: 'Light', accent: '#7c3aed', bg: '#f8fafc' },
  { id: 'dark', label: 'Dark', accent: '#8b5cf6', bg: '#0f172a' },
  { id: 'purple', label: 'Purple', accent: '#7c3aed', bg: '#f5f3ff' },
  { id: 'ocean', label: 'Ocean', accent: '#06b6d4', bg: '#e6f6ff' },
  { id: 'sunset', label: 'Sunset', accent: '#f97316', bg: '#fff7ed' },
  { id: 'neon', label: 'Neon', accent: '#7C5CFF', bg: '#0B1020' },
];

export default function ThemeToggle(){
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('siteTheme') || 'light' } catch { return 'light' }
  });
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('siteTheme', theme);
    } catch (e) {}
  }, [theme]);

  useEffect(() => {
    function onClick(e){ if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  function choose(t){ setTheme(t); setOpen(false); }

  const current = THEMES.find(x => x.id === theme) || THEMES[0];

  return (
    <div className="relative" ref={ref}>
      <button type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(s => !s)}
        className="theme-btn flex items-center gap-2 px-2 py-1 border rounded"
        title={`Theme: ${current.label}`}
      >
        <span className="w-3 h-3 rounded-full" style={{ background: current.accent }} />
        <span className="text-sm">{current.label}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 elevated z-50 p-2">
          <div className="text-xs text-gray-500 mb-2">Select theme</div>
          <div className="grid grid-cols-1 gap-2">
            {THEMES.map(t => (
              <button key={t.id} type="button" onClick={() => choose(t.id)} className={`flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-50 ${t.id === theme ? 'ring-2 ring-offset-1 ring-purple-300' : ''}`}>
                <span className="w-5 h-5 rounded-full" style={{ background: t.accent, boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.15)' }} />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-gray-400">Preview</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
