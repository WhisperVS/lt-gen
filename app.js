window.addEventListener("DOMContentLoaded", () => {
  const RULES = {
    powerball: { name: "Powerball", main: [1, 69], mainCount: 5, bonus: [1, 26], bonusName: "Powerball" },
    megamillions: { name: "Mega Millions", main: [1, 70], mainCount: 5, bonus: [1, 24], bonusName: "Mega Ball" }
  };

  let currentLottery = "powerball";
  let currentTickets = [];

  const el = (id) => document.getElementById(id);

  const listEl = el("list");
  const metaEl = el("meta");
  const countEl = el("count");
  const noDupesEl = el("noDupes");
  const sortMainEl = el("sortMain");
  const generateBtn = el("generate");
  const copyBtn = el("copy");
  const clearBtn = el("clear");
  const minusBtn = el("minus");
  const plusBtn = el("plus");

  // Lottery toggle
  document.querySelectorAll(".seg").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".seg").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentLottery = btn.dataset.lottery;
      renderMeta();
      render();
    });
  });

  // Quick pick presets
  function syncQuickPickHighlight() {
    const v = parseInt(countEl.value, 10);
    document.querySelectorAll(".pill").forEach((p) => {
      p.classList.toggle("active", parseInt(p.dataset.quick, 10) === v);
    });
  }

  document.querySelectorAll(".pill").forEach((p) => {
    p.addEventListener("click", () => {
      countEl.value = String(p.dataset.quick);
      clampCount();
      syncQuickPickHighlight();
    });
  });

  // Stepper controls
  minusBtn.addEventListener("click", () => stepCount(-1));
  plusBtn.addEventListener("click", () => stepCount(1));
  countEl.addEventListener("change", () => {
    clampCount();
    syncQuickPickHighlight();
  });

  // Generate (no duplicate tickets within the batch)
  generateBtn.addEventListener("click", () => {
    const n = clampCount();
    const rules = RULES[currentLottery];

    const uniqueSet = new Set();
    const tickets = [];
    const maxAttempts = Math.max(3000, n * 300);

    let attempts = 0;
    while (tickets.length < n && attempts < maxAttempts) {
      attempts++;

      const main = noDupesEl.checked
        ? uniqueRandom(rules.mainCount, rules.main[0], rules.main[1])
        : Array.from({ length: rules.mainCount }, () => rand(rules.main[0], rules.main[1]));

      if (sortMainEl.checked) main.sort((a, b) => a - b);

      const bonus = rand(rules.bonus[0], rules.bonus[1]);

      const keyMain = [...main].sort((a, b) => a - b);
      const key = `${currentLottery}|${keyMain.join(",")}|B:${bonus}`;

      if (!uniqueSet.has(key)) {
        uniqueSet.add(key);
        tickets.push({ index: tickets.length + 1, main, bonus, lottery: currentLottery });
      }
    }

    currentTickets = tickets;
    renderMeta(true, attempts, maxAttempts);
    render();

    copyBtn.disabled = currentTickets.length === 0;
    clearBtn.disabled = currentTickets.length === 0;
  });

  copyBtn.addEventListener("click", async () => {
    const text = formatForCopy(currentTickets);
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy Results"), 900);
    } catch {
      window.prompt("Copy to clipboard:", text);
    }
  });

  clearBtn.addEventListener("click", () => {
    currentTickets = [];
    renderMeta();
    render();
    copyBtn.disabled = true;
    clearBtn.disabled = true;
  });

  function renderMeta(hasNew = false, attempts = 0, cap = 0) {
    const rules = RULES[currentLottery];
    if (currentTickets.length === 0) {
      metaEl.textContent = `Selected: ${rules.name}. No tickets yet.`;
      return;
    }
    const extra = cap ? ` • attempts: ${attempts}/${cap}` : "";
    metaEl.textContent = `${rules.name} • ${currentTickets.length} ticket(s) • ${hasNew ? "Generated just now" : "Loaded"}${extra}`;
  }

  function render() {
    listEl.innerHTML = "";
    if (currentTickets.length === 0) return;

    const rules = RULES[currentLottery];

    for (const t of currentTickets) {
      const row = document.createElement("div");
      row.className = "ticket";

      const left = document.createElement("div");
      left.className = "left";

      const titleRow = document.createElement("div");
      titleRow.className = "titleRow";
      const smartTag = t.smart ? `<span class="tag smartTag">Smart</span>` : "";
      titleRow.innerHTML = `
        <span class="tag">Ticket #${t.index}</span>
        ${smartTag}
        <span>${rules.name}</span>
        <span style="color: rgba(234,240,255,.45)">•</span>
        <span>${rules.mainCount} main + 1 ${rules.bonusName}</span>
      `;

      const balls = document.createElement("div");
      balls.className = "balls";

      t.main.forEach((n) => {
        const ball = document.createElement("div");
        ball.className = "ball";
        ball.textContent = n;
        balls.appendChild(ball);
      });

      const bonusBall = document.createElement("div");
      bonusBall.className = "ball bonus";
      bonusBall.title = rules.bonusName;
      bonusBall.textContent = t.bonus;
      balls.appendChild(bonusBall);

      left.appendChild(titleRow);
      left.appendChild(balls);

      const rightBtn = document.createElement("button");
      rightBtn.className = "smallBtn";
      rightBtn.textContent = "Copy";
      rightBtn.addEventListener("click", async () => {
        const single = formatOne(t);
        try {
          await navigator.clipboard.writeText(single);
          rightBtn.textContent = "Copied";
          setTimeout(() => (rightBtn.textContent = "Copy"), 800);
        } catch {
          window.prompt("Copy:", single);
        }
      });

      row.appendChild(left);
      row.appendChild(rightBtn);
      listEl.appendChild(row);
    }
  }

  // ─────────────────────────────────────────────
  // SMART ANALYSIS  –  data fetching & frequency
  // ─────────────────────────────────────────────

  const LOTTERY_APIS = {
    powerball: {
      url: "https://data.ny.gov/resource/d6yy-54nr.json?$limit=3000&$where=draw_date%3E%3D%272015-10-07T00%3A00%3A00%27&$order=draw_date%20ASC",
      bonusField: null    // bonus is the 6th number embedded in winning_numbers
    },
    megamillions: {
      url: "https://data.ny.gov/resource/5xaw-6ayf.json?$limit=3000&$where=draw_date%3E%3D%272017-10-28T00%3A00%3A00%27&$order=draw_date%20ASC",
      bonusField: "mega_ball" // separate field in the API response
    }
  };

  const ANALYSIS_CACHE_TTL = 12 * 3600 * 1000; // 12 h

  const analysisCache = {}; // keyed by lottery

  function getAS(lottery) {
    return analysisCache[lottery] || { state: "idle", draws: null, stats: null, error: null };
  }
  function setAS(lottery, patch) {
    analysisCache[lottery] = { ...getAS(lottery), ...patch };
  }

  // DOM refs — analysis card
  const analysisCardEl   = el("analysisCard");
  const analysisBadgeEl  = el("analysisBadge");
  const analysisMetaEl   = el("analysisMeta");
  const loadAnalysisBtnEl = el("loadAnalysisBtn");
  const analysisIdleEl   = el("analysisIdle");
  const analysisLoadingEl = el("analysisLoading");
  const analysisErrorEl  = el("analysisError");
  const analysisResultsEl = el("analysisResults");
  const statDrawsEl      = el("statDraws");
  const statFromEl       = el("statFrom");
  const statToEl         = el("statTo");
  const hotMainEl        = el("hotMain");
  const coldMainEl       = el("coldMain");
  const hotBonusEl       = el("hotBonus");
  const coldBonusEl      = el("coldBonus");
  const hotBonusTitleEl  = el("hotBonusTitle");
  const coldBonusTitleEl = el("coldBonusTitle");
  const smartPickBtnEl   = el("smartPick");

  async function loadAnalysisData(lottery) {
    const api = LOTTERY_APIS[lottery];
    if (!api) return;
    if (getAS(lottery).state === "loading") return;

    setAS(lottery, { state: "loading" });
    updateAnalysisUI();

    try {
      let draws = null;
      const cacheKey = "analysis_v1_" + lottery;

      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey));
        if (cached && Date.now() - cached.ts < ANALYSIS_CACHE_TTL) {
          draws = cached.data;
        }
      } catch (_) {}

      if (!draws) {
        const resp = await fetch(api.url);
        if (!resp.ok) throw new Error("HTTP " + resp.status + ": " + resp.statusText);
        const rows = await resp.json();

        draws = [];
        for (const row of rows) {
          const src = (row.winning_numbers || row["winning numbers"] || "").trim();
          const nums = src.split(/\s+/).map(Number);
          if (nums.some(isNaN)) continue;

          let main, bonus;
          if (api.bonusField) {
            // Mega Millions: 5 white balls in winning_numbers + separate mega_ball field
            if (nums.length < 5) continue;
            main  = nums.slice(0, 5);
            bonus = Number(row[api.bonusField]);
            if (isNaN(bonus)) continue;
          } else {
            // Powerball: 5 white + 1 Powerball all in winning_numbers
            if (nums.length < 6) continue;
            main  = nums.slice(0, 5);
            bonus = nums[5];
          }

          draws.push({
            date: (row.draw_date || "").split("T")[0],
            main,
            bonus
          });
        }

        try {
          localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: draws }));
        } catch (_) {}
      }

      const stats = computeStats(draws, RULES[lottery]);
      setAS(lottery, { state: "loaded", draws, stats, error: null });
    } catch (e) {
      setAS(lottery, { state: "error", error: e.message });
    }

    updateAnalysisUI();
  }

  function computeStats(draws, rules) {
    const mainSize  = rules.main[1];
    const bonusSize = rules.bonus[1];

    const mainFreq  = new Array(mainSize  + 1).fill(0);
    const bonusFreq = new Array(bonusSize + 1).fill(0);

    for (const d of draws) {
      for (const n of d.main)  if (n >= 1 && n <= mainSize)  mainFreq[n]++;
      if (d.bonus >= 1 && d.bonus <= bonusSize) bonusFreq[d.bonus]++;
    }

    const mainArr = [];
    for (let i = 1; i <= mainSize; i++)  mainArr.push({ num: i, count: mainFreq[i] });
    mainArr.sort((a, b) => b.count - a.count);

    const bonusArr = [];
    for (let i = 1; i <= bonusSize; i++) bonusArr.push({ num: i, count: bonusFreq[i] });
    bonusArr.sort((a, b) => b.count - a.count);

    const dates = draws.map((d) => d.date).filter(Boolean).sort();
    return {
      totalDraws: draws.length,
      dateFrom: dates[0] || "–",
      dateTo: dates[dates.length - 1] || "–",
      mainArr,
      bonusArr
    };
  }

  function updateAnalysisUI() {
    const rules = RULES[currentLottery];
    const { state, stats, error } = getAS(currentLottery);

    analysisBadgeEl.textContent = rules.name;
    hotBonusTitleEl.innerHTML   = `&#x1F525; Hot ${rules.bonusName} <span class="freqNote">(top 5)</span>`;
    coldBonusTitleEl.innerHTML  = `&#x2744;&#xFE0F; Due ${rules.bonusName} <span class="freqNote">(bottom 5)</span>`;

    hide(analysisIdleEl,    state !== "idle");
    hide(analysisLoadingEl, state !== "loading");
    hide(analysisErrorEl,   state !== "error");
    hide(analysisResultsEl, state !== "loaded");

    loadAnalysisBtnEl.textContent = state === "loading" ? "Loading…" : state === "loaded" ? "Refresh" : "Load Data";
    loadAnalysisBtnEl.disabled    = state === "loading";
    smartPickBtnEl.disabled       = state === "loading";

    if (state === "error") {
      analysisErrorEl.textContent = "Failed to load: " + error + ". Check your connection and try again.";
    }

    if (state === "loaded" && stats) {
      statDrawsEl.textContent = stats.totalDraws.toLocaleString();
      statFromEl.textContent  = stats.dateFrom;
      statToEl.textContent    = stats.dateTo;

      renderFreqBalls(hotMainEl,   stats.mainArr.slice(0, 10),          stats.totalDraws, "hot",  false);
      renderFreqBalls(coldMainEl,  [...stats.mainArr].reverse().slice(0, 10), stats.totalDraws, "cold", false);
      renderFreqBalls(hotBonusEl,  stats.bonusArr.slice(0, 5),          stats.totalDraws, "hot",  true);
      renderFreqBalls(coldBonusEl, [...stats.bonusArr].reverse().slice(0, 5), stats.totalDraws, "cold", true);
    }
  }

  function hide(elem, shouldHide) {
    elem.classList.toggle("hidden", shouldHide);
  }

  function renderFreqBalls(container, items, totalDraws, type, isBonus) {
    container.innerHTML = "";
    for (const { num, count } of items) {
      const pct  = totalDraws > 0 ? ((count / totalDraws) * 100).toFixed(1) : "0.0";
      const wrap = document.createElement("div");
      wrap.className = "freqBall";

      const ball = document.createElement("div");
      ball.className = "ball " + type + (isBonus ? " bonus" : "");
      ball.textContent = num;
      ball.title = num + ": drawn " + count + " times (" + pct + "%)";

      const lbl = document.createElement("div");
      lbl.className = "freqPct";
      lbl.textContent = pct + "%";

      wrap.appendChild(ball);
      wrap.appendChild(lbl);
      container.appendChild(wrap);
    }
  }

  // Weighted random sampling without replacement (roulette-wheel)
  function weightedSample(pool, count) {
    const arr = pool.map((x) => ({ ...x }));
    const result = [];
    for (let i = 0; i < count; i++) {
      let total = 0;
      for (const x of arr) total += x.w;
      let r = Math.random() * total;
      let sel = arr.length - 1;
      for (let j = 0; j < arr.length; j++) {
        r -= arr[j].w;
        if (r <= 0) { sel = j; break; }
      }
      result.push(arr[sel].num);
      arr.splice(sel, 1);
    }
    return result;
  }

  function smartGenerateTickets(n) {
    const rules = RULES[currentLottery];
    const stats = getAS(currentLottery).stats;

    // Build weight pools (add floor of 1 so cold numbers still have a chance)
    const mainPool  = stats.mainArr .map(({ num, count }) => ({ num, w: count + 1 }));
    const bonusPool = stats.bonusArr.map(({ num, count }) => ({ num, w: count + 1 }));

    const uniqueSet = new Set();
    const tickets   = [];
    const max       = Math.max(3000, n * 300);

    let attempts = 0;
    while (tickets.length < n && attempts < max) {
      attempts++;
      const main  = weightedSample(mainPool,  rules.mainCount).sort((a, b) => a - b);
      const bonus = weightedSample(bonusPool, 1)[0];

      const key = currentLottery + "|" + main.join(",") + "|B:" + bonus;
      if (!uniqueSet.has(key)) {
        uniqueSet.add(key);
        tickets.push({ index: tickets.length + 1, main, bonus, lottery: currentLottery, smart: true });
      }
    }
    return tickets;
  }

  // ── Event handlers ──────────────────────────

  loadAnalysisBtnEl.addEventListener("click", () => {
    const s = getAS(currentLottery).state;
    // "Refresh" forces a fresh fetch by clearing the localStorage cache
    if (s === "loaded") {
      try { localStorage.removeItem("analysis_v1_" + currentLottery); } catch (_) {}
      setAS(currentLottery, { state: "idle", draws: null, stats: null });
    }
    loadAnalysisData(currentLottery);
  });

  smartPickBtnEl.addEventListener("click", async () => {
    const n = clampCount();

    // Ensure data is loaded
    if (getAS(currentLottery).state !== "loaded") {
      await loadAnalysisData(currentLottery);
    }

    const { state: freshState, stats } = getAS(currentLottery);
    if (freshState !== "loaded" || !stats) return; // data failed to load

    const tickets = smartGenerateTickets(n);
    currentTickets = tickets;
    renderMeta(true);
    render();
    copyBtn.disabled  = false;
    clearBtn.disabled = false;
  });

  // Re-render analysis header when lottery switches
  document.querySelectorAll(".seg").forEach((btn) => {
    btn.addEventListener("click", () => updateAnalysisUI());
  });

  // ── Initial analysis UI render ───────────────
  updateAnalysisUI();

  function uniqueRandom(count, min, max) {
    const set = new Set();
    while (set.size < count) set.add(rand(min, max));
    return Array.from(set);
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function clampCount() {
    let v = parseInt(countEl.value, 10);
    if (Number.isNaN(v)) v = 1;
    v = Math.max(1, Math.min(50, v));
    countEl.value = String(v);
    return v;
  }

  function stepCount(delta) {
    const v = clampCount();
    countEl.value = String(Math.max(1, Math.min(50, v + delta)));
    syncQuickPickHighlight();
  }

  function formatOne(t) {
    const rules = RULES[t.lottery];
    return `${rules.name} Ticket #${t.index}: ${t.main.join("-")} | ${rules.bonusName}: ${t.bonus}`;
  }

  function formatForCopy(tickets) {
    if (!tickets.length) return "";
    const rules = RULES[tickets[0].lottery];
    return tickets.map((t) => `${rules.name} #${t.index}: ${t.main.join("-")} | ${rules.bonusName}: ${t.bonus}`).join("\n");
  }

  renderMeta();
  syncQuickPickHighlight();
});
