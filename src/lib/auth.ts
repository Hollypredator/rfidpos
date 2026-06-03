import { UserRole } from '../types';

// Role hierarchy — higher index = more permissions
const ROLE_HIERARCHY: UserRole[] = [
  'waiter',
  'cashier',
  'receptionist',
  'manager',
  'hotel_admin',
  'super_admin',
];

// Permission definitions
const PERMISSIONS: Record<string, UserRole[]> = {
  // POS Operations
  'pos.charge':      ['waiter', 'cashier', 'receptionist', 'manager', 'hotel_admin', 'super_admin'],
  'pos.refund':      ['cashier', 'receptionist', 'manager', 'hotel_admin', 'super_admin'],
  'pos.topup':       ['receptionist', 'manager', 'hotel_admin', 'super_admin'],

  // Room Management
  'rooms.view':      ['receptionist', 'manager', 'hotel_admin', 'super_admin'],
  'rooms.create':    ['manager', 'hotel_admin', 'super_admin'],
  'rooms.edit':      ['manager', 'hotel_admin', 'super_admin'],
  'rooms.delete':    ['hotel_admin', 'super_admin'],

  // Guest Management
  'guests.view':     ['receptionist', 'manager', 'hotel_admin', 'super_admin'],
  'guests.create':   ['receptionist', 'manager', 'hotel_admin', 'super_admin'],
  'guests.edit':     ['receptionist', 'manager', 'hotel_admin', 'super_admin'],
  'guests.delete':   ['manager', 'hotel_admin', 'super_admin'],

  // Transactions
  'transactions.view':    ['manager', 'hotel_admin', 'super_admin'],
  'transactions.export':  ['hotel_admin', 'super_admin'],

  // Users
  'users.view':      ['hotel_admin', 'super_admin'],
  'users.manage':    ['hotel_admin', 'super_admin'],

  // Settings
  'settings.view':   ['hotel_admin', 'super_admin'],
  'settings.edit':   ['hotel_admin', 'super_admin'],

  // Reports
  'reports.view':    ['manager', 'hotel_admin', 'super_admin'],

  // Admin (Platform)
  'admin.access':    ['super_admin'],
  'tenants.manage':  ['super_admin'],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY.indexOf(role);
}

export function isRoleAtLeast(userRole: UserRole, requiredRole: UserRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    super_admin: 'Platform Yöneticisi',
    hotel_admin: 'Otel Yöneticisi',
    manager: 'Departman Müdürü',
    receptionist: 'Resepsiyonist',
    waiter: 'Garson',
    cashier: 'Kasiyer',
  };
  return labels[role] || role;
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    super_admin: '#ef4444',
    hotel_admin: '#f97316',
    manager: '#eab308',
    receptionist: '#22c55e',
    waiter: '#3b82f6',
    cashier: '#a855f7',
  };
  return colors[role] || '#6b7280';
}
