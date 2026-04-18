# Climate Trend Analyzer 🌡️

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Climate Trend Analyzer** is a high-fidelity data science dashboard designed to process, analyze, and visualize decades of historical climate data. The project applies statistical analysis, machine learning concepts (anomaly detection), and AI-driven insights to extract actionable patterns about long-term environmental changes.

## 🚀 Live Features

- **Dynamic Trend Analysis**: Visualizes annual variations and long-term temperature shifts using Area charts.
- **AI-Powered Insights**: Integrates Google's **Gemini AI** to provide professional narrative interpretations of the data.
- **Anomaly Detection**: Statistical identification of record-breaking years using Z-score thresholding.
- **20-Year Forecasting**: Linear regression modeling to project future temperature ranges.
- **Modular Data Engine**: Stochastic simulation of climate indicators including CO2 ppm and rainfall patterns.
- **Professional Data Grid**: Mission-control style grid for inspecting raw station records.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS 4.0
- **Visualization**: Recharts
- **AI Integration**: @google/genai (Gemini 3 Flash)
- **Utilities**: Lucide React, date-fns, clsx, tailwind-merge
- **Statistics**: Custom OLS Regression & Z-Score algorithms

## 📂 Project Structure

```text
Climate-Trend-Analyzer/
├── src/
│   ├── components/      # (Optional) Reusable UI components
│   ├── lib/
│   │   ├── data.ts      # Synthetic climate data generator
│   │   ├── stats.ts     # Statistical utilities (Regression, Z-Scores)
│   │   └── utils.ts     # Tailwind & Class merger helpers
│   ├── App.tsx          # Main Dashboard entry point
│   ├── index.css        # Global styles & Typography config
│   └── main.tsx         # React DOM hydration
├── metadata.json        # App metadata & permissions
└── package.json         # Project dependencies
```

## ⚙️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Climate-Trend-Analyzer.git
   cd Climate-Trend-Analyzer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file (or set in your environment) with your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## 📊 Methodology

### Data Generation
The application uses a stochastic model (`src/lib/data.ts`) to simulate 124 years of climate data. It incorporates:
- **Base Warming**: Linear + Exponential growth components.
- **Keeling Curve**: Modeled CO2 ppm acceleration.
- **Internal Variability**: White noise + Seasonality (sine waves).
- **Anomalies**: Random stochastic shocks (2% probability per month).

### Statistics
- **Trendline**: Calculated via Ordinary Least Squares (OLS) regression.
- **Anomaly Detection**: Flags points where $|z| > 1.8$ relative to the filtered mean.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request or open an issue for any bugs or feature requests.

## 📄 License
This project is licensed under the Apache-2.0 License - see the [LICENSE](LICENSE) file for details.

---
Built with ❤️ by [Your Name]
