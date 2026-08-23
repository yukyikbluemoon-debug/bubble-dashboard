# Market Seismograph — Bubble Risk Dashboard

เว็บหน้าเดียวที่รวมตัวชี้วัดฟองสบู่ตลาดหุ้น (CAPE, Yield Curve, VIX, Margin Debt, Sentiment) มาเป็นคะแนนความเสี่ยงรวม (0–100) แสดงเป็นเกจ + ไทม์ไลน์เทียบกับจุดพีคในอดีต (dot-com 1999, GFC 2007, post-COVID 2021)

## รันดูในเครื่อง

ต้องรันผ่าน local server (เปิดไฟล์ `index.html` ตรงๆ จะโหลด `data/bubble-data.json` ไม่ได้ เพราะ browser บล็อก `fetch` บน `file://`)

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

## วิธีอัปเดตข้อมูล (แนะนำเดือนละครั้ง)

แก้ไฟล์ `data/bubble-data.json` แต่ละตัวชี้วัดมี field `value` (ตัวเลขปัจจุบัน) และ `riskScore` (0-100 ให้คุณประเมินเองตามตำแหน่งเทียบ scaleMin/scaleMid/scaleMax) — คะแนนรวมบนเกจคำนวณจากค่าเฉลี่ย `riskScore` ของทุกตัวอัตโนมัติ

| ตัวชี้วัด | ไปเอาข้อมูลจากไหน |
|---|---|
| **Shiller CAPE** | [multpl.com/shiller-pe](https://www.multpl.com/shiller-pe) — อัปเดตรายวัน ฟรี |
| **Yield Curve (10Y-2Y)** | [FRED: T10Y2Y](https://fred.stlouisfed.org/series/T10Y2Y) — อัปเดตรายวัน ฟรี |
| **VIX** | [CBOE VIX](https://www.cboe.com/tradable_products/vix/) หรือค้น "VIX" ใน Google Finance |
| **Margin Debt Growth** | [FINRA Margin Statistics](https://www.finra.org/investors/investing/investment-products/margin-accounts) — อัปเดตรายเดือน |
| **Sentiment (AAII Bull-Bear)** | [AAII Investor Sentiment Survey](https://www.aaii.com/sentimentsurvey) — อัปเดตรายสัปดาห์ |

### ตัวอย่างการประเมิน riskScore

ดูตำแหน่งของ `value` เทียบกับ `scaleMin` (=0 คะแนน), `scaleMid` (=50 คะแนน), `scaleMax` (=100 คะแนน) แล้วประมาณเชิงเส้น เช่น CAPE ปัจจุบัน 41.2 อยู่ใกล้ scaleMax (45) จึงให้ riskScore ~92

### เพิ่มจุดในไทม์ไลน์

เพิ่ม object ใหม่ใน `historicalComposite` array — ใส่ `"label"` เฉพาะปีที่อยากปักหมุดเป็นจุดพีค/จุดเตือน ปีอื่นใส่ `"label": null`

## โครงสร้างไฟล์

```
bubble-dashboard/
├── index.html          # โครงหน้าเว็บ
├── style.css            # ธีม dark "seismograph"
├── script.js             # โหลดข้อมูล วาดเกจ วาดกราฟ
├── data/
│   └── bubble-data.json  # ← แก้ไฟล์นี้ทุกครั้งที่อัปเดต
└── README.md
```

## ข้อจำกัด

ไม่ใช่คำแนะนำการลงทุน เป็นเครื่องมือสรุปตัวเลข valuation/sentiment ให้ดูภาพรวมเร็วขึ้นเท่านั้น ตัวเลข `riskScore` เป็นการประเมินเชิงคุณภาพของคุณเอง ไม่ใช่สูตรวิชาการที่พิสูจน์แล้วว่าทำนายได้แม่นยำ
