const { test, expect } = require("@playwright/test");
const { launchApp, selectDocument } = require("./electron-app");

test("renders the initial details panel without layout regressions", async ({}, testInfo) => {
  const { electronApp, page } = await launchApp(testInfo);

  try {
    await selectDocument(page, "table", "html-table");
    await expect(page.locator("#detailCard h3")).toHaveText("table");
    await expect(page.locator(".detail-panel")).toHaveScreenshot("detail-panel-initial.png");
  } finally {
    await electronApp.close();
  }
});

test("keeps the long code example contained inside the details code block", async ({}, testInfo) => {
  const { electronApp, page } = await launchApp(testInfo);

  try {
    await selectDocument(page, "section", "html-section");
    await expect(page.locator("#detailCard h3")).toHaveText("section");
    await page.locator(".code-block-scroll").evaluate((element) => {
      element.scrollLeft = Math.round(element.scrollWidth * 0.35);
    });
    await expect(page.locator("#detailCard .info-block")).toHaveScreenshot("detail-code-block-long-line.png");
  } finally {
    await electronApp.close();
  }
});
