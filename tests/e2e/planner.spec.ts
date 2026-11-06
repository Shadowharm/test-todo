import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const TODAY = "2026-11-06";
const TOMORROW = "2026-11-07";
const storageKey = "dayline-tasks-v1";
const storedTask = {
  id: "seed",
  title: "Сохранённая задача",
  description: "",
  date: TODAY,
  time: "",
  done: false,
};

async function setup(page: Page) {
  await page.clock.install({ time: new Date("2026-11-06T12:00:00+03:00") });
  await page.route("https://get.geojs.io/**", (route) =>
    route.fulfill({
      json: { latitude: "55.75", longitude: "37.62", city: "Москва" },
    }),
  );
  await page.route("https://api.open-meteo.com/**", (route) =>
    route.fulfill({ json: { current: { temperature_2m: 5 } } }),
  );
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
}
async function add(page: Page, title: string, date?: string) {
  await page.getByRole("button", { name: "Новая задача", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Название", exact: false })
    .fill(title);
  if (date)
    await page
      .getByRole("dialog")
      .getByLabel("Дата", { exact: false })
      .fill(date);
  await page.getByRole("button", { name: "Добавить в планы" }).click();
}

test.beforeEach(async ({ page }) => {
  await setup(page);
});

test("create, edit, complete, reload, delete, undo and persist deletion", async ({
  page,
}) => {
  await page.goto("./");
  await add(page, "Подготовить демо");
  const title = page.getByRole("button", {
    name: "Изменить название: Подготовить демо",
    exact: true,
  });
  await title.click();
  await page
    .getByRole("textbox", { name: "Изменить название", exact: true })
    .fill("Отправить демо");
  await page
    .getByRole("textbox", { name: "Изменить название", exact: true })
    .press("Enter");
  await page
    .getByRole("button", { name: "Изменить описание: добавить", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Изменить описание", exact: true })
    .fill("Строка 1\nСтрока 2");
  await page
    .getByRole("textbox", { name: "Изменить описание", exact: true })
    .press("ControlOrMeta+Enter");
  await page
    .getByLabel("Отметить «Отправить демо» выполненной", { exact: true })
    .click();
  await page.reload();
  await expect(page.getByText("1 / 1 выполнено")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Изменить описание: Строка 1 Строка 2" }),
  ).toBeVisible();
  await page
    .getByLabel("Удалить задачу «Отправить демо»", { exact: true })
    .click();
  await page.getByRole("button", { name: "Отменить", exact: true }).click();
  await expect(page.getByText("1 / 1 выполнено")).toBeVisible();
  await page
    .getByLabel("Удалить задачу «Отправить демо»", { exact: true })
    .click();
  await page.clock.runFor(5001);
  await expect(
    page.getByRole("button", { name: "Отменить", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("На этот день задач нет")).toBeVisible();
});

test("validation, focus containment and editor cancellation", async ({
  page,
}) => {
  await page.goto("./");
  const opener = page.getByRole("button", {
    name: "Новая задача",
    exact: true,
  });
  await opener.click();
  const dialog = page.getByRole("dialog");
  const title = dialog.getByRole("textbox", { name: "Название" });
  await title.fill("   ");
  await dialog.getByRole("button", { name: "Добавить в планы" }).click();
  await expect(dialog.getByRole("alert")).toContainText("не только пробелы");
  await expect(title).toBeFocused();
  await title.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Закрыть" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Добавить в планы" }),
  ).toBeFocused();
  await dialog.getByRole("textbox", { name: "Описание" }).focus();
  await page.clock.runFor(31000);
  await expect(dialog.getByRole("textbox", { name: "Описание" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await add(page, "Сохранить название");
  await page
    .getByRole("button", { name: "Изменить название: Сохранить название" })
    .click();
  await page
    .getByRole("textbox", { name: "Изменить название", exact: true })
    .fill("Отменить правку");
  await page
    .getByRole("textbox", { name: "Изменить название", exact: true })
    .press("Escape");
  await expect(
    page.getByRole("button", { name: "Изменить название: Сохранить название" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Изменить название: Сохранить название" })
    .click();
  const editor = page.getByRole("textbox", {
    name: "Изменить название",
    exact: true,
  });
  await editor.fill("   ");
  await editor.press("Enter");
  await expect(page.getByRole("alert")).toContainText("не только пробелы");
  await editor.fill("Исправленное название");
  await editor.press("Enter");
  await expect(
    page.getByRole("button", {
      name: "Изменить название: Исправленное название",
    }),
  ).toBeFocused();
});

test("date, time, move button and selected day survive reload", async ({
  page,
}) => {
  await page.goto("./");
  await add(page, "На завтра", TOMORROW);
  await expect(page.getByRole("heading", { name: "7 ноября." })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Изменить название: На завтра" }),
  ).toBeVisible();
  await page
    .getByLabel("Изменить время задачи «На завтра»", { exact: true })
    .fill("09:30");
  await page
    .getByRole("button", { name: "Перенести задачу «На завтра»", exact: true })
    .click();
  await page.getByRole("dialog").getByLabel("Новая дата").fill(TODAY);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Перенести", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Сегодня." })).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Изменить время задачи «На завтра»", { exact: true }),
  ).toHaveValue("09:30");
  await expect(page.getByText("ПРОСРОЧЕНО", { exact: true })).toBeVisible();
});

test("pointer dragging moves a task to another day", async ({ page }) => {
  await page.goto("./");
  await add(page, "Перетащить");
  const handle = await page
    .getByLabel("Перетащить задачу", { exact: true })
    .boundingBox();
  const target = await page
    .getByLabel("суббота, 7 ноября", { exact: true })
    .boundingBox();
  if (!handle || !target) throw Error("Drag targets missing");
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    target.x + target.width / 2,
    target.y + target.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await expect(page.getByText("На этот день задач нет")).toBeVisible();
  await page.getByLabel("суббота, 7 ноября", { exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Изменить название: Перетащить" }),
  ).toBeVisible();
});

test("damaged storage is preserved and failed writes can be retried", async ({
  page,
}) => {
  await page.addInitScript(
    (key) => localStorage.setItem(key, "{broken"),
    storageKey,
  );
  await page.goto("./");
  await expect(page.getByRole("alert")).toContainText("данные повреждены");
  await add(page, "В памяти");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe("{broken");
  await expect(
    page.getByRole("button", { name: "Изменить название: В памяти" }),
  ).toBeVisible();
  await page.evaluate((key) => localStorage.setItem(key, "[]"), storageKey);
  await page.getByRole("button", { name: "Повторить сохранение" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).length,
      storageKey,
    ),
  ).toBe(1);
});

test("storage write error keeps the task in memory", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "dayline-tasks-v1")
        throw new DOMException("Quota", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await page.goto("./");
  await add(page, "Несохранённая задача");
  await expect(page.getByRole("alert")).toContainText("только в этой вкладке");
  await expect(
    page.getByRole("button", {
      name: "Изменить название: Несохранённая задача",
    }),
  ).toBeVisible();
});

test("two tabs preserve sequential additions and share completion", async ({
  page,
  context,
}) => {
  await page.goto("./");
  const second = await context.newPage();
  await setup(second);
  await second.goto("./");
  await add(page, "Из первой вкладки");
  await add(second, "Из второй вкладки");
  await expect(page.getByText("0 / 2 выполнено")).toBeVisible();
  await second
    .getByLabel("Отметить «Из первой вкладки» выполненной", { exact: true })
    .click();
  await expect(page.getByText("1 / 2 выполнено")).toBeVisible();
  await page.reload();
  await expect(page.getByText("1 / 2 выполнено")).toBeVisible();
});

test("long text stays inside the viewport and primary targets are 44px", async ({
  page,
}) => {
  await page.goto("./");
  await add(page, "А".repeat(120));
  await page
    .getByRole("button", { name: "Изменить описание: добавить", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Изменить описание", exact: true })
    .fill("Б".repeat(300));
  await page
    .getByRole("textbox", { name: "Изменить описание", exact: true })
    .press("ControlOrMeta+Enter");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  for (const selector of [".check-button", ".delete-button", ".move-button"]) {
    const box = await page.locator(selector).boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});

test("weather request failure does not block tasks and retry recovers", async ({
  page,
}) => {
  await page.unroute("https://get.geojs.io/**");
  await page.route("https://get.geojs.io/**", (route) => route.abort());
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Повторить загрузку погоды" }),
  ).toBeVisible();
  await add(page, "Без погоды");
  await page.unroute("https://get.geojs.io/**");
  await page.route("https://get.geojs.io/**", (route) =>
    route.fulfill({
      json: { latitude: "55.75", longitude: "37.62", city: "Москва" },
    }),
  );
  await page.getByRole("button", { name: "Повторить загрузку погоды" }).click();
  await expect(page.getByText("Москва ·")).toBeVisible();
});

test("loads existing localStorage tasks without migration", async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, task }) => localStorage.setItem(key, JSON.stringify([task])),
    { key: storageKey, task: storedTask },
  );
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Изменить название: Сохранённая задача" }),
  ).toBeVisible();
});

test("weather request is cancelled after eight seconds", async ({ page }) => {
  await page.unroute("https://get.geojs.io/**");
  await page.route("https://get.geojs.io/**", () => {});
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "Загрузка погоды", exact: true }),
  ).toBeDisabled();
  await page.clock.runFor(8001);
  await expect(
    page.getByRole("button", {
      name: "Повторить загрузку погоды",
      exact: true,
    }),
  ).toBeVisible();
  await add(page, "Работаю без погоды");
  await expect(
    page.getByRole("button", { name: "Изменить название: Работаю без погоды" }),
  ).toBeVisible();
});

test("past dates are explained and maximum text lengths are enforced", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Новая задача", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const title = dialog.getByRole("textbox", { name: "Название" });
  await title.fill("Задача");
  await dialog.getByLabel("Дата", { exact: false }).fill("2026-11-05");
  await dialog.getByRole("button", { name: "Добавить в планы" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "сегодняшний или будущий",
  );
  await dialog.getByLabel("Дата", { exact: false }).fill(TODAY);
  await expect(title).toHaveAttribute("maxlength", "120");
  await expect(
    dialog.getByRole("textbox", { name: "Описание" }),
  ).toHaveAttribute("maxlength", "300");
  await title.fill("А".repeat(120));
  await dialog.getByRole("textbox", { name: "Описание" }).fill("Б".repeat(300));
  await dialog.getByRole("button", { name: "Добавить в планы" }).click();
  await expect(page.getByText("0 / 1 выполнено")).toBeVisible();
});

test("storage read failure never triggers an empty overwrite", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      if (key === "dayline-tasks-v1")
        throw new DOMException("Denied", "SecurityError");
      return getItem.call(this, key);
    };
  });
  await page.goto("./");
  await expect(page.getByRole("alert")).toContainText("Не удалось прочитать");
  await add(page, "Только в памяти");
  await expect(
    page.getByRole("button", { name: "Изменить название: Только в памяти" }),
  ).toBeVisible();
});
