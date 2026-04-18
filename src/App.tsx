import React, { useState, useMemo, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, ScatterChart, Scatter, Cell, Legend, ComposedChart, Bar
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, CloudRain, Thermometer, 
  Wind, Info, Sparkles, ChevronRight, Activity, Calendar, Globe, Layers, BarChart3, Database
} from 'lucide-react';
import { ingestPublicDatasets, ClimateDataPoint } from './lib/data';
import { calculatePerformance, holtWinters, randomForestRegressor, detectIsolationForest, arimaStoreForecast } from './lib/stats';
import { cn } from './lib/utils';
import { GoogleGenAI } from "@google/genai";

export default function App() {
  const [allData, setAllData] = useState<ClimateDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('Global');
  const [selectedYearRange, setSelectedYearRange] = useState<[number, number]>([1880, 2024]);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  useEffect(() => {
    async function init() {
        const data = await ingestPublicDatasets();
        setAllData(data);
        setIsLoading(false);
    }
    init();
  }, []);

  // Regional Pipeline
  const filteredData = useMemo(() => {
    if (!allData.length) return [];
    return allData.filter(d => 
        d.region === selectedRegion && 
        d.year >= selectedYearRange[0] && 
        d.year <= selectedYearRange[1]
    );
  }, [allData, selectedRegion, selectedYearRange]);

  const yearlyStats = useMemo(() => {
    if (!filteredData.length) return [];
    const years = [...new Set(filteredData.map(d => d.year))];
    const stats = years.map(year => {
      const yearData = filteredData.filter(d => d.year === year);
      const avgTemp = yearData.reduce((acc, d) => acc + d.temp, 0) / yearData.length;
      const avgCo2 = yearData.reduce((acc, d) => acc + d.co2, 0) / yearData.length;
      return {
        year,
        temp: parseFloat(avgTemp.toFixed(2)),
        co2: parseFloat(avgCo2.toFixed(1))
      };
    });

    const anomalies = detectIsolationForest(stats.map(s => s.temp));
    return stats.map((s, i) => ({ ...s, isAnomaly: anomalies[i] }));
  }, [filteredData]);

  // ML Forecasting Benchmarks
  const { forecastData, benchmarks } = useMemo(() => {
    if (yearlyStats.length < 24) return { forecastData: [], benchmarks: null };
    
    // Train Test Split 70/30 for Validation
    const split = Math.floor(yearlyStats.length * 0.7);
    const train = yearlyStats.slice(0, split).map(s => s.temp);
    const test = yearlyStats.slice(split).map(s => s.temp);
    
    // Model 1: Random Forest Ensemble
    const years_train = yearlyStats.slice(0, split).map(s => s.year);
    const years_test = yearlyStats.slice(split).map(s => s.year);
    const rf_test_preds = randomForestRegressor(years_train, train, years_test);
    const rf_metrics = calculatePerformance(test, rf_test_preds);

    // Final Forecast Projections (30 Years)
    const lastYear = yearlyStats[yearlyStats.length - 1].year;
    const future_years = Array.from({ length: 30 }, (_, i) => lastYear + i + 1);
    
    const rf_forecast = randomForestRegressor(
        yearlyStats.map(s => s.year), 
        yearlyStats.map(s => s.temp), 
        future_years
    );

    const hw_forecast = holtWinters(yearlyStats.map(s => s.temp), 1, 0.4, 0.3, 0.2, 30);
    
    // Model 3: ARIMA (p=5)
    const arima_forecast = arimaStoreForecast(yearlyStats.map(s => s.temp), 5, 30);

    const combined = future_years.map((y, i) => ({
        year: y,
        rf: parseFloat(rf_forecast[i].toFixed(2)),
        hw: parseFloat(hw_forecast[i].toFixed(2)),
        arima: parseFloat(arima_forecast[i].toFixed(2)),
        type: 'forecast'
    }));

    return { 
        forecastData: [
            ...yearlyStats.map(s => ({ ...s, type: 'historical' })), 
            ...combined 
        ], 
        benchmarks: rf_metrics 
    };
  }, [yearlyStats]);

  const generateAIInsight = async () => {
    setIsGeneratingInsight(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        Role: Senior Research Analyst at NOAA.
        Context: ${selectedRegion} Region Analysis (${selectedYearRange[0]}-${selectedYearRange[1]}).
        
        Data Ingested:
        - Thermal Trend Validation (RF Model R²): ${benchmarks?.r2}
        - Current CO2 level: ${yearlyStats[yearlyStats.length-1]?.co2} ppm
        - Statistical Anomalies: ${yearlyStats.filter(s => s.isAnomaly).length} years
        
        Task: Provide a technical summary of the climate trajectory. 
        Discuss the convergence (or divergence) of the Random Forest vs Holt-Winters forecasts.
        Relate findings to global carbon budgets. (Max 150 words).
      `;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      setAiInsight(response.text || "Report generation failed.");
    } catch (err) {
      setAiInsight("Scientific Gateway Error: Request timed out.");
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-[#111827] font-sans">
      <aside className="fixed left-0 top-0 h-full w-64 bg-[#111827] z-40 hidden lg:flex flex-col p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-10 pb-6 border-b border-[#374151]">
            <div className="w-10 h-10 rounded-xl bg-[#3D5AFE] flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Database size={22} />
            </div>
            <div>
                <h1 className="font-bold text-sm tracking-tight text-white uppercase italic">ClimateNet</h1>
                <p className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-widest">Dataset v4.2</p>
            </div>
        </div>

        <nav className="space-y-1">
            <NavItem icon={<Activity size={18} />} label="Regional Analytics" active />
            <NavItem icon={<BarChart3 size={18} />} label="Ensemble Models" />
            <NavItem icon={<Layers size={18} />} label="Station Ingestion" />
            <NavItem icon={<Wind size={18} />} label="Flux Analysis" />
        </nav>

        <div className="mt-auto p-4 bg-[#1F2937] rounded-xl border border-[#374151]">
            <p className="text-[10px] font-bold text-[#D1D5DB] uppercase tracking-widest mb-2">Ingestion Source</p>
            <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                <span className="text-xs font-medium text-white">NASA GISS (V4)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                <span className="text-xs font-medium text-white">NOAA MLO (Monthly)</span>
            </div>
        </div>
      </aside>

      <div className="lg:ml-64">
        {/* Top Navbar */}
        <header className="h-16 border-b border-[#E5E7EB] bg-white sticky top-0 z-30 flex items-center justify-between px-8">
            <div className="flex items-center gap-8 text-[#4B5563]">
                <select 
                    value={selectedRegion} 
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="bg-transparent text-sm font-bold border-none focus:ring-0 cursor-pointer text-[#111827]"
                >
                    {['Global', 'Arctic', 'Tropics', 'Antarctic'].map(r => (
                        <option key={r} value={r}>{r} Laboratory</option>
                    ))}
                </select>

                <div className="h-4 w-px bg-[#E5E7EB]"></div>

                <div className="flex items-center gap-4 min-w-[300px]">
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest whitespace-nowrap">Observation Window</span>
                    <input 
                        type="range" min="1880" max="2024" value={selectedYearRange[1]} 
                        onChange={(e) => setSelectedYearRange([1880, parseInt(e.target.value)])}
                        className="flex-1 accent-[#3D5AFE] h-1.5 bg-gray-200 rounded-full cursor-pointer appearance-none"
                    />
                </div>
            </div>

            <div className="hidden sm:flex items-center gap-6">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">MAE Score</span>
                    <span className="text-xs font-mono font-bold">{benchmarks?.mae}</span>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#111827] text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-black/10">
                    <CloudRain size={16} /> <span>Download GRIB</span>
                </button>
            </div>
        </header>

        <main className="p-8 max-w-[1400px] mx-auto">
            {/* Model Insight Alert */}
            <section className="mb-10 lg:flex gap-8 items-stretch">
                <div className="flex-1 bg-white p-8 rounded-3xl border border-[#E5E7EB] shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full"></div>
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-[#111827] italic font-serif">Deep Climate Trajectory</h2>
                            <p className="text-xs text-[#6B7280] font-bold mt-1 uppercase tracking-widest">Ensemble Visualization: Historical + Forecast</p>
                        </div>
                        <div className="flex gap-4">
                            <LegendItem color="#3D5AFE" label="Random Forest" />
                            <LegendItem color="#F43F5E" label="Holt-Winters" />
                            <LegendItem color="#10B981" label="ARIMA (p=5)" />
                        </div>
                    </div>

                    <div className="h-[420px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={forecastData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="year" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} />
                                <YAxis domain={['auto', 'auto']} fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#111827', borderRadius: '12px', border: 'none', color: '#fff' }}
                                />
                                <Line type="monotone" dataKey="temp" stroke="#E5E7EB" strokeWidth={1} dot={false} strokeDasharray="3 3" />
                                <Line type="monotone" dataKey="rf" stroke="#3D5AFE" strokeWidth={3} dot={false} name="RF Projection" />
                                <Line type="stepAfter" dataKey="hw" stroke="#F43F5E" strokeWidth={2} dot={false} opacity={0.6} name="Holt-Winters" />
                                <Line type="basis" dataKey="arima" stroke="#10B981" strokeWidth={2} dot={false} name="ARIMA" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:w-[400px] flex flex-col gap-6 mt-8 lg:mt-0">
                    <div className="bg-[#111827] text-white p-8 rounded-3xl shadow-xl flex-1 flex flex-col">
                        <div className="flex items-center gap-3 mb-6">
                            <Sparkles className="text-blue-400" size={20} />
                            <h3 className="text-lg font-bold">Research Analyst</h3>
                        </div>
                        <div className="text-sm leading-relaxed text-gray-400 flex-1 min-h-[140px]">
                            {aiInsight ? (
                                <p className="animate-in fade-in duration-700 whitespace-pre-wrap">{aiInsight}</p>
                            ) : (
                                <p className="italic opacity-50">Ingesting regional data flux. Ready for model interpretation.</p>
                            )}
                        </div>
                        <button 
                            onClick={generateAIInsight}
                            disabled={isGeneratingInsight}
                            className="mt-8 w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-all"
                        >
                            {isGeneratingInsight ? <Activity className="animate-spin inline mr-2" /> : "Run Narrative Analysis"}
                        </button>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-[#E5E7EB] shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="text-red-500" size={16} />
                            <h3 className="text-[10px] font-bold text-[#4B5563] uppercase tracking-widest">Model Outliers</h3>
                        </div>
                        <div className="space-y-3">
                            {yearlyStats.filter(s => s.isAnomaly).slice(-4).reverse().map((s, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-[#111827]">{s.year} Record</span>
                                    <span className="text-xs font-mono text-red-600 font-bold">Anomaly (+{s.temp}°C)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Ingestion Monitor */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard label="Thermal R²" value={benchmarks?.r2.toString() || '0.00' } icon={<Activity />} sub="Model Fit" />
                <MetricCard label="RMSE Index" value={benchmarks?.rmse.toString() || '0.00' } icon={<Layers />} sub="Error Var" />
                <MetricCard label="Station CO2" value={`${yearlyStats[yearlyStats.length-1]?.co2}ppm`} icon={<CloudRain />} sub="Current" />
                <MetricCard label="Warming Rate" value={`+${((yearlyStats[Math.floor(yearlyStats.length/2)]?.temp - yearlyStats[0]?.temp)/20).toFixed(3)}°`} icon={<TrendingUp />} sub="Per Decade" />
            </div>

            {/* Table */}
            <section className="mt-10 bg-white rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-sm">
                <div className="p-8 border-b border-[#F3F4F6] flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-[#111827] uppercase tracking-widest">Ingestion Log (NASA V4 Stream)</h3>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-[#F9FAFB] text-[#6B7280] font-bold uppercase tracking-tighter border-b border-[#F3F4F6]">
                            <tr>
                                <th className="px-8 py-4">Obs Year</th>
                                <th className="px-8 py-4">Regional Temp</th>
                                <th className="px-8 py-4">CO2 Value</th>
                                <th className="px-8 py-4">Is Outlier</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F3F4F6]">
                            {yearlyStats.slice(-8).reverse().map((s, i) => (
                                <tr key={i} className="group hover:bg-gray-50 transition-colors">
                                    <td className="px-8 py-4 font-bold text-[#111827] italic font-serif flex items-center gap-2">
                                        {s.year}
                                        {allData.find(d => d.year === s.year)?.isPublicDataset && (
                                            <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">NASA Data</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-4 font-mono">{s.temp}°C</td>
                                    <td className="px-8 py-4 font-mono text-[#6B7280]">{s.co2} ppm</td>
                                    <td className="px-8 py-4">
                                        {s.isAnomaly ? (
                                            <span className="text-[10px] bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-bold uppercase">Critical</span>
                                        ) : (
                                            <span className="text-[10px] bg-green-50 text-green-600 px-2.5 py-1 rounded-full font-bold uppercase">Stable</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <a href="#" className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
            active ? "bg-[#3D5AFE] text-white shadow-lg shadow-blue-500/10" : "text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white"
        )}>
            {icon}
            <span className="tracking-wide">{label}</span>
        </a>
    );
}

function MetricCard({ label, value, icon, sub }: { label: string, value: string, icon: React.ReactNode, sub: string }) {
    return (
        <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-sm hover:translate-y-[-2px] transition-transform">
            <div className="flex items-center justify-between mb-4">
                <div className="text-[#3D5AFE]">{icon}</div>
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">{sub}</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-1">{label}</p>
            <p className="text-2xl font-bold tracking-tight text-[#111827]">{value}</p>
        </div>
    );
}

function LegendItem({ color, label }: { color: string, label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">{label}</span>
        </div>
    );
}

function LoadingScreen() {
    return (
        <div className="min-h-screen bg-[#111827] flex flex-col items-center justify-center text-white p-8">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-8"></div>
            <h2 className="text-xl font-bold italic font-serif mb-2">Ingesting Public Datasets</h2>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">NASA GISS / NOAA MLO / Global Station Stream</p>
        </div>
    );
}

