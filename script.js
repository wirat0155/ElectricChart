// --- Configuration ---
const PLANTS = [
    { id: 'brazing', name: 'Brazing', color: '#f97316' },
    { id: 'plating', name: 'Plating', color: '#0ea5e9' },
    { id: 'lp', name: 'LP', color: '#10b981' }
];

// --- State Application ---
let state = {
    currentDate: new Date(2026, 0, 1),
    showComparison: false,
    visiblePlants: [true, true, true],
    visibleCostPlants: [true, true, true]
};

const dataCache = {};
let chart;

// --- Persistence Logic ---
const STORAGE_KEY = 'uic_chart_settings_v1';

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
            // Apply saved settings
            if (typeof parsed.showComparison === 'boolean') {
                state.showComparison = parsed.showComparison;
                // Sync UI checkbox if it exists yet (it might not be rendered but input is static in HTML)
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

// --- Data Logic (Persistent) ---

const formatDateKey = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const generateOrRetrieveData = (date) => {
    const key = formatDateKey(date);
    if (dataCache[key]) {
        return dataCache[key];
    }

    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const generateArray = (count, min, max) => Array.from({ length: count }, () => rand(min, max));

    // Current Year Data
    const plantData = PLANTS.map(plant => ({
        id: plant.id,
        name: plant.name,
        color: plant.color,
        data: generateArray(daysInMonth, 2000, 5000)
    }));

    // Last Year Data (Generated per plant)
    const lastYearPlantData = PLANTS.map(plant => ({
        id: plant.id,
        data: generateArray(daysInMonth, 2000, 5000)
    }));

    const result = {
        daysInMonth,
        plantData,
        lastYearPlantData
    };

    dataCache[key] = result;
    return result;
};

const calculateLastYearTotal = (dataSet) => {
    const daysCount = dataSet.daysInMonth;
    const totalData = new Array(daysCount).fill(0);

    dataSet.lastYearPlantData.forEach((plantSeries, index) => {
        if (state.visiblePlants[index]) {
            for (let i = 0; i < daysCount; i++) {
                totalData[i] += plantSeries.data[i];
            }
        }
    });
    return totalData;
};

// --- Rendering Logic ---

const isFutureDate = (date) => {
    const demoCurrent = new Date(2026, 0, 31);
    return date > demoCurrent;
};

const initChart = () => {
    const options = {
        series: [],
        chart: {
            height: 450,
            type: 'line',
            stacked: true,
            fontFamily: 'Outfit, sans-serif',
            toolbar: { show: false },
            animations: { enabled: true },
            events: {
                legendClick: function (chartContext, seriesIndex, config) {
                    if (seriesIndex < PLANTS.length) {
                        // Toggle visibility state
                        state.visiblePlants[seriesIndex] = !state.visiblePlants[seriesIndex];

                        // Save settings
                        saveSettings();

                        // Perform full update
                        updateDashboard();

                        // Return false to disable default behavior (since we rebuild series)
                        return false;
                    }
                    return true;
                }
            }
        },
        stroke: {
            width: [0, 0, 0, 3],
            curve: 'smooth'
        },
        plotOptions: {
            bar: {
                columnWidth: '55%',
                borderRadius: 4,
                borderRadiusApplication: 'end',
                borderRadiusWhenStacked: 'last',
                dataLabels: {
                    total: {
                        enabled: true,
                        style: {
                            fontSize: '12px', fontWeight: 700, color: '#475569'
                        },
                        formatter: (val) => val.toLocaleString(),
                        offsetY: -8
                    }
                }
            }
        },
        dataLabels: { enabled: false },
        xaxis: {
            categories: [],
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: { style: { colors: '#64748b' } }
        },
        yaxis: [
            {
                title: { text: 'Units Produced', style: { color: '#64748b' } },
                labels: {
                    style: { colors: '#64748b' },
                    formatter: (val) => val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toFixed(0)
                },
            }
        ],
        fill: { opacity: [1, 1, 1, 1] },
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

    chart = new ApexCharts(document.querySelector("#chart"), options);
    chart.render();
};

// --- Cost Data Logic ---

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

// --- Cost Chart Rendering ---
let costChart;

const initCostChart = () => {
    const options = {
        series: [], // Populated dynamically
        chart: {
            height: 350,
            type: 'line', // Mixed type support needed for potential combinations
            stacked: true, // Will be managed in update, but default to stacked bars
            fontFamily: 'Outfit, sans-serif',
            toolbar: { show: false },
            events: {
                legendClick: function (chartContext, seriesIndex, config) {
                    if (seriesIndex < PLANTS.length) {
                        state.visibleCostPlants[seriesIndex] = !state.visibleCostPlants[seriesIndex];
                        saveSettings();
                        updateCostChart(parseInt(document.getElementById('costYearLabel').textContent));
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
        yaxis: { title: { text: 'THB / Unit' } }, // Initial default
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            inverseOrder: true
        }
    };

    costChart = new ApexCharts(document.querySelector("#costChart"), options);
    costChart.render();
};

// Global handler for toggles
window.updateShowState = () => {
    const yearStr = document.getElementById('costYearLabel').textContent;
    if (yearStr) updateCostChart(parseInt(yearStr));
};

const updateCostChart = (year) => {
    document.getElementById('costYearLabel').textContent = year;

    const showCost = document.getElementById('showCostCheck').checked;
    const showKW = document.getElementById('showKWCheck').checked;

    // Data
    const dataSet = generateAnnualCostData(year);

    let series = [];
    let yaxis = [];

    // Logic:
    // 1. If Both: Cost = Bar (Stacked), kW = Line (on separate axis)
    // 2. If Cost Only: Cost = Bar (Stacked)
    // 3. If kW Only: kW = Bar (Stacked) -- Reusing bar visual for primary metric

    if (showCost && showKW) {
        // Dual View
        // Series 1-3: Cost (Bars)
        dataSet.plantCosts.forEach((p, idx) => {
            series.push({
                name: p.name,
                type: 'bar',
                data: p.data,
                color: p.color,
                hidden: !state.visibleCostPlants[idx]
            });
        });

        // Series 4-6: kW (Lines)
        dataSet.plantKW.forEach((p, idx) => {
            series.push({
                name: p.name + ' (kW)',
                type: 'line',
                data: p.data,
                color: p.color,
                showInLegend: false,
                hidden: !state.visibleCostPlants[idx]
            });
        });

        yaxis = [
            {
                seriesName: dataSet.plantCosts[0]?.name,
                title: { text: 'Cost (THB)' },
                show: true,
                decimalsInFloat: 2
            },
            {
                opposite: true,
                title: { text: 'Consumption (kW)' },
                show: true,
                decimalsInFloat: 2
            }
        ];

    } else if (showCost) {
        // Costs Only (Bars)
        dataSet.plantCosts.forEach((p, idx) => {
            series.push({
                name: p.name,
                type: 'bar',
                data: p.data,
                color: p.color,
                hidden: !state.visibleCostPlants[idx]
            });
        });
        yaxis = [{ title: { text: 'Cost (THB)' }, show: true, decimalsInFloat: 2 }];

    } else if (showKW) {
        // kW Only (Bars - reuse stacked bar visual)
        dataSet.plantKW.forEach((p, idx) => {
            series.push({
                name: p.name,
                type: 'bar',
                data: p.data,
                color: p.color,
                hidden: !state.visibleCostPlants[idx]
            });
        });
        yaxis = [{ title: { text: 'Consumption (kW)' }, show: true, decimalsInFloat: 2 }];
    } else {
        // Nothing selected
        series = [{ data: [] }];
        yaxis = [{ show: false }];
    }

    // Update Chart
    // Note: switching stacked true/false in updateOptions can be tricky, but here we always want stacked bars.
    costChart.updateOptions({
        chart: { stacked: true },
        yaxis: yaxis,
        stroke: {
            width: (showCost && showKW) ? [0, 0, 0, 2, 2, 2] : 0 // Lines need width if hybrid
        },
        plotOptions: {
            bar: {
                columnWidth: '60%',
                dataLabels: {
                    total: {
                        enabled: true,
                        formatter: (val) => val ? val.toFixed(2) : '',
                        style: { fontSize: '10px' }
                    }
                }
            }
        }
    });

    costChart.updateSeries(series);
};

// --- Event Listeners ---

document.getElementById('prevBtn').addEventListener('click', () => {
    state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    updateDashboard();
});

document.getElementById('nextBtn').addEventListener('click', () => {
    state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    updateDashboard();
});

// Picker Trigger
const monthLabel = document.getElementById('monthLabel');
const monthPickerInput = document.getElementById('monthPickerInput');

monthLabel.addEventListener('click', () => {
    try {
        // Modern browsers
        monthPickerInput.showPicker();
    } catch (error) {
        // Fallback (might be blocked by some browser security policies if not directly user initiated)
        // But since this is inside a click handler, it should work for .click() if visible
        // Make it temporarily pointer-interactive for the click
        monthPickerInput.style.pointerEvents = 'auto';
        monthPickerInput.click();
        monthPickerInput.style.pointerEvents = 'none';
    }
});

// Picker Change Listener
monthPickerInput.addEventListener('change', (e) => {
    if (e.target.value) {
        const [y, m] = e.target.value.split('-');
        state.currentDate = new Date(parseInt(y), parseInt(m) - 1, 1);
        updateDashboard();
    }
});


document.getElementById('compareToggle').addEventListener('change', (e) => {
    state.showComparison = e.target.checked;
    saveSettings();
    updateDashboard();
});

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    initChart();
    initCostChart();
    updateDashboard();
});

// --- PDF Download Logic ---
// --- PDF Download Logic ---
const downloadPDF = async () => {
    const { jsPDF } = window.jspdf;

    // 1. Setup Document (A4 Landscape: 297mm x 210mm)
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const availableWidth = pageWidth - (margin * 2);

    const now = new Date();
    const downloadTime = now.toLocaleString('th-TH');
    const timestampStr = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '-' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0');

    const currentMonthLabel = state.currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const fileName = `Dashboard_${state.currentDate.getMonth() + 1}-${state.currentDate.getFullYear()}_Download${timestampStr}.pdf`;

    // Helper: Get Image Dimensions
    const getImageDimensions = (base64) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.width, h: img.height });
            img.src = base64;
        });
    };

    // Helper: Add Footer
    const addFooter = (pageNumber) => {
        doc.setFontSize(8);
        doc.setTextColor(150);
        const footerText = `Data Period: ${currentMonthLabel} | Downloaded: ${downloadTime} | Page ${pageNumber}`;
        doc.text(footerText, margin, pageHeight - margin);
    };

    // --- PAGE 1: Production Overview ---

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("Daily FG Production Overview", margin, margin + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Finished Goods Output by Plant - ${currentMonthLabel}`, margin, margin + 18);

    let finalY = 40;

    try {
        // Capture Chart 1
        const chart1URI = await chart.dataURI();

        if (chart1URI && chart1URI.imgURI) {
            const dims = await getImageDimensions(chart1URI.imgURI);
            const ratio = dims.h / dims.w;
            // Scale to full width
            const imgHeight = availableWidth * ratio;

            doc.addImage(chart1URI.imgURI, 'PNG', margin, 40, availableWidth, imgHeight);
            finalY = 40 + imgHeight + 10;
        }

        // Add Summary Text
        // Ensure we don't overflow page if chart is huge (unlikely for landscape)
        if (finalY > 160) finalY = 160;

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Monthly Summary", margin, finalY);

        finalY += 10;
        doc.setFontSize(10);

        const dataSet = generateOrRetrieveData(state.currentDate);
        let grandTotal = 0;
        let xPos = margin;

        dataSet.plantData.forEach((p, i) => {
            const total = p.data.reduce((a, b) => a + b, 0);
            grandTotal += total;

            doc.setTextColor(100);
            doc.text(`${p.name} Total`, xPos, finalY);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text(`${total.toLocaleString()}`, xPos, finalY + 6);
            doc.setFont("helvetica", "normal");

            xPos += 50;
        });

        doc.setTextColor(100);
        doc.text(`Grand Total`, xPos, finalY);
        doc.setTextColor(220, 38, 38);
        doc.setFont("helvetica", "bold");
        doc.text(`${grandTotal.toLocaleString()}`, xPos, finalY + 6);
        doc.setFont("helvetica", "normal");

    } catch (e) {
        console.error("Error generating Page 1", e);
        doc.text("Error generating chart image.", margin, 60);
    }

    addFooter(1);

    // --- PAGE 2: Electricity Cost ---
    doc.addPage();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("Electricity Cost Analysis", margin, margin + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Annual Metrics - Year ${state.currentDate.getFullYear()}`, margin, margin + 18);

    try {
        const chart2URI = await costChart.dataURI();

        if (chart2URI && chart2URI.imgURI) {
            const dims = await getImageDimensions(chart2URI.imgURI);
            const ratio = dims.h / dims.w;
            const imgHeight = availableWidth * ratio;

            doc.addImage(chart2URI.imgURI, 'PNG', margin, 40, availableWidth, imgHeight);
        }

    } catch (e) {
        console.error("Error generating Page 2", e);
        doc.text("Error generating chart image.", margin, 60);
    }

    addFooter(2);

    doc.save(fileName);
};

const updateDashboard = () => {
    const daysInMonth = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Text Updates
    const monthName = state.currentDate.toLocaleString('default', { month: 'long' });
    const year = state.currentDate.getFullYear();
    const dateStr = `${monthName} ${year}`;

    document.getElementById('monthLabel').innerHTML = `${dateStr} <i class="ri-calendar-2-line" style="font-size: 0.9em; opacity: 0.5;"></i>`;
    document.getElementById('monthPickerInput').value = state.currentDate.toISOString().slice(0, 7);

    // Update Cost Chart (Year Sync)
    // Even if future month is selected for main chart, we might still show cost for that year?
    // User requirement: "If graph 1 selects Jan 2025, graph 2 shows cost for year 2025"
    // Assuming simplified logic: Always update Cost Chart based on Year.
    // If Year > 2026, we might want to handle it, but for now we just generate it.
    updateCostChart(year);

    if (isFutureDate(state.currentDate)) {
        // Future Mode (Main Chart)
        document.getElementById('noDataOverlay').classList.add('active');
        document.getElementById('chart').style.opacity = '0.1';
        document.getElementById('summaryGrid').innerHTML = '';
        return;
    } else {
        // Active Mode
        document.getElementById('noDataOverlay').classList.remove('active');
        document.getElementById('chart').style.opacity = '1';
    }

    // Data Retrieval
    const dataSet = generateOrRetrieveData(state.currentDate);

    // Construct Series
    let finalSeries = dataSet.plantData.map((p, idx) => ({
        name: p.name,
        type: 'bar',
        data: p.data,
        hidden: !state.visiblePlants[idx] // Explicitly control visibility
    }));

    // Line Logic
    if (state.showComparison) {
        const lastYearTotalData = calculateLastYearTotal(dataSet);
        finalSeries.push({
            name: `Total (${year - 1})`,
            type: 'line',
            data: lastYearTotalData
        });
    }

    // Update Chart
    chart.updateOptions({
        xaxis: { categories: daysArray },
        stroke: {
            width: state.showComparison ? [0, 0, 0, 4] : [0, 0, 0]
        }
    });
    chart.updateSeries(finalSeries);

    updateSummary(dataSet.plantData);
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
                Total ${series.name}
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
