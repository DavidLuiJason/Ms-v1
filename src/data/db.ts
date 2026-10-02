import Dexie, { type Table } from 'dexie';

export interface TickRecord {
  src: string;
  sym: string;
  u: number;
  t: number;
  bid: number;
  ask: number;
  bidQty: number;
  askQty: number;
}

export interface QuoteBarRecord {
  src: string;
  sym: string;
  t: number; // minute timestamp ms
  bidO: number;
  bidH: number;
  bidL: number;
  bidC: number;
  askO: number;
  askH: number;
  askL: number;
  askC: number;
  spreadAvg: number;
  spreadMax: number;
  tickCount: number;
}

export interface CandleRecord {
  src: string;
  sym: string;
  tf: string; // "1m" | "5m" | "15m" | "1h" | "4h" | "1d"
  t: number;  // open time ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  closed: boolean;
}

export interface CollectorLogRecord {
  id?: number;
  t: number;
  type: 'heartbeat' | 'gap' | 'connection' | 'event';
  state?: string;
  symbols?: string[];
  ticksPerMin?: number;
  src?: string;
  sym?: string;
  tf?: string;
  from?: number;
  to?: number;
  status?: 'open' | 'repaired' | 'unrecoverable';
  message?: string;
}

export interface SettingRecord {
  key: string;
  value: any;
}

export interface ErrorLogRecord {
  id?: number;
  t: number;
  screen: string;
  message: string;
  stack?: string;
}

export interface ClickerMarker {
  id: string;
  label: string;
  x: number; // 0..1 fraction
  y: number; // 0..1 fraction
}

export interface ClickerProfileRecord {
  id: string;
  name: string;
  platform: string;
  markers: ClickerMarker[];
}

export class MarketScopeDatabase extends Dexie {
  ticks!: Table<TickRecord, [string, string, number]>;
  quoteBars!: Table<QuoteBarRecord, [string, string, number]>;
  candles!: Table<CandleRecord, [string, string, string, number]>;
  collectorLog!: Table<CollectorLogRecord, number>;
  settings!: Table<SettingRecord, string>;
  errorLog!: Table<ErrorLogRecord, number>;
  clickerProfiles!: Table<ClickerProfileRecord, string>;

  constructor() {
    super('MarketScopeDB');
    this.version(1).stores({
      ticks: '[src+sym+u], sym, t, [sym+t]',
      quoteBars: '[src+sym+t], sym, t, [sym+t]',
      candles: '[src+sym+tf+t], sym, tf, t, [sym+tf+t]',
      collectorLog: '++id, t, type, status, sym, [sym+tf]',
      settings: 'key',
      errorLog: '++id, t, screen',
      clickerProfiles: 'id, name',
    });
  }
}

export const db = new MarketScopeDatabase();
