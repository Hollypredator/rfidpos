'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight, Search, Loader2, ArrowUpRight, ArrowDownRight,
  Calendar, Filter, Download, Clock, DoorOpen, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { createClient } from '../../../utils/supabase';
import { Transaction } from '../../../types';
import { useTerminology } from '../../../hooks/useTerminology';

export default function TransactionsPage() {
  const { tenant } = useAuth();
  const supabase = createClient();
  const t = useTerminology();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');

  const fetchTransactions = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);

    let query = supabase
      .from('transactions')
      .select('*, room:rooms(room_number), guest:guests(guest_name)')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filterType !== 'all') {
      query = query.eq('type', filterType);
    }

    if (filterDate) {
      const start = new Date(filterDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filterDate);
      end.setHours(23, 59, 59, 999);
      query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
    }

    const { data } = await query;
    setTransactions(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTransactions();

    const handleUpdate = () => {
      fetchTransactions();
    };
    window.addEventListener('rfid-db-updated', handleUpdate);
    return () => {
      window.removeEventListener('rfid-db-updated', handleUpdate);
    };
  }, [tenant?.id, filterType, filterDate]);

  const txTypeInfo = (type: string) => {
    switch (type) {
      case 'charge': return { label: 'Ödeme', color: 'var(--danger)', icon: <ArrowDownRight size={14} />, badge: 'badge-danger' };
      case 'topup': return { label: 'Yükleme', color: 'var(--success)', icon: <ArrowUpRight size={14} />, badge: 'badge-success' };
      case 'refund': return { label: 'İade', color: 'var(--warning)', icon: <ArrowUpRight size={14} />, badge: 'badge-warning' };
      default: return { label: type, color: 'var(--muted)', icon: null, badge: 'badge-muted' };
    }
  };

  const totals = {
    charges: transactions.filter(t => t.type === 'charge').reduce((s, t) => s + Number(t.amount), 0),
    topups: transactions.filter(t => t.type === 'topup').reduce((s, t) => s + Number(t.amount), 0),
    refunds: transactions.filter(t => t.type === 'refund').reduce((s, t) => s + Number(t.amount), 0),
  };

  const handleExport = () => {
    const csvRows = [
      ['Tarih', t.roomLabel, t.guestLabel, 'Tür', 'Lokasyon', 'Tutar'].join(','),
      ...transactions.map(tx => [
        new Date(tx.created_at).toLocaleString('tr-TR'),
        (tx as any).room?.room_number || '',
        (tx as any).guest?.guest_name || '',
        tx.type,
        tx.location,
        tx.amount,
      ].join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `islemler_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">İşlem Geçmişi</h1>
          <p className="page-subtitle">{transactions.length} kayıt gösteriliyor</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={fetchTransactions}>
            <RefreshCw size={14} /> Yenile
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleExport}>
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="stat-card danger" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Toplam Ödeme</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--danger)' }}>₺{totals.charges.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card success" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Toplam Yükleme</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success)' }}>₺{totals.topups.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card warning" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Toplam İade</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--warning)' }}>₺{totals.refunds.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select className="input" style={{ width: 'auto', minWidth: 140 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">Tüm Türler</option>
          <option value="charge">Ödeme</option>
          <option value="topup">Yükleme</option>
          <option value="refund">İade</option>
        </select>
        <input type="date" className="input" style={{ width: 'auto' }} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        {filterDate && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilterDate('')}>Tarihi Temizle</button>
        )}
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            Yükleniyor...
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <ArrowLeftRight size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p>İşlem bulunamadı</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>{t.roomLabel}</th>
                  <th>{t.guestLabel}</th>
                  <th>Tür</th>
                  <th>Lokasyon</th>
                  <th>Senkron</th>
                  <th style={{ textAlign: 'right' }}>Tutar</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const info = txTypeInfo(tx.type);
                  return (
                    <tr key={tx.id}>
                      <td>
                        <div style={{ fontSize: 13 }}>
                          {new Date(tx.created_at).toLocaleString('tr-TR', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-muted">
                          <DoorOpen size={12} />
                          {(tx as any).room?.room_number || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>{(tx as any).guest?.guest_name || '—'}</td>
                      <td><span className={`badge ${info.badge}`}>{info.icon} {info.label}</span></td>
                      <td style={{ fontSize: 13, color: 'var(--muted)' }}>{tx.location}</td>
                      <td>
                        {tx.is_synced
                          ? <span className="badge badge-success" style={{ fontSize: 11 }}>✓</span>
                          : <span className="badge badge-warning" style={{ fontSize: 11 }}>Bekliyor</span>
                        }
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
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
