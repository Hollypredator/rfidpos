'use client';

import React, { useEffect, useState } from 'react';
import {
  DoorOpen,
  Users,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  CreditCard,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createClient } from '../../utils/supabase';
import { DashboardStats, Transaction, Room } from '../../types';
import { useTerminology } from '../../hooks/useTerminology';

export default function DashboardPage() {
  const { tenant, profile } = useAuth();
  const t = useTerminology();
  const [stats, setStats] = useState<DashboardStats>({
    totalRooms: 0, occupiedRooms: 0, totalBalance: 0,
    todayTransactions: 0, todayRevenue: 0, activeGuests: 0,
  });
  const [recentTxs, setRecentTxs] = useState<(Transaction & { room?: Room })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const fetchDashboardData = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);

    try {
      // Rooms
      const { data: rooms } = await supabase
        .from('rooms')
        .select('*')
        .eq('tenant_id', tenant.id);

      const totalRooms = rooms?.length || 0;
      const occupiedRooms = rooms?.filter((r: any) => r.status === 'occupied').length || 0;
      const totalBalance = rooms?.reduce((sum: number, r: any) => sum + Number(r.wallet_balance), 0) || 0;

      // Guests
      const roomIds = rooms?.map((r: any) => r.id) || [];
      let activeGuests = 0;
      if (roomIds.length > 0) {
        const { count } = await supabase
          .from('guests')
          .select('*', { count: 'exact', head: true })
          .in('room_id', roomIds)
          .eq('status', 'active');
        activeGuests = count || 0;
      }

      // Today's transactions
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayTxs } = await supabase
        .from('transactions')
        .select('*')
        .eq('tenant_id', tenant.id)
        .gte('created_at', todayStart.toISOString());

      const todayTransactions = todayTxs?.length || 0;
      const todayRevenue = todayTxs
        ?.filter((t: any) => t.type === 'charge')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0;

      setStats({
        totalRooms, occupiedRooms, totalBalance,
        todayTransactions, todayRevenue, activeGuests,
      });

      // Recent transactions
      const { data: recent } = await supabase
        .from('transactions')
        .select('*, room:rooms(room_number)')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentTxs(recent || []);
    } catch (err) {
      console.error('Dashboard data error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleUpdate = () => {
      fetchDashboardData();
    };
    window.addEventListener('rfid-db-updated', handleUpdate);
    return () => {
      window.removeEventListener('rfid-db-updated', handleUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  const txTypeLabel = (type: string) => {
    switch (type) {
      case 'charge': return { label: 'Ödeme', color: 'var(--danger)', icon: <ArrowDownRight size={14} /> };
      case 'topup': return { label: 'Yükleme', color: 'var(--success)', icon: <ArrowUpRight size={14} /> };
      case 'refund': return { label: 'İade', color: 'var(--warning)', icon: <ArrowUpRight size={14} /> };
      default: return { label: type, color: 'var(--muted)', icon: null };
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Hoş Geldiniz 👋</h1>
          <p className="page-subtitle">{tenant?.name || t.tenantLabel} — Genel Bakış</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchDashboardData} disabled={isLoading}>
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Yenile
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="stat-card accent">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Toplam Bakiye</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>₺{stats.totalBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
            </div>
            <Wallet size={20} style={{ color: 'var(--accent)' }} />
          </div>
        </div>

        <div className="stat-card success">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Bugünkü Gelir</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>₺{stats.todayRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
            </div>
            <TrendingUp size={20} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{stats.todayTransactions} işlem</div>
        </div>

        <div className="stat-card warning">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t.roomsLabel}</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.occupiedRooms} / {stats.totalRooms}</div>
            </div>
            <DoorOpen size={20} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{t.occupiedRoomsLabel} / {t.totalRoomsLabel}</div>
        </div>

        <div className="stat-card danger">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t.activeGuestsLabel}</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.activeGuests}</div>
            </div>
            <Users size={20} style={{ color: 'var(--danger)' }} />
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Son İşlemler</h3>
          <a href="/dashboard/transactions" style={{ fontSize: 13, color: 'var(--accent-light)', textDecoration: 'none' }}>
            Tümünü Gör →
          </a>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            Yükleniyor...
          </div>
        ) : recentTxs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <ArrowLeftRight size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p>Henüz işlem kaydı bulunmuyor</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>{t.roomLabel}</th>
                  <th>Tür</th>
                  <th>Lokasyon</th>
                  <th style={{ textAlign: 'right' }}>Tutar</th>
                </tr>
              </thead>
              <tbody>
                {recentTxs.map((tx) => {
                  const typeInfo = txTypeLabel(tx.type);
                  return (
                    <tr key={tx.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={13} style={{ color: 'var(--muted)' }} />
                          <span style={{ fontSize: 13 }}>{new Date(tx.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-muted">
                          {(tx as any).room?.room_number || tx.room_id.slice(0, 8)}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: typeInfo.color, fontSize: 13 }}>
                          {typeInfo.icon}
                          {typeInfo.label}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--muted)' }}>{tx.location}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 14 }}>
                        <span style={{ color: tx.type === 'charge' ? 'var(--danger)' : 'var(--success)' }}>
                          {tx.type === 'charge' ? '-' : '+'}₺{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
