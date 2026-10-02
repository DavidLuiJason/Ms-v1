import { db, type SettingRecord, type CollectorLogRecord, type ErrorLogRecord, type ClickerProfileRecord } from './db';

export interface AppSettings {
  dataSource: 'global' | 'us';
  trackedSymbols: string[];
  recordRawTicks: boolean;
  rawTickRetentionDays: number;
  tradeTypes: {
    spot: boolean;
    futures: boolean;
    options: boolean;
    fixedTime: boolean;
  };
  safetyLimits: {
    maxStake: number;
    dailyLossLimit: number;
  };
  collectorPaused: boolean;
  collectorStartTime: number;
  emergencyStopped: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  dataSource: 'global',
  trackedSymbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  recordRawTicks: true,
  rawTickRetentionDays: 3,
  tradeTypes: {
    spot: true,
    futures: false,
    options: false,
    fixedTime: false,
  },
  safetyLimits: {
    maxStake: 500,
    dailyLossLimit: 1000,
  },
  collectorPaused: false,
  collectorStartTime: Date.now(),
  emergencyStopped: false,
};

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const row = await db.settings.get(key);
  if (row === undefined || row.value === undefined) {
    return defaultValue;
  }
  return row.value as T;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value });
}

export async function loadAllSettings(): Promise<AppSettings> {
  const keys = Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[];
  const settings: any = { ...DEFAULT_SETTINGS };

  for (const key of keys) {
    const row = await db.settings.get(key);
    if (row && row.value !== undefined) {
      settings[key] = row.value;
    }
  }

  return settings as AppSettings;
}

export async function logError(screen: string, message: string, stack?: string): Promise<void> {
  try {
    await db.errorLog.add({
      t: Date.now(),
      screen,
      message,
      stack,
    });
  } catch (e) {
    console.error('Failed to log error to errorLog table:', e);
  }
}

export async function getDatabaseStats() {
  const [ticksCount, quoteBarsCount, candlesCount, gapsCount] = await Promise.all([
    db.ticks.count(),
    db.quoteBars.count(),
    db.candles.count(),
    db.collectorLog.where('type').equals('gap').count(),
  ]);

  let storageUsed = 0;
  let storageQuota = 0;
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      storageUsed = estimate.usage || 0;
      storageQuota = estimate.quota || 0;
    } catch {
      // fallback
    }
  }

  // Get most recent tick or candle for "Last data received"
  const latestTick = await db.ticks.orderBy('t').last();
  const latestCandle = await db.candles.orderBy('t').last();
  const lastDataTime = Math.max(latestTick?.t || 0, latestCandle?.t || 0);

  return {
    ticksCount,
    quoteBarsCount,
    candlesCount,
    gapsCount,
    storageUsed,
    storageQuota,
    lastDataTime,
  };
}

export async function getGapsList(): Promise<CollectorLogRecord[]> {
  return await db.collectorLog
    .where('type')
    .equals('gap')
    .reverse()
    .sortBy('t');
}

export async function updateGapStatus(id: number, status: 'open' | 'repaired' | 'unrecoverable') {
  await db.collectorLog.update(id, { status });
}
