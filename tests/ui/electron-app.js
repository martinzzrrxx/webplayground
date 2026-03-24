const fs = require("node:fs/promises");
const path = require("node:path");
const { _electron: electron } = require("@playwright/test");

const executablePath = path.join(
  __dirname,
  "..",
  "..",
  "out",
  "Web Study Lab-win32-x64",
  "WebStudyLab.exe"
);

async function launchApp(testInfo) {
  const userDataRoot = testInfo.outputPath("appdata");
  await fs.mkdir(userDataRoot, { recursive: true });

  const electronApp = await electron.launch({
    executablePath,
    env: {
      ...process.env,
      APPDATA: userDataRoot,
      LOCALAPPDATA: userDataRoot
    }
  });

  const page = await electronApp.firstWindow();
  await page.setViewportSize({ width: 1680, height: 1040 });
  await page.locator("#resultsList [data-doc-id]").first().waitFor();
  await page.locator("#detailCard .code-block-frame").waitFor();
  return { electronApp, page };
}

async function selectDocument(page, query, docId) {
  const searchInput = page.locator("#searchInput");
  await searchInput.fill(query);
  await page.locator(`#resultsList [data-doc-id="${docId}"]`).click();
  await page.locator(`#resultsList [data-doc-id="${docId}"].is-selected`).waitFor();
}

module.exports = {
  launchApp,
  selectDocument
};
