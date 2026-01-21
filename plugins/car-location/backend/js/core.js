/**
 * Car Location Plugin - Core Module
 * IndexedDB, veri yönetimi ve cross-tab broadcast işlevleri
 * @version 1.0.0
 */

class CLPCore {
    constructor(options = {}) {
        this.dbName = options.dbName || 'CarLocationPluginDB';
        this.dbVersion = options.dbVersion || 1;
        this.channelName = options.channelName || 'clp_channel';
        
        this.db = null;
        this.broadcastChannel = null;
        this.parkingData = null;
        this.parkingColors = {};
        this.parkingSpots = [];
        this.savedParkings = [];
        
        // Picker seçimleri
        this.dataFloors = [];
        this.dataColumns = [];
        this.dataNumbers = [];
        this.selectedFloor = '';
        this.selectedColumn = '';
        this.selectedNumber = '';
        this.selectedColor = null;
        
        // Callbacks
        this.onDataChange = null;
        this.onBroadcast = null;
    }

    // ==================== INITIALIZATION ====================
    
    async init(dataPath) {
        try {
            await this.initIndexedDB();
            this.initBroadcastChannel();
            await this.loadParkingData(dataPath);
            await this.loadSavedParkings();
            return { success: true };
        } catch (error) {
            console.error('[CLP] Init error:', error);
            return { success: false, error };
        }
    }

    // ==================== INDEXEDDB ====================
    
    initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('parkings')) {
                    const store = db.createObjectStore('parkings', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    // ==================== BROADCAST CHANNEL ====================
    
    initBroadcastChannel() {
        try {
            this.broadcastChannel = new BroadcastChannel(this.channelName);
            
            this.broadcastChannel.onmessage = async (event) => {
                const { type, data } = event.data;
                
                if (type === 'data_updated') {
                    await this.loadSavedParkings();
                    if (this.onDataChange) this.onDataChange(this.savedParkings);
                }
                
                if (this.onBroadcast) this.onBroadcast(type, data);
            };
        } catch (error) {
            console.warn('[CLP] BroadcastChannel not supported:', error);
        }
    }

    broadcast(type, data = {}) {
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({ type, data });
        }
    }

    // ==================== PARKING DATA (JSON) ====================
    
    async loadParkingData(dataPath) {
        try {
            const response = await fetch(dataPath);
            this.parkingData = await response.json();
            this.parkingColors = this.parkingData.colors;
            this.parkingSpots = this.parkingData.parkingSpots;
            
            // Katları ayarla
            this.dataFloors = Object.values(this.parkingData.floors);
            this.selectedFloor = this.dataFloors[0] || '';
            
            // İlk kat için sütunları güncelle
            this.updateColumnsForFloor(this.selectedFloor);
            
            return { success: true, count: this.parkingSpots.length };
        } catch (error) {
            console.error('[CLP] Parking data load error:', error);
            // Fallback
            this.dataFloors = ['B1', 'B2'];
            this.dataColumns = ['A', 'B', 'C', 'D', 'E', 'F'];
            this.dataNumbers = ['01', '02', '03', '04', '05'];
            this.selectedFloor = 'B1';
            this.selectedColumn = 'A';
            this.selectedNumber = '01';
            return { success: false, error };
        }
    }

    getFloorNumber(floorName) {
        if (!this.parkingData?.floors) return -1;
        const entry = Object.entries(this.parkingData.floors).find(([k, v]) => v === floorName);
        return entry ? parseInt(entry[0]) : -1;
    }

    updateColumnsForFloor(floorName) {
        const floorNum = this.getFloorNumber(floorName);
        const spotsOnFloor = this.parkingSpots.filter(s => s.floor === floorNum);
        const columns = [...new Set(spotsOnFloor.map(s => s.spot.charAt(0)))].sort();
        
        this.dataColumns = columns;
        this.selectedColumn = columns[0] || '';
        this.updateNumbersForColumn(floorName, this.selectedColumn);
    }

    updateNumbersForColumn(floorName, column) {
        const floorNum = this.getFloorNumber(floorName);
        const spotsInColumn = this.parkingSpots.filter(s => 
            s.floor === floorNum && s.spot.charAt(0) === column
        );
        const numbers = [...new Set(spotsInColumn.map(s => s.spot.substring(1)))]
            .sort((a, b) => parseInt(a) - parseInt(b));
        
        this.dataNumbers = numbers;
        this.selectedNumber = numbers[0] || '';
        this.updateSelectedColor();
    }

    updateSelectedColor() {
        const floorNum = this.getFloorNumber(this.selectedFloor);
        const spotName = this.selectedColumn + this.selectedNumber;
        
        const spot = this.parkingSpots.find(s => 
            s.floor === floorNum && s.spot === spotName
        );
        
        if (spot && this.parkingColors[spot.color]) {
            this.selectedColor = {
                code: spot.color,
                ...this.parkingColors[spot.color]
            };
        } else {
            this.selectedColor = null;
        }
    }

    getSpotColor(floorName, column, number) {
        const floorNum = this.getFloorNumber(floorName);
        const spotName = column + number;
        const spot = this.parkingSpots.find(s => s.floor === floorNum && s.spot === spotName);
        
        if (spot && this.parkingColors[spot.color]) {
            return this.parkingColors[spot.color];
        }
        return null;
    }

    getColumnColor(floorName, column) {
        const floorNum = this.getFloorNumber(floorName);
        const spot = this.parkingSpots.find(s => 
            s.floor === floorNum && s.spot.charAt(0) === column
        );
        
        if (spot && this.parkingColors[spot.color]) {
            return this.parkingColors[spot.color];
        }
        return null;
    }

    // ==================== SAVED PARKINGS (CRUD) ====================
    
    async loadSavedParkings() {
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['parkings'], 'readonly');
            const store = tx.objectStore('parkings');
            const request = store.getAll();

            request.onsuccess = async () => {
                this.savedParkings = request.result || [];
                await this.cleanExpiredParkings();
                resolve(this.savedParkings);
            };

            request.onerror = () => {
                this.savedParkings = [];
                reject(request.error);
            };
        });
    }

    async saveParkings() {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['parkings'], 'readwrite');
            const store = tx.objectStore('parkings');

            store.clear();
            this.savedParkings.forEach(p => store.add(p));

            tx.oncomplete = () => {
                this.broadcast('data_updated');
                if (this.onDataChange) this.onDataChange(this.savedParkings);
                resolve();
            };

            tx.onerror = () => reject(tx.error);
        });
    }

    async addParking(options = {}) {
        const parking = {
            parkingSpot: `${this.selectedColumn}${this.selectedNumber}`,
            floor: this.selectedFloor,
            color: this.selectedColor,
            note: options.note || '',
            photo: options.photo || null,
            duration: options.duration || 1,
            timestamp: new Date().toISOString()
        };

        this.savedParkings.push(parking);
        await this.saveParkings();
        
        return { success: true, data: parking };
    }

    async updateParking(index, updates) {
        if (index < 0 || index >= this.savedParkings.length) {
            return { success: false, error: 'Invalid index' };
        }

        this.savedParkings[index] = { ...this.savedParkings[index], ...updates };
        await this.saveParkings();
        
        return { success: true, data: this.savedParkings[index] };
    }

    async deleteParking(id) {
        const index = this.savedParkings.findIndex(p => p.id === id);
        if (index === -1) {
            // id yoksa index olarak dene
            const numId = parseInt(id);
            if (numId >= 0 && numId < this.savedParkings.length) {
                this.savedParkings.splice(numId, 1);
            } else {
                return { success: false, error: 'Not found' };
            }
        } else {
            this.savedParkings.splice(index, 1);
        }
        
        await this.saveParkings();
        return { success: true };
    }

    async cleanExpiredParkings() {
        const now = new Date();
        let hasExpired = false;

        this.savedParkings = this.savedParkings.filter(p => {
            if (!p.duration || !p.timestamp) return true;
            
            const savedDate = new Date(p.timestamp);
            const totalMs = p.duration * 24 * 60 * 60 * 1000;
            const elapsedMs = now - savedDate;
            
            if (elapsedMs >= totalMs) {
                hasExpired = true;
                return false;
            }
            return true;
        });

        if (hasExpired) {
            await this.saveParkings();
        }
    }

    getParkings() {
        return this.savedParkings;
    }

    // ==================== SETTINGS ====================
    
    async saveSetting(key, value) {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['settings'], 'readwrite');
            const store = tx.objectStore('settings');
            store.put({ key, value, timestamp: new Date().toISOString() });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async getSetting(key) {
        if (!this.db) return null;

        return new Promise((resolve) => {
            const tx = this.db.transaction(['settings'], 'readonly');
            const store = tx.objectStore('settings');
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result?.value ?? null);
            request.onerror = () => resolve(null);
        });
    }

    // ==================== IMAGE COMPRESSION ====================
    
    compressImage(file, maxSize = 1920, quality = 0.8) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('Invalid image file'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    let width = img.width;
                    let height = img.height;

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
                    ctx.drawImage(img, 0, 0, width, height);

                    let q = quality;
                    let result = canvas.toDataURL('image/jpeg', q);

                    // 5MB'dan büyükse kaliteyi düşür
                    while (result.length > 5 * 1024 * 1024 * 1.37 && q > 0.1) {
                        q -= 0.1;
                        result = canvas.toDataURL('image/jpeg', q);
                    }

                    resolve({
                        dataUrl: result,
                        size: Math.round(result.length / 1024)
                    });
                };
                img.onerror = () => reject(new Error('Image load failed'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('File read failed'));
            reader.readAsDataURL(file);
        });
    }

    // ==================== PICKER HELPERS ====================
    
    getFloorsForPicker() {
        return this.dataFloors;
    }

    getColumnsForPicker() {
        return this.dataColumns;
    }

    getNumbersForPicker() {
        return this.dataNumbers;
    }

    getSelectedValues() {
        return {
            floor: this.selectedFloor,
            column: this.selectedColumn,
            number: this.selectedNumber,
            spotCode: `${this.selectedColumn}${this.selectedNumber}`,
            color: this.selectedColor
        };
    }

    setFloor(floor) {
        this.selectedFloor = floor;
        this.updateColumnsForFloor(floor);
    }

    setColumn(column) {
        this.selectedColumn = column;
        this.updateNumbersForColumn(this.selectedFloor, column);
    }

    setNumber(number) {
        this.selectedNumber = number;
        this.updateSelectedColor();
    }

    handlePickerChange(columnType, value) {
        switch (columnType) {
            case 'floor':
                this.setFloor(value);
                break;
            case 'column':
                this.setColumn(value);
                break;
            case 'number':
                this.setNumber(value);
                break;
        }
    }

    // ==================== UTILITIES ====================
    
    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    destroy() {
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
            this.broadcastChannel = null;
        }
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

// Global export
if (typeof window !== 'undefined') {
    window.CLPCore = CLPCore;
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CLPCore;
}



