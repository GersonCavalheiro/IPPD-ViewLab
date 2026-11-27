(function (lab) {
  "use strict";

  const { MESSAGE, messageCounts } = lab;
  const STATE = Object.freeze({
    NORMAL: "Normal",
    ELECTING: "Em eleição",
    WAITING: "Aguardando novo líder",
    LEADER: "Líder",
    FAILED: "Falho",
  });
  const TIMEOUT = Object.freeze({ OK: "OK", COORDINATOR: "COORDINATOR" });

  class BullyNode {
    constructor(id, ids, originalLeader) {
      this.id = id;
      // Os identificadores são conhecidos por todos. A disponibilidade é local.
      this.higherIds = ids.filter((other) => other > id);
      this.lowerIds = ids.filter((other) => other < id);
      this.available = true;
      this.state = id === originalLeader ? STATE.LEADER : STATE.NORMAL;
      this.knownLeader = originalLeader;
      this.responders = new Set();
      this.timeouts = { OK: null, COORDINATOR: null };
      this.sent = messageCounts();
      this.received = messageCounts();
    }

    get electionInProgress() {
      return this.state === STATE.ELECTING || this.state === STATE.WAITING;
    }

    changeState(next, io) {
      if (this.state === next) return;
      const previous = this.state;
      this.state = next;
      io.record("Estado", `Nó ${this.id}: ${previous} → ${next}.`);
    }

    fail(io) {
      this.available = false;
      this.clearTimeouts();
      this.changeState(STATE.FAILED, io);
    }

    clearTimeouts() {
      this.timeouts.OK = null;
      this.timeouts.COORDINATOR = null;
    }

    startElection(io) {
      this.clearTimeouts();
      this.responders.clear();
      io.record("Eleição", `Nó ${this.id} iniciou uma eleição.`);
      this.changeState(STATE.ELECTING, io);
      for (const to of this.higherIds) io.send(MESSAGE.ELECTION, to);
      this.timeouts.OK = io.scheduleTimeout(TIMEOUT.OK);
    }

    receive(message, io) {
      switch (message.type) {
        case MESSAGE.ELECTION:
          io.send(MESSAGE.OK, message.from);
          if (!this.electionInProgress) this.startElection(io);
          break;
        case MESSAGE.OK:
          if (!this.electionInProgress || message.from <= this.id) return;
          this.responders.add(message.from);
          if (this.state === STATE.ELECTING) {
            this.timeouts.OK = null;
            this.changeState(STATE.WAITING, io);
            this.timeouts.COORDINATOR = io.scheduleTimeout(TIMEOUT.COORDINATOR);
          }
          break;
        case MESSAGE.COORDINATOR:
          if (message.from <= this.id) return;
          this.knownLeader = message.from;
          this.clearTimeouts();
          this.changeState(STATE.NORMAL, io);
          io.record("Líder reconhecido", `Nó ${this.id} reconhece o nó ${message.from} como líder.`, message);
          break;
      }
    }

    expire(kind, io) {
      this.timeouts[kind] = null;
      if (kind === TIMEOUT.COORDINATOR) {
        this.startElection(io);
        return;
      }

      this.knownLeader = this.id;
      this.changeState(STATE.LEADER, io);
      io.record("Novo líder", `Nó ${this.id} assumiu a liderança após aguardar respostas.`);
      for (const to of this.lowerIds) io.send(MESSAGE.COORDINATOR, to);
    }
  }

  Object.assign(lab, { STATE, TIMEOUT, BullyNode });
})(globalThis.ViewLab ??= {});
