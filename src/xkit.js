/* xkit.js — 새로 쓴 활동지(x-page)의 그림 부품과 답 칸 연결.
   답 칸(.x-f[data-bind])은 숨겨 둔 원본 칸(data-key)에 값을 그대로 옮겨 적는다.
   원본 칸의 위치·순서는 그대로라서 저장되는 JSON 은 원본과 같다. */
(function () {
  "use strict";
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function orig(key) { return document.querySelector('.wrap [data-key="' + key.replace(/"/g, '\\"') + '"]'); }

  /* ---------- 그림: 배열 ---------- */
  // data-v="2,5,8"  data-name="a"  data-lo / data-hi / data-mid / data-hit / data-miss (인덱스)
  // data-cls="0:pivot,1-4:small,5-6:big"  data-noidx  data-label="1단계"
  function parseRanges(spec) {
    var m = {};
    (spec || "").split(",").forEach(function (p) {
      var kv = p.split(":"); if (kv.length < 2) return;
      var r = kv[0].split("-"), a = +r[0], b = r.length > 1 ? +r[1] : a;
      for (var i = a; i <= b; i++) m[i] = (m[i] ? m[i] + " " : "") + kv[1].trim();
    });
    return m;
  }
  function renderArr(el) {
    var vals = el.getAttribute("data-v").split(",").map(function (s) { return s.trim(); });
    var cls = parseRanges(el.getAttribute("data-cls"));
    var lo = el.getAttribute("data-lo"), hi = el.getAttribute("data-hi"), mid = el.getAttribute("data-mid");
    var hit = el.getAttribute("data-hit"), miss = el.getAttribute("data-miss");
    var ptr = {};
    function addPtr(i, name) { if (i == null || i === "") return; (ptr[i] = ptr[i] || []).push(name); }
    addPtr(lo, "lo"); addPtr(hi, "hi"); addPtr(mid, "mid");
    var html = "";
    if (el.getAttribute("data-name")) html += '<div class="x-arr-name">' + esc(el.getAttribute("data-name")) + "</div>";
    html += '<div class="x-arr-row">';
    vals.forEach(function (v, i) {
      var c = "x-cell " + (cls[i] || "");
      if (lo != null && hi != null && (i < +lo || i > +hi)) c += " out";
      if (mid != null && i === +mid) c += " mid";
      if (hit != null && i === +hit) c += " hit";
      if (miss != null && i === +miss) c += " miss";
      html += '<div class="' + c + '">' +
        (el.hasAttribute("data-noidx") ? "" : '<span class="x-idx">' + i + "</span>") +
        '<span class="x-val">' + esc(v) + "</span>" +
        '<span class="x-ptr">' + (ptr[i] ? ptr[i].join(" ") : "") + "</span></div>";
    });
    html += "</div>";
    if (el.getAttribute("data-label")) html = '<div class="x-arr-label">' + esc(el.getAttribute("data-label")) + "</div>" + html;
    el.innerHTML = html;
  }

  /* ---------- 그림: 격자 ---------- */
  // data-rows="S.#.|.#..|...E"  (# 벽, S 시작, E 도착, . 빈칸, 그 밖의 글자는 그대로)
  // data-mark="1,1:hit;2,3:cur"  data-path="0,0>0,1>1,1" (대각선 가능)  data-rc (행·열 번호)  data-label
  function renderGrid(el) {
    var rows = el.getAttribute("data-rows").split("|");
    var marks = {};
    (el.getAttribute("data-mark") || "").split(";").forEach(function (p) {
      var kv = p.split(":"); if (kv.length < 2) return; marks[kv[0].trim()] = kv[1].trim();
    });
    var rc = el.hasAttribute("data-rc"), C = 42, G = 4;
    var nr = rows.length, nc = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    var off = rc ? 22 : 0;
    var W = off + nc * (C + G), H = off + nr * (C + G);
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img">';
    if (rc) {
      for (var c = 0; c < nc; c++) svg += '<text class="g-rc" x="' + (off + c * (C + G) + C / 2) + '" y="14">' + c + "</text>";
      for (var r = 0; r < nr; r++) svg += '<text class="g-rc" x="9" y="' + (off + r * (C + G) + C / 2 + 5) + '">' + r + "</text>";
    }
    rows.forEach(function (row, r) {
      for (var c = 0; c < nc; c++) {
        var ch = row[c] || " ", cls = "g-c";
        if (ch === "#") cls += " wall"; else if (ch === "S") cls += " start"; else if (ch === "E" || ch === "G") cls += " end";
        if (marks[r + "," + c]) cls += " " + marks[r + "," + c];
        var x = off + c * (C + G), y = off + r * (C + G);
        svg += '<rect class="' + cls + '" x="' + x + '" y="' + y + '" width="' + C + '" height="' + C + '" rx="9"/>';
        if (ch !== "." && ch !== "#" && ch !== " ") svg += '<text class="g-t" x="' + (x + C / 2) + '" y="' + (y + C / 2 + 6) + '">' + esc(ch) + "</text>";
      }
    });
    var path = el.getAttribute("data-path");
    if (path) {
      var pts = path.split(">").map(function (p) { var a = p.split(","); return [off + (+a[1]) * (C + G) + C / 2, off + (+a[0]) * (C + G) + C / 2]; });
      svg += '<polyline class="g-path" points="' + pts.map(function (p) { return p.join(","); }).join(" ") + '"/>';
      pts.forEach(function (p, i) { svg += '<circle class="g-dot" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i ? 4 : 6) + '"/>'; });
    }
    svg += "</svg>";
    el.innerHTML = (el.getAttribute("data-label") ? '<div class="x-arr-label">' + esc(el.getAttribute("data-label")) + "</div>" : "") +
      (el.getAttribute("data-name") ? '<div class="x-arr-name">' + esc(el.getAttribute("data-name")) + "</div>" : "") + '<div class="x-scroll">' + svg + "</div>";
  }

  /* ---------- 그림: 그래프 ---------- */
  // data-nodes="A:0,0 B:1,0 C:0,1"  (열,행 좌표 · 칸 단위)  data-edges="A-B,B-C:3"  (:값 은 간선 가중치)
  // data-directed  data-hl="A,B" (색칠)  data-start="A"  data-done="B" (방문함)  data-path="A>B>C" (경로 강조)
  function renderGraph(el) {
    var U = 92, R = 22, P = 30, nodes = {}, maxx = 0, maxy = 0;
    el.getAttribute("data-nodes").trim().split(/\s+/).forEach(function (t) {
      var kv = t.split(":"), xy = kv[1].split(",");
      nodes[kv[0]] = { x: P + R + (+xy[0]) * U, y: P + R + (+xy[1]) * U };
      maxx = Math.max(maxx, +xy[0]); maxy = Math.max(maxy, +xy[1]);
    });
    var W = 2 * (P + R) + maxx * U, H = 2 * (P + R) + maxy * U;
    var dir = el.hasAttribute("data-directed");
    function set(a) { var m = {}; (el.getAttribute(a) || "").split(/[,>]/).forEach(function (k) { if (k.trim()) m[k.trim()] = 1; }); return m; }
    var hl = set("data-hl"), done = set("data-done"), start = (el.getAttribute("data-start") || "").trim();
    var pathSeq = (el.getAttribute("data-path") || "").split(">").map(function (s) { return s.trim(); }).filter(Boolean);
    var onPath = {};
    for (var i = 1; i < pathSeq.length; i++) { onPath[pathSeq[i - 1] + "-" + pathSeq[i]] = 1; if (!dir) onPath[pathSeq[i] + "-" + pathSeq[i - 1]] = 1; }
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img">' +
      '<defs><marker id="xa' + (renderGraph.n = (renderGraph.n || 0) + 1) + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" class="g-arrow"/></marker></defs>';
    (el.getAttribute("data-edges") || "").split(",").forEach(function (e) {
      e = e.trim(); if (!e) return;
      var w = e.split(":"), ab = w[0].split("-"), a = nodes[ab[0]], b = nodes[ab[1]];
      if (!a || !b) return;
      var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      var x1 = a.x + dx / d * R, y1 = a.y + dy / d * R, x2 = b.x - dx / d * (R + (dir ? 3 : 0)), y2 = b.y - dy / d * (R + (dir ? 3 : 0));
      var cls = "g-e" + (onPath[ab[0] + "-" + ab[1]] ? " on" : "");
      svg += '<line class="' + cls + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' + (dir ? ' marker-end="url(#xa' + renderGraph.n + ')"' : "") + "/>";
      if (w[1]) svg += '<text class="g-w" x="' + ((a.x + b.x) / 2 + dy / d * 12) + '" y="' + ((a.y + b.y) / 2 - dx / d * 12 + 5) + '">' + esc(w[1]) + "</text>";
    });
    Object.keys(nodes).forEach(function (k) {
      var n = nodes[k], cls = "g-n" + (hl[k] ? " hl" : "") + (done[k] ? " done" : "") + (k === start ? " start" : "");
      svg += '<circle class="' + cls + '" cx="' + n.x + '" cy="' + n.y + '" r="' + R + '"/><text class="g-nt' + (k === start ? " start" : "") + '" x="' + n.x + '" y="' + (n.y + 6) + '">' + esc(k) + "</text>";
    });
    svg += "</svg>";
    el.innerHTML = (el.getAttribute("data-name") ? '<div class="x-arr-name">' + esc(el.getAttribute("data-name")) + "</div>" : "") +
      (el.getAttribute("data-label") ? '<div class="x-arr-label">' + esc(el.getAttribute("data-label")) + "</div>" : "") + '<div class="x-scroll">' + svg + "</div>";
  }

  /* ---------- 내 답 다시 보기 ---------- */
  // <span class="x-echo" data-echo="A11.t.r1.c2"></span> : 학생이 앞에서 쓴 값을 그대로 보여 준다(비어 있으면 '아직 안 씀').
  function renderEchos() {
    $$(".x-echo[data-echo]").forEach(function (sp) {
      var o = document.querySelector('[data-key="' + sp.getAttribute("data-echo") + '"]');
      var v = o ? String(getOrig(o) || "").trim() : "";
      sp.textContent = v || (sp.getAttribute("data-empty") || "미작성");
      sp.classList.toggle("empty", !v);
    });
  }

  /* ---------- 그림: 코드 ---------- */
  // <pre class="x-code">print(a)  #=> 1</pre> : #=> 뒤는 출력으로 오른쪽에 붙인다
  var KW = /\b(def|return|if|elif|else|for|while|in|not|and|or|import|from|as|None|True|False|break|continue|pass|lambda|class|with|is)\b/g;
  function hlLine(src) {
    var out = "", rest = src, cm = "", outv = "";
    var o = rest.indexOf("#=>");
    if (o >= 0) { outv = rest.slice(o + 3).trim(); rest = rest.slice(0, o).replace(/\s+$/, ""); }
    var c = rest.search(/#(?![^"']*["'][^"']*$)/);
    if (c >= 0) { cm = rest.slice(c); rest = rest.slice(0, c); }
    out = esc(rest)
      .replace(/(&quot;[^&]*?&quot;|'[^']*')/g, '<span class="k-str">$1</span>')
      .replace(KW, '<span class="k-kw">$1</span>')
      .replace(/\b(print|len|range|sorted|min|max|sum|list|int|str|abs|enumerate|append|pop)\b(?=\()/g, '<span class="k-fn">$1</span>')
      .replace(/(^|[^\w.])(\d+)(?![\w])/g, '$1<span class="k-num">$2</span>');
    if (cm) out += '<span class="k-cm">' + esc(cm) + "</span>";
    if (outv) out += '<span class="k-out">' + esc(outv) + "</span>";
    return out;
  }
  function renderCode(pre) {
    var lines = pre.textContent.replace(/^\n+|\s+$/g, "").split("\n");
    pre.innerHTML = lines.map(function (l, i) {
      return '<span class="x-ln"><i>' + (i + 1) + "</i><span>" + (hlLine(l) || " ") + "</span></span>";
    }).join("");
  }

  /* ---------- 답 칸 ---------- */
  function kind(o) {
    if (!o) return "missing";
    if (o.getAttribute("data-type") === "radio") return "radio";
    if (o.tagName === "SELECT") return "select";
    if (o.type === "checkbox") return "checkbox";
    if (o.tagName === "TEXTAREA") return o.getAttribute("data-type") === "code" ? "code" : "area";
    return "text";
  }
  function setOrig(o, v) {
    var k = kind(o);
    if (k === "radio") { $$("input[type=radio]", o).forEach(function (r) { r.checked = r.value === v; }); $$("input", o)[0].dispatchEvent(new Event("change", { bubbles: true })); return; }
    if (k === "checkbox") { o.checked = !!v; o.dispatchEvent(new Event("change", { bubbles: true })); return; }
    o.value = v; o.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function getOrig(o) {
    var k = kind(o);
    if (k === "radio") { var r = $("input[type=radio]:checked", o); return r ? r.value : ""; }
    if (k === "checkbox") return o.checked;
    return o.value;
  }

  var bound = [];
  function renderField(f) {
    var key = f.getAttribute("data-bind"), o = orig(key), k = kind(o);
    f.classList.add("x-k-" + k);
    if (k === "missing") { f.innerHTML = '<span class="x-err">칸 없음: ' + esc(key) + "</span>"; return; }
    var ph = f.getAttribute("data-ph");
    if (ph == null) ph = o.getAttribute("placeholder") || "";
    var model = o.getAttribute("data-model");
    if (model) f.setAttribute("data-model", model);
    if (o.hasAttribute("data-judge")) f.setAttribute("data-judge", "1");
    var rec = { f: f, o: o, k: k };
    if (k === "code") {
      // 코드 칸은 원본 편집기(codekit)를 그대로 옮겨 쓴다(실행·불러오기 기능 유지).
      moveEditor(o, f);
      return;
    }
    if (k === "radio" || k === "select") {
      var opts = k === "radio" ? $$("input[type=radio]", o).map(function (r) { return r.value; })
        : $$("option", o).filter(function (x) { return x.value; }).map(function (x) { return x.value; });
      f.innerHTML = opts.map(function (v) { return '<button type="button" class="x-opt" data-v="' + esc(v) + '">' + esc(v) + "</button>"; }).join("");
      f.addEventListener("click", function (e) {
        var b = e.target.closest(".x-opt"); if (!b) return;
        if (k === "radio") setOrig(o, b.getAttribute("data-v"));
        else { o.value = b.getAttribute("data-v"); o.dispatchEvent(new Event("change", { bubbles: true })); }
        pull(rec);
      });
      rec.pull = function () { var v = k === "radio" ? getOrig(o) : o.value; $$(".x-opt", f).forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-v") === v); }); };
    } else if (k === "checkbox") {
      var text = f.textContent.trim() || (o.getAttribute("data-label") || "").replace(/^\S+\s+점검:\s*/, "");
      f.innerHTML = '<button type="button" class="x-check"><i></i><span>' + esc(text) + "</span></button>";
      f.firstChild.addEventListener("click", function () { setOrig(o, !o.checked); pull(rec); });
      rec.pull = function () { f.firstChild.classList.toggle("on", o.checked); };
    } else if (f.hasAttribute("data-parts")) {
      // 여러 줄 답을 작은 칸 여러 개로 나눠 받고 "이름: 값" 줄로 합쳐 원본 칸에 넣는다.
      var parts = f.getAttribute("data-parts").split("|");
      f.innerHTML = parts.map(function (p, i) {
        var nm = p.split("=")[0], hint = p.split("=")[1] || "";
        return '<label class="x-part"><span>' + esc(nm) + '</span><input type="text" data-i="' + i + '" placeholder="' + esc(hint) + '" autocomplete="off"></label>';
      }).join("");
      var ins = $$("input", f);
      ins.forEach(function (inp) {
        inp.addEventListener("input", function () {
          var v = parts.map(function (p, i) { return ins[i].value.trim() ? p.split("=")[0] + ": " + ins[i].value.trim() : ""; }).filter(Boolean).join("\n");
          setOrig(o, v);
        });
      });
      rec.pull = function () {
        var lines = String(o.value || "").split("\n");
        parts.forEach(function (p, i) {
          var nm = p.split("=")[0], hit = lines.filter(function (l) { return l.indexOf(nm + ": ") === 0; })[0];
          ins[i].value = hit ? hit.slice(nm.length + 2) : (i === 0 && lines.length === 1 && !/: /.test(lines[0]) ? lines[0] : "");
        });
      };
    } else {
      var w = f.getAttribute("data-w") || (k === "area" ? "full" : "m");
      var el = k === "area" ? document.createElement("textarea") : document.createElement("input");
      if (k !== "area") { el.type = "text"; el.autocomplete = "off"; }
      else el.rows = +(f.getAttribute("data-rows") || 2);
      el.className = "x-in w-" + w;
      el.placeholder = ph;
      el.setAttribute("aria-label", o.getAttribute("data-label") || key);
      if (model) el.setAttribute("data-model", model);
      f.innerHTML = ""; f.appendChild(el);
      el.addEventListener("input", function () { setOrig(o, el.value); });
      rec.pull = function () { if (document.activeElement !== el) el.value = getOrig(o) || ""; };
    }
    bound.push(rec);
  }
  function moveEditor(ta, spot) {
    var box = ta.closest(".mycode") || ta.closest(".ck-ed") || ta;
    spot.innerHTML = "";
    spot.appendChild(box);
    spot.classList.add("x-k-code");
  }
  // <div class="x-ed" data-starter="T1-1"></div> : 채점 안 되는 연습 편집기를 옮겨 온다.
  function renderEd(spot) {
    var id = spot.getAttribute("data-starter");
    var ta = document.querySelector('.wrap textarea[data-starter="' + id + '"]');
    if (!ta) { spot.innerHTML = '<span class="x-err">편집기 없음: ' + esc(id) + "</span>"; return; }
    moveEditor(ta, spot);
  }
  function pull(rec) { rec.pull && rec.pull(); }
  function pullAll() { bound.forEach(pull); }

  /* ---------- 시작 ---------- */
  function boot() {
    var page = $(".x-page");
    if (!page) return;
    document.documentElement.classList.add("x-mode");
    $$(".x-arr", page).forEach(renderArr);
    $$(".x-grid[data-rows]", page).forEach(renderGrid);
    $$(".x-graph[data-nodes]", page).forEach(renderGraph);
    $$("pre.x-code", page).forEach(renderCode);
    $$(".x-f[data-bind]", page).forEach(renderField);
    $$(".x-ed[data-starter]", page).forEach(renderEd);
    pullAll();
    renderEchos();
    document.addEventListener("input", function () { clearTimeout(renderEchos._t); renderEchos._t = setTimeout(renderEchos, 150); });
    document.addEventListener("change", function () { setTimeout(renderEchos, 50); });
    // 원본 저장 스크립트가 자동 보관·불러오기로 원본 칸을 바꾸면 새 칸에도 다시 옮긴다.
    var msg = document.getElementById("sb-msg");
    if (msg) new MutationObserver(function () { setTimeout(pullAll, 50); }).observe(msg, { childList: true, characterData: true, subtree: true });
    window.XKit = { pullAll: pullAll, bound: bound };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 0); });
  else setTimeout(boot, 0);
})();
