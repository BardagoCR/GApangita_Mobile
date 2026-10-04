async function loadCategories() {
    const res = await fetch(`${API_BASE_URL}/categories`);
    const data = await res.json();

    const select = document.getElementById('categoryId');
    select.innerHTML = `<option value="" selected>None</option>`;

    data.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.category_code;
        option.textContent = cat.NAME;
        select.appendChild(option);
    });
}

async function loadBranches() {
    const res = await fetch(`${API_BASE_URL}/branches`);
    const data = await res.json();

    const select = document.getElementById('branchId');
    select.innerHTML = `<option value="" selected>None</option>`;

    data.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch.branch_code;
        option.textContent = branch.NAME;
        select.appendChild(option);
    });
}

function initBranchLocationFilter() {
    const branchSelect = document.getElementById('branchId');
    if (!branchSelect) return;

    const locationSelect = document.getElementById('locationId');

    // Initial state when page loads
    locationSelect.disabled = true;
    locationSelect.innerHTML =
        `<option value="" selected disabled>Select Branch first...</option>`;

    branchSelect.addEventListener('change', async function () {
        const branchCode = this.value;

        // No branch selected
        if (!branchCode) {
            locationSelect.disabled = true;
            locationSelect.innerHTML =
                `<option value="" selected disabled>Select Branch first...</option>`;

                if (AppState.runSearch) {
                AppState.currentPage = 1;
                AppState.runSearch();
            }

            return;
        }

        // Loading state
        locationSelect.disabled = true;
        locationSelect.innerHTML =
            `<option selected disabled>Loading...</option>`;

        try {
            const res = await fetch(
                `${API_BASE_URL}/locations/by-branch/${branchCode}`
            );

            const data = await res.json();

            locationSelect.innerHTML =
                `<option value="" selected>None</option>`;

            data.forEach(loc => {
                const option = document.createElement('option');
                option.value = loc.location_code;
                option.textContent = loc.NAME;
                locationSelect.appendChild(option);
            });

            locationSelect.disabled = false;

            if (AppState.runSearch) {
            AppState.currentPage = 1;
            AppState.runSearch();
            }

        } catch (err) {
            console.error(err);

            locationSelect.disabled = true;
            locationSelect.innerHTML =
                `<option selected disabled>Error loading locations</option>`;
        }
    });
}

