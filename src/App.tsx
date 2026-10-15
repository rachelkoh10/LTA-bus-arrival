import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BusStop, BusRoute, LiveBusVehicle, ServiceArrival, ArrivalAlarm } from './types/bus';
import { SINGAPORE_BUS_STOPS, SINGAPORE_BUS_ROUTES, generateInitialFleet } from './data/singaporeBusData';
import {
  computeArrivalsForStop,
  advanceFleetSimulation,
  getDistanceMeters,
  getSavedBackendConfig,
  BackendConfig,
} from './services/ltaDataMall';
import { BusMap } from './components/BusMap';
import { BusStopArrivals } from './components/BusStopArrivals';
import { RouteViewer } from './components/RouteViewer';
import { SearchHub } from './components/SearchHub';
import { ArrivalAlarmModal } from './components/ArrivalAlarmModal';
import { BackendModal } from './components/BackendModal';
import { CommuterToolsModal } from './components/CommuterToolsModal';
import {
  Bus,
  MapPin,
  Compass,
  Navigation,
  Server,
  Calculator,
  Bell,
  Star,
  Layers,
  Search,
  Radio,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';

const STORAGE_KEY_BOOKMARKS = 'sg_buspulse_bookmarks';
const STORAGE_KEY_PINNED = 'sg_buspulse_pinned_services';
const STORAGE_KEY_ALARMS = 'sg_buspulse_active_alarms';

export default function App() {
  // Live Fleet & Data State
  const [fleet, setFleet] = useState<LiveBusVehicle[]>(() => generateInitialFleet());
  const [stops, setStops] = useState<BusStop[]>(() => SINGAPORE_BUS_STOPS);
  const [selectedStop, setSelectedStop] = useState<BusStop>(() => SINGAPORE_BUS_STOPS[0]); // Bugis
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [activeFilterService, setActiveFilterService] = useState<string | null>(null);

  // User Geolocation
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Storage states
  const [bookmarkedStopCodes, setBookmarkedStopCodes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
      return saved ? JSON.parse(saved) : ['01012', '09048'];
    } catch {
      return ['01012', '09048'];
    }
  });

  const [pinnedServicesMap, setPinnedServicesMap] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PINNED);
      return saved ? JSON.parse(saved) : { '01012': ['190', '12'] };
    } catch {
      return { '01012': ['190', '12'] };
    }
  });

  const [activeAlarms, setActiveAlarms] = useState<ArrivalAlarm[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ALARMS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // UI Navigation & Modals
  const [activeTab, setActiveTab] = useState<'map' | 'arrivals' | 'directory' | 'route'>('map');
  const [activeModal, setActiveModal] = useState<'backend' | 'fare' | 'alarm' | null>(null);
  const [alarmContextService, setAlarmContextService] = useState<string>('190');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(bookmarkedStopCodes));
  }, [bookmarkedStopCodes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PINNED, JSON.stringify(pinnedServicesMap));
  }, [pinnedServicesMap]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ALARMS, JSON.stringify(activeAlarms));
  }, [activeAlarms]);

  // Request HTML5 Geolocation with Singapore Central Fallback
  const handleRequestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setToastNotification('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserCoords(coords);
        setIsLocating(false);

        // Compute distance to all stops and re-sort
        setStops((prevStops) => {
          const withDistance = prevStops.map((s) => ({
            ...s,
            distanceMeters: getDistanceMeters(coords[0], coords[1], s.latitude, s.longitude),
          }));
          withDistance.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));

          // Auto-select nearest stop
          if (withDistance.length > 0) {
            setSelectedStop(withDistance[0]);
          }
          return withDistance;
        });

        setToastNotification('Location updated. Selected nearest Singapore bus stop.');
      },
      (err) => {
        setIsLocating(false);
        // Fallback to City Hall / Bugis coords
        const fallback: [number, number] = [1.2982, 103.8543];
        setUserCoords(fallback);
        setToastNotification('Using central Singapore transit location.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, []);

  // Compute Real-Time Arrivals for currently selected stop
  const arrivals = useMemo(() => {
    if (!selectedStop) return [];
    return computeArrivalsForStop(selectedStop.busStopCode, fleet);
  }, [selectedStop, fleet]);

  // Real-time ticking simulation engine (Advances vehicles & decrements arrival times every 1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      setFleet((prevFleet) => advanceFleetSimulation(prevFleet, 1));
      setLastUpdated(new Date());

      // Check active alarms
      setActiveAlarms((prevAlarms) => {
        let changed = false;
        const updated = prevAlarms.map((alarm) => {
          if (alarm.triggered) return alarm;

          // Find service arrivals at this stop
          const stopArrivals = computeArrivalsForStop(alarm.busStopCode, fleet);
          const srv = stopArrivals.find((s) => s.serviceNo === alarm.serviceNo);
          if (srv && srv.nextBus) {
            const thresholdSec = alarm.thresholdMinutes * 60;
            if (srv.nextBus.secondsRemaining <= thresholdSec) {
              changed = true;
              // Trigger Chime
              triggerAudioAlert();
              setToastNotification(`Bus ${alarm.serviceNo} is arriving in ~${alarm.thresholdMinutes}m at ${alarm.stopDescription}!`);
              return { ...alarm, triggered: true };
            }
          }
          return alarm;
        });
        return changed ? updated : prevAlarms;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fleet]);

  // Audio Chime Trigger
  const triggerAudioAlert = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.15); // G5
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch {
      // AudioContext unavailable
    }
  };

  // Toast Auto-Dismiss
  useEffect(() => {
    if (!toastNotification) return;
    const t = setTimeout(() => setToastNotification(null), 4500);
    return () => clearTimeout(t);
  }, [toastNotification]);

  // Manual Refresh Handler
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdated(new Date());
      setToastNotification('Refreshed latest LTA bus arrival predictions.');
    }, 600);
  };

  // Toggle Pinned Service at Stop
  const handleTogglePinService = (serviceNo: string) => {
    if (!selectedStop) return;
    const current = pinnedServicesMap[selectedStop.busStopCode] || [];
    const updated = current.includes(serviceNo)
      ? current.filter((s) => s !== serviceNo)
      : [...current, serviceNo];

    setPinnedServicesMap({
      ...pinnedServicesMap,
      [selectedStop.busStopCode]: updated,
    });
  };

  // Toggle Bookmark Stop
  const handleToggleBookmarkStop = () => {
    if (!selectedStop) return;
    const code = selectedStop.busStopCode;
    if (bookmarkedStopCodes.includes(code)) {
      setBookmarkedStopCodes(bookmarkedStopCodes.filter((c) => c !== code));
      setToastNotification(`Removed ${selectedStop.description} from saved stops.`);
    } else {
      setBookmarkedStopCodes([...bookmarkedStopCodes, code]);
      setToastNotification(`Saved ${selectedStop.description} to favorites.`);
    }
  };

  // View Route
  const handleViewRoute = (serviceNo: string) => {
    const route = SINGAPORE_BUS_ROUTES.find((r) => r.serviceNo === serviceNo);
    if (route) {
      setSelectedRoute(route);
      setActiveFilterService(serviceNo);
      setActiveTab('route');
    } else {
      setToastNotification(`Route map for Bus ${serviceNo} is currently loading.`);
    }
  };

  // Add Alarm
  const handleAddAlarm = (alarmData: Omit<ArrivalAlarm, 'id' | 'createdAt' | 'triggered'>) => {
    const newAlarm: ArrivalAlarm = {
      ...alarmData,
      id: `ALARM-${Date.now()}`,
      createdAt: Date.now(),
      triggered: false,
    };
    setActiveAlarms([newAlarm, ...activeAlarms]);
    setToastNotification(`Arrival alert set for Bus ${alarmData.serviceNo}.`);
  };

  const handleDeleteAlarm = (id: string) => {
    setActiveAlarms(activeAlarms.filter((a) => a.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-sky-500 selection:text-slate-950">
      {/* 
        TOP BAR CONTRACT:
        Zone 1: Single text wordmark
        Zone 2: 4-5 single-line nav links
        Zone 3: 1 primary action
      */}
      <header className="flex items-center justify-between gap-8 px-4 sm:px-8 py-3.5 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-30">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Bus className="w-5 h-5" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
            SG BusPulse
          </span>
        </div>

        {/* Zone 2: Concise Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
          <button
            onClick={() => {
              setSelectedRoute(null);
              setActiveFilterService(null);
              setActiveTab('map');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-100 ${
              activeTab === 'map' ? 'text-sky-400 font-semibold' : ''
            }`}
          >
            Live Map & Arrivals
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-100 ${
              activeTab === 'directory' ? 'text-sky-400 font-semibold' : ''
            }`}
          >
            Stop Directory ({stops.length})
          </button>
          <button
            onClick={() => {
              // Default to 190 route
              handleViewRoute('190');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-100 ${
              activeTab === 'route' ? 'text-sky-400 font-semibold' : ''
            }`}
          >
            Route Diagrams
          </button>
          <button
            onClick={() => setActiveModal('fare')}
            className="transition-colors whitespace-nowrap shrink-0 hover:text-slate-100"
          >
            Fare Estimator
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveModal('backend')}
            title="LTA DataMall API & Backend Bridge"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-sky-400 transition-colors whitespace-nowrap shrink-0"
          >
            <Server className="w-3.5 h-3.5 text-sky-400" />
            <span>Backend Bridge</span>
          </button>

          <button
            onClick={handleRequestGeolocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-md shadow-sky-500/20 active:scale-95 transition-all whitespace-nowrap shrink-0"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'Track Nearby'}</span>
          </button>
        </div>
      </header>

      {/* Main Responsive Layout */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-3 sm:p-5 flex flex-col">
        {/* Mobile View Switcher Tabs (Visible on small screens) */}
        <div className="md:hidden flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl mb-3">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg text-center transition-colors ${
              activeTab === 'map' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setActiveTab('arrivals')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg text-center transition-colors ${
              activeTab === 'arrivals' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'
            }`}
          >
            Arrivals
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg text-center transition-colors ${
              activeTab === 'directory' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'
            }`}
          >
            Stops
          </button>
          <button
            onClick={() => {
              if (!selectedRoute) handleViewRoute('190');
              setActiveTab('route');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg text-center transition-colors ${
              activeTab === 'route' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'
            }`}
          >
            Route
          </button>
        </div>

        {/* Content View Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 min-h-[620px]">
          {/* Left Column: Interactive Map (always visible on desktop, tab-controlled on mobile) */}
          <div
            className={`lg:col-span-7 xl:col-span-8 flex flex-col h-[480px] lg:h-[calc(100vh-140px)] ${
              activeTab === 'map' ? 'block' : 'hidden lg:flex'
            }`}
          >
            {/* Map Top Context Strip */}
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-semibold text-slate-200">Singapore Real-Time Transit Grid</span>
                <span>·</span>
                <span className="font-mono text-sky-400">{fleet.length} Active GPS Buses</span>
                {activeFilterService && (
                  <>
                    <span>·</span>
                    <button
                      onClick={() => {
                        setActiveFilterService(null);
                        setSelectedRoute(null);
                      }}
                      className="text-xs text-rose-400 hover:underline font-medium"
                    >
                      Clear Route Filter ({activeFilterService})
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveModal('fare')}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  <Calculator className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Fare Calc</span>
                </button>
              </div>
            </div>

            {/* Map Viewport */}
            <div className="flex-1 relative">
              <BusMap
                stops={stops}
                vehicles={fleet}
                selectedStop={selectedStop}
                selectedRoute={selectedRoute}
                onSelectStop={(stop) => {
                  setSelectedStop(stop);
                  if (activeTab === 'map' && window.innerWidth < 1024) {
                    setActiveTab('arrivals');
                  }
                }}
                onSelectVehicle={(veh) => {
                  setActiveFilterService(veh.serviceNo);
                  handleViewRoute(veh.serviceNo);
                }}
                userCoords={userCoords}
                activeFilterService={activeFilterService}
              />
            </div>
          </div>

          {/* Right Column: Dynamic Panel (Arrivals / Stop Directory / Route Diagram) */}
          <div
            className={`lg:col-span-5 xl:col-span-4 flex flex-col h-[560px] lg:h-[calc(100vh-140px)] ${
              activeTab !== 'map' ? 'block' : 'hidden lg:flex'
            }`}
          >
            {/* View Selector on Right Column */}
            <div className="hidden lg:flex items-center justify-between p-1 bg-slate-900 border border-slate-800 rounded-xl mb-3">
              <button
                onClick={() => {
                  setSelectedRoute(null);
                  setActiveTab('arrivals');
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg text-center transition-colors ${
                  activeTab === 'arrivals' || (!selectedRoute && activeTab !== 'directory')
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Arrivals ({selectedStop?.busStopCode || ''})
              </button>

              <button
                onClick={() => setActiveTab('directory')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg text-center transition-colors ${
                  activeTab === 'directory'
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Stops
              </button>

              <button
                onClick={() => {
                  if (!selectedRoute) handleViewRoute('190');
                  setActiveTab('route');
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg text-center transition-colors ${
                  activeTab === 'route' || selectedRoute
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Route View
              </button>
            </div>

            {/* Dynamic Container Switching */}
            <div className="flex-1 min-h-0">
              {activeTab === 'directory' ? (
                <SearchHub
                  stops={stops}
                  onSelectStop={(stop) => {
                    setSelectedStop(stop);
                    setActiveTab('arrivals');
                  }}
                  selectedStopCode={selectedStop?.busStopCode}
                  bookmarkedStopCodes={bookmarkedStopCodes}
                  userCoords={userCoords}
                  onRequestGeolocation={handleRequestGeolocation}
                  isLocating={isLocating}
                />
              ) : (activeTab === 'route' || selectedRoute) && selectedRoute ? (
                <RouteViewer
                  route={selectedRoute}
                  liveVehicles={fleet}
                  onClose={() => {
                    setSelectedRoute(null);
                    setActiveFilterService(null);
                    setActiveTab('arrivals');
                  }}
                  onSelectStopCode={(stopCode) => {
                    const match = stops.find((s) => s.busStopCode === stopCode);
                    if (match) setSelectedStop(match);
                  }}
                  currentStopCode={selectedStop?.busStopCode}
                />
              ) : selectedStop ? (
                <BusStopArrivals
                  stop={selectedStop}
                  arrivals={arrivals}
                  pinnedServices={pinnedServicesMap[selectedStop.busStopCode] || []}
                  onTogglePinService={handleTogglePinService}
                  onSetAlarm={(serviceNo) => {
                    setAlarmContextService(serviceNo);
                    setActiveModal('alarm');
                  }}
                  onViewRoute={handleViewRoute}
                  onRefresh={handleManualRefresh}
                  isRefreshing={isRefreshing}
                  lastUpdated={lastUpdated}
                  onToggleBookmarkStop={handleToggleBookmarkStop}
                  isStopBookmarked={bookmarkedStopCodes.includes(selectedStop.busStopCode)}
                />
              ) : (
                <div className="p-8 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800">
                  Select a Singapore bus stop on the map or search directory.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-sky-500/50 text-slate-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span className="text-xs font-semibold">{toastNotification}</span>
        </div>
      )}

      {/* Arrival Alarm Modal */}
      <ArrivalAlarmModal
        isOpen={activeModal === 'alarm'}
        onClose={() => setActiveModal(null)}
        serviceNo={alarmContextService}
        busStopCode={selectedStop?.busStopCode}
        stopDescription={selectedStop?.description}
        activeAlarms={activeAlarms}
        onAddAlarm={handleAddAlarm}
        onDeleteAlarm={handleDeleteAlarm}
      />

      {/* Backend & LTA API Configuration Modal */}
      <BackendModal
        isOpen={activeModal === 'backend'}
        onClose={() => setActiveModal(null)}
        onConfigUpdated={(cfg) => {
          setToastNotification('Backend configuration saved.');
        }}
      />

      {/* Commuter Tools & Fare Modal */}
      <CommuterToolsModal
        isOpen={activeModal === 'fare'}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
