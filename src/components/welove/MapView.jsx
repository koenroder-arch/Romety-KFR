import React, { useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function FlyToHandler({ flyToRef, onMapClick }) {
  const map = useMap();
  useEffect(() => {
    if (flyToRef) {
      flyToRef.current = (lat, lng, zoom = 15) => {
        map.flyTo([lat, lng], zoom, { animate: true, duration: 1.2 });
      };
    }
    if (onMapClick) {
      map.on('click', onMapClick);
      return () => map.off('click', onMapClick);
    }
  }, [map, onMapClick]);
  return null;
}

function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 15, { animate: true });
  }, [position]);
  return null;
}

const getFlames = (destCount) => {
  if (destCount >= 10) return '🔥🔥🔥';
  if (destCount >= 4) return '🔥🔥';
  if (destCount >= 1) return '🔥';
  return '';
};

const createVenueIcon = (count, isMyVenue, isHighlighted, isMyDestination, destCount = 0) => {
  const bg = isMyDestination ? '#10b981' : isMyVenue ? '#10b981' : '#A061FF';
  const glow = isMyDestination
    ? '0 0 0 8px rgba(16,185,129,0.3), 0 4px 16px rgba(0,0,0,0.3)'
    : isHighlighted ? '0 0 0 6px rgba(160,97,255,0.4), 0 4px 16px rgba(160,97,255,0.4)' : '0 0 0 4px rgba(160,97,255,0.2), 0 2px 10px rgba(0,0,0,0.4)';
  const size = isHighlighted || isMyDestination ? 48 : 40;
  const anchor = size / 2;
  const flames = getFlames(destCount);
  const flameHtml = flames ? `<div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-size:11px;line-height:1;white-space:nowrap;">${flames}</div>` : '';
  return L.divIcon({
    html: `<div style="position:relative;display:inline-flex;flex-direction:column;align-items:center;">${flameHtml}<div style="background:${bg}; color:white; border-radius:50%; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px; box-shadow:${glow}; border:3px solid white; transition:all 0.3s;">${isMyDestination ? '📍' : count}</div></div>`,
    className: '',
    iconSize: [size, size + (flames ? 16 : 0)],
    iconAnchor: [anchor, anchor + (flames ? 16 : 0)],
    popupAnchor: [0, -25],
  });
};

const createPinIcon = () => L.divIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;"><div class="search-pin-bounce" style="background:#FF6B4A;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 4px 14px rgba(255,107,74,0.6);"></div></div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const MapView = forwardRef(function MapView({ venues, userPosition, myCheckIn, onVenueClick, onMapClick, highlightedVenueId, searchPin, myDestination }, ref) {
  const flyToRef = useRef(null);

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, zoom) => flyToRef.current && flyToRef.current(lat, lng, zoom),
  }));

  const userIcon = useMemo(() => L.divIcon({
    html: `<div style="background:#A061FF; border-radius:50%; width:16px; height:16px; border:3px solid white; box-shadow:0 0 0 5px rgba(160,97,255,0.3);"></div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  }), []);

  const pinIcon = useMemo(() => createPinIcon(), []);

  return (
    <>
      <style>{`
        @keyframes searchPinBounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-16px);
          }
        }
        .search-pin-bounce {
          animation: searchPinBounce 0.5s ease-out 2;
        }
      `}</style>
      <MapContainer
        center={[52.3676, 4.9041]}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FlyToHandler flyToRef={flyToRef} onMapClick={onMapClick} />

        {userPosition && (
          <>
            <RecenterMap position={userPosition} />
            <Marker position={userPosition} icon={userIcon}>
              <Popup><span style={{ fontFamily: 'Inter', fontWeight: 600 }}>Je bent hier 📍</span></Popup>
            </Marker>
          </>
        )}

        {searchPin && (
          <Marker 
            key={`${searchPin.lat}-${searchPin.lng}`}
            position={[searchPin.lat, searchPin.lng]} 
            icon={pinIcon}
          >
            <Popup>
              <span style={{ fontFamily: 'Inter', fontWeight: 600 }}>{searchPin.label}</span>
            </Popup>
          </Marker>
        )}

        {venues.map(v => (
          <Marker
            key={v.id}
            position={[v.lat, v.lng]}
            icon={createVenueIcon(v.matchCount, myCheckIn?.venue_id === v.id, highlightedVenueId === v.id, myDestination?.venue_id === v.id || myDestination?.venue_name === v.name, v.destCount || 0)}
            eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); onVenueClick && onVenueClick(v); } }}
          />
        ))}
      </MapContainer>
    </>
  );
});

export default MapView;