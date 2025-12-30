
import React, { useState, useMemo, useEffect } from 'react';
import { User, AttendanceRecord, UserRole, MeetingRecord, AttendanceStatus } from '../types';
import LiveMap from './LiveMap';
import { db } from '../services/database';
import { TERRITORY_PRESETS } from '../constants';
import { 
  Map, Users, FileText, UserPlus, X, ShieldAlert, CheckCircle2, Settings, 
  MessageSquare, Clock, Download, Search, MapPin, Edit3, Calendar, 
  AlertTriangle, ChevronRight, Navigation, Mail, Phone, BarChart3, 
  Database, History, TrendingUp, AlertOctagon, Loader2, Filter, Trash2,
  Check, Info
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface AdminDashboardProps {
  users: User[];
  attendanceHistory: AttendanceRecord[];
  onAddUser: (user: User) => void;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onDeleteUser: (userId: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, attendanceHistory, onAddUser, onUpdateUser, onDeleteUser }) => {
  const [activeTab, setActiveTab] = useState<'map' | 'staff' | 'logs' | 'reports'>('map');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Toast Notification State
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  
  // Date Range States for Reports
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  const [form, setForm] = useState({ 
    name: '', empId: '', pass: '', dept: '', mobile: '', email: '', territoryName: '', lat: '18.9220', lng: '72.8347', assignedClients: ''
  });
  
  const [editForm, setEditForm] = useState({ 
    lat: '', 
    lng: '', 
    territoryName: '',
    assignedClients: '' 
  });

  const meetingHistory = db.getMeetings();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId: form.empId,
      password: form.pass,
      name: form.name,
      department: form.dept || 'General Sales',
      mobile: form.mobile,
      email: form.email,
      territoryName: form.territoryName,
      role: UserRole.SALESMAN,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name)}&background=random&bold=true`,
      status: 'offline',
      batteryLevel: 100,
      territoryCenter: { lat: parseFloat(form.lat), lng: parseFloat(form.lng) },
      assignedClients: form.assignedClients.split(',').map(c => c.trim()).filter(c => c !== '')
    };
    onAddUser(newUser);
    setIsModalOpen(false);
    showToast(`${newUser.name} registered`);
    setForm({ 
      name: '', empId: '', pass: '', dept: '', mobile: '', email: '', territoryName: '', lat: '18.9220', lng: '72.8347', assignedClients: ''
    });
  };

  const onTerritoryPresetChange = (name: string, isForOnboarding: boolean) => {
    const preset = TERRITORY_PRESETS[name];
    if (preset) {
      if (isForOnboarding) {
        setForm(prev => ({ ...prev, territoryName: name, lat: preset.lat.toString(), lng: preset.lng.toString() }));
      } else {
        setEditForm(prev => ({ ...prev, territoryName: name, lat: preset.lat.toString(), lng: preset.lng.toString() }));
      }
    } else if (name === "Custom") {
       if (isForOnboarding) setForm(prev => ({ ...prev, territoryName: "" }));
       else setEditForm(prev => ({ ...prev, territoryName: "" }));
    }
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      onUpdateUser(editingUser.id, {
        territoryName: editForm.territoryName,
        territoryCenter: { lat: parseFloat(editForm.lat), lng: parseFloat(editForm.lng) },
        assignedClients: editForm.assignedClients.split(',').map(c => c.trim()).filter(c => c !== '')
      });
      setIsEditModalOpen(false);
      setEditingUser(null);
      showToast("Settings updated");
    }
  };

  const handleConfirmDelete = async () => {
    if (!editingUser) return;
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 600));
    onDeleteUser(editingUser.id);
    setIsDeleteConfirmOpen(false);
    setIsEditModalOpen(false);
    setEditingUser(null);
    setIsProcessing(false);
    showToast("Employee removed", "error");
  };

  const salesmen = users.filter(u => u.role === UserRole.SALESMAN);

  const combinedLogs = useMemo(() => {
    return [
      ...attendanceHistory.map(h => ({ ...h, logType: 'ATTENDANCE' as const })),
      ...meetingHistory.map(m => ({ ...m, logType: 'MEETING' as const }))
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [attendanceHistory, meetingHistory]);

  const filteredByDateLogs = useMemo(() => {
    const start = new Date(dateRange.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999);
    return combinedLogs.filter(log => log.timestamp >= start && log.timestamp <= end);
  }, [combinedLogs, dateRange]);

  const emergencyAlerts = useMemo(() => {
    return attendanceHistory.filter(h => h.flags?.includes('EMERGENCY_SOS'));
  }, [attendanceHistory]);

  const chartData = useMemo(() => {
    return salesmen.map(user => {
      const userLogs = filteredByDateLogs.filter(h => h.userId === user.id);
      const userMeetings = userLogs.filter(l => l.logType === 'MEETING');
      const userAttendance = userLogs.filter(l => l.logType === 'ATTENDANCE');
      return {
        name: user.name.split(' ')[0],
        Meetings: userMeetings.length,
        Violations: userAttendance.filter(l => (l as any).flags?.includes('OUT_OF_TERRITORY')).length
      };
    });
  }, [salesmen, filteredByDateLogs]);

  const groupedLogs = useMemo<Record<string, any[]>>(() => {
    const filtered = combinedLogs.filter(log => {
      const matchesSearch = log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (log.logType === 'MEETING' && (log as any).clientName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStaff = selectedStaffFilter === 'all' || log.userId === selectedStaffFilter;
      return matchesSearch && matchesStaff;
    });

    const groups: Record<string, any[]> = {};
    filtered.forEach(log => {
      const date = log.timestamp.toLocaleDateString(undefined, { dateStyle: 'long' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    });
    return groups;
  }, [combinedLogs, searchTerm, selectedStaffFilter]);

  const stats = useMemo(() => {
    return {
      attendance: filteredByDateLogs.filter(l => l.logType === 'ATTENDANCE').length,
      meetings: filteredByDateLogs.filter(l => l.logType === 'MEETING').length,
      violations: filteredByDateLogs.filter(l => (l as any).flags?.includes('OUT_OF_TERRITORY')).length,
      sos: filteredByDateLogs.filter(l => (l as any).flags?.includes('EMERGENCY_SOS')).length
    };
  }, [filteredByDateLogs]);

  const downloadCSV = () => {
    const headers = ["Date", "Time", "Employee", "ID", "Dept", "Type", "Client", "Location Name", "Territory", "Alerts", "Lat", "Lng"];
    const csvRows = filteredByDateLogs.map(log => {
      const user = users.find(u => u.id === log.userId);
      const activityType = log.logType === 'MEETING' ? 'MEETING' : (log as any).type;
      const flags = (log as any).flags || [];
      return [
        log.timestamp.toLocaleDateString(),
        log.timestamp.toLocaleTimeString(),
        log.userName,
        user?.employeeId || 'N/A',
        user?.department || 'N/A',
        activityType,
        log.logType === 'MEETING' ? (log as any).clientName : 'N/A',
        log.locationName || 'N/A',
        flags.includes('IN_TERRITORY') ? 'IN' : (flags.includes('OUT_OF_TERRITORY') ? 'OUT' : 'N/A'),
        flags.join(" | "),
        log.location.lat,
        log.location.lng
      ].join(",");
    });
    const blob = new Blob([[headers.join(","), ...csvRows].join("\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `GeoSales_Audit.csv`;
    link.click();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[1000] px-6 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-3 animate-slide-up ${toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} className="text-blue-400" /> : <AlertOctagon size={16} />}
          <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      <div className="p-6 space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">OPERATIONS</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-blue-500" /> System Control Center
            </p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white p-4.5 rounded-[1.5rem] shadow-xl active:scale-90 transition-transform flex items-center gap-2">
            <UserPlus size={20} />
          </button>
        </header>

        {emergencyAlerts.length > 0 && (
          <div className="bg-red-600 text-white p-5 rounded-3xl animate-pulse flex items-center justify-between shadow-2xl shadow-red-200">
            <div className="flex items-center gap-4">
               <AlertOctagon size={28} />
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">Critical SOS Triggered</p>
                  <p className="text-sm font-bold">{emergencyAlerts[0].userName} - Immediate Assistance Required</p>
               </div>
            </div>
            <button onClick={() => setActiveTab('logs')} className="bg-white text-red-600 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest">Respond</button>
          </div>
        )}

        <nav className="flex bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm">
          {['map', 'staff', 'logs', 'reports'].map(t => (
            <button 
              key={t} 
              onClick={() => setActiveTab(t as any)}
              className={`flex-1 py-3.5 rounded-[1.5rem] text-[9px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === t ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t}
            </button>
          ))}
        </nav>

        <div className="min-h-[500px]">
          {activeTab === 'map' && (
            <div className="animate-fade-in space-y-5">
               <LiveMap users={salesmen} height={450} />
               <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex justify-around items-center">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Active Units</p>
                    <p className="text-3xl font-black text-green-500 tabular-nums">{salesmen.filter(s => s.status === 'active').length}</p>
                  </div>
                  <div className="w-px h-10 bg-slate-50"></div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Beat Meetings</p>
                    <p className="text-3xl font-black text-blue-600 tabular-nums">{meetingHistory.length}</p>
                  </div>
               </div>
            </div>
          )}
          
          {activeTab === 'staff' && (
            <div className="space-y-4 animate-slide-up pb-10">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Personnel Directory</h3>
              {salesmen.length === 0 ? (
                <div className="py-24 text-center text-slate-300 font-black uppercase text-[10px] tracking-[0.3em] flex flex-col items-center gap-6">
                  <Users size={64} strokeWidth={1} className="opacity-20" />
                  System Empty
                </div>
              ) : (
                salesmen.map(user => (
                  <div key={user.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-100 transition-all hover:shadow-xl hover:shadow-slate-100">
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        <img src={user.avatar} className="w-16 h-16 rounded-[1.5rem] bg-slate-50 object-cover shadow-sm border border-slate-50" alt={user.name} />
                        <div className={`absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full border-4 border-white ${user.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">{user.name}</h4>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                          <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest">{user.department}</span>
                          <p className="text-[8px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-widest"><MapPin size={10} className="text-blue-500" /> {user.territoryName || 'Roaming'}</p>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setEditingUser(user);
                        setEditForm({ 
                          lat: user.territoryCenter.lat.toString(), 
                          lng: user.territoryCenter.lng.toString(),
                          territoryName: user.territoryName || '',
                          assignedClients: (user.assignedClients || []).join(', ')
                        });
                        setIsEditModalOpen(true);
                      }}
                      className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                    >
                      <Settings size={20} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-6 animate-slide-up pb-10">
               <div className="flex flex-col gap-4">
                  <div className="relative">
                    <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input 
                      type="text" 
                      placeholder="Audit Search..." 
                      className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-[2rem] text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500/10 shadow-sm placeholder:text-slate-300 uppercase tracking-widest"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Filter size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <select 
                      className="w-full pl-14 pr-10 py-5 bg-white border border-slate-100 rounded-[2rem] text-[11px] font-black outline-none focus:ring-2 focus:ring-blue-500/10 shadow-sm appearance-none uppercase tracking-widest"
                      value={selectedStaffFilter}
                      onChange={e => setSelectedStaffFilter(e.target.value)}
                    >
                      <option value="all">Comprehensive View</option>
                      {salesmen.map(s => <option key={s.id} value={s.id}>{s.name} ({s.employeeId})</option>)}
                    </select>
                  </div>
               </div>
              
              {Object.keys(groupedLogs).length === 0 ? (
                <div className="py-24 text-center text-slate-300 font-black uppercase text-[10px] tracking-[0.3em]">No Log Data Found</div>
              ) : (
                Object.entries(groupedLogs).map(([date, logs]) => (
                  <div key={date} className="space-y-4">
                    <div className="flex items-center gap-6 px-3">
                       <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] bg-white border border-slate-100 px-4 py-1.5 rounded-full">{date}</h4>
                       <div className="flex-1 h-px bg-slate-100"></div>
                    </div>
                    {logs.map(log => (
                      <div key={log.id} className={`bg-white p-6 rounded-[2.5rem] border flex flex-col shadow-sm group transition-all ${(log as any).flags?.includes('EMERGENCY_SOS') ? 'border-red-300 bg-red-50' : 'border-slate-50 hover:border-slate-100'}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-4">
                             <div className={`p-3 rounded-2xl ${(log as any).flags?.includes('EMERGENCY_SOS') ? 'bg-red-600 text-white' : log.logType === 'MEETING' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                               {(log as any).flags?.includes('EMERGENCY_SOS') ? <AlertOctagon size={18} /> : log.logType === 'MEETING' ? <MessageSquare size={18} /> : <Clock size={18} />}
                             </div>
                             <div>
                                <span className="text-[13px] font-black text-slate-900 uppercase tracking-tight">{log.userName}</span>
                                <div className="flex items-center gap-2.5 mt-1">
                                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${(log as any).flags?.includes('EMERGENCY_SOS') ? 'border-red-600 bg-red-600 text-white' : log.logType === 'MEETING' ? 'border-blue-100 text-blue-600 bg-blue-50/30' : 'border-slate-100 text-slate-400 bg-slate-50/30'} uppercase tracking-widest`}>
                                    {(log as any).flags?.includes('EMERGENCY_SOS') ? 'EMERGENCY' : log.logType === 'MEETING' ? 'MEETING' : (log as any).type}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.15em]">{log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                             </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 text-right">
                            <p className="text-[11px] font-black text-slate-900 flex items-center justify-end gap-1.5">
                              <MapPin size={12} className="text-blue-500" /> 
                              {log.locationName || 'Unmapped'}
                            </p>
                            {(log as any).flags?.includes('OUT_OF_TERRITORY') && (
                              <span className="text-[7px] font-black bg-red-50 text-red-600 px-2.5 py-1 rounded-full border border-red-100 uppercase flex items-center gap-1.5 tracking-tighter animate-pulse"><AlertTriangle size={10} /> Violation</span>
                            )}
                          </div>
                        </div>
                        {log.logType === 'MEETING' && (
                          <div className="border-t border-slate-50 pt-4 mt-2">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1.5">Portfolio: {log.clientName}</p>
                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium italic">"{log.notes}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6 animate-slide-up pb-10">
              <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full"></div>
                <div className="relative z-10">
                  <h3 className="text-3xl font-black tracking-tight mb-3 uppercase">Analytics</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-10 leading-relaxed">
                    Auditing field performance for {salesmen.length} personnel.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-6 mb-10">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Period Start</label>
                      <input 
                        type="date" 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold text-white outline-none focus:border-blue-500 transition-colors"
                        value={dateRange.start}
                        onChange={e => setDateRange({...dateRange, start: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Period End</label>
                      <input 
                        type="date" 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold text-white outline-none focus:border-blue-500 transition-colors"
                        value={dateRange.end}
                        onChange={e => setDateRange({...dateRange, end: e.target.value})}
                      />
                    </div>
                  </div>

                  <button onClick={downloadCSV} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.25em] text-[10px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl shadow-blue-900/40">
                    <Download size={18} /> Export Performance Log
                  </button>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2"><TrendingUp size={14} /> Efficiency Index</h4>
                    <p className="text-[9px] font-bold text-slate-300 uppercase mt-1 tracking-widest">Temporal dataset: {dateRange.start} – {dateRange.end}</p>
                  </div>
                  <div className="flex gap-5">
                     <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Meetings</span></div>
                     <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span> <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Violations</span></div>
                  </div>
                </div>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#cbd5e1', letterSpacing: '0.1em'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#cbd5e1'}} />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold', padding: '16px' }}
                      />
                      <Bar dataKey="Meetings" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={16} />
                      <Bar dataKey="Violations" fill="#f87171" radius={[6, 6, 0, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
                  <Database size={24} className="mx-auto text-blue-500 mb-3" />
                  <p className="text-3xl font-black text-slate-900 tabular-nums">{stats.attendance}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Data Points</p>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
                  <AlertOctagon size={24} className={`mx-auto mb-3 ${stats.sos > 0 ? 'text-red-600 animate-bounce' : 'text-slate-200'}`} />
                  <p className={`text-3xl font-black tabular-nums ${stats.sos > 0 ? 'text-red-600' : 'text-slate-900'}`}>{stats.sos}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Emergencies</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ONBOARDING */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="bg-slate-900 p-10 flex justify-between text-white sticky top-0 z-10">
              <div>
                <h3 className="font-black uppercase tracking-[0.3em] text-[10px] mb-2 text-blue-400">Onboarding</h3>
                <p className="text-xl font-black tracking-tight">Add Field Personnel</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/10 p-3 rounded-2xl hover:bg-white/20 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleAdd} className="p-10 space-y-8">
              <div className="space-y-5">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 pb-2">Core Identity</p>
                <div className="space-y-4">
                   <input required type="text" placeholder="Legal Full Name" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                   <div className="grid grid-cols-2 gap-4">
                     <input required type="text" placeholder="Assign ID" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" value={form.empId} onChange={e => setForm({...form, empId: e.target.value})} />
                     <input required type="password" placeholder="Passcode" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" value={form.pass} onChange={e => setForm({...form, pass: e.target.value})} />
                   </div>
                   <input type="text" placeholder="Unit / Department" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" value={form.dept} onChange={e => setForm({...form, dept: e.target.value})} />
                </div>
              </div>

              <div className="space-y-5">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 pb-2">Client Portfolio</p>
                <textarea 
                  placeholder="Portfolio Names (e.g. Reliance, TATA, HDFC)" 
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all resize-none"
                  rows={2}
                  value={form.assignedClients}
                  onChange={e => setForm({...form, assignedClients: e.target.value})}
                />
              </div>

              <div className="space-y-5">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 pb-2">Connectivity</p>
                <div className="grid grid-cols-2 gap-4">
                   <input type="tel" placeholder="Mobile" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} />
                   <input type="email" placeholder="Email" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
              </div>

              <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100">
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mb-5 flex items-center gap-2"><MapPin size={12} /> Assigned Sector</p>
                <div className="space-y-5">
                  <select 
                    className="w-full p-5 bg-white border border-blue-100 rounded-2xl font-black text-[11px] uppercase tracking-widest outline-none shadow-sm"
                    value={form.territoryName}
                    onChange={(e) => onTerritoryPresetChange(e.target.value, true)}
                  >
                    <option value="">Select Territory...</option>
                    {Object.keys(TERRITORY_PRESETS).map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="Custom">Custom Coordinates...</option>
                  </select>
                  <div className="grid grid-cols-2 gap-4">
                    <input required step="any" type="number" placeholder="Lat" className="w-full p-4 bg-white border border-blue-100 rounded-xl text-xs font-bold tabular-nums" value={form.lat} onChange={e => setForm({...form, lat: e.target.value})} />
                    <input required step="any" type="number" placeholder="Lng" className="w-full p-4 bg-white border border-blue-100 rounded-xl text-xs font-bold tabular-nums" value={form.lng} onChange={e => setForm({...form, lng: e.target.value})} />
                  </div>
                </div>
              </div>
              
              <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] active:scale-95 transition-all shadow-2xl shadow-slate-200">Register Account</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STAFF SETTINGS */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-950/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="bg-indigo-600 p-10 flex justify-between text-white sticky top-0 z-10">
              <div>
                <h3 className="font-black uppercase tracking-[0.3em] text-[10px] mb-2 text-indigo-200">Management</h3>
                <p className="text-xl font-black tracking-tight">Staff Configuration</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="bg-white/10 p-3 rounded-2xl hover:bg-white/20 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-10 space-y-8">
              <div className="flex items-center gap-6 border-b border-slate-100 pb-8">
                 <img src={editingUser?.avatar} className="w-20 h-20 rounded-[2rem] shadow-xl border-4 border-slate-50" />
                 <div>
                    <p className="text-lg font-black text-slate-900 tracking-tight">{editingUser?.name}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Ref ID: {editingUser?.employeeId}</p>
                 </div>
              </div>

              <div className="space-y-5">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 pb-2">Active Portfolio</p>
                <textarea 
                  placeholder="Portfolio Names (comma separated)" 
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all resize-none"
                  rows={3}
                  value={editForm.assignedClients}
                  onChange={e => setEditForm({...editForm, assignedClients: e.target.value})}
                />
              </div>

              <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100">
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-5 flex items-center gap-2"><MapPin size={12} /> Beat Definition</p>
                <div className="space-y-5">
                  <select 
                    className="w-full p-5 bg-white border border-indigo-100 rounded-2xl font-black text-[11px] uppercase tracking-widest outline-none shadow-sm"
                    value={editForm.territoryName}
                    onChange={(e) => onTerritoryPresetChange(e.target.value, false)}
                  >
                    {Object.keys(TERRITORY_PRESETS).map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="Custom">Custom Region...</option>
                  </select>
                  <div className="grid grid-cols-2 gap-4">
                    <input required step="any" type="number" className="w-full p-4 bg-white border border-indigo-100 rounded-xl text-xs font-bold tabular-nums" value={editForm.lat} onChange={e => setEditForm({...editForm, lat: e.target.value})} />
                    <input required step="any" type="number" className="w-full p-4 bg-white border border-indigo-100 rounded-xl text-xs font-bold tabular-nums" value={editForm.lng} onChange={e => setEditForm({...editForm, lng: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="space-y-5 pt-4">
                <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-slate-200">
                  <CheckCircle2 size={18} className="text-blue-400" /> Apply Configuration
                </button>
                
                <div className="pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="w-full bg-red-50 text-red-600 py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.25em] active:scale-95 transition-all flex items-center justify-center gap-3 border border-red-100 hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 size={18} /> Purge Account
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="bg-white rounded-[3rem] w-full max-w-sm overflow-hidden animate-slide-up shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-100">
            <div className="p-10 text-center">
              <div className="w-24 h-24 bg-red-50 text-red-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-red-100 shadow-xl shadow-red-50">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tight">Security Halt</h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-10 leading-relaxed px-4">
                You are about to permanently purge <span className="text-red-600 font-black underline decoration-2">{editingUser?.name}</span> and all associated datasets. This operation is irreversible.
              </p>
              
              <div className="space-y-4">
                <button 
                  onClick={handleConfirmDelete}
                  disabled={isProcessing}
                  className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl shadow-red-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Purge'}
                </button>
                <button 
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  disabled={isProcessing}
                  className="w-full bg-slate-100 text-slate-500 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-slate-200 transition-colors"
                >
                  Abort
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
