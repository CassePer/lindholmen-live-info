// Shared API types – the contract between frontend and backend

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// ── Lunch ──

export interface Restaurant {
  id: string;
  name: string;
  websiteUrl: string;
  address?: string;
  tags?: DietTag[];
}

export type DietTag = "vegetarisk" | "vegansk" | "fisk" | "kött";

export interface LunchDish {
  name: string;
  tags?: DietTag[];
}

export interface LunchMenu {
  restaurantId: string;
  restaurantName: string;
  websiteUrl: string;
  address?: string;
  date: string; // YYYY-MM-DD
  dishes: LunchDish[];
  sourceUrl: string;
  updatedAt: string; // ISO 8601
  /** True if the menu does not represent today's data (e.g. fetched on an earlier day). */
  stale?: boolean;
}

export interface WeeklyLunchMenu {
  restaurantId: string;
  restaurantName: string;
  websiteUrl: string;
  week: string; // YYYY-WW
  days: {
    date: string;
    dayName: string;
    dishes: LunchDish[];
  }[];
  sourceUrl: string;
  updatedAt: string;
}

/** One weekday of the current ISO week, with all restaurants' menus for that day. */
export interface LunchDay {
  date: string; // YYYY-MM-DD
  dayKey: string; // mon | tue | ...
  menus: LunchMenu[];
}

export interface LunchWeek {
  weekStart: string; // Monday, YYYY-MM-DD
  days: LunchDay[];
}

interface UnusedWeeklyLunchMenu {
  restaurantId: string;
  restaurantName: string;
  websiteUrl: string;
  week: string; // YYYY-WW
  days: {
    date: string;
    dayName: string;
    dishes: LunchDish[];
  }[];
  sourceUrl: string;
  updatedAt: string;
}

// ── Departures ──

export type TransportType = "Färja" | "Spårvagn" | "Buss" | "Tåg";

export interface Departure {
  id: string;
  line: string;
  destination: string;
  scheduledTime: string; // HH:mm
  estimatedTime?: string; // HH:mm
  delayMinutes: number;
  isRealtime: boolean;
  transportType: TransportType;
  scheduledIso?: string;
  realtimeIso?: string;
  alerts?: DepartureAlert[];
}

export interface DepartureAlert {
  header: string;
  description: string;
  validFrom?: string;
  validTo?: string;
}

export interface DeparturesResponse {
  departures: Departure[];
  alerts?: DepartureAlert[];
  updatedAt: string;
  areaId?: string;
  stopName?: string;
}

// ── Cameras ──

export interface Camera {
  id: string;
  name: string;
  location: string;
  thumbnailUrl: string;
  fullImageUrl: string;
  updatedAt: string;
  description?: string;
  direction?: number;
  type?: string;
}

export interface CameraDetail extends Camera {}
