export function linearRegression(x: number[], y: number[]) {
  const n = x.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export function calculateZScores(data: number[]) {
  const n = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const stdDev = Math.sqrt(data.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / n);
  
  return data.map(x => (x - mean) / stdDev);
}

export function movingAverage(data: number[], windowSize: number) {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < windowSize - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += data[i - j];
    }
    result.push(sum / windowSize);
  }
  return result;
}
