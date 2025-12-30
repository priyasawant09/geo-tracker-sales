
import React, { useState, useEffect, useRef } from 'react';
import { UserRole, User, AttendanceRecord, AttendanceStatus, MeetingRecord } from './types';
import { WORK_START_HOUR, TERRITORY_RADIUS_METERS, TERRITORY_PRESETS } from './constants';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import LoginScreen from './components/LoginScreen';
import { db } from './services/database';
import { ShieldAlert } from 'lucide-react';

// Utility to check if a date is today
function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

// Distance calculation using Haversine formula
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
}

function resolveLocationName(lat: number, lng: number): string {
  // Try to find if user is near any known preset territory
  let nearest = "Unknown Location";
  let minDistance = 15000; // Search within 15km for a named area

  for (const [name, coords] of Object.entries(TERRITORY_PRESETS)) {
    const d = getDistance(lat, lng, coords.lat, coords.lng);
    if (d < minDistance) {
      minDistance = d;
      nearest = name;
    }
  }

  return minDistance < 10000 ? nearest : "Off-Territory Area";
}

const PERIODIC_LOG_INTERVAL = 10 * 60 * 1000; // 10 Minutes

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>(() => db.getUsers());
  const [history, setHistory] = useState<AttendanceRecord[]>(() => db.getHistory());
  const [auth, setAuth] = useState<{ user: User; role: UserRole } | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [locDenied, setLocDenied] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const periodicTimerRef = useRef<number | null>(null);

  // Determine checked-in state with Midnight Reset logic
  useEffect(() => {
    if (auth?.user && auth.role === UserRole.SALESMAN) {
      const uHistory = history.filter(h => h.userId === auth.user.id);
      if (uHistory.length > 0) {
        const lastRecord = uHistory[uHistory.length - 1];
        // Only stay checked in if the last record was CHECKED_IN AND it happened today.
        const checkedIn = lastRecord.type === AttendanceStatus.CHECKED_IN && 
                          isSameDay(new Date(lastRecord.timestamp), new Date());
        setIsCheckedIn(checkedIn);
      } else {
        setIsCheckedIn(false);
      }
    }
  }, [auth, history]);

  useEffect(() => {
    if (isCheckedIn && auth?.user && auth.role === UserRole.SALESMAN) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          const center = auth.user.territoryCenter;
          const dist = getDistance(lat, lng, center.lat, center.lng);
          const isOutOfTerritory = dist > TERRITORY_RADIUS_METERS;

          const updatedUsers = db.updateUser(auth.user.id, {
            currentLocation: { lat, lng },
            lastUpdate: new Date(),
            status: 'active'
          });
          setUsers(updatedUsers);

          if (isOutOfTerritory) {
            const userLogs = history.filter(h => h.userId === auth.user.id);
            const lastLog = userLogs[userLogs.length - 1];
            const recentlyFlagged = lastLog?.flags?.includes('OUT_OF_TERRITORY') && 
                                   (new Date().getTime() - new Date(lastLog.timestamp).getTime() < 900000);

            if (!recentlyFlagged) {
              const record: AttendanceRecord = {
                id: `v-${Math.random().toString(36).substr(2, 5)}`,
                userId: auth.user.id,
                userName: auth.user.name,
                timestamp: new Date(),
                type: AttendanceStatus.CHECKED_IN,
                location: { lat, lng },
                locationName: resolveLocationName(lat, lng),
                flags: ['OUT_OF_TERRITORY', 'AUTOMATED_ALERT']
              };
              setHistory(db.addRecord(record));
            }
          }
        },
        (err) => console.error(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );

      periodicTimerRef.current = window.setInterval(() => {
        navigator.geolocation.getCurrentPosition((pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          const dist = getDistance(lat, lng, auth.user.territoryCenter.lat, auth.user.territoryCenter.lng);
          const record: AttendanceRecord = {
            id: `p-${Math.random().toString(36).substr(2, 7)}`,
            userId: auth.user.id,
            userName: auth.user.name,
            timestamp: new Date(),
            type: AttendanceStatus.CHECKED_IN,
            location: { lat, lng },
            locationName: resolveLocationName(lat, lng),
            flags: ['PERIODIC_CHECK', dist > TERRITORY_RADIUS_METERS ? 'OUT_OF_TERRITORY' : 'IN_TERRITORY']
          };
          setHistory(db.addRecord(record));
        });
      }, PERIODIC_LOG_INTERVAL);
    }

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (periodicTimerRef.current !== null) window.clearInterval(periodicTimerRef.current);
    };
  }, [isCheckedIn, auth?.user?.id]);

  const handleLogin = (role: UserRole, id: string, pass: string): boolean => {
    const found = users.find(u => u.role === role && u.employeeId.toLowerCase() === id.toLowerCase() && u.password === pass);
    if (found) { setAuth({ user: found, role }); return true; }
    return false;
  };

  const handleLogout = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (periodicTimerRef.current !== null) window.clearInterval(periodicTimerRef.current);
    setAuth(null);
  };

  const handleUpdateUser = (userId: string, updates: Partial<User>) => {
    const updated = db.updateUser(userId, updates);
    setUsers(updated);
    if (auth?.user.id === userId) {
      setAuth(prev => prev ? { ...prev, user: { ...prev.user, ...updates } } : null);
    }
  };
  const handleDeleteUser = (userId: string) => setUsers(db.deleteUser(userId));

  const handleAttendance = (type: AttendanceStatus, lat: number, lng: number, additionalFlags: string[] = []) => {
    if (!auth) return;
    const now = new Date();
    const flags: string[] = [...additionalFlags];
    const dist = getDistance(lat, lng, auth.user.territoryCenter.lat, auth.user.territoryCenter.lng);
    flags.push(dist > TERRITORY_RADIUS_METERS ? 'OUT_OF_TERRITORY' : 'IN_TERRITORY');

    if (type === AttendanceStatus.CHECKED_IN && !additionalFlags.length) {
      if (now.getHours() > WORK_START_HOUR || (now.getHours() === WORK_START_HOUR && now.getMinutes() > 15)) {
        flags.push('LATE_ARRIVAL');
      }
    }

    const record: AttendanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      userId: auth.user.id,
      userName: auth.user.name,
      timestamp: now,
      type,
      location: { lat, lng },
      locationName: resolveLocationName(lat, lng),
      flags
    };

    setHistory(db.addRecord(record));
    handleUpdateUser(auth.user.id, { 
      status: type === AttendanceStatus.CHECKED_IN ? 'active' : 'idle', 
      currentLocation: { lat, lng }, 
      lastUpdate: now 
    });
  };

  if (!auth) return <LoginScreen onLogin={handleLogin} />;

  if (locDenied && auth.role === UserRole.SALESMAN) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center text-white">
        <ShieldAlert size={64} className="text-red-500 mb-6 animate-pulse" />
        <h1 className="text-3xl font-black mb-4">GPS REQUIRED</h1>
        <button onClick={() => window.location.reload()} className="bg-white text-slate-900 font-black px-12 py-4 rounded-3xl">RETRY</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <nav className="bg-slate-900 px-6 py-4 sticky top-0 z-[100] flex justify-between items-center text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isCheckedIn ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`}></div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{auth.role === UserRole.ADMIN ? 'GEOSALES_ADMIN' : `STAFF_${auth.user.employeeId.split('-').pop()}`}</span>
        </div>
        <button onClick={handleLogout} className="text-[9px] px-4 py-2 bg-white/10 rounded-xl font-black uppercase tracking-widest">Logout</button>
      </nav>
      <main className="flex-1 max-w-lg mx-auto w-full bg-white shadow-2xl min-h-full">
        {auth.role === UserRole.ADMIN ? (
          <AdminDashboard 
            users={users} 
            attendanceHistory={history} 
            onAddUser={(u) => setUsers(db.saveUser(u))} 
            onUpdateUser={handleUpdateUser} 
            onDeleteUser={handleDeleteUser}
          />
        ) : (
          <UserDashboard 
            currentUser={auth.user} 
            isCheckedIn={isCheckedIn} 
            history={history.filter(r => r.userId === auth.user.id)}
            onAttendanceAction={handleAttendance}
            onPermissionDenied={() => setLocDenied(true)}
            onUpdateUser={handleUpdateUser}
          />
        )}
      </main>
    </div>
  );
};

export default App;
