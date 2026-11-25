import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getHoliday,
  getHolidaysByYear,
  getLunarDate,
  getDayAlmanac,
  calculatePeriod,
  calculateOffset,
  calculateBusinessDayOffset,
  calculateBusinessDaysBetween,
  getYearLuckyDays,
  formatWareki,
} from '../src/index.js';

test('Cabinet Office 2026 Silver Week 5-day holiday (Citizens Holiday 2026-09-22)', () => {
  const sep21 = getHoliday('2026-09-21');
  const sep22 = getHoliday('2026-09-22');
  const sep23 = getHoliday('2026-09-23');
  assert.equal(sep21?.name, '敬老の日');
  assert.equal(sep22?.isCitizensHoliday, true);
  assert.equal(sep23?.name, '秋分の日');
  assert.equal(getHolidaysByYear(2026).length, 18);
  assert.equal(getHolidaysByYear(2027).length, 17);
});

test('Period calculation: kataha (Civil Code Art. 140) vs ryouha (inclusive)', () => {
  const kataha = calculatePeriod('2026-04-01', '2026-04-10', 'kataha');
  assert.equal(kataha.katahaDays, 9);
  assert.equal(kataha.ryouhaDays, 10);
  assert.equal(kataha.activeDays, 9);
  assert.equal(kataha.excelKataha, '=B1-A1');
  assert.equal(kataha.excelNetworkdays, '=NETWORKDAYS(A1+1,B1,祝日範囲)');

  const ryouha = calculatePeriod('2026-04-01', '2026-04-10', 'ryouha');
  assert.equal(ryouha.activeDays, 10);
  assert.equal(ryouha.excelRyouha, '=B1-A1+1');
  assert.equal(ryouha.excelNetworkdays, '=NETWORKDAYS(A1,B1,祝日範囲)');
  assert.equal(ryouha.weekdaysCount + ryouha.weekendCount + ryouha.holidayOnWeekdayCount, 10);
});

test('Offset calculation: Shijukunichi (49th day inclusive) & Okuizome (100th day inclusive)', () => {
  // 命日を1日目として数える四十九日 = +48日
  const r49 = calculateOffset('2026-04-01', 49, 'days', 'after', true);
  assert.equal(r49.target.iso, '2026-05-19');
  assert.equal(r49.altTarget.iso, '2026-05-20');
  assert.equal(r49.calendarDaysDiff, 48);
  assert.equal(r49.excelFormula, '=A1+48');

  // 誕生日を1日目として数えるお食い初め(生後100日) = +99日
  const r100 = calculateOffset('2026-01-01', 100, 'days', 'after', true);
  assert.equal(r100.target.iso, '2026-04-10');
  assert.equal(r100.calendarDaysDiff, 99);
});

test('Business day offset skips 2026 Silver Week (Sep 19-23)', () => {
  // 2026-09-18 (Fri) + 1 business day => 2026-09-24 (Thu), skipping Sat/Sun/Mon/Tue/Wed
  const res = calculateBusinessDayOffset('2026-09-18', 1, 'after');
  assert.equal(res.target.iso, '2026-09-24');
  assert.equal(res.skippedDaysCount, 5);
  assert.equal(res.excelFormula, '=WORKDAY(A1,1,祝日範囲)');

  // Reverse calculation: 2026-09-24 - 1 business day => 2026-09-18
  const rev = calculateBusinessDayOffset('2026-09-24', 1, 'before');
  assert.equal(rev.target.iso, '2026-09-18');
});

test('Business days between handles includeStart true/false and custom Year-End/Obon/Wednesday rules', () => {
  const incl = calculateBusinessDaysBetween('2026-09-18', '2026-09-24', true);
  assert.equal(incl.businessDays, 2); // Sep 18 & Sep 24
  assert.equal(incl.excelFormula, '=NETWORKDAYS(A1,B1,祝日範囲)');

  const excl = calculateBusinessDaysBetween('2026-09-18', '2026-09-24', false);
  assert.equal(excl.businessDays, 1); // Sep 24 only
  assert.equal(excl.excelFormula, '=NETWORKDAYS(A1+1,B1,祝日範囲)');

  const wedClosed = calculateBusinessDaysBetween('2026-04-06', '2026-04-10', true, {
    excludeWednesday: true,
  });
  assert.equal(wedClosed.businessDays, 4);
  assert.match(wedClosed.excelFormula, /^=NETWORKDAYS\.INTL\(A1,B1,"0010011"/);
});

test('JST Tenpo-reki lunar date, Rokuyo, Wareki, and 2026 Tenshanichi lucky days', () => {
  assert.equal(formatWareki('2026-05-01'), '令和8年');
  assert.equal(formatWareki('2019-05-01'), '令和元年');

  const lunar = getLunarDate('2026-02-17');
  assert.equal(lunar.month, 1);
  assert.equal(lunar.day, 1);
  assert.equal(lunar.isLeap, false);

  // 旧暦1月1日 => (1 + 1) % 6 = 2 => 先勝
  const almanac = getDayAlmanac('2026-02-17');
  assert.equal(almanac.rokuyo, '先勝');

  // 2026-03-05 is a famous 2026 super lucky day (天赦日 + 一粒万倍日 + 寅の日 + 大安)
  const mar5 = getDayAlmanac('2026-03-05');
  assert.equal(mar5.isTenshanichi, true);
  assert.equal(mar5.isIchiryumanbaibi, true);
  assert.equal(mar5.isToraNoHi, true);
  assert.equal(mar5.rokuyo, '大安');
  assert.equal(mar5.isSuperLucky, true);

  const lucky2026 = getYearLuckyDays(2026);
  assert.equal(lucky2026.tenshanichi.length, 6);
  assert.ok(lucky2026.superLuckyDays.some((d) => d.iso === '2026-03-05'));
});
