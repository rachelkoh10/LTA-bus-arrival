import React, { useState } from 'react';
import { ArrivalAlarm } from '../types/bus';
import { Bell, BellRing, Trash2, X, Check, Volume2 } from 'lucide-react';

interface ArrivalAlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceNo?: string;
  busStopCode?: string;
  stopDescription?: string;
  activeAlarms: ArrivalAlarm[];
  onAddAlarm: (alarm: Omit<ArrivalAlarm, 'id' | 'createdAt' | 'triggered'>) => void;
  onDeleteAlarm: (id: string) => void;
}

export const ArrivalAlarmModal: React.FC<ArrivalAlarmModalProps> = ({
  isOpen,
  onClose,
  serviceNo = '190',
  busStopCode = '01012',
  stopDescription = 'Bugis Stn Exit A',
  activeAlarms,
  onAddAlarm,
  onDeleteAlarm,
}) => {
  const [thresholdMinutes, setThresholdMinutes] = useState<number>(2);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  // Sound test using Web Audio API
  const playSampleChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.warn('AudioContext unavailable', e);
    }
  };

  const handleCreate = () => {
    onAddAlarm({
      busStopCode,
      stopDescription,
      serviceNo,
      thresholdMinutes,
    });
    playSampleChime();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Set Arrival Alarm</h3>
              <p className="text-xs text-slate-400">Get alerted when your bus approaches</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Target Service:</span>
              <span className="text-lg font-mono font-extrabold text-sky-400">Bus {serviceNo}</span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-400">Bus Stop:</span>
              <span className="text-slate-200 font-medium truncate max-w-[200px]">
                {stopDescription} ({busStopCode})
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Alert me when bus is:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 5].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setThresholdMinutes(mins)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    thresholdMinutes === mins
                      ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md shadow-sky-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {mins} min away
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-sky-400" />
              Transit sound chime
            </span>
            <button
              onClick={playSampleChime}
              className="text-xs text-sky-400 hover:underline font-medium"
            >
              Test Sound
            </button>
          </div>

          {/* Active Alarms List */}
          {activeAlarms.length > 0 && (
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Active Alarms ({activeAlarms.length})
              </span>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {activeAlarms.map((alarm) => (
                  <div
                    key={alarm.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-sky-400 mr-2">Bus {alarm.serviceNo}</span>
                      <span className="text-slate-400">{alarm.thresholdMinutes}m reminder</span>
                    </div>
                    <button
                      onClick={() => onDeleteAlarm(alarm.id)}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isSaved}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors shadow-lg shadow-sky-500/20"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Alarm Set!</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                <span>Activate Alarm</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
