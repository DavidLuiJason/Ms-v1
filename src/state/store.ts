import { create } from 'zustand';
import type { TickRecord, CandleRecord, CollectorLogRecord } from '../data/db';
import { type AppSettings, DEFAULT_SETTINGS, setSetting, loadAllSettings } from '../data/repositories';
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
  selectedTradeType: 'spot' | 'futures' | 'options' | 'fixedTime';

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

  // Navigation actions
  setActiveTab: (tab: MainTab) => void;
  openSubScreen: (screen: SubScreen) => void;
  closeSubScreen: () => void;
  setSelectedSymbol: (sym: string) => void;
  setSelectedTimeframe: (tf: string) => void;
  setIndicatorsEnabled: (enabled: boolean) => void;
  toggleIndicator: (indicator: 'ma' | 'ema' | 'rsi' | 'macd') => void;
  setPatternFilter: (filter: 'all' | 'wins' | 'losses' | 'pending') => void;
  setSelectedTradeType: (tradeType: 'spot' | 'futures' | 'options' | 'fixedTime') => void;

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
  selectedTradeType: 'spot',

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

  setSelectedTradeType: (tradeType) => {
    set({ selectedTradeType: tradeType });
    setSetting('selectedTradeType', tradeType);
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
    const storedTradeType = await setSetting; // check stored
    set({
      settings,
      isPaused: settings.collectorPaused,
      startTime: settings.collectorStartTime || Date.now(),
      settingsLoaded: true,
    });

    workerClient.init(settings);
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
