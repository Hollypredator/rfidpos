// ══════════════════════════════════════════════
// SaaS Terminology Dictionary (Hotel vs Entertainment Center)
// ══════════════════════════════════════════════

export interface Terminology {
  tenantLabel: string;
  tenantLabelPossessive: string;
  roomLabel: string;
  roomsLabel: string;
  roomNoLabel: string;
  newRoomLabel: string;
  editRoomLabel: string;
  roomDescLabel: string;
  guestLabel: string;
  guestsLabel: string;
  newGuestLabel: string;
  guestNameLabel: string;
  receptionLabel: string;
  receptionDesc: string;
  checkInLabel: string;
  checkOutLabel: string;
  roomBalanceLabel: string;
  pinLabel: string;
  activeGuestsLabel: string;
  occupiedRoomsLabel: string;
  totalRoomsLabel: string;
  depositLabel: string;
  depositDesc: string;
  dailyLimitLabel: string;
}

export const HOTEL_TERMS: Terminology = {
  tenantLabel: 'Otel',
  tenantLabelPossessive: 'Otelinizin',
  roomLabel: 'Oda',
  roomsLabel: 'Odalar',
  roomNoLabel: 'Oda No',
  newRoomLabel: 'Yeni Oda',
  editRoomLabel: 'Oda Düzenle',
  roomDescLabel: 'Oda numarası ara...',
  guestLabel: 'Misafir',
  guestsLabel: 'Misafirler',
  newGuestLabel: 'Yeni Misafir',
  guestNameLabel: 'Misafir Adı',
  receptionLabel: 'Resepsiyon',
  receptionDesc: 'Misafir kart tanımlama, check-in/out ve bakiye yükleme işlemleri',
  checkInLabel: 'Check-in Yap',
  checkOutLabel: 'Check-out Yap',
  roomBalanceLabel: 'Oda Bakiyesi',
  pinLabel: 'Oda PIN Kodu',
  activeGuestsLabel: 'Aktif Misafir',
  occupiedRoomsLabel: 'Dolu Odalar',
  totalRoomsLabel: 'Toplam Oda',
  depositLabel: 'Depozito',
  depositDesc: 'Oda güvence bedeli',
  dailyLimitLabel: 'Günlük Harcama Limiti',
};

export const ENTERTAINMENT_TERMS: Terminology = {
  tenantLabel: 'Tesis',
  tenantLabelPossessive: 'Tesisinizin',
  roomLabel: 'Kart/Bileklik',
  roomsLabel: 'Kartlar & Bileklikler',
  roomNoLabel: 'Kart/Bileklik No',
  newRoomLabel: 'Yeni Kart Tanımla',
  editRoomLabel: 'Kart Düzenle',
  roomDescLabel: 'Kart/Bileklik numarası ara...',
  guestLabel: 'Müşteri',
  guestsLabel: 'Müşteriler',
  newGuestLabel: 'Yeni Müşteri',
  guestNameLabel: 'Müşteri/Ziyaretçi Adı',
  receptionLabel: 'Danışma & Kasa',
  receptionDesc: 'Müşteri kart tanımlama, bakiye yükleme, iade ve depozito işlemleri',
  checkInLabel: 'Giriş / Kart Satış',
  checkOutLabel: 'Çıkış / Kart İade',
  roomBalanceLabel: 'Kart Bakiyesi',
  pinLabel: 'Kart PIN Kodu',
  activeGuestsLabel: 'Aktif Müşteri',
  occupiedRoomsLabel: 'Aktif Kartlar',
  totalRoomsLabel: 'Toplam Kart',
  depositLabel: 'Kart/Bileklik Güvence Bedeli',
  depositDesc: 'Kart veya bileklik depozito ücreti',
  dailyLimitLabel: 'Günlük Harcama Limiti',
};

export function getTerminology(businessType?: string): Terminology {
  if (businessType === 'entertainment') {
    return ENTERTAINMENT_TERMS;
  }
  return HOTEL_TERMS;
}
