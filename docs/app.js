/**
 * Digidex - Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    const state = {
        allDigimon: [],
        filteredDigimon: [],
        currentDetail: null,
        searchQuery: '',
        stageFilter: '',
        attributeFilter: '',
        mountFilter: '',
        isModalOpen: false,
        
        // Graph state
        currentView: 'grid', // 'grid' | 'graph'
        network: null,
        nodes: null,
        edges: null,
        expandedNodes: new Set(),
        drawerNodeId: null    // currently selected node id in drawer
    };

    // --- DOM Elements ---
    const elements = {
        grid: document.getElementById('digimonGrid'),
        searchInput: document.getElementById('searchInput'),
        stageFilter: document.getElementById('stageFilter'),
        attrFilter: document.getElementById('attributeFilter'),
        mountFilter: document.getElementById('mountFilter'),
        currentCount: document.getElementById('currentCount'),
        totalCount: document.getElementById('totalCount'),
        loadingState: document.getElementById('loadingState'),
        errorState: document.getElementById('errorState'),
        emptyState: document.getElementById('emptyState'),
        cardTemplate: document.getElementById('cardTemplate'),
        // Graph View Elements
        viewGridBtn: document.getElementById('viewGridBtn'),
        viewGraphBtn: document.getElementById('viewGraphBtn'),
        graphContainer: document.getElementById('graphContainer'),
        
        // Drawer Elements
        digimonDrawer: document.getElementById('digimonDrawer'),
        closeDrawerBtn: document.getElementById('closeDrawerBtn'),
        drawerImage: document.getElementById('drawerImage'),
        drawerNumber: document.getElementById('drawerNumber'),
        drawerName: document.getElementById('drawerName'),
        drawerStage: document.getElementById('drawerStage'),
        drawerAttribute: document.getElementById('drawerAttribute'),
        drawerMoreBtn: document.getElementById('drawerMoreBtn'),
        drawerLinks: document.getElementById('drawerLinks'),
        drawerGraphActions: document.getElementById('drawerGraphActions'),
        collapseNodeBtn: document.getElementById('collapseNodeBtn'),
        traceOriginsBtn: document.getElementById('traceOriginsBtn'),
        
        // Custom attribute dropdown
        attrCustomSelect: document.getElementById('attrCustomSelect'),
        attrSelectTrigger: document.getElementById('attrSelectTrigger'),
        attrSelectOptions: document.getElementById('attrSelectOptions'),
        
        // Modal
        modalOverlay: document.getElementById('detailModal'),
        prevDigimonBtn: document.getElementById('prevDigimonBtn'),
        nextDigimonBtn: document.getElementById('nextDigimonBtn'),
        modalContent: document.getElementById('modalContent'),
        modalLoading: document.getElementById('modalLoading'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        modalResistances: document.getElementById('modalResistances'),
        modalLinks: document.getElementById('modalLinks'),
        
        // Error actions
        retryBtn: document.getElementById('retryBtn'),
        clearFiltersBtn: document.getElementById('clearFiltersBtn')
    };

    // --- Constants ---
    // Max stat used to calculate percentage for stat bars
    const MAX_STAT = 10000;
    // Fallback image if game8 image fails
    const FALLBACK_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>';

    // Attribute icons (source: game8.co)
    const ATTR_ICONS = {
        'Vaccine': 'https://img.game8.co/4291858/0f75c26076ace02c65aa13368e858df5.png/show',
        'Data': 'https://img.game8.co/4291857/4a396209130b5592cade90b53b428d02.png/show',
        'Virus': 'https://img.game8.co/4291859/cbb7f696b4d82a29aef76e25727135cd.png/show',
        'Free': 'https://img.game8.co/4291863/4e17d271df50063e2f448f7b712ab5e1.png/show',
        'Variable': 'https://img.game8.co/4291861/291010c2ac3a5fdec3a65a714d0d9c96.png/show',
        'No Data': 'https://img.game8.co/4294245/5ac0b1f0f5a39997607cfce672f1ef1d.png/show',
        'Unknown': 'https://img.game8.co/4291862/06887110a84dd7ece910dde2541f9887.png/show'
    };

    // Mount SVG Icons (Cyberpunk vector graphics matching Digidex design system)
    const MOUNT_ICONS = {
        flying: `<svg class="mount-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4C14 4 10 9 8 13M22 4c-5 6-9 11-14 13M22 4C11 8 6 15 4 20M2 17l2 3 3-2"/></svg>`,
        ground: `<svg class="mount-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.5" r="1.8"/><circle cx="19" cy="8.5" r="1.5"/><circle cx="5" cy="9" r="1.5"/><path d="M12 11c-3.3 0-6 2.2-6 5.5 0 2.2 1.8 3.5 4 3.5 1.2 0 1.8-.4 2-.8.2.4.9.8 2 .8 2.1 0 3.8-1.1 3.8-3.2 0-3.3-2.7-5.5-6-5.5z"/></svg>`,
        any: `<svg class="mount-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`
    };

    // Helper for CSS class formatting
    function formatClass(str) {
        if (!str) return 'unknown';
        return str.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }

    // Populate an attribute badge element with its icon + label
    function setAttrBadge(el, attribute) {
        const attr = attribute || 'Unknown';
        el.className = `badge attr-badge attr-${formatClass(attr)}`;
        const icon = ATTR_ICONS[attr];
        el.innerHTML = (icon ? `<img class="badge-icon" src="${icon}" alt="" aria-hidden="true" loading="lazy">` : '') + `<span>${attr}</span>`;
    }

    // Build a DOM element for vis.js tooltips (string titles render <br> as literal text)
    function nodeTitle(stage, attribute) {
        const el = document.createElement('div');
        el.className = 'graph-tooltip';
        let html = `Stage: ${stage || 'Unknown'}`;
        if (attribute) html += `<br>Attr: ${attribute}`;
        el.innerHTML = html;
        return el;
    }

    // --- Initialization ---
    async function init() {
        setupEventListeners();
        initAttrDropdown();
        await fetchAllDigimon();
    }

    // --- API Calls ---
    async function fetchAllDigimon() {
        showLoading(true);
        hideStates();
        
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error('Failed to fetch data');
            const data = await response.json();
            
            state.allDigimon = data;
            state.filteredDigimon = [...state.allDigimon];
            
            // Extract unique stages and attributes
            const stages = new Set();
            const attributes = new Set();
            
            data.forEach(d => {
                if (d.stage) stages.add(d.stage);
                if (d.attribute) attributes.add(d.attribute);
            });
            
            updateCount();
            
            if (state.currentView === 'grid') {
                renderGrid(state.filteredDigimon);
            } else {
                initGraph();
            }
            
            showLoading(false);
        } catch (error) {
            console.error('Error fetching digimon:', error);
            showLoading(false);
            showErrorState();
        }
    }

    async function fetchDigimonDetail(id) {
        showModalLoading(true);
        
        try {
            const data = state.allDigimon.find(d => d.id === id);
            if (!data) throw new Error('Digimon not found in local data');
            
            showModalLoading(false);
            populateModal(data);
        } catch (error) {
            console.error('Error fetching details:', error);
            showModalLoading(false);
        }
    }

    // --- Rendering ---
    function renderGrid(digimonList) {
        elements.grid.innerHTML = '';
        
        if (digimonList.length === 0) {
            elements.emptyState.classList.remove('hidden');
            elements.currentCount.textContent = '0';
            return;
        }
        
        elements.emptyState.classList.add('hidden');
        elements.currentCount.textContent = digimonList.length;
        
        // Use fragment for performance
        const fragment = document.createDocumentFragment();
        
        digimonList.forEach((digi, index) => {
            const clone = elements.cardTemplate.content.cloneNode(true);
            const card = clone.querySelector('.digimon-card');
            
            // Set attributes for filtering/styling
            card.dataset.id = digi.id;
            card.dataset.stage = formatClass(digi.stage);
            card.dataset.attribute = formatClass(digi.attribute);
            
            // Staggered animation
            card.style.animationDelay = `${(index % 12) * 0.05}s`;
            card.classList.add('fade-in');
            
            // Populate content
            const img = clone.querySelector('.card-image');
            img.src = digi.image_url || FALLBACK_IMAGE;
            img.alt = digi.name;
            img.onerror = function() { this.src = FALLBACK_IMAGE; };
            
            clone.querySelector('.card-number').textContent = `#${String(digi.field_guide_number).padStart(3, '0')}`;
            clone.querySelector('.card-name').textContent = digi.name;
            
            const stageBadge = clone.querySelector('.stage-badge');
            stageBadge.textContent = digi.stage || 'Unknown';
            stageBadge.classList.add(`stage-${formatClass(digi.stage)}`);
            
            const attrBadge = clone.querySelector('.attr-badge');
            setAttrBadge(attrBadge, digi.attribute);
            
            // Mount indicator
            if (digi.rideable > 0) {
                const mountIndicator = document.createElement('span');
                mountIndicator.className = `card-mount-icon ${digi.rideable === 1 ? 'mount-flying' : 'mount-ground'}`;
                mountIndicator.title = digi.rideable === 1 ? 'Flying Mount' : 'Ground Mount';
                mountIndicator.innerHTML = digi.rideable === 1 ? MOUNT_ICONS.flying : MOUNT_ICONS.ground;
                clone.querySelector('.card-image-wrapper').appendChild(mountIndicator);
            }
            
            // Event listener
            card.addEventListener('click', () => openDetail(digi.id));
            
            fragment.appendChild(clone);
        });
        
        elements.grid.appendChild(fragment);
    }

    // --- Filtering ---
    function filterAndRender() {
        state.filteredDigimon = state.allDigimon.filter(digi => {
            let matchesSearch = true;
            if (state.searchQuery) {
                if (state.exactMatch) {
                    matchesSearch = digi.name.toLowerCase() === state.searchQuery.toLowerCase();
                } else {
                    matchesSearch = digi.name.toLowerCase().includes(state.searchQuery.toLowerCase());
                }
            }
            const matchesStage = state.stageFilter === '' || digi.stage === state.stageFilter;
            const matchesAttr = state.attributeFilter === '' || digi.attribute === state.attributeFilter;
            let matchesMount = true;
            if (state.mountFilter === 'any') {
                matchesMount = digi.rideable > 0;
            } else if (state.mountFilter === '1') {
                matchesMount = digi.rideable === 1;
            } else if (state.mountFilter === '2') {
                matchesMount = digi.rideable === 2;
            }
            
            return matchesSearch && matchesStage && matchesAttr && matchesMount;
        });
        
        renderGrid(state.filteredDigimon);
        renderActiveFilters();

        if (state.currentView === 'graph') {
            if (state.network) {
                populateGraph(state.filteredDigimon);
            }
        }
    }

    // --- Active filter pills (visible even when the filters panel is collapsed) ---
    function renderActiveFilters() {
        const container = document.getElementById('activeFilters');
        if (!container) return;

        const xIcon = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        const pills = [];

        if (state.searchQuery) {
            pills.push(`<button class="filter-pill" data-type="search" title="Clear name filter"><span>&ldquo;${state.searchQuery}&rdquo;</span>${xIcon}</button>`);
        }
        if (state.stageFilter) {
            pills.push(`<button class="filter-pill" data-type="stage" title="Clear stage filter"><span>${state.stageFilter}</span>${xIcon}</button>`);
        }
        if (state.attributeFilter) {
            const icon = ATTR_ICONS[state.attributeFilter];
            const iconImg = icon ? `<img class="pill-icon" src="${icon}" alt="" aria-hidden="true">` : '';
            pills.push(`<button class="filter-pill pill-attr attr-${formatClass(state.attributeFilter)}" data-type="attr" title="Clear attribute filter">${iconImg}<span>${state.attributeFilter}</span>${xIcon}</button>`);
        }
        if (state.mountFilter) {
            const mountLabel = state.mountFilter === 'any' ? 'All Mounts' : state.mountFilter === '1' ? 'Flying Mount' : 'Ground Mount';
            const mountIcon = state.mountFilter === '1' ? MOUNT_ICONS.flying : (state.mountFilter === '2' ? MOUNT_ICONS.ground : MOUNT_ICONS.any);
            pills.push(`<button class="filter-pill pill-mount" data-type="mount" title="Clear mount filter">${mountIcon}<span>${mountLabel}</span>${xIcon}</button>`);
        }

        container.innerHTML = pills.join('');
        container.querySelectorAll('.filter-pill').forEach(btn => {
            btn.addEventListener('click', () => clearOneFilter(btn.dataset.type));
        });
    }

    function clearOneFilter(type) {
        if (type === 'search') { state.searchQuery = ''; state.exactMatch = false; elements.searchInput.value = ''; hideSuggestions(); }
        if (type === 'stage') { state.stageFilter = ''; elements.stageFilter.value = ''; }
        if (type === 'attr') { state.attributeFilter = ''; elements.attrFilter.value = ''; selectAttrOption(''); }
        if (type === 'mount') { state.mountFilter = ''; elements.mountFilter.value = ''; }
        filterAndRender();
    }

    // --- Search autocomplete (live preview of matching names) ---
    let suggestionIndex = -1;

    function updateSuggestions() {
        const list = document.getElementById('searchSuggestions');
        if (!list) return;
        const q = elements.searchInput.value.trim().toLowerCase();
        if (!q) { hideSuggestions(); return; }

        const matches = state.allDigimon
            .filter(d => d.name.toLowerCase().includes(q))
            .slice(0, 8);

        if (matches.length === 0) { hideSuggestions(); return; }

        list.innerHTML = matches.map((d, i) => `
            <li class="suggestion-item" role="option" data-name="${d.name.replace(/"/g, '&quot;')}" data-index="${i}">
                <img class="suggestion-img" src="${d.image_url || FALLBACK_IMAGE}" alt="" loading="lazy">
                <div class="suggestion-info">
                    <span class="suggestion-name">${d.name}</span>
                    <span class="suggestion-meta">#${String(d.field_guide_number).padStart(3, '0')} · ${d.stage || '—'}</span>
                </div>
            </li>
        `).join('');

        list.querySelectorAll('.suggestion-img').forEach(img => {
            img.onerror = function() { this.onerror = null; this.src = FALLBACK_IMAGE; };
        });
        list.querySelectorAll('.suggestion-item').forEach(item => {
            // mousedown (not click) so we act before the input's blur fires
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                selectSuggestion(item.dataset.name);
            });
        });

        suggestionIndex = -1;
        list.classList.remove('hidden');
        elements.searchInput.setAttribute('aria-expanded', 'true');
    }

    function hideSuggestions() {
        const list = document.getElementById('searchSuggestions');
        if (!list) return;
        list.classList.add('hidden');
        list.innerHTML = '';
        suggestionIndex = -1;
        elements.searchInput.setAttribute('aria-expanded', 'false');
    }

    function selectSuggestion(name) {
        elements.searchInput.value = name;
        state.searchQuery = name;
        state.exactMatch = true;
        hideSuggestions();
        filterAndRender();
    }

    function moveSuggestion(dir) {
        const list = document.getElementById('searchSuggestions');
        if (!list || list.classList.contains('hidden')) return;
        const items = Array.from(list.querySelectorAll('.suggestion-item'));
        if (!items.length) return;
        suggestionIndex = (suggestionIndex + dir + items.length) % items.length;
        items.forEach((it, i) => it.classList.toggle('active', i === suggestionIndex));
        items[suggestionIndex].scrollIntoView({ block: 'nearest' });
    }

    // --- Modal Logic ---
    function openDetail(id) {
        state.isModalOpen = true;
        state.currentDetailId = id;
        elements.modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Reset modal content visually before fetching
        resetModalContent();
        
        // Fetch and populate
        fetchDigimonDetail(id);
        updateModalNavButtons();
    }

    function updateModalNavButtons() {
        if (!elements.prevDigimonBtn || !elements.nextDigimonBtn) return;
        if (state.filteredDigimon.length <= 1) {
            elements.prevDigimonBtn.style.display = 'none';
            elements.nextDigimonBtn.style.display = 'none';
        } else {
            elements.prevDigimonBtn.style.display = 'flex';
            elements.nextDigimonBtn.style.display = 'flex';
        }
    }

    function closeDetail() {
        state.isModalOpen = false;
        elements.modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    function resetModalContent() {
        // Reset stat bars to 0 for animation effect later
        const statFills = document.querySelectorAll('.stat-bar-fill');
        statFills.forEach(fill => fill.style.width = '0%');
        
        const imgContainer = document.querySelector('.modal-image-container');
        if (imgContainer) imgContainer.classList.add('loading');
    }

    function buildResistancesHTML(digi) {
        const elements = [
            { key: 'fir_res', name: 'Fire', color: '#f97316' },
            { key: 'wtr_res', name: 'Water', color: '#0ea5e9' },
            { key: 'plt_res', name: 'Plant', color: '#22c55e' },
            { key: 'ice_res', name: 'Ice', color: '#38bdf8' },
            { key: 'ele_res', name: 'Elec', color: '#eab308' },
            { key: 'ert_res', name: 'Earth', color: '#d97706' },
            { key: 'stl_res', name: 'Steel', color: '#94a3b8' },
            { key: 'wnd_res', name: 'Wind', color: '#14b8a6' },
            { key: 'lgt_res', name: 'Light', color: '#fcd34d' },
            { key: 'drk_res', name: 'Dark', color: '#8b5cf6' },
            { key: 'nul_res', name: 'Null', color: '#64748b' }
        ];
        
        let html = '';
        elements.forEach(el => {
            const val = digi[el.key] || 'Normal';
            const valClass = val.toLowerCase();
            const sign = val === 'Strong' ? '⭘' : (val === 'Weak' ? '△' : '-');
            
            html += `
                <div class="res-item ${valClass}">
                    <span style="color: ${el.color}; font-weight: bold;">${el.name}</span>
                    <span>${sign}</span>
                </div>
            `;
        });
        return html;
    }
    
    function buildLinksHTML(digi) {
        // Trailing "open in new tab" glyph
        const extArrow = `<svg class="link-ext" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;
        // Leading document icon for Game8 guide
        const guideIcon = `<svg class="link-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>`;
        // Leading cube icon for 3D model
        const cubeIcon = `<svg class="link-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;

        let html = '';
        if (digi.detail_url) {
            html += `<a href="${digi.detail_url}" target="_blank" rel="noopener" class="external-link">${guideIcon}<span>Game8 Guide</span>${extArrow}</a>`;
        }
        const nuffleSlug = digi.slug || digi.name.toLowerCase().replace(/ /g, '-');
        html += `<a href="https://nuffle.me/dsts-viewer?m=${encodeURIComponent(nuffleSlug)}" target="_blank" rel="noopener" class="external-link">${cubeIcon}<span>3D Model</span>${extArrow}</a>`;
        return html;
    }

    function populateModal(data) {
        // Basic Info
        const img = document.getElementById('detailImage');
        const pixelToggle = document.getElementById('pixelArtToggle');
        const pixelSwitchContainer = document.getElementById('pixelSwitchContainer');
        
        const formatPixelArtName = (name) => {
            // e.g. "Agumon (Blk)" -> "agumon_blk"
            return name.toLowerCase().replace(/ /g, '_').replace(/[\(\)]/g, '');
        };
        
        const updateImage = (savePreference = false) => {
            const container = document.querySelector('.modal-image-container');
            if (container) container.classList.add('loading');
            
            img.onload = () => {
                if (container) container.classList.remove('loading');
            };

            if (pixelToggle && pixelToggle.checked) {
                img.src = `https://sergiogransol.github.io/digidex/resources/img/sprites/x5/${formatPixelArtName(data.name)}.png`;
                img.style.imageRendering = 'pixelated';
                if (savePreference) localStorage.setItem('preferredPixelMode', '8-bit');
            } else {
                img.src = data.full_image_url || data.image_url || FALLBACK_IMAGE;
                img.style.imageRendering = 'auto';
                if (savePreference) localStorage.setItem('preferredPixelMode', 'hd');
            }
        };
        
        if (pixelToggle) {
            // Re-enable in case it was disabled previously
            pixelToggle.disabled = false;
            if (pixelSwitchContainer) pixelSwitchContainer.classList.remove('disabled');

            // Set initial state from preferences
            const pref = localStorage.getItem('preferredPixelMode');
            if (pref === '8-bit') {
                pixelToggle.checked = true;
            } else {
                pixelToggle.checked = false;
            }

            // Remove old listener to avoid stacking on multiple opens
            if (img._pixelToggleHandler) {
                pixelToggle.removeEventListener('change', img._pixelToggleHandler);
            }
            img._pixelToggleHandler = () => updateImage(true);
            pixelToggle.addEventListener('change', img._pixelToggleHandler);
        }
        
        updateImage(false);
        
        img.onerror = function() {
            if (pixelToggle && pixelToggle.checked) {
                // Failed to load 8-bit, switch to HD and disable toggle
                pixelToggle.checked = false;
                pixelToggle.disabled = true;
                if (pixelSwitchContainer) pixelSwitchContainer.classList.add('disabled');
                
                this.src = data.full_image_url || data.image_url || FALLBACK_IMAGE;
                this.style.imageRendering = 'auto';
            } else if (this.src !== data.image_url && data.image_url) {
                this.src = data.image_url;
            } else {
                this.src = FALLBACK_IMAGE;
            }
        };
        
        // Set glow color based on attribute
        const glow = document.getElementById('detailImageGlow');
        const attrColorMap = {
            'Vaccine': 'rgba(59, 130, 246, 0.6)',
            'Data': 'rgba(16, 185, 129, 0.6)',
            'Virus': 'rgba(139, 92, 246, 0.6)',
            'Free': 'rgba(245, 158, 11, 0.6)'
        };
        glow.style.background = `radial-gradient(circle, ${attrColorMap[data.attribute] || 'rgba(255,255,255,0.4)'} 0%, transparent 70%)`;
        
        document.getElementById('detailNumber').textContent = String(data.field_guide_number).padStart(3, '0');
        document.getElementById('detailName').textContent = data.name;
        
        // Badges
        const stageBadge = document.getElementById('detailStage');
        stageBadge.className = 'badge stage-badge'; // Reset classes
        stageBadge.classList.add(`stage-${formatClass(data.stage)}`);
        stageBadge.textContent = data.stage || 'Unknown';
        
        setAttrBadge(document.getElementById('detailAttribute'), data.attribute);
        
        document.getElementById('detailType').textContent = data.type || 'Unknown';
        document.getElementById('detailPersonality').textContent = data.personality || 'Unknown';
        
        // Mount badge
        const mountBadge = document.getElementById('detailMount');
        if (mountBadge) {
            if (data.rideable > 0) {
                mountBadge.classList.remove('hidden');
                const isFlying = data.rideable === 1;
                mountBadge.innerHTML = `${isFlying ? MOUNT_ICONS.flying : MOUNT_ICONS.ground}<span>${isFlying ? 'Flying Mount' : 'Ground Mount'}</span>`;
                mountBadge.className = 'badge mount-badge';
                mountBadge.classList.add(isFlying ? 'mount-flying' : 'mount-ground');
            } else {
                mountBadge.classList.add('hidden');
            }
        }
        
        // Stats
        renderStats(data);
        
        // Resistances & Links
        if (elements.modalResistances) {
            elements.modalResistances.innerHTML = buildResistancesHTML(data);
        }
        if (elements.modalLinks) {
            elements.modalLinks.innerHTML = buildLinksHTML(data);
        }
        
        // Evolutions
        renderEvolutions(data);
    }

    function renderStats(data) {
        const statsGrid = document.getElementById('statsGrid');
        statsGrid.innerHTML = '';
        
        const stats = [
            { label: 'HP', value: data.hp },
            { label: 'SP', value: data.sp },
            { label: 'ATK', value: data.atk },
            { label: 'DEF', value: data.def_stat },
            { label: 'INT', value: data.int_stat },
            { label: 'SPD', value: data.spd }
        ];
        
        // Using fragment
        const fragment = document.createDocumentFragment();
        
        stats.forEach((stat, index) => {
            const row = document.createElement('div');
            row.className = 'stat-row';
            
            const pct = Math.min(100, Math.max(0, (stat.value / MAX_STAT) * 100));
            
            row.innerHTML = `
                <div class="stat-label">${stat.label}</div>
                <div class="stat-bar-container">
                    <div class="stat-bar-fill" style="width: 0%"></div>
                </div>
                <div class="stat-value">${stat.value}</div>
            `;
            
            fragment.appendChild(row);
            
            // Trigger animation after a slight delay
            setTimeout(() => {
                const fill = row.querySelector('.stat-bar-fill');
                if (fill) fill.style.width = `${pct}%`;
            }, 100 + (index * 100));
        });
        
        statsGrid.appendChild(fragment);
    }

    function renderEvolutions(data) {
        const flowContainer = document.getElementById('evolutionFlow');
        flowContainer.innerHTML = '';
        
        // 1. De-Digivolutions (Previous forms)
        const prevCol = document.createElement('div');
        prevCol.className = 'evo-col';
        
        if (data.de_digivolutions && data.de_digivolutions.length > 0) {
            prevCol.innerHTML = `<div class="evo-col-title">De-Digivolves From</div>`;
            data.de_digivolutions.forEach(prev => {
                prevCol.appendChild(createMiniCard(prev, false));
            });
        } else {
            prevCol.innerHTML = `<div class="evo-col-title">Base Form</div>
                <div style="color: var(--text-muted); font-size: 0.8rem; padding: 1rem;">No prior forms</div>`;
        }
        flowContainer.appendChild(prevCol);
        
        // 2. Arrow to Current
        flowContainer.appendChild(createArrow());
        
        // 3. Current Digimon
        const currentCol = document.createElement('div');
        currentCol.className = 'evo-col';
        currentCol.innerHTML = `<div class="evo-col-title">Current</div>`;
        
        const currentCard = document.createElement('div');
        currentCard.className = 'mini-card current';
        currentCard.innerHTML = `
            <img src="${data.image_url || FALLBACK_IMAGE}" alt="${data.name}" class="mini-img">
            <div class="mini-name">${data.name}</div>
            <div class="badge stage-badge stage-${data.stage.toLowerCase().replace(/[^a-z0-9]/g, '')}" style="font-size: 0.6rem; padding: 0.2rem 0.5rem; margin-top: 0.25rem;">${data.stage}</div>
        `;
        currentCol.appendChild(currentCard);
        flowContainer.appendChild(currentCol);
        
        // 4. Arrow to Next
        flowContainer.appendChild(createArrow());
        
        // 5. Digivolutions (Next forms)
        const nextCol = document.createElement('div');
        nextCol.className = 'evo-col';
        
        if (data.evolutions && data.evolutions.length > 0) {
            nextCol.innerHTML = `<div class="evo-col-title">Digivolves To</div>`;
            data.evolutions.forEach(next => {
                nextCol.appendChild(createMiniCard(next, true));
            });
        } else {
            nextCol.innerHTML = `<div class="evo-col-title">Max Stage</div>
                <div style="color: var(--text-muted); font-size: 0.8rem; padding: 1rem;">No further evolutions</div>`;
        }
        flowContainer.appendChild(nextCol);
    }

    function createMiniCard(data, isEvolution) {
        const card = document.createElement('div');
        card.className = 'mini-card';
        
        // Map data properties based on whether it's an evolution or de-evolution
        const id = isEvolution ? data.to_id : data.from_id;
        const name = isEvolution ? data.to_name : data.from_name;
        const img = isEvolution ? data.to_image_url : data.from_image_url;
        const stage = isEvolution ? data.to_stage : data.from_stage;
        const conditions = isEvolution ? data.conditions : null;
        
        const stageClass = stage ? `stage-${stage.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '';
        
        let html = `
            <img src="${img || FALLBACK_IMAGE}" alt="${name}" class="mini-img">
            <div class="mini-name">${name}</div>
        `;

        if (stage) {
            html += `<div class="badge stage-badge ${stageClass}" style="font-size: 0.6rem; padding: 0.2rem 0.5rem; margin-top: 0.25rem;">${stage}</div>`;
        }

        if (conditions) {
            html += `<div class="evo-conditions">${conditions}</div>`;
        }

        card.innerHTML = html;
        // Set fallback via JS (inline onerror breaks: the data-URI contains double quotes)
        const miniImg = card.querySelector('.mini-img');
        if (miniImg) miniImg.onerror = function() { this.onerror = null; this.src = FALLBACK_IMAGE; };
        card.addEventListener('click', () => openDetail(id));
        
        return card;
    }

    function createArrow() {
        const arrow = document.createElement('div');
        arrow.className = 'evo-arrow right';
        arrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
        
        // We also need a down arrow for mobile layout
        const downArrow = document.createElement('div');
        downArrow.className = 'evo-arrow down';
        downArrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`;
        
        const container = document.createElement('div');
        container.style.display = 'contents';
        container.appendChild(arrow);
        container.appendChild(downArrow);
        
        return container;
    }

    // --- Utility/UI State functions ---
    function updateCount() {
        elements.totalCount.textContent = state.allDigimon.length;
    }

    function showLoading(show) {
        if (show) {
            elements.loadingState.classList.remove('hidden');
            elements.grid.classList.add('hidden');
        } else {
            elements.loadingState.classList.add('hidden');
            elements.grid.classList.remove('hidden');
        }
    }

    function showModalLoading(show) {
        if (show) {
            elements.modalLoading.classList.remove('hidden');
            elements.modalContent.classList.add('hidden');
        } else {
            elements.modalLoading.classList.add('hidden');
            elements.modalContent.classList.remove('hidden');
        }
    }

    function hideStates() {
        elements.errorState.classList.add('hidden');
        elements.emptyState.classList.add('hidden');
    }

    function showErrorState() {
        hideStates();
        elements.grid.classList.add('hidden');
        elements.errorState.classList.remove('hidden');
    }

    // Simple debounce
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // --- Drawer Logic ---
    function openDrawer(digi) {
        state.drawerNodeId = digi.id;
        elements.digimonDrawer.classList.add('open');
        document.body.classList.add('drawer-open-push');
        elements.drawerImage.src = digi.image_url || FALLBACK_IMAGE;
        elements.drawerNumber.textContent = String(digi.field_guide_number).padStart(3, '0');
        elements.drawerName.textContent = digi.name;
        
        elements.drawerStage.textContent = digi.stage || 'Unknown';
        elements.drawerStage.className = `badge stage-badge stage-${formatClass(digi.stage)}`;
        
        setAttrBadge(elements.drawerAttribute, digi.attribute);
        
        elements.drawerLinks.innerHTML = buildLinksHTML(digi);
        
        // Update More details button
        elements.drawerMoreBtn.onclick = () => {
            openDetail(digi.id);
        };
        
        // Show/hide graph action buttons depending on current view
        if (elements.drawerGraphActions) {
            if (state.currentView === 'graph') {
                elements.drawerGraphActions.classList.remove('hidden');
                // Enable collapse only if this node has been expanded
                elements.collapseNodeBtn.disabled = !state.expandedNodes.has(digi.id);
            } else {
                elements.drawerGraphActions.classList.add('hidden');
            }
        }
    }
    
    function closeDrawer() {
        state.drawerNodeId = null;
        elements.digimonDrawer.classList.remove('open');
        document.body.classList.remove('drawer-open-push');
    }

    // --- Graph View Logic ---
    function switchView(view) {
        if (state.currentView === view) return;
        state.currentView = view;
        
        if (view === 'grid') {
            closeDrawer();
            document.body.classList.remove('graph-mode');
            elements.viewGridBtn.classList.add('active');
            elements.viewGraphBtn.classList.remove('active');
            elements.grid.classList.remove('hidden');
            elements.graphContainer.classList.add('hidden');
        } else {
            document.body.classList.add('graph-mode');
            elements.viewGridBtn.classList.remove('active');
            elements.viewGraphBtn.classList.add('active');
            elements.grid.classList.add('hidden');
            elements.graphContainer.classList.remove('hidden');
            
            if (!state.network) {
                initGraph();
            } else {
                updateGraphVisibility();
            }
        }
    }
    
    function initGraph() {
        // Create DataSets
        state.nodes = new vis.DataSet();
        state.edges = new vis.DataSet();
        
        const data = {
            nodes: state.nodes,
            edges: state.edges
        };
        
        const options = {
            nodes: {
                shape: 'circularImage',
                image: FALLBACK_IMAGE,
                borderWidth: 3,
                size: 30,
                color: {
                    border: '#38bdf8',
                    background: '#131926'
                },
                font: {
                    color: '#fff',
                    face: 'Inter',
                    size: 14,
                    strokeWidth: 2,
                    strokeColor: '#000'
                }
            },
            edges: {
                width: 2,
                color: { color: '#38bdf8', opacity: 0.45 },
                arrows: { to: { enabled: true, scaleFactor: 0.5 } },
                smooth: { type: 'continuous' }
            },
            physics: {
                solver: 'forceAtlas2Based',
                forceAtlas2Based: {
                    gravitationalConstant: -100,
                    centralGravity: 0.005,
                    springLength: 150,
                    springConstant: 0.05
                },
                maxVelocity: 50,
                minVelocity: 0.1,
                timestep: 0.5
            },
            interaction: {
                hover: true,
                tooltipDelay: 200
            }
        };
        
        state.network = new vis.Network(elements.graphContainer, data, options);
        
        // Event listeners for graph
        state.network.on('click', function (params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                expandNode(nodeId);
            } else {
                closeDrawer();
            }
        });
        
        state.network.on('doubleClick', function (params) {
            if (params.nodes.length > 0) {
                openDetail(params.nodes[0]);
            }
        });
        
        populateGraph(state.filteredDigimon);
    }
    
    function populateGraph(digimonList) {
        if (!state.network) return;
        
        // Freeze physics to prevent crash during clear+add cycle
        state.network.setOptions({ physics: { enabled: false } });
        
        state.nodes.clear();
        state.edges.clear();
        state.expandedNodes.clear();
        closeDrawer();
        
        const isDefaultState = !state.searchQuery && !state.stageFilter && !state.attributeFilter && !state.mountFilter;
        const defaultStages = ['In-Training I', 'In-Training II', 'Rookie'];

        const newNodes = [];
        let addedCount = 0;
        for (const digi of digimonList) {
            if (isDefaultState && !defaultStages.includes(digi.stage)) {
                continue;
            }
            if (addedCount >= 80) break;
            newNodes.push(createGraphNode(digi));
            addedCount++;
        }
        
        state.nodes.add(newNodes);
        
        // Re-enable physics after a tick so the engine starts fresh
        setTimeout(() => {
            if (state.network) {
                state.network.setOptions({
                    physics: {
                        enabled: true,
                        solver: 'forceAtlas2Based',
                        forceAtlas2Based: {
                            gravitationalConstant: -100,
                            centralGravity: 0.005,
                            springLength: 150,
                            springConstant: 0.05
                        },
                        maxVelocity: 50,
                        minVelocity: 0.1,
                        timestep: 0.5
                    }
                });
            }
        }, 50);
    }
    
    function updateGraphVisibility(shouldFit = true) {
        if (!state.network) return;
        
        const matchingIds = new Set(state.filteredDigimon.map(d => d.id));
        const nodesToAdd = [];
        const currentNodes = state.nodes.get();
        const currentNodesMap = new Map(currentNodes.map(n => [n.id, n]));
        
        const isDefaultState = !state.searchQuery && !state.stageFilter && !state.attributeFilter && !state.mountFilter;
        const defaultStages = ['In-Training I', 'In-Training II', 'Rookie'];

        // Add matching nodes that are not in the graph (cap to prevent lag spike)
        let addedCount = 0;
        for (const digi of state.filteredDigimon) {
            if (isDefaultState && !defaultStages.includes(digi.stage)) {
                continue;
            }
            if (!currentNodesMap.has(digi.id)) {
                if (addedCount < 100) {
                    nodesToAdd.push(createGraphNode(digi));
                    currentNodesMap.set(digi.id, true);
                    addedCount++;
                }
            }
        }
        
        if (nodesToAdd.length > 0) {
            state.nodes.add(nodesToAdd);
        }
        
        const relatedToExpanded = new Set();
        state.expandedNodes.forEach(expId => {
            relatedToExpanded.add(expId);
            const connectedEdges = state.edges.get({
                filter: e => e.from === expId || e.to === expId
            });
            connectedEdges.forEach(e => {
                relatedToExpanded.add(e.from);
                relatedToExpanded.add(e.to);
            });
        });

        // Update visibility of ALL nodes currently in the graph
        const updates = [];
        state.nodes.get().forEach(node => {
            let matchesCriteria = matchingIds.has(node.id);
            
            if (isDefaultState) {
                const digiData = state.allDigimon.find(d => d.id === node.id);
                if (digiData && !defaultStages.includes(digiData.stage)) {
                    matchesCriteria = false;
                }
            }

            const isVisible = matchesCriteria || relatedToExpanded.has(node.id) || node.id === state.drawerNodeId;
            if (node.hidden !== !isVisible) {
                updates.push({id: node.id, hidden: !isVisible});
            }
        });
        
        if (updates.length > 0) {
            state.nodes.update(updates);
        }
        
        if (shouldFit) {
            // Center the camera on the visible (filtered) nodes
            const visibleIds = state.filteredDigimon
                .map(d => d.id)
                .filter(id => state.nodes.get(id));
            if (visibleIds.length > 0) {
                state.network.fit({ nodes: visibleIds, animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
            }
        }
    }
    
    function createGraphNode(digi) {
        return {
            id: digi.id,
            label: digi.name,
            image: digi.image_url || FALLBACK_IMAGE,
            title: nodeTitle(digi.stage, digi.attribute)
        };
    }
    
    async function expandNode(id) {
        if (state.expandedNodes.has(id)) {
            // Already expanded, we can just open drawer
            const data = state.allDigimon.find(d => d.id === id);
            if (data) openDrawer(data);
            return;
        }
        
        try {
            elements.graphContainer.style.cursor = 'wait';
            
            const data = state.allDigimon.find(d => d.id === id);
            if (!data) throw new Error('Digimon not found in local data');
            
            openDrawer(data);
            
            const newNodes = [];
            const newEdges = [];
            
            // Add current node if not exists (edge case)
            if (!state.nodes.get(id)) {
                newNodes.push(createGraphNode(data));
            }
            
            // Forward evolutions
            if (data.evolutions) {
                data.evolutions.forEach(evo => {
                    if (!state.nodes.get(evo.to_id)) {
                        newNodes.push({
                            id: evo.to_id,
                            label: evo.to_name,
                            image: evo.to_image_url || FALLBACK_IMAGE,
                            title: nodeTitle(evo.to_stage)
                        });
                    }
                    
                    // Add edge
                    const edgeId = `e_${id}_${evo.to_id}`;
                    if (!state.edges.get(edgeId)) {
                        newEdges.push({
                            id: edgeId,
                            from: id,
                            to: evo.to_id,
                            title: evo.conditions || 'Standard',
                            font: { size: 10, align: 'top', color: 'rgba(255,255,255,0.5)' }
                        });
                    }
                });
            }
            
            // Backward evolutions
            if (data.de_digivolutions) {
                data.de_digivolutions.forEach(prev => {
                    if (!state.nodes.get(prev.from_id)) {
                        newNodes.push({
                            id: prev.from_id,
                            label: prev.from_name,
                            image: prev.from_image_url || FALLBACK_IMAGE,
                            title: nodeTitle(prev.from_stage)
                        });
                    }
                    
                    const edgeId = `e_${prev.from_id}_${id}`;
                    if (!state.edges.get(edgeId)) {
                        newEdges.push({
                            id: edgeId,
                            from: prev.from_id,
                            to: id,
                            color: { color: '#818cf8', opacity: 0.45 }
                        });
                    }
                });
            }
            
            if (newNodes.length > 0) state.nodes.add(newNodes);
            if (newEdges.length > 0) state.edges.add(newEdges);
            
            state.expandedNodes.add(id);
            
            updateGraphVisibility(false);
            
            if (elements.collapseNodeBtn && state.drawerNodeId === id) {
                elements.collapseNodeBtn.disabled = false;
            }
            
            elements.graphContainer.style.cursor = 'default';
            
        } catch (error) {
            console.error('Error expanding node:', error);
            elements.graphContainer.style.cursor = 'default';
        }
    }
    
    // --- Collapse Node Logic ---
    function collapseNode(id) {
        if (!state.expandedNodes.has(id)) return;
        
        const data = state.allDigimon.find(d => d.id === id);
        if (!data) return;
        
        // Collect IDs of nodes that were added by expanding this node
        const childIds = new Set();
        const edgeIdsToRemove = [];
        
        // Forward evolutions
        if (data.evolutions) {
            data.evolutions.forEach(evo => {
                const edgeId = `e_${id}_${evo.to_id}`;
                if (state.edges.get(edgeId)) {
                    if (!state.expandedNodes.has(evo.to_id)) {
                        edgeIdsToRemove.push(edgeId);
                    }
                }
                childIds.add(evo.to_id);
            });
        }
        
        // Backward evolutions
        if (data.de_digivolutions) {
            data.de_digivolutions.forEach(prev => {
                const edgeId = `e_${prev.from_id}_${id}`;
                if (state.edges.get(edgeId)) {
                    if (!state.expandedNodes.has(prev.from_id)) {
                        edgeIdsToRemove.push(edgeId);
                    }
                }
                childIds.add(prev.from_id);
            });
        }
        
        // Remove edges first
        if (edgeIdsToRemove.length > 0) {
            state.edges.remove(edgeIdsToRemove);
        }
        
        // Remove child nodes that have no remaining edges
        // (i.e., they were only connected through this node)
        const initialNodeIds = new Set(state.filteredDigimon.map(d => d.id));
        const nodesToRemove = [];
        childIds.forEach(childId => {
            if (childId === id) return; // don't remove self
            if (initialNodeIds.has(childId)) return; // keep initial filter set nodes
            
            // Check if this node still has connections to other nodes
            const remainingEdges = state.edges.get({
                filter: e => e.from === childId || e.to === childId
            });
            if (remainingEdges.length === 0) {
                nodesToRemove.push(childId);
                state.expandedNodes.delete(childId);
            }
        });
        
        if (nodesToRemove.length > 0) {
            state.nodes.remove(nodesToRemove);
        }
        
        state.expandedNodes.delete(id);
        
        updateGraphVisibility(false);
        
        // Update button state
        if (elements.collapseNodeBtn) {
            elements.collapseNodeBtn.disabled = true;
        }
    }
    
    // --- Trace Origins Logic (recursive parent expansion) ---
    async function traceOrigins(startId) {
        if (!state.network) return;
        
        elements.graphContainer.style.cursor = 'wait';
        if (elements.traceOriginsBtn) {
            elements.traceOriginsBtn.disabled = true;
            elements.traceOriginsBtn.querySelector('span').textContent = 'Tracing...';
        }
        
        const visited = new Set();
        const newNodes = [];
        const newEdges = [];
        const maxDepth = 10;
        
        // BFS approach to find all ancestors
        const queue = [{ id: startId, depth: 0 }];
        visited.add(startId);
        
        while (queue.length > 0) {
            const { id: currentId, depth } = queue.shift();
            if (depth >= maxDepth) continue;
            
            const data = state.allDigimon.find(d => d.id === currentId);
            if (!data) continue;
            
            // Ensure current node exists in the graph
            if (!state.nodes.get(currentId) && !newNodes.find(n => n.id === currentId)) {
                newNodes.push(createGraphNode(data));
            }
            
            // Process de-digivolutions (parents)
            if (data.de_digivolutions && data.de_digivolutions.length > 0) {
                for (const prev of data.de_digivolutions) {
                    // Add parent node if not exists
                    if (!state.nodes.get(prev.from_id) && !newNodes.find(n => n.id === prev.from_id)) {
                        const parentData = state.allDigimon.find(d => d.id === prev.from_id);
                        if (parentData) {
                            newNodes.push(createGraphNode(parentData));
                        } else {
                            newNodes.push({
                                id: prev.from_id,
                                label: prev.from_name,
                                image: prev.from_image_url || FALLBACK_IMAGE,
                                title: nodeTitle(prev.from_stage)
                            });
                        }
                    }
                    
                    // Add edge
                    const edgeId = `e_${prev.from_id}_${currentId}`;
                    if (!state.edges.get(edgeId) && !newEdges.find(e => e.id === edgeId)) {
                        newEdges.push({
                            id: edgeId,
                            from: prev.from_id,
                            to: currentId,
                            color: { color: '#818cf8', opacity: 0.45 }
                        });
                    }
                    
                    // Queue parent for further expansion if not visited
                    if (!visited.has(prev.from_id)) {
                        visited.add(prev.from_id);
                        queue.push({ id: prev.from_id, depth: depth + 1 });
                    }
                }
            }
            
            // Mark as expanded
            state.expandedNodes.add(currentId);
        }
        
        // Batch add nodes and edges
        if (newNodes.length > 0) state.nodes.add(newNodes);
        if (newEdges.length > 0) state.edges.add(newEdges);
        
        updateGraphVisibility(false);
        
        // Center on all traced nodes
        const allTracedIds = Array.from(visited).filter(id => state.nodes.get(id));
        if (allTracedIds.length > 0) {
            state.network.fit({
                nodes: allTracedIds,
                animation: { duration: 800, easingFunction: 'easeInOutQuad' }
            });
        }
        
        elements.graphContainer.style.cursor = 'default';
        if (elements.traceOriginsBtn) {
            elements.traceOriginsBtn.disabled = false;
            elements.traceOriginsBtn.querySelector('span').textContent = 'Trace Origins';
        }
        
        // Update collapse button state since node is now expanded
        if (elements.collapseNodeBtn && state.drawerNodeId) {
            elements.collapseNodeBtn.disabled = !state.expandedNodes.has(state.drawerNodeId);
        }
    }
    
    // --- Custom Attribute Dropdown ---
    function initAttrDropdown() {
        if (!elements.attrCustomSelect || !elements.attrSelectOptions) return;
        
        const attrs = ['Vaccine', 'Data', 'Virus', 'Free', 'Variable', 'No Data', 'Unknown'];
        let html = `<li class="custom-select-option selected" data-value="" role="option"><span>All Attributes</span></li>`;
        
        attrs.forEach(attr => {
            const icon = ATTR_ICONS[attr];
            const iconImg = icon ? `<img src="${icon}" alt="" loading="lazy">` : '';
            html += `<li class="custom-select-option" data-value="${attr}" role="option">${iconImg}<span>${attr}</span></li>`;
        });
        
        elements.attrSelectOptions.innerHTML = html;
        
        // Click on trigger toggles open
        elements.attrSelectTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.attrCustomSelect.classList.toggle('open');
        });
        
        // Click on an option
        elements.attrSelectOptions.addEventListener('click', (e) => {
            const option = e.target.closest('.custom-select-option');
            if (!option) return;
            
            const value = option.dataset.value;
            selectAttrOption(value);
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!elements.attrCustomSelect.contains(e.target)) {
                elements.attrCustomSelect.classList.remove('open');
            }
        });
    }
    
    function selectAttrOption(value) {
        // Update hidden select
        elements.attrFilter.value = value;
        state.attributeFilter = value;
        
        // Update trigger label
        const label = elements.attrSelectTrigger.querySelector('.custom-select-label');
        if (value) {
            const icon = ATTR_ICONS[value];
            label.innerHTML = (icon ? `<img src="${icon}" alt="" loading="lazy">` : '') + `<span>${value}</span>`;
        } else {
            label.innerHTML = '<span>All Attributes</span>';
        }
        
        // Update selected class on options
        elements.attrSelectOptions.querySelectorAll('.custom-select-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.value === value);
        });
        
        // Close dropdown
        elements.attrCustomSelect.classList.remove('open');
        
        // Trigger filter
        filterAndRender();
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        // Filter Toggle
        const toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
        const filtersCollapsible = document.getElementById('filtersCollapsible');
        if (toggleFiltersBtn && filtersCollapsible) {
            toggleFiltersBtn.addEventListener('click', () => {
                filtersCollapsible.classList.toggle('collapsed');
            });
        }

        // Search & Filters
        const debouncedFilter = debounce(() => filterAndRender(), 300);
        elements.searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            state.exactMatch = false;
            updateSuggestions();
            debouncedFilter();
        });
        elements.searchInput.addEventListener('keydown', (e) => {
            const list = document.getElementById('searchSuggestions');
            const open = list && !list.classList.contains('hidden');
            if (e.key === 'ArrowDown') { e.preventDefault(); moveSuggestion(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); moveSuggestion(-1); }
            else if (e.key === 'Enter' && open && suggestionIndex >= 0) {
                const items = list.querySelectorAll('.suggestion-item');
                if (items[suggestionIndex]) { e.preventDefault(); selectSuggestion(items[suggestionIndex].dataset.name); }
            } else if (e.key === 'Escape') {
                hideSuggestions();
            }
        });
        elements.searchInput.addEventListener('focus', () => {
            if (elements.searchInput.value.trim()) updateSuggestions();
        });
        elements.searchInput.addEventListener('blur', () => {
            setTimeout(hideSuggestions, 120);
        });
        
        elements.stageFilter.addEventListener('change', (e) => {
            state.stageFilter = e.target.value;
            filterAndRender();
        });
        
        elements.attrFilter.addEventListener('change', (e) => {
            state.attributeFilter = e.target.value;
            filterAndRender();
        });
        
        elements.mountFilter.addEventListener('change', (e) => {
            state.mountFilter = e.target.value;
            filterAndRender();
        });
        
        const resetHandler = () => {
            elements.searchInput.value = '';
            elements.stageFilter.value = '';
            state.searchQuery = '';
            state.exactMatch = false;
            state.stageFilter = '';
            state.attributeFilter = '';
            state.mountFilter = '';
            elements.mountFilter.value = '';
            selectAttrOption('');
            filterAndRender();
        };
        
        elements.clearFiltersBtn.addEventListener('click', resetHandler);
        
        const resetFiltersBtn2 = document.getElementById('resetFiltersBtn2');
        if (resetFiltersBtn2) resetFiltersBtn2.addEventListener('click', resetHandler);
        
        // Collapse node button
        if (elements.collapseNodeBtn) {
            elements.collapseNodeBtn.addEventListener('click', () => {
                if (state.drawerNodeId) {
                    collapseNode(state.drawerNodeId);
                }
            });
        }
        
        // Trace origins button
        if (elements.traceOriginsBtn) {
            elements.traceOriginsBtn.addEventListener('click', () => {
                if (state.drawerNodeId) {
                    traceOrigins(state.drawerNodeId);
                }
            });
        }
        
        if(elements.viewGridBtn) {
            elements.viewGridBtn.addEventListener('click', () => switchView('grid'));
        }
        if(elements.viewGraphBtn) {
            elements.viewGraphBtn.addEventListener('click', () => switchView('graph'));
        }
        
        elements.retryBtn.addEventListener('click', fetchAllDigimon);
        
        const viewInGraphBtn = document.getElementById('viewInGraphBtn');
        if (viewInGraphBtn) {
            viewInGraphBtn.addEventListener('click', () => {
                if (state.currentDetailId) {
                    const digi = state.allDigimon.find(d => d.id === state.currentDetailId);
                    if (digi) {
                        closeDetail();
                        
                        elements.searchInput.value = digi.name;
                        state.searchQuery = digi.name;
                        state.exactMatch = true;
                        hideSuggestions();
                        filterAndRender();
                        
                        switchView('graph');
                        
                        setTimeout(() => {
                            expandNode(digi.id);
                        }, 50);
                    }
                }
            });
        }
        
        if(elements.closeDrawerBtn) {
            elements.closeDrawerBtn.addEventListener('click', closeDrawer);
        }
        
        // Modal closing
        elements.closeModalBtn.addEventListener('click', closeDetail);
        
        elements.modalOverlay.addEventListener('click', (e) => {
            if (e.target === elements.modalOverlay) {
                closeDetail();
            }
        });
        
        const navigateToPrevNext = (direction) => {
            if (!state.isModalOpen || state.filteredDigimon.length === 0) return;
            const currentIndex = state.filteredDigimon.findIndex(d => d.id === state.currentDetailId);
            if (currentIndex !== -1) {
                let nextIndex = currentIndex + direction;
                if (nextIndex >= state.filteredDigimon.length) nextIndex = 0;
                if (nextIndex < 0) nextIndex = state.filteredDigimon.length - 1;
                openDetail(state.filteredDigimon[nextIndex].id);
            }
        };

        if (elements.prevDigimonBtn) {
            elements.prevDigimonBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateToPrevNext(-1);
            });
        }
        
        if (elements.nextDigimonBtn) {
            elements.nextDigimonBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateToPrevNext(1);
            });
        }

        document.addEventListener('keydown', (e) => {
            if (!state.isModalOpen) return;
            
            if (e.key === 'Escape') {
                closeDetail();
            } else if (e.key === 'ArrowRight') {
                navigateToPrevNext(1);
            } else if (e.key === 'ArrowLeft') {
                navigateToPrevNext(-1);
            }
        });
    }



    // --- Start App ---
    init();
});
