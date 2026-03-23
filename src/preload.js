import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("learningApp", {
  searchDocs: (filters = {}) => ipcRenderer.invoke("docs:search", filters),
  getDocDetail: (docId) => ipcRenderer.invoke("docs:detail", docId),
  openEmbeddedSource: (payload) => ipcRenderer.invoke("docs:open-source", payload),
  hideEmbeddedSource: () => ipcRenderer.invoke("docs:hide-source"),
  openExternalSource: (payload) => ipcRenderer.invoke("docs:open-external", payload),
  saveNote: (payload) => ipcRenderer.invoke("notes:save", payload),
  getNote: (docId) => ipcRenderer.invoke("notes:get", docId),
  saveDraft: (draft) => ipcRenderer.invoke("drafts:save", draft),
  listDrafts: () => ipcRenderer.invoke("drafts:list"),
  loadDraft: (draftId) => ipcRenderer.invoke("drafts:load", draftId),
  deleteDraft: (draftId) => ipcRenderer.invoke("drafts:delete", draftId),
  renameDraft: (payload) => ipcRenderer.invoke("drafts:rename", payload),
  setEmbeddedViewBounds: (bounds) => ipcRenderer.invoke("source:set-bounds", bounds)
});
