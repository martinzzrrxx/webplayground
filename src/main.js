import { app, BaseWindow, WebContentsView, ipcMain, session, shell } from "electron";
import path from "node:path";
import { getDocById, searchDocs } from "./main/search.js";
import { JSONStore } from "./main/store.js";

const rendererName = typeof MAIN_WINDOW_VITE_NAME !== "undefined" ? MAIN_WINDOW_VITE_NAME : "main_window";
const rendererDevServer = typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== "undefined" ? MAIN_WINDOW_VITE_DEV_SERVER_URL : null;
const docsPartition = "persist:web-study-lab-docs";
const allowedHosts = new Set([
  "developer.mozilla.org",
  "html.spec.whatwg.org",
  "dom.spec.whatwg.org",
  "tc39.es",
  "www.w3.org",
  "w3.org",
  "drafts.csswg.org"
]);

let store;
let mainWindow;
let appView;
let sourceView;
let sourceAttached = false;
let sourceBounds = null;

function getRuntimePath(...segments) {
  return path.join(app.getAppPath(), ".vite", ...segments);
}

function isTrustedSource(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === "https:" && allowedHosts.has(url.hostname);
  } catch {
    return false;
  }
}

function getDocSource(doc, sourceMode = "guide") {
  if (!doc) {
    return null;
  }

  if (sourceMode === "standard" && doc.specUrl) {
    return {
      url: doc.specUrl,
      label: doc.specLabel ?? "Standard"
    };
  }

  if (doc.sourceUrl) {
    return {
      url: doc.sourceUrl,
      label: doc.sourceLabel ?? "Guide"
    };
  }

  return null;
}

function getContentBounds() {
  return mainWindow.getContentBounds();
}

function getDefaultSourceBounds() {
  const bounds = getContentBounds();
  return {
    x: Math.floor(bounds.width * 0.66),
    y: 108,
    width: Math.floor(bounds.width * 0.34) - 28,
    height: bounds.height - 136
  };
}

function sanitizeBounds(bounds) {
  if (!bounds || typeof bounds !== "object") {
    return null;
  }

  const content = getContentBounds();
  const x = Math.max(0, Math.min(Math.floor(bounds.x ?? 0), content.width));
  const y = Math.max(0, Math.min(Math.floor(bounds.y ?? 0), content.height));
  const width = Math.max(160, Math.min(Math.floor(bounds.width ?? 0), content.width - x));
  const height = Math.max(160, Math.min(Math.floor(bounds.height ?? 0), content.height - y));

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }

  return { x, y, width, height };
}

function assertAppSender(event) {
  if (!appView || event.sender.id !== appView.webContents.id) {
    throw new Error("Untrusted renderer sender.");
  }
}

function buildFallbackDocument(title, message, sourceUrl) {
  const html = `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        :root { color-scheme: light; }
        body {
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at top, rgba(11, 87, 208, 0.12), transparent 48%),
            linear-gradient(180deg, #eef5ff 0%, #f7f6f2 100%);
          font: 16px/1.6 "Segoe UI", sans-serif;
          color: #132238;
        }
        article {
          width: min(720px, calc(100vw - 48px));
          padding: 28px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(19, 34, 56, 0.08);
          box-shadow: 0 24px 64px rgba(19, 34, 56, 0.12);
        }
        h1 { margin: 0 0 12px; font-size: 24px; }
        p { margin: 0 0 14px; }
        code {
          display: block;
          padding: 12px;
          border-radius: 14px;
          background: #0f172a;
          color: #f8fafc;
          overflow-wrap: anywhere;
        }
      </style>
    </head>
    <body>
      <article>
        <h1>${title}</h1>
        <p>${message}</p>
        <code>${sourceUrl}</code>
      </article>
    </body>
  </html>`;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function ensureSourceView() {
  if (sourceView) {
    return sourceView;
  }

  sourceView = new WebContentsView({
    webPreferences: {
      partition: docsPartition,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  sourceView.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  const guardNavigation = (event, targetUrl) => {
    if (!isTrustedSource(targetUrl)) {
      event.preventDefault();
    }
  };

  sourceView.webContents.on("will-navigate", guardNavigation);
  sourceView.webContents.on("will-redirect", guardNavigation);
  sourceView.webContents.on("did-fail-load", async (_event, _errorCode, errorDescription, validatedUrl, isMainFrame) => {
    if (!isMainFrame || !validatedUrl?.startsWith("http")) {
      return;
    }

    const fallbackUrl = buildFallbackDocument(
      "Official source unavailable",
      `The embedded source could not be loaded. Reason: ${errorDescription || "Unknown network issue"}.`,
      validatedUrl
    );

    await sourceView.webContents.loadURL(fallbackUrl);
  });

  return sourceView;
}

function attachSourceView() {
  const view = ensureSourceView();

  if (!sourceAttached) {
    mainWindow.contentView.addChildView(view);
    sourceAttached = true;
  }

  view.setBounds(sourceBounds ?? getDefaultSourceBounds());
}

function detachSourceView() {
  if (sourceView && sourceAttached) {
    mainWindow.contentView.removeChildView(sourceView);
    sourceAttached = false;
  }
}

async function showSourceUrl(urlString) {
  const view = ensureSourceView();
  attachSourceView();
  await view.webContents.loadURL(urlString);
}

async function hideSourceView() {
  detachSourceView();
  return { visible: false };
}

function updateMainBounds() {
  const bounds = getContentBounds();
  appView.setBounds({
    x: 0,
    y: 0,
    width: bounds.width,
    height: bounds.height
  });

  if (sourceAttached && sourceView) {
    sourceView.setBounds(sourceBounds ?? getDefaultSourceBounds());
  }
}

async function loadMainRenderer() {
  if (rendererDevServer) {
    await appView.webContents.loadURL(rendererDevServer);
    return;
  }

  const indexPath = getRuntimePath("renderer", rendererName, "index.html");
  await appView.webContents.loadFile(indexPath);
}

async function createMainWindow() {
  mainWindow = new BaseWindow({
    width: 1680,
    height: 1040,
    minWidth: 1240,
    minHeight: 760,
    backgroundColor: "#e9eff6",
    title: "Web Study Lab",
    autoHideMenuBar: true
  });

  appView = new WebContentsView({
    webPreferences: {
      preload: getRuntimePath("build", "preload.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  appView.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  appView.webContents.on("will-navigate", (event, targetUrl) => {
    if (rendererDevServer) {
      const devOrigin = new URL(rendererDevServer).origin;

      if (new URL(targetUrl).origin === devOrigin) {
        return;
      }
    }

    event.preventDefault();
  });

  mainWindow.contentView.addChildView(appView);
  updateMainBounds();
  await loadMainRenderer();

  mainWindow.on("resize", updateMainBounds);
  mainWindow.on("closed", () => {
    mainWindow = null;
    appView = null;
    sourceView = null;
    sourceAttached = false;
  });
}

function registerIpcHandlers() {
  ipcMain.handle("docs:search", async (event, filters) => {
    assertAppSender(event);
    const recentDocIds = await store.getRecentDocIds();
    return searchDocs(filters, recentDocIds);
  });

  ipcMain.handle("docs:detail", async (event, docId) => {
    assertAppSender(event);
    const doc = getDocById(docId);

    if (!doc) {
      throw new Error("Document not found.");
    }

    await store.touchRecentDoc(docId);
    return doc;
  });

  ipcMain.handle("docs:open-source", async (event, payload) => {
    assertAppSender(event);
    const doc = getDocById(payload.docId);

    if (!doc) {
      throw new Error("Document not found.");
    }

    const source = getDocSource(doc, payload.sourceMode);

    if (!source || !isTrustedSource(source.url)) {
      await showSourceUrl(
        buildFallbackDocument(
          "Source not mapped",
          "This topic does not have an approved embedded source yet.",
          payload.sourceMode === "standard" ? doc.specUrl ?? "Unavailable" : doc.sourceUrl ?? "Unavailable"
        )
      );

      return { visible: true, sourceUrl: null, sourceLabel: "Unavailable" };
    }

    sourceBounds = sanitizeBounds(payload.bounds) ?? sourceBounds ?? getDefaultSourceBounds();
    await store.touchRecentDoc(payload.docId);
    await showSourceUrl(source.url);
    return { visible: true, sourceUrl: source.url, sourceLabel: source.label };
  });

  ipcMain.handle("docs:hide-source", async (event) => {
    assertAppSender(event);
    return hideSourceView();
  });

  ipcMain.handle("docs:open-external", async (event, payload) => {
    assertAppSender(event);
    const doc = getDocById(payload.docId);

    if (!doc) {
      throw new Error("Document not found.");
    }

    const source = getDocSource(doc, payload.sourceMode);

    if (!source || !isTrustedSource(source.url)) {
      return { opened: false };
    }

    await shell.openExternal(source.url);
    return { opened: true };
  });

  ipcMain.handle("source:set-bounds", async (event, bounds) => {
    assertAppSender(event);
    sourceBounds = sanitizeBounds(bounds) ?? sourceBounds ?? getDefaultSourceBounds();

    if (sourceAttached && sourceView) {
      sourceView.setBounds(sourceBounds);
    }

    return { ok: true };
  });

  ipcMain.handle("notes:get", async (event, docId) => {
    assertAppSender(event);
    return store.getNote(docId);
  });

  ipcMain.handle("notes:save", async (event, payload) => {
    assertAppSender(event);
    return store.saveNote(payload);
  });

  ipcMain.handle("drafts:list", async (event) => {
    assertAppSender(event);
    return store.listDrafts();
  });

  ipcMain.handle("drafts:load", async (event, draftId) => {
    assertAppSender(event);
    return store.loadDraft(draftId);
  });

  ipcMain.handle("drafts:save", async (event, draft) => {
    assertAppSender(event);
    return store.saveDraft(draft);
  });

  ipcMain.handle("drafts:delete", async (event, draftId) => {
    assertAppSender(event);
    return store.deleteDraft(draftId);
  });

  ipcMain.handle("drafts:rename", async (event, payload) => {
    assertAppSender(event);
    return store.renameDraft(payload);
  });
}

app.whenReady().then(async () => {
  store = new JSONStore(app.getPath("userData"));

  const docsSession = session.fromPartition(docsPartition);
  docsSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));

  if (typeof docsSession.setPermissionCheckHandler === "function") {
    docsSession.setPermissionCheckHandler(() => false);
  }

  registerIpcHandlers();
  await createMainWindow();

  app.on("activate", async () => {
    if (!mainWindow) {
      await createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
