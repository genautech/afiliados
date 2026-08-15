const endpoint = process.env.CDP_ENDPOINT || "http://127.0.0.1:9227/json";
const pages = await fetch(endpoint).then((response) => response.json());
const page = pages.find((entry) => entry.type === "page" && entry.url.includes("127.0.0.1:8765"));
if (!page) throw new Error("Página da investment room não encontrada no Chrome.");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let requestId = 0;
const pending = new Map();
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++requestId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const pause = (duration = 350) => new Promise((resolve) => setTimeout(resolve, duration));
const evaluate = async (expression) => {
  const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return result.result.value;
};

await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await call("Page.navigate", { url: "http://127.0.0.1:8765/index.html#google" });
await pause(700);
const mobile = await evaluate(`(() => {
  const search = document.querySelector('#portal-search');
  search.value = 'mercado';
  search.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('[data-scenario="scale"]').click();
  document.querySelector('.mobile-menu').click();
  const opened = document.body.classList.contains('menu-open');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  return {
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    hash: location.hash,
    googleCurrent: document.querySelector('[data-nav="google"]')?.getAttribute('aria-current'),
    searchMatches: [...document.querySelectorAll('.searchable-item')].filter((item) => !item.hidden).length,
    scaleClients: document.querySelector('[data-metric="clients"]')?.textContent,
    menuOpened: opened,
    menuClosedWithEscape: !document.body.classList.contains('menu-open'),
    countdown: document.querySelector('#deadline-countdown')?.textContent
  };
})()`);

await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await call("Page.navigate", { url: "http://127.0.0.1:8765/index.html#google" });
await pause(500);
const desktop = await evaluate(`({
  viewport: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
  hash: location.hash,
  googleCurrent: document.querySelector('[data-nav="google"]')?.getAttribute('aria-current'),
  favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href')
})`);

console.log(JSON.stringify({ mobile, desktop }, null, 2));
socket.close();
