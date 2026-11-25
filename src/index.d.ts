export type CountMode = 'kataha' | 'ryouha';
export type OffsetUnit = 'days' | 'weeks' | 'months';
export type OffsetDirection = 'after' | 'before';
export type RokuyoName = '大安' | '赤口' | '先勝' | '友引' | '先負' | '仏滅';

export interface HolidayEntry {
  iso: string;
  name: string;
  officialName: string;
  isSubstitute: boolean;
  isCitizensHoliday: boolean;
  isProjected: boolean;
}

export interface LunarInfo {
  month: number;
  day: number;
  isLeap: boolean;
  label: string;
}

export interface RokuyoMeta {
  reading: string;
  short: string;
  lucky_time: string;
  tone: 'best' | 'good' | 'neutral' | 'caution';
}

export interface DayAlmanac {
  iso: string;
  year: number;
  month: number;
  day: number;
  weekdayIndex: number;
  weekdayJa: string;
  wareki: string;
  holiday: HolidayEntry | null;
  lunar: LunarInfo;
  rokuyo: RokuyoName;
  rokuyoInfo: RokuyoMeta;
  kanshi: string;
  isTenshanichi: boolean;
  isIchiryumanbaibi: boolean;
  isToraNoHi: boolean;
  isMiNoHi: boolean;
  isTsuchinotoMi: boolean;
  isKinoene: boolean;
  isSuperLucky: boolean;
  luckyTags: string[];
}

export interface PeriodBreakdown {
  startIso: string;
  endIso: string;
  isReversed: boolean;
  mode: CountMode;
  katahaDays: number;
  ryouhaDays: number;
  activeDays: number;
  weeks: number;
  remDays: number;
  approxMonths: number;
  hours: number;
  weekdaysCount: number;
  weekendCount: number;
  holidayOnWeekdayCount: number;
  holidaysInPeriod: HolidayEntry[];
  startAlmanac: DayAlmanac;
  endAlmanac: DayAlmanac;
  excelKataha: string;
  excelRyouha: string;
  excelNetworkdays: string;
}

export interface OffsetResult {
  baseIso: string;
  amount: number;
  unit: OffsetUnit;
  direction: OffsetDirection;
  includeStartDay: boolean;
  target: DayAlmanac;
  altTarget: DayAlmanac;
  calendarDaysDiff: number;
  businessDaysApprox: number;
  excelFormula: string;
}

export interface BusinessRuleOptions {
  excludeSaturday?: boolean;
  excludeSunday?: boolean;
  excludeHolidays?: boolean;
  excludeWednesday?: boolean;
  excludeYearEnd?: boolean;
  excludeObon?: boolean;
}

export interface BusinessOffsetResult {
  baseIso: string;
  businessDays: number;
  direction: OffsetDirection;
  target: DayAlmanac;
  totalCalendarDays: number;
  skippedDaysCount: number;
  skippedReasons: { iso: string; reason: string }[];
  excelFormula: string;
}

export interface BusinessRangeResult {
  startIso: string;
  endIso: string;
  includeStart: boolean;
  businessDays: number;
  nonBusinessDays: number;
  totalDays: number;
  holidaysExcluded: { iso: string; reason: string }[];
  excelFormula: string;
}

export declare const WEEKDAYS_JA: readonly string[];
export declare const ROKUYO_ORDER: readonly RokuyoName[];
export declare const ROKUYO_DESC: Readonly<Record<RokuyoName, RokuyoMeta>>;
export declare const JAPAN_HOLIDAYS: Readonly<Record<string, HolidayEntry>>;
export declare const LUNAR_NEW_MOONS: ReadonlyArray<readonly [string, number, boolean]>;
export declare const DEFAULT_BUSINESS_RULES: Readonly<Required<BusinessRuleOptions>>;

export declare function getHoliday(iso: string): HolidayEntry | null;
export declare function getHolidaysByYear(year: number): HolidayEntry[];
export declare function parseIsoDate(iso: string): Date | null;
export declare function formatIsoDate(dt: Date): string;
export declare function addDaysUtc(dt: Date, days: number): Date;
export declare function addMonthsUtc(dt: Date, months: number): Date;
export declare function diffDaysUtc(start: Date, end: Date): number;
export declare function formatWareki(iso: string): string;
export declare function getSetsuDatesForYear(year: number): string[];
export declare function getLunarDate(iso: string): LunarInfo;
export declare function getDayAlmanac(iso: string): DayAlmanac;
export declare function calculatePeriod(startIsoRaw: string, endIsoRaw: string, mode?: CountMode): PeriodBreakdown;
export declare function calculateOffset(
  baseIsoRaw: string,
  amountRaw: number,
  unit?: OffsetUnit,
  direction?: OffsetDirection,
  includeStartDay?: boolean,
): OffsetResult;
export declare function checkBusinessDay(iso: string, rules?: BusinessRuleOptions): { isBusiness: boolean; reason: string };
export declare function calculateBusinessDayOffset(
  baseIsoRaw: string,
  businessDaysRaw: number,
  direction?: OffsetDirection,
  rules?: BusinessRuleOptions,
): BusinessOffsetResult;
export declare function calculateBusinessDaysBetween(
  startIsoRaw: string,
  endIsoRaw: string,
  includeStart?: boolean,
  rules?: BusinessRuleOptions,
): BusinessRangeResult;
export declare function getYearLuckyDays(year: number): {
  tenshanichi: DayAlmanac[];
  superLuckyDays: DayAlmanac[];
  taianIchiryumanbaibi: DayAlmanac[];
};
