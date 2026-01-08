/**
 * Car Location Plugin
 * Park yeri kayıt ve yönetim eklentisi
 * 
 * @version 1.0.1
 * @author Your Name
 * @license MIT
 * 
 * Usage:
 * ```javascript
 * const plugin = new CarLocationPlugin({
 *     dataPath: 'path/to/parking-spots.json'
 * });
 * await plugin.init();
 * ```
 */

class CarLocationPlugin extends CLPCore {
    constructor(options = {}) {
        super(options);
        
        this.options = {
            dataPath: options.dataPath || 'plugins/car-location/backend/data/parking-spots.json',
            containerId: options.containerId || null,
            autoRender: options.autoRender !== false,
            showExpandButton: options.showExpandButton !== false,
            // Element ID'leri (özelleştirilebilir)
            pickerResultId: options.pickerResultId || 'pickerResult',
            colFloorId: options.colFloorId || 'col-floor',
            colColumnId: options.colColumnId || 'col-column',
            colNumberId: options.colNumberId || 'col-number',
            contentFloorId: options.contentFloorId || 'content-floor',
            contentColumnId: options.contentColumnId || 'content-column',
            contentNumberId: options.contentNumberId || 'content-number',
            noteInputId: options.noteInputId || 'noteInput',
            cameraBtnId: options.cameraBtnId || 'cameraBtn',
            photoInputId: options.photoInputId || 'photoInput',
            saveBtnId: options.saveBtnId || 'saveBtn',
            parkingListId: options.parkingListId || 'parkingList',
            ...options
        };

        this.picker = null;
        this.bottomSheet = null;
        this.expandBtn = null;
        this.currentPhoto = null;
        this.isExpanded = false;
    }

    async init() {
        // Core initialization
        const result = await super.init(this.options.dataPath);
        
        if (!result.success) {
            console.error('[CarLocationPlugin] Init failed:', result.error);
            return result;
        }

        // UI initialization (if container provided)
        if (this.options.containerId && this.options.autoRender) {
            this.render();
        } else {
            // Container yoksa mevcut DOM elementlerini kullan
            this.initExistingDOM();
        }

        return { success: true };
    }

    // Mevcut DOM elementlerini kullanarak başlat
    initExistingDOM() {
        this.initPicker();
        this.bindEvents();
        this.renderParkingList();
    }

    // ==================== RENDER ====================

    render() {
        const container = document.getElementById(this.options.containerId);
        if (!container) {
            console.error('[CarLocationPlugin] Container not found:', this.options.containerId);
            return;
        }

        container.classList.add('clp-container');
        container.innerHTML = this.getTemplate();

        this.initPicker();
        this.bindEvents();
        this.renderParkingList();
    }

    getTemplate() {
        return `
            <!-- Picker Card -->
            <div class="clp-card">
                <div class="clp-picker-pane">
                    <div class="clp-picker-header">
                        <span class="clp-picker-result" id="clp-picker-result">Park Yeri Seç</span>
                    </div>
                    
                    <div class="clp-picker-labels">
                        <span>Kat</span>
                        <span>Blok</span>
                        <span>No</span>
                    </div>
                    
                    <div class="clp-date-picker">
                        <div class="clp-highlight-bar"></div>
                        <div class="clp-column" id="clp-col-floor">
                            <div class="clp-column-content" id="clp-content-floor"></div>
                        </div>
                        <div class="clp-column" id="clp-col-column">
                            <div class="clp-column-content" id="clp-content-column"></div>
                        </div>
                        <div class="clp-column" id="clp-col-number">
                            <div class="clp-column-content" id="clp-content-number"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Not + Fotoğraf -->
                <div class="clp-note-container clp-mt-md">
                    <textarea class="clp-note-textarea" id="clp-note-input" placeholder="Not ekle (Opsiyonel)"></textarea>
                    <button type="button" class="clp-camera-btn" id="clp-camera-btn" title="Resim Ekle">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                        </svg>
                    </button>
                    <input type="file" id="clp-photo-input" accept="image/*" capture="environment" style="display: none;">
                </div>
                
                <!-- Kaydet Butonu -->
                <button class="clp-btn-save clp-mt-sm" id="clp-save-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17 21 17 13 7 13 7 21"/>
                        <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Kaydet
                </button>
            </div>
            
            <!-- Kayıtlı Araçlar -->
            <div class="clp-card">
                <h3 class="clp-card-title">Kayıtlı Araçlar</h3>
                <div class="clp-list" id="clp-parking-list">
                    <div class="clp-empty">
                        <span class="clp-empty-icon">🅿️</span>
                        <p class="clp-empty-text">Henüz kayıt yok</p>
                    </div>
                </div>
            </div>
        `;
    }

    // ==================== PICKER ====================

    initPicker() {
        const o = this.options;
        
        this.picker = new CLPPicker({
            onValueChange: (colId, val) => this.handlePickerValueChange(colId, val),
            coreRef: this
        });

        this.picker.init('clp', [
            { 
                id: 'floor', 
                elementId: o.colFloorId, 
                contentId: o.contentFloorId, 
                data: this.getFloorsForPicker(),
                defaultValue: this.selectedFloor
            },
            { 
                id: 'column', 
                elementId: o.colColumnId, 
                contentId: o.contentColumnId, 
                data: this.getColumnsForPicker(),
                defaultValue: this.selectedColumn
            },
            { 
                id: 'number', 
                elementId: o.colNumberId, 
                contentId: o.contentNumberId, 
                data: this.getNumbersForPicker(),
                defaultValue: this.selectedNumber
            }
        ]);

        // Sütun renklerini uygula
        this.picker.applyColorToColumn('column', this);
        
        this.updatePickerResult();
    }

    handlePickerValueChange(colId, val) {
        this.handlePickerChange(colId, val);

        // Sütunları güncelle
        if (colId === 'floor') {
            this.picker.updateColumnData('column', this.getColumnsForPicker());
            this.picker.applyColorToColumn('column', this);
            setTimeout(() => {
                this.picker.updateColumnData('number', this.getNumbersForPicker());
            }, 60);
        } else if (colId === 'column') {
            this.picker.updateColumnData('number', this.getNumbersForPicker());
        }

        this.updatePickerResult();
    }

    updatePickerResult() {
        const resultEl = document.getElementById(this.options.pickerResultId);
        if (!resultEl) return;

        const v = this.getSelectedValues();
        const colorText = v.color ? ` (${v.color.name})` : '';
        resultEl.textContent = `${v.floor} - ${v.spotCode}${colorText}`;
        resultEl.style.color = v.color?.hex || '#1e293b';
    }

    // ==================== EVENTS ====================

    bindEvents() {
        const o = this.options;
        
        // Save button
        const saveBtn = document.getElementById(o.saveBtnId);
        saveBtn?.addEventListener('click', () => this.save());

        // Camera button
        const cameraBtn = document.getElementById(o.cameraBtnId);
        const photoInput = document.getElementById(o.photoInputId);

        cameraBtn?.addEventListener('click', () => {
            if (cameraBtn.classList.contains('has-photo')) {
                this.clearPhoto();
                CLPUIComponents.showNotification('Resim kaldırıldı', 'info');
            } else {
                photoInput?.click();
            }
        });

        photoInput?.addEventListener('change', (e) => this.handlePhotoSelect(e));

        // Data change callback
        this.onDataChange = () => this.renderParkingList();
    }

    // ==================== PHOTO ====================

    async handlePhotoSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const result = await this.compressImage(file, 800, 0.7);
            this.currentPhoto = result.dataUrl;

            const cameraBtn = document.getElementById(this.options.cameraBtnId);
            if (cameraBtn) {
                cameraBtn.classList.add('has-photo');
                cameraBtn.style.backgroundImage = `url(${result.dataUrl})`;
            }

            CLPUIComponents.showNotification(`✓ Resim eklendi (${result.size} KB)`, 'success');
        } catch (error) {
            CLPUIComponents.showNotification('Resim yüklenemedi', 'error');
        }
    }

    clearPhoto() {
        this.currentPhoto = null;
        const cameraBtn = document.getElementById(this.options.cameraBtnId);
        const photoInput = document.getElementById(this.options.photoInputId);

        if (cameraBtn) {
            cameraBtn.classList.remove('has-photo');
            cameraBtn.style.backgroundImage = '';
        }
        if (photoInput) photoInput.value = '';
    }

    // ==================== SAVE ====================

    async save() {
        const noteInput = document.getElementById(this.options.noteInputId);
        const note = noteInput?.value?.trim() || '';

        const result = await this.addParking({
            note,
            photo: this.currentPhoto
        });

        if (result.success) {
            CLPUIComponents.showNotification(`✅ ${result.data.parkingSpot} kaydedildi!`, 'success');
            
            // Form temizle
            if (noteInput) noteInput.value = '';
            this.clearPhoto();
            
            this.renderParkingList();
        } else {
            CLPUIComponents.showNotification('Kayıt başarısız', 'error');
        }

        return result;
    }

    // ==================== LIST ====================

    renderParkingList() {
        const listEl = document.getElementById(this.options.parkingListId);
        if (!listEl) return;

        const parkings = this.getParkings();

        if (!parkings.length) {
            listEl.innerHTML = `
                <div class="clp-empty">
                    <span class="clp-empty-icon">🅿️</span>
                    <p class="clp-empty-text">Henüz kayıt yok</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = parkings.map((p, i) => CLPUIComponents.createCarCard(p, i)).join('');

        // Event listeners
        this.bindListEvents(listEl, parkings);
    }

    bindListEvents(listEl, parkings) {
        // Delete buttons
        listEl.querySelectorAll('.clp-btn-circular.delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                if (confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
                    await this.deleteParking(index);
                    CLPUIComponents.showNotification('Kayıt silindi', 'info');
                    this.renderParkingList();
                }
            });
        });

        // Share buttons
        listEl.querySelectorAll('.clp-btn-circular.share').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                const p = parkings[index];
                await this.shareParking(p);
            });
        });

        // Navigate buttons
        listEl.querySelectorAll('.clp-btn-circular.navigate').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                const p = parkings[index];
                this.onNavigate?.(p, index);
                CLPUIComponents.showNotification(`📍 ${p.floor} - ${p.parkingSpot}`, 'info');
            });
        });

        // Photo click
        listEl.querySelectorAll('.clp-car-icon.has-photo').forEach(icon => {
            icon.addEventListener('click', () => {
                CLPUIComponents.openPhotoModal(icon.dataset.photo);
            });
        });
    }

    async shareParking(parking) {
        const text = `🚗 Park Yerim: ${parking.floor} - ${parking.parkingSpot}`;
        const shareData = {
            title: 'Park Yeri',
            text: text
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                CLPUIComponents.showNotification('Paylaşıldı!', 'success');
            } else {
                await navigator.clipboard.writeText(text);
                CLPUIComponents.showNotification('Panoya kopyalandı!', 'success');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                CLPUIComponents.showNotification('Paylaşım başarısız', 'error');
            }
        }
    }

    // ==================== PUBLIC API ====================

    /**
     * Navigate callback - override this for custom navigation
     * @param {Function} callback - (parking, index) => void
     */
    setNavigateCallback(callback) {
        this.onNavigate = callback;
    }

    /**
     * Get current selection
     */
    getSelection() {
        return this.getSelectedValues();
    }

    /**
     * Set selection programmatically
     */
    setSelection(floor, column, number) {
        if (floor) {
            this.setFloor(floor);
            this.picker?.updateColumnData('column', this.getColumnsForPicker());
        }
        if (column) {
            this.setColumn(column);
            this.picker?.updateColumnData('number', this.getNumbersForPicker());
        }
        if (number) {
            this.setNumber(number);
        }
        this.updatePickerResult();
    }

    /**
     * Refresh the list
     */
    refresh() {
        this.renderParkingList();
    }

    /**
     * Destroy plugin
     */
    destroy() {
        super.destroy();
        this.picker?.destroy();
        
        const container = document.getElementById(this.options.containerId);
        if (container) container.innerHTML = '';
    }
}

// ==================== GLOBAL EXPORT ====================

if (typeof window !== 'undefined') {
    window.CarLocationPlugin = CarLocationPlugin;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CarLocationPlugin;
}

