const PHASES = [
  { name: "STEALTH", max: 20, text: "ยังไม่มีสัญญาณฟองสบู่ชัดเจน ตัวชี้วัดส่วนใหญ่อยู่ในระดับปกติ" },
  { name: "AWARENESS", max: 40, text: "เริ่มมีความตึงตัวในบางตัวชี้วัด แต่ภาพรวมยังไม่น่ากังวล" },
  { name: "MANIA", max: 60, text: "หลายตัวชี้วัดตึงตัวพร้อมกัน ควรเริ่มจับตาอย่างใกล้ชิด" },
  { name: "EUPHORIA", max: 80, text: "ระดับความเสี่ยงสูง ใกล้เคียงจุดพีคในประวัติศาสตร์หลายครั้ง" },
  { name: "CRITICAL", max: 100, text: "ตัวชี้วัดตึงตัวรุนแรง ระดับใกล้เคียงจุดพีคก่อนฟองสบู่แตกในอดีต" },
];

const GAUGE_COLORS = ["#3FA796", "#7CAE6E", "#E8C33D", "#E8A33D", "#D64545"];

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = Math.abs(startAngle - endAngle) > 180 ? 1 : 0;
  // sweep flag 0 draws the correct direction for our top-half, angle-decreasing convention
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function drawGaugeArc() {
  const g = document.getElementById("gaugeArc");
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
  const rotation = clamped * 1.8 - 90; // -90deg (left) at 0, +90deg (right) at 100
  document.getElementById("gaugeNeedle").style.transform = `rotate(${rotation}deg)`;
}

function riskClass(riskScore) {
  if (riskScore >= 70) return "risk-crit";
  if (riskScore >= 45) return "risk-warn";
  return "";
}

function riskLabel(riskScore) {
  if (riskScore >= 70) return "เสี่ยงสูง";
  if (riskScore >= 45) return "เฝ้าระวัง";
  return "ปกติ";
}

function renderIndicators(indicators) {
  const grid = document.getElementById("indicatorsGrid");
  grid.innerHTML = "";
  Object.values(indicators).forEach((ind) => {
    const card = document.createElement("div");
    card.className = `ind-card ${riskClass(ind.riskScore)}`;
    card.innerHTML = `
      <div class="ind-label">${ind.label}</div>
      <div class="ind-value">${ind.value}<span class="unit">${ind.unit}</span></div>
      <div class="ind-note">${ind.note}</div>
      <div class="ind-risk">RISK SCORE ${ind.riskScore}/100 · ${riskLabel(ind.riskScore)}</div>
    `;
    grid.appendChild(card);
  });
}

function computeComposite(indicators) {
  const scores = Object.values(indicators).map((i) => i.riskScore);
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function renderVerdict(score) {
  const phase = PHASES.find((p) => score <= p.max) || PHASES[PHASES.length - 1];
  document.getElementById("verdictPhase").textContent = phase.name;
  document.getElementById("verdictPhase").style.color =
    GAUGE_COLORS[Math.min(PHASES.indexOf(phase), GAUGE_COLORS.length - 1)];
  document.getElementById("verdictText").textContent = phase.text;
}

function renderTimeline(historicalComposite) {
  const ctx = document.getElementById("timelineChart");
  const labels = historicalComposite.map((d) => d.date);
  const scores = historicalComposite.map((d) => d.score);
  const peakPoints = historicalComposite
    .map((d, idx) => (d.label ? { idx, label: d.label, score: d.score } : null))
    .filter(Boolean);

  new Chart(ctx, {
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
            afterLabel: (ctx) => {
              const d = historicalComposite[ctx.dataIndex];
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

  // annotate peak labels above their points using simple DOM-free approach:
  // (kept minimal — tooltip carries the label; peak points are visually distinct in red)
}

async function init() {
  drawGaugeArc();
  try {
    const res = await fetch("data/bubble-data.json", { cache: "no-store" });
    const data = await res.json();

    document.getElementById("marketLabel").textContent = data.market;
    document.getElementById("lastUpdated").textContent = data.lastUpdated;

    const composite = computeComposite(data.indicators);
    document.getElementById("gaugeScore").textContent = composite;
    setNeedle(composite);
    renderVerdict(composite);
    renderIndicators(data.indicators);
    renderTimeline(data.historicalComposite);
  } catch (err) {
    document.getElementById("verdictText").textContent =
      "โหลดข้อมูลไม่สำเร็จ — ตรวจสอบว่ามีไฟล์ data/bubble-data.json และรันผ่าน local server (ไม่ใช่เปิดไฟล์ตรงๆ)";
    console.error(err);
  }
}

init();
