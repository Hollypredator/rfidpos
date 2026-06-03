'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3, Loader2, RefreshCw, Calendar, ArrowUpRight, ArrowDownRight,
  TrendingUp, Wallet, MapPin, Printer, Download, Award, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { createClient } from '../../../utils/supabase';
import { Transaction, Room } from '../../../types';

export default function ReportsPage() {
  const { tenant } = useAuth();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filterRange, setFilterRange] = useState<'today' | '7days' | '30days' | 'all'>('30days');

  const fetchData = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);

    try {
      // 1. Fetch Rooms to map room numbers
      const { data: roomsData } = await supabase
        .from('rooms')
        .select('*')
        .eq('tenant_id', tenant.id);
      setRooms(roomsData || []);

      // 2. Fetch Transactions
      let query = supabase
        .from('transactions')
        .select('*, room:rooms(room_number), guest:guests(guest_name)')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      const today = new Date();
      if (filterRange === 'today') {
        today.setHours(0, 0, 0, 0);
        query = query.gte('created_at', today.toISOString());
      } else if (filterRange === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        query = query.gte('created_at', sevenDaysAgo.toISOString());
      } else if (filterRange === '30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        query = query.gte('created_at', thirtyDaysAgo.toISOString());
      }

      const { data: txsData, error: txError } = await query;
      if (txError) throw txError;

      setTransactions(txsData || []);
    } catch (err) {
      console.error('Rapor yükleme hatası:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleUpdate = () => {
      fetchData();
    };
    window.addEventListener('rfid-db-updated', handleUpdate);
    return () => {
      window.removeEventListener('rfid-db-updated', handleUpdate);
    };
  }, [tenant?.id, filterRange]);

  // Calculations
  const charges = transactions.filter(t => t.type === 'charge');
  const topups = transactions.filter(t => t.type === 'topup');
  const refunds = transactions.filter(t => t.type === 'refund');

  const totalCharges = charges.reduce((s, t) => s + Number(t.amount), 0);
  const totalTopups = topups.reduce((s, t) => s + Number(t.amount), 0);
  const totalRefunds = refunds.reduce((s, t) => s + Number(t.amount), 0);

  const averageCharge = charges.length > 0 ? (totalCharges / charges.length) : 0;
  const transactionCount = transactions.length;

  // 1. Group by Location (for Donut Chart)
  const locationTotals: Record<string, number> = {};
  charges.forEach(tx => {
    const loc = tx.location || 'Bilinmeyen';
    locationTotals[loc] = (locationTotals[loc] || 0) + Number(tx.amount);
  });

  const locationData = Object.entries(locationTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totalLocationVolume = locationData.reduce((sum, item) => sum + item.value, 0);

  // 2. Group by Day of Week (for Bar Chart)
  const daysOfWeek = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const dailyTotals: Record<string, number> = {
    'Pazartesi': 0, 'Salı': 0, 'Çarşamba': 0, 'Perşembe': 0, 'Cuma': 0, 'Cumartesi': 0, 'Pazar': 0
  };

  charges.forEach(tx => {
    const date = new Date(tx.created_at);
    const dayName = daysOfWeek[date.getDay()];
    if (dayName in dailyTotals) {
      dailyTotals[dayName] += Number(tx.amount);
    }
  });

  const maxDailyValue = Math.max(...Object.values(dailyTotals), 1);

  // 3. Top spending rooms ranking
  const roomSpendMap: Record<string, { roomNo: string; balance: number; totalSpend: number; count: number }> = {};
  charges.forEach(tx => {
    const rId = tx.room_id;
    const roomNum = (tx as any).room?.room_number || 'Bilinmeyen';
    if (!roomSpendMap[rId]) {
      const dbRoom = rooms.find(r => r.id === rId);
      roomSpendMap[rId] = {
        roomNo: roomNum,
        balance: dbRoom ? Number(dbRoom.wallet_balance) : 0,
        totalSpend: 0,
        count: 0
      };
    }
    roomSpendMap[rId].totalSpend += Number(tx.amount);
    roomSpendMap[rId].count += 1;
  });

  const topRooms = Object.values(roomSpendMap)
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 5);

  const handlePrint = () => {
    window.print();
  };

  const getThemeColor = (idx: number) => {
    const colors = [
      'var(--accent)',     // indigo
      'var(--success)',    // emerald
      'var(--warning)',    // amber
      'var(--danger)',     // rose
      '#a855f7',           // purple
      '#06b6d4'            // cyan
    ];
    return colors[idx % colors.length];
  };

  return (
    <div className="printable-area">
      {/* Header */}
      <div className="page-header print:hidden" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Raporlar & Analiz</h1>
          <p className="page-subtitle">Finansal analizler ve ciro grafikleri</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select 
            className="input" 
            style={{ width: 'auto', minWidth: 130, height: 36, padding: '0 12px' }} 
            value={filterRange} 
            onChange={(e) => setFilterRange(e.target.value as any)}
          >
            <option value="today">Bugün</option>
            <option value="7days">Son 7 Gün</option>
            <option value="30days">Son 30 Gün</option>
            <option value="all">Tüm Zamanlar</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={fetchData}>
            <RefreshCw size={14} /> Yenile
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handlePrint}>
            <Printer size={14} /> Yazdır / PDF Al
          </button>
        </div>
      </div>

      {/* Printable Header */}
      <div className="hidden print:block" style={{ borderBottom: '2px solid var(--border)', paddingBottom: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0 }}>{tenant?.name || 'RFID POS'}</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
          Finansal Rapor — Rapor Dönemi: {
            filterRange === 'today' ? 'Bugün' : 
            filterRange === '7days' ? 'Son 7 Gün' : 
            filterRange === '30days' ? 'Son 30 Gün' : 'Tüm Zamanlar'
          } ({new Date().toLocaleDateString('tr-TR')})
        </p>
      </div>

      {isLoading ? (
        <div style={{ padding: 80, textAlign: 'center', color: 'var(--muted)' }}>
          <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--accent)' }} />
          <p style={{ fontWeight: 500 }}>Rapor verileri hesaplanıyor...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Key Metrics Dashboard */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            
            <div className="stat-card danger" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.05), rgba(0,0,0,0.2))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Toplam Satış (Ciro)</div>
                  <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>₺{totalCharges.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', color: 'var(--danger)', flexShrink: 0, justifyContent: 'center' }}>
                  <TrendingUp size={18} />
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{charges.length} harcama işlemi</div>
            </div>

            <div className="stat-card success" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(0,0,0,0.2))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Toplam Bakiye Yükleme</div>
                  <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>₺{totalTopups.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', color: 'var(--success)', flexShrink: 0, justifyContent: 'center' }}>
                  <Wallet size={18} />
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{topups.length} yükleme işlemi</div>
            </div>

            <div className="stat-card accent" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(0,0,0,0.2))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Ortalama Harcama</div>
                  <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>₺{averageCharge.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', color: 'var(--accent)', flexShrink: 0, justifyContent: 'center' }}>
                  <ArrowDownRight size={18} />
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Müşteri başına ort. sepet</div>
            </div>

            <div className="stat-card warning" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(0,0,0,0.2))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Toplam Bakiye İadesi</div>
                  <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>₺{totalRefunds.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', color: 'var(--warning)', flexShrink: 0, justifyContent: 'center' }}>
                  <ArrowUpRight size={18} />
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Check-out iadeleri dahil</div>
            </div>

          </div>

          {/* Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            
            {/* Donut Chart: Location breakdown */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={16} style={{ color: 'var(--accent)' }} />
                Lokasyon Bazlı Ciro Dağılımı
              </h3>
              
              {locationData.length === 0 ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  Harici hizmet satış işlemi bulunmuyor.
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {/* SVG Donut */}
                  <div style={{ position: 'relative', width: 140, height: 140 }}>
                    <svg width="100%" height="100%" viewBox="0 0 42 42">
                      <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4"></circle>
                      {/* Calculate segments */}
                      {(() => {
                        let accumulatedPercent = 0;
                        return locationData.map((item, idx) => {
                          const percent = (item.value / totalLocationVolume) * 100;
                          const strokeDasharray = `${percent} ${100 - percent}`;
                          const strokeDashoffset = 100 - accumulatedPercent + 25; // 25 wraps to start at top (12 o'clock)
                          accumulatedPercent += percent;

                          return (
                            <circle
                              key={item.name}
                              cx="21"
                              cy="21"
                              r="15.91549430918954"
                              fill="transparent"
                              stroke={getThemeColor(idx)}
                              strokeWidth="4"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                            ></circle>
                          );
                        });
                      })()}
                    </svg>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      textAlign: 'center'
                    }}>
                      <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>TOPLAM</span>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>₺{Math.round(totalLocationVolume).toLocaleString('tr-TR')}</span>
                    </div>
                  </div>

                  {/* Legend list */}
                  <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {locationData.map((item, idx) => {
                      const pct = totalLocationVolume > 0 ? ((item.value / totalLocationVolume) * 100) : 0;
                      return (
                        <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: getThemeColor(idx) }}></div>
                            <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>{item.name}</span>
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--muted)' }}>
                            %{pct.toFixed(1)} <span style={{ fontSize: 10, fontWeight: 500, marginLeft: 4 }}>({Math.round(item.value)} ₺)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bar Chart: Daily revenue */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart3 size={16} style={{ color: 'var(--success)' }} />
                Haftalık Günlük Harcama Dağılımı
              </h3>
              <div style={{ display: 'flex', height: 130, alignItems: 'flex-end', gap: 8, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {Object.entries(dailyTotals).map(([day, val], idx) => {
                  const pct = (val / maxDailyValue) * 100;
                  return (
                    <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      {/* Bar fill */}
                      <div 
                        style={{ 
                          width: '100%', 
                          height: `${Math.max(pct, 4)}%`, // min 4% height to see tiny items
                          background: `linear-gradient(to top, rgba(99,102,241,0.6), ${getThemeColor(idx)})`,
                          borderRadius: '6px 6px 0 0',
                          position: 'relative',
                          transition: 'height 0.3s ease'
                        }}
                        title={`${day}: ₺${val.toLocaleString('tr-TR')}`}
                      >
                        {val > 0 && (
                          <div className="bar-hover-val" style={{
                            position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
                            background: 'rgba(0,0,0,0.85)', color: 'white', padding: '2px 4px', borderRadius: 4,
                            fontSize: 9, whiteSpace: 'nowrap', fontWeight: 600
                          }}>
                            ₺{Math.round(val)}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--muted)', width: '100%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {day.slice(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Ranking Table */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Award size={16} style={{ color: 'var(--warning)' }} />
              En Çok Harcama Yapan Odalar Sıralaması
            </h3>
            
            {topRooms.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                Kayıtlı harcama verisi bulunmuyor.
              </div>
            ) : (
              <table className="data-table" style={{ marginTop: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Sıra</th>
                    <th>Oda Numarası</th>
                    <th>İşlem Adedi</th>
                    <th>Mevcut Oda Bakiyesi</th>
                    <th style={{ textAlign: 'right' }}>Toplam Harcama Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {topRooms.map((room, idx) => (
                    <tr key={room.roomNo}>
                      <td>
                        <span style={{ 
                          width: 24, height: 24, borderRadius: '50%', 
                          background: idx === 0 ? 'gold' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#b45309' : 'rgba(255,255,255,0.05)',
                          color: idx < 3 ? 'black' : 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800
                        }}>
                          {idx + 1}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>Oda {room.roomNo}</span>
                      </td>
                      <td>{room.count} harcama</td>
                      <td style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>
                        ₺{room.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--danger)', fontSize: 14 }}>
                        ₺{room.totalSpend.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      )}

      {/* Print Specific CSS Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .printable-area {
            background: white !important;
            color: black !important;
            padding: 0 !important;
          }
          .glass-card {
            background: white !important;
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            color: black !important;
            margin-bottom: 16px !important;
            page-break-inside: avoid;
          }
          .stat-card {
            background: white !important;
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            color: black !important;
          }
          .stat-card div, .glass-card h3, .glass-card td, .glass-card th {
            color: black !important;
          }
          .data-table th {
            background: #f1f5f9 !important;
            border-bottom: 2px solid #cbd5e1 !important;
            color: black !important;
          }
          .data-table td {
            border-bottom: 1px solid #e2e8f0 !important;
            color: black !important;
          }
          .badge-muted {
            background: #f1f5f9 !important;
            color: black !important;
            border: 1px solid #cbd5e1 !important;
          }
          circle[stroke="rgba(255,255,255,0.05)"] {
            stroke: #f1f5f9 !important;
          }
          .hidden-print {
            display: none !important;
          }
          .bar-hover-val {
            display: block !important;
            color: black !important;
            background: none !important;
          }
        }
      `}</style>
    </div>
  );
}
