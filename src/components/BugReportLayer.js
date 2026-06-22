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

class BugReportLayer extends HTMLElement {
  static get observedAttributes() {
    return ['url', 'status'];
  }

  static MAX_FRAME_TIME_SECONDS = 0.1;

  static TAU_SECONDS = 0.08;

  static METRICS_UPDATE_INTERVAL_MS = 120;

  static PROFILE_INTERVAL_MS = 1000;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(widgetTemplate.content.cloneNode(true));

    this.$widget = this.shadowRoot.getElementById('widget');
    this.$logStream = this.shadowRoot.getElementById('log-stream');
    this.$logLines = [
      this.shadowRoot.getElementById('log-line-0'),
      this.shadowRoot.getElementById('log-line-1'),
      this.shadowRoot.getElementById('log-line-2')
    ];
    this.$urlDisplay = this.shadowRoot.querySelector('.url-display');

    this.$mFps = this.shadowRoot.getElementById('m-fps');
    this.$mFt = this.shadowRoot.getElementById('m-ft');
    this.$mResX = this.shadowRoot.getElementById('m-res-x');
    this.$mResY = this.shadowRoot.getElementById('m-res-y');
    this.$mLogs = this.shadowRoot.getElementById('m-logs');
    this.$mEvr = this.shadowRoot.getElementById('m-evr');

    this.MAX_LOGS_QUEUE = 100;
    this._logs = [];

    this.tau = BugReportLayer.TAU_SECONDS;
    this.emaDecayBase = Math.exp(-1 / this.tau);
    this.targetX = 0;
    this.targetY = 0;
    this.smoothedX = 0;
    this.smoothedY = 0;

    this.metrics = {
      fps: 0,
      frameTime: 0,
      residualX: 0,
      residualY: 0,
      mouseEventsCount: 0,
      eventRatePerSec: 0,
      totalLogCount: 0
    };

    this.fpsFrameCount = 0;
    this.lastTimestamp = performance.now();
    this.fpsLastResetTime = this.lastTimestamp;
    this.eventsLastResetTime = this.lastTimestamp;
    this.lastMetricsDomUpdate = this.lastTimestamp;

    this.isEngineRunning = false;
    this.animationFrameId = null;

    this.cachedLayers = [];
    this.timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.renderPipelineStep = this.renderPipelineStep.bind(this);
  }

  initLayerCache() {
    this.cachedLayers = [
      { el: this.shadowRoot.getElementById('bg-layer'), parallaxMultiplier: 6, scale: 1.02 },
      { el: this.shadowRoot.getElementById('mid-layer'), parallaxMultiplier: 18, scale: 1.08 },
      { el: this.shadowRoot.getElementById('fg-layer'), parallaxMultiplier: 40, scale: 1.14 }
    ];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (name === 'url' && this.$urlDisplay) {
      this.$urlDisplay.textContent = newVal || '';
    }
  }

  connectedCallback() {
    if (this.isEngineRunning) return;
    this.isEngineRunning = true;

    this.initLayerCache();
    this.$widget.addEventListener('mousemove', this.handleMouseMove);
    this.$widget.addEventListener('mouseleave', this.handleMouseLeave);

    this.lastTimestamp = performance.now();
    this.animationFrameId = requestAnimationFrame(this.renderPipelineStep);
  }

  disconnectedCallback() {
    this.$widget.removeEventListener('mousemove', this.handleMouseMove);
    this.$widget.removeEventListener('mouseleave', this.handleMouseLeave);

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.isEngineRunning = false;
  }

  pushLog(message, type = 'info') {
    const entry = {
      timestamp: this.timeFormatter.format(new Date()),
      type,
      message: String(message)
    };

    this._logs.push(entry);
    if (this._logs.length > this.MAX_LOGS_QUEUE) {
      this._logs.shift();
    }

    this.metrics.totalLogCount += 1;
    this.renderLogsView();
  }

  renderLogsView() {
    const recentLogs = this._logs.slice(-3);

    for (let i = 0; i < this.$logLines.length; i += 1) {
      const line = this.$logLines[i];
      const log = recentLogs[i];

      if (!line) continue;

      if (!log) {
        line.textContent = '';
        continue;
      }

      line.textContent = `${log.timestamp} [${log.type.toUpperCase()}] ${log.message}`;
    }
  }

  handleMouseMove(event) {
    this.metrics.mouseEventsCount += 1;

    const rect = this.$widget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left - rect.width / 2;
    const mouseY = event.clientY - rect.top - rect.height / 2;

    this.targetX = mouseX / (rect.width / 2);
    this.targetY = mouseY / (rect.height / 2);
  }

  handleMouseLeave() {
    this.targetX = 0;
    this.targetY = 0;
  }

  renderPipelineStep(now) {
    if (!this.isEngineRunning) return;

    const rawDt = (now - this.lastTimestamp) / 1000;
    const dt = Math.min(rawDt, BugReportLayer.MAX_FRAME_TIME_SECONDS);
    this.lastTimestamp = now;

    this.metrics.frameTime = dt * 1000;

    const alpha = 1 - Math.pow(this.emaDecayBase, dt);

    this.smoothedX += (this.targetX - this.smoothedX) * alpha;
    this.smoothedY += (this.targetY - this.smoothedY) * alpha;

    this.metrics.residualX = this.targetX - this.smoothedX;
    this.metrics.residualY = this.targetY - this.smoothedY;

    for (const layer of this.cachedLayers) {
      if (!layer.el) continue;

      const dx = this.smoothedX * layer.parallaxMultiplier;
      const dy = this.smoothedY * layer.parallaxMultiplier;
      layer.el.style.transform = `scale(${layer.scale}) translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0px)`;
    }

    this.profileMetrics(now);
    this.animationFrameId = requestAnimationFrame(this.renderPipelineStep);
  }

  profileMetrics(now) {
    this.fpsFrameCount += 1;

    const fpsElapsedMs = now - this.fpsLastResetTime;
    if (fpsElapsedMs >= BugReportLayer.PROFILE_INTERVAL_MS) {
      this.metrics.fps = this.fpsFrameCount / (fpsElapsedMs / 1000);
      this.fpsFrameCount = 0;
      this.fpsLastResetTime = now;
    }

    const eventsElapsedMs = now - this.eventsLastResetTime;
    if (eventsElapsedMs >= BugReportLayer.PROFILE_INTERVAL_MS) {
      this.metrics.eventRatePerSec = this.metrics.mouseEventsCount / (eventsElapsedMs / 1000);
      this.metrics.mouseEventsCount = 0;
      this.eventsLastResetTime = now;
    }

    if (now - this.lastMetricsDomUpdate >= BugReportLayer.METRICS_UPDATE_INTERVAL_MS) {
      this.$mFps.textContent = String(this.metrics.fps);
      this.$mFt.textContent = `${this.metrics.frameTime.toFixed(1)}ms`;
      this.$mResX.textContent = this.metrics.residualX.toFixed(3);
      this.$mResY.textContent = this.metrics.residualY.toFixed(3);
      this.$mLogs.textContent = String(this.metrics.totalLogCount);
      this.$mEvr.textContent = `${this.metrics.eventRatePerSec}/s`;
      this.lastMetricsDomUpdate = now;
    }
  }
}

customElements.define('bug-report-layer', BugReportLayer);

export default BugReportLayer;
