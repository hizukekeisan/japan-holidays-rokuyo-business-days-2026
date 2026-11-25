# Japan Holidays, JST Rokuyo & Business Days Dataset & Engine (2024–2028)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Data: CC BY 4.0](https://img.shields.io/badge/Data-CC%20BY%204.0-green.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Node >= 18](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

Open, structured Japanese calendar reference datasets (**JSON & CSV**) and a zero-dependency **ESM JavaScript** calculation engine covering Cabinet Office national holidays (2024–2028), **JST (Asia/Tokyo, UTC+9)** astronomical lunar new moons for Tenpo-reki Rokuyo (六曜), Tenshanichi / Ichiryumanbaibi lucky days (天赦日・一粒万倍日), Civil Code Art. 140 period counting (片端入れ vs 両端入れ), and Japanese business day offsets.

> **Interactive Browser Calculator (Free, No Registration)**  
> Use the interactive Japanese calendar suite powered by this dataset & engine at **[hizukekeisan.com](https://hizukekeisan.com/)** — including:
> - [期間の日数計算（片端入れ・両端入れ・平日内訳）](https://hizukekeisan.com/kikan/)
> - [何日後・何日前計算（四十九日・生後100日 初日算入防錯）](https://hizukekeisan.com/nanichigo/)
> - [営業日計算・納期逆算（2026〜2027祝日・年末年始・お盆・水曜定休対応）](https://hizukekeisan.com/eigyobi/)
> - [六曜・天赦日・一粒万倍日＆残日数カレンダー](https://hizukekeisan.com/rokuyo/)

---

## Included Open Datasets (`data/`)

| File | Format | Coverage | Primary Official / Astronomical Source |
| :--- | :--- | :--- | :--- |
| [`data/japan_holidays_2024_2028.json`](./data/japan_holidays_2024_2028.json) / [`.csv`](./data/japan_holidays_2024_2028.csv) | JSON, CSV | 91 national holidays (2024–2027 confirmed, 2028 projected) | Cabinet Office of Japan ([内閣府「国民の祝日」について](https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html)) |
| [`data/jst_lunar_new_moons_2019_2033.json`](./data/jst_lunar_new_moons_2019_2033.json) / [`.csv`](./data/jst_lunar_new_moons_2019_2033.csv) | JSON, CSV | 163 astronomical new moons in **JST (UTC+9)** | Meeus *Astronomical Algorithms* Ch. 49 evaluated in Asia/Tokyo (天保暦準拠) |
| [`data/rokuyo_and_lucky_days.json`](./data/rokuyo_and_lucky_days.json) | JSON | Rokuyo order, 4-season Tenshanichi, 12-Setsugetsu Ichiryumanbaibi | Traditional Japanese almanac rules (六曜・天赦日・一粒万倍日) |

### Why JST-Specific New Moons Matter

Many international calendar libraries compute lunar new moons in UTC or CST (UTC+8). When an astronomical new moon occurs between **00:00 and 01:00 JST** (or between 15:00 and 23:59 UTC), UTC/CST-based tables shift the lunar 1st day by 1 day, cascading errors across an entire month of Japanese **Rokuyo (六曜)**. This dataset pre-computes every lunar conjunction directly in **Asia/Tokyo (UTC+9)**.

---

## Key 2026–2027 Calendar Benchmarks

| Benchmark | Date / Rule | Result | Reference Tool |
| :--- | :--- | :--- | :--- |
| 2026 Silver Week Citizens' Holiday | `2026-09-21` (敬老の日) – `2026-09-23` (秋分の日) | `2026-09-22` is 国民の休日 (5-day holiday) | [`/eigyobi/`](https://hizukekeisan.com/eigyobi/) |
| Business Day Offset across Silver Week | `2026-09-18` + 1 business day | `2026-09-24` (skips 5 days) | [`/eigyobi/`](https://hizukekeisan.com/eigyobi/) |
| Civil Code Art. 140 vs Inclusive Counting | `2026-04-01` → `2026-04-10` | 片端入れ `9` days (`=B1-A1`) / 両端入れ `10` days (`=B1-A1+1`) | [`/kikan/`](https://hizukekeisan.com/kikan/) |
| Shijukunichi (四十九日, inclusive) | `2026-04-01` + 49th day (初日算入 = `+48`) | `2026-05-19` (`=A1+48`) | [`/nanichigo/`](https://hizukekeisan.com/nanichigo/) |
| 2026 Super Lucky Day (最強開運日) | `2026-03-05` | 天赦日 + 一粒万倍日 + 寅の日 + 大安 | [`/rokuyo/`](https://hizukekeisan.com/rokuyo/) |

---

## Quick Start (Zero-Dependency Node.js ESM)

```js
import {
  calculatePeriod,
  calculateOffset,
  calculateBusinessDayOffset,
  calculateBusinessDaysBetween,
  getDayAlmanac,
  getYearLuckyDays,
} from './src/index.js';

// 1. Period days (Civil Code Art. 140 kataha vs inclusive ryouha)
const period = calculatePeriod('2026-04-01', '2026-04-10', 'kataha');
console.log(period.katahaDays, period.ryouhaDays, period.excelNetworkdays);
// => 9 10 '=NETWORKDAYS(A1+1,B1,祝日範囲)'

// 2. Business day offset across Japan's 2026 Silver Week (Sep 19–23)
const delivery = calculateBusinessDayOffset('2026-09-18', 1, 'after');
console.log(delivery.target.iso, delivery.skippedDaysCount);
// => '2026-09-24' 5

// 3. Shijukunichi (49th day counting day 1 as death date)
const memorial = calculateOffset('2026-04-01', 49, 'days', 'after', true);
console.log(memorial.target.iso, memorial.target.rokuyo);
// => '2026-05-19' '先勝'

// 4. JST Rokuyo & 2026 Tenshanichi super lucky days
console.log(getDayAlmanac('2026-03-05').luckyTags);
// => ['天赦日', '一粒万倍日', '寅の日']
console.log(getYearLuckyDays(2026).tenshanichi.map((d) => d.iso));
```

Run the unit test suite (Node.js >= 18):

```bash
npm test
```

---

## Annual Maintenance Schedule

- **Every February (`暦要項` Release)**: Update projected national holidays with confirmed Cabinet Office CSV data once the National Astronomical Observatory of Japan (国立天文台) publishes the official ephemeris for the following year.

## License & Citation

- **Source Code (`src/`, `test/`)**: [MIT License](./LICENSE)
- **Open Datasets (`data/*.json`, `data/*.csv`)**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — attribution to **HizukeKeisanJP ([hizukekeisan.com](https://hizukekeisan.com/))**.
- See [`CITATION.cff`](./CITATION.cff) and [`.zenodo.json`](./.zenodo.json) for machine-readable citation metadata.
