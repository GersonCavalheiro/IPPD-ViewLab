(function (lab) {
  "use strict";

  const MILLISECONDS_PER_UNIT = 1000;

  class Playback {
    constructor(simulator) {
      this.simulator = simulator;
      this.playing = false;
      this.speed = 1;
      this.progress = 0;
    }

    get previewTime() {
      return this.simulator.clock + this.progress;
    }

    start(initiator) {
      this.playing = this.simulator.start(initiator) || this.playing;
      return this.advance(0);
    }

    pause() {
      this.playing = false;
    }

    resume() {
      this.playing = this.simulator.status === "active";
    }

    step(initiator) {
      this.pause();
      if (this.simulator.status === "idle") this.simulator.start(initiator);
      this.progress = 0;
      const event = this.simulator.step();
      return event ? [event] : [];
    }

    reset() {
      this.pause();
      this.progress = 0;
      this.simulator.reset();
    }

    advance(elapsedMilliseconds) {
      const processed = [];
      if (!this.playing) return processed;
      let units = elapsedMilliseconds * this.speed / MILLISECONDS_PER_UNIT;

      while (this.simulator.status === "active") {
        const remaining = Math.max(0, this.simulator.nextEvent().time - this.previewTime);
        if (units < remaining) {
          this.progress += units;
          break;
        }

        units -= remaining;
        this.progress = 0;
        processed.push(this.simulator.step());
      }

      if (this.simulator.status === "complete") this.pause();
      return processed;
    }
  }

  lab.Playback = Playback;
})(globalThis.ViewLab ??= {});
