import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_STATE = {
  notes: {},
  drafts: [],
  recentDocIds: []
};

export class JSONStore {
  constructor(userDataPath) {
    this.filePath = path.join(userDataPath, "web-study-lab.json");
    this.state = structuredClone(DEFAULT_STATE);
    this.ready = this.initialize();
    this.writeChain = Promise.resolve();
  }

  async initialize() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      this.state = {
        notes: parsed.notes ?? {},
        drafts: parsed.drafts ?? [],
        recentDocIds: parsed.recentDocIds ?? []
      };
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }

      await this.persist();
    }
  }

  async persist() {
    const tempPath = `${this.filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(this.state, null, 2), "utf8");
    await fs.rename(tempPath, this.filePath);
  }

  async enqueueWrite(mutator) {
    await this.ready;
    const operation = async () => {
      const result = await mutator(this.state);
      await this.persist();
      return result;
    };

    this.writeChain = this.writeChain.then(operation, operation);
    return this.writeChain;
  }

  async getNote(docId) {
    await this.ready;
    return this.state.notes[docId] ?? null;
  }

  async saveNote({ docId, contentMarkdown }) {
    return this.enqueueWrite((state) => {
      const trimmed = contentMarkdown.trim();

      if (!trimmed) {
        delete state.notes[docId];
        return null;
      }

      const note = {
        noteId: state.notes[docId]?.noteId ?? randomUUID(),
        docId,
        contentMarkdown,
        updatedAt: new Date().toISOString()
      };

      state.notes[docId] = note;
      return note;
    });
  }

  async listDrafts() {
    await this.ready;
    return [...this.state.drafts]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(({ draftId, title, updatedAt, templateId }) => ({
        draftId,
        title,
        updatedAt,
        templateId
      }));
  }

  async loadDraft(draftId) {
    await this.ready;
    return this.state.drafts.find((draft) => draft.draftId === draftId) ?? null;
  }

  async saveDraft(input) {
    return this.enqueueWrite((state) => {
      const draftId = input.draftId ?? randomUUID();
      const now = new Date().toISOString();
      const nextDraft = {
        draftId,
        title: input.title?.trim() || "Untitled Draft",
        html: input.html ?? "",
        css: input.css ?? "",
        javascript: input.javascript ?? "",
        templateId: input.templateId ?? "blank",
        updatedAt: now
      };

      const index = state.drafts.findIndex((draft) => draft.draftId === draftId);

      if (index === -1) {
        state.drafts.unshift(nextDraft);
      } else {
        state.drafts[index] = nextDraft;
      }

      return nextDraft;
    });
  }

  async deleteDraft(draftId) {
    return this.enqueueWrite((state) => {
      const previousLength = state.drafts.length;
      state.drafts = state.drafts.filter((draft) => draft.draftId !== draftId);
      return previousLength !== state.drafts.length;
    });
  }

  async renameDraft({ draftId, title }) {
    return this.enqueueWrite((state) => {
      const draft = state.drafts.find((entry) => entry.draftId === draftId);

      if (!draft) {
        return null;
      }

      draft.title = title?.trim() || draft.title;
      draft.updatedAt = new Date().toISOString();
      return draft;
    });
  }

  async getRecentDocIds() {
    await this.ready;
    return [...this.state.recentDocIds];
  }

  async touchRecentDoc(docId) {
    return this.enqueueWrite((state) => {
      state.recentDocIds = [docId, ...state.recentDocIds.filter((entry) => entry !== docId)].slice(0, 10);
      return state.recentDocIds;
    });
  }
}

