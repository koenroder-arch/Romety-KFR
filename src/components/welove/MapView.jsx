import React, { useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function FlyToHandler({ flyToRef, onMapClick }) {
  const map = useMap();
  useEffect(() => {
    if (flyToRef) {
      flyToRef.current = (lat, lng, zoom = 15, options = {}) => {
        try {
          const targetZoom = zoom != null ? zoom : (map.getZoom() || 10);
          // Vertical offset so target marker is centered in visible area above bottom sheet peek
          const offsetY = options.offsetY !== undefined ? options.offsetY : Math.round(window.innerHeight * 0.18);
          if (offsetY !== 0) {
            const targetPoint = map.project([lat, lng], targetZoom);
            const newCenterPoint = targetPoint.add([0, offsetY]);
            const newCenterLatLng = map.unproject(newCenterPoint, targetZoom);
            map.flyTo(newCenterLatLng, targetZoom, { animate: true, duration: options.duration || 1.2 });
          } else {
            map.flyTo([lat, lng], targetZoom, { animate: true, duration: options.duration || 1.2 });
          }
        } catch (e) {
          map.flyTo([lat, lng], zoom, { animate: true, duration: 1.2 });
        }
      };
    }
    if (onMapClick) {
      map.on('click', onMapClick);
      return () => map.off('click', onMapClick);
    }
  }, [map, onMapClick]);
  return null;
}

function InitialViewHandler({ initialCenter = [52.3676, 4.9041], initialZoom = 7 }) {
  const map = useMap();
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      try {
        const offsetY = Math.round(window.innerHeight * 0.18);
        const targetPoint = map.project(initialCenter, initialZoom);
        const newCenterPoint = targetPoint.add([0, offsetY]);
        const newCenterLatLng = map.unproject(newCenterPoint, initialZoom);
        map.setView(newCenterLatLng, initialZoom);
      } catch (e) {
        map.setView(initialCenter, initialZoom);
      }
    }
  }, [map, initialCenter, initialZoom]);
  return null;
}

function ResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
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
  html: `<div style="display:flex;flex-direction:column;align-items:center;"><div class="search-pin-bounce" style="background:linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%);width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 4px 16px rgba(255,75,114,0.6);"></div></div>`,
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -14],
});

const MapView = forwardRef(function MapView({ venues, searchPin, myCheckIn, onVenueClick, onMapClick, highlightedVenueId, myDestination }, ref) {
  const flyToRef = useRef(null);

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, zoom, options) => flyToRef.current && flyToRef.current(lat, lng, zoom, options),
  }));

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

        <InitialViewHandler initialCenter={[52.3676, 4.9041]} initialZoom={7} />
        <FlyToHandler flyToRef={flyToRef} onMapClick={onMapClick} />
        <ResizeHandler />

        {searchPin && searchPin.lat && searchPin.lng && (
          <Marker 
            key={`search-${searchPin.lat}-${searchPin.lng}`}
            position={[searchPin.lat, searchPin.lng]} 
            icon={pinIcon}
          >
            <Popup>
              <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '13px' }}>
                {searchPin.label} 📍
              </span>
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