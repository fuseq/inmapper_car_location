// Aracım Nerede Uygulaması - Ana JavaScript Dosyası

class CarLocationApp {
    constructor() {
        this.userId = null;
        this.currentPosition = null;
        this.savedParkingData = null;
        this.map = null;
        this.currentMarker = null;
        this.carMarker = null;
        this.watchId = null;
        this.storageKey = 'carLocationData';
        this.bottomSheetExpanded = false;
        this.showingCarContent = false;
        
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
            
            this.showNotification('Uygulama hazır! 🚗', 'success');
        } catch (error) {
            console.error('Başlatma hatası:', error);
            this.showNotification('Uygulama başlatılırken hata oluştu', 'error');
        }
    }

    async initializeFingerprint() {
        try {
            const fp = await FingerprintJS.load();
            const result = await fp.get();
            this.userId = result.visitorId;
            console.log('Kullanıcı ID:', this.userId);
        } catch (error) {
            console.error('Fingerprint hatası:', error);
            this.userId = this.getOrCreateFallbackId();
            console.log('Fallback ID kullanılıyor:', this.userId);
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
        // Varsayılan konum: İstanbul (Türkiye)
        const defaultLat = 41.0082;
        const defaultLng = 28.9784;
        
        this.map = L.map('map', {
            zoomControl: false,
            attributionControl: false
        }).setView([defaultLat, defaultLng], 13);
        
        // OpenStreetMap tile layer ekle
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(this.map);

        // Zoom kontrolü sağ tarafa ekle
        L.control.zoom({
            position: 'topright'
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

        // Mevcut konum ikonu (mavi nokta)
        const currentIcon = L.divIcon({
            className: 'current-location-marker',
            html: '<div style="background: #2563eb; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        this.currentMarker = L.marker(
            [this.currentPosition.lat, this.currentPosition.lng],
            { icon: currentIcon }
        ).addTo(this.map);

        this.currentMarker.bindPopup('📍 Mevcut Konumunuz');

        // İlk konum alındığında haritayı oraya odakla
        if (!this.hasInitialPosition) {
            this.map.setView([this.currentPosition.lat, this.currentPosition.lng], 15);
            this.hasInitialPosition = true;
        }
    }

    updateCarMarker() {
        if (this.carMarker) {
            this.map.removeLayer(this.carMarker);
        }

        if (!this.savedParkingData || !this.savedParkingData.location) return;

        const location = this.savedParkingData.location;

        // Araç ikonu (büyük araba emoji)
        const carIcon = L.divIcon({
            className: 'car-location-marker',
            html: '<div style="font-size: 36px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🚗</div>',
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });

        this.carMarker = L.marker(
            [location.lat, location.lng],
            { icon: carIcon }
        ).addTo(this.map);

        const popupContent = `
            <div style="text-align: center;">
                <strong style="font-size: 16px;">🚗 ${this.savedParkingData.code}</strong><br>
                <small>${this.savedParkingData.zone} - ${this.savedParkingData.floor}. Kat</small>
            </div>
        `;
        this.carMarker.bindPopup(popupContent);
    }

    toggleBottomSheet() {
        const bottomSheet = document.getElementById('bottomSheet');
        this.bottomSheetExpanded = !this.bottomSheetExpanded;
        
        if (this.bottomSheetExpanded) {
            bottomSheet.classList.add('expanded');
        } else {
            bottomSheet.classList.remove('expanded');
        }
    }

    showCarContent() {
        const normalContent = document.getElementById('normalContent');
        const carContent = document.getElementById('carContent');
        
        normalContent.classList.add('hidden');
        carContent.classList.remove('hidden');
        
        this.showingCarContent = true;
        this.bottomSheetExpanded = true;
        
        document.getElementById('bottomSheet').classList.add('expanded');
        
        this.updateCarUI();
    }

    showNormalContent() {
        const normalContent = document.getElementById('normalContent');
        const carContent = document.getElementById('carContent');
        
        carContent.classList.add('hidden');
        normalContent.classList.remove('hidden');
        
        this.showingCarContent = false;
        this.bottomSheetExpanded = false;
        
        document.getElementById('bottomSheet').classList.remove('expanded');
    }

    updateCarUI() {
        const noCarSaved = document.getElementById('noCarSaved');
        const carSaved = document.getElementById('carSaved');
        
        if (this.savedParkingData) {
            // Kayıtlı araç var
            noCarSaved.classList.add('hidden');
            carSaved.classList.remove('hidden');
            
            // Bilgileri doldur
            document.getElementById('savedParkingCode').textContent = 
                this.savedParkingData.code;
            
            document.getElementById('savedParkingDetails').textContent = 
                `${this.savedParkingData.zone} Blok, ${this.savedParkingData.floor}. Kat, Park Yeri: ${this.savedParkingData.spot}`;
            
            const noteEl = document.getElementById('savedParkingNote');
            if (this.savedParkingData.note) {
                noteEl.textContent = `💭 ${this.savedParkingData.note}`;
                noteEl.style.display = 'block';
            } else {
                noteEl.style.display = 'none';
            }
            
            const savedTime = new Date(this.savedParkingData.timestamp);
            document.getElementById('savedParkingTime').textContent = 
                `Kaydedildi: ${savedTime.toLocaleString('tr-TR')}`;
            
        } else {
            // Kayıtlı araç yok
            noCarSaved.classList.remove('hidden');
            carSaved.classList.add('hidden');
        }
    }

    saveCarLocation() {
        const zone = document.getElementById('parkingZone').value;
        const floor = document.getElementById('parkingFloor').value;
        const spot = document.getElementById('parkingSpot').value;
        const note = document.getElementById('parkingNote').value;
        
        if (!zone || !floor || !spot) {
            this.showNotification('Lütfen tüm alanları doldurun', 'error');
            return;
        }

        if (!this.currentPosition) {
            this.showNotification('Konum bilgisi alınamadı', 'error');
            return;
        }

        this.savedParkingData = {
            zone: zone,
            floor: floor,
            spot: spot,
            note: note,
            code: `${zone}-${floor}-${spot}`,
            location: {
                lat: this.currentPosition.lat,
                lng: this.currentPosition.lng
            },
            timestamp: new Date().toISOString()
        };

        this.saveData();
        this.updateCarMarker();
        this.updateCarUI();
        
        // Formu temizle
        document.getElementById('parkingZone').value = '';
        document.getElementById('parkingFloor').value = '';
        document.getElementById('parkingSpot').value = '';
        document.getElementById('parkingNote').value = '';
        
        this.showNotification('🚗 Araç konumu kaydedildi!', 'success');
    }

    navigateToCar() {
        if (!this.savedParkingData || !this.savedParkingData.location) {
            this.showNotification('Kayıtlı araç konumu bulunamadı', 'error');
            return;
        }

        if (!this.currentPosition) {
            // Sadece araç konumuna git
            this.map.setView([this.savedParkingData.location.lat, this.savedParkingData.location.lng], 18);
            if (this.carMarker) {
                this.carMarker.openPopup();
            }
        } else {
            // Hem mevcut hem araç konumunu göster
            const bounds = L.latLngBounds(
                [this.currentPosition.lat, this.currentPosition.lng],
                [this.savedParkingData.location.lat, this.savedParkingData.location.lng]
            );
            this.map.fitBounds(bounds, { padding: [100, 100] });

            // Rota çizgisi çiz
            if (this.routeLine) {
                this.map.removeLayer(this.routeLine);
            }

            this.routeLine = L.polyline([
                [this.currentPosition.lat, this.currentPosition.lng],
                [this.savedParkingData.location.lat, this.savedParkingData.location.lng]
            ], {
                color: '#2563eb',
                weight: 4,
                opacity: 0.7,
                dashArray: '10, 10'
            }).addTo(this.map);

            // Mesafeyi hesapla
            const distance = this.calculateDistance(
                this.currentPosition.lat,
                this.currentPosition.lng,
                this.savedParkingData.location.lat,
                this.savedParkingData.location.lng
            );

            const distanceText = distance > 1000 
                ? `${(distance / 1000).toFixed(2)} km` 
                : `${distance.toFixed(0)} metre`;

            this.showNotification(`📏 Aracınız ${distanceText} uzakta!`, 'info');
        }

        // Bottom sheet'i kapat
        this.showNormalContent();
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

    deleteCarLocation() {
        if (!confirm('Kayıtlı araç konumu silinecek. Emin misiniz?')) {
            return;
        }

        this.savedParkingData = null;
        localStorage.removeItem(this.getStorageKey());
        
        if (this.carMarker) {
            this.map.removeLayer(this.carMarker);
        }
        if (this.routeLine) {
            this.map.removeLayer(this.routeLine);
        }

        this.updateCarUI();
        this.showNotification('Araç konumu silindi', 'success');
    }

    getStorageKey() {
        return `${this.storageKey}_${this.userId}`;
    }

    saveData() {
        const data = {
            userId: this.userId,
            parkingData: this.savedParkingData,
            lastUpdate: new Date().toISOString()
        };

        localStorage.setItem(this.getStorageKey(), JSON.stringify(data));
    }

    loadData() {
        const stored = localStorage.getItem(this.getStorageKey());
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.savedParkingData = data.parkingData;
                
                if (this.savedParkingData) {
                    this.updateCarMarker();
                }
            } catch (error) {
                console.error('Veri yükleme hatası:', error);
            }
        }
    }

    updateUI() {
        if (this.showingCarContent) {
            this.updateCarUI();
        }
    }

    setupEventListeners() {
        // FAB - Araç butonu
        document.getElementById('carActionBtn').addEventListener('click', () => {
            if (this.showingCarContent) {
                this.showNormalContent();
            } else {
                this.showCarContent();
            }
        });

        // Compass butonu
        document.getElementById('compassBtn').addEventListener('click', () => {
            if (this.currentPosition) {
                this.map.setView([this.currentPosition.lat, this.currentPosition.lng], 15);
            }
        });

        // Notes butonu (şimdilik bilgilendirme)
        document.getElementById('notesBtn').addEventListener('click', () => {
            this.showNotification('Notlar özelliği yakında eklenecek', 'info');
        });

        // Bottom sheet handle - sürükleme
        const handle = document.querySelector('.bottom-sheet-handle');
        let startY = 0;
        let currentY = 0;

        handle.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        });

        handle.addEventListener('touchmove', (e) => {
            currentY = e.touches[0].clientY;
        });

        handle.addEventListener('touchend', () => {
            const diff = currentY - startY;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    // Aşağı kaydırma - kapat
                    if (this.showingCarContent) {
                        this.showNormalContent();
                    } else {
                        this.bottomSheetExpanded = false;
                        document.getElementById('bottomSheet').classList.remove('expanded');
                    }
                } else {
                    // Yukarı kaydırma - aç
                    this.bottomSheetExpanded = true;
                    document.getElementById('bottomSheet').classList.add('expanded');
                }
            }
        });

        // Mouse ile de çalışsın
        handle.addEventListener('mousedown', (e) => {
            startY = e.clientY;
            
            const onMouseMove = (e) => {
                currentY = e.clientY;
            };
            
            const onMouseUp = () => {
                const diff = currentY - startY;
                
                if (Math.abs(diff) > 50) {
                    if (diff > 0) {
                        if (this.showingCarContent) {
                            this.showNormalContent();
                        } else {
                            this.bottomSheetExpanded = false;
                            document.getElementById('bottomSheet').classList.remove('expanded');
                        }
                    } else {
                        this.bottomSheetExpanded = true;
                        document.getElementById('bottomSheet').classList.add('expanded');
                    }
                }
                
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // Araç kaydet butonu
        document.getElementById('saveParkingBtn').addEventListener('click', () => {
            this.saveCarLocation();
        });

        // Navigasyon butonu
        document.getElementById('navigateBtn').addEventListener('click', () => {
            this.navigateToCar();
        });

        // Sil butonu
        document.getElementById('deleteParkingBtn').addEventListener('click', () => {
            this.deleteCarLocation();
        });

        // Kategori itemleri (şimdilik bilgilendirme)
        document.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', () => {
                const categoryName = item.querySelector('.category-name').textContent;
                this.showNotification(`${categoryName} kategorisi yakında eklenecek`, 'info');
            });
        });
    }

    setupStorageListener() {
        // Diğer sekmelerdeki değişiklikleri dinle
        window.addEventListener('storage', (e) => {
            if (e.key === this.getStorageKey()) {
                this.loadData();
                this.updateUI();
                this.showNotification('Veriler güncellendi', 'info');
            }
        });

        // Sayfa kapatılırken
        window.addEventListener('beforeunload', () => {
            if (this.watchId) {
                navigator.geolocation.clearWatch(this.watchId);
            }
        });

        // Sayfa görünür olduğunda
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
