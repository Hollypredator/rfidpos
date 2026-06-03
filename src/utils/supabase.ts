import { createBrowserClient } from '@supabase/ssr';
import { getMockDb, setTableData, getTableData, saveMockDb, MockSchema } from './mockDb';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') ||
  process.env.NEXT_PUBLIC_SUPABASE_URL === '';

// Production güvenlik uyarısı — mock mode'da veri kaybı riski var
if (typeof window !== 'undefined' && isMockMode) {
  console.warn(
    '%c⚠️ RFID POS: MOCK MODE AKTİF — Gerçek veritabanı bağlantısı yok!\n' +
    'Tüm veriler localStorage\'da tutulmaktadır. Production ortamında NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY env değişkenlerini ayarlayın.',
    'background: #f59e0b; color: #000; font-size: 14px; padding: 8px; border-radius: 4px;'
  );
}

function applyJoins(table: string, data: any[], selectQuery: string) {
  const db = getMockDb();
  if (table === 'transactions') {
    return data.map(tx => {
      const copy = { ...tx };
      if (selectQuery.includes('room:rooms')) {
        const room = db.rooms.find(r => r.id === tx.room_id);
        copy.room = room ? { room_number: room.room_number, wallet_balance: room.wallet_balance } : null;
      }
      if (selectQuery.includes('guest:guests')) {
        const guest = db.guests.find(g => g.id === tx.guest_id);
        copy.guest = guest ? { guest_name: guest.guest_name } : null;
      }
      return copy;
    });
  }
  if (table === 'guests') {
    return data.map(guest => {
      const copy = { ...guest };
      if (selectQuery.includes('room:rooms')) {
        const room = db.rooms.find(r => r.id === guest.room_id);
        copy.room = room ? { room_number: room.room_number, wallet_balance: room.wallet_balance, pin_code: room.pin_code } : null;
      }
      return copy;
    });
  }
  return data;
}

class MockSupabaseQuery {
  table: string;
  selectQuery: string = '*';
  selectOptions: any = null;
  filters: Array<(item: any) => boolean> = [];
  orderByCol?: string;
  orderAsc?: boolean;
  limitNum?: number;
  operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  payload: any = null;

  constructor(table: string) {
    this.table = table;
  }

  select(query = '*', options?: any) {
    this.selectQuery = query;
    this.selectOptions = options;
    this.operation = 'select';
    return this;
  }

  eq(col: string, val: any) {
    if (val !== undefined && val !== null) {
      this.filters.push(item => item[col] === val);
    }
    return this;
  }

  in(col: string, vals: any[]) {
    if (vals && vals.length > 0) {
      this.filters.push(item => vals.includes(item[col]));
    }
    return this;
  }

  gte(col: string, val: any) {
    if (val !== undefined && val !== null) {
      this.filters.push(item => item[col] >= val);
    }
    return this;
  }

  order(col: string, options?: { ascending: boolean }) {
    this.orderByCol = col;
    this.orderAsc = options?.ascending ?? true;
    return this;
  }

  limit(n: number) {
    this.limitNum = n;
    return this;
  }

  single() {
    return this.execute().then(res => ({
      data: res.data ? (Array.isArray(res.data) ? res.data[0] || null : res.data) : null,
      error: res.error
    }));
  }

  insert(values: any) {
    this.operation = 'insert';
    this.payload = values;
    return this;
  }

  update(values: any) {
    this.operation = 'update';
    this.payload = values;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  async execute() {
    const db = getMockDb();
    const tableData = db[this.table as keyof MockSchema] || [];
    let resultData = [...tableData];

    // Apply filters
    for (const filter of this.filters) {
      resultData = resultData.filter(filter);
    }

    if (this.operation === 'select') {
      if (this.orderByCol) {
        const col = this.orderByCol;
        const asc = this.orderAsc ?? true;
        resultData.sort((a: any, b: any) => {
          if (a[col] < b[col]) return asc ? -1 : 1;
          if (a[col] > b[col]) return asc ? 1 : -1;
          return 0;
        });
      }

      if (this.limitNum !== undefined) {
        resultData = resultData.slice(0, this.limitNum);
      }

      resultData = applyJoins(this.table, resultData, this.selectQuery);

      const count = resultData.length;
      const data = this.selectOptions?.head ? null : resultData;
      return { data, error: null, count };
    }

    if (this.operation === 'insert') {
      const recordsToInsert = Array.isArray(this.payload) ? this.payload : [this.payload];
      const newRecords = recordsToInsert.map(record => ({
        id: record.id || `mock-${this.table}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        ...record
      }));

      const updatedTable = [...tableData, ...newRecords];
      setTableData(this.table as keyof MockSchema, updatedTable as any);

      if (this.table === 'transactions') {
        for (const tx of newRecords) {
          const rooms = getTableData('rooms');
          const roomIdx = rooms.findIndex(r => r.id === tx.room_id);
          if (roomIdx !== -1) {
            const currentBalance = Number(rooms[roomIdx].wallet_balance);
            let newBalance = currentBalance;
            if (tx.type === 'charge') {
              newBalance = Math.max(0, currentBalance - Number(tx.amount));
            } else if (tx.type === 'topup') {
              newBalance = currentBalance + Number(tx.amount);
            } else if (tx.type === 'refund') {
              newBalance = currentBalance + Number(tx.amount);
            }
            rooms[roomIdx] = { ...rooms[roomIdx], wallet_balance: newBalance };
            setTableData('rooms', rooms);
          }
        }
      }

      return { data: Array.isArray(this.payload) ? newRecords : newRecords[0], error: null };
    }

    if (this.operation === 'update') {
      const updatedTable = tableData.map(item => {
        let matches = true;
        for (const filter of this.filters) {
          if (!filter(item)) {
            matches = false;
            break;
          }
        }
        if (matches) {
          return { ...item, ...this.payload };
        }
        return item;
      });

      setTableData(this.table as keyof MockSchema, updatedTable as any);
      
      const updatedItems = updatedTable.filter(item => {
        let matches = true;
        for (const filter of this.filters) {
          if (!filter(item)) {
            matches = false;
            break;
          }
        }
        return matches;
      });

      return { data: updatedItems, error: null };
    }

    if (this.operation === 'delete') {
      const remainingTable = tableData.filter(item => {
        let matches = true;
        for (const filter of this.filters) {
          if (!filter(item)) {
            matches = false;
            break;
          }
        }
        return !matches;
      });

      setTableData(this.table as keyof MockSchema, remainingTable as any);
      return { data: null, error: null };
    }

    return { data: null, error: 'Unknown operation' };
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

type AuthChangeListener = (event: string, session: any) => void;
const listeners = new Set<AuthChangeListener>();

const mockAuth = {
  listeners,
  notify(event: string, session: any) {
    listeners.forEach(cb => cb(event, session));
  },
  getSession: () => {
    if (typeof window === 'undefined') return Promise.resolve({ data: { session: null }, error: null });
    let userStr = localStorage.getItem('mock_user');
    let user = null;
    try {
      if (userStr) {
        user = JSON.parse(userStr);
      }
    } catch (e) {
      console.warn('Corrupted mock_user found in localStorage, clearing.');
      localStorage.removeItem('mock_user');
      userStr = null;
    }

    if (!userStr || !user) {
      const defaultUser = {
        id: 'mock-user-id',
        email: 'admin@hotelpos.com',
        user_metadata: { full_name: 'Deneme Otel Yöneticisi', role: 'hotel_admin' },
      };
      localStorage.setItem('mock_user', JSON.stringify(defaultUser));
      user = defaultUser;
    }
    return Promise.resolve({ data: { session: { user, access_token: 'mock-token' } }, error: null });
  },
  getUser: () => {
    if (typeof window === 'undefined') return Promise.resolve({ data: { user: null }, error: null });
    let userStr = localStorage.getItem('mock_user');
    let user = null;
    try {
      if (userStr) {
        user = JSON.parse(userStr);
      }
    } catch (e) {
      localStorage.removeItem('mock_user');
      userStr = null;
    }

    if (!userStr || !user) {
      const defaultUser = {
        id: 'mock-user-id',
        email: 'admin@hotelpos.com',
        user_metadata: { full_name: 'Deneme Otel Yöneticisi', role: 'hotel_admin' },
      };
      localStorage.setItem('mock_user', JSON.stringify(defaultUser));
      user = defaultUser;
    }
    return Promise.resolve({ data: { user }, error: null });
  },
  onAuthStateChange: (callback: AuthChangeListener) => {
    listeners.add(callback);
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('mock_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setTimeout(() => callback('SIGNED_IN', { user, access_token: 'mock-token' }), 0);
        } catch (e) {
          localStorage.removeItem('mock_user');
        }
      }
    }
    return { data: { subscription: { unsubscribe: () => { listeners.delete(callback); } } } };
  },
  signInWithPassword: async ({ email }: { email: string }) => {
    const role = email.startsWith('super') 
      ? 'super_admin' 
      : email.startsWith('waiter') 
      ? 'waiter' 
      : email.startsWith('receptionist') 
      ? 'receptionist' 
      : 'hotel_admin';

    const user = {
      id: `mock-${role}-id`,
      email: email,
      user_metadata: { full_name: `${email.split('@')[0]} Kullanıcısı`, role },
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('mock_user', JSON.stringify(user));
      const db = getMockDb();
      let profile = db.profiles.find(p => p.id === user.id);
      if (!profile) {
        profile = {
          id: user.id,
          tenant_id: role === 'super_admin' ? null : 'mock-tenant-id',
          full_name: `${email.split('@')[0].toUpperCase()} Yetkilisi`,
          email: email,
          role: role as any,
          is_active: true,
          created_at: new Date().toISOString()
        };
        db.profiles.push(profile);
        saveMockDb(db);
      }
    }

    const session = { user, access_token: 'mock-token' };
    mockAuth.notify('SIGNED_IN', session);
    return { data: { user, session }, error: null };
  },
  signOut: async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mock_user');
    }
    mockAuth.notify('SIGNED_OUT', null);
    return { error: null };
  },
  signUp: async ({ email, options }: { email: string, options?: any }) => {
    const fullName = options?.data?.full_name || 'Yeni Otel';
    const role = options?.data?.role || 'hotel_admin';
    const user = {
      id: `mock-${role}-${Math.random().toString(36).substr(2, 9)}`,
      email: email,
      user_metadata: { full_name: fullName, role },
    };
    return { data: { user }, error: null };
  }
};

const mockSupabaseClient = {
  auth: mockAuth,
  from: (table: string) => {
    return new MockSupabaseQuery(table);
  }
} as any;

export function createClient() {
  if (isMockMode) {
    return mockSupabaseClient;
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createClient();
