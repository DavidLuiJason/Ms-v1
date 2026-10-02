import React from 'react';
import { useAppStore } from '../../state/store';
import { Shapes } from 'lucide-react';

interface Props {
  onSelectPattern?: (patternId: string) => void;
}

export const PatternsScreen: React.FC<Props> = ({ onSelectPattern }) => {
  const { patternFilter, setPatternFilter } = useAppStore();

  const filterTabs: Array<{ id: 'all' | 'wins' | 'losses' | 'pending'; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'wins', label: 'Wins' },
    { id: 'losses', label: 'Losses' },
    { id: 'pending', label: 'Pending' },
  ];

  return (
    <div className="p-4 space-y-4 pb-20">
      <div>
        {/* Exception (a): Screen 4's title must read "Patterns" */}
        <h2 className="text-xl font-bold text-white tracking-tight mb-1">Patterns</h2>
        <p className="text-xs text-slate-400">Automated technical pattern detection and evaluation</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPatternFilter(tab.id)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
              patternFilter === tab.id
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty State connected to empty data source */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 text-center flex flex-col items-center justify-center my-6">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
          <Shapes className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-1">
          No patterns recorded yet
        </h3>
        <p className="text-xs text-slate-400 mb-4 max-w-xs">
          Available in the next build
        </p>

        {/* Demo button to inspect Pattern Detail screen layout */}
        {onSelectPattern && (
          <button
            onClick={() => onSelectPattern('demo-pattern')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium py-1.5 px-3 rounded-xl bg-slate-800/80 border border-slate-700/80"
          >
            View Pattern Detail Layout
          </button>
        )}
      </div>
    </div>
  );
};
