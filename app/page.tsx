'use client';

import { useEffect, useState } from 'react';
import { TradingModel, ModelPerformance } from '@/types/trading';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Home() {
  const [models, setModels] = useState<TradingModel[]>([]);
  const [isTrading, setIsTrading] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [performanceHistory, setPerformanceHistory] = useState<{ time: string; [key: string]: string | number }[]>([]);
  const [trainingStatus, setTrainingStatus] = useState<string | null>(null);
  
  // Check if we're in read-only mode (production)
  const isReadOnly = typeof window !== 'undefined' && (
    window.location.hostname === 'kalshi-btc-15-minute.vercel.app' ||
    process.env.NEXT_PUBLIC_READ_ONLY === 'true'
  );

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models');
      const data = await response.json();
      setModels(data.models || []);
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const executeTrade = async () => {
    try {
      const response = await fetch('/api/trade', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.models) {
        setModels(data.models);
        setLastUpdate(new Date());
        
        // Update performance history
        const newPoint: { time: string; [key: string]: string | number } = {
          time: new Date().toLocaleTimeString(),
        };
        data.models.forEach((model: TradingModel) => {
          newPoint[model.name] = model.state.balance;
        });
        setPerformanceHistory(prev => [...prev.slice(-50), newPoint]);
      }
    } catch (error) {
      console.error('Error executing trade:', error);
    }
  };

  const trainModels = async (days: number = 7) => {
    setIsTraining(true);
    setTrainingStatus('Training models on historical data...');
    try {
      const response = await fetch('/api/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, barsPerDay: 96 }),
      });
      const data = await response.json();
      
      if (data.success) {
        setTrainingStatus(`Training complete! Processed ${data.trainingPeriod.totalBars} bars.`);
        // Refresh models after training
        await fetchModels();
        setTimeout(() => setTrainingStatus(null), 5000);
      } else {
        setTrainingStatus(`Training failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error training models:', error);
      setTrainingStatus('Training failed. Please try again.');
    } finally {
      setIsTraining(false);
    }
  };

  const resetModels = async () => {
    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await response.json();
      if (data.models) {
        setModels(data.models);
        setPerformanceHistory([]);
      }
    } catch (error) {
      console.error('Error resetting models:', error);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    if (isTrading) {
      const interval = setInterval(() => {
        executeTrade();
      }, 5000); // Execute trade every 5 seconds for demo

      return () => clearInterval(interval);
    }
  }, [isTrading]);

  const calculatePerformance = (): ModelPerformance[] => {
    return models.map(model => {
      const winningTrades = model.state.trades.filter((trade, index) => {
        return model.state.totalPnL > 0;
      }).length;

      const winRate = model.state.trades.length > 0
        ? (winningTrades / model.state.trades.length) * 100
        : 0;

      return {
        modelId: model.id,
        modelName: model.name,
        startingBalance: 100,
        currentBalance: model.state.balance,
        totalPnL: model.state.totalPnL,
        dailyReturn: model.state.dailyReturn,
        totalTrades: model.state.trades.length,
        winRate,
        maxDrawdown: 0,
      };
    }).sort((a, b) => b.currentBalance - a.currentBalance);
  };

  const performance = calculatePerformance();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Kalshi Bitcoin Trading Models
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Paper trading simulation on Bitcoin 15-minute price movements using real data from fxverify.com
          </p>
        </div>

        {isReadOnly && (
          <div className="mb-6 p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700">
            <strong>Read-Only Mode:</strong> This is a production view. Trading, training, and reset actions are disabled.
          </div>
        )}

        {trainingStatus && (
          <div className={`mb-6 p-4 rounded-lg ${
            trainingStatus.includes('complete') 
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              : trainingStatus.includes('failed')
              ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
          }`}>
            {trainingStatus}
          </div>
        )}

        {!isReadOnly && (
          <div className="mb-6 flex gap-4 flex-wrap">
            <button
              onClick={() => setIsTrading(!isTrading)}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                isTrading
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isTrading ? 'Stop Trading' : 'Start Trading'}
            </button>
            <button
              onClick={executeTrade}
              className="px-6 py-3 rounded-lg font-semibold bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            >
              Execute Single Trade
            </button>
            <button
              onClick={() => trainModels(7)}
              disabled={isTraining}
              className="px-6 py-3 rounded-lg font-semibold bg-purple-500 hover:bg-purple-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTraining ? 'Training...' : 'Train on 7 Days'}
            </button>
            <button
              onClick={() => trainModels(30)}
              disabled={isTraining}
              className="px-6 py-3 rounded-lg font-semibold bg-indigo-500 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTraining ? 'Training...' : 'Train on 30 Days'}
            </button>
            <button
              onClick={resetModels}
              className="px-6 py-3 rounded-lg font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors"
            >
              Reset All Models
            </button>
            {lastUpdate && (
              <div className="px-6 py-3 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center">
                Last update: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {/* Performance Chart */}
        {performanceHistory.length > 0 && (
          <div className="mb-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Balance Over Time
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                {models.map((model, index) => (
                  <Line
                    key={model.id}
                    type="monotone"
                    dataKey={model.name}
                    stroke={`hsl(${index * 60}, 70%, 50%)`}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Performance Comparison */}
        <div className="mb-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Performance Comparison
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="modelName" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="currentBalance" fill="#3b82f6" name="Current Balance ($)" />
              <Bar dataKey="dailyReturn" fill="#10b981" name="Daily Return (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Model Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {performance.map((perf) => {
            const model = models.find(m => m.id === perf.modelId);
            if (!model) return null;

            return (
              <div
                key={perf.modelId}
                className={`bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border-2 ${
                  perf.currentBalance === Math.max(...performance.map(p => p.currentBalance))
                    ? 'border-green-500'
                    : 'border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {perf.modelName}
                  </h3>
                  {perf.currentBalance === Math.max(...performance.map(p => p.currentBalance)) && (
                    <span className="px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded">
                      LEADER
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  {model.description}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Balance:</span>
                    <span className={`font-semibold ${
                      perf.currentBalance >= 100
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      ${perf.currentBalance.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Daily Return:</span>
                    <span className={`font-semibold ${
                      perf.dailyReturn >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {perf.dailyReturn.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Total P&L:</span>
                    <span className={`font-semibold ${
                      perf.totalPnL >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      ${perf.totalPnL.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Total Trades:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {perf.totalTrades}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Win Rate:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {perf.winRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Open Positions:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {model.state.positions.length}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
