import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("../artifacts/", import.meta.url));
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  locale: "ru-RU",
  timezoneId: "Europe/Moscow",
  recordVideo: { dir: directory, size: { width: 1280, height: 900 } },
});
const page = await context.newPage();
await page.route("https://get.geojs.io/**", (route) =>
  route.fulfill({
    json: { latitude: "55.75", longitude: "37.62", city: "Москва" },
  }),
);
await page.route("https://api.open-meteo.com/**", (route) =>
  route.fulfill({ json: { current: { temperature_2m: 5 } } }),
);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const video = page.video();
try {
  await page.goto(process.env.DEMO_URL || "http://127.0.0.1:4173/");
  await page
    .getByRole("button", { name: "Новая задача", exact: true })
    .waitFor();
  await pause(4000);
  await page.getByRole("button", { name: "Новая задача", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Название" })
    .pressSequentially("Подготовить демо", { delay: 90 });
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Описание" })
    .pressSequentially("Показать готовый список задач рекрутеру", {
      delay: 50,
    });
  await pause(3000);
  await page.getByRole("button", { name: "Добавить в планы" }).click();
  await pause(5000);
  await page
    .getByRole("button", { name: "Изменить название: Подготовить демо" })
    .click();
  await page
    .getByRole("textbox", { name: "Изменить название", exact: true })
    .fill("Отправить демо");
  await pause(2000);
  await page
    .getByRole("textbox", { name: "Изменить название", exact: true })
    .press("Enter");
  await pause(4000);
  await page
    .getByLabel("Отметить «Отправить демо» выполненной", { exact: true })
    .click();
  await pause(3000);
  await page.reload();
  await pause(5000);
  await page
    .getByLabel("Перенести задачу «Отправить демо»", { exact: true })
    .click();
  const tomorrow = await page.evaluate(() => {
    const day = new Date();
    day.setDate(day.getDate() + 1);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  });
  await page.getByRole("dialog").getByLabel("Новая дата").fill(tomorrow);
  await pause(4000);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Перенести", exact: true })
    .click();
  await pause(4000);
  await page.reload();
  await pause(4000);
  await page
    .getByLabel("Удалить задачу «Отправить демо»", { exact: true })
    .click();
  await pause(2500);
  await page.getByRole("button", { name: "Отменить", exact: true }).click();
  await pause(4000);
  await page.screenshot({ path: `${directory}desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await pause(7000);
  await page.screenshot({ path: `${directory}mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await pause(6000);
} finally {
  await context.close();
  await video.saveAs(`${directory}dayline-demo.webm`);
  await browser.close();
}
console.log(`Demo and screenshots saved in ${directory}`);
