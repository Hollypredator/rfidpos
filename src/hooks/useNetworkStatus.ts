'use client';

import { useState, useEffect, useCallback } from 'react';
import { OfflineDBService } from '../services/db';

// ══════════════════════════════════════════════
// Network Status & Sync Queue Monitor Hook
// ══════════════════════════════════════════════

interface NetworkStatus {
  isOnline: boolean;
  pendingSyncCount: number;
  lastSyncAt: string | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  // Check pending sync queue count
  const checkSyncQueue = useCallback(async () => {
    try {
      const items = await OfflineDBService.getAll<any>('sync_queue');
      setPendingSyncCount(items.length);
      if (items.length === 0 && pendingSyncCount > 0) {
        setLastSyncAt(new Date().toISOString());
      }
    } catch {
      // IndexedDB may not be available during SSR
    }
  }, [pendingSyncCount]);

  useEffect(() => {
    // Initial state
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check sync queue periodically
    checkSyncQueue();
    const interval = setInterval(checkSyncQueue, 5000);

    // Also listen for DB updates
    const handleDbUpdate = () => {
      setTimeout(checkSyncQueue, 500);
    };
    window.addEventListener('rfid-db-updated', handleDbUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('rfid-db-updated', handleDbUpdate);
      clearInterval(interval);
    };
  }, [checkSyncQueue]);

  return { isOnline, pendingSyncCount, lastSyncAt };
}
