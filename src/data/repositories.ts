import { db, type SettingRecord, type CollectorLogRecord, type ErrorLogRecord, type ClickerProfileRecord, type PaperLedgerRecord, type TradeTemplateRecord } from './db';

export const PAPER_DEFAULT_START = 10000;
export const MAX_TRACKED_SYMBOLS = 20;
const MAX_PAPER_AMOUNT = 1000000000;

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
    futures: true,
    options: true,
    fixedTime: true,
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

export async function ensurePaperRun(): Promise<string> {
  const existingRunId = await getSetting<string | null>('paperRunId', null);
  if (existingRunId) {
    const entryCount = await db.paperLedger.where('runId').equals(existingRunId).count();
    if (entryCount > 0) {
      return existingRunId;
    }
  }

  const runId = crypto.randomUUID();
  await setSetting('paperRunId', runId);
  await db.paperLedger.add({
    id: crypto.randomUUID(),
    t: Date.now(),
    runId,
    type: 'start',
    amount: PAPER_DEFAULT_START,
  });
  return runId;
}

export async function getPaperBalance(): Promise<number> {
  const runId = await getSetting<string | null>('paperRunId', null);
  if (!runId) {
    return 0;
  }
  const entries = await db.paperLedger.where('runId').equals(runId).toArray();
  const sum = entries.reduce((acc, entry) => acc + entry.amount, 0);
  return Math.round(sum * 100) / 100;
}

export async function getPaperLedger(limit = 10): Promise<PaperLedgerRecord[]> {
  const runId = await getSetting<string | null>('paperRunId', null);
  if (!runId) {
    return [];
  }
  const entries = await db.paperLedger.where('runId').equals(runId).reverse().sortBy('t');
  return entries.slice(0, limit);
}

export async function addPaperFunds(amount: number): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Enter an amount greater than 0');
  }
  if (amount > MAX_PAPER_AMOUNT) {
    throw new Error('Maximum is 1,000,000,000');
  }
  const cleanAmount = Math.round(amount * 100) / 100;
  const runId = await ensurePaperRun();
  await db.paperLedger.add({
    id: crypto.randomUUID(),
    t: Date.now(),
    runId,
    type: 'adjust',
    amount: cleanAmount,
  });
}

export async function reducePaperFunds(amount: number): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Enter an amount greater than 0');
  }
  if (amount > MAX_PAPER_AMOUNT) {
    throw new Error('Maximum is 1,000,000,000');
  }
  const cleanAmount = Math.round(amount * 100) / 100;
  const currentBalance = await getPaperBalance();
  if (currentBalance - cleanAmount < 0) {
    throw new Error("Balance can't go below 0");
  }
  const runId = await ensurePaperRun();
  await db.paperLedger.add({
    id: crypto.randomUUID(),
    t: Date.now(),
    runId,
    type: 'adjust',
    amount: -cleanAmount,
  });
}

export async function setPaperBalance(target: number): Promise<void> {
  if (!Number.isFinite(target) || target < 0) {
    throw new Error("Balance can't go below 0");
  }
  if (target > MAX_PAPER_AMOUNT) {
    throw new Error('Maximum is 1,000,000,000');
  }
  const cleanTarget = Math.round(target * 100) / 100;
  const currentBalance = await getPaperBalance();
  const diff = Math.round((cleanTarget - currentBalance) * 100) / 100;
  if (diff === 0) {
    return;
  }
  const runId = await ensurePaperRun();
  await db.paperLedger.add({
    id: crypto.randomUUID(),
    t: Date.now(),
    runId,
    type: 'adjust',
    amount: diff,
  });
}

export async function resetPaperAccount(startAmount: number): Promise<void> {
  if (!Number.isFinite(startAmount) || startAmount < 0) {
    throw new Error("Balance can't go below 0");
  }
  if (startAmount > MAX_PAPER_AMOUNT) {
    throw new Error('Maximum is 1,000,000,000');
  }
  const cleanStart = Math.round(startAmount * 100) / 100;
  const newRunId = crypto.randomUUID();
  await setSetting('paperRunId', newRunId);
  await db.paperLedger.add({
    id: crypto.randomUUID(),
    t: Date.now(),
    runId: newRunId,
    type: 'start',
    amount: cleanStart,
  });
}

export function isTemplateIncomplete(t: TradeTemplateRecord): boolean {
  if (!t) return true;
  switch (t.model) {
    case 'direction_round':
      return t.durationSec == null || t.payoutPct == null;
    case 'direction_round_condition':
      return t.durationSec == null || t.payoutPct == null || t.conditionPct == null;
    case 'leveraged_position':
      return t.leverage == null || t.feePct == null;
    case 'spot':
      return t.feePct == null;
    default:
      return false;
  }
}

export async function listTradeTemplates(): Promise<TradeTemplateRecord[]> {
  const templates = await db.tradeTemplates.toArray();
  return templates.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export async function saveTradeTemplate(t: TradeTemplateRecord): Promise<void> {
  await db.tradeTemplates.put(t);
}

export async function deleteTradeTemplate(id: string): Promise<void> {
  await db.tradeTemplates.delete(id);
}

export async function seedTradeTemplatesIfNeeded(): Promise<void> {
  const isSeeded = await getSetting<boolean>('tradeTemplatesSeeded', false);
  if (isSeeded) return;

  const now = Date.now();
  const presets: TradeTemplateRecord[] = [
    {
      id: crypto.randomUUID(),
      name: 'Trend Trade 5s',
      platform: 'Cwallet',
      model: 'direction_round',
      preset: true,
      createdAt: now,
      durationSec: 5,
      payoutPct: null,
      minStake: 1,
      maxStake: null,
      tieRule: 'refund',
      conditionPct: null,
      leverage: null,
      feePct: null,
    },
    {
      id: crypto.randomUUID(),
      name: 'Trend Trade 15s',
      platform: 'Cwallet',
      model: 'direction_round',
      preset: true,
      createdAt: now + 1,
      durationSec: 15,
      payoutPct: null,
      minStake: 1,
      maxStake: null,
      tieRule: 'refund',
      conditionPct: null,
      leverage: null,
      feePct: null,
    },
    {
      id: crypto.randomUUID(),
      name: 'Spread Rush 5s',
      platform: 'Cwallet',
      model: 'direction_round_condition',
      preset: true,
      createdAt: now + 2,
      durationSec: 5,
      payoutPct: null,
      minStake: null,
      maxStake: null,
      tieRule: 'refund',
      conditionPct: null,
      leverage: null,
      feePct: null,
    },
    {
      id: crypto.randomUUID(),
      name: 'Perpetual Futures',
      platform: 'Cwallet',
      model: 'leveraged_position',
      preset: true,
      createdAt: now + 3,
      durationSec: null,
      payoutPct: null,
      minStake: null,
      maxStake: null,
      tieRule: null as any,
      conditionPct: null,
      leverage: null,
      feePct: null,
    },
    {
      id: crypto.randomUUID(),
      name: 'Spot',
      platform: 'Cwallet',
      model: 'spot',
      preset: true,
      createdAt: now + 4,
      durationSec: null,
      payoutPct: null,
      minStake: null,
      maxStake: null,
      tieRule: null as any,
      conditionPct: null,
      leverage: null,
      feePct: null,
    },
  ];

  await db.tradeTemplates.bulkPut(presets);
  await setSetting('tradeTemplatesSeeded', true);
}

