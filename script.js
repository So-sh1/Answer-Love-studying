(() => {
  "use strict";

  const KEY = "studygram_mobile_v1";
  const DAY = 86400000;

  const starter = [
    card({ q: "-OH の官能基名は？", a: "ヒドロキシ基", tags: ["化学"], hint: "水酸基ともいう", explain: "アルコール類に含まれる官能基。" }),
    card({ q: "-COOH の官能基名は？", a: "カルボキシ基", tags: ["化学"], hint: "酸性っぽいやつ", explain: "カルボン酸に含まれる官能基。" }),
    card({ q: "運動量の式は？", a: "p = mv", tags: ["物理"], hint: "質量×速度", explain: "pが運動量、mが質量、vが速度。" })
  ];

  let state = load();
  let queue = [];
  let index = 0;
  let lastResult = null;

  function card({ q, a, tags = [], hint = "", explain = "" }) {
    const now = Date.now();
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : String(now + Math.random()),
      q: q.trim(),
      a: a.trim(),
      tags,
      hint: hint.trim(),
      explain: explain.trim(),
      star: false,
      correct: 0,
      wrong: 0,
      reviews: 0,
      due: now,
      interval: 0,
      ease: 2.5,
      created: now
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) throw new Error();
      const s = JSON.parse(raw);
      return {
        cards: Array.isArray(s.cards) ? s.cards : starter,
        mode: s.mode || "smart",
        dark: s.dark ?? true,
        goal: s.goal || 30,
        stats: s.stats || { total: 0, xp: 0, streak: 0, best: 0, last: "", history: {} }
      };
    } catch {
      return { cards: starter, mode: "smart", dark: true, goal: 30, stats: { total: 0, xp: 0, streak: 0, best: 0, last: "", history: {} } };
    }
  }

  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

  const $ = id => document.getElementById(id);

  const el = {
    screens: [...document.querySelectorAll(".screen")],
    tabs: [...document.querySelectorAll(".tab")],
    themeBtn: $("themeBtn"),
    todayCount: $("todayCount"),
    goalCount: $("goalCount"),
    accuracyText: $("accuracyText"),
    tagChip: $("tagChip"),
    progressText: $("progressText"),
    metaText: $("metaText"),
    questionText: $("questionText"),
    answerInput: $("answerInput"),
    checkBtn: $("checkBtn"),
    showBtn: $("showBtn"),
    resultBox: $("resultBox"),
    resultLabel: $("resultLabel"),
    scoreText: $("scoreText"),
    correctAnswer: $("correctAnswer"),
    explainText: $("explainText"),
    prevBtn: $("prevBtn"),
    nextBtn: $("nextBtn"),
    hintBtn: $("hintBtn"),
    addForm: $("addForm"),
    newQuestion: $("newQuestion"),
    newAnswer: $("newAnswer"),
    newTags: $("newTags"),
    newHint: $("newHint"),
    newExplain: $("newExplain"),
    searchInput: $("searchInput"),
    modeSelect: $("modeSelect"),
    cardList: $("cardList"),
    listSub: $("listSub"),
    totalReviews: $("totalReviews"),
    streak: $("streak"),
    level: $("level"),
    weakCount: $("weakCount"),
    bars: $("bars"),
    exportBtn: $("exportBtn"),
    importFile: $("importFile")
  };

  function dayKey(offset = 0) {
    const d = new Date(Date.now() + offset * DAY);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function parseTags(v) {
    return [...new Set(String(v || "").split(/[,\u3001\s|/／]+/).map(x => x.trim()).filter(Boolean))];
  }

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[ぁ-ん]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60))
      .replace(/[。、．，,.\s_\-ー=＝]/g, "")
      .replace(/[()（）「」『』[\]{}]/g, "");
  }

  function lev(a, b) {
    a = norm(a); b = norm(b);
    if (a === b) return 0;
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = Math.min(
          dp[i-1][j] + 1,
          dp[i][j-1] + 1,
          dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)
        );
      }
    }
    return dp[a.length][b.length];
  }

  function sim(user, answer) {
    const parts = String(answer).split(/[\/／,、;；]/).map(x => x.trim()).filter(Boolean);
    let best = 0;
    for (const ans of parts.length ? parts : [answer]) {
      const u = norm(user), a = norm(ans);
      if (!a) continue;
      if (u === a) best = Math.max(best, 1);
      if (u && a.includes(u)) best = Math.max(best, Math.min(.92, u.length / a.length + .18));
      if (a && u.includes(a)) best = Math.max(best, Math.min(.98, a.length / u.length + .18));
      best = Math.max(best, 1 - lev(u, a) / Math.max(u.length, a.length, 1));
    }
    return Math.max(0, Math.min(1, best));
  }

  function buildQueue() {
    const now = Date.now();
    let cards = [...state.cards];

    if (state.mode === "smart") {
      const due = cards.filter(c => c.due <= now);
      const weak = cards.filter(c => c.wrong > c.correct);
      cards = [...new Map([...due, ...weak, ...cards].map(c => [c.id, c])).values()];
      cards.sort((a,b) => (a.due - b.due) || ((b.wrong - b.correct) - (a.wrong - a.correct)));
    }
    if (state.mode === "weak") cards = cards.filter(c => c.wrong > c.correct);
    if (state.mode === "star") cards = cards.filter(c => c.star);

    queue = cards;
    if (index >= queue.length) index = 0;
  }

  function current() { return queue[index] || null; }

  function renderQuiz() {
    buildQueue();
    const c = current();
    el.resultBox.classList.add("hidden");
    el.answerInput.value = "";
    lastResult = null;

    el.progressText.textContent = queue.length ? `${index + 1} / ${queue.length}` : "0 / 0";

    if (!c) {
      el.tagChip.textContent = "なし";
      el.metaText.textContent = "このモードの問題がないで";
      el.questionText.textContent = state.cards.length ? "一覧からモードを変えてみて" : "＋から問題を追加しよう";
      el.correctAnswer.textContent = "";
      return;
    }

    el.tagChip.textContent = c.tags[0] || "タグなし";
    el.metaText.textContent = `${c.tags.join(" / ") || "タグなし"}・正解${c.correct}・不正解${c.wrong}`;
    el.questionText.textContent = c.q;
    el.correctAnswer.textContent = c.a;
    el.explainText.textContent = c.explain || "";
  }

  function renderTop() {
    document.body.classList.toggle("light", !state.dark);
    const today = state.stats.history[dayKey()] || 0;
    const totalCorrect = state.cards.reduce((s,c) => s + c.correct, 0);
    const totalWrong = state.cards.reduce((s,c) => s + c.wrong, 0);
    const acc = totalCorrect + totalWrong ? Math.round(totalCorrect / (totalCorrect + totalWrong) * 100) : 0;
    el.todayCount.textContent = today;
    el.goalCount.textContent = state.goal;
    el.accuracyText.textContent = `${acc}%`;
    document.querySelector(".ring").style.setProperty("--deg", `${Math.min(360, acc * 3.6)}deg`);
  }

  function renderList() {
    el.modeSelect.value = state.mode;
    const q = norm(el.searchInput.value);
    let cards = state.cards.filter(c => !q || norm(c.q + c.a + c.tags.join(" ")).includes(q));
    el.listSub.textContent = `${cards.length} / ${state.cards.length}問`;
    el.cardList.innerHTML = "";
    const tpl = $("listTemplate");

    if (!cards.length) {
      el.cardList.innerHTML = `<p class="mini-meta">問題なし</p>`;
      return;
    }

    cards.forEach(c => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.querySelector(".mini-q").textContent = c.q;
      node.querySelector(".mini-a").textContent = `答え：${c.a}`;
      node.querySelector(".mini-meta").textContent = `${c.tags.join(" / ") || "タグなし"}・正解${c.correct}・不正解${c.wrong}`;
      node.querySelector(".star").textContent = c.star ? "★" : "☆";
      node.querySelector(".star").onclick = () => { c.star = !c.star; render(); };
      node.querySelector(".delete").onclick = () => {
        if (confirm("削除する？")) {
          state.cards = state.cards.filter(x => x.id !== c.id);
          render();
        }
      };
      node.querySelector(".edit").onclick = () => edit(c);
      el.cardList.appendChild(node);
    });
  }

  function renderStats() {
    const weak = state.cards.filter(c => c.wrong > c.correct).length;
    el.totalReviews.textContent = state.stats.total;
    el.streak.textContent = `${state.stats.streak}日`;
    el.level.textContent = Math.floor(Math.sqrt(state.stats.xp / 40)) + 1;
    el.weakCount.textContent = weak;

    const days = Array.from({ length: 7 }, (_, i) => dayKey(i - 6));
    const max = Math.max(1, ...days.map(d => state.stats.history[d] || 0));
    el.bars.innerHTML = days.map(d => {
      const v = state.stats.history[d] || 0;
      const h = Math.max(6, Math.round(v / max * 110));
      return `<div class="bar-wrap"><div class="bar" style="height:${h}px"></div><span>${d.slice(5).replace("-","/")}</span><b>${v}</b></div>`;
    }).join("");
  }

  function render() {
    renderTop();
    renderQuiz();
    renderList();
    renderStats();
    save();
  }

  function check(show = false) {
    const c = current();
    if (!c) return;
    const score = show ? 0 : sim(el.answerInput.value, c.a);
    const ok = score >= .7;

    el.resultBox.classList.remove("hidden");
    el.scoreText.textContent = show ? "表示" : `${Math.round(score * 100)}%`;
    el.resultLabel.textContent = show ? "答え確認" : ok ? "たぶん正解" : "もう一回";
    el.resultLabel.style.background = show ? "var(--blue)" : ok ? "var(--green)" : "var(--yellow)";
    el.correctAnswer.textContent = c.a;
    el.explainText.textContent = c.explain || "";
    lastResult = { ok, score };
  }

  function grade(g) {
    const c = current();
    if (!c) return;

    c.reviews++;
    if (g >= 2) c.correct++;
    else c.wrong++;

    if (g === 0) {
      c.interval = 0;
      c.due = Date.now() + 10 * 60 * 1000;
      c.ease = Math.max(1.3, c.ease - .25);
    } else if (g === 1) {
      c.interval = Math.max(.25, c.interval * .5 || .25);
      c.due = Date.now() + c.interval * DAY;
      c.ease = Math.max(1.3, c.ease - .12);
    } else if (g === 2) {
      c.interval = c.interval < 1 ? 1 : Math.round(c.interval * c.ease);
      c.due = Date.now() + c.interval * DAY;
    } else {
      c.interval = c.interval < 1 ? 3 : Math.round(c.interval * (c.ease + .35));
      c.due = Date.now() + c.interval * DAY;
      c.ease = Math.min(3.2, c.ease + .08);
    }

    record(g);
    next();
  }

  function record(g) {
    const today = dayKey();
    state.stats.history[today] = (state.stats.history[today] || 0) + 1;
    state.stats.total++;
    state.stats.xp += [4, 7, 10, 14][g];

    if (state.stats.last !== today) {
      state.stats.streak = state.stats.last === dayKey(-1) ? state.stats.streak + 1 : 1;
      state.stats.best = Math.max(state.stats.best, state.stats.streak);
      state.stats.last = today;
    }
  }

  function next() {
    if (queue.length) index = (index + 1) % queue.length;
    render();
  }

  function prev() {
    if (queue.length) index = (index - 1 + queue.length) % queue.length;
    render();
  }

  function edit(c) {
    const q = prompt("問題", c.q);
    if (q === null) return;
    const a = prompt("答え", c.a);
    if (a === null) return;
    const tags = prompt("タグ", c.tags.join(", "));
    if (tags === null) return;
    c.q = q.trim();
    c.a = a.trim();
    c.tags = parseTags(tags);
    render();
  }

  function switchScreen(id) {
    el.screens.forEach(s => s.classList.toggle("active", s.id === id));
    el.tabs.forEach(t => t.classList.toggle("active", t.dataset.screen === id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `studygram-${dayKey()}.json`;
    a.click();
  }

  function importJson(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!Array.isArray(data.cards)) throw new Error();
        state = { ...state, ...data };
        render();
        alert("読み込んだで");
      } catch {
        alert("JSONが変かも");
      }
    };
    r.readAsText(file);
  }

  function bind() {
    el.tabs.forEach(t => t.onclick = () => switchScreen(t.dataset.screen));
    el.themeBtn.onclick = () => { state.dark = !state.dark; render(); };
    el.checkBtn.onclick = () => check(false);
    el.showBtn.onclick = () => check(true);
    el.nextBtn.onclick = next;
    el.prevBtn.onclick = prev;
    el.hintBtn.onclick = () => alert(current()?.hint || "ヒントなし");

    document.querySelectorAll("[data-grade]").forEach(b => b.onclick = () => grade(Number(b.dataset.grade)));

    el.answerInput.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (el.resultBox.classList.contains("hidden")) check(false);
        else grade(lastResult?.ok ? 2 : 1);
      }
    });

    el.addForm.onsubmit = e => {
      e.preventDefault();
      state.cards.push(card({
        q: el.newQuestion.value,
        a: el.newAnswer.value,
        tags: parseTags(el.newTags.value),
        hint: el.newHint.value,
        explain: el.newExplain.value
      }));
      el.addForm.reset();
      switchScreen("quizScreen");
      render();
    };

    el.searchInput.oninput = renderList;
    el.modeSelect.onchange = () => { state.mode = el.modeSelect.value; index = 0; render(); switchScreen("quizScreen"); };
    el.exportBtn.onclick = exportJson;
    el.importFile.onchange = e => {
      const f = e.target.files?.[0];
      if (f) importJson(f);
      e.target.value = "";
    };
  }

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
  bind();
  render();
})();
