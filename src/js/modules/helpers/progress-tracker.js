/**
 * ============================================
 * PROGRESS TRACKER V2.2 - Gelişmiş Süreç Takipçisi
 * ============================================
 * Dağıtım/Algoritma sürecini aşamalı olarak takip eder,
 * görselleştirme için güncel durumu ve ETA hesaplamalarını sağlar.
 */

class ProgressTracker {
  constructor() {
    this.stages = []; // [{name: 'Aşama Adı', steps: 100, message: 'Mesaj'}]
    this.stageIndex = -1;
    this.currentStage = null;
    this.startTime = null;
    this.totalSteps = 0;
    this.completedSteps = 0;
    this.status = "idle"; // idle, running, paused, completed, error
    this.estimatedTime = 0; // ms
    this.lastProgressTime = Date.now(); // Hız hesaplaması için son ilerleme zamanı
    this.stepHistory = []; // Ortalama hız için adım geçmişi

    this.callbacks = {
      onStart: null,
      onProgress: null,
      onStageChange: null,
      onComplete: null,
      onError: null,
      onStatusChange: null,
    };
  }

  // ============================================
  // TEMEL KONTROL METOTLARI
  // ============================================

  /**
   * Dağıtım sürecini başlatır ve aşamaları tanımlar.
   * @param {Array<Object>} stages - Aşama tanımlarının listesi
   */
  start(stages) {
    if (this.status === "running") {
      console.warn("⚠️ Progress Tracker zaten çalışıyor. Önce resetleyin.");
      return false;
    }

    this.reset(); // Önceki durumu temizle
    this.stages = stages;
    this.stageIndex = -1;
    this.startTime = Date.now();
    this.lastProgressTime = Date.now();
    this.totalSteps = stages.reduce(
      (sum, stage) => sum + (stage.steps || 0),
      0
    );
    this.setStatus("running");

    console.log(
      `🚀 Progress Tracker başlatıldı: ${this.totalSteps} toplam adım`
    );

    this.triggerCallback("onStart", {
      totalSteps: this.totalSteps,
      stages: stages.map((s) => s.name),
    });
    return true;
  }

  /**
   * Mevcut durumu duraklatır.
   */
  pause() {
    if (this.status === "running") {
      this.setStatus("paused");
      console.log("⏸️ Progress Tracker duraklatıldı.");
    }
  }

  /**
   * Duraklatılmış durumu devam ettirir.
   */
  resume() {
    if (this.status === "paused") {
      this.setStatus("running");
      console.log("▶️ Progress Tracker devam ediyor.");
    }
  }

  /**
   * Durumu sıfırlar.
   */
  reset() {
    this.stages = [];
    this.stageIndex = -1;
    this.currentStage = null;
    this.startTime = null;
    this.totalSteps = 0;
    this.completedSteps = 0;
    this.estimatedTime = 0;
    this.stepHistory = [];
    this.setStatus("idle");

    console.log("🔄 Progress Tracker sıfırlandı");
  }

  /**
   * Tüm süreç tamamlandı.
   */
  complete() {
    if (this.status === "completed") return;

    this.setStatus("completed");
    const totalDuration = Date.now() - this.startTime;

    // Son güncelleme yapılıyor
    this.updateProgress("Tamamlandı", 100);

    console.log(
      `🎉 Progress Tracker tamamlandı: ${this.formatTime(totalDuration)}`
    );

    this.triggerCallback("onComplete", {
      totalDuration: totalDuration,
      formattedDuration: this.formatTime(totalDuration),
      totalSteps: this.totalSteps,
      averageStepTime: totalDuration / this.totalSteps,
    });
  }

  /**
   * Hata oluştu.
   */
  error(errorMessage, errorDetails = {}) {
    if (this.status === "error") return;

    this.setStatus("error");

    console.error(`❌ Progress Tracker hatası: ${errorMessage}`);

    this.triggerCallback("onError", {
      message: errorMessage,
      stage: this.currentStage?.name,
      completedSteps: this.completedSteps,
      totalSteps: this.totalSteps,
      ...errorDetails,
    });
  }

  /**
   * Dahili durum değiştirici.
   */
  setStatus(newStatus) {
    const oldStatus = this.status;
    this.status = newStatus;
    if (oldStatus !== newStatus) {
      this.triggerCallback("onStatusChange", {
        oldStatus,
        newStatus,
      });
    }
  }

  // ============================================
  // AŞAMA YÖNETİM METOTLARI
  // ============================================

  /**
   * Yeni aşamaya geçer.
   */
  enterStage(stageName) {
    if (this.status !== "running" && this.status !== "paused") {
      console.warn(
        `⚠️ Progress Tracker 'running' durumda değil. Mevcut durum: ${this.status}`
      );
      return;
    }

    const nextIndex = this.stages.findIndex((s) => s.name === stageName);
    const stage = this.stages[nextIndex];

    if (!stage) {
      console.error("❌ Aşama bulunamadı:", stageName);
      return;
    }

    // Önceki aşamayı tamamla (eğer varsa ve adımları tamamsa)
    if (
      this.currentStage &&
      this.currentStage.completedSubSteps < this.currentStage.steps
    ) {
      this.completeStage(true); // Zorla tamamla
    }

    this.stageIndex = nextIndex;
    this.currentStage = {
      ...stage,
      startTime: Date.now(),
      completedSubSteps: 0,
    };

    console.log(`📍 Aşama başladı: ${stageName}`);

    this.triggerCallback("onStageChange", {
      stageName: stageName,
      stageIndex: this.stageIndex,
      totalStages: this.stages.length,
      message: stage.message,
    });

    // Yeni aşamaya geçildiğinde ilerlemeyi sıfırla/başlat
    this.updateProgress(stage.message, 0);
  }

  /**
   * Adım tamamlandı.
   * @param {string} message - Adım mesajı
   * @param {number} [steps=1] - Kaç adım tamamlandı
   */
  completeStep(message = "", steps = 1) {
    if (this.status !== "running" || !this.currentStage) return;

    this.completedSteps += steps;
    this.currentStage.completedSubSteps += steps;

    // Hız ve ETA Hesaplaması için geçmişe kaydet
    const now = Date.now();
    const elapsed = now - this.lastProgressTime;
    this.lastProgressTime = now;

    // Geçmişe sadece önemli verileri ekle (Adım başına geçen süre)
    this.stepHistory.push({ time: elapsed, steps: steps });

    // Geçmişi yönet (son 50 adımı tutmak genellikle yeterlidir)
    if (this.stepHistory.length > 50) {
      this.stepHistory.shift();
    }

    this.calculateEstimatedTime();

    const percentage =
      (this.currentStage.completedSubSteps / this.currentStage.steps) * 100;

    this.updateProgress(message, percentage);

    // Aşama tamamlandı mı?
    if (this.currentStage.completedSubSteps >= this.currentStage.steps) {
      this.completeStage();

      // Otomatik olarak bir sonraki aşamaya geç
      if (this.stageIndex < this.stages.length - 1) {
        this.enterStage(this.stages[this.stageIndex + 1].name);
      }
    }

    // Tüm adımlar tamamlandı mı?
    if (this.completedSteps >= this.totalSteps) {
      this.complete();
    }
  }

  /**
   * Aşama tamamlandı.
   * @param {boolean} force - Adımlar tamamlanmasa bile zorla tamamla
   */
  completeStage(force = false) {
    if (!this.currentStage) return;

    // Eksik adımları tamamla ve genel ilerlemeyi güncelle
    const remainingSteps =
      this.currentStage.steps - this.currentStage.completedSubSteps;
    if (remainingSteps > 0 && force) {
      this.completedSteps += remainingSteps;
      this.currentStage.completedSubSteps = this.currentStage.steps;
    }

    const stageDuration = Date.now() - this.currentStage.startTime;

    console.log(
      `✅ Aşama tamamlandı: ${this.currentStage.name} (${this.formatTime(
        stageDuration
      )})`
    );

    this.triggerCallback("onStageComplete", {
      stageName: this.currentStage.name,
      duration: stageDuration,
    });
  }

  // ============================================
  // HESAPLAMA VE RAPORLAMA
  // ============================================

  /**
   * Hız geçmişine göre kalan süreyi hesaplar.
   */
  calculateEstimatedTime() {
    const remainingSteps = this.totalSteps - this.completedSteps;

    if (remainingSteps <= 0 || this.stepHistory.length < 5) {
      this.estimatedTime = 0;
      return;
    }

    // Son adımların ortalama süresini hesapla (daha doğru bir tahmin için)
    const totalTimeInHistory = this.stepHistory.reduce(
      (sum, item) => sum + item.time,
      0
    );
    const totalStepsInHistory = this.stepHistory.reduce(
      (sum, item) => sum + item.steps,
      0
    );

    const averageTimePerStep = totalTimeInHistory / totalStepsInHistory;

    // Kalan Adım Sayısı * Ortalama Adım Başına Süre
    this.estimatedTime = remainingSteps * averageTimePerStep;
  }

  /**
   * İlerleme durumunu callback'ler ve olaylar aracılığıyla yayar.
   */
  updateProgress(message, stagePercentage) {
    if (this.status !== "running" && this.status !== "paused") return;

    const currentStageInfo = {
      stage: this.currentStage.name,
      message: message,
      stagePercentage: parseFloat(stagePercentage.toFixed(1)),
    };

    // Genel ilerleme
    const overallPercentage = (this.completedSteps / this.totalSteps) * 100;
    const elapsed = Date.now() - this.startTime;

    this.triggerCallback("onProgress", {
      ...currentStageInfo,
      overallPercentage: parseFloat(overallPercentage.toFixed(1)),
      completedSteps: this.completedSteps,
      totalSteps: this.totalSteps,
      elapsed: elapsed,
      estimatedRemaining: Math.ceil(this.estimatedTime / 1000), // Saniye
      formattedTime: this.formatTime(elapsed),
      formattedRemaining: this.formatTime(this.estimatedTime),
      status: this.status,
    });
  }

  /**
   * Mevcut durumu özetler.
   */
  getStatus() {
    return {
      status: this.status,
      currentStage: this.currentStage?.name,
      completedSteps: this.completedSteps,
      totalSteps: this.totalSteps,
      overallPercentage: (
        (this.completedSteps / this.totalSteps) *
        100
      ).toFixed(1),
      stagePercentage: this.currentStage
        ? (
            (this.currentStage.completedSubSteps / this.currentStage.steps) *
            100
          ).toFixed(1)
        : 0,
      elapsed: Date.now() - this.startTime,
      estimatedRemaining: Math.ceil(this.estimatedTime / 1000),
      formattedRemaining: this.formatTime(this.estimatedTime),
    };
  }

  // ============================================
  // YARDIMCI VE UI METOTLARI
  // ============================================

  /**
   * Zamanı formatla (ms -> saat/dk/sn).
   */
  formatTime(ms) {
    if (ms <= 0 || isNaN(ms)) return "0sn";

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const parts = [];

    if (hours > 0) {
      parts.push(`${hours}sa`);
      parts.push(`${minutes % 60}dk`);
    } else if (minutes > 0) {
      parts.push(`${minutes}dk`);
      parts.push(`${seconds % 60}sn`);
    } else {
      parts.push(`${seconds}sn`);
    }

    return parts.join(" ");
  }

  /**
   * Callback kaydet (onProgress, onComplete vb.).
   */
  on(event, callback) {
    const capitalizedEvent = `on${
      event.charAt(0).toUpperCase() + event.slice(1)
    }`;
    if (this.callbacks.hasOwnProperty(capitalizedEvent)) {
      this.callbacks[capitalizedEvent] = callback;
    } else {
      console.warn(`⚠️ Bilinmeyen event türü: ${event}`);
    }
  }

  /**
   * Callback tetikle.
   */
  triggerCallback(callbackName, data) {
    // 1. Direkt Callback Tetikleme
    if (this.callbacks[callbackName]) {
      try {
        this.callbacks[callbackName](data);
      } catch (e) {
        console.error(`Callback hatası (${callbackName}):`, e);
      }
    }

    // 2. Global Event Dispatching (DOM)
    const event = new CustomEvent(`progressTracker:${callbackName}`, {
      detail: data,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(event);
    }
  }

  /**
   * UI Güncelleme yardımcısı (Basit DOM entegrasyonu).
   */
  updateUI(progressBarId, messageId, percentageId, etaId) {
    this.on("progress", (data) => {
      const progressBar = document.getElementById(progressBarId);
      const messageEl = document.getElementById(messageId);
      const percentageEl = document.getElementById(percentageId);
      const etaEl = document.getElementById(etaId);

      if (progressBar) {
        const percentage = data.overallPercentage;
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute("aria-valuenow", percentage);
      }

      if (messageEl) {
        messageEl.textContent = `${data.stage}: ${data.message}`;
      }

      if (percentageEl) {
        percentageEl.textContent = `${data.overallPercentage}%`;
      }

      if (etaEl) {
        etaEl.textContent = `Kalan Süre (ETA): ${data.formattedRemaining}`;
      }
    });

    this.on("complete", (data) => {
      if (etaEl) etaEl.textContent = `Tamamlandı: ${data.formattedDuration}`;
    });

    this.on("error", (data) => {
      if (etaEl) etaEl.textContent = `Hata: ${data.message}`;
    });
  }
}

// Export
if (typeof window !== "undefined") {
  window.ProgressTracker = ProgressTracker;
  // Globalde bir örnek oluştur
  window.progressTracker = new ProgressTracker();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ProgressTracker;
}

console.log("✅ ProgressTracker yüklendi (V2.2 - Gelişmiş ETA)");
