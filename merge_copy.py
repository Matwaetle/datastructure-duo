"""copy_draft/ 의 다시 쓴 문구를 검사해 copy/ 로 옮긴다.

조각마다 원본과 견주어 하나라도 어긋나면 그 조각은 버리고 원본을 쓴다.
- <code>…</code> 안의 글, 태그 종류별 개수
- [대괄호 단추 이름], 활동 번호(A3, T1-a, Q2 …), 숫자
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def codes(h):
    return Counter(re.findall(r"<code\b[^>]*>(.*?)</code>", h, re.S))


def tags(h):
    return Counter(re.findall(r"<(/?[a-z][a-z0-9]*)\b", h))


def marks(h):
    t = re.sub(r"<[^>]+>", " ", h)
    t = re.sub(r"<code\b.*?</code>", " ", h, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    return (Counter(re.findall(r"\[[^\]\n]{1,30}\]", t)),
            Counter(re.findall(r"\b[A-Z]\d+(?:-[a-z])?\b", t)),
            Counter(re.findall(r"\d+(?:\.\d+)?", t)))


def check(orig, new):
    probs = []
    if codes(orig) != codes(new):
        probs.append("코드 조각")
    to, tn = tags(orig), tags(new)
    tn_cmp = tn.copy()
    extra_b = tn_cmp.get("b", 0) - to.get("b", 0)
    if extra_b > 0 and tn_cmp.get("/b", 0) - to.get("/b", 0) == extra_b:  # <b> 추가는 허용
        tn_cmp["b"] -= extra_b; tn_cmp["/b"] -= extra_b
    if +to != +tn_cmp:
        probs.append("태그")
    mo, mn = marks(orig), marks(new)
    if mo[0] != mn[0]:
        probs.append("단추 이름")
    if mo[1] != mn[1]:
        probs.append("활동 번호")
    if set(mo[2]) != set(mn[2]):
        probs.append("숫자")
    small_o = re.findall(r"<small>.*?</small>", orig, re.S)
    if small_o != re.findall(r"<small>.*?</small>", new, re.S):
        probs.append("small")
    return probs


def main():
    total = kept = 0
    for d in sorted((ROOT / "copy_draft").glob("week*/*.json")):
        rel = d.relative_to(ROOT / "copy_draft")
        src = json.loads((ROOT / "copy_src" / rel).read_text(encoding="utf-8"))
        by_id = {r["id"]: r["html"] for r in src}
        draft = json.loads(d.read_text(encoding="utf-8"))
        out, rejects = {}, []
        for k, new in draft.items():
            i = int(k)
            if i not in by_id or not isinstance(new, str) or new == by_id[i]:
                continue
            total += 1
            p = check(by_id[i], new)
            if p:
                rejects.append((i, p))
                continue
            out[str(i)] = {"from": by_id[i], "to": new}
            kept += 1
        dst = ROOT / "copy" / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"{str(rel):42s} 적용 {len(out):3d}  버림 {len(rejects):2d}" +
              ("  " + ", ".join(f"#{i}({'/'.join(p)})" for i, p in rejects[:6]) if rejects else ""))
    print(f"\n합계: {kept}/{total} 조각 적용")


if __name__ == "__main__":
    sys.exit(main())
