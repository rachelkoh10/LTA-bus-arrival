import React, { useState } from 'react';
import { BusStop, ServiceArrival, BusArrivalItem, LtaBusLoad, LtaBusType } from '../types/bus';
import { MRT_LINE_COLORS, OPERATOR_INFO } from '../data/singaporeBusData';
import { formatWaitTime, formatClockTimer } from '../services/ltaDataMall';
import {
  Clock,
  Bell,
  Star,
  MapPin,
  RefreshCw,
  Search,
  Layers,
  ChevronRight,
  Accessibility,
  Gauge,
  Sparkles,
} from 'lucide-react';

interface BusStopArrivalsProps {
  stop: BusStop;
  arrivals: ServiceArrival[];
  pinnedServices: string[];
  onTogglePinService: (serviceNo: string) => void;
  onSetAlarm: (serviceNo: string) => void;
  onViewRoute: (serviceNo: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated: Date;
  onToggleBookmarkStop: () => void;
  isStopBookmarked: boolean;
}

export const BusStopArrivals: React.FC<BusStopArrivalsProps> = ({
  stop,
  arrivals,
  pinnedServices,
  onTogglePinService,
  onSetAlarm,
  onViewRoute,
  onRefresh,
  isRefreshing,
  lastUpdated,
  onToggleBookmarkStop,
  isStopBookmarked,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  // Sort: pinned services first, then numerical/alphabetical
  const filteredArrivals = arrivals
    .filter((arr) => {
      if (!filterQuery) return true;
      const q = filterQuery.toLowerCase();
      return (
        arr.serviceNo.toLowerCase().includes(q) ||
        (arr.destinationDescription && arr.destinationDescription.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const aPinned = pinnedServices.includes(a.serviceNo);
      const bPinned = pinnedServices.includes(b.serviceNo);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return a.serviceNo.localeCompare(b.serviceNo, undefined, { numeric: true });
    });

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Bus Stop Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/80 tabular-nums">
                {stop.busStopCode}
              </span>
              <span className="text-xs text-slate-400">{stop.roadName}</span>
              {stop.distanceMeters !== undefined && (
                <span className="text-xs text-slate-400 font-mono">
                  · {stop.distanceMeters > 1000 ? `${(stop.distanceMeters / 1000).toFixed(1)}km` : `${stop.distanceMeters}m`} away
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              {stop.description}
            </h2>

            {/* MRT Interchange badges */}
            {stop.mrtConnections && stop.mrtConnections.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-xs text-slate-400 font-medium">MRT:</span>
                {stop.mrtConnections.map((mrt) => {
                  const info = MRT_LINE_COLORS[mrt] || { bg: '#334155', text: '#fff', name: mrt };
                  return (
                    <span
                      key={mrt}
                      style={{ backgroundColor: info.bg, color: info.text }}
                      className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider shadow-sm"
                      title={info.name}
                    >
                      {mrt}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onToggleBookmarkStop}
              title={isStopBookmarked ? 'Remove Bookmark' : 'Bookmark Bus Stop'}
              className={`p-2 rounded-xl border transition-colors ${
                isStopBookmarked
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Star className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh Arrivals"
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-sky-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter bar & Live sync meta */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter bus service (e.g. 190, 65)..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div className="text-[11px] text-slate-400 shrink-0 tabular-nums">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Arrival Services List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2 sm:p-3 space-y-2">
        {filteredArrivals.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No bus services matching &quot;{filterQuery}&quot; at this stop.
          </div>
        ) : (
          filteredArrivals.map((arrival) => {
            const isPinned = pinnedServices.includes(arrival.serviceNo);
            const opInfo = OPERATOR_INFO[arrival.operator] || { name: arrival.operator, color: '#38bdf8' };

            return (
              <div
                key={arrival.serviceNo}
                className={`p-3 sm:p-4 rounded-xl border transition-all ${
                  isPinned
                    ? 'bg-slate-800/80 border-sky-500/30 shadow-md'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Service Header Row */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl sm:text-2xl font-extrabold text-slate-50 tracking-tight font-mono">
                      {arrival.serviceNo}
                    </span>
                    <span
                      style={{ color: opInfo.color }}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700"
                    >
                      {arrival.operator}
                    </span>
                    {arrival.destinationDescription && (
                      <span className="text-xs text-slate-400 truncate max-w-[160px] sm:max-w-[240px]">
                        to {arrival.destinationDescription}
                      </span>
                    )}
                  </div>

                  {/* Actions: Pin, Alarm, View Route */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onTogglePinService(arrival.serviceNo)}
                      title={isPinned ? 'Unpin Service' : 'Pin Service to Top'}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isPinned
                          ? 'bg-sky-500/20 border-sky-500/40 text-sky-400'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      onClick={() => onSetAlarm(arrival.serviceNo)}
                      title="Set Arrival Chime / Alert"
                      className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-400 hover:text-amber-400 transition-colors"
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onViewRoute(arrival.serviceNo)}
                      title="View Full Route & Stops"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] font-medium text-slate-300 hover:text-sky-400 hover:border-sky-500/40 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Route</span>
                    </button>
                  </div>
                </div>

                {/* 3 Arrival Predictions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* NextBus 1 (Primary Arriving Bus) */}
                  <ArrivalBusCard
                    bus={arrival.nextBus}
                    isNext
                    title="Next Bus"
                  />

                  {/* NextBus 2 */}
                  <ArrivalBusCard
                    bus={arrival.nextBus2}
                    title="2nd Bus"
                  />

                  {/* NextBus 3 */}
                  <ArrivalBusCard
                    bus={arrival.nextBus3}
                    title="3rd Bus"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// Sub-card representing one arriving bus (NextBus, NextBus2, NextBus3)
interface ArrivalBusCardProps {
  bus: BusArrivalItem | null;
  isNext?: boolean;
  title: string;
}

const ArrivalBusCard: React.FC<ArrivalBusCardProps> = ({ bus, isNext, title }) => {
  if (!bus) {
    return (
      <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/50 flex flex-col justify-center items-center text-center">
        <span className="text-[10px] text-slate-400 mb-1">{title}</span>
        <span className="text-xs text-slate-500 font-mono">Not Operating</span>
      </div>
    );
  }

  const { label, subLabel, isArriving } = formatWaitTime(bus.secondsRemaining);

  const loadBadge = getLoadDetails(bus.load);
  const deckBadge = getDeckDetails(bus.type);

  return (
    <div
      className={`p-2.5 rounded-lg border flex flex-col justify-between ${
        isNext
          ? 'bg-slate-950/70 border-slate-700 shadow-sm'
          : 'bg-slate-950/40 border-slate-800/70'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{title}</span>
        {bus.plateNumber && (
          <span className="text-[10px] font-mono text-slate-400">{bus.plateNumber}</span>
        )}
      </div>

      {/* Main Countdown & Exact Timer */}
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-2xl font-extrabold font-mono tabular-nums tracking-tight ${
              isArriving ? 'text-emerald-400 animate-pulse' : 'text-slate-100'
            }`}
          >
            {label}
          </span>
          <span className="text-[11px] text-slate-400">{subLabel}</span>
        </div>

        <span className="text-[11px] font-mono tabular-nums text-slate-400">
          {formatClockTimer(bus.secondsRemaining)}
        </span>
      </div>

      {/* Badges: Load status + Deck Type + WAB */}
      <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60 text-[10px]">
        {/* Load Status */}
        <div className="flex items-center gap-1.5" title={loadBadge.tooltip}>
          <span
            style={{ backgroundColor: loadBadge.dotColor }}
            className="w-2 h-2 rounded-full shrink-0 shadow-sm"
          />
          <span style={{ color: loadBadge.textColor }} className="font-semibold">
            {loadBadge.shortLabel}
          </span>
        </div>

        {/* Deck & Wheelchair */}
        <div className="flex items-center gap-1.5">
          <span
            className="px-1.5 py-0.2 rounded font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700 text-[10px]"
            title={deckBadge.tooltip}
          >
            {bus.type}
          </span>

          {bus.feature === 'WAB' && (
            <span
              className="text-sky-400"
              title="Wheelchair Accessible Bus"
            >
              <Accessibility className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

function getLoadDetails(load: LtaBusLoad) {
  switch (load) {
    case 'SEA':
      return {
        shortLabel: 'Seats Available',
        dotColor: '#22c55e',
        textColor: '#4ade80',
        tooltip: 'Seats Available (SEA) - Light passenger volume',
      };
    case 'SDA':
      return {
        shortLabel: 'Standing Only',
        dotColor: '#f59e0b',
        textColor: '#fbbf24',
        tooltip: 'Standing Available (SDA) - Moderate passenger volume',
      };
    case 'LSD':
      return {
        shortLabel: 'Crowded',
        dotColor: '#ef4444',
        textColor: '#f87171',
        tooltip: 'Limited Standing (LSD) - Heavy passenger volume',
      };
    default:
      return {
        shortLabel: 'Seats Available',
        dotColor: '#22c55e',
        textColor: '#4ade80',
        tooltip: 'Seats Available',
      };
  }
}

function getDeckDetails(type: LtaBusType) {
  switch (type) {
    case 'SD':
      return { label: 'Single Deck', tooltip: 'Single Deck Bus' };
    case 'DD':
      return { label: 'Double Deck', tooltip: 'Double Deck Bus (High Capacity)' };
    case 'BD':
      return { label: 'Bendy', tooltip: 'Articulated / Bendy Bus' };
    default:
      return { label: 'Single Deck', tooltip: 'Single Deck Bus' };
  }
}
