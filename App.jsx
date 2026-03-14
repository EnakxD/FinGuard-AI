import { useState, useEffect, useRef } from "react";

const API = "http://localhost:8000";

// ── Gamification Engine ───────────────────────────────────────────────────
function computeXP(riskScore, savingsRate, txCount) {
  let xp = 0;
  xp += Math.max(0, (100 - riskScore)) * 8;        // up to 800 for low risk
  xp += Math.min(savingsRate, 40) * 15;              // up to 600 for savings
  xp += Math.min(txCount, 30) * 5;                  // up to 150 for tracking
  return Math.round(xp);
}

const LEVELS = [
  { level: 1,  title: "Broke Beginner",     minXP: 0,    icon: "💸", color: "#ff3d5a" },
  { level: 2,  title: "Budget Apprentice",  minXP: 200,  icon: "📓", color: "#ff6b35" },
  { level: 3,  title: "Frugal Fighter",     minXP: 400,  icon: "⚔️", color: "#ff8c00" },
  { level: 4,  title: "Savings Scout",      minXP: 650,  icon: "🔍", color: "#ffd600" },
  { level: 5,  title: "Money Guardian",     minXP: 900,  icon: "🛡️", color: "#c8ff00" },
  { level: 6,  title: "Wealth Warrior",     minXP: 1100, icon: "⚡", color: "#00ff9d" },
  { level: 7,  title: "Finance Ranger",     minXP: 1300, icon: "🏹", color: "#00e5ff" },
  { level: 8,  title: "Capital Commander",  minXP: 1500, icon: "🎖️", color: "#7b61ff" },
  { level: 9,  title: "Crypto Knight",      minXP: 1650, icon: "🗡️", color: "#bf5fff" },
  { level: 10, title: "Financial Overlord", minXP: 1800, icon: "👑", color: "#ff61dc" },
];

function getLevel(xp) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.minXP) lvl = l; else break; }
  const next = LEVELS.find(l => l.minXP > xp);
  const progress = next ? ((xp - lvl.minXP) / (next.minXP - lvl.minXP)) * 100 : 100;
  return { ...lvl, xp, nextLevel: next, progress };
}

const BADGES = [
  { id: "debt_slayer",    icon: "⚔️",  name: "Debt Slayer",    desc: "No loan/EMI flags detected",         check: (r) => !r.risk_flags.some(f => f.category.toLowerCase().includes("loan")) },
  { id: "budget_master",  icon: "🎯",  name: "Budget Master",  desc: "Spending under 75% of income",        check: (r) => r.total_spent / r.total_income < 0.75 },
  { id: "super_saver",    icon: "💎",  name: "Super Saver",    desc: "Savings rate above 25%",              check: (r) => r.savings_rate > 25 },
  { id: "crypto_ready",   icon: "🚀",  name: "Crypto Ready",   desc: "Risk score below 25",                 check: (r) => r.risk_score < 25 },
  { id: "clean_slate",    icon: "✨",  name: "Clean Slate",    desc: "Zero risk flags",                     check: (r) => r.risk_flags.length === 0 },
  { id: "high_earner",    icon: "💰",  name: "High Earner",    desc: "Income above ₹70,000",                check: (r) => r.total_income >= 70000 },
  { id: "disciplined",    icon: "🔒",  name: "Iron Discipline", desc: "Risk score below 15",                check: (r) => r.risk_score < 15 },
  { id: "tracker",        icon: "📊",  name: "Data Nerd",      desc: "Analysed 20+ transactions",           check: (_, tx) => tx.length >= 20 },
];

const RISK_AVATARS = [
  { range: [0,  24],  avatar: "👑", title: "Financial Monarch",  aura: "#00ff9d", ring: "#00ff9d40" },
  { range: [25, 49],  avatar: "🧙", title: "Wealth Wizard",       aura: "#00e5ff", ring: "#00e5ff40" },
  { range: [50, 74],  avatar: "⚔️", title: "Debt Fighter",         aura: "#ffd600", ring: "#ffd60040" },
  { range: [75, 100], avatar: "💀", title: "Financial Danger",    aura: "#ff3d5a", ring: "#ff3d5a40" },
];

function getRiskAvatar(score) {
  return RISK_AVATARS.find(a => score >= a.range[0] && score <= a.range[1]) || RISK_AVATARS[3];
}

function getStreak(txCount, savingsRate) {
  if (savingsRate >= 30 && txCount >= 20) return { count: 3, label: "🔥 3-Month Budget Streak", msg: "You're on fire! Keep it up!" };
  if (savingsRate >= 20) return { count: 2, label: "⚡ 2-Month Streak", msg: "Building momentum!" };
  if (savingsRate >= 10) return { count: 1, label: "✅ Streak Started", msg: "One month down. Keep going!" };
  return null;
}

// ── CSS ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Orbitron:wght@400;600;700;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:#04080f;
    --bg2:#060d1a;
    --surface:#0a1628;
    --card:#0d1e35;
    --card2:#0f2240;
    --border:#1a3050;
    --border2:#0e2040;
    --accent:#00e5ff;
    --accent2:#0099bb;
    --green:#00ff9d;
    --yellow:#ffd600;
    --red:#ff3d5a;
    --orange:#ff8c00;
    --purple:#7b61ff;
    --pink:#ff61dc;
    --text:#d0e8ff;
    --muted:#3d6080;
    --font:'Rajdhani',sans-serif;
    --mono:'Share Tech Mono',monospace;
    --display:'Orbitron',sans-serif;
  }
  body { background:var(--bg); color:var(--text); font-family:var(--font); min-height:100vh; overflow-x:hidden; }
  body::before {
    content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
    background:
      radial-gradient(ellipse 80% 50% at 50% -20%, #00e5ff08 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 80% 80%, #7b61ff06 0%, transparent 50%),
      repeating-linear-gradient(0deg, transparent, transparent 80px, #00e5ff03 80px, #00e5ff03 81px),
      repeating-linear-gradient(90deg, transparent, transparent 80px, #00e5ff03 80px, #00e5ff03 81px);
  }
  ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:var(--bg)} ::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
  .app { max-width:1140px; margin:0 auto; padding:0 1.5rem 5rem; position:relative;z-index:1; }

  /* ── NAV ── */
  .topbar { display:flex;align-items:center;gap:0;padding:0 1.5rem;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100;background:#04080fee;backdrop-filter:blur(20px); }
  .logo-area { display:flex;align-items:center;gap:12px;padding:16px 0;margin-right:2rem; }
  .logo-mark { width:40px;height:40px;border-radius:8px;background:linear-gradient(135deg,#00e5ff22,#7b61ff22);border:1px solid #00e5ff40;display:flex;align-items:center;justify-content:center;font-size:1.3rem;position:relative; }
  .logo-mark::after { content:'';position:absolute;inset:-1px;border-radius:8px;background:linear-gradient(135deg,#00e5ff,#7b61ff);opacity:0.15;z-index:-1; }
  .logo-text { font-family:var(--display);font-size:1rem;font-weight:700;letter-spacing:0.05em;color:var(--accent); }
  .logo-sub { font-family:var(--mono);font-size:0.55rem;color:var(--muted);letter-spacing:0.1em;margin-top:1px; }
  .nav-links { display:flex;gap:0;flex:1; }
  .nav-btn { padding:18px 20px;background:transparent;border:none;color:var(--muted);font-family:var(--font);font-size:0.85rem;font-weight:600;cursor:pointer;letter-spacing:0.06em;text-transform:uppercase;transition:all 0.2s;border-bottom:2px solid transparent;position:relative; }
  .nav-btn:hover { color:var(--text); }
  .nav-btn.active { color:var(--accent);border-bottom-color:var(--accent); }
  .nav-btn.active::before { content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;background:var(--accent);box-shadow:0 0 10px var(--accent);filter:blur(2px); }
  .hud-area { display:flex;align-items:center;gap:12px;margin-left:auto;padding:10px 0; }
  .hud-badge { display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:6px;background:var(--surface);border:1px solid var(--border);font-family:var(--mono);font-size:0.68rem;color:var(--muted); }
  .hud-badge .val { color:var(--accent);font-weight:700; }

  /* ── PAGE SECTIONS ── */
  .page { padding-top:2rem;animation:fadeUp 0.4s ease; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .page-title { font-family:var(--display);font-size:1.4rem;font-weight:700;letter-spacing:0.05em;margin-bottom:0.25rem;color:var(--text); }
  .page-sub { font-family:var(--mono);font-size:0.7rem;color:var(--muted);letter-spacing:0.08em;margin-bottom:2rem; }

  /* ── SECTION TITLE ── */
  .section-title { font-size:0.62rem;font-family:var(--mono);color:var(--muted);letter-spacing:0.12em;text-transform:uppercase;margin:1.5rem 0 0.75rem;display:flex;align-items:center;gap:8px; }
  .section-title::after { content:'';flex:1;height:1px;background:var(--border); }

  /* ── GAMIFICATION HERO ── */
  .rpg-hero { display:grid;grid-template-columns:auto 1fr auto;gap:2rem;align-items:center;background:linear-gradient(135deg,var(--card),var(--card2));border:1px solid var(--border);border-radius:16px;padding:2rem;margin-bottom:1.5rem;position:relative;overflow:hidden; }
  .rpg-hero::before { content:'';position:absolute;top:-40px;right:-40px;width:200px;height:200px;border-radius:50%;opacity:0.06;filter:blur(40px); }
  @media(max-width:700px){.rpg-hero{grid-template-columns:1fr;text-align:center}}

  .avatar-ring { width:100px;height:100px;border-radius:50%;border:3px solid;display:flex;align-items:center;justify-content:center;font-size:3rem;position:relative;flex-shrink:0;transition:all 0.5s; }
  .avatar-ring::before { content:'';position:absolute;inset:-6px;border-radius:50%;border:1px solid currentColor;opacity:0.3;animation:rotate 8s linear infinite; }
  .avatar-ring::after { content:'';position:absolute;inset:-12px;border-radius:50%;border:1px dashed currentColor;opacity:0.15;animation:rotate 12s linear infinite reverse; }
  @keyframes rotate { to{transform:rotate(360deg)} }

  .level-info { flex:1; }
  .level-num { font-family:var(--display);font-size:0.65rem;letter-spacing:0.15em;color:var(--muted);text-transform:uppercase;margin-bottom:4px; }
  .level-title { font-family:var(--display);font-size:1.6rem;font-weight:700;letter-spacing:0.03em;line-height:1.1;margin-bottom:0.5rem; }
  .xp-bar-wrap { margin:0.75rem 0;position:relative; }
  .xp-bar-label { display:flex;justify-content:space-between;font-family:var(--mono);font-size:0.62rem;color:var(--muted);margin-bottom:6px; }
  .xp-bar-track { height:8px;background:var(--border);border-radius:4px;overflow:hidden;position:relative; }
  .xp-bar-fill { height:100%;border-radius:4px;transition:width 1.2s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden; }
  .xp-bar-fill::after { content:'';position:absolute;top:0;left:-100%;right:0;bottom:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent);animation:shimmer 2s infinite; }
  @keyframes shimmer { to{left:100%} }
  .xp-count { font-family:var(--mono);font-size:0.7rem;color:var(--muted);margin-top:4px; }

  .streak-badge { display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:8px;background:#ff8c0015;border:1px solid #ff8c0040;font-family:var(--mono);font-size:0.72rem;color:var(--orange);animation:pulseGlow 2s infinite; }
  @keyframes pulseGlow { 0%,100%{box-shadow:0 0 10px #ff8c0020} 50%{box-shadow:0 0 25px #ff8c0050} }

  .avatar-score { text-align:right; }
  .big-score { font-family:var(--display);font-size:3.5rem;font-weight:900;line-height:1;letter-spacing:-0.02em; }
  .score-label { font-family:var(--mono);font-size:0.62rem;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;margin-top:4px; }
  .risk-tag { display:inline-block;margin-top:8px;padding:4px 12px;border-radius:4px;font-family:var(--mono);font-size:0.65rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase; }

  /* ── BADGES ── */
  .badges-grid { display:flex;flex-wrap:wrap;gap:10px;margin-bottom:1.5rem; }
  .badge-chip { display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:8px;border:1px solid;font-size:0.8rem;font-weight:600;transition:all 0.2s;position:relative;overflow:hidden; }
  .badge-chip.earned { background:linear-gradient(135deg,#ffffff0a,#ffffff05);border-color:#00ff9d40;color:var(--green); }
  .badge-chip.earned::before { content:'';position:absolute;inset:0;background:linear-gradient(135deg,#00ff9d08,transparent);pointer-events:none; }
  .badge-chip.locked { background:#ffffff04;border-color:var(--border2);color:var(--muted);filter:grayscale(0.5); }
  .badge-chip .b-icon { font-size:1.1rem; }
  .badge-chip .b-info { }
  .badge-chip .b-name { font-size:0.78rem;font-weight:700; }
  .badge-chip .b-desc { font-family:var(--mono);font-size:0.6rem;color:var(--muted);margin-top:1px; }
  .badge-chip.earned .b-desc { color:#00ff9d88; }
  .lock-icon { margin-left:auto;font-size:0.7rem;opacity:0.3; }
  .new-badge-glow { animation:newBadge 0.6s ease forwards; }
  @keyframes newBadge { 0%{transform:scale(0.8);opacity:0} 60%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }

  /* ── STATS GRID ── */
  .stats-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin-bottom:1.5rem; }
  .stat-card { background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.1rem 1.3rem;position:relative;overflow:hidden;transition:border-color 0.2s; }
  .stat-card:hover { border-color:var(--border2); }
  .stat-card::before { content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,currentColor,transparent);opacity:0.3; }
  .stat-card .label { font-family:var(--mono);font-size:0.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px; }
  .stat-card .value { font-family:var(--display);font-size:1.3rem;font-weight:700; }
  .stat-card .sub { font-family:var(--mono);font-size:0.62rem;color:var(--muted);margin-top:4px; }

  /* ── PANEL ── */
  .panel { background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.3rem; }
  .panel h3 { font-size:0.65rem;font-family:var(--mono);color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:1rem;display:flex;align-items:center;gap:8px; }
  .two-col { display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem; }
  @media(max-width:700px){.two-col{grid-template-columns:1fr}}

  /* ── RISK FLAGS ── */
  .flag-item { display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border2); }
  .flag-item:last-child{border-bottom:none}
  .flag-dot { width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:5px; }
  .flag-high{background:var(--red);box-shadow:0 0 8px var(--red)}
  .flag-medium{background:var(--yellow);box-shadow:0 0 8px var(--yellow)}
  .flag-low{background:var(--green);box-shadow:0 0 8px var(--green)}
  .flag-msg{font-size:0.82rem;line-height:1.4;font-weight:600}
  .flag-cat{font-family:var(--mono);font-size:0.65rem;color:var(--muted);margin-top:2px}

  /* ── CAT BARS ── */
  .cat-bar-item{margin-bottom:12px}
  .cat-bar-label{display:flex;justify-content:space-between;font-family:var(--mono);font-size:0.7rem;color:var(--muted);margin-bottom:5px}
  .cat-bar-track{height:6px;background:var(--border2);border-radius:3px;overflow:hidden}
  .cat-bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--accent),var(--green));transition:width 0.8s ease}

  /* ── CHARTS ── */
  .chart-wrap { background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.3rem;margin-bottom:1rem; }
  .chart-wrap h3 { font-size:0.65rem;font-family:var(--mono);color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:1.2rem; }
  .bar-chart { display:flex;align-items:flex-end;gap:8px;height:160px;padding-bottom:24px;position:relative; }
  .bar-chart::after { content:'';position:absolute;bottom:24px;left:0;right:0;height:1px;background:var(--border2); }
  .bar-col { flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%; }
  .bar-col .bar-outer { flex:1;width:100%;display:flex;align-items:flex-end; }
  .bar-col .bar-inner { width:100%;border-radius:4px 4px 0 0;transition:height 0.8s ease;min-height:2px; }
  .bar-col .bar-label { font-family:var(--mono);font-size:0.58rem;color:var(--muted);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%; }
  .bar-col .bar-value { font-family:var(--mono);font-size:0.6rem;color:var(--text); }

  /* ── MONTH COMPARE ── */
  .compare-grid { display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem; }
  @media(max-width:600px){.compare-grid{grid-template-columns:1fr}}
  .compare-card { background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.2rem; }
  .compare-card h4 { font-family:var(--mono);font-size:0.65rem;color:var(--muted);text-transform:uppercase;margin-bottom:1rem;letter-spacing:0.08em; }
  .compare-row { display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border2);font-size:0.82rem; }
  .compare-row:last-child{border-bottom:none}
  .compare-row .cat{color:var(--muted);font-family:var(--mono);font-size:0.72rem}
  .compare-row .amt{font-family:var(--mono)}
  .delta-up{color:var(--red);font-size:0.68rem;font-family:var(--mono)}
  .delta-down{color:var(--green);font-size:0.68rem;font-family:var(--mono)}

  /* ── AI PANEL ── */
  .ai-panel { background:linear-gradient(135deg,var(--card),var(--card2));border:1px solid var(--border);border-radius:12px;padding:1.5rem;margin-bottom:1rem;position:relative;overflow:hidden; }
  .ai-panel::before { content:'AI';position:absolute;right:1.5rem;top:1rem;font-family:var(--display);font-size:4rem;font-weight:900;opacity:0.03;letter-spacing:-0.05em;pointer-events:none; }
  .ai-panel h3 { font-size:0.65rem;font-family:var(--mono);color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:1rem;display:flex;align-items:center;gap:8px; }
  .ai-panel h3 .dot { width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px var(--accent);animation:pulse 1.5s infinite; }
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
  .ai-text { font-size:0.88rem;line-height:1.85;color:#a8c8e8;white-space:pre-wrap; }

  /* ── CRYPTO ── */
  .crypto-ticker { display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin-bottom:1.5rem; }
  .crypto-card { background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.1rem 1.3rem;position:relative;overflow:hidden;transition:transform 0.2s,border-color 0.2s; }
  .crypto-card:hover{transform:translateY(-2px);border-color:var(--border2)}
  .crypto-card::before { content:'';position:absolute;top:0;left:0;right:0;height:2px; }
  .crypto-btc::before{background:linear-gradient(90deg,#f7931a,#ffb347)}
  .crypto-eth::before{background:linear-gradient(90deg,#627eea,#a78bfa)}
  .crypto-sol::before{background:linear-gradient(90deg,#9945ff,#14f195)}
  .crypto-bnb::before{background:linear-gradient(90deg,#f3ba2f,#ffd700)}
  .crypto-card .c-name { font-family:var(--mono);font-size:0.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px; }
  .crypto-card .c-price { font-family:var(--display);font-size:1.1rem;font-weight:700;margin-bottom:2px; }
  .crypto-card .c-change { font-family:var(--mono);font-size:0.7rem; }
  .c-up{color:var(--green)} .c-down{color:var(--red)}
  .crypto-card .c-sym { font-size:1.4rem;position:absolute;top:1rem;right:1rem;opacity:0.25; }
  .live-dot { width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green);animation:pulse 1.5s infinite;display:inline-block;margin-right:6px; }
  .crypto-loading { font-family:var(--mono);font-size:0.75rem;color:var(--muted);padding:1rem 0; }

  .crypto-recommend { background:linear-gradient(135deg,var(--card),var(--card2));border:1px solid;border-radius:14px;padding:1.5rem;margin-bottom:1rem; }
  .crypto-recommend h3 { font-size:0.9rem;font-weight:800;margin-bottom:0.5rem;display:flex;align-items:center;gap:8px;font-family:var(--font); }
  .crypto-recommend .rec-summary { font-family:var(--mono);font-size:0.75rem;color:var(--muted);margin-bottom:1.2rem;line-height:1.7; }
  .alloc-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:0.8rem;margin-bottom:1.2rem; }
  .alloc-card { background:#ffffff06;border:1px solid var(--border);border-radius:10px;padding:0.9rem;text-align:center; }
  .alloc-card .a-coin { font-size:1.4rem;margin-bottom:4px; }
  .alloc-card .a-name { font-family:var(--mono);font-size:0.62rem;color:var(--muted);text-transform:uppercase;margin-bottom:6px; }
  .alloc-card .a-pct  { font-family:var(--display);font-size:1.3rem;font-weight:700; }
  .alloc-card .a-amt  { font-family:var(--mono);font-size:0.68rem;color:var(--muted);margin-top:2px; }
  .alloc-card .a-risk { font-family:var(--mono);font-size:0.6rem;margin-top:4px;padding:2px 6px;border-radius:4px;display:inline-block; }
  .risk-low-tag{background:#00ff9d18;color:var(--green)}
  .risk-med-tag{background:#ffd60018;color:var(--yellow)}
  .risk-high-tag{background:#ff3d5a18;color:var(--red)}
  .disclaimer { font-family:var(--mono);font-size:0.63rem;color:var(--muted);padding:10px 14px;background:#ffffff04;border-radius:6px;border:1px solid var(--border);line-height:1.6; }

  /* ── FORMS ── */
  .form-grid { display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.2rem; }
  @media(max-width:640px){.form-grid{grid-template-columns:1fr}}
  .field { display:flex;flex-direction:column;gap:6px; }
  .field label { font-family:var(--mono);font-size:0.65rem;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase; }
  .field input { background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;color:var(--text);font-family:var(--mono);font-size:0.88rem;outline:none;transition:border-color 0.2s; }
  .field input:focus { border-color:var(--accent); }

  .tabs { display:flex;gap:4px;margin-bottom:1.2rem;background:var(--surface);padding:4px;border-radius:10px;border:1px solid var(--border); }
  .tab { flex:1;padding:8px;border:none;background:transparent;color:var(--muted);font-family:var(--font);font-size:0.8rem;font-weight:600;cursor:pointer;border-radius:7px;transition:all 0.2s;letter-spacing:0.05em; }
  .tab.active { background:var(--card);color:var(--accent);border:1px solid var(--border); }

  .csv-drop { border:2px dashed var(--border);border-radius:12px;padding:2rem;text-align:center;cursor:pointer;transition:all 0.2s;margin-bottom:1rem; }
  .csv-drop:hover,.csv-drop.drag { border-color:var(--accent);background:#00e5ff06; }
  .csv-drop .icon { font-size:2rem;margin-bottom:0.5rem; }
  .csv-drop h3 { font-size:0.95rem;font-weight:700;margin-bottom:4px; }
  .csv-drop p { font-family:var(--mono);font-size:0.7rem;color:var(--muted); }
  .csv-drop input { display:none; }
  .csv-hint { background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:1rem 1.2rem;margin-bottom:1rem; }
  .csv-hint p { font-family:var(--mono);font-size:0.7rem;color:var(--muted);margin-bottom:6px; }
  .csv-hint code { font-family:var(--mono);font-size:0.7rem;color:var(--accent);background:#00e5ff10;padding:6px 10px;border-radius:6px;display:block; }

  .add-row-form { display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1rem; }
  .add-row-form input { flex:1;min-width:100px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:7px 10px;color:var(--text);font-family:var(--mono);font-size:0.78rem;outline:none; }
  .add-row-form input:focus{border-color:var(--accent)}
  .add-row-form input::placeholder{color:var(--muted)}

  .tx-table-wrap { overflow-x:auto;border-radius:10px;border:1px solid var(--border);margin-bottom:1rem;max-height:320px;overflow-y:auto; }
  table { width:100%;border-collapse:collapse;font-family:var(--mono);font-size:0.78rem; }
  thead tr { background:var(--surface);position:sticky;top:0;z-index:1; }
  th { padding:10px 14px;text-align:left;color:var(--muted);font-weight:400;letter-spacing:0.05em;font-size:0.65rem;text-transform:uppercase; }
  td { padding:9px 14px;border-top:1px solid var(--border2); }
  tr:hover td { background:#ffffff04; }
  .amount-neg{color:var(--red)} .amount-pos{color:var(--green)}
  .cat-pill { display:inline-block;padding:2px 8px;border-radius:4px;background:#1e3050;font-size:0.65rem;color:var(--accent); }
  .tx-actions { display:flex;gap:8px;margin-bottom:1rem;flex-wrap:wrap; }

  /* ── BUTTONS ── */
  .btn { padding:9px 18px;border-radius:8px;font-family:var(--font);font-weight:700;font-size:0.82rem;cursor:pointer;border:none;transition:all 0.18s;letter-spacing:0.06em;text-transform:uppercase; }
  .btn-ghost { background:transparent;border:1px solid var(--border);color:var(--muted); }
  .btn-ghost:hover { border-color:var(--accent);color:var(--accent); }
  .btn-primary { background:linear-gradient(135deg,var(--accent),var(--accent2));color:#000;font-weight:800;box-shadow:0 0 25px #00e5ff30; }
  .btn-primary:hover { box-shadow:0 0 40px #00e5ff50;transform:translateY(-1px); }
  .btn-primary:disabled { opacity:0.4;cursor:not-allowed;box-shadow:none;transform:none; }
  .btn-green { background:linear-gradient(135deg,var(--green),#00cc7a);color:#000;font-weight:800;box-shadow:0 0 25px #00ff9d30; }
  .btn-green:hover { box-shadow:0 0 40px #00ff9d50;transform:translateY(-1px); }
  .btn-danger { background:transparent;border:1px solid #ff3d5a40;color:var(--red);font-size:0.72rem;padding:5px 10px; }
  .btn-danger:hover { background:#ff3d5a15; }

  /* ── STATUS ── */
  .loader { display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 0;gap:1.5rem; }
  .spinner-rpg { width:60px;height:60px;position:relative; }
  .spinner-rpg::before,.spinner-rpg::after { content:'';position:absolute;border-radius:50%; }
  .spinner-rpg::before { inset:0;border:2px solid var(--border);animation:spinA 1.2s linear infinite;border-top-color:var(--accent);border-right-color:transparent; }
  .spinner-rpg::after { inset:8px;border:2px solid var(--border2);animation:spinA 0.8s linear infinite reverse;border-bottom-color:var(--green);border-left-color:transparent; }
  @keyframes spinA{to{transform:rotate(360deg)}}
  .loader h3 { font-family:var(--display);font-size:0.85rem;color:var(--accent);letter-spacing:0.1em;text-align:center; }
  .loader p { font-family:var(--mono);font-size:0.72rem;color:var(--muted); }
  .error-box { background:#ff3d5a0c;border:1px solid #ff3d5a40;border-radius:10px;padding:1rem 1.3rem;font-family:var(--mono);font-size:0.8rem;color:var(--red);margin-top:1rem; }
  .success-box { background:#00ff9d0c;border:1px solid #00ff9d40;border-radius:10px;padding:0.8rem 1.3rem;font-family:var(--mono);font-size:0.75rem;color:var(--green);margin-bottom:1rem; }
  .export-bar { display:flex;gap:8px;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap; }
  .export-bar span { font-family:var(--mono);font-size:0.7rem;color:var(--muted); }

  /* ── REPORT PAGE ── */
  .report-grid { display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem; }
  @media(max-width:700px){.report-grid{grid-template-columns:1fr}}
  .report-card { background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.3rem;position:relative;overflow:hidden; }
  .report-card h4 { font-family:var(--mono);font-size:0.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:0.75rem; }
  .report-card .big-val { font-family:var(--display);font-size:2rem;font-weight:700; }
  .report-card .hint { font-family:var(--mono);font-size:0.65rem;color:var(--muted);margin-top:4px; }

  /* ── DASHBOARD ── */
  .dash-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1.5rem; }
  .dash-card { background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.3rem;position:relative;overflow:hidden;cursor:pointer;transition:all 0.2s; }
  .dash-card:hover { border-color:var(--accent);transform:translateY(-2px); }
  .dash-card::before { content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--accent);opacity:0;transition:opacity 0.2s; }
  .dash-card:hover::before { opacity:1; }
  .dash-card .dc-icon { font-size:1.8rem;margin-bottom:0.75rem; }
  .dash-card .dc-title { font-family:var(--display);font-size:0.8rem;font-weight:600;letter-spacing:0.05em;color:var(--accent);margin-bottom:4px; }
  .dash-card .dc-desc { font-family:var(--mono);font-size:0.65rem;color:var(--muted);line-height:1.5; }

  .empty-state { text-align:center;padding:4rem 2rem; }
  .empty-state .e-icon { font-size:3rem;margin-bottom:1rem; }
  .empty-state h3 { font-family:var(--display);font-size:1.1rem;letter-spacing:0.05em;margin-bottom:0.5rem;color:var(--accent); }
  .empty-state p { font-family:var(--mono);font-size:0.72rem;color:var(--muted);margin-bottom:1.5rem;line-height:1.7; }
`;

// ── Helpers ───────────────────────────────────────────────────────────────
function riskColor(l){return l==="Safe"?"var(--green)":l==="Moderate"?"var(--yellow)":l==="Risky"?"var(--orange)":"var(--red)";}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h=>h.trim().toLowerCase().replace(/"/g,""));
  const dateIdx = headers.findIndex(h=>h.includes("date"));
  const descIdx = headers.findIndex(h=>h.includes("desc")||h.includes("narr")||h.includes("particular"));
  const catIdx  = headers.findIndex(h=>h.includes("cat")||h.includes("type"));
  const amtIdx  = headers.findIndex(h=>h.includes("amount")||h.includes("amt")||h.includes("debit")||h.includes("credit"));
  return lines.slice(1).map(line=>{
    const cols = line.split(",").map(c=>c.trim().replace(/"/g,""));
    const amt  = parseFloat(cols[amtIdx]?.replace(/[^0-9.-]/g,"")||"0");
    return {date:cols[dateIdx]||"2024-01-01",description:cols[descIdx]||cols[1]||"Transaction",category:cols[catIdx]||"Other",amount:amt};
  }).filter(t=>!isNaN(t.amount)&&t.amount!==0);
}

function buildMonthComparison(transactions) {
  const byMonth={};
  transactions.forEach(t=>{
    if(t.amount>=0)return;
    const month=t.date.slice(0,7);
    if(!byMonth[month])byMonth[month]={};
    byMonth[month][t.category]=(byMonth[month][t.category]||0)+Math.abs(t.amount);
  });
  const months=Object.keys(byMonth).sort();
  if(months.length<2)return null;
  return{curr:byMonth[months[months.length-1]],prev:byMonth[months[months.length-2]],currMonth:months[months.length-1],prevMonth:months[months.length-2]};
}

function exportPDF(result, transactions, gameData) {
  const win=window.open("","_blank");
  const levelInfo = gameData?.levelInfo;
  win.document.write(`<html><head><title>FinGuard RPG Report</title>
  <style>body{font-family:'Segoe UI',sans-serif;max-width:820px;margin:40px auto;color:#1a1a2e;line-height:1.6}
  h1{color:#0066cc;border-bottom:3px solid #0066cc;padding-bottom:10px}
  h2{color:#333;margin-top:30px;font-size:1.1rem;text-transform:uppercase}
  .rpg-header{background:linear-gradient(135deg,#04080f,#0a1628);color:white;padding:24px;border-radius:12px;margin-bottom:20px;display:flex;gap:20px;align-items:center}
  .rpg-avatar{font-size:4rem}
  .rpg-title{font-size:1.6rem;font-weight:800;color:#00e5ff;margin-bottom:4px}
  .rpg-level{font-size:0.85rem;color:#3d6080}
  .rpg-xp{font-size:0.9rem;color:#00ff9d;margin-top:4px}
  .score{font-size:3rem;font-weight:800;color:${result.risk_level==="Safe"?"#00a86b":result.risk_level==="Moderate"?"#ffa500":"#e53e3e"}}
  .stat{display:inline-block;margin:10px 20px 10px 0}.stat .label{font-size:0.75rem;color:#666;text-transform:uppercase}.stat .val{font-size:1.4rem;font-weight:700}
  table{width:100%;border-collapse:collapse;margin-top:10px;font-size:0.85rem}th{background:#f0f4f8;padding:8px;text-align:left}td{padding:8px;border-bottom:1px solid #eee}
  .neg{color:#e53e3e}.pos{color:#00a86b}.flag{padding:8px 12px;margin:6px 0;border-radius:6px;font-size:0.85rem}
  .flag-high{background:#fff5f5;border-left:4px solid #e53e3e}.flag-medium{background:#fffbf0;border-left:4px solid #ffa500}
  .ai-section{background:#f8faff;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:0.9rem}
  .badge-row{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
  .badge-p{padding:4px 12px;border-radius:20px;background:#e8f4ff;font-size:0.78rem;font-weight:600;color:#0066cc}
  .footer{margin-top:40px;font-size:0.75rem;color:#999;text-align:center}</style></head><body>
  <div class="rpg-header">
    <div class="rpg-avatar">${levelInfo?.icon||"💹"}</div>
    <div>
      <div class="rpg-title">${levelInfo?.title||"Finance Player"}</div>
      <div class="rpg-level">Level ${levelInfo?.level||1} · ${levelInfo?.xp||0} XP</div>
      <div class="rpg-xp">FinGuard RPG Financial Report</div>
    </div>
  </div>
  <h1>💹 FinGuard AI — Financial Health Report</h1>
  <p style="color:#666;font-size:0.85rem">Generated ${new Date().toLocaleDateString("en-IN",{dateStyle:"long"})} · ${transactions.length} transactions</p>
  <div style="margin:20px 0"><div class="score">${result.risk_score}/100</div><div style="font-size:1.2rem;font-weight:600">Risk Level: ${result.risk_level}</div></div>
  <div><span class="stat"><div class="label">Income</div><div class="val">₹${result.total_income.toLocaleString()}</div></span>
  <span class="stat"><div class="label">Spent</div><div class="val">₹${result.total_spent.toLocaleString()}</div></span>
  <span class="stat"><div class="label">Savings Rate</div><div class="val">${result.savings_rate.toFixed(1)}%</div></span></div>
  <h2>Earned Badges</h2>
  <div class="badge-row">${(gameData?.earned||[]).map(b=>`<span class="badge-p">${b.icon} ${b.name}</span>`).join("")||"<em>No badges yet</em>"}</div>
  <h2>Risk Flags</h2>${result.risk_flags.map(f=>`<div class="flag flag-${f.severity}"><strong>${f.category}</strong> — ${f.message}</div>`).join("")||"<em>None</em>"}
  <h2>AI Report</h2><div class="ai-section">${result.ai_report}</div>
  <h2>Savings Plan</h2><div class="ai-section">${result.savings_plan}</div>
  <div class="footer">FinGuard RPG · Frostbyte Hackathon 2026</div></body></html>`);
  win.document.close(); win.print();
}

// ── Crypto helpers ────────────────────────────────────────────────────────
function getCryptoRecommendation(riskScore, riskLevel, savingsRate, totalIncome) {
  const monthlySavings = totalIncome * (savingsRate / 100);
  if (riskScore >= 75) return {
    type:"avoid", emoji:"🚫", title:"Not Ready for Crypto",
    color:"var(--red)", recClass:"rec-avoid",
    summary:`Risk score ${riskScore}/100 (${riskLevel}). Stabilise your finances before entering volatile crypto markets. Build an emergency fund first.`,
    allocations:[], totalPct:0, totalAmt:0,
    tip:"Rule of thumb: never invest money in crypto you can't afford to lose entirely."
  };
  if (riskScore >= 50) return {
    type:"caution", emoji:"⚠️", title:"Proceed with Caution",
    color:"var(--orange)", recClass:"rec-caution",
    summary:`Risk score ${riskScore}/100. Small crypto allocation (max 3%) only after 3-month emergency fund is in place. BTC only.`,
    allocations:[{coin:"₿",name:"Bitcoin",symbol:"BTC",pct:3,risk:"low",color:"#f7931a"}],
    totalPct:3, totalAmt:monthlySavings*0.03,
    tip:"Only invest what you can afford to lose. Never use EMI or loans for crypto."
  };
  if (riskScore >= 25) return {
    type:"moderate", emoji:"📊", title:"Moderate Allocation",
    color:"var(--yellow)", recClass:"rec-moderate",
    summary:`Risk score ${riskScore}/100 (${riskLevel}). Reasonable financial health. 5–8% crypto from monthly savings is sensible. Large-cap only.`,
    allocations:[
      {coin:"₿",name:"Bitcoin",symbol:"BTC",pct:4,risk:"low",color:"#f7931a"},
      {coin:"Ξ",name:"Ethereum",symbol:"ETH",pct:2,risk:"med",color:"#627eea"},
      {coin:"◎",name:"Solana",symbol:"SOL",pct:1,risk:"med",color:"#9945ff"},
    ],
    totalPct:7, totalAmt:monthlySavings*0.07,
    tip:"Use DCA — invest a fixed amount monthly regardless of price."
  };
  return {
    type:"safe", emoji:"🚀", title:"Crypto Ready — Healthy Portfolio",
    color:"var(--green)", recClass:"rec-safe",
    summary:`Excellent! Score ${riskScore}/100 (${riskLevel}) with ${savingsRate.toFixed(1)}% savings rate. You're in great shape for a diversified crypto allocation up to 10–12% of savings.`,
    allocations:[
      {coin:"₿",name:"Bitcoin",symbol:"BTC",pct:5,risk:"low",color:"#f7931a"},
      {coin:"Ξ",name:"Ethereum",symbol:"ETH",pct:3,risk:"low",color:"#627eea"},
      {coin:"◎",name:"Solana",symbol:"SOL",pct:2,risk:"med",color:"#9945ff"},
      {coin:"●",name:"BNB",symbol:"BNB",pct:1,risk:"med",color:"#f3ba2f"},
    ],
    totalPct:11, totalAmt:monthlySavings*0.11,
    tip:"Rebalance every quarter. Never let crypto exceed 15% of total net worth."
  };
}

function useCryptoPrices() {
  const [prices, setPrices] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin&vs_currencies=usd&include_24hr_change=true");
        const data = await res.json();
        setPrices({
          BTC:{price:data.bitcoin?.usd,change:data.bitcoin?.usd_24h_change,symbol:"₿",name:"Bitcoin",cls:"crypto-btc"},
          ETH:{price:data.ethereum?.usd,change:data.ethereum?.usd_24h_change,symbol:"Ξ",name:"Ethereum",cls:"crypto-eth"},
          SOL:{price:data.solana?.usd,change:data.solana?.usd_24h_change,symbol:"◎",name:"Solana",cls:"crypto-sol"},
          BNB:{price:data.binancecoin?.usd,change:data.binancecoin?.usd_24h_change,symbol:"●",name:"BNB",cls:"crypto-bnb"},
        });
      } catch { setPrices("error"); }
      finally { setLoading(false); }
    };
    fetch_();
    const id = setInterval(fetch_, 60000);
    return () => clearInterval(id);
  }, []);
  return { prices, loading };
}

// ── Sub-components ────────────────────────────────────────────────────────
function SpendingChart({ categories }) {
  const entries = Object.entries(categories).slice(0,8);
  const max = Math.max(...entries.map(([,v])=>v));
  const colors = ["#00e5ff","#00ff9d","#ffd600","#ff8c00","#ff3d5a","#a78bfa","#34d399","#f472b6"];
  return (
    <div className="chart-wrap">
      <h3>📊 spending by category</h3>
      <div className="bar-chart">
        {entries.map(([cat,amt],i)=>(
          <div className="bar-col" key={cat}>
            <div className="bar-value">₹{amt>=1000?`${(amt/1000).toFixed(1)}k`:amt}</div>
            <div className="bar-outer">
              <div className="bar-inner" style={{height:`${(amt/max)*100}%`,background:`linear-gradient(180deg,${colors[i%colors.length]},${colors[i%colors.length]}66)`}}/>
            </div>
            <div className="bar-label">{cat.length>8?cat.slice(0,7)+"…":cat}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthComparison({ comparison }) {
  if (!comparison) return (
    <div className="panel" style={{marginBottom:"1rem"}}>
      <h3>📅 month comparison</h3>
      <p style={{fontFamily:"var(--mono)",fontSize:"0.75rem",color:"var(--muted)"}}>Need transactions from 2+ months to compare.</p>
    </div>
  );
  const {curr,prev,currMonth,prevMonth}=comparison;
  const allCats=[...new Set([...Object.keys(curr),...Object.keys(prev)])];
  return (
    <div className="compare-grid" style={{marginBottom:"1rem"}}>
      {[{label:prevMonth,data:prev},{label:currMonth,data:curr}].map(({label,data})=>(
        <div className="compare-card" key={label}>
          <h4>{label}</h4>
          {allCats.slice(0,6).map(cat=>(
            <div className="compare-row" key={cat}>
              <span className="cat">{cat}</span>
              <span className="amt">₹{(data[cat]||0).toLocaleString()}</span>
              {data===curr&&prev[cat]&&(
                <span className={curr[cat]>prev[cat]?"delta-up":"delta-down"}>
                  {curr[cat]>prev[cat]?"▲":"▼"}{Math.abs(((curr[cat]||0)-(prev[cat]||0))/(prev[cat]||1)*100).toFixed(0)}%
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function CryptoTicker({ prices, loading }) {
  if (loading) return <p className="crypto-loading">⏳ Fetching live prices from CoinGecko…</p>;
  if (prices==="error") return <p className="crypto-loading">⚠ Could not fetch live prices. Check connection.</p>;
  return (
    <div className="crypto-ticker">
      {Object.entries(prices).map(([sym,{price,change,symbol,name,cls}])=>(
        <div className={`crypto-card ${cls}`} key={sym}>
          <div className="c-sym">{symbol}</div>
          <div className="c-name">{name} · {sym}</div>
          <div className="c-price">${price?.toLocaleString("en-US",{maximumFractionDigits:2})||"—"}</div>
          <div className={`c-change ${change>=0?"c-up":"c-down"}`}>{change>=0?"▲":"▼"} {Math.abs(change||0).toFixed(2)}% (24h)</div>
        </div>
      ))}
    </div>
  );
}

function CryptoRecommender({ result }) {
  const rec = getCryptoRecommendation(result.risk_score, result.risk_level, result.savings_rate, result.total_income);
  const monthlySavings = result.total_income * (result.savings_rate/100);
  return (
    <div className="crypto-recommend" style={{borderColor:`${rec.color}40`}}>
      <h3 style={{color:rec.color}}>{rec.emoji} {rec.title}</h3>
      <p className="rec-summary">{rec.summary}</p>
      {rec.allocations.length > 0 && (
        <>
          <div className="alloc-grid">
            {rec.allocations.map(a=>(
              <div className="alloc-card" key={a.symbol}>
                <div className="a-coin">{a.coin}</div>
                <div className="a-name">{a.name}</div>
                <div className="a-pct" style={{color:a.color}}>{a.pct}%</div>
                <div className="a-amt">₹{(monthlySavings*(a.pct/100)).toLocaleString("en-IN",{maximumFractionDigits:0})}/mo</div>
                <span className={`a-risk ${a.risk==="low"?"risk-low-tag":a.risk==="med"?"risk-med-tag":"risk-high-tag"}`}>
                  {a.risk==="low"?"Low Risk":a.risk==="med"?"Med Risk":"High Risk"}
                </span>
              </div>
            ))}
          </div>
          <div style={{fontFamily:"var(--mono)",fontSize:"0.75rem",color:"var(--muted)",marginBottom:"1rem"}}>
            Total allocation: <span style={{color:rec.color,fontWeight:700}}>{rec.totalPct}% of savings = ₹{rec.totalAmt.toLocaleString("en-IN",{maximumFractionDigits:0})}/month</span>
          </div>
        </>
      )}
      <div className="disclaimer">💡 <strong>Tip:</strong> {rec.tip}<br/>⚠ <strong>Disclaimer:</strong> Not financial advice. Crypto investments carry high risk. Always DYOR.</div>
    </div>
  );
}

// ── RPG Hero Banner ───────────────────────────────────────────────────────
function RPGHero({ result, transactions }) {
  const xp = computeXP(result.risk_score, result.savings_rate, transactions.length);
  const levelInfo = getLevel(xp);
  const avatar = getRiskAvatar(result.risk_score);
  const streak = getStreak(transactions.length, result.savings_rate);
  const earned = BADGES.filter(b => b.check(result, transactions));

  return (
    <>
      <div className="rpg-hero" style={{"--hero-color": avatar.aura}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"8px"}}>
          <div className="avatar-ring" style={{borderColor:avatar.aura,color:avatar.aura,boxShadow:`0 0 40px ${avatar.ring}`}}>
            {avatar.avatar}
          </div>
          <span style={{fontFamily:"var(--mono)",fontSize:"0.62rem",color:avatar.aura,textAlign:"center",letterSpacing:"0.06em"}}>{avatar.title}</span>
        </div>

        <div className="level-info">
          <div className="level-num">LEVEL {levelInfo.level}</div>
          <div className="level-title" style={{color:levelInfo.color}}>{levelInfo.icon} {levelInfo.title}</div>
          <div className="xp-bar-wrap">
            <div className="xp-bar-label">
              <span>XP PROGRESS</span>
              <span>{levelInfo.nextLevel ? `${levelInfo.nextLevel.minXP - xp} XP to Level ${levelInfo.level+1}` : "MAX LEVEL"}</span>
            </div>
            <div className="xp-bar-track">
              <div className="xp-bar-fill" style={{width:`${levelInfo.progress}%`,background:`linear-gradient(90deg,${levelInfo.color},${levelInfo.color}aa)`}}/>
            </div>
            <div className="xp-count">{xp} / {levelInfo.nextLevel?.minXP||xp} XP</div>
          </div>
          {streak && <div className="streak-badge">{streak.label}<span style={{color:"var(--muted)"}}> — {streak.msg}</span></div>}
        </div>

        <div className="avatar-score">
          <div className="big-score" style={{color:riskColor(result.risk_level)}}>{result.risk_score}</div>
          <div className="score-label">RISK SCORE</div>
          <div className="risk-tag" style={{
            background:`${riskColor(result.risk_level)}18`,
            border:`1px solid ${riskColor(result.risk_level)}40`,
            color:riskColor(result.risk_level)
          }}>{result.risk_level}</div>
        </div>
      </div>

      {/* Badges */}
      <div className="section-title">Achievement Badges</div>
      <div className="badges-grid">
        {BADGES.map(b => {
          const isEarned = earned.find(e => e.id === b.id);
          return (
            <div key={b.id} className={`badge-chip ${isEarned?"earned new-badge-glow":"locked"}`}>
              <span className="b-icon">{b.icon}</span>
              <div className="b-info">
                <div className="b-name">{b.name}</div>
                <div className="b-desc">{b.desc}</div>
              </div>
              {!isEarned && <span className="lock-icon">🔒</span>}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Pages ─────────────────────────────────────────────────────────────────
function DashboardPage({ result, transactions, setPage }) {
  if (!result) return (
    <div className="page">
      <div className="page-title">Command Centre</div>
      <div className="page-sub">YOUR FINANCIAL RPG DASHBOARD</div>
      <div className="empty-state">
        <div className="e-icon">🎮</div>
        <h3>No Analysis Yet</h3>
        <p>Head to the Analysis page, enter your transactions<br/>and hit Analyse to unlock your financial RPG stats.</p>
        <button className="btn btn-primary" onClick={()=>setPage("analysis")}>⚡ Go to Analysis</button>
      </div>
    </div>
  );

  const xp = computeXP(result.risk_score, result.savings_rate, transactions.length);
  const levelInfo = getLevel(xp);
  const avatar = getRiskAvatar(result.risk_score);
  const earned = BADGES.filter(b => b.check(result, transactions));
  const maxCat = Math.max(...Object.values(result.top_categories));

  return (
    <div className="page">
      <div className="page-title">Command Centre</div>
      <div className="page-sub">YOUR FINANCIAL RPG DASHBOARD</div>

      <RPGHero result={result} transactions={transactions} />

      <div className="section-title">Financial Stats</div>
      <div className="stats-grid">
        {[
          {label:"Total Income",  value:`₹${result.total_income.toLocaleString()}`,   color:"var(--green)",  sub:"This period"},
          {label:"Total Spent",   value:`₹${result.total_spent.toLocaleString()}`,    color:"var(--red)",    sub:`${(result.total_spent/result.total_income*100).toFixed(0)}% of income`},
          {label:"Savings Rate",  value:`${result.savings_rate.toFixed(1)}%`,         color:result.savings_rate>20?"var(--green)":"var(--yellow)", sub:result.savings_rate>20?"Above target 🎯":"Below 20% target"},
          {label:"Badges Earned", value:`${earned.length}/${BADGES.length}`,          color:"var(--purple)", sub:"Achievement progress"},
          {label:"Level",         value:`${levelInfo.icon} Lv.${levelInfo.level}`,    color:levelInfo.color, sub:levelInfo.title},
          {label:"XP Points",     value:xp,                                           color:"var(--accent)", sub:"Experience points"},
        ].map(s=>(
          <div className="stat-card" style={{color:s.color}} key={s.label}>
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
            <div className="sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div className="panel">
          <h3>⚠ Risk Flags ({result.risk_flags.length})</h3>
          {result.risk_flags.length===0
            ? <p style={{fontFamily:"var(--mono)",fontSize:"0.78rem",color:"var(--green)"}}>✓ No risk flags — clean finances!</p>
            : result.risk_flags.map((f,i)=>(
              <div className="flag-item" key={i}>
                <div className={`flag-dot flag-${f.severity}`}/>
                <div><div className="flag-msg">{f.message}</div>
                <div className="flag-cat">{f.severity.toUpperCase()} · {f.category}</div></div>
              </div>
            ))}
        </div>
        <div className="panel">
          <h3>Top Spending Categories</h3>
          {Object.entries(result.top_categories).slice(0,6).map(([cat,amt])=>(
            <div className="cat-bar-item" key={cat}>
              <div className="cat-bar-label"><span>{cat}</span><span>₹{amt.toLocaleString()}</span></div>
              <div className="cat-bar-track"><div className="cat-bar-fill" style={{width:`${(amt/maxCat)*100}%`}}/></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalysisPage({ transactions, setTx, income, setIncome, goal, setGoal, result, setResult, loading, setLoading, error, setError }) {
  const [tab, setTab] = useState("manual");
  const [csvMsg, setCsvMsg] = useState("");
  const [drag, setDrag] = useState(false);
  const [newRow, setNewRow] = useState({date:"",description:"",category:"",amount:""});
  const fileRef = useRef();
  const comparison = result ? buildMonthComparison(transactions) : null;

  const handleCSV = (file) => {
    if(!file)return;
    const reader=new FileReader();
    reader.onload=(e)=>{
      const parsed=parseCSV(e.target.result);
      if(parsed.length===0){setError("Could not parse CSV. Check format.");return;}
      setTx(parsed); setCsvMsg(`✓ Loaded ${parsed.length} transactions from ${file.name}`); setError("");
    };
    reader.readAsText(file);
  };

  const analyze = async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const res=await fetch(`${API}/analyze`,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({transactions,monthly_income:parseFloat(income),savings_goal:parseFloat(goal)||null})});
      if(!res.ok){const e=await res.json();throw new Error(e.detail||"API error");}
      setResult(await res.json());
    } catch(e){setError(e.message);}
    finally{setLoading(false);}
  };

  return (
    <div className="page">
      <div className="page-title">Analysis Terminal</div>
      <div className="page-sub">UPLOAD TRANSACTIONS · RUN AI ANALYSIS · EARN XP</div>

      <div className="form-grid">
        <div className="field"><label>Monthly Income (₹)</label>
          <input value={income} onChange={e=>setIncome(e.target.value)} placeholder="e.g. 75000"/></div>
        <div className="field"><label>Monthly Savings Goal (₹)</label>
          <input value={goal} onChange={e=>setGoal(e.target.value)} placeholder="e.g. 15000"/></div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab==="manual"?"active":""}`} onClick={()=>setTab("manual")}>✏️ Manual Entry</button>
        <button className={`tab ${tab==="csv"?"active":""}`} onClick={()=>setTab("csv")}>📂 Upload CSV</button>
      </div>

      {tab==="csv" && (
        <>
          <div className="csv-hint"><p>CSV format needed:</p><code>date, description, category, amount</code></div>
          {csvMsg && <div className="success-box">{csvMsg}</div>}
          <div className={`csv-drop ${drag?"drag":""}`}
            onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
            onDrop={e=>{e.preventDefault();setDrag(false);handleCSV(e.dataTransfer.files[0])}}
            onClick={()=>fileRef.current.click()}>
            <div className="icon">📂</div>
            <h3>Drop your bank CSV here</h3>
            <p>or click to browse · any bank export format</p>
            <input ref={fileRef} type="file" accept=".csv" onChange={e=>handleCSV(e.target.files[0])}/>
          </div>
        </>
      )}

      {tab==="manual" && (
        <>
          <div className="section-title">Add Transaction</div>
          <div className="add-row-form">
            <input placeholder="Date (YYYY-MM-DD)" value={newRow.date} onChange={e=>setNewRow({...newRow,date:e.target.value})}/>
            <input placeholder="Description" value={newRow.description} onChange={e=>setNewRow({...newRow,description:e.target.value})}/>
            <input placeholder="Category" value={newRow.category} onChange={e=>setNewRow({...newRow,category:e.target.value})}/>
            <input placeholder="Amount (neg = expense)" type="number" value={newRow.amount} onChange={e=>setNewRow({...newRow,amount:e.target.value})}/>
            <button className="btn btn-ghost" onClick={()=>{
              if(!newRow.date||!newRow.description||!newRow.category||newRow.amount==="")return;
              setTx(prev=>[...prev,{...newRow,amount:parseFloat(newRow.amount)}]);
              setNewRow({date:"",description:"",category:"",amount:""});
            }}>+ Add</button>
          </div>
        </>
      )}

      {transactions.length > 0 && (
        <>
          <div className="section-title">Transactions ({transactions.length})</div>
          <div className="tx-table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th></th></tr></thead>
              <tbody>
                {transactions.map((t,i)=>(
                  <tr key={i}>
                    <td style={{color:"var(--muted)"}}>{t.date}</td>
                    <td>{t.description}</td>
                    <td><span className="cat-pill">{t.category}</span></td>
                    <td className={t.amount<0?"amount-neg":"amount-pos"}>
                      {t.amount<0?"-":"+"}₹{Math.abs(t.amount).toLocaleString()}
                    </td>
                    <td><button className="btn btn-danger" onClick={()=>setTx(p=>p.filter((_,idx)=>idx!==i))}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="tx-actions">
        <button className="btn btn-primary" onClick={analyze} disabled={loading||transactions.length===0}>
          {loading?"Scanning…":"⚡ Analyse My Finances"}
        </button>
        <button className="btn btn-ghost" onClick={()=>{setResult(null);setError("");}}>Clear Results</button>
        <button className="btn btn-ghost" onClick={()=>{setTx([]);setCsvMsg("");setResult(null);}}>Clear All</button>
      </div>

      {error && <div className="error-box">⚠ {error}</div>}
      {loading && (
        <div className="loader">
          <div className="spinner-rpg"/>
          <h3>AI SCANNING YOUR DATA</h3>
          <p>Calculating XP, detecting risk patterns…</p>
        </div>
      )}

      {result && !loading && (
        <div style={{animation:"fadeUp 0.5s ease"}}>
          <div className="section-title">AI Analysis Results</div>

          <div className="ai-panel">
            <h3><span className="dot"></span>AI Financial Health Report</h3>
            <div className="ai-text">{result.ai_report}</div>
          </div>

          {result.savings_plan && (
            <div className="ai-panel" style={{borderColor:"#00ff9d40"}}>
              <h3><span className="dot" style={{background:"var(--green)",boxShadow:"0 0 8px var(--green)"}}></span>Personalised Savings Plan</h3>
              <div className="ai-text">{result.savings_plan}</div>
            </div>
          )}

          <div className="section-title">Month-over-Month Comparison</div>
          <MonthComparison comparison={comparison}/>
          <SpendingChart categories={result.top_categories}/>
        </div>
      )}
    </div>
  );
}

function CryptoPage({ result }) {
  const { prices, loading: pricesLoading } = useCryptoPrices();
  if (!result) return (
    <div className="page">
      <div className="page-title">Crypto Intel</div>
      <div className="page-sub">BLOCKCHAIN · DEFI · LIVE MARKETS</div>
      <div className="empty-state">
        <div className="e-icon">🔗</div>
        <h3>Run Analysis First</h3>
        <p>Complete a financial analysis to unlock<br/>your personalised crypto allocation recommendations.</p>
      </div>
    </div>
  );
  return (
    <div className="page">
      <div className="page-title">Crypto Intel</div>
      <div className="page-sub">BLOCKCHAIN · DEFI · LIVE MARKETS</div>
      <div className="chart-wrap">
        <h3><span className="live-dot"></span>live crypto prices · updates every 60s</h3>
        <CryptoTicker prices={prices} loading={pricesLoading}/>
      </div>
      <div className="section-title">Your Crypto Readiness</div>
      <CryptoRecommender result={result}/>
    </div>
  );
}

function ReportPage({ result, transactions, income }) {
  if (!result) return (
    <div className="page">
      <div className="page-title">Mission Report</div>
      <div className="page-sub">FULL FINANCIAL DEBRIEF</div>
      <div className="empty-state">
        <div className="e-icon">📋</div>
        <h3>No Report Yet</h3>
        <p>Run an analysis to generate<br/>your full financial mission report.</p>
      </div>
    </div>
  );

  const xp = computeXP(result.risk_score, result.savings_rate, transactions.length);
  const levelInfo = getLevel(xp);
  const earned = BADGES.filter(b => b.check(result, transactions));
  const avatar = getRiskAvatar(result.risk_score);
  const gameData = { levelInfo, earned };

  return (
    <div className="page">
      <div className="page-title">Mission Report</div>
      <div className="page-sub">FULL FINANCIAL DEBRIEF</div>

      <div className="export-bar">
        <span>Report ready —</span>
        <button className="btn btn-green" onClick={()=>exportPDF(result,transactions,gameData)}>📄 Export PDF Report</button>
      </div>

      <div className="report-grid">
        {[
          {label:"Risk Score",    val:`${result.risk_score}/100`, color:riskColor(result.risk_level), hint:`Level: ${result.risk_level}`},
          {label:"Savings Rate",  val:`${result.savings_rate.toFixed(1)}%`, color:result.savings_rate>20?"var(--green)":"var(--yellow)", hint:result.savings_rate>20?"Above 20% target ✓":"Below 20% target"},
          {label:"Total Spent",   val:`₹${result.total_spent.toLocaleString()}`, color:"var(--red)", hint:`${(result.total_spent/result.total_income*100).toFixed(0)}% of income`},
          {label:"Player Level",  val:`Lv.${levelInfo.level}`, color:levelInfo.color, hint:`${levelInfo.title} · ${xp} XP`},
        ].map(c=>(
          <div className="report-card" key={c.label}>
            <h4>{c.label}</h4>
            <div className="big-val" style={{color:c.color}}>{c.val}</div>
            <div className="hint">{c.hint}</div>
          </div>
        ))}
      </div>

      <div className="section-title">Earned Achievements ({earned.length}/{BADGES.length})</div>
      <div className="badges-grid" style={{marginBottom:"1.5rem"}}>
        {earned.map(b=>(
          <div key={b.id} className="badge-chip earned">
            <span className="b-icon">{b.icon}</span>
            <div className="b-info">
              <div className="b-name">{b.name}</div>
              <div className="b-desc">{b.desc}</div>
            </div>
          </div>
        ))}
        {earned.length===0 && <p style={{fontFamily:"var(--mono)",fontSize:"0.75rem",color:"var(--muted)"}}>No badges earned yet. Improve your finances!</p>}
      </div>

      <div className="section-title">Risk Flags ({result.risk_flags.length})</div>
      <div className="panel" style={{marginBottom:"1rem"}}>
        {result.risk_flags.length===0
          ? <p style={{fontFamily:"var(--mono)",fontSize:"0.78rem",color:"var(--green)"}}>✓ No risk flags detected</p>
          : result.risk_flags.map((f,i)=>(
            <div className="flag-item" key={i}>
              <div className={`flag-dot flag-${f.severity}`}/>
              <div><div className="flag-msg">{f.message}</div>
              <div className="flag-cat">{f.severity.toUpperCase()} · {f.category}</div></div>
            </div>
          ))}
      </div>

      <div className="section-title">Full AI Report</div>
      <div className="ai-panel">
        <h3><span className="dot"></span>AI Financial Health Report</h3>
        <div className="ai-text">{result.ai_report}</div>
      </div>
      {result.savings_plan && (
        <div className="ai-panel" style={{borderColor:"#00ff9d40"}}>
          <h3><span className="dot" style={{background:"var(--green)",boxShadow:"0 0 8px var(--green)"}}></span>Personalised Savings Plan</h3>
          <div className="ai-text">{result.savings_plan}</div>
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]       = useState("dashboard");
  const [transactions, setTx] = useState([]);
  const [income, setIncome]   = useState("75000");
  const [goal, setGoal]       = useState("15000");
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const xp = result ? computeXP(result.risk_score, result.savings_rate, transactions.length) : 0;
  const levelInfo = getLevel(xp);

  useEffect(()=>{
    fetch(`${API}/sample-data`).then(r=>r.json()).then(d=>{
      setTx(d.transactions); setIncome(String(d.monthly_income)); setGoal(String(d.savings_goal));
    }).catch(()=>{});
  },[]);

  const PAGES = [
    { id:"dashboard", label:"Dashboard" },
    { id:"analysis",  label:"Analysis"  },
    { id:"crypto",    label:"Crypto"    },
    { id:"report",    label:"Report"    },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="topbar">
        <div className="logo-area">
          <div className="logo-mark">💹</div>
          <div>
            <div className="logo-text">FINGUARD</div>
            <div className="logo-sub">FINANCIAL RPG</div>
          </div>
        </div>
        <nav className="nav-links">
          {PAGES.map(p=>(
            <button key={p.id} className={`nav-btn ${page===p.id?"active":""}`} onClick={()=>setPage(p.id)}>
              {p.label}
            </button>
          ))}
        </nav>
        {result && (
          <div className="hud-area">
            <div className="hud-badge">{levelInfo.icon} <span className="val">Lv.{levelInfo.level}</span></div>
            <div className="hud-badge">XP <span className="val">{xp}</span></div>
          </div>
        )}
      </div>

      <div className="app">
        {page === "dashboard" && <DashboardPage result={result} transactions={transactions} setPage={setPage}/>}
        {page === "analysis"  && (
          <AnalysisPage
            transactions={transactions} setTx={setTx}
            income={income} setIncome={setIncome}
            goal={goal} setGoal={setGoal}
            result={result} setResult={setResult}
            loading={loading} setLoading={setLoading}
            error={error} setError={setError}
          />
        )}
        {page === "crypto"    && <CryptoPage result={result}/>}
        {page === "report"    && <ReportPage result={result} transactions={transactions} income={income}/>}
      </div>
    </>
  );
}