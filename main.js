/**
 * API Architect Pro - Vanilla JS Implementation
 * Ported 1:1 from React reference
 * 
 * Now utilizing style.css for robust sidebar interactions.
 * VERSION: 2.0-POSTMAN-IMPORT
 */

// Version check
console.log('🚀 API Architect Pro v2.0 - Postman Import Support Enabled');

// --- Constants & Config ---
const API_BASE_URL = 'http://localhost:5000/api';
const DEFAULT_COLLECTION_ID = 'default-collection';

const INITIAL_COLLECTION = {
    id: DEFAULT_COLLECTION_ID,
    name: "API Architect Pro",
    description: "Advanced API collection manager designed for precision documentation and AI-ready blueprint generation.",
    items: []
};

const GLASS_INPUT_CLASSES = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all";

const METHOD_COLORS = {
    GET: 'text-blue-400',
    POST: 'text-green-400',
    PUT: 'text-orange-400',
    DELETE: 'text-red-400',
    PATCH: 'text-yellow-400',
    HEAD: 'text-purple-400',
    OPTIONS: 'text-gray-400'
};

// --- State ---
let state = {
    collection: JSON.parse(JSON.stringify(INITIAL_COLLECTION)),
    selectedId: null,
    currentCollectionId: DEFAULT_COLLECTION_ID,
    allCollections: [],
    authToken: localStorage.getItem('api_arch_token'),
    currentUser: JSON.parse(localStorage.getItem('api_arch_user') || 'null'),
    authMode: 'login' // 'login' or 'register'
};

// Draft State
let localDraft = null;
let isDirty = false;
let isSaved = false;
let specDirty = false; // Tracks if API spec fields are changed
let sidebarFilter = "";

const markDirty = (isSpec = false) => {
    isDirty = true;
    isSaved = false;
    if (isSpec) specDirty = true;

    const btn = document.getElementById('btn-save-main');
    if (btn && specDirty) {
        btn.disabled = false;
        btn.innerHTML = 'Save Request';
        btn.classList.remove('bg-white/5', 'border-white/10', 'text-gray-500', 'cursor-not-allowed', 'opacity-50');
        btn.classList.remove('bg-green-600', 'border-green-500', 'text-white');
        btn.classList.add('bg-blue-600/10', 'border-blue-500/30', 'text-blue-400', 'hover:bg-blue-600', 'hover:text-white', 'cursor-pointer');
    }
};

// --- DOM Elements ---
const elements = {
    sidebarItems: document.getElementById('sidebar-items'),
    editorContent: document.getElementById('editor-content'),
    emptyState: document.getElementById('empty-state'),
    btnAddRequest: document.getElementById('btn-add-request'),
    btnAddFolder: document.getElementById('btn-add-folder'),
    btnAddCollection: document.getElementById('btn-add-collection'),
    collectionSelector: document.getElementById('collection-selector'),
    fileInput: document.getElementById('file-import-input'),
    searchInput: document.getElementById('sidebar-search'),
    // Auth Elements
    authOverlay: document.getElementById('auth-overlay'),
    authUsername: document.getElementById('auth-username'),
    authPassword: document.getElementById('auth-password'),
    authSubmit: document.getElementById('auth-submit'),
    authTitle: document.getElementById('auth-title'),
    authToggle: document.getElementById('auth-toggle'),
    authToggleText: document.getElementById('auth-toggle-text'),
    btnLogout: document.getElementById('btn-logout'),
    userDisplayName: document.getElementById('user-display-name'),
    toastContainer: document.getElementById('toast-container'),
    loadingOverlay: document.getElementById('loading-overlay')
};

const ui = {
    getElements() {
        return {
            modal: document.getElementById('custom-modal'),
            title: document.getElementById('modal-title'),
            message: document.getElementById('modal-message'),
            input: document.getElementById('modal-input'),
            cancel: document.getElementById('modal-cancel'),
            confirm: document.getElementById('modal-confirm')
        };
    },

    show(options) {
        return new Promise((resolve) => {
            const els = this.getElements();
            if (!els.modal) return resolve(options.type === 'prompt' ? null : false);

            els.title.innerText = options.title || 'Notification';
            els.message.innerText = options.message || '';
            els.input.value = options.value || '';

            if (options.type === 'prompt') {
                els.input.classList.remove('hidden');
                setTimeout(() => els.input.focus(), 50);
            } else {
                els.input.classList.add('hidden');
            }

            if (options.type === 'alert') {
                els.cancel.classList.add('hidden');
            } else {
                els.cancel.classList.remove('hidden');
            }

            // Destructive Style
            if (options.destructive) {
                els.confirm.classList.remove('bg-blue-600', 'hover:bg-blue-500');
                els.confirm.classList.add('bg-red-600', 'hover:bg-red-500');
            } else {
                els.confirm.classList.remove('bg-red-600', 'hover:bg-red-500');
                els.confirm.classList.add('bg-blue-600', 'hover:bg-blue-500');
            }

            const close = () => {
                els.modal.classList.add('hidden', 'opacity-0');
                els.modal.classList.remove('flex', 'opacity-100');
                els.confirm.onclick = null;
                els.cancel.onclick = null;
                els.input.onkeydown = null;
            };

            els.confirm.onclick = () => {
                close();
                resolve(options.type === 'prompt' ? els.input.value : true);
            };

            els.cancel.onclick = () => {
                close();
                resolve(options.type === 'prompt' ? null : false);
            };

            if (options.type === 'prompt') {
                els.input.onkeydown = (e) => {
                    if (e.key === 'Enter') els.confirm.click();
                    if (e.key === 'Escape') els.cancel.click();
                };
            }

            els.modal.classList.remove('hidden');
            requestAnimationFrame(() => {
                els.modal.classList.add('flex', 'opacity-100');
                els.modal.classList.remove('opacity-0');
            });
        });
    },

    confirm(msg, destructive = false) { return this.show({ type: 'confirm', message: msg, destructive }); },
    alert(msg) { return this.show({ type: 'alert', message: msg }); },
    prompt(title, val) { return this.show({ type: 'prompt', title, value: val }); },

    showToast(message, type = 'success') {
        const container = elements.toastContainer;
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
        toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    showLoader() {
        if (!elements.loadingOverlay) return;
        elements.loadingOverlay.classList.remove('hidden');
        requestAnimationFrame(() => {
            elements.loadingOverlay.classList.add('opacity-100');
            elements.loadingOverlay.classList.remove('opacity-0');
        });
    },

    hideLoader() {
        if (!elements.loadingOverlay) return;
        elements.loadingOverlay.classList.remove('opacity-100');
        elements.loadingOverlay.classList.add('opacity-0');
        setTimeout(() => {
            elements.loadingOverlay.classList.add('hidden');
        }, 300);
    }
};

// --- API Integration ---
const api = {
    async request(endpoint, options = {}) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };

            if (state.authToken) {
                headers['Authorization'] = `Bearer ${state.authToken}`;
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });

            if (response.status === 401) {
                handleLogout();
                throw new Error('Session expired. Please log in again.');
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'API request failed');
            }

            return await response.json();
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    },

    // Collections
    async getCollection(id) {
        return this.request(`/collections/${id}`);
    },

    async updateCollection(id, data) {
        return this.request(`/collections/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteCollection(id) {
        return this.request(`/collections/${id}`, {
            method: 'DELETE'
        });
    },

    // Folders
    async createFolder(data) {
        return this.request('/folders', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateFolder(id, data) {
        return this.request(`/folders/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteFolder(id) {
        return this.request(`/folders/${id}`, {
            method: 'DELETE'
        });
    },

    // Requests
    async createRequest(data) {
        return this.request('/requests', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateRequest(id, data) {
        return this.request(`/requests/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteRequest(id) {
        return this.request(`/requests/${id}`, {
            method: 'DELETE'
        });
    }
};

// --- Helpers ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

const findItem = (items, id) => {
    for (const item of items) {
        if (item.id === id) return item;
        if (item.type === 'folder') {
            const found = findItem(item.items, id);
            if (found) return found;
        }
    }
    return null;
};

const updateRecursive = (items, updatedItem) => items.map(item => {
    if (item.id === updatedItem.id) return updatedItem;
    if (item.type === 'folder') return { ...item, items: updateRecursive(item.items, updatedItem) };
    return item;
});

const insertRecursive = (items, parentId, newItem) => items.map(item => {
    if (item.id === parentId && item.type === 'folder') return { ...item, items: [...item.items, newItem] };
    if (item.type === 'folder') return { ...item, items: insertRecursive(item.items, parentId, newItem) };
    return item;
});

const deleteRecursive = (items, id) => items.filter(i => i.id !== id).map(item => {
    if (item.type === 'folder') return { ...item, items: deleteRecursive(item.items, id) };
    return item;
});

// --- Actions ---

const setState = (updates) => {
    state = { ...state, ...updates };
    render();
};

const loadCollection = async () => {
    if (!state.currentCollectionId) return;
    ui.showLoader();

    try {
        const collection = await api.getCollection(state.currentCollectionId);
        console.log('Loaded collection from API:', collection);

        // Ensure items array exists
        if (!collection.items) {
            collection.items = [];
        }

        state.collection = collection;
        state.selectedId = null;

        // Initialize localDraft to the collection (root)
        localDraft = deepCopy(state.collection);
        isDirty = false;

        render();
    } catch (err) {
        console.error('Failed to load collection:', err);
        await ui.alert(`Failed to load collection: ${err.message}. Using default collection.`);
        state.collection = JSON.parse(JSON.stringify(INITIAL_COLLECTION));
        state.selectedId = null;
        localDraft = deepCopy(state.collection);
        isDirty = false;
        render();
    } finally {
        ui.hideLoader();
    }
};

const loadAllCollections = async () => {
    try {
        const collections = await api.request('/collections');
        state.allCollections = collections;

        // Update dropdown
        if (elements.collectionSelector) {
            if (collections.length === 0) {
                elements.collectionSelector.innerHTML = '<option value="" disabled selected>No Collections Found</option>';
            } else {
                elements.collectionSelector.innerHTML = collections.map(col =>
                    `<option value="${col.id}" ${col.id === state.currentCollectionId ? 'selected' : ''}>${col.name}</option>`
                ).join('');
            }
        }
    } catch (err) {
        console.error('Failed to load collections:', err);
    }
};

const handleSwitchCollection = async (collectionId) => {
    if (isDirty) {
        if (!await ui.confirm("Unsaved changes will be lost. Continue?", true)) {
            // Reset dropdown to current collection
            if (elements.collectionSelector) {
                elements.collectionSelector.value = state.currentCollectionId;
            }
            return;
        }
        isDirty = false;
    }

    state.currentCollectionId = collectionId;
    await loadCollection();
};

const showAuth = () => {
    if (!elements.authOverlay) return;
    elements.authOverlay.classList.remove('hidden');
    requestAnimationFrame(() => {
        elements.authOverlay.classList.add('opacity-100');
        elements.authOverlay.classList.remove('opacity-0');
    });
};

const hideAuth = () => {
    if (!elements.authOverlay) return;
    elements.authOverlay.classList.add('hidden', 'opacity-0');
    elements.authOverlay.classList.remove('opacity-100');
};

const toggleAuthMode = () => {
    state.authMode = state.authMode === 'login' ? 'register' : 'login';
    if (state.authMode === 'login') {
        elements.authTitle.innerText = "Welcome";
        elements.authSubmit.innerText = "Sign In";
        elements.authToggleText.innerHTML = `Don't have an account? <button id="auth-toggle" class="text-blue-500 hover:text-blue-400 ml-1">Register Now</button>`;
    } else {
        elements.authTitle.innerText = "Create Account";
        elements.authSubmit.innerText = "Sign Up";
        elements.authToggleText.innerHTML = `Already have an account? <button id="auth-toggle" class="text-blue-500 hover:text-blue-400 ml-1">Sign In</button>`;
    }
    // Re-bind toggle button as it was just replaced
    document.getElementById('auth-toggle').onclick = toggleAuthMode;
};

const handleAuthSubmit = async () => {
    const username = elements.authUsername.value.trim();
    const password = elements.authPassword.value;

    if (!username || !password) {
        return ui.showToast("Username and password are required", 'error');
    }

    if (state.authMode === 'register' && password.length < 6) {
        return ui.showToast("Password must be at least 6 characters", 'error');
    }

    const endpoint = state.authMode === 'login' ? '/login' : '/register';

    try {
        const result = await api.request(endpoint, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (state.authMode === 'register') {
            ui.showToast("Account created successfully! Please sign in.");
            elements.authPassword.value = '';
            toggleAuthMode();
            return;
        }

        // Login success
        state.authToken = result.token;
        state.currentUser = result.user;
        localStorage.setItem('api_arch_token', result.token);
        localStorage.setItem('api_arch_user', JSON.stringify(result.user));

        hideAuth();
        if (elements.userDisplayName) {
            elements.userDisplayName.innerText = state.currentUser.username;
        }
        ui.showToast(`Welcome back, ${result.user.username}!`);
        await loadAllCollections();

        // Load first collection if available, else show empty initial state
        if (state.allCollections.length > 0) {
            state.currentCollectionId = state.allCollections[0].id;
            await loadCollection();
        } else {
            state.currentCollectionId = null;
            state.collection = JSON.parse(JSON.stringify(INITIAL_COLLECTION));
            isDirty = false;
            render();
        }
    } catch (err) {
        ui.showToast(err.message, 'error');
    }
};

const handleLogout = () => {
    state.authToken = null;
    state.currentUser = null;
    localStorage.removeItem('api_arch_token');
    localStorage.removeItem('api_arch_user');
    location.reload(); // Simplest way to reset everything
};

const handleAddCollection = async () => {
    if (isDirty) {
        if (!await ui.confirm("Unsaved changes will be lost. Continue?", true)) return;
        isDirty = false;
    }

    const name = await ui.prompt("New Collection Name:", "My New Collection");
    if (!name) return;

    try {
        const newCollection = {
            id: generateId(),
            name: name,
            description: ''
        };

        console.log('Creating collection:', newCollection);
        await api.request('/collections', {
            method: 'POST',
            body: JSON.stringify(newCollection)
        });
        console.log('Collection created successfully');

        // Reload collections list and switch to new one
        await loadAllCollections();
        state.currentCollectionId = newCollection.id;
        await loadCollection();
    } catch (err) {
        console.error('Failed to create collection:', err);
        await ui.alert(`Failed to create collection: ${err.message}`);
    }
};

const handleSelect = async (id) => {
    if (isDirty) {
        if (!await ui.confirm("Unsaved changes will be lost. Continue?", true)) return;
    }

    const item = id ? findItem(state.collection.items, id) : null;
    localDraft = item ? deepCopy(item) : deepCopy(state.collection);
    isDirty = false;
    isSaved = false;
    specDirty = false;
    setState({ selectedId: id });
};

const handleSave = async () => {
    try {
        if (state.selectedId === null) {
            // Root collection update
            await api.updateCollection(state.collection.id, {
                name: localDraft.name,
                description: localDraft.description
            });
            state.collection.name = localDraft.name;
            state.collection.description = localDraft.description;
            // Refresh collections list to update dropdown labels
            await loadAllCollections();
        } else {
            // Item update
            if (localDraft.type === 'folder') {
                await api.updateFolder(localDraft.id, {
                    name: localDraft.name,
                    description: localDraft.description,
                    position: 0
                });
            } else {
                await api.updateRequest(localDraft.id, {
                    name: localDraft.name,
                    method: localDraft.method,
                    url: localDraft.url,
                    body: localDraft.body,
                    responseExample: localDraft.responseExample,
                    notes: localDraft.notes,
                    isComplete: localDraft.isComplete,
                    position: 0
                });
            }
            state.collection.items = updateRecursive(state.collection.items, localDraft);
        }

        isDirty = false;

        const btn = document.getElementById('btn-save-main');
        if (btn && specDirty) {
            isSaved = true;
            specDirty = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Saved!';
            btn.classList.remove('bg-blue-600/10', 'border-blue-500/30', 'text-blue-400', 'hover:bg-blue-600', 'hover:text-white', 'cursor-pointer');
            btn.classList.add('bg-green-600', 'border-green-500', 'text-white');
            btn.disabled = true;
        } else {
            isSaved = false;
            specDirty = false;
            renderEditor();
        }
        renderSidebar();
    } catch (err) {
        await ui.alert(`Failed to save: ${err.message}`);
    }
};

const handleAddRequest = async (folderId = null) => {
    if (isDirty) {
        if (!await ui.confirm("Unsaved changes will be lost. Continue?", true)) return;
        isDirty = false;
    }

    try {
        const newItem = {
            id: generateId(),
            collection_id: state.collection.id,
            folder_id: folderId,
            name: 'New Request',
            method: 'GET',
            url: '',
            body: '',
            responseExample: '',
            notes: '',
            isComplete: false,
            position: 0
        };

        await api.createRequest(newItem);
        await loadCollection();
        handleSelect(newItem.id);
    } catch (err) {
        await ui.alert(`Failed to create request: ${err.message}`);
    }
};

const handleAddFolder = async (folderId = null) => {
    if (isDirty) {
        if (!await ui.confirm("Unsaved changes will be lost. Continue?", true)) return;
        isDirty = false;
    }

    try {
        const newItem = {
            id: generateId(),
            collection_id: state.collection.id,
            parent_folder_id: folderId,
            name: 'New Folder',
            description: '',
            position: 0
        };

        console.log('Creating folder/collection:', newItem);
        await api.createFolder(newItem);
        console.log('Folder/collection created successfully, reloading...');
        await loadCollection();
        handleSelect(newItem.id);
    } catch (err) {
        console.error('Failed to create folder/collection:', err);
        await ui.alert(`Failed to create folder: ${err.message}`);
    }
};

const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();

    if (isDirty) {
        if (!await ui.confirm("Unsaved changes will be lost. Continue?", true)) return;
        isDirty = false;
    }

    if (!await ui.confirm("Are you sure you want to delete this item?", true)) return;

    try {
        const item = findItem(state.collection.items, id);
        if (!item) return;

        if (item.type === 'folder') {
            await api.deleteFolder(id);
        } else {
            await api.deleteRequest(id);
        }

        await loadCollection();
        if (state.selectedId === id) handleSelect(null);
        else render();
    } catch (err) {
        await ui.alert(`Failed to delete: ${err.message}`);
    }
};

const handleRenameCollection = async (id, currentName) => {
    const newName = await ui.prompt("Rename Workspace:", currentName);
    if (!newName) return;

    try {
        ui.showLoader();
        await api.updateCollection(id, {
            name: newName,
            description: state.collection.description || ''
        });
        await loadAllCollections();
        await loadCollection();
        ui.showToast("Workspace renamed successfully!");
    } catch (err) {
        ui.showToast(err.message, 'error');
    } finally {
        ui.hideLoader();
    }
};

const handleDeleteCollection = async (id) => {
    if (!await ui.confirm("Are you sure you want to delete this entire workspace? This cannot be undone.", true)) return;

    try {
        ui.showLoader();
        await api.deleteCollection(id);
        await loadAllCollections();

        if (state.allCollections.length > 0) {
            state.currentCollectionId = state.allCollections[0].id;
            await loadCollection();
        } else {
            state.currentCollectionId = null;
            state.collection = JSON.parse(JSON.stringify(INITIAL_COLLECTION));
            localDraft = deepCopy(state.collection);
            render();
        }
        ui.showToast("Workspace deleted successfully!");
    } catch (err) {
        ui.showToast(err.message, 'error');
    } finally {
        ui.hideLoader();
    }
};

const handleRename = async (id, newName) => {
    if (isDirty) {
        if (!await ui.confirm("Unsaved changes will be lost. Continue?", true)) return;
        isDirty = false;
    }

    const item = findItem(state.collection.items, id);
    if (!item) return;

    try {
        if (item.type === 'folder') {
            await api.updateFolder(id, {
                name: newName,
                description: item.description || '',
                position: item.position || 0
            });
        } else {
            await api.updateRequest(id, {
                name: newName,
                method: item.method || 'GET',
                url: item.url || '',
                body: item.body || '',
                responseExample: item.responseExample || '',
                notes: item.notes || '',
                isComplete: item.isComplete || false,
                position: item.position || 0
            });
        }

        await loadCollection();
    } catch (err) {
        console.error('Failed to rename:', err);
        await ui.alert(`Failed to rename: ${err.message}`);
    }
};

const handleCopy = (text, elementId) => {
    navigator.clipboard.writeText(text || "");
    const el = document.getElementById(elementId);
    if (el) {
        const orig = el.innerText;
        el.innerText = "Copied!";
        setTimeout(() => el.innerText = orig, 2000);
    }
};

const handlePrettify = (field) => {
    try {
        if (!localDraft[field]) return;
        const parsed = JSON.parse(localDraft[field]);
        localDraft[field] = JSON.stringify(parsed, null, 2);
        isDirty = true;
        renderEditor();
    } catch (e) {
        ui.alert("Invalid JSON");
    }
};

const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const imported = JSON.parse(event.target.result);

            // Check if it's a Postman collection
            const isPostmanCollection = imported.info && imported.item && Array.isArray(imported.item);

            if (isPostmanCollection) {
                // Transform Postman collection to our format
                if (await ui.confirm("Import Postman collection as a new collection?", false)) {
                    const transformPostmanItem = (item) => {
                        // Check if it's a folder (has 'item' array) or a request
                        if (item.item && Array.isArray(item.item)) {
                            // It's a folder
                            return {
                                id: generateId(),
                                type: 'folder',
                                name: item.name || 'Unnamed Folder',
                                description: item.description || '',
                                items: item.item.map(transformPostmanItem)
                            };
                        } else if (item.request) {
                            // It's a request
                            const request = item.request;
                            const url = typeof request.url === 'string' ? request.url : (request.url?.raw || '');
                            const method = request.method || 'GET';

                            // Extract body if present
                            let body = '';
                            if (request.body) {
                                if (request.body.raw) {
                                    body = request.body.raw;
                                } else if (request.body.formdata) {
                                    body = JSON.stringify(request.body.formdata, null, 2);
                                } else if (request.body.urlencoded) {
                                    body = JSON.stringify(request.body.urlencoded, null, 2);
                                }
                            }

                            return {
                                id: generateId(),
                                type: 'request',
                                name: item.name || 'Unnamed Request',
                                method: method,
                                url: url,
                                body: body,
                                responseExample: '',
                                notes: item.description || '',
                                isComplete: false
                            };
                        }
                        return null;
                    };

                    const transformedItems = imported.item.map(transformPostmanItem).filter(item => item !== null);

                    // Create a NEW collection instead of replacing current one
                    const newCollectionId = generateId();
                    const newCollection = {
                        id: newCollectionId,
                        name: imported.info.name || 'Imported Postman Collection',
                        description: imported.info.description || ''
                    };

                    // Save to backend
                    try {
                        ui.showLoader();

                        // Create the new collection
                        await api.request('/collections', {
                            method: 'POST',
                            body: JSON.stringify(newCollection)
                        });

                        // Save all items recursively
                        const saveItemsRecursively = async (items, parentFolderId = null) => {
                            for (const item of items) {
                                if (item.type === 'folder') {
                                    const folderData = {
                                        id: item.id,
                                        collection_id: newCollectionId,
                                        parent_folder_id: parentFolderId,
                                        name: item.name,
                                        description: item.description || '',
                                        position: 0
                                    };
                                    await api.createFolder(folderData);

                                    // Recursively save nested items
                                    if (item.items && item.items.length > 0) {
                                        await saveItemsRecursively(item.items, item.id);
                                    }
                                } else if (item.type === 'request') {
                                    const requestData = {
                                        id: item.id,
                                        collection_id: newCollectionId,
                                        folder_id: parentFolderId,
                                        name: item.name,
                                        method: item.method,
                                        url: item.url,
                                        body: item.body,
                                        responseExample: item.responseExample,
                                        notes: item.notes,
                                        isComplete: item.isComplete,
                                        position: 0
                                    };
                                    await api.createRequest(requestData);
                                }
                            }
                        };

                        await saveItemsRecursively(transformedItems);

                        // Reload collections list to include the new one
                        await loadAllCollections();

                        // Switch to the newly imported collection
                        state.currentCollectionId = newCollectionId;
                        await loadCollection();

                        ui.showToast(`Postman collection "${newCollection.name}" imported successfully!`);
                    } catch (err) {
                        console.error('Failed to save imported collection:', err);
                        ui.showToast(`Import failed: ${err.message}`, 'error');
                    } finally {
                        ui.hideLoader();
                    }

                    handleSelect(null);
                    render();
                }
            } else if (imported.items && Array.isArray(imported.items)) {
                // Original format handling
                if (await ui.confirm(isDirty ? "You have unsaved changes. Importing will discard them and replace the collection. Continue?" : "Importing will replace current collection. Continue?", true)) {
                    // Handle both root object wrapper and direct format
                    if (imported.collection_info || imported.api_info) {
                        const info = imported.api_info || imported.collection_info;
                        state.collection = {
                            name: info.name || INITIAL_COLLECTION.name,
                            description: info.description || INITIAL_COLLECTION.description,
                            items: imported.items || imported.endpoints
                        };
                    } else if (imported.endpoints) {
                        // New format direct
                        state.collection = { ...INITIAL_COLLECTION, items: imported.endpoints };
                        if (imported.api_info) {
                            state.collection.name = imported.api_info.name;
                            state.collection.description = imported.api_info.description;
                        }
                    } else {
                        // assume it's just the object structure we exported or matched
                        state.collection = imported;
                    }
                    handleSelect(null);
                    render();
                }
            } else {
                ui.alert("Invalid format: This doesn't appear to be a valid Postman collection or API Architect Pro file.");
            }
        } catch (err) {
            ui.alert("Error parsing JSON file: " + err.message);
            console.error(err);
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
};

// --- Renderers ---

const renderSidebarItem = (item, level = 0) => {
    // Filter Logic
    if (sidebarFilter) {
        const matches = item.name.toLowerCase().includes(sidebarFilter.toLowerCase());
        const hasMatchingChild = item.type === 'folder' && JSON.stringify(item.items).toLowerCase().includes(sidebarFilter.toLowerCase());
        if (!matches && !hasMatchingChild) return null;
    }

    const isSelected = state.selectedId === item.id;
    const paddingLeft = `${level * 12 + 12}px`;
    const div = document.createElement('div');
    div.className = "mb-0.5";

    // Sidebar Item with explicit CSS classes
    const row = document.createElement('div');
    row.className = `sidebar-item group flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all text-[12px]
        ${isSelected ? 'bg-blue-600/25 border border-blue-500/30 text-white shadow-sm' : 'hover:bg-white/5 text-gray-400 hover:text-gray-200 border border-transparent'}
    `;
    row.style.paddingLeft = paddingLeft;
    row.onclick = () => handleSelect(item.id);

    // Icon
    if (item.type === 'folder') {
        row.innerHTML = `<i class="fas fa-chevron-right text-[8px] w-3 opacity-50"></i> <i class="fas fa-folder text-yellow-500/80 mr-1"></i>`;
    } else {
        const methodColor = METHOD_COLORS[item.method] || 'text-gray-400';
        row.innerHTML = `<span class="w-3"></span> <span class="font-black ${methodColor} text-[9px] w-4">${item.method[0]}</span>`;
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = "flex-1 truncate font-medium";
    nameSpan.innerText = item.name;
    row.appendChild(nameSpan);

    // Actions via style.css classes
    const actions = document.createElement('div');
    actions.className = "sidebar-actions";

    const createBtn = (icon, title, onClick, deleteStyle = false) => {
        const b = document.createElement('button');
        const baseClass = deleteStyle ? "action-btn action-btn-delete" : "action-btn";
        b.className = baseClass;
        b.title = title;
        b.innerHTML = `<i class="fas ${icon} text-[10px]"></i>`;
        b.onclick = onClick;
        return b;
    };

    if (item.type === 'folder') {
        actions.appendChild(createBtn('fa-file-circle-plus', 'Add Request', (e) => { e.stopPropagation(); handleAddRequest(item.id); }));
        actions.appendChild(createBtn('fa-folder-plus', 'Add Folder', (e) => { e.stopPropagation(); handleAddFolder(item.id); }));
        actions.appendChild(createBtn('fa-pencil-alt', 'Rename', async (e) => {
            e.stopPropagation();
            const newName = await ui.prompt("Rename Collection:", item.name);
            if (newName) handleRename(item.id, newName);
        }));
        actions.appendChild(createBtn('fa-trash', 'Delete', (e) => handleDelete(item.id, e), true));
    } else {
        actions.appendChild(createBtn('fa-pencil-alt', 'Rename', async (e) => {
            e.stopPropagation();
            const newName = await ui.prompt("Rename Request:", item.name);
            if (newName) handleRename(item.id, newName);
        }));
        actions.appendChild(createBtn('fa-trash', 'Delete', (e) => handleDelete(item.id, e), true));
    }

    row.appendChild(actions);
    div.appendChild(row);

    // Children
    if (item.type === 'folder' && item.items.length > 0) {
        const childrenDiv = document.createElement('div');
        item.items.forEach(child => {
            const childNode = renderSidebarItem(child, level + 1);
            if (childNode) childrenDiv.appendChild(childNode);
        });
        div.appendChild(childrenDiv);
    }

    return div;
};

// --- Dashboard Components ---

const renderRequestAccordion = (req) => {
    const card = document.createElement('div');
    card.className = "border border-white/5 rounded-xl overflow-hidden mb-3 bg-white/2 hover:border-white/10 transition-all shadow-lg";

    const header = document.createElement('div');
    header.className = "flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5 select-none";
    header.innerHTML = `
        <div class="w-14 text-center text-[10px] font-black uppercase tracking-widest flex-shrink-0 ${METHOD_COLORS[req.method]}">${req.method}</div>
        <div class="flex-1 font-bold text-sm truncate text-gray-100">${req.name}</div>
        <div class="text-[10px] text-gray-500 font-mono truncate max-w-[300px] hidden md:block opacity-50">${req.url || 'no-endpoint'}</div>
        <i class="fas fa-chevron-down text-[10px] text-gray-600 transition-transform"></i>
    `;

    const body = document.createElement('div');
    body.className = "hidden p-6 border-t border-white/5 bg-black/40";
    body.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <label class="text-[9px] font-black text-blue-400/80 uppercase tracking-widest gap-2 flex items-center"><i class="fas fa-arrow-right"></i> Request Blueprint</label>
                    <button class="copy-btn text-[8px] font-black text-gray-500 hover:text-white uppercase transition-colors" data-content="${encodeURIComponent(req.body)}">Copy</button>
                </div>
                <pre class="bg-black/60 rounded-lg p-4 font-mono text-[11px] border border-white/5 text-blue-100/70 min-h-[160px] overflow-auto">${req.body || '// No payload'}</pre>
            </div>
            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <label class="text-[9px] font-black text-green-400/80 uppercase tracking-widest gap-2 flex items-center"><i class="fas fa-reply"></i> Response Signature</label>
                    <button class="copy-btn text-[8px] font-black text-gray-500 hover:text-white uppercase transition-colors" data-content="${encodeURIComponent(req.responseExample)}">Copy</button>
                </div>
                <pre class="bg-black/60 rounded-lg p-4 font-mono text-[11px] border border-white/5 text-green-100/70 min-h-[160px] overflow-auto">${req.responseExample || '// No response'}</pre>
            </div>
        </div>
    `;

    // Bind Expand
    header.onclick = () => {
        body.classList.toggle('hidden');
        header.querySelector('.fa-chevron-down').classList.toggle('rotate-180');
    };

    // Bind Copy
    body.querySelectorAll('.copy-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(decodeURIComponent(btn.dataset.content));
            const old = btn.innerText;
            btn.innerText = "COPIED!";
            setTimeout(() => btn.innerText = old, 1500);
        };
    });

    card.appendChild(header);
    card.appendChild(body);
    return card;
};

const renderFolderAccordion = (folder) => {
    const items = folder.items;
    const reqs = items.filter(i => i.type === 'request');
    const folders = items.filter(i => i.type === 'folder');

    const wrapper = document.createElement('div');
    wrapper.className = "mb-4";

    const header = document.createElement('div');
    header.className = "flex items-center gap-3 py-3 px-4 group select-none rounded-xl border border-white/5 transition-colors mb-2";
    header.innerHTML = `
        <div class="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-500/60 flex items-center justify-center flex-shrink-0 border border-yellow-500/10"><i class="fas fa-folder text-sm"></i></div>
        <div class="flex-1"><h3 class="text-sm font-black text-white uppercase tracking-wider">${folder.name}</h3></div>
        <div class="text-[9px] font-bold text-gray-600 uppercase tracking-widest px-2 py-1 bg-white/5 rounded border border-white/5">${items.length} Items</div>
    `;

    const content = document.createElement('div');
    content.className = "pl-8 border-l border-white/5 mt-2 space-y-2";

    if (items.length === 0) {
        content.innerHTML = `<div class="py-8 text-center text-[10px] font-bold text-gray-700 uppercase tracking-widest bg-white/2 rounded-xl border border-dashed border-white/5">Collection is empty</div>`;
    } else {
        reqs.forEach(r => content.appendChild(renderRequestAccordion(r)));
        folders.forEach(f => content.appendChild(renderFolderAccordion(f)));
    }

    // No onclick for folder header


    wrapper.appendChild(header);
    wrapper.appendChild(content);
    return wrapper;
};

// --- Editor Renderer ---

const renderEditor = () => {
    if (!localDraft) {
        elements.emptyState.classList.remove('hidden');
        elements.editorContent.classList.add('hidden');
        return;
    }

    elements.editorContent.innerHTML = '';
    elements.emptyState.classList.add('hidden');
    elements.editorContent.classList.remove('hidden');

    // Header - REPLACED Delete with IMPORT
    const headerHTML = `
        <div class="p-8 border-b border-white/10 bg-white/2 backdrop-blur-3xl sticky top-0 z-20">
            <div class="max-w-6xl mx-auto flex items-start justify-between gap-8">
                <div class="flex-1 space-y-2">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${localDraft.type === 'request' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}">
                            <i class="fas ${localDraft.type === 'request' ? 'fa-file-code text-blue-400' : 'fa-layer-group text-blue-400'}"></i>
                        </div>
                        <input id="header-name-input" class="bg-transparent border-none text-2xl font-black text-white focus:outline-none w-full placeholder-gray-700 uppercase tracking-tighter" value="${localDraft.name || state.collection.name}">
                    </div>
                    ${localDraft.type === 'folder' ? `<textarea id="header-desc-input" class="w-full bg-transparent border-none text-sm text-gray-400 focus:outline-none resize-none h-auto placeholder-gray-600 pl-[52px]" placeholder="Add collection description...">${localDraft.description || ''}</textarea>` : ''}
                </div>
                <div class="flex items-center gap-3 pt-1">
                    <button class="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white border border-white/10 transition-all shadow-lg" onclick="document.getElementById('file-import-input').click()">Import</button>
                    <button class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg" onclick="handleExport()">Export .MB</button>
                </div>
            </div>
        </div>
    `;

    const mainArea = document.createElement('div');
    mainArea.className = "flex-1 overflow-y-auto p-8 custom-scrollbar bg-black/20";
    mainArea.innerHTML = headerHTML;

    // Content based on type
    const contentContainer = document.createElement('div');
    contentContainer.className = "max-w-5xl mx-auto pb-24 space-y-12 mt-8";

    if (localDraft.type === 'request') {
        let saveBtnClass = "";
        let saveBtnText = "Save Request";
        let saveBtnDisabled = false;

        if (specDirty) {
            saveBtnClass = "bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white cursor-pointer";
        } else if (isSaved) {
            saveBtnClass = "bg-green-600 border-green-500 text-white cursor-default";
            saveBtnText = '<i class="fas fa-check"></i> Saved!';
            saveBtnDisabled = true;
        } else {
            saveBtnClass = "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed opacity-50";
            saveBtnDisabled = true;
        }

        contentContainer.innerHTML = `
             <div class="flex items-end justify-between border-b border-white/5 pb-4 mb-6">
               <div class="space-y-1">
                  <h2 class="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Resource Specification</h2>
                  <p class="text-[11px] text-gray-600 font-medium">Define the core execution parameters.</p>
               </div>
               <button id="btn-save-main" class="px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl border ${saveBtnClass}" ${saveBtnDisabled ? 'disabled' : ''}>${saveBtnText}</button>
            </div>

            <div class="grid grid-cols-12 gap-5">
                <div class="col-span-12 lg:col-span-3 space-y-2">
                    <label class="text-[10px] font-black text-gray-600 uppercase tracking-widest px-1">Method</label>
                    <select id="input-method" class="${GLASS_INPUT_CLASSES} w-full text-sm font-black text-center h-[50px] bg-[#111]">
                        ${['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => `<option value="${m}" ${m === localDraft.method ? 'selected' : ''}>${m}</option>`).join('')}
                    </select>
                </div>
                <div class="col-span-12 lg:col-span-9 space-y-2">
                    <label class="text-[10px] font-black text-gray-600 uppercase tracking-widest px-1">Resource Address</label>
                    <input id="input-url" class="${GLASS_INPUT_CLASSES} w-full h-[50px] font-mono" value="${localDraft.url}" placeholder="https://api...">
                </div>
            </div>

            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <label class="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Request Body</label>
                    <div class="flex gap-4">
                        <button id="btn-copy-body" class="text-[9px] font-black text-gray-600 hover:text-white uppercase">Copy</button>
                        <button id="btn-pretty-body" class="text-[9px] font-black text-gray-600 hover:text-blue-400 uppercase">Prettify</button>
                    </div>
                </div>
                <textarea id="input-body" class="${GLASS_INPUT_CLASSES} w-full h-56 font-mono text-[12px] leading-relaxed resize-none p-5 bg-black/40" placeholder="{}">${localDraft.body || ''}</textarea>
            </div>

            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <label class="text-[10px] font-black text-green-400 uppercase tracking-[0.3em]">Response Example</label>
                    <div class="flex gap-4">
                         <button id="btn-copy-res" class="text-[9px] font-black text-gray-600 hover:text-white uppercase">Copy</button>
                        <button id="btn-pretty-res" class="text-[9px] font-black text-gray-600 hover:text-green-400 uppercase">Prettify</button>
                    </div>
                </div>
                <textarea id="input-res" class="${GLASS_INPUT_CLASSES} w-full h-56 font-mono text-[12px] leading-relaxed resize-none p-5 bg-black/40" placeholder="{}">${localDraft.responseExample || ''}</textarea>
            </div>
            
             <div class="space-y-3">
              <label class="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">Additional notes</label>
              <textarea id="input-notes" class="${GLASS_INPUT_CLASSES} w-full h-24 text-[12px] leading-relaxed resize-none p-5 bg-black/40 italic">${localDraft.notes}</textarea>
            </div>
        `;
    } else {
        // Dashboard View
        const items = localDraft.items || [];
        if (items.length === 0) {
            contentContainer.innerHTML = `<div class="flex flex-col items-center justify-center py-40 opacity-10 select-none pointer-events-none"><i class="fas fa-microchip text-3xl mb-4"></i><p class="text-[11px] font-black uppercase tracking-[0.5em] text-white">Registry Empty</p></div>`;
        } else {
            items.filter(i => i.type === 'request').forEach(req => contentContainer.appendChild(renderRequestAccordion(req)));
            items.filter(i => i.type === 'folder').forEach(fold => contentContainer.appendChild(renderFolderAccordion(fold)));
        }
    }

    // Assemble
    mainArea.appendChild(contentContainer);
    elements.editorContent.appendChild(mainArea);

    // Bind Events
    if (document.getElementById('header-name-input')) {
        const el = document.getElementById('header-name-input');
        el.oninput = (e) => {
            localDraft.name = e.target.value;
            markDirty();
        };
        el.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                el.blur();
            }
        };
        el.onblur = () => {
            if (isDirty) handleSave();
        };
    }

    if (document.getElementById('header-desc-input')) {
        const el = document.getElementById('header-desc-input');
        el.oninput = (e) => {
            localDraft.description = e.target.value;
            markDirty();
        };
        el.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                el.blur();
            }
        };
        el.onblur = () => {
            if (isDirty) handleSave();
        };
    }

    // Wire up Import button indirectly via file input click is handled by the onclick attribute in HTML string
    // But we need to make sure file input change triggers handleImport. This is done in init().

    if (localDraft.type === 'request') {
        document.getElementById('btn-save-main').onclick = handleSave;
        document.getElementById('input-method').onchange = (e) => { localDraft.method = e.target.value; markDirty(true); renderEditor() };
        document.getElementById('input-url').oninput = (e) => { localDraft.url = e.target.value; markDirty(true); };
        document.getElementById('input-body').oninput = (e) => { localDraft.body = e.target.value; markDirty(true); };
        document.getElementById('input-res').oninput = (e) => { localDraft.responseExample = e.target.value; markDirty(true); };
        document.getElementById('input-notes').oninput = (e) => { localDraft.notes = e.target.value; markDirty(true); };

        document.getElementById('btn-pretty-body').onclick = () => handlePrettify('body');
        document.getElementById('btn-pretty-res').onclick = () => handlePrettify('responseExample');
        document.getElementById('btn-copy-body').onclick = () => handleCopy(localDraft.body, 'btn-copy-body');
        document.getElementById('btn-copy-res').onclick = () => handleCopy(localDraft.responseExample, 'btn-copy-res');
    }
};

const renderSidebar = () => {
    elements.sidebarItems.innerHTML = '';

    // 1. Render Collection Root Row
    const isRootSelected = state.selectedId === null;
    const rootRow = document.createElement('div');
    rootRow.className = `sidebar-item group flex items-center gap-2 px-3 py-2.5 mx-1 rounded-xl cursor-pointer transition-all mb-4
        ${isRootSelected ? 'bg-blue-600/10 border border-blue-500/20 text-blue-400' : 'hover:bg-white/5 text-gray-400 hover:text-gray-200 border border-transparent'}
    `;
    rootRow.onclick = () => handleSelect(null);
    rootRow.innerHTML = `
        <div class="w-6 h-6 rounded-lg ${isRootSelected ? 'bg-blue-500/20' : 'bg-white/5'} flex items-center justify-center border border-white/10">
            <i class="fas fa-layer-group text-[10px] ${isRootSelected ? 'text-blue-400' : 'text-gray-500'}"></i>
        </div>
        <span class="flex-1 font-black uppercase tracking-[0.1em] text-[11px] truncate">${state.collection.name}</span>
        <div class="sidebar-actions">
            <button class="action-btn" title="Add Request" id="root-add-req"><i class="fas fa-file-circle-plus text-[10px]"></i></button>
            <button class="action-btn" title="Add Folder" id="root-add-folder"><i class="fas fa-folder-plus text-[10px]"></i></button>
            <button class="action-btn" title="Rename Workspace" id="root-rename"><i class="fas fa-pencil-alt text-[10px]"></i></button>
            <button class="action-btn action-btn-delete" title="Delete Workspace" id="root-delete"><i class="fas fa-trash text-[10px]"></i></button>
        </div>
    `;

    // Bind root actions
    rootRow.querySelector('#root-add-req').onclick = (e) => { e.stopPropagation(); handleAddRequest(null); };
    rootRow.querySelector('#root-add-folder').onclick = (e) => { e.stopPropagation(); handleAddFolder(null); };
    rootRow.querySelector('#root-rename').onclick = (e) => { e.stopPropagation(); handleRenameCollection(state.collection.id, state.collection.name); };
    rootRow.querySelector('#root-delete').onclick = (e) => { e.stopPropagation(); handleDeleteCollection(state.collection.id); };

    elements.sidebarItems.appendChild(rootRow);

    // 2. Render actual items with indentation
    if (!state.collection.items || state.collection.items.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = "flex flex-col items-center justify-center py-8 px-4 text-center select-none";
        emptyState.innerHTML = `
            <div class="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1">Collection Empty</div>
            <p class="text-[9px] text-gray-700 font-medium max-w-[150px] leading-relaxed">
                Start by adding a request above.
            </p>
        `;
        elements.sidebarItems.appendChild(emptyState);
    } else {
        state.collection.items.forEach(item => {
            const node = renderSidebarItem(item, 1);
            if (node) elements.sidebarItems.appendChild(node);
        });
    }
};

const render = () => {
    // Update collection selector value
    if (elements.collectionSelector && state.currentCollectionId) {
        elements.collectionSelector.value = state.currentCollectionId;
    }
    renderSidebar();
    renderEditor();
};

const init = () => {
    // Add Search Input to HTML dynamically if not present
    if (!document.getElementById('sidebar-search')) {
        const container = elements.sidebarItems.parentElement.querySelector('.border-b');
        // We'll hijack the sidebar actions area to add search
        const searchDiv = document.createElement('div');
        searchDiv.className = "px-2 pb-2 mt-3";
        searchDiv.innerHTML = `<div class="relative group"><i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600"></i><input id="sidebar-search" class="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all text-white placeholder-gray-600" placeholder="Filter..."></div>`;
        container.appendChild(searchDiv);

        document.getElementById('sidebar-search').oninput = (e) => {
            sidebarFilter = e.target.value;
            renderSidebar();
        };
    }

    elements.btnAddRequest.onclick = () => handleAddRequest();
    elements.btnAddFolder.onclick = () => handleAddFolder();

    // Bind File Import
    if (elements.fileInput) {
        elements.fileInput.onchange = handleImport;
    }

    // Bind Collection Management
    if (elements.btnAddCollection) {
        elements.btnAddCollection.onclick = () => handleAddCollection();
    }

    if (elements.collectionSelector) {
        elements.collectionSelector.onchange = (e) => handleSwitchCollection(e.target.value);
    }

    if (elements.btnLogout) {
        elements.btnLogout.onclick = handleLogout;
    }

    // Bind Auth
    const handleAuthEnter = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAuthSubmit();
        }
    };
    if (elements.authUsername) elements.authUsername.onkeydown = handleAuthEnter;
    if (elements.authPassword) elements.authPassword.onkeydown = handleAuthEnter;
    if (elements.authSubmit) elements.authSubmit.onclick = handleAuthSubmit;
    if (elements.authToggle) elements.authToggle.onclick = toggleAuthMode;

    // Auth Check
    if (state.authToken) {
        if (elements.userDisplayName && state.currentUser) {
            elements.userDisplayName.innerText = state.currentUser.username;
        }
        // Load collections for the authenticated user
        loadAllCollections().then(() => {
            if (state.allCollections.length > 0) {
                state.currentCollectionId = state.allCollections[0].id;
                loadCollection();
            } else {
                state.currentCollectionId = null;
                state.collection = JSON.parse(JSON.stringify(INITIAL_COLLECTION));
                isDirty = false;
                render();
            }
        });
    } else {
        showAuth();
    }
};

// Global for inline HTML onclicks 
window.handleExport = async () => {
    if (isDirty) {
        if (!await ui.confirm("You have unsaved changes which will not be included in the export. Continue?", true)) return;
    }

    const ensureString = (str) => str === null || str === undefined ? "" : str;

    const transformItem = (item) => {
        const newItem = {};
        const excludeKeys = [
            'created_at', 'collection_id', 'folder_id', 'parent_folder_id',
            'id', 'is_complete', 'type', 'updated_at', 'position',
            'items', 'body', 'responseExample', 'response_example'
        ];

        // Copy basic fields ensuring strings and excluding internal metadata
        Object.keys(item).forEach(key => {
            if (!excludeKeys.includes(key)) {
                newItem[key] = (typeof item[key] === 'string') ? ensureString(item[key]) : item[key];
            }
        });

        // Folder: Rename items -> API
        if (item.items && item.items.length >= 0) {
            newItem.API = item.items.map(transformItem);
        }

        // Request: Field Renaming
        if (item.type === 'request') {
            // Body -> example_requests
            if (item.body) {
                newItem.example_requests = ensureString(item.body);
            } else {
                newItem.example_requests = "";
            }

            // response_example -> example_response
            const resVal = item.responseExample || item.response_example;
            if (resVal) {
                newItem.example_response = ensureString(resVal);
            } else {
                newItem.example_response = "";
            }
        }

        return newItem;
    };

    const exportData = {
        api_info: {
            name: ensureString(state.collection.name),
            description: ensureString(state.collection.description)
        },
        endpoints: state.collection.items.map(transformItem)
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'collection.mb';
    a.click();
};

init();
