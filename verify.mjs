// 원본 활동지와 새 활동지가 같은 제출 JSON 틀(키·라벨·타입 순서)을 만드는지 확인한다.
// 사용: node verify.mjs   (프로젝트 폴더의 upstream/ 과 duo/site/ 를 비교)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const ctx = await browser.newContext();
// 외부 글꼴·Pyodide 는 막아 빠르게 돈다(칸 구조와 무관).
await ctx.route(/fonts\.(googleapis|gstatic)|pyodide|jsdelivr/, (r) => r.abort());

const pages = [];
const ONLY = process.argv[2]; // 예: node verify.mjs week12/student_code_lab
for (const w of [11, 12, 13]) {
  for (const f of fs.readdirSync(path.join(HERE, "docs", `week${w}`))) {
    if (!f.endsWith(".html") || f === "index.html") continue;
    if (ONLY && `week${w}/${f}`.replace(".html", "") !== ONLY.replace(".html", "")) continue;
    pages.push([w, f]);
  }
}

let bad = 0;
for (const [w, f] of pages) {
  const errors = [];
  const grab = async (url) => {
    const page = await ctx.newPage();
    // 원본은 폭 900px 이상에서 book.js 가 편집기를 옮겨 칸 순서가 바뀐다. 좁은 폭에서 원래 순서를 본다.
    if (!url.includes("/docs/")) await page.setViewportSize({ width: 800, height: 900 });
    page.on("pageerror", (e) => errors.push(`${url.includes("/docs/") ? "새" : "원본"}: ${e.message}`));
    await page.goto(url, { waitUntil: "load" });
    await page.waitForTimeout(300);
    const r = await page.evaluate((w) => {
      const api = window[`Week${w}Submit`];
      const j = api.buildJSON("final");
      return { schema: j.schema, file: j.file, week: j.week, answers: j.answers };
    }, w);
    return { page, r };
  };
  const a = await grab(`${base}/upstream/week${w}/${f}`);
  const b = await grab(`${base}/duo/docs/week${w}/${f}`);
  const sig = (x) => x.answers.map((q) => `${q.key}|${q.label}|${q.type}`);
  const sa = sig(a.r), sb = sig(b.r);
  const meta = a.r.schema === b.r.schema && a.r.file === b.r.file && a.r.week === b.r.week;
  const exact = JSON.stringify(sa) === JSON.stringify(sb);
  // 코드 편집기는 원본처럼 자리를 옮기므로, 코드 칸이 있는 쪽은 순서만 다른 것을 허용한다(원본 book.js 도 넓은 화면에서 그렇다).
  const hasCode = a.r.answers.some((q) => q.type === "code");
  const sameSet = JSON.stringify([...sa].sort()) === JSON.stringify([...sb].sort());
  const same = meta && (exact || (hasCode && sameSet));
  // 새 쪽은 학생 칸이 비어 있어야 한다(코드 칸의 시작 코드는 원본과 같으면 괜찮다).
  const leaked = b.r.answers.filter((q, i) => q.type !== "code" && q.value !== "" && q.value !== false && q.value !== null && q.value !== a.r.answers[i]?.value);
  const prefilled = b.r.answers.filter((q) => q.type !== "code" && q.value !== "" && q.value !== false && q.value !== null);

  // 새 쪽 칸에 값을 채워 넣고 JSON 에 그대로 들어가는지 본다.
  const roundtrip = await b.page.evaluate((w) => {
    if (document.querySelector(".x-page")) {
      // 새로 쓴 쪽: 화면의 칸(.x-f)으로만 채운다. 모든 원본 칸이 정확히 한 번씩 화면에 있어야 한다.
      const keys = [...document.querySelectorAll("[data-key]")].map((e) => e.getAttribute("data-key"));
      const bound = [...document.querySelectorAll(".x-page .x-f[data-bind], .duo-app .x-f[data-bind]")].map((e) => e.getAttribute("data-bind"));
      const miss = keys.filter((k) => !bound.includes(k)).map((k) => "화면에 없음 " + k);
      const dup = bound.filter((k, i) => bound.indexOf(k) !== i).map((k) => "두 번 " + k);
      const extra = bound.filter((k) => !keys.includes(k)).map((k) => "원본에 없음 " + k);
      document.querySelectorAll(".x-f[data-bind]").forEach((f, i) => {
        const opt = f.querySelector(".x-opt, .x-check");
        if (opt) { opt.click(); return; }
        f.querySelectorAll("input, textarea").forEach((inp) => { inp.value = "값" + i; inp.dispatchEvent(new Event("input", { bubbles: true })); });
      });
      const j = window[`Week${w}Submit`].buildJSON("final");
      return miss.concat(dup, extra, j.answers.filter((q) => q.value === "" || q.value === null || q.value === false).map((q) => "빈 값 " + q.key));
    }
    const els = [...document.querySelectorAll("[data-key]")];
    els.forEach((el, i) => {
      const t = el.getAttribute("data-type");
      if (t === "radio") { const r = el.querySelector("input[type=radio]"); if (r) r.checked = true; }
      else if (el.type === "checkbox") el.checked = true;
      else if (el.tagName === "SELECT") { if (el.options.length > 1) el.selectedIndex = 1; }
      else el.value = "값" + i;
    });
    const j = window[`Week${w}Submit`].buildJSON("final");
    return j.answers.filter((q) => q.value === "" || q.value === null || q.value === false).map((q) => q.key);
  }, w);
  const screens = await b.page.evaluate(() => document.querySelectorAll(".duo-screen").length);

  // 실제 [제출 파일 저장] 단추로 받은 파일이 원본 틀과 같은지 본다.
  await b.page.evaluate(() => { document.querySelector("#sb-id").value = "9999"; document.querySelector("#sb-name").value = "검사"; });
  const [dl] = await Promise.all([b.page.waitForEvent("download"), b.page.evaluate(() => document.querySelector("#sb-save").click())]);
  const saved = JSON.parse(fs.readFileSync(await dl.path(), "utf-8"));
  const savedOk = saved.schema === a.r.schema && saved.file === a.r.file && saved.student.id === "9999" &&
    JSON.stringify(saved.answers.map((q) => `${q.key}|${q.label}|${q.type}`).sort()) === JSON.stringify([...sa].sort());
  if (!savedOk) errors.push("저장 파일 틀이 원본과 다르다: " + dl.suggestedFilename());

  const ok = same && !prefilled.length && !roundtrip.length && !errors.length;
  if (!ok) bad++;
  console.log(`${ok ? (exact ? "OK " : "OK~") : "XX "} week${w}/${f.padEnd(32)} 칸 ${String(sb.length).padStart(3)}  화면 ${String(screens).padStart(3)}` +
    (same ? "" : `  [틀 다름: 원본 ${sa.length} / 새 ${sb.length}]`) +
    (prefilled.length ? `  [미리 채워진 칸 ${prefilled.length}: ${prefilled.slice(0, 3).map((q) => q.key).join(", ")}]` : "") +
    (roundtrip.length ? `  [값이 안 들어간 칸 ${roundtrip.length}: ${roundtrip.slice(0, 3).join(", ")}]` : "") +
    (errors.length ? `  [오류 ${errors.slice(0, 2).join(" / ")}]` : ""));
  if (!same) {
    for (let i = 0; i < Math.max(sa.length, sb.length); i++) if (sa[i] !== sb[i]) { console.log("   원본:", sa[i], "\n   새  :", sb[i]); break; }
  }
  await a.page.close(); await b.page.close();
}
console.log(bad ? `\n${bad}개 파일에 문제가 있다.` : `\n${pages.length}개 파일 모두 원본과 같은 JSON 틀이다.`);
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
