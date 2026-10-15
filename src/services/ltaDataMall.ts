import { BusArrivalItem, BusStop, LiveBusVehicle, LtaBusLoad, LtaBusOperator, LtaBusType, ServiceArrival } from '../types/bus';
import { SINGAPORE_BUS_ROUTES, SINGAPORE_BUS_STOPS } from '../data/singaporeBusData';

// Calculate distance in meters between two lat/lng coordinates (Haversine formula)
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Generate an LTA ISO arrival timestamp string
export function formatEstimatedArrival(secondsFromNow: number): string {
  const date = new Date(Date.now() + secondsFromNow * 1000);
  return date.toISOString();
}

// Format seconds into user-friendly countdown (e.g., 'Arr', '1 min', '4 min', '12 min')
export function formatWaitTime(seconds: number): { label: string; subLabel: string; isArriving: boolean } {
  if (seconds <= 45) {
    return { label: 'Arr', subLabel: 'Arriving now', isArriving: true };
  }
  const mins = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  if (mins === 1) {
    return { label: '1m', subLabel: `${remSec}s away`, isArriving: true };
  }
  return { label: `${mins}m`, subLabel: `${mins} min away`, isArriving: false };
}

// Format seconds into precise MM:SS
export function formatClockTimer(seconds: number): string {
  if (seconds <= 0) return 'Arr';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Configuration for user backend integration
export interface BackendConfig {
  apiKey?: string;
  proxyEndpoint?: string;
  useLiveSimulation: boolean;
}

const STORAGE_KEY_CONFIG = 'sg_buspulse_backend_cfg';

export function getSavedBackendConfig(): BackendConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse backend config', e);
  }
  return {
    apiKey: '',
    proxyEndpoint: '',
    useLiveSimulation: true,
  };
}

export function saveBackendConfig(cfg: BackendConfig): void {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cfg));
}

// Primary service helper to get arrival predictions for a stop
export function computeArrivalsForStop(
  stopCode: string,
  liveFleet: LiveBusVehicle[]
): ServiceArrival[] {
  const stop = SINGAPORE_BUS_STOPS.find((s) => s.busStopCode === stopCode);
  if (!stop) return [];

  return stop.services.map((serviceNo) => {
    // Find matching route for origin/dest
    const route = SINGAPORE_BUS_ROUTES.find((r) => r.serviceNo === serviceNo);
    const operator = route?.operator || getOperatorForService(serviceNo);

    // Look for live vehicles on this service
    const matchingVehicles = liveFleet.filter((v) => v.serviceNo === serviceNo);

    let nextBus: BusArrivalItem | null = null;
    let nextBus2: BusArrivalItem | null = null;
    let nextBus3: BusArrivalItem | null = null;

    if (matchingVehicles.length > 0) {
      // Pick closest vehicle
      const primaryVehicle = matchingVehicles[0];
      const dist = getDistanceMeters(primaryVehicle.lat, primaryVehicle.lng, stop.latitude, stop.longitude);
      // Rough transit speed: ~350 meters per minute + stop overhead
      const computedSecs = Math.max(30, Math.round((dist / 350) * 60));

      nextBus = {
        estimatedArrival: formatEstimatedArrival(computedSecs),
        latitude: primaryVehicle.lat,
        longitude: primaryVehicle.lng,
        visitNumber: 1,
        load: primaryVehicle.load,
        feature: primaryVehicle.wheelchair ? 'WAB' : '',
        type: primaryVehicle.busType,
        secondsRemaining: computedSecs,
        plateNumber: primaryVehicle.plateNumber,
        speedKmH: primaryVehicle.speedKmH,
      };

      // Second vehicle if available or deterministic projection
      if (matchingVehicles.length > 1) {
        const secVehicle = matchingVehicles[1];
        const dist2 = getDistanceMeters(secVehicle.lat, secVehicle.lng, stop.latitude, stop.longitude);
        const computedSecs2 = Math.max(computedSecs + 240, Math.round((dist2 / 350) * 60));
        nextBus2 = {
          estimatedArrival: formatEstimatedArrival(computedSecs2),
          latitude: secVehicle.lat,
          longitude: secVehicle.lng,
          visitNumber: 1,
          load: secVehicle.load,
          feature: 'WAB',
          type: secVehicle.busType,
          secondsRemaining: computedSecs2,
          plateNumber: secVehicle.plateNumber,
          speedKmH: secVehicle.speedKmH,
        };
      } else {
        const headway2 = computedSecs + 420; // +7 mins
        nextBus2 = {
          estimatedArrival: formatEstimatedArrival(headway2),
          latitude: 0,
          longitude: 0,
          visitNumber: 1,
          load: pickDeterministicLoad(serviceNo, 2),
          feature: 'WAB',
          type: pickDeterministicDeck(serviceNo, 2),
          secondsRemaining: headway2,
        };
      }

      // Third vehicle
      const headway3 = (nextBus2 ? nextBus2.secondsRemaining : computedSecs + 420) + 540;
      nextBus3 = {
        estimatedArrival: formatEstimatedArrival(headway3),
        latitude: 0,
        longitude: 0,
        visitNumber: 1,
        load: 'SEA',
        feature: 'WAB',
        type: 'SD',
        secondsRemaining: headway3,
      };
    } else {
      // Deterministic fallback based on stop hash & service hash
      const baseSeconds = getDeterministicInitialWait(stopCode, serviceNo);
      nextBus = {
        estimatedArrival: formatEstimatedArrival(baseSeconds),
        latitude: stop.latitude + 0.002,
        longitude: stop.longitude + 0.002,
        visitNumber: 1,
        load: pickDeterministicLoad(serviceNo, 1),
        feature: 'WAB',
        type: pickDeterministicDeck(serviceNo, 1),
        secondsRemaining: baseSeconds,
        plateNumber: `SG${(parseInt(serviceNo, 10) * 113) % 9000 + 1000}K`,
        speedKmH: 32,
      };

      const baseSeconds2 = baseSeconds + 480;
      nextBus2 = {
        estimatedArrival: formatEstimatedArrival(baseSeconds2),
        latitude: 0,
        longitude: 0,
        visitNumber: 1,
        load: pickDeterministicLoad(serviceNo, 2),
        feature: 'WAB',
        type: pickDeterministicDeck(serviceNo, 2),
        secondsRemaining: baseSeconds2,
      };

      const baseSeconds3 = baseSeconds2 + 540;
      nextBus3 = {
        estimatedArrival: formatEstimatedArrival(baseSeconds3),
        latitude: 0,
        longitude: 0,
        visitNumber: 1,
        load: 'SEA',
        feature: 'WAB',
        type: 'SD',
        secondsRemaining: baseSeconds3,
      };
    }

    return {
      serviceNo,
      operator,
      nextBus,
      nextBus2,
      nextBus3,
      destinationDescription: route?.destination || 'Terminus Interchange',
      destinationCode: route?.stops[route.stops.length - 1]?.busStopCode,
    };
  });
}

// Advance vehicle positions along route
export function advanceFleetSimulation(currentFleet: LiveBusVehicle[], deltaSeconds: number): LiveBusVehicle[] {
  return currentFleet.map((bus) => {
    const route = SINGAPORE_BUS_ROUTES.find((r) => r.serviceNo === bus.serviceNo);
    if (!route || route.polyline.length < 2) {
      return bus;
    }

    // Advance remaining seconds
    const newSeconds = bus.secondsToNextStop - deltaSeconds;

    // Movement step: ~0.00008 lat/lng per second (~30 km/h)
    const stepRatio = 0.00006 * deltaSeconds;
    
    // Find next target polyline point
    const poly = route.polyline;
    // Find closest segment index
    let closestIndex = 0;
    let minDist = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const d = Math.hypot(poly[i][0] - bus.lat, poly[i][1] - bus.lng);
      if (d < minDist) {
        minDist = d;
        closestIndex = i;
      }
    }

    const nextIndex = (closestIndex + 1) % poly.length;
    const targetPoint = poly[nextIndex];
    const dLat = targetPoint[0] - bus.lat;
    const dLng = targetPoint[1] - bus.lng;
    const distToTarget = Math.hypot(dLat, dLng);

    let nextLat = bus.lat;
    let nextLng = bus.lng;
    let heading = bus.heading;

    if (distToTarget > 0.0001) {
      const moveFrac = Math.min(1, stepRatio / distToTarget);
      nextLat += dLat * moveFrac;
      nextLng += dLng * moveFrac;
      // Heading calculation in degrees
      heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
      if (heading < 0) heading += 360;
    } else {
      // Reached waypoint, hop to next
      nextLat = targetPoint[0];
      nextLng = targetPoint[1];
    }

    // Reset countdown if arrived
    let updatedSeconds = newSeconds;
    let updatedStopCode = bus.nextStopCode;
    let updatedStopName = bus.nextStopName;
    let updatedLoad = bus.load;

    if (newSeconds <= 0) {
      // Pick next stop on route
      const currentIdx = route.stops.findIndex((s) => s.busStopCode === bus.nextStopCode);
      const nextStop = route.stops[(currentIdx + 1) % route.stops.length];
      updatedStopCode = nextStop.busStopCode;
      updatedStopName = nextStop.description;
      updatedSeconds = Math.floor(180 + Math.random() * 240); // 3-7 mins to next stop

      // Slight crowd change at busy stops
      if (['09048', '08057', '01012', '10169'].includes(updatedStopCode)) {
        updatedLoad = Math.random() > 0.5 ? 'SDA' : 'LSD';
      } else {
        updatedLoad = Math.random() > 0.3 ? 'SEA' : 'SDA';
      }
    }

    return {
      ...bus,
      lat: nextLat,
      lng: nextLng,
      heading: Math.round(heading),
      secondsToNextStop: Math.max(0, updatedSeconds),
      nextStopCode: updatedStopCode,
      nextStopName: updatedStopName,
      load: updatedLoad,
    };
  });
}

function getOperatorForService(serviceNo: string): LtaBusOperator {
  const num = parseInt(serviceNo, 10);
  if (isNaN(num)) return 'SBST';
  if ([190, 960, 169, 178, 187, 856, 900, 901].includes(num)) return 'SMRT';
  if ([143, 857, 410, 97, 106].includes(num)) return 'TTS';
  if ([36, 2, 12, 17, 34, 43, 82, 83].includes(num)) return 'GAS';
  return 'SBST';
}

function pickDeterministicLoad(serviceNo: string, slot: number): LtaBusLoad {
  const hash = (serviceNo.charCodeAt(0) + slot * 7) % 10;
  if (hash > 7) return 'LSD';
  if (hash > 3) return 'SDA';
  return 'SEA';
}

function pickDeterministicDeck(serviceNo: string, slot: number): LtaBusType {
  const num = parseInt(serviceNo, 10);
  if (num === 190 || num === 65 || num === 143 || num === 147 || num === 10) {
    return 'DD'; // Heavy trunk double decker
  }
  if (num === 960) return slot % 2 === 0 ? 'BD' : 'DD';
  return 'SD';
}

function getDeterministicInitialWait(stopCode: string, serviceNo: string): number {
  let hash = 0;
  for (let i = 0; i < stopCode.length; i++) {
    hash = (hash << 5) - hash + stopCode.charCodeAt(i);
  }
  for (let i = 0; i < serviceNo.length; i++) {
    hash = (hash << 5) - hash + serviceNo.charCodeAt(i);
  }
  const absHash = Math.abs(hash);
  // Realistic wait times in seconds: between 40s (arriving) and 660s (11 mins)
  return 40 + (absHash % 620);
}
