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
            this.updateCarUI();
            
            // Aktif rotayı geri yükle
            this.restoreActiveRoute();
            
            
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
                    this.updateCarUI();
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

    onParkingSpotSelected() {
        const parkingSpotSelect = document.getElementById('parkingSpot');
        const selectedValue = parkingSpotSelect.value;
        
        if (!selectedValue) {
            return;
        }

        const parking = this.parkingLocations[selectedValue];
        if (!parking) return;

        const lat = parking.lat;
        const lng = parking.lng;
        
        // Haritayı seçilen otoparka odakla
        this.map.setView([lat, lng], 17, {
            animate: true,
            duration: 1
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
        
        this.carContentExpanded = !this.carContentExpanded;
        
        if (this.carContentExpanded) {
            carContent.classList.add('expanded');
            bottomSheet.classList.add('expanded');
            expandBtn.classList.add('expanded');
        } else {
            carContent.classList.remove('expanded');
            bottomSheet.classList.remove('expanded');
            expandBtn.classList.remove('expanded');
        }
    }

    updateCarUI() {
        const noCarSaved = document.getElementById('noCarSaved');
        const carSaved = document.getElementById('carSaved');
        const savedCarsList = document.getElementById('savedCarsList');
        
        if (this.savedParkings.length > 0) {
            // Kayıtlı araçlar var
            noCarSaved.classList.add('hidden');
            carSaved.classList.remove('hidden');
            
            // Listeyi temizle
            savedCarsList.innerHTML = '';
            
            // Her kayıt için kart oluştur
            this.savedParkings.forEach((parking, index) => {
                const card = this.createCarCard(parking, index);
                savedCarsList.appendChild(card);
            });
            
        } else {
            // Kayıtlı araç yok
            noCarSaved.classList.remove('hidden');
            carSaved.classList.add('hidden');
        }
    }

    createCarCard(parking, index) {
        const card = document.createElement('div');
        card.className = 'saved-car-card';
        
        const parkingSpot = parking.parkingSpot || '';
        const floor = parking.floor || '';
        const title = `${parkingSpot} - Kat ${floor}`;
        
        // Tarih formatla
        const savedTime = parking.timestamp ? new Date(parking.timestamp) : new Date();
        const formattedTime = savedTime.toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        card.innerHTML = `
            <div class="saved-car-icon">🚗</div>
            <div class="saved-car-info">
                <div class="saved-car-title">${title}</div>
                ${parking.note ? `<div class="saved-car-note">💭 ${parking.note}</div>` : ''}
                <div class="saved-car-time">📅 ${formattedTime}</div>
            </div>
            <div class="saved-car-actions">
                <button class="btn-circular btn-navigate" data-index="${index}" title="Rota Oluştur">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                    </svg>
                </button>
                <button class="btn-circular btn-delete" data-index="${index}" title="Sil">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        `;
        
        // Event listener'ları ekle
        const navigateBtn = card.querySelector('.btn-navigate');
        const deleteBtn = card.querySelector('.btn-delete');
        
        navigateBtn.addEventListener('click', () => this.navigateToCar(index));
        deleteBtn.addEventListener('click', () => this.deleteCarLocation(index));
        
        return card;
    }

    async saveCarLocation() {
        const parkingSpot = document.getElementById('parkingSpot').value;
        const floor = document.getElementById('parkingFloor').value;
        const note = document.getElementById('parkingNote').value;
        
        if (!parkingSpot) {
            this.showNotification('Lütfen bir park yeri seçin', 'error');
            return;
        }

        if (!floor) {
            this.showNotification('Lütfen kat numarasını seçin', 'error');
            return;
        }

        const parking = this.parkingLocations[parkingSpot];
        if (!parking) {
            this.showNotification('Geçersiz park yeri', 'error');
            return;
        }

        const newParking = {
            parkingSpot: parkingSpot,
            parkingName: parking.name,
            floor: floor,
            note: note,
            location: {
                lat: parking.lat,
                lng: parking.lng
            },
            timestamp: new Date().toISOString()
        };

        // Array'e ekle
        this.savedParkings.push(newParking);
        
        await this.saveData();
        this.updateCarUI();
        
        // Formu temizle
        document.getElementById('parkingSpot').value = '';
        document.getElementById('parkingFloor').value = '';
        document.getElementById('parkingNote').value = '';
        
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
        this.updateCarUI();
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
                resolve();
            };

            request.onerror = () => {
                console.error('Veri yükleme hatası:', request.error);
                this.savedParkings = [];
                reject(request.error);
            };
        });
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

    setupEventListeners() {
        // Expand butonu
        document.getElementById('expandBtn').addEventListener('click', () => {
            this.toggleCarContent();
        });

        // Park yeri seçimi
        document.getElementById('parkingSpot').addEventListener('change', () => {
            this.onParkingSpotSelected();
        });

        // Araç kaydet butonu
        document.getElementById('saveParkingBtn').addEventListener('click', () => {
            this.saveCarLocation();
        });

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
                this.updateCarUI();
                this.restoreActiveRoute();
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
