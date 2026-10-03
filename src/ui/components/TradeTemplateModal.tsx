import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../state/store';
import { type TradeTemplateRecord, type TradeModel } from '../../data/db';
import { isTemplateIncomplete } from '../../data/repositories';
import { X, Trash2, Check, AlertCircle, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  template: TradeTemplateRecord | null; // null means create new
}

export const TradeTemplateModal: React.FC<Props> = ({ isOpen, onClose, template }) => {
  const { saveTemplate, deleteTemplate, tradeTemplates } = useAppStore();

  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('Cwallet');
  const [model, setModel] = useState<TradeModel>('direction_round');
  const [durationSec, setDurationSec] = useState<string>('');
  const [payoutPct, setPayoutPct] = useState<string>('');
  const [minStake, setMinStake] = useState<string>('');
  const [maxStake, setMaxStake] = useState<string>('');
  const [tieRule, setTieRule] = useState<'refund' | 'win' | 'lose'>('refund');
  const [conditionPct, setConditionPct] = useState<string>('');
  const [leverage, setLeverage] = useState<string>('');
  const [feePct, setFeePct] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setPlatform(template.platform || 'Cwallet');
      setModel(template.model || 'direction_round');
      setDurationSec(template.durationSec != null ? template.durationSec.toString() : '');
      setPayoutPct(template.payoutPct != null ? template.payoutPct.toString() : '');
      setMinStake(template.minStake != null ? template.minStake.toString() : '');
      setMaxStake(template.maxStake != null ? template.maxStake.toString() : '');
      setTieRule(template.tieRule || 'refund');
      setConditionPct(template.conditionPct != null ? template.conditionPct.toString() : '');
      setLeverage(template.leverage != null ? template.leverage.toString() : '');
      setFeePct(template.feePct != null ? template.feePct.toString() : '');
    } else {
      // New template defaults
      setName('New Trade Template');
      setPlatform('Cwallet');
      setModel('direction_round');
      setDurationSec('30');
      setPayoutPct('85');
      setMinStake('1');
      setMaxStake('500');
      setTieRule('refund');
      setConditionPct('0.10');
      setLeverage('10');
      setFeePct('0.05');
    }
    setError(null);
    setShowDeleteConfirm(false);
  }, [template, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Template name is required');
      return;
    }

    const durationNum = durationSec ? Number(durationSec) : null;
    const payoutNum = payoutPct ? Number(payoutPct) : null;
    const minStakeNum = minStake ? Number(minStake) : null;
    const maxStakeNum = maxStake ? Number(maxStake) : null;
    const conditionNum = conditionPct ? Number(conditionPct) : null;
    const leverageNum = leverage ? Number(leverage) : null;
    const feeNum = feePct ? Number(feePct) : null;

    const record: TradeTemplateRecord = {
      id: template ? template.id : crypto.randomUUID(),
      name: trimmedName,
      platform: platform.trim() || 'Cwallet',
      model,
      preset: template ? template.preset : false,
      createdAt: template ? template.createdAt : Date.now(),
      durationSec: durationNum,
      payoutPct: payoutNum,
      minStake: minStakeNum,
      maxStake: maxStakeNum,
      tieRule: model === 'direction_round' || model === 'direction_round_condition' ? tieRule : (null as any),
      conditionPct: model === 'direction_round_condition' ? conditionNum : null,
      leverage: model === 'leveraged_position' ? leverageNum : null,
      feePct: model === 'leveraged_position' || model === 'spot' ? feeNum : null,
    };

    try {
      await saveTemplate(record);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save trade template');
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    if (tradeTemplates.length <= 1) {
      setError('You must keep at least one trade template.');
      setShowDeleteConfirm(false);
      return;
    }

    try {
      await deleteTemplate(template.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete template');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full mx-auto z-10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {template ? 'Edit Trade Template' : 'New Trade Template'}
            </h3>
            <p className="text-xs text-slate-400">
              Configure app-specific execution rules and payout criteria
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Template Name & Platform */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Trend Trade 15s"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-medium"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Platform App
              </label>
              <input
                type="text"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="e.g. Cwallet, Binance"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-medium"
              />
            </div>
          </div>

          {/* Model Selector */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Trade Model
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'direction_round', label: 'Direction Round', desc: 'Fixed expiry Up/Down' },
                { id: 'direction_round_condition', label: 'Spread Condition', desc: 'Price offset threshold' },
                { id: 'leveraged_position', label: 'Futures / Perp', desc: 'Margin leverage position' },
                { id: 'spot', label: 'Spot', desc: 'Direct market execution' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModel(m.id as TradeModel)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    model === m.id
                      ? 'bg-cyan-500/10 border-cyan-400 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className={`font-semibold text-xs ${model === m.id ? 'text-cyan-400' : 'text-slate-200'}`}>
                    {m.label}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Model-specific Fields */}
          {(model === 'direction_round' || model === 'direction_round_condition') && (
            <div className="space-y-3 p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Duration (seconds)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 5, 15, 30, 60"
                    value={durationSec}
                    onChange={(e) => setDurationSec(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Payout (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    placeholder="e.g. 85, 90"
                    value={payoutPct}
                    onChange={(e) => setPayoutPct(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {model === 'direction_round_condition' && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Condition Spread / Trigger (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 0.10"
                    value={conditionPct}
                    onChange={(e) => setConditionPct(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Tie Rule
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['refund', 'win', 'lose'] as const).map((rule) => (
                    <button
                      key={rule}
                      type="button"
                      onClick={() => setTieRule(rule)}
                      className={`py-1.5 rounded-lg text-xs font-semibold capitalize border transition ${
                        tieRule === rule
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {rule}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {model === 'leveraged_position' && (
            <div className="space-y-3 p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Leverage (x)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="125"
                    placeholder="e.g. 10, 20, 50"
                    value={leverage}
                    onChange={(e) => setLeverage(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Fee (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 0.05"
                    value={feePct}
                    onChange={(e) => setFeePct(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>
          )}

          {model === 'spot' && (
            <div className="space-y-3 p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Spot Trading Fee (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 0.10"
                  value={feePct}
                  onChange={(e) => setFeePct(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          )}

          {/* Min & Max Stake (Universal limits) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Min Stake ($)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 1"
                value={minStake}
                onChange={(e) => setMinStake(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Max Stake ($)
              </label>
              <input
                type="number"
                min="0"
                placeholder="Optional"
                value={maxStake}
                onChange={(e) => setMaxStake(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 shrink-0 space-y-2">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-400 flex-1">Delete this template?</span>
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition"
              >
                Confirm Delete
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {template && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition"
                  title="Delete Template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition text-center"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition text-center shadow-lg active:scale-98"
              >
                Save Template
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
