(function (lab) {
  "use strict";

  const MESSAGE = Object.freeze({
    ELECTION: "ELECTION",
    OK: "OK",
    COORDINATOR: "COORDINATOR",
  });

  const MESSAGE_STATUS = Object.freeze({
    IN_TRANSIT: "em trânsito",
    DELIVERED: "entregue",
    DROPPED: "não entregue",
  });

  class Message {
    constructor(id, type, from, to, sentAt, arrivalAt) {
      Object.assign(this, { id, type, from, to, sentAt, arrivalAt });
      this.deliveredAt = null;
      this.resolvedAt = null;
      this.status = MESSAGE_STATUS.IN_TRANSIT;
    }

    resolve(time, delivered) {
      this.resolvedAt = time;
      this.status = delivered ? MESSAGE_STATUS.DELIVERED : MESSAGE_STATUS.DROPPED;
      if (delivered) this.deliveredAt = time;
    }
  }

  function messageCounts() {
    return { ELECTION: 0, OK: 0, COORDINATOR: 0 };
  }

  Object.assign(lab, { MESSAGE, MESSAGE_STATUS, Message, messageCounts });
})(globalThis.ViewLab ??= {});
