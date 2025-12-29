/**
 * ============================================
 * PROGRESS TRACKER - İlerleme Takipçisi
 * ============================================
 * Algoritma ilerlemesini takip eder ve görselleştirir.
 */

class ProgressTracker {
  /**
   * @param {object} config - Yapılandırma ayarları
   */
  constructor(config = {}) {
    this.config = {
      updateInterval: 100, // UI güncelleme aralığı (ms)
      enableUI: true, // Tarayıcıda görselleştirme etkin mi?
      enableConsole: true,
      showETA: true,
      detailedMetrics: true,
      ...config,
    };

    this.stages = [];
    this.currentStage = null;
    this.startTime = null;
    this.metrics = {
      totalProgress: 0,
      currentProgress: 0,
      stagesCompleted: 0,
      estimatedTimeRemaining: 0, // ms
      averageStageTime: 0, // ms
      // Yeni: Ortalama iterasyon/saniye gibi metrikler
      iterationsPerSecond: 0,
    };

    this.callbacks = {
      onProgress: [],
      onStageComplete: [],
      onComplete: [],
    };

    this.history = []; // İlerleme geçmişi (analiz için)
    this.lastUpdateTime = Date.now();
    this.totalIterations = 0; // Tüm stage'lerdeki toplam iterasyon sayısı

    if (this.config.enableConsole) console.log("📊 ProgressTracker başlatıldı");

    // UI için global referansları ayarla
    if (typeof window !== "undefined") {
      window.progressTracker = this;
    }
  }

  // ============================================
  // STAGE YÖNETİMİ
  // ============================================

  /**
   * Optimizasyon akışının adımlarını (Stage'lerini) tanımlar.
   * @param {Array<object>} stages - [{name, weight, id}] formatında stage listesi
   * @returns {Array<object>} - Normalize edilmiş stage listesi
   */
  defineStages(stages) {
    this.stages = stages.map((stage, index) => ({
      id: stage.id || `stage_${index}`,
      name: stage.name || `Stage ${index + 1}`,
      weight: stage.weight || 1, // Göreceli ağırlık
      status: "pending",
      progress: 0,
      startTime: null,
      endTime: null,
      duration: null,
      substages: stage.substages || [],
      currentIterations: 0, // Bu stage için iterasyon takibi
      targetIterations: stage.targetIterations || 0, // Hedef iterasyon sayısı
    }));

    // Toplam ağırlık
    const totalWeight = this.stages.reduce((sum, s) => sum + s.weight, 0);

    // Normalize weights (Toplam progress'e katkı yüzdesi)
    this.stages.forEach((stage) => {
      stage.normalizedWeight = (stage.weight / totalWeight) * 100;
    });

    if (this.config.enableConsole)
      console.log(`📋 ${this.stages.length} stage tanımlandı`);

    return this.stages;
  }

  // ============================================
  // İLERLEME TAKİBİ
  // ============================================

  /**
   * Takip sürecini başlatır.
   * @returns {ProgressTracker} - Zincirleme çağrı için kendini döndürür
   */
  start() {
    this.startTime = Date.now();
    this.metrics.totalProgress = 0;
    this.metrics.stagesCompleted = 0;
    this.lastUpdateTime = this.startTime;

    if (this.config.enableConsole) {
      console.log("\n🚀 PROGRESS TRACKING BAŞLADI");
      console.log("=".repeat(60));
    }

    if (this.config.enableUI && typeof window.document !== "undefined") {
      this.initializeUI();
    }

    return this;
  }

  /**
   * Yeni bir Stage'i başlatır.
   * @param {string} stageId - Başlatılacak Stage'in ID'si
   * @returns {ProgressTracker} - Zincirleme çağrı için kendini döndürür
   */
  startStage(stageId) {
    const stage = this.stages.find((s) => s.id === stageId);

    if (!stage) {
      if (this.config.enableConsole)
        console.warn(`⚠️ Stage bulunamadı: ${stageId}`);
      return this;
    }

    // Önceki stage'i bitir (Eğer aktifse)
    if (this.currentStage && this.currentStage.status === "active") {
      this.completeStage(this.currentStage.id);
    }

    stage.status = "active";
    stage.startTime = Date.now();
    stage.progress = 0;
    stage.currentIterations = 0;
    this.currentStage = stage;

    if (this.config.enableConsole) {
      console.log(`\n▶️  STAGE BAŞLADI: ${stage.name}`);
    }

    this.updateProgress(true); // Hemen güncelle

    return this;
  }

  /**
   * Mevcut Stage'in ilerlemesini iterasyon sayısına göre günceller.
   * @param {number} iterations - Tamamlanan iterasyon sayısı (Genellikle 1)
   * @param {string} message - Stage için anlık mesaj
   * @returns {ProgressTracker} - Zincirleme çağrı için kendini döndürür
   */
  updateStageIterations(iterations = 1, message = "") {
    if (!this.currentStage) return this;

    this.currentStage.currentIterations += iterations;
    this.totalIterations += iterations;

    let progress = 0;
    if (this.currentStage.targetIterations > 0) {
      progress =
        (this.currentStage.currentIterations /
          this.currentStage.targetIterations) *
        100;
    }

    this.currentStage.progress = Math.min(100, Math.max(0, progress));

    if (message) {
      this.currentStage.currentMessage = message;
    }

    // Sadece belirli aralıklarla UI/Console güncellemesi yap
    const now = Date.now();
    if (now - this.lastUpdateTime > this.config.updateInterval) {
      this.updateProgress();
      this.lastUpdateTime = now;
    }

    return this;
  }

  /**
   * Stage ilerlemesini doğrudan yüzdesel değerle günceller (İterasyon tabanlı değil).
   * @param {string} stageId - Stage ID
   * @param {number} progress - Yeni ilerleme yüzdesi (0-100)
   * @param {string} message - Stage için anlık mesaj
   * @returns {ProgressTracker} - Zincirleme çağrı için kendini döndürür
   */
  updateStage(stageId, progress, message = "") {
    const stage = this.stages.find((s) => s.id === stageId);

    if (!stage) return this;

    stage.progress = Math.min(100, Math.max(0, progress));

    if (message) {
      stage.currentMessage = message;
    }

    // Sadece belirli aralıklarla UI/Console güncellemesi yap
    const now = Date.now();
    if (
      now - this.lastUpdateTime > this.config.updateInterval ||
      stageId === this.currentStage?.id
    ) {
      this.updateProgress();
      this.lastUpdateTime = now;
    }

    return this;
  }

  /**
   * Mevcut Stage'i tamamlar.
   * @param {string} stageId - Tamamlanacak Stage'in ID'si
   * @returns {ProgressTracker} - Zincirleme çağrı için kendini döndürür
   */
  completeStage(stageId) {
    const stage = this.stages.find((s) => s.id === stageId);

    if (!stage) return this;

    // Zaten tamamlanmışsa bir şey yapma
    if (stage.status === "completed") return;

    stage.status = "completed";
    stage.progress = 100;
    stage.endTime = Date.now();
    stage.duration = stage.endTime - stage.startTime;

    this.metrics.stagesCompleted++;

    if (this.config.enableConsole) {
      console.log(
        `✅ STAGE TAMAMLANDI: ${stage.name} (${this.formatDuration(
          stage.duration
        )})`
      );
    }

    // Callback
    this.triggerCallbacks("onStageComplete", stage);

    this.updateProgress(true); // Tamamlanınca hemen güncelle

    return this;
  }

  // ============================================
  // TOPLAM İLERLEME HESAPLAMA
  // ============================================

  /**
   * Toplam ilerlemeyi (Weighted Average) hesaplar ve UI/Callback'leri tetikler.
   * @param {boolean} forceUpdate - Güncelleme aralığını göz ardı et ve hemen güncelle
   */
  updateProgress(forceUpdate = false) {
    if (
      !forceUpdate &&
      Date.now() - this.lastUpdateTime < this.config.updateInterval
    ) {
      return; // Performans için kısıtla
    }

    // Toplam ilerleme hesapla (weighted average)
    let totalProgress = 0;

    for (const stage of this.stages) {
      const stageContribution = (stage.progress / 100) * stage.normalizedWeight;
      totalProgress += stageContribution;
    }

    this.metrics.totalProgress = Math.min(
      100,
      Math.round(totalProgress * 100) / 100
    );

    // Current stage progress
    if (this.currentStage) {
      this.metrics.currentProgress = this.currentStage.progress;
    }

    // ETA ve İPS hesapla
    this.calculatePerformanceMetrics();

    // UI güncelle
    if (this.config.enableUI && typeof window.document !== "undefined") {
      this.updateUI();
    }

    // Callback
    this.triggerCallbacks("onProgress", {
      totalProgress: this.metrics.totalProgress,
      currentStage: this.currentStage,
      metrics: this.metrics,
    });

    // History
    this.history.push({
      timestamp: Date.now(),
      totalProgress: this.metrics.totalProgress,
      currentStage: this.currentStage?.id,
      metrics: { ...this.metrics },
    });

    this.lastUpdateTime = Date.now();
  }

  // ============================================
  // PERFORMANS VE ETA HESAPLAMA
  // ============================================

  /**
   * ETA ve diğer performans metriklerini hesaplar.
   */
  calculatePerformanceMetrics() {
    const elapsed = Date.now() - this.startTime;

    // 1. İterasyon/Saniye (IPS)
    if (elapsed > 1000 && this.totalIterations > 0) {
      this.metrics.iterationsPerSecond = Math.round(
        this.totalIterations / (elapsed / 1000)
      );
    }

    // 2. ETA (Tahmini Kalan Süre)
    if (this.config.showETA && this.metrics.totalProgress > 0) {
      const progressRate = this.metrics.totalProgress / elapsed; // % per ms

      if (progressRate > 0) {
        const remaining = 100 - this.metrics.totalProgress;
        this.metrics.estimatedTimeRemaining = Math.round(
          remaining / progressRate
        );
      } else {
        this.metrics.estimatedTimeRemaining = 0;
      }
    } else {
      this.metrics.estimatedTimeRemaining = 0;
    }

    // 3. Ortalama Stage Süresi
    const completedStages = this.stages.filter((s) => s.status === "completed");
    if (completedStages.length > 0) {
      const totalDuration = completedStages.reduce(
        (sum, s) => sum + s.duration,
        0
      );
      this.metrics.averageStageTime = totalDuration / completedStages.length;
    }
  }

  // ============================================
  // TAMAMLAMA
  // ============================================

  /**
   * İlerleme takibini sonlandırır.
   * @returns {ProgressTracker} - Zincirleme çağrı için kendini döndürür
   */
  complete() {
    const totalDuration = Date.now() - this.startTime;

    // Aktif stage varsa tamamla
    if (this.currentStage && this.currentStage.status === "active") {
      this.completeStage(this.currentStage.id);
    }

    this.metrics.totalProgress = 100;
    this.metrics.estimatedTimeRemaining = 0;
    this.calculatePerformanceMetrics(); // Son performans metriklerini hesapla

    if (this.config.enableConsole) {
      console.log("\n✅ PROGRESS TRACKING TAMAMLANDI");
      console.log("=".repeat(60));
      console.log(`  • Toplam Süre: ${this.formatDuration(totalDuration)}`);
      console.log(
        `  • Stages: ${this.metrics.stagesCompleted}/${this.stages.length}`
      );
      console.log(
        `  • İterasyon/Saniye (IPS): ${this.metrics.iterationsPerSecond}`
      );
      console.log(
        `  • Ortalama Stage Süresi: ${this.formatDuration(
          this.metrics.averageStageTime
        )}`
      );
      console.log("=".repeat(60) + "\n");
    }

    if (this.config.enableUI && typeof window.document !== "undefined") {
      this.updateUI();
      // 2 saniye sonra UI'ı temizle
      setTimeout(() => this.cleanupUI(), 2000);
    }

    // Callback
    this.triggerCallbacks("onComplete", {
      duration: totalDuration,
      stages: this.stages,
      metrics: this.metrics,
    });

    this.reset(); // Durumu temizle

    return this;
  }

  // ============================================
  // UI İŞLEMLERİ (Tarayıcı Ortamı Gerektirir)
  // ============================================

  // initializeUI, updateUI, renderStageList, updateStageList, hide, show, cleanupUI, injectCSS metotları
  // orijinal kodunuzdaki tarayıcı DOM manipülasyon mantığını aynen korur.
  // Tekrar eklenmesi, kodun gereksiz uzamasına neden olur.
  // Varsayım: Orijinal UI metodları buraya olduğu gibi kopyalanmıştır.

  // UI Metodları Placeholder - Kodu kısaltmak için buraya dahil edilmemiştir.
  // Orijinal kodunuzdaki tüm UI metodları (initializeUI, updateUI, renderStageList, updateStageList, hide, show, cleanupUI, injectCSS) bu kısma tam olarak yerleştirilmelidir.

  initializeUI() {
    // Progress container'ı oluştur
    let container = document.getElementById("progress-tracker-container");

    if (!container) {
      container = document.createElement("div");
      container.id = "progress-tracker-container";
      container.className = "progress-tracker-container";
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="progress-tracker-card">
        <div class="progress-tracker-header">
          <h3>🚀 İlerleme</h3>
          <button class="progress-tracker-close" onclick="window.progressTracker?.hide()">×</button>
        </div>
        
        <div class="progress-tracker-body">
          <div class="progress-bar-wrapper">
            <div class="progress-bar-label">
              <span class="progress-percentage">0%</span>
              <span class="progress-eta">Hesaplanıyor...</span>
            </div>
            <div class="progress-bar">
              <div class="progress-bar-fill" style="width: 0%"></div>
            </div>
          </div>
          
          <div class="progress-stages" id="progress-stages-list"></div>
          
          <div class="progress-metrics">
            <div class="metric">
              <span class="metric-label">Tamamlanan</span>
              <span class="metric-value" id="stages-completed">0/${this.stages.length}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Geçen Süre</span>
              <span class="metric-value" id="elapsed-time">0s</span>
            </div>
            <div class="metric">
              <span class="metric-label">İterasyon/sn (IPS)</span>
              <span class="metric-value" id="ips">0</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Stage listesini oluştur
    this.renderStageList();

    // CSS ekle
    this.injectCSS();
  }

  updateUI() {
    // Ana progress bar
    const fillElement = document.querySelector(".progress-bar-fill");
    if (fillElement) {
      fillElement.style.width = `${this.metrics.totalProgress}%`;
    }

    // Percentage
    const percentageElement = document.querySelector(".progress-percentage");
    if (percentageElement) {
      percentageElement.textContent = `${Math.round(
        this.metrics.totalProgress
      )}%`;
    }

    // ETA
    const etaElement = document.querySelector(".progress-eta");
    if (etaElement && this.config.showETA) {
      if (this.metrics.estimatedTimeRemaining > 0) {
        etaElement.textContent = `~${this.formatDuration(
          this.metrics.estimatedTimeRemaining
        )} kaldı`;
      } else {
        etaElement.textContent = "Hesaplanıyor...";
      }
    }

    // Stages
    this.updateStageList();

    // Metrics
    const stagesCompleted = document.getElementById("stages-completed");
    if (stagesCompleted) {
      stagesCompleted.textContent = `${this.metrics.stagesCompleted}/${this.stages.length}`;
    }

    const elapsedTime = document.getElementById("elapsed-time");
    if (elapsedTime && this.startTime) {
      elapsedTime.textContent = this.formatDuration(
        Date.now() - this.startTime
      );
    }

    const ips = document.getElementById("ips");
    if (ips) {
      ips.textContent = this.metrics.iterationsPerSecond.toLocaleString();
    }
  }

  renderStageList() {
    const stagesList = document.getElementById("progress-stages-list");
    if (!stagesList) return;

    stagesList.innerHTML = this.stages
      .map(
        (stage) => `
      <div class="progress-stage" data-stage-id="${stage.id}">
        <div class="stage-header">
          <span class="stage-icon">⏳</span>
          <span class="stage-name">${stage.name}</span>
          <span class="stage-progress">0%</span>
        </div>
        <div class="stage-bar">
          <div class="stage-bar-fill" style="width: 0%"></div>
        </div>
        <div class="stage-message">${
          stage.targetIterations > 0
            ? `Hedef: ${stage.targetIterations.toLocaleString()} iterasyon`
            : ""
        }</div>
      </div>
    `
      )
      .join("");
  }

  updateStageList() {
    for (const stage of this.stages) {
      const stageElement = document.querySelector(
        `[data-stage-id="${stage.id}"]`
      );
      if (!stageElement) continue;

      // Icon
      const icon = stageElement.querySelector(".stage-icon");
      if (icon) {
        if (stage.status === "completed") {
          icon.textContent = "✅";
        } else if (stage.status === "active") {
          icon.textContent = "▶️";
        } else {
          icon.textContent = "⏳";
        }
      }

      // Progress
      const progressText = stageElement.querySelector(".stage-progress");
      if (progressText) {
        progressText.textContent = `${Math.round(stage.progress)}%`;
      }

      // Bar
      const barFill = stageElement.querySelector(".stage-bar-fill");
      if (barFill) {
        barFill.style.width = `${stage.progress}%`;
      }

      // Message
      const message = stageElement.querySelector(".stage-message");
      if (message && stage.currentMessage) {
        message.textContent = stage.currentMessage;
      } else if (
        message &&
        stage.status === "active" &&
        stage.targetIterations > 0
      ) {
        message.textContent = `${stage.currentIterations.toLocaleString()} / ${stage.targetIterations.toLocaleString()} iterasyon`;
      }

      // Status class
      stageElement.className = `progress-stage stage-${stage.status}`;
    }
  }

  hide() {
    const container = document.getElementById("progress-tracker-container");
    if (container) {
      container.style.display = "none";
    }
  }

  show() {
    const container = document.getElementById("progress-tracker-container");
    if (container) {
      container.style.display = "block";
    }
  }

  cleanupUI() {
    const container = document.getElementById("progress-tracker-container");
    if (container) {
      container.remove();
    }
  }

  injectCSS() {
    if (document.getElementById("progress-tracker-styles")) return;

    const style = document.createElement("style");
    style.id = "progress-tracker-styles";
    style.textContent = `
      .progress-tracker-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        width: 100%;
      }
      
      .progress-tracker-card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        overflow: hidden;
      }
      
      .progress-tracker-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .progress-tracker-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }
      
      .progress-tracker-close {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        line-height: 1;
        transition: all 0.2s;
      }
      
      .progress-tracker-close:hover {
        background: rgba(255,255,255,0.3);
      }
      
      .progress-tracker-body {
        padding: 20px;
      }
      
      .progress-bar-wrapper {
        margin-bottom: 20px;
      }
      
      .progress-bar-label {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 14px;
      }
      
      .progress-percentage {
        font-weight: 600;
        color: #667eea;
      }
      
      .progress-eta {
        color: #666;
      }
      
      .progress-bar {
        height: 8px;
        background: #f0f0f0;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        transition: width 0.3s ease;
      }
      
      .progress-stages {
        max-height: 300px;
        overflow-y: auto;
        margin-bottom: 15px;
      }
      
      .progress-stage {
        margin-bottom: 12px;
        padding: 10px;
        background: #f8f9fa;
        border-radius: 8px;
        transition: all 0.3s;
      }
      
      .progress-stage.stage-active {
        background: #e3f2fd;
        border-left: 3px solid #2196f3;
      }
      
      .progress-stage.stage-completed {
        background: #e8f5e9;
        border-left: 3px solid #4caf50;
      }
      
      .stage-header {
        display: flex;
        align-items: center;
        margin-bottom: 6px;
        font-size: 13px;
      }
      
      .stage-icon {
        margin-right: 8px;
        font-size: 16px;
      }
      
      .stage-name {
        flex: 1;
        font-weight: 500;
      }
      
      .stage-progress {
        color: #666;
        font-size: 12px;
      }
      
      .stage-bar {
        height: 4px;
        background: rgba(0,0,0,0.1);
        border-radius: 2px;
        overflow: hidden;
      }
      
      .stage-bar-fill {
        height: 100%;
        background: #667eea;
        transition: width 0.3s ease;
      }
      
      .stage-message {
        margin-top: 6px;
        font-size: 12px;
        color: #666;
        font-style: italic;
      }
      
      .progress-metrics {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        padding-top: 15px;
        border-top: 1px solid #e0e0e0;
      }
      
      .metric {
        text-align: center;
      }
      
      .metric-label {
        display: block;
        font-size: 11px;
        color: #999;
        margin-bottom: 4px;
      }
      
      .metric-value {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: #333;
      }
      
      @media (max-width: 768px) {
        .progress-tracker-container {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // ============================================
  // CALLBACK YÖNETİMİ
  // ============================================

  onProgress(callback) {
    this.callbacks.onProgress.push(callback);
    return this;
  }

  onStageComplete(callback) {
    this.callbacks.onStageComplete.push(callback);
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
        console.error(`Callback error in ${event}:`, error);
      }
    }
  }

  // ============================================
  // YARDIMCI FONKSİYONLAR
  // ============================================

  formatDuration(ms) {
    if (ms === null || ms === undefined || isNaN(ms)) return "-";
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  getProgress() {
    return {
      total: this.metrics.totalProgress,
      current: this.metrics.currentProgress,
      stages: this.stages,
      currentStage: this.currentStage,
      metrics: this.metrics,
    };
  }

  reset() {
    this.stages = [];
    this.currentStage = null;
    this.startTime = null;
    this.metrics = {
      totalProgress: 0,
      currentProgress: 0,
      stagesCompleted: 0,
      estimatedTimeRemaining: 0,
      averageStageTime: 0,
      iterationsPerSecond: 0,
    };
    this.history = [];
    this.totalIterations = 0;
    this.lastUpdateTime = Date.now();
    this.currentIterations = 0;

    if (this.config.enableConsole)
      console.log("🔄 ProgressTracker reset edildi");
  }
}

// Global export ve başlatma
if (typeof window !== "undefined") {
  // Q-Learning ve QA sınıflarını global yap
  window.ReinforcementLearning = ReinforcementLearning;
  window.QualityAssurance = QualityAssurance;

  // ProgressTracker'ı hem sınıf hem de bir örnek olarak global yap
  window.ProgressTracker = ProgressTracker;
  // Mevcut global progressTracker varsa koru, yoksa yeni oluştur
  window.progressTracker = window.progressTracker || new ProgressTracker();

  console.log("✅ Tüm Sınıflar yüklendi");
}
