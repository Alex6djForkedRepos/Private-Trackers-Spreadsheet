// Theme switcher component
function themeSwitcher() {
    return {
        isDark: true,
        accentColor: '#6366f1', // Default indigo
        showColorPicker: false,
        accentColors: [
            { name: 'Red', value: '#e74c3c' },
            { name: 'Blue', value: '#3498db' },
            { name: 'Green', value: '#27ae60' },
            { name: 'Purple', value: '#9b59b6' },
            { name: 'Orange', value: '#f39c12' },
            { name: 'Teal', value: '#1abc9c' },
            { name: 'Pink', value: '#e91e63' },
            { name: 'Indigo', value: '#6366f1' }
        ],
        init() {
            // Check for saved preferences
            const savedTheme = localStorage.getItem('theme');
            const savedAccent = localStorage.getItem('accentColor');

            this.isDark = savedTheme ? savedTheme === 'dark' : true;
            this.accentColor = savedAccent || '#6366f1'; // Default to indigo

            this.applyTheme();
            this.applyAccentColor();
        },
        toggleTheme() {
            this.isDark = !this.isDark;
            this.applyTheme();
            localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
        },
        setAccentColor(color) {
            this.accentColor = color;
            this.applyAccentColor();
            localStorage.setItem('accentColor', color);
            this.showColorPicker = false;
        },
        applyTheme() {
            document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
        },
        applyAccentColor() {
            document.documentElement.style.setProperty('--accent-primary', this.accentColor);

            // Calculate complementary colors based on the accent
            const hex = this.accentColor.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);

            // Create rgba variants for gradients and hover effects
            document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
            document.documentElement.style.setProperty('--hover-bg', `rgba(${r}, ${g}, ${b}, 0.05)`);

            // Update all gradient variants
            document.documentElement.style.setProperty('--gradient-red',
                `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.1) 0%, rgba(${r}, ${g}, ${b}, 0.05) 100%)`);
            document.documentElement.style.setProperty('--gradient-header',
                `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.1) 0%, rgba(${r}, ${g}, ${b}, 0.05) 100%)`);

            // Update icon glow effect
            document.documentElement.style.setProperty('--icon-glow',
                `drop-shadow(0 0 10px rgba(${r}, ${g}, ${b}, 0.5))`);

            // Update text shadow effects
            document.documentElement.style.setProperty('--text-glow',
                `0 0 10px rgba(${r}, ${g}, ${b}, 0.5)`);
                
            // Update scrollbar styling to match accent color
            document.documentElement.style.setProperty('--scrollbar-thumb', 
                `rgba(${r}, ${g}, ${b}, 0.3)`);
        }
    }
}

// AlpineJS component for main tracker table
function trackerTable() {
    return {
        trackers: [],
        search: '',
        sortColumn: '',
        sortDirection: 'asc',
        showStickyHeader: false,
        stickyHeaderLeft: 0,
        stickyHeaderWidth: 0,
        selectedTrackers: [],
        showCompareModal: false,
        tooltip: {
            show: false,
            text: '',
            x: 0,
            y: 0
        },
        init() {
            this.loadTrackers();
            // Set up scroll listener for sticky header
            this.setupStickyHeader();
        },
        setupStickyHeader() {
            const handleScroll = () => {
                const tableContainer = document.querySelector('.tracker-table__container');
                const originalHeader = document.querySelector('.tracker-table__main thead');
                const tableSection = document.querySelector('.tracker-table');
                
                if (!tableContainer || !originalHeader || !tableSection) return;
                
                const containerRect = tableContainer.getBoundingClientRect();
                const headerRect = originalHeader.getBoundingClientRect();
                const tableSectionRect = tableSection.getBoundingClientRect();
                const navbar = document.querySelector('.tracker-navbar');
                const navbarHeight = navbar ? navbar.offsetHeight : 85;
                
                // Show sticky header when:
                // 1. Original header is above viewport
                // 2. We haven't scrolled past the entire table section
                const headerOutOfView = headerRect.bottom < navbarHeight + 20;
                const stillInTableSection = tableSectionRect.bottom > navbarHeight + 60;
                const shouldShow = headerOutOfView && stillInTableSection;
                
                this.showStickyHeader = shouldShow;
                
                if (shouldShow) {
                    // Position sticky header to match the table container
                    this.stickyHeaderLeft = Math.max(0, containerRect.left);
                    this.stickyHeaderWidth = Math.min(containerRect.width, window.innerWidth - this.stickyHeaderLeft - 20);
                    
                    // Match column widths after a brief delay to ensure DOM is ready
                    this.$nextTick(() => {
                        this.matchColumnWidths();
                    });
                }
            };
            
            // Throttle scroll events for better performance
            let ticking = false;
            const throttledScroll = () => {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        handleScroll();
                        ticking = false;
                    });
                    ticking = true;
                }
            };
            
            window.addEventListener('scroll', throttledScroll);
            window.addEventListener('resize', throttledScroll);
            
            // Initial call
            handleScroll();
        },
        matchColumnWidths() {
            // Get the original table header cells
            const originalCells = document.querySelectorAll('.tracker-table__main thead th');
            const stickyCells = document.querySelectorAll('.tracker-table__sticky-table thead th');
            
            if (originalCells.length !== stickyCells.length) return;
            
            // Copy widths from original to sticky header
            originalCells.forEach((originalCell, index) => {
                if (stickyCells[index]) {
                    const width = originalCell.getBoundingClientRect().width;
                    stickyCells[index].style.width = `${width}px`;
                    stickyCells[index].style.minWidth = `${width}px`;
                    stickyCells[index].style.maxWidth = `${width}px`;
                }
            });
        },
        async loadTrackers() {
            try {
                const res = await fetch('./trackers.json');
                const data = await res.json();
                this.trackers = data.trackers || [];
            } catch (error) {
                console.error('Error loading trackers:', error);
            }
        },
        get filteredTrackers() {
            let filtered = this.trackers;

            if (this.search) {
                const s = this.search.toLowerCase();
                filtered = this.trackers.filter(tracker =>
                    Object.values(tracker).some(v => String(v).toLowerCase().includes(s))
                );
            }

            if (this.sortColumn) {
                filtered.sort((a, b) => {
                    let aVal = a[this.sortColumn] || '';
                    let bVal = b[this.sortColumn] || '';

                    // Always put "-" values at the end regardless of sort direction
                    if (aVal === '-' && bVal !== '-') return 1;
                    if (bVal === '-' && aVal !== '-') return -1;
                    if (aVal === '-' && bVal === '-') return 0;

                    // Special handling for Mozilla Observatory grades
                    if (this.sortColumn === 'Observatory Grade') {
                        aVal = this.parseGrade(aVal);
                        bVal = this.parseGrade(bVal);
                    }
                    // Special handling for numeric values with commas (Users, Torrents, Peers)
                    else if (['Users', 'Torrents', 'Peers'].includes(this.sortColumn)) {
                        aVal = this.parseNumber(aVal);
                        bVal = this.parseNumber(bVal);
                    }
                    // Handle other numeric values
                    else if (!isNaN(aVal) && !isNaN(bVal) && aVal !== '' && bVal !== '') {
                        aVal = parseFloat(aVal);
                        bVal = parseFloat(bVal);
                    } else {
                        aVal = String(aVal).toLowerCase();
                        bVal = String(bVal).toLowerCase();
                    }

                    if (this.sortDirection === 'asc') {
                        return aVal > bVal ? 1 : -1;
                    } else {
                        return aVal < bVal ? 1 : -1;
                    }
                });
            }

            return filtered;
        },
        showTooltip(event, text) {
            const rect = event.target.getBoundingClientRect();
            this.tooltip.text = text;
            this.tooltip.x = rect.left + rect.width / 2;
            this.tooltip.y = rect.top - 70;
            this.tooltip.show = true;
        },
        hideTooltip() {
            this.tooltip.show = false;
        },
        parseNumber(value) {
            if (!value || value === '-' || value === 'N/A') return Number.NEGATIVE_INFINITY;
            // Remove commas and convert to number
            const cleaned = String(value).replace(/,/g, '');
            const num = parseFloat(cleaned);
            return isNaN(num) ? Number.NEGATIVE_INFINITY : num;
        },
        parseGrade(grade) {
            if (!grade || grade === '-' || grade === 'N/A') return Number.POSITIVE_INFINITY;

            // Remove spaces and convert to uppercase for consistent parsing
            const cleanGrade = String(grade).replace(/\s+/g, '').toUpperCase();

            const gradeMap = {
                'A+': 1,
                'A': 2,
                'A-': 3,
                'B+': 4,
                'B': 5,
                'B-': 6,
                'C+': 7,
                'C': 8,
                'C-': 9,
                'D+': 10,
                'D': 11,
                'D-': 12,
                'F': 13
            };

            return gradeMap[cleanGrade] || Number.POSITIVE_INFINITY;
        },
        sortBy(column) {
            if (this.sortColumn === column) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortColumn = column;
                this.sortDirection = 'asc';
            }
        },
        
        // Tracker comparison functions
        isInSelectedTrackers(tracker) {
            return this.selectedTrackers.some(t => t.Name === tracker.Name);
        },
        
        toggleTrackerSelection(tracker) {
            if (this.isInSelectedTrackers(tracker)) {
                this.selectedTrackers = this.selectedTrackers.filter(t => t.Name !== tracker.Name);
            } else {
                if (this.selectedTrackers.length < 4) {
                    this.selectedTrackers.push(tracker);
                }
            }
        },
        
        openCompareModal() {
            if (this.selectedTrackers.length >= 2) {
                this.showCompareModal = true;
                document.body.classList.add('modal-open');
            }
        },
        
        closeCompareModal() {
            this.showCompareModal = false;
            document.body.classList.remove('modal-open');
        },
        
        removeFromComparison(tracker) {
            this.selectedTrackers = this.selectedTrackers.filter(t => t.Name !== tracker.Name);
            if (this.selectedTrackers.length < 2) {
                this.closeCompareModal();
            }
        }
    }
}

// AlpineJS component for Jackett table
function jackettTable() {
    return {
        jackettTrackers: [],
        search: '',
        sortColumn: '',
        sortDirection: 'asc',
        get filteredJackettTrackers() {
            let filtered = this.jackettTrackers;

            if (this.search) {
                const s = this.search.toLowerCase();
                filtered = this.jackettTrackers.filter(tracker =>
                    Object.values(tracker).some(v => String(v).toLowerCase().includes(s))
                );
            }

            if (this.sortColumn) {
                filtered.sort((a, b) => {
                    let aVal = a[this.sortColumn] || '';
                    let bVal = b[this.sortColumn] || '';
                    aVal = String(aVal).toLowerCase();
                    bVal = String(bVal).toLowerCase();

                    if (this.sortDirection === 'asc') {
                        return aVal > bVal ? 1 : -1;
                    } else {
                        return aVal < bVal ? 1 : -1;
                    }
                });
            }

            return filtered;
        },
        sortJackettBy(column) {
            if (this.sortColumn === column) {
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortColumn = column;
                this.sortDirection = 'asc';
            }
        },
        async init() {
            try {
                const res = await fetch('./trackers2.json');
                const data = await res.json();
                this.jackettTrackers = data.trackers || [];
            } catch (error) {
                console.error('Error loading Jackett trackers:', error);
            }
        }
    }
}
