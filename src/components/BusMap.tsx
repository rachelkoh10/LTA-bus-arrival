import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { BusRoute, BusStop, LiveBusVehicle } from '../types/bus';
import { SINGAPORE_BUS_ROUTES, MRT_LINE_COLORS, OPERATOR_INFO } from '../data/singaporeBusData';
import { Locate, Layers, Navigation } from 'lucide-react';

interface BusMapProps {
  stops: BusStop[];
  vehicles: LiveBusVehicle[];
  selectedStop: BusStop | null;
  selectedRoute: BusRoute | null;
  onSelectStop: (stop: BusStop) => void;
  onSelectVehicle?: (vehicle: LiveBusVehicle) => void;
  userCoords: [number, number] | null;
  activeFilterService: string | null;
}

export const BusMap: React.FC<BusMapProps> = ({
  stops,
  vehicles,
  selectedStop,
  selectedRoute,
  onSelectStop,
  onSelectVehicle,
  userCoords,
  activeFilterService,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const busMarkersMapRef = useRef<Map<string, L.Marker>>(new Map());

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center: Singapore Civic District / Bugis
    const initialLat = selectedStop ? selectedStop.latitude : 1.30064;
    const initialLng = selectedStop ? selectedStop.longitude : 103.85526;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: false,
    });

    // Sleek dark CartoDB tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Route Polyline & Selected Stop Pan
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !routeLayer) return;

    routeLayer.clearLayers();

    if (selectedRoute && selectedRoute.polyline.length > 0) {
      // Glow background line
      L.polyline(selectedRoute.polyline, {
        color: '#06b6d4',
        weight: 8,
        opacity: 0.35,
        lineCap: 'round',
      }).addTo(routeLayer);

      // Core route line
      const activeLine = L.polyline(selectedRoute.polyline, {
        color: '#38bdf8',
        weight: 4,
        opacity: 0.9,
        lineCap: 'round',
      }).addTo(routeLayer);

      // Fit bounds to route
      map.fitBounds(activeLine.getBounds(), { padding: [50, 50], maxZoom: 15 });
    }
  }, [selectedRoute]);

  // Center on Selected Stop
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedStop) return;

    map.flyTo([selectedStop.latitude, selectedStop.longitude], 16, {
      duration: 1.2,
    });
  }, [selectedStop]);

  // Render Stop Markers & Vehicle Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    busMarkersMapRef.current.clear();

    // 1. Render User Location if available
    if (userCoords) {
      const userIcon = L.divIcon({
        className: 'user-pin-icon',
        html: `
          <div style="position: relative; width: 24px; height: 24px;">
            <div style="position: absolute; inset: 0; background: rgba(56, 189, 248, 0.35); border-radius: 9999px; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; inset: 4px; background: #0284c7; border: 2.5px solid #ffffff; border-radius: 9999px; box-shadow: 0 0 10px rgba(56, 189, 248, 0.8);"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker(userCoords, { icon: userIcon, zIndexOffset: 200 })
        .bindTooltip('You are here', { direction: 'top', className: 'transit-tooltip' })
        .addTo(markersLayer);
    }

    // 2. Render Bus Stops
    stops.forEach((stop) => {
      const isSelected = selectedStop?.busStopCode === stop.busStopCode;
      const isConnectedToRoute = selectedRoute?.stops.some((s) => s.busStopCode === stop.busStopCode);

      const stopIcon = L.divIcon({
        className: 'bus-stop-icon',
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: ${isSelected ? '26px' : '20px'};
            height: ${isSelected ? '26px' : '20px'};
            background: ${isSelected ? '#38bdf8' : isConnectedToRoute ? '#0284c7' : '#1e293b'};
            border: 2px solid ${isSelected ? '#ffffff' : '#64748b'};
            border-radius: 9999px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.6);
            transition: transform 0.2s ease;
          ">
            <svg width="${isSelected ? '14' : '10'}" height="${isSelected ? '14' : '10'}" viewBox="0 0 24 24" fill="none" stroke="${isSelected ? '#0f172a' : '#f8fafc'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 6v6"></path>
              <path d="M15 6v6"></path>
              <path d="M2 12h19.6"></path>
              <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.2 6 18.2 6H5.8C4.8 6 3.9 6.8 3.6 7.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"></path>
              <circle cx="7" cy="18" r="2"></circle>
              <circle cx="17" cy="18" r="2"></circle>
            </svg>
          </div>
        `,
        iconSize: [isSelected ? 26 : 20, isSelected ? 26 : 20],
        iconAnchor: [isSelected ? 13 : 10, isSelected ? 13 : 10],
      });

      const stopMarker = L.marker([stop.latitude, stop.longitude], {
        icon: stopIcon,
        zIndexOffset: isSelected ? 150 : 50,
      });

      stopMarker.on('click', () => {
        onSelectStop(stop);
      });

      // Tooltip preview
      const mrtBadges = (stop.mrtConnections || [])
        .map((m) => {
          const c = MRT_LINE_COLORS[m] || { bg: '#475569', text: '#fff' };
          return `<span style="background:${c.bg}; color:${c.text}; font-size:9px; font-weight:700; padding:1px 4px; border-radius:3px; margin-right:3px;">${m}</span>`;
        })
        .join('');

      stopMarker.bindTooltip(
        `<div style="font-family:'Plus Jakarta Sans',sans-serif; text-align:left;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
            <strong style="color:#f8fafc; font-size:12px;">${stop.description}</strong>
            <span style="color:#94a3b8; font-size:10px; font-family:'JetBrains Mono';">${stop.busStopCode}</span>
          </div>
          <div style="color:#64748b; font-size:11px; margin-bottom:4px;">${stop.roadName}</div>
          <div>${mrtBadges}</div>
          <div style="color:#38bdf8; font-size:10px; margin-top:4px;">Services: ${stop.services.slice(0, 5).join(', ')}${stop.services.length > 5 ? '…' : ''}</div>
        </div>`,
        { direction: 'top', offset: [0, -10] }
      );

      stopMarker.addTo(markersLayer);
    });

    // 3. Render Live Moving Bus Vehicles
    const filteredVehicles = activeFilterService
      ? vehicles.filter((v) => v.serviceNo === activeFilterService)
      : vehicles;

    filteredVehicles.forEach((vehicle) => {
      const loadColor =
        vehicle.load === 'SEA'
          ? '#22c55e'
          : vehicle.load === 'SDA'
          ? '#f59e0b'
          : '#ef4444';

      const opInfo = OPERATOR_INFO[vehicle.operator] || { name: vehicle.operator, color: '#38bdf8' };

      const busIcon = L.divIcon({
        className: 'live-bus-vehicle-icon',
        html: `
          <div style="
            position: relative;
            display: inline-flex;
            align-items: center;
            background: #0f172a;
            border: 1.5px solid #38bdf8;
            border-radius: 8px;
            padding: 3px 6px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.8);
            cursor: pointer;
            white-space: nowrap;
          ">
            <div style="
              width: 7px;
              height: 7px;
              border-radius: 9999px;
              background-color: ${loadColor};
              margin-right: 5px;
              box-shadow: 0 0 6px ${loadColor};
            "></div>
            <span style="
              font-family: 'Plus Jakarta Sans', sans-serif;
              font-weight: 800;
              font-size: 11px;
              color: #f8fafc;
              letter-spacing: -0.02em;
            ">${vehicle.serviceNo}</span>
            <span style="
              font-size: 8px;
              font-weight: 700;
              color: #94a3b8;
              margin-left: 3px;
              padding: 0 2px;
              background: #1e293b;
              border-radius: 2px;
            ">${vehicle.busType}</span>
            
            <!-- Heading indicator arrow -->
            <div style="
              position: absolute;
              bottom: -5px;
              left: 50%;
              transform: translateX(-50%) rotate(${vehicle.heading}deg);
              width: 0; 
              height: 0; 
              border-left: 4px solid transparent;
              border-right: 4px solid transparent;
              border-top: 5px solid #38bdf8;
            "></div>
          </div>
        `,
        iconSize: [52, 26],
        iconAnchor: [26, 13],
      });

      const busMarker = L.marker([vehicle.lat, vehicle.lng], {
        icon: busIcon,
        zIndexOffset: 300,
      });

      busMarker.on('click', () => {
        if (onSelectVehicle) onSelectVehicle(vehicle);
      });

      const loadText =
        vehicle.load === 'SEA'
          ? 'Seats Available'
          : vehicle.load === 'SDA'
          ? 'Standing Available'
          : 'Limited Standing';

      busMarker.bindTooltip(
        `<div style="font-family:'Plus Jakarta Sans',sans-serif; text-align:left; min-width:180px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:4px; margin-bottom:6px;">
            <div style="display:flex; align-items:center; gap:5px;">
              <span style="font-size:14px; font-weight:800; color:#38bdf8;">Bus ${vehicle.serviceNo}</span>
              <span style="font-size:10px; font-family:'JetBrains Mono'; color:#cbd5e1;">(${vehicle.plateNumber})</span>
            </div>
            <span style="font-size:9px; color:${opInfo.color}; font-weight:700;">${vehicle.operator}</span>
          </div>
          <div style="font-size:11px; color:#94a3b8; margin-bottom:3px;">
            To: <span style="color:#f8fafc; font-weight:600;">${vehicle.destination}</span>
          </div>
          <div style="font-size:11px; color:#94a3b8; margin-bottom:3px;">
            Next: <span style="color:#e2e8f0;">${vehicle.nextStopName}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; font-size:10px;">
            <span style="color:${loadColor}; font-weight:700;">● ${loadText}</span>
            <span style="color:#94a3b8; font-family:'JetBrains Mono';">${vehicle.speedKmH} km/h · ${vehicle.acTempC}°C</span>
          </div>
        </div>`,
        { direction: 'top', offset: [0, -14] }
      );

      busMarker.addTo(markersLayer);
      busMarkersMapRef.current.set(vehicle.id, busMarker);
    });
  }, [stops, vehicles, selectedStop, selectedRoute, userCoords, activeFilterService, onSelectStop, onSelectVehicle]);

  // Handle re-center Singapore Downtown
  const handleRecenterSingapore = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([1.30064, 103.85526], 14, { duration: 0.8 });
  };

  // Handle re-center User
  const handleRecenterUser = () => {
    if (!mapInstanceRef.current || !userCoords) return;
    mapInstanceRef.current.flyTo(userCoords, 16, { duration: 0.8 });
  };

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Floating Controls */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        {userCoords && (
          <button
            onClick={handleRecenterUser}
            title="Recenter on My Location"
            className="p-2.5 bg-slate-900/90 hover:bg-slate-800 text-sky-400 border border-slate-700 rounded-xl shadow-lg backdrop-blur-md transition-colors"
          >
            <Locate className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={handleRecenterSingapore}
          title="Singapore City Centre"
          className="p-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl shadow-lg backdrop-blur-md transition-colors"
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 shadow-xl hidden sm:flex items-center gap-4">
        <span className="font-semibold text-slate-200">Load:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          <span className="text-[11px] text-slate-300">Seats (SEA)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
          <span className="text-[11px] text-slate-300">Standing (SDA)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
          <span className="text-[11px] text-slate-300">Full (LSD)</span>
        </div>
        <div className="w-px h-3 bg-slate-700" />
        <span className="text-[11px] text-sky-400 font-medium">
          {activeFilterService ? `Tracking Bus ${activeFilterService}` : `${vehicles.length} Live Buses on Map`}
        </span>
      </div>
    </div>
  );
};
