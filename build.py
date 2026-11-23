"""원본 활동지(heback/datastructure)를 듀오링고식 화면으로 바꿔 site/ 에 만든다.

원칙: 답 칸(data-key 요소)과 원본의 저장 스크립트는 한 글자도 바꾸지 않는다.
그래야 저장되는 JSON(키·라벨·타입·값 형식)이 원본과 같아 채점기가 그대로 읽는다.
바꾸는 것은 화면(CSS/JS)과, 원본에 미리 채워져 있는 모범 답을 학생 칸에서 빼는 일뿐이다.
"""
import html
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
UP = ROOT.parent / "upstream"          # gh 로 받아 둔 원본 materials/
SRC = ROOT / "src"
OUT = ROOT / "docs"
WEEKS = [11, 12, 13]
KEEP_ASSETS = ["codekit.js", "codekit.css", "lesson.js", "lesson.css", "chatkit.js", "chatkit.css"]
DROP_CSS = ["topnav.css", "theme.css", "sheettabs.css", "book.css", "sheetpage.css"]
DROP_JS = ["topnav.js", "sheettabs.js", "book.js"]

# 정답이 하나로 정해졌다고 보기 어려운 칸(예측·생각·이유 등)은 즉시 확인하지 않는다.
OPEN_WORDS = re.compile(r"예측|짐작|생각|이유|느낀|메모|소감|설명|근거|까닭|왜|어떻게|방법|규칙|정리|계획|입장|바뀐|헷갈|질문|AI|요약|비교|같았는가|같은가|맞았는가|달랐|관찰|발견|특징|점검|문장")
MAX_MODEL_LEN = 40

stats = {}

# 속성값 안의 > 에 걸리지 않는 태그 패턴
def TAG(name):
    return r'<%s(?=[\s>/])(?:[^>"]|"[^"]*")*>' % name


def attr(tag, name):
    m = re.search(r'\s%s="([^"]*)"' % re.escape(name), tag)
    return html.unescape(m.group(1)) if m else None


# 탐구 활동지는 제출하지 않으므로 모든 칸의 모범답을 [확인] 때 보여 준다(OPEN_ALL).
# 정답이 하나로 정해진 짧은 칸만 맞다/다르다를 판정한다(data-judge).
OPEN_ALL = False


def judgeable(label, placeholder, model):
    if not model or len(model) > MAX_MODEL_LEN:
        return False
    text = (label or "") + " " + (placeholder or "")
    return not OPEN_WORDS.search(text)


def checkable(label, placeholder, model):
    if OPEN_ALL and model:
        return True
    if not model or len(model) > MAX_MODEL_LEN:
        return False
    text = (label or "") + " " + (placeholder or "")
    return not OPEN_WORDS.search(text)


def strip_inputs(s, st):
    """<input ... data-key ... value="모범답"> → value 를 빼고, 정답이 정해진 칸이면 data-model 로 옮긴다."""
    def fix(m):
        tag = m.group(0)
        if "data-key=" not in tag or 'type="radio"' in tag:
            return tag
        model = attr(tag, "value")
        tag2 = re.sub(r'\svalue="[^"]*"', "", tag)
        if 'type="checkbox"' in tag2:
            tag2 = re.sub(r"\schecked(?=[\s>/])", "", tag2)
            return tag2
        if model is not None and model.strip():
            st["prefilled"] += 1
            if checkable(attr(tag, "data-label"), attr(tag, "placeholder"), model.strip()):
                st["checkable"] += 1
                j = ' data-judge="1"' if judgeable(attr(tag, "data-label"), attr(tag, "placeholder"), model.strip()) else ""
                tag2 = tag2[:-1].rstrip("/").rstrip() + ' data-model="%s"%s>' % (html.escape(model.strip(), quote=True), j)
        return tag2
    return re.sub(TAG("input"), fix, s)


def strip_textareas(s, st):
    """<textarea data-key ...>모범답</textarea> → 비운다(서술형 모범답은 화면에 넣지 않는다)."""
    def fix(m):
        open_tag, body = m.group(1), m.group(2)
        if "data-key=" in open_tag and 'data-type="code"' not in open_tag and body.strip():
            st["prefilled"] += 1
            if OPEN_ALL:
                st["checkable"] += 1
                model = html.unescape(body).strip()
                return open_tag[:-1] + ' data-model="%s">' % html.escape(model, quote=True) + "</textarea>"
            return open_tag + "</textarea>"
        return m.group(0)
    return re.sub("(" + TAG("textarea") + ")(.*?)</textarea>", fix, s, flags=re.S)


def strip_radios(s, st):
    """라디오 묶음(span.rg[data-key])에 미리 체크된 답을 빼고, 정해진 답이면 data-model 로 옮긴다."""
    def fix(m):
        block = m.group(0)
        open_tag = re.match(TAG("span"), block).group(0)
        chosen = None
        for inp in re.findall(TAG("input"), block):
            if re.search(r"\schecked(?=[\s>/])", inp):
                chosen = attr(inp, "value")
        block = re.sub(TAG("input"), lambda t: re.sub(r"\schecked(?=[\s>/])", "", t.group(0)), block)
        if chosen:
            st["prefilled"] += 1
            if checkable(attr(open_tag, "data-label"), "", chosen):
                st["checkable"] += 1
                j = ' data-judge="1"' if judgeable(attr(open_tag, "data-label"), "", chosen) else ""
                new_open = open_tag[:-1] + ' data-model="%s"%s>' % (html.escape(chosen, quote=True), j)
                block = new_open + block[len(open_tag):]
        return block
    return re.sub(r'<span\b(?:[^>"]|"[^"]*")*data-type="radio"(?:[^>"]|"[^"]*")*>.*?</span>', fix, s, flags=re.S)


def strip_selects(s, st):
    def fix(m):
        block = m.group(0)
        if "data-key=" not in block:
            return block
        chosen = re.search(r'<option\b[^>]*\sselected[^>]*>(.*?)</option>', block, flags=re.S)
        block = re.sub(r"(<option\b[^>]*?)\sselected(?:=\"[^\"]*\")?", r"\1", block)
        if chosen:
            st["prefilled"] += 1
        return block
    return re.sub(r"<select\b.*?</select>", fix, s, flags=re.S)


# ---------- 문구 다시 쓰기 ----------
# 본문(<body>, 스크립트 밖)의 글 조각만 고른다. 답 칸·코드·라디오 보기가 든 조각은 빼서
# 채점에 쓰이는 data-label·value 는 절대 바뀌지 않는다.
SEG_RE = re.compile(r"<(h1|h2|h3|p|li|summary|th|figcaption)\b((?:[^>\"]|\"[^\"]*\")*)>(.*?)</\1>", re.S)
SEG_SKIP = re.compile(r"<(?:input|textarea|select|script|pre|p|li|ul|ol|div|table|details|h\d|svg)\b|data-key|data-type")


def segments(s):
    """(번호, 시작, 끝, 태그, 속성, 안쪽 html) 목록. 스크립트·head 안은 고르지 않는다."""
    body_at = s.find("<body")
    blocked = [(m.start(), m.end()) for m in re.finditer(r"<script\b.*?</script>|<pre\b.*?</pre>|<textarea\b.*?</textarea>", s, re.S)]
    out = []
    for m in SEG_RE.finditer(s, body_at):
        if any(a <= m.start() < b for a, b in blocked):
            continue
        inner = m.group(3)
        if not inner.strip() or SEG_SKIP.search(inner) or not re.search(r"[가-힣]", inner):
            continue
        out.append((len(out), m.start(3), m.end(3), m.group(1), m.group(2), inner))
    # 확인 질문(.quiz)의 보기 단추: 몇 번째인지로 채점하므로 글은 바꿔도 된다.
    return out


def apply_copy(s, page_key):
    """copy/<주차>/<파일>.json 의 {번호: {from, to}} 를 적용한다. from 이 지금 원본과 다르면 건너뛴다."""
    p = ROOT / "copy" / (page_key + ".json")
    if not p.exists():
        return s, 0, 0
    data = json.loads(p.read_text(encoding="utf-8"))
    segs = segments(s)
    edits, skipped = [], 0
    for k, v in data.items():
        i = int(k)
        if i >= len(segs) or segs[i][5] != v["from"]:
            skipped += 1
            continue
        edits.append((segs[i][1], segs[i][2], v["to"]))
    for a, b, new in sorted(edits, reverse=True):
        s = s[:a] + new + s[b:]
    return s, len(edits), skipped


def dump_segments():
    """다시 쓰기 작업용으로 파일마다 글 조각 목록을 copy_src/ 에 쓴다."""
    for w in WEEKS:
        for item in week_files(w):
            s = (UP / f"week{w}" / item["file"]).read_text(encoding="utf-8")
            rows = [{"id": i, "tag": t, "class": (attr("<x" + a + ">", "class") or ""), "html": h} for i, _, _, t, a, h in segments(s)]
            out = ROOT / "copy_src" / f"week{w}" / (item["file"].replace(".html", ".json"))
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
            print(out.relative_to(ROOT), len(rows))


def transform(src_html, rel_depth="../", page_key=None):
    global OPEN_ALL
    OPEN_ALL = bool(page_key and "workbook" in page_key)
    st = {"prefilled": 0, "checkable": 0, "copy": 0, "copy_skip": 0}
    s = src_html
    authored = ROOT / "pages" / (page_key + ".html") if page_key else None
    if authored and authored.exists():
        # 새로 쓴 쪽: 원본 본문은 숨겨 두고(답 칸·저장 스크립트 그대로) 새 화면을 앞에 넣는다.
        st["authored"] = True
        s = re.sub(r"(<body\b[^>]*>)", lambda m: m.group(1) + "\n" + authored.read_text(encoding="utf-8") + "\n", s, count=1)
    elif page_key:
        s, st["copy"], st["copy_skip"] = apply_copy(s, page_key)
    # 원본 화면용 CSS/JS 와 쪽마다 들어 있는 원본 스타일을 뺀다(저장 스크립트는 그대로 둔다).
    for c in DROP_CSS:
        s = re.sub(r'<link[^>]*href="\.\./assets/%s"[^>]*>\s*' % re.escape(c), "", s)
    for j in DROP_JS:
        s = re.sub(r'<script[^>]*src="\.\./assets/%s"[^>]*>\s*</script>\s*' % re.escape(j), "", s)
    s = re.sub(r"<style\b[^>]*>.*?</style>\s*", "", s, flags=re.S)
    s = re.sub(r'<link href="https://fonts\.googleapis\.com[^>]*>', "", s)
    s = strip_inputs(s, st)
    s = strip_textareas(s, st)
    s = strip_radios(s, st)
    s = strip_selects(s, st)
    head_add = (
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900'
        '&family=Noto+Sans+KR:wght@400;500;700;900&family=JetBrains+Mono:wght@400;600&display=swap">\n'
        '<link rel="stylesheet" href="%sassets/duo.css">\n'
        '<link rel="stylesheet" href="%sassets/xkit.css">\n' % (rel_depth, rel_depth)
    )
    s = s.replace("</head>", head_add + "</head>", 1)
    s = s.replace("</body>", '<script src="%sassets/xkit.js"></script>\n<script src="%sassets/duo.js"></script>\n</body>' % (rel_depth, rel_depth), 1)
    return s, st


def week_files(w):
    """주차 목록 쪽(index.html)에 실린 순서대로 활동지 파일과 제목을 얻는다."""
    idx = (UP / f"week{w}" / "index.html").read_text(encoding="utf-8")
    items, seen = [], set()
    for m in re.finditer(r'<a\b[^>]*href="([a-z_0-9]+\.html)"[^>]*>(.*?)</a>', idx, flags=re.S):
        f = m.group(1)
        if f in seen or f in ("index.html", "rubric.html") or not (UP / f"week{w}" / f).exists():
            continue
        seen.add(f)
        items.append(f)
    for p in sorted((UP / f"week{w}").glob("*.html")):  # 목록에 빠진 파일도 넣는다
        if p.name not in seen and p.name not in ("index.html", "rubric.html"):
            items.append(p.name)
    out = []
    for f in items:
        page = (UP / f"week{w}" / f).read_text(encoding="utf-8")
        h1 = re.search(r"<h1[^>]*>(.*?)</h1>", page, flags=re.S)
        title = re.sub(r"<[^>]+>", "", h1.group(1)).strip() if h1 else f
        title = html.unescape(title)
        keys = len(set(re.findall(r'data-key="([^"]+)"', page)))
        out.append({"file": f, "title": title, "keys": keys})
    return out


def build_one(key):
    """쪽 하나만 다시 만든다(여럿이 동시에 작업해도 서로 지우지 않게). 예: week12/student_code_lab"""
    key = key.replace(".html", "")
    src = (UP / (key + ".html")).read_text(encoding="utf-8")
    out, st = transform(src, page_key=key)
    (OUT / (key + ".html")).write_text(out, encoding="utf-8")
    print(key, "만듦", "(새로 쓴 쪽)" if st.get("authored") else "(새로 쓴 쪽 없음)")


def main():
    if len(sys.argv) > 2 and sys.argv[1] == "--only":
        return build_one(sys.argv[2])
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "assets").mkdir(parents=True)
    for a in KEEP_ASSETS:
        shutil.copy(UP / "assets" / a, OUT / "assets" / a)
    for a in SRC.glob("*"):
        if a.is_file() and a.suffix in (".js", ".css"):
            shutil.copy(a, OUT / "assets" / a.name)
    catalog = []
    for w in WEEKS:
        (OUT / f"week{w}").mkdir()
        files = week_files(w)
        for item in files:
            src = (UP / f"week{w}" / item["file"]).read_text(encoding="utf-8")
            out, st = transform(src, page_key=f"week{w}/" + item["file"].replace(".html", ""))
            (OUT / f"week{w}" / item["file"]).write_text(out, encoding="utf-8")
            stats[f"week{w}/{item['file']}"] = st
        catalog.append({"week": w, "files": files})
    home = (SRC / "home.html").read_text(encoding="utf-8")
    home = home.replace("/*CATALOG*/null", json.dumps(catalog, ensure_ascii=False))
    (OUT / "index.html").write_text(home, encoding="utf-8")
    (OUT / ".nojekyll").write_text("")
    for k, v in stats.items():
        print(f"{k:45s} 미리 채운 답 {v['prefilled']:3d}  즉시 확인 {v['checkable']:3d}  문구 {v['copy']:3d}" + (f"  (안 맞아 건너뜀 {v['copy_skip']})" if v['copy_skip'] else ""))


if __name__ == "__main__":
    if sys.argv[1:] == ["segments"]:
        dump_segments()
    else:
        sys.exit(main())
