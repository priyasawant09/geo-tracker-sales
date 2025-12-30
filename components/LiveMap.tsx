
import React, { useEffect, useRef } from 'react';
import { User } from '../types';
import L from 'leaflet';
import { TERRITORY_RADIUS_METERS } from '../constants';

interface LiveMapProps {
  users: User[];
  height?: number;
}

const LiveMap: React.FC<LiveMapProps> = ({ users, height = 400 }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const circlesRef = useRef<{ [key: string]: L.Circle }>({});

  // Initialize Map
  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      // Create map instance centered in Mumbai
      const map = L.map(mapRef.current).setView([19.0760, 72.8777], 11);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      mapInstance.current = map;
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markersRef.current = {};
        circlesRef.current = {};
      }
    };
  }, []);

  // Update Markers and Circles
  useEffect(() => {
    if (!mapInstance.current) return;

    const map = mapInstance.current;
    const currentIds = new Set(users.map(u => u.id));

    // Cleanup old markers and circles
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
        if (circlesRef.current[id]) {
          circlesRef.current[id].remove();
          delete circlesRef.current[id];
        }
      }
    });

    users.forEach(user => {
      // Territory Circle Rendering
      if (user.territoryCenter) {
        const { lat, lng } = user.territoryCenter;
        
        if (circlesRef.current[user.id]) {
          circlesRef.current[user.id].setLatLng([lat, lng]);
        } else {
          const circle = L.circle([lat, lng], {
            radius: TERRITORY_RADIUS_METERS,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 1,
            dashArray: '5, 5'
          }).addTo(map);
          circlesRef.current[user.id] = circle;
        }
      }

      // User Marker Rendering
      if (!user.currentLocation) return;
      const { lat, lng } = user.currentLocation;
      
      let color = '#3b82f6';
      if (user.status === 'active') color = '#22c55e';
      if (user.status === 'idle') color = '#eab308';
      if (user.status === 'offline') color = '#94a3b8';

      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="
            background-color: ${color};
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <img src="${user.avatar}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" />
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      if (markersRef.current[user.id]) {
        const marker = markersRef.current[user.id];
        marker.setLatLng([lat, lng]);
        marker.setIcon(customIcon);
        marker.setPopupContent(`
          <div class="p-1">
            <strong class="block text-sm font-bold text-gray-800">${user.name}</strong>
            <span class="text-[10px] text-gray-500 uppercase font-bold">${user.department}</span>
            <span class="block text-[10px] mt-1 font-black ${user.status === 'active' ? 'text-green-500' : 'text-slate-400'} uppercase">${user.status}</span>
          </div>
        `);
      } else {
        const marker = L.marker([lat, lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-1">
              <strong class="block text-sm font-bold text-gray-800">${user.name}</strong>
              <span class="text-[10px] text-gray-500 uppercase font-bold">${user.department}</span>
              <span class="block text-[10px] mt-1 font-black ${user.status === 'active' ? 'text-green-500' : 'text-slate-400'} uppercase">${user.status}</span>
            </div>
          `);
        
        markersRef.current[user.id] = marker;
      }
    });

    if (users.length > 0 && map) {
       // We only fit bounds initially or when markers are significantly far
       const group = L.featureGroup([...Object.values(markersRef.current), ...Object.values(circlesRef.current)]);
       if (group.getLayers().length > 0) {
         map.fitBounds(group.getBounds().pad(0.1), { animate: true });
       }
    }
  }, [users]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} className="bg-slate-100" />
      <div className="absolute top-4 right-4 z-[400] bg-white/90 backdrop-blur p-2.5 rounded-xl shadow-md border border-slate-100">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b pb-1">Map Legend</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 border border-white"></span> <span className="text-[9px] font-bold uppercase">Active</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 border border-white"></span> <span className="text-[9px] font-bold uppercase">Idle</span></div>
          <div className="flex items-center gap-1.5 border-t pt-1 mt-1"><span className="w-3 h-3 border border-dashed border-blue-500 bg-blue-500/10"></span> <span className="text-[9px] font-bold uppercase">10KM Territory</span></div>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
