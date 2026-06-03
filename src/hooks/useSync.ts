import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { OfflineDBService } from '../services/db';
import { SyncQueueItem, Room, Guest, Tenant, Transaction } from '../types';

const MAX_SYNC_ATTEMPTS = 5; // Maksimum deneme sayısı — aşıldığında dead letter'a taşınır

export function useSync(tenantId: string | null) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncQueueCount, setSyncQueueCount] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Update sync queue count from IndexedDB
  const updateQueueCount = useCallback(async () => {
    try {
      const queue = await OfflineDBService.getAll<SyncQueueItem>('sync_queue');
      setSyncQueueCount(queue.length);
      return queue;
    } catch (err) {
      console.error('Error fetching sync queue count:', err);
      return [];
    }
  }, []);

  // Download all database state from Supabase to IndexedDB
  const downloadServerState = useCallback(async (activeTenantId: string) => {
    try {
      setSyncError(null);
      
      // 1. Fetch Tenants
      const { data: tenants, error: tenantsErr } = await supabase
        .from('tenants')
        .select('*');
      if (tenantsErr) throw tenantsErr;
      if (tenants) await OfflineDBService.bulkUpsert('tenants', tenants);

      // 2. Fetch Rooms for active Tenant
      const { data: rooms, error: roomsErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('tenant_id', activeTenantId);
      if (roomsErr) throw roomsErr;
      if (rooms) await OfflineDBService.bulkUpsert('rooms', rooms);

      // 3. Fetch Guests for active Tenant (via room relation)
      const roomIds = (rooms || []).map((r: Room) => r.id);
      if (roomIds.length > 0) {
        const { data: guests, error: guestsErr } = await supabase
          .from('guests')
          .select('*')
          .in('room_id', roomIds);
        if (guestsErr) throw guestsErr;
        if (guests) await OfflineDBService.bulkUpsert('guests', guests);
      }

      setLastSyncedAt(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to download state from Supabase:', err);
      setSyncError(`Data download failed: ${err.message || err}`);
    }
  }, []);

  // Upload pending queue items to Supabase in FIFO sequence
  const uploadPendingTransactions = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOnline(false);
      return;
    }

    const queue = await updateQueueCount();
    if (queue.length === 0) return;

    setIsSyncing(true);
    setSyncError(null);

    // Sort by transaction timestamp to process FIFO
    const sortedQueue = [...queue].sort(
      (a, b) => new Date(a.transaction.created_at).getTime() - new Date(b.transaction.created_at).getTime()
    );

    for (const item of sortedQueue) {
      // Dead letter check — max deneme sayısını aşmış öğeleri atla
      if (item.attempts >= MAX_SYNC_ATTEMPTS) {
        console.warn(`Transaction ${item.id} exceeded max retry attempts (${MAX_SYNC_ATTEMPTS}). Moving to dead letter.`);
        item.error = `DEAD_LETTER: ${MAX_SYNC_ATTEMPTS} deneme sonrası kalıcı başarısız. Son hata: ${item.error || 'Bilinmiyor'}`;
        await OfflineDBService.put('sync_queue', item);
        // Dead letter öğesini kuyruğun önünden kaldırmak yerine devam et (FIFO kırılmasın)
        // Bir sonraki senkronizasyonda tekrar atlanacak
        continue;
      }

      try {
        const txData = {
          id: item.transaction.id,
          tenant_id: item.transaction.tenant_id,
          room_id: item.transaction.room_id,
          guest_id: item.transaction.guest_id,
          amount: item.transaction.amount,
          type: item.transaction.type,
          location: item.transaction.location,
          performed_by: item.transaction.performed_by,
          created_at: item.transaction.created_at,
          is_synced: true // Will be marked synced in Supabase
        };

        // Try inserting into Supabase
        const { error } = await supabase.from('transactions').insert([txData]);

        // If unique key violation, it's already synced (might have succeeded in a previous broken request)
        const isDuplicate = error && error.code === '23505';

        if (!error || isDuplicate) {
          // 1. Update local transaction status to synced
          const localTx = await OfflineDBService.getById<Transaction>('transactions', item.id);
          if (localTx) {
            await OfflineDBService.put('transactions', { ...localTx, is_synced: true });
          }
          // 2. Remove from local queue
          await OfflineDBService.delete('sync_queue', item.id);
        } else {
          // Real server-side trigger violation (e.g., balance check failed, database mismatch)
          throw error;
        }
      } catch (err: any) {
        console.error(`Failed to sync transaction ${item.id} (attempt ${item.attempts + 1}/${MAX_SYNC_ATTEMPTS}):`, err);
        setSyncError(`Sync error on transaction: ${err.message || 'Connection lost'}`);
        
        // Update item retry count
        item.attempts += 1;
        item.last_attempt = new Date().toISOString();
        item.error = err.message || String(err);
        await OfflineDBService.put('sync_queue', item);
        
        // Halt queue processing to preserve FIFO order & avoid balance inconsistencies
        break;
      }
    }

    await updateQueueCount();
    setIsSyncing(false);
  }, [updateQueueCount]);

  // Main sync orchestrator
  const performSync = useCallback(async () => {
    if (!tenantId) return;
    
    setIsOnline(navigator.onLine);
    if (!navigator.onLine) return;

    setIsSyncing(true);
    // 1. Sync pending local items
    await uploadPendingTransactions();
    // 2. Sync fresh room balance/guest data down
    await downloadServerState(tenantId);
    
    setIsSyncing(false);
    await updateQueueCount();
  }, [tenantId, uploadPendingTransactions, downloadServerState, updateQueueCount]);

  // Handle network listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      performSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check & periodic sync polling (every 30 seconds)
    performSync();
    const interval = setInterval(() => {
      performSync();
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [performSync]);

  return {
    isOnline,
    isSyncing,
    syncQueueCount,
    lastSyncedAt,
    syncError,
    forceSync: performSync,
    updateQueueCount
  };
}
