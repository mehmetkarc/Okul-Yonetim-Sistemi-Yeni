/**
 * ============================================
 * BLOCK AWARE SWAP V3.3 - AKILLI SEÇİM VE SOFT CONSTRAINT KONTROLÜ
 * ============================================
 *
 * 🟢 YENİ: Akıllı ders seçimi eklendi (%50 Aynı Sınıf İçi / %50 Farklı Sınıf-Aynı Ders).
 * 🟢 YENİ: Takasın gerçekleşmesi için Soft Constraint skorunun (Fitness) İYİLEŞMESİ veya AYNI kalması kuralı eklendi (Gereksinim 1 & 2'nin Algoritmik Karşılığı).
 * 🟢 CRITICAL FIX: (V3.1'den miras) `checkConstraints` metodu içerisindeki API uyumsuzluğu giderildi.
 */

class BlockAwareSwap {
  constructor(config = {}) {
    this.config = {
      preserveIntegrity: true,
      allowPartialSwap: false,
      checkTeacher: true,
      checkConstraints: true,
      // 💡 YENİ KONFİGÜRASYON: Eğer soft constraint (fitness) bilgisi mevcutsa kullanılır.
      // Bu, algoritmanın sadece programı DÜZENLEYEN takasları kabul etmesini sağlar.
      checkSoftConstraints: true,
      ...config,
    };

    this.swaps = [];
    this.failures = [];

    this.stats = {
      attempted: 0,
      successful: 0,
      failed: 0,
      rollbacks: 0,
      blockSwaps: 0,
      simpleSwaps: 0,
      blockedByMathRule: 0,
      blockedBySoftConstraint: 0, // Yeni istatistik
    };

    this.DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

    // 💡 NOT: calculateFullFitness fonksiyonunun dışarıdan (Örn: HybridOptimizer'dan) erişilebilir olması gerekir.
    if (typeof window.calculateFullFitness !== "function") {
      console.warn(
        "⚠️ calculateFullFitness global fonksiyonu bulunamadı. Soft Constraint kontrolü devre dışı."
      );
      this.config.checkSoftConstraints = false;
    }

    console.log(
      "🔄 BlockAwareSwap V3.3 (Akıllı Seçim/Fitness Kontrolü) başlatıldı"
    );
  }

  // ============================================
  // ANA TAKAS FONKSİYONU (ALGORİTMA UYUMLU)
  // ============================================

  swapLessons(schedule, lessons, algorithmContext = null) {
    console.log("\n🔄 BLOCK AWARE SWAP İŞLEMİ");

    if (lessons.length < 2) {
      return { success: false, error: "En az 2 ders gerekli" };
    }

    this.stats.attempted++;

    let lessonA, lessonB;

    // 🔥 YENİ: Akıllı seçim mekanizması
    // Program kalitesini artırmak için hedefli ders seçimi
    if (Math.random() < 0.5) {
      // Olasılık %50: Aynı sınıf içi takas (Farklı dersler olabilir)
      lessonA = lessons[Math.floor(Math.random() * lessons.length)];

      const sameClassLessons = lessons.filter(
        (l) => l.classId === lessonA.classId && l.id !== lessonA.id
      );

      // Eğer aynı sınıfta takas yapabileceği farklı bir ders varsa onu seç
      lessonB =
        sameClassLessons.length > 0
          ? sameClassLessons[
              Math.floor(Math.random() * sameClassLessons.length)
            ]
          : lessons[Math.floor(Math.random() * lessons.length)]; // Yoksa rastgele başka bir ders seç (nadiren)

      console.log("   🔎 Akıllı Seçim: Aynı Sınıf İçi Takas Hedeflendi.");
    } else {
      // Olasılık %50: Farklı sınıf, aynı ders takası (Ders Adı AYNI olmalı)
      lessonA = lessons[Math.floor(Math.random() * lessons.length)];

      const sameSubjectLessons = lessons.filter(
        (l) =>
          l.subjectName === lessonA.subjectName &&
          l.classId !== lessonA.classId &&
          l.id !== lessonA.id
      );

      // Eğer farklı sınıfta aynı dersi varsa onu seç
      lessonB =
        sameSubjectLessons.length > 0
          ? sameSubjectLessons[
              Math.floor(Math.random() * sameSubjectLessons.length)
            ]
          : lessons[Math.floor(Math.random() * lessons.length)]; // Yoksa rastgele başka bir ders seç (nadiren)

      console.log(
        "   🔎 Akıllı Seçim: Farklı Sınıf - Aynı Ders Takası Hedeflendi."
      );
    }

    // Eğer akıllı seçim sonucunda hala aynı dersler seçildiyse veya geçersizse
    if (lessonB.id === lessonA.id) {
      this.stats.failed++;
      return {
        success: false,
        error: "Akıllı seçim sonucunda farklı ders bulunamadı",
      };
    }

    // 🔥 Düzeltme: lesson.name yerine lesson.subjectName kullanıldı
    console.log(`   🔷 Ders A: ${lessonA.subjectName} (${lessonA.className})`);
    console.log(`   🔷 Ders B: ${lessonB.subjectName} (${lessonB.className})`);

    // 🔎 DEBUG EKLENDİ: Blok yapılarını kontrol et
    console.log("   🔎 A Block Structure:", lessonA.blockStructure);
    console.log("   🔎 B Block Structure:", lessonB.blockStructure);
    // ------------------------------------------

    // *** KURAL KONTROLÜ (Gereksinim 2): Farklı Sınıflar Arasında Aynı Ders Kuralı ***
    if (lessonA.className !== lessonB.className) {
      if (lessonA.subjectName !== lessonB.subjectName) {
        const error = `Farklı sınıflar arası takas için dersler aynı olmalıdır. (${lessonA.subjectName} vs ${lessonB.subjectName})`;
        console.log(`   ❌ Kural İhlali (Gereksinim 2): ${error}`);
        this.stats.failed++;
        return {
          success: false,
          error: "Inter-class swap requires same subject",
          details: { reason: error, rule: 2 },
        };
      }
      console.log(
        "   ✅ Kural 2 Kontrolü: Farklı sınıflar arası takas (Dersler AYNI). Devam ediliyor."
      );
    } else {
      console.log(
        "   ✅ Kural 1 Kontrolü: Aynı sınıf içi takas (Dersler farklı olabilir). Devam ediliyor."
      );
    }
    // *** KONTROL SONU ***

    // ------------------------------------------
    // 🔥 YENİ KONTROL: Soft Constraint (Fitness) İyileşme Kontrolü (Gereksinim 1)
    // Takasın sadece programı DÜZENLEYECEKSE kabul edilmesi
    // NOT: Bu kontrol, kısıt ihlali kontrolünden sonra yapılır, çünkü Hard Constraint'ler önceliklidir.
    if (
      this.config.checkSoftConstraints &&
      algorithmContext &&
      algorithmContext.currentFitness
    ) {
      // Mevcut derslerin yerleştirme verilerini al, böylece takas sonrası sadece bu slotların fitness'ı değil,
      // tüm programın (özellikle öğretmenlerin) fitness'ı hesaplanabilir.
      const initialFitness = algorithmContext.currentFitness;

      // Geçici bir takas yap ve fitness'ı hesapla (Rollback/Geri alma ile birlikte)
      const tempResult = this.attemptAndCheckFitness(
        schedule,
        lessonA,
        lessonB,
        initialFitness
      );

      if (!tempResult.canAccept) {
        const error = `Takas, program kalitesini (Fitness) kötüleştirdiği için reddedildi. (Eski: ${initialFitness.toFixed(
          2
        )}, Yeni: ${tempResult.newFitness.toFixed(2)})`;
        console.log(`   ❌ Soft Constraint Kuralı İhlali: ${error}`);
        this.stats.blockedBySoftConstraint++;
        this.stats.failed++;
        return {
          success: false,
          error: "Soft constraint score decreased",
          details: { reason: error, rule: "Fitness Check" },
        };
      }
      // Eğer fitness iyileştiyse veya aynı kaldıysa, gerçek takas için devam et.
      // tempResult.newFitness'ı algorithmContext'e aktarmaya gerek yok, SA/GA algoritması kendisi hesaplayacaktır.
    }
    // ------------------------------------------

    // Blok kontrolü için window.BlockStructure'ın varlığı kontrol edildi
    if (typeof window.BlockStructure === "undefined") {
      console.error(
        "❌ HATA: window.BlockStructure objesi tanımlanmamış. Blok işlemleri devre dışı."
      );
      // BlockStructure yoksa her şeyi basit ders gibi işlemeye zorlayalım.
      return this.swapTwoSimpleLessons(
        schedule,
        lessonA,
        lessonB,
        algorithmContext
      );
    }

    const isBlockA = window.BlockStructure.isBlockLesson(lessonA);
    const isBlockB = window.BlockStructure.isBlockLesson(lessonB);

    console.log(`   📦 A Blok: ${isBlockA ? "Evet" : "Hayır"}`);
    console.log(`   📦 B Blok: ${isBlockB ? "Evet" : "Hayır"}`);

    // Her iki ders de bloklu mu? (Sadece eşit bloklar arasında takas)
    if (isBlockA && isBlockB) {
      return this.swapTwoBlockLessons(
        schedule,
        lessonA,
        lessonB,
        algorithmContext
      );
    }
    // Biri blok, biri basit mi? (REDDEDİLDİ - Blok Bütünlüğü Riski)
    else if (isBlockA || isBlockB) {
      const blockLesson = isBlockA ? lessonA : lessonB;
      const simpleLesson = isBlockA ? lessonB : lessonA;
      return this.swapBlockWithSimple(
        schedule,
        blockLesson,
        simpleLesson,
        algorithmContext
      );
    }
    // Hiçbiri bloklu değil (Basit takas)
    else {
      return this.swapTwoSimpleLessons(
        schedule,
        lessonA,
        lessonB,
        algorithmContext
      );
    }
  }

  // ============================================
  // İKİ BLOKLU DERS TAKASI (TAM BLOK TAKASI)
  // ============================================

  swapTwoBlockLessons(schedule, lessonA, lessonB, algorithmContext) {
    console.log("\n   📦📦 İKİ BLOKLU DERS TAKASI");

    const blockTypeA = window.BlockStructure.getBlockType(lessonA);
    const blockTypeB = window.BlockStructure.getBlockType(lessonB);

    // Blok sayıları aynı mı? (Örn: 2-2 vs 2-2)
    if (blockTypeA.blockCount !== blockTypeB.blockCount) {
      const error = `Farklı blok sayıları: ${blockTypeA.blockCount} vs ${blockTypeB.blockCount}`;
      console.log(`   ❌ ${error}`);
      this.stats.failed++;
      return {
        success: false,
        error: "Different block counts",
        details: { reason: error },
      };
    }

    // Her iki dersin yerleştirmelerini al
    const placementsA = this.getLessonPlacements(schedule, lessonA);
    const placementsB = this.getLessonPlacements(schedule, lessonB);

    if (placementsA.length === 0 || placementsB.length === 0) {
      const error = "Yerleştirme bulunamadı";
      console.log(`   ❌ ${error}`);
      this.stats.failed++;
      return {
        success: false,
        error: "No placements found",
        details: {
          reason: error,
          placementsA: placementsA.length,
          placementsB: placementsB.length,
        },
      };
    }

    // GÜÇLENDİRİLMİŞ BLOK UZUNLUK KONTROLÜ:
    // Toplam ders saatleri aynı olmalı (Örn: Mat 6 saat vs Kimya 6 saat)
    if (placementsA.length !== placementsB.length) {
      const error = `Farklı toplam ders saatleri (yerleştirilmiş): A:${placementsA.length} vs B:${placementsB.length}`;
      console.log(`   ❌ ${error}`);
      this.stats.failed++;
      return {
        success: false,
        error: "Different total placement lengths",
        details: { reason: error },
      };
    }

    // Backup oluştur
    const backup = this.createBackup(schedule, [
      ...placementsA,
      ...placementsB,
    ]);

    try {
      let blockIndex = 0; // Hata logu için tanımlandı

      // Blokları grupla (Örn: Mat 1. 2'li blok, Mat 2. 2'li blok vb.)
      const blocksA = this.groupByBlockIndex(
        placementsA,
        blockTypeA.blockCount
      );
      const blocksB = this.groupByBlockIndex(
        placementsB,
        blockTypeB.blockCount
      );

      // Her bloğu takas et
      for (blockIndex = 0; blockIndex < blockTypeA.blockCount; blockIndex++) {
        const blockPlacementsA = blocksA[blockIndex] || [];
        const blockPlacementsB = blocksB[blockIndex] || [];

        if (blockPlacementsA.length === 0 || blockPlacementsB.length === 0) {
          throw new Error(`Blok ${blockIndex} eksik`);
        }

        // KRİTİK KONTROL: Blok grubundaki ardışık saat sayısı aynı olmalı.
        if (blockPlacementsA.length !== blockPlacementsB.length) {
          throw new Error(
            `Blok ${blockIndex} boyut farkı: ${blockPlacementsA.length} vs ${blockPlacementsB.length}`
          );
        }

        // Takas yapılabilir mi? (Öğretmen, çakışma vb. kontrolü)
        const canSwap = this.canSwapBlocks(
          schedule,
          blockPlacementsA,
          blockPlacementsB,
          lessonA,
          lessonB
        );

        if (!canSwap.valid) {
          throw new Error(canSwap.reason);
        }

        // ----------------------------------------------------
        // KISIT KONTROLÜ (Bloklar için)
        // ----------------------------------------------------
        for (const pA of blockPlacementsA) {
          // B dersini A'nın yerine koyarken kısıtları kontrol et
          if (
            !this.checkConstraints(
              schedule,
              lessonB,
              pA.day,
              pA.period,
              pA.classId
            )
          ) {
            throw new Error(
              `Ders B (${lessonB.subjectName}) Slot A'ya (${
                this.DAYS[pA.day]
              } ${pA.period + 1}) yerleşimi kısıt ihlali`
            );
          }
        }
        for (const pB of blockPlacementsB) {
          // A dersini B'nin yerine koyarken kısıtları kontrol et
          if (
            !this.checkConstraints(
              schedule,
              lessonA,
              pB.day,
              pB.period,
              pB.classId
            )
          ) {
            throw new Error(
              `Ders A (${lessonA.subjectName}) Slot B'ye (${
                this.DAYS[pB.day]
              } ${pB.period + 1}) yerleşimi kısıt ihlali`
            );
          }
        }
        // ----------------------------------------------------

        // Temizle
        for (const p of blockPlacementsA) {
          schedule.removeLesson(p.classId, p.day, p.period);
        }
        for (const p of blockPlacementsB) {
          schedule.removeLesson(p.classId, p.day, p.period);
        }

        // Takas et (A'nın yerine B'yi koy)
        for (let i = 0; i < blockPlacementsA.length; i++) {
          const pA = blockPlacementsA[i];

          const metaB = {
            blockIndex,
            blockSize: blockPlacementsA.length,
            blockPosition: i,
          };

          // 🔥 Düzeltme: lessonB objesinin tamamı, güncel metadata ile gönderildi
          const lessonB_Copy = { ...lessonB, metadata: metaB };

          schedule.placeLesson(pA.classId, lessonB_Copy, pA.day, pA.period);
        }

        // Takas et (B'nin yerine A'yı koy)
        for (let i = 0; i < blockPlacementsB.length; i++) {
          const pB = blockPlacementsB[i];

          const metaA = {
            blockIndex,
            blockSize: blockPlacementsB.length,
            blockPosition: i,
          };

          // 🔥 Düzeltme: lessonA objesinin tamamı, güncel metadata ile gönderildi
          const lessonA_Copy = { ...lessonA, metadata: metaA };

          schedule.placeLesson(pB.classId, lessonA_Copy, pB.day, pB.period);
        }
      }

      // NOT: Soft Constraint kontrolü zaten swapLessons'da yapıldı. Eğer bu noktaya gelindiyse, takas kabul edilebilir demektir.

      this.stats.successful++;
      this.stats.blockSwaps++;

      console.log("   ✅ İki bloklu ders takası başarılı");

      return {
        success: true,
        type: "two_block_lessons",
        schedule,
      };
    } catch (error) {
      console.log(`   ❌ Tam Blok Takası başarısız: ${error.message}`);
      this.rollback(schedule, backup);
      this.stats.rollbacks++;
      this.stats.failed++;

      return {
        success: false,
        error: "Tam Blok Takası Başarısız",
        details: {
          reason: error.message,
          swapType: "two_block_lessons",
          blockIndex: blockIndex, // Hangi blokta hata olduğunu belirtir
        },
      };
    }
  }

  // ============================================
  // BLOK - BASİT DERS TAKASI (REDDEDİLDİ)
  // ============================================

  swapBlockWithSimple(schedule, blockLesson, simpleLesson, algorithmContext) {
    console.log("\n   📦🔸 BLOK - BASİT DERS TAKASI");

    const blockType = window.BlockStructure.getBlockType(blockLesson);
    if (blockType.subjectName === "Matematik") {
      this.stats.blockedByMathRule++;
    }

    // GÜÇLENDİRİLMİŞ RED: Blok bütünlüğü riski nedeniyle basit takas desteklenmiyor.
    console.log("   ⚠️ Blok-Basit swap desteklenmiyor (Blok Bütünlüğü Riski)");
    this.stats.failed++;

    return {
      success: false,
      error: "Block-Simple swap not allowed (integrity risk)",
      details: {
        reason: "Blok ders ile basit ders takası blok bütünlüğünü bozar.",
      },
    };
  }

  // ============================================
  // İKİ BASİT DERS TAKASI
  // ============================================

  swapTwoSimpleLessons(schedule, lessonA, lessonB, algorithmContext) {
    console.log("\n   🔸🔸 İKİ BASİT DERS TAKASI");

    const placementsA = this.getLessonPlacements(schedule, lessonA);
    const placementsB = this.getLessonPlacements(schedule, lessonB);

    if (placementsA.length === 0 || placementsB.length === 0) {
      const error = "Yerleştirme bulunamadı";
      console.log(`   ❌ ${error}`);
      this.stats.failed++;
      return {
        success: false,
        error: "No placements",
        details: { reason: error },
      };
    }

    // Rastgele birer slot seç
    const slotA = placementsA[Math.floor(Math.random() * placementsA.length)];
    const slotB = placementsB[Math.floor(Math.random() * placementsB.length)];

    console.log(
      `   📍 A: ${this.DAYS[slotA.day]} ${slotA.period + 1} (Sınıf: ${
        slotA.classId
      })`
    );
    console.log(
      `   📍 B: ${this.DAYS[slotB.day]} ${slotB.period + 1} (Sınıf: ${
        slotB.classId
      })`
    );

    // Öğretmen kontrolü (Bloksuz dersler için yeterli)
    if (this.config.checkTeacher) {
      // Öğretmen A'nın Slot B'de meşgul olup olmadığını kontrol et
      if (schedule.isTeacherBusy(lessonA.teacherId, slotB.day, slotB.period)) {
        const error = "Öğretmen A slotB'de başka sınıfta meşgul";
        console.log(`   ❌ ${error}`);
        this.stats.failed++;
        return {
          success: false,
          error: "Teacher A busy at slotB",
          details: { reason: error, teacherId: lessonA.teacherId },
        };
      }

      // Öğretmen B'nin Slot A'da meşgul olup olmadığını kontrol et
      if (schedule.isTeacherBusy(lessonB.teacherId, slotA.day, slotA.period)) {
        const error = "Öğretmen B slotA'da başka sınıfta meşgul";
        console.log(`   ❌ ${error}`);
        this.stats.failed++;
        return {
          success: false,
          error: "Teacher B busy at slotA",
          details: { reason: error, teacherId: lessonB.teacherId },
        };
      }
    }

    // Kısıt kontrolü (YENİLENMİŞ VERSİYON)
    if (this.config.checkConstraints) {
      // Ders A'yı slot B'ye koyarken kısıtları kontrol et
      if (
        !this.checkConstraints(
          schedule,
          lessonA,
          slotB.day,
          slotB.period,
          slotB.classId
        )
      ) {
        const error = "Ders A'nın Slot B'ye yerleşimi kısıt ihlali";
        console.log(`   ❌ ${error}`);
        this.stats.failed++;
        return {
          success: false,
          error: "Constraint violation",
          details: { reason: error, lessonId: lessonA.id, slot: slotB },
        };
      }
      // Ders B'yi slot A'ya koyarken kısıtları kontrol et
      if (
        !this.checkConstraints(
          schedule,
          lessonB,
          slotA.day,
          slotA.period,
          slotA.classId
        )
      ) {
        const error = "Ders B'nin Slot A'ya yerleşimi kısıt ihlali";
        console.log(`   ❌ ${error}`);
        this.stats.failed++;
        return {
          success: false,
          error: "Constraint violation",
          details: { reason: error, lessonId: lessonB.id, slot: slotA },
        };
      }
    }

    // Takas yap
    // Kısıtlar başarılıysa Takas yap
    schedule.removeLesson(slotA.classId, slotA.day, slotA.period);
    schedule.removeLesson(slotB.classId, slotB.day, slotB.period);

    // 🔥 Düzeltme: lessonB objesinin tamamı gönderildi
    schedule.placeLesson(
      slotA.classId,
      lessonB, // Tüm ders objesi gönderildi
      slotA.day,
      slotA.period
    );
    // 🔥 Düzeltme: lessonA objesinin tamamı gönderildi
    schedule.placeLesson(
      slotB.classId,
      lessonA, // Tüm ders objesi gönderildi
      slotB.day,
      slotB.period
    );

    // NOT: Soft Constraint kontrolü zaten swapLessons'da yapıldı.

    this.stats.successful++;
    this.stats.simpleSwaps++;

    console.log("   ✅ Basit takas başarılı");

    return {
      success: true,
      type: "two_simple_lessons",
      schedule,
    };
  }

  // ============================================
  // YENİ: SOFT CONSTRAINT KONTROL METODU
  // ============================================

  /**
   * Geçici takas yapar, fitness'ı hesaplar ve geri alır (rollback).
   * @param {Schedule} schedule Program nesnesi
   * @param {Lesson} lessonA Ders A
   * @param {Lesson} lessonB Ders B
   * @param {number} initialFitness Takas öncesi fitness skoru
   * @returns {{canAccept: boolean, newFitness: number}}
   */
  attemptAndCheckFitness(schedule, lessonA, lessonB, initialFitness) {
    // Sadece basit takas ve tam blok takası için kontrol et
    const placementsA = this.getLessonPlacements(schedule, lessonA);
    const placementsB = this.getLessonPlacements(schedule, lessonB);

    // Eğer yerleştirme yoksa veya blok-basit karışımıysa, bu kontrolü atla
    if (placementsA.length === 0 || placementsB.length === 0) {
      return { canAccept: true, newFitness: initialFitness }; // Devam et
    }

    const backup = this.createBackup(schedule, [
      ...placementsA,
      ...placementsB,
    ]);

    let newFitness = initialFitness;
    let success = false;
    let swapType = null;

    try {
      const isBlockA = window.BlockStructure.isBlockLesson(lessonA);
      const isBlockB = window.BlockStructure.isBlockLesson(lessonB);

      // Geçici takası yap
      if (isBlockA && isBlockB) {
        const result = this.swapTwoBlockLessons(
          schedule,
          lessonA,
          lessonB,
          null
        );
        success = result.success;
        swapType = "block";
      } else if (!isBlockA && !isBlockB) {
        const result = this.swapTwoSimpleLessons(
          schedule,
          lessonA,
          lessonB,
          null
        );
        success = result.success;
        swapType = "simple";
      } else {
        // Blok-basit karışımıysa, Hard Constraint zaten reddedeceği için kabul et
        return { canAccept: true, newFitness: initialFitness };
      }

      if (success) {
        // Yeni fitness skorunu hesapla
        newFitness = window.calculateFullFitness(schedule.data); // Global fonksiyon çağrısı
      }
    } catch (e) {
      // Herhangi bir Hard Constraint (checkTeacher/checkConstraints) başarısız olursa
      newFitness = 99999999; // Çok kötü bir skor ver
      success = false;
    } finally {
      // Programı her zaman geri al
      this.rollback(schedule, backup);
    }

    // 💡 Kural: Fitness iyileşmeli (küçülmeli) veya aynı kalmalı.
    // Başlangıç fitness'ı 16000.00 ise, 15999.00 veya 16000.00 kabuldür. 16001.00 kabul DEĞİLDİR.
    const canAccept = success && newFitness <= initialFitness;

    console.log(
      `   🔎 Fitness Kontrolü: Swap Tipi: ${swapType}, Eski: ${initialFitness.toFixed(
        2
      )}, Yeni: ${newFitness.toFixed(2)}, Kabul: ${
        canAccept ? "EVET" : "HAYIR"
      }`
    );

    return {
      canAccept,
      newFitness: newFitness,
    };
  }

  // ============================================
  // ALGORİTMA ENTEGRASYON METHODLARı
  // ============================================

  /**
   * GA için mutasyon operatörü
   */
  mutateForGA(schedule, lessons) {
    // GA'da genellikle Soft Constraint kontrolü algoritmaya bırakılır.
    const result = this.swapLessons(schedule, lessons, { algorithm: "GA" });
    return result;
  }

  /**
   * SA için swap operatörü
   * SA, kötü fitness'ı (daha yüksek sayı) bile belli bir olasılıkla kabul eder,
   * ancak burada SADECE Hard Constraint'leri ihlal etmeyen ve Soft Constraint'i kötüleştirmeyen takasları bulmaya odaklanıyoruz.
   */
  swapForSA(schedule, lessons, currentFitness) {
    const result = this.swapLessons(schedule, lessons, {
      algorithm: "SA",
      currentFitness: currentFitness, // Fitness bilgisini swapLessons'a ilet
    });
    return result;
  }

  /**
   * ACO için takas pheromone değerlendirmesi
   */
  evaluateSwapForACO(schedule, lessons) {
    const result = this.swapLessons(schedule, lessons, { algorithm: "ACO" });

    if (result.success) {
      return { pheromone: 1.0, success: true };
    } else {
      return { pheromone: 0.3, success: false };
    }
  }

  /**
   * TABU için swap yasaklama kontrolü
   */
  isSwapTabu(lessonA, lessonB, tabuList) {
    const swapKey = `${lessonA.id}_${lessonB.id}`;
    const reverseKey = `${lessonB.id}_${lessonA.id}`;

    return tabuList.has(swapKey) || tabuList.has(reverseKey);
  }

  /**
   * RL için swap reward hesaplama
   */
  getSwapReward(schedule, lessons, oldFitness, newFitness) {
    if (newFitness > oldFitness) {
      return 1.0; // Pozitif reward
    } else if (newFitness === oldFitness) {
      return 0.0; // Nötr
    } else {
      return -1.0; // Negatif reward
    }
  }

  /**
   * FUZZY için swap uygunluk değerlendirmesi
   */
  evaluateSwapSuitability(lessonA, lessonB) {
    let suitability = 0.5; // Orta

    const isBlockA =
      window.BlockStructure && window.BlockStructure.isBlockLesson(lessonA);
    const isBlockB =
      window.BlockStructure && window.BlockStructure.isBlockLesson(lessonB);

    // Her ikisi de basit → Yüksek uygunluk
    if (!isBlockA && !isBlockB) {
      suitability = 0.9;
    }
    // Her ikisi de blok → Orta uygunluk
    else if (isBlockA && isBlockB) {
      const typeA = window.BlockStructure.getBlockType(lessonA);
      const typeB = window.BlockStructure.getBlockType(lessonB);

      // Matematik varsa: Kural kalksa bile, büyük blok olduğu için riskli sayılabilir.
      if (
        typeA.subjectName === "Matematik" ||
        typeB.subjectName === "Matematik"
      ) {
        suitability = 0.4; // Kural kalksa da hala diğerlerine göre daha az uygun (daha kritik)
      } else {
        suitability = 0.5;
      }
    }
    // Biri blok biri basit → Çok düşük uygunluk (Reddedilecek)
    else {
      suitability = 0.05; // Çok düşük uygunluk
    }

    return suitability;
  }

  // ============================================
  // YARDIMCI FONKSİYONLAR
  // ============================================

  canSwapBlocks(
    schedule,
    blockPlacementsA,
    blockPlacementsB,
    lessonA,
    lessonB
  ) {
    // Boyut kontrolü
    if (blockPlacementsA.length !== blockPlacementsB.length) {
      return {
        valid: false,
        reason: `Farklı ardışık blok boyutları: ${blockPlacementsA.length} vs ${blockPlacementsB.length}`,
      };
    }

    // Öğretmen kontrolü
    if (this.config.checkTeacher) {
      // B dersini A'nın yerine koyarken Öğretmen B'yi kontrol et
      for (const pA of blockPlacementsA) {
        if (schedule.isTeacherBusy(lessonB.teacherId, pA.day, pA.period)) {
          return {
            valid: false,
            reason: `Öğretmen B ${this.DAYS[pA.day]} ${
              pA.period + 1
            } meşgul (Hedef A)`,
          };
        }
      }

      // A dersini B'nin yerine koyarken Öğretmen A'yı kontrol et
      for (const pB of blockPlacementsB) {
        if (schedule.isTeacherBusy(lessonA.teacherId, pB.day, pB.period)) {
          return {
            valid: false,
            reason: `Öğretmen A ${this.DAYS[pB.day]} ${
              pB.period + 1
            } meşgul (Hedef B)`,
          };
        }
      }
    }

    return { valid: true };
  }

  // 🔴 KRİTİK HATA ÇÖZÜMÜ BURADA YAPILDI (V3.1'den miras)
  checkConstraints(schedule, lesson, day, period, classId) {
    // CRITICAL FIX: ConstraintManager yoksa direkt true döndür
    if (!window.ConstraintManager || !this.config.checkConstraints) {
      if (this.config.checkConstraints) {
        console.warn(
          "⚠️ ConstraintManager bulunamadı. Kısıt kontrolü atlanıyor."
        );
      }
      return true;
    }

    const lessonId = lesson.id;
    const teacherId = lesson.teacherId;
    const sinifId = classId;
    const gun = this.DAYS[day];
    const saat = period + 1;

    let currentData = schedule.data; // Programın anlık hali
    let success = true;

    // 1. Hedef slottaki mevcut dersi yedekle ve kaldır (Eğer varsa)
    const currentLessonInSlot = currentData[classId]?.[day]?.[period];
    const backupData = currentLessonInSlot
      ? JSON.parse(JSON.stringify(currentLessonInSlot))
      : null;

    if (currentLessonInSlot) {
      // Geçici olarak sil
      if (currentData[classId] && currentData[classId][day]) {
        delete currentData[classId][day][period];
      }
    }

    try {
      // Kısıt Yöneticisinin Ana Kontrol Fonksiyonunu çağır
      const result = window.ConstraintManager.kontrolEt(
        gun,
        saat,
        lessonId,
        teacherId,
        sinifId,
        currentData // Geçici olarak boşaltılmış program verisi
      );

      if (!result.success) {
        console.log(
          `   ❌ Kısıt İhlali: ${
            result.ihlaller[0]?.kisitBaslik || "Genel Kısıt"
          }`
        );
        console.log("      Mesaj:", result.ihlaller[0]?.mesaj);
        success = false;
      }
    } catch (error) {
      // Eğer ConstraintManager.kontrolEt hata fırlatırsa (API uyumsuzluğu vb.)
      console.error(
        `❌ KRİTİK KISIT KONTROL HATASI (TeacherID: ${teacherId}, Ders: ${lesson.subjectName}, Slot: ${gun} ${saat}): ${error.message}`
      );
      success = false;
    }

    // 2. Yedeklenen veriyi geri yükle
    if (backupData) {
      if (!currentData[classId]) {
        currentData[classId] = {};
      }
      if (!currentData[classId][day]) {
        currentData[classId][day] = {};
      }
      currentData[classId][day][period] = backupData;
    }

    return success;
  }

  getLessonPlacements(schedule, lesson) {
    const placements = [];

    // lesson.classId'nin bir string olduğunu varsayıyoruz
    if (!schedule.data || !schedule.data[lesson.classId]) {
      return placements;
    }

    const classSchedule = schedule.data[lesson.classId];

    for (let day = 0; day < 5; day++) {
      const daySchedule = classSchedule[day];
      if (!daySchedule) continue;

      for (let period = 0; period < 8; period++) {
        const slot = daySchedule[period];

        // Slot içerisindeki lessonId kontrolü
        if (slot && slot.lessonId === lesson.id) {
          placements.push({
            classId: lesson.classId,
            day,
            period,
            // Bu alanlar artık slot.metadata'dan geliyor
            blockIndex: slot.metadata?.blockIndex ?? 0,
            blockSize: slot.metadata?.blockSize ?? 1,
            blockPosition: slot.metadata?.blockPosition ?? 0,
            teacherId: slot.teacherId,
          });
        }
      }
    }

    return placements;
  }

  groupByBlockIndex(placements, blockCount) {
    const groups = {};

    for (let i = 0; i < blockCount; i++) {
      groups[i] = [];
    }

    for (const placement of placements) {
      const blockIndex = placement.blockIndex || 0;
      if (groups[blockIndex]) {
        groups[blockIndex].push(placement);
      }
    }

    // Blok içindeki saatleri ardışık sıraya göre sırala (period'a göre)
    for (const index in groups) {
      groups[index].sort((a, b) => a.period - b.period);
    }

    return groups;
  }

  createBackup(schedule, placements) {
    const backup = [];

    for (const p of placements) {
      // schedule.data'daki mevcut slotu al
      const slot = schedule.data[p.classId]?.[p.day]?.[p.period];
      if (slot) {
        // Dersin kendisinin değil, programdaki slot verisinin yedeğini al
        backup.push({
          classId: p.classId,
          day: p.day,
          period: p.period,
          data: JSON.parse(JSON.stringify(slot)),
        });
      }
    }

    return backup;
  }

  rollback(schedule, backup) {
    for (const item of backup) {
      if (!schedule.data[item.classId]) {
        schedule.data[item.classId] = {};
      }
      if (!schedule.data[item.classId][item.day]) {
        schedule.data[item.classId][item.day] = {};
      }

      // Yedeği geri yükle
      schedule.data[item.classId][item.day][item.period] = item.data;
    }
  }

  // ============================================
  // İSTATİSTİKLER
  // ============================================

  getStats() {
    return {
      ...this.stats,
      successRate:
        this.stats.attempted > 0
          ? ((this.stats.successful / this.stats.attempted) * 100).toFixed(1) +
            "%"
          : "0%",
    };
  }

  clear() {
    this.swaps = [];
    this.failures = [];
    this.stats = {
      attempted: 0,
      successful: 0,
      failed: 0,
      rollbacks: 0,
      blockSwaps: 0,
      simpleSwaps: 0,
      blockedByMathRule: 0,
      blockedBySoftConstraint: 0,
    };
  }

  printReport() {
    const stats = this.getStats();

    console.log("\n🔄 BLOCK AWARE SWAP RAPORU");
    console.log("=".repeat(60));
    console.log(`   • Toplam deneme: ${stats.attempted}`);
    console.log(`   • Başarılı: ${stats.successful}`);
    console.log(`   • Başarısız: ${stats.failed}`);
    console.log(`   • Rollback: ${stats.rollbacks}`);
    console.log(`   • Blok swap: ${stats.blockSwaps}`);
    console.log(`   • Basit swap: ${stats.simpleSwaps}`);
    console.log(`   • Matematik engel (log): ${stats.blockedByMathRule}`);
    console.log(`   • Soft Constraint engel: ${stats.blockedBySoftConstraint}`);
    console.log(`   • Başarı oranı: ${stats.successRate}`);
    console.log("=".repeat(60) + "\n");
  }
}

// ============================================
// GLOBAL EXPORT
// ============================================

if (typeof window !== "undefined") {
  window.BlockAwareSwap = BlockAwareSwap;
  console.log(
    "✅ BlockAwareSwap V3.3 (Akıllı Seçim/Fitness Kontrolü) yüklendi"
  );
}
