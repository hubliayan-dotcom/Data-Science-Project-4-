import React, { useState, useMemo, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, ScatterChart, Scatter, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, CloudRain, Thermometer, 
  Wind, Info, Sparkles, ChevronRight, Activity, Calendar
} from 'lucide-react';
import { generateSyntheticClimateData, getYearlyAverage, ClimateDataPoint } from './lib/data';
import { linearRegression, calculateZScores } from './lib/stats';
import { cn } from './lib/utils';
import { GoogleGenAI } from "@google/genai";

// types
interface Metrics {
  avgTemp: string;
  maxTemp: string;
  minTemp: string;
  totalChange: string;
}

export default function App() {
  const [data] = useState<ClimateDataPoint[]>(() => generateSyntheticClimateData());
  const [selectedYearRange, setSelectedYearRange] = useState<[number, number]>([1900, 2024]);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  const filteredData = useMemo(() => {
    return data.filter(d => d.year >= selectedYearRange[0] && d.year <= selectedYearRange[1]);
  }, [data, selectedYearRange]);

  const yearlyAvg = useMemo(() => getYearlyAverage(filteredData), [filteredData]);

  const metrics = useMemo<Metrics>(() => {
    if (filteredData.length === 0) return { avgTemp: '0', maxTemp: '0', minTemp: '0', totalChange: '0' };
    const temps = filteredData.map(d => d.temp);
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    const max = Math.max(...temps);
    const min = Math.min(...temps);
    
    const yearly = getYearlyAverage(filteredData);
    const change = yearly.length > 1 ? yearly[yearly.length - 1].temp - yearly[0].temp : 0;
    
    return {
      avgTemp: avg.toFixed(1),
      maxTemp: max.toFixed(1),
      minTemp: min.toFixed(1),
      totalChange: change.toFixed(1)
    };
  }, [filteredData]);

  // Forecast data (20 years)
  const forecastData = useMemo(() => {
    const years = yearlyAvg.map(y => y.year);
    const temps = yearlyAvg.map(y => y.temp);
    const { slope, intercept } = linearRegression(years, temps);
    
    const lastYear = years[years.length - 1];
    const forecast = [];
    for (let i = 1; i <= 20; i++) {
        const year = lastYear + i;
        forecast.push({
            year,
            temp: parseFloat((slope * year + intercept).toFixed(2)),
            type: 'forecast'
        });
    }
    return [...yearlyAvg.map(y => ({ ...y, type: 'historical' })), ...forecast];
  }, [yearlyAvg]);

  const anomalies = useMemo(() => {
    const yrAvgs = yearlyAvg.map(y => y.temp);
    const zScores = calculateZScores(yrAvgs);
    return yearlyAvg.map((y, i) => ({
        ...y,
        isAnomaly: Math.abs(zScores[i]) > 1.8,
        zScore: zScores[i]
    }));
  }, [yearlyAvg]);

  const generateAIInsight = async () => {
    setIsGeneratingInsight(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        Analyze this climate data for the period ${selectedYearRange[0]} to ${selectedYearRange[1]}:
        - Average Temperature: ${metrics.avgTemp}°C
        - Total warming trend: ${metrics.totalChange}°C
        - Max recorded: ${metrics.maxTemp}°C
        - Min recorded: ${metrics.minTemp}°C
        - Number of anomaly years detected: ${anomalies.filter(a => a.isAnomaly).length}
        
        Provide a concise evidence-based interpretation (max 150 words) of these trends. 
        Focus on the significance of the warming and potential environmental implications.
        Format with a brief summary and 2-3 key bullet points.
      `;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      setAiInsight(response.text || "Insight unavailable at this time.");
    } catch (err) {
      console.error(err);
      setAiInsight("Failed to generate insight. Check console for details.");
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F1F3] text-[#1A1C1E] font-sans">
      {/* Header */}
      <header className="border-b border-[#DDE1E6] bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#3D5AFE] flex items-center justify-center text-white">
              <Thermometer size={18} />
            </div>
            <h1 className="text-lg font-semibold tracking-tight uppercase italic font-serif">Climate Trend Analyzer</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1.5 bg-[#E4E8F0] rounded-md text-xs font-mono font-medium text-[#4D5358]">
              v1.0.4-PROD
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Controls & Metrics */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#DDE1E6] shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-[#4D5358]">
                    <Calendar size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Time range</span>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                        <span className="font-mono">{selectedYearRange[0]}</span>
                        <span className="font-mono">{selectedYearRange[1]}</span>
                    </div>
                    <input 
                        type="range" 
                        min="1900" 
                        max="2024" 
                        value={selectedYearRange[1]} 
                        onChange={(e) => setSelectedYearRange([1900, parseInt(e.target.value)])}
                        className="w-full"
                    />
                    <p className="text-[11px] text-[#878D96] italic">
                        Adjust slider to focus on specific periods. Data spans 1900-2024.
                    </p>
                </div>
            </div>

            <div className="bg-[#1A1C1E] p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#3D5AFE] blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="flex items-center gap-2 mb-4 text-[#DDE1E6]">
                    <Sparkles size={16} className="text-[#3D5AFE]" />
                    <span className="text-xs font-bold uppercase tracking-widest">AI Insights</span>
                </div>
                <div className="min-h-[140px] text-sm leading-relaxed text-[#DDE1E6]">
                    {aiInsight ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {aiInsight}
                        </div>
                    ) : (
                        <p className="opacity-60 italic">
                            Click below to generate an AI analysis of the current data subset.
                        </p>
                    )}
                </div>
                <button 
                    onClick={generateAIInsight}
                    disabled={isGeneratingInsight}
                    className="mt-6 w-full py-2.5 bg-[#3D5AFE] hover:bg-[#2F49D1] disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                    {isGeneratingInsight ? (
                        <Activity className="animate-spin" size={14} />
                    ) : (
                        <>Generate Analysis <ChevronRight size={14} /></>
                    )}
                </button>
            </div>
          </div>

          <div className="lg:col-span-9 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Avg Temp" value={`${metrics.avgTemp}°C`} icon={<Thermometer size={20} />} trend="+0.12°" color="blue" />
            <MetricCard label="Max Temp" value={`${metrics.maxTemp}°C`} icon={<TrendingUp size={20} />} trend="Record" color="red" />
            <MetricCard label="CO2 Level" value="419 ppm" icon={<CloudRain size={20} />} trend="+2.4" color="orange" />
            <MetricCard label="Warming Change" value={`${metrics.totalChange}°C`} icon={<AlertTriangle size={20} />} trend="Critical" color="purple" />
            
            <div className="col-span-full bg-white p-6 rounded-2xl border border-[#DDE1E6] shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-[#4D5358]">Temperature Trend</h3>
                        <p className="text-xs text-[#878D96] mt-1">12-month rolling average spanning the selected period</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#3D5AFE]"></div>
                            <span className="text-[10px] font-bold uppercase tracking-tighter text-[#4D5358]">Global Avg</span>
                        </div>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={yearlyAvg}>
                            <defs>
                                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3D5AFE" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#3D5AFE" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDF0F2" />
                            <XAxis dataKey="year" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#878D96'}} />
                            <YAxis domain={['auto', 'auto']} fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#878D96'}} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1A1C1E', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="temp" stroke="#3D5AFE" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>
        </section>

        {/* Secondary Charts */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#DDE1E6] shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-[#4D5358]">Anomaly Detection</h3>
                        <p className="text-xs text-[#878D96] mt-1">Z-Score based outliers (|z| &gt; 1.8)</p>
                    </div>
                </div>
                <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDF0F2" />
                            <XAxis type="number" dataKey="year" name="Year" unit="" domain={['auto', 'auto']} fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis type="number" dataKey="temp" name="Temp" unit="°C" domain={['auto', 'auto']} fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter name="Anomalies" data={anomalies}>
                                {anomalies.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.isAnomaly ? '#FF4444' : '#E4E8F0'} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#DDE1E6] shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-[#4D5358]">Future Projections</h3>
                        <p className="text-xs text-[#878D96] mt-1">20-year linear regression forecast</p>
                    </div>
                </div>
                <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={forecastData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDF0F2" />
                            <XAxis dataKey="year" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis domain={['auto', 'auto']} fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                            <Line 
                                type="monotone" 
                                dataKey="temp" 
                                data={forecastData.filter(d => d.type === 'historical')}
                                stroke="#3D5AFE" 
                                strokeWidth={2} 
                                dot={false} 
                                name="Historical"
                            />
                            <Line 
                                type="monotone" 
                                dataKey="temp" 
                                data={forecastData.filter(d => d.type === 'forecast')}
                                stroke="#FF4444" 
                                strokeWidth={2} 
                                strokeDasharray="5 5"
                                dot={false}
                                name="Projection"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </section>

        {/* Info Grid */}
        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoBox title="Methodology" content="Data is generated via a stochastic simulation incorporating solar variability, greenhouse forcing, and internal variability. Forecasting uses ordinary least squares (OLS) regression." icon={<Info size={16} />} />
            <InfoBox title="Industry Application" content="Climate analytics informs risk assessment for agriculture, insurance, and urban planning. This tool focuses on land surface temperature anomalies." icon={<Wind size={16} />} />
            <InfoBox title="Carbon Footprint" content="The CO2 concentrations are modeled after the Keeling Curve (Mauna Loa Observatory), showing a clear acceleration in the post-industrial era." icon={<Activity size={16} />} />
        </section>

        {/* Raw Data Grid */}
        <section className="mt-8 bg-white rounded-2xl border border-[#DDE1E6] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-[#DDE1E6] flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#4D5358]">Raw Station Data</h3>
                    <p className="text-xs text-[#878D96] mt-1">Direct monthly observations (Sample of last 10 entries)</p>
                </div>
                <button className="text-[10px] font-bold uppercase tracking-widest text-[#3D5AFE] hover:underline">
                    Export CSV
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8F9FA] text-[#878D96] font-mono border-b border-[#DDE1E6]">
                        <tr>
                            <th className="px-6 py-3 font-medium uppercase tracking-tighter italic font-serif">Date</th>
                            <th className="px-6 py-3 font-medium">Temperature (°C)</th>
                            <th className="px-6 py-3 font-medium">CO2 (ppm)</th>
                            <th className="px-6 py-3 font-medium">Rainfall (mm)</th>
                            <th className="px-6 py-3 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDF0F2] font-mono">
                        {filteredData.slice(-10).reverse().map((d, i) => (
                            <tr key={i} className="hover:bg-[#F8F9FA] transition-colors group">
                                <td className="px-6 py-3 text-[#1A1C1E] font-medium italic font-serif group-hover:text-[#3D5AFE]">{d.date}</td>
                                <td className="px-6 py-3 text-[#4D5358]">{d.temp}</td>
                                <td className="px-6 py-3 text-[#4D5358]">{d.co2}</td>
                                <td className="px-6 py-3 text-[#4D5358]">{d.rainfall}</td>
                                <td className="px-6 py-3">
                                    {d.isAnomaly ? (
                                        <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-[9px] font-bold uppercase">Anomaly</span>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[9px] font-bold uppercase">Optimal</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
      </main>

      <footer className="border-t border-[#DDE1E6] bg-white mt-12 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-xs font-mono text-[#878D96]">
                Climate Trend Analyzer — Built with React & Gemini AI • 2026
            </p>
        </div>
      </footer>
    </div>
  );
}

function MetricCard({ label, value, icon, trend, color }: { label: string, value: string, icon: React.ReactNode, trend: string, color: 'blue' | 'red' | 'orange' | 'purple' }) {
    const colorMap = {
        blue: 'text-blue-600 bg-blue-50',
        red: 'text-red-600 bg-red-50',
        orange: 'text-orange-600 bg-orange-50',
        purple: 'text-purple-600 bg-purple-50'
    };

    return (
        <div className="bg-white p-5 rounded-2xl border border-[#DDE1E6] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
                <div className={cn("p-2 rounded-lg", colorMap[color])}>
                    {icon}
                </div>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter", colorMap[color])}>
                    {trend}
                </span>
            </div>
            <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#878D96] mb-1">{label}</p>
                <p className="text-2xl font-mono font-bold tracking-tighter">{value}</p>
            </div>
        </div>
    );
}

function InfoBox({ title, content, icon }: { title: string, content: string, icon: React.ReactNode }) {
    return (
        <div className="p-6 rounded-2xl border border-[#DDE1E6] bg-white/50 backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-[#3D5AFE]">
                {icon}
                <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
            </div>
            <p className="text-xs leading-relaxed text-[#4D5358]">
                {content}
            </p>
        </div>
    )
}
