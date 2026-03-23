import docs from "../data/docs.json";

const indexedDocs = docs.map((doc) => ({
  ...doc,
  _searchable: [
    doc.title,
    ...(doc.keywords ?? []),
    doc.summary,
    ...(doc.anchors ?? []),
    doc.sourceLabel,
    doc.specLabel ?? "",
    doc.exampleSnippet ?? ""
  ]
    .join(" ")
    .toLowerCase()
}));

function matchesFilter(doc, filters) {
  const topic = filters.topic ?? "all";
  const source = filters.source ?? "all";
  const kind = filters.kind ?? "all";

  if (topic !== "all" && doc.topic !== topic) {
    return false;
  }

  if (kind !== "all" && doc.kind !== kind) {
    return false;
  }

  if (source === "guide" && !doc.sourceUrl) {
    return false;
  }

  if (source === "standard" && !doc.specUrl) {
    return false;
  }

  return true;
}

function scoreDoc(doc, terms, recentDocIds) {
  if (!terms.length) {
    const recentIndex = recentDocIds.indexOf(doc.id);
    return recentIndex === -1 ? 0 : 200 - recentIndex * 10;
  }

  let score = 0;

  for (const term of terms) {
    if (doc.title.toLowerCase() === term) {
      score += 50;
    }

    if (doc.title.toLowerCase().includes(term)) {
      score += 20;
    }

    if ((doc.keywords ?? []).some((keyword) => keyword.toLowerCase().includes(term))) {
      score += 14;
    }

    if ((doc.anchors ?? []).some((anchor) => anchor.toLowerCase().includes(term))) {
      score += 10;
    }

    if (doc.summary.toLowerCase().includes(term)) {
      score += 8;
    }

    if ((doc.exampleSnippet ?? "").toLowerCase().includes(term)) {
      score += 4;
    }

    if (doc._searchable.includes(term)) {
      score += 2;
    }
  }

  return score;
}

function toResult(doc, score) {
  return {
    id: doc.id,
    topic: doc.topic,
    kind: doc.kind,
    title: doc.title,
    summary: doc.summary,
    sourceLabel: doc.sourceLabel,
    specLabel: doc.specLabel ?? null,
    sourceType: doc.sourceType,
    hasStandardSource: Boolean(doc.specUrl),
    score
  };
}

export function searchDocs(filters = {}, recentDocIds = []) {
  const query = (filters.query ?? "").trim().toLowerCase();
  const terms = query.split(/\s+/).filter(Boolean);

  return indexedDocs
    .filter((doc) => matchesFilter(doc, filters))
    .map((doc) => ({ doc, score: scoreDoc(doc, terms, recentDocIds) }))
    .filter(({ score }) => terms.length === 0 || score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.doc.title.localeCompare(right.doc.title);
    })
    .slice(0, 40)
    .map(({ doc, score }) => toResult(doc, score));
}

export function getDocById(docId) {
  const doc = indexedDocs.find((entry) => entry.id === docId);

  if (!doc) {
    return null;
  }

  const { _searchable, ...publicDoc } = doc;
  return publicDoc;
}

