import React, { useState } from 'react';
import { BusStop } from '../types/bus';
import { MRT_LINE_COLORS } from '../data/singaporeBusData';
import { Search, MapPin, Star, Navigation, Compass, ArrowUpRight } from 'lucide-react';

interface SearchHubProps {
  stops: BusStop[];
  onSelectStop: (stop: BusStop) => void;
  selectedStopCode?: string;
  bookmarkedStopCodes: string[];
  userCoords: [number, number] | null;
  onRequestGeolocation: () => void;
  isLocating: boolean;
}

const REGIONS = [
  'All',
  'Orchard',
  'Bugis / Rochor',
  'City Hall',
  'Marina Bay',
  'Chinatown',
  'HarbourFront',
  'Jurong East',
  'Tampines',
  'Bedok',
  'Woodlands',
  'Changi Airport',
];

export const SearchHub: React.FC<SearchHubProps> = ({
  stops,
  onSelectStop,
  selectedStopCode,
  bookmarkedStopCodes,
  userCoords,
  onRequestGeolocation,
  isLocating,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');

  // Filter logic
  const filteredStops = stops.filter((stop) => {
    if (activeTab === 'favorites' && !bookmarkedStopCodes.includes(stop.busStopCode)) {
      return false;
    }

    if (selectedRegion !== 'All' && !stop.zone.toLowerCase().includes(selectedRegion.toLowerCase())) {
      return false;
    }

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    const matchCode = stop.busStopCode.includes(q);
    const matchDesc = stop.description.toLowerCase().includes(q);
    const matchRoad = stop.roadName.toLowerCase().includes(q);
    const matchService = stop.services.some((s) => s.toLowerCase() === q || s.toLowerCase().startsWith(q));

    return matchCode || matchDesc || matchRoad || matchService;
  });

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Search Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-sky-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Stops ({stops.length})
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'favorites'
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>Saved ({bookmarkedStopCodes.length})</span>
            </button>
          </div>

          <button
            onClick={onRequestGeolocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-950/80 border border-sky-800/80 text-xs font-semibold text-sky-300 hover:bg-sky-900/60 transition-colors disabled:opacity-50"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>Near Me</span>
          </button>
        </div>

        {/* Search Input Box */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search stop code (01012), road, landmark, or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Region Filter Chips */}
        {activeTab === 'all' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 no-scrollbar text-xs">
            {REGIONS.map((region) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                  selectedRegion === region
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
        {filteredStops.length === 0 ? (
          <div className="py-16 text-center text-slate-400 px-4">
            {activeTab === 'favorites' ? (
              <div className="space-y-2">
                <Star className="w-8 h-8 text-amber-500/40 mx-auto" />
                <p className="text-sm font-medium text-slate-300">No saved bus stops yet</p>
                <p className="text-xs text-slate-400">
                  Tap the star icon on any bus stop to bookmark your frequent commutes.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-300 font-medium">No bus stops found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Try searching with a 5-digit code like &quot;01012&quot;, &quot;09048&quot;, or a road name like &quot;Orchard&quot;.
                </p>
              </div>
            )}
          </div>
        ) : (
          filteredStops.map((stop) => {
            const isSelected = stop.busStopCode === selectedStopCode;
            const isBookmarked = bookmarkedStopCodes.includes(stop.busStopCode);

            return (
              <button
                key={stop.busStopCode}
                onClick={() => onSelectStop(stop)}
                className={`w-full text-left p-3 rounded-xl transition-all flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'bg-sky-950/60 border border-sky-500/40 shadow-sm'
                    : 'hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700 tabular-nums">
                      {stop.busStopCode}
                    </span>
                    <span className="text-xs text-slate-400 truncate">{stop.roadName}</span>
                    {isBookmarked && (
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 truncate">
                    {stop.description}
                  </h3>

                  {/* Services pills */}
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    {stop.services.slice(0, 7).map((srv) => (
                      <span
                        key={srv}
                        className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60"
                      >
                        {srv}
                      </span>
                    ))}
                    {stop.services.length > 7 && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        +{stop.services.length - 7} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 text-right space-y-1">
                  {stop.distanceMeters !== undefined && (
                    <span className="font-mono text-xs font-bold text-sky-400 tabular-nums">
                      {stop.distanceMeters > 1000
                        ? `${(stop.distanceMeters / 1000).toFixed(1)}km`
                        : `${stop.distanceMeters}m`}
                    </span>
                  )}

                  {/* MRT badges */}
                  {stop.mrtConnections && stop.mrtConnections.length > 0 && (
                    <div className="flex items-center gap-1">
                      {stop.mrtConnections.map((m) => {
                        const mColor = MRT_LINE_COLORS[m] || { bg: '#334155', text: '#fff' };
                        return (
                          <span
                            key={m}
                            style={{ backgroundColor: mColor.bg, color: mColor.text }}
                            className="px-1.5 py-0.2 rounded text-[8px] font-bold"
                          >
                            {m}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-400" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
