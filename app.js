document.addEventListener('DOMContentLoaded', () => {
    const CSV_URL = "https://docs.google.com/spreadsheets/d/1o2bK53z0VUJI9UDB2kHEP96KhIdJPd8JxRjtEYRO_0w/export?format=csv";
    
    const ui = {
        loader: document.getElementById('loader'),
        container: document.getElementById('data-container'),
        error: document.getElementById('error-message'),
        datesContainer: document.getElementById('dates-container'),
        globalTotal: document.getElementById('global-total'),
        globalDaniel: document.getElementById('global-daniel'),
        globalLaura: document.getElementById('global-laura'),
    };

    const formatMoney = (amount) => {
        const val = parseFloat(amount);
        if (isNaN(val)) return '$0';
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
    };

    const formatDebtClass = (amount) => {
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) return 'debt-green';
        return 'debt-red';
    };

    const processData = (results) => {
        const data = results.data;
        // Find row indices (assuming standard headers format)
        // Usually, empty rows might precede headers.
        let headerIndex = -1;
        for (let i = 0; i < data.length; i++) {
            if (data[i] && data[i][0] && data[i][0].toString().toLowerCase() === 'fecha') {
                headerIndex = i;
                break;
            }
        }
        
        if (headerIndex === -1) {
            showError();
            return;
        }

        const items = [];
        let gTotal = 0, gDaniel = 0, gLaura = 0;

        for (let i = headerIndex + 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 6 || !row[0] || !row[1]) continue; // Skip empty rows

            const fecha = row[0].trim();
            const desc = row[1].trim();
            const resp = row[2].trim();
            const valStr = row[3].toString().replace(/[^\d.-]/g, '');
            const pendDanielStr = row[4].toString().replace(/[^\d.-]/g, '');
            const pendLauraStr = row[5].toString().replace(/[^\d.-]/g, '');

            const val = parseFloat(valStr) || 0;
            const pendDaniel = parseFloat(pendDanielStr) || 0;
            const pendLaura = parseFloat(pendLauraStr) || 0;

            if (val > 0 || desc) {
                items.push({ fecha, desc, resp, val, pendDaniel, pendLaura });
                gTotal += val;
                gDaniel += pendDaniel;
                gLaura += pendLaura;
            }
        }

        ui.globalTotal.textContent = formatMoney(gTotal);
        ui.globalDaniel.textContent = formatMoney(gDaniel);
        ui.globalLaura.textContent = formatMoney(gLaura);

        ui.globalDaniel.className = `value ${formatDebtClass(gDaniel)}`;
        ui.globalLaura.className = `value ${formatDebtClass(gLaura)}`;

        renderGroups(items);
        
        ui.loader.classList.add('hidden');
        ui.container.classList.remove('hidden');
    };

    const renderGroups = (items) => {
        // Group by Date
        const grouped = items.reduce((acc, item) => {
            if (!acc[item.fecha]) acc[item.fecha] = { items: [], total: 0, d: 0, l: 0 };
            acc[item.fecha].items.push(item);
            acc[item.fecha].total += item.val;
            acc[item.fecha].d += item.pendDaniel;
            acc[item.fecha].l += item.pendLaura;
            return acc;
        }, {});

        ui.datesContainer.innerHTML = '';

        Object.keys(grouped).forEach(date => {
            const group = grouped[date];
            
            const groupEl = document.createElement('div');
            groupEl.className = 'date-group';
            
            const headerEl = document.createElement('div');
            headerEl.className = 'date-header';
            headerEl.innerHTML = `
                <div class="date-title">${date}</div>
                <div class="date-summary">
                    <div class="date-total">${formatMoney(group.total)}</div>
                    <svg class="toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            `;
            
            const listEl = document.createElement('div');
            listEl.className = 'expenses-list';
            
            group.items.forEach(exp => {
                const cardEl = document.createElement('div');
                cardEl.className = 'expense-card';
                cardEl.innerHTML = `
                    <div class="exp-top">
                        <span class="exp-desc">${exp.desc}</span>
                        <span class="exp-value">${formatMoney(exp.val)}</span>
                    </div>
                    <div class="exp-bottom">
                        <span class="resp-badge">${exp.resp}</span>
                        <div class="debt-info">
                            <div class="debt-item"><span class="${formatDebtClass(exp.pendDaniel)}">D: ${formatMoney(exp.pendDaniel)}</span></div>
                            <div class="debt-item"><span class="${formatDebtClass(exp.pendLaura)}">L: ${formatMoney(exp.pendLaura)}</span></div>
                        </div>
                    </div>
                `;
                listEl.appendChild(cardEl);
            });

            groupEl.appendChild(headerEl);
            groupEl.appendChild(listEl);
            
            headerEl.addEventListener('click', () => {
                groupEl.classList.toggle('expanded');
            });

            ui.datesContainer.appendChild(groupEl);
        });
    };

    const showError = () => {
        ui.loader.classList.add('hidden');
        ui.error.classList.remove('hidden');
    };

    // Load data
    Papa.parse(CSV_URL, {
        download: true,
        complete: processData,
        error: showError
    });
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .catch(err => console.error('SW registration failed: ', err));
    });
}
