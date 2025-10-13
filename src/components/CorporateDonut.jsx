import React from 'react';

// Reusable corporate-style donut chart (interactive, tooltip, explode on hover)
export default function CorporateDonut({ data = [], colors = [], size = 220, onSliceClick }) {
  const radius = Math.max(24, Math.floor(size / 2 - 40));
  const thickness = Math.max(12, Math.floor(size * 0.12));
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const total = (data || []).reduce((s, d) => s + (d.value || 0), 0) || 1;

  const [hoverIndex, setHoverIndex] = React.useState(null);
  const [selectedIndex, setSelectedIndex] = React.useState(null);
  const [mounted, setMounted] = React.useState(false);
  const [tooltip, setTooltip] = React.useState({ visible: false, x: 0, y: 0, text: '' });
  const [displayValue, setDisplayValue] = React.useState(0);
  const wrapRef = React.useRef(null);

  const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  React.useEffect(() => {
    if (prefersReduced) {
      setMounted(true);
      setDisplayValue(total);
      return;
    }
    const t = setTimeout(() => setMounted(true), 16);
    return () => clearTimeout(t);
  }, [total, prefersReduced]);

  // center count-up when mounted
  React.useEffect(() => {
    if (!mounted) return;
    if (prefersReduced) return;
    const from = 0;
    const to = total;
    const dur = 500;
    let raf = null;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayValue(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
  }, [mounted, total, prefersReduced]);

  function handleMouseMove(e, d, i) {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setTooltip({ visible: true, x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12, text: `${d.name}: ${d.value} (${((d.value/total)*100).toFixed(1)}%)` });
  }
  function handleMouseLeave() { setTooltip({ visible: false, x: 0, y: 0, text: '' }); setHoverIndex(null); }

  let acc = 0;

  return (
    <div ref={wrapRef} className="pie-wrap" style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }} tabIndex={0} role="region" aria-label="Donut chart">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden={false}>
        <g style={{ transformOrigin: `${cx}px ${cy}px`, transition: 'transform 360ms cubic-bezier(.22,.9,.3,1)' }} transform={mounted ? undefined : `translate(${cx},${cy}) scale(0.95)`}> 
          <g transform={`translate(${cx},${cy}) rotate(-90)`}>
            {(data || []).map((d, i) => {
              const portion = (d.value || 0) / total;
              const dash = Math.max(0.0001, portion * circumference);
              const accBefore = acc;
              const dashArray = `${dash} ${circumference - dash}`;
              // if mounted and not reduced motion, animate dashoffset from circumference to dashOffset
              const dashOffset = prefersReduced ? -accBefore : (mounted ? -accBefore : circumference - accBefore);
              acc += dash;
              const isHover = hoverIndex === i;
              const isSelected = selectedIndex === i;

              const startRatio = accBefore / circumference;
              const midRatio = startRatio + (dash / circumference) / 2;
              const midDeg = midRatio * 360 - 90;
              const rad = (midDeg * Math.PI) / 180;
              const explodePx = isHover ? 12 : isSelected ? 6 : 0;
              const dx = Math.cos(rad) * explodePx;
              const dy = Math.sin(rad) * explodePx;

              return (
                <g key={d.name || i} transform={`translate(${dx},${dy})`} style={{ transition: 'transform 180ms ease, opacity 220ms ease' }}>
                  <circle
                    r={radius}
                    fill="none"
                    stroke={colors[i % colors.length] || 'var(--accent)'}
                    strokeWidth={thickness}
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="butt"
                    onMouseEnter={(e) => { setHoverIndex(i); handleMouseMove(e, d, i); }}
                    onMouseMove={(e) => handleMouseMove(e, d, i)}
                    onMouseLeave={() => handleMouseLeave()}
                    onFocus={(e) => { setHoverIndex(i); const fake = { clientX: e.target.getBoundingClientRect().left + 8, clientY: e.target.getBoundingClientRect().top + 8 }; handleMouseMove(fake, d, i); }}
                    onBlur={() => handleMouseLeave()}
                    onClick={() => { setSelectedIndex(i); onSliceClick && onSliceClick(d, i); }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${d.name}: ${d.value}`}
                    style={{ cursor: 'pointer', transition: prefersReduced ? 'none' : 'stroke-dashoffset 700ms cubic-bezier(.22,.9,.3,1)' }}
                  />
                </g>
              );
            })}
          </g>
        </g>

        <circle cx={cx} cy={cy} r={Math.max(6, radius - thickness / 2)} fill="var(--card)" stroke="rgba(0,0,0,0.04)" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={Math.max(10, Math.floor(size * 0.055))} fill="var(--card-text)" fontWeight={700}>{displayValue}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={Math.max(9, Math.floor(size * 0.035))} fill="var(--muted)">{selectedIndex !== null ? data[selectedIndex]?.name : 'Total'}</text>
      </svg>

      {tooltip.visible && (
        <div className="pie-tooltip" style={{ position: 'absolute', left: tooltip.x, top: tooltip.y, pointerEvents: 'none', background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 12, whiteSpace: 'nowrap' }}>{tooltip.text}</div>
      )}
    </div>
  );
}
