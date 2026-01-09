/**
 * API Architect Pro - Vanilla JS Implementation
 * Ported 1:1 from React reference
 * 
 * Now utilizing style.css for robust sidebar interactions.
 */

// --- Constants & Config ---
const INITIAL_COLLECTION = {
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
    selectedId: null
};

// Draft State
let localDraft = null;
let isDirty = false;
let sidebarFilter = "";

// --- DOM Elements ---
const elements = {
    sidebarItems: document.getElementById('sidebar-items'),
    editorContent: document.getElementById('editor-content'),
    emptyState: document.getElementById('empty-state'),
    btnAddRequest: document.getElementById('btn-add-request'),
    btnAddFolder: document.getElementById('btn-add-folder'),
    fileInput: document.getElementById('file-import-input'),
    searchInput: document.getElementById('sidebar-search')
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

const setState = (newState) => {
    state = { ...state, ...newState };
    render();
};

const handleSelect = (id) => {
    if (isDirty && !confirm("Unsaved changes will be lost. Continue?")) return;

    const item = id ? findItem(state.collection.items, id) : null;
    localDraft = item ? deepCopy(item) : deepCopy(state.collection); // If root (null), draft is collection for desc editing
    isDirty = false;
    setState({ selectedId: id });
};

const handleSave = () => {
    if (!localDraft) return;

    if (state.selectedId === null) {
        // Root update
        state.collection.name = localDraft.name;
        state.collection.description = localDraft.description;
    } else {
        // Item update
        state.collection.items = updateRecursive(state.collection.items, localDraft);
    }

    isDirty = false;

    const btn = document.getElementById('btn-save-main');
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Saved!';
        btn.classList.add('bg-green-600', 'border-green-500', 'text-white');
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('bg-green-600', 'border-green-500', 'text-white');
            renderEditor();
        }, 2000);
    } else {
        renderEditor();
    }
    renderSidebar();
};

const handleAddRequest = (folderId = null) => {
    const newItem = {
        id: generateId(), type: 'request', name: 'New Request',
        url: '', method: 'GET', body: '', responseExample: '', notes: '', isComplete: false
    };

    let newItems;
    if (folderId) newItems = insertRecursive(state.collection.items, folderId, newItem);
    else newItems = [...state.collection.items, newItem];

    state.collection.items = newItems;
    handleSelect(newItem.id);
};

const handleAddFolder = (folderId = null) => {
    const newItem = {
        id: generateId(), type: 'folder', name: 'New Folder', items: []
    };

    let newItems;
    if (folderId) newItems = insertRecursive(state.collection.items, folderId, newItem);
    else newItems = [...state.collection.items, newItem];

    state.collection.items = newItems;
    handleSelect(newItem.id);
};

const handleDelete = (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this item?")) return;

    state.collection.items = deleteRecursive(state.collection.items, id);
    if (state.selectedId === id) handleSelect(null);
    else render();
};

const handleRename = (id, newName) => {
    const item = findItem(state.collection.items, id);
    if (item) {
        item.name = newName;
        state.collection.items = updateRecursive(state.collection.items, item);
        if (localDraft && localDraft.id === id) localDraft.name = newName;
        render();
    }
}

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
        alert("Invalid JSON");
    }
};

const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if (imported.items && Array.isArray(imported.items)) {
                if (confirm("Importing will replace current collection. Continue?")) {
                    // Handle both root object wrapper and direct format
                    if (imported.collection_info) {
                        state.collection = {
                            name: imported.collection_info.name || INITIAL_COLLECTION.name,
                            description: imported.collection_info.description || INITIAL_COLLECTION.description,
                            items: imported.items
                        };
                    } else {
                        // assume it's just the object structure we exported or matched
                        state.collection = imported;
                    }
                    handleSelect(null);
                    render();
                }
            } else {
                alert("Invalid format: Missing 'items' array.");
            }
        } catch (err) {
            alert("Error parsing JSON file");
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
        actions.appendChild(createBtn('fa-folder-plus', 'Add Subfolder', (e) => { e.stopPropagation(); handleAddFolder(item.id); }));
        actions.appendChild(createBtn('fa-pencil-alt', 'Rename', (e) => {
            e.stopPropagation();
            const newName = prompt("Rename Folder:", item.name);
            if (newName) handleRename(item.id, newName);
        }));
        actions.appendChild(createBtn('fa-trash', 'Delete', (e) => handleDelete(item.id, e), true));
    } else {
        actions.appendChild(createBtn('fa-pencil-alt', 'Rename', (e) => {
            e.stopPropagation();
            const newName = prompt("Rename Request:", item.name);
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
    header.className = "flex items-center gap-3 py-3 px-4 cursor-pointer group select-none hover:bg-white/5 rounded-xl border border-white/5 transition-colors mb-2";
    header.innerHTML = `
        <i class="fas fa-chevron-right text-[10px] text-gray-600 transition-transform"></i>
        <div class="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-500/60 flex items-center justify-center flex-shrink-0 border border-yellow-500/10"><i class="fas fa-folder text-sm"></i></div>
        <div class="flex-1"><h3 class="text-sm font-black text-white uppercase tracking-wider">${folder.name}</h3></div>
        <div class="text-[9px] font-bold text-gray-600 uppercase tracking-widest px-2 py-1 bg-white/5 rounded border border-white/5">${items.length} Items</div>
    `;

    const content = document.createElement('div');
    content.className = "hidden pl-8 border-l border-white/5 mt-2 space-y-2";

    if (items.length === 0) {
        content.innerHTML = `<div class="py-8 text-center text-[10px] font-bold text-gray-700 uppercase tracking-widest bg-white/2 rounded-xl border border-dashed border-white/5">Folder is empty</div>`;
    } else {
        reqs.forEach(r => content.appendChild(renderRequestAccordion(r)));
        folders.forEach(f => content.appendChild(renderFolderAccordion(f)));
    }

    header.onclick = () => {
        content.classList.toggle('hidden');
        header.querySelector('.fa-chevron-right').classList.toggle('rotate-90');
    };

    wrapper.appendChild(header);
    wrapper.appendChild(content);
    return wrapper;
};

// --- Editor Renderer ---

const renderEditor = () => {
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
        contentContainer.innerHTML = `
             <div class="flex items-end justify-between border-b border-white/5 pb-4 mb-6">
               <div class="space-y-1">
                  <h2 class="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Resource Specification</h2>
                  <p class="text-[11px] text-gray-600 font-medium">Define the core execution parameters.</p>
               </div>
               <button id="btn-save-main" class="px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl border cursor-pointer bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white">Save Request</button>
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
                <textarea id="input-body" class="${GLASS_INPUT_CLASSES} w-full h-56 font-mono text-[12px] leading-relaxed resize-none p-5 bg-black/40" placeholder="{}">${localDraft.body}</textarea>
            </div>

            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <label class="text-[10px] font-black text-green-400 uppercase tracking-[0.3em]">Response Example</label>
                    <div class="flex gap-4">
                         <button id="btn-copy-res" class="text-[9px] font-black text-gray-600 hover:text-white uppercase">Copy</button>
                        <button id="btn-pretty-res" class="text-[9px] font-black text-gray-600 hover:text-green-400 uppercase">Prettify</button>
                    </div>
                </div>
                <textarea id="input-res" class="${GLASS_INPUT_CLASSES} w-full h-56 font-mono text-[12px] leading-relaxed resize-none p-5 bg-black/40" placeholder="{}">${localDraft.responseExample}</textarea>
            </div>
            
             <div class="space-y-3">
              <label class="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">Notes</label>
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
        document.getElementById('header-name-input').oninput = (e) => {
            localDraft.name = e.target.value;
            isDirty = true;
        };
    }

    // Wire up Import button indirectly via file input click is handled by the onclick attribute in HTML string
    // But we need to make sure file input change triggers handleImport. This is done in init().

    if (localDraft.type === 'request') {
        document.getElementById('btn-save-main').onclick = handleSave;
        document.getElementById('input-method').onchange = (e) => { localDraft.method = e.target.value; isDirty = true; renderEditor() };
        document.getElementById('input-url').oninput = (e) => { localDraft.url = e.target.value; isDirty = true; };
        document.getElementById('input-body').oninput = (e) => { localDraft.body = e.target.value; isDirty = true; };
        document.getElementById('input-res').oninput = (e) => { localDraft.responseExample = e.target.value; isDirty = true; };
        document.getElementById('input-notes').oninput = (e) => { localDraft.notes = e.target.value; isDirty = true; };

        document.getElementById('btn-pretty-body').onclick = () => handlePrettify('body');
        document.getElementById('btn-pretty-res').onclick = () => handlePrettify('responseExample');
        document.getElementById('btn-copy-body').onclick = () => handleCopy(localDraft.body, 'btn-copy-body');
        document.getElementById('btn-copy-res').onclick = () => handleCopy(localDraft.responseExample, 'btn-copy-res');
    }
};

const renderSidebar = () => {
    elements.sidebarItems.innerHTML = '';
    state.collection.items.forEach(item => {
        const node = renderSidebarItem(item);
        if (node) elements.sidebarItems.appendChild(node);
    });
};

const render = () => {
    renderSidebar();
    renderEditor();
};

const init = () => {
    // Add Search Input to HTML dynamically if not present
    if (!document.getElementById('sidebar-search')) {
        const container = elements.sidebarItems.parentElement.querySelector('.border-b');
        // We'll hijack the sidebar actions area to add search
        const searchDiv = document.createElement('div');
        searchDiv.className = "px-2 pb-2";
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

    // Select root by default
    handleSelect(null);
    render();
};

// Global for inline HTML onclicks 
window.handleExport = () => {
    const data = JSON.stringify({
        collection_info: { name: state.collection.name, description: state.collection.description },
        items: state.collection.items
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'collection.mb';
    a.click();
};

init();
