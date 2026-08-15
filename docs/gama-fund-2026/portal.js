/* Hallmark interaction layer — AfiliAds Gama Fund Investment Room — 2026-08-10 */
(function () {
  "use strict";

  const scenarios = {
    conservative: {
      name: "Conservador",
      note: "Caixa orientado por validação, baixa contratação antecipada e aquisição predominantemente orgânica.",
      clients: "78",
      mrr: "R$ 51.324",
      arr: "R$ 615.888",
      revenue: "R$ 238.854",
      contribution: "R$ 179.141",
      active: [0, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78]
    },
    base: {
      name: "Base",
      note: "Crescimento validado por pilotos, com aquisição disciplinada e expansão gradual de agências.",
      clients: "245",
      mrr: "R$ 244.265",
      arr: "R$ 2.931.180",
      revenue: "R$ 1.015.943",
      contribution: "R$ 761.957",
      active: [0, 5, 12, 22, 35, 50, 70, 95, 125, 160, 200, 245]
    },
    scale: {
      name: "Escala",
      note: "Hipótese de forte adoção em agências, expansão por capacidade e máquina comercial repetível.",
      clients: "600",
      mrr: "R$ 703.200",
      arr: "R$ 8.438.400",
      revenue: "R$ 2.828.036",
      contribution: "R$ 2.121.027",
      active: [0, 8, 20, 40, 70, 110, 160, 225, 300, 390, 490, 600]
    }
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const metricNodes = new Map(
    Array.from(document.querySelectorAll("[data-metric]")).map((node) => [node.dataset.metric, node])
  );
  const chart = document.getElementById("chart-plot");
  const scenarioName = document.getElementById("scenario-name");
  const scenarioNote = document.getElementById("scenario-note");
  const scenarioButtons = Array.from(document.querySelectorAll("[data-scenario]"));

  function renderChart(values) {
    if (!chart) return;
    const max = Math.max(...values, 1);
    const fragment = document.createDocumentFragment();

    values.forEach((value, index) => {
      const bar = document.createElement("div");
      const ratio = value === 0 ? 0.004 : value / max;
      bar.className = `chart-bar${value === 0 ? " is-zero" : ""}`;
      bar.style.setProperty("--ratio", ratio.toFixed(4));
      bar.style.setProperty("--value-position", `${(ratio * 100).toFixed(2)}%`);
      bar.setAttribute("role", "img");
      bar.setAttribute("aria-label", `Mês ${index + 1}: ${value} clientes ativos`);

      if (value > 0) {
        const label = document.createElement("span");
        label.textContent = String(value);
        bar.appendChild(label);
      }
      fragment.appendChild(bar);
    });

    chart.replaceChildren(fragment);
  }

  function activateScenario(key, shouldAnnounce) {
    const scenario = scenarios[key];
    if (!scenario) return;

    scenarioButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.scenario === key));
    });
    if (scenarioName) scenarioName.textContent = scenario.name;
    if (scenarioNote) scenarioNote.textContent = scenario.note;
    metricNodes.forEach((node, metric) => {
      if (scenario[metric]) node.textContent = scenario[metric];
    });
    renderChart(scenario.active);

    if (shouldAnnounce) {
      document.getElementById("financas")?.setAttribute("data-active-scenario", scenario.name);
    }
  }

  scenarioButtons.forEach((button) => {
    button.addEventListener("click", () => activateScenario(button.dataset.scenario, true));
  });
  activateScenario("base", false);

  const search = document.getElementById("portal-search");
  const searchStatus = document.getElementById("search-status");
  const documentRows = Array.from(document.querySelectorAll(".searchable-item"));
  const emptySearch = document.querySelector(".empty-search");

  function normalize(value) {
    return value
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function filterDocuments() {
    if (!search || !searchStatus) return;
    const query = normalize(search.value);
    let visible = 0;

    documentRows.forEach((row) => {
      const haystack = normalize(`${row.dataset.search || ""} ${row.textContent || ""}`);
      const matches = !query || haystack.includes(query);
      row.hidden = !matches;
      if (matches) visible += 1;
    });

    searchStatus.textContent = query
      ? `${visible} ${visible === 1 ? "documento encontrado" : "documentos encontrados"} para “${search.value.trim()}”.`
      : `${documentRows.length} documentos disponíveis.`;
    if (emptySearch) emptySearch.hidden = visible !== 0;
  }

  search?.addEventListener("input", filterDocuments);
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
    if (event.key === "/" && !isTyping) {
      event.preventDefault();
      search?.focus();
    }
    if (event.key === "Escape" && document.activeElement === search) {
      search.value = "";
      filterDocuments();
      search.blur();
    }
  });

  const menuButton = document.querySelector(".mobile-menu");
  const menuScrim = document.querySelector(".menu-scrim");
  const railLinks = Array.from(document.querySelectorAll(".rail-nav a"));
  const deadlineCountdown = document.getElementById("deadline-countdown");

  function setCurrentNav(sectionId) {
    if (!sectionId) return;
    railLinks.forEach((link) => {
      if (link.dataset.nav === sectionId) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  if (deadlineCountdown) {
    const deadline = new Date("2026-09-28T23:59:59-03:00");
    const remainingDays = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000));
    deadlineCountdown.textContent = Date.now() > deadline.getTime()
      ? "Prazo encerrado — confirme eventuais atualizações no site oficial."
      : `${remainingDays} ${remainingDays === 1 ? "dia restante" : "dias restantes"} · prazo confirmado no site oficial.`;
  }

  function setMenu(open, restoreFocus = false) {
    document.body.classList.toggle("menu-open", open);
    menuButton?.setAttribute("aria-expanded", String(open));
    if (open) railLinks.find((link) => link.getAttribute("aria-disabled") !== "true")?.focus();
    if (!open && restoreFocus) menuButton?.focus();
  }
  menuButton?.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  menuScrim?.addEventListener("click", () => setMenu(false));
  railLinks.forEach((link) => link.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("menu-open")) {
      event.preventDefault();
      setMenu(false, true);
    }
  });
  function syncHashNavigation() {
    setMenu(false);
    setCurrentNav(window.location.hash.replace(/^#/, ""));
  }
  window.addEventListener("hashchange", syncHashNavigation);
  syncHashNavigation();
  window.matchMedia("(min-width: 881px)").addEventListener("change", (event) => {
    if (event.matches) setMenu(false);
  });

  const observedSections = Array.from(document.querySelectorAll("[id].content-section"));
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      setCurrentNav(visible.target.id);
    }, { rootMargin: "-15% 0px -62%", threshold: [0.05, 0.2, 0.5] });
    observedSections.forEach((section) => observer.observe(section));
  }

  const progressBar = document.querySelector(".reading-progress span");
  let ticking = false;
  function updateProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    if (progressBar) progressBar.style.transform = `scaleX(${ratio})`;
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    if (reduceMotion) updateProgress();
    else window.requestAnimationFrame(updateProgress);
  }, { passive: true });
  updateProgress();
})();
