// HC3 QuickApp Manager

class QuickAppManager {
    constructor() {
        this.isConnected = false;
        this.quickApps = [];
        this.hc3Config = {};
        this.sortColumn = 'id';
        this.sortDirection = 'asc';
        this.lastEventId = 0;
        this.isPolling = false;
        this.isResizing = false;
        this.openWindows = new Map(); // Track open windows
        this.invoke = window.__TAURI__.core.invoke;
        this.http = window.__TAURI__.http;
        this.initializeElements();
        this.bindEvents();
        this.loadConfig();
    }

    initializeElements() {
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.quickAppTableBody = document.getElementById('quickAppTableBody');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.windowMenuBtn = document.getElementById('windowMenuBtn');
        this.windowMenuDropdown = document.getElementById('windowMenuDropdown');
        this.windowList = document.getElementById('windowList');
    }

    bindEvents() {
        if (this.connectionStatus) {
            this.connectionStatus.addEventListener('click', () => this.connect());
        }
        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', () => this.fetchQuickApps());
        }
        
        // Setup window menu
        if (this.windowMenuBtn) {
            this.windowMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleWindowMenu();
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.window-menu')) {
                this.windowMenuDropdown?.classList.remove('show');
            }
        });
        
        // Setup column resizing
        this.setupColumnResizing();
        
        // Setup column sorting
        this.setupColumnSorting();
    }

    async loadConfig() {
        // Configuration is loaded from .env file by Rust backend
        // We'll get it via fetch request headers
        this.hc3Config = {
            host: '',  // Will be set after first connection attempt
            protocol: 'http'
        };
        
        // Try to connect immediately
        await this.connect();
    }

    async connect() {
        console.log('Connecting to HC3...');
        this.updateConnectionStatus(false);
        
        try {
            await this.fetchQuickApps();
            // Start polling for events after successful connection
            this.startEventPolling();
        } catch (error) {
            console.error('Connection failed:', error);
            this.updateConnectionStatus(false);
        }
    }

    async fetchQuickApps() {
        try {
            // Get HC3 credentials from Tauri backend
            const config = await this.invoke('get_hc3_config');
            
            // Fetch both regular QuickApps and QuickApp children
            const url1 = `${config.protocol}://${config.host}/api/devices?interface=quickApp`;
            const url2 = `${config.protocol}://${config.host}/api/devices?interface=quickAppChild`;
            
            // Use Tauri's HTTP client to avoid CORS issues
            const [response1, response2] = await Promise.all([
                this.http.fetch(url1, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${btoa(`${config.user}:${config.password}`)}`,
                        'Content-Type': 'application/json'
                    }
                }),
                this.http.fetch(url2, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${btoa(`${config.user}:${config.password}`)}`,
                        'Content-Type': 'application/json'
                    }
                })
            ]);
            
            if (!response1.ok || !response2.ok) {
                throw new Error(`HTTP error! status: ${response1.status || response2.status}`);
            }

            // Get the response text and parse as JSON
            const text1 = await response1.text();
            const text2 = await response2.text();
            const data1 = JSON.parse(text1);
            const data2 = JSON.parse(text2);
            
            // Combine both arrays and mark children
            const quickApps = Array.isArray(data1) ? data1 : [];
            const children = Array.isArray(data2) ? data2 : [];
            
            // Mark child devices
            children.forEach(child => {
                child.isChild = true;
            });
            
            this.quickApps = [...quickApps, ...children];
            
            console.log('Fetched QuickApps:', quickApps.length, 'regular,', children.length, 'children');
            this.updateConnectionStatus(true);
            this.renderQuickApps();
            
        } catch (error) {
            console.error('Failed to fetch QuickApps:', error);
            this.updateConnectionStatus(false);
            alert(`Failed to connect to HC3: ${error.message || error}`);
        }
    }

    getEnvVar(name) {
        // This method is no longer needed since we use Tauri command
        return null;
    }

    renderQuickApps() {
        this.quickAppTableBody.innerHTML = '';
        
        if (this.quickApps.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="4" style="text-align: center; padding: 20px;">No QuickApps found</td>';
            this.quickAppTableBody.appendChild(row);
            return;
        }

        // Sort the quickApps array
        const sorted = this.sortQuickApps([...this.quickApps]);

        sorted.forEach(qa => {
            const row = document.createElement('tr');
            const childEmoji = qa.isChild ? '👶 ' : '';
            row.innerHTML = `
                <td>${qa.id}</td>
                <td>${childEmoji}${qa.name || '-'}</td>
                <td>${qa.type || '-'}</td>
                <td>${this.formatDate(qa.modified)}</td>
            `;
            row.style.cursor = qa.isChild ? 'not-allowed' : 'pointer';
            if (!qa.isChild) {
                row.addEventListener('click', () => this.openQuickAppWindow(qa));
            } else {
                row.style.opacity = '0.7';
                row.title = 'Child QuickApps do not have editable files';
            }
            this.quickAppTableBody.appendChild(row);
        });
    }

    sortQuickApps(apps) {
        return apps.sort((a, b) => {
            let aVal = a[this.sortColumn];
            let bVal = b[this.sortColumn];
            
            // Handle null/undefined values
            if (aVal == null) aVal = '';
            if (bVal == null) bVal = '';
            
            // Convert to string for comparison
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
            
            const comparison = aVal.localeCompare(bVal, undefined, { numeric: true });
            return this.sortDirection === 'asc' ? comparison : -comparison;
        });
    }

    setupColumnSorting() {
        const headers = document.querySelectorAll('.quickapp-table th');
        const columnNames = ['id', 'name', 'type', 'modified'];
        
        headers.forEach((header, index) => {
            header.style.cursor = 'pointer';
            header.style.userSelect = 'none';
            
            // Add sort indicator span
            const indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            header.appendChild(indicator);
            
            header.addEventListener('click', () => {
                // Don't sort if we're currently resizing
                if (this.isResizing) {
                    return;
                }
                
                const column = columnNames[index];
                
                if (this.sortColumn === column) {
                    // Toggle direction
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    // New column, default to ascending
                    this.sortColumn = column;
                    this.sortDirection = 'asc';
                }
                
                this.updateSortIndicators();
                this.renderQuickApps();
            });
        });
        
        // Set initial sort indicator
        this.updateSortIndicators();
    }

    updateSortIndicators() {
        const headers = document.querySelectorAll('.quickapp-table th');
        const columnNames = ['id', 'name', 'type', 'modified'];
        
        headers.forEach((header, index) => {
            const indicator = header.querySelector('.sort-indicator');
            if (columnNames[index] === this.sortColumn) {
                indicator.textContent = this.sortDirection === 'asc' ? ' ▲' : ' ▼';
            } else {
                indicator.textContent = '';
            }
        });
    }

    setupColumnResizing() {
        const table = document.querySelector('.quickapp-table');
        const headers = table.querySelectorAll('th');
        
        headers.forEach((header, index) => {
            // Create resize handle
            const resizer = document.createElement('div');
            resizer.className = 'resize-handle';
            header.appendChild(resizer);
            
            let startX, startWidth;
            
            // Prevent clicks on the resizer from triggering sort
            resizer.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent sort from triggering
                this.isResizing = true;
                startX = e.pageX;
                startWidth = header.offsetWidth;
                
                const onMouseMove = (e) => {
                    const width = startWidth + (e.pageX - startX);
                    if (width > 50) { // Minimum width
                        header.style.width = width + 'px';
                        header.style.minWidth = width + 'px';
                        header.style.maxWidth = width + 'px';
                    }
                };
                
                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    // Delay resetting isResizing to catch any click events
                    setTimeout(() => {
                        this.isResizing = false;
                    }, 100);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        });
    }

    formatDate(timestamp) {
        if (!timestamp) return '-';
        const date = new Date(timestamp * 1000);
        return date.toLocaleString();
    }

    updateConnectionStatus(connected) {
        this.isConnected = connected;
        if (connected) {
            this.statusIndicator.classList.add('connected');
            this.statusText.textContent = 'Connected';
        } else {
            this.statusIndicator.classList.remove('connected');
            this.statusText.textContent = 'Disconnected';
        }
    }

    async openQuickAppWindow(quickApp) {
        const { WebviewWindow } = window.__TAURI__.webviewWindow;
        
        // Create a unique label for this window
        const label = `quickapp-${quickApp.id}`;
        
        // Check if we already have this window tracked
        if (this.openWindows.has(label)) {
            const { window: existingWindow } = this.openWindows.get(label);
            try {
                await existingWindow.setFocus();
                console.log(`Focused existing window for QuickApp ${quickApp.id}`);
            } catch (e) {
                console.log('Could not focus window:', e);
            }
            return;
        }
        
        // Create new window
        const webview = new WebviewWindow(label, {
            url: `quickapp.html?id=${quickApp.id}&name=${encodeURIComponent(quickApp.name || 'QuickApp')}`,
            title: `${quickApp.name || 'QuickApp'} - ${quickApp.id}`,
            width: 1000,
            height: 700,
            resizable: true
        });
        
        // Track the window
        this.openWindows.set(label, { window: webview, quickApp });
        this.updateWindowMenu();
        
        webview.once('tauri://created', () => {
            console.log(`Window created for QuickApp ${quickApp.id}`);
        });
        
        webview.once('tauri://error', (e) => {
            console.error('Error creating window:', e);
            console.error('Error details:', JSON.stringify(e, null, 2));
            // Remove from tracking if creation failed
            this.openWindows.delete(label);
            this.updateWindowMenu();
        });
        
        // Clean up tracking when window is closed
        webview.once('tauri://destroyed', () => {
            console.log(`Window closed for QuickApp ${quickApp.id}`);
            this.openWindows.delete(label);
            this.updateWindowMenu();
        });
    }

    startEventPolling() {
        // Stop any existing polling
        this.stopEventPolling();
        
        // Start long polling
        this.isPolling = true;
        this.pollEvents();
        console.log('Started event polling');
    }

    stopEventPolling() {
        this.isPolling = false;
        console.log('Stopped event polling');
    }

    async pollEvents() {
        // Continue polling while isPolling is true
        while (this.isPolling) {
            try {
                const config = await this.invoke('get_hc3_config');
                const url = `${config.protocol}://${config.host}/api/refreshStates?last=${this.lastEventId}&timeout=30`;
                
                const response = await this.http.fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${btoa(`${config.user}:${config.password}`)}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 35  // Slightly longer than server timeout
                });

                if (!response.ok) {
                    console.error('Event polling failed:', response.status);
                    // Wait a bit before retrying on error
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue;
                }

                const text = await response.text();
                const data = JSON.parse(text);
                
                if (data.last) {
                    this.lastEventId = data.last;
                }

                if (data.events && Array.isArray(data.events)) {
                    await this.processEvents(data.events);
                }
            } catch (error) {
                console.error('Event polling error:', error);
                // Wait a bit before retrying on error
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    async processEvents(events) {
        // Filter for QuickApp-related events
        const relevantEventTypes = [
            'DeviceRemovedEvent',
            'DeviceChangedRoomEvent',
            'DeviceCreatedEvent',
            'DeviceModifiedEvent',
            'QuickAppFilesChangedEvent'
        ];

        const relevantEvents = events.filter(event => 
            relevantEventTypes.includes(event.type)
        );

        if (relevantEvents.length === 0) {
            return;
        }

        console.log('Processing QuickApp events:', relevantEvents);

        for (const event of relevantEvents) {
            if (event.type === 'DeviceRemovedEvent') {
                await this.handleDeviceRemoved(event);
            } else if (event.type === 'DeviceCreatedEvent') {
                await this.handleDeviceCreated(event);
            } else {
                // For modified, changed room, or files changed - refresh that device
                await this.handleDeviceModified(event);
            }
        }
    }

    async handleDeviceRemoved(event) {
        const deviceId = event.data?.id || event.id;
        console.log(`Device removed: ${deviceId}`);
        
        // Remove from our list
        this.quickApps = this.quickApps.filter(qa => qa.id !== deviceId);
        this.renderQuickApps();
    }

    async handleDeviceCreated(event) {
        const deviceId = event.data?.id || event.id;
        console.log(`Device created: ${deviceId}`);
        
        // Fetch the new device and check if it's a QuickApp
        await this.refreshSingleDevice(deviceId);
    }

    async handleDeviceModified(event) {
        const deviceId = event.data?.id || event.id;
        console.log(`Device modified: ${deviceId}`);
        
        // Refresh the device info
        await this.refreshSingleDevice(deviceId);
    }

    async refreshSingleDevice(deviceId) {
        try {
            const config = await this.invoke('get_hc3_config');
            const url = `${config.protocol}://${config.host}/api/devices/${deviceId}`;
            
            const response = await this.http.fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${btoa(`${config.user}:${config.password}`)}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`Failed to fetch device ${deviceId}:`, response.status);
                return;
            }

            const text = await response.text();
            const device = JSON.parse(text);
            
            // Check if it has quickApp interface
            if (device.interfaces && device.interfaces.includes('quickApp')) {
                // Update or add to our list
                const index = this.quickApps.findIndex(qa => qa.id === deviceId);
                if (index >= 0) {
                    this.quickApps[index] = device;
                    console.log(`Updated QuickApp ${deviceId}`);
                } else {
                    this.quickApps.push(device);
                    console.log(`Added new QuickApp ${deviceId}`);
                }
                this.renderQuickApps();
            } else {
                // Not a QuickApp (anymore?), remove if it exists
                const index = this.quickApps.findIndex(qa => qa.id === deviceId);
                if (index >= 0) {
                    this.quickApps.splice(index, 1);
                    console.log(`Removed non-QuickApp ${deviceId}`);
                    this.renderQuickApps();
                }
            }
        } catch (error) {
            console.error(`Error refreshing device ${deviceId}:`, error);
        }
    }

    toggleWindowMenu() {
        this.windowMenuDropdown?.classList.toggle('show');
        if (this.windowMenuDropdown?.classList.contains('show')) {
            this.updateWindowMenu();
        }
    }

    updateWindowMenu() {
        if (!this.windowList) return;
        
        this.windowList.innerHTML = '';
        
        if (this.openWindows.size === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'window-list-empty';
            emptyMsg.textContent = 'No open windows';
            this.windowList.appendChild(emptyMsg);
            return;
        }
        
        // Sort windows by QuickApp name
        const windows = Array.from(this.openWindows.entries()).sort((a, b) => {
            const nameA = a[1].quickApp.name || '';
            const nameB = b[1].quickApp.name || '';
            return nameA.localeCompare(nameB);
        });
        
        windows.forEach(([label, { window, quickApp }]) => {
            const item = document.createElement('div');
            item.className = 'window-item';
            item.innerHTML = `
                <span class="window-item-icon">🪟</span>
                <span class="window-item-text">${quickApp.name || 'QuickApp'} (ID: ${quickApp.id})</span>
            `;
            item.addEventListener('click', async () => {
                try {
                    await window.unminimize();
                    await window.setFocus();
                    this.windowMenuDropdown?.classList.remove('show');
                } catch (e) {
                    console.error('Error focusing window:', e);
                }
            });
            this.windowList.appendChild(item);
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.manager = new QuickAppManager();
});
