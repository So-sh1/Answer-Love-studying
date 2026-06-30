(() => {
  "use strict";

  const STORAGE_KEY = "studyforge_v2";
  const DAY = 24 * 60 * 60 * 1000;

  const sampleCards = [
    {
      question: "-OH の官能基名は？",
      answer: "ヒドロキシ基",
      tags: ["化学", "官能基"],
      hint: "水酸基ともいう",
      explanation: "アルコール類などに含まれる官能基。"
    },
    {
      question: "-COOH の官能基名は？",
      answer: "カルボキシ基",
      tags: ["化学", "官能基"],
      hint: "カルボン酸にある",
      explanation: "酸性を示す代表的な官能基。"
    },
    {
      question: "運動量の式は？",
      answer: "p = mv",
      tags: ["物理"],
      hint: "質量×速度",
      explanation: "pは運動量、mは質量、vは速度。"
    },
    {
      question: "whatever が作る節は主に何節？",
      answer: "名詞節または副詞節",
      tags: ["英語"],
      hint: "文の中での働きで変わる",
      explanation: "whatever は「〜するものは何でも」なら名詞節、「何が〜でも」なら副詞節。"
    }
  ];

  const defaultState = {
    cards: sampleCards.map(makeCard),
    settings: {
      theme: "system",
      strictness: 0.7,
      dailyGoal: 30
    },
    session: {
      mode: "smart",
      currentIndex: 0,
      queueIds: [],
      selectedTag: "all"
    },
    stats: {
      totalReviews: 0,
      xp: 0,
      history: {},
      streak: 0,
      bestStreak: 0,
      lastStudyDate: ""
    }
  };

  let state = loadState();
  let lastChecked = null;

  const $ = (id) => document.getElementById(id);
  const els = {
    sidebar: $("sidebar"),
    menuBtn: $("menuBtn"),
    pageTitle: $("pageTitle"),
    pageSub: $("pageSub"),
    navButtons: [...document.querySelectorAll(".nav-btn")],
    views: [...document.querySelectorAll(".view")],

    todaySolvedMini: $("todaySolvedMini"),
    streakMini: $("streakMini"),
    todaySolved: $("todaySolved"),
    accuracy: $("accuracy"),
    dueCount: $("dueCount"),
    totalCount: $("totalCount"),

    modePill: $("modePill"),
    tagPill: $("tagPill"),
    currentProgress: $("currentProgress"),
    questionMeta: $("questionMeta"),
    questionText: $("questionText"),
    typedAnswer: $("typedAnswer"),
    checkBtn: $("checkBtn"),
    showBtn: $("showBtn"),
    hintBtn: $("hintBtn"),
    resultBox: $("resultBox"),
    resultBadge: $("resultBadge"),
    similarityText: $("similarityText"),
    correctAnswer: $("correctAnswer"),
    explanationText: $("explanationText"),
    prevQuestion: $("prevQuestion"),
    nextQuestion: $("nextQuestion"),
    shuffleNow: $("shuffleNow"),
    starBtn: $("starBtn"),

    modeCards: [...document.querySelectorAll(".mode-card")],

    addForm: $("addForm"),
    qInput: $("qInput"),
    aInput: $("aInput"),
    tagInput: $("tagInput"),
    hintInput: $("hintInput"),
    explainInput: $("explainInput"),
    searchInput: $("searchInput"),
    tagFilter: $("tagFilter"),
    sortSelect: $("sortSelect"),
    questionList: $("questionList"),
    deckSummary: $("deckSummary"),

    statReviews: $("statReviews"),
    statStreak: $("statStreak"),
    statBestStreak: $("statBestStreak"),
    levelText: $("levelText"),
    xpText: $("xpText"),
    historyBars: $("historyBars"),
    weakRanking: $("weakRanking"),

    csvInput: $("csvInput"),
    importCsvBtn: $("importCsvBtn"),
    sampleCsvBtn: $("sampleCsvBtn"),
    exportJsonBtn: $("exportJsonBtn"),
    exportCsvBtn: $("exportCsvBtn"),
    importJsonFile: $("importJsonFile"),

    themeToggle: $("themeToggle"),
    themeSelect: $("themeSelect"),
    strictnessSelect: $("strictnessSelect"),
    dailyGoalInput: $("dailyGoalInput"),
    resetAllBtn: $("resetAllBtn"),

    quickAddOpen: $("quickAddOpen"),
    quickAddDialog: $("quickAddDialog"),
    quickQ: $("quickQ"),
    quickA: $("quickA"),
    quickTags: $("quickTags"),
    quickAddSave: $("quickAddSave")
  };

  function makeCard(raw) {
    const now = Date.now();
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : String(now + Math.random()),
      question: raw.question?.trim() || "",
      answer: raw.answer?.trim() || "",
      tags: Array.isArray(raw.tags) ? raw.tags.filter(Boolean) : [],
      hint: raw.hint?.trim() || "",
      explanation: raw.explanation?.trim() || "",
      starred: false,
      createdAt: now,
      updatedAt: now,
      dueAt: now,
      intervalDays: 0,
      ease: 2.5,
      correct: 0,
      wrong: 0,
      reviews: 0,
      lastGrade: null,
      lastReviewedAt: null
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(defaultState);
      const parsed = JSON.parse(raw);
      return migrate(parsed);
    } catch {
      return structuredClone(defaultState);
    }
  }

  function migrate(data) {
    const merged = structuredClone(defaultState);
    return {
      ...merged,
      ...data,
      settings: { ...merged.settings, ...(data.settings || {}) },
      session: { ...merged.session, ...(data.session || {}) },
      stats: { ...merged.stats, ...(data.stats || {}) },
      cards: Array.isArray(data.cards) ? data.cards.map(card => ({
        ...makeCard({ question: card.question, answer: card.answer, tags: card.tags, hint: card.hint, explanation: card.explanation }),
        ...card,
        tags: Array.isArray(card.tags) ? card.tags : parseTags(card.tags || "")
      })).filter(c => c.question && c.answer) : merged.cards
    };
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function todayKey(offset = 0) {
    const d = new Date(Date.now() + offset * DAY);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function parseTags(str) {
    if (!str) return [];
    return [...new Set(String(str).split(/[,\u3001|/／\s]+/).map(s => s.trim()).filter(Boolean))];
  }

  function allTags() {
    return [...new Set(state.cards.flatMap(c => c.tags))].sort((a, b) => a.localeCompare(b, "ja"));
  }

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[ぁ-ん]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60))
      .replace(/[。、．，,.\s_\-ー]/g, "")
      .replace(/[()（）「」『』[\]{}]/g, "");
  }

  function levenshtein(a, b) {
    const s = normalize(a);
    const t = normalize(b);
    if (s === t) return 0;
    if (!s.length) return t.length;
    if (!t.length) return s.length;
    const prev = Array.from({ length: t.length + 1 }, (_, i) => i);
    const curr = Array(t.length + 1);
    for (let i = 1; i <= s.length; i++) {
      curr[0] = i;
      for (let j = 1; j <= t.length; j++) {
        const cost = s[i - 1] === t[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      for (let j = 0; j <= t.length; j++) prev[j] = curr[j];
    }
    return prev[t.length];
  }

  function similarity(user, answer) {
    const answers = String(answer).split(/[\/／,、;；]/).map(s => s.trim()).filter(Boolean);
    const userN = normalize(user);
    let best = 0;
    for (const ans of answers.length ? answers : [answer]) {
      const ansN = normalize(ans);
      if (!ansN) continue;
      if (userN === ansN) best = Math.max(best, 1);
      if (userN && ansN.includes(userN)) best = Math.max(best, Math.min(0.92, userN.length / ansN.length + 0.15));
      if (ansN && userN.includes(ansN)) best = Math.max(best, Math.min(0.98, ansN.length / userN.length + 0.2));
      const dist = levenshtein(userN, ansN);
      const maxLen = Math.max(userN.length, ansN.length, 1);
      best = Math.max(best, 1 - dist / maxLen);
    }
    return Math.max(0, Math.min(1, best));
  }

  function filteredByTag(cards) {
    if (state.session.selectedTag === "all") return cards;
    return cards.filter(c => c.tags.includes(state.session.selectedTag));
  }

  function dueCards() {
    const now = Date.now();
    return filteredByTag(state.cards).filter(c => c.dueAt <= now);
  }

  function weakScore(card) {
    return (card.wrong * 2 + Math.max(0, card.wrong - card.correct)) / Math.max(1, card.reviews);
  }

  function buildQueue() {
    let cards = filteredByTag(state.cards);
    const now = Date.now();

    if (state.session.mode === "smart") {
      const due = cards.filter(c => c.dueAt <= now);
      const weak = cards.filter(c => c.wrong > c.correct || weakScore(c) > 0.45);
      cards = [...new Map([...due, ...weak, ...cards.slice(0, 10)].map(c => [c.id, c])).values()];
      cards.sort((a, b) => (a.dueAt - b.dueAt) || (weakScore(b) - weakScore(a)));
    } else if (state.session.mode === "weak") {
      cards = cards.filter(c => c.wrong > c.correct || weakScore(c) > 0.45)
        .sort((a, b) => weakScore(b) - weakScore(a));
    } else if (state.session.mode === "starred") {
      cards = cards.filter(c => c.starred);
    }

    state.session.queueIds = cards.map(c => c.id);
    if (state.session.currentIndex >= cards.length) state.session.currentIndex = 0;
  }

  function currentQueue() {
    return state.session.queueIds.map(id => state.cards.find(c => c.id === id)).filter(Boolean);
  }

  function currentCard() {
    const q = currentQueue();
    return q[state.session.currentIndex] || null;
  }

  function setView(view) {
    els.views.forEach(v => v.classList.toggle("active", v.id === `view-${view}`));
    els.navButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.view === view));
    const titles = {
      quiz: ["出題", "今日やるべき問題を優先して出す。"],
      deck: ["問題管理", "追加・検索・編集・削除。"],
      stats: ["成績", "学習量と苦手を見える化。"],
      import: ["入出力", "CSV・JSONでまとめて管理。"],
      settings: ["設定", "見た目と判定を調整。"]
    };
    els.pageTitle.textContent = titles[view][0];
    els.pageSub.textContent = titles[view][1];
    els.sidebar.classList.remove("open");
    render();
  }

  function renderQuiz() {
    buildQueue();
    const q = currentQueue();
    const card = currentCard();

    els.modePill.textContent = modeLabel(state.session.mode);
    els.tagPill.textContent = state.session.selectedTag === "all" ? "全タグ" : state.session.selectedTag;
    els.currentProgress.textContent = q.length ? `${state.session.currentIndex + 1} / ${q.length}` : "0 / 0";
    els.resultBox.classList.add("hidden");
    els.typedAnswer.value = "";
    lastChecked = null;

    els.modeCards.forEach(btn => btn.classList.toggle("active", btn.dataset.mode === state.session.mode));

    if (!card) {
      els.questionMeta.textContent = "";
      els.questionText.textContent = state.cards.length ? "このモードの問題がないで。" : "問題を追加してスタートしよう";
      els.correctAnswer.textContent = "";
      els.starBtn.textContent = "☆ お気に入り";
      return;
    }

    const tagText = card.tags.length ? card.tags.join(" / ") : "タグなし";
    const dueText = card.dueAt <= Date.now() ? "復習期限きてる" : `次回 ${formatRelative(card.dueAt)}`;
    els.questionMeta.textContent = `${tagText} ・ 正解${card.correct} / 不正解${card.wrong} ・ ${dueText}`;
    els.questionText.textContent = card.question;
    els.correctAnswer.textContent = card.answer;
    els.explanationText.textContent = card.explanation || "";
    els.starBtn.textContent = card.starred ? "★ お気に入り" : "☆ お気に入り";
  }

  function modeLabel(mode) {
    return {
      smart: "スマート復習",
      all: "全問",
      weak: "苦手",
      starred: "お気に入り"
    }[mode] || "全問";
  }

  function formatRelative(ts) {
    const diff = ts - Date.now();
    const abs = Math.abs(diff);
    if (abs < 60_000) return "すぐ";
    if (abs < 3_600_000) return `${Math.round(diff / 60_000)}分後`;
    if (abs < DAY) return `${Math.round(diff / 3_600_000)}時間後`;
    return `${Math.round(diff / DAY)}日後`;
  }

  function renderStatsMini() {
    const today = todayKey();
    const todayCount = state.stats.history[today] || 0;
    const total = state.cards.length;
    const correct = state.cards.reduce((s, c) => s + c.correct, 0);
    const wrong = state.cards.reduce((s, c) => s + c.wrong, 0);
    const acc = correct + wrong ? Math.round(correct / (correct + wrong) * 100) : 0;

    els.todaySolvedMini.textContent = `${todayCount}問`;
    els.streakMini.textContent = `${state.stats.streak}日`;
    els.todaySolved.textContent = todayCount;
    els.accuracy.textContent = acc;
    els.dueCount.textContent = dueCards().length;
    els.totalCount.textContent = total;
  }

  function renderDeck() {
    const tags = allTags();
    const old = els.tagFilter.value || "all";
    els.tagFilter.innerHTML = `<option value="all">全タグ</option>` + tags.map(t => `<option value="${escapeAttr(t)}">${escapeHtml(t)}</option>`).join("");
    els.tagFilter.value = tags.includes(old) ? old : "all";

    const query = normalize(els.searchInput.value || "");
    let cards = [...state.cards];

    if (els.tagFilter.value !== "all") cards = cards.filter(c => c.tags.includes(els.tagFilter.value));
    if (query) cards = cards.filter(c => normalize(c.question + " " + c.answer + " " + c.tags.join(" ")).includes(query));

    cards.sort(sorter(els.sortSelect.value));
    els.deckSummary.textContent = `${cards.length} / ${state.cards.length}問`;
    els.questionList.innerHTML = "";

    if (!cards.length) {
      els.questionList.innerHTML = `<p class="help">該当する問題がないで。</p>`;
      return;
    }

    const template = $("itemTemplate");
    for (const card of cards) {
      const node = template.content.firstElementChild.cloneNode(true);
      node.querySelector(".item-question").textContent = card.question;
      node.querySelector(".item-answer").textContent = `答え：${card.answer}`;
      node.querySelector(".item-meta").textContent = `正解${card.correct} / 不正解${card.wrong} / 復習 ${formatRelative(card.dueAt)} / ${card.starred ? "★" : "☆"}`;
      node.querySelector(".item-badges").innerHTML = card.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("");
      node.querySelector(".delete-item").addEventListener("click", () => deleteCard(card.id));
      node.querySelector(".edit-item").addEventListener("click", () => editCard(card.id));
      els.questionList.appendChild(node);
    }
  }

  function sorter(type) {
    return {
      createdDesc: (a, b) => b.createdAt - a.createdAt,
      createdAsc: (a, b) => a.createdAt - b.createdAt,
      dueAsc: (a, b) => a.dueAt - b.dueAt,
      weakDesc: (a, b) => weakScore(b) - weakScore(a),
      accuracyAsc: (a, b) => accuracyOf(a) - accuracyOf(b)
    }[type] || ((a, b) => b.createdAt - a.createdAt);
  }

  function accuracyOf(c) {
    return c.reviews ? c.correct / c.reviews : 1;
  }

  function renderStatsPage() {
    els.statReviews.textContent = state.stats.totalReviews;
    els.statStreak.textContent = state.stats.streak;
    els.statBestStreak.textContent = state.stats.bestStreak;
    const level = Math.floor(Math.sqrt(state.stats.xp / 45)) + 1;
    els.levelText.textContent = level;
    els.xpText.textContent = `${state.stats.xp} XP`;

    const days = Array.from({ length: 14 }, (_, i) => todayKey(i - 13));
    const max = Math.max(1, ...days.map(d => state.stats.history[d] || 0));
    els.historyBars.innerHTML = days.map(d => {
      const val = state.stats.history[d] || 0;
      const h = Math.max(4, Math.round(val / max * 130));
      return `<div class="bar-wrap"><div class="bar" style="height:${h}px" title="${d}: ${val}問"></div><span>${d.slice(5).replace("-", "/")}</span><strong>${val}</strong></div>`;
    }).join("");

    const weak = [...state.cards]
      .filter(c => c.reviews > 0)
      .sort((a, b) => weakScore(b) - weakScore(a))
      .slice(0, 8);

    els.weakRanking.innerHTML = weak.length ? weak.map((c, i) => `
      <div class="rank-item">
        <strong>${i + 1}. ${escapeHtml(c.question)}</strong>
        <p>答え：${escapeHtml(c.answer)} / 正解${c.correct}・不正解${c.wrong}</p>
      </div>
    `).join("") : `<p class="help">まだ成績データがないで。</p>`;
  }

  function renderSettings() {
    document.documentElement.dataset.theme = state.settings.theme;
    els.themeSelect.value = state.settings.theme;
    els.strictnessSelect.value = String(state.settings.strictness);
    els.dailyGoalInput.value = state.settings.dailyGoal;
  }

  function render() {
    renderSettings();
    renderStatsMini();
    renderQuiz();
    renderDeck();
    renderStatsPage();
    save();
  }

  function checkAnswer(showOnly = false) {
    const card = currentCard();
    if (!card) return;
    const sim = showOnly ? 0 : similarity(els.typedAnswer.value, card.answer);
    const ok = sim >= Number(state.settings.strictness);
    els.resultBox.classList.remove("hidden");
    els.correctAnswer.textContent = card.answer;
    els.explanationText.textContent = card.explanation || "";
    els.similarityText.textContent = showOnly ? "答え表示" : `一致率 ${Math.round(sim * 100)}%`;
    els.resultBadge.textContent = showOnly ? "確認" : ok ? "たぶん正解" : "要確認";
    els.resultBadge.style.background = showOnly ? "var(--primary)" : ok ? "var(--success)" : "var(--warning)";
    lastChecked = { cardId: card.id, sim, ok };
  }

  function gradeCurrent(grade) {
    const card = currentCard();
    if (!card) return;

    const now = Date.now();
    const good = grade >= 2;
    card.reviews++;
    card.lastGrade = grade;
    card.lastReviewedAt = now;
    if (good) card.correct++;
    else card.wrong++;

    scheduleNext(card, grade, now);
    recordStudy(grade);
    nextQuestion();
  }

  function scheduleNext(card, grade, now) {
    if (grade === 0) {
      card.intervalDays = 0;
      card.ease = Math.max(1.3, card.ease - 0.25);
      card.dueAt = now + 10 * 60 * 1000;
      return;
    }

    if (grade === 1) {
      card.intervalDays = Math.max(0.25, card.intervalDays * 0.5 || 0.25);
      card.ease = Math.max(1.3, card.ease - 0.12);
    } else if (grade === 2) {
      card.intervalDays = card.intervalDays < 1 ? 1 : Math.round(card.intervalDays * card.ease);
    } else {
      card.intervalDays = card.intervalDays < 1 ? 3 : Math.round(card.intervalDays * (card.ease + 0.35));
      card.ease = Math.min(3.2, card.ease + 0.08);
    }

    card.dueAt = now + card.intervalDays * DAY;
  }

  function recordStudy(grade) {
    const today = todayKey();
    state.stats.history[today] = (state.stats.history[today] || 0) + 1;
    state.stats.totalReviews++;
    state.stats.xp += [4, 6, 10, 14][grade] || 5;

    if (state.stats.lastStudyDate !== today) {
      const yesterday = todayKey(-1);
      state.stats.streak = state.stats.lastStudyDate === yesterday ? state.stats.streak + 1 : 1;
      state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.streak);
      state.stats.lastStudyDate = today;
    }
  }

  function nextQuestion() {
    const q = currentQueue();
    if (q.length) state.session.currentIndex = (state.session.currentIndex + 1) % q.length;
    render();
    els.typedAnswer.focus();
  }

  function prevQuestion() {
    const q = currentQueue();
    if (q.length) state.session.currentIndex = (state.session.currentIndex - 1 + q.length) % q.length;
    render();
    els.typedAnswer.focus();
  }

  function addCard(data) {
    state.cards.push(makeCard(data));
    render();
  }

  function deleteCard(id) {
    if (!confirm("この問題を削除する？")) return;
    state.cards = state.cards.filter(c => c.id !== id);
    render();
  }

  function editCard(id) {
    const c = state.cards.find(card => card.id === id);
    if (!c) return;
    const question = prompt("問題を編集", c.question);
    if (question === null) return;
    const answer = prompt("答えを編集", c.answer);
    if (answer === null) return;
    const tags = prompt("タグを編集（カンマ区切り）", c.tags.join(", "));
    if (tags === null) return;
    const hint = prompt("ヒントを編集", c.hint || "");
    if (hint === null) return;
    const explanation = prompt("解説を編集", c.explanation || "");
    if (explanation === null) return;
    c.question = question.trim();
    c.answer = answer.trim();
    c.tags = parseTags(tags);
    c.hint = hint.trim();
    c.explanation = explanation.trim();
    c.updatedAt = Date.now();
    render();
  }

  function showHint() {
    const card = currentCard();
    if (!card) return;
    alert(card.hint || `ヒントなし。最初の文字：${card.answer.slice(0, 1)}`);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[m]));
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/`/g, "&#096;");
  }

  function toCsvValue(value) {
    const s = String(value ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quote = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (quote) {
        if (ch === "\"" && next === "\"") {
          cell += "\"";
          i++;
        } else if (ch === "\"") {
          quote = false;
        } else {
          cell += ch;
        }
      } else {
        if (ch === "\"") quote = true;
        else if (ch === ",") {
          row.push(cell);
          cell = "";
        } else if (ch === "\n") {
          row.push(cell);
          rows.push(row);
          row = [];
          cell = "";
        } else if (ch !== "\r") {
          cell += ch;
        }
      }
    }
    row.push(cell);
    rows.push(row);
    return rows.filter(r => r.some(c => c.trim()));
  }

  function importCsv() {
    const rows = parseCsv(els.csvInput.value);
    if (!rows.length) return alert("CSVが空やで");
    const hasHeader = rows[0].some(c => ["問題", "question", "答え", "answer"].includes(c.trim().toLowerCase()));
    const dataRows = hasHeader ? rows.slice(1) : rows;
    let count = 0;
    for (const r of dataRows) {
      const [question, answer, tags = "", hint = "", explanation = ""] = r;
      if (!question?.trim() || !answer?.trim()) continue;
      addCard({ question, answer, tags: parseTags(tags), hint, explanation });
      count++;
    }
    els.csvInput.value = "";
    alert(`${count}問追加したで`);
    render();
  }

  function exportJson() {
    downloadFile(`studyforge-backup-${todayKey()}.json`, JSON.stringify(state, null, 2), "application/json");
  }

  function exportCsv() {
    const header = ["問題", "答え", "タグ", "ヒント", "解説", "正解", "不正解", "復習期限"];
    const rows = state.cards.map(c => [
      c.question, c.answer, c.tags.join("|"), c.hint, c.explanation, c.correct, c.wrong, new Date(c.dueAt).toISOString()
    ]);
    const csv = [header, ...rows].map(r => r.map(toCsvValue).join(",")).join("\n");
    downloadFile(`studyforge-cards-${todayKey()}.csv`, csv, "text/csv;charset=utf-8");
  }

  function downloadFile(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importJsonFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        state = migrate(parsed);
        save();
        render();
        alert("JSONを読み込んだで");
      } catch {
        alert("JSONの読み込みに失敗した");
      }
    };
    reader.readAsText(file);
  }

  function installServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  function bindEvents() {
    els.menuBtn.addEventListener("click", () => els.sidebar.classList.toggle("open"));
    els.navButtons.forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));

    els.checkBtn.addEventListener("click", () => checkAnswer(false));
    els.showBtn.addEventListener("click", () => checkAnswer(true));
    els.hintBtn.addEventListener("click", showHint);
    els.nextQuestion.addEventListener("click", nextQuestion);
    els.prevQuestion.addEventListener("click", prevQuestion);
    els.shuffleNow.addEventListener("click", () => {
      state.session.queueIds.sort(() => Math.random() - 0.5);
      state.session.currentIndex = 0;
      save();
      renderQuiz();
    });
    els.starBtn.addEventListener("click", () => {
      const c = currentCard();
      if (!c) return;
      c.starred = !c.starred;
      render();
    });

    document.querySelectorAll(".grade").forEach(btn => {
      btn.addEventListener("click", () => gradeCurrent(Number(btn.dataset.grade)));
    });

    els.typedAnswer.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (els.resultBox.classList.contains("hidden")) checkAnswer(false);
        else gradeCurrent(lastChecked?.ok ? 2 : 1);
      }
    });

    window.addEventListener("keydown", (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) && !["1","2","3","4"].includes(e.key)) return;
      if (e.key === "1") gradeCurrent(0);
      if (e.key === "2") gradeCurrent(1);
      if (e.key === "3") gradeCurrent(2);
      if (e.key === "4") gradeCurrent(3);
      if (e.key === "?") showHint();
    });

    els.modeCards.forEach(btn => btn.addEventListener("click", () => {
      state.session.mode = btn.dataset.mode;
      state.session.currentIndex = 0;
      render();
    }));

    els.addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      addCard({
        question: els.qInput.value,
        answer: els.aInput.value,
        tags: parseTags(els.tagInput.value),
        hint: els.hintInput.value,
        explanation: els.explainInput.value
      });
      els.addForm.reset();
      els.qInput.focus();
    });

    [els.searchInput, els.tagFilter, els.sortSelect].forEach(el => el.addEventListener("input", renderDeck));

    els.importCsvBtn.addEventListener("click", importCsv);
    els.sampleCsvBtn.addEventListener("click", () => {
      els.csvInput.value = "問題,答え,タグ,ヒント,解説\n-CHO の官能基名は？,アルデヒド基,化学|官能基,ホルミル基ともいう,アルデヒド類に含まれる\n力積の式は？,I = Ft,物理,力×時間,運動量の変化量に等しい";
    });
    els.exportJsonBtn.addEventListener("click", exportJson);
    els.exportCsvBtn.addEventListener("click", exportCsv);
    els.importJsonFile.addEventListener("change", e => {
      const file = e.target.files?.[0];
      if (file) importJsonFile(file);
      e.target.value = "";
    });

    els.themeToggle.addEventListener("click", () => {
      const order = ["system", "light", "dark"];
      const next = order[(order.indexOf(state.settings.theme) + 1) % order.length];
      state.settings.theme = next;
      render();
    });
    els.themeSelect.addEventListener("change", () => {
      state.settings.theme = els.themeSelect.value;
      render();
    });
    els.strictnessSelect.addEventListener("change", () => {
      state.settings.strictness = Number(els.strictnessSelect.value);
      render();
    });
    els.dailyGoalInput.addEventListener("input", () => {
      state.settings.dailyGoal = Math.max(1, Number(els.dailyGoalInput.value || 30));
      render();
    });
    els.resetAllBtn.addEventListener("click", () => {
      if (!confirm("全部消す？バックアップしてないなら戻せへんで。")) return;
      localStorage.removeItem(STORAGE_KEY);
      state = structuredClone(defaultState);
      render();
    });

    els.quickAddOpen.addEventListener("click", () => els.quickAddDialog.showModal());
    els.quickAddSave.addEventListener("click", (e) => {
      e.preventDefault();
      if (!els.quickQ.value.trim() || !els.quickA.value.trim()) return alert("問題と答えは必要やで");
      addCard({ question: els.quickQ.value, answer: els.quickA.value, tags: parseTags(els.quickTags.value) });
      els.quickQ.value = "";
      els.quickA.value = "";
      els.quickTags.value = "";
      els.quickAddDialog.close();
    });
  }

  render();
  bindEvents();
  installServiceWorker();
})();
