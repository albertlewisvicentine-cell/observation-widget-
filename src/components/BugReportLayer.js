const widgetTemplate = document.createElement('template');
widgetTemplate.innerHTML = `
  <style>
    :host {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 99999;
      font-family: SFMono-Regular, Consolas, monospace;
    }

    .widget-container {
      position: absolute;
      bottom: 30px;
      right: 30px;
      width: 380px;
      height: 280px;
      pointer-events: auto;
      background: rgba(10, 10, 14, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 69, 58, 0.25);
      border-radius: 14px;
      overflow: hidden;
      color: #ff453a;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
    }

    .parallax-layer {
      position: absolute;
      inset: 0;
      padding: 20px;
      will-change: transform;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }

    #bg-layer {
      font-size: 3.5rem;
      font-weight: 900;
      color: rgba(255, 69, 58, 0.03);
      justify-content: center;
      align-items: center;
      letter-spacing: -2px;
    }

    #mid-layer {
      justify-content: flex-end;
      padding-bottom: 70px;
    }

    #log-stream {
      font-size: 11px;
      line-height: 1.4;
      color: rgba(255, 255, 255, 0.5);
      min-height: 46px;
    }

    .log-item {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #fg-layer {
      justify-content: flex-start;
      gap: 4px;
    }

    .header-title {
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 1px;
    }

    .url-display {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.35);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .metrics-panel {
      margin-top: auto;
      border-top: 1px solid rgba(255, 69, 58, 0.15);
      padding-top: 6px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px;
      font-size: 9px;
      color: #00ff66;
      background: rgba(0, 0, 0, 0.3);
      margin: auto -20px -20px -20px;
      padding: 8px 20px;
    }

    .metric-val {
      color: #ffffff;
      font-family: monospace;
    }
  </style>

  <div class="widget-container" id="widget">
    <div class="parallax-layer" id="bg-layer">CORE</div>

    <div class="parallax-layer" id="mid-layer">
      <div id="log-stream">
        <div class="log-item" id="log-line-0">Awaiting system stream...</div>
        <div class="log-item" id="log-line-1"></div>
        <div class="log-item" id="log-line-2"></div>
      </div>
    </div>

    <div class="parallax-layer" id="fg-layer">
      <div class="header-title">⚡ SBM OBSERVABILITY ENGINE</div>
      <div class="url-display">Initializing context...</div>

      <div class="metrics-panel">
        <div>FPS: <span class="metric-val" id="m-fps">0</span></div>
        <div>Frame Time: <span class="metric-val" id="m-ft">0.0ms</span></div>
        <div>Residual X: <span class="metric-val" id="m-res-x">0.000</span></div>
        <div>Residual Y: <span class="metric-val" id="m-res-y">0.000</span></div>
        <div>Log Count: <span class="metric-val" id="m-logs">0</span></div>
        <div>Event Rate: <span class="metric-val" id="m-evr">0/s</span></div>
      </div>
    </div>
  </div>
`;

class Renderer {
  constructor(shadowRoot) {
    this.shadowRoot = shadowRoot;
    this.widgetEl = shadowRoot.getElementById('widget');
    this.urlDisplayEl = shadowRoot.querySelector('.url-display');

    this.layers = [
      { el: shadowRoot.getElementById('bg-layer'), parallaxMultiplier: 6, scale: 1.02 },
      { el: shadowRoot.getElementById('mid-layer'), parallaxMultiplier: 18, scale: 1.08 },
      { el: shadowRoot.getElementById('fg-layer'), parallaxMultiplier: 40, scale: 1.14 }
    ];

    this.logLines = [
      shadowRoot.getElementById('log-line-0'),
      shadowRoot.getElementById('log-line-1'),
      shadowRoot.getElementById('log-line-2')
    ];

    this.metricsEls = {
      fps: shadowRoot.getElementById('m-fps'),
      frameTime: shadowRoot.getElementById('m-ft'),
      residualX: shadowRoot.getElementById('m-res-x'),
      residualY: shadowRoot.getElementById('m-res-y'),
      totalLogCount: shadowRoot.getElementById('m-logs'),
      eventRatePerSec: shadowRoot.getElementById('m-evr')
    };
  }

  updateUrl(url) {
    if (this.urlDisplayEl) {
      this.urlDisplayEl.textContent = url || '';
    }
  }

  renderTransforms(smoothedX, smoothedY) {
    for (const layer of this.layers) {
      if (!layer.el) continue;
      const dx = smoothedX * layer.parallaxMultiplier;
      const dy = smoothedY * layer.parallaxMultiplier;
      layer.el.style.transform = `scale(${layer.scale}) translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0px)`;
    }
  }

  updateLogs(logs) {
    const recentLogs = logs.slice(-3);

    for (let i = 0; i < this.logLines.length; i += 1) {
      const line = this.logLines[i];
      const log = recentLogs[i];

      if (!line) continue;
      line.textContent = log
        ? `${log.timestamp} [${log.type.toUpperCase()}] ${log.message}`
        : '';
    }
  }

  updateMetrics(metrics) {
    this.metricsEls.fps.textContent = String(metrics.fps);
    this.metricsEls.frameTime.textContent = `${metrics.frameTime.toFixed(1)}ms`;
    this.metricsEls.residualX.textContent = metrics.residualX.toFixed(3);
    this.metricsEls.residualY.textContent = metrics.residualY.toFixed(3);
    this.metricsEls.totalLogCount.textContent = String(metrics.totalLogCount);
    this.metricsEls.eventRatePerSec.textContent = `${metrics.eventRatePerSec}/s`;
  }
}

class ObservationEngine {
  constructor({ tauSeconds, maxFrameTimeSeconds, profileIntervalMs }) {
    this.tau = tauSeconds;
    this.maxFrameTimeSeconds = maxFrameTimeSeconds;
    this.profileIntervalMs = profileIntervalMs;

    this.metrics = {
      fps: 0,
      frameTime: 0,
      residualX: 0,
      residualY: 0,
      mouseEventsCount: 0,
      eventRatePerSec: 0,
      totalLogCount: 0
    };

    this.targetX = 0;
    this.targetY = 0;
    this.smoothedX = 0;
    this.smoothedY = 0;

    this.lastTimestamp = performance.now();
    this.fpsFrameCount = 0;
    this.fpsLastResetTime = this.lastTimestamp;
    this.eventsLastResetTime = this.lastTimestamp;
  }

  resetClock(now) {
    this.lastTimestamp = now;
    this.fpsLastResetTime = now;
    this.eventsLastResetTime = now;
  }

  setTarget(targetX, targetY) {
    this.targetX = targetX;
    this.targetY = targetY;
  }

  resetTarget() {
    this.targetX = 0;
    this.targetY = 0;
  }

  recordMouseEvent() {
    this.metrics.mouseEventsCount += 1;
  }

  incrementLogCount() {
    this.metrics.totalLogCount += 1;
  }

  tick(now) {
    const dt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;

    if (dt > this.maxFrameTimeSeconds) {
      return {
        shouldRender: false,
        smoothedX: this.smoothedX,
        smoothedY: this.smoothedY,
        metrics: this.metrics
      };
    }

    this.metrics.frameTime = dt * 1000;
    const alpha = 1 - Math.exp(-dt / this.tau);

    this.smoothedX += (this.targetX - this.smoothedX) * alpha;
    this.smoothedY += (this.targetY - this.smoothedY) * alpha;

    this.metrics.residualX = this.targetX - this.smoothedX;
    this.metrics.residualY = this.targetY - this.smoothedY;

    this.profileMetrics(now);

    return {
      shouldRender: true,
      smoothedX: this.smoothedX,
      smoothedY: this.smoothedY,
      metrics: this.metrics
    };
  }

  profileMetrics(now) {
    this.fpsFrameCount += 1;

    if (now - this.fpsLastResetTime >= this.profileIntervalMs) {
      this.metrics.fps = this.fpsFrameCount;
      this.fpsFrameCount = 0;
      this.fpsLastResetTime = now;
    }

    if (now - this.eventsLastResetTime >= this.profileIntervalMs) {
      this.metrics.eventRatePerSec = this.metrics.mouseEventsCount;
      this.metrics.mouseEventsCount = 0;
      this.eventsLastResetTime = now;
    }
  }
}

class InputController {
  constructor({ renderer, engine, maxLogsQueue, timeFormatter }) {
    this.renderer = renderer;
    this.engine = engine;
    this.maxLogsQueue = maxLogsQueue;
    this.timeFormatter = timeFormatter;

    this.logs = [];
    this.listenersAttached = false;

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
  }

  handleAttributeChange(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (name === 'url') {
      this.renderer.updateUrl(newVal || '');
    }
  }

  attach() {
    if (this.listenersAttached || !this.renderer.widgetEl) return;
    this.renderer.widgetEl.addEventListener('mousemove', this.handleMouseMove);
    this.renderer.widgetEl.addEventListener('mouseleave', this.handleMouseLeave);
    this.listenersAttached = true;
  }

  detach() {
    if (!this.listenersAttached || !this.renderer.widgetEl) return;
    this.renderer.widgetEl.removeEventListener('mousemove', this.handleMouseMove);
    this.renderer.widgetEl.removeEventListener('mouseleave', this.handleMouseLeave);
    this.listenersAttached = false;
  }

  pushLog(message, type = 'info') {
    const entry = {
      timestamp: this.timeFormatter.format(new Date()),
      type,
      message: String(message)
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogsQueue) {
      this.logs.shift();
    }

    this.engine.incrementLogCount();
    this.renderer.updateLogs(this.logs);
  }

  handleMouseMove(event) {
    if (!this.renderer.widgetEl) return;

    this.engine.recordMouseEvent();

    const rect = this.renderer.widgetEl.getBoundingClientRect();
    const mouseX = event.clientX - rect.left - rect.width / 2;
    const mouseY = event.clientY - rect.top - rect.height / 2;

    this.engine.setTarget(
      mouseX / (rect.width / 2),
      mouseY / (rect.height / 2)
    );
  }

  handleMouseLeave() {
    this.engine.resetTarget();
  }
}

class BugReportLayer extends HTMLElement {
  static get observedAttributes() {
    return ['url', 'status'];
  }

  static MAX_FRAME_TIME_SECONDS = 0.1;

  static TAU_SECONDS = 0.08;

  static PROFILE_INTERVAL_MS = 1000;

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(widgetTemplate.content.cloneNode(true));

    this.renderer = new Renderer(this.shadowRoot);
    this.engine = new ObservationEngine({
      tauSeconds: BugReportLayer.TAU_SECONDS,
      maxFrameTimeSeconds: BugReportLayer.MAX_FRAME_TIME_SECONDS,
      profileIntervalMs: BugReportLayer.PROFILE_INTERVAL_MS
    });
    this.inputController = new InputController({
      renderer: this.renderer,
      engine: this.engine,
      maxLogsQueue: 100,
      timeFormatter: new Intl.DateTimeFormat('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    });

    this.isEngineRunning = false;
    this.animationFrameId = null;

    this.renderPipelineStep = this.renderPipelineStep.bind(this);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    this.inputController.handleAttributeChange(name, oldVal, newVal);
  }

  connectedCallback() {
    if (this.isEngineRunning) return;
    this.isEngineRunning = true;

    this.inputController.attach();

    const now = performance.now();
    this.engine.resetClock(now);
    this.renderer.updateLogs(this.inputController.logs);
    this.renderer.updateMetrics(this.engine.metrics);

    this.animationFrameId = requestAnimationFrame(this.renderPipelineStep);
  }

  disconnectedCallback() {
    this.inputController.detach();

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.isEngineRunning = false;
  }

  pushLog(message, type = 'info') {
    this.inputController.pushLog(message, type);
    this.renderer.updateMetrics(this.engine.metrics);
  }

  renderPipelineStep(now) {
    if (!this.isEngineRunning) return;

    const frame = this.engine.tick(now);

    if (frame.shouldRender) {
      this.renderer.renderTransforms(frame.smoothedX, frame.smoothedY);
    }

    this.renderer.updateMetrics(frame.metrics);
    this.animationFrameId = requestAnimationFrame(this.renderPipelineStep);
  }
}

customElements.define('bug-report-layer', BugReportLayer);

export default BugReportLayer;
