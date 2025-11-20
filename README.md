# 🚗 Aracım Nerede?

Vanilla JavaScript ile geliştirilmiş, tarayıcı tabanlı araç konumu takip uygulaması.

## 🌟 Özellikler

- ✅ **Framework'süz**: Saf HTML, CSS ve JavaScript
- 🔐 **Session Yönetimi**: FingerprintJS ile kullanıcı tanımlama
- 💾 **Kalıcı Veri**: LocalStorage ile veriler tarayıcı kapatılsa bile korunur
- 🗺️ **Harita Entegrasyonu**: Leaflet.js ile interaktif harita
- 📍 **Gerçek Zamanlı Konum**: Geolocation API ile sürekli konum takibi
- 🔄 **Çoklu Sekme Desteği**: Farklı sekmelerde senkronize çalışır
- 📊 **Konum Geçmişi**: Son 10 konum kaydını tutar
- 📏 **Mesafe Hesaplama**: Mevcut konum ile araç arasındaki mesafe
- 🎨 **Modern UI**: Responsive ve kullanıcı dostu arayüz

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

1. **İlk Açılış**: Uygulama açıldığında konum izni isteyecektir. İzin vermelisiniz.

2. **Konum Kaydetme**: 
   - "Mevcut Konumu Kaydet" butonuna tıklayın
   - Bulunduğunuz konum araç konumu olarak kaydedilir

3. **Aracı Bulma**:
   - "Aracımı Bul" butonuna tıklayın
   - Haritada hem sizin hem de aracınızın konumu gösterilir
   - Aralarındaki mesafe hesaplanır

4. **Veri Temizleme**:
   - "Verileri Temizle" butonuna tıklayın
   - Tüm kayıtlı veriler silinir

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
- [ ] Yön tarifi entegrasyonu
- [ ] Bildirim (notification) sistemi
- [ ] Farklı harita teması seçenekleri
- [ ] Konum paylaşma özelliği
- [ ] IndexedDB desteği (daha fazla veri için)

## 📄 Lisans

Bu proje MIT lisansı altında sunulmaktadır.

## 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! Pull request göndermekten çekinmeyin.

---

**Not**: Bu uygulama eğitim amaçlıdır. Üretim ortamında kullanmadan önce kapsamlı testler yapılmalıdır.

