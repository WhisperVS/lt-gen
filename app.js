window.addEventListener("DOMContentLoaded", () => {
  const RULES = {
    powerball: { name: "Powerball", main: [1, 69], mainCount: 5, bonus: [1, 26], bonusName: "Powerball" },
    megamillions: { name: "Mega Millions", main: [1, 70], mainCount: 5, bonus: [1, 25], bonusName: "Mega Ball" }
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
      titleRow.innerHTML = `
        <span class="tag">Ticket #${t.index}</span>
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
