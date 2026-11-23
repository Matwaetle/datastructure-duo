"""새로 쓸 원본 쪽을 읽기 좋게 펼친다.  사용: python inspect_page.py week12 student_code_lab

1) 활동(section)·걸음(step)별 제목, 그림(pre), 글, 확인 질문, 편집기(연습·채점)
2) 채점 칸 목록: key | 종류 | 라벨 | 칸 안내 | 모범답(원본에 미리 채워진 값)
"""
import html
import re
import sys
from pathlib import Path

UP = Path(__file__).resolve().parent.parent / "upstream"
TAG = r'<(input|textarea|span|select)(?=[\s>])((?:[^>"]|"[^"]*")*)>'


def txt(x):
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", x))).strip()


def main(week, name):
    s = (UP / week / (name + ".html")).read_text(encoding="utf-8")
    b = s[s.find("<body"):]
    b = re.sub(r"<script(?![^>]*type=\"text/plain\").*?</script>", "", b, flags=re.S)
    print("#" * 70, "\n# 1. 내용\n" + "#" * 70)
    for sec in re.finditer(r"<section([^>]*)>(.*?)</section>", b, re.S):
        sid = re.search(r'id="([^"]+)"', sec.group(1))
        print("\n======== section", sid.group(1) if sid else "")
        for part in re.split(r'(?=<div class="step">)', sec.group(2)):
            h = re.search(r"<h[23][^>]*>(.*?)</h[23]>", part, re.S)
            print("\n--", txt(h.group(1)) if h else "(앞부분)")
            for m in re.finditer(r'<script type="text/plain" data-id="([^"]+)">(.*?)</script>', part, re.S):
                print(f"[연습 편집기 시작 코드 data-starter={m.group(1)}]\n{html.unescape(m.group(2)).strip()}")
            for m in re.finditer(r"<pre[^>]*>(.*?)</pre>", part, re.S):
                print("[그림]\n" + html.unescape(re.sub(r"<[^>]+>", "", m.group(1))))
            body = re.sub(r"<pre.*?</pre>|<script.*?</script>", "", part, flags=re.S)
            print("글:", txt(body)[:1500])
            ks = re.findall(r'data-key="([^"]+)"', part)
            if ks:
                print("이 걸음의 칸:", ", ".join(ks))
            st = re.findall(r'data-starter="([^"]+)"', part)
            if st:
                print("이 걸음의 연습 편집기(data-starter):", ", ".join(st))
    print("\n" + "#" * 70, "\n# 2. 채점 칸 (모두 새 화면에 한 번씩 넣어야 한다)\n" + "#" * 70)
    for m in re.finditer(TAG, s):
        a = m.group(2)
        k = re.search(r'data-key="([^"]+)"', a)
        if not k:
            continue
        lab = html.unescape((re.search(r'data-label="([^"]*)"', a) or [None, ""])[1])
        ph = html.unescape((re.search(r'placeholder="([^"]*)"', a) or [None, ""])[1]).replace("\n", " / ")
        if m.group(1) == "input":
            t = "checkbox" if "checkbox" in a else "text"
            v = html.unescape((re.search(r'\svalue="([^"]*)"', a) or [None, ""])[1])
        elif m.group(1) == "textarea":
            t = "code" if 'data-type="code"' in a else "area"
            e = s.find("</textarea>", m.end())
            v = html.unescape(s[m.end():e]).strip().replace("\n", " / ")[:200]
        elif m.group(1) == "select":
            t = "select"; v = ""
        else:
            t = "radio"
            e = s.find("</span>", m.end())
            blk = s[m.end():e]
            opts = re.findall(r'value="([^"]*)"', blk)
            ch = re.search(r'value="([^"]*)"\s*checked', blk)
            v = "[" + " / ".join(opts) + "] 정답:" + (ch.group(1) if ch else "")
        print(f"{k.group(1)} | {t} | {lab} | 안내:{ph} | 답:{v}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2].replace(".html", ""))
