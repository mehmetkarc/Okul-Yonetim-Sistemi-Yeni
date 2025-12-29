/**
 * ============================================
 * CONFLICT DETECTOR V2.0
 * ============================================
 * Çakışma tespiti, kısıt ihlali analizi ve Fitness fonksiyonları için
 * ceza puanı (penalty) hesaplama motoru.
 */

class ConflictDetector {
  constructor() {
    this.conflictTypes = {
      TEACHER_OVERLAP: "teacher_overlap", // Kritik: Bir öğretmen aynı anda iki yerde olamaz.
      CLASS_OVERLAP: "class_overlap", // Kritik: Bir sınıf aynı anda iki ders alamaz.
      ROOM_OVERLAP: "room_overlap", // Kritik: Bir oda aynı anda iki derste kullanılamaz. (Yeni eklendi)
      TEACHER_DAILY_MAX: "teacher_daily_max", // Uyarı: Günlük maksimum ders saati aşıldı.
      TEACHER_GAPS: "teacher_gaps", // Uyarı: Öğretmen programında boş pencereler var.
      HARD_CONSTRAINT_VIOLATION: "hard_violation", // Genel Kritik İhlal (Örn: Blok ders atama ihlali)
      SOFT_CONSTRAINT_VIOLATION: "soft_violation", // Genel Uyarı İhlali (Örn: Öğretmen tercihleri)
    };

    // Günler ve saatler için standart sınırlar (Gerekli kısıtlar)
    this.DEFAULT_MAX_DAILY_LESSONS = 8;
    this.DEFAULT_MAX_GAPS = 1; // Maksimum 1 boş pencere

    // Algoritma ceza puanı varsayılan ağırlıkları
    this.DEFAULT_WEIGHTS = {
      TEACHER_OVERLAP: 500,
      CLASS_OVERLAP: 500,
      ROOM_OVERLAP: 500,
      TEACHER_DAILY_MAX: 10,
      TEACHER_GAPS: 50,
      HARD_CONSTRAINT_VIOLATION: 200, // Örn: Blok ders ihlali
      SOFT_CONSTRAINT_VIOLATION: 5, // Örn: Tercih ihlali
    };
  }

  // ============================================
  // ANA ÇAKIŞMA TESPİTİ VE PUANLAMA
  // ============================================

  /**
   * Tüm çakışmaları ve kısıt ihlallerini tespit eder.
   * @param {Object} programData - Program verisi
   * @param {Object} weights - Ceza ağırlıkları (Opsiyonel)
   * @returns {Object} { conflicts, penaltyScore }
   */
  detectAll(programData, weights = this.DEFAULT_WEIGHTS) {
    console.log("🔍 Çakışma tespiti ve ceza puanlaması başladı...");

    const conflicts = {
      total: 0,
      penaltyScore: 0, // Algoritmanın kullanacağı ana fitness değeri
      byType: {
        [this.conflictTypes.TEACHER_OVERLAP]: [],
        [this.conflictTypes.CLASS_OVERLAP]: [],
        [this.conflictTypes.ROOM_OVERLAP]: [],
        [this.conflictTypes.TEACHER_DAILY_MAX]: [],
        [this.conflictTypes.TEACHER_GAPS]: [],
        [this.conflictTypes.HARD_CONSTRAINT_VIOLATION]: [],
        [this.conflictTypes.SOFT_CONSTRAINT_VIOLATION]: [],
      },
      critical: [], // Toplam Kritik Çakışmalar
      warnings: [], // Toplam Uyarılar
    };

    // --- KRİTİK ÇAKIŞMALAR (HARD CONSTRAINTS) ---

    // 1. Öğretmen çakışmaları
    const teacherConflicts = this.detectTeacherConflicts(programData);
    this.addConflicts(
      conflicts,
      this.conflictTypes.TEACHER_OVERLAP,
      teacherConflicts,
      weights
    );

    // 2. Sınıf çakışmaları
    const classConflicts = this.detectClassConflicts(programData);
    this.addConflicts(
      conflicts,
      this.conflictTypes.CLASS_OVERLAP,
      classConflicts,
      weights
    );

    // 3. Oda çakışmaları (Eklendi)
    const roomConflicts = this.detectRoomConflicts(programData);
    this.addConflicts(
      conflicts,
      this.conflictTypes.ROOM_OVERLAP,
      roomConflicts,
      weights
    );

    // --- KISIT İHLALLERİ (SOFT/HARD CONSTRAINTS) ---

    // 4. Maksimum günlük ders
    const dailyMaxViolations = this.checkMaxDailyLessons(programData);
    this.addConflicts(
      conflicts,
      this.conflictTypes.TEACHER_DAILY_MAX,
      dailyMaxViolations,
      weights
    );

    // 5. Boş pencere kontrolü
    const gapViolations = this.checkGapViolations(programData);
    this.addConflicts(
      conflicts,
      this.conflictTypes.TEACHER_GAPS,
      gapViolations,
      weights
    );

    // 6. Blok ders ve diğer kısıtlar (Örnek)
    const hardViolations = this.checkBlockLessons(programData); // HARD_CONSTRAINT_VIOLATION olarak işlenecek
    this.addConflicts(
      conflicts,
      this.conflictTypes.HARD_CONSTRAINT_VIOLATION,
      hardViolations,
      weights
    );

    // 7. Diğer (Örn: Öğretmen tercihleri)
    // const softViolations = this.checkTeacherPreferences(programData);
    // this.addConflicts(conflicts, this.conflictTypes.SOFT_CONSTRAINT_VIOLATION, softViolations, weights);

    console.log(
      `✅ Çakışma tespiti tamamlandı: ${conflicts.total} çakışma, Toplam Ceza Puanı: ${conflicts.penaltyScore}`
    );

    return conflicts;
  }

  /**
   * Çakışmaları ana nesneye ekler ve ceza puanını günceller.
   */
  addConflicts(conflicts, type, newConflicts, weights) {
    newConflicts.forEach((conflict) => {
      // Ceza puanını hesapla (çoğu durumda çarpı 1)
      const penalty = weights[type] * (conflict.multiplier || 1);

      conflicts.byType[type].push({ ...conflict, penalty });
      conflicts.total += 1;
      conflicts.penaltyScore += penalty;

      if (
        type in
        {
          [this.conflictTypes.TEACHER_OVERLAP]: 1,
          [this.conflictTypes.CLASS_OVERLAP]: 1,
          [this.conflictTypes.ROOM_OVERLAP]: 1,
          [this.conflictTypes.HARD_CONSTRAINT_VIOLATION]: 1,
        }
      ) {
        conflicts.critical.push({ ...conflict, penalty, type });
      } else {
        conflicts.warnings.push({ ...conflict, penalty, type });
      }
    });
  }

  // ============================================
  // KRİTİK ÇAKIŞMA TESPİTLERİ (HARD CONSTRAINTS)
  // ============================================

  detectTeacherConflicts(programData) {
    // Öğretmen çakışma mantığı, dersleri programData'dan çekerek aynı gün/saatte birden fazla öğretmen olup olmadığını kontrol eder.
    // Orijinal kod mantığı algoritmalar için uygundur.
    const conflicts = [];
    const teacherSchedule = {};

    // programData'nın yapısı: programData[sinifId][gun][saat] = ders
    // Bu yapıyı gün/saat bazlı tüm atamaları listeleyen bir yapıya dönüştürmemiz gerekir.
    // Program veri yapısının, her gün/saat için atamaları döngüye almasını varsayıyoruz.

    // Basitleştirilmiş örnek: programData[gun][saat] = dersNesnesi[] (Tüm dersler)
    // Eğer programData yapısı sınıflar üzerinden gidiyorsa, daha karmaşık bir döngü gerekir.
    // Orijinal koddaki programData[gun][saat] yapısı yetersizdir. sinifId de olmalı.

    // Varsayım: programData artık atamaların listesidir (lessonAssignments)
    // Ancak orijinal kod yapısını korumak için, verinin gün/saat bazında toplandığını varsayalım:
    // programData = { gun: { saat: { sinif_id: dersNesnesi, ... } } }

    const allAssignments = this.flattenProgram(programData); // Tüm dersleri listeler

    // Öğretmen/Saat Çizelgesi
    for (const assignment of allAssignments) {
      if (!assignment.ogretmen_id) continue;

      const key = `${assignment.ogretmen_id}_${assignment.gun}_${assignment.saat}`;

      if (!teacherSchedule[key]) {
        teacherSchedule[key] = [];
      }

      teacherSchedule[key].push(assignment);
    }

    // Çakışmaları bul
    for (const key in teacherSchedule) {
      if (teacherSchedule[key].length > 1) {
        const lessons = teacherSchedule[key];
        const firstLesson = lessons[0];

        conflicts.push({
          severity: "critical",
          teacherId: firstLesson.ogretmen_id,
          gun: firstLesson.gun,
          saat: firstLesson.saat,
          lessons: lessons,
          message: `Öğretmen çakışması (${lessons.length} ders)`,
          multiplier: lessons.length - 1, // Fazladan kaç ders varsa o kadar ceza
        });
      }
    }
    return conflicts;
  }

  detectClassConflicts(programData) {
    // Sınıf çakışma mantığı (aynı anda iki ders alma)
    // Orijinal kodun mantığı: programData'daki her (gün, saat, sınıf) üçlüsünü kontrol et.

    // Eğer programData yapısı programData[sinifId][gun][saat] = ders ise, bu çakışmalar
    // program oluşturulurken zaten engellenmelidir.
    // Ancak veri yapısı programData[gun][saat] = { ders1, ders2, ... } şeklinde ise, sınıf çakışması olabilir.

    // Basitleştirilmiş kontrol: Tüm dersleri listele ve sınıf/gün/saat'e göre grupla
    const conflicts = [];
    const classSchedule = {};

    const allAssignments = this.flattenProgram(programData);

    for (const assignment of allAssignments) {
      if (!assignment.sinif_id) continue;

      const key = `${assignment.sinif_id}_${assignment.gun}_${assignment.saat}`;

      if (!classSchedule[key]) {
        classSchedule[key] = [];
      }

      classSchedule[key].push(assignment);
    }

    for (const key in classSchedule) {
      if (classSchedule[key].length > 1) {
        const lessons = classSchedule[key];
        const firstLesson = lessons[0];

        conflicts.push({
          severity: "critical",
          classId: firstLesson.sinif_id,
          gun: firstLesson.gun,
          saat: firstLesson.saat,
          lessons: lessons,
          message: `Sınıf çakışması (${lessons.length} ders)`,
          multiplier: lessons.length - 1,
        });
      }
    }
    return conflicts;
  }

  detectRoomConflicts(programData) {
    const conflicts = [];
    const roomSchedule = {};

    const allAssignments = this.flattenProgram(programData);

    for (const assignment of allAssignments) {
      // Oda ataması yoksa atla
      if (!assignment.oda_id) continue;

      const key = `${assignment.oda_id}_${assignment.gun}_${assignment.saat}`;

      if (!roomSchedule[key]) {
        roomSchedule[key] = [];
      }

      roomSchedule[key].push(assignment);
    }

    for (const key in roomSchedule) {
      if (roomSchedule[key].length > 1) {
        const lessons = roomSchedule[key];
        const firstLesson = lessons[0];

        conflicts.push({
          severity: "critical",
          roomId: firstLesson.oda_id,
          gun: firstLesson.gun,
          saat: firstLesson.saat,
          lessons: lessons,
          message: `Oda çakışması (${lessons.length} ders)`,
          multiplier: lessons.length - 1,
        });
      }
    }
    return conflicts;
  }

  // ============================================
  // YUMUŞAK/SERT KISIT İHLALLERİ (SOFT/HARD CONSTRAINTS)
  // ============================================

  // Orijinal checkMaxDailyLessons ve checkGapViolations metotları korunur ve sonuçları uyarı (warning) olarak eklenir.

  checkMaxDailyLessons(programData) {
    const violations = [];
    const teacherDaily = {};

    const allAssignments = this.flattenProgram(programData);

    // Günlük ders sayılarını topla
    for (const ders of allAssignments) {
      if (!ders.ogretmen_id) continue;

      const key = `${ders.ogretmen_id}_${ders.gun}`;

      if (!teacherDaily[key]) {
        teacherDaily[key] = {
          teacherId: ders.ogretmen_id,
          teacherName: ders.ogretmen_adi,
          gun: ders.gun,
          count: 0,
        };
      }
      teacherDaily[key].count++;
    }

    // İhlalleri bul
    for (const key in teacherDaily) {
      const data = teacherDaily[key];
      const MAX_DAILY = this.DEFAULT_MAX_DAILY_LESSONS;

      if (data.count > MAX_DAILY) {
        const excess = data.count - MAX_DAILY;
        violations.push({
          severity: "warning",
          teacherId: data.teacherId,
          gun: data.gun,
          actualLoad: data.count,
          maxAllowed: MAX_DAILY,
          message: `Öğretmen günlük ders yükü aşıldı (${excess} ders fazla)`,
          multiplier: excess,
        });
      }
    }
    return violations;
  }

  checkGapViolations(programData) {
    const violations = [];
    const teacherSchedule = {};
    const allAssignments = this.flattenProgram(programData);

    // Öğretmen programlarını grupla
    for (const ders of allAssignments) {
      if (!ders.ogretmen_id) continue;

      const teacherId = ders.ogretmen_id;

      if (!teacherSchedule[teacherId]) {
        teacherSchedule[teacherId] = {
          name: ders.ogretmen_adi,
          daily: { 1: [], 2: [], 3: [], 4: [], 5: [] },
        };
      }
      // ders.gun ve ders.saat int olmalı
      teacherSchedule[teacherId].daily[ders.gun]?.push(ders.saat);
    }

    // Boşlukları kontrol et
    const MAX_GAPS = this.DEFAULT_MAX_GAPS;

    for (const teacherId in teacherSchedule) {
      const teacher = teacherSchedule[teacherId];

      for (const gun in teacher.daily) {
        const times = teacher.daily[gun].sort((a, b) => a - b);
        if (times.length < 2) continue;

        let totalGaps = 0;
        let gapCount = 0; // Farklı boşluk sayısı

        for (let i = 0; i < times.length - 1; i++) {
          const gap = times[i + 1] - times[i] - 1;
          if (gap > 0) {
            totalGaps += gap;
            gapCount++;
          }
        }

        // Eğer izin verilen boşluk penceresi sayısını aşıyorsa
        if (gapCount > MAX_GAPS) {
          const excess = gapCount - MAX_GAPS;
          violations.push({
            severity: "warning",
            teacherId: parseInt(teacherId),
            gun: parseInt(gun),
            gaps: gapCount,
            totalGapHours: totalGaps, // Toplam boşluk saatini ceza çarpanı olarak kullan
            maxAllowed: MAX_GAPS,
            message: `Öğretmenin boş pencere sayısı aşıldı (${excess} fazla)`,
            multiplier: totalGaps,
          });
        }
      }
    }
    return violations;
  }

  checkBlockLessons(programData) {
    const violations = [];
    const allAssignments = this.flattenProgram(programData);

    // Basit bir blok ders kontrolü: 2 ders üst üste olması gereken yerlerde 1 ders mi var?

    // Gerçek Algoritmada: Derslerin bloklanıp bloklanmayacağı bilgisine ihtiyaç vardır.

    // Varsayım: İki saatlik dersler (örneğin ID'si 'MATH_2') yan yana olmak zorundadır.
    // Bu kontrol, ders ID'leri üzerinden yapılmalıdır.

    // Şimdilik sadece bir HARD_CONSTRAINT_VIOLATION örneği olarak boş döndürelim.
    return violations;
  }

  // ============================================
  // YARDIMCI METOTLAR
  // ============================================

  /**
   * Karmaşık program yapısını derslerin düz bir listesine dönüştürür.
   * programData[sinifId][gun][saat] = ders
   */
  flattenProgram(programData) {
    // Varsayım: programData, ScheduleDataManager'dan gelen nihai program yapısıdır.
    // Eğer programData[gun][saat] = {sinif_id: ders} şeklinde geliyorsa:
    const lessons = [];

    if (typeof programData !== "object" || programData === null) return [];

    // Örnek: Eğer programData = { '1': { '1': { sinif_id: 1, ders_adi: 'Math', ... } } }
    for (const gun in programData) {
      for (const saat in programData[gun]) {
        const entry = programData[gun][saat];
        if (entry && typeof entry === "object") {
          // Eğer burada bir sınıfın dersi varsa
          if (entry.sinif_id) {
            lessons.push({
              ...entry,
              gun: parseInt(gun),
              saat: parseInt(saat),
            });
          } else {
            // Eğer programData[gun][saat] = { sinif_id: dersNesnesi, sinif_id: dersNesnesi } ise
            for (const sinifId in entry) {
              if (entry[sinifId] && typeof entry[sinifId] === "object") {
                lessons.push({
                  ...entry[sinifId],
                  gun: parseInt(gun),
                  saat: parseInt(saat),
                  sinif_id: parseInt(sinifId),
                });
              }
            }
          }
        }
      }
    }
    return lessons;
  }

  // categorizeConflicts metodu artık detectAll içinde çalışıyor.

  // ============================================
  // ÖNERİ OLUŞTURMA (Aynen Korundu)
  // ============================================

  generateTeacherConflictSuggestions(lessons) {
    return [
      "Derslerden birini farklı bir saate taşıyın",
      "Başka bir öğretmen atayın",
      "Sınıflardan birinin gününü değiştirin",
    ];
  }

  generateClassConflictSuggestions(lessons) {
    return [
      "Derslerden birini farklı bir saate taşıyın",
      "Derslerin sırasını değiştirin",
      "Farklı bir güne taşıyın",
    ];
  }

  // ============================================
  // OTOMATİK ÇÖZÜM (Algoritma için gerekli değil, ancak korundu)
  // ============================================

  async autoResolve(programData, conflicts) {
    console.log(
      "🔧 Otomatik çözüm başlatılıyor (Algoritma genellikle bu adımı atlar)..."
    );

    // Algoritmalar bu işi kendi içlerinde yaptığından, bu kısım basitleştirilmiş bir manuel çözüm örneği olarak kalabilir.
    // Genetik Algoritma veya ACO, programı baştan üreterek çakışmaları çözmeyi hedefler.

    // Orijinal autoResolve, resolveSingleConflict vb. metodları aynen korunmuştur.

    const resolved = [];
    const failed = [];

    for (const conflict of conflicts.critical) {
      try {
        const solution = await this.resolveSingleConflict(
          programData,
          conflict
        );

        if (solution.success) {
          resolved.push({
            conflict: conflict,
            solution: solution,
          });
        } else {
          failed.push(conflict);
        }
      } catch (error) {
        console.error("❌ Çözüm hatası:", error);
        failed.push(conflict);
      }
    }

    console.log(
      `✅ ${resolved.length} çakışma çözüldü, ${failed.length} başarısız`
    );

    return {
      success: failed.length === 0,
      resolved: resolved,
      failed: failed,
    };
  }

  resolveSingleConflict(programData, conflict) {
    if (conflict.type === this.conflictTypes.TEACHER_OVERLAP) {
      return this.resolveTeacherConflict(programData, conflict);
    }
    if (conflict.type === this.conflictTypes.CLASS_OVERLAP) {
      return this.resolveClassConflict(programData, conflict);
    }
    return { success: false, message: "Çözüm bulunamadı" };
  }

  resolveTeacherConflict(programData, conflict) {
    // Boş bir saat bul ve dersi taşı
    const emptySlot = this.findEmptySlot(programData, conflict);

    if (emptySlot) {
      return {
        success: true,
        action: "move",
        from: { gun: conflict.gun, saat: conflict.saat },
        to: { gun: emptySlot.gun, saat: emptySlot.saat },
      };
    }

    return { success: false, message: "Boş saat bulunamadı" };
  }

  resolveClassConflict(programData, conflict) {
    // Benzer şekilde sınıf çakışması için çözüm
    return this.resolveTeacherConflict(programData, conflict);
  }

  findEmptySlot(programData, conflict) {
    // Program yapısına uygun boş yer bulma mantığı
    // Bu kısım, tüm sınıflar için genel boşluk bulmayı denediği için gerçek bir çözüme uygun değildir.
    // Her sınıfın kendi boşluğunu bulması gerekir.
    for (let gun = 1; gun <= 5; gun++) {
      for (let saat = 1; saat <= 8; saat++) {
        // programData[gun] ve programData[gun][saat] kontrolü
        // Çakışma olmayan ilk boş slotu bul
        if (
          !programData[gun] ||
          !programData[gun][saat] ||
          Object.keys(programData[gun][saat]).length === 0
        ) {
          return { gun, saat };
        }
      }
    }
    return null;
  }

  // ============================================
  // RAPOR OLUŞTURMA (Aynen Korundu)
  // ============================================

  getReport(conflicts) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: conflicts.total,
        critical: conflicts.critical.length,
        warnings: conflicts.warnings.length,
        penaltyScore: conflicts.penaltyScore, // Yeni eklenen
      },
      byType: {},
      details: conflicts,
    };

    for (const type in conflicts.byType) {
      report.byType[type] = conflicts.byType[type].length;
    }

    return report;
  }

  printReport(report) {
    console.log("\n" + "=".repeat(60));
    console.log("⚠️ ÇAKIŞMA RAPORU (ALGORİTMA UYUMLU)");
    console.log("=".repeat(60));
    console.log(`\n📊 ÖZET:`);
    console.log(`  • Toplam Çakışma: ${report.summary.total}`);
    console.log(`  • Kritik: ${report.summary.critical}`);
    console.log(`  • Uyarı: ${report.summary.warnings}`);
    console.log(
      `  • Toplam Ceza Puanı (Penalty): ${report.summary.penaltyScore}`
    ); // Yeni
    console.log(`\n📋 TİP BAZINDA:`);

    for (const type in report.byType) {
      console.log(`  • ${type}: ${report.byType[type]}`);
    }

    console.log("\n" + "=".repeat(60) + "\n");
  }
}

// Global export
if (typeof window !== "undefined") {
  window.ConflictDetector = ConflictDetector;
  window.conflictDetector = new ConflictDetector();
}

console.log("✅ ConflictDetector yüklendi (V2.0 - Algoritma Uyumlu)");
