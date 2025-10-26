// QuickApp Window

class QuickAppWindow {
    constructor() {
        this.quickAppId = null;
        this.quickAppName = '';
        this.files = [];
        this.currentFile = null;
        this.editor = null;
        this.invoke = window.__TAURI__.core.invoke;
        this.http = window.__TAURI__.http;
        this.parseUrlParams();
        this.initializeElements();
        this.bindEvents();
        this.initializeEditor();
        this.loadQuickAppData();
    }

    parseUrlParams() {
        const params = new URLSearchParams(window.location.search);
        this.quickAppId = params.get('id');
        this.quickAppName = params.get('name') || 'QuickApp';
    }

    initializeElements() {
        this.titleElement = document.getElementById('quickAppTitle');
        this.jsonContent = document.getElementById('jsonContent');
        this.fileListContent = document.getElementById('fileListContent');
        this.editorContainer = document.getElementById('editorContainer');
        this.currentFileName = document.getElementById('currentFileName');
        this.saveFileBtn = document.getElementById('saveFileBtn');
        this.addFileBtn = document.getElementById('addFileBtn');
        this.openUIBrowserBtn = document.getElementById('openUIBrowserBtn');
        
        if (this.titleElement) {
            this.titleElement.textContent = `${this.quickAppName} (${this.quickAppId})`;
        }
    }

    bindEvents() {
        // Tab switching
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Save button
        if (this.saveFileBtn) {
            this.saveFileBtn.addEventListener('click', () => this.saveFile());
        }
        
        // Add file button
        if (this.addFileBtn) {
            this.addFileBtn.addEventListener('click', () => this.createNewFile());
        }
        
        // Open UI button
        if (this.openUIBrowserBtn) {
            this.openUIBrowserBtn.addEventListener('click', () => this.openUIInBrowser());
        }
    }

    initializeEditor() {
        const editorContainer = document.getElementById('editorContainer');
        if (!editorContainer) return;
        
        this.editor = CodeMirror(editorContainer, {
            lineNumbers: true,
            mode: 'lua',
            theme: 'monokai',
            indentUnit: 2,
            tabSize: 2,
            indentWithTabs: false
        });
        
        this.editor.on('change', () => {
            if (this.saveFileBtn && this.currentFile) {
                this.saveFileBtn.style.display = 'block';
            }
        });
        
        // Force explicit height calculation
        this.resizeEditor();
        
        // Re-resize on window resize
        window.addEventListener('resize', () => this.resizeEditor());
    }
    
    resizeEditor() {
        if (!this.editor) return;
        
        const container = document.getElementById('editorContainer');
        if (!container) return;
        
        // Get the actual height of the container
        const height = container.offsetHeight;
        console.log('Setting editor height to:', height);
        
        // Set explicit height
        this.editor.setSize(null, height);
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load data for the tab if needed
        if (tabName === 'files' && this.files.length === 0) {
            this.loadFiles();
        }
    }

    async openUIInBrowser() {
        try {
            // Get HC3 configuration
            const config = await this.invoke('get_hc3_config');
            const protocol = config.protocol || 'http';
            const host = config.host;
            
            if (!host) {
                console.error('HC3 host not configured');
                alert('HC3 host not configured. Please check your .env file.');
                return;
            }
            
            // Construct the URL
            const url = `${protocol}://${host}/mobile/devices/${this.quickAppId}`;
            
            console.log(`Opening UI in browser: ${url}`);
            
            // Open in default browser using Tauri command
            await this.invoke('open_url', { url: url });
        } catch (error) {
            console.error('Error opening UI in browser:', error);
            alert(`Failed to open browser: ${error.message}`);
        }
    }

    async loadQuickAppData() {
        try {
            const config = await this.invoke('get_hc3_config');
            const url = `${config.protocol}://${config.host}/api/devices/${this.quickAppId}`;
            
            const response = await this.http.fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${btoa(`${config.user}:${config.password}`)}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            const data = JSON.parse(text);
            
            // Display JSON
            this.jsonContent.textContent = JSON.stringify(data, null, 2);
            
        } catch (error) {
            console.error('Failed to load QuickApp data:', error);
            this.jsonContent.textContent = `Error loading QuickApp data: ${error.message}`;
        }
    }

    async loadFiles() {
        try {
            const config = await this.invoke('get_hc3_config');
            const url = `${config.protocol}://${config.host}/api/quickApp/${this.quickAppId}/files`;
            
            const response = await this.http.fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${btoa(`${config.user}:${config.password}`)}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            const data = JSON.parse(text);
            
            this.files = Array.isArray(data) ? data : [];
            this.renderFileList();
            
        } catch (error) {
            console.error('Failed to load files:', error);
            this.fileListContent.innerHTML = `<div style="color: #d32f2f; padding: 10px;">Error loading files: ${error.message}</div>`;
        }
    }

    renderFileList() {
        this.fileListContent.innerHTML = '';
        
        if (this.files.length === 0) {
            this.fileListContent.innerHTML = '<div style="color: #666; padding: 10px;">No files found</div>';
            return;
        }

        this.files.forEach(file => {
            const fileName = typeof file === 'string' ? file : file.name;
            const isMain = file.isMain === true;
            
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'file-item-name';
            nameSpan.textContent = fileName + (isMain ? ' (main)' : '');
            
            const actions = document.createElement('div');
            actions.className = 'file-item-actions';
            
            // Rename button
            const renameBtn = document.createElement('button');
            renameBtn.textContent = '✏️';
            renameBtn.title = 'Rename file';
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.renameFile(fileName);
            });
            actions.appendChild(renameBtn);
            
            // Delete button (only if not main)
            if (!isMain) {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️';
                deleteBtn.title = 'Delete file';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteFile(fileName);
                });
                actions.appendChild(deleteBtn);
            }
            
            fileItem.appendChild(nameSpan);
            fileItem.appendChild(actions);
            
            fileItem.addEventListener('click', () => this.loadFileContent(fileName));
            this.fileListContent.appendChild(fileItem);
        });
    }

    async loadFileContent(fileName) {
        try {
            // Update active state
            document.querySelectorAll('.file-item').forEach(item => {
                item.classList.remove('active');
                if (item.textContent === fileName) {
                    item.classList.add('active');
                }
            });

            this.currentFileName.textContent = fileName;
            if (this.saveFileBtn) {
                this.saveFileBtn.style.display = 'none';
            }

            const config = await this.invoke('get_hc3_config');
            const url = `${config.protocol}://${config.host}/api/quickApp/${this.quickAppId}/files/${encodeURIComponent(fileName)}`;
            
            const response = await this.http.fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${btoa(`${config.user}:${config.password}`)}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            
            // Try to parse as JSON and extract content field
            try {
                const json = JSON.parse(text);
                if (json.content) {
                    this.editor.setValue(json.content);
                } else {
                    // If no content field, show the whole response
                    this.editor.setValue(text);
                }
            } catch (e) {
                // Not JSON, show as-is
                this.editor.setValue(text);
            }
            
            this.currentFile = fileName;
            
            // Resize editor after content is loaded
            this.resizeEditor();
            
        } catch (error) {
            console.error('Failed to load file content:', error);
            this.editor.setValue(`Error loading file: ${error.message}`);
        }
    }

    async saveFile() {
        if (!this.currentFile) return;
        
        try {
            const content = this.editor.getValue();
            const config = await this.invoke('get_hc3_config');
            const url = `${config.protocol}://${config.host}/api/quickApp/${this.quickAppId}/files/${encodeURIComponent(this.currentFile)}`;
            
            const response = await this.http.fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Basic ${btoa(`${config.user}:${config.password}`)}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: content,
                    name: this.currentFile
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (this.saveFileBtn) {
                this.saveFileBtn.style.display = 'none';
            }
            
            console.log(`File ${this.currentFile} saved successfully`);
            
        } catch (error) {
            console.error('Failed to save file:', error);
            alert(`Failed to save file: ${error.message}`);
        }
    }

    async createNewFile() {
        const fileName = prompt('Enter new file name (at least 3 characters, no special characters):');
        if (!fileName) return;
        
        // Validate filename
        if (fileName.length < 3) {
            alert('File name must be at least 3 characters long');
            return;
        }
        
        if (!/^[a-zA-Z0-9_.-]+$/.test(fileName)) {
            alert('File name can only contain letters, numbers, underscores, dots, and hyphens');
            return;
        }
        
        try {
            const config = await this.invoke('get_hc3_config');
            const url = `${config.protocol}://${config.host}/api/quickApp/${this.quickAppId}/files/${encodeURIComponent(fileName)}`;
            
            const response = await this.http.fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${btoa(`${config.user}:${config.password}`)}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: fileName,
                    content: '',
                    isMain: false,
                    type: 'lua'
                })
            });

            if (response.status < 200 || response.status > 203) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.log(`File ${fileName} created successfully`);
            
            // Reload file list
            await this.loadFiles();
            
            // Open the new file
            this.loadFileContent(fileName);
            
        } catch (error) {
            console.error('Failed to create file:', error);
            alert(`Failed to create file: ${error.message}`);
        }
    }

    async renameFile(oldName) {
        const newName = prompt('Enter new file name:', oldName);
        if (!newName || newName === oldName) return;
        
        // Validate filename
        if (newName.length < 3) {
            alert('File name must be at least 3 characters long');
            return;
        }
        
        if (!/^[a-zA-Z0-9_.-]+$/.test(newName)) {
            alert('File name can only contain letters, numbers, underscores, dots, and hyphens');
            return;
        }
        
        try {
            const config = await this.invoke('get_hc3_config');
            
            // First, get the current file content
            const getUrl = `${config.protocol}://${config.host}/api/quickApp/${this.quickAppId}/files/${encodeURIComponent(oldName)}`;
            const getResponse = await this.http.fetch(getUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${btoa(`${config.user}:${config.password}`)}`
                }
            });

            if (!getResponse.ok) {
                throw new Error(`Failed to read file: ${getResponse.status}`);
            }

            const text = await getResponse.text();
            const fileData = JSON.parse(text);
            
            // Update with new name
            fileData.name = newName;
            
            // PUT to old name with new name in body
            const putUrl = `${config.protocol}://${config.host}/api/quickApp/${this.quickAppId}/files/${encodeURIComponent(oldName)}`;
            const putResponse = await this.http.fetch(putUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Basic ${btoa(`${config.user}:${config.password}`)}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(fileData)
            });

            if (putResponse.status < 200 || putResponse.status > 203) {
                throw new Error(`HTTP error! status: ${putResponse.status}`);
            }

            console.log(`File renamed from ${oldName} to ${newName}`);
            
            // Reload file list
            await this.loadFiles();
            
            // If this was the current file, load the renamed version
            if (this.currentFile === oldName) {
                this.loadFileContent(newName);
            }
            
        } catch (error) {
            console.error('Failed to rename file:', error);
            alert(`Failed to rename file: ${error.message}`);
        }
    }

    async deleteFile(fileName) {
        if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
            return;
        }
        
        try {
            const config = await this.invoke('get_hc3_config');
            const url = `${config.protocol}://${config.host}/api/quickApp/${this.quickAppId}/files/${encodeURIComponent(fileName)}`;
            
            const response = await this.http.fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Basic ${btoa(`${config.user}:${config.password}`)}`
                }
            });

            if (response.status < 200 || response.status > 203) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.log(`File ${fileName} deleted successfully`);
            
            // Clear editor if this was the current file
            if (this.currentFile === fileName) {
                this.editor.setValue('');
                this.currentFileName.textContent = 'Select a file';
                this.currentFile = null;
                if (this.saveFileBtn) {
                    this.saveFileBtn.style.display = 'none';
                }
            }
            
            // Reload file list
            await this.loadFiles();
            
        } catch (error) {
            console.error('Failed to delete file:', error);
            alert(`Failed to delete file: ${error.message}`);
        }
    }
}

// Initialize the window
document.addEventListener('DOMContentLoaded', () => {
    window.quickAppWindow = new QuickAppWindow();
});
