
import React, { useState, useEffect, useRef } from 'react';
import { User, AttendanceStatus, AttendanceRecord, MeetingRecord } from '../types';
import { ensureLocationPermission, getCurrentLocation } from '../utils/location';
import { db } from '../services/database';
import { 
  Play, Square, Briefcase, Clock, Home, User as UserIcon, CheckCircle2, 
  Loader2, MapPin, Radio, Navigation, MessageSquare, X, AlertOctagon, Camera
} from 'lucide-react';

interface UserDashboardProps {
  currentUser: User;
  onAttendanceAction: (type: AttendanceStatus, lat: number, lng: number, flags?: string[]) => void;
  onPermissionDenied: () => void;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  isCheckedIn: boolean;
  history: AttendanceRecord[];
}

const UserDashboard: React.FC<UserDashboardProps> = ({ 
  currentUser, 
  onAttendanceAction, 
  onPermissionDenied,
  onUpdateUser,
  isCheckedIn, 
  history 
}) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'profile'>('home');
  const [time, setTime] = useState(new Date());
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ clientName: '', notes: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [localMeetings, setLocalMeetings] = useState<MeetingRecord[]>(() => db.getMeetings().filter(m => m.userId === currentUser.id));

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handlePunch = async () => {
    if (loading) return;
    setLoading(true);
  
    const hasPermission = await ensureLocationPermission();
    if (!hasPermission) {
      setLoading(false);
      alert("Location permission is required to Punch In.");
      return;
    }
  
    try {
      const pos = await getCurrentLocation();
      const type = isCheckedIn
        ? AttendanceStatus.CHECKED_OUT
        : AttendanceStatus.CHECKED_IN;
  
      onAttendanceAction(type, pos.coords.latitude, pos.coords.longitude);
    } catch (e) {
      alert("Unable to fetch GPS location. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  

  const handleSOS = async () => {
    if (!confirm("TRIGGER SOS ALERT?")) return;
  
    setLoading(true);
  
    const hasPermission = await ensureLocationPermission();
    if (!hasPermission) {
      setLoading(false);
      alert("Location permission required for SOS.");
      return;
    }
  
    try {
      const pos = await getCurrentLocation();
      onAttendanceAction(
        AttendanceStatus.CHECKED_IN,
        pos.coords.latitude,
        pos.coords.longitude,
        ['EMERGENCY_SOS']
      );
      alert("SOS SIGNAL SENT.");
    } catch {
      onAttendanceAction(
        AttendanceStatus.CHECKED_IN,
        0,
        0,
        ['EMERGENCY_SOS', 'GPS_FAIL_SOS']
      );
      alert("SOS SENT (GPS unavailable).");
    } finally {
      setLoading(false);
    }
  };
  

  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!isCheckedIn) {
      alert("Please Punch In before recording a meeting.");
      return;
    }
  
    if (!meetingForm.clientName) {
      alert("Please select a client.");
      return;
    }
  
    setLoading(true);
  
    const hasPermission = await ensureLocationPermission();
    if (!hasPermission) {
      setLoading(false);
      alert("Location permission required for meeting.");
      return;
    }
  
    try {
      const pos = await getCurrentLocation();
  
      const newMeeting: MeetingRecord = {
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.id,
        userName: currentUser.name,
        clientName: meetingForm.clientName,
        notes: meetingForm.notes,
        timestamp: new Date(),
        location: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }
      };
  
      const updated = db.addMeeting(newMeeting);
      setLocalMeetings(updated.filter(m => m.userId === currentUser.id));
      setIsMeetingModalOpen(false);
      setMeetingForm({ clientName: '', notes: '' });
  
    } catch {
      alert("Unable to fetch GPS for meeting.");
    } finally {
      setLoading(false);
    }
  };
  

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateUser(currentUser.id, { avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const combinedHistory = [
    ...history.map(h => ({ ...h, logType: 'ATTENDANCE' as const })),
    ...localMeetings.map(m => ({ ...m, logType: 'MEETING' as const }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans">
      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'home' && (
          <div className="p-6 space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900">HI, {currentUser.name.toUpperCase()}</h2>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentUser.department}</p>
                </div>
              </div>
              <img src={currentUser.avatar} className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm object-cover" />
            </header>

            <div className={`p-8 rounded-[3rem] text-center shadow-2xl transition-all duration-500 relative overflow-hidden ${isCheckedIn ? 'bg-slate-900 text-white shadow-blue-200' : 'bg-white text-slate-900 border border-slate-100'}`}>
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">{isCheckedIn ? 'Session Active' : 'Off Duty'}</span>
                <div className="text-6xl font-black tracking-tighter tabular-nums">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="text-[10px] font-black opacity-30 uppercase tracking-widest">{time.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</div>
              </div>

              <div className="mt-8 space-y-3">
                <button 
                  onClick={handlePunch}
                  disabled={loading}
                  className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50 ${
                    isCheckedIn ? 'bg-red-500 text-white shadow-red-200' : 'bg-blue-600 text-white shadow-blue-200'
                  }`}
                >
                  {loading && !isMeetingModalOpen ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : isCheckedIn ? (
                    <span className="flex items-center gap-2"><Square size={16} fill="currentColor" /> Punch Out</span>
                  ) : (
                    <span className="flex items-center gap-2"><Play size={16} fill="currentColor" /> Punch In</span>
                  )}
                </button>

                {isCheckedIn && (
                  <button 
                    onClick={() => setIsMeetingModalOpen(true)}
                    className="w-full py-4 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-indigo-200"
                  >
                    <MessageSquare size={16} /> Record Meeting
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col items-center text-center shadow-sm">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-3"><Briefcase size={22} /></div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Team Role</span>
                <span className="text-xs font-bold text-slate-900 mt-1">Field Sales</span>
              </div>
              <button 
                onClick={handleSOS}
                className="bg-white p-6 rounded-[2rem] border border-red-50 flex flex-col items-center text-center shadow-sm hover:bg-red-500 hover:text-white group transition-all"
              >
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-3 group-hover:bg-red-600 group-hover:text-white transition-all"><AlertOctagon size={22} /></div>
                <span className="text-[9px] font-black text-red-400 group-hover:text-white/80 uppercase tracking-widest">Emergency</span>
                <span className="text-xs font-bold mt-1">SOS Alert</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-6 space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Activity Log</h3>
            {combinedHistory.length === 0 ? (
              <div className="py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">No activity history</div>
            ) : (
              combinedHistory.map(log => (
                <div key={log.id} className={`bg-white p-5 rounded-3xl border flex justify-between items-start shadow-sm transition-all ${(log as any).flags?.includes('EMERGENCY_SOS') ? 'border-red-300 bg-red-50' : 'border-slate-100'}`}>
                  <div className="flex gap-4 items-start">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      (log as any).flags?.includes('EMERGENCY_SOS') ? 'bg-red-500 text-white' :
                      log.logType === 'ATTENDANCE' 
                        ? (log as any).type === AttendanceStatus.CHECKED_IN ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      {(log as any).flags?.includes('EMERGENCY_SOS') ? <AlertOctagon size={16} /> :
                       log.logType === 'ATTENDANCE' 
                        ? (log as any).type === AttendanceStatus.CHECKED_IN ? <Play size={14} fill="currentColor" /> : <Square size={14} fill="currentColor" />
                        : <MessageSquare size={14} fill="currentColor" />
                      }
                    </div>
                    <div>
                      <span className="block text-xs font-black text-slate-900 uppercase tracking-tight">
                        {(log as any).flags?.includes('EMERGENCY_SOS') ? 'EMERGENCY SOS' :
                         log.logType === 'ATTENDANCE' ? (log as any).type.replace('_', ' ') : 'MEETING'}
                      </span>
                      {log.logType === 'MEETING' && <p className="text-[11px] font-black text-slate-800 uppercase mt-1">{(log as any).clientName}</p>}
                      <span className="text-[10px] text-slate-400 font-bold mt-1 block">{log.timestamp.toLocaleTimeString()} · {log.timestamp.toLocaleDateString()}</span>
                    </div>
                  </div>
                  {(log as any).flags?.includes('EMERGENCY_SOS') ? <div className="w-2 h-2 rounded-full bg-red-600 animate-ping mt-1.5" /> : null}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="p-10 text-center space-y-8 animate-slide-up">
            <div className="relative inline-block group cursor-pointer" onClick={handleAvatarClick}>
              <img src={currentUser.avatar} className="w-32 h-32 rounded-[3rem] border-4 border-white shadow-2xl mx-auto object-cover transition-transform group-hover:scale-[1.02]" />
              <div className="absolute inset-0 bg-black/40 rounded-[3rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <Camera className="text-white" size={32} />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2.5 rounded-2xl shadow-lg border-4 border-white"><CheckCircle2 size={20} /></div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{currentUser.name}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{currentUser.employeeId}</p>
              <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-2 cursor-pointer hover:underline" onClick={handleAvatarClick}>Tap image to change photo</p>
            </div>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 space-y-4 text-left shadow-sm">
              <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</span>
                <span className="text-xs font-bold text-slate-900">{currentUser.department}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Connectivity</span>
                <span className="text-xs font-bold text-green-600">Active</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Meeting Modal */}
      {isMeetingModalOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-900/70 backdrop-blur-md flex items-end justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden animate-slide-up shadow-2xl mb-24">
            <div className="bg-indigo-600 p-8 flex justify-between text-white">
              <div>
                <h3 className="font-black uppercase tracking-[0.2em] text-xs mb-1">Meeting Journal</h3>
                <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest">Interaction Log</p>
              </div>
              <button onClick={() => setIsMeetingModalOpen(false)} className="bg-white/10 p-2 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveMeeting} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Client</label>
                <select 
                  required 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                  value={meetingForm.clientName}
                  onChange={e => setMeetingForm({...meetingForm, clientName: e.target.value})}
                >
                  <option value="">Select a Client...</option>
                  {(currentUser.assignedClients || []).length > 0 ? (
                    currentUser.assignedClients!.map(c => <option key={c} value={c}>{c}</option>)
                  ) : (
                    <option value="General Client">General Client</option>
                  )}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Discussion Notes</label>
                <textarea required rows={4} placeholder="What was discussed?" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm resize-none" value={meetingForm.notes} onChange={e => setMeetingForm({...meetingForm, notes: e.target.value})} />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-indigo-200 active:scale-95 transition-transform mt-4 flex justify-center items-center gap-2">
                {loading ? <Loader2 className="animate-spin" size={16} /> : 'Save Interaction'}
              </button>
            </form>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/80 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center h-20 px-8 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
        {[
          { id: 'home', icon: Home },
          { id: 'history', icon: Clock },
          { id: 'profile', icon: UserIcon }
        ].map(btn => (
          <button 
            key={btn.id} 
            onClick={() => setActiveTab(btn.id as any)}
            className={`p-3 rounded-2xl transition-all ${activeTab === btn.id ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-300'}`}
          >
            <btn.icon size={24} />
          </button>
        ))}
      </nav>
    </div>
  );
};

export default UserDashboard;
