
import { User, UserRole, Coordinates } from './types';

export const WORK_START_HOUR = 10; // 10 AM
export const WORK_END_HOUR = 19;   // 7 PM
export const TERRITORY_RADIUS_METERS = 10000; // 10 KM assigned territory radius

// Central Mumbai Coordinates (Gateway of India area)
export const MAP_CENTER = { lat: 18.9220, lng: 72.8347 };

// User-friendly territory presets with coordinates
export const TERRITORY_PRESETS: { [key: string]: Coordinates } = {
  "Mumbai - South": { lat: 18.9220, lng: 72.8347 },
  "Mumbai - Bandra": { lat: 19.0596, lng: 72.8295 },
  "Mumbai - Andheri": { lat: 19.1136, lng: 72.8697 },
  "Mumbai - Borivali": { lat: 19.2307, lng: 72.8567 },
  "Pune - Central": { lat: 18.5204, lng: 73.8567 },
  "Delhi - Connaught Place": { lat: 28.6315, lng: 77.2167 },
  "Bangalore - MG Road": { lat: 12.9716, lng: 77.5946 },
  "Hyderabad - Gachibowli": { lat: 17.4401, lng: 78.3489 }
};

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    employeeId: 'EMP-MUM-001',
    password: 'password123',
    name: 'Rahul Sharma',
    department: 'South Mumbai Sales',
    role: UserRole.SALESMAN,
    avatar: 'https://i.pravatar.cc/150?u=rahul',
    status: 'active',
    batteryLevel: 92,
    currentLocation: { lat: 18.9220, lng: 72.8347 },
    territoryCenter: { lat: 18.9215, lng: 72.8340 },
    territoryName: "Mumbai - South",
    lastUpdate: new Date()
  },
  {
    id: 'u2',
    employeeId: 'EMP-MUM-042',
    password: 'password123',
    name: 'Priya Patel',
    department: 'Bandra West Unit',
    role: UserRole.SALESMAN,
    avatar: 'https://i.pravatar.cc/150?u=priya',
    status: 'idle',
    batteryLevel: 65,
    currentLocation: { lat: 19.0596, lng: 72.8295 },
    territoryCenter: { lat: 19.0600, lng: 72.8300 },
    territoryName: "Mumbai - Bandra",
    lastUpdate: new Date(Date.now() - 1000 * 60 * 15)
  },
  {
    id: 'admin1',
    employeeId: 'admin@mumbai.com',
    password: 'admin',
    name: 'Operations Manager Mumbai',
    department: 'Operations',
    role: UserRole.ADMIN,
    avatar: 'https://ui-avatars.com/api/?name=Admin+Mumbai&background=0D8ABC&color=fff',
    status: 'active',
    territoryCenter: { lat: 19.0760, lng: 72.8777 }
  }
];
