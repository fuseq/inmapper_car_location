// Aracım Nerede Uygulaması - Ana JavaScript Dosyası

class CarLocationApp {
    constructor() {
        this.userId = null;
        this.currentPosition = null;
        this.savedCarLocation = null;
        this.map = null;
        this.currentMarker = null;
        this.carMarker = null;
        this.watchId = null;
        this.storageKey = 'carLocationData';
        
        this.init();
    }

    async init() {
        try {
            // Kullanıcı ID'sini al (FingerprintJS)
            await this.initializeFingerprint();
            
            // Verileri yükle
            this.loadData();
            
            // Haritayı başlat
            this.initializeMap();
            
            // Konum takibini başlat
            this.startLocationTracking();
            
            // Event listener'ları ekle
            this.setupEventListeners();
            
            // Storage değişikliklerini dinle (diğer sekmeler için)
            this.setupStorageListener();
            
            // UI'ı güncelle
            this.updateUI();
            
            this.showNotification('Uygulama hazır!', 'success');
        } catch (error) {
            console.error('Başlatma hatası:', error);
            this.showNotification('Uygulama başlatılırken hata oluştu', 'error');
        }
    }

    async initializeFingerprint() {
        try {
            // FingerprintJS ile benzersiz kullanıcı kimliği oluştur
            const fp = await FingerprintJS.load();
            const result = await fp.get();
            this.userId = result.visitorId;
            
            document.getElementById('userStatus').textContent = 
                `Kullanıcı ID: ${this.userId.substring(0, 8)}...`;
        } catch (error) {
            console.error('Fingerprint hatası:', error);
            // Fallback: Random ID oluştur ve kaydet
            this.userId = this.getOrCreateFallbackId();
            document.getElementById('userStatus').textContent = 
                `Kullanıcı ID: ${this.userId.substring(0, 8)}... (Fallback)`;
        }
    }

    getOrCreateFallbackId() {
        let fallbackId = localStorage.getItem('fallbackUserId');
        if (!fallbackId) {
            fallbackId = 'user_' + Math.random().toString(36).substring(2, 15) + 
                         Math.random().toString(36).substring(2, 15);
            localStorage.setItem('fallbackUserId', fallbackId);
        }
        return fallbackId;
    }

    initializeMap() {
        // Haritayı başlat (varsayılan konum: Türkiye merkezi)
        const defaultLat = 39.9334;
        const defaultLng = 32.8597;
        
        this.map = L.map('map').setView([defaultLat, defaultLng], 13);
        
        // OpenStreetMap tile layer ekle
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
    }

    startLocationTracking() {
        if (!navigator.geolocation) {
            this.showNotification('Tarayıcınız konum özelliğini desteklemiyor', 'error');
            return;
        }

        // Sürekli konum takibi
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentPosition = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: new Date().toISOString()
                };
                
                this.updateCurrentLocationUI();
                this.updateCurrentMarker();
            },
            (error) => {
                console.error('Konum hatası:', error);
                this.showNotification('Konum alınamadı: ' + this.getLocationErrorMessage(error), 'error');
            },
            {
                enableHighAccuracy: true,
                maximumAge: 30000,
                timeout: 27000
            }
        );
    }

    getLocationErrorMessage(error) {
        switch(error.code) {
            case error.PERMISSION_DENIED:
                return 'Konum izni reddedildi';
            case error.POSITION_UNAVAILABLE:
                return 'Konum bilgisi kullanılamıyor';
            case error.TIMEOUT:
                return 'Konum alma zaman aşımına uğradı';
            default:
                return 'Bilinmeyen bir hata oluştu';
        }
    }

    updateCurrentMarker() {
        if (!this.currentPosition) return;

        if (this.currentMarker) {
            this.map.removeLayer(this.currentMarker);
        }

        // Mevcut konum ikonu
        const currentIcon = L.divIcon({
            className: 'current-location-marker',
            html: '<div style="background: #2563eb; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20]
        });

        this.currentMarker = L.marker(
            [this.currentPosition.lat, this.currentPosition.lng],
            { icon: currentIcon }
        ).addTo(this.map);

        this.currentMarker.bindPopup('📍 Mevcut Konumunuz').openPopup();

        // Haritayı mevcut konuma odakla (sadece ilk seferde)
        if (!this.carMarker) {
            this.map.setView([this.currentPosition.lat, this.currentPosition.lng], 15);
        }
    }

    updateCarMarker() {
        if (this.carMarker) {
            this.map.removeLayer(this.carMarker);
        }

        if (!this.savedCarLocation) return;

        // Araç ikonu
        const carIcon = L.divIcon({
            className: 'car-location-marker',
            html: '<div style="font-size: 32px;">🚗</div>',
            iconSize: [32, 32]
        });

        this.carMarker = L.marker(
            [this.savedCarLocation.lat, this.savedCarLocation.lng],
            { icon: carIcon }
        ).addTo(this.map);

        const popupContent = `
            <strong>🚗 Aracınızın Konumu</strong><br>
            <small>${new Date(this.savedCarLocation.timestamp).toLocaleString('tr-TR')}</small>
        `;
        this.carMarker.bindPopup(popupContent);

        // Eğer hem mevcut konum hem de araç konumu varsa, ikisini de göster
        if (this.currentPosition) {
            const bounds = L.latLngBounds(
                [this.currentPosition.lat, this.currentPosition.lng],
                [this.savedCarLocation.lat, this.savedCarLocation.lng]
            );
            this.map.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    saveCarLocation() {
        if (!this.currentPosition) {
            this.showNotification('Önce konum bilgisi alınmalı', 'error');
            return;
        }

        this.savedCarLocation = {
            ...this.currentPosition,
            savedAt: new Date().toISOString()
        };

        this.saveData();
        this.updateCarMarker();
        this.updateUI();
        this.showNotification('🚗 Araç konumu kaydedildi!', 'success');
    }

    findCar() {
        if (!this.savedCarLocation) {
            this.showNotification('Henüz kaydedilmiş araç konumu yok', 'error');
            return;
        }

        if (!this.currentPosition) {
            this.showNotification('Mevcut konumunuz alınamadı', 'error');
            return;
        }

        // Haritada hem araç hem de mevcut konumu göster
        const bounds = L.latLngBounds(
            [this.currentPosition.lat, this.currentPosition.lng],
            [this.savedCarLocation.lat, this.savedCarLocation.lng]
        );
        this.map.fitBounds(bounds, { padding: [100, 100] });

        // Mesafeyi hesapla
        const distance = this.calculateDistance(
            this.currentPosition.lat,
            this.currentPosition.lng,
            this.savedCarLocation.lat,
            this.savedCarLocation.lng
        );

        // Rota çizgisi çiz
        if (this.routeLine) {
            this.map.removeLayer(this.routeLine);
        }

        this.routeLine = L.polyline([
            [this.currentPosition.lat, this.currentPosition.lng],
            [this.savedCarLocation.lat, this.savedCarLocation.lng]
        ], {
            color: '#ef4444',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 10'
        }).addTo(this.map);

        this.showNotification(
            `🚗 Aracınız ${distance.toFixed(0)} metre uzakta!`,
            'info'
        );

        // Mesafe bilgisini göster
        this.showDistanceInfo(distance);
    }

    showDistanceInfo(distance) {
        const lastSavedEl = document.getElementById('lastSavedLocation');
        let distanceDiv = lastSavedEl.querySelector('.distance-info');
        
        if (!distanceDiv) {
            distanceDiv = document.createElement('div');
            distanceDiv.className = 'distance-info';
            lastSavedEl.appendChild(distanceDiv);
        }

        const distanceText = distance > 1000 
            ? `${(distance / 1000).toFixed(2)} km` 
            : `${distance.toFixed(0)} metre`;

        distanceDiv.innerHTML = `📏 Mesafe: ${distanceText}`;
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        // Haversine formülü
        const R = 6371e3; // Dünya'nın yarıçapı (metre)
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    clearData() {
        if (!confirm('Tüm veriler silinecek. Emin misiniz?')) {
            return;
        }

        this.savedCarLocation = null;
        localStorage.removeItem(this.getStorageKey());
        
        if (this.carMarker) {
            this.map.removeLayer(this.carMarker);
        }
        if (this.routeLine) {
            this.map.removeLayer(this.routeLine);
        }

        this.updateUI();
        this.showNotification('Veriler temizlendi', 'success');
    }

    getStorageKey() {
        return `${this.storageKey}_${this.userId}`;
    }

    saveData() {
        const data = {
            userId: this.userId,
            savedCarLocation: this.savedCarLocation,
            history: this.getHistory(),
            lastUpdate: new Date().toISOString()
        };

        // Geçmişe ekle
        this.addToHistory(this.savedCarLocation);

        localStorage.setItem(this.getStorageKey(), JSON.stringify(data));
    }

    loadData() {
        const stored = localStorage.getItem(this.getStorageKey());
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.savedCarLocation = data.savedCarLocation;
                
                if (this.savedCarLocation) {
                    this.updateCarMarker();
                }
            } catch (error) {
                console.error('Veri yükleme hatası:', error);
            }
        }
    }

    getHistory() {
        const historyKey = `${this.storageKey}_history_${this.userId}`;
        const stored = localStorage.getItem(historyKey);
        return stored ? JSON.parse(stored) : [];
    }

    addToHistory(location) {
        if (!location) return;

        const history = this.getHistory();
        history.unshift({
            ...location,
            savedAt: new Date().toISOString()
        });

        // Son 10 kaydı tut
        const trimmedHistory = history.slice(0, 10);
        
        const historyKey = `${this.storageKey}_history_${this.userId}`;
        localStorage.setItem(historyKey, JSON.stringify(trimmedHistory));
    }

    updateUI() {
        this.updateCurrentLocationUI();
        this.updateSavedLocationUI();
        this.updateHistoryUI();
    }

    updateCurrentLocationUI() {
        const el = document.getElementById('currentLocation');
        
        if (!this.currentPosition) {
            el.innerHTML = '<p class="no-data">Konum alınıyor...</p>';
            return;
        }

        el.innerHTML = `
            <div class="location-details">
                <div class="location-item">
                    <span class="location-label">Enlem:</span>
                    <span class="location-value">${this.currentPosition.lat.toFixed(6)}</span>
                </div>
                <div class="location-item">
                    <span class="location-label">Boylam:</span>
                    <span class="location-value">${this.currentPosition.lng.toFixed(6)}</span>
                </div>
                <div class="location-item">
                    <span class="location-label">Doğruluk:</span>
                    <span class="location-value">±${this.currentPosition.accuracy.toFixed(0)}m</span>
                </div>
                <div class="location-item">
                    <span class="location-label">Güncelleme:</span>
                    <span class="location-value">${new Date(this.currentPosition.timestamp).toLocaleTimeString('tr-TR')}</span>
                </div>
            </div>
        `;
    }

    updateSavedLocationUI() {
        const el = document.getElementById('lastSavedLocation');
        
        if (!this.savedCarLocation) {
            el.innerHTML = '<p class="no-data">Henüz kaydedilmiş konum yok</p>';
            return;
        }

        el.innerHTML = `
            <div class="location-details">
                <div class="location-item">
                    <span class="location-label">Enlem:</span>
                    <span class="location-value">${this.savedCarLocation.lat.toFixed(6)}</span>
                </div>
                <div class="location-item">
                    <span class="location-label">Boylam:</span>
                    <span class="location-value">${this.savedCarLocation.lng.toFixed(6)}</span>
                </div>
                <div class="location-item">
                    <span class="location-label">Kayıt:</span>
                    <span class="location-value">${new Date(this.savedCarLocation.savedAt).toLocaleString('tr-TR')}</span>
                </div>
            </div>
        `;
    }

    updateHistoryUI() {
        const el = document.getElementById('locationHistory');
        const history = this.getHistory();
        
        if (history.length === 0) {
            el.innerHTML = '<p class="no-data">Henüz geçmiş yok</p>';
            return;
        }

        const historyHTML = history.map(item => `
            <div class="history-item">
                <div class="history-time">
                    📅 ${new Date(item.savedAt).toLocaleString('tr-TR')}
                </div>
                <div class="history-coords">
                    📍 ${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}
                </div>
            </div>
        `).join('');

        el.innerHTML = `<div class="history-list">${historyHTML}</div>`;
    }

    setupEventListeners() {
        document.getElementById('saveLocationBtn').addEventListener('click', () => {
            this.saveCarLocation();
        });

        document.getElementById('findCarBtn').addEventListener('click', () => {
            this.findCar();
        });

        document.getElementById('clearDataBtn').addEventListener('click', () => {
            this.clearData();
        });
    }

    setupStorageListener() {
        // Diğer sekmelerdeki değişiklikleri dinle
        window.addEventListener('storage', (e) => {
            if (e.key === this.getStorageKey()) {
                this.loadData();
                this.updateUI();
                this.showNotification('Veriler güncellendi (başka sekmeden)', 'info');
            }
        });

        // Sayfa kapatılırken veya yenilenirken
        window.addEventListener('beforeunload', () => {
            if (this.watchId) {
                navigator.geolocation.clearWatch(this.watchId);
            }
        });

        // Sayfa görünür olduğunda verileri yenile
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.loadData();
                this.updateUI();
            }
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    window.carLocationApp = new CarLocationApp();
});

