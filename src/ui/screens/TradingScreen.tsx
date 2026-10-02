import React from 'react';
import { useAppStore } from '../../state/store';
import { Wallet, TrendingUp, History } from 'lucide-react';

export const TradingScreen: React.FC = () => {
  const { selectedTradeType, setSelectedTradeType } = useAppStore();

  const tradeTypes: Array<{ id: 'spot' | 'futures' | 'options' | 'fixedTime'; label: string }> = [
    { id: 'spot', label: 'Spot' },
    { id: 'futures', label: 'Futures' },
    { id: 'options', label: 'Options' },
    { id: 'fixedTime', label: 'Fixed-Time Up/Down' },
  ];

  return (
    <div className="p-4 space-y-4 pb-20">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight mb-1">Trading</h2>
        <p className="text-xs text-slate-400">Paper simulation and automated position tracking</p>
      </div>

      {/* Paper Account Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-cyan-400" />
            Paper Account
          </div>
          <div className="text-2xl font-bold text-white font-mono tracking-tight">$10,000.00</div>
        </div>
        <div className="px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-400">
          Simulation
        </div>
      </div>

      {/* Trade Type Chips (Selectable and Persisted) */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider px-1">
          Trade Type
        </div>
        <div className="grid grid-cols-2 gap-2">
          {tradeTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedTradeType(type.id)}
              className={`py-2.5 px-3 rounded-2xl text-xs font-semibold border transition text-center ${
                selectedTradeType === type.id
                  ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Open Trades */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Open Trades
          </span>
          <span className="text-xs text-slate-500">0 open</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-300 mb-0.5">No trades yet</h4>
          <p className="text-xs text-slate-500">Available in the next build</p>
        </div>
      </div>

      {/* History */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            History
          </span>
          <span className="text-xs text-slate-500">0 trades</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
            <History className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-300 mb-0.5">No trade history yet</h4>
          <p className="text-xs text-slate-500">Available in the next build</p>
        </div>
      </div>
    </div>
  );
};
