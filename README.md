# Electric Chart Dashboard

A modern, interactive dashboard for visualizing **Finished Goods (FG) Production** and **Electricity Cost Analysis**. Built with vanilla web technologies and ApexCharts, designed for clear insights into manufacturing performance and energy metrics across multiple plants (LP, Plating, Brazing).

## 🚀 Key Features

### 🏭 FG Production Dashboard
- **Annual Overview**: Visualize monthly production units per plant in a stacked bar format.
- **Year-over-Year Comparison**: Toggle "Last Year" to compare current performance with historical data.
- **Plant Filtering**: Interactive legend to toggle specific plant data (LP, Plating, Brazing) globally across all charts.

### ⚡ Electricity Cost Analysis
- **Three-Pillar Metrics**: Dedicated charts for:
  - 💰 **Cost (THB)**
  - ⚡ **Consumption (kWh)**
  - 🌱 **CO₂ Emissions (kgCO₂e)**
- **Realistic Data Modeling**: Includes seasonality factors (e.g., higher oven usage in Q4) and variable FT rates.
- **Deep Dive Mode**: "Detail" buttons open specialized views for Daily Totals and Per-Unit Averages.

### 🧭 Unified Navigation & UX
- **Global Date Control**: Single Month/Year picker synchronizes the entire dashboard (Main Graph, Cost Charts, and Modal Details).
- **Drill-Down Modals**: Click "Detail" or interactive elements to view daily breakdowns with total value labels.
- **Responsive Design**: Clean layout with separate cards for key metrics.

## 🛠️ Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Visualization**: [ApexCharts.js](https://apexcharts.com/)
- **Icons**: [Remix Icon](https://remixicon.com/)
- **Font**: Google Fonts (Outfit)

## 📦 Getting Started

This project is a static web application. No complex build step or backend server is required.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/wirat0155/ElectricChart.git
   ```
2. **Open the Dashboard**:
   - Simply double-click `index.html` to open it in your web browser.
   - Or serve it using a local static server (e.g., `Live Server` in VS Code).

## 📖 Usage Guide

- **Navigation**: Use the arrows or the date picker in the top header to change the view period. All charts update instantly.
- **Comparisons**: Toggle the "Last Year" switch to overlay the previous year's total line on the charts.
- **Filtering**: Click on any plant name in the chart legend (e.g., "Brazing") to hide/show it everywhere.
- **Details**: Click the "Detail" buttons on specific cards to explore daily trends inside a modal.

## 📄 License
Private / Internal Use Only.
