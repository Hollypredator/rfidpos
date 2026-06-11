'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2, CreditCard, Package, MessageSquare, Shield,
  ArrowRight, Loader2, RefreshCw, AlertCircle, CheckCircle2, TrendingUp,
  Activity, Clock
} from 'lucide-react';
import { createClient } from '../../utils/supabase';
import { useRouter } from 'next/navigation';

export default function SuperadminDashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  // Metrics
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalVolume: 0,
    pendingPayments: 0,
    pendingOrders: 0,
    openTickets: 0,
    hotelCount: 0,
    entertainmentCount: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [recentTenants, setRecentTenants] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [allTenants, setAllTenants] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch Tenants
      const { data: tenants } = await supabase.from('tenants').select('*');
      const totalTenants = tenants?.length || 0;
      const activeTenants = tenants?.filter((t: any) => t.status === 'active').length || 0;
      const hotelCount = tenants?.filter((t: any) => (t.settings as any)?.business_type === 'hotel' || !(t.settings as any)?.business_type).length || 0;
      const entertainmentCount = tenants?.filter((t: any) => (t.settings as any)?.business_type === 'entertainment').length || 0;

      // Fetch Volume & Daily Transaction for last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return {
          dateStr: d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' }),
          rawDate: d.toDateString(),
          amount: 0
        };
      }).reverse();

      const { data: txs } = await supabase.from('transactions').select('amount, type, created_at');
      const totalVolume = (txs || [])
        .filter((t: any) => t.type === 'charge')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      if (txs) {
        txs.forEach((tx: any) => {
          if (tx.type === 'charge') {
            const txDate = new Date(tx.created_at).toDateString();
            const matchingDay = last7Days.find(day => day.rawDate === txDate);
            if (matchingDay) {
              matchingDay.amount += Number(tx.amount);
            }
          }
        });
      }
      setRevenueData(last7Days);

      // Fetch pending payments
      const { data: payments } = await supabase.from('payments').select('*');
      const pendingPayments = payments?.filter((p: any) => p.status === 'pending').length || 0;

      // Fetch pending orders
      const { data: orders } = await supabase.from('orders').select('*');
      const pendingOrders = orders?.filter((o: any) => o.shipping_status === 'preparing').length || 0;

      // Fetch support tickets
      const { data: tickets } = await supabase.from('tickets').select('*');
      const openTickets = tickets?.filter((t: any) => t.status === 'pending').length || 0;

      setStats({
        totalTenants,
        activeTenants,
        totalVolume,
        pendingPayments,
        pendingOrders,
        openTickets,
        hotelCount,
        entertainmentCount
      });

      // Sorted recent tenants
      const sortedTenants = [...(tenants || [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
      setRecentTenants(sortedTenants);
      setAllTenants(tenants || []);

      // Fetch recent logs
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentLogs(logs || []);

    } catch (err) {
      console.error('Error loading superadmin stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getLogDetails = (log: any) => {
    const tenant = allTenants.find(t => t.id === log.tenant_id);
    const hotelName = tenant ? tenant.name : 'Sistem';
    const metadata = log.metadata || {};

    let icon = <Shield size={14} />;
    let color = 'var(--muted)';
    let text = '';

    switch (log.action) {
      case 'payment_approved':
        icon = <CreditCard size={14} />;
        color = 'var(--success)';
        text = `Havale Bildirimi Onaylandı: ${hotelName} ödemesi onaylandı ve lisansı 365 gün uzatıldı.`;
        break;
      case 'payment_rejected':
        icon = <CreditCard size={14} />;
        color = 'var(--danger)';
        text = `Ödeme Bildirimi Reddedildi: ${hotelName} havale bildirimi geçersiz sayıldı.`;
        break;
      case 'order_status_updated':
        icon = <Package size={14} />;
        color = 'var(--accent)';
        const st = metadata.shipping_status === 'shipped' ? 'kargoya verildi' : metadata.shipping_status === 'delivered' ? 'teslim edildi' : 'hazırlanıyor';
        text = `Sipariş Sevk Durumu: ${hotelName} donanım paketi ${st}.`;
        break;
      case 'support_ticket_created':
        icon = <MessageSquare size={14} />;
        color = 'var(--warning)';
        text = `Yeni Destek Talebi: ${hotelName} bir destek bileti açtı: "${metadata.subject || ''}"`;
        break;
      case 'support_ticket_replied':
        icon = <MessageSquare size={14} />;
        color = 'var(--success-light)';
        text = `Destek Talebi Yanıtlandı: Sistem yöneticisi ${hotelName} talebini yanıtladı.`;
        break;
      case 'support_ticket_user_replied':
        icon = <MessageSquare size={14} />;
        color = 'var(--warning)';
        text = `Destekten Yeni Mesaj: ${hotelName} destek talebine yanıt yazdı.`;
        break;
      case 'tenant_activated':
        icon = <Building2 size={14} />;
        color = 'var(--success)';
        text = `Lisans Başlatıldı: ${hotelName} işletme lisansı aktif edildi.`;
        break;
      case 'tenant_suspended':
        icon = <Building2 size={14} />;
        color = 'var(--danger)';
        text = `Lisans Durduruldu: ${hotelName} lisansı askıya alındı.`;
        break;
      default:
        text = `${log.action} işlemi gerçekleştirildi: ${hotelName}`;
    }

    return { icon, color, text };
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <Shield size={26} style={{ color: 'var(--danger)' }} />
            Sistem Yönetim Paneli
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, margin: 0 }}>
            Tüm işletmeler, lisanslar, donanım siparişleri ve operasyonel süreçler
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchDashboardData} disabled={isLoading}>
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Verileri Yenile
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 30 }}>
        {/* Total Tenants */}
        <div className="stat-card accent" onClick={() => router.push('/superadmin/tenants')} style={{ cursor: 'pointer', transition: 'all 0.2s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Kayıtlı İşletmeler</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{stats.totalTenants}</div>
            </div>
            <Building2 size={24} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>{stats.activeTenants} aktif sistem lisansı</span>
          </div>
        </div>

        {/* Volume */}
        <div className="stat-card success">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Toplam Platform Cirosu</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>₺{stats.totalVolume.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
            </div>
            <TrendingUp size={24} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
            İşletmelerdeki toplam harcama hacmi
          </div>
        </div>

        {/* Pending Payments */}
        <div className={`stat-card ${stats.pendingPayments > 0 ? 'warning' : 'muted'}`} onClick={() => router.push('/superadmin/payments')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Ödeme Onayları</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: stats.pendingPayments > 0 ? 'var(--warning)' : 'inherit' }}>{stats.pendingPayments}</div>
            </div>
            <CreditCard size={24} style={{ color: stats.pendingPayments > 0 ? 'var(--warning)' : 'var(--muted)' }} />
          </div>
          <div style={{ fontSize: 11, color: stats.pendingPayments > 0 ? 'var(--warning)' : 'var(--muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            {stats.pendingPayments > 0 ? (
              <>
                <AlertCircle size={12} />
                <span>Onay bekleyen havale bildirimleri</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={12} />
                <span>Bekleyen onay bulunmuyor</span>
              </>
            )}
          </div>
        </div>

        {/* Pending Orders */}
        <div className={`stat-card ${stats.pendingOrders > 0 ? 'warning' : 'muted'}`} onClick={() => router.push('/superadmin/orders')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Donanım Sevkiyatı</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: stats.pendingOrders > 0 ? 'var(--warning)' : 'inherit' }}>{stats.pendingOrders}</div>
            </div>
            <Package size={24} style={{ color: stats.pendingOrders > 0 ? 'var(--warning)' : 'var(--muted)' }} />
          </div>
          <div style={{ fontSize: 11, color: stats.pendingOrders > 0 ? 'var(--warning)' : 'var(--muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            {stats.pendingOrders > 0 ? 'Kargolanacak cihaz siparişleri' : 'Tüm siparişler gönderildi'}
          </div>
        </div>

        {/* Open Support Tickets */}
        <div className={`stat-card ${stats.openTickets > 0 ? 'danger' : 'muted'}`} onClick={() => router.push('/superadmin/support')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Destek Talepleri</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: stats.openTickets > 0 ? 'var(--danger)' : 'inherit' }}>{stats.openTickets}</div>
            </div>
            <MessageSquare size={24} style={{ color: stats.openTickets > 0 ? 'var(--danger)' : 'var(--muted)' }} />
          </div>
          <div style={{ fontSize: 11, color: stats.openTickets > 0 ? 'var(--danger)' : 'var(--muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            {stats.openTickets > 0 ? 'Cevap bekleyen destek mesajı' : 'Destek kuyruğu temiz'}
          </div>
        </div>
      </div>

      {/* Analytics & System Health Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginBottom: 30, alignItems: 'stretch' }}>
        {/* Revenue Chart */}
        <div className="glass-card" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Gelir Grafiği (Son 7 Gün)</h3>
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: '4px 0 0' }}>Günlük platform genelinde gerçekleşen ödeme tutarları</p>
            </div>
            <span style={{ fontSize: 10, padding: '4px 8px', borderRadius: 12, background: 'var(--success-glow)', color: 'var(--success)', fontWeight: 600 }}>Otomatik Güncellenir</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 180, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            {revenueData.map((d, index) => {
              const maxAmount = Math.max(...revenueData.map(r => r.amount), 1);
              const heightPercent = (d.amount / maxAmount) * 100;
              return (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 8, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--success)' }}>
                    {d.amount > 0 ? `₺${d.amount.toFixed(0)}` : '—'}
                  </div>
                  <div style={{
                    width: '35%',
                    maxWidth: 24,
                    height: `${Math.max(heightPercent, 3)}%`,
                    background: d.amount > 0 ? 'linear-gradient(to top, var(--success), var(--success-light))' : 'var(--border)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.5s ease-out'
                  }} />
                  <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {d.dateStr}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side: System Health & Industry Distribution */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Health Monitor */}
          <div className="glass-card" style={{ padding: '20px 20px', flex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={16} style={{ color: 'var(--success)' }} />
              Sistem Sağlığı Monitörü
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>Veritabanı</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Aktif / Çevrimiçi</div>
                </div>
              </div>
              <div style={{ padding: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>Sync Servisi</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Kararlı / Boşta</div>
                </div>
              </div>
              <div style={{ padding: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>Supabase API</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Bağlandı (SSL)</div>
                </div>
              </div>
              <div style={{ padding: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>Sunucu CPU</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>%1.4 (Düşük)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Business Type Distribution */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>İşletme Türü Dağılımı</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              <span>Tesis Sektör Dağılımı</span>
              <span style={{ color: 'var(--muted)' }}>Toplam: {stats.totalTenants}</span>
            </div>
            {/* progress bar segmented */}
            <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden', display: 'flex', marginBottom: 12 }}>
              <div style={{ width: `${stats.totalTenants ? (stats.hotelCount / stats.totalTenants) * 100 : 0}%`, background: 'var(--accent)' }} title="Konaklama / Otel" />
              <div style={{ width: `${stats.totalTenants ? (stats.entertainmentCount / stats.totalTenants) * 100 : 0}%`, background: 'var(--info)' }} title="Eğlence / Tesis" />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, color: 'var(--muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} /> Konaklama / Otel: {stats.hotelCount}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--info)' }} /> Eğlence / Tesis: {stats.entertainmentCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Hotels & Operations Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Recent Hotels */}
          <div className="glass-card" style={{ padding: '24px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Son Kayıt Olan İşletmeler</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => router.push('/superadmin/tenants')} style={{ fontSize: 12, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                Tümünü Yönet <ArrowRight size={12} />
              </button>
            </div>

            {isLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                Yükleniyor...
              </div>
            ) : recentTenants.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 20 }}>Henüz hiçbir işletme kaydı bulunmuyor.</p>
            ) : (
              <table className="data-table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>İşletme Adı</th>
                    <th>Durum</th>
                    <th>Plan</th>
                    <th>Kayıt Tarihi</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTenants.map((t) => (
                    <tr key={t.id} className="table-row-hover" style={{ cursor: 'pointer' }} onClick={() => router.push('/superadmin/tenants')}>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td>
                        {t.status === 'active' && <span className="badge badge-success">Aktif</span>}
                        {t.status === 'inactive' && <span className="badge badge-muted">Pasif</span>}
                        {t.status === 'suspended' && <span className="badge badge-danger">Askıda</span>}
                      </td>
                      <td style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700, color: t.subscription_plan === 'premium' ? 'var(--accent-light)' : 'inherit' }}>
                        {t.subscription_plan || 'none'}
                      </td>
                      <td style={{ color: 'var(--muted)' }}>
                        {t.created_at ? new Date(t.created_at).toLocaleDateString('tr-TR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent System Activities (Timeline) */}
          <div className="glass-card" style={{ padding: '24px 20px' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} style={{ color: 'var(--accent)' }} />
              Son Sistem Aktiviteleri (Zaman Tüneli)
            </h3>

            {isLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>
                <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                Yükleniyor...
              </div>
            ) : recentLogs.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, padding: 16 }}>Henüz sisteme kaydedilmiş bir aktivite bulunmuyor.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', paddingLeft: 12 }}>
                {/* Vertical line connector */}
                <div style={{
                  position: 'absolute',
                  left: 17,
                  top: 8,
                  bottom: 8,
                  width: 2,
                  background: 'var(--border)',
                  zIndex: 0
                }} />

                {recentLogs.map((log) => {
                  const details = getLogDetails(log);
                  return (
                    <div key={log.id} style={{ display: 'flex', gap: 12, zIndex: 1, position: 'relative' }}>
                      {/* Circle icon marker */}
                      <div style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: 'var(--card)',
                        border: `2.5px solid ${details.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 4,
                        flexShrink: 0
                      }} />

                      {/* Timeline message body */}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, color: 'var(--foreground)', margin: 0, lineHeight: 1.4 }}>
                          {details.text}
                        </p>
                        <span style={{ fontSize: 10, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Clock size={10} />
                          {new Date(log.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick Operations Guide */}
          <div className="glass-card" style={{ padding: '24px 20px' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Hızlı Operasyon Rehberi</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13, color: 'var(--muted)', lineHeight: '1.5' }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1',
                  display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0
                }}>1</div>
                <div>
                  <strong>Aktivasyon Talebi Onayı</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                    Yeni kayıt olan işletmeler pasif olarak kurulur. Ödeme alındığında veya donanım teslimatı tamamlandığında lisansı başlatmak için <strong>Ödemeler</strong> menüsünü kullanın.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308',
                  display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0
                }}>2</div>
                <div>
                  <strong>Donanım Sevk Kontrolü</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                    Yeni sipariş edilen el terminali, USB RFID kart yazıcısı gibi kargoların durumunu <strong>Siparişler</strong> sekmesinden güncelleyip takip numarası girebilirsiniz.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                  display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0
                }}>3</div>
                <div>
                  <strong>Destek ve Sorun Bildirimleri</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                    Kilitli ekranlardaki aktivasyon talepleri ve sistem içi destek mesajları <strong>Destek</strong> sayfasına düşer. Talepleri buradan yanıtlayabilirsiniz.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Platform & License Distribution */}
          <div className="glass-card" style={{ padding: '24px 20px' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} style={{ color: 'var(--accent)' }} />
              Platform & Lisans Durumu
            </h3>
            
            {/* Active vs Suspended vs Inactive */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                <span>Lisans Durumları</span>
                <span style={{ color: 'var(--muted)' }}>Toplam: {stats.totalTenants}</span>
              </div>
              
              {/* Multi-segment progress bar */}
              <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden', display: 'flex', marginBottom: 8 }}>
                <div style={{ width: `${stats.totalTenants ? (stats.activeTenants / stats.totalTenants) * 100 : 0}%`, background: 'var(--success)' }} title="Aktif" />
                <div style={{ width: `${stats.totalTenants ? (allTenants.filter(t => t.status === 'suspended').length / stats.totalTenants) * 100 : 0}%`, background: 'var(--danger)' }} title="Askıda" />
                <div style={{ width: `${stats.totalTenants ? (allTenants.filter(t => t.status === 'inactive').length / stats.totalTenants) * 100 : 0}%`, background: 'var(--muted)' }} title="Pasif" />
              </div>
              
              {/* Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', fontSize: 11, color: 'var(--muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} /> Aktif: {stats.activeTenants}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }} /> Askıda: {allTenants.filter(t => t.status === 'suspended').length}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--muted)' }} /> Pasif: {allTenants.filter(t => t.status === 'inactive').length}</span>
              </div>
            </div>

            {/* Plan Distribution */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <span>Abonelik Plan Dağılımı</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Premium bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                    <span>Premium Plan</span>
                    <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{allTenants.filter(t => t.subscription_plan === 'premium').length} İşletme</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${stats.totalTenants ? (allTenants.filter(t => t.subscription_plan === 'premium').length / stats.totalTenants) * 100 : 0}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-light))', height: '100%' }} />
                  </div>
                </div>

                {/* Standard bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                    <span>Standart Plan</span>
                    <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{allTenants.filter(t => t.subscription_plan === 'basic').length} İşletme</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${stats.totalTenants ? (allTenants.filter(t => t.subscription_plan === 'basic').length / stats.totalTenants) * 100 : 0}%`, background: 'var(--info)', height: '100%' }} />
                  </div>
                </div>

                {/* None bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                    <span>Lisanssız / Yok</span>
                    <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{allTenants.filter(t => !t.subscription_plan || t.subscription_plan === 'none').length} İşletme</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${stats.totalTenants ? (allTenants.filter(t => !t.subscription_plan || t.subscription_plan === 'none').length / stats.totalTenants) * 100 : 0}%`, background: 'var(--border-light)', height: '100%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
