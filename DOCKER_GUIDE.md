# 🐳 RFID POS SaaS — Veritabanı ve Docker Kurulum Kılavuzu

Supabase Free Plan kotanız dolduğunda projeyi çalıştırmaya devam etmek için uygulayabileceğiniz **3 farklı alternatif** aşağıda detaylandırılmıştır.

---

## 💡 Alternatif 1: Supabase Cloud Kotasını Temizleme (En Kolay & Bulut Çözüm)

Supabase ücretsiz planda **organizasyon başına en fazla 2 aktif projeye** izin verir. Eğer geçmişte deneme amaçlı açtığınız projeler varsa yenisini kurmanıza izin vermez.

1. [Supabase Dashboard](https://supabase.com/dashboard) sayfasına gidin.
2. Kullanmadığınız veya eski deneme projelerinizin ayarlarına girin.
3. **Settings → General → Delete Project** adımlarını izleyerek eski projeleri silin.
4. Yer açıldıktan sonra yeni bir proje oluşturarak Frankfurt (`eu-central-1`) bölgesini seçin ve projenin SQL Editöründe `supabase_schema.sql` dosyasını çalıştırın.

---

## 🛠️ Alternatif 2: Supabase CLI ile Yerel Docker Stack'i (Önerilen Local/Self-Hosted)

Supabase, tüm servislerini (Auth, Database, REST API, Storage, Realtime) kendi Docker konteynerlerinizde çalıştırmanızı sağlayan resmi bir CLI aracına sahiptir. Bu yöntemle **hiçbir ücret ödemeden ve kota sınırı olmadan** kendi bilgisayarınızda veya bir VPS üzerinde tüm sistemi çalıştırabilirsiniz.

### Gereksinimler:
- Bilgisayarınızda **Docker** ve **Docker Compose** kurulu ve çalışır durumda olmalıdır.

### Kurulum Adımları:

1. **Supabase CLI Başlatma**:
   Proje ana dizininde terminali açıp aşağıdaki komutu çalıştırarak yerel Supabase yapılandırmasını oluşturun:
   ```bash
   npx supabase init
   ```
   *(Bu komut, kök dizinde bir `supabase` klasörü oluşturur.)*

2. **Docker Konteynerlerini Başlatma**:
   Aşağıdaki komutu çalıştırarak PostgreSQL, GoTrue (Auth), Kong (API Gateway), Realtime, Storage ve Studio'yu Docker üzerinde ayağa kaldırın:
   ```bash
   npx supabase start
   ```
   *İlk çalıştırmada Docker imajları indirileceği için birkaç dakika sürebilir.*

3. **Bağlantı Bilgilerini Alın**:
   Konteynerler açıldığında terminalde size yerel API URL'leri ve anahtarlar verilecektir:
   - `API URL`: `http://localhost:54321` (NEXT_PUBLIC_SUPABASE_URL)
   - `anon key`: `eyJhbG...` (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - `Studio URL`: `http://localhost:54323` (Yerel Supabase yönetim paneli)

4. **Şemayı Uygulama**:
   Yerel veritabanına tabloları aktarmak için:
   - `http://localhost:54323` adresindeki Studio paneline tarayıcıdan girin.
   - **SQL Editor** sekmesine gidin.
   - Projedeki `supabase_schema.sql` dosyasının içeriğini buraya yapıştırıp **Run** butonuna basın.

5. **Next.js Yapılandırması**:
   Projenin `.env` dosyasını terminalde verilen yerel key'ler ile güncelleyin:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=yerel_anon_keyiniz
   ```

---

## 🗄️ Alternatif 3: Standart PostgreSQL Docker Compose (Sadece Veritabanı)

Supabase API katmanları yerine sadece standart bir PostgreSQL veritabanını Docker üzerinde çalıştırmak isterseniz, proje kök dizininde hazır bulunan `docker-compose.yml` dosyasını kullanabilirsiniz.

### Çalıştırma Adımları:

1. **Postgres Konteynerini Ayağa Kaldırın**:
   ```bash
   docker compose up -d
   ```

2. **Veritabanına Bağlanın**:
   - Host: `localhost`
   - Port: `5432`
   - User: `postgres`
   - Password: `your-super-secure-password-here` (docker-compose.yml içinden değiştirebilirsiniz)
   - Database: `postgres`

3. **Konteynerleri Kapatma**:
   ```bash
   docker compose down
   ```
