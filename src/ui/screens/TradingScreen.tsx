import React, { useState } from 'react';
import { useAppStore } from '../../state/store';
import { Wallet, TrendingUp, History, Settings2, Plus, AlertTriangle, Layers } from 'lucide-react';
import { formatPrice } from '../../lib/formatters';
import { PaperAccountSheet } from '../components/PaperAccountSheet';
import { TradeTemplateModal } from '../components/TradeTemplateModal';
import { isTemplateIncomplete } from '../../data/repositories';
import { type TradeTemplateRecord } from '../../data/db';

export const TradingScreen: React.FC = () => {
  const {
    tradeTemplates,
    selectedTemplateId,
    setSelectedTemplate,
    paperBalance,
  } = useAppStore();

  const [showAdjustSheet, setShowAdjustSheet] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TradeTemplateRecord | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const activeTemplate =
    tradeTemplates.find((t) => t.id === selectedTemplateId) || tradeTemplates[0] || null;

  const handleEditActive = () => {
    if (activeTemplate) {
      setEditingTemplate(activeTemplate);
      setShowTemplateModal(true);
    }
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setShowTemplateModal(true);
  };

  const getModelLabel = (model: string) => {
    switch (model) {
      case 'direction_round':
        return 'Direction Round (Fixed Expiry)';
      case 'direction_round_condition':
        return 'Direction Round (Spread Condition)';
      case 'leveraged_position':
        return 'Leveraged Margin Position';
      case 'spot':
        return 'Spot Market Execution';
      default:
        return model;
    }
  };

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
          <div className="text-2xl font-bold text-white font-mono tracking-tight">
            {paperBalance !== null ? `$${formatPrice(paperBalance, 2)}` : '—'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-400">
            Simulation
          </div>
          <button
            onClick={() => setShowAdjustSheet(true)}
            className="px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/20 transition active:scale-95 cursor-pointer"
          >
            Adjust
          </button>
        </div>
      </div>

      {/* Trade Templates Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Trade Templates</span>
          </div>
          <button
            onClick={handleCreateNew}
            className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
          >
            <Plus className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>

        {/* Template Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {tradeTemplates.map((template) => {
            const isSelected = activeTemplate?.id === template.id;
            const isIncomplete = isTemplateIncomplete(template);

            return (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`py-2 px-3 rounded-2xl text-xs font-semibold border transition text-left shrink-0 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <span>{template.name}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-md uppercase font-mono ${
                    isSelected
                      ? 'bg-slate-950/20 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {template.platform}
                </span>
                {isIncomplete && (
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isSelected ? 'bg-amber-900' : 'bg-amber-400'
                    }`}
                    title="Incomplete template configuration"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Template Parameters Card */}
        {activeTemplate && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{activeTemplate.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 font-mono">
                    {activeTemplate.platform}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {getModelLabel(activeTemplate.model)}
                </div>
              </div>

              <button
                onClick={handleEditActive}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Configure</span>
              </button>
            </div>

            {/* Incomplete Warning */}
            {isTemplateIncomplete(activeTemplate) && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Incomplete setup (missing duration, payout, or fee)</span>
                </div>
                <button
                  onClick={handleEditActive}
                  className="underline font-bold text-[11px] hover:text-amber-300 shrink-0"
                >
                  Set Now
                </button>
              </div>
            )}

            {/* Parameters Grid */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80 text-xs">
              {(activeTemplate.model === 'direction_round' ||
                activeTemplate.model === 'direction_round_condition') && (
                <>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400 uppercase">Duration</div>
                    <div className="font-mono font-bold text-white mt-0.5">
                      {activeTemplate.durationSec != null ? `${activeTemplate.durationSec}s` : '—'}
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400 uppercase">Payout</div>
                    <div className="font-mono font-bold text-emerald-400 mt-0.5">
                      {activeTemplate.payoutPct != null ? `${activeTemplate.payoutPct}%` : '—'}
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400 uppercase">Tie Rule</div>
                    <div className="font-mono font-bold text-slate-300 mt-0.5 capitalize">
                      {activeTemplate.tieRule || 'refund'}
                    </div>
                  </div>
                </>
              )}

              {activeTemplate.model === 'direction_round_condition' && (
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <div className="text-[10px] text-slate-400 uppercase">Condition Trigger</div>
                  <div className="font-mono font-bold text-cyan-400 mt-0.5">
                    {activeTemplate.conditionPct != null ? `±${activeTemplate.conditionPct}%` : '—'}
                  </div>
                </div>
              )}

              {activeTemplate.model === 'leveraged_position' && (
                <>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400 uppercase">Leverage</div>
                    <div className="font-mono font-bold text-amber-400 mt-0.5">
                      {activeTemplate.leverage != null ? `${activeTemplate.leverage}x` : '—'}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400 uppercase">Trading Fee</div>
                    <div className="font-mono font-bold text-slate-300 mt-0.5">
                      {activeTemplate.feePct != null ? `${activeTemplate.feePct}%` : '—'}
                    </div>
                  </div>
                </>
              )}

              {activeTemplate.model === 'spot' && (
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <div className="text-[10px] text-slate-400 uppercase">Spot Fee</div>
                  <div className="font-mono font-bold text-slate-300 mt-0.5">
                    {activeTemplate.feePct != null ? `${activeTemplate.feePct}%` : '—'}
                  </div>
                </div>
              )}

              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div className="text-[10px] text-slate-400 uppercase">Min Stake</div>
                <div className="font-mono font-bold text-slate-300 mt-0.5">
                  {activeTemplate.minStake != null ? `$${activeTemplate.minStake}` : '—'}
                </div>
              </div>

              {activeTemplate.maxStake != null && (
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <div className="text-[10px] text-slate-400 uppercase">Max Stake</div>
                  <div className="font-mono font-bold text-slate-300 mt-0.5">
                    ${activeTemplate.maxStake}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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

      {showAdjustSheet && <PaperAccountSheet onClose={() => setShowAdjustSheet(false)} />}

      <TradeTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        template={editingTemplate}
      />
    </div>
  );
};

