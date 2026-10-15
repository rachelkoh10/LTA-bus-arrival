import React from 'react';
import { BusRoute, BusStop, LiveBusVehicle } from '../types/bus';
import { MRT_LINE_COLORS, OPERATOR_INFO } from '../data/singaporeBusData';
import { X, ArrowRight, Clock, MapPin, Gauge, Bus, Info } from 'lucide-react';

interface RouteViewerProps {
  route: BusRoute;
  liveVehicles: LiveBusVehicle[];
  onClose: () => void;
  onSelectStopCode: (stopCode: string) => void;
  currentStopCode?: string;
}

export const RouteViewer: React.FC<RouteViewerProps> = ({
  route,
  liveVehicles,
  onClose,
  onSelectStopCode,
  currentStopCode,
}) => {
  const routeVehicles = liveVehicles.filter((v) => v.serviceNo === route.serviceNo);
  const opInfo = OPERATOR_INFO[route.operator] || { name: route.operator, color: '#38bdf8' };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
      {/* Route Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-extrabold text-slate-100 font-mono tracking-tight">
              {route.serviceNo}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span
                  style={{ color: opInfo.color }}
                  className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700"
                >
                  {route.operator}
                </span>
                <span className="text-xs text-slate-400 font-medium">{route.category}</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Frequency: <span className="text-slate-200 font-semibold">{route.frequency}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Origin to Destination */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-200 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 mt-2">
          <span className="font-semibold truncate">{route.origin}</span>
          <ArrowRight className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="font-semibold truncate text-sky-400">{route.destination}</span>
        </div>

        {/* Timetable meta */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>First Bus: <strong className="text-slate-200 font-mono">{route.firstBus}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Last Bus: <strong className="text-slate-200 font-mono">{route.lastBus}</strong></span>
          </div>
        </div>
      </div>

      {/* Active fleet summary banner */}
      <div className="px-4 py-2 bg-sky-950/40 border-b border-sky-900/40 text-xs text-sky-300 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Bus className="w-3.5 h-3.5 text-sky-400" />
          <span>{routeVehicles.length} buses currently operating along this line</span>
        </div>
        <span className="text-[10px] text-sky-400/80 font-mono">Live GPS feed</span>
      </div>

      {/* Vertical Subway / Route Progression Diagram */}
      <div className="flex-1 overflow-y-auto p-4 space-y-0 relative">
        {route.stops.map((stop, idx) => {
          const isSelected = stop.busStopCode === currentStopCode;
          const isTerminus = idx === route.stops.length - 1;
          const isOrigin = idx === 0;

          // Check if any vehicle is heading toward or at this stop
          const busesAtStop = routeVehicles.filter((v) => v.nextStopCode === stop.busStopCode);

          return (
            <div
              key={stop.busStopCode}
              className={`relative flex items-start gap-3.5 group cursor-pointer transition-colors p-2 rounded-xl ${
                isSelected ? 'bg-sky-500/10 border border-sky-500/30' : 'hover:bg-slate-800/50'
              }`}
              onClick={() => onSelectStopCode(stop.busStopCode)}
            >
              {/* Vertical line connection */}
              {!isTerminus && (
                <div
                  className="absolute left-[23px] top-[26px] bottom-[-10px] w-0.5 bg-slate-700 group-hover:bg-sky-500/60 transition-colors z-0"
                />
              )}

              {/* Stop node circle */}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold border transition-transform ${
                    isSelected
                      ? 'bg-sky-500 text-slate-950 border-white scale-110 shadow-lg shadow-sky-500/50'
                      : isOrigin || isTerminus
                      ? 'bg-slate-100 text-slate-950 border-slate-300'
                      : 'bg-slate-900 text-slate-300 border-slate-600 group-hover:border-sky-400'
                  }`}
                >
                  {stop.stopSequence}
                </div>
              </div>

              {/* Stop Information */}
              <div className="flex-1 min-w-0 pb-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h4
                    className={`text-sm font-semibold truncate ${
                      isSelected ? 'text-sky-300' : 'text-slate-100 group-hover:text-sky-400'
                    }`}
                  >
                    {stop.description}
                  </h4>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                    {stop.distanceKm.toFixed(1)} km
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-slate-400">{stop.roadName}</span>
                  <span className="text-[10px] font-mono text-slate-400">· {stop.busStopCode}</span>
                </div>

                {/* MRT interchanges */}
                {stop.mrtConnections && stop.mrtConnections.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5">
                    {stop.mrtConnections.map((mrt) => {
                      const mInfo = MRT_LINE_COLORS[mrt] || { bg: '#334155', text: '#fff' };
                      return (
                        <span
                          key={mrt}
                          style={{ backgroundColor: mInfo.bg, color: mInfo.text }}
                          className="px-1.5 py-0.2 rounded text-[9px] font-bold"
                        >
                          {mrt}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Real-time bus pin positioned at this stop */}
                {busesAtStop.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {busesAtStop.map((b) => (
                      <div
                        key={b.id}
                        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-sky-950 border border-sky-500/40 text-xs text-sky-200 shadow-sm"
                      >
                        <Bus className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                        <span className="font-semibold">Bus {b.serviceNo}</span>
                        <span className="font-mono text-[10px] text-slate-400">({b.plateNumber})</span>
                        <span className="text-emerald-400 font-medium text-[11px]">
                          ~{Math.max(1, Math.round(b.secondsToNextStop / 60))} min away
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
