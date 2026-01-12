// --- Configuration ---
const PLANTS = [
    { id: 'brazing', name: 'Brazing', color: '#f97316' },
    { id: 'plating', name: 'Plating', color: '#0ea5e9' },
    { id: 'lp', name: 'LP', color: '#10b981' }
];

// --- State Application ---
let state = {
    viewDate: new Date(2026, 0, 1), // Year for main graph, Month for modal
    showComparison: false,
    modalShowComparison: false,
    visiblePlants: [true, true, true],
    visibleCostPlants: [true, true, true]
};

// Caches
const annualDataCache = {};
const dailyDataCache = {};

let mainChart;
let dailyChart;
let costChart;

// --- Persistence Logic ---
const STORAGE_KEY = 'uic_chart_settings_v2'; // Bump version

const saveSettings = () => {
    const settings = {
        showComparison: state.showComparison,
        visiblePlants: state.visiblePlants,
        visibleCostPlants: state.visibleCostPlants
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

const loadSettings = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (typeof parsed.showComparison === 'boolean') {
                state.showComparison = parsed.showComparison;
                const toggle = document.getElementById('compareToggle');
                if (toggle) toggle.checked = state.showComparison;
            }
            if (Array.isArray(parsed.visiblePlants) && parsed.visiblePlants.length === 3) {
                state.visiblePlants = parsed.visiblePlants;
            }
            if (Array.isArray(parsed.visibleCostPlants) && parsed.visibleCostPlants.length === 3) {
                state.visibleCostPlants = parsed.visibleCostPlants;
            }
        } catch (e) {
            console.error('Failed to load settings', e);
        }
    }
};

// --- DATA LOGIC: ANNUAL (Main Graph) ---
const generateAnnualData = (year) => {
    const key = String(year);
    if (annualDataCache[key]) return annualDataCache[key];

    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    // Generate 12 months data
    const plantData = PLANTS.map(plant => ({
        id: plant.id,
        name: plant.name,
        color: plant.color,
        // Monthly values roughly 60k - 150k
        data: Array.from({ length: 12 }, () => rand(60000, 150000))
    }));

    // Last Year Data (for comparison)
    const lastYearPlantData = PLANTS.map(plant => ({
        id: plant.id,
        data: Array.from({ length: 12 }, () => rand(60000, 150000))
    }));

    const result = { plantData, lastYearPlantData };
    annualDataCache[key] = result;
    return result;
};

const calculateAnnualLastYearTotal = (dataSet) => {
    const totalData = new Array(12).fill(0);
    dataSet.lastYearPlantData.forEach((plantSeries, index) => {
        if (state.visiblePlants[index]) {
            for (let i = 0; i < 12; i++) {
                totalData[i] += plantSeries.data[i];
            }
        }
    });
    return totalData;
};

// --- DATA LOGIC: DAILY (Modal Graph) ---
const formatDateKey = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const generateDailyData = (date) => {
    const key = formatDateKey(date);
    if (dailyDataCache[key]) return dailyDataCache[key];

    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    const plantData = PLANTS.map(plant => ({
        id: plant.id,
        name: plant.name,
        color: plant.color,
        data: Array.from({ length: daysInMonth }, () => rand(2000, 5000))
    }));

    const result = { daysInMonth, plantData };
    dailyDataCache[key] = result;
    return result;
};

// --- MAIN CHART RENDERING (Annual) ---
const initMainChart = () => {
    const options = {
        series: [],
        chart: {
            height: 450,
            type: 'bar', // Columns for monthly view looks better
            stacked: true,
            fontFamily: 'Outfit, sans-serif',
            toolbar: { show: false },
            animations: { enabled: true },
            events: {
                legendClick: function (chartContext, seriesIndex, config) {
                    if (seriesIndex < PLANTS.length) {
                        state.visiblePlants[seriesIndex] = !state.visiblePlants[seriesIndex];
                        saveSettings();
                        updateDashboard();
                        return false;
                    }
                    return true;
                }
            }
        },
        plotOptions: {
            bar: {
                columnWidth: '55%',
                borderRadius: 4,
                dataLabels: {
                    total: {
                        enabled: true,
                        style: {
                            fontSize: '12px', fontWeight: 700, color: '#475569'
                        },
                        formatter: (val) => val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toLocaleString(),
                        offsetY: -8
                    }
                }
            }
        },
        dataLabels: { enabled: false },
        xaxis: {
            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: { style: { colors: '#64748b' } }
        },
        yaxis: {
            title: { text: 'Units Produced', style: { color: '#64748b' } },
            labels: {
                style: { colors: '#64748b' },
                formatter: (val) => val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val.toFixed(0)
            },
        },
        fill: { opacity: 1 },
        colors: [...PLANTS.map(p => p.color), '#ef4444'],
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            markers: { radius: 12 },
            inverseOrder: true
        },
        tooltip: {
            shared: true,
            intersect: false,
            y: {
                formatter: (y) => typeof y !== "undefined" ? y.toLocaleString() + " units" : y
            }
        },
        grid: { borderColor: '#f1f5f9' }
    };

    mainChart = new ApexCharts(document.querySelector("#chart"), options);
    mainChart.render();
};

const updateDashboard = () => {
    const year = state.viewDate.getFullYear();
    const yearInput = document.getElementById('yearInput');
    if (yearInput) yearInput.value = year;

    // Check future year
    const isFuture = year > 2026; // Demo constraint
    if (isFuture) {
        document.getElementById('noDataOverlay').classList.add('active');
        document.getElementById('chart').style.opacity = '0.1';
        document.getElementById('summaryGrid').innerHTML = '';
        // Also update cost chart to empty or same year
        updateCostChart(year);
        return;
    } else {
        document.getElementById('noDataOverlay').classList.remove('active');
        document.getElementById('chart').style.opacity = '1';
    }

    const dataSet = generateAnnualData(year);

    let finalSeries = dataSet.plantData.map((p, idx) => ({
        name: p.name,
        type: 'bar',
        data: p.data,
        hidden: !state.visiblePlants[idx]
    }));

    if (state.showComparison) {
        const lastYearTotalData = calculateAnnualLastYearTotal(dataSet);
        finalSeries.push({
            name: `Total (${year - 1})`,
            type: 'line',
            data: lastYearTotalData
        });
    }

    // Chart update
    mainChart.updateOptions({
        stroke: {
            width: state.showComparison ? [0, 0, 0, 4] : [0, 0, 0],
            curve: 'smooth'
        }
    });
    mainChart.updateSeries(finalSeries);

    // Summary Update (Total for the Year)
    updateSummary(dataSet.plantData);

    // Cost Chart Update
    updateCostChart(year);
};

const updateSummary = (plantSeries) => {
    const container = document.getElementById('summaryGrid');
    container.innerHTML = '';
    let grandTotal = 0;

    plantSeries.forEach(series => {
        const total = series.data.reduce((a, b) => a + b, 0);
        grandTotal += total;

        const card = document.createElement('div');
        card.className = 'summary-card';
        card.innerHTML = `
            <div class="summary-title">
                <span class="dot" style="background-color: ${series.color}"></span>
                ${series.name} (Year)
            </div>
            <div class="summary-value">${total.toLocaleString()}</div>
        `;
        container.appendChild(card);
    });

    const totalCard = document.createElement('div');
    totalCard.className = 'summary-card total';
    totalCard.innerHTML = `
        <div class="summary-title">Grand Total</div>
        <div class="summary-value">${grandTotal.toLocaleString()}</div>
    `;
    container.appendChild(totalCard);
};

// --- MODAL CHART RENDERING (Daily) ---
const initDailyChart = () => {
    const options = {
        series: [],
        chart: {
            height: 400,
            type: 'bar',
            stacked: true,
            fontFamily: 'Outfit, sans-serif',
            toolbar: { show: false },
            animations: { enabled: true }
        },
        stroke: {
            width: [0, 0, 0, 4],
            curve: 'smooth'
        },
        plotOptions: {
            bar: {
                borderRadius: 4,
                dataLabels: {
                    total: {
                        enabled: true,
                        style: {
                            fontSize: '11px', fontWeight: 700, color: '#475569'
                        },
                        formatter: (val) => val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toLocaleString(),
                        offsetY: -8
                    }
                }
            }
        },
        dataLabels: { enabled: false },
        xaxis: {
            categories: [], // 1-31
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                formatter: (val) => val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toFixed(0)
            }
        },
        // Add color for Last Year (Red) to the array
        colors: [...PLANTS.map(p => p.color), '#ef4444'],
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            inverseOrder: true // Ensures Last Year (last in series) is first in legend
        },
        tooltip: {
            shared: true,
            intersect: false,
            y: {
                formatter: (y) => typeof y !== "undefined" ? y.toLocaleString() : y
            }
        },
        grid: { borderColor: '#f1f5f9' }
    };

    dailyChart = new ApexCharts(document.querySelector("#dailyChart"), options);
    dailyChart.render();
};

const updateDailyChart = () => {
    const yearStr = state.viewDate.getFullYear();
    const monthStr = String(state.viewDate.getMonth() + 1).padStart(2, '0');
    const input = document.getElementById('modalMonthInput');
    if (input) input.value = `${yearStr}-${monthStr}`;

    const dataSet = generateDailyData(state.viewDate);
    const daysArray = Array.from({ length: dataSet.daysInMonth }, (_, i) => i + 1);

    let series = dataSet.plantData.map(p => ({
        name: p.name,
        type: 'bar',
        data: p.data
    }));

    if (state.modalShowComparison) {
        // Generate Last Year Data
        const lastYearDate = new Date(state.viewDate);
        lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
        const lastYearSet = generateDailyData(lastYearDate);

        // Calculate Total
        const totalData = new Array(dataSet.daysInMonth).fill(0);
        lastYearSet.plantData.forEach(p => {
            // We map strictly to current month days. 
            // If last year had fewer/more days (Feb), just handle what we have or fill 0
            p.data.forEach((val, idx) => {
                if (idx < totalData.length) totalData[idx] += val;
            });
        });

        series.push({
            name: `Last Year`,
            type: 'line',
            data: totalData
        });
    }

    dailyChart.updateOptions({
        xaxis: { categories: daysArray },
        stroke: {
            width: state.modalShowComparison ? [0, 0, 0, 4] : [0, 0, 0],
            curve: 'smooth'
        }
    });
    dailyChart.updateSeries(series);
};

// --- COST CHART RENDERING (Unchanged Logic, mostly) ---
// Cache structure: { 'YYYY': { plantCosts: [] } }
const costCache = {};

const generateAnnualCostData = (year) => {
    const key = String(year);
    if (costCache[key]) return costCache[key];

    const randFloat = (min, max) => (Math.random() * (max - min) + min);

    // Cost (THB)
    const plantCosts = PLANTS.map(plant => ({
        name: plant.name,
        color: plant.color,
        data: Array.from({ length: 12 }, () => parseFloat(randFloat(1.00, 4.00).toFixed(2)))
    }));

    // Consumption (kW)
    const plantKW = PLANTS.map(plant => ({
        name: plant.name,
        color: plant.color,
        data: Array.from({ length: 12 }, () => parseFloat(randFloat(0.5, 2.5).toFixed(2)))
    }));

    const result = { plantCosts, plantKW };
    costCache[key] = result;
    return result;
};

const initCostChart = () => {
    const options = {
        series: [],
        chart: {
            height: 350,
            type: 'line', // Mixed
            stacked: true,
            fontFamily: 'Outfit, sans-serif',
            toolbar: { show: false },
            events: {
                legendClick: function (chartContext, seriesIndex, config) {
                    if (seriesIndex < PLANTS.length) {
                        state.visibleCostPlants[seriesIndex] = !state.visibleCostPlants[seriesIndex];
                        saveSettings();
                        updateCostChart(state.viewDate.getFullYear());
                        return false;
                    }
                    return true;
                }
            }
        },
        stroke: { width: 2, curve: 'smooth' },
        plotOptions: {
            bar: {
                columnWidth: '60%',
                borderRadius: 4,
                dataLabels: {
                    total: {
                        enabled: true,
                        style: { fontSize: '10px', fontWeight: 600 },
                        formatter: (val) => val ? val.toFixed(2) : ''
                    }
                }
            }
        },
        dataLabels: { enabled: false },
        xaxis: {
            categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        },
        yaxis: { title: { text: 'THB / Unit' } },
        legend: { position: 'top', horizontalAlign: 'right', inverseOrder: true }
    };

    costChart = new ApexCharts(document.querySelector("#costChart"), options);
    costChart.render();
};

window.updateShowState = () => {
    updateCostChart(state.viewDate.getFullYear());
};

const updateCostChart = (year) => {
    document.getElementById('costYearLabel').textContent = year;
    const showCost = document.getElementById('showCostCheck').checked;
    const showKW = document.getElementById('showKWCheck').checked;

    const dataSet = generateAnnualCostData(year);
    let series = [];
    let yaxis = [];

    if (showCost && showKW) {
        dataSet.plantCosts.forEach((p, idx) => {
            series.push({ name: p.name, type: 'bar', data: p.data, color: p.color, hidden: !state.visibleCostPlants[idx] });
        });
        dataSet.plantKW.forEach((p, idx) => {
            series.push({ name: p.name + ' (kW)', type: 'line', data: p.data, color: p.color, showInLegend: false, hidden: !state.visibleCostPlants[idx] });
        });
        yaxis = [
            { seriesName: dataSet.plantCosts[0]?.name, title: { text: 'Cost (THB)' }, show: true, decimalsInFloat: 2 },
            { opposite: true, title: { text: 'Consumption (kW)' }, show: true, decimalsInFloat: 2 }
        ];
    } else if (showCost) {
        dataSet.plantCosts.forEach((p, idx) => {
            series.push({ name: p.name, type: 'bar', data: p.data, color: p.color, hidden: !state.visibleCostPlants[idx] });
        });
        yaxis = [{ title: { text: 'Cost (THB)' }, show: true, decimalsInFloat: 2 }];
    } else if (showKW) {
        dataSet.plantKW.forEach((p, idx) => {
            series.push({ name: p.name, type: 'bar', data: p.data, color: p.color, hidden: !state.visibleCostPlants[idx] });
        });
        yaxis = [{ title: { text: 'Consumption (kW)' }, show: true, decimalsInFloat: 2 }];
    } else {
        series = [{ data: [] }];
        yaxis = [{ show: false }];
    }

    costChart.updateOptions({
        chart: { stacked: true },
        yaxis: yaxis,
        stroke: { width: (showCost && showKW) ? [0, 0, 0, 2, 2, 2] : 0 }
    });
    costChart.updateSeries(series);
};


// --- EVENT LISTENERS ---

// Main Graph Year Navigation
document.getElementById('prevYearBtn').addEventListener('click', () => {
    state.viewDate.setFullYear(state.viewDate.getFullYear() - 1);
    updateDashboard();
});
document.getElementById('nextYearBtn').addEventListener('click', () => {
    state.viewDate.setFullYear(state.viewDate.getFullYear() + 1);
    updateDashboard();
});

// Comparison Toggle
document.getElementById('compareToggle').addEventListener('change', (e) => {
    state.showComparison = e.target.checked;
    saveSettings();
    updateDashboard();
});

// Modal Logic
const detailModal = document.getElementById('detailModal');
const openDetailBtn = document.getElementById('openDetailBtn');
const closeDetailBtn = document.getElementById('closeDetailBtn');

const openModal = () => {
    detailModal.classList.add('active');
    if (!dailyChart) initDailyChart();

    // Update Daily Chart to match current View Year + Month (defaulting to Jan if not tracked, but we track full Date)
    // Actually, let's keep the month in state.viewDate as well.
    updateDailyChart();
};

const closeModal = () => {
    detailModal.classList.remove('active');
};

openDetailBtn.addEventListener('click', openModal);
closeDetailBtn.addEventListener('click', closeModal);
detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeModal();
});

// Modal Month Navigation
// Modal Month Navigation
document.getElementById('prevMonthBtn').addEventListener('click', () => {
    state.viewDate.setMonth(state.viewDate.getMonth() - 1);
    updateDailyChart();
    updateDashboard();
});

document.getElementById('nextMonthBtn').addEventListener('click', () => {
    state.viewDate.setMonth(state.viewDate.getMonth() + 1);
    updateDailyChart();
    updateDashboard();
});

// Modal Logic Extras
document.getElementById('yearInput').addEventListener('change', (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
        state.viewDate.setFullYear(val);
        updateDashboard();
    }
});

document.getElementById('modalCompareToggle').addEventListener('change', (e) => {
    state.modalShowComparison = e.target.checked;
    updateDailyChart();
    // Intentionally NOT saving this setting as requested
});

document.getElementById('modalMonthInput').addEventListener('change', (e) => {
    if (!e.target.value) return;
    const [y, m] = e.target.value.split('-').map(Number);
    state.viewDate.setFullYear(y);
    state.viewDate.setMonth(m - 1);
    updateDailyChart();
    updateDashboard();
});




// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    initMainChart();
    initCostChart();
    updateDashboard();
});


// --- PDF DOWNLOAD (Updated implementation) ---
const downloadPDF = async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const availableWidth = pageWidth - (margin * 2);
    const now = new Date();
    const downloadTime = now.toLocaleString('th-TH');
    const year = state.viewDate.getFullYear();

    const fileName = `Dashboard_${year}_Download.pdf`;

    const getImageDimensions = (base64) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.width, h: img.height });
            img.src = base64;
        });
    };

    const addFooter = (pageNumber) => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Year: ${year} | Downloaded: ${downloadTime} | Page ${pageNumber}`, margin, doc.internal.pageSize.getHeight() - margin);
    };

    // PAGE 1: Annual Production
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("FG Production Overview (Annual)", margin, margin + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Year ${year}`, margin, margin + 18);

    try {
        const chart1URI = await mainChart.dataURI();
        if (chart1URI && chart1URI.imgURI) {
            const dims = await getImageDimensions(chart1URI.imgURI);
            const ratio = dims.h / dims.w;
            const imgHeight = availableWidth * ratio;
            doc.addImage(chart1URI.imgURI, 'PNG', margin, 40, availableWidth, imgHeight);

            // Summary Table
            let finalY = 40 + imgHeight + 10;
            if (finalY > 150) finalY = 150;

            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.text("Annual Summary", margin, finalY);

            const dataSet = generateAnnualData(year);
            let grandTotal = 0;
            let xPos = margin;
            finalY += 10;
            doc.setFontSize(10);

            dataSet.plantData.forEach(p => {
                const total = p.data.reduce((a, b) => a + b, 0);
                grandTotal += total;
                doc.setTextColor(100);
                doc.text(`${p.name}`, xPos, finalY);
                doc.setTextColor(0);
                doc.setFont("helvetica", "bold");
                doc.text(`${total.toLocaleString()}`, xPos, finalY + 5);
                doc.setFont("helvetica", "normal");
                xPos += 40;
            });
            doc.setTextColor(100);
            doc.text(`Grand Total`, xPos, finalY);
            doc.setTextColor(220, 38, 38);
            doc.setFont("helvetica", "bold");
            doc.text(`${grandTotal.toLocaleString()}`, xPos, finalY + 5);
        }
    } catch (e) { console.error(e); }

    addFooter(1);

    // PAGE 2: Cost
    doc.addPage();
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Electricity Cost Analysis", margin, margin + 10);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Year ${year}`, margin, margin + 18);

    try {
        const chart2URI = await costChart.dataURI();
        if (chart2URI && chart2URI.imgURI) {
            const dims = await getImageDimensions(chart2URI.imgURI);
            const ratio = dims.h / dims.w;
            const imgHeight = availableWidth * ratio;
            doc.addImage(chart2URI.imgURI, 'PNG', margin, 40, availableWidth, imgHeight);
        }
    } catch (e) { }
    addFooter(2);

    doc.save(fileName);
};
