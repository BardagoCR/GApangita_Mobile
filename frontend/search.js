// Search functionality
function initSearchAndFilters() {

    const isArchivePage = window.location.pathname.includes('archive.html');
    const isUnarchivePage = window.location.pathname.includes('unarchiveHistory.html');

    const searchInput = document.getElementById('searchInput');
    const searchDescInput = document.getElementById('searchDescInput');
    const resultsContainer = document.getElementById('resultsContainer');

    const filterPill = document.querySelector('.filter-pill');
    const filterTrack = document.querySelector('.filter-pill__track');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    const pagePill = document.querySelector('.page-pill');
    const pageTrack = document.querySelector('.page-pill__track');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageNumberEl = document.getElementById('pageNumber');

    const pagesEl = document.getElementById('pages');
    if (pagesEl) {
        pagesEl.style.display = 'none';
    }

    let selectedItemType = '';

    function positionFilterTrack(activeButton) {
        if (!filterPill || !filterTrack || !activeButton) return;
        const buttonRect = activeButton.getBoundingClientRect();
        const pillRect = filterPill.getBoundingClientRect();

        filterTrack.style.width = `${buttonRect.width}px`;
        filterTrack.style.left = `${buttonRect.left - pillRect.left}px`;
    }

    function positionPageTrack(activeButton) {
        if (!pagePill || !pageTrack || !activeButton) return;
        const buttonRect = activeButton.getBoundingClientRect();
        const pillRect = pagePill.getBoundingClientRect();

        pageTrack.style.width = `${buttonRect.width}px`;
        pageTrack.style.left = `${buttonRect.left - pillRect.left}px`;
    }

    pagePill?.addEventListener('click', (e) => {
        const btn = e.target.closest('.page-btn');
        if (!btn) return;

        document.querySelectorAll('.page-btn')
            .forEach(b => b.classList.remove('active'));

        btn.classList.add('active');

        AppState.pageSize = parseInt(btn.textContent.trim(), 10);
        AppState.currentPage = 1;

        requestAnimationFrame(() => {
            positionPageTrack(btn);
        });

        AppState.runSearch();
    });

    function updatePageUI() {
        const totalPages = Math.max(1, Math.ceil(AppState.lastTotal / AppState.pageSize));

        pageNumberEl.textContent = AppState.currentPage;
        prevBtn.disabled = AppState.currentPage <= 1;
        nextBtn.disabled = AppState.currentPage >= totalPages;

        const pagination = document.getElementById('pages');

        if(!pagination) return;

        if (!AppState.hasSearched || totalPages <= 1) {
            pagination.style.display = 'none';
        } else {
            pagination.style.display = 'flex';
        }
    }


    const initialPageActive =
    document.querySelector('.page-btn.active') ||
    document.querySelector('.page-btn');

    if (initialPageActive) {
        requestAnimationFrame(() => {
            positionPageTrack(initialPageActive);
        });
    }

    function syncPaginationUI() {
        const pagination = document.getElementById('pages');
        const totalPages = Math.max(1, Math.ceil(AppState.lastTotal / AppState.pageSize));

        if(!pagination) return;

        if (!AppState.hasSearched || totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }
        if (AppState.currentPage > totalPages) {
            AppState.currentPage = totalPages;
        }

        pagination.style.display = 'flex';

        pageNumberEl.textContent = AppState.currentPage;
        prevBtn.disabled = AppState.currentPage <= 1;
        nextBtn.disabled = AppState.currentPage >= totalPages;
    }

    prevBtn?.addEventListener('click', () => {
        if (AppState.currentPage > 1) {
            AppState.currentPage--;
            updatePageUI();
            AppState.runSearch();
        }
    });

    nextBtn?.addEventListener('click', () => {
        const totalPages = Math.max(1, Math.ceil(AppState.lastTotal / AppState.pageSize));

        if (AppState.currentPage < totalPages) {
            AppState.currentPage++;
            updatePageUI();
            AppState.runSearch();
        }
    });

    AppState.runSearch = debounce(async () => {
        if (!resultsContainer || !searchInput) return;

        const query = searchInput?.value.trim() || '';
        const description = searchDescInput?.value.trim() || '';

        const category = categorySelect?.value || '';
        const branch = branchSelect?.value || '';
        const location = locationSelect?.value || '';

        if (
            query.length < 2 &&
            description.length < 2 &&
            !category &&
            !branch &&
            !location
        ) {
            resultsContainer.innerHTML =
                '<p>Type at least 2 characters or choose a filter.</p>';

            AppState.hasSearched = false;
            AppState.lastTotal = 0;
            AppState.currentPage = 1;
            updatePageUI();

            return;
        }

        try {
            resultsContainer.innerHTML = '<p>Searching...</p>';

            const params = new URLSearchParams();
            if (query) params.append('name_q', query);
            if (description) params.append('desc_q', description);
            if (selectedItemType) params.append('filter', selectedItemType);
            if (category) params.append('category_code', category);
            if (branch) params.append('branch_code', branch);
            if (location) params.append('location_code', location);
            if (isArchivePage) { params.append('status', 'closed'); }
            if (isUnarchivePage) { params.append('unarchive_page', '1');}
            params.append('limit', AppState.pageSize);
            params.append('page', AppState.currentPage);

            const response = await fetch(`${API_BASE_URL}/search?${params.toString()}`, { credentials: 'include' });
            const data = await response.json();

            AppState.lastTotal = data.total;
            const totalPages = Math.max(1, Math.ceil(data.total / AppState.pageSize));

            if (AppState.currentPage > totalPages) {
                AppState.currentPage = totalPages;
            }

            AppState.hasSearched = true;
            displayResults(data.items, resultsContainer);
            updatePageUI();
            syncPaginationUI();
            
        } catch (error) {
            console.error('Error fetching search results:', error);
            resultsContainer.innerHTML = '<p style="color: red;">Failed to load results. Is the backend running?</p>';
        }
    }, 300);
    
        categorySelect?.addEventListener('change', () => {
            AppState.currentPage = 1;
            AppState.runSearch();
        });

        locationSelect?.addEventListener('change', () => {
            AppState.currentPage = 1;
            AppState.runSearch();
        });

    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                selectedItemType = button.textContent.trim().toLowerCase();
                if (selectedItemType === 'all') selectedItemType = '';
                AppState.currentPage = 1;
                positionFilterTrack(button);
                AppState.runSearch();
            });
        });

        const initialActive = document.querySelector('.filter-btn.active') || filterButtons[0];
        if (initialActive) {
            positionFilterTrack(initialActive);
        }

        window.addEventListener('resize', () => {
            const activeButton = document.querySelector('.filter-btn.active');
            if (activeButton) positionFilterTrack(activeButton);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            AppState.currentPage = 1;
            AppState.runSearch();
        });
    }
    if (searchDescInput) {
        searchDescInput.addEventListener('input', () => {
            AppState.currentPage = 1;
            AppState.runSearch();
        });
    }
}

    function createItemCard(item) {
        const template = document.getElementById('item-card-template');
        const card = template.content.cloneNode(true);

        const root = card.querySelector('.item-card');
        const cardImage = card.querySelector('.item-card__image');

        // safe type (optional badge)
        const safeType = SAFE_ITEM_TYPES.includes(item.item_type)
            ? item.item_type
            : 'unknown';

        // store full item for click handling
        root.dataset.item = encodeURIComponent(JSON.stringify(item));

        // Handle cross-consistent property check & trim whitespace
        const itemImagePath = item.item_file_path || item.file_path || item.item_image;

        if (itemImagePath && itemImagePath.trim() !== '' && itemImagePath !== 'NULL') {
            const cleanPath = itemImagePath.replace(/^\/+/, '');
            const imgBase = API_BASE_URL.replace(/\/api$/, '');
            cardImage.src = `${imgBase}/uploads/${cleanPath}`;
        } else {
            cardImage.src = 'placeholder/placeholder.png';
        }

        // Network error/404 error fallback rescue engine
        cardImage.onerror = () => {
            cardImage.onerror = null;
            cardImage.src = 'placeholder/placeholder.png';
        };

        // TITLE
        card.querySelector('.item-card__title').textContent =
            item.name || 'Unnamed item';

        // BADGE
        const badge = card.querySelector('.item-card__badge');
        badge.textContent = safeType;
        badge.classList.add(`item-card__badge--${safeType}`);

        // DESCRIPTION
        card.querySelector('.item-card__desc').textContent =
            item.description || 'No description provided.';

        // META
        card.querySelector('.name-match').innerHTML =
            `Name match: <strong>${item.name_relevance != null ? item.name_relevance + '%' : 'N/A'}</strong>`;

        card.querySelector('.desc-match').innerHTML =
            `Description match: <strong>${item.desc_relevance != null ? item.desc_relevance + '%' : 'N/A'}</strong>`;

        return card;
    }

function displayResults(items, resultsContainer) {
    if (!items || items.length === 0) {
        resultsContainer.innerHTML = '<p>No items found.</p>';
        return;
        }

    resultsContainer.innerHTML = '';

    const fragments = items.map(createItemCard);
    resultsContainer.append(...fragments);
}

