import { addMonths, format, startOfMonth } from 'date-fns';

export interface ClimateDataPoint {
  date: string;
  timestamp: number;
  year: number;
  month: number;
  temp: number;
  co2: number;
  rainfall: number;
  isAnomaly?: boolean;
  zScore?: number;
}

export function generateSyntheticClimateData(startYear = 1900, endYear = 2024): ClimateDataPoint[] {
  const data: ClimateDataPoint[] = [];
  const start = new Date(startYear, 0, 1);
  const totalMonths = (endYear - startYear + 1) * 12;

  // Base warming trend: +1.5°C over 124 years (~0.012 per year)
  // We'll use a slightly accelerating trend for realism
  
  for (let i = 0; i < totalMonths; i++) {
    const currentDate = addMonths(start, i);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    // Normalized time (0 to 1)
    const t = i / totalMonths;
    
    // Linear + Exponential warming components
    const baseTemp = 14.0 + (1.2 * t) + (0.4 * Math.pow(t, 2));
    
    // Seasonality (sine wave)
    const seasonality = 5 * Math.sin((2 * Math.PI * (month - 1)) / 12);
    
    // Random noise
    const noise = (Math.random() - 0.5) * 0.8;
    
    // Inject anomalies
    let anomaly = 0;
    const isAnomaly = Math.random() < 0.02; // 2% chance per month
    if (isAnomaly) {
      anomaly = (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 2);
    }

    // CO2 ppm trend (exponential growth from ~300 to ~420)
    const co2 = 310 + (110 * Math.pow(t, 1.5)) + (Math.random() - 0.5) * 2;
    
    // Rainfall mm (seasonal + noise)
    const rainfall = 60 + 20 * Math.sin((2 * Math.PI * (month - 4)) / 12) + (Math.random() - 0.5) * 15;

    data.push({
      date: format(currentDate, 'yyyy-MM-dd'),
      timestamp: currentDate.getTime(),
      year,
      month,
      temp: parseFloat((baseTemp + seasonality + noise + anomaly).toFixed(2)),
      co2: parseFloat(co2.toFixed(1)),
      rainfall: parseFloat(Math.max(0, rainfall).toFixed(1)),
      isAnomaly
    });
  }

  return data;
}

export function getYearlyAverage(data: ClimateDataPoint[]) {
  const years = [...new Set(data.map(d => d.year))];
  return years.map(year => {
    const yearData = data.filter(d => d.year === year);
    const avgTemp = yearData.reduce((acc, d) => acc + d.temp, 0) / yearData.length;
    return {
      year,
      temp: parseFloat(avgTemp.toFixed(2))
    };
  });
}
