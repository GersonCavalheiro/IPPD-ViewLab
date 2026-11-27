(function (lab) {
  "use strict";

  const { MESSAGE, NODE_COUNT, NetworkView, Playback, Simulator, STATE_STYLE, theoreticalCounts } = lab;
  const messageTypes = Object.values(MESSAGE);
  const simulator = new Simulator();
  const playback = new Playback(simulator);
  const $ = (id) => document.getElementById(id);
  const initiator = $("initiator");
  const speed = $("speed");
  const filters = [$("filter-node"), $("filter-message"), $("filter-event")];
  const nodeIds = [...simulator.nodes.keys()];
  const eventTypes = [
    "Falha", "Detecção", "Eleição", "Envio", "Entrega", "Descarte", "Timeout",
    "Estado", "Novo líder", "Líder reconhecido", "Encerramento",
  ];

  for (const id of nodeIds) {
    if (id < NODE_COUNT) initiator.add(new Option(`Nó ${id}`, id));
    filters[0].add(new Option(`Nó ${id}`, id));
  }
  for (const type of messageTypes) filters[1].add(new Option(type, type));
  for (const type of eventTypes) filters[2].add(new Option(type, type));

  let selected = Number(initiator.value);
  let presentationTime = 0;
  let previousFrame = null;
  let frameRequest = null;
  const network = new NetworkView($("network"), nodeIds, (id) => {
    selected = id;
    updateNetwork();
    updateInspector();
  });

  function element(tag, content, className) {
    const item = document.createElement(tag);
    if (content !== undefined) item.textContent = content;
    if (className) item.className = className;
    return item;
  }

  function tableRow(values, firstIsHeading = false) {
    const row = document.createElement("tr");
    for (const [index, value] of values.entries()) {
      const cell = element(firstIsHeading && index === 0 ? "th" : "td", value ?? "—");
      if (cell.tagName === "TH") cell.scope = "row";
      row.append(cell);
    }
    return row;
  }

  function updateControls() {
    const { status } = simulator;
    const idle = status === "idle";
    const active = status === "active";
    const playing = playback.playing;
    initiator.disabled = active;
    $("start").disabled = !idle;
    $("pause").disabled = !active;
    $("step").disabled = playing || status === "complete";
    $("reset").disabled = idle;
    $("pause").firstElementChild.textContent = active && !playing ? "▶" : "Ⅱ";
    $("pause").lastChild.textContent = active && !playing ? " Continuar" : " Pausar";

    const statusElement = $("simulation-status");
    const displayStatus = active ? (playing ? "playing" : "paused") : status;
    const label = { idle: "Pronta", playing: "Em execução", paused: "Pausada", complete: "Concluída" };
    if (statusElement.dataset.status !== displayStatus) {
      statusElement.dataset.status = displayStatus;
      statusElement.textContent = label[displayStatus];
    }
    $("clock").firstChild.textContent = `${simulator.clock} `;
  }

  function updateMetrics() {
    const { stats } = simulator;
    for (const type of messageTypes) $(`count-${type}`).textContent = stats.byType[type];
    $("total").textContent = stats.total;
    $("delivered").textContent = stats.delivered;
    $("dropped").textContent = stats.dropped;
    $("in-transit").textContent = stats.inTransit;
  }

  function updateInspector() {
    const node = simulator.nodes.get(selected);
    $("node-id").textContent = node.id;
    $("node-state").textContent = node.state;
    $("node-state").dataset.state = STATE_STYLE[node.state];
    $("node-leader").textContent = node.knownLeader;
    $("node-responders").textContent = [...node.responders].sort((a, b) => a - b).join(", ") || "—";
    $("node-counts").replaceChildren(...messageTypes.map((type) =>
      tableRow([type, node.sent[type], node.received[type]], true)
    ));
    const timer = Object.keys(node.timeouts).find((kind) => node.timeouts[kind] !== null);
    $("node-timers").textContent = timer ? `Timeout ativo para ${timer}.` : "Sem timeout ativo.";
  }

  function updateNetwork(events = []) {
    network.updateNodes(simulator, simulator.initiator ?? Number(initiator.value), selected);
    network.updateMessages(simulator, events, presentationTime);
    network.draw(playback.previewTime, presentationTime);
  }

  function updateHistory() {
    const [node, messageType, eventType] = filters.map((filter) => filter.value);
    const nodeId = node ? Number(node) : null;
    const history = simulator.history;
    const matches = history.filter((entry) =>
      (nodeId === null || entry.from === nodeId || entry.to === nodeId) &&
      (!messageType || entry.messageType === messageType) &&
      (!eventType || entry.type === eventType)
    );

    const body = $("history-body");
    const scroll = $("history-scroll");
    const previousScroll = scroll.scrollTop;
    const atBottom = scroll.scrollHeight - scroll.clientHeight - previousScroll < 8;
    if (matches.length) {
      const rows = matches.map((entry) =>
        tableRow([entry.sequence, entry.time, entry.type, entry.from, entry.to, entry.messageType, entry.description])
      );
      body.replaceChildren(...rows);
    } else {
      const row = tableRow([history.length ? "Nenhum evento corresponde aos filtros." : "Inicie a simulação para registrar os eventos."]);
      row.firstChild.colSpan = 7;
      row.firstChild.className = "empty";
      body.replaceChildren(row);
    }
    scroll.scrollTop = atBottom ? scroll.scrollHeight : previousScroll;

    $("event-count").textContent = history.length ?
      `${matches.length} de ${history.length} ${history.length === 1 ? "evento" : "eventos"}` :
      "Nenhum evento registrado";
    $("export").disabled = history.length === 0;
  }

  function exportHistory() {
    const header = ["Sequência", "Tempo lógico", "Evento", "Origem", "Destino",
      "Mensagem", "ID da mensagem", "Descrição"];
    const rows = simulator.history.map(({ sequence, time, type, from, to, messageType, messageId, description }) =>
      [sequence, time, type, from, to, messageType, messageId, description]
    );
    const csv = [header, ...rows].map((row) =>
      row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")
    ).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv, "\r\n"], { type: "text/csv;charset=utf-8" }));
    const link = element("a");
    link.href = url;
    link.download = `viewlab-no-${simulator.initiator}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    // O navegador precisa iniciar o download antes de a URL ser liberada.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function updateResults() {
    const { result, stats, status } = simulator;
    $("result-summary").hidden = !result;
    const label = result ? `Nó ${result.leader} eleito` :
      status === "idle" ? "Aguardando a simulação" : "Aguardando o consenso";
    if ($("results-status").textContent !== label) $("results-status").textContent = label;
    if (!result) {
      $("result-details").replaceChildren();
      $("comparison-body").replaceChildren();
      return;
    }

    const details = [
      ["Nó iniciador", result.initiator],
      ["Líder original", result.originalLeader],
      ["Novo líder", result.leader],
      ["Duração lógica", `${result.time} u.t.`],
      ["Nós que reconhecem o líder", `${result.recognized} de ${result.active} ativos`],
    ];
    $("result-details").replaceChildren(...details.map(([name, value]) => {
      const group = element("div");
      group.append(element("dt", name), element("dd", value));
      return group;
    }));

    const theory = theoreticalCounts(NODE_COUNT, result.initiator);
    const counts = messageTypes.map((type) => [type, stats.byType[type], theory.byType[type]]);
    counts.push(["Total enviado", stats.total, theory.total],
      ["Entregues", stats.delivered, theory.delivered],
      ["Não entregues", stats.dropped, theory.dropped]);
    $("comparison-body").replaceChildren(...counts.map((row) => tableRow(row, true)));
  }

  function updateChart() {
    const selectedId = Number(initiator.value);
    const chart = $("chart");
    const max = Math.ceil(theoreticalCounts(NODE_COUNT, 1).total / 50) * 50;
    const guides = element("div", undefined, "chart-guides");
    const bars = element("div", undefined, "chart-bars");
    const descriptions = [];
    for (let value = 0; value <= max; value += 50) {
      const guide = element("div", undefined, "chart-guide");
      guide.style.bottom = `${value / max * 100}%`;
      guide.append(element("span", value));
      guides.append(guide);
    }

    for (const id of nodeIds.slice(0, -1)) {
      const total = theoreticalCounts(NODE_COUNT, id).total;
      const bar = element("div", undefined, "chart-column");
      bar.style.height = `${total / max * 100}%`;
      bar.title = `Nó ${id} · ${total} mensagens`;
      if (id === selectedId) bar.classList.add("selected");
      bar.append(element("span", id));
      bars.append(bar);
      descriptions.push(`Nó ${id}: ${total}`);
    }
    chart.replaceChildren(guides, bars);
    chart.setAttribute("aria-label", `Mensagens teóricas por nó iniciador. Selecionado: nó ${selectedId}. ${descriptions.join(". ")}.`);
    $("chart-selection").textContent = `Nó ${selectedId} · ${theoreticalCounts(NODE_COUNT, selectedId).total} mensagens`;
  }

  function update(events = []) {
    updateControls();
    updateMetrics();
    updateInspector();
    updateNetwork(events);
    updateHistory();
    updateResults();
  }

  function drawFrame(now) {
    frameRequest = null;
    const elapsed = previousFrame === null ? 0 : Math.min(now - previousFrame, 64);
    previousFrame = now;
    presentationTime += elapsed * playback.speed;
    const events = playback.advance(elapsed);
    if (events.length) update(events);
    else network.draw(playback.previewTime, presentationTime);
    scheduleFrame();
  }

  function scheduleFrame() {
    if (!playback.playing && !(simulator.result && network.effects.length)) {
      previousFrame = null;
      if (frameRequest !== null) cancelAnimationFrame(frameRequest);
      frameRequest = null;
    } else if (frameRequest === null) {
      frameRequest = requestAnimationFrame(drawFrame);
    }
  }

  initiator.addEventListener("change", () => {
    if (simulator.status === "idle") selected = Number(initiator.value);
    updateNetwork();
    updateInspector();
    updateChart();
  });
  speed.addEventListener("change", () => { playback.speed = Number(speed.value); });
  $("start").addEventListener("click", () => {
    update(playback.start(Number(initiator.value)));
    scheduleFrame();
  });
  $("pause").addEventListener("click", () => {
    if (playback.playing) playback.pause();
    else playback.resume();
    updateControls();
    scheduleFrame();
  });
  $("step").addEventListener("click", () => {
    update(playback.step(Number(initiator.value)));
    scheduleFrame();
  });
  $("reset").addEventListener("click", () => {
    playback.reset();
    network.reset();
    selected = Number(initiator.value);
    for (const filter of filters) filter.value = "";
    presentationTime = 0;
    scheduleFrame();
    update();
  });
  for (const filter of filters) filter.addEventListener("change", () => {
    $("history-scroll").scrollTop = 0;
    updateHistory();
    $("history-scroll").scrollTop = 0;
  });
  $("export").addEventListener("click", exportHistory);

  update();
  updateChart();
})(globalThis.ViewLab);
