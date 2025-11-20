# 🚗 Aracım Nerede?

Vanilla JavaScript ile geliştirilmiş, mobil öncelikli araç park yeri takip uygulaması.

## 🌟 Özellikler

- ✅ **Framework'süz**: Saf HTML, CSS ve JavaScript
- 🔐 **Session Yönetimi**: FingerprintJS ile kullanıcı tanımlama
- 💾 **Kalıcı Veri**: LocalStorage ile veriler tarayıcı kapatılsa bile korunur
- 🗺️ **Harita Entegrasyonu**: Leaflet.js ile tam ekran interaktif harita
- 📍 **Gerçek Zamanlı Konum**: Geolocation API ile sürekli konum takibi
- 🔄 **Çoklu Sekme Desteği**: Farklı sekmelerde senkronize çalışır
- 🅿️ **Otopark Kodu Sistemi**: Blok, kat ve park yeri numarası kaydetme
- 📏 **Mesafe Hesaplama**: Mevcut konum ile araç arasındaki mesafe
- 🎨 **Modern UI**: Bottom sheet, FAB ve mobil-first tasarım
- 🎯 **Navigasyon**: Tek tuşla aracınıza yol tarifi

## 🚀 Kurulum

1. Projeyi indirin veya klonlayın
2. Bir web sunucusu kullanarak çalıştırın (Geolocation API'si HTTPS veya localhost gerektirir)

### Basit HTTP Sunucusu Başlatma:

**Python 3:**
```bash
python -m http.server 8000
```

**Node.js (http-server):**
```bash
npx http-server -p 8000
```

**PHP:**
```bash
php -S localhost:8000
```

3. Tarayıcınızda `http://localhost:8000` adresini açın

## 📱 Kullanım

1. **İlk Açılış**: 
   - Uygulama açıldığında konum izni isteyecektir. İzin vermelisiniz.
   - Harita tam ekranda görünecektir
   - Alt kısımda bottom sheet ve sağ tarafta butonlar görünür

2. **Araç Konumu Kaydetme**: 
   - Sağ alttaki **mavi araba butonu**na tıklayın
   - Bottom sheet yukarı doğru genişleyecek
   - Otopark bilgilerini girin:
     * Otopark Bölgesi (A, B, C, D)
     * Kat numarası
     * Park yeri numarası
     * Opsiyonel not
   - "Kaydet" butonuna basın

3. **Aracı Bulma**:
   - Tekrar mavi araba butonuna tıklayın
   - Kayıtlı araç bilgileriniz görünecek
   - "Aracıma Git" butonuna basın
   - Haritada hem sizin hem de aracınızın konumu gösterilir
   - Aralarındaki mesafe hesaplanır

4. **Veri Silme**:
   - Araç bilgisi ekranında "Kaydı Sil" butonuna tıklayın
   - Onaylayın ve kayıt silinsin

## 🔧 Teknik Detaylar

### Kullanılan Teknolojiler

- **FingerprintJS**: Kullanıcı tanımlama için
- **Leaflet.js**: Harita görselleştirme için
- **Geolocation API**: Konum verisi almak için
- **LocalStorage API**: Veri saklama için
- **OpenStreetMap**: Harita tile'ları için

### Dosya Yapısı

```
inmapper_car_location/
├── index.html          # Ana HTML dosyası
├── css/
│   └── style.css       # Stil dosyası
├── js/
│   └── app.js          # Ana JavaScript dosyası
└── README.md           # Dokümantasyon
```

### Veri Saklama

Veriler kullanıcı bazında LocalStorage'da saklanır:
- Kullanıcı ID'si (FingerprintJS)
- Son kaydedilen araç konumu
- Konum geçmişi (son 10 kayıt)
- Son güncelleme zamanı

### Çoklu Sekme Senkronizasyonu

`storage` event listener'ı sayesinde:
- Bir sekmede yapılan değişiklikler diğer sekmelere yansır
- Veriler tüm sekmelerde güncel kalır
- Tutarlı kullanıcı deneyimi sağlanır

## 🔒 Güvenlik ve Gizlilik

- ❌ Sunucu iletişimi yok
- ✅ Tüm veriler tarayıcıda saklanır
- ✅ Kullanıcı girişi gerektirmez
- ✅ Anonim kullanım (sadece cihaz tanımlama)

## 🌐 Tarayıcı Desteği

- ✅ Chrome 50+
- ✅ Firefox 45+
- ✅ Safari 10+
- ✅ Edge 14+
- ✅ Opera 37+

**Gereksinimler:**
- Geolocation API desteği
- LocalStorage desteği
- ES6+ JavaScript desteği

## 📝 Notlar

1. **HTTPS Gerekliliği**: Modern tarayıcılar Geolocation API'yi sadece HTTPS veya localhost üzerinde çalıştırır.

2. **Konum İzni**: Kullanıcı konum iznini reddetmesi durumunda uygulama çalışmayacaktır.

3. **Veri Saklama**: Veriler tarayıcının LocalStorage'ında saklanır. Tarayıcı verileri temizlerse kayıtlar silinir.

4. **Batarya Tüketimi**: Sürekli konum takibi batarya tüketebilir.

## 🎯 Gelecek Geliştirmeler

- [ ] PWA (Progressive Web App) desteği
- [ ] Offline çalışma modu
- [ ] Gerçek yön tarifi entegrasyonu (Google Maps/Apple Maps)
- [ ] Push notification desteği
- [ ] Farklı harita teması seçenekleri (karanlık mod)
- [ ] Konum paylaşma özelliği (QR kod ile)
- [ ] Çoklu araç kayıt desteği
- [ ] Fotoğraf ekleme (park yerinin fotoğrafı)
- [ ] Zamanlayıcı (park süresi hatırlatıcısı)
- [ ] IndexedDB desteği (geçmiş kayıtlar için)

## 📄 Lisans

Bu proje MIT lisansı altında sunulmaktadır.

## 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! Pull request göndermekten çekinmeyin.

---

**Not**: Bu uygulama eğitim amaçlıdır. Üretim ortamında kullanmadan önce kapsamlı testler yapılmalıdır.

