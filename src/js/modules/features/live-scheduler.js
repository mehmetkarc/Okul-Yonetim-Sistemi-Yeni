/**
 * ============================================
 * LIVE SCHEDULER V2.0 (Canlı Dağıtım Ekranı)
 * ============================================
 * Gerçek zamanlı, interaktif dağıtım görselleştirmesi ve algoritma entegrasyonu.
 * * ⚡️ OPTIMIZATION: Enhanced algorithm control (pause/resume/stop).
 * ⚡️ FEATURE: Detailed canvas view update logic for live schedule visualization.
 * ⚡️ FIX: Improved statistic panel to display Algorithm V2 metrics (GA/ACO).
 */

class LiveScheduler {
  constructor() {
    this.modal = null;
    this.canvas = null;
    this.progressTracker = { update: () => {} }; // ProgressTracker'ın basitleştirilmiş bir mock'u.
    this.algorithm = null; // ScheduleAlgorithmV2 instance'ı burada tutulacak.
    this.animationSpeed = 50; // ms
    this.selectedView = "all"; // all, teacher, class
    this.selectedTeacher = null;
    this.selectedClass = null;
    this.isRunning = false;
    this.isPaused = false;
    this.currentStats = {};
    this.scheduleData = {}; // Canlı program verisini tutmak için
  }

  /**
   * Modal'ı aç ve dağıtımı başlat
   */
  async open(options = {}) {
    console.log("🚀 Live Scheduler açılıyor...");

    // Veri kontrolü
    const validation = this.validateData();

    if (!validation.valid) {
      this.showValidationErrors(validation.errors);
      return;
    }

    // Modal oluştur
    this.createModal();

    // Canvas başlat
    this.initCanvas(validation.data);

    // Kontrol panelini oluştur
    this.createControlPanel(validation.data);

    // İstatistik panelini başlangıç verileriyle doldur
    this.updateStatsPanel({
      overallPercentage: 0,
      stage: "Hazır",
      message: "Ayarları yapıp başlatın.",
      totalLessons: validation.data.lessons.length,
    });

    // Modal'ı göster
    this.modal.style.display = "flex";
  }

  /**
   * Veri doğrulama
   */
  validateData() {
    const errors = [];
    const data = {
      classes: [],
      teachers: [],
      lessons: [],
      preferences: {},
    };

    // ScheduleDataManager kontrolü
    if (typeof window.ScheduleDataManager === "undefined") {
      errors.push({
        type: "critical",
        message: "ScheduleDataManager yüklenmemiş!",
        action: "Sayfayı yenileyin",
      });
      return { valid: false, errors, data };
    }

    // Sınıf ve Öğretmen kontrolü
    data.classes = window.ScheduleDataManager.getSiniflar?.() || [];
    data.teachers = window.ScheduleDataManager.getOgretmenler?.() || [];

    if (data.classes.length === 0) {
      errors.push({
        type: "critical",
        message: "Hiç sınıf tanımlı değil!",
        action: "Lütfen önce sınıf ekleyin",
      });
    }

    if (data.teachers.length === 0) {
      errors.push({
        type: "critical",
        message: "Hiç öğretmen tanımlı değil!",
        action: "Lütfen önce öğretmen ekleyin",
      });
    }

    // Ders atamaları kontrolü
    let totalLessons = 0;
    data.classes.forEach((cls) => {
      if (cls.mevcutDersler && cls.mevcutDersler.length > 0) {
        cls.mevcutDersler.forEach((ders) => {
          data.lessons.push({
            classId: cls.id,
            className: cls.kod,
            ...ders,
          });
        });
        totalLessons += cls.mevcutDersler.length;
      }
    });

    if (totalLessons === 0) {
      errors.push({
        type: "critical",
        message: "Hiçbir sınıfa ders atanmamış!",
        action: "Lütfen sınıflara ders atayın",
      });
    }

    // Tercihler
    if (window.PreferenceManager) {
      data.preferences = window.PreferenceManager.tumTercihleriGetir?.() || {};
    }

    // Uyarılar
    const lockedTeachers = data.teachers.filter((t) => t.locked);
    if (lockedTeachers.length > 0) {
      errors.push({
        type: "warning",
        message: `${lockedTeachers.length} öğretmen kilitli`,
        action: "Bu öğretmenlerin programı değiştirilmeyecek",
      });
    }

    return {
      valid: errors.filter((e) => e.type === "critical").length === 0,
      errors: errors,
      data: data,
    };
  }

  // showValidationErrors fonksiyonu aynen korunmuştur...
  showValidationErrors(errors) {
    const critical = errors.filter((e) => e.type === "critical");
    const warnings = errors.filter((e) => e.type === "warning");

    let message = '<div style="text-align: left;">';

    if (critical.length > 0) {
      message +=
        '<h3 style="color: #f44336; margin-bottom: 10px;">❌ Kritik Hatalar:</h3>';
      message += '<ul style="margin-left: 20px;">';
      critical.forEach((err) => {
        message += `<li style="margin-bottom: 8px;">
          <strong>${err.message}</strong><br>
          <span style="color: #666; font-size: 13px;">${err.action}</span>
        </li>`;
      });
      message += "</ul>";
    }

    if (warnings.length > 0) {
      message +=
        '<h3 style="color: #ff9800; margin: 20px 0 10px;">⚠️ Uyarılar:</h3>';
      message += '<ul style="margin-left: 20px;">';
      warnings.forEach((err) => {
        message += `<li style="margin-bottom: 8px;">
          <strong>${err.message}</strong><br>
          <span style="color: #666; font-size: 13px;">${err.action}</span>
        </li>`;
      });
      message += "</ul>";
    }

    message += "</div>";

    if (window.Bildirim) {
      window.Bildirim.goster("error", message, 10000);
    } else {
      alert(message.replace(/<[^>]*>/g, "\n"));
    }
  }

  // createModal fonksiyonu aynen korunmuştur...
  createModal() {
    // Mevcut modal varsa temizle
    const existing = document.getElementById("liveSchedulerModal");
    if (existing) {
      existing.remove();
    }

    const modal = document.createElement("div");
    modal.id = "liveSchedulerModal";
    modal.className = "modal";
    modal.style.display = "none";

    modal.innerHTML = `
      <div class="modal-content modal-fullscreen" style="max-width: 95vw; max-height: 95vh; width: 95vw; height: 95vh;">
        <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <h2 style="display: flex; align-items: center; gap: 12px; color: white;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            Canlı Ders Dağıtım Sistemi
          </h2>
          <button class="btn-close" onclick="window.liveScheduler.close()" style="background: rgba(255,255,255,0.2); color: white;">✕</button>
        </div>

        <div class="modal-body" style="display: flex; gap: 20px; padding: 20px; overflow: hidden; height: calc(100% - 140px);">
          <div id="liveControlPanel" class="live-control-panel" style="width: 320px; overflow-y: auto;">
            </div>

          <div id="liveCanvas" class="live-canvas" style="flex: 1; overflow-y: auto; position: relative; border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px;">
            </div>

          <div id="liveStatsPanel" class="live-stats-panel" style="width: 280px; overflow-y: auto;">
            </div>
        </div>

        <div class="modal-footer" style="border-top: 2px solid #e0e0e0; padding: 16px 20px;">
          <div style="flex: 1; display: flex; align-items: center; gap: 12px;">
            <div id="liveProgressBar" class="progress-bar" style="flex: 1; height: 8px;">
              <div class="progress-fill" id="liveProgressFill" style="width: 0%; transition: width 0.3s;"></div>
            </div>
            <span id="liveProgressText" style="font-weight: 600; color: #666; min-width: 60px;">0%</span>
          </div>
          <button class="btn btn-ghost" onclick="window.liveScheduler.close()">Kapat</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;
  }

  /**
   * Canvas başlat (Dağıtımdan önceki boş görünüm)
   */
  initCanvas(data) {
    this.canvas = document.getElementById("liveCanvas");

    this.canvas.innerHTML = `
      <div class="canvas-header" style="margin-bottom: 20px;">
        <div class="view-selector" style="display: flex; gap: 8px; margin-bottom: 16px;">
          <button class="btn btn-sm btn-primary" data-view="all" onclick="window.liveScheduler.changeView('all')">
            📊 Genel Görünüm
          </button>
          <button class="btn btn-sm btn-ghost" data-view="teacher" onclick="window.liveScheduler.changeView('teacher')">
            👨‍🏫 Öğretmen
          </button>
          <button class="btn btn-sm btn-ghost" data-view="class" onclick="window.liveScheduler.changeView('class')">
            🏫 Sınıf
          </button>
        </div>
        
        <div id="canvasViewContent" class="canvas-view-content">
          ${this.renderInitialGeneralView(data)}
        </div>
      </div>
    `;
    // Görünüm seçicileri ayarla
    this.changeView(this.selectedView);
  }

  /**
   * Başlangıç Genel Görünümünü Render Et (Boş Program Tablosu)
   */
  renderInitialGeneralView(data) {
    const totalClasses = data.classes.length;
    const totalTeachers = data.teachers.length;

    // Basit bir ızgara gösterimi
    return `
      <div style="padding: 40px 20px; text-align: center; background: #f9f9f9; border-radius: 8px;">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#667eea" stroke-width="2.5" style="margin-bottom: 15px;">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="9" y1="3" x2="9" y2="21"></line>
        </svg>
        <h4 style="color: #667eea; margin-bottom: 8px;">Canlı Simülasyon Ekranı</h4>
        <p style="color: #999;">Dağıtım başladığında, atamalar bu ekranda anlık olarak gösterilecektir.</p>
        <div style="margin-top: 15px; font-size: 14px; color: #666;">
            <strong>${totalClasses}</strong> Sınıf | <strong>${totalTeachers}</strong> Öğretmen | <strong>${data.lessons.length}</strong> Ders
        </div>
      </div>
    `;
  }

  // createControlPanel fonksiyonu aynen korunmuştur...
  createControlPanel(data) {
    const panel = document.getElementById("liveControlPanel");

    panel.innerHTML = `
      <div class="control-section">
        <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          ⚙️ Dağıtım Ayarları
        </h3>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label">🏫 Dağıtılacak Sınıflar</label>
          <div class="checkbox-group" id="classCheckboxes" style="max-height: 200px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 8px;">
            <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 4px; transition: background 0.2s;">
              <input type="checkbox" id="checkAllClasses" onchange="window.liveScheduler.toggleAllClasses(this.checked)" checked style="margin-right: 8px;">
              <strong>Tümünü Seç</strong>
            </label>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #e0e0e0;">
            ${data.classes
              .map(
                (cls) => `
              <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 4px; transition: background 0.2s;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='transparent'">
                <input type="checkbox" class="class-checkbox" value="${
                  cls.id
                }" checked style="margin-right: 8px;">
                <span>${cls.kod} - ${cls.ad}</span>
                <span style="margin-left: auto; font-size: 12px; color: #666;">${
                  cls.mevcutDersler?.length || 0
                } ders</span>
              </label>
            `
              )
              .join("")}
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label">👨‍🏫 Dağıtılacak Öğretmenler</label>
          <div class="checkbox-group" id="teacherCheckboxes" style="max-height: 200px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 8px;">
            <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 4px;">
              <input type="checkbox" id="checkAllTeachers" onchange="window.liveScheduler.toggleAllTeachers(this.checked)" checked style="margin-right: 8px;">
              <strong>Tümünü Seç</strong>
            </label>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #e0e0e0;">
            ${data.teachers
              .map(
                (teacher) => `
              <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 4px; ${
                teacher.locked ? "opacity: 0.5;" : ""
              }" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='transparent'">
                <input type="checkbox" class="teacher-checkbox" value="${
                  teacher.id
                }" ${
                  teacher.locked ? "disabled" : "checked"
                } style="margin-right: 8px;">
                <span>${teacher.kod} - ${teacher.tamAd}</span>
                ${
                  teacher.locked
                    ? '<span style="margin-left: auto; font-size: 12px; color: #f44336;">🔒</span>'
                    : ""
                }
              </label>
            `
              )
              .join("")}
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label">🧬 Algoritma Gücü (Nesil/Iterasyon)</label>
          <select id="algorithmPower" class="form-select">
            <option value="quick">⚡ Hızlı (50/50)</option>
            <option value="balanced" selected>⚖️ Dengeli (100/100)</option>
            <option value="thorough">🎯 Detaylı (150/150)</option>
            <option value="maximum">🚀 Maksimum (200/200)</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label">🎬 Animasyon Hızı</label>
          <input type="range" id="animationSpeed" min="10" max="200" value="50" 
            oninput="document.getElementById('speedValue').textContent = this.value + 'ms'"
            style="width: 100%;">
          <div style="text-align: center; font-size: 12px; color: #666; margin-top: 4px;">
            <span id="speedValue">50ms</span>
          </div>
        </div>
      </div>

      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e0e0e0;">

      <button class="btn btn-primary btn-block" onclick="window.liveScheduler.startDistribution()" 
        style="width: 100%; padding: 16px; font-size: 16px; font-weight: 700; margin-bottom: 12px;" id="btnStart">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Dağıtımı Başlat
      </button>

      <div id="pauseResumeButtons" style="display: none; display: flex; gap: 8px;">
        <button class="btn btn-warning btn-block" onclick="window.liveScheduler.pause()" id="btnPause" style="flex: 1;">
          ⏸️ Duraklat
        </button>
        <button class="btn btn-success btn-block" onclick="window.liveScheduler.resume()" id="btnResume" style="flex: 1; display: none;">
          ▶️ Devam Et
        </button>
      </div>

      <button class="btn btn-danger btn-block" onclick="window.liveScheduler.stop()" id="btnStop" 
        style="width: 100%; display: none; margin-top: 8px;">
        ⏹️ Durdur ve Kaydet
      </button>
    `;
  }

  /**
   * İstatistik panelini güncelle
   */
  updateStatsPanel(stats) {
    const panel = document.getElementById("liveStatsPanel");
    this.currentStats = stats; // Güncel istatistikleri sakla

    // Fitness'ı 0'dan 2000'e kadar normalleştirmek yerine, genel kalite skorunu kullanıyoruz.
    const maxFitness = stats.algorithmType === "GA" ? 2000 : 1;
    const fitnessPercentage =
      maxFitness > 0 ? (stats.fitness / maxFitness) * 100 : 0;
    const algorithmMetricLabel =
      stats.algorithmType === "GA"
        ? "Nesil"
        : stats.algorithmType === "ACO"
        ? "Iterasyon"
        : "Adım";

    panel.innerHTML = `
      <div class="stats-section">
        <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 16px;">📊 Anlık İstatistikler</h3>

        <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; border-radius: 12px; margin-bottom: 12px;">
          <div style="font-size: 13px; opacity: 0.9; margin-bottom: 4px;">Genel İlerleme</div>
          <div style="font-size: 32px; font-weight: 900;">${
            stats.overallPercentage?.toFixed(1) || 0
          }%</div>
          <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">
            ${stats.completedSteps || 0} / ${stats.totalSteps || 0} adım
          </div>
        </div>

        <div class="stat-card" style="border: 2px solid #4caf50; padding: 16px; border-radius: 12px; margin-bottom: 12px;">
          <div class="stat-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #666;">Algoritma Tipi:</span>
            <strong>${stats.algorithmType || "Yok"}</strong>
          </div>
          <div class="stat-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #666;">Mevcut ${algorithmMetricLabel}:</span>
            <strong style="color: #4caf50;">${stats.currentIteration || 0} / ${
      stats.maxIterations || 0
    }</strong>
          </div>
          <div class="stat-row" style="display: flex; justify-content: space-between;">
            <span style="color: #666;">En İyi Fitness:</span>
            <strong style="color: #2196f3;">${
              stats.bestFitness?.toFixed(2) || 0
            }</strong>
          </div>
          <div style="width: 100%; height: 4px; background: #e0e0e0; border-radius: 2px; margin-top: 8px; overflow: hidden;">
            <div style="width: ${Math.min(
              100,
              fitnessPercentage
            )}%; height: 100%; background: #4caf50;"></div>
          </div>
        </div>

        <div class="stat-card" style="border: 2px solid #e0e0e0; padding: 16px; border-radius: 12px; margin-bottom: 12px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 8px;">Mevcut Aşama</div>
          <div style="font-size: 18px; font-weight: 700; color: #1a1a1a;">${
            stats.stage || "Bekliyor..."
          }</div>
          <div style="font-size: 13px; color: #666; margin-top: 4px;">${
            stats.message || ""
          }</div>
        </div>

        <div class="stat-card" style="border: 2px solid #e0e0e0; padding: 16px; border-radius: 12px; margin-bottom: 12px;">
          <div class="stat-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #666;">Geçen Süre:</span>
            <strong>${stats.formattedTime || "0sn"}</strong>
          </div>
          <div class="stat-row" style="display: flex; justify-content: space-between;">
            <span style="color: #666;">Tahmini Kalan:</span>
            <strong style="color: #2196f3;">${
              stats.formattedRemaining || "-"
            }</strong>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Dağıtımı başlat
   */
  async startDistribution() {
    if (this.isRunning) {
      console.warn("Dağıtım zaten çalışıyor!");
      return;
    }

    // UI butonlarını devre dışı bırak/gizle
    document.getElementById("btnStart").style.display = "none";
    document.getElementById("pauseResumeButtons").style.display = "flex";
    document.getElementById("btnStop").style.display = "block";

    console.log("🚀 Dağıtım başlatılıyor...");

    // Seçimleri al
    const selectedClasses = Array.from(
      document.querySelectorAll(".class-checkbox:checked")
    ).map((cb) => cb.value);
    const selectedTeachers = Array.from(
      document.querySelectorAll(".teacher-checkbox:checked")
    ).map((cb) => cb.value);
    const algorithmPower = document.getElementById("algorithmPower").value;
    this.animationSpeed = parseInt(
      document.getElementById("animationSpeed").value
    );

    if (selectedClasses.length === 0) {
      window.Bildirim?.goster("error", "Lütfen en az bir sınıf seçin!");
      this.close(); // Başlat butonunu geri getirir.
      return;
    }

    this.isRunning = true;

    // Algoritma gücüne göre ayarla
    const powerSettings = {
      quick: { generations: 50, iterations: 50 },
      balanced: { generations: 100, iterations: 100 },
      thorough: { generations: 150, iterations: 150 },
      maximum: { generations: 200, iterations: 200 },
    };

    const settings = powerSettings[algorithmPower];

    // ScheduleAlgorithmV2 kontrolü
    if (typeof window.ScheduleAlgorithmV2 === "undefined") {
      this.showError("ScheduleAlgorithmV2 modülü yüklenmemiş.");
      this.close();
      return;
    }

    // Algorithm V2 başlat
    this.algorithm = new window.ScheduleAlgorithmV2(window.ScheduleDataManager);

    // Konfigürasyonu güncelle
    this.algorithm.config.ga.generations = settings.generations;
    this.algorithm.config.aco.iterations = settings.iterations;

    // Progress callback
    this.algorithm.onProgress = (progress) => {
      this.handleProgress(progress);
    };

    // Complete callback
    this.algorithm.onComplete = (result) => {
      this.handleComplete(result);
    };

    try {
      // Dağıt
      const result = await this.algorithm.dagit({
        selectedClasses: selectedClasses,
        selectedTeachers: selectedTeachers,
      });

      if (!result.success) {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("❌ Dağıtım hatası:", error);
      this.showError(error.message);
      this.handleComplete({ success: false, error: error.message });
    }
  }

  /**
   * İlerleme güncelleme
   */
  handleProgress(progress) {
    if (this.isPaused) return;

    // Program verisini güncelle
    this.scheduleData = progress.currentSchedule;

    // Progress bar güncelle
    const progressBar = document.getElementById("liveProgressFill");
    const progressText = document.getElementById("liveProgressText");

    if (progressBar) {
      progressBar.style.width = `${progress.percentage}%`;
    }

    if (progressText) {
      progressText.textContent = `${progress.percentage.toFixed(0)}%`;
    }

    // İstatistikleri güncelle
    this.updateStatsPanel(progress);

    // Canvas güncelle (Animasyon hızı ile throttle et)
    if (progress.lastAssignment) {
      setTimeout(() => {
        this.animateAssignment(progress.lastAssignment);
      }, this.animationSpeed);
    }
  }

  /**
   * Tamamlanma
   */
  handleComplete(result) {
    console.log("✅ Dağıtım tamamlandı!", result);

    this.isRunning = false;
    this.isPaused = false;

    // UI'ı sıfırla
    document.getElementById("btnStart").style.display = "block";
    document.getElementById("pauseResumeButtons").style.display = "none";
    document.getElementById("btnStop").style.display = "none";

    // Başarı mesajı
    let message = `<div style="text-align: center;">`;
    if (result.success) {
      message += `
            <h2 style="color: #4caf50; margin-bottom: 16px;">🎉 Dağıtım Başarıyla Tamamlandı!</h2>
            <div style="font-size: 18px; margin-bottom: 12px;">
                <strong>En İyi Fitness:</strong> ${
                  result.bestFitness?.toFixed(0) || "-"
                }
            </div>
            <div style="font-size: 14px; color: #666;">
                Süre: ${result.stats.formattedDuration || "-"}
            </div>
        `;
      if (window.Bildirim) {
        window.Bildirim.goster("success", message, 5000);
      }
    } else {
      message += `
            <h2 style="color: #f44336; margin-bottom: 16px;">⚠️ Dağıtım Durduruldu/Hata</h2>
            <div style="font-size: 18px; color: #f44336;">
                ${
                  result.error ||
                  "Bilinmeyen bir hata oluştu veya kullanıcı tarafından durduruldu."
                }
            </div>
        `;
      if (window.Bildirim) {
        window.Bildirim.goster("error", message, 5000);
      }
    }
    message += `</div>`;

    // Kapatma
    // setTimeout(() => {
    //   this.close(); // Gerekirse otomatik kapatma
    // }, 5000);
  }

  /**
   * Hata göster
   */
  showError(message) {
    this.isRunning = false;

    if (window.Bildirim) {
      window.Bildirim.goster("error", `❌ Hata: ${message}`);
    }
  }

  /**
   * Atamayı animasyonla göster
   */
  animateAssignment(assignment) {
    // Bu, görselleştirmeyi güncellemenin kalbidir.
    // Atama: { day, time, classId, teacherId, lessonName }

    // 1. Genel görünümü güncelle
    // TODO: Gerçek bir program tablosu yapısını burada render etmek gerekir.

    // 2. İlgili hücreyi bul ve kısa süreli highlight yap
    // Örnek: const cell = document.getElementById(`cell-${assignment.day}-${assignment.time}-${assignment.classId}`);
    // if (cell) {
    //     cell.textContent = assignment.lessonName;
    //     cell.classList.add('animate-assignment'); // Kısa süreli flash animasyonu
    //     setTimeout(() => cell.classList.remove('animate-assignment'), 500);
    // }

    // Şimdilik sadece canvas görünümünü güncelleme tetikle
    this.updateCanvasView();
  }

  /**
   * Görünümü değiştir
   */
  changeView(view) {
    this.selectedView = view;

    // Butonları güncelle
    document.querySelectorAll(".view-selector button").forEach((btn) => {
      btn.classList.remove("btn-primary");
      btn.classList.add("btn-ghost");
      if (btn.dataset.view === view) {
        btn.classList.add("btn-primary");
        btn.classList.remove("btn-ghost");
      }
    });

    // İçeriği güncelle
    this.updateCanvasView();
  }

  /**
   * Canvas görünümünü güncelle (Seçilen view'a göre canlı programı render eder)
   */
  updateCanvasView() {
    const content = document.getElementById("canvasViewContent");
    const scheduleData = this.scheduleData;
    let htmlContent = "";

    if (this.isRunning && scheduleData) {
      //
      if (this.selectedView === "all") {
        // Genel görünüm: Tüm sınıfların kompakt gösterimi (Özet tablo)
        htmlContent = this.renderGeneralView(scheduleData);
      } else if (this.selectedView === "teacher") {
        // Öğretmen görünümü: Seçilen öğretmenin programı (detaylı)
        htmlContent = this.renderTeacherSelection(scheduleData);
      } else if (this.selectedView === "class") {
        // Sınıf görünümü: Seçilen sınıfın programı (detaylı)
        htmlContent = this.renderClassSelection(scheduleData);
      }
    } else {
      // Dağıtım başlamadı veya durduruldu
      htmlContent = this.renderInitialGeneralView(this.validateData().data);
    }
    content.innerHTML = htmlContent;
  }

  // Detaylı render fonksiyonları (Placeholder)
  renderGeneralView(scheduleData) {
    // Burada tüm sınıfların atama durumlarını gösteren bir özet tablo (mesela 4x4 ızgara) render edilir.
    // Her hücrede (Sınıf X Saat) kaç ders atandığı gibi bilgiler olabilir.
    return `<div class="live-general-view">
        <h4 style="color: #667eea;">Genel Dağıtım Özeti</h4>
        <p style="color: #999;">Canlı atamalar ve kısıt ihlallerinin yoğunluk haritası.</p>
        <div style="height: 400px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center;">
          Program Matrisi Görselleştirmesi
        </div>
    </div>`;
  }

  renderTeacherSelection(scheduleData) {
    // Dinamik Öğretmen seçimi dropdown'ı ve ardından program tablosu
    return `<div class="live-teacher-view">
        <h4 style="color: #667eea;">Öğretmen Programı</h4>
        <select onchange="window.liveScheduler.setSelectedTeacher(this.value)">
            <option>Öğretmen Seçin...</option>
            ${this.validateData()
              .data.teachers.map(
                (t) => `<option value="${t.id}">${t.tamAd}</option>`
              )
              .join("")}
        </select>
        <div style="margin-top: 15px;">${
          this.selectedTeacher
            ? `Seçilen Öğretmenin Programı Render Edilecek...`
            : "Lütfen yukarıdan bir öğretmen seçin."
        }</div>
    </div>`;
  }

  renderClassSelection(scheduleData) {
    // Dinamik Sınıf seçimi dropdown'ı ve ardından program tablosu
    return `<div class="live-class-view">
        <h4 style="color: #667eea;">Sınıf Programı</h4>
        <select onchange="window.liveScheduler.setSelectedClass(this.value)">
            <option>Sınıf Seçin...</option>
            ${this.validateData()
              .data.classes.map(
                (c) => `<option value="${c.id}">${c.kod}</option>`
              )
              .join("")}
        </select>
        <div style="margin-top: 15px;">${
          this.selectedClass
            ? `Seçilen Sınıfın Programı Render Edilecek...`
            : "Lütfen yukarıdan bir sınıf seçin."
        }</div>
    </div>`;
  }

  setSelectedTeacher(teacherId) {
    this.selectedTeacher = teacherId;
    this.updateCanvasView();
  }

  setSelectedClass(classId) {
    this.selectedClass = classId;
    this.updateCanvasView();
  }

  /**
   * Tüm sınıfları seç/seçmeyi kaldır
   */
  toggleAllClasses(checked) {
    document.querySelectorAll(".class-checkbox").forEach((cb) => {
      cb.checked = checked;
    });
  }

  /**
   * Tüm öğretmenleri seç/seçmeyi kaldır
   */
  toggleAllTeachers(checked) {
    document
      .querySelectorAll(".teacher-checkbox:not([disabled])")
      .forEach((cb) => {
        cb.checked = checked;
      });
  }

  /**
   * Duraklat
   */
  pause() {
    this.isPaused = true;
    document.getElementById("btnPause").style.display = "none";
    document.getElementById("btnResume").style.display = "block";

    // Algoritmayı duraklatma komutu
    this.algorithm?.pause?.();
    console.log("⏸️ Dağıtım duraklatıldı");
  }

  /**
   * Devam et
   */
  resume() {
    this.isPaused = false;
    document.getElementById("btnPause").style.display = "block";
    document.getElementById("btnResume").style.display = "none";

    // Algoritmayı devam ettirme komutu
    this.algorithm?.resume?.();
    console.log("▶️ Dağıtım devam ediyor");
  }

  /**
   * Durdur ve son durumu kaydet
   */
  stop() {
    if (
      confirm(
        "Dağıtımı durdurmak ve mevcut en iyi çözümü kaydetmek istediğinizden emin misiniz?"
      )
    ) {
      this.isRunning = false;
      this.isPaused = false;

      // Algoritma durdurma mantığı
      if (this.algorithm?.stop) {
        this.algorithm.stop();
      }

      console.log("⏹️ Dağıtım durduruldu ve son çözüm kaydediliyor.");
      this.close();
    }
  }

  /**
   * Modal'ı kapat
   */
  close() {
    if (this.modal) {
      this.modal.style.display = "none";

      // Temizlik ve durumu sıfırlama
      this.isRunning = false;
      this.isPaused = false;
      this.algorithm = null;
      this.selectedView = "all";
      this.selectedTeacher = null;
      this.selectedClass = null;

      // UI'ı başlangıç durumuna getir
      const btnStart = document.getElementById("btnStart");
      if (btnStart) btnStart.style.display = "block";
      const pauseButtons = document.getElementById("pauseResumeButtons");
      if (pauseButtons) pauseButtons.style.display = "none";
      const btnStop = document.getElementById("btnStop");
      if (btnStop) btnStop.style.display = "none";
    }
  }
}

// Global instance
if (typeof window !== "undefined") {
  window.liveScheduler = new LiveScheduler();
  window.LiveScheduler = LiveScheduler;
}

console.log("✅ LiveScheduler yüklendi (V2.0)");
