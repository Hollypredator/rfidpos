import { Tenant, Room, Guest, Transaction, SyncQueueItem } from '../types';

const DB_NAME = 'HotelRFIDWalletDB';
const DB_VERSION = 1;

export class OfflineDBService {
  private static db: IDBDatabase | null = null;

  public static async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('IndexedDB is only available in the browser.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;

        // Create Stores if they don't exist
        if (!db.objectStoreNames.contains('tenants')) {
          db.createObjectStore('tenants', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('rooms')) {
          const roomStore = db.createObjectStore('rooms', { keyPath: 'id' });
          roomStore.createIndex('tenant_id', 'tenant_id', { unique: false });
        }

        if (!db.objectStoreNames.contains('guests')) {
          const guestStore = db.createObjectStore('guests', { keyPath: 'id' });
          guestStore.createIndex('room_id', 'room_id', { unique: false });
          guestStore.createIndex('card_uid', 'card_uid', { unique: true });
        }

        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('room_id', 'room_id', { unique: false });
          txStore.createIndex('is_synced', 'is_synced', { unique: false });
        }

        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id' });
        }
      };
    });
  }

  // --- GENERIC CRUDS ---

  public static async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  public static async getById<T>(storeName: string, id: string): Promise<T | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  public static async put<T>(storeName: string, value: T): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public static async delete(storeName: string, id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- BULK CACHING FROM SERVER ---

  public static async bulkUpsert<T>(storeName: string, data: T[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      data.forEach((item) => {
        store.put(item);
      });
    });
  }

  // --- SPECIFIC RFID LOOKUPS ---

  public static async getGuestByCardUid(cardUid: string): Promise<Guest | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('guests', 'readonly');
      const store = transaction.objectStore('guests');
      const index = store.index('card_uid');
      const request = index.get(cardUid);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // --- OFFLINE TRANSACTION SIMULATION & MUTATION QUEUEING ---

  /**
   * Process a transaction offline:
   * 1. Finds Guest by Card UID
   * 2. Finds Room associated with Guest
   * 3. Validates balance for Charges
   * 4. Updates Room balance in local DB
   * 5. Saves Transaction locally as unsynced
   * 6. Adds Transaction details to sync_queue
   */
  public static async processOfflineTransaction(params: {
    cardUid: string;
    amount: number;
    type: 'charge' | 'refund' | 'topup';
    location: 'bar' | 'spa' | 'restaurant' | 'reception';
    tenantId: string;
    pinCode?: string;
    performedBy?: string;
  }): Promise<{ transaction: Transaction; updatedRoom: Room }> {
    const db = await this.getDB();
    
    // We run this in a readwrite transaction across rooms, guests, transactions, and sync_queue
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['rooms', 'guests', 'transactions', 'sync_queue', 'tenants'], 'readwrite');
      
      const roomsStore = tx.objectStore('rooms');
      const guestsStore = tx.objectStore('guests');
      const txsStore = tx.objectStore('transactions');
      const queueStore = tx.objectStore('sync_queue');
      const tenantsStore = tx.objectStore('tenants');

      const cardIndex = guestsStore.index('card_uid');
      const guestRequest = cardIndex.get(params.cardUid);

      guestRequest.onerror = () => reject(new Error('Failed to search card UID in database.'));
      
      guestRequest.onsuccess = () => {
        const guest = guestRequest.result as Guest | undefined;
        if (!guest) {
          return reject(new Error(`RFID Card with UID "${params.cardUid}" is not registered to any guest.`));
        }

        if (guest.status !== 'active') {
          return reject(new Error('This guest account is currently inactive.'));
        }

        const roomRequest = roomsStore.get(guest.room_id);
        roomRequest.onerror = () => reject(new Error('Failed to fetch room wallet.'));

        roomRequest.onsuccess = () => {
          const room = roomRequest.result as Room | undefined;
          if (!room) {
            return reject(new Error('Associated room wallet not found.'));
          }

          if (room.status !== 'active' && room.status !== 'occupied') {
            return reject(new Error(`Room is not occupied or active (current status: ${room.status}).`));
          }

          // 1. Fetch tenant to get daily spending limit configuration
          const tenantRequest = tenantsStore.get(params.tenantId);
          tenantRequest.onerror = () => reject(new Error('Failed to fetch tenant settings.'));

          tenantRequest.onsuccess = () => {
            const tenantObj = tenantRequest.result as Tenant | undefined;

            // 2. Fetch all transactions to compute today's spending for the room
            const txsRequest = txsStore.getAll();
            txsRequest.onerror = () => reject(new Error('Failed to retrieve transactions for limit check.'));

            txsRequest.onsuccess = () => {
              const allTxs = txsRequest.result as Transaction[];
              
              // Filter to get room's charges made today
              const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
              const roomTxsToday = allTxs.filter(t => 
                t.room_id === room.id && 
                t.type === 'charge' && 
                t.created_at.startsWith(todayStr)
              );

              const spentToday = roomTxsToday.reduce((sum, t) => sum + Number(t.amount), 0);

              // 3. Daily spending limit validation
              if (params.type === 'charge') {
                const tenantLimit = (tenantObj?.settings as any)?.daily_spending_limit;
                const limitToUse = (room.daily_limit && Number(room.daily_limit) > 0)
                  ? Number(room.daily_limit)
                  : (tenantLimit ? Number(tenantLimit) : 0);

                if (limitToUse > 0) {
                  const newTotal = spentToday + Number(params.amount);
                  if (newTotal > limitToUse) {
                    return reject(new Error(`Günlük harcama limiti aşıldı! (Limit: ₺${limitToUse.toFixed(2)}, Bugün harcanan: ₺${spentToday.toFixed(2)}, Denenen: ₺${Number(params.amount).toFixed(2)})`));
                  }
                }
              }

              // PIN code validation for charges
              if (params.type === 'charge') {
                // Her zaman PIN kontrolü yap — boş PIN ile bypass'ı engelle
                if (room.pin_code && room.pin_code.length > 0) {
                  if (!params.pinCode || params.pinCode !== room.pin_code) {
                    return reject(new Error('Hatalı PIN kodu. Lütfen tekrar deneyiniz.'));
                  }
                }
              }

              // Balance validation in cents to avoid floating point precision errors
              const balanceCents = Math.round(Number(room.wallet_balance) * 100);
              const amountCents = Math.round(Number(params.amount) * 100);

              if (params.type === 'charge') {
                if (balanceCents < amountCents) {
                  return reject(new Error(`Yetersiz bakiye. Mevcut: ₺${Number(room.wallet_balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}, Gereken: ₺${Number(params.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`));
                }
              }

              let newBalance = Number(room.wallet_balance);
              if (params.type === 'charge') {
                newBalance -= Number(params.amount);
              } else if (params.type === 'topup' || params.type === 'refund') {
                newBalance += Number(params.amount);
              }
              newBalance = Number(newBalance.toFixed(2));

              // Create transaction record
              const transactionId = crypto.randomUUID();
              const newTransaction: Transaction = {
                id: transactionId,
                tenant_id: params.tenantId,
                room_id: room.id,
                guest_id: guest.id,
                amount: Number(params.amount),
                type: params.type,
                location: params.location,
                performed_by: params.performedBy,
                is_synced: false,
                created_at: new Date().toISOString()
              };

              // Update Room balance locally
              const updatedRoom: Room = {
                ...room,
                wallet_balance: Number(newBalance.toFixed(2))
              };

              // Push queue record
              const queueItem: SyncQueueItem = {
                id: transactionId,
                transaction: newTransaction,
                attempts: 0
              };

              // Execute IndexedDB writes
              roomsStore.put(updatedRoom);
              txsStore.put(newTransaction);
              queueStore.put(queueItem);

              tx.oncomplete = () => {
                resolve({ transaction: newTransaction, updatedRoom });
              };

              tx.onerror = () => {
                reject(new Error('Offline transaction writing failed. Transaction rolled back.'));
              };
            };
          };
        };
      };
    });
  }
}
