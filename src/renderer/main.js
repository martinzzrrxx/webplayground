import "./styles.css";
import { createPlaygroundEditors } from "./editor.js";
import { buildPreviewDocument } from "./preview.js";

const templates = {
  blank: {
    id: "blank",
    title: "Blank Practice",
    html: `<main class="canvas">\n  <h1>Start here</h1>\n  <p>Experiment with structure, style, and behavior.</p>\n</main>`,
    css: `body {\n  font-family: "Segoe UI", sans-serif;\n  background: linear-gradient(180deg, #f8fbff 0%, #edf4ff 100%);\n}\n\n.canvas {\n  max-width: 720px;\n  margin: 3rem auto;\n  padding: 2rem;\n  border-radius: 1.5rem;\n  background: white;\n  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08);\n}`,
    javascript: `console.log("Blank practice ready");`
  },
  semantic: {
    id: "semantic",
    title: "Semantic Layout Drill",
    html: `<header class="hero">\n  <p class="eyebrow">Semantic HTML</p>\n  <h1>Build a clear content structure</h1>\n</header>\n\n<main class="page">\n  <section>\n    <h2>Topics to review</h2>\n    <ul>\n      <li>Headings and document structure</li>\n      <li>Lists and landmarks</li>\n      <li>Accessible labels</li>\n    </ul>\n  </section>\n\n  <aside>\n    <h2>Tip</h2>\n    <p>Use section only for thematic groups that deserve a heading.</p>\n  </aside>\n</main>`,
    css: `body {\n  margin: 0;\n  font-family: "Segoe UI", sans-serif;\n  background: #f6f4ef;\n  color: #10233d;\n}\n\n.hero {\n  padding: 3rem 2rem 1rem;\n}\n\n.page {\n  display: grid;\n  grid-template-columns: 2fr 1fr;\n  gap: 1.5rem;\n  padding: 0 2rem 2rem;\n}\n\nsection,\naside {\n  background: white;\n  padding: 1.5rem;\n  border-radius: 1.25rem;\n  box-shadow: 0 16px 32px rgba(16, 35, 61, 0.08);\n}`,
    javascript: `console.log("Review the semantic landmarks in the DOM.");`
  },
  dom: {
    id: "dom",
    title: "DOM Interaction Drill",
    html: `<main class="stack">\n  <button id="toggleButton">Toggle panel</button>\n  <section id="panel" class="panel is-open">\n    <h1>DOM practice</h1>\n    <p>Use JavaScript to change classes and text content.</p>\n  </section>\n</main>`,
    css: `body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  font-family: "Segoe UI", sans-serif;\n  background: radial-gradient(circle at top, rgba(11, 87, 208, 0.18), transparent 40%), #f8fbff;\n}\n\n.stack {\n  display: grid;\n  gap: 1rem;\n}\n\nbutton {\n  padding: 0.9rem 1.2rem;\n  border: 0;\n  border-radius: 999px;\n  background: #0b57d0;\n  color: white;\n}\n\n.panel {\n  padding: 1.5rem;\n  border-radius: 1.25rem;\n  background: white;\n  box-shadow: 0 18px 40px rgba(11, 87, 208, 0.15);\n  transition: transform 180ms ease, opacity 180ms ease;\n}\n\n.panel:not(.is-open) {\n  opacity: 0.18;\n  transform: translateY(-8px);\n}`,
    javascript: `const button = document.querySelector("#toggleButton");\nconst panel = document.querySelector("#panel");\n\nbutton.addEventListener("click", () => {\n  panel.classList.toggle("is-open");\n  console.log("Panel open:", panel.classList.contains("is-open"));\n});`
  }
};

const state = {
  activeTopic: "all",
  activeWorkspace: "source",
  activeSourceMode: "guide",
  results: [],
  activeDoc: null,
  activeDocId: null,
  noteTimer: null,
  noteLoading: false,
  searchTimer: null,
  draftTimer: null,
  previewTimer: null,
  drafts: [],
  activeDraftId: null,
  activeTemplateId: "blank",
  suppressDraftChanges: false,
  editorsBundle: null
};

const refs = {
  searchInput: document.querySelector("#searchInput"),
  resultCount: document.querySelector("#resultCount"),
  resultsList: document.querySelector("#resultsList"),
  topicFilter: document.querySelector("#topicFilter"),
  sourceFilter: document.querySelector("#sourceFilter"),
  kindFilter: document.querySelector("#kindFilter"),
  detailCard: document.querySelector("#detailCard"),
  noteEditor: document.querySelector("#noteEditor"),
  noteStatus: document.querySelector("#noteStatus"),
  sourceTab: document.querySelector("#sourceTab"),
  playgroundTab: document.querySelector("#playgroundTab"),
  sourceWorkspace: document.querySelector("#sourceWorkspace"),
  playgroundWorkspace: document.querySelector("#playgroundWorkspace"),
  sourceTitle: document.querySelector("#sourceTitle"),
  sourceStatus: document.querySelector("#sourceStatus"),
  sourceMount: document.querySelector("#sourceMount"),
  sourcePlaceholder: document.querySelector("#sourcePlaceholder"),
  guideModeButton: document.querySelector("#guideModeButton"),
  standardModeButton: document.querySelector("#standardModeButton"),
  refreshSourceButton: document.querySelector("#refreshSourceButton"),
  openExternalButton: document.querySelector("#openExternalButton"),
  hideSourceButton: document.querySelector("#hideSourceButton"),
  draftStatus: document.querySelector("#draftStatus"),
  draftSelect: document.querySelector("#draftSelect"),
  draftTitle: document.querySelector("#draftTitle"),
  saveDraftButton: document.querySelector("#saveDraftButton"),
  deleteDraftButton: document.querySelector("#deleteDraftButton"),
  htmlEditor: document.querySelector("#htmlEditor"),
  cssEditor: document.querySelector("#cssEditor"),
  javascriptEditor: document.querySelector("#javascriptEditor"),
  previewFrame: document.querySelector("#previewFrame"),
  runPreviewButton: document.querySelector("#runPreviewButton"),
  consoleOutput: document.querySelector("#consoleOutput"),
  clearConsoleButton: document.querySelector("#clearConsoleButton"),
  templateButtons: Array.from(document.querySelectorAll("[data-template]"))
};

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function formatTopic(topic) {
  return topic === "javascript" ? "JavaScript" : topic.toUpperCase();
}

function formatKind(kind) {
  return kind
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function readSourceBounds() {
  const rect = refs.sourceMount.getBoundingClientRect();
  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
}

function setTopicButtons() {
  for (const button of refs.topicFilter.querySelectorAll("[data-topic]")) {
    button.classList.toggle("is-active", button.getAttribute("data-topic") === state.activeTopic);
  }
}

function setWorkspace(nextWorkspace) {
  state.activeWorkspace = nextWorkspace;
  refs.sourceTab.classList.toggle("is-active", nextWorkspace === "source");
  refs.playgroundTab.classList.toggle("is-active", nextWorkspace === "playground");
  refs.sourceWorkspace.classList.toggle("is-active", nextWorkspace === "source");
  refs.playgroundWorkspace.classList.toggle("is-active", nextWorkspace === "playground");

  if (nextWorkspace === "source") {
    void syncSourceView();
  } else {
    void window.learningApp.hideEmbeddedSource();
  }
}

function updateSourceModeButtons() {
  refs.guideModeButton.classList.toggle("is-active", state.activeSourceMode === "guide");
  refs.standardModeButton.classList.toggle("is-active", state.activeSourceMode === "standard");
  refs.guideModeButton.disabled = !state.activeDoc?.sourceUrl;
  refs.standardModeButton.disabled = !state.activeDoc?.specUrl;
}

function renderResultList() {
  if (!state.results.length) {
    refs.resultCount.textContent = "0 results";
    refs.resultsList.innerHTML = `
      <article class="result-card empty-result">
        <h3>No matches found</h3>
        <p>Try a broader term or reset the filters.</p>
      </article>
    `;
    return;
  }

  refs.resultCount.textContent = `${state.results.length} results`;
  refs.resultsList.innerHTML = state.results
    .map(
      (result) => `
        <button class="result-card ${result.id === state.activeDocId ? "is-selected" : ""}" data-doc-id="${result.id}" type="button">
          <div class="result-topline">
            <span class="badge">${formatTopic(result.topic)}</span>
            <span class="subtle-badge">${formatKind(result.kind)}</span>
          </div>
          <h3>${escapeHtml(result.title)}</h3>
          <p>${escapeHtml(result.summary)}</p>
          <div class="result-footer">
            <span>${escapeHtml(result.sourceLabel)}</span>
            ${result.hasStandardSource ? "<span>Standard linked</span>" : ""}
          </div>
        </button>
      `
    )
    .join("");
}

function renderDetailCard() {
  if (!state.activeDoc) {
    refs.detailCard.className = "detail-card empty-state";
    refs.detailCard.innerHTML = `
      <h3>Select a topic</h3>
      <p>Search the library to load a knowledge card, notes, and the official source.</p>
    `;
    return;
  }

  refs.detailCard.className = "detail-card";
  refs.detailCard.innerHTML = `
    <div class="detail-topline">
      <div>
        <div class="chip-row">
          <span class="badge">${formatTopic(state.activeDoc.topic)}</span>
          <span class="subtle-badge">${formatKind(state.activeDoc.kind)}</span>
        </div>
        <h3>${escapeHtml(state.activeDoc.title)}</h3>
      </div>
    </div>

    <p class="detail-summary">${escapeHtml(state.activeDoc.summary)}</p>

    <section class="info-block">
      <h4>Official sources</h4>
      <div class="link-stack">
        <button class="source-link-button" data-detail-source="guide" type="button">${escapeHtml(state.activeDoc.sourceLabel)}</button>
        ${
          state.activeDoc.specUrl
            ? `<button class="source-link-button" data-detail-source="standard" type="button">${escapeHtml(state.activeDoc.specLabel)}</button>`
            : "<span class=\"muted-text\">No standard link mapped yet.</span>"
        }
      </div>
    </section>

    <section class="info-block">
      <h4>Concept anchors</h4>
      <div class="chip-row">
        ${state.activeDoc.anchors.map((anchor) => `<span class="subtle-badge">${escapeHtml(anchor)}</span>`).join("")}
      </div>
    </section>

    <section class="info-block">
      <h4>Example</h4>
      <pre class="code-block"><code>${escapeHtml(state.activeDoc.exampleSnippet)}</code></pre>
    </section>
  `;
}

async function refreshSearch() {
  const filters = {
    query: refs.searchInput.value.trim(),
    topic: state.activeTopic,
    source: refs.sourceFilter.value,
    kind: refs.kindFilter.value
  };

  state.results = await window.learningApp.searchDocs(filters);
  renderResultList();

  if (!state.activeDocId && state.results[0]) {
    await selectDocument(state.results[0].id);
  }
}

async function loadNote() {
  state.noteLoading = true;
  refs.noteEditor.disabled = !state.activeDocId;

  if (!state.activeDocId) {
    refs.noteEditor.value = "";
    refs.noteStatus.textContent = "No document selected";
    state.noteLoading = false;
    return;
  }

  const note = await window.learningApp.getNote(state.activeDocId);
  refs.noteEditor.value = note?.contentMarkdown ?? "";
  refs.noteStatus.textContent = "Saved locally";
  state.noteLoading = false;
}

async function saveCurrentNote() {
  if (!state.activeDocId) {
    return;
  }

  clearTimeout(state.noteTimer);
  state.noteTimer = null;
  refs.noteStatus.textContent = "Saving locally…";

  const currentDocId = state.activeDocId;
  await window.learningApp.saveNote({
    docId: currentDocId,
    contentMarkdown: refs.noteEditor.value
  });

  if (state.activeDocId === currentDocId) {
    refs.noteStatus.textContent = "Saved locally";
  }
}

function scheduleNoteSave() {
  if (state.noteLoading || !state.activeDocId) {
    return;
  }

  refs.noteStatus.textContent = "Saving locally…";
  clearTimeout(state.noteTimer);
  state.noteTimer = window.setTimeout(() => {
    void saveCurrentNote();
  }, 520);
}

async function selectDocument(docId) {
  if (state.noteTimer) {
    await saveCurrentNote();
  }

  state.activeDocId = docId;
  state.activeDoc = await window.learningApp.getDocDetail(docId);
  renderResultList();
  renderDetailCard();
  refs.sourceTitle.textContent = `${state.activeDoc.title} · ${state.activeSourceMode === "guide" ? "Guide" : "Standard"}`;
  updateSourceModeButtons();
  await loadNote();
  await syncSourceView();
}

async function syncSourceView() {
  updateSourceModeButtons();

  if (state.activeWorkspace !== "source") {
    return;
  }

  if (!state.activeDoc) {
    refs.sourceStatus.textContent = "Select a topic to load the official docs.";
    refs.sourcePlaceholder.textContent = "Pick a document and keep the Docs tab active to view the official page inside the app.";
    await window.learningApp.hideEmbeddedSource();
    return;
  }

  const sourceAvailable = state.activeSourceMode === "standard" ? Boolean(state.activeDoc.specUrl) : Boolean(state.activeDoc.sourceUrl);

  if (!sourceAvailable) {
    refs.sourceStatus.textContent =
      state.activeSourceMode === "standard"
        ? "No standard source is mapped for this topic yet."
        : "No guide source is mapped for this topic yet.";
    refs.sourcePlaceholder.textContent = refs.sourceStatus.textContent;
    await window.learningApp.hideEmbeddedSource();
    return;
  }

  refs.sourceTitle.textContent = `${state.activeDoc.title} · ${state.activeSourceMode === "guide" ? "Guide" : "Standard"}`;
  refs.sourceStatus.textContent = "Loading official docs…";
  refs.sourcePlaceholder.textContent = "Loading official docs inside the app…";

  const result = await window.learningApp.openEmbeddedSource({
    docId: state.activeDocId,
    sourceMode: state.activeSourceMode,
    bounds: readSourceBounds()
  });

  refs.sourceStatus.textContent = result.sourceUrl ? `${result.sourceLabel} loaded inside the app.` : "The embedded docs view is unavailable.";
}

function appendConsoleEntry(level, text) {
  const item = document.createElement("li");
  item.className = `console-entry ${level}`;
  item.textContent = text;
  refs.consoleOutput.prepend(item);
}

function runPreview() {
  clearTimeout(state.previewTimer);
  refs.consoleOutput.innerHTML = "";
  refs.previewFrame.srcdoc = buildPreviewDocument({
    html: state.editorsBundle.models.html.getValue(),
    css: state.editorsBundle.models.css.getValue(),
    javascript: state.editorsBundle.models.javascript.getValue()
  });
  appendConsoleEntry("system", "Preview refreshed.");
}

function schedulePreview() {
  clearTimeout(state.previewTimer);
  state.previewTimer = window.setTimeout(runPreview, 260);
}

async function refreshDraftOptions(selectedDraftId = state.activeDraftId) {
  state.drafts = await window.learningApp.listDrafts();
  refs.draftSelect.innerHTML = state.drafts
    .map(
      (draft) => `<option value="${draft.draftId}" ${draft.draftId === selectedDraftId ? "selected" : ""}>${escapeHtml(draft.title)}</option>`
    )
    .join("");
}

async function saveActiveDraft(isAutosave = false) {
  if (!state.editorsBundle) {
    return null;
  }

  clearTimeout(state.draftTimer);
  state.draftTimer = null;
  refs.draftStatus.textContent = isAutosave ? "Autosaving draft…" : "Saving draft…";

  const saved = await window.learningApp.saveDraft({
    draftId: state.activeDraftId,
    title: refs.draftTitle.value.trim() || "Untitled Draft",
    html: state.editorsBundle.models.html.getValue(),
    css: state.editorsBundle.models.css.getValue(),
    javascript: state.editorsBundle.models.javascript.getValue(),
    templateId: state.activeTemplateId
  });

  state.activeDraftId = saved.draftId;
  state.activeTemplateId = saved.templateId;
  await refreshDraftOptions(saved.draftId);
  refs.draftSelect.value = saved.draftId;
  refs.draftStatus.textContent = "Saved locally";
  return saved;
}

function scheduleDraftSave() {
  if (state.suppressDraftChanges) {
    return;
  }

  refs.draftStatus.textContent = "Autosaving draft…";
  clearTimeout(state.draftTimer);
  state.draftTimer = window.setTimeout(() => {
    void saveActiveDraft(true);
  }, 700);
}

async function openDraft(draftId) {
  if (state.draftTimer) {
    await saveActiveDraft(true);
  }

  const draft = await window.learningApp.loadDraft(draftId);

  if (!draft) {
    return;
  }

  state.suppressDraftChanges = true;
  state.activeDraftId = draft.draftId;
  state.activeTemplateId = draft.templateId;
  refs.draftTitle.value = draft.title;
  state.editorsBundle.models.html.setValue(draft.html);
  state.editorsBundle.models.css.setValue(draft.css);
  state.editorsBundle.models.javascript.setValue(draft.javascript);
  state.suppressDraftChanges = false;
  refs.draftSelect.value = draft.draftId;
  refs.draftStatus.textContent = "Saved locally";
  runPreview();
}

async function createDraftFromTemplate(templateId) {
  const template = templates[templateId];
  const draft = await window.learningApp.saveDraft({
    title: template.title,
    html: template.html,
    css: template.css,
    javascript: template.javascript,
    templateId
  });

  await refreshDraftOptions(draft.draftId);
  await openDraft(draft.draftId);
}

async function ensureInitialDraft() {
  await refreshDraftOptions();

  if (!state.drafts.length) {
    await createDraftFromTemplate("blank");
    return;
  }

  await openDraft(state.drafts[0].draftId);
}

function bindEvents() {
  refs.searchInput.addEventListener("input", () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(() => {
      void refreshSearch();
    }, 180);
  });

  refs.topicFilter.addEventListener("click", (event) => {
    const button = event.target.closest("[data-topic]");

    if (!button) {
      return;
    }

    state.activeTopic = button.getAttribute("data-topic");
    setTopicButtons();
    void refreshSearch();
  });

  refs.sourceFilter.addEventListener("change", () => {
    void refreshSearch();
  });

  refs.kindFilter.addEventListener("change", () => {
    void refreshSearch();
  });

  refs.resultsList.addEventListener("click", (event) => {
    const target = event.target.closest("[data-doc-id]");

    if (!target) {
      return;
    }

    void selectDocument(target.getAttribute("data-doc-id"));
  });

  refs.detailCard.addEventListener("click", (event) => {
    const button = event.target.closest("[data-detail-source]");

    if (!button || !state.activeDocId) {
      return;
    }

    void window.learningApp.openExternalSource({
      docId: state.activeDocId,
      sourceMode: button.getAttribute("data-detail-source")
    });
  });

  refs.noteEditor.addEventListener("input", scheduleNoteSave);

  refs.sourceTab.addEventListener("click", () => setWorkspace("source"));
  refs.playgroundTab.addEventListener("click", () => setWorkspace("playground"));

  refs.guideModeButton.addEventListener("click", () => {
    state.activeSourceMode = "guide";
    updateSourceModeButtons();
    void syncSourceView();
  });

  refs.standardModeButton.addEventListener("click", () => {
    state.activeSourceMode = "standard";
    updateSourceModeButtons();
    void syncSourceView();
  });

  refs.refreshSourceButton.addEventListener("click", () => {
    void syncSourceView();
  });

  refs.openExternalButton.addEventListener("click", () => {
    if (!state.activeDocId) {
      return;
    }

    void window.learningApp.openExternalSource({
      docId: state.activeDocId,
      sourceMode: state.activeSourceMode
    });
  });

  refs.hideSourceButton.addEventListener("click", () => {
    refs.sourceStatus.textContent = "Embedded docs panel hidden.";
    refs.sourcePlaceholder.textContent = "Switch back to Docs and reload the document when you want to reopen the official page.";
    void window.learningApp.hideEmbeddedSource();
  });

  refs.draftSelect.addEventListener("change", () => {
    void openDraft(refs.draftSelect.value);
  });

  refs.draftTitle.addEventListener("input", () => {
    refs.draftStatus.textContent = "Draft title changed";
    scheduleDraftSave();
  });

  refs.draftTitle.addEventListener("blur", async () => {
    if (!state.activeDraftId) {
      return;
    }

    await window.learningApp.renameDraft({
      draftId: state.activeDraftId,
      title: refs.draftTitle.value.trim() || "Untitled Draft"
    });
    await refreshDraftOptions(state.activeDraftId);
    refs.draftStatus.textContent = "Saved locally";
  });

  refs.templateButtons.forEach((button) => {
    button.addEventListener("click", () => {
      void createDraftFromTemplate(button.getAttribute("data-template"));
    });
  });

  refs.saveDraftButton.addEventListener("click", () => {
    void saveActiveDraft(false);
  });

  refs.deleteDraftButton.addEventListener("click", async () => {
    if (!state.activeDraftId) {
      return;
    }

    await window.learningApp.deleteDraft(state.activeDraftId);
    await refreshDraftOptions();

    if (!state.drafts.length) {
      await createDraftFromTemplate("blank");
      return;
    }

    await openDraft(state.drafts[0].draftId);
  });

  refs.runPreviewButton.addEventListener("click", runPreview);
  refs.clearConsoleButton.addEventListener("click", () => {
    refs.consoleOutput.innerHTML = "";
  });

  window.addEventListener("message", (event) => {
    if (event.source !== refs.previewFrame.contentWindow) {
      return;
    }

    if (event.data?.channel !== "playground") {
      return;
    }

    if (event.data.type === "console") {
      appendConsoleEntry(event.data.payload.level, event.data.payload.messages.join(" "));
    }

    if (event.data.type === "error") {
      appendConsoleEntry("error", event.data.payload.message);
    }
  });

  const resizeObserver = new ResizeObserver(() => {
    if (state.activeWorkspace !== "source" || !state.activeDocId) {
      return;
    }

    void window.learningApp.setEmbeddedViewBounds(readSourceBounds());
  });

  resizeObserver.observe(refs.sourceMount);
}

function bindEditorChanges() {
  Object.values(state.editorsBundle.models).forEach((model) => {
    model.onDidChangeContent(() => {
      if (state.suppressDraftChanges) {
        return;
      }

      scheduleDraftSave();
      schedulePreview();
    });
  });
}

async function init() {
  state.editorsBundle = createPlaygroundEditors(
    {
      html: refs.htmlEditor,
      css: refs.cssEditor,
      javascript: refs.javascriptEditor
    },
    templates.blank
  );

  bindEvents();
  bindEditorChanges();
  setTopicButtons();
  await refreshSearch();
  await ensureInitialDraft();
  runPreview();
}

init();
