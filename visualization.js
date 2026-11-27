(function (lab) {
  "use strict";

  const { EVENT, MESSAGE_STATUS, STATE } = lab;
  const SVG = "http://www.w3.org/2000/svg";
  const CENTER_X = 360;
  const CENTER_Y = 215;
  const ORBIT_RADIUS = 169;
  const DISC_RADIUS = 20;
  const EFFECT_DURATION = 650;
  const STATE_STYLE = {
    [STATE.NORMAL]: "normal",
    [STATE.ELECTING]: "electing",
    [STATE.WAITING]: "waiting",
    [STATE.LEADER]: "leader",
    [STATE.FAILED]: "failed",
  };

  function shape(tag, attributes = {}, label) {
    const element = document.createElementNS(SVG, tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    if (label !== undefined) element.textContent = label;
    return element;
  }

  function transmissionCurve(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    const ux = dx / length;
    const uy = dy / length;
    const gap = DISC_RADIUS + 4;
    const bend = Math.min(36, length * 0.095 + 9);
    return {
      start: { x: from.x + ux * gap, y: from.y + uy * gap },
      control: { x: (from.x + to.x) / 2 - uy * bend, y: (from.y + to.y) / 2 + ux * bend },
      end: { x: to.x - ux * gap, y: to.y - uy * gap },
    };
  }

  class NetworkView {
    constructor(svg, nodeIds, onSelect) {
      this.nodes = new Map();
      this.messages = new Map();
      this.effects = [];
      this.selected = null;

      const orbit = shape("g", { "aria-hidden": "true" });
      for (const radius of [ORBIT_RADIUS, ORBIT_RADIUS + 32]) {
        orbit.append(shape("circle", { class: "orbit", cx: CENTER_X, cy: CENTER_Y, r: radius }));
      }

      this.core = shape("g", { class: "network-core", "aria-hidden": "true" });
      this.coreLabel = shape("text", { x: CENTER_X, y: CENTER_Y - 10 });
      this.coreValue = shape("text", { class: "core-value", x: CENTER_X, y: CENTER_Y + 24 });
      this.core.append(this.coreLabel, this.coreValue);

      this.messageLayer = shape("g", { "aria-hidden": "true" });
      const nodeLayer = shape("g");
      this.effectLayer = shape("g", { "aria-hidden": "true" });
      svg.append(orbit, this.core, this.messageLayer, nodeLayer, this.effectLayer);

      for (const id of nodeIds) {
        const angle = id * 2 * Math.PI / nodeIds.length - Math.PI / 2;
        const x = CENTER_X + Math.cos(angle) * ORBIT_RADIUS;
        const y = CENTER_Y + Math.sin(angle) * ORBIT_RADIUS;
        const group = shape("g", { class: "graph-node", role: "button", tabindex: "0",
          transform: `translate(${x} ${y})` });
        const title = shape("title");
        group.append(title,
          shape("circle", { class: "node-initiator-ring", r: DISC_RADIUS + 8 }),
          shape("circle", { class: "node-selection", r: DISC_RADIUS + 4 }),
          shape("circle", { class: "node-disc", r: DISC_RADIUS }),
          shape("text", { class: "node-number", y: 1 }, String(id)));
        group.addEventListener("click", () => onSelect(id));
        group.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(id);
          }
        });
        nodeLayer.append(group);
        this.nodes.set(id, { x, y, group, title });
      }
    }

    updateNodes(simulator, initiator, selected) {
      this.selected = selected;
      for (const node of simulator.nodes.values()) {
        const { group, title } = this.nodes.get(node.id);
        const isInitiator = node.id === initiator;
        const label = `Nó ${node.id} · ${node.state}${isInitiator ? " · Iniciador" : ""}`;
        group.dataset.state = STATE_STYLE[node.state];
        group.dataset.initiator = isInitiator;
        group.setAttribute("aria-pressed", selected === node.id);
        group.setAttribute("aria-label", label);
        title.textContent = label;
      }

      this.core.style.display = simulator.status === "active" ? "none" : "";
      this.coreLabel.textContent = simulator.result ? "Novo líder" : "Líder original";
      this.coreValue.textContent = `Nó ${simulator.result?.leader ?? lab.ORIGINAL_LEADER}`;
      for (const { group, message } of this.messages.values()) this.highlight(group, message);
    }

    highlight(group, message) {
      group.dataset.related = message.from === this.selected || message.to === this.selected;
    }

    updateMessages(simulator, events, presentationTime) {
      for (const event of events) {
        if (event.type !== EVENT.DELIVERY) continue;
        const message = simulator.messages.get(event.data.messageId);
        this.markArrival(message, presentationTime);
      }

      for (const [id, { group }] of this.messages) {
        if (simulator.inTransit.has(id)) continue;
        group.remove();
        this.messages.delete(id);
      }

      for (const message of simulator.inTransit.values()) {
        if (!this.messages.has(message.id)) this.addMessage(message);
      }
    }

    addMessage(message) {
      const { start, control, end } = this.curveFor(message);
      const group = shape("g", { class: "graph-message", "data-type": message.type });
      const arrow = shape("path", { class: "message-tip", d: "M 7 0 L -6 4.2 L -4 0 L -6 -4.2 Z" });
      group.append(shape("title", {},
        `${message.type} #${message.id} · Nó ${message.from} → Nó ${message.to}`),
      shape("path", { class: "message-path",
        d: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}` }), arrow);
      this.highlight(group, message);
      this.messageLayer.append(group);
      this.messages.set(message.id, { message, group, arrow, start, control, end });
    }

    curveFor(message) {
      return transmissionCurve(this.nodes.get(message.from), this.nodes.get(message.to));
    }

    markArrival(message, presentationTime) {
      const { end } = this.curveFor(message);
      const dropped = message.status === MESSAGE_STATUS.DROPPED;
      const mark = dropped ?
        shape("path", { class: "arrival-effect dropped", d: "M -5 -5 L 5 5 M 5 -5 L -5 5" }) :
        shape("circle", { class: "arrival-effect", r: 5 });
      mark.setAttribute("transform", `translate(${end.x} ${end.y})`);
      this.effectLayer.append(mark);
      this.effects.push({ mark, startedAt: presentationTime, dropped });
    }

    draw(logicalTime, presentationTime) {
      for (const { message, arrow, start, control, end } of this.messages.values()) {
        const duration = message.arrivalAt - message.sentAt;
        const t = Math.max(0, Math.min(1, (logicalTime - message.sentAt) / duration));
        const u = 1 - t;
        const x = u * u * start.x + 2 * u * t * control.x + t * t * end.x;
        const y = u * u * start.y + 2 * u * t * control.y + t * t * end.y;
        const dx = u * (control.x - start.x) + t * (end.x - control.x);
        const dy = u * (control.y - start.y) + t * (end.y - control.y);
        arrow.setAttribute("transform", `translate(${x} ${y}) rotate(${Math.atan2(dy, dx) * 180 / Math.PI})`);
      }

      this.effects = this.effects.filter(({ mark, startedAt, dropped }) => {
        const progress = (presentationTime - startedAt) / EFFECT_DURATION;
        if (progress >= 1) {
          mark.remove();
          return false;
        }
        mark.setAttribute("opacity", 1 - progress ** 2);
        if (!dropped) mark.setAttribute("r", 5 + progress * 6);
        return true;
      });
    }

    reset() {
      this.messageLayer.replaceChildren();
      this.effectLayer.replaceChildren();
      this.messages.clear();
      this.effects = [];
    }
  }

  Object.assign(lab, { NetworkView, STATE_STYLE });
})(globalThis.ViewLab ??= {});
