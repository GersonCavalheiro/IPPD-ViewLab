(function (lab) {
  "use strict";

  const { STATE, TIMEOUT, BullyNode, Message, MessageStatistics } = lab;
  const NODE_COUNT = 16;
  const ORIGINAL_LEADER = NODE_COUNT;
  const EVENT = Object.freeze({
    FAIL: "fail",
    DETECT: "detect",
    DELIVERY: "delivery",
    TIMEOUT: "timeout",
  });
  const DEFAULT_TIMING = Object.freeze({ transmission: 1, ok: 3, coordinator: 10 });
  const PRIORITY = Object.freeze({ fail: 0, detect: 1, delivery: 2, timeout: 3 });

  class EventQueue {
    constructor() {
      this.events = [];
    }

    add(event) {
      const index = this.events.findIndex((queued) =>
        queued.time > event.time ||
        (queued.time === event.time && queued.priority > event.priority)
      );
      // A inserção estável desempata eventos da mesma classe pelo identificador.
      if (index === -1) this.events.push(event);
      else this.events.splice(index, 0, event);
    }

    peek() {
      return this.events[0];
    }

    remove() {
      return this.events.shift();
    }
  }

  class Simulator {
    constructor(timing = DEFAULT_TIMING) {
      this.timing = Object.freeze({ ...DEFAULT_TIMING, ...timing });
      this.reset();
    }

    reset() {
      const ids = Array.from({ length: NODE_COUNT }, (_, index) => index + 1);
      this.nodes = new Map(ids.map((id) => [id, new BullyNode(id, ids, ORIGINAL_LEADER)]));
      this.clock = 0;
      this.queue = new EventQueue();
      this.messages = new Map();
      this.inTransit = new Map();
      this.history = [];
      this.stats = new MessageStatistics();
      this.initiator = null;
      this.result = null;
      this.status = "idle";
      this.nextEventId = 1;
      this.nextMessageId = 1;
    }

    start(initiator) {
      if (this.status !== "idle") return false;
      if (!Number.isInteger(initiator) || initiator < 1 || initiator >= ORIGINAL_LEADER) {
        throw new RangeError("O nó iniciador deve estar entre 1 e 15.");
      }
      this.initiator = initiator;
      this.status = "active";
      this.enqueue(EVENT.FAIL, ORIGINAL_LEADER, 0);
      this.enqueue(EVENT.DETECT, initiator, 0);
      return true;
    }

    enqueue(type, node, time, data = {}) {
      const event = { id: this.nextEventId++, time, type, node, data, priority: PRIORITY[type] };
      this.queue.add(event);
      return event.id;
    }

    nextEvent() {
      let event = this.queue.peek();
      while (event?.type === EVENT.TIMEOUT &&
             this.nodes.get(event.node).timeouts[event.data.kind] !== event.id) {
        this.queue.remove();
        event = this.queue.peek();
      }
      return event;
    }

    record(type, description, fields = {}) {
      this.history.push({
        sequence: this.history.length + 1,
        time: this.clock,
        type,
        from: fields.from ?? null,
        to: fields.to ?? null,
        messageType: fields.messageType ?? null,
        messageId: fields.messageId ?? null,
        description,
      });
    }

    nodeInterface(id) {
      return {
        send: (type, destination) => this.send(type, id, destination),
        scheduleTimeout: (kind) => this.enqueue(EVENT.TIMEOUT, id,
          this.clock + (kind === TIMEOUT.OK ? this.timing.ok : this.timing.coordinator), { kind }),
        record: (type, description, message) => this.record(type, description, message ?
          this.messageFields(message) : { from: id }),
      };
    }

    messageFields(message) {
      return { from: message.from, to: message.to, messageType: message.type, messageId: message.id };
    }

    send(type, from, to) {
      const message = new Message(this.nextMessageId++, type, from, to,
        this.clock, this.clock + this.timing.transmission);
      this.messages.set(message.id, message);
      this.inTransit.set(message.id, message);
      this.nodes.get(from).sent[type] += 1;
      this.stats.recordSent(type);
      this.enqueue(EVENT.DELIVERY, to, message.arrivalAt, { messageId: message.id });
      this.record("Envio", `Mensagem #${message.id} enviada.`, this.messageFields(message));
    }

    deliver(node, message, io) {
      const delivered = node.available;
      message.resolve(this.clock, delivered);
      this.inTransit.delete(message.id);
      this.stats.recordArrival(delivered);
      this.record(delivered ? "Entrega" : "Descarte", delivered ?
        `Mensagem #${message.id} entregue.` :
        `Mensagem #${message.id} descartada. O nó ${node.id} está falho.`,
        this.messageFields(message));
      if (delivered) {
        node.received[message.type] += 1;
        node.receive(message, io);
      }
    }

    step() {
      if (this.status !== "active") return null;
      const event = this.nextEvent();
      if (!event) throw new Error("Fila vazia antes de a eleição atingir consenso.");
      this.queue.remove();
      this.clock = event.time;
      const node = this.nodes.get(event.node);
      const io = this.nodeInterface(node.id);

      switch (event.type) {
        case EVENT.FAIL:
          io.record("Falha", `O líder original (nó ${node.id}) sofreu uma falha permanente.`);
          node.fail(io);
          break;
        case EVENT.DETECT:
          this.record("Detecção", `Nó ${node.id} detectou a falha do líder.`,
            { from: node.id, to: ORIGINAL_LEADER });
          node.startElection(io);
          break;
        case EVENT.DELIVERY:
          this.deliver(node, this.messages.get(event.data.messageId), io);
          break;
        case EVENT.TIMEOUT:
          io.record("Timeout", `Nó ${node.id}: expirou a espera por ${event.data.kind}.`);
          node.expire(event.data.kind, io);
          break;
      }

      if (!this.nextEvent()) this.finish();
      return event;
    }

    finish() {
      const active = [...this.nodes.values()].filter((node) => node.available);
      const leaders = active.filter((node) => node.state === STATE.LEADER);
      const leader = leaders[0]?.id;
      const recognized = active.filter((node) => node.knownLeader === leader).length;
      if (leaders.length !== 1 || recognized !== active.length || this.inTransit.size > 0 ||
          active.some((node) => node.electionInProgress) || this.nextEvent()) {
        throw new Error("A eleição encerrou sem atender às condições de consenso.");
      }

      this.result = {
        initiator: this.initiator,
        originalLeader: ORIGINAL_LEADER,
        leader,
        time: this.clock,
        recognized,
        active: active.length,
      };
      this.status = "complete";
      this.record("Encerramento", `Os ${recognized} nós ativos reconhecem o nó ${leader} como líder.`,
        { from: leader });
    }
  }

  Object.assign(lab, { NODE_COUNT, ORIGINAL_LEADER, EVENT, DEFAULT_TIMING, Simulator });
})(globalThis.ViewLab ??= {});
