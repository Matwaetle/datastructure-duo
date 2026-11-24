/* vsed.js — codekit 편집기(textarea 위에 색칠한 글자를 겹쳐 보이는 방식)를 Monaco(VS Code 편집기)로 바꾼다.
   원본 textarea 는 그대로 두고 숨긴다. 저장·실행·채점은 계속 textarea 값을 읽으므로, 두 쪽 값을 서로 맞춰 둔다.
   Monaco 를 불러오지 못하면 원래 편집기를 그대로 쓴다. */
(function () {
  "use strict";
  var VS = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs";
  var LH = 21, PAD = 10, MIN_LINES = 4;
  var NATIVE = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");

  function loadMonaco(done) {
    if (window.monaco) return done(window.monaco);
    var s = document.createElement("script");
    s.src = VS + "/loader.min.js";
    s.onload = function () {
      window.require.config({ paths: { vs: VS } });
      // 작업자(worker)를 다른 주소에서 띄우기 위한 설정(CDN 사용 시 필요)
      window.MonacoEnvironment = {
        getWorkerUrl: function () {
          return "data:text/javascript;charset=utf-8," + encodeURIComponent(
            "self.MonacoEnvironment={baseUrl:'" + VS.replace(/\/vs$/, "/") + "'};importScripts('" + VS + "/base/worker/workerMain.min.js');");
        }
      };
      window.require(["vs/editor/editor.main"], function () {
        var m = window.monaco;
        // VS Code 의 파이썬 확장처럼 ':' 로 끝나는 줄 다음에 들여쓰고, return/pass/break/continue 다음엔 내어 쓴다.
        m.languages.setLanguageConfiguration("python", {
          comments: { lineComment: "#", blockComment: ['"""', '"""'] },
          brackets: [["{", "}"], ["[", "]"], ["(", ")"]],
          autoClosingPairs: [
            { open: "{", close: "}" }, { open: "[", close: "]" }, { open: "(", close: ")" },
            { open: '"', close: '"', notIn: ["string"] }, { open: "'", close: "'", notIn: ["string", "comment"] }
          ],
          surroundingPairs: [{ open: "{", close: "}" }, { open: "[", close: "]" }, { open: "(", close: ")" }, { open: '"', close: '"' }, { open: "'", close: "'" }],
          folding: { offSide: true, markers: { start: /^\s*#region\b/, end: /^\s*#endregion\b/ } },
          onEnterRules: [
            { beforeText: /:\s*(#.*)?$/, action: { indentAction: m.languages.IndentAction.Indent } },
            { beforeText: /^\s+(return\b.*|pass|break|continue|raise\b.*)\s*$/, action: { indentAction: m.languages.IndentAction.Outdent } }
          ]
        });
        done(m);
      });
    };
    s.onerror = function () { done(null); };
    document.head.appendChild(s);
  }

  function upgrade(monaco, box) {
    if (box._vs) return;
    var ta = box.querySelector("textarea.ck-ta"), area = box.querySelector(".ck-area");
    if (!ta || !area) return;
    box._vs = true;
    box.classList.add("vs-on");
    var host = document.createElement("div");
    host.className = "vs-host";
    area.appendChild(host);

    var ed = monaco.editor.create(host, {
      value: NATIVE.get.call(ta),
      language: "python",
      theme: "vs-dark",
      fontFamily: "'JetBrains Mono', Consolas, 'D2Coding', 'Courier New', monospace",
      fontSize: 14, lineHeight: LH,
      tabSize: 4, insertSpaces: true, detectIndentation: false,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      renderWhitespace: "selection",
      guides: { indentation: true, bracketPairs: true },
      bracketPairColorization: { enabled: true },
      autoClosingBrackets: "languageDefined",
      wordBasedSuggestions: "currentDocument",
      fixedOverflowWidgets: true,
      scrollbar: { alwaysConsumeMouseWheel: false, verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      padding: { top: PAD, bottom: PAD },
      unicodeHighlight: { ambiguousCharacters: false, invisibleCharacters: false }
    });

    ed.getModel().setEOL(monaco.editor.EndOfLineSequence.LF);   // 윈도에서도 줄바꿈을 \n 으로(원래 textarea 와 같게)

    function fit() {
      var n = Math.max(MIN_LINES, ed.getModel().getLineCount());
      host.style.height = (n * LH + PAD * 2 + 12) + "px";
    }
    fit();

    // Monaco → textarea: 원래 값 설정 함수(codekit 이 바꿔 둔 것)를 거쳐 넣고 input 이벤트를 낸다.
    var own = Object.getOwnPropertyDescriptor(ta, "value");
    var setOrig = own && own.set ? own.set : function (v) { NATIVE.set.call(ta, v); };
    var getOrig = own && own.get ? own.get : function () { return NATIVE.get.call(ta); };
    var mute = false;
    ed.onDidChangeModelContent(function () {
      fit();
      if (mute) return;
      mute = true;
      NATIVE.set.call(ta, ed.getValue());
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      mute = false;
    });
    // textarea → Monaco: 불러오기·[처음 코드로]·[편집기에 추가] 등이 값을 바꾸면 편집기에도 반영한다.
    Object.defineProperty(ta, "value", {
      configurable: true,
      get: getOrig,
      set: function (v) {
        setOrig.call(ta, v);
        var raw = NATIVE.get.call(ta);
        if (!mute && raw !== ed.getValue()) { mute = true; ed.setValue(raw); mute = false; }
      }
    });
    ta.addEventListener("input", function () {
      var raw = NATIVE.get.call(ta);
      if (!mute && raw !== ed.getValue()) { mute = true; ed.setValue(raw); mute = false; }
    });

    // Ctrl+Enter: [▶ 실행]
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function () {
      var run = box.querySelector(".ck-bar .ck-btn.run:not(.chk)");
      if (run) run.click();
    });
  }

  function start() {
    var boxes = Array.prototype.slice.call(document.querySelectorAll(".ck-ed"));
    if (!boxes.length) return;
    loadMonaco(function (monaco) {
      if (!monaco) return;
      boxes.forEach(function (b) { try { upgrade(monaco, b); } catch (e) { console.error(e); } });
    });
  }
  // codekit 이 편집기를 만들고 xkit 이 자리를 옮긴 뒤에 시작한다.
  if (document.readyState === "complete") setTimeout(start, 50);
  else window.addEventListener("load", function () { setTimeout(start, 50); });
})();
