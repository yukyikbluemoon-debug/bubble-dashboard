# Market Seismograph — Bubble Risk Dashboard

เว็บหน้าเดียวที่รวมตัวชี้วัดฟองสบู่ตลาดหุ้นมาเป็นคะแนนความเสี่ยงรวม (0–100) แสดงเป็นเกจ + ไทม์ไลน์เทียบกับจุดพีคในอดีต รองรับสองตลาด: **US (S&P 500)** และ **SET (ตลาดหุ้นไทย)** สลับได้จากปุ่มมุมขวาบน

## รันดูในเครื่อง

ต้องรันผ่าน local server (เปิดไฟล์ `index.html` ตรงๆ จะโหลดไฟล์ JSON ไม่ได้ เพราะ browser บล็อก `fetch` บน `file://`)

```bash
cd bubble-dashboard
python3 -m http.server 8000
# แล้วเปิด http://localhost:8000
```

## ขึ้น GitHub Pages

```bash
git init
git add .
git commit -m "Initial bubble risk dashboard"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

จากนั้นไปที่ repo → **Settings → Pages** → Source เลือก branch `main` โฟลเดอร์ `/ (root)` → กด Save รอ 1-2 นาที เว็บจะขึ้นที่ `https://<your-username>.github.io/<repo-name>/`

## ฟีเจอร์สำหรับมือใหม่

- กดปุ่ม **"📖 ยังไม่เข้าใจกราฟนี้?"** ใต้เกจ เพื่ออ่านคำอธิบายวิธีอ่าน dashboard แบบง่ายๆ
- แต่ละการ์ดตัวชี้วัดมีปุ่ม **`?`** มุมขวาบน กดเพื่ออ่านคำอธิบายภาษาง่ายๆ ว่าตัวเลขนี้คืออะไร ทำไมถึงสำคัญ
- ถ้าข้อมูลไม่ได้อัปเดตเกิน 40 วัน จะมี **แถบเตือนสีเหลือง** ขึ้นด้านบนอัตโนมัติ กันดูตัวเลขเก่าโดยไม่รู้ตัว

## วิธีอัปเดตข้อมูล

### ตลาด US (`data/bubble-data-us.json`)

| ตัวชี้วัด | ไปเอาข้อมูลจากไหน | อัปเดตอัตโนมัติ? |
|---|---|---|
| **Shiller CAPE** | [multpl.com/shiller-pe](https://www.multpl.com/shiller-pe) | ไม่ (ต้อง manual) |
| **Yield Curve (10Y-2Y)** | [FRED: T10Y2Y](https://fred.stlouisfed.org/series/T10Y2Y) | **ใช่** — ดูหัวข้อ "Automation" ด้านล่าง |
| **VIX** | [Yahoo Finance ^VIX](https://finance.yahoo.com/quote/%5EVIX/) | ไม่ |
| **Margin Debt Growth** | [FINRA Margin Statistics](https://www.finra.org/investors/investing/investment-products/margin-accounts) | ไม่ |
| **AAII Bull-Bear Spread** | [AAII Sentiment Survey](https://www.aaii.com/sentimentsurvey) — อัปเดตทุกวันพุธ | ไม่ |

### ตลาด SET (`data/bubble-data-th.json`)

| ตัวชี้วัด | สถานะ | ไปเอาข้อมูลจากไหน |
|---|---|---|
| **SET Forward P/E** | มีข้อมูลแล้ว | SET / โบรกเกอร์รายงาน valuation |
| **แรงซื้อ-ขายต่างชาติสะสม** | ยังไม่ได้กรอก (`value: null`) | [SET Market Statistics → Investor Type](https://www.set.or.th/th/market/statistics/investor-type) |
| **ยอด Credit Balance** | ยังไม่ได้กรอก | [SET Market Statistics → Margin Loan](https://www.set.or.th/th/market/statistics/margin-loan) |
| **สัดส่วนนักลงทุนรายย่อย** | ยังไม่ได้กรอก | SET Market Statistics → Investor Type |

ตัวที่ `value: null` เกจจะไม่เอาไปคิดคะแนนเฉลี่ย (ข้ามอัตโนมัติ) กรอกเพิ่มได้เมื่อไหร่ก็ได้ ยิ่งกรอกครบยิ่งแม่น

### วิธีแก้ค่าในไฟล์ JSON

แต่ละตัวชี้วัดมี field: `value` (ตัวเลขปัจจุบัน), `asOf` (วันที่ของตัวเลขนั้น), `sourceUrl` (ลิงก์ไปแหล่งข้อมูล — ขึ้นเป็นปุ่มบนการ์ด), และ `riskScore` (0-100 ประเมินเองตามตำแหน่งเทียบ `scaleMin`/`scaleMid`/`scaleMax`) — **คะแนนรวมบนเกจคำนวณจากค่าเฉลี่ย `riskScore` อัตโนมัติ ห้ามแก้แค่ `value` แล้วลืมปรับ `riskScore` ตาม ไม่งั้นเกจจะไม่ตรงกับตัวเลขจริง**

จุดล่าสุดใน `historicalComposite` (ปีปัจจุบัน) ควรเท่ากับค่าเฉลี่ย `riskScore` เสมอ เพื่อไม่ให้กราฟไทม์ไลน์ขัดกับเกจ — จุดปีเก่ากว่านั้นเป็นค่าประมาณเชิงภาพประกอบ ไม่จำเป็นต้องคำนวณด้วยสูตรเดียวกัน (มีหมายเหตุอธิบายไว้ในหน้าเว็บแล้ว)

### ก่อน commit — รันตัวช่วยเช็คความสมเหตุสมผล

```bash
python3 validate_data.py
```

สคริปต์นี้เทียบค่าที่คุณเพิ่งแก้กับค่าที่ commit ไว้ล่าสุดใน git แล้วเตือนถ้าเปลี่ยนแปลงมากผิดปกติ (เช่น พิมพ์ผิดหลัก หรือหยิบตัวเลขจากช่วงเวลาที่ผิดมาใส่ — ปัญหานี้เคยเกิดขึ้นจริงกับตัวเลข AAII ในเวอร์ชันก่อนหน้า) เป็นแค่คำเตือน ไม่บล็อกการ commit ให้อ่านก่อนตัดสินใจเอง

### Automation (ตัวเดียวที่ทำได้จริงโดยไม่มี API key)

`Yield Curve` ดึงข้อมูลอัตโนมัติทุกสัปดาห์ผ่าน GitHub Actions (`.github/workflows/update-yield-curve.yml`) ที่รัน `scripts/update_yield_curve.py` ดึง CSV สาธารณะจาก FRED แล้ว commit ให้เอง — ไม่ต้องมี API key เพราะรันฝั่ง server (GitHub's runner) ไม่ใช่ฝั่ง browser เลยไม่ติดปัญหา CORS แบบที่ดึงตรงจากหน้าเว็บไม่ได้

ตัวชี้วัดอื่น (CAPE, VIX, Margin Debt, AAII) ไม่มี endpoint สาธารณะแบบไม่ต้องใช้ key เลยต้อง manual ต่อไป — ถ้าจะ automate เพิ่ม ต้องใช้ API ที่มี key (เช่น Alpha Vantage) ซึ่งจะกลับไปเจอปัญหาเดิมคือ "จะซ่อนคีย์ไว้ที่ไหนใน static site" (คำตอบคือ: ต้องรันผ่าน GitHub Actions เหมือนกัน แล้วเก็บ key เป็น GitHub Secret ไม่ใส่ในโค้ด — ทำได้ถ้าอยากขยายในอนาคต)

## วิธีอัปเดตแบบไม่ต้องขอ Token ทุกครั้ง

ถ้าจะอัปเดตข้อมูลบ่อยๆ การขอ Personal Access Token ใหม่ทุกรอบ (สร้าง-ส่ง-revoke) ปลอดภัยแต่เสียเวลา ทางเลือกที่สะดวกกว่าในระยะยาว:

1. **แก้ตรงเว็บ GitHub เอง** — เข้าไฟล์ที่ต้องการแก้ → กดไอคอนดินสอ → แก้ → Commit ไม่ต้องมี token เลยเพราะ login ค้างอยู่ในเบราว์เซอร์อยู่แล้ว (วิธีนี้แนะนำที่สุดสำหรับการแก้ 1-2 ค่า)
2. **ติดตั้ง git + GitHub CLI บนเครื่องตัวเอง** แล้ว `gh auth login` ครั้งเดียว (เก็บ credential ปลอดภัยกว่าการ paste token ในแชท) จากนั้น push ได้เองทุกครั้งโดยไม่ต้องพึ่งผม

## โครงสร้างไฟล์

```
bubble-dashboard/
├── index.html
├── style.css
├── script.js
├── validate_data.py           # เช็คความสมเหตุสมผลก่อน commit
├── data/
│   ├── bubble-data-us.json     # ตลาด US
│   └── bubble-data-th.json     # ตลาด SET
├── scripts/
│   └── update_yield_curve.py   # สคริปต์ที่ GitHub Actions รันอัตโนมัติ
├── .github/workflows/
│   └── update-yield-curve.yml
└── README.md
```

## ข้อจำกัด

ไม่ใช่คำแนะนำการลงทุน เป็นเครื่องมือสรุปตัวเลข valuation/sentiment ให้ดูภาพรวมเร็วขึ้นเท่านั้น ตัวเลข `riskScore` เป็นการประเมินเชิงคุณภาพของคุณเอง ไม่ใช่สูตรวิชาการที่พิสูจน์แล้วว่าทำนายได้แม่นยำ ข้อมูลตลาด SET ยังไม่ครบทุกตัวชี้วัด — คะแนนรวมของ SET จะแม่นขึ้นเมื่อกรอกข้อมูลที่เหลือ
