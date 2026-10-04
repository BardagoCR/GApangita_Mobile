// GLOBAL STATE VARIABLES
let categorySelect = null;
let branchSelect = null;
let locationSelect = null;

let itemStream = null;
let userStream = null;
let claimStream = null;

const AppState = {
    pageSize: 15,
    currentPage: 1,
    lastTotal: 0,
    hasSearched: false,

    runSearch: null,

    isFormDirty: false,
    isHandlingModalNavigation: false,

    isAuthenticated: false,
    user: null
};

window.AppState = AppState;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {

    await checkAuth();

    const currentPage = window.location.pathname.split('/').pop().split('?')[0].split('#')[0];
    const protectedPages = ['report.html', 'archive.html', 'unarchiveHistory.html'];

    if (!window.AppState.isAuthenticated && protectedPages.includes(currentPage)) { return; }

    const resultsContainer = document.getElementById('resultsContainer');

    if (resultsContainer) {
            resultsContainer.addEventListener('click', (e) => {

                const card = e.target.closest('.item-card');
                if (!card) return;
                const item = JSON.parse(decodeURIComponent(card.dataset.item));
                const isArchivePage = window.location.pathname.includes('archive.html');
                const isUnarchivePage = window.location.pathname.includes('unarchiveHistory.html');

                if (isArchivePage) {
                    showItemDetails(item, {
                        actionButton: {
                            text: 'Restore Item',
                            className: 'btn btn-primary',
                            onClick: openRestoreItemModal
                        }
                    });
                } else {
                    showItemDetails(item, {
                        actionButton: {
                            text: 'Claim Item',
                            className: 'btn btn-primary',
                            onClick: openClaimModal
                        }
                    });
                }
            });
        }

    // Query DOM elements after page loads
    categorySelect = document.getElementById('categoryId');
    branchSelect = document.getElementById('branchId');
    locationSelect = document.getElementById('locationId');

    await checkAuth();
    if (document.getElementById('searchInput')) { initSearchAndFilters(); }

    await loadCategories();
    await loadBranches();

    initBranchLocationFilter();
    initUnsavedChangesTracker();
});