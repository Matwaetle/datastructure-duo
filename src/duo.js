/* duo.js — 원본 활동지를 한 화면에 한 걸음씩 넘기는 듀오링고식 화면으로 다시 배치한다.
   답 칸(data-key)과 원본 저장 스크립트는 그대로 두고 DOM 위치만 옮긴다.
   그래서 [제출 파일 저장]이 만드는 JSON 은 원본과 같다. */
(function () {
  "use strict";

  var PATH = location.pathname.replace(/^.*\/(week\d+\/[^/]+)$/, "$1");
  var STORE = "duo:" + PATH;
  var PROG = "duo:prog:" + PATH;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function text(node) { return node ? node.textContent.replace(/\s+/g, " ").trim() : ""; }
  function load(key, d) { try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? d : v; } catch (e) { return d; } }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }

  /* ---------- 답 칸 ---------- */
  // 새로 쓴 쪽(x-page)에서는 화면의 답 칸이 .x-f 이고 값은 숨겨 둔 원본 칸에 있다.
  var AUTHORED = false, FIELD = "[data-key]";
  function fieldValue(f) {
    if (f.hasAttribute("data-bind")) {
      var o = document.querySelector('[data-key="' + f.getAttribute("data-bind") + '"]');
      return o ? fieldValue(o) : "";
    }
    if (f.getAttribute("data-type") === "radio") { var r = $("input[type=radio]:checked", f); return r ? r.value : ""; }
    if (f.type === "checkbox") return f.checked ? "1" : "";
    return (f.value || "").trim();
  }
  function isEmpty(f) { return fieldValue(f) === ""; }
  function norm(s) {
    return String(s).toLowerCase()
      .replace(/^(약|최대|최소|대략)\s*/, "")
      .replace(/(번|개|칸|회|번째)$/g, "")
      .replace(/[\s,'"`\[\]\(\)\{\}→>\-·.;:=]/g, "");
  }
  function sameAnswer(mine, model) {
    if (norm(mine) === norm(model)) return true;
    return model.split("|").some(function (m) { return norm(m) === norm(mine); });
  }

  /* ---------- 화면 만들기 ---------- */
  var screens = [];   // {node, kind, section, title, step, steps}
  var cur = 0;

  function addScreen(kind, nodes, info) {
    var s = el("section", "duo-screen duo-" + kind);
    s.hidden = true;
    var inner = el("div", "duo-card");
    nodes.forEach(function (n) { inner.appendChild(n); });
    s.appendChild(inner);
    var rec = { node: s, kind: kind, section: info.section || "", title: info.title || "", step: info.step || 0, steps: info.steps || 0 };
    if (info.chip) {
      var chip = el("div", "duo-chip");
      chip.textContent = info.chip;
      s.insertBefore(chip, inner);
    }
    if ($("textarea[data-type=code], textarea[data-run-only], .ck-ed", s)) s.classList.add("has-code");
    screens.push(rec);
    return rec;
  }

  function sectionTitle(sec) {
    var h2 = $(":scope>h2", sec);
    if (!h2) return sec.id || "";
    var c = h2.cloneNode(true);
    $$("small", c).forEach(function (x) { x.remove(); });
    return text(c);
  }
  function sectionMeta(sec) { var sm = $(":scope>h2 small", sec); return sm ? text(sm) : ""; }

  /* 걸음(.step)이 없는 구역은 h3 마다 나눈다. 짧으면 한 화면으로 둔다. */
  function splitByH3(kids) {
    var groups = [[]];
    kids.forEach(function (k) {
      if (k.tagName === "H3" && groups[groups.length - 1].length) groups.push([]);
      groups[groups.length - 1].push(k);
    });
    var total = kids.reduce(function (a, k) { return a + text(k).length; }, 0);
    if (groups.length < 2 || total < 900) return [kids];
    return groups;
  }

  var pendingLead = [];

  function buildSection(sec) {
    var kids = [].slice.call(sec.children);
    var title = sectionTitle(sec), meta = sectionMeta(sec);
    var h2 = $(":scope>h2", sec);
    var hasKeys = !!$("[data-key]", sec);
    if (!h2 && !hasKeys) { pendingLead = pendingLead.concat(kids); return; }
    var steps = kids.filter(function (k) { return k.classList && k.classList.contains("step"); });
    var label = sec.id && /^[A-Z]\d/.test(sec.id) ? sec.id : "";

    if (steps.length) {
      var firstIdx = kids.indexOf(steps[0]), lastIdx = kids.indexOf(steps[steps.length - 1]);
      var intro = pendingLead.concat(kids.slice(0, firstIdx).filter(function (k) { return k !== h2; }));
      pendingLead = [];
      var head = el("div", "duo-intro-head");
      head.innerHTML = (label ? '<div class="duo-tag">' + label + "</div>" : "") +
        "<h1>" + escapeHtml(title.replace(/^[A-Z]\d+\s*·\s*/, "")) + "</h1>" +
        (meta ? '<p class="duo-meta">' + escapeHtml(meta) + "</p>" : "") +
        '<p class="duo-count">' + steps.length + "단계</p>";
      addScreen("intro", [head].concat(intro), { section: title });
      steps.forEach(function (st, i) {
        addScreen("step", [st], { section: title, step: i + 1, steps: steps.length,
          chip: (label || title) + "  ·  " + (i + 1) + " / " + steps.length });
      });
      var after = kids.slice(lastIdx + 1);
      if (after.length) addScreen("wrap", [el("h2", "duo-h", "정리")].concat(after), { section: title, chip: (label || title) + "  ·  정리" });
    } else {
      var body = pendingLead.concat(kids);
      pendingLead = [];
      var groups = splitByH3(body);
      groups.forEach(function (g, i) {
        addScreen(hasKeys ? "step" : "read", g, { section: title,
          chip: title + (groups.length > 1 ? "  ·  " + (i + 1) + " / " + groups.length : "") });
      });
    }
  }

  function buildAct(act) {
    var id = act.getAttribute("data-id") || "", title = act.getAttribute("data-title") || id;
    var label = id ? id + " · " + title : title;
    var shots = $$(":scope>.x-screen", act);
    var intro = [].slice.call(act.children).filter(function (k) { return !k.classList.contains("x-screen"); });
    var head = el("div", "duo-intro-head");
    head.innerHTML = (id ? '<div class="duo-tag">' + escapeHtml(id) + "</div>" : "") +
      "<h1>" + escapeHtml(title) + "</h1>" +
      (act.getAttribute("data-meta") ? '<p class="duo-meta">' + escapeHtml(act.getAttribute("data-meta")) + "</p>" : "") +
      '<p class="duo-count">' + shots.length + "단계</p>";
    addScreen("intro", [head].concat(intro), { section: label });
    shots.forEach(function (sc, i) {
      var h = sc.getAttribute("data-title");
      var nodes = [].slice.call(sc.childNodes);
      if (h) { var h3 = el("h3"); h3.textContent = h; nodes.unshift(h3); }
      var box = el("div", "step x-step"); nodes.forEach(function (n) { box.appendChild(n); });
      addScreen($(".x-f", box) ? "step" : "read", [box], { section: label, step: i + 1, steps: shots.length,
        chip: label + "  ·  " + (i + 1) + " / " + shots.length });
    });
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- 앱 틀 ---------- */
  var app, stage, bar, fill, foot, sheet, sheetMsg, primary, backBtn, tocBtn, toc;

  function buildShell() {
    app = el("div", "duo-app");
    var top = el("header", "duo-top");
    top.innerHTML =
      '<a class="duo-x" href="../index.html#' + PATH.split("/")[0] + '" aria-label="나가기">✕</a>' +
      '<div class="duo-bar" role="progressbar" aria-label="진행" aria-valuemin="0" aria-valuemax="100"><i></i></div>' +
      '<button type="button" class="duo-tocbtn" aria-expanded="false">목차</button>';
    bar = $(".duo-bar", top); fill = $(".duo-bar i", top); tocBtn = $(".duo-tocbtn", top);
    stage = el("main", "duo-stage");
    foot = el("footer", "duo-foot");
    foot.innerHTML =
      '<div class="duo-sheet" hidden><div class="duo-sheet-in"><b class="duo-sheet-t"></b><p class="duo-sheet-m"></p></div></div>' +
      '<div class="duo-foot-in"><button type="button" class="duo-btn ghost duo-back">이전</button>' +
      '<button type="button" class="duo-btn duo-primary">계속</button></div>';
    sheet = $(".duo-sheet", foot); sheetMsg = $(".duo-sheet-m", foot);
    primary = $(".duo-primary", foot); backBtn = $(".duo-back", foot);
    toc = el("nav", "duo-toc");
    toc.hidden = true;
    app.appendChild(top); app.appendChild(stage); app.appendChild(foot); app.appendChild(toc);
    document.body.appendChild(app);
    document.body.classList.add("duo-on");
  }

  /* ---------- 시작·끝 화면 ---------- */
  function buildStart(header) {
    var h1 = $("h1", header), lead = $(".lead", header);
    var wk = (PATH.match(/week(\d+)/) || [])[1];
    var box = el("div", "duo-start");
    box.innerHTML = '<div class="duo-mascot" aria-hidden="true">' + mascot() + "</div>" +
      '<div class="duo-tag">' + (wk ? wk + "주차" : "") + "</div>";
    var h = el("h1", "", h1 ? h1.innerHTML : document.title);
    box.appendChild(h);
    if (lead) { var p = el("p", "duo-lead"); p.innerHTML = lead.innerHTML; box.appendChild(p); }
    var who = el("div", "duo-who");
    who.innerHTML = '<p class="duo-who-t">제출 파일에 기록될 학번과 이름을 입력하십시오.</p>';
    var idL = $("#sb-id") && $("#sb-id").closest("label"), nmL = $("#sb-name") && $("#sb-name").closest("label");
    if (idL) { $("#sb-id").placeholder = "예: 2213"; who.appendChild(idL); }
    if (nmL) who.appendChild(nmL);
    box.appendChild(who);
    var rec = addScreen("start", [box], {});
    return rec;
  }

  function buildFinish() {
    var box = el("div", "duo-finish");
    box.innerHTML = '<div class="duo-mascot big" aria-hidden="true">' + mascot(true) + "</div>" +
      "<h1>모든 단계를 마쳤습니다</h1><p class=\"duo-lead\">아래에서 제출 파일(JSON)을 저장한 뒤 제출하십시오.</p>" +
      '<div class="duo-stats"></div><div class="duo-left"></div>';
    var savebar = $("#savebar");
    var actions = el("div", "duo-save");
    if (savebar) {
      ["#sb-save", "#sb-submit", "#sb-load", "#sb-clear"].forEach(function (s) { var b = $(s, savebar); if (b) actions.appendChild(b); });
      ["#sb-file", "#sb-auto", "#sb-confirm", "#sb-msg"].forEach(function (s) { var b = $(s, savebar); if (b) actions.appendChild(b); });
      var sv = $("#sb-save", actions); if (sv) sv.textContent = "제출 파일 저장 (JSON)";
      var ld = $("#sb-load", actions); if (ld) ld.textContent = "저장한 파일 불러오기";
      var cl = $("#sb-clear", actions); if (cl) cl.textContent = "처음부터 다시 시작";
      var sb = $("#sb-submit", actions); if (sb) sb.textContent = "제출 사이트 열기";
      savebar.hidden = true;
    }
    box.appendChild(actions);
    return addScreen("finish", [box], { section: "마무리" });
  }

  function refreshFinish() {
    var rec = screens[screens.length - 1];
    var all = $$(FIELD);
    var empty = all.filter(isEmpty);
    $(".duo-stats", rec.node).innerHTML =
      '<div class="duo-stat"><b>' + (all.length - empty.length) + "</b><span>작성한 입력란</span></div>" +
      '<div class="duo-stat"><b>' + empty.length + "</b><span>빈 입력란</span></div>" +
      '<div class="duo-stat"><b>' + screens.filter(function (s) { return s.seen; }).length + "/" + screens.length + "</b><span>확인한 화면</span></div>";
    $("h1", rec.node).textContent = empty.length ? "작성하지 않은 입력란이 있습니다" : "모든 단계를 마쳤습니다";
    $(".duo-lead", rec.node).textContent = empty.length
      ? "빈 입력란을 작성한 뒤 제출 파일(JSON)을 저장하십시오. 작성을 마치지 못한 경우 지금 저장해 두고 이후에 이어서 작성할 수 있습니다."
      : "아래에서 제출 파일(JSON)을 저장한 뒤 제출하십시오.";
    var left = $(".duo-left", rec.node);
    left.innerHTML = "";
    if (!empty.length) return;
    var bySc = {};
    empty.forEach(function (f) { var i = indexOfNode(f); if (i >= 0) (bySc[i] = bySc[i] || []).push(f); });
    var h = el("p", "duo-left-t", "작성하지 않은 입력란");
    left.appendChild(h);
    Object.keys(bySc).forEach(function (i) {
      var s = screens[i];
      var b = el("button", "duo-left-item");
      b.type = "button";
      b.innerHTML = "<span>" + escapeHtml(chipText(s)) + "</span><em>" + bySc[i].length + "개</em>";
      b.addEventListener("click", function () { go(+i); focusFirstEmpty(); });
      left.appendChild(b);
    });
  }
  function chipText(s) { var c = $(".duo-chip", s.node); return c ? c.textContent : s.section || s.title; }
  function indexOfNode(n) { for (var i = 0; i < screens.length; i++) if (screens[i].node.contains(n)) return i; return -1; }

  /* ---------- 목차 ---------- */
  function buildToc() {
    var html = '<div class="duo-toc-in"><p class="duo-toc-t">목차</p>';
    var lastSec = null;
    screens.forEach(function (s, i) {
      if (s.kind === "start" || s.kind === "finish") return;
      if (s.section !== lastSec) {
        if (lastSec !== null) html += "</ol>";
        html += '<p class="duo-toc-sec">' + escapeHtml(s.section) + "</p><ol>";
        lastSec = s.section;
      }
      var name = s.kind === "intro" ? "시작" : s.kind === "wrap" ? "정리" : stepName(s);
      html += '<li><button type="button" data-go="' + i + '">' + escapeHtml(name) + "</button></li>";
    });
    html += "</ol>";
    html += '<p class="duo-toc-sec"><button type="button" data-go="' + (screens.length - 1) + '">제출 파일 저장</button></p></div>';
    toc.innerHTML = html;
    toc.addEventListener("click", function (e) {
      var b = e.target.closest("[data-go]");
      if (b) { go(+b.getAttribute("data-go")); toggleToc(false); }
      else if (e.target === toc) toggleToc(false);
    });
    tocBtn.addEventListener("click", function () { toggleToc(toc.hidden); });
  }
  function stepName(s) { var h = $("h3", s.node); return h ? text(h) : (s.step ? s.step + "단계" : "읽기"); }
  function toggleToc(open) {
    toc.hidden = !open;
    tocBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      $$("[data-go]", toc).forEach(function (b) {
        var i = +b.getAttribute("data-go");
        b.classList.toggle("cur", i === cur);
        b.classList.toggle("seen", !!screens[i].seen);
        var empty = $$(FIELD, screens[i].node).filter(isEmpty).length;
        b.classList.toggle("has-empty", empty > 0 && !!screens[i].seen);
      });
      var c = $(".cur", toc); if (c) c.scrollIntoView({ block: "center" });
    }
  }

  /* ---------- 이동 ---------- */
  var mode = "next"; // "check" 이면 [확인], "next" 이면 [계속]
  var warnedEmpty = false;

  function go(i) {
    i = Math.max(0, Math.min(screens.length - 1, i));
    screens.forEach(function (s, k) { s.node.hidden = k !== i; });
    cur = i;
    screens[i].seen = true;
    warnedEmpty = false;
    hideSheet();
    fill.style.width = Math.round((i / (screens.length - 1)) * 100) + "%";
    bar.setAttribute("aria-valuenow", Math.round((i / (screens.length - 1)) * 100));
    backBtn.hidden = i === 0;
    if (screens[i].kind === "finish") refreshFinish();
    setPrimary();
    stage.scrollTop = 0; window.scrollTo(0, 0);
    var st = load(STORE, {});
    st.cur = i; st.seen = screens.map(function (s) { return s.seen ? 1 : 0; });
    save(STORE, st);
    saveProgress();
    window.dispatchEvent(new Event("resize")); // 편집기·자동 높이 칸이 새 자리에 맞추게 한다
  }

  // 탐구 활동지(제출 안 함)는 빈 칸까지 모든 칸의 모범답을 보여 준다.
  var OPEN_ALL = /workbook/.test(PATH);
  function checkables(s) {
    return $$(AUTHORED ? ".x-f[data-model]" : "input[data-model], .rg[data-model]", s.node)
      .filter(function (f) { return (AUTHORED && OPEN_ALL) || !isEmpty(f); });
  }
  function judged(f) { return !AUTHORED || !OPEN_ALL || f.hasAttribute("data-judge"); }

  function setPrimary() {
    var s = screens[cur];
    primary.classList.remove("ok", "warn");
    if (s.kind === "finish") { primary.textContent = "주차 목록으로"; mode = "home"; return; }
    if (s.kind === "start") { primary.textContent = load(STORE, {}).cur > 0 ? "이어서 진행" : "시작"; mode = "start"; return; }
    if (checkables(s).length && !s.checked) { primary.textContent = "확인"; mode = "check"; return; }
    primary.textContent = "계속"; mode = "next";
  }

  function check() {
    var s = screens[cur];
    var list = checkables(s), wrong = 0, right = 0, shown = 0;
    list.forEach(function (f) {
      var model = f.getAttribute("data-model"), v = fieldValue(f);
      var host = f.closest(".duo-fld") || f;
      var note = f.parentNode.querySelector(":scope>.duo-model");
      function say(cls, t) {
        if (!note) { note = el("span", "duo-model"); f.parentNode.insertBefore(note, f.nextSibling); }
        note.className = "duo-model " + cls; note.textContent = t;
      }
      if (judged(f) && v) {
        var ok = sameAnswer(v, model);
        host.classList.toggle("duo-ok", ok);
        host.classList.toggle("duo-diff", !ok);
        if (ok) { right++; if (note) note.remove(); }
        else { wrong++; say("", "정답: " + model); }
      } else {
        // 서술형이거나 비어 있는 칸: 맞다/틀리다 대신 모범답을 보여 준다.
        shown++;
        host.classList.remove("duo-ok", "duo-diff");
        say("info", (judged(f) ? "정답: " : "모범 답안: ") + model);
      }
    });
    s.checked = true;
    if (!wrong && shown) showSheet(right ? "ok" : "show", right ? "정답 " + right + "개" : "모범 답안을 표시했습니다", "각 입력란 아래의 모범 답안과 작성한 답을 비교하십시오. 답은 수정할 수 있습니다.");
    else if (!wrong) showSheet("ok", "정답입니다", list.length > 1 ? "입력란 " + list.length + "개가 모두 정답입니다." : "");
    else showSheet("warn", "정답과 다른 입력란이 " + wrong + "개 있습니다", "각 입력란 아래의 정답과 비교하십시오. 표현만 다르고 뜻이 같으면 정답으로 인정합니다.");
    primary.textContent = "계속"; mode = "next";
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function showSheet(kind, title, msg) {
    sheet.hidden = false;
    sheet.className = "duo-sheet " + kind;
    $(".duo-sheet-t", sheet).textContent = title;
    sheetMsg.textContent = msg || "";
    foot.classList.add(kind);
    primary.classList.toggle("ok", kind === "ok");
    primary.classList.toggle("warn", kind !== "ok");
  }
  function hideSheet() { sheet.hidden = true; foot.classList.remove("ok", "warn", "info", "show"); }

  function emptyIn(s) {
    return $$(FIELD, s.node).filter(function (f) {
      if (f.closest("details:not([open])")) return false;
      return isEmpty(f);
    });
  }
  function focusFirstEmpty() {
    var f = emptyIn(screens[cur])[0];
    if (!f) return;
    var t = f.hasAttribute("data-bind") ? $("input, textarea, button", f)
      : f.getAttribute("data-type") === "radio" ? $("input", f) : (f.closest(".ck-ed") ? $(".ck-ta", f.closest(".ck-ed")) : f);
    if (t) { t.focus({ preventScroll: true }); t.scrollIntoView({ block: "center", behavior: "smooth" }); }
  }

  function onPrimary() {
    if (mode === "start") {
      var id = $("#sb-id"), nm = $("#sb-name");
      if (id && nm && (!id.value.trim() || !nm.value.trim())) {
        showSheet("warn", "학번과 이름을 먼저 입력하십시오", "제출 파일 이름과 채점에 사용됩니다.");
        (id.value.trim() ? nm : id).focus();
        return;
      }
      var st = load(STORE, {});
      go(st.cur > 0 && st.cur < screens.length ? st.cur : 1);
      return;
    }
    if (mode === "home") { location.href = "../index.html#" + PATH.split("/")[0]; return; }
    if (mode === "check") { check(); return; }
    var empty = emptyIn(screens[cur]);
    if (empty.length && !warnedEmpty && screens[cur].kind === "step") {
      warnedEmpty = true;
      showSheet("info", "작성하지 않은 입력란이 " + empty.length + "개 있습니다", "이후에 돌아와 작성할 수 있습니다. 한 번 더 누르면 다음 화면으로 이동합니다.");
      primary.textContent = "다음으로 이동";
      // 포커스를 옮기면 경고가 바로 꺼지므로, 빈 칸은 보이게 스크롤하고 반짝이기만 한다.
      empty.forEach(function (f) {
        f.classList.remove("duo-blink"); void f.offsetWidth; f.classList.add("duo-blink");
        setTimeout(function () { f.classList.remove("duo-blink"); }, 2600);
      });
      empty[0].scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    go(cur + 1);
  }

  /* ---------- 진행률(주차 목록에 보인다) ---------- */
  function saveProgress() {
    var all = $$("[data-key]");
    var filled = all.filter(function (f) { return !isEmpty(f); }).length;
    save(PROG, { filled: filled, total: all.length, seen: screens.filter(function (s) { return s.seen; }).length, screens: screens.length, at: Date.now() });
  }

  /* ---------- 칸 꾸미기 ---------- */
  function decorate() {
    $$("details").forEach(function (d) {
      var sm = $("summary", d);
      if (!sm) return;
      if (/확인|정답|답/.test(sm.textContent)) d.classList.add("duo-reveal");
    });
    $$("input.in, textarea.in:not(.code), select.in").forEach(function (f) {
      if (!f.placeholder && f.getAttribute("data-label")) f.placeholder = "";
    });
    // 라디오는 큰 선택 버튼처럼 보이게 한다
    $$(".rg label").forEach(function (l) { l.classList.add("duo-opt"); });
  }

  function mascot(happy) {
    return '<svg viewBox="0 0 120 120" width="100%" height="100%"><g>' +
      '<path d="M60 14c-8 0-14 7-14 15 0 2 .4 4 1 6-14 5-24 18-24 34 0 20 16 36 37 36s37-16 37-36c0-16-10-29-24-34 .6-2 1-4 1-6 0-8-6-15-14-15z" fill="var(--duo-green)"/>' +
      '<circle cx="47" cy="62" r="11" fill="#fff"/><circle cx="73" cy="62" r="11" fill="#fff"/>' +
      '<circle cx="' + (happy ? 47 : 49) + '" cy="63" r="5" fill="#1d2b36"/><circle cx="' + (happy ? 73 : 75) + '" cy="63" r="5" fill="#1d2b36"/>' +
      (happy ? '<path d="M48 82q12 10 24 0" stroke="#1d2b36" stroke-width="4" fill="none" stroke-linecap="round"/>'
             : '<path d="M52 82h16" stroke="#1d2b36" stroke-width="4" stroke-linecap="round"/>') +
      '<path d="M54 73l6 6 6-6z" fill="#ffc800"/></g></svg>';
  }

  /* ---------- 시작 ---------- */
  function boot() {
    var wrap = $(".wrap");
    if (!wrap) return;
    buildShell();
    var page = $(".x-page");
    if (page) {
      // 새로 쓴 쪽: 원본(.wrap)은 숨긴 채 그대로 두고, x-page 의 화면들을 쓴다.
      AUTHORED = true; FIELD = ".x-f[data-bind]";
      var hd = el("header");
      hd.innerHTML = "<h1>" + (page.getAttribute("data-title") || document.title) + '</h1><p class="lead">' + (page.getAttribute("data-lead") || "") + "</p>";
      buildStart(hd);
      $$(":scope>.x-act", page).forEach(buildAct);
      page.hidden = true;
    } else {
      var header = $(":scope>header", wrap);
      buildStart(header || el("div"));
      $$(":scope>section", wrap).forEach(buildSection);
      if (pendingLead.length) addScreen("read", pendingLead, { section: "읽기" });
    }
    buildFinish();
    screens.forEach(function (s) { stage.appendChild(s.node); });
    wrap.hidden = true;
    decorate();
    buildToc();
    var st = load(STORE, {});
    (st.seen || []).forEach(function (v, i) { if (v && screens[i]) screens[i].seen = true; });
    primary.addEventListener("click", onPrimary);
    backBtn.addEventListener("click", function () { go(cur - 1); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !toc.hidden) { toggleToc(false); return; }
      var t = e.target, typing = t && (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && t.type === "text") || t.isContentEditable);
      if (e.key === "Enter" && !e.isComposing && !e.shiftKey && (!typing || t.tagName === "INPUT")) {
        if (t.tagName === "INPUT" && t.closest(".quiz")) return; // 확인 질문은 자기 단추로
        e.preventDefault(); onPrimary();
      }
    });
    // 빈 칸 경고가 떠 있을 때 칸을 건드리면 바로 경고를 거둔다.
    function clearEmptyWarn() {
      if (!warnedEmpty) return;
      warnedEmpty = false; hideSheet(); setPrimary();
    }
    document.addEventListener("pointerdown", function (e) { if (e.target.closest(".duo-stage input, .duo-stage textarea, .duo-stage button, .duo-stage .ck-ed")) clearEmptyWarn(); });
    document.addEventListener("focusin", function (e) { if (e.target.closest(".duo-stage")) clearEmptyWarn(); });
    document.addEventListener("input", function (e) {
      clearEmptyWarn();
      var s = screens[cur];
      if (s && e.target.closest("[data-model], .rg")) {
        if (s.checked) { s.checked = false; hideSheet(); }
        if (!warnedEmpty) setPrimary();
      }
      clearTimeout(boot._t); boot._t = setTimeout(saveProgress, 400);
    });
    document.addEventListener("change", function (e) {
      if (e.target.matches(".rg input")) {
        var s = screens[cur]; if (s && s.checked) { s.checked = false; hideSheet(); }
        if (!warnedEmpty) setPrimary();
      }
      saveProgress();
    });
    go(0);
  }

  function start() { setTimeout(boot, 0); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
