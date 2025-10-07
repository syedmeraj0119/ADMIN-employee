import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function GlobalMap({ locations = [], width = '100%', height = 320 }){
  // center roughly at 20,0 and adjust zoom to show global
  const center = [20, 0];

  // ensure the leaflet CSS is present (for some build pipelines)
  useEffect(() => {
    // nothing required; CSS imported above
  }, []);

  return (
    <div className="global-map bg-white rounded border p-1" style={{ minHeight: `${height}px` }}>
      <div className="text-sm font-semibold mb-2 px-3">Global travel map</div>
      <div style={{ width: width, height: height }}>
        <MapContainer center={center} zoom={2} scrollWheelZoom={false} style={{ width: '100%', height: '100%', borderRadius: 8 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {(locations || []).map((loc) => (
            <CircleMarker key={loc.id} center={[loc.lat, loc.lng]} radius={6 + Math.min(12, Math.log((loc.count||1)+1) * 3)} pathOptions={{ color: loc.color || '#7c3aed', fillOpacity: 0.92, weight: 1 }}>
              <Popup>
                <div style={{minWidth:160}}>
                  <div style={{fontWeight:700}}>{loc.label}</div>
                  <div className="text-sm text-muted">{loc.count || 0} trips</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <div className="mt-2 text-xs text-gray-500 px-3">Interactive OpenStreetMap tiles — pan & zoom enabled.</div>
    </div>
  );
}
