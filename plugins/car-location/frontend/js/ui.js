/**
 * Car Location Plugin - UI Components
 * Picker, Modal, Notification ve Card componentleri
 * @version 1.0.1
 */

// ==================== iOS PICKER ====================

class CLPPicker {
    constructor(options = {}) {
        this.ITEM_HEIGHT = options.itemHeight || 36;
        this.onValueChange = options.onValueChange || null;
        this.columns = {};
        this.coreRef = options.coreRef || null;
    }

    init(instanceId, columnConfigs) {
        columnConfigs.forEach(config => {
            this.setupColumn(instanceId, config);
        });
    }

    // Renk bilgisini item'a uygula
    applyColorToColumn(colId, coreRef) {
        if (!coreRef) return;
        const col = this.columns[colId];
        if (!col) return;

        const items = col.content.querySelectorAll('.clp-item');
        items.forEach(item => {
            const color = coreRef.getColumnColor(coreRef.selectedFloor, item.dataset.value);
            if (color) {
                item.style.color = color.hex;
            }
        });
    }

    setupColumn(instanceId, config) {
        const column = document.getElementById(config.elementId);
        const content = document.getElementById(config.contentId);
        
        if (!column || !content) return;

        this.columns[config.id] = {
            element: column,
            content: content,
            data: config.data || [],
            isInfinite: config.isInfinite || false
        };

        this.populateColumn(config.id, config.data);
        this.bindEvents(config.id);
        
        // Default değere scroll
        if (config.defaultValue) {
            setTimeout(() => this.scrollToValue(config.id, config.defaultValue), 50);
        } else if (config.data.length > 0) {
            setTimeout(() => this.scrollToValue(config.id, config.data[0]), 50);
        }
    }

    populateColumn(colId, data) {
        const col = this.columns[colId];
        if (!col) return;

        col.content.innerHTML = '';
        col.data = data;

        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'clp-item';
            div.innerText = item;
            div.dataset.value = item;
            col.content.appendChild(div);
        });
    }

    updateColumnData(colId, newData, resetScroll = true) {
        const col = this.columns[colId];
        if (!col) return;

        this.populateColumn(colId, newData);
        
        if (resetScroll && newData.length > 0) {
            setTimeout(() => {
                this.scrollToValue(colId, newData[0]);
                this.handleScroll(col.element);
            }, 30);
        }
    }

    bindEvents(colId) {
        const col = this.columns[colId];
        if (!col) return;

        col.element.addEventListener('scroll', () => {
            window.requestAnimationFrame(() => this.handleScroll(col.element));
            
            clearTimeout(col.scrollTimeout);
            col.scrollTimeout = setTimeout(() => {
                const selected = col.element.querySelector('.clp-item.selected');
                if (selected && this.onValueChange) {
                    this.onValueChange(colId, selected.dataset.value);
                }
            }, 50);
        });

        col.element.addEventListener('click', (e) => {
            if (e.target.classList.contains('clp-item')) {
                const scrollPos = e.target.offsetTop - (col.element.clientHeight / 2) + (this.ITEM_HEIGHT / 2);
                col.element.scrollTo({ top: scrollPos, behavior: 'smooth' });
            }
        });
    }

    handleScroll(column) {
        const items = column.querySelectorAll('.clp-item');
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

    scrollToValue(colId, value) {
        const col = this.columns[colId];
        if (!col) return;

        const items = Array.from(col.element.querySelectorAll('.clp-item'));
        const targetItem = items.find(item => item.dataset.value === value);
        
        if (targetItem) {
            const scrollPos = targetItem.offsetTop - (col.element.clientHeight / 2) + (this.ITEM_HEIGHT / 2);
            col.element.scrollTop = scrollPos;
            this.handleScroll(col.element);
        }
    }

    getSelectedValue(colId) {
        const col = this.columns[colId];
        if (!col) return null;

        const selected = col.element.querySelector('.clp-item.selected');
        return selected ? selected.dataset.value : null;
    }

    destroy() {
        this.columns = {};
    }
}

// ==================== UI COMPONENTS ====================

const CLPUIComponents = {
    // Notification
    showNotification(message, type = 'info', duration = 3000) {
        let container = document.getElementById('clp-notification');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'clp-notification';
            container.className = 'clp-notification';
            document.body.appendChild(container);
        }

        container.textContent = message;
        container.className = `clp-notification ${type} show`;

        setTimeout(() => {
            container.classList.remove('show');
        }, duration);
    },

    // Photo Modal
    openPhotoModal(photoUrl) {
        let modal = document.getElementById('clp-photo-modal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'clp-photo-modal';
            modal.className = 'clp-photo-modal';
            modal.innerHTML = `
                <div class="clp-photo-modal-overlay"></div>
                <div class="clp-photo-modal-content">
                    <button class="clp-photo-modal-close">&times;</button>
                    <img class="clp-photo-modal-image" src="" alt="Park Yeri Fotoğrafı">
                </div>
            `;
            document.body.appendChild(modal);

            modal.querySelector('.clp-photo-modal-overlay').addEventListener('click', () => {
                this.closePhotoModal();
            });
            modal.querySelector('.clp-photo-modal-close').addEventListener('click', () => {
                this.closePhotoModal();
            });
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('show')) {
                    this.closePhotoModal();
                }
            });
        }

        modal.querySelector('.clp-photo-modal-image').src = photoUrl;
        modal.classList.add('show');
    },

    closePhotoModal() {
        const modal = document.getElementById('clp-photo-modal');
        if (modal) modal.classList.remove('show');
    },

    // Parking Pillar Icon SVG
    createPillarIcon(spotCode, colorHex = '#2563eb') {
        return `
            <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="2" width="52" height="6" rx="3" fill="${colorHex}"/>
                <rect x="8" y="8" width="44" height="42" fill="white" stroke="${colorHex}" stroke-width="2"/>
                <rect x="8" y="50" width="44" height="22" fill="${colorHex}"/>
                <circle cx="30" cy="30" r="14" fill="white" stroke="${colorHex}" stroke-width="2"/>
                <text x="30" y="35" text-anchor="middle" fill="${colorHex}" font-size="12" font-weight="700" font-family="system-ui">${spotCode}</text>
                <rect x="4" y="72" width="52" height="6" rx="3" fill="${colorHex}"/>
            </svg>
        `;
    },

    // Car Card
    createCarCard(parking, index) {
        const spotColor = parking.color?.hex || '#2563eb';
        const title = `Kat ${parking.floor} · ${parking.parkingSpot}`;
        
        const savedTime = parking.timestamp ? new Date(parking.timestamp) : new Date();
        const formattedTime = savedTime.toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        // İkon: Fotoğraf veya Pillar
        const iconHtml = parking.photo
            ? `<div class="clp-car-icon has-photo" data-photo="${parking.photo}" style="background-image: url(${parking.photo})"></div>`
            : `<div class="clp-car-icon pillar">${this.createPillarIcon(parking.parkingSpot, spotColor)}</div>`;

        // Renk chip
        const colorChip = parking.color
            ? `<span class="clp-color-chip" style="background: ${parking.color.hex};">${parking.color.name}</span>`
            : '';

        // Not (marquee efekti)
        let noteHtml = '';
        if (parking.note) {
            if (parking.note.length > 20) {
                noteHtml = `<div class="clp-car-note scrolling"><div class="clp-marquee"><span>${parking.note}</span><span>${parking.note}</span></div></div>`;
            } else {
                noteHtml = `<div class="clp-car-note"><span>${parking.note}</span></div>`;
            }
        }

        return `
            <div class="clp-car-card" data-index="${index}">
                ${iconHtml}
                <div class="clp-car-info">
                    <div class="clp-car-title">${title}</div>
                    ${noteHtml}
                    <div class="clp-car-time">${formattedTime}</div>
                    ${colorChip}
                </div>
                <div class="clp-car-actions">
                    <button class="clp-btn-circular navigate" data-index="${index}" title="Rota">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </button>
                    <button class="clp-btn-circular share" data-index="${index}" title="Paylaş">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                    <button class="clp-btn-circular delete" data-index="${index}" title="Sil">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    },

    // Bottom Sheet (Standalone)
    createBottomSheet(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const sheet = document.createElement('div');
        sheet.id = 'clp-bottom-sheet';
        sheet.className = 'clp-bottom-sheet';
        
        sheet.innerHTML = `
            <div class="clp-sheet-handle"></div>
            <div class="clp-sheet-content">
                ${options.content || ''}
            </div>
        `;

        container.appendChild(sheet);

        // Drag handle events
        const handle = sheet.querySelector('.clp-sheet-handle');
        let startY = 0, currentY = 0;

        handle.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; });
        handle.addEventListener('touchmove', (e) => { currentY = e.touches[0].clientY; });
        handle.addEventListener('touchend', () => {
            const diff = currentY - startY;
            if (Math.abs(diff) > 50) {
                if (diff > 0) sheet.classList.remove('expanded');
                else sheet.classList.add('expanded');
            }
        });

        return {
            element: sheet,
            expand: () => sheet.classList.add('expanded'),
            collapse: () => sheet.classList.remove('expanded'),
            toggle: () => sheet.classList.toggle('expanded'),
            isExpanded: () => sheet.classList.contains('expanded'),
            setContent: (html) => { sheet.querySelector('.clp-sheet-content').innerHTML = html; }
        };
    },

    // Expand Button (Floating)
    createExpandButton(options = {}) {
        const btn = document.createElement('button');
        btn.id = options.id || 'clp-expand-btn';
        btn.className = 'clp-expand-btn';
        btn.innerHTML = options.icon || `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
            </svg>
        `;

        if (options.container) {
            document.getElementById(options.container).appendChild(btn);
        } else {
            document.body.appendChild(btn);
        }

        if (options.onClick) {
            btn.addEventListener('click', options.onClick);
        }

        return btn;
    }
};

// ==================== GLOBAL EXPORTS ====================

if (typeof window !== 'undefined') {
    window.CLPPicker = CLPPicker;
    window.CLPUIComponents = CLPUIComponents;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CLPPicker, CLPUIComponents };
}

