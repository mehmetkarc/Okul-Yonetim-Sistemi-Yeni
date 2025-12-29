/**
 * ============================================
 * ALGORITHM VISUALIZER - Algoritma Görselleştirici
 * ============================================
 * Algoritmanın çalışma adımlarını kaydeder, oynatır ve görselleştirir.
 * Özellikle optimizasyon/çözümleme algoritmaları için tasarlanmıştır.
 *
 * Özellikler:
 * - Adım adım görselleştirme ve kontrol
 * - Hız ayarı ve otomatik oynatma
 * - Durum Değişikliklerini (State Diff) vurgulama
 * - Performans Metriklerini gösterme
 * - Geliştirilmiş Zaman Çizelgesi (Timeline)
 */

class AlgorithmVisualizer {
  /**
   * @param {string} containerId - Viewer'ın render edileceği DOM element ID'si.
   * @param {object} [config] - Yapılandırma ayarları.
   */
  constructor(containerId, config = {}) {
    this.containerId = containerId;
    this.config = {
      animationSpeed: 500, // Adım başına gecikme (ms)
      autoPlay: false,
      showMetrics: true,
      highlightChanges: true, // Adımlar arası farkı vurgula
      maxSteps: 500, // Maksimum kaydedilecek adım sayısı
      ...config,
    };

    this.steps = []; // Tüm algoritma adımları
    this.currentStep = 0;
    this.isPlaying = false;
    this.playInterval = null;

    // Callbacks
    this.callbacks = {
      onStepChange: [],
      onPlayPause: [],
      onComplete: [],
    };

    // Global erişimi tanımla (HTML event listener'lar için)
    if (typeof window !== "undefined") {
      window.algorithmVisualizer = this;
    }

    window.logger?.info(
      "AlgorithmVisualizer başlatıldı",
      { containerId: this.containerId },
      "Visualizer"
    );
  }

  // ============================================
  // STEP YÖNETİMİ (KAYIT)
  // ============================================

  /**
   * Algoritmanın bir adımını kaydeder.
   * @param {Object} state - Algoritmanın mevcut durumu (genellikle çözüm objesi).
   * @param {string} action - Bu adımda yapılan temel işlem (Örn: "Swap", "Repair", "SelectBest").
   * @param {Object} [metadata={}] - Ek bilgiler, metrikler, açıklama vb.
   */
  recordStep(state, action, metadata = {}) {
    if (this.steps.length >= this.config.maxSteps) {
      window.logger?.warn(
        "Maksimum adım sayısına ulaşıldı. Yeni adımlar kaydedilmeyecek.",
        { max: this.config.maxSteps },
        "Visualizer"
      );
      return;
    }

    const previousState =
      this.steps.length > 0 ? this.steps[this.steps.length - 1].state : null;

    this.steps.push({
      index: this.steps.length,
      // Durum kopyalanır, böylece sonraki adımlardaki değişiklikler etkilemez.
      state: this.deepCopy(state),
      action,
      // Bir önceki durum ile mevcut durum arasındaki farkı hesapla (performans için sadece gerekli olduğunda yapılabilir)
      stateDiff:
        this.config.highlightChanges && previousState
          ? this.calculateDiff(previousState, state)
          : null,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Kaydedilmiş tüm adımları temizler ve görselleştiriciyi sıfırlar.
   */
  clearSteps() {
    this.steps = [];
    this.currentStep = 0;
    this.pause();

    // Gerekirse görünümü temizle
    this.render();

    window.logger?.info("Kayıtlı adımlar temizlendi.", null, "Visualizer");
  }

  // ============================================
  // PLAYBACK KONTROL
  // ============================================

  /**
   * Görselleştirmeyi otomatik olarak oynatmaya başlar.
   */
  play() {
    if (this.isPlaying || this.currentStep >= this.steps.length - 1) return;

    this.isPlaying = true;

    // Eğer son adımdaysak, başa dön ve başlat
    if (this.currentStep === this.steps.length - 1) {
      this.currentStep = 0;
    }

    this.playInterval = setInterval(() => {
      this.nextStep();

      if (this.currentStep >= this.steps.length - 1) {
        this.pause();
        this.triggerCallbacks("onComplete");
        window.logger?.info("Playback tamamlandı.", null, "Visualizer");
      }
    }, this.config.animationSpeed);

    this.triggerCallbacks("onPlayPause", { playing: true });
    this.updateView();

    window.logger?.info("Playback başlatıldı.", null, "Visualizer");
  }

  /**
   * Görselleştirmeyi duraklatır.
   */
  pause() {
    if (!this.isPlaying) return;

    this.isPlaying = false;

    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }

    this.triggerCallbacks("onPlayPause", { playing: false });
    this.updateView();

    window.logger?.info("Playback duraklatıldı.", null, "Visualizer");
  }

  /**
   * Oynatmayı/Duraklatmayı değiştirir.
   */
  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  // ============================================
  // STEP NAVİGASYONU
  // ============================================

  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.updateView();
      this.triggerCallbacks("onStepChange", this.getCurrentStep());
    }
  }

  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.updateView();
      this.triggerCallbacks("onStepChange", this.getCurrentStep());
    }
  }

  /**
   * Belirli bir adıma zıplar.
   * @param {number} index - Gidilecek adımın indeksi.
   */
  goToStep(index) {
    if (index >= 0 && index < this.steps.length && index !== this.currentStep) {
      this.currentStep = index;
      this.updateView();
      this.triggerCallbacks("onStepChange", this.getCurrentStep());
    }
    // Gidilen adım oynatılan adımsa duraklat
    if (this.isPlaying) this.pause();
  }

  /**
   * Görselleştiriciyi ilk adıma döndürür.
   */
  reset() {
    this.currentStep = 0;
    this.pause();
    this.updateView();
    window.logger?.info("Visualizer resetlendi.", null, "Visualizer");
  }

  /**
   * Mevcut adımın verilerini döndürür.
   * @returns {Object|null}
   */
  getCurrentStep() {
    return this.steps[this.currentStep] || null;
  }

  // ============================================
  // GÖRSELLEŞTİRME (DOM İŞLEMLERİ)
  // ============================================

  /**
   * Görselleştirici arayüzünü DOM'a çizer.
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      window.logger?.error(
        "Container bulunamadı:",
        { id: this.containerId },
        "Visualizer"
      );
      return;
    }

    // CSS'i enjekte et (Performans için bir kez yapılır)
    this.injectCSS();

    container.innerHTML = "";
    container.className = "algorithm-visualizer";

    // Arayüz bileşenlerini oluştur ve ekle
    container.appendChild(this.createHeader());
    container.appendChild(this.createControls());
    container.appendChild(this.createVisualizationArea());

    if (this.config.showMetrics) {
      container.appendChild(this.createMetricsPanel());
    }

    container.appendChild(this.createTimeline());

    // Timeline öğelerini asenkron olarak oluştur
    setTimeout(() => {
      this.renderTimeline();
      // İlk adımı göster
      this.updateView();
      if (this.config.autoPlay) {
        this.play();
      }
    }, 50);

    window.logger?.info("Visualizer arayüzü çizildi.", null, "Visualizer");
  }

  // ... (createHeader, createControls, createVisualizationArea, createMetricsPanel, createTimeline metotları DOM yapısını oluşturur, değişiklik sadece CSS'e yansıtılmıştır.)

  // Arayüz bileşenleri için yeni/geliştirilmiş metotlar:

  createHeader() {
    const header = document.createElement("div");
    header.className = "visualizer-header";

    header.innerHTML = `
      <h3>🚀 Algoritma Görselleştirme</h3>
      <div class="step-counter">
        Adım: <span id="current-step-display" class="step-value">0</span> / 
        <span id="total-steps-display" class="step-value">${
          this.steps.length > 0 ? this.steps.length - 1 : 0
        }</span>
      </div>
    `;
    return header;
  }

  createControls() {
    const controls = document.createElement("div");
    controls.className = "visualizer-controls";

    controls.innerHTML = `
      <button class="control-btn icon-btn" onclick="window.algorithmVisualizer?.reset()" title="Başa Dön">
        ⏮️
      </button>
      
      <button class="control-btn icon-btn" onclick="window.algorithmVisualizer?.previousStep()" title="Önceki Adım">
        ⏪
      </button>
      
      <button class="control-btn play-pause-btn" onclick="window.algorithmVisualizer?.togglePlayPause()">
        ▶️ Oynat
      </button>
      
      <button class="control-btn icon-btn" onclick="window.algorithmVisualizer?.nextStep()" title="Sonraki Adım">
        ⏩
      </button>
      
      <div class="speed-control">
        <label for="speed-range">Hız:</label>
        <input type="range" 
               id="speed-range"
               min="50" 
               max="2000" 
               step="50" 
               value="${this.config.animationSpeed}"
               oninput="window.algorithmVisualizer?.setSpeed(this.value)">
        <span id="speed-display">${this.config.animationSpeed}ms</span>
      </div>
    `;

    return controls;
  }

  createVisualizationArea() {
    const area = document.createElement("div");
    area.className = "visualization-area";

    area.innerHTML = `
      <div class="step-info">
        <h4 id="step-action">Başlangıç Durumu</h4>
        <div id="step-description">Algoritma çalışmaya hazır. Lütfen adımları kaydedin.</div>
      </div>
      
      <div class="state-view-container">
          <h5>Mevcut Çözüm Durumu (State):</h5>
          <div class="state-view" id="state-view">
            <pre>{}</pre>
          </div>
          <div class="state-diff-legend">
             <span class="diff-added">Eklendi (+)</span>
             <span class="diff-removed">Kaldırıldı (-)</span>
             <span class="diff-changed">Değişti (~)</span>
          </div>
      </div>
    `;

    return area;
  }

  createMetricsPanel() {
    const panel = document.createElement("div");
    panel.className = "metrics-panel";

    panel.innerHTML = `
      <h4>📊 Metrikler</h4>
      <div class="metrics-grid" id="metrics-grid">
      </div>
    `;

    return panel;
  }

  createTimeline() {
    const timeline = document.createElement("div");
    timeline.className = "timeline-container";

    timeline.innerHTML = `
      <div class="timeline-label">Adımlar</div>
      <div class="timeline">
        <div class="timeline-track" id="timeline-track">
        </div>
        <div class="timeline-progress" id="timeline-progress" style="width: 0%"></div>
      </div>
    `;

    return timeline;
  }

  // ============================================
  // GÖRÜNÜM GÜNCELLEME LOGİĞİ
  // ============================================

  /**
   * Görselleştirici arayüzündeki tüm dinamik elementleri günceller.
   */
  updateView() {
    const step = this.getCurrentStep();
    if (!step) {
      document.getElementById("current-step-display").textContent = 0;
      document.getElementById("total-steps-display").textContent =
        this.steps.length > 0 ? this.steps.length - 1 : 0;
      return;
    }

    // Header ve Step Bilgileri
    document.getElementById("current-step-display").textContent =
      this.currentStep;
    document.getElementById("total-steps-display").textContent =
      this.steps.length - 1;

    document.getElementById("step-action").textContent =
      step.action || `Adım ${this.currentStep}`;
    document.getElementById("step-description").textContent =
      step.metadata.description || "";

    // State Görünümü ve Diff
    this.renderState(step.state, step.stateDiff);

    // Metrikler
    if (this.config.showMetrics) {
      this.updateMetrics(step);
    }

    // Timeline İlerleme Çubuğu ve Aktif Adım
    const progress =
      this.steps.length > 1
        ? (this.currentStep / (this.steps.length - 1)) * 100
        : 0;
    document.getElementById("timeline-progress").style.width = `${progress}%`;

    document
      .querySelectorAll(`#${this.containerId} .timeline-step`)
      .forEach((el, i) => {
        el.classList.toggle("active", i === this.currentStep);
      });

    // Kontrol Butonu
    const playBtn = document.querySelector(
      `#${this.containerId} .play-pause-btn`
    );
    if (playBtn) {
      playBtn.innerHTML = this.isPlaying ? "⏸️ Duraklat" : "▶️ Oynat";
      // Eğer son adımdaysak, play butonu yerine "Başa Sar" göster
      if (this.currentStep >= this.steps.length - 1 && !this.isPlaying) {
        playBtn.innerHTML = "🔄 Tekrar Oynat";
      }
    }
  }

  /**
   * State objesini ve değişiklikleri JSON formatında render eder.
   * @param {Object} state - Mevcut durum.
   * @param {Object} [diff] - Bir önceki adımdan bu yana olan fark.
   */
  renderState(state, diff) {
    const stateView = document.getElementById("state-view");
    if (!stateView) return;

    let content;

    if (this.config.highlightChanges && diff) {
      content = this.generateDiffHtml(state, diff);
    } else {
      // Normal JSON görünümü
      content = `<pre>${JSON.stringify(state, null, 2)}</pre>`;
    }

    stateView.innerHTML = content;
  }

  /**
   * İki obje arasındaki farkı basitçe hesaplar.
   * Basitçe, sadece kök seviyesindeki anahtarlardaki ekleme/silme/değiştirme bilgisini tutar.
   * Gerçek uygulamalarda derin diff kütüphaneleri kullanılabilir.
   * @param {Object} prev - Önceki durum.
   * @param {Object} next - Sonraki durum.
   * @returns {Object} Farkları içeren basit bir obje.
   */
  calculateDiff(prev, next) {
    const diff = {};
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);

    for (const key of allKeys) {
      const prevValue = prev[key];
      const nextValue = next[key];

      if (!(key in prev)) {
        diff[key] = { type: "added", value: nextValue };
      } else if (!(key in next)) {
        diff[key] = { type: "removed", value: prevValue };
      } else if (JSON.stringify(prevValue) !== JSON.stringify(nextValue)) {
        diff[key] = { type: "changed", prev: prevValue, next: nextValue };
      }
    }
    return diff;
  }

  /**
   * Durum ve fark objesini kullanarak vurgulanmış HTML oluşturur.
   * (Basit bir JSON diff görselleştiricisi)
   */
  generateDiffHtml(state, diff) {
    let html = `<pre>`;
    const stateKeys = Object.keys(state);

    // Kaldırılan anahtarları göster
    for (const key in diff) {
      if (diff[key].type === "removed") {
        html += `<span class="diff-removed">
  - "${key}": ${JSON.stringify(diff[key].value, null, 2).replace(/\n/g, "\n  ")}
</span>\n`;
      }
    }

    // Mevcut anahtarları göster
    for (const key of stateKeys) {
      const diffEntry = diff[key];
      let line = `  "${key}": ${JSON.stringify(state[key], null, 2).replace(
        /\n/g,
        "\n  "
      )}`;

      if (diffEntry) {
        if (diffEntry.type === "added") {
          html += `<span class="diff-added">+ ${line}</span>\n`;
        } else if (diffEntry.type === "changed") {
          html += `<span class="diff-changed">~ ${line}</span>\n`;
        } else {
          html += line + "\n";
        }
      } else {
        html += line + "\n";
      }
    }

    html += `</pre>`;
    return html;
  }

  /**
   * Metrikler panelini günceller.
   */
  updateMetrics(step) {
    const metricsGrid = document.getElementById("metrics-grid");
    if (!metricsGrid) return;

    const metrics = step.metadata.metrics || {};

    metricsGrid.innerHTML = Object.entries(metrics)
      .map(
        ([key, value]) => `
      <div class="metric-item">
        <div class="metric-label">${key}</div>
        <div class="metric-value">${
          typeof value === "number" ? value.toFixed(2) : value
        }</div>
      </div>
    `
      )
      .join("");
  }

  /**
   * Timeline (Zaman Çizelgesi) bileşenini render eder.
   */
  renderTimeline() {
    const track = document.getElementById("timeline-track");
    if (!track) return;

    // Eğer adım yoksa, boş göster
    if (this.steps.length === 0) {
      track.innerHTML = '<div class="no-steps">Adım Kaydedilmedi</div>';
      document.getElementById("total-steps-display").textContent = 0;
      return;
    }

    track.innerHTML = this.steps
      .map(
        (step, i) => `
      <div class="timeline-step ${i === this.currentStep ? "active" : ""}" 
           onclick="window.algorithmVisualizer?.goToStep(${i})"
           title="${i}: ${step.action} - ${
          step.metadata.description || "Detay yok"
        }">
        ${i}
      </div>
    `
      )
      .join("");

    // Timeline'ın yatay kaydırma çubuğunun genişliğini ayarla
    track.style.width = `${this.steps.length * 40}px`; // Her adım için yaklaşık 40px
  }

  // ============================================
  // AYARLAR
  // ============================================

  /**
   * Animasyon hızını ayarlar ve oynatılıyorsa intervali yeniler.
   * @param {string} speed - Hız değeri (ms).
   */
  setSpeed(speed) {
    this.config.animationSpeed = parseInt(speed);

    const speedDisplay = document.getElementById("speed-display");
    if (speedDisplay) {
      speedDisplay.textContent = `${speed}ms`;
    }

    // Eğer oynatılıyorsa, interval'i yeniden başlat
    if (this.isPlaying) {
      this.pause();
      this.play();
    }

    window.logger?.debug(
      "Animasyon hızı güncellendi.",
      { speed: this.config.animationSpeed },
      "Visualizer"
    );
  }

  // ============================================
  // CALLBACK YÖNETİMİ
  // ============================================
  // ... (Orijinal callback metotları korunmuştur) ...

  onStepChange(callback) {
    this.callbacks.onStepChange.push(callback);
    return this;
  }

  onPlayPause(callback) {
    this.callbacks.onPlayPause.push(callback);
    return this;
  }

  onComplete(callback) {
    this.callbacks.onComplete.push(callback);
    return this;
  }

  triggerCallbacks(event, data) {
    const callbacks = this.callbacks[event] || [];
    for (const callback of callbacks) {
      try {
        callback(data);
      } catch (error) {
        window.logger?.error(
          `Callback error in ${event}:`,
          error,
          "Visualizer"
        );
      }
    }
  }

  // ============================================
  // YARDIMCI FONKSİYONLAR
  // ============================================

  deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // ... (exportSteps ve importSteps metotları korunmuştur) ...

  exportSteps() {
    return {
      steps: this.steps,
      totalSteps: this.steps.length,
      exportedAt: new Date().toISOString(),
    };
  }

  importSteps(data) {
    this.steps = data.steps || [];
    this.currentStep = 0;
    this.pause();
    this.render();

    window.logger?.info(
      `Adım import edildi: ${this.steps.length} steps`,
      null,
      "Visualizer"
    );
  }

  // ============================================
  // CSS
  // ============================================

  injectCSS() {
    if (document.getElementById("visualizer-styles")) return;

    const style = document.createElement("style");
    style.id = "visualizer-styles";
    style.textContent = `
      .algorithm-visualizer {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      
      .visualizer-header {
        background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
        color: white;
        padding: 15px 25px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .visualizer-header h3 {
        margin: 0;
        font-size: 20px;
      }
      
      .step-counter {
        font-size: 16px;
        font-weight: 500;
        letter-spacing: 0.5px;
      }
      
      .step-value {
        font-weight: 700;
        font-size: 18px;
      }
      
      .visualizer-controls {
        padding: 15px 25px;
        background: #f8f9fa;
        display: flex;
        gap: 12px;
        align-items: center;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .control-btn {
        padding: 10px 18px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 6px;
        cursor: pointer;
        font-size: 15px;
        transition: all 0.2s;
        font-weight: 500;
      }
      
      .control-btn.icon-btn {
          padding: 10px 14px;
      }
      
      .control-btn:hover {
        background: #e9f5ff;
        border-color: #007bff;
      }
      
      .play-pause-btn {
        background: #28a745;
        color: white;
        border-color: #28a745;
      }
      
      .play-pause-btn:hover {
        background: #218838;
      }
      
      .speed-control {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: auto;
        font-size: 14px;
        color: #555;
      }
      
      .speed-control input {
        width: 150px;
      }
      
      .visualization-area {
        padding: 25px;
        min-height: 450px;
      }
      
      .step-info {
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #f0f0f0;
      }
      
      .step-info h4 {
        margin: 0 0 8px 0;
        color: #333;
        font-size: 20px;
        font-weight: 600;
      }
      
      #step-description {
        color: #666;
        font-size: 14px;
        line-height: 1.5;
      }
      
      .state-view-container h5 {
          margin-top: 0;
          color: #333;
          font-weight: 600;
          font-size: 16px;
      }
      
      .state-view pre {
        margin: 0;
        padding: 15px;
        background: #f4f4f4;
        border-radius: 8px;
        overflow-x: auto;
        font-size: 13px;
        line-height: 1.4;
        color: #333;
        border: 1px solid #ddd;
      }
      
      /* State Diff Vurguları */
      .state-view pre .diff-added {
          color: #28a745; 
          background: #e6ffed;
          display: block;
          padding: 2px 0;
      }
      .state-view pre .diff-removed {
          color: #dc3545;
          background: #ffeded;
          display: block;
          padding: 2px 0;
      }
      .state-view pre .diff-changed {
          color: #ffc107;
          background: #fff8e6;
          display: block;
          padding: 2px 0;
      }
      
      .state-diff-legend {
          margin-top: 10px;
          font-size: 12px;
          display: flex;
          gap: 15px;
      }
      .state-diff-legend span::before {
          content: '•';
          margin-right: 5px;
          font-size: 16px;
          font-weight: bold;
      }
      .state-diff-legend .diff-added::before { color: #28a745; }
      .state-diff-legend .diff-removed::before { color: #dc3545; }
      .state-diff-legend .diff-changed::before { color: #ffc107; }
      
      
      .metrics-panel {
        padding: 25px;
        background: #f8f9fa;
        border-top: 1px solid #e0e0e0;
      }
      
      .metrics-panel h4 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 18px;
      }
      
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 20px;
      }
      
      .metric-item {
        background: white;
        padding: 15px;
        border-radius: 8px;
        text-align: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      }
      
      .metric-label {
        font-size: 12px;
        color: #777;
        margin-bottom: 8px;
        text-transform: uppercase;
      }
      
      .metric-value {
        font-size: 24px;
        font-weight: 700;
        color: #007bff;
      }
      
      .timeline-container {
        padding: 15px 25px 25px 25px;
        background: #f8f9fa;
        border-top: 1px solid #e0e0e0;
      }
      
      .timeline-label {
          font-size: 14px;
          color: #555;
          margin-bottom: 10px;
      }
      
      .timeline {
        position: relative;
        height: 50px;
        background: #e0e0e0;
        border-radius: 25px;
        overflow: hidden;
      }
      
      .timeline-track {
        position: relative; /* Absolute'dan relative'e çevrildi */
        height: 100%;
        display: flex;
        align-items: center;
        padding: 0 10px;
        gap: 5px;
        overflow-x: scroll; /* Yatay kaydırmayı aç */
        z-index: 2;
        box-sizing: border-box;
      }
      
      .timeline-step {
        flex-shrink: 0; /* Küçülmeyi engelle */
        min-width: 35px;
        height: 35px;
        background: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        transition: all 0.2s;
        border: 3px solid transparent;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        z-index: 3;
      }
      
      .timeline-step:hover {
        background: #007bff;
        color: white;
        transform: scale(1.1);
      }
      
      .timeline-step.active {
        background: #ffc107; /* Vurgulu renk */
        color: #333;
        transform: scale(1.2);
        border-color: #007bff;
      }
      
      .timeline-progress {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        transition: width 0.3s ease;
        z-index: 1;
      }
      
      .no-steps {
          color: #999;
          text-align: center;
          width: 100%;
          padding: 10px 0;
      }
    `;

    document.head.appendChild(style);
  }
}

// Global export
if (typeof window !== "undefined") {
  window.AlgorithmVisualizer = AlgorithmVisualizer;
  window.logger?.info(
    "AlgorithmVisualizer yüklendi ve global erişim aktif!",
    null,
    "Visualizer"
  );
}
