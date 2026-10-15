import React, { useState } from 'react';
import { Calculator, Clock, HelpCircle, X, Check, Users, Bus } from 'lucide-react';

interface CommuterToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommuterToolsModal: React.FC<CommuterToolsModalProps> = ({ isOpen, onClose }) => {
  const [distanceKm, setDistanceKm] = useState<number>(6.5);
  const [passengerType, setPassengerType] = useState<'adult' | 'student' | 'senior'>('adult');

  if (!isOpen) return null;

  // Authentic Singapore LTA Distance-based card fare calculation
  const calculateFare = (dist: number, type: 'adult' | 'student' | 'senior') => {
    let fareCents = 109; // Base up to 3.2km
    if (dist <= 3.2) {
      fareCents = 109;
    } else if (dist <= 4.2) {
      fareCents = 119;
    } else if (dist <= 5.2) {
      fareCents = 129;
    } else if (dist <= 6.2) {
      fareCents = 139;
    } else if (dist <= 7.2) {
      fareCents = 149;
    } else if (dist <= 8.2) {
      fareCents = 157;
    } else if (dist <= 9.2) {
      fareCents = 165;
    } else if (dist <= 10.2) {
      fareCents = 173;
    } else if (dist <= 15.2) {
      fareCents = 173 + Math.floor((dist - 10.2) / 1) * 6;
    } else {
      fareCents = 203 + Math.min(34, Math.floor((dist - 15.2) / 1) * 4);
    }

    if (type === 'student') {
      fareCents = Math.round(fareCents * 0.45);
    } else if (type === 'senior') {
      fareCents = Math.round(fareCents * 0.58);
    }

    return (fareCents / 100).toFixed(2);
  };

  const currentFare = calculateFare(distanceKm, passengerType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-xl">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Singapore Commuter Toolkit</h3>
              <p className="text-xs text-slate-400">Distance fare estimator & LTA indicators</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Fare Calculator Section */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-sky-400" />
                SimplyGo / EZ-Link Fare Calculator
              </h4>
              <span className="text-xl font-mono font-extrabold text-emerald-400 tabular-nums">
                ${currentFare} SGD
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span>Travel Distance</span>
                <span className="font-mono text-slate-200 font-bold">{distanceKm.toFixed(1)} km</span>
              </div>
              <input
                type="range"
                min="1"
                max="35"
                step="0.5"
                value={distanceKm}
                onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['adult', 'student', 'senior'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setPassengerType(type)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold capitalize border transition-all ${
                    passengerType === type
                      ? 'bg-sky-500 text-slate-950 border-sky-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* LTA Crowd Standards Reference */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              LTA Datamall Crowd Levels
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                  <span className="font-bold text-emerald-400">SEA</span>
                </div>
                <div className="font-semibold text-slate-200">Seats Available</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Plenty of vacant seats available onboard.</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
                  <span className="font-bold text-amber-400">SDA</span>
                </div>
                <div className="font-semibold text-slate-200">Standing Available</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Seats occupied, comfortable standing room.</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
                  <span className="font-bold text-rose-400">LSD</span>
                </div>
                <div className="font-semibold text-slate-200">Limited Standing</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Bus is near full capacity. Expect tight cabin.</div>
              </div>
            </div>
          </div>

          {/* LTA Fleet Types */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Bus className="w-3.5 h-3.5 text-sky-400" />
              Bus Types & Accessibility
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3">
                <span className="font-mono text-xs font-bold px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sky-300">
                  DD
                </span>
                <div>
                  <div className="font-semibold text-slate-200">Double Deck Bus</div>
                  <div className="text-[11px] text-slate-400">Upper deck seating capacity up to 130 passengers.</div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3">
                <span className="font-mono text-xs font-bold px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sky-300">
                  BD
                </span>
                <div>
                  <div className="font-semibold text-slate-200">Bendy / Articulated</div>
                  <div className="text-[11px] text-slate-400">18-meter high throughput accordion bus.</div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3">
                <span className="font-mono text-xs font-bold px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sky-300">
                  SD
                </span>
                <div>
                  <div className="font-semibold text-slate-200">Single Deck Bus</div>
                  <div className="text-[11px] text-slate-400">Standard 12-meter single level vehicle.</div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3">
                <span className="font-mono text-xs font-bold px-2 py-1 bg-slate-800 border border-slate-700 rounded text-emerald-400">
                  WAB
                </span>
                <div>
                  <div className="font-semibold text-slate-200">Wheelchair Accessible</div>
                  <div className="text-[11px] text-slate-400">Equipped with low-floor ramp & designated bay.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
