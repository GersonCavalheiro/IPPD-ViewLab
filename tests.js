"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");

for (const file of ["message", "node", "statistics", "simulator", "playback"]) require(`./${file}.js`);

const {
  EVENT, MESSAGE, MESSAGE_STATUS, NODE_COUNT, ORIGINAL_LEADER, Playback,
  Simulator, STATE, theoreticalCounts,
} = globalThis.ViewLab;

// Referências independentes da implementação dos contadores e das fórmulas.
const cases = [
  [1, 120, 105, 14, 239, 15],
  [2, 105, 91, 14, 210, 14],
  [3, 91, 78, 14, 183, 13],
  [4, 78, 66, 14, 158, 12],
  [5, 66, 55, 14, 135, 11],
  [6, 55, 45, 14, 114, 10],
  [7, 45, 36, 14, 95, 9],
  [8, 36, 28, 14, 78, 8],
  [9, 28, 21, 14, 63, 7],
  [10, 21, 15, 14, 50, 6],
  [11, 15, 10, 14, 39, 5],
  [12, 10, 6, 14, 30, 4],
  [13, 6, 3, 14, 23, 3],
  [14, 3, 1, 14, 18, 2],
  [15, 1, 0, 14, 15, 1],
];

function verifyCounters(simulator) {
  const { stats } = simulator;
  assert.equal(stats.total, stats.delivered + stats.dropped + stats.inTransit);
  assert.equal(stats.total, simulator.messages.size);
  assert.equal(stats.inTransit, simulator.inTransit.size);
  assert.equal(stats.total, Object.values(stats.byType).reduce((sum, count) => sum + count, 0));
}

function runManually(playback, initiator) {
  let iterations = 0;
  while (playback.simulator.status !== "complete") {
    assert.equal(playback.step(initiator).length, 1);
    verifyCounters(playback.simulator);
    assert.ok(++iterations < 350, "Eleição excedeu o limite de eventos previsto para esta rede.");
  }
}

function runContinuously(playback, initiator) {
  playback.start(initiator);
  let iterations = 0;
  while (playback.playing) {
    playback.advance(37);
    verifyCounters(playback.simulator);
    assert.ok(++iterations < 600, "Execução contínua excedeu o tempo previsto.");
  }
}

function snapshot(simulator) {
  return {
    clock: simulator.clock,
    result: simulator.result,
    stats: simulator.stats,
    history: simulator.history,
    messages: [...simulator.messages.values()],
    nodes: [...simulator.nodes.values()],
  };
}

function verifyProtocol(simulator, initiator) {
  const { nodes, messages, result, history } = simulator;
  const allMessages = [...messages.values()];
  const active = [...nodes.values()].filter((node) => node.available);
  assert.equal(active.length, 15);
  assert.equal(nodes.get(ORIGINAL_LEADER).state, STATE.FAILED);
  assert.equal(result.leader, 15);
  assert.equal(result.time, initiator === 15 ? 4 : 5);
  assert.equal(result.recognized, active.length);
  assert.deepEqual(active.filter((node) => node.state === STATE.LEADER).map((node) => node.id), [15]);
  assert.ok(active.every((node) => node.knownLeader === 15 && !node.electionInProgress));
  assert.ok([...nodes.values()].every((node) => Object.values(node.timeouts).every((id) => id === null)));
  assert.equal(simulator.nextEvent(), undefined);

  assert.equal(new Set(allMessages.map((message) => message.id)).size, messages.size);
  for (const message of allMessages) {
    assert.notEqual(message.from, ORIGINAL_LEADER);
    assert.equal(message.arrivalAt, message.sentAt + 1);
    assert.equal(message.resolvedAt, message.arrivalAt);
    assert.equal(message.status, message.to === ORIGINAL_LEADER ? MESSAGE_STATUS.DROPPED : MESSAGE_STATUS.DELIVERED);
    assert.equal(message.deliveredAt, message.to === ORIGINAL_LEADER ? null : message.arrivalAt);

    if (message.type === MESSAGE.ELECTION) {
      assert.ok(message.from < message.to);
      const replies = allMessages.filter((reply) =>
        reply.type === MESSAGE.OK && reply.from === message.to && reply.to === message.from
      );
      assert.equal(replies.length, message.to === ORIGINAL_LEADER ? 0 : 1);
      if (replies.length) assert.equal(replies[0].sentAt, message.deliveredAt);
    }
  }

  for (const node of nodes.values()) {
    for (const type of Object.values(MESSAGE)) {
      assert.equal(node.sent[type],
        allMessages.filter((message) => message.from === node.id && message.type === type).length);
      assert.equal(node.received[type], allMessages.filter((message) =>
        message.to === node.id && message.type === type && message.status === MESSAGE_STATUS.DELIVERED
      ).length);
    }
  }

  const elections = history.filter((entry) => entry.type === "Eleição");
  assert.equal(elections.length, NODE_COUNT - initiator);
  assert.equal(new Set(elections.map((event) => event.from)).size, elections.length);
  assert.deepEqual(history.filter((entry) => entry.type === "Detecção").map((event) => event.from), [initiator]);
  assert.equal(history.filter((entry) => entry.type === "Timeout").length, 1);
  assert.ok(history.filter((entry) => entry.type === "Timeout").every((entry) => entry.description.endsWith("OK.")));
  assert.equal(history.at(-1).type, "Encerramento");
  history.forEach((entry, index) => {
    assert.equal(entry.sequence, index + 1);
    if (index > 0) assert.ok(entry.time >= history[index - 1].time);
  });
  const sends = history.filter((entry) => entry.type === "Envio");
  const arrivals = history.filter((entry) => entry.type === "Entrega" || entry.type === "Descarte");
  const ids = allMessages.map((message) => message.id);
  assert.deepEqual(sends.map(({ messageId }) => messageId), ids);
  assert.deepEqual(arrivals.map(({ messageId }) => messageId).sort((a, b) => a - b), ids);
}

for (const [initiator, election, ok, coordinator, total, dropped] of cases) {
  test(`Nó ${initiator}: protocolo, contabilidade e equivalência entre passo e reprodução`, () => {
    const manual = new Simulator();
    runManually(new Playback(manual), initiator);
    verifyProtocol(manual, initiator);

    const expected = {
      byType: { ELECTION: election, OK: ok, COORDINATOR: coordinator },
      total, dropped, delivered: total - dropped,
    };
    assert.deepEqual(theoreticalCounts(NODE_COUNT, initiator), expected);
    assert.deepEqual({ ...manual.stats }, { ...expected, inTransit: 0 });

    for (const speed of [0.25, 1, 2]) {
      const continuous = new Simulator();
      const playback = new Playback(continuous);
      playback.speed = speed;
      runContinuously(playback, initiator);
      assert.deepEqual(snapshot(continuous), snapshot(manual));
    }

    const resumed = new Simulator();
    const interrupted = new Playback(resumed);
    interrupted.start(initiator);
    interrupted.advance(250);
    interrupted.pause();
    const pausedAt = interrupted.previewTime;
    const previousLength = resumed.history.length;
    assert.deepEqual(interrupted.advance(15_000), []);
    assert.equal(interrupted.previewTime, pausedAt);
    assert.equal(resumed.history.length, previousLength);
    interrupted.resume();
    interrupted.speed = 2;
    while (interrupted.playing) {
      interrupted.advance(47);
      verifyCounters(resumed);
    }
    assert.deepEqual(snapshot(resumed), snapshot(manual));
  });
}

test("Reiniciar limpa relógio, fila, histórico, contadores, identificadores e estado local", () => {
  const simulator = new Simulator();
  const playback = new Playback(simulator);
  const fresh = snapshot(new Simulator());
  playback.start(1);
  playback.advance(1700);
  assert.ok(simulator.inTransit.size);
  assert.notEqual(playback.previewTime, 0);
  playback.reset();
  assert.equal(simulator.status, "idle");
  assert.equal(simulator.initiator, null);
  assert.equal(simulator.inTransit.size, 0);
  assert.equal(simulator.nextEvent(), undefined);
  assert.equal(simulator.nextEventId, 1);
  assert.equal(simulator.nextMessageId, 1);
  assert.equal(playback.previewTime, 0);
  assert.equal(playback.playing, false);
  assert.deepEqual(snapshot(simulator), fresh);
  runManually(playback, 15);
  verifyProtocol(simulator, 15);
  playback.reset();
  assert.deepEqual(snapshot(simulator), fresh);
});

test("A entrega de OK prevalece sobre o timeout marcado para o mesmo instante", () => {
  const simulator = new Simulator({ ok: 2 });
  simulator.start(14);
  let event;
  const simultaneous = [];
  while ((event = simulator.step())) {
    if (event.time === 2) simultaneous.push(event);
  }
  assert.ok(simultaneous.some((item) => item.type === EVENT.DELIVERY &&
    simulator.messages.get(item.data.messageId).type === MESSAGE.OK));
  assert.ok(!simultaneous.some((item) => item.type === EVENT.TIMEOUT && item.node === 14));
  assert.equal(simulator.result.leader, 15);
});

test("O timeout de COORDINATOR reinicia uma eleição quando o anúncio ainda não chegou", () => {
  const simulator = new Simulator({ coordinator: 1 });
  simulator.start(14);
  let event;
  do {
    event = simulator.step();
    assert.ok(event, "Timeout de COORDINATOR ausente.");
  } while (event.type !== EVENT.TIMEOUT || event.data.kind !== MESSAGE.COORDINATOR);

  assert.equal(event.node, 14);
  assert.equal(event.time, 3);
  assert.equal(simulator.nodes.get(14).state, STATE.ELECTING);
  assert.notEqual(simulator.nodes.get(14).timeouts.OK, null);
  assert.deepEqual(simulator.history.filter((entry) => entry.type === "Eleição" && entry.from === 14)
    .map((entry) => entry.time), [0, 3]);
});

test("A simulação rejeita um identificador inválido e impede reiniciar por cima de uma eleição", () => {
  const simulator = new Simulator();
  for (const id of [0, 16, 3.5, "1"]) assert.throws(() => simulator.start(id), RangeError);
  assert.equal(simulator.start(1), true);
  assert.equal(simulator.start(2), false);
  assert.equal(simulator.initiator, 1);
});
