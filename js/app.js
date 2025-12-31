// Aracım Nerede Uygulaması - Ana JavaScript Dosyası

class CarLocationApp {
    constructor() {
        this.savedParkings = []; // Birden fazla kayıt için array
        this.db = null; // IndexedDB instance
        this.dbName = 'CarLocationDB';
        this.dbVersion = 1;
        this.carContentExpanded = false;
        this.map = null;
        this.parkingMarkers = [];
        this.routeLine = null;
        this.startMarker = null;
        this.activeRouteIndex = null; // Aktif rota index'i
        this.broadcastChannel = null; // Cross-tab communication
        this.currentPhoto = null; // Mevcut resim base64
        
        // iOS Picker için değişkenler
        this.dataFloors = ["B1", "B2"];
        this.dataColumns = Array.from({length: 16}, (_, i) => String.fromCharCode(65 + i)); // A-P
        this.dataNumbers = Array.from({length: 22}, (_, i) => i); // 0-21
        this.dataDurations = ["1 Gün", "2 Gün", "3 Gün", "4 Gün", "5 Gün", "6 Gün", "7 Gün"];
        this.ITEM_HEIGHT = 36;
        this.LOOP_MULTIPLIER = 60;
        this.selectedFloor = "B1";
        this.selectedColumn = "A";
        this.selectedNumber = 0;
        this.selectedDuration = "1 Gün";
        
        // Sabit başlangıç noktası
        this.startLocation = {
            lat: 39.901510,
            lng: 32.757019
        };
        
        // Otopark konumları
        this.parkingLocations = {
            'A-1': { id: 'A-1', name: 'A-1 Otopark (Kuzey)', lat: 39.902191, lng: 32.754933 },
            'B-2': { id: 'B-2', name: 'B-2 Otopark (Güneybatı)', lat: 39.900955, lng: 32.755045 },
            'C-3': { id: 'C-3', name: 'C-3 Otopark (Güneydoğu)', lat: 39.900938, lng: 32.759262 },
            'D-4': { id: 'D-4', name: 'D-4 Otopark (Kuzeydoğu)', lat: 39.902255, lng: 32.759278 }
        };
        
        this.init();
    }

    async init() {
        try {
            // IndexedDB'yi başlat
            await this.initIndexedDB();
            
            // BroadcastChannel'ı başlat
            this.initBroadcastChannel();
            
            // Haritayı başlat
            this.initializeMap();
            
            // Verileri yükle
            await this.loadData();
            
            // Event listener'ları ekle
            this.setupEventListeners();
            
            // UI'ı güncelle
            await this.updateCarUI();
            
            // Aktif rotayı geri yükle
            this.restoreActiveRoute();
            
            // iOS Picker'ı başlat
            this.initPicker();
            
        } catch (error) {
            console.error('Başlatma hatası:', error);
            this.showNotification('Uygulama başlatılırken hata oluştu', 'error');
        }
    }

    initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB açılamadı');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB başarıyla açıldı');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Parkings store
                if (!db.objectStoreNames.contains('parkings')) {
                    const parkingsStore = db.createObjectStore('parkings', { keyPath: 'id', autoIncrement: true });
                    parkingsStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Settings store (aktif rota için)
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    initBroadcastChannel() {
        try {
            this.broadcastChannel = new BroadcastChannel('car_location_channel');
            
            this.broadcastChannel.onmessage = async (event) => {
                const { type, data } = event.data;
                
                if (type === 'route_updated') {
                    // Diğer sekmede rota oluşturuldu
                    this.activeRouteIndex = data.activeRouteIndex;
                    await this.restoreActiveRoute();
                } else if (type === 'data_updated') {
                    // Veriler güncellendi
                    await this.loadData();
                    await this.updateCarUI();
                }
            };
        } catch (error) {
            console.error('BroadcastChannel desteklenmiyor:', error);
        }
    }

    initializeMap() {
        // Haritayı merkez noktada başlat
        const centerLat = 39.901510;
        const centerLng = 32.757019;
        
        this.map = L.map('map', {
            zoomControl: true,
            attributionControl: false
        }).setView([centerLat, centerLng], 16);
        
        // OpenStreetMap tile layer ekle
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(this.map);

        // Zoom kontrolü sağ üst köşeye taşı
        this.map.zoomControl.setPosition('topright');

        // Başlangıç noktası marker'ı ekle
        const startIcon = L.divIcon({
            className: 'start-location-marker',
            html: '<div style="background: #2563eb; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        this.startMarker = L.marker(
            [this.startLocation.lat, this.startLocation.lng],
            { icon: startIcon }
        ).addTo(this.map);

        this.startMarker.bindPopup('📍 Başlangıç Noktası');

        // Otopark marker'larını ekle
        this.addParkingMarkers();
    }

    addParkingMarkers() {
        Object.values(this.parkingLocations).forEach((parking) => {
            const parkingIcon = L.divIcon({
                className: 'parking-location-marker',
                html: `<div style="background: #10b981; color: white; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px;">${parking.id}</div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });

            const marker = L.marker(
                [parking.lat, parking.lng],
                { icon: parkingIcon }
            ).addTo(this.map);

            marker.bindPopup(`<strong>🅿️ ${parking.name}</strong>`);
            
            // Marker'a tıklandığında haritayı odakla ve bilgi göster
            marker.on('click', () => {
                // Haritayı otoparka odakla
                this.map.setView([parking.lat, parking.lng], 17, {
                    animate: true,
                    duration: 1
                });
                
                this.showNotification(`📍 ${parking.name}`, 'info');
            });

            this.parkingMarkers.push(marker);
        });
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

    toggleCarContent() {
        const carContent = document.getElementById('carContent');
        const bottomSheet = document.getElementById('bottomSheet');
        const expandBtn = document.getElementById('expandBtn');
        const noCarSaved = document.getElementById('noCarSaved');
        const carSaved = document.getElementById('carSaved');
        
        this.carContentExpanded = !this.carContentExpanded;
        
        if (this.carContentExpanded) {
            carContent.classList.add('expanded');
            bottomSheet.classList.add('expanded');
            expandBtn.classList.add('expanded');
        } else {
            carContent.classList.remove('expanded');
            bottomSheet.classList.remove('expanded');
            expandBtn.classList.remove('expanded');
            
            // Bottom sheet kapatılırken, eğer form açıksa ve kayıtlı araç varsa listeye dön
            if (!noCarSaved.classList.contains('hidden') && this.savedParkings.length > 0) {
                this.showSavedCarsList();
            }
        }
    }

    showSavedCarsList() {
        const noCarSaved = document.getElementById('noCarSaved');
        const carSaved = document.getElementById('carSaved');
        
        // Formu gizle, listeyi göster
        noCarSaved.classList.add('hidden');
        carSaved.classList.remove('hidden');
    }

    async updateCarUI() {
        const noCarSaved = document.getElementById('noCarSaved');
        const carSaved = document.getElementById('carSaved');
        const savedCarsList = document.getElementById('savedCarsList');
        
        // UI güncellenirken süre dolmuş kayıtları temizle
        await this.cleanExpiredParkings();
        
        if (this.savedParkings.length > 0) {
            // Kayıtlı araçlar var - listeyi göster, formu gizle
            carSaved.classList.remove('hidden');
            noCarSaved.classList.add('hidden');
            
            // Listeyi temizle
            savedCarsList.innerHTML = '';
            
            // Her kayıt için kart oluştur
            this.savedParkings.forEach((parking, index) => {
                const card = this.createCarCard(parking, index);
                savedCarsList.appendChild(card);
            });
            
        } else {
            // Kayıtlı araç yok - formu göster
            carSaved.classList.add('hidden');
            noCarSaved.classList.remove('hidden');
        }
    }

    showAddCarForm() {
        const noCarSaved = document.getElementById('noCarSaved');
        const carSaved = document.getElementById('carSaved');
        
        // Listeyi gizle, formu göster
        carSaved.classList.add('hidden');
        noCarSaved.classList.remove('hidden');
    }

    createCarCard(parking, index) {
        const card = document.createElement('div');
        card.className = 'saved-car-card';
        
        const parkingSpot = parking.parkingSpot || '';
        const floor = parking.floor || '';
        // Yeni format: Önce kat, sonra park yeri
        const title = `Kat ${floor} · ${parkingSpot}`;
        
        // Tarih formatla
        const savedTime = parking.timestamp ? new Date(parking.timestamp) : new Date();
        const formattedTime = savedTime.toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Resim varsa resim göster, yoksa emoji göster
        const iconHtml = parking.photo 
            ? `<div class="saved-car-icon saved-car-photo" data-photo="${parking.photo}" style="background-image: url(${parking.photo})"></div>`
            : `<div class="saved-car-icon">🚗</div>`;
        
        // Kalan süreyi hesapla
        let durationChip = '';
        if (parking.duration && parking.timestamp) {
            const now = new Date();
            const savedDate = new Date(parking.timestamp);
            const totalDurationMs = parking.duration * 24 * 60 * 60 * 1000; // Toplam süre (ms)
            const elapsedMs = now - savedDate; // Geçen süre (ms)
            const remainingMs = totalDurationMs - elapsedMs; // Kalan süre (ms)
            
            if (remainingMs > 0) {
                // Kalan süreyi saat ve güne çevir
                const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
                const remainingDays = Math.floor(remainingHours / 24);
                
                let durationText = '';
                if (remainingHours < 24) {
                    durationText = `${remainingHours} saat`;
                } else if (remainingDays === 1) {
                    durationText = '1 gün';
                } else {
                    durationText = `${remainingDays} gün`;
                }
                
                durationChip = `<span class="duration-chip-bottom">${durationText}</span>`;
            } else {
                // Süre dolmuş
                durationChip = `<span class="duration-chip-bottom expired">Süresi doldu</span>`;
            }
        }
        
        card.innerHTML = `
            ${iconHtml}
            <div class="saved-car-info">
                <div class="saved-car-title">${title}</div>
                ${parking.note ? `<div class="saved-car-note">${parking.note}</div>` : ''}
                <div class="saved-car-time">${formattedTime}</div>
                ${durationChip}
            </div>
            <div class="saved-car-actions">
                <button class="btn-circular btn-navigate" data-index="${index}" title="Rota Oluştur">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </button>
                <button class="btn-circular btn-share" data-index="${index}" title="Paylaş">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                        <polyline points="16 6 12 2 8 6"></polyline>
                        <line x1="12" y1="2" x2="12" y2="15"></line>
                    </svg>
                </button>
                <button class="btn-circular btn-delete" data-index="${index}" title="Sil">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
        `;
        
        // Event listener'ları ekle
        const photoIcon = card.querySelector('.saved-car-photo');
        const navigateBtn = card.querySelector('.btn-navigate');
        const shareBtn = card.querySelector('.btn-share');
        const deleteBtn = card.querySelector('.btn-delete');
        
        if (photoIcon) {
            photoIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openPhotoModal(parking.photo);
            });
        }
        
        navigateBtn.addEventListener('click', () => this.navigateToCar(index));
        shareBtn.addEventListener('click', () => this.shareParkingInfo(index));
        deleteBtn.addEventListener('click', () => this.deleteCarLocation(index));
        
        return card;
    }

    async shareParkingInfo(index) {
        const parking = this.savedParkings[index];
        if (!parking) return;

        // Park bilgilerini URL formatında hazırla: "A-0 (B1 Otopark)"
        const parkInfo = `${parking.parkingSpot} (${parking.floor} Otopark)`;
        
        // URL encode et: "A-0%20(B1%20Otopark)"
        const encodedParkInfo = encodeURIComponent(parkInfo);
        
        // URL oluştur (şimdilik placeholder, sonradan gerçek rota URL'i eklenecek)
        const shareUrl = `https://example.com/parking?spot=${encodedParkInfo}`;

        try {
            // Web Share API ile paylaş
            if (navigator.share) {
                await navigator.share({
                    title: `Park Yeri: ${parking.parkingSpot}`,
                    text: `Kat ${parking.floor} · ${parking.parkingSpot}`,
                    url: shareUrl
                });
                this.showNotification('Park bilgisi paylaşıldı', 'success');
            } else {
                // Web Share API yoksa, URL'i kopyala
                await navigator.clipboard.writeText(shareUrl);
                this.showNotification('Park yeri bağlantısı panoya kopyalandı', 'success');
            }
        } catch (error) {
            console.error('Paylaşım hatası:', error);
            // Hata durumunda URL'i kopyala
            try {
                await navigator.clipboard.writeText(shareUrl);
                this.showNotification('Park yeri bağlantısı panoya kopyalandı', 'info');
            } catch (copyError) {
                this.showNotification('Paylaşım başarısız oldu', 'error');
            }
        }
    }

    async saveCarLocation() {
        const note = document.getElementById('parkingNote');
        const noteValue = note ? note.value : '';
        
        // Picker'dan seçilen değerleri al
        const parkingSpot = `${this.selectedColumn}-${this.selectedNumber}`;
        const floor = this.selectedFloor;
        
        // Park yerini otopark konumlarından bul veya varsayılan konum kullan
        let parking = this.parkingLocations[parkingSpot];
        
        // Eğer tam eşleşme yoksa, varsayılan bir konum oluştur
        if (!parking) {
            // Merkez koordinatları etrafında rastgele bir konum oluştur
            const centerLat = 39.901510;
            const centerLng = 32.757019;
            const offset = 0.001; // Yaklaşık 100 metre
            
            parking = {
                id: parkingSpot,
                name: `${parkingSpot} Park Yeri`,
                lat: centerLat + (Math.random() - 0.5) * offset * 2,
                lng: centerLng + (Math.random() - 0.5) * offset * 2
            };
        }

        // Süreyi gün sayısına çevir
        const durationDays = parseInt(this.selectedDuration.split(' ')[0]);

        const newParking = {
            parkingSpot: parkingSpot,
            parkingName: parking.name,
            floor: floor,
            note: noteValue,
            photo: this.currentPhoto, // Resmi ekle
            duration: durationDays, // Gün sayısı
            location: {
                lat: parking.lat,
                lng: parking.lng
            },
            timestamp: new Date().toISOString()
        };

        // Array'e ekle
        this.savedParkings.push(newParking);
        
        await this.saveData();
        await this.updateCarUI();
        
        // Not alanını ve resmi temizle
        if (note) note.value = '';
        this.clearPhoto();
        
        this.showNotification('🚗 Araç konumu kaydedildi!', 'success');
    }

    async navigateToCar(index) {
        const parking = this.savedParkings[index];
        if (!parking) {
            this.showNotification('Kayıtlı araç konumu bulunamadı', 'error');
            return;
        }

        // Kayıtlı park yerini haritada göster
        if (parking.location) {
            const lat = parking.location.lat;
            const lng = parking.location.lng;
            
            // Önceki rota çizgisini kaldır
            if (this.routeLine) {
                this.map.removeLayer(this.routeLine);
            }

            // Yeni rota çizgisi çiz
            this.routeLine = L.polyline([
                [this.startLocation.lat, this.startLocation.lng],
                [lat, lng]
            ], {
                color: '#2563eb',
                weight: 4,
                opacity: 0.7,
                dashArray: '10, 10'
            }).addTo(this.map);

            // Haritayı rotaya odakla
            const bounds = L.latLngBounds(
                [this.startLocation.lat, this.startLocation.lng],
                [lat, lng]
            );
            this.map.fitBounds(bounds, { padding: [80, 80] });

            // Mesafeyi hesapla
            const distance = this.calculateDistance(
                this.startLocation.lat,
                this.startLocation.lng,
                lat,
                lng
            );

            const distanceText = distance > 1000 
                ? `${(distance / 1000).toFixed(2)} km` 
                : `${distance.toFixed(0)} metre`;

            this.showNotification(`📏 ${parking.parkingSpot} - ${distanceText} uzaklıkta`, 'info');
            
            // Aktif rotayı kaydet
            this.activeRouteIndex = index;
            await this.saveActiveRoute(index);
        }

        // Bottom sheet'i kapat
        if (this.carContentExpanded) {
            this.toggleCarContent();
        }
    }

    async deleteCarLocation(index) {
        if (!confirm('Kayıtlı araç konumu silinecek. Emin misiniz?')) {
            return;
        }

        // Array'den sil
        this.savedParkings.splice(index, 1);
        
        // Eğer aktif rota silinen kayıtsa, rotayı temizle
        if (this.activeRouteIndex === index) {
            if (this.routeLine) {
                this.map.removeLayer(this.routeLine);
                this.routeLine = null;
            }
            this.activeRouteIndex = null;
            await this.saveActiveRoute(null);
        } else if (this.activeRouteIndex > index) {
            // Eğer silinen kayıt aktif rotadan önceyse, index'i güncelle
            this.activeRouteIndex--;
            await this.saveActiveRoute(this.activeRouteIndex);
        }
        
        await this.saveData();
        await this.updateCarUI();
        this.showNotification('Araç konumu silindi', 'success');
    }

    async saveData() {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['parkings'], 'readwrite');
            const store = transaction.objectStore('parkings');

            // Önce tüm kayıtları sil
            store.clear();

            // Yeni kayıtları ekle
            this.savedParkings.forEach(parking => {
                store.add(parking);
            });

            transaction.oncomplete = () => {
                // Diğer sekmelere bildir
                if (this.broadcastChannel) {
                    this.broadcastChannel.postMessage({
                        type: 'data_updated'
                    });
                }
                resolve();
            };

            transaction.onerror = () => {
                console.error('Veri kaydetme hatası:', transaction.error);
                reject(transaction.error);
            };
        });
    }

    async loadData() {
        if (!this.db) return;

        // Önce localStorage'dan migration yap
        await this.migrateFromLocalStorage();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['parkings'], 'readonly');
            const store = transaction.objectStore('parkings');
            const request = store.getAll();

            request.onsuccess = () => {
                this.savedParkings = request.result || [];
                // Süre dolmuş kayıtları temizle
                this.cleanExpiredParkings();
                resolve();
            };

            request.onerror = () => {
                console.error('Veri yükleme hatası:', request.error);
                this.savedParkings = [];
                reject(request.error);
            };
        });
    }

    async cleanExpiredParkings() {
        const now = new Date();
        let hasExpired = false;
        
        // Süre dolmuş kayıtları filtrele
        this.savedParkings = this.savedParkings.filter(parking => {
            if (!parking.duration || !parking.timestamp) {
                return true; // Süre bilgisi yoksa sakla
            }
            
            const savedDate = new Date(parking.timestamp);
            const totalDurationMs = parking.duration * 24 * 60 * 60 * 1000;
            const elapsedMs = now - savedDate;
            const remainingMs = totalDurationMs - elapsedMs;
            
            if (remainingMs <= 0) {
                hasExpired = true;
                // Eğer bu kayıt aktif rota ise, rotayı temizle
                const index = this.savedParkings.indexOf(parking);
                if (this.activeRouteIndex === index) {
                    if (this.routeLine) {
                        this.map.removeLayer(this.routeLine);
                        this.routeLine = null;
                    }
                    this.activeRouteIndex = null;
                }
                return false; // Sil
            }
            
            return true; // Sakla
        });
        
        // Eğer süre dolmuş kayıt varsa, veritabanını güncelle
        if (hasExpired) {
            await this.saveData();
            this.showNotification('Süresi dolmuş park kayıtları silindi', 'info');
        }
    }

    async migrateFromLocalStorage() {
        const storageKey = 'carLocationData';
        const stored = localStorage.getItem(storageKey);
        
        if (stored) {
            try {
                const data = JSON.parse(stored);
                let parkingsToMigrate = [];

                // Eski format kontrolü
                if (data.parkingData) {
                    parkingsToMigrate = [data.parkingData];
                } else if (data.parkings) {
                    parkingsToMigrate = data.parkings;
                }

                if (parkingsToMigrate.length > 0) {
                    // IndexedDB'ye kaydet
                    const transaction = this.db.transaction(['parkings'], 'readwrite');
                    const store = transaction.objectStore('parkings');

                    parkingsToMigrate.forEach(parking => {
                        store.add(parking);
                    });

                    await new Promise((resolve) => {
                        transaction.oncomplete = resolve;
                    });

                    // localStorage'ı temizle
                    localStorage.removeItem(storageKey);
                    console.log('LocalStorage verisi IndexedDB\'ye taşındı');
                }
            } catch (error) {
                console.error('Migration hatası:', error);
            }
        }
    }

    async saveActiveRoute(index) {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');

            const setting = {
                key: 'activeRoute',
                value: index,
                timestamp: new Date().toISOString()
            };

            store.put(setting);

            transaction.oncomplete = () => {
                // Diğer sekmelere bildir
                if (this.broadcastChannel) {
                    this.broadcastChannel.postMessage({
                        type: 'route_updated',
                        data: { activeRouteIndex: index }
                    });
                }
                resolve();
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    }

    async getActiveRoute() {
        if (!this.db) return null;

        return new Promise((resolve) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get('activeRoute');

            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : null);
            };

            request.onerror = () => {
                resolve(null);
            };
        });
    }

    async restoreActiveRoute() {
        const activeIndex = await this.getActiveRoute();
        
        if (activeIndex !== null && this.savedParkings[activeIndex]) {
            this.activeRouteIndex = activeIndex;
            const parking = this.savedParkings[activeIndex];
            
            if (parking && parking.location) {
                const lat = parking.location.lat;
                const lng = parking.location.lng;
                
                // Önceki rota çizgisini kaldır
                if (this.routeLine) {
                    this.map.removeLayer(this.routeLine);
                }

                // Rota çizgisi çiz
                this.routeLine = L.polyline([
                    [this.startLocation.lat, this.startLocation.lng],
                    [lat, lng]
                ], {
                    color: '#2563eb',
                    weight: 4,
                    opacity: 0.7,
                    dashArray: '10, 10'
                }).addTo(this.map);

                // Haritayı rotaya odakla
                const bounds = L.latLngBounds(
                    [this.startLocation.lat, this.startLocation.lng],
                    [lat, lng]
                );
                this.map.fitBounds(bounds, { padding: [80, 80] });
            }
        }
    }

    /* --- iOS PICKER FONKSİYONLARI --- */
    
    createItem(text, val) {
        const div = document.createElement('div');
        div.className = 'item';
        div.innerText = text;
        div.dataset.value = val !== undefined ? val : text;
        return div;
    }

    initNormalList(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;
        data.forEach(item => {
            container.appendChild(this.createItem(item));
        });
    }

    initInfiniteList(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        for (let i = 0; i < this.LOOP_MULTIPLIER; i++) {
            data.forEach(item => {
                container.appendChild(this.createItem(item));
            });
        }
    }

    initAllPickerLists() {
        this.initNormalList('content-floor', this.dataFloors);
        this.initInfiniteList('content-column', this.dataColumns);
        this.initInfiniteList('content-number', this.dataNumbers);
        this.initNormalList('content-duration', this.dataDurations);
    }

    handleScroll(column) {
        const items = column.querySelectorAll('.item');
        const center = column.scrollTop + (column.clientHeight / 2);

        items.forEach(item => {
            const itemCenter = item.offsetTop + (item.offsetHeight / 2);
            const distance = Math.abs(center - itemCenter);
            
            if (distance < column.clientHeight / 2 + 10) {
                const angle = (itemCenter - center) / (column.clientHeight / 2) * 45; 
                
                item.style.transform = `rotateX(${-angle}deg)`;
                
                const opacity = 1 - Math.pow(distance / (column.clientHeight / 2), 2) * 0.6;
                item.style.opacity = opacity;

                if (distance < this.ITEM_HEIGHT / 2) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            } else {
                item.style.transform = '';
                item.style.opacity = 0.3;
                item.classList.remove('selected');
            }
        });
    }

    checkInfiniteLoop(column, dataLength) {
        const scrollHeight = column.scrollHeight;
        const scrollTop = column.scrollTop;
        const setHeight = dataLength * this.ITEM_HEIGHT;
        
        if (scrollTop < setHeight) {
            const offset = scrollTop; 
            const middleSetStart = Math.floor(this.LOOP_MULTIPLIER / 2) * setHeight;
            column.scrollTop = middleSetStart + offset;
        }
        else if (scrollTop > scrollHeight - setHeight * 2) {
            const offset = scrollTop - (scrollHeight - setHeight * 2);
            const middleSetStart = Math.floor(this.LOOP_MULTIPLIER / 2) * setHeight;
            column.scrollTop = middleSetStart;
        }
    }

    updatePickerValues() {
        const colFloor = document.getElementById('col-floor');
        const colColumn = document.getElementById('col-column');
        const colNumber = document.getElementById('col-number');
        const colDuration = document.getElementById('col-duration');
        const resultDisplay = document.getElementById('result-display');
        
        if (!colFloor || !colColumn || !colNumber || !resultDisplay) return;

        const selFloorEl = colFloor.querySelector('.selected');
        if(selFloorEl) this.selectedFloor = selFloorEl.dataset.value;

        const selColEl = colColumn.querySelector('.selected');
        if(selColEl) this.selectedColumn = selColEl.dataset.value;

        const selNumEl = colNumber.querySelector('.selected');
        if(selNumEl) this.selectedNumber = selNumEl.dataset.value;

        if(colDuration) {
            const selDurEl = colDuration.querySelector('.selected');
            if(selDurEl) this.selectedDuration = selDurEl.dataset.value;
        }

        resultDisplay.innerText = `${this.selectedFloor} - ${this.selectedColumn} - ${this.selectedNumber}`;
    }

    scrollToValue(column, value, isInfinite, dataLength) {
        const items = Array.from(column.querySelectorAll('.item'));
        
        if (isInfinite) {
            const middleSetIndex = Math.floor(this.LOOP_MULTIPLIER / 2);
            
            let firstMatchIndex = -1;
            for(let i=0; i<items.length; i++){
                if(items[i].dataset.value == value) {
                    firstMatchIndex = i;
                    break;
                }
            }
            
            if(firstMatchIndex !== -1) {
                const realIndex = firstMatchIndex + (middleSetIndex * dataLength);
                const targetItem = items[realIndex];
                
                if(targetItem) {
                    const scrollPos = targetItem.offsetTop - (column.clientHeight / 2) + (this.ITEM_HEIGHT / 2);
                    column.scrollTop = scrollPos;
                    this.handleScroll(column);
                }
            }
            
        } else {
            const targetItem = items.find(item => item.dataset.value == value);
            if (targetItem) {
                const scrollPos = targetItem.offsetTop - (column.clientHeight / 2) + (this.ITEM_HEIGHT / 2);
                column.scrollTop = scrollPos;
                this.handleScroll(column);
            }
        }
    }

    setupPickerColumn(column, isInfinite, dataLength) {
        column.addEventListener('scroll', () => {
            window.requestAnimationFrame(() => {
                this.handleScroll(column);
                if(isInfinite) this.checkInfiniteLoop(column, dataLength);
            });
            
            clearTimeout(column.scrollTimeout);
            column.scrollTimeout = setTimeout(() => this.updatePickerValues(), 50);
        });
        
        column.addEventListener('click', (e) => {
            if(e.target.classList.contains('item')) {
                const scrollPos = e.target.offsetTop - (column.clientHeight / 2) + (this.ITEM_HEIGHT / 2);
                column.scrollTo({ top: scrollPos, behavior: 'smooth' });
            }
        });
    }

    initPicker() {
        const colFloor = document.getElementById('col-floor');
        const colColumn = document.getElementById('col-column');
        const colNumber = document.getElementById('col-number');
        const colDuration = document.getElementById('col-duration');
        
        if (!colFloor || !colColumn || !colNumber) return;

        this.initAllPickerLists();
        
        this.setupPickerColumn(colFloor, false);
        this.setupPickerColumn(colColumn, true, this.dataColumns.length);
        this.setupPickerColumn(colNumber, true, this.dataNumbers.length);
        
        if (colDuration) {
            this.setupPickerColumn(colDuration, false);
        }

        setTimeout(() => {
            this.scrollToValue(colFloor, this.selectedFloor, false);
            this.scrollToValue(colColumn, this.selectedColumn, true, this.dataColumns.length);
            this.scrollToValue(colNumber, this.selectedNumber, true, this.dataNumbers.length);
            
            if (colDuration) {
                this.scrollToValue(colDuration, this.selectedDuration, false);
            }
            
            this.updatePickerValues();
        }, 50);
    }

    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Dosya tipi kontrolü
        if (!file.type.startsWith('image/')) {
            this.showNotification('Lütfen geçerli bir resim dosyası seçin.', 'error');
            return;
        }

        // Resmi sıkıştır
        this.compressImage(file);
    }

    compressImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Canvas oluştur
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Maksimum boyutlar (1920x1920)
                let width = img.width;
                let height = img.height;
                const maxSize = 1920;

                // Boyutları orantılı olarak küçült
                if (width > height) {
                    if (width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // Resmi çiz
                ctx.drawImage(img, 0, 0, width, height);

                // JPEG olarak sıkıştır (kalite: 0.8)
                let quality = 0.8;
                let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

                // Eğer hala çok büyükse, kaliteyi düşür
                while (compressedDataUrl.length > 5 * 1024 * 1024 * 1.37 && quality > 0.1) {
                    quality -= 0.1;
                    compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                }

                this.currentPhoto = compressedDataUrl;
                this.updateCameraButton();
                
                // Boyut bilgisi göster
                const sizeInKB = Math.round(compressedDataUrl.length / 1024);
                this.showNotification(`✓ Resim eklendi (${sizeInKB} KB)`, 'success');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    updateCameraButton() {
        const cameraBtn = document.getElementById('cameraBtn');
        if (!cameraBtn) return;

        if (this.currentPhoto) {
            cameraBtn.classList.add('has-photo');
            cameraBtn.style.backgroundImage = `url(${this.currentPhoto})`;
        } else {
            cameraBtn.classList.remove('has-photo');
            cameraBtn.style.backgroundImage = '';
        }
    }

    clearPhoto() {
        this.currentPhoto = null;
        this.updateCameraButton();
        const photoInput = document.getElementById('photoInput');
        if (photoInput) photoInput.value = '';
    }

    openPhotoModal(photoUrl) {
        const modal = document.getElementById('photoModal');
        const modalImage = document.getElementById('photoModalImage');
        
        if (modal && modalImage && photoUrl) {
            modalImage.src = photoUrl;
            modal.classList.add('show');
        }
    }

    closePhotoModal() {
        const modal = document.getElementById('photoModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    setupEventListeners() {
        // Expand butonu
        document.getElementById('expandBtn').addEventListener('click', () => {
            this.toggleCarContent();
        });

        // Araç kaydet butonu
        const saveParkingBtn = document.getElementById('saveParkingBtn');
        if (saveParkingBtn) {
            saveParkingBtn.addEventListener('click', () => {
                this.saveCarLocation();
            });
        }

        // Yeni kayıt ekle butonu
        const addNewCarBtn = document.getElementById('addNewCarBtn');
        if (addNewCarBtn) {
            addNewCarBtn.addEventListener('click', () => {
                this.showAddCarForm();
            });
        }

        // İptal butonu
        const cancelFormBtn = document.getElementById('cancelFormBtn');
        if (cancelFormBtn) {
            cancelFormBtn.addEventListener('click', () => {
                if (this.savedParkings.length > 0) {
                    this.showSavedCarsList();
                } else {
                    // Kayıt yoksa bottom sheet'i kapat
                    if (this.carContentExpanded) {
                        this.toggleCarContent();
                    }
                }
            });
        }

        // Kamera butonu
        const cameraBtn = document.getElementById('cameraBtn');
        const photoInput = document.getElementById('photoInput');
        
        if (cameraBtn && photoInput) {
            cameraBtn.addEventListener('click', () => {
                if (this.currentPhoto) {
                    // Resim varsa kaldır
                    this.clearPhoto();
                    this.showNotification('Resim kaldırıldı', 'info');
                } else {
                    // Resim yoksa dosya seçiciyi aç
                    photoInput.click();
                }
            });

            photoInput.addEventListener('change', (e) => {
                this.handlePhotoUpload(e);
            });
        }

        // Kategori itemleri
        document.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', () => {
                // Şimdilik pasif
            });
        });

        // Drag handle
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
                if (diff > 0 && this.carContentExpanded) {
                    // Aşağı kaydırma - kapat
                    this.toggleCarContent();
                } else if (diff < 0 && !this.carContentExpanded) {
                    // Yukarı kaydırma - aç
                    this.toggleCarContent();
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
                    if (diff > 0 && this.carContentExpanded) {
                        this.toggleCarContent();
                    } else if (diff < 0 && !this.carContentExpanded) {
                        this.toggleCarContent();
                    }
                }
                
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // Sayfa görünür olduğunda
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden) {
                await this.loadData();
                await this.updateCarUI();
                this.restoreActiveRoute();
            }
        });

        // Photo modal event listeners
        const photoModal = document.getElementById('photoModal');
        const photoModalOverlay = photoModal?.querySelector('.photo-modal-overlay');
        const photoModalClose = photoModal?.querySelector('.photo-modal-close');
        
        if (photoModalOverlay) {
            photoModalOverlay.addEventListener('click', () => {
                this.closePhotoModal();
            });
        }
        
        if (photoModalClose) {
            photoModalClose.addEventListener('click', () => {
                this.closePhotoModal();
            });
        }
        
        // ESC tuşu ile modal'ı kapat
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && photoModal?.classList.contains('show')) {
                this.closePhotoModal();
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
