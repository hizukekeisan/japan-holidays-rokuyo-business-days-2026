import { readFileSync } from 'node:fs';

const HOLIDAYS_RAW = JSON.parse(
  readFileSync(new URL('../data/japan_holidays_2024_2028.json', import.meta.url), 'utf8'),
);
const LUNAR_RAW = JSON.parse(
  readFileSync(new URL('../data/jst_lunar_new_moons_2019_2033.json', import.meta.url), 'utf8'),
);
const RULES_RAW = JSON.parse(
  readFileSync(new URL('../data/rokuyo_and_lucky_days.json', import.meta.url), 'utf8'),
);

export const WEEKDAYS_JA = Object.freeze(['日', '月', '火', '水', '木', '金', '土']);
export const ROKUYO_ORDER = Object.freeze(RULES_RAW.rokuyo_order);
export const ROKUYO_DESC = Object.freeze(RULES_RAW.rokuyo_metadata);

const JIKKAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const JUNISHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export const JAPAN_HOLIDAYS = Object.freeze(
  Object.fromEntries(
    HOLIDAYS_RAW.holidays.map((h) => [
      h.date,
      Object.freeze({
        iso: h.date,
        name: h.name,
        officialName: h.official_name,
        isSubstitute: Boolean(h.is_substitute),
        isCitizensHoliday: Boolean(h.is_citizens_holiday),
        isProjected: Boolean(h.is_projected),
      }),
    ]),
  ),
);

export const LUNAR_NEW_MOONS = Object.freeze(
  LUNAR_RAW.new_moons.map((m) => Object.freeze([m.jst_date, m.lunar_month, Boolean(m.is_leap_month)])),
);

const ICHIRYU_BY_SETSUGETSU = Object.fromEntries(
  Object.entries(RULES_RAW.ichiryumanbaibi_by_setsugetsu).map(([k, v]) => [Number(k), v.branch_indices]),
);

const SETSU_DEGREES = [
  [1, 285],  // 小寒
  [2, 315],  // 立春
  [3, 345],  // 啓蟄
  [4, 15],   // 清明
  [5, 45],   // 立夏
  [6, 75],   // 芒種
  [7, 105],  // 小暑
  [8, 135],  // 立秋
  [9, 165],  // 白露
  [10, 195], // 寒露
  [11, 225], // 立冬
  [12, 255], // 大雪
];

const setsuCache = new Map();
const KANSHI_BASE_UTC = Date.UTC(2026, 0, 1); // 2026-01-01 = 乙亥 (index 11)

export const DEFAULT_BUSINESS_RULES = Object.freeze({
  excludeSaturday: true,
  excludeSunday: true,
  excludeHolidays: true,
  excludeWednesday: false,
  excludeYearEnd: false,
  excludeObon: false,
});

export function getHoliday(iso) {
  return JAPAN_HOLIDAYS[iso] ?? null;
}

export function getHolidaysByYear(year) {
  const prefix = `${year}-`;
  return Object.values(JAPAN_HOLIDAYS)
    .filter((h) => h.iso.startsWith(prefix))
    .sort((a, b) => a.iso.localeCompare(b.iso));
}

export function parseIsoDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return dt;
}

export function formatIsoDate(dt) {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysUtc(dt, days) {
  return new Date(dt.getTime() + days * 86400000);
}

export function addMonthsUtc(dt, months) {
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth();
  const d = dt.getUTCDate();
  const targetMonthIndex = m + months;
  const targetYear = y + Math.floor(targetMonthIndex / 12);
  const normMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, normMonth, Math.min(d, lastDay)));
}

export function diffDaysUtc(start, end) {
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export function formatWareki(iso) {
  const dt = parseIsoDate(iso);
  if (!dt) return '';
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  const d = dt.getUTCDate();
  const ymd = y * 10000 + m * 100 + d;
  if (ymd >= 20190501) {
    const ry = y - 2018;
    return `令和${ry === 1 ? '元' : ry}年`;
  }
  if (ymd >= 19890108) {
    const hy = y - 1988;
    return `平成${hy === 1 ? '元' : hy}年`;
  }
  if (ymd >= 19261225) {
    const sy = y - 1925;
    return `昭和${sy === 1 ? '元' : sy}年`;
  }
  return `${y}年`;
}

function solarLongitudeDeg(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const Mrad = (M * Math.PI) / 180;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin((omega * Math.PI) / 180);
  return ((lambda % 360) + 360) % 360;
}

export function getSetsuDatesForYear(year) {
  const cached = setsuCache.get(year);
  if (cached) return cached;
  const list = SETSU_DEGREES.map(([approxMonth, targetDeg]) => {
    let lo = Date.UTC(year, approxMonth - 1, 1) - 9 * 3600000;
    let hi = Date.UTC(year, approxMonth - 1, 12) - 9 * 3600000;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const lon = solarLongitudeDeg(mid / 86400000 + 2440587.5);
      let diff = lon - targetDeg;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      if (diff < 0) lo = mid;
      else hi = mid;
    }
    const jst = new Date((lo + hi) / 2 + 9 * 3600000);
    return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}-${String(jst.getUTCDate()).padStart(2, '0')}`;
  });
  setsuCache.set(year, list);
  return list;
}

export function getLunarDate(iso) {
  const dt = parseIsoDate(iso);
  if (!dt) return { month: 1, day: 1, isLeap: false, label: '旧暦1月1日' };

  if (iso >= LUNAR_NEW_MOONS[0][0] && iso <= '2033-02-20') {
    let lo = 0;
    let hi = LUNAR_NEW_MOONS.length - 1;
    let idx = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (LUNAR_NEW_MOONS[mid][0] <= iso) {
        idx = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    const [startIso, lm, isLeap] = LUNAR_NEW_MOONS[idx];
    const startDt = parseIsoDate(startIso);
    const ld = diffDaysUtc(startDt, dt) + 1;
    return {
      month: lm,
      day: ld,
      isLeap,
      label: `旧暦${isLeap ? '閏' : ''}${lm}月${ld}日`,
    };
  }

  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-chinese', {
      timeZone: 'Asia/Tokyo',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = fmt.formatToParts(new Date(dt.getTime() + 3 * 3600000));
    const lmRaw = parts.find((p) => p.type === 'month')?.value ?? '1';
    const isLeap = lmRaw.includes('bis');
    const lm = Number.parseInt(lmRaw.replace(/[^0-9]/g, ''), 10) || 1;
    const ld = Number.parseInt(parts.find((p) => p.type === 'day')?.value ?? '1', 10) || 1;
    return { month: lm, day: ld, isLeap, label: `旧暦${isLeap ? '閏' : ''}${lm}月${ld}日` };
  } catch {
    return { month: 1, day: 1, isLeap: false, label: '旧暦1月1日' };
  }
}

export function getDayAlmanac(iso) {
  const dt = parseIsoDate(iso) ?? new Date(Date.UTC(2026, 0, 1));
  const normIso = formatIsoDate(dt);
  const year = dt.getUTCFullYear();
  const month = dt.getUTCMonth() + 1;
  const day = dt.getUTCDate();
  const weekdayIndex = dt.getUTCDay();
  const weekdayJa = WEEKDAYS_JA[weekdayIndex];
  const holiday = getHoliday(normIso);
  const lunar = getLunarDate(normIso);
  const rokuyo = ROKUYO_ORDER[(lunar.month + lunar.day) % 6];

  const diff = Math.round((dt.getTime() - KANSHI_BASE_UTC) / 86400000);
  const k60 = (((11 + diff) % 60) + 60) % 60;
  const kan = k60 % 10;
  const shi = k60 % 12;
  const kanshi = `${JIKKAN[kan]}${JUNISHI[shi]}`;

  const s = getSetsuDatesForYear(year);
  let sg = 11;
  if (normIso >= s[11]) sg = 11;
  else if (normIso >= s[10]) sg = 10;
  else if (normIso >= s[9]) sg = 9;
  else if (normIso >= s[8]) sg = 8;
  else if (normIso >= s[7]) sg = 7;
  else if (normIso >= s[6]) sg = 6;
  else if (normIso >= s[5]) sg = 5;
  else if (normIso >= s[4]) sg = 4;
  else if (normIso >= s[3]) sg = 3;
  else if (normIso >= s[2]) sg = 2;
  else if (normIso >= s[1]) sg = 1;
  else if (normIso >= s[0]) sg = 12;

  const isIchiryumanbaibi = ICHIRYU_BY_SETSUGETSU[sg].includes(shi);
  const isTenshanichi =
    (sg <= 3 && k60 === 14) ||
    (sg >= 4 && sg <= 6 && k60 === 30) ||
    (sg >= 7 && sg <= 9 && k60 === 44) ||
    (sg >= 10 && k60 === 0);
  const isToraNoHi = shi === 2;
  const isMiNoHi = shi === 5;
  const isTsuchinotoMi = k60 === 5;
  const isKinoene = k60 === 0;

  const luckyTags = [];
  if (isTenshanichi) luckyTags.push('天赦日');
  if (isIchiryumanbaibi) luckyTags.push('一粒万倍日');
  if (isToraNoHi) luckyTags.push('寅の日');
  if (isTsuchinotoMi) luckyTags.push('己巳の日');
  else if (isMiNoHi) luckyTags.push('巳の日');
  if (isKinoene) luckyTags.push('甲子の日');

  const isSuperLucky = isTenshanichi && (isIchiryumanbaibi || rokuyo === '大安' || isToraNoHi);

  return {
    iso: normIso,
    year,
    month,
    day,
    weekdayIndex,
    weekdayJa,
    wareki: formatWareki(normIso),
    holiday,
    lunar,
    rokuyo,
    rokuyoInfo: ROKUYO_DESC[rokuyo],
    kanshi,
    isTenshanichi,
    isIchiryumanbaibi,
    isToraNoHi,
    isMiNoHi,
    isTsuchinotoMi,
    isKinoene,
    isSuperLucky,
    luckyTags,
  };
}

export function calculatePeriod(startIsoRaw, endIsoRaw, mode = 'kataha') {
  const s0 = parseIsoDate(startIsoRaw) ?? new Date(Date.UTC(2026, 0, 1));
  const e0 = parseIsoDate(endIsoRaw) ?? new Date(Date.UTC(2026, 0, 10));
  const isReversed = e0.getTime() < s0.getTime();
  const s = isReversed ? e0 : s0;
  const e = isReversed ? s0 : e0;

  const katahaDays = diffDaysUtc(s, e);
  const ryouhaDays = katahaDays + 1;
  const activeDays = mode === 'ryouha' ? ryouhaDays : katahaDays;

  let weekdaysCount = 0;
  let weekendCount = 0;
  let holidayOnWeekdayCount = 0;
  const holidaysInPeriod = [];

  const loopStart = mode === 'ryouha' ? s : addDaysUtc(s, 1);
  const spanCount = Math.min(activeDays, 40000);
  for (let i = 0; i < spanCount; i++) {
    const cur = addDaysUtc(loopStart, i);
    const iso = formatIsoDate(cur);
    const dow = cur.getUTCDay();
    const hol = getHoliday(iso);
    if (hol) holidaysInPeriod.push(hol);
    if (dow === 0 || dow === 6) {
      weekendCount++;
    } else if (hol) {
      holidayOnWeekdayCount++;
    } else {
      weekdaysCount++;
    }
  }

  return {
    startIso: formatIsoDate(s0),
    endIso: formatIsoDate(e0),
    isReversed,
    mode,
    katahaDays,
    ryouhaDays,
    activeDays,
    weeks: Math.floor(activeDays / 7),
    remDays: activeDays % 7,
    approxMonths: Math.round((activeDays / 30.4375) * 10) / 10,
    hours: activeDays * 24,
    weekdaysCount,
    weekendCount,
    holidayOnWeekdayCount,
    holidaysInPeriod,
    startAlmanac: getDayAlmanac(formatIsoDate(s0)),
    endAlmanac: getDayAlmanac(formatIsoDate(e0)),
    excelKataha: '=B1-A1',
    excelRyouha: '=B1-A1+1',
    excelNetworkdays: mode === 'ryouha' ? '=NETWORKDAYS(A1,B1,祝日範囲)' : '=NETWORKDAYS(A1+1,B1,祝日範囲)',
  };
}

export function calculateOffset(
  baseIsoRaw,
  amountRaw,
  unit = 'days',
  direction = 'after',
  includeStartDay = false,
) {
  const base = parseIsoDate(baseIsoRaw) ?? new Date(Date.UTC(2026, 3, 1));
  const amount = Math.max(0, Math.min(36500, Math.floor(Math.abs(amountRaw))));
  const sign = direction === 'after' ? 1 : -1;

  const computeTarget = (incl) => {
    if (unit === 'months') {
      const d = addMonthsUtc(base, sign * amount);
      return incl && amount > 0 ? addDaysUtc(d, -sign) : d;
    }
    const rawDays = unit === 'weeks' ? amount * 7 : amount;
    const adjDays = incl && rawDays > 0 ? rawDays - 1 : rawDays;
    return addDaysUtc(base, sign * adjDays);
  };

  const targetDt = computeTarget(includeStartDay);
  const altDt = computeTarget(!includeStartDay);
  const baseIso = formatIsoDate(base);
  const targetIso = formatIsoDate(targetDt);
  const altIso = formatIsoDate(altDt);
  const period = calculatePeriod(baseIso, targetIso, includeStartDay ? 'ryouha' : 'kataha');

  let excelFormula = `=A1${sign > 0 ? '+' : '-'}${amount}`;
  if (unit === 'days' && includeStartDay && amount > 0) {
    excelFormula = `=A1${sign > 0 ? '+' : '-'}${amount - 1}`;
  } else if (unit === 'weeks') {
    const dCount = includeStartDay && amount > 0 ? amount * 7 - 1 : amount * 7;
    excelFormula = `=A1${sign > 0 ? '+' : '-'}${dCount}`;
  } else if (unit === 'months') {
    excelFormula = `=EDATE(A1,${sign > 0 ? amount : -amount})`;
  }

  return {
    baseIso,
    amount,
    unit,
    direction,
    includeStartDay,
    target: getDayAlmanac(targetIso),
    altTarget: getDayAlmanac(altIso),
    calendarDaysDiff: Math.abs(diffDaysUtc(base, targetDt)),
    businessDaysApprox: period.weekdaysCount,
    excelFormula,
  };
}

function buildWorkdayIntlMask(rules) {
  return [
    '0',
    '0',
    rules.excludeWednesday ? '1' : '0',
    '0',
    '0',
    rules.excludeSaturday ? '1' : '0',
    rules.excludeSunday ? '1' : '0',
  ].join('');
}

export function checkBusinessDay(iso, rules = DEFAULT_BUSINESS_RULES) {
  const merged = { ...DEFAULT_BUSINESS_RULES, ...rules };
  const dt = parseIsoDate(iso);
  if (!dt) return { isBusiness: false, reason: '' };
  const dow = dt.getUTCDay();
  const m = dt.getUTCMonth() + 1;
  const d = dt.getUTCDate();
  const hol = getHoliday(iso);

  if (merged.excludeHolidays && hol) return { isBusiness: false, reason: hol.name };
  if (merged.excludeYearEnd && ((m === 12 && d >= 29) || (m === 1 && d <= 3))) {
    return { isBusiness: false, reason: '年末年始休業' };
  }
  if (merged.excludeObon && m === 8 && d >= 13 && d <= 16) {
    return { isBusiness: false, reason: 'お盆休業' };
  }
  if (merged.excludeSunday && dow === 0) return { isBusiness: false, reason: '日曜定休' };
  if (merged.excludeSaturday && dow === 6) return { isBusiness: false, reason: '土曜定休' };
  if (merged.excludeWednesday && dow === 3) return { isBusiness: false, reason: '水曜定休' };
  return { isBusiness: true, reason: '営業日' };
}

export function calculateBusinessDayOffset(
  baseIsoRaw,
  businessDaysRaw,
  direction = 'after',
  rules = DEFAULT_BUSINESS_RULES,
) {
  const merged = { ...DEFAULT_BUSINESS_RULES, ...rules };
  const base = parseIsoDate(baseIsoRaw) ?? new Date(Date.UTC(2026, 8, 18));
  const steps = Math.max(0, Math.min(1000, Math.floor(Math.abs(businessDaysRaw))));
  const sign = direction === 'after' ? 1 : -1;

  let cur = base;
  let counted = 0;
  let calendarStep = 0;
  const skippedReasons = [];

  while (counted < steps && calendarStep < 3000) {
    calendarStep++;
    cur = addDaysUtc(base, sign * calendarStep);
    const iso = formatIsoDate(cur);
    const st = checkBusinessDay(iso, merged);
    if (st.isBusiness) counted++;
    else skippedReasons.push({ iso, reason: st.reason });
  }

  const targetIso = formatIsoDate(cur);
  const excelFormula =
    !merged.excludeSaturday || !merged.excludeSunday || merged.excludeWednesday
      ? `=WORKDAY.INTL(A1,${sign > 0 ? steps : -steps},"${buildWorkdayIntlMask(merged)}",祝日範囲)`
      : `=WORKDAY(A1,${sign > 0 ? steps : -steps},祝日範囲)`;

  return {
    baseIso: formatIsoDate(base),
    businessDays: steps,
    direction,
    target: getDayAlmanac(targetIso),
    totalCalendarDays: calendarStep,
    skippedDaysCount: skippedReasons.length,
    skippedReasons,
    excelFormula,
  };
}

export function calculateBusinessDaysBetween(
  startIsoRaw,
  endIsoRaw,
  includeStart = true,
  rules = DEFAULT_BUSINESS_RULES,
) {
  const merged = { ...DEFAULT_BUSINESS_RULES, ...rules };
  const s0 = parseIsoDate(startIsoRaw) ?? new Date(Date.UTC(2026, 8, 1));
  const e0 = parseIsoDate(endIsoRaw) ?? new Date(Date.UTC(2026, 8, 30));
  const s = s0.getTime() <= e0.getTime() ? s0 : e0;
  const e = s0.getTime() <= e0.getTime() ? e0 : s0;

  const startLoop = includeStart ? s : addDaysUtc(s, 1);
  const total = Math.max(0, Math.min(20000, diffDaysUtc(startLoop, e) + 1));

  let businessDays = 0;
  let nonBusinessDays = 0;
  const holidaysExcluded = [];

  for (let i = 0; i < total; i++) {
    const cur = addDaysUtc(startLoop, i);
    const iso = formatIsoDate(cur);
    const st = checkBusinessDay(iso, merged);
    if (st.isBusiness) {
      businessDays++;
    } else {
      nonBusinessDays++;
      if (st.reason !== '土曜定休' && st.reason !== '日曜定休') {
        holidaysExcluded.push({ iso, reason: st.reason });
      }
    }
  }

  const startRef = includeStart ? 'A1' : 'A1+1';
  const excelFormula =
    !merged.excludeSaturday || !merged.excludeSunday || merged.excludeWednesday
      ? `=NETWORKDAYS.INTL(${startRef},B1,"${buildWorkdayIntlMask(merged)}",祝日範囲)`
      : `=NETWORKDAYS(${startRef},B1,祝日範囲)`;

  return {
    startIso: formatIsoDate(s),
    endIso: formatIsoDate(e),
    includeStart,
    businessDays,
    nonBusinessDays,
    totalDays: total,
    holidaysExcluded,
    excelFormula,
  };
}

export function getYearLuckyDays(year) {
  const tenshanichi = [];
  const superLuckyDays = [];
  const taianIchiryumanbaibi = [];

  for (let ms = Date.UTC(year, 0, 1); ms <= Date.UTC(year, 11, 31); ms += 86400000) {
    const iso = formatIsoDate(new Date(ms));
    const info = getDayAlmanac(iso);
    if (info.isTenshanichi) tenshanichi.push(info);
    if (info.isSuperLucky) superLuckyDays.push(info);
    if (info.rokuyo === '大安' && info.isIchiryumanbaibi) taianIchiryumanbaibi.push(info);
  }
  return { tenshanichi, superLuckyDays, taianIchiryumanbaibi };
}
