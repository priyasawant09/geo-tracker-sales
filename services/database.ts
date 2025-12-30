
import { User, AttendanceRecord, MeetingRecord } from '../types';
import { MOCK_USERS } from '../constants';

const USERS_KEY = 'gs_db_users_v2';
const HISTORY_KEY = 'gs_db_history_v2';
const MEETINGS_KEY = 'gs_db_meetings_v2';

export const db = {
  getUsers: (): User[] => {
    const data = localStorage.getItem(USERS_KEY);
    if (!data) {
      localStorage.setItem(USERS_KEY, JSON.stringify(MOCK_USERS));
      return MOCK_USERS;
    }
    return JSON.parse(data);
  },

  saveUser: (user: User): User[] => {
    const users = db.getUsers();
    const updated = [...users, user];
    localStorage.setItem(USERS_KEY, JSON.stringify(updated));
    return updated;
  },

  updateUser: (userId: string, updates: Partial<User>): User[] => {
    const users = db.getUsers();
    const updated = users.map(u => u.id === userId ? { ...u, ...updates } : u);
    localStorage.setItem(USERS_KEY, JSON.stringify(updated));
    return updated;
  },

  deleteUser: (userId: string): User[] => {
    const users = db.getUsers();
    const updated = users.filter(u => u.id !== userId);
    localStorage.setItem(USERS_KEY, JSON.stringify(updated));
    return updated;
  },

  getHistory: (): AttendanceRecord[] => {
    const data = localStorage.getItem(HISTORY_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return parsed.map((r: any) => ({ ...r, timestamp: new Date(r.timestamp) }));
  },

  addRecord: (record: AttendanceRecord): AttendanceRecord[] => {
    const history = db.getHistory();
    const updated = [...history, record];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  },

  getMeetings: (): MeetingRecord[] => {
    const data = localStorage.getItem(MEETINGS_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
  },

  addMeeting: (meeting: MeetingRecord): MeetingRecord[] => {
    const meetings = db.getMeetings();
    const updated = [...meetings, meeting];
    localStorage.setItem(MEETINGS_KEY, JSON.stringify(updated));
    return updated;
  }
};