import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === "html") {
      return new htmlWorker();
    }

    if (label === "css" || label === "scss" || label === "less") {
      return new cssWorker();
    }

    if (label === "javascript" || label === "typescript") {
      return new tsWorker();
    }

    return new editorWorker();
  }
};

export function createPlaygroundEditors(hosts, initialValues) {
  const models = {
    html: monaco.editor.createModel(initialValues.html ?? "", "html"),
    css: monaco.editor.createModel(initialValues.css ?? "", "css"),
    javascript: monaco.editor.createModel(initialValues.javascript ?? "", "javascript")
  };

  const baseOptions = {
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 13,
    lineHeight: 20,
    fontLigatures: true,
    fontFamily: "Cascadia Code, Consolas, monospace",
    tabSize: 2,
    insertSpaces: true,
    wordWrap: "on",
    smoothScrolling: true,
    roundedSelection: false
  };

  const editors = {
    html: monaco.editor.create(hosts.html, {
      ...baseOptions,
      model: models.html
    }),
    css: monaco.editor.create(hosts.css, {
      ...baseOptions,
      model: models.css
    }),
    javascript: monaco.editor.create(hosts.javascript, {
      ...baseOptions,
      model: models.javascript
    })
  };

  return {
    editors,
    models,
    dispose() {
      Object.values(editors).forEach((editor) => editor.dispose());
      Object.values(models).forEach((model) => model.dispose());
    }
  };
}

