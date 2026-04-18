import { addMonths, format } from 'date-fns';
import { REAL_NASA_TEMP_ANOMALIES, REAL_NOAA_CO2 } from './public_data_raw';

export interface ClimateDataPoint {
  date: string;
  timestamp: number;
  year: number;
  month: number;
  temp: number;
  co2: number;
  region: string;
  // Engineered Features
  tempLag1: number;
  tempLag12: number;
  rollingAvg12: number;
  isAnomaly: boolean;
  isPublicDataset: boolean;
}

const REGIONS = ['Global', 'Arctic', 'Tropics', 'Antarctic'];

/**
 * Data Ingestion Pipeline
 * Integrates REAL Public Datasets (NASA/NOAA) with Virtual Simulation.
 */
export async function ingestPublicDatasets(): Promise<ClimateDataPoint[]> {
  const allData: ClimateDataPoint[] = [];

  REGIONS.forEach(region => {
    const start = new Date(1880, 0, 1);
    const months = (2024 - 1880 + 1) * 12;
    
    // Regional Constants
    const baseTemp = region === 'Arctic' ? -18 : region === 'Tropics' ? 25 : 14.5;
    const warmingRate = region === 'Arctic' ? 0.045 : 0.015; 

    let regionPoints: ClimateDataPoint[] = [];

    for (let i = 0; i < months; i++) {
        const d = addMonths(start, i);
        const year = d.getFullYear();
        const monthNum = d.getMonth() + 1;

        // --- Data Fusion: Public Dataset + Simulation ---
        let temp = 0;
        let co2 = 0;
        let isPublicDataset = false;

        // 1. Check for real NASA Temperature Anomalies (Public)
        const realTemp = REAL_NASA_TEMP_ANOMALIES.find(r => r.year === year);
        if (realTemp && region === 'Global') {
            temp = 14.2 + realTemp.temp; // Base 14.2 + anomaly
            isPublicDataset = true;
        } else {
            // Virtual Simulation (Science-Based)
            const t = i / months;
            const forced = (warmingRate * 12 * i / 12) + (0.5 * Math.pow(t, 2.8) * 15);
            const seasonality = (region === 'Tropics' ? 2 : 10) * Math.sin((2 * Math.PI * (monthNum - 1)) / 12);
            const enso = 0.9 * Math.sin((2 * Math.PI * i) / (5.5 * 12));
            const noise = (Math.random() - 0.5) * 1.5;
            temp = baseTemp + forced + seasonality + enso + noise;
        }

        // 2. Check for real NOAA CO2 (Public)
        const realCO2 = REAL_NOAA_CO2.find(r => r.year === year);
        if (realCO2) {
            co2 = realCO2.co2;
        } else {
            const t = i / months;
            co2 = 285 + (135 * Math.pow(t, 2.2)) + (Math.random() * 0.5);
        }

        regionPoints.push({
            date: format(d, 'yyyy-MM-dd'),
            timestamp: d.getTime(),
            year,
            month: monthNum,
            temp: parseFloat(temp.toFixed(2)),
            co2: parseFloat(co2.toFixed(2)),
            region,
            tempLag1: 0, 
            tempLag12: 0,
            rollingAvg12: 0,
            isAnomaly: false,
            isPublicDataset
        });
    }

    // Advanced Feature Engineering Pipeline
    regionPoints = regionPoints.map((p, i) => {
        const lag1 = i > 0 ? regionPoints[i-1].temp : p.temp;
        const lag12 = i >= 12 ? regionPoints[i-12].temp : p.temp;
        
        // Rolling Window (Sliding Window feature)
        let sum = 0;
        let count = 0;
        for (let j = Math.max(0, i - 11); j <= i; j++) {
            sum += regionPoints[j].temp;
            count++;
        }
        const rolling = sum / count;

        return {
            ...p,
            tempLag1: lag1,
            tempLag12: lag12,
            rollingAvg12: parseFloat(rolling.toFixed(2)),
        };
    });

    allData.push(...regionPoints);
  });

  return allData;
}
