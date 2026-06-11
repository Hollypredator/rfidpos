'use client';

import React, { useEffect, useState } from 'react';
import { 
  History, Search, Loader2, Download, Filter, 
  Info, Eye, X, ShieldAlert, CheckCircle, RefreshCw
} from 'lucide-react';
import { createClient } from '../../../utils/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { AuditLog, Tenant, Profile } from '../../../types';

export default function AuditLogsPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [logs, setLogs] = useState<any[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Log Modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Tenants
      const { data: tenantsData } = await supabase.from('tenants').select('id, name');
      setTenants(tenantsData || []);

      // 2. Fetch Profiles
      const { data: profilesData } = await supabase.from('profiles').select('id, full_name, email');
      setProfiles(profilesData || []);

      // 3. Fetch Audit Logs
      const { data: logsData } = await supabase
        .from('audit_logs')
        .select(`
          *,
          profile:profiles(full_name, email)
        `)
        .order('created_at', { ascending: false });
      setLogs(logsData || []);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      toast({ message: 'Denetim logları yüklenirken hata oluştu.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter Logic
  const filteredLogs = logs.filter(log => {
    // 1. Search Query (matches user name, email, action, entity type or id)
    const matchesSearch = 
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
      log.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
      log.id?.includes(search);

    // 2. Tenant filter
    const matchesTenant = selectedTenantId === 'all' || log.tenant_id === selectedTenantId;

    // 3. Action filter
    const matchesAction = selectedAction === 'all' || log.action === selectedAction;

    // 4. Date filter
    let matchesDate = true;
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      matchesDate = matchesDate && new Date(log.created_at) >= start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(log.created_at) <= end;
    }

    return matchesSearch && matchesTenant && matchesAction && matchesDate;
  });

  // Extract unique action types for filter dropdown
  const uniqueActions = Array.from(new Set(logs.map(log => log.action))).filter(Boolean);

  // CSV Export Utility
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast({ message: 'Dışa aktarılacak log bulunmuyor.', type: 'warning' });
      return;
    }

    try {
      const headers = ['Log ID', 'Tarih', 'İşletme ID', 'Kullanıcı', 'E-posta', 'İşlem', 'Varlık Türü', 'Etkilenen ID', 'IP Adresi', 'Meta Veri'];
      const rows = filteredLogs.map(log => [
        log.id,
        new Date(log.created_at).toISOString(),
        log.tenant_id || 'Sistem',
        log.profile?.full_name || 'Sistem',
        log.profile?.email || 'noreply@system.local',
        log.action,
        log.entity_type || '—',
        log.entity_id || '—',
        log.ip_address || '—',
        JSON.stringify(log.metadata || {})
      ]);

      const csvContent = [
        '\uFEFF' + headers.join(','), // Include UTF-8 BOM for Turkish character encoding in Excel
        ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `rfid_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ message: 'Denetim logları CSV olarak indirildi.', type: 'success' });
    } catch (err) {
      toast({ message: 'CSV dışa aktarım sırasında hata oluştu.', type: 'error' });
    }
  };

  const getActionLabelAndColor = (action: string) => {
    switch (action) {
      case 'payment_approved':
        return { label: 'Ödeme Onaylandı', color: 'var(--success)' };
      case 'payment_rejected':
        return { label: 'Ödeme Reddedildi', color: 'var(--danger)' };
      case 'order_status_updated':
        return { label: 'Sipariş Sevk Güncelleme', color: 'var(--accent-light)' };
      case 'support_ticket_created':
        return { label: 'Destek Bileti Açıldı', color: 'var(--warning)' };
      case 'support_ticket_replied':
        return { label: 'Destek Bileti Yanıtlandı', color: 'var(--success)' };
      case 'tenant_activated':
        return { label: 'Lisans Aktifleştirildi', color: 'var(--success)' };
      case 'tenant_suspended':
        return { label: 'Lisans Askıya Alındı', color: 'var(--danger)' };
      default:
        return { label: action, color: 'var(--muted)' };
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Sistem Denetim Logları (Audit)</h1>
          <p className="page-subtitle">Sistem yöneticileri ve otel/işletme yöneticileri tarafından gerçekleştirilen kritik operasyonel işlemleri geriye dönük izleyin.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={fetchData} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Yenile
          </button>
          <button className="btn btn-primary" onClick={handleExportCSV}>
            <Download size={16} />
            Excel / CSV Dışa Aktar
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="glass-card" style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <label className="input-label" style={{ fontSize: 11 }}>İsim, E-posta veya İşlem Ara</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input 
                className="input" 
                placeholder="Arama terimi girin..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                style={{ paddingLeft: 32, fontSize: 13, height: 36 }}
              />
            </div>
          </div>

          {/* Tenant Filter */}
          <div>
            <label className="input-label" style={{ fontSize: 11 }}>İşletme / Tesis</label>
            <select 
              className="input" 
              value={selectedTenantId} 
              onChange={(e) => setSelectedTenantId(e.target.value)}
              style={{ fontSize: 13, height: 36 }}
            >
              <option value="all">Tüm İşletmeler</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="input-label" style={{ fontSize: 11 }}>İşlem Tipi</label>
            <select 
              className="input" 
              value={selectedAction} 
              onChange={(e) => setSelectedAction(e.target.value)}
              style={{ fontSize: 13, height: 36 }}
            >
              <option value="all">Tüm İşlemler</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{getActionLabelAndColor(action).label}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="input-label" style={{ fontSize: 11 }}>Başlangıç Tarihi</label>
            <input 
              className="input" 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              style={{ fontSize: 13, height: 36 }}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="input-label" style={{ fontSize: 11 }}>Bitiş Tarihi</label>
            <input 
              className="input" 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              style={{ fontSize: 13, height: 36 }}
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            Log Kayıtları Yükleniyor...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <History size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p>Aradığınız kriterlere uygun sistem günlüğü (log) bulunamadı.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Tarih / Saat</th>
                  <th>İşlemi Gerçekleştiren</th>
                  <th>Rolü</th>
                  <th>Bağlı İşletme</th>
                  <th>İşlem Kategorisi</th>
                  <th>Hedef Varlık</th>
                  <th style={{ textAlign: 'right' }}>İncele</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const actionStyle = getActionLabelAndColor(log.action);
                  const tenantName = tenants.find(t => t.id === log.tenant_id)?.name || 'Sistem';
                  
                  return (
                    <tr key={log.id} className="table-row-hover">
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                        {new Date(log.created_at).toLocaleString('tr-TR')}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{log.profile?.full_name || 'Sistem Otonom'}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{log.profile?.email || 'system@rfidpos.local'}</div>
                      </td>
                      <td>
                        <span className="badge badge-muted" style={{ fontSize: 10 }}>
                          {log.profile?.role === 'super_admin' ? 'Superadmin' : log.profile?.role === 'platform_owner' ? 'Platform Sahibi' : log.profile?.role || 'Sistem'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{tenantName}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: `${actionStyle.color}15`, color: actionStyle.color, border: `1px solid ${actionStyle.color}25` }}>
                          {actionStyle.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{log.entity_type || '—'}</div>
                        {log.entity_id && (
                          <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>ID: {log.entity_id.substring(0, 8)}...</div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedLog(log)} title="Detayları İncele">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Detail Inspector Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={18} style={{ color: 'var(--accent)' }} />
                İşlem Detay Müfettişi (Log Inspector)
              </h3>
              <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                <div>
                  <span style={{ color: 'var(--muted)', fontSize: 11, display: 'block' }}>LOG KAYIT ID</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedLog.id}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', fontSize: 11, display: 'block' }}>TARİH / SAAT</span>
                  <span style={{ fontWeight: 600 }}>{new Date(selectedLog.created_at).toLocaleString('tr-TR')}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', fontSize: 11, display: 'block' }}>KULLANICI</span>
                  <span style={{ fontWeight: 600 }}>{selectedLog.profile?.full_name || 'Sistem / Trigger'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', fontSize: 11, display: 'block' }}>IP ADRESİ</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedLog.ip_address || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', fontSize: 11, display: 'block' }}>İŞLEM KATEGORİSİ</span>
                  <span style={{ fontWeight: 600, color: getActionLabelAndColor(selectedLog.action).color }}>{getActionLabelAndColor(selectedLog.action).label}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', fontSize: 11, display: 'block' }}>HEDEF VARLIK TÜRÜ</span>
                  <span style={{ fontWeight: 600 }}>{selectedLog.entity_type || '—'} (ID: {selectedLog.entity_id || '—'})</span>
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--muted)', fontSize: 11, display: 'block', marginBottom: 6 }}>İŞLEM DETAY METADATA (JSON)</span>
                <pre style={{ 
                  margin: 0, 
                  padding: 12, 
                  background: 'var(--card-bg)', 
                  border: '1px solid var(--border)', 
                  borderRadius: 8, 
                  fontSize: 12, 
                  fontFamily: 'monospace', 
                  overflowX: 'auto',
                  maxHeight: 180,
                  whiteSpace: 'pre-wrap'
                }}>
                  {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div style={{ display: 'flex', marginTop: 24 }}>
              <button className="btn btn-primary" onClick={() => setSelectedLog(null)} style={{ flex: 1 }}>Müfettişi Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
