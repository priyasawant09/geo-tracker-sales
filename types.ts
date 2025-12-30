
export enum UserRole {
  ADMIN = 'ADMIN',
  SALESMAN = 'SALESMAN',
}

export enum AttendanceStatus {
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  employeeId: string;
  password?: string;
  name: string;
  role: UserRole;
  department: string;
  mobile?: string;
  email?: string;
  territoryName?: string; // e.g., "Mumbai Central", "Bandra East"
  avatar: string;
  currentLocation?: Coordinates;
  territoryCenter: Coordinates; // The admin-assigned center of the 10km radius
  homeLocation?: Coordinates;    // The user's personal home location (optional)
  lastUpdate?: Date;
  batteryLevel?: number;
  status: 'active' | 'idle' | 'offline';
  assignedClients?: string[];
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  timestamp: Date;
  type: AttendanceStatus;
  location: Coordinates;
  locationName?: string;
  flags?: string[];
  deviceInfo?: string;
}

export interface MeetingRecord {
  id: string;
  userId: string;
  userName: string;
  clientName: string;
  notes: string;
  timestamp: Date;
  location: Coordinates;
  locationName?: string;
}
