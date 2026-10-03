import { create } from 'zustand';
import type { TickRecord, CandleRecord, CollectorLogRecord, PaperLedgerRecord, TradeTemplateRecord } from '../data/db';
import {
  type AppSettings,
  DEFAULT_SETTINGS,
  setSetting,
  loadAllSettings,
  getSetting,
  ensurePaperRun,
  getPaperBalance,
  getPaperLedger,
  addPaperFunds as repoAddPaperFunds,
  reducePaperFunds as repoReducePaperFunds,
  setPaperBalance as repoSetPaperBalance,
  resetPaperAccount as repoResetPaperAccount,
  listTradeTemplates,
  saveTradeTemplate as repoSaveTradeTemplate,
  deleteTradeTemplate as repoDeleteTradeTemplate,
  seedTradeTemplatesIfNeeded,
} from '../data/repositories';
import { workerClient } from '../collector/workerClient';

export type MainTab = 'home' | 'markets' | 'patterns' | 'trading' | 'more';
export type SubScreen = 'reliability' | 'data_storage' | 'auto_clicker' | 'settings' | 'pattern_detail' | null;

interface AppState {
  // Navigation
  activeTab: MainTab;
  activeSubScreen: SubScreen;
  selectedSymbol: string;
  selectedTimeframe: string;
  indicatorsEnabled: boolean;
  activeIndicators: {
    ma: boolean;
    ema: boolean;
    rsi: boolean;
    macd: boolean;
  };
  patternFilter: 'all' | 'wins' | 'losses' | 'pending';
  tradeTemplates: TradeTemplateRecord[];
  selectedTemplateId: string | null;

  // Live real-time ring buffers (last 300 points per symbol)
  ticksRingBuffer: Record<string, TickRecord[]>;
  latestTicks: Record<string, TickRecord>;
  tickers24h: Record<string, number>;
  latestCandles: Record<string, CandleRecord>;

  // Collector status
  collectorState: 'collecting' | 'reconnecting' | 'unreachable' | 'paused';
  collectorLabel: string;
  ticksPerMin: number;
  isPaused: boolean;
  startTime: number;
  uptimeMs: number;

  // Settings
  settings: AppSettings;
  settingsLoaded: boolean;

  // Gaps trigger counter
  gapsVersion: number;

  // Paper Account
  paperBalance: number | null;
  paperLedger: PaperLedgerRecord[];

  // Navigation actions
  setActiveTab: (tab: MainTab) => void;
  openSubScreen: (screen: SubScreen) => void;
  closeSubScreen: () => void;
  setSelectedSymbol: (sym: string) => void;
  setSelectedTimeframe: (tf: string) => void;
  setIndicatorsEnabled: (enabled: boolean) => void;
  toggleIndicator: (indicator: 'ma' | 'ema' | 'rsi' | 'macd') => void;
  setPatternFilter: (filter: 'all' | 'wins' | 'losses' | 'pending') => void;
  loadTemplates: () => Promise<void>;
  saveTemplate: (t: TradeTemplateRecord) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  setSelectedTemplate: (id: string | null) => void;

  // Paper actions
  loadPaper: () => Promise<void>;
  addPaperFunds: (amount: number) => Promise<void>;
  reducePaperFunds: (amount: number) => Promise<void>;
  setPaperBalance: (target: number) => Promise<void>;
  resetPaperAccount: (startAmount: number) => Promise<void>;

  // Live data actions
  addLiveTick: (tick: TickRecord) => void;
  updateLiveCandle: (candle: CandleRecord) => void;
  setTicker24h: (symbol: string, changePct: number) => void;
  setCollectorHeartbeat: (data: { t: number; state: string; statusState: any; ticksPerMin: number; symbols: string[]; isPaused: boolean }) => void;
  setCollectorStatus: (data: { status: any; stateLabel: string; statusState: any; details?: any }) => void;

  // Settings actions
  initSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  toggleCollectorPause: () => Promise<void>;
  refreshGaps: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: 'home',
  activeSubScreen: null,
  selectedSymbol: 'BTCUSDT',
  selectedTimeframe: '1m',
  indicatorsEnabled: false,
  activeIndicators: {
    ma: false,
    ema: false,
    rsi: false,
    macd: false,
  },
  patternFilter: 'all',
  tradeTemplates: [],
  selectedTemplateId: null,

  ticksRingBuffer: {},
  latestTicks: {},
  tickers24h: {},
  latestCandles: {},

  collectorState: 'reconnecting',
  collectorLabel: 'Initializing...',
  ticksPerMin: 0,
  isPaused: false,
  startTime: Date.now(),
  uptimeMs: 0,

  settings: DEFAULT_SETTINGS,
  settingsLoaded: false,
  gapsVersion: 0,

  paperBalance: null,
  paperLedger: [],

  setActiveTab: (tab: MainTab) => {
    set({ activeTab: tab, activeSubScreen: null });
  },

  openSubScreen: (screen: SubScreen) => {
    set({ activeSubScreen: screen });
  },

  closeSubScreen: () => {
    set({ activeSubScreen: null });
  },

  setSelectedSymbol: (sym: string) => {
    set({ selectedSymbol: sym });
  },

  setSelectedTimeframe: (tf: string) => {
    set({ selectedTimeframe: tf });
  },

  setIndicatorsEnabled: (enabled: boolean) => {
    set({ indicatorsEnabled: enabled });
  },

  toggleIndicator: (indicator) => {
    const current = get().activeIndicators;
    set({
      activeIndicators: {
        ...current,
        [indicator]: !current[indicator],
      },
    });
  },

  setPatternFilter: (filter) => {
    set({ patternFilter: filter });
  },

  loadTemplates: async () => {
    const list = await listTradeTemplates();
    set({ tradeTemplates: list });
    const currentSelected = get().selectedTemplateId;
    if (!currentSelected || !list.some((t) => t.id === currentSelected)) {
      const nextId = list.length > 0 ? list[0].id : null;
      set({ selectedTemplateId: nextId });
      if (nextId) {
        await setSetting('selectedTemplateId', nextId);
      }
    }
  },

  setSelectedTemplate: (id: string | null) => {
    set({ selectedTemplateId: id });
    if (id) {
      setSetting('selectedTemplateId', id);
    }
  },

  saveTemplate: async (t: TradeTemplateRecord) => {
    await repoSaveTradeTemplate(t);
    const list = await listTradeTemplates();
    set({ tradeTemplates: list, selectedTemplateId: t.id });
    await setSetting('selectedTemplateId', t.id);
  },

  deleteTemplate: async (id: string) => {
    await repoDeleteTradeTemplate(id);
    const list = await listTradeTemplates();
    let nextSelected = get().selectedTemplateId;
    if (nextSelected === id) {
      nextSelected = list.length > 0 ? list[0].id : null;
      if (nextSelected) {
        await setSetting('selectedTemplateId', nextSelected);
      }
    }
    set({ tradeTemplates: list, selectedTemplateId: nextSelected });
  },

  loadPaper: async () => {
    const balance = await getPaperBalance();
    const ledger = await getPaperLedger(10);
    set({ paperBalance: balance, paperLedger: ledger });
  },

  addPaperFunds: async (amount: number) => {
    await repoAddPaperFunds(amount);
    await get().loadPaper();
  },

  reducePaperFunds: async (amount: number) => {
    await repoReducePaperFunds(amount);
    await get().loadPaper();
  },

  setPaperBalance: async (target: number) => {
    await repoSetPaperBalance(target);
    await get().loadPaper();
  },

  resetPaperAccount: async (startAmount: number) => {
    await repoResetPaperAccount(startAmount);
    await get().loadPaper();
  },

  addLiveTick: (tick: TickRecord) => {
    const sym = tick.sym;
    const currentRing = get().ticksRingBuffer[sym] || [];
    // Ring buffer size: max 300
    const newRing = [...currentRing, tick].slice(-300);

    set((state) => ({
      ticksRingBuffer: {
        ...state.ticksRingBuffer,
        [sym]: newRing,
      },
      latestTicks: {
        ...state.latestTicks,
        [sym]: tick,
      },
    }));
  },

  updateLiveCandle: (candle: CandleRecord) => {
    const key = `${candle.sym}_${candle.tf}`;
    set((state) => ({
      latestCandles: {
        ...state.latestCandles,
        [key]: candle,
      },
    }));
  },

  setTicker24h: (symbol: string, changePct: number) => {
    set((state) => ({
      tickers24h: {
        ...state.tickers24h,
        [symbol]: changePct,
      },
    }));
  },

  setCollectorHeartbeat: (data) => {
    const now = data.t;
    const start = get().startTime;
    set({
      collectorLabel: data.state,
      collectorState: data.statusState,
      ticksPerMin: data.ticksPerMin,
      isPaused: data.isPaused,
      uptimeMs: Math.max(0, now - start),
    });
  },

  setCollectorStatus: (data) => {
    set({
      collectorLabel: data.stateLabel,
      collectorState: data.statusState,
    });
  },

  initSettings: async () => {
    const settings = await loadAllSettings();
    set({
      settings,
      isPaused: settings.collectorPaused,
      startTime: settings.collectorStartTime || Date.now(),
      settingsLoaded: true,
    });

    workerClient.init(settings);
    await ensurePaperRun();
    await get().loadPaper();

    await seedTradeTemplatesIfNeeded();
    await get().loadTemplates();
    const storedTemplateId = await getSetting<string | null>('selectedTemplateId', null);
    const currentTemplates = get().tradeTemplates;
    if (storedTemplateId && currentTemplates.some((t) => t.id === storedTemplateId)) {
      set({ selectedTemplateId: storedTemplateId });
    } else {
      const fallbackId = currentTemplates.length > 0 ? currentTemplates[0].id : null;
      set({ selectedTemplateId: fallbackId });
      if (fallbackId) {
        await setSetting('selectedTemplateId', fallbackId);
      }
    }
  },

  updateSettings: async (partial: Partial<AppSettings>) => {
    const current = get().settings;
    const updated = { ...current, ...partial };
    set({ settings: updated });

    for (const [key, value] of Object.entries(partial)) {
      await setSetting(key, value);
    }

    if (partial.dataSource) {
      workerClient.setDataSource(partial.dataSource);
    }
    if (partial.trackedSymbols) {
      workerClient.setTrackedSymbols(partial.trackedSymbols);
    }
    if (typeof partial.recordRawTicks === 'boolean') {
      workerClient.setRecordRawTicks(partial.recordRawTicks);
    }
    if (partial.rawTickRetentionDays) {
      workerClient.setRetentionDays(partial.rawTickRetentionDays);
    }
    if (typeof partial.collectorPaused === 'boolean') {
      if (partial.collectorPaused) {
        workerClient.pause();
      } else {
        workerClient.resume();
      }
    }
  },

  toggleCollectorPause: async () => {
    const willPause = !get().isPaused;
    set({ isPaused: willPause });
    await setSetting('collectorPaused', willPause);

    if (willPause) {
      workerClient.pause();
    } else {
      workerClient.resume();
    }
  },

  refreshGaps: () => {
    set((state) => ({ gapsVersion: state.gapsVersion + 1 }));
  },
}));
