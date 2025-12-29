/**
 * ============================================
 * DATA ADAPTER - VERİ KÖPRÜSÜ SİSTEMİ
 * ============================================
 *
 * Backend veritabanından gelen verileri
 * ScheduleAlgorithmV2'e uygun formata dönüştürür
 *
 * @author SİMRE/MK
 * @version 3.1.0 - BLOK DERS SİSTEMİ AKTİF
 * @date 2025
 */

class DataAdapter {
  constructor() {
    this.programId = null;
    this.currentProgram = null;
    console.log("🌉 DataAdapter v3.1.0 başlatıldı (BLOK DERS SİSTEMİ AKTİF)");
  }

  // ============================================
  // ANA HAZIRLIK FONKSİYONU
  // ============================================
  async prepareAlgorithmData() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 DATA ADAPTER - VERİ HAZIRLAMA BAŞLADI");
    console.log("=".repeat(60));

    try {
      // 1. Program ID al
      this.programId = parseInt(localStorage.getItem("currentProgramId"));

      if (!this.programId) {
        throw new Error("❌ Program ID bulunamadı!");
      }

      console.log(`  • Program ID: ${this.programId}`);

      // 2. Backend'den RAW verileri çek
      console.log("\n🔄 Backend'den veriler çekiliyor...");
      const rawData = await this.fetchAllData();

      // 3. Verileri formatla
      console.log("\n🔧 Veriler formatlanıyor...");
      const formattedData = await this.formatData(rawData);

      // 4. Validation (YUMUŞAK MOD - sadece uyarı ver)
      console.log("\n🔍 Veri validasyonu yapılıyor...");
      this.validateDataSoft(formattedData);

      console.log("\n" + "=".repeat(60));
      console.log("✅ DATA ADAPTER - VERİ HAZIRLAMA TAMAMLANDI");
      console.log("=".repeat(60) + "\n");

      // 🔥 5. ÇOKLU ÖĞRETMEN BİRLEŞTİRME
      console.log("🔥 ÇOKLU ÖĞRETMEN BİRLEŞTİRME BAŞLIYOR...\n");
      formattedData.lessons = this.mergeDuplicateLessons(formattedData.lessons);
      console.log("✅ ÇOKLU ÖĞRETMEN BİRLEŞTİRME TAMAMLANDI\n");

      // 🔥 6. BLOK DERS ANALİZİ
      console.log("📦 BLOK DERS ANALİZİ:");
      this.analyzeBlocks(formattedData.lessons);

      // 🔥 7. MERGE SONRASI DEBUG
      console.log("\n🔍 DATA-ADAPTER DEBUG (MERGE SONRASI):");
      console.log(`   • Toplam ders ataması: ${formattedData.lessons.length}`);

      const totalWeeklyHours = formattedData.lessons.reduce((sum, lesson) => {
        return sum + (parseInt(lesson.weeklyHours) || 0);
      }, 0);
      console.log(`   • Toplam haftalık saat: ${totalWeeklyHours}`);
      console.log("");

      return formattedData;
    } catch (error) {
      console.error("\n" + "=".repeat(60));
      console.error("❌ DATA ADAPTER HATASI:", error);
      console.error("=".repeat(60) + "\n");
      throw error;
    }
  }

  // ============================================
  // 🔥 BLOK DERS ANALİZİ - YENİ!
  // ============================================
  analyzeBlocks(lessons) {
    let totalLessons = 0;
    let blockedLessons = 0;
    let totalBlocks = 0;
    const blockExamples = [];

    lessons.forEach((lesson) => {
      totalLessons++;

      // Blok var mı kontrol et
      if (
        lesson.blockStructure &&
        Array.isArray(lesson.blockStructure) &&
        lesson.blockStructure.length > 1
      ) {
        blockedLessons++;
        totalBlocks += lesson.blockStructure.length;

        // İlk 5 örneği sakla
        if (blockExamples.length < 5) {
          blockExamples.push({
            ders: lesson.subjectName,
            sinif: lesson.className,
            ogretmen: lesson.teacherName,
            haftalikSaat: lesson.weeklyHours,
            blokYapisi: lesson.blockStructure.join("+"),
            blokSayisi: lesson.blockStructure.length,
          });
        }
      }
    });

    console.log(`   📊 Toplam Ders: ${totalLessons}`);
    console.log(`   📦 Bloklu Ders: ${blockedLessons}`);
    console.log(`   🔢 Toplam Blok: ${totalBlocks}`);
    console.log(
      `   📈 Blok Oranı: ${((blockedLessons / totalLessons) * 100).toFixed(1)}%`
    );

    if (blockExamples.length > 0) {
      console.log(`\n   📋 BLOK ÖRNEKLERİ:`);
      blockExamples.forEach((ex, i) => {
        console.log(
          `      ${i + 1}. ${ex.ders} (${ex.sinif}) - ${ex.ogretmen}`
        );
        console.log(
          `         └─ ${ex.haftalikSaat} saat/hafta → ${ex.blokSayisi} blok [${ex.blokYapisi}]`
        );
      });
    } else {
      console.log(`\n   ⚠️ HİÇ BLOK DERS YOK!`);
      console.log(
        `   💡 ÖNERİ: Matematik, Fizik, Kimya gibi derslere blok yapısı ekleyin`
      );
      console.log(
        `   📝 Örnek: 6 saatlik Matematik → [2, 2, 2] (3 blok, her biri 2 saat)`
      );
    }
  }

  // ============================================
  // ÇOKLU ÖĞRETMEN BİRLEŞTİRME
  // ============================================
  mergeDuplicateLessons(lessons) {
    console.log("🔍 MERGE - BAŞLANGIÇ:");
    console.log(`   • Orijinal ders sayısı: ${lessons.length}`);

    const merged = new Map();
    let mergeCount = 0;

    lessons.forEach((lesson, index) => {
      // classId_subjectId key'i ile benzersizlik kontrolü
      const parts = lesson.id.split("_");
      const key = `${parts[0]}_${parts[1]}`; // Sadece sınıf ve ders ID

      if (!merged.has(key)) {
        // İlk kez görüyoruz
        merged.set(key, { ...lesson });
      } else {
        // Duplicate bulundu, birleştir
        mergeCount++;
        const existing = merged.get(key);

        console.log(`   🔀 [${index}] DUPLICATE: ${key}`);
        console.log(
          `      • Mevcut: ID=${existing.id}, Öğretmen=${existing.teacherId}, Saat=${existing.weeklyHours}`
        );
        console.log(
          `      • Yeni: ID=${lesson.id}, Öğretmen=${lesson.teacherId}, Saat=${lesson.weeklyHours}`
        );

        // Öğretmenleri array'e çevir
        if (!Array.isArray(existing.teacherId)) {
          existing.teacherId = [existing.teacherId];
          existing.teacherName = [existing.teacherName];
          existing.teacherCode = [existing.teacherCode];
        }

        // Yeni öğretmeni ekle (eğer zaten yoksa)
        if (!existing.teacherId.includes(lesson.teacherId)) {
          existing.teacherId.push(lesson.teacherId);
          existing.teacherName.push(lesson.teacherName);
          existing.teacherCode.push(lesson.teacherCode);
          console.log(
            `      ✅ Öğretmen eklendi: ${existing.teacherId.join(", ")}`
          );
        } else {
          console.log(`      ⚠️ Aynı öğretmen zaten var, eklenmedi`);
        }

        // ⚠️ ÖNEMLİ: weeklyHours DEĞİŞMEZ! (2 öğretmen = 2 saat, 2+2=4 DEĞİL!)
        console.log(
          `      📊 Sonuç: Öğretmenler=${existing.teacherId.join(",")}, Saat=${
            existing.weeklyHours
          }`
        );
      }
    });

    const result = Array.from(merged.values());

    console.log("\n🔍 MERGE - SONUÇ:");
    console.log(`   • Birleştirilmiş: ${result.length} ders`);
    console.log(`   • Kaldırılan duplicate: ${lessons.length - result.length}`);
    console.log(`   • Toplam merge işlemi: ${mergeCount}`);

    // Çoklu öğretmenlileri listele
    const multiTeacher = result.filter(
      (l) => Array.isArray(l.teacherId) && l.teacherId.length > 1
    );
    if (multiTeacher.length > 0) {
      console.log(`\n   📋 ${multiTeacher.length} Çoklu Öğretmenli Ders:`);
      multiTeacher.forEach((l, i) => {
        const teacherNames = Array.isArray(l.teacherName)
          ? l.teacherName.join(", ")
          : l.teacherName;
        console.log(`      ${i + 1}. ${l.subjectName} (${l.className})`);
        console.log(`         ID: ${l.id}`);
        console.log(`         Öğretmenler: ${teacherNames}`);
        console.log(`         Haftalık Saat: ${l.weeklyHours}`);
      });
    } else {
      console.log(`\n   ℹ️ Çoklu öğretmenli ders bulunamadı`);
    }

    return result;
  }

  // ============================================
  // BACKEND'DEN VERİ ÇEKME
  // ============================================
  async fetchAllData() {
    try {
      if (typeof window.electronAPI === "undefined") {
        console.warn("⚠️ electronAPI bulunamadı, test verisi kullanılıyor");
        return this.getTestData();
      }

      console.log("  🔄 Veritabanından sorgulanıyor...");

      const [
        programData,
        derslerData,
        ogretmenlerData,
        siniflarData,
        atamalarData,
        kisitlarData,
        tercihlerData,
        blokDerslerData,
      ] = await Promise.all([
        window.electronAPI
          .dbQuery("SELECT * FROM ders_programlari WHERE id = ?", [
            this.programId,
          ])
          .catch(() => ({ data: [] })),
        window.electronAPI.getAllDersler().catch(() => ({ data: [] })),
        window.electronAPI.getAllTeachers().catch(() => ({ data: [] })),
        window.electronAPI.getAllClasses().catch(() => ({ data: [] })),
        window.electronAPI
          .dbQuery(
            `SELECT 
            sdo.*,
            d.ders_adi, 
            d.ders_kodu, 
            d.ders_rengi as renk,
            o.ad_soyad as ogretmen_adi,
            o.kisa_ad as ogretmen_kodu,
            s.sinif_adi
           FROM sinif_ders_ogretmen sdo
           LEFT JOIN dersler d ON sdo.ders_id = d.id
           LEFT JOIN ogretmenler o ON sdo.ogretmen_id = o.id
           LEFT JOIN siniflar s ON sdo.sinif_id = s.id
           WHERE sdo.program_id = ?`,
            [this.programId]
          )
          .catch(() => ({ data: [] })),
        window.electronAPI
          .getKisitlar(this.programId)
          .catch(() => ({ data: { genel: null, ogretmenler: [] } })),
        window.electronAPI
          .dbQuery(`SELECT * FROM ogretmen_tercihleri WHERE program_id = ?`, [
            this.programId,
          ])
          .catch(() => ({ data: [] })),
        window.electronAPI
          .dbQuery(
            `SELECT bd.*, 
                  d.ders_adi, d.ders_kodu,
                  s.sinif_adi
           FROM blok_dersler bd
           LEFT JOIN dersler d ON bd.ders_id = d.id
           LEFT JOIN siniflar s ON bd.sinif_id = s.id
           WHERE bd.program_id = ?`,
            [this.programId]
          )
          .catch(() => ({ data: [] })),
      ]);

      const program = this.extractSingle(programData);
      const dersler = this.extractArray(derslerData);
      const ogretmenler = this.extractArray(ogretmenlerData);
      const siniflar = this.extractArray(siniflarData);
      const atamalar = this.extractArray(atamalarData);
      const kisitlar = kisitlarData?.data || { genel: null, ogretmenler: [] };
      const tercihler = this.extractArray(tercihlerData);
      const blokDersler = this.extractArray(blokDerslerData);

      console.log("  ✅ Backend verileri başarıyla çekildi:");
      console.log(`    • Program: ${program?.program_adi || "N/A"}`);
      console.log(`    • Dersler: ${dersler.length}`);
      console.log(`    • Öğretmenler: ${ogretmenler.length}`);
      console.log(`    • Sınıflar: ${siniflar.length}`);
      console.log(`    • Atamalar: ${atamalar.length}`);
      console.log(`    • Kısıtlar: ${kisitlar.ogretmenler?.length || 0}`);
      console.log(`    • Tercihler: ${tercihler.length}`);
      console.log(`    • Blok Dersler: ${blokDersler.length}`);

      return {
        program,
        dersler,
        ogretmenler,
        siniflar,
        atamalar,
        kisitlar,
        tercihler,
        blokDersler,
      };
    } catch (error) {
      console.error("❌ Backend veri çekme hatası:", error);
      console.warn("⚠️ Test verisi kullanılacak...");
      return this.getTestData();
    }
  }

  // ============================================
  // EXTRACT HELPER - ULTRA GÜVENLİ
  // ============================================
  extractArray(data) {
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.success && data?.data && Array.isArray(data.data))
      return data.data;
    return [];
  }

  extractSingle(data) {
    if (Array.isArray(data)) return data[0] || null;
    if (data?.data && Array.isArray(data.data)) return data.data[0] || null;
    if (data?.success && data?.data && Array.isArray(data.data))
      return data.data[0] || null;
    if (data && typeof data === "object") return data;
    return null;
  }

  // ============================================
  // VERİ FORMATLAMA
  // ============================================
  async formatData(rawData) {
    const lessons = this.formatLessons(rawData);
    const classes = this.formatClasses(rawData.siniflar);
    const teachers = this.formatTeachers(rawData.ogretmenler);
    const constraints = this.formatConstraints(rawData.kisitlar);
    const preferences = this.formatPreferences(rawData.tercihler);

    const metadata = {
      programId: this.programId,
      programName: rawData.program?.program_adi || "Program 2025",
      generatedAt: new Date().toISOString(),
      version: "3.1.0",
      author: "SİMRE/MK",
    };

    const totalHours = lessons.reduce(
      (sum, l) => sum + (l.weeklyHours || 1),
      0
    );

    console.log("  ✅ Veriler başarıyla formatlandı:");
    console.log(`    • Lessons (Ders Atamaları): ${lessons.length}`);
    console.log(`    • Toplam Haftalık Saat: ${totalHours}`);
    console.log(`    • Classes (Sınıflar): ${classes.length}`);
    console.log(`    • Teachers (Öğretmenler): ${teachers.length}`);
    console.log(`    • Constraints (Kısıtlar): ${constraints.length}`);
    console.log(`    • Preferences (Tercihler): ${preferences.length}`);

    return {
      lessons,
      classes,
      teachers,
      constraints,
      preferences,
      metadata,
    };
  }

  // ============================================
  // 🔥 LESSONS FORMATLAMA - HİBRİT BLOK SİSTEMİ
  // ============================================
  formatLessons(rawData) {
    const lessons = [];
    const blokMap = new Map();
    const derslerMap = new Map();

    const blokDersler = this.extractArray(rawData.blokDersler);
    const atamalar = this.extractArray(rawData.atamalar);
    const dersler = this.extractArray(rawData.dersler);

    if (atamalar.length === 0) {
      console.warn("    ⚠️ Hiç atama bulunamadı!");
      return lessons;
    }

    // 🔥 1. BLOK_DERSLER TABLOSUNDAN MAP OLUŞTUR
    console.log("\n📦 BLOK SİSTEMİ - 1) blok_dersler tablosu:");
    for (const blok of blokDersler) {
      try {
        const key = `${blok.sinif_id}_${blok.ders_id}`;
        blokMap.set(key, {
          blokYapisi: blok.blok_yapisi || "YOK",
          blokSayisi: blok.blok_sayisi || 1,
        });
        console.log(`   ✅ ${key} → ${blok.blok_yapisi}`);
      } catch (error) {
        console.error("❌ Blok parse hatası:", error);
      }
    }

    if (blokDersler.length === 0) {
      console.log(
        "   ⚠️ blok_dersler tablosu boş, dersler.ders_blogu kullanılacak"
      );
    }

    // 🔥 2. DERSLER TABLOSUNDAN FALLBACK MAP OLUŞTUR
    console.log("\n📦 BLOK SİSTEMİ - 2) dersler.ders_blogu fallback:");
    for (const ders of dersler) {
      if (
        ders.ders_blogu &&
        ders.ders_blogu !== "YOK" &&
        ders.ders_blogu !== ""
      ) {
        derslerMap.set(ders.id, {
          blokYapisi: ders.ders_blogu,
          haftalikSaat: ders.haftalik_saat || 1,
        });
        console.log(
          `   ✅ Ders ${ders.id} (${ders.ders_adi}) → ${ders.ders_blogu}`
        );
      }
    }

    // 🔥 3. LESSONS OLUŞTUR (HİBRİT SİSTEM)
    console.log("\n📝 DERS ATAMALARI OLUŞTURULUYOR (HİBRİT):");
    for (const atama of atamalar) {
      try {
        const key = `${atama.sinif_id}_${atama.ders_id}`;
        const weeklyHours = atama.haftalik_ders_saati || 1;

        let blockStructure = [weeklyHours]; // Varsayılan: tek blok
        let blockSize = weeklyHours;
        let blokKaynak = "varsayılan";

        // 🔥 ÖNCE BLOK_DERSLER TABLOSUNA BAK
        let blokInfo = blokMap.get(key);
        if (blokInfo && blokInfo.blokYapisi !== "YOK") {
          blockStructure = this.parseBlockStructure(blokInfo.blokYapisi);
          blockSize = blockStructure[0];
          blokKaynak = "blok_dersler";
        }
        // 🔥 YOKSA DERSLER.DERS_BLOGU KULLAN
        else {
          const dersInfo = derslerMap.get(atama.ders_id);
          if (dersInfo && dersInfo.blokYapisi !== "YOK") {
            blockStructure = this.parseBlockStructure(dersInfo.blokYapisi);
            blockSize = blockStructure[0];
            blokKaynak = "dersler.ders_blogu";
          }
        }

        lessons.push({
          id: `${atama.sinif_id}_${atama.ders_id}_${atama.ogretmen_id}`,
          subjectId: atama.ders_id,
          subjectCode: atama.ders_kodu || "N/A",
          subjectName: atama.ders_adi || "Bilinmeyen Ders",
          teacherId: atama.ogretmen_id,
          teacherCode: atama.ogretmen_kodu || "N/A",
          teacherName: atama.ogretmen_adi || "Bilinmeyen Öğretmen",
          classId: atama.sinif_id,
          className: atama.sinif_adi || "Bilinmeyen Sınıf",
          weeklyHours: weeklyHours,
          blockSize: blockSize,
          blockStructure: blockStructure, // 🔥 BLOK YAPISI
          mandatory: true,
          color: atama.renk || this.getRandomColor(),
          programId: this.programId,
        });

        // Debug: Bloklu dersler için log
        if (blockStructure.length > 1) {
          console.log(`   📦 ${atama.ders_adi} (${atama.sinif_adi})`);
          console.log(
            `      └─ ${weeklyHours} saat → ${
              blockStructure.length
            } blok [${blockStructure.join("+")}] (${blokKaynak})`
          );
        }
      } catch (error) {
        console.error("❌ Lesson oluşturma hatası:", error, atama);
      }
    }

    console.log(`\n    ✅ ${lessons.length} ders ataması oluşturuldu`);

    return lessons;
  }

  // ============================================
  // 🔥 BLOK YAPISI PARSE - GÜÇLENDIRILMIŞ
  // ============================================
  parseBlockStructure(blockString) {
    try {
      // "2+2+2" → [2, 2, 2]
      // "3+3" → [3, 3]
      // "2-2-2" → [2, 2, 2] (tire de destekle)

      if (!blockString || blockString === "YOK" || blockString === "0") {
        return [1]; // Varsayılan
      }

      // Hem + hem - destekle
      const parts = blockString.replace(/-/g, "+").split("+");
      const blocks = parts
        .map((p) => parseInt(p.trim()))
        .filter((n) => !isNaN(n) && n > 0);

      if (blocks.length === 0) {
        console.warn(
          `⚠️ Geçersiz blok yapısı: "${blockString}", varsayılan [1] kullanılıyor`
        );
        return [1];
      }

      return blocks;
    } catch (error) {
      console.error("❌ Block parse hatası:", error);
      return [1];
    }
  }

  // ============================================
  // CLASSES FORMATLAMA
  // ============================================
  formatClasses(siniflarData) {
    const data = this.extractArray(siniflarData);

    if (data.length === 0) {
      console.warn("    ⚠️ Hiç sınıf bulunamadı!");
      return [];
    }

    return data.map((sinif) => ({
      id: sinif.id,
      name: sinif.sinif_adi || `Sınıf ${sinif.id}`,
      code: sinif.sinif_kodu || `S${sinif.id}`,
      grade: sinif.sinif_duzey || 0,
      capacity: 40,
      maxDailyHours: 8,
      maxWeeklyHours: 40,
    }));
  }

  // ============================================
  // TEACHERS FORMATLAMA
  // ============================================
  formatTeachers(ogretmenlerData) {
    const data = this.extractArray(ogretmenlerData);

    if (data.length === 0) {
      console.warn("    ⚠️ Hiç öğretmen bulunamadı!");
      return [];
    }

    return data.map((ogretmen) => {
      const branch =
        ogretmen.brans ||
        ogretmen.branch ||
        ogretmen.bolum ||
        ogretmen.alan ||
        ogretmen.uzmanlik_alani ||
        ogretmen.uzmanlik ||
        ogretmen.dal ||
        ogretmen.bransi ||
        ogretmen.ders_alani ||
        "Branş Belirtilmemiş";

      return {
        id: ogretmen.id,
        name: ogretmen.ad_soyad || ogretmen.name || `Öğretmen ${ogretmen.id}`,
        code:
          ogretmen.kisa_ad ||
          ogretmen.code ||
          ogretmen.ad_soyad?.substring(0, 4).toUpperCase() ||
          `T${ogretmen.id}`,
        branch: branch,
        brans: branch,
        maxDailyHours: ogretmen.max_gunluk_ders || 8,
        maxWeeklyHours: ogretmen.max_haftalik_ders || 30,
        minDailyHours: ogretmen.min_gunluk_ders || 0,
      };
    });
  }

  // ============================================
  // CONSTRAINTS FORMATLAMA
  // ============================================
  formatConstraints(kisitlarData) {
    const constraints = [];
    const ogretmenKisitlari = kisitlarData?.ogretmenler || [];

    for (const kisit of ogretmenKisitlari) {
      try {
        constraints.push({
          id: `constraint_${kisit.id}`,
          type: "teacher_constraint",
          teacherId: kisit.ogretmen_id,
          minDailyHours: kisit.min_gunluk_ders || 2,
          maxDailyHours: kisit.max_gunluk_ders || 8,
          maxGaps: kisit.max_bos_pencere || 2,
        });
      } catch (error) {
        console.error("❌ Kısıt parse hatası:", error);
      }
    }

    return constraints;
  }

  // ============================================
  // PREFERENCES FORMATLAMA
  // ============================================
  formatPreferences(tercihlerData) {
    const data = this.extractArray(tercihlerData);

    return data.map((tercih) => ({
      id: `pref_${tercih.id}`,
      teacherId: tercih.ogretmen_id,
      preferredDay: tercih.bos_gun,
      closedSlots: tercih.kapali_saatler
        ? JSON.parse(tercih.kapali_saatler)
        : {},
      notes: tercih.tercih_notlari || null,
    }));
  }

  // ============================================
  // YUMUŞAK VALİDASYON
  // ============================================
  validateDataSoft(data) {
    const warnings = [];

    if (!data.lessons || data.lessons.length === 0) {
      warnings.push("⚠️ Hiç ders ataması yok");
    }

    if (!data.classes || data.classes.length === 0) {
      warnings.push("⚠️ Hiç sınıf yok");
    }

    if (!data.teachers || data.teachers.length === 0) {
      warnings.push("⚠️ Hiç öğretmen yok");
    }

    if (warnings.length > 0) {
      console.warn("  ⚠️ Uyarılar:");
      warnings.forEach((w) => console.warn(`    ${w}`));
    } else {
      console.log("  ✅ Tüm veriler mevcut");
    }
  }

  // ============================================
  // TEST DATA
  // ============================================
  getTestData() {
    return {
      program: { id: 1, program_adi: "Test Program" },
      dersler: [{ id: 1, ders_adi: "Matematik", ders_kodu: "MAT" }],
      ogretmenler: [
        {
          id: 1,
          ad_soyad: "Test Öğretmen",
          kisa_ad: "T.ÖĞR",
          brans: "Matematik",
        },
      ],
      siniflar: [{ id: 1, sinif_adi: "9-A", sinif_duzey: 9 }],
      atamalar: [],
      kisitlar: { genel: null, ogretmenler: [] },
      tercihler: [],
      blokDersler: [],
    };
  }

  getRandomColor() {
    const colors = [
      "#3498db",
      "#e74c3c",
      "#2ecc71",
      "#f39c12",
      "#9b59b6",
      "#1abc9c",
      "#34495e",
      "#e67e22",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// ============================================
// GLOBAL ERİŞİM
// ============================================
if (typeof window !== "undefined") {
  window.DataAdapter = DataAdapter;
}

console.log("✅ DataAdapter v3.1.0 yüklendi (BLOK DERS SİSTEMİ AKTİF)");
