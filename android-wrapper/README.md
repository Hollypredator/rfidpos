# RFID POS — Android WebView Wrapper

Bu klasör, Next.js RFID POS web uygulamasını el terminallerinde tam ekran ve native RFID/NFC okuyucu desteği ile çalıştırabilmeniz için hazırlanmış native **Android (Kotlin)** projesidir.

## 🚀 Hızlı Başlangıç

1. **Android Studio'yu Açın:**
   * Android Studio'yu açıp **Open** seçeneğine tıklayın.
   * Proje kök dizinindeki `android-wrapper` klasörünü seçip açın. Gradle bağımlılıklarının yüklenmesini bekleyin.

2. **Hedef URL Ayarı:**
   * [MainActivity.kt](app/src/main/java/com/hotelpos/rfidpos/MainActivity.kt) dosyasını açın.
   * `targetUrl` değişkenini kendi sunucu veya yerel test adresinizle güncelleyin:
     ```kotlin
     // Geliştirme (Emulator için localhost)
     private val targetUrl = "http://10.0.2.2:3000" 

     // Canlı / Staging Ortamı için:
     // private val targetUrl = "https://rfidpos.domain.com"
     ```

3. **Cihazda Çalıştırın:**
   * El terminalinizi (Sunmi, iMin vb.) USB kablosu ile bilgisayara bağlayın (Geliştirici Seçeneklerinden **USB Hata Ayıklama** açık olmalıdır).
   * Android Studio'da üst menüden cihazınızı seçip **Run** (Yeşil oynat simgesi) butonuna basın.

---

## 🛠️ Entegrasyon Detayları

### 1. RFID / NFC Kart Okuma
Uygulama, iki farklı yöntemle kart okumalarını yakalar ve web sayfasına yollar:

* **Standart NFC (Telefonlar ve Standart Tabletler):** Cihazın arkasındaki NFC alanına kart dokundurulduğunda tetiklenir.
* **El Terminali Sinyalleri (Sunmi / iMin vb.):** Bu cihazlar dahili donanımla tarama yaptıktan sonra arka planda `Intent` yayınlarlar. Uygulama aşağıdaki yayın alıcılarını (actions) dinler:
  * `com.sunmi.rfid.ACTION_SCAN_RESULT`
  * `com.sunmi.rfid.read`
  * `android.intent.action.SCANRESULT`

Cihaz kartı okuduğunda web uygulamasındaki şu fonksiyonu tetikler:
```javascript
window.handleRFIDCard = function(cardUid) {
    console.log("Okunan Kart UID:", cardUid);
    // Bakiye kontrolü, PIN sorma vb. işlemleri burada tetikleyebilirsiniz.
}
```

### 2. Android Kök Köprüsü (AndroidBridge)
WebView içerisinden native Android özelliklerini çağırmak için JavaScript üzerinden `AndroidBridge` nesnesine erişebilirsiniz:

* **Cihazı Titretme (Vibrate):**
  ```javascript
  if (window.AndroidBridge) {
      window.AndroidBridge.vibrate(150); // milisaniye cinsinden
  }
  ```
* **Toast Bildirimi Gösterme:**
  ```javascript
  if (window.AndroidBridge) {
      window.AndroidBridge.showToast("Ödeme Başarılı!");
  }
  ```
* **Benzersiz Cihaz Kimliği (Hardware ID):** Her el terminalini lisanslamak veya yetkilendirmek için benzersiz Android ID değerini alabilirsiniz:
  ```javascript
  if (window.AndroidBridge) {
      const deviceId = window.AndroidBridge.getDeviceHardwareId();
      console.log("Cihaz ID:", deviceId);
  }
  ```

---

## 📝 İpuçları
* **Geliştirici konsolu / Hata Ayıklama:** WebView üzerinde JavaScript konsolunu bilgisayarınızdan incelemek için, cihazı bilgisayara bağlayıp Chrome tarayıcısında `chrome://inspect` adresini açabilirsiniz.
* **Klavye Wedge Modu:** Eğer el terminaliniz RFID kart okuyucuyu bir klavye gibi emüle ediyorsa, web tarafında herhangi bir input alanını odağına (focus) alarak da doğrudan kart UID'sini okutabilirsiniz.
