/**
 * ============================================
 * IMPACTED TEACHER FINDER - Etkilenen Öğretmen Bulucu
 * ============================================
 * Çizelge (Timetable) üzerindeki bir değişiklikten
 * direkt, dolaylı ve zincirleme (cascade) olarak
 * etkilenecek öğretmenleri tespit eder ve skorlar.
 *
 * Özellikler:
 * - Direkt ve Dolaylı Etki Tespiti
 * - Zincirleme Etki (Cascade) Takibi
 * - Çakışma (Conflict) ve Risk Analizi
 * - Etki Şiddeti (Severity Scoring) Puanlaması
 */

class ImpactedTeacherFinder {
  // EtkilenenOgretmenFinder yerine daha standart bir isim (Türkçe yorumlar korundu)
  /**
   * @param {object} [config] - Yapılandırma ayarları.
   */
  constructor(config = {}) {
    this.config = {
      analyzeIndirect: true, // Dolaylı etkileri analiz et
      maxDepth: 4, // Zincirleme (Cascade) derinliği
      minSeverityScore: 50, // Rapora dahil edilecek minimum skor
      ...config,
    };

    this.impacts = []; // Tüm etki kayıtları
    this.cascadeChain = []; // Zincirleme etki adımları
    this.processedTeacherIds = new Set(); // Tekrar eden etkiyi engellemek için

    this.stats = {
      totalTeachers: 0,
      directlyImpacted: 0,
      indirectlyImpacted: 0,
      cascadeImpacted: 0,
      maxCascadeDepth: 0,
      criticalConflicts: 0,
    };

    window.logger?.info(
      "ImpactedTeacherFinder başlatıldı",
      { config: this.config },
      "ImpactFinder"
    );
  }

  // ============================================
  // ANA ANALİZ FONKSİYONU
  // ============================================

  /**
   * Çizelge üzerindeki bir değişikliği analiz eder.
   * @param {Object} solution - Mevcut çizelge çözümü (Örn: { classId: { day: { time: { teacherId, lessonId } } } })
   * @param {Object} change - Analiz edilecek değişiklik objesi.
   * @param {Array<Object>} allTeachers - Tüm öğretmenlerin listesi (ek bilgi için).
   * @returns {Object} Analiz sonuçları.
   */
  analyze(solution, change, allTeachers) {
    this.impacts = [];
    this.cascadeChain = [];
    this.processedTeacherIds.clear();
    this.stats = {
      totalTeachers: allTeachers.length,
      directlyImpacted: 0,
      indirectlyImpacted: 0,
      cascadeImpacted: 0,
      maxCascadeDepth: 0,
      criticalConflicts: 0,
    };

    window.logger?.debug(
      `Analiz başlatıldı: ${change.type}`,
      change,
      "ImpactFinder"
    );

    // 1. Direkt etkilenenleri bul
    const directImpacts = this.findDirectImpacts(solution, change);
    this.addImpacts(directImpacts);
    this.stats.directlyImpacted = directImpacts.length;

    // 2. Dolaylı etkilenenleri bul (Sadece direkt etkilenenlerden kaynaklanan komşu/eş zamanlı etkiler)
    if (this.config.analyzeIndirect) {
      const indirectImpacts = this.findIndirectImpacts(solution, directImpacts);
      this.addImpacts(indirectImpacts);
      this.stats.indirectlyImpacted = indirectImpacts.length;
    }

    // 3. Zincirleme (Cascade) analizi (Daha derin, kural tabanlı etkileşimler)
    if (this.impacts.length > 0) {
      this.analyzeCascade(solution, directImpacts);
      this.stats.maxCascadeDepth = this.cascadeChain.length;
    }

    // 4. Severity Skorlama ve Filtreleme
    this.scoreAndFilterImpacts(solution, change);

    // Toplam etkilenen sayısını güncelle
    this.stats.impactedTeachers = this.impacts.length;

    window.logger?.info("Analiz tamamlandı.", this.stats, "ImpactFinder");

    return {
      impacts: this.impacts,
      cascade: this.cascadeChain,
      stats: this.stats,
    };
  }

  // ============================================
  // YARDIMCI ETKİ KAYIT METOTLARI
  // ============================================

  /**
   * Yeni etki kayıtlarını listeye ekler ve tekrarları önler.
   */
  addImpacts(newImpacts) {
    newImpacts.forEach((impact) => {
      if (!this.processedTeacherIds.has(impact.teacherId)) {
        this.impacts.push(impact);
        this.processedTeacherIds.add(impact.teacherId);
        if (impact.type === "cascade") this.stats.cascadeImpacted++;
        if (impact.severity === "critical") this.stats.criticalConflicts++;
      }
    });
  }

  // ============================================
  // DİREKT ETKİ ANALİZİ (Değişikliğin Odak Noktası)
  // ============================================

  findDirectImpacts(solution, change) {
    let impacts = [];

    // Metot isimlerini daha temiz tutmak için switch case'i kullanıyoruz.
    const handler = this[`analyze_${change.type}`];

    if (typeof handler === "function") {
      impacts = handler.call(this, solution, change);
    } else {
      window.logger?.warn(
        `Bilinmeyen değişiklik tipi: ${change.type}`,
        null,
        "ImpactFinder"
      );
    }

    return impacts;
  }

  // Örnek: Ders Ekleme Analizi
  analyze_add_lesson(solution, change) {
    const impacts = [];
    const { classId, day, time, teacherId } = change;

    // 1. Dersin atanacağı öğretmen (Direkt)
    impacts.push({
      teacherId,
      type: "direct",
      reason: "lesson_added",
      severity: "low",
      details: { classId, day, time, action: "Yeni ders atandı" },
    });

    // 2. Aynı zamanda başka dersi olan öğretmenler (Kritik Çakışma)
    for (const cId in solution) {
      const slot = solution[cId]?.[day]?.[time];
      if (slot && slot.teacherId !== teacherId) {
        // Kritiğe yükseltildi: Bu, çizelgenin kuralını bozan bir durumdur.
        impacts.push({
          teacherId: slot.teacherId,
          type: "direct", // Temel kural ihlali olduğu için direct kabul edilebilir
          reason: "critical_conflict",
          severity: "critical",
          details: {
            classId: cId,
            day,
            time,
            action: `Kritik Çakışma: ${teacherId} öğretmeni ile aynı anda dersi var`,
          },
        });
      }
    }
    return impacts;
  }

  // Örnek: Öğretmen Değiştirme Analizi
  analyze_change_teacher(solution, change) {
    const impacts = [];
    const { classId, day, time, oldTeacherId, newTeacherId } = change;

    // 1. Eski öğretmen (dersi alındığı için)
    impacts.push({
      teacherId: oldTeacherId,
      type: "direct",
      reason: "teacher_removed_from_slot",
      severity: "high",
      details: { classId, day, time, action: "Ders boşaltıldı" },
    });

    // 2. Yeni öğretmen (ders atandığı için)
    impacts.push({
      teacherId: newTeacherId,
      type: "direct",
      reason: "teacher_assigned_to_slot",
      severity: "high",
      details: { classId, day, time, action: "Yeni ders ataması" },
    });

    // 3. Yeni öğretmenin aynı anda başka dersi varsa (Kritik Çakışma)
    for (const cId in solution) {
      if (cId === classId) continue;
      const slot = solution[cId]?.[day]?.[time];
      if (slot && slot.teacherId === newTeacherId) {
        impacts.push({
          teacherId: newTeacherId,
          type: "direct",
          reason: "critical_conflict",
          severity: "critical",
          details: {
            classId: cId,
            day,
            time,
            action: `Kritik Çakışma: ${cId} sınıfında zaten dersi var`,
          },
        });
      }
    }

    return impacts;
  }

  // Diğer direkt etki analiz metotları (move_lesson, swap_lesson, remove_lesson, vs.) bu şekilde eklenebilir.
  analyze_remove_lesson(solution, change) {
    const { teacherId, classId, day, time } = change;
    return [
      {
        teacherId,
        type: "direct",
        reason: "lesson_removed",
        severity: "medium",
        details: {
          classId,
          day,
          time,
          action: "Ders kaldırıldı, boş zaman oluştu",
        },
      },
    ];
  }

  analyze_move_lesson(solution, change) {
    const { teacherId, from, to } = change;
    const impacts = [];
    // Öğretmen için genel etki
    impacts.push({
      teacherId,
      type: "direct",
      reason: "lesson_moved",
      severity: "medium",
      details: { from, to, action: "Dersin konumu değişti" },
    });
    // Hedef slotta çakışma kontrolü
    const targetSlot = solution[to.classId]?.[to.day]?.[to.time];
    if (targetSlot && targetSlot.teacherId !== teacherId) {
      impacts.push({
        teacherId: targetSlot.teacherId,
        type: "direct",
        reason: "critical_conflict",
        severity: "critical",
        details: {
          classId: to.classId,
          day: to.day,
          time: to.time,
          action: "Hedef slotta çakışma",
        },
      });
    }
    return impacts;
  }

  analyze_swap_lesson(solution, change) {
    const { slotA, slotB } = change;
    const impacts = [];
    const lessonA = solution[slotA.classId]?.[slotA.day]?.[slotA.time];
    const lessonB = solution[slotB.classId]?.[slotB.day]?.[slotB.time];

    if (lessonA)
      impacts.push({
        teacherId: lessonA.teacherId,
        type: "direct",
        reason: "lesson_swapped",
        severity: "medium",
        details: { from: slotA, to: slotB, action: "Ders takas edildi" },
      });
    if (lessonB && lessonB.teacherId !== lessonA?.teacherId) {
      impacts.push({
        teacherId: lessonB.teacherId,
        type: "direct",
        reason: "lesson_swapped",
        severity: "medium",
        details: { from: slotB, to: slotA, action: "Ders takas edildi" },
      });
    }
    return impacts;
  }

  // ============================================
  // DOLAYLI ETKİ ANALİZİ (Komşu/Eş Zamanlı Etkiler)
  // ============================================

  findIndirectImpacts(solution, directImpacts) {
    const indirectImpacts = [];

    // Sadece ders saati bilgisi olan direkt etkileri işle
    for (const impact of directImpacts.filter(
      (i) => i.details.day && i.details.time
    )) {
      // 1. Aynı sınıftaki komşu saatler
      const neighbors = this.findNeighborTeachers(solution, impact);

      for (const neighbor of neighbors) {
        // Zaten direkt etkilenen bir öğretmense tekrar ekleme
        if (!this.processedTeacherIds.has(neighbor.teacherId)) {
          indirectImpacts.push({
            ...neighbor, // teacherId, details
            type: "indirect",
            reason: "adjacent_slot_change",
            severity: "low",
            causedBy: impact.teacherId,
            details: {
              ...neighbor.details,
              action:
                "Komşu ders saati değiştiği için bekleme süresi etkilendi",
            },
          });
        }
      }
    }

    return indirectImpacts;
  }

  /**
   * Belirli bir slotun hemen öncesindeki ve sonrasındaki öğretmenleri bulur.
   */
  findNeighborTeachers(solution, impact) {
    const neighbors = [];
    const { classId, day, time } = impact.details;
    const timeInt = parseInt(time);

    // Önceki ve sonraki saatler (1'den 8'e kadar olduğunu varsayalım)
    const adjacentTimes = [timeInt - 1, timeInt + 1];

    for (const adjTime of adjacentTimes) {
      if (adjTime < 1 || adjTime > 8) continue;

      const slot = solution[classId]?.[day]?.[adjTime];
      if (slot && slot.teacherId) {
        neighbors.push({
          teacherId: slot.teacherId,
          details: { classId, day, time: adjTime },
        });
      }
    }
    return neighbors;
  }

  // ============================================
  // ZİNCİRLEME (CASCADE) ANALİZİ
  // ============================================

  /**
   * Değişiklikten dolayı dolaylı olarak etkilenecek derin seviye öğretmenleri bulur.
   * (Örn: Aynı sınıfa giren veya aynı branşı paylaşan öğretmenler).
   */
  analyzeCascade(solution, initialImpacts) {
    let currentLevel = initialImpacts;
    let depth = 0;

    // Mevcut etkileri zincirleme analizi için başlangıç noktası yap
    this.cascadeChain = [];

    // Tekrar analiz etmemek için sadece initialImpacts'teki id'leri set'e ekle
    const processedThisRun = new Set(initialImpacts.map((i) => i.teacherId));

    while (currentLevel.length > 0 && depth < this.config.maxDepth) {
      this.cascadeChain.push({
        level: depth,
        impacts: currentLevel,
      });

      const nextLevel = [];

      for (const impact of currentLevel) {
        // Kural 1: Etkilenen öğretmenin girdiği diğer sınıflarda ders verenler
        const dependent = this.findDependentTeachersByClass(solution, impact);
        nextLevel.push(...dependent);
      }

      // Tekrarları filtrele ve bir sonraki seviyeye geç
      currentLevel = nextLevel.filter((i) => {
        const isNew =
          !this.processedTeacherIds.has(i.teacherId) &&
          !processedThisRun.has(i.teacherId);
        if (isNew) {
          processedThisRun.add(i.teacherId);
          this.processedTeacherIds.add(i.teacherId); // Genel işlenmiş listeye ekle
          this.stats.cascadeImpacted++; // Cascade sayacını artır
          return true;
        }
        return false;
      });

      depth++;
    }
    this.stats.maxCascadeDepth = depth;
  }

  /**
   * Belirli bir öğretmenden, aynı sınıflara girmesi sebebiyle etkilenebilecek diğer öğretmenleri bulur.
   */
  findDependentTeachersByClass(solution, impact) {
    const dependent = [];
    const affectedTeacherId = impact.teacherId;

    // Öğretmenin tüm ders saatlerini bul
    const affectedTeacherSlots = this.getTeacherSlots(
      solution,
      affectedTeacherId
    );

    // Öğretmenin girdiği sınıfların listesi
    const affectedClasses = new Set(affectedTeacherSlots.map((s) => s.classId));

    // Bu sınıflara giren diğer öğretmenleri bul
    for (const classId of affectedClasses) {
      for (const day in solution[classId]) {
        for (const time in solution[classId][day]) {
          const slot = solution[classId][day][time];

          if (slot.teacherId && slot.teacherId !== affectedTeacherId) {
            dependent.push({
              teacherId: slot.teacherId,
              type: "cascade",
              reason: "shared_class_schedule",
              severity: "very_low",
              details: {
                classId,
                day,
                time: parseInt(time),
                action: `${classId} sınıfında dersi olduğu için programı esneyebilir`,
              },
              causedBy: affectedTeacherId,
            });
          }
        }
      }
    }
    return dependent;
  }

  /**
   * Bir öğretmenin tüm ders slotlarını döndürür.
   */
  getTeacherSlots(solution, teacherId) {
    const slots = [];
    for (const classId in solution) {
      for (const day in solution[classId]) {
        for (const time in solution[classId][day]) {
          if (solution[classId][day][time].teacherId === teacherId) {
            slots.push({ classId, day, time: parseInt(time) });
          }
        }
      }
    }
    return slots;
  }

  // ============================================
  // SEVERITY SKORLAMA VE FİLTRELEME
  // ============================================

  /**
   * Etkileri skorlar ve konfigürasyona göre filtreler.
   */
  scoreAndFilterImpacts(solution, change) {
    for (const impact of this.impacts) {
      let score = 0;

      // Temel Tip Skorları
      switch (impact.type) {
        case "direct":
          score += 200;
          break;
        case "indirect":
          score += 100;
          break;
        case "cascade":
          score += 50;
          break;
      }

      // Önceden Belirlenmiş Severity Skorları
      const severityMap = {
        critical: 300, // Çizelge kuralı ihlali
        high: 150, // Ders saati/öğretmen değişimi
        medium: 75, // Dersin yeri değişimi (öğretmenin yükü)
        low: 25, // Yeni ders atanması (genellikle pozitif ama bir değişiklik)
        very_low: 5, // Aynı sınıfa girme gibi dolaylı etkiler
      };
      score += severityMap[impact.severity] || 0;

      // Özel Durum Bonusları
      if (impact.reason.includes("conflict")) score += 100; // Çakışmalar ekstra önemlidir
      if (impact.reason.includes("removed")) score += 75; // Dersin alınması/kaybedilmesi

      impact.impactScore = score;
    }

    // Skora göre sırala (en yüksek risk en üstte)
    this.impacts.sort((a, b) => b.impactScore - a.impactScore);

    // Konfigürasyona göre filtrele
    if (this.config.minSeverityScore > 0) {
      this.impacts = this.impacts.filter(
        (i) => i.impactScore >= this.config.minSeverityScore
      );
    }
  }

  // ============================================
  // RAPORLAMA VE ÇIKTI
  // ============================================

  getReport() {
    return {
      summary: {
        totalTeachers: this.stats.totalTeachers,
        impactedTeachers: this.impacts.length,
        directImpacts: this.stats.directlyImpacted,
        indirectImpacts: this.stats.indirectlyImpacted,
        cascadeImpacted: this.stats.cascadeImpacted,
        maxCascadeDepth: this.stats.maxCascadeDepth,
        criticalConflicts: this.stats.criticalConflicts,
      },
      impacts: this.impacts,
      cascade: this.cascadeChain,
      topImpacted: this.impacts.slice(0, 5), // En çok etkilenen ilk 5 öğretmen
    };
  }

  printReport() {
    const report = this.getReport();

    console.log("\n🔥 ETKİLENEN ÖĞRETMEN ANALİZ RAPORU");
    console.log("=".repeat(60));

    console.log("\n📊 Özet:");
    console.log(`  • Toplam Öğretmen: ${report.summary.totalTeachers}`);
    console.log(
      `  • Etkilenen (Filtreli): ${report.summary.impactedTeachers} / ${
        this.stats.directlyImpacted +
        this.stats.indirectlyImpacted +
        this.stats.cascadeImpacted
      } (Toplam Etkilenen)`
    );
    console.log(
      `  • Kritik Çakışma: ${
        report.summary.criticalConflicts > 0 ? "🔴 EVET" : "🟢 HAYIR"
      }`
    );
    console.log(`  • Cascade Derinliği: ${report.summary.maxCascadeDepth}`);

    if (report.topImpacted.length > 0) {
      console.log("\n🚨 En Yüksek Riskli Öğretmenler:");
      report.topImpacted.forEach((impact, i) => {
        console.log(
          `  ${i + 1}. Öğr. ID: ${impact.teacherId} | Risk: ${
            impact.impactScore
          } | Tip: ${impact.type} | Sebep: ${impact.details.action}`
        );
      });
    }

    if (report.cascade.length > 0) {
      console.log("\n🔗 Zincirleme Etki (Cascade) Analizi:");
      report.cascade.forEach((level, i) => {
        console.log(
          `  Seviye ${i} (${level.impacts[0].type}): ${level.impacts.length} öğretmen etkilendi.`
        );
      });
    }

    console.log("=".repeat(60) + "\n");
  }
}

// Global export
if (typeof window !== "undefined") {
  window.ImpactedTeacherFinder = ImpactedTeacherFinder;
  window.logger?.info(
    "ImpactedTeacherFinder yüklendi ve global erişim aktif!",
    null,
    "ImpactFinder"
  );
}
