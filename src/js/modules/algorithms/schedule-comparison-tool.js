/**
 * ============================================
 * SCHEDULE COMPARISON TOOL - Program Karşılaştırma Aracı
 * ============================================
 * İki programı karşılaştırır, farkları gösterir ve metrik değişimlerini analiz eder.
 *
 * Özellikler:
 * - Side-by-side comparison
 * - Difference highlighting
 * - Metric comparison (Çakışma, Boşluk, Denge)
 * - Change analysis (Taşınan Dersler)
 */

class ScheduleComparisonTool {
  constructor(config = {}) {
    this.config = {
      highlightChanges: true,
      showMetrics: true,
      showDetails: true,
      compareMode: "side-by-side", // 'side-by-side', 'overlay', 'diff-only'
      ...config,
    };

    this.solutionA = null;
    this.solutionB = null;
    this.differences = [];
    this.metrics = {
      solutionA: {},
      solutionB: {},
    };

    console.log("🔍 ScheduleComparisonTool başlatıldı");
  }

  // ============================================
  // ANA KARŞILAŞTIRMA FONKSİYONU
  // ============================================

  compare(solutionA, solutionB, options = {}) {
    console.log("\n🔍 SCHEDULE COMPARISON BAŞLADI");
    console.log("=".repeat(50));

    this.solutionA = solutionA;
    this.solutionB = solutionB;
    this.differences = [];

    // 1. Metrikleri hesapla
    this.metrics.solutionA = this.calculateMetrics(solutionA, "A");
    this.metrics.solutionB = this.calculateMetrics(solutionB, "B");

    // 2. Farkları bul
    this.findDifferences();

    // 3. Analiz
    const analysis = this.analyzeDifferences();

    console.log("\n📊 KARŞILAŞTIRMA SONUÇLARI:");
    console.log(`  • Toplam Fark: ${this.differences.length}`);
    console.log(`  • Değişen Dersler: ${analysis.changedLessons}`);
    console.log(`  • Eklenen Dersler: ${analysis.addedLessons}`);
    console.log(`  • Kaldırılan Dersler: ${analysis.removedLessons}`);
    console.log(
      `  • Taşınan Dersler: ${analysis.movedLessons} (Konum Değişimi)`
    );
    console.log("=".repeat(50) + "\n");

    return {
      differences: this.differences,
      metrics: this.metrics,
      analysis,
      summary: this.createSummary(),
    };
  }

  // ============================================
  // METRİK HESAPLAMA (Geliştirilmiş)
  // ============================================

  calculateMetrics(solution, label) {
    console.log(`📊 ${label} metrikleri hesaplanıyor...`);

    let totalLessons = 0;
    let totalGaps = 0;
    let totalBlocks = 0;
    let teacherConflicts = 0; // Yeni Metrik: Öğretmen Çakışması
    const teacherSchedule = {}; // Çakışma kontrolü için
    const teacherLoads = new Map();
    const classLoads = new Map();

    for (const classId in solution) {
      let classLessons = 0;
      let classGaps = 0;

      const dailyTimes = { 1: [], 2: [], 3: [], 4: [], 5: [] };

      for (const day in solution[classId]) {
        const times = Object.keys(solution[classId][day])
          .map(Number)
          .sort((a, b) => a - b);

        classLessons += times.length;
        dailyTimes[day].push(...times);

        // Dersler ve Çakışma Kontrolü
        for (const time of times) {
          const lesson = solution[classId][day][time];
          if (!lesson) continue;

          totalLessons++;

          // Teacher Conflict
          const teacherKey = `${lesson.teacherId}_${day}_${time}`;
          if (teacherSchedule[teacherKey]) {
            teacherConflicts++;
          } else {
            teacherSchedule[teacherKey] = true;
          }

          // Teacher load
          const teacherId = lesson.teacherId;
          teacherLoads.set(teacherId, (teacherLoads.get(teacherId) || 0) + 1);

          // Blocks
          if (lesson.blockSize > 1 && lesson.blockIndex === 0) {
            totalBlocks++;
          }
        }

        // Gaps
        for (let i = 0; i < times.length - 1; i++) {
          const gap = times[i + 1] - times[i] - 1;
          totalGaps += gap;
          classGaps += gap;
        }
      }

      classLoads.set(classId, classLessons);
    }

    // Teacher variance (Denge)
    const loads = Array.from(teacherLoads.values());
    let avgLoad = 0;
    let variance = 0;

    if (loads.length > 0) {
      avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;
      variance = Math.sqrt(
        loads.reduce((sum, l) => sum + Math.pow(l - avgLoad, 2), 0) /
          loads.length
      );
    }

    return {
      totalLessons,
      teacherConflicts, // Yeni metrik
      totalGaps,
      totalBlocks,
      classCount: Object.keys(solution).length,
      teacherCount: teacherLoads.size,
      avgTeacherLoad: avgLoad.toFixed(2),
      teacherVariance: variance.toFixed(2),
      teacherLoads: Object.fromEntries(teacherLoads),
      classLoads: Object.fromEntries(classLoads),
    };
  }

  // ============================================
  // FARK BULMA
  // ============================================

  findDifferences() {
    console.log("🔍 Farklar bulunuyor...");

    // Tüm dersleri lessonId bazında haritala
    const lessonsA = this.mapLessonsByLessonId(this.solutionA);
    const lessonsB = this.mapLessonsByLessonId(this.solutionB);

    // Tüm lessonId'leri al
    const allLessonIds = new Set([
      ...Object.keys(lessonsA),
      ...Object.keys(lessonsB),
    ]);

    // 1. Taşınan, Eklenen ve Kaldırılan dersleri bul
    for (const lessonId of allLessonIds) {
      const lessonInA = lessonsA[lessonId];
      const lessonInB = lessonsB[lessonId];

      if (lessonInA && lessonInB) {
        // Ders her ikisinde de var (Potansiyel olarak taşınmış veya değiştirilmiş)
        this.compareLessonDetails(lessonId, lessonInA, lessonInB);
      } else if (lessonInA && !lessonInB) {
        // Ders A'da var, B'de yok
        this.differences.push({
          type: "lesson_removed",
          classId: lessonInA.classId,
          day: lessonInA.day,
          time: lessonInA.time,
          lesson: lessonInA,
          lessonId,
          severity: "medium",
        });
      } else if (!lessonInA && lessonInB) {
        // Ders A'da yok, B'de var
        this.differences.push({
          type: "lesson_added",
          classId: lessonInB.classId,
          day: lessonInB.day,
          time: lessonInB.time,
          lesson: lessonInB,
          lessonId,
          severity: "medium",
        });
      }
    }

    // 2. Sınıf ve ders pozisyon farklarını bul
    this.findPositionalDifferences();
  }

  mapLessonsByLessonId(solution) {
    const lessons = {};
    for (const classId in solution) {
      for (const day in solution[classId]) {
        for (const time in solution[classId][day]) {
          const lesson = solution[classId][day][time];
          if (lesson && lesson.lessonId) {
            lessons[lesson.lessonId] = { ...lesson, classId, day, time };
          }
        }
      }
    }
    return lessons;
  }

  compareLessonDetails(lessonId, lessonA, lessonB) {
    const changes = [];
    const isMoved =
      lessonA.classId !== lessonB.classId ||
      lessonA.day !== lessonB.day ||
      lessonA.time !== lessonB.time;

    if (isMoved) {
      // Konum değişikliği (Taşınma)
      this.differences.push({
        type: "lesson_moved",
        lessonId,
        from: {
          classId: lessonA.classId,
          day: lessonA.day,
          time: lessonA.time,
        },
        to: { classId: lessonB.classId, day: lessonB.day, time: lessonB.time },
        lesson: lessonB,
        severity: "medium",
      });
    }

    // Özellik değişikliği (Değiştirilme)
    if (lessonA.subjectName !== lessonB.subjectName) {
      changes.push({
        field: "subjectName",
        from: lessonA.subjectName,
        to: lessonB.subjectName,
      });
    }

    if (lessonA.teacherId !== lessonB.teacherId) {
      changes.push({
        field: "teacherId",
        from: lessonA.teacherId,
        to: lessonB.teacherId,
      });
    }

    if (lessonA.blockSize !== lessonB.blockSize) {
      changes.push({
        field: "blockSize",
        from: lessonA.blockSize,
        to: lessonB.blockSize,
      });
    }

    if (changes.length > 0 && !isMoved) {
      this.differences.push({
        type: "lesson_modified",
        classId: lessonB.classId,
        day: lessonB.day,
        time: lessonB.time,
        lessonId,
        lessonA,
        lessonB,
        changes,
        severity: "low",
      });
    } else if (changes.length > 0 && isMoved) {
      // Hem taşınmış hem değiştirilmişse, iki tür farkı da kaydet
      this.differences.push({
        type: "lesson_modified_and_moved",
        lessonId,
        lessonA,
        lessonB,
        changes,
        severity: "medium",
      });
    }
  }

  findPositionalDifferences() {
    // Sınıf eklenmesi/kaldırılması
    const allClasses = new Set([
      ...Object.keys(this.solutionA),
      ...Object.keys(this.solutionB),
    ]);

    for (const classId of allClasses) {
      if (!this.solutionB[classId]) {
        this.differences.push({
          type: "class_removed",
          classId,
          severity: "high",
        });
      } else if (!this.solutionA[classId]) {
        this.differences.push({
          type: "class_added",
          classId,
          severity: "high",
        });
      }
    }
  }

  // ============================================
  // ANALİZ
  // ============================================

  analyzeDifferences() {
    const analysis = {
      changedLessons: 0,
      addedLessons: 0,
      removedLessons: 0,
      movedLessons: 0,
      teacherChanges: 0,
      blockChanges: 0,
    };

    for (const diff of this.differences) {
      switch (diff.type) {
        case "lesson_added":
          analysis.addedLessons++;
          break;
        case "lesson_removed":
          analysis.removedLessons++;
          break;
        case "lesson_moved":
          analysis.movedLessons++;
          break;
        case "lesson_modified":
        case "lesson_modified_and_moved":
          analysis.changedLessons++;

          for (const change of diff.changes) {
            if (change.field === "teacherId") {
              analysis.teacherChanges++;
            }
            if (change.field === "blockSize") {
              analysis.blockChanges++;
            }
          }
          break;
      }
    }

    return analysis;
  }

  // ============================================
  // ÖZET OLUŞTURMA
  // ============================================

  createSummary() {
    const summary = {
      better: "tie", // Varsayılan değer "tie"
      metricComparison: {},
      improvements: [],
      regressions: [],
    };

    const metricsA = this.metrics.solutionA;
    const metricsB = this.metrics.solutionB;
    let scoreB = 0; // Puanlama: İyileşme +1, Gerileme -1

    // Karşılaştırılacak metrikler ve daha iyi olma koşulları (true: küçük daha iyi, false: büyük daha iyi)
    const metricComparisonSpecs = {
      teacherConflicts: { label: "Öğrt. Çakışması", isLowerBetter: true },
      totalGaps: { label: "Toplam Boşluk", isLowerBetter: true },
      teacherVariance: { label: "Öğrt. Denge Std", isLowerBetter: true },
      totalBlocks: { label: "Toplam Blok Sayısı", isLowerBetter: false },
    };

    for (const key in metricComparisonSpecs) {
      const spec = metricComparisonSpecs[key];
      const valA = parseFloat(metricsA[key] || 0);
      const valB = parseFloat(metricsB[key] || 0);
      const change = valB - valA;

      let better = "tie";

      if (valB < valA && spec.isLowerBetter) {
        better = "B";
        scoreB++;
      } else if (valB > valA && !spec.isLowerBetter) {
        better = "B";
        scoreB++;
      } else if (valB > valA && spec.isLowerBetter) {
        better = "A";
        scoreB--;
      } else if (valB < valA && !spec.isLowerBetter) {
        better = "A";
        scoreB--;
      }

      summary.metricComparison[key] = {
        A: valA.toFixed(2),
        B: valB.toFixed(2),
        change: change.toFixed(2),
        better: better,
      };

      if (better === "B") {
        summary.improvements.push({
          metric: key,
          improvement: Math.abs(change),
        });
      } else if (better === "A") {
        summary.regressions.push({ metric: key, regression: Math.abs(change) });
      }
    }

    // Genel karar
    if (scoreB > 0) {
      summary.better = "B";
    } else if (scoreB < 0) {
      summary.better = "A";
    } else {
      summary.better = "tie";
    }

    return summary;
  }

  // ============================================
  // GÖRSELLEŞTİRME (HTML/CSS)
  // ============================================

  // Bu kısım, kullanıcı arayüzü kütüphaneleri olmadan tarayıcıda
  // görselleştirme yapmak için genel bir HTML/CSS yapısı sağlar.

  renderComparison(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error("❌ Container bulunamadı:", containerId);
      return;
    }

    container.innerHTML = "";
    container.className = "schedule-comparison-container";

    // Header
    container.appendChild(this.createComparisonHeader());

    // Metrics comparison
    if (this.config.showMetrics) {
      container.appendChild(this.createMetricsComparison());
    }

    // Differences list
    if (this.config.showDetails) {
      container.appendChild(this.createDifferencesList());
    }

    // Side-by-side view placeholder
    if (this.config.compareMode === "side-by-side") {
      container.appendChild(this.createSideBySideView());
    }

    // CSS
    this.injectCSS();

    console.log("✅ Comparison rendered");
  }

  createComparisonHeader() {
    const summary = this.createSummary();

    const header = document.createElement("div");
    header.className = "comparison-header";

    header.innerHTML = `
      <h2>📊 Program Karşılaştırma</h2>
      <div class="comparison-summary">
        <div class="summary-card ${summary.better === "A" ? "winner" : ""}">
          <h3>Program A</h3>
          <div class="summary-stats">
            <div>Dersler: ${this.metrics.solutionA.totalLessons}</div>
            <div>Boşluklar: ${this.metrics.solutionA.totalGaps}</div>
            <div>Çakışmalar: ${this.metrics.solutionA.teacherConflicts}</div>
          </div>
        </div>
        
        <div class="summary-vs">
          ${
            summary.better === "tie"
              ? "⚖️ BERABERE"
              : summary.better === "A"
              ? "👈 DAHA İYİ"
              : "👉 DAHA İYİ"
          }
        </div>
        
        <div class="summary-card ${summary.better === "B" ? "winner" : ""}">
          <h3>Program B</h3>
          <div class="summary-stats">
            <div>Dersler: ${this.metrics.solutionB.totalLessons}</div>
            <div>Boşluklar: ${this.metrics.solutionB.totalGaps}</div>
            <div>Çakışmalar: ${this.metrics.solutionB.teacherConflicts}</div>
          </div>
        </div>
      </div>
    `;

    return header;
  }

  createMetricsComparison() {
    const summary = this.createSummary();

    const metrics = document.createElement("div");
    metrics.className = "metrics-comparison";

    metrics.innerHTML = `
      <h3>📈 Metrik Karşılaştırması</h3>
      <table class="metrics-table">
        <thead>
          <tr>
            <th>Metrik</th>
            <th>Program A</th>
            <th>Program B</th>
            <th>Fark (B - A)</th>
            <th>Daha İyi</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(summary.metricComparison)
            .map(
              ([metric, data]) => `
            <tr>
              <td>${this.getMetricLabel(metric)}</td>
              <td>${data.A}</td>
              <td>${data.B}</td>
              <td class="${
                data.change > 0 ? "positive" : data.change < 0 ? "negative" : ""
              }">
                ${data.change > 0 ? "+" : ""}${data.change}
              </td>
              <td>
                <span class="badge ${
                  data.better === "A"
                    ? "badge-a"
                    : data.better === "B"
                    ? "badge-b"
                    : "badge-tie"
                }">${data.better.toUpperCase()}</span>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    return metrics;
  }

  createDifferencesList() {
    const diffList = document.createElement("div");
    diffList.className = "differences-list";

    const grouped = this.groupDifferences();

    diffList.innerHTML = `
      <h3>🔍 Farklar (${this.differences.length})</h3>
      
      ${Object.entries(grouped)
        .map(
          ([type, diffs]) => `
        <div class="diff-group">
          <h4>${this.getDiffTypeLabel(type)} (${diffs.length})</h4>
          <div class="diff-items">
            ${diffs
              .slice(0, 10)
              .map((diff) => this.renderDifference(diff))
              .join("")}
            ${
              diffs.length > 10
                ? `<div class="more-items">... ve ${
                    diffs.length - 10
                  } tane daha</div>`
                : ""
            }
          </div>
        </div>
      `
        )
        .join("")}
    `;

    return diffList;
  }

  renderDifference(diff) {
    switch (diff.type) {
      case "lesson_added":
        return `
          <div class="diff-item diff-added">
            <span class="diff-icon">➕</span>
            <span>${diff.classId} - Gün ${diff.day}, Saat ${diff.time}</span>
            <span class="diff-detail">${diff.lesson.subjectName} (${diff.lesson.teacherId})</span>
          </div>
        `;

      case "lesson_removed":
        return `
          <div class="diff-item diff-removed">
            <span class="diff-icon">➖</span>
            <span>${diff.classId} - Gün ${diff.day}, Saat ${diff.time}</span>
            <span class="diff-detail">${diff.lesson.subjectName} (${diff.lesson.teacherId})</span>
          </div>
        `;

      case "lesson_moved":
        return `
          <div class="diff-item diff-moved">
            <span class="diff-icon">🚚</span>
            <span>${diff.lesson.subjectName} (${diff.lesson.teacherId})</span>
            <span class="diff-detail">${diff.from.classId} ${diff.from.day}/${diff.from.time} → ${diff.to.classId} ${diff.to.day}/${diff.to.time}</span>
          </div>
        `;

      case "lesson_modified":
      case "lesson_modified_and_moved":
        return `
          <div class="diff-item diff-modified">
            <span class="diff-icon">🔄</span>
            <span>${diff.lessonA.subjectName} (${diff.lessonB.teacherId})</span>
            <span class="diff-detail">
              ${diff.changes
                .map(
                  (c) =>
                    `${this.getMetricLabel(c.field) || c.field}: ${c.from} → ${
                      c.to
                    }`
                )
                .join(", ")}
            </span>
          </div>
        `;

      case "class_added":
      case "class_removed":
        return `
            <div class="diff-item ${
              diff.type.includes("added") ? "diff-added" : "diff-removed"
            } diff-class">
                <span class="diff-icon">${
                  diff.type.includes("added") ? "🆕" : "🗑️"
                }</span>
                <span>Sınıf ${diff.classId} ${
          diff.type.includes("added") ? "eklendi" : "kaldırıldı"
        }</span>
            </div>
          `;

      default:
        return "";
    }
  }

  createSideBySideView() {
    const view = document.createElement("div");
    view.className = "side-by-side-view";

    view.innerHTML = `
      <h3>👥 Yan Yana Görünüm (Örnek)</h3>
      <p style="text-align:center; color:#999;">Bu alan genellikle gerçek program tablolarının (HTML/SVG/Canvas) render edildiği yerdir.</p>
      <div class="side-by-side-grid">
        <div class="schedule-column">
          <h4>Program A</h4>
          <div id="schedule-a-view" style="border:1px solid #ccc; min-height:200px;"></div>
        </div>
        <div class="schedule-column">
          <h4>Program B</h4>
          <div id="schedule-b-view" style="border:1px solid #ccc; min-height:200px;"></div>
        </div>
      </div>
    `;

    return view;
  }

  // ============================================
  // YARDIMCI FONKSİYONLAR
  // ============================================

  groupDifferences() {
    const grouped = {};

    for (const diff of this.differences) {
      if (!grouped[diff.type]) {
        grouped[diff.type] = [];
      }
      grouped[diff.type].push(diff);
    }

    return grouped;
  }

  getMetricLabel(metric) {
    const labels = {
      totalGaps: "Boşluklar",
      teacherVariance: "Öğretmen Dengesi",
      totalBlocks: "Blok Dersler",
      teacherConflicts: "Öğrt. Çakışması",
      // lesson properties
      subjectName: "Ders Adı",
      teacherId: "Öğretmen",
      blockSize: "Blok Boyutu",
    };
    return labels[metric] || metric;
  }

  getDiffTypeLabel(type) {
    const labels = {
      lesson_added: "➕ Eklenen Dersler",
      lesson_removed: "➖ Kaldırılan Dersler",
      lesson_modified: "🔄 Değiştirilen Özellikler",
      lesson_moved: "🚚 Taşınan Dersler",
      lesson_modified_and_moved: "🔄🚚 Taşınan ve Değişenler",
      class_added: "🆕 Eklenen Sınıflar",
      class_removed: "🗑️ Kaldırılan Sınıflar",
    };
    return labels[type] || type;
  }

  // ============================================
  // RAPORLAMA
  // ============================================

  generateReport() {
    const summary = this.createSummary();
    const analysis = this.analyzeDifferences();

    return {
      title: "Program Karşılaştırma Raporu",
      date: new Date().toISOString(),
      summary,
      analysis,
      metrics: this.metrics,
      differences: this.differences,
      recommendation:
        summary.better === "B"
          ? "Program B daha iyi performans gösteriyor ve tavsiye edilir."
          : summary.better === "A"
          ? "Program A daha iyi performans gösteriyor, B'deki değişiklikler gerilemeye yol açmış olabilir."
          : "Her iki program da metrik olarak benzer performans gösteriyor.",
    };
  }

  printReport() {
    const report = this.generateReport();

    console.log("\n📋 KARŞILAŞTIRMA RAPORU");
    console.log("=".repeat(60));
    console.log(`Tarih: ${new Date(report.date).toLocaleString("tr-TR")}`);
    console.log("=".repeat(60));

    console.log("\n📊 Özet:");
    console.log(
      `  Kazanan: ${
        report.summary.better === "tie"
          ? "Berabere"
          : "Program " + report.summary.better
      }`
    );
    console.log(`  İyileşmeler: ${report.summary.improvements.length} metrik`);
    console.log(
      `  Gerileştirmeler: ${report.summary.regressions.length} metrik`
    );

    console.log("\n📈 Analiz:");
    console.log(`  Taşınan: ${report.analysis.movedLessons}`);
    console.log(`  Değiştirilen Özellik: ${report.analysis.changedLessons}`);
    console.log(`  Eklenen: ${report.analysis.addedLessons} ders`);
    console.log(`  Kaldırılan: ${report.analysis.removedLessons} ders`);

    console.log("\n💡 Öneri:");
    console.log(`  ${report.recommendation}`);

    console.log("=".repeat(60) + "\n");
  }

  // ============================================
  // CSS (HTML görselleştirmesi için)
  // ============================================

  injectCSS() {
    if (
      typeof document === "undefined" ||
      document.getElementById("comparison-tool-styles")
    )
      return;

    const style = document.createElement("style");
    style.id = "comparison-tool-styles";
    style.textContent = `
      .schedule-comparison-container {
        font-family: Arial, sans-serif;
        padding: 20px;
        max-width: 1400px;
        margin: 0 auto;
        background: #f4f7f6;
        border-radius: 12px;
      }
      
      .comparison-header h2 {
        text-align: center;
        color: #1f3a93;
        margin-bottom: 25px;
      }
      
      .comparison-summary {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 20px;
        align-items: center;
      }
      
      .summary-card {
        background: white;
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        transition: all 0.3s;
      }
      
      .summary-card.winner {
        border-color: #4caf50;
        background: #e8f5e9;
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
      }
      
      .summary-card h3 {
        margin: 0 0 15px 0;
        color: #4a4a4a;
      }
      
      .summary-stats div {
        margin: 8px 0;
        font-size: 14px;
      }
      
      .summary-vs {
        font-size: 24px;
        font-weight: 600;
        text-align: center;
        color: #1f3a93;
      }
      
      .metrics-comparison, .differences-list, .side-by-side-view {
        background: white;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 30px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .metrics-comparison h3, .differences-list h3, .side-by-side-view h3 {
        margin-top: 0;
        color: #1f3a93;
        border-bottom: 1px solid #e0e0e0;
        padding-bottom: 10px;
        margin-bottom: 15px;
      }
      
      .metrics-table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .metrics-table th {
        background: #f8f9fa;
        padding: 12px;
        text-align: left;
        font-weight: 600;
        border-bottom: 2px solid #dee2e6;
      }
      
      .metrics-table td {
        padding: 12px;
        border-bottom: 1px solid #dee2e6;
      }
      
      .metrics-table .positive {
        color: #27ae60;
        font-weight: 600;
      }
      
      .metrics-table .negative {
        color: #e74c3c;
        font-weight: 600;
      }
      
      .badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
      }
      
      .badge-a {
        background: #ecf0f1;
        color: #34495e;
      }
      
      .badge-b {
        background: #e8f5e9;
        color: #27ae60;
      }
      
      .badge-tie {
          background: #fcf8e3;
          color: #8a6d3b;
      }
      
      .diff-group h4 {
        color: #555;
        margin-bottom: 10px;
      }
      
      .diff-items {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .diff-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        border-radius: 6px;
        font-size: 14px;
      }
      
      .diff-added {
        background: #e8f5e9;
        border-left: 3px solid #4caf50;
      }
      
      .diff-removed {
        background: #fbecec;
        border-left: 3px solid #e74c3c;
      }
      
      .diff-modified {
        background: #fff3e0;
        border-left: 3px solid #f39c12;
      }
      
      .diff-moved {
        background: #eaf2f8;
        border-left: 3px solid #3498db;
      }
      
      .diff-class {
        font-weight: bold;
      }
      
      .diff-icon {
        font-size: 18px;
      }
      
      .diff-detail {
        margin-left: auto;
        color: #7f8c8d;
        font-size: 12px;
        text-align: right;
      }
      
      .more-items {
        padding: 10px;
        text-align: center;
        color: #999;
        font-style: italic;
      }
      
      .side-by-side-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      
      .schedule-column h4 {
        text-align: center;
        color: #4a4a4a;
        margin-top: 5px;
      }
    `;

    document.head.appendChild(style);
  }
}

// Global export
if (typeof window !== "undefined") {
  window.ScheduleComparisonTool = ScheduleComparisonTool;
  console.log("✅ ScheduleComparisonTool yüklendi");
}

// 🌍 Global erişim
window.ScheduleComparisonTool = ScheduleComparisonTool;
console.log("📦 ScheduleComparisonTool global erişim aktif!");
