export type LtaBusLoad = 'SEA' | 'SDA' | 'LSD'; // Seats Available, Standing Available, Limited Standing
export type LtaBusType = 'SD' | 'DD' | 'BD'; // Single Deck, Double Deck, Bendy
export type LtaBusOperator = 'SBST' | 'SMRT' | 'TTS' | 'GAS';

export interface BusArrivalItem {
  estimatedArrival: string; // ISO string matching LTA Datamall
  latitude: number;
  longitude: number;
  visitNumber: number;
  load: LtaBusLoad;
  feature: 'WAB' | '';
  type: LtaBusType;
  secondsRemaining: number;
  plateNumber?: string;
  speedKmH?: number;
}

export interface ServiceArrival {
  serviceNo: string;
  operator: LtaBusOperator;
  nextBus: BusArrivalItem | null;
  nextBus2: BusArrivalItem | null;
  nextBus3: BusArrivalItem | null;
  destinationDescription?: string;
  destinationCode?: string;
}

export interface BusStop {
  busStopCode: string;
  roadName: string;
  description: string;
  latitude: number;
  longitude: number;
  services: string[];
  mrtConnections?: string[];
  zone: string;
  distanceMeters?: number;
}

export interface LiveBusVehicle {
  id: string;
  serviceNo: string;
  plateNumber: string;
  operator: LtaBusOperator;
  busType: LtaBusType;
  load: LtaBusLoad;
  wheelchair: boolean;
  lat: number;
  lng: number;
  heading: number;
  speedKmH: number;
  nextStopCode: string;
  nextStopName: string;
  secondsToNextStop: number;
  destination: string;
  acTempC: number;
}

export interface RouteStopInfo {
  busStopCode: string;
  roadName: string;
  description: string;
  stopSequence: number;
  distanceKm: number;
  mrtConnections?: string[];
}

export interface BusRoute {
  serviceNo: string;
  direction: 1 | 2;
  origin: string;
  destination: string;
  firstBus: string;
  lastBus: string;
  frequency: string;
  category: 'Trunk' | 'Feeder' | 'Express';
  operator: LtaBusOperator;
  stops: RouteStopInfo[];
  polyline: [number, number][];
}

export interface SavedFavorite {
  busStopCode: string;
  pinnedServices: string[];
  nickname?: string;
  createdAt: number;
}

export interface ArrivalAlarm {
  id: string;
  busStopCode: string;
  stopDescription: string;
  serviceNo: string;
  thresholdMinutes: number; // 2 or 5 mins
  triggered: boolean;
  createdAt: number;
}
