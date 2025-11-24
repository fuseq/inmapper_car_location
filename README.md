# 🚗 Aracım Nerede?

Vanilla JavaScript ile geliştirilmiş, otopark ve araç park yeri takip uygulaması.

## 🌟 Özellikler

- ✅ **Framework'süz**: Saf HTML, CSS ve JavaScript
- 💾 **Kalıcı Veri**: LocalStorage ile veriler tarayıcı kapatılsa bile korunur
- 🗺️ **Harita Entegrasyonu**: Leaflet.js ile tam ekran interaktif harita
- 🅿️ **Otopark Sistemi**: 4 farklı otopark lokasyonu
- 📏 **Mesafe Hesaplama**: Başlangıç noktası ile otopark arasındaki mesafe
- 🎨 **Modern UI**: Bottom sheet, circular butonlar ve mobil-first tasarım
- 🎯 **Rota Çizimi**: Seçilen otoparka görsel rota gösterimi
- 📍 **Park Bilgisi Kaydetme**: Kat, park yeri numarası ve not kaydetme

## 🚀 Kurulum

1. Projeyi indirin veya klonlayın
2. Bir web sunucusu kullanarak çalıştırın

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

1. **Otopark Seçimi**: 
   - Dropdown menüden bir otopark seçin
   - Veya harita üzerindeki yeşil marker'lara tıklayın
   - Otomatik olarak başlangıç noktasından rotanız çizilir

2. **Araç Konumu Kaydetme**: 
   - "Otopark" butonuna tıklayın
   - Bottom sheet genişleyecek
   - Kat ve park yeri numarasını seçin
   - İsteğe bağlı not ekleyin
   - "Kaydet" butonuna basın

3. **Aracı Bulma**:
   - Tekrar "Otopark" butonuna tıklayın
   - Kayıtlı araç bilgileriniz görünecek
   - Sağ taraftaki yeşil circular butona basarak haritada görebilirsiniz

4. **Veri Silme**:
   - Araç bilgisi kartındaki kırmızı circular butona tıklayın
   - Onaylayın ve kayıt silinsin

## 🗺️ Otopark Konumları

1. **Otopark 1 - Kuzey**: 39.902191, 32.754933
2. **Otopark 2 - Güneybatı**: 39.900955, 32.755045
3. **Otopark 3 - Güneydoğu**: 39.900938, 32.759262
4. **Otopark 4 - Kuzeydoğu**: 39.902255, 32.759278

**Başlangıç Noktası**: 39.901510, 32.757019

## 🔧 Teknik Detaylar

### Kullanılan Teknolojiler

- **Leaflet.js**: Harita görselleştirme için
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

Veriler LocalStorage'da saklanır:
- Seçilen otopark
- Kat numarası
- Park yeri numarası
- Opsiyonel not
- Kayıt zamanı

### Özellikler

✅ **Harita Üzerinde Görselleştirme**
- Mavi marker: Başlangıç noktası
- Yeşil marker'lar: Otopark konumları
- Kesikli çizgi: Rota

✅ **Responsive Tasarım**
- Mobil ve masaüstü uyumlu
- Sürüklenebilir bottom sheet

✅ **Mesafe Hesaplama**
- Haversine formülü kullanarak
- Metre veya kilometre cinsinden

## 🔒 Güvenlik ve Gizlilik

- ❌ Sunucu iletişimi yok
- ✅ Tüm veriler tarayıcıda saklanır
- ✅ Kullanıcı girişi gerektirmez
- ✅ GPS konum takibi yok

## 🌐 Tarayıcı Desteği

- ✅ Chrome 50+
- ✅ Firefox 45+
- ✅ Safari 10+
- ✅ Edge 14+
- ✅ Opera 37+

**Gereksinimler:**
- LocalStorage desteği
- ES6+ JavaScript desteği

## 📝 Notlar

1. **Veri Saklama**: Veriler tarayıcının LocalStorage'ında saklanır. Tarayıcı verileri temizlerse kayıtlar silinir.

2. **Harita**: OpenStreetMap kullanılır, internet bağlantısı gerektirir.

3. **Çoklu Sekme**: Farklı sekmelerdeki değişiklikler otomatik senkronize olur.

## 🎯 Gelecek Geliştirmeler

- [ ] PWA (Progressive Web App) desteği
- [ ] Offline çalışma modu
- [ ] Çoklu araç kayıt desteği
- [ ] Fotoğraf ekleme (park yerinin fotoğrafı)
- [ ] Zamanlayıcı (park süresi hatırlatıcısı)
- [ ] Farklı harita teması seçenekleri (karanlık mod)
- [ ] Otopark içi navigasyon (iç mekan haritası)
- [ ] QR kod ile park yeri paylaşma

## 📄 Lisans

Bu proje MIT lisansı altında sunulmaktadır.

## 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! Pull request göndermekten çekinmeyin.

---

**Not**: Bu uygulama eğitim amaçlıdır. Üretim ortamında kullanmadan önce kapsamlı testler yapılmalıdır.
