(function (lab) {
  "use strict";

  const { messageCounts } = lab;

  class MessageStatistics {
    constructor() {
      this.byType = messageCounts();
      this.total = 0;
      this.delivered = 0;
      this.dropped = 0;
      this.inTransit = 0;
    }

    recordSent(type) {
      this.byType[type] += 1;
      this.total += 1;
      this.inTransit += 1;
    }

    recordArrival(delivered) {
      this.inTransit -= 1;
      if (delivered) this.delivered += 1;
      else this.dropped += 1;
    }
  }

  // A análise teórica é usada pela interface e pelos testes.
  function theoreticalCounts(n, initiator) {
    const d = n - initiator;
    const total = d ** 2 + n - 2;
    return {
      byType: { ELECTION: d * (d + 1) / 2, OK: d * (d - 1) / 2, COORDINATOR: n - 2 },
      total,
      delivered: total - d,
      dropped: d,
    };
  }

  Object.assign(lab, { MessageStatistics, theoreticalCounts });
})(globalThis.ViewLab ??= {});
