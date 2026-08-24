const PHASES = [
  { name: "STEALTH", max: 20, text: "ยังไม่มีสัญญาณฟองสบู่ชัดเจน ตัวชี้วัดส่วนใหญ่อยู่ในระดับปกติ" },
  { name: "AWARENESS", max: 40, text: "เริ่มมีความตึงตัวในบางตัวชี้วัด แต่ภาพรวมยังไม่น่ากังวล" },
  { name: "MANIA", max: 60, text: "หลายตัวชี้วัดตึงตัวพร้อมกัน ควรเริ่มจับตาอย่างใกล้ชิด" },
  { name: "EUPHORIA", max: 80, text: "ระดับความเสี่ยงสูง ใกล้เคียงจุดพีคในประวัติศาสตร์หลายครั้ง" },
  { name: "CRITICAL", max: 100, text: "ตัวชี้วัดตึงตัวรุนแรง ระดับใกล้เคียงจุดพีคก่อนฟองสบู่แตกในอดีต" },
];

const GAUGE_COLORS = ["#3FA796", "#7CAE6E", "#E8C33D", "#E8A33D", "#D64545"];

const MARKETS = {
  us: { file: "data/bubble-data-us.json", label: "US" },
  th: { file: "data/bubble-data-th.json", label: "TH" },
};

const STALE_DAYS_THRESHOLD = 40;

let timelineChartInstance = null;

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = Math.abs(startAngle - endAngle) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function drawGaugeArc() {
  const g = document.getElementById("gaugeArc");
  g.innerHTML = "";
  const segCount = GAUGE_COLORS.length;
  const span = 180 / segCount;
  for (let i = 0; i < segCount; i++) {
    const startAngle = 180 - i * span;
    const endAngle = 180 - (i + 1) * span;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", describeArc(150, 150, 100, startAngle, endAngle));
    path.setAttribute("stroke", GAUGE_COLORS[i]);
    path.setAttribute("stroke-width", "16");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-linecap", "butt");
    path.setAttribute("opacity", "0.85");
    g.appendChild(path);
  }
}

function setNeedle(score) {
  const clamped = Math.max(0, Math.min(100, score));
  const rotation = clamped * 1.8 - 90;
  document.getElementById("gaugeNeedle").style.transform = `rotate(${rotation}deg)`;
}

function riskClass(riskScore) {
  if (riskScore === null || riskScore === undefined) return "risk-unknown";
  if (riskScore >= 70) return "risk-crit";
  if (riskScore >= 45) return "risk-warn";
  return "";
}

function riskLabel(riskScore) {
  if (riskScore === null || riskScore === undefined) return "ยังไม่มีข้อมูล";
  if (riskScore >= 70) return "เสี่ยงสูง";
  if (riskScore >= 45) return "เฝ้าระวัง";
  return "ปกติ";
}

function renderIndicators(indicators) {
  const grid = document.getElementById("indicatorsGrid");
  grid.innerHTML = "";
  Object.values(indicators).forEach((ind, idx) => {
    const card = document.createElement("div");
    card.className = `ind-card ${riskClass(ind.riskScore)}`;
    const valueText = ind.value === null || ind.value === undefined ? "—" : ind.value;
    const sourceLink = ind.sourceUrl
      ? `<a class="ind-source" href="${ind.sourceUrl}" target="_blank" rel="noopener">แหล่งข้อมูล ↗</a>`
      : "";
    card.innerHTML = `
      <div class="ind-label-row">
        <span class="ind-label">${ind.label}</span>
        <button class="ind-info-btn" data-idx="${idx}" aria-label="อธิบายตัวชี้วัดนี้">?</button>
      </div>
      <div class="ind-value">${valueText}<span class="unit">${ind.unit || ""}</span></div>
      <div class="ind-explainer" id="explainer-${idx}" hidden>${ind.explainer || "ยังไม่มีคำอธิบาย"}</div>
      <div class="ind-note">${ind.note}</div>
      <div class="ind-footer">
        <span class="ind-risk">RISK ${ind.riskScore ?? "—"}/100 · ${riskLabel(ind.riskScore)}</span>
        ${sourceLink}
      </div>
      <div class="ind-asof">ข้อมูล ณ ${ind.asOf || "ไม่ระบุ"}</div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll(".ind-info-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(`explainer-${btn.dataset.idx}`);
      target.hidden = !target.hidden;
      btn.classList.toggle("active", !target.hidden);
    });
  });
}

function computeComposite(indicators) {
  const scores = Object.values(indicators)
    .map((i) => i.riskScore)
    .filter((s) => s !== null && s !== undefined);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function renderVerdict(score) {
  if (score === null) {
    document.getElementById("verdictPhase").textContent = "ไม่มีข้อมูลพอ";
    document.getElementById("verdictText").textContent =
      "กรอกตัวชี้วัดอย่างน้อย 1 ตัวใน data.json เพื่อคำนวณคะแนน";
    return;
  }
  const phase = PHASES.find((p) => score <= p.max) || PHASES[PHASES.length - 1];
  document.getElementById("verdictPhase").textContent = phase.name;
  document.getElementById("verdictPhase").style.color =
    GAUGE_COLORS[Math.min(PHASES.indexOf(phase), GAUGE_COLORS.length - 1)];
  document.getElementById("verdictText").textContent = phase.text;
}

function renderStaleBanner(lastUpdated) {
  const banner = document.getElementById("staleBanner");
  const updatedDate = new Date(lastUpdated);
  const daysOld = Math.floor((Date.now() - updatedDate.getTime()) / 86400000);
  if (isNaN(daysOld) || daysOld < STALE_DAYS_THRESHOLD) {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;
  banner.textContent = `⚠ ข้อมูลนี้อัปเดตล่าสุดเมื่อ ${daysOld} วันก่อน (${lastUpdated}) อาจไม่ตรงกับสถานการณ์ปัจจุบันแล้ว ควรอัปเดต data.json`;
}

function renderTimeline(historicalComposite) {
  const ctx = document.getElementById("timelineChart");
  if (timelineChartInstance) {
    timelineChartInstance.destroy();
  }
  const labels = historicalComposite.map((d) => d.date);
  const scores = historicalComposite.map((d) => d.score);

  timelineChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Bubble Risk Score",
          data: scores,
          borderColor: "#E8A33D",
          backgroundColor: "rgba(232,163,61,0.08)",
          borderWidth: 2,
          pointRadius: historicalComposite.map((d) => (d.label ? 5 : 2)),
          pointBackgroundColor: historicalComposite.map((d) =>
            d.label ? "#D64545" : "#6B7686"
          ),
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterLabel: (ctx2) => {
              const d = historicalComposite[ctx2.dataIndex];
              return d.label ? `⚠ ${d.label}` : "";
            },
          },
        },
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          grid: { color: "#1B2530" },
          ticks: { color: "#6B7686", font: { family: "IBM Plex Mono", size: 10 } },
        },
        x: {
          grid: { color: "#1B2530" },
          ticks: { color: "#6B7686", font: { family: "IBM Plex Mono", size: 10 } },
        },
      },
    },
  });
}

function setActiveMarketButton(marketKey) {
  document.querySelectorAll(".market-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.market === marketKey);
  });
}

async function loadMarket(marketKey) {
  const config = MARKETS[marketKey];
  setActiveMarketButton(marketKey);
  drawGaugeArc();
  try {
    const res = await fetch(`${config.file}?t=${Date.now()}`, { cache: "no-store" });
    const data = await res.json();

    document.getElementById("marketLabel").textContent = data.market;
    document.getElementById("lastUpdated").textContent = data.lastUpdated;
    renderStaleBanner(data.lastUpdated);

    const composite = computeComposite(data.indicators);
    document.getElementById("gaugeScore").textContent = composite === null ? "--" : composite;
    setNeedle(composite === null ? 0 : composite);
    renderVerdict(composite);
    renderIndicators(data.indicators);
    renderTimeline(data.historicalComposite);
  } catch (err) {
    document.getElementById("verdictText").textContent =
      "โหลดข้อมูลไม่สำเร็จ — ตรวจสอบว่ามีไฟล์ JSON และรันผ่าน local server (ไม่ใช่เปิดไฟล์ตรงๆ)";
    console.error(err);
  }
}

function init() {
  document.querySelectorAll(".market-btn").forEach((btn) => {
    btn.addEventListener("click", () => loadMarket(btn.dataset.market));
  });
  loadMarket("us");
}

init();
