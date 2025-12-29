/**
 * ================================================================================
 * SCHEDULE ALGORITHM V2 - TÜRKİYE AI DERS DAĞITIM SİSTEMİ
 * ================================================================================
 *
 * 10 BÖLÜM MİMARİ:
 * 1. CORE FOUNDATION (Constructor, Modül Yükleme)
 * 2. DATA PREPARATION (Veri Hazırlığı, Sürekli Kontrol)
 * 3. VALIDATION LAYER (Doğrulama Katmanı)
 * 4. TEACHER-BASED PLACEMENT (Öğretmen Bazlı Yerleştirme)
 * 5. BLOCK PLACEMENT (Blok Yerleştirme)
 * 6. INITIAL SOLUTION (Başlangıç Çözümü)
 * 7. ALGORITHM INTEGRATION (Algoritma Entegrasyonu)
 * 8. SCORING & REPAIR (Puanlama & Onarım)
 * 9. FINAL VALIDATION (Son Doğrulama)
 * 10. SOLVE ORCHESTRATION (Ana Orkestrasyon)
 * ================================================================================
 */

class ScheduleAlgorithmV2 {
  /**
   * ================================================================================
   * BÖLÜM 1: CORE FOUNDATION - CONSTRUCTOR VE MODÜL YÜKLEME
   * ================================================================================
   */
  constructor(data, settings = {}) {
    console.log("\n" + "=".repeat(80));
    console.log("🚀 SCHEDULE ALGORITHM V2 - BAŞLATILIYOR");
    console.log("=".repeat(80));

    // Temel veriler
    this.lessons = data.lessons || [];
    this.teachers = data.teachers || [];
    this.classes = data.classes || [];
    this.constraints = data.constraints || {};
    this.preferences = data.preferences || {};
    this.manualPlacements = data.manualPlacements || {};

    // Ayarlar
    this.settings = {
      maxIterations: settings.maxIterations || 1000,
      populationSize: settings.populationSize || 50,
      enableRL: settings.enableRL !== false,
      enablePatternMemory: settings.enablePatternMemory !== false,
      enableContinuousMonitoring: settings.enableContinuousMonitoring !== false,
      debug: settings.debug || false,
      ...settings,
    };

    // Merkezi state
    this.state = {
      schedule: this.initializeSchedule(),
      fitness: 0,
      iteration: 0,
      phase: "INITIALIZATION",
      violations: [],
      warnings: [],
    };

    // Metadata yapıları
    this.teacherMetadata = {};
    this.lessonMetadata = {};
    this.sortedTeachers = [];
    this.sortedLessons = [];
    this.processedConstraints = {};
    this.processedPreferences = {};
    this.teacherDomains = {};
    this.lessonDomains = {};
    this.lockedLessons = new Set();

    // Monitoring yapısı
    this.monitoring = {
      enabled: false,
      interval: 100,
      lastCheck: 0,
      checks: 0,
      violations: [],
      warnings: [],
      performance: {
        avgIterationTime: 0,
        totalIterations: 0,
        successRate: 0,
      },
    };

    // Modül konteynerleri
    this.modules = {
      core: {},
      block: {},
      optimization: {},
      strategy: {},
      performance: {},
      features: {},
      helpers: {},
    };

    // Algoritma konteyneri
    this.algorithms = {};

    // Debug sistemi
    this.debugLog = [];
    this.logLevels = {
      INFO: "ℹ️",
      SUCCESS: "✅",
      WARN: "⚠️",
      ERROR: "❌",
      DEBUG: "🔍",
    };

    // Modülleri yükle
    this.loadAllModules();
    this.loadAllAlgorithms();

    // Constructor içinde, en sona ekle (printLoadingSummary() ÖNCESİNE)

    // --------------------------------------------------------------------------------
    // 🛠️ KRİTİK MODÜL BAĞLANTILARI
    // --------------------------------------------------------------------------------
    // Modüllere doğrudan this.X ile erişim için bağlantıları oluştur
    this.metaController = this.modules.core?.metaController || null;
    this.solutionStabilizer =
      this.modules.optimization?.solutionStabilizer || null;
    this.scheduleScoring = this.modules.optimization?.scheduleScoring || null;
    this.scheduleRepairEngine =
      this.modules.optimization?.scheduleRepairEngine || null;
    this.qualityAssurance = this.modules.optimization?.qualityAssurance || null;

    console.log("\n🔗 Modül bağlantıları oluşturuldu:");
    console.log("   • metaController:", this.metaController ? "✅" : "❌");
    console.log(
      "   • solutionStabilizer:",
      this.solutionStabilizer ? "✅" : "❌"
    );
    console.log("   • scheduleScoring:", this.scheduleScoring ? "✅" : "❌");
    console.log(
      "   • scheduleRepairEngine:",
      this.scheduleRepairEngine ? "✅" : "❌"
    );
    console.log("   • qualityAssurance:", this.qualityAssurance ? "✅" : "❌");
    // --------------------------------------------------------------------------------

    // Özet rapor (en sonda kalsın)
    this.printLoadingSummary();

    console.log("=".repeat(80) + "\n");
  }

  /**
   * ================================================================================
   * SCHEDULE YAPISINI BAŞLAT
   * ================================================================================
   */
  initializeSchedule() {
    const schedule = {};
    for (const cls of this.classes) {
      schedule[cls.id] = {};
      for (let day = 1; day <= 5; day++) {
        schedule[cls.id][day] = {};
        for (let hour = 1; hour <= 8; hour++) {
          schedule[cls.id][day][hour] = null;
        }
      }
    }
    return schedule;
  }

  /**
   * ================================================================================
   * MODÜL YÜKLEME SİSTEMİ
   * ================================================================================
   */
  loadAllModules() {
    console.log("\n📦 MODÜL YÜKLEME BAŞLIYOR:");
    console.log("-".repeat(80));

    let totalModules = 0;
    let loadedModules = 0;
    let failedModules = 0;

    // A) CORE MODÜLLER (8 modül)
    console.log("\n🔵 A) CORE MODÜLLER:");
    totalModules += 8;
    loadedModules += this.loadModule(
      "validationEngine",
      "core",
      ValidationEngine
    );
    loadedModules += this.loadModule(
      "conflictDetector",
      "core",
      ConflictDetector
    );
    loadedModules += this.loadModule(
      "weightedConstraintSystem",
      "core",
      WeightedConstraintSystem
    );
    loadedModules += this.loadModule("metaController", "core", MetaController);
    loadedModules += this.loadModule(
      "constraintPreprocessor",
      "core",
      ConstraintPreprocessor
    );
    loadedModules += this.loadModule("lockManager", "core", LockManager);
    loadedModules += this.loadModule("debugLogger", "core", DebugLogger, true);
    loadedModules += this.loadModule("cacheManager", "core", CacheManager);

    // B) BLOK SİSTEMİ (5 modül)
    console.log("\n🟢 B) BLOK SİSTEMİ:");
    totalModules += 5;
    loadedModules += this.loadModule(
      "blockPlacementController",
      "block",
      BlockPlacementController
    );
    loadedModules += this.loadModule("blockStructure", "block", BlockStructure);
    loadedModules += this.loadModule(
      "blockConsecutiveCheck",
      "block",
      BlockConsecutiveCheck
    );
    loadedModules += this.loadModule(
      "blockDayValidator",
      "block",
      BlockDayValidator
    );
    loadedModules += this.loadModule("blockAwareSwap", "block", BlockAwareSwap);

    // C) OPTİMİZASYON (6 modül)
    console.log("\n🟡 C) OPTİMİZASYON:");
    totalModules += 6;
    loadedModules += this.loadModule(
      "scheduleScoring",
      "optimization",
      ScheduleScoring
    );
    loadedModules += this.loadModule(
      "multiObjectiveOptimizer",
      "optimization",
      MultiObjectiveOptimizer
    );
    loadedModules += this.loadModule(
      "fairnessEngine",
      "optimization",
      FairnessEngine
    );
    loadedModules += this.loadModule(
      "qualityAssurance",
      "optimization",
      QualityAssurance
    );
    loadedModules += this.loadModule(
      "scheduleRepairEngine",
      "optimization",
      ScheduleRepairEngine
    );
    loadedModules += this.loadModule(
      "solutionStabilizer",
      "optimization",
      SolutionStabilizer
    );

    // D) STRATEJİ (5 modül)
    console.log("\n🟣 D) STRATEJİ:");
    totalModules += 5;
    loadedModules += this.loadModule(
      "adaptiveStrategy",
      "strategy",
      AdaptiveStrategy
    );
    loadedModules += this.loadModule("hybridSolver", "strategy", HybridSolver);
    loadedModules += this.loadModule(
      "parallelSolver",
      "strategy",
      ParallelSolver,
      true
    );
    loadedModules += this.loadModule(
      "solverPipeline",
      "strategy",
      SolverPipeline
    );
    loadedModules += this.loadModule("swapEngine", "strategy", SwapEngine);

    // E) PERFORMANS (4 modül)
    console.log("\n🔴 E) PERFORMANS:");
    totalModules += 4;
    loadedModules += this.loadModule(
      "performanceMonitor",
      "performance",
      PerformanceMonitor
    );
    loadedModules += this.loadModule(
      "incrementalConflictCache",
      "performance",
      IncrementalConflictCache
    );
    loadedModules += this.loadModule(
      "patternMemory",
      "performance",
      PatternMemory
    );
    loadedModules += this.loadModule(
      "progressTracker",
      "performance",
      ProgressTracker,
      true
    );

    // F) FEATURES (4 modül)
    console.log("\n🟠 F) FEATURES:");
    totalModules += 4;
    loadedModules += this.loadModule(
      "liveScheduler",
      "features",
      LiveScheduler,
      true
    );
    loadedModules += this.loadModule(
      "etkilenenOgretmenFinder",
      "features",
      EtkilenenOgretmenFinder
    );
    loadedModules += this.loadModule(
      "algorithmVisualizer",
      "features",
      AlgorithmVisualizer,
      true
    );
    loadedModules += this.loadModule(
      "interactiveScheduleViewer",
      "features",
      InteractiveScheduleViewer,
      true
    );

    // G) HELPERS (6 modül)
    console.log("\n⚫ G) HELPERS:");
    totalModules += 6;
    loadedModules += this.loadModule(
      "distributionAnalyzer",
      "helpers",
      DistributionAnalyzer
    );
    loadedModules += this.loadModule(
      "statisticsManager",
      "helpers",
      StatisticsManager
    );
    loadedModules += this.loadModule(
      "undoRedoManager",
      "helpers",
      UndoRedoManager,
      true
    );
    loadedModules += this.loadModule(
      "exportImportManager",
      "helpers",
      ExportImportManager,
      true
    );
    loadedModules += this.loadModule(
      "saveManager",
      "helpers",
      SaveManager,
      true
    );
    loadedModules += this.loadModule(
      "scheduleComparisonTool",
      "helpers",
      ScheduleComparisonTool
    );

    failedModules = totalModules - loadedModules;

    console.log("\n" + "-".repeat(80));
    console.log(
      `📊 MODÜL YÜKLEME SONUCU: ${loadedModules}/${totalModules} başarılı`
    );
    if (failedModules > 0) {
      console.log(
        `⚠️  ${failedModules} modül yüklenemedi (opsiyonel veya eksik)`
      );
    }
  }

  /**
   * ================================================================================
   * TEK MODÜL YÜKLEME FONKSİYONU
   * ================================================================================
   */
  loadModule(name, group, ClassRef, isOptional = false) {
    try {
      if (typeof ClassRef === "undefined") {
        if (!isOptional) {
          console.log(`   ❌ ${name}: BULUNAMADI`);
        } else {
          console.log(`   ⚪ ${name}: OPSIYONEL (yok)`);
        }
        return 0;
      }

      this.modules[group][name] = new ClassRef();
      console.log(`   ✅ ${name}: YÜKLENDI`);
      return 1;
    } catch (error) {
      if (!isOptional) {
        console.log(`   ❌ ${name}: HATA - ${error.message}`);
      } else {
        console.log(`   ⚪ ${name}: OPSIYONEL (hata)`);
      }
      return 0;
    }
  }

  /**
   * ================================================================================
   * ALGORİTMA YÜKLEME SİSTEMİ
   * ================================================================================
   */
  loadAllAlgorithms() {
    console.log("\n🤖 ALGORİTMA YÜKLEME BAŞLIYOR:");
    console.log("-".repeat(80));

    let totalAlgorithms = 6;
    let loadedAlgorithms = 0;

    loadedAlgorithms += this.loadAlgorithm(
      "Genetic Algorithm",
      "ga",
      GeneticAlgorithm
    );
    loadedAlgorithms += this.loadAlgorithm(
      "Ant Colony Optimization",
      "aco",
      AntColonyOptimization
    );
    loadedAlgorithms += this.loadAlgorithm(
      "Simulated Annealing",
      "sa",
      SimulatedAnnealing
    );
    loadedAlgorithms += this.loadAlgorithm("Tabu Search", "tabu", TabuSearch);
    loadedAlgorithms += this.loadAlgorithm(
      "Reinforcement Learning",
      "rl",
      ReinforcementLearning
    );
    loadedAlgorithms += this.loadAlgorithm(
      "Fuzzy Logic",
      "fuzzy",
      FuzzyLogicEngine
    );

    console.log("-".repeat(80));
    console.log(
      `📊 ALGORİTMA YÜKLEME SONUCU: ${loadedAlgorithms}/${totalAlgorithms} başarılı`
    );
  }

  /**
   * ================================================================================
   * TEK ALGORİTMA YÜKLEME FONKSİYONU
   * ================================================================================
   */
  loadAlgorithm(name, key, ClassRef) {
    try {
      if (typeof ClassRef === "undefined") {
        console.log(`   ❌ ${name}: BULUNAMADI`);
        return 0;
      }

      this.algorithms[key] = new ClassRef();
      console.log(`   ✅ ${name}: YÜKLENDI`);
      return 1;
    } catch (error) {
      console.log(`   ❌ ${name}: HATA - ${error.message}`);
      return 0;
    }
  }

  /**
   * ================================================================================
   * YÜKLEME ÖZETİ
   * ================================================================================
   */
  printLoadingSummary() {
    console.log("\n" + "=".repeat(80));
    console.log("📊 SİSTEM DURUM ÖZETİ:");
    console.log("-".repeat(80));

    const totalModules = Object.values(this.modules).reduce(
      (sum, group) => sum + Object.keys(group).length,
      0
    );
    const totalAlgorithms = Object.keys(this.algorithms).length;

    console.log(`✅ Toplam Modül: ${totalModules}/43`);
    console.log(`✅ Toplam Algoritma: ${totalAlgorithms}/6`);
    console.log(`✅ Ders Sayısı: ${this.lessons.length}`);
    console.log(`✅ Öğretmen Sayısı: ${this.teachers.length}`);
    console.log(`✅ Sınıf Sayısı: ${this.classes.length}`);
    console.log(`✅ Kısıt Sayısı: ${Object.keys(this.constraints).length}`);
    console.log(`✅ Tercih Sayısı: ${Object.keys(this.preferences).length}`);
    console.log(
      `✅ Manuel Yerleştirme: ${Object.keys(this.manualPlacements).length}`
    );
    console.log("=".repeat(80));
  }

  /**
   * ================================================================================
   * DEBUG LOG SİSTEMİ
   * ================================================================================
   */
  log(level, module, message) {
    const timestamp = new Date().toLocaleTimeString("tr-TR");
    const emoji = this.logLevels[level] || "📝";
    const logEntry = {
      timestamp,
      level,
      module,
      message,
    };

    this.debugLog.push(logEntry);

    if (this.settings.debug || level === "ERROR") {
      console.log(`${emoji} [${timestamp}] ${module}: ${message}`);
    }
  }

  /**
   * ================================================================================
   * HATA LOGLAMA
   * ================================================================================
   */
  logError(module, message, error) {
    this.log("ERROR", module, message);
    if (error) {
      console.error(`   Stack: ${error.stack || error.message}`);
    }
  }

  /**
   * ================================================================================
   * BÖLÜM 1 BİTTİ
   * ================================================================================
   */

  /**
   * ================================================================================
   * BÖLÜM 2: DATA PREPARATION - VERİ HAZIRLAMA VE ÖN ANALİZ
   * ================================================================================
   */

  prepareData() {
    console.log("\n" + "=".repeat(80));
    console.log("🔧 BÖLÜM 2: VERİ HAZIRLIĞI VE ÖN ANALİZ BAŞLADI");
    console.log("=".repeat(80));

    const startTime = Date.now();

    try {
      // 1. Kısıt Önişleme
      this.preprocessConstraints();

      // 2. Öğretmen Analizi ve Domain Hesaplama
      this.analyzeTeachers();

      // 3. Ders Analizi ve Blok Yapısı
      this.analyzeLessons();

      // 4. Manuel Yerleştirmeleri Kilitle
      this.lockManualPlacements();

      // 5. Sürekli Kontrol Mekanizmasını Başlat
      this.initializeContinuousMonitoring();

      // 6. Domain Hesaplama (Her ders için uygun slotlar)
      this.calculateDomains();

      const duration = Date.now() - startTime;
      console.log("=".repeat(80));
      this.log(
        "SUCCESS",
        "DataPreparation",
        `✅ Veri hazırlığı tamamlandı (${duration}ms)`
      );
      console.log("=".repeat(80) + "\n");

      return true;
    } catch (error) {
      this.logError("DataPreparation", "Veri hazırlığı başarısız!", error);
      throw error;
    }
  }

  /**
   * ================================================================================
   * 1. KISIT ÖNİŞLEME - DÜZELTİLDİ!
   * ================================================================================
   */
  preprocessConstraints() {
    console.log("\n📋 1. KISIT ÖNİŞLEME:");
    console.log("-".repeat(80));

    this.log("INFO", "ConstraintPreprocessor", "Kısıtlar işleniyor...");

    // ❌ ConstraintPreprocessor modülü şu anda kullanılamıyor
    // ✅ Her zaman manuel işleme kullan

    this.log("INFO", "ManualProcessing", "Manuel kısıt işleme başlatılıyor...");

    this.processedConstraints = this.constraints || {};
    this.processedPreferences = this.preferences || {};
    this.teacherDomains = {};
    this.lessonDomains = {};

    console.log(
      `   ✅ Manuel işleme: ${
        Object.keys(this.processedConstraints).length
      } kısıt`
    );
    console.log(
      `   ✅ Manuel işleme: ${
        Object.keys(this.processedPreferences).length
      } tercih`
    );

    this.log(
      "SUCCESS",
      "ConstraintPreprocessor",
      "✅ Kısıt önişleme tamamlandı"
    );
  }

  /**
   * ================================================================================
   * MANUEL KISIT İŞLEME
   * ================================================================================
   */
  manualConstraintProcessing() {
    this.log("INFO", "ManualProcessing", "Manuel kısıt işleme başlatılıyor...");

    this.processedConstraints = this.constraints || {};
    this.processedPreferences = this.preferences || {};
    this.teacherDomains = {};
    this.lessonDomains = {};

    console.log(
      `   ✅ Manuel işleme: ${
        Object.keys(this.processedConstraints).length
      } kısıt`
    );
    console.log(
      `   ✅ Manuel işleme: ${
        Object.keys(this.processedPreferences).length
      } tercih`
    );
  }

  /**
   * ================================================================================
   * 2. ÖĞRETMEN ANALİZİ
   * ================================================================================
   */
  analyzeTeachers() {
    console.log("\n👨‍🏫 2. ÖĞRETMEN ANALİZİ:");
    console.log("-".repeat(80));

    this.log("INFO", "TeacherAnalysis", "Öğretmen verileri analiz ediliyor...");

    this.teacherMetadata = {};

    for (const teacher of this.teachers) {
      const teacherId = teacher.id;

      this.teacherMetadata[teacherId] = {
        id: teacherId,
        name: teacher.name,
        lessons: [],
        totalHours: 0,
        hasConstraints: false,
        constraints: {},
        hasPreferences: false,
        preferences: {},
        offDay: null,
        dailyLimit: { min: 0, max: 8 },
        weeklyGapLimit: 10,
        placedHours: 0,
        currentSchedule: {},
        priority: 0,
      };

      const teacherLessons = this.lessons.filter(
        (l) => l.teacherId === teacherId
      );
      this.teacherMetadata[teacherId].lessons = teacherLessons;
      this.teacherMetadata[teacherId].totalHours = teacherLessons.reduce(
        (sum, l) => sum + l.weeklyHours,
        0
      );

      if (this.processedConstraints[teacherId]) {
        this.teacherMetadata[teacherId].hasConstraints = true;
        this.teacherMetadata[teacherId].constraints =
          this.processedConstraints[teacherId];
        this.teacherMetadata[teacherId].priority += 100;
      }

      if (this.processedPreferences[teacherId]) {
        this.teacherMetadata[teacherId].hasPreferences = true;
        this.teacherMetadata[teacherId].preferences =
          this.processedPreferences[teacherId];

        if (this.processedPreferences[teacherId].offDay !== undefined) {
          this.teacherMetadata[teacherId].offDay =
            this.processedPreferences[teacherId].offDay;
          this.teacherMetadata[teacherId].priority += 50;
        }

        if (this.processedPreferences[teacherId].customLimits?.enabled) {
          const limits = this.processedPreferences[teacherId].customLimits;
          this.teacherMetadata[teacherId].dailyLimit = {
            min: limits.minDaily || 0,
            max: limits.maxDaily || 8,
          };
        }

        if (this.processedPreferences[teacherId].gapLimit !== undefined) {
          this.teacherMetadata[teacherId].weeklyGapLimit =
            this.processedPreferences[teacherId].gapLimit;
        }
      }

      this.teacherMetadata[teacherId].currentSchedule =
        this.initializeTeacherSchedule();
    }

    this.sortedTeachers = Object.values(this.teacherMetadata).sort(
      (a, b) => b.priority - a.priority
    );

    const constrainedCount = this.sortedTeachers.filter(
      (t) => t.hasConstraints
    ).length;
    const preferenceCount = this.sortedTeachers.filter(
      (t) => t.hasPreferences
    ).length;
    const offDayCount = this.sortedTeachers.filter(
      (t) => t.offDay !== null
    ).length;

    console.log(`   ✅ Toplam öğretmen: ${this.teachers.length}`);
    console.log(`   ✅ Kısıtlı öğretmen: ${constrainedCount}`);
    console.log(`   ✅ Tercihli öğretmen: ${preferenceCount}`);
    console.log(`   ✅ Boş gün isteyen: ${offDayCount}`);
    console.log(
      `   ✅ Öncelik sıralaması: ${this.sortedTeachers
        .slice(0, 3)
        .map((t) => t.name)
        .join(", ")}...`
    );

    this.log("SUCCESS", "TeacherAnalysis", "✅ Öğretmen analizi tamamlandı");
  }

  /**
   * ================================================================================
   * ÖĞRETMEN SCHEDULE BAŞLAT
   * ================================================================================
   */
  initializeTeacherSchedule() {
    const schedule = {};
    for (let day = 1; day <= 5; day++) {
      schedule[day] = {};
      for (let hour = 1; hour <= 8; hour++) {
        schedule[day][hour] = null;
      }
    }
    return schedule;
  }
  /**
   * ================================================================================
   * 3. DERS ANALİZİ
   * ================================================================================
   */
  analyzeLessons() {
    console.log("\n📚 3. DERS ANALİZİ VE BLOK YAPISI:");
    console.log("-".repeat(80));

    this.log("INFO", "LessonAnalysis", "Dersler analiz ediliyor...");

    this.lessonMetadata = {};

    for (const lesson of this.lessons) {
      const lessonId = lesson.id;

      // ✅ EĞER DERS ZATEN BLOK YAPISI VARSA, ONU KULLAN!
      let blockStructure = [lesson.weeklyHours];

      if (
        lesson.blockStructure &&
        Array.isArray(lesson.blockStructure) &&
        lesson.blockStructure.length > 0
      ) {
        // VERİTABANINDAN GELEN BLOK YAPISI VAR!
        blockStructure = lesson.blockStructure;
        console.log(
          `   🔸 ${lesson.subjectName} (${
            lesson.className
          }): Mevcut blok yapısı kullanılıyor [${blockStructure.join("+")}]`
        );
      } else if (lesson.weeklyHours > 1) {
        // BLOK YAPISI YOK, HESAPLA
        const weeklyHours = lesson.weeklyHours;

        if (weeklyHours === 2) {
          blockStructure = [2];
        } else if (weeklyHours === 3) {
          blockStructure = [2, 1];
        } else if (weeklyHours === 4) {
          blockStructure = [2, 2];
        } else if (weeklyHours === 5) {
          blockStructure = [2, 2, 1];
        } else if (weeklyHours === 6) {
          blockStructure = [2, 2, 2];
        } else if (weeklyHours === 7) {
          blockStructure = [2, 2, 3];
        } else if (weeklyHours === 8) {
          blockStructure = [4, 4];
        } else if (weeklyHours === 9) {
          blockStructure = [3, 3, 3];
        } else if (weeklyHours === 10) {
          blockStructure = [4, 4, 2];
        } else if (weeklyHours === 12) {
          blockStructure = [4, 4, 4];
        } else {
          // Varsayılan: 2'şerli bloklara böl
          blockStructure = [];
          let remaining = weeklyHours;
          while (remaining > 0) {
            const blockSize = Math.min(2, remaining);
            blockStructure.push(blockSize);
            remaining -= blockSize;
          }
        }
        console.log(
          `   🔹 ${lesson.subjectName} (${
            lesson.className
          }): Blok yapısı hesaplandı [${blockStructure.join("+")}]`
        );
      }

      // ✅ BLOK DERSİ: Haftalık saat > 1 olan her ders!
      const isBlockLesson = lesson.weeklyHours > 1;

      this.lessonMetadata[lessonId] = {
        id: lessonId,
        teacherId: lesson.teacherId,
        classId: lesson.classId,
        subjectName: lesson.subjectName,
        className: lesson.className,
        weeklyHours: lesson.weeklyHours,
        blockStructure: blockStructure,
        blockCount: blockStructure.length,
        isBlockLesson: isBlockLesson,
        placedBlocks: 0,
        placedHours: 0,
        remainingHours: lesson.weeklyHours,
        priority: 0,
        domains: [],
      };

      if (this.lessonMetadata[lessonId].isBlockLesson) {
        // ✅ ÇOK BLOKLU DERSLER ÖNCE (Matematik 6 > Türkçe 5 > İngilizce 4)
        // Tek bloklu dersler (Fizik, Kimya) daha düşük öncelik
        if (blockStructure.length > 1) {
          this.lessonMetadata[lessonId].priority +=
            1000 + lesson.weeklyHours * 100;
        } else {
          this.lessonMetadata[lessonId].priority +=
            500 + lesson.weeklyHours * 50;
        }
      }

      const teacherMeta = this.teacherMetadata[lesson.teacherId];
      if (teacherMeta?.hasConstraints) {
        this.lessonMetadata[lessonId].priority += 500;
      }

      if (teacherMeta?.hasPreferences) {
        this.lessonMetadata[lessonId].priority += 200;
      }
    }

    this.sortedLessons = Object.values(this.lessonMetadata).sort(
      (a, b) => b.priority - a.priority
    );

    const blockLessons = this.sortedLessons.filter(
      (l) => l.isBlockLesson
    ).length;
    const totalHours = this.sortedLessons.reduce(
      (sum, l) => sum + l.weeklyHours,
      0
    );
    const totalBlocks = this.sortedLessons.reduce(
      (sum, l) => sum + l.blockCount,
      0
    );

    console.log(`   ✅ Toplam ders: ${this.lessons.length}`);
    console.log(`   ✅ Blok ders: ${blockLessons}`);
    console.log(`   ✅ Toplam saat: ${totalHours}`);
    console.log(`   ✅ Toplam blok: ${totalBlocks}`);

    this.log("SUCCESS", "LessonAnalysis", "✅ Ders analizi tamamlandı");
  }
  /**
   * ================================================================================
   * 4. MANUEL YERLEŞTİRME KİLİTLEME
   * ================================================================================
   */
  lockManualPlacements() {
    console.log("\n🔒 4. MANUEL YERLEŞTİRMELERİ KİLİTLE:");
    console.log("-".repeat(80));

    this.log("INFO", "LockManager", "Manuel yerleştirmeler kilitleniyor...");

    const manualCount = Object.keys(this.manualPlacements).length;

    if (manualCount === 0) {
      console.log("   ℹ️  Manuel yerleştirme yok");
      return;
    }

    if (this.modules.core.lockManager) {
      try {
        for (const [slotKey, lesson] of Object.entries(this.manualPlacements)) {
          const [classId, day, hour] = slotKey.split("_");

          this.modules.core.lockManager.lockSlot(
            classId,
            parseInt(day),
            parseInt(hour),
            lesson
          );

          if (this.state.schedule[classId]?.[day]?.[hour] !== undefined) {
            this.state.schedule[classId][day][hour] = lesson;
          }

          if (this.teacherMetadata[lesson.teacherId]) {
            this.teacherMetadata[lesson.teacherId].currentSchedule[day][hour] =
              {
                classId: classId,
                lesson: lesson,
              };
            this.teacherMetadata[lesson.teacherId].placedHours++;
          }

          if (this.lessonMetadata[lesson.id]) {
            this.lessonMetadata[lesson.id].placedHours++;
            this.lessonMetadata[lesson.id].remainingHours--;
          }
        }

        console.log(`   ✅ ${manualCount} manuel yerleştirme kilitlendi`);
        this.log("SUCCESS", "LockManager", `✅ ${manualCount} slot kilitlendi`);
      } catch (error) {
        this.logError(
          "LockManager",
          "Manuel yerleştirme kilitleme hatası!",
          error
        );
      }
    } else {
      for (const slotKey of Object.keys(this.manualPlacements)) {
        this.lockedLessons.add(slotKey);
      }
      console.log(`   ✅ ${manualCount} slot manuel kilitleme ile işlendi`);
    }
  }

  /**
   * ================================================================================
   * 5. SÜREKLİ KONTROL BAŞLAT
   * ================================================================================
   */
  initializeContinuousMonitoring() {
    console.log("\n📊 5. SÜREKLİ KONTROL MEKANİZMASI:");
    console.log("-".repeat(80));

    this.log(
      "INFO",
      "ContinuousMonitoring",
      "Sürekli kontrol mekanizması başlatılıyor..."
    );

    this.monitoring = {
      enabled: true,
      interval: 100,
      lastCheck: 0,
      checks: 0,
      violations: [],
      warnings: [],
      performance: {
        avgIterationTime: 0,
        totalIterations: 0,
        successRate: 0,
      },
    };

    if (this.modules.performance.performanceMonitor) {
      try {
        this.modules.performance.performanceMonitor.start();
        console.log("   ✅ PerformanceMonitor: AKTİF");
      } catch (error) {
        this.log("WARN", "PerformanceMonitor", "Başlatılamadı");
      }
    }

    if (this.modules.performance.incrementalConflictCache) {
      try {
        this.modules.performance.incrementalConflictCache.initialize(
          this.state.schedule
        );
        console.log("   ✅ IncrementalConflictCache: AKTİF");
      } catch (error) {
        this.log("WARN", "IncrementalConflictCache", "Başlatılamadı");
      }
    }

    if (this.modules.performance.patternMemory) {
      try {
        this.modules.performance.patternMemory.initialize();
        console.log("   ✅ PatternMemory: AKTİF (RL öğrenme aktif)");
      } catch (error) {
        this.log("WARN", "PatternMemory", "Başlatılamadı");
      }
    }

    this.log(
      "SUCCESS",
      "ContinuousMonitoring",
      "✅ Sürekli kontrol mekanizması hazır"
    );
  }

  /**
   * ================================================================================
   * 6. DOMAIN HESAPLAMA
   * ================================================================================
   */
  calculateDomains() {
    console.log("\n🎯 6. DOMAIN HESAPLAMA (UYGUN SLOTLAR):");
    console.log("-".repeat(80));

    this.log(
      "INFO",
      "DomainCalculation",
      "Her ders için uygun slotlar hesaplanıyor..."
    );

    let totalDomains = 0;
    let restrictedLessons = 0;

    for (const lesson of this.sortedLessons) {
      const teacherId = lesson.teacherId;
      const classId = lesson.classId;
      const teacherMeta = this.teacherMetadata[teacherId];

      const domains = [];

      for (let day = 1; day <= 5; day++) {
        for (let hour = 1; hour <= 8; hour++) {
          const slotKey = `${classId}_${day}_${hour}`;
          if (this.lockedLessons.has(slotKey)) continue;

          if (this.state.schedule[classId]?.[day]?.[hour]) continue;

          if (teacherMeta?.hasConstraints) {
            const dayConstraints = teacherMeta.constraints[day];
            if (dayConstraints && dayConstraints.includes(hour)) {
              continue;
            }
          }

          if (teacherMeta?.offDay === day) {
            continue;
          }

          if (teacherMeta?.currentSchedule[day]?.[hour]) {
            continue;
          }

          domains.push({ day, hour, weight: 1.0 });
        }
      }

      lesson.domains = domains;
      totalDomains += domains.length;

      if (domains.length < lesson.weeklyHours) {
        restrictedLessons++;
        this.log(
          "WARN",
          "DomainCalculation",
          `⚠️ ${lesson.subjectName} (${lesson.className}): ${domains.length}/${lesson.weeklyHours} uygun slot`
        );
      }
    }

    const avgDomain = Math.round(totalDomains / this.sortedLessons.length);

    console.log(`   ✅ Toplam domain: ${totalDomains}`);
    console.log(`   ✅ Ortalama slot/ders: ${avgDomain}`);
    console.log(
      `   ${
        restrictedLessons > 0 ? "⚠️" : "✅"
      } Kısıtlı ders: ${restrictedLessons}`
    );

    this.log("SUCCESS", "DomainCalculation", "✅ Domain hesaplama tamamlandı");
  }

  /**
   * ================================================================================
   * SÜREKLİ KONTROL FONKSİYONU
   * ================================================================================
   */
  continuousCheck() {
    this.monitoring.checks++;

    if (this.monitoring.checks % this.monitoring.interval !== 0) {
      return;
    }

    this.log(
      "INFO",
      "ContinuousCheck",
      `Kontrol #${this.monitoring.checks} çalışıyor...`
    );

    if (this.modules.performance.performanceMonitor) {
      try {
        const perf = this.modules.performance.performanceMonitor.getMetrics();
        this.monitoring.performance = perf;

        if (perf.avgIterationTime > 100) {
          this.log(
            "WARN",
            "Performance",
            `⚠️ Yavaşlama: ${perf.avgIterationTime.toFixed(2)}ms/iter`
          );
        }
      } catch (error) {
        // Sessiz
      }
    }

    if (this.modules.core.conflictDetector) {
      try {
        const conflicts = this.modules.core.conflictDetector.detectAll(
          this.state.schedule
        );

        if (conflicts.length > 0) {
          this.log(
            "WARN",
            "ConflictCheck",
            `⚠️ ${conflicts.length} çakışma tespit edildi`
          );
          this.monitoring.violations.push(...conflicts);
        }
      } catch (error) {
        // Sessiz
      }
    }

    if (this.modules.optimization.qualityAssurance) {
      try {
        const quality = this.modules.optimization.qualityAssurance.check(
          this.state.schedule
        );

        if (quality.score < 0.7) {
          this.log(
            "WARN",
            "QualityCheck",
            `⚠️ Düşük kalite skoru: ${quality.score.toFixed(2)}`
          );
        }
      } catch (error) {
        // Sessiz
      }
    }
  }

  /**
   * ================================================================================
   * BÖLÜM 2 BİTTİ - DEVAM EDECEK...
   * ================================================================================
   */

  /**
   * ================================================================================
   * BÖLÜM 3: VALIDATION LAYER - DOĞRULAMA KATMANI
   * ================================================================================
   *
   * Bu bölüm:
   * 1. Her yerleştirme öncesi tüm kuralları kontrol eder
   * 2. Kısıt ihlallerini tespit eder
   * 3. Tercih uyumunu kontrol eder
   * 4. Manuel yerleştirmeleri korur
   * 5. Blok kurallarını uygular
   * 6. Çoklu öğretmen çakışmasını önler
   * ================================================================================
   */

  /**
   * ================================================================================
   * ANA DOĞRULAMA FONKSİYONU - TÜM KONTROLLER
   * ================================================================================
   */
  isValidMove(lesson, classId, day, hour) {
    // 1. Manuel yerleştirme koruması
    if (!this.checkManualPlacement(classId, day, hour)) {
      return {
        valid: false,
        reason: "MANUEL_LOCKED",
        detail: "Bu slot manuel yerleştirme ile kilitli",
      };
    }

    // 2. Sınıf çakışması
    if (this.state.schedule[classId]?.[day]?.[hour]) {
      return {
        valid: false,
        reason: "CLASS_CONFLICT",
        detail: "Sınıf bu saatte dolu",
      };
    }

    // 3. Öğretmen kısıtı kontrolü
    const constraintCheck = this.checkConstraints(lesson.teacherId, day, hour);
    if (!constraintCheck.valid) {
      return constraintCheck;
    }

    // 4. Öğretmen tercihi kontrolü
    const preferenceCheck = this.checkPreferences(lesson.teacherId, day, hour);
    if (!preferenceCheck.valid) {
      return preferenceCheck;
    }

    // 5. Öğretmen çakışması (aynı saatte başka sınıfta)
    const teacherConflict = this.checkTeacherConflict(
      lesson.teacherId,
      day,
      hour
    );
    if (!teacherConflict.valid) {
      return teacherConflict;
    }

    // 6. Blok yerleştirme kuralları
    if (lesson.weeklyHours > 1) {
      const blockCheck = this.validateBlockPlacement(
        lesson,
        classId,
        day,
        hour
      );
      if (!blockCheck.valid) {
        return blockCheck;
      }
    }

    // 7. Günlük ders limiti
    const dailyLimitCheck = this.checkDailyLimit(lesson.teacherId, day);
    if (!dailyLimitCheck.valid) {
      return dailyLimitCheck;
    }

    // Tüm kontroller geçti
    return { valid: true, reason: "OK", detail: "Tüm kontroller başarılı" };
  }

  /**
   * ================================================================================
   * 1. MANUEL YERLEŞTİRME KONTROLÜ
   * ================================================================================
   */
  checkManualPlacement(classId, day, hour) {
    const slotKey = `${classId}_${day}_${hour}`;

    // LockManager varsa onu kullan
    if (this.modules.core.lockManager) {
      try {
        return !this.modules.core.lockManager.isLocked(classId, day, hour);
      } catch (error) {
        this.log(
          "WARN",
          "LockManager",
          "Manuel yerleştirme kontrolü başarısız, fallback"
        );
      }
    }

    // Fallback: Set kontrolü
    return !this.lockedLessons.has(slotKey);
  }

  /**
   * ================================================================================
   * 2. ÖĞRETMEN KISIT KONTROLÜ
   * ================================================================================
   */
  checkConstraints(teacherId, day, hour) {
    const teacherMeta = this.teacherMetadata[teacherId];

    if (!teacherMeta) {
      return { valid: true, reason: "NO_TEACHER_META" };
    }

    // Kısıt yoksa geç
    if (!teacherMeta.hasConstraints) {
      return { valid: true, reason: "NO_CONSTRAINTS" };
    }

    // Kısıt kontrolü
    const dayConstraints = teacherMeta.constraints[day];

    if (!dayConstraints) {
      return { valid: true, reason: "NO_CONSTRAINT_THIS_DAY" };
    }

    // Bu saat kısıtlı mı?
    if (dayConstraints.includes(hour)) {
      return {
        valid: false,
        reason: "CONSTRAINT_VIOLATION",
        detail: `${teacherMeta.name} - ${this.getDayName(
          day
        )} ${hour}. saat kısıtlı`,
        severity: "HARD", // Sert kısıt - kesinlikle uyulmalı
      };
    }

    return { valid: true, reason: "CONSTRAINT_OK" };
  }

  /**
   * ================================================================================
   * 3. ÖĞRETMEN TERCİH KONTROLÜ
   * ================================================================================
   */
  checkPreferences(teacherId, day, hour) {
    const teacherMeta = this.teacherMetadata[teacherId];

    if (!teacherMeta || !teacherMeta.hasPreferences) {
      return { valid: true, reason: "NO_PREFERENCES" };
    }

    const preferences = teacherMeta.preferences;

    // A) BOŞ GÜN TERCİHİ (en önemli tercih)
    if (teacherMeta.offDay !== null && teacherMeta.offDay === day) {
      return {
        valid: false,
        reason: "OFF_DAY_PREFERENCE",
        detail: `${teacherMeta.name} - ${this.getDayName(day)} boş gün tercihi`,
        severity: "SOFT_HIGH", // Yumuşak ama yüksek öncelikli
        weight: 50, // İhlal skoru
      };
    }

    // B) ÖZEL SAAT TERCİHLERİ
    if (preferences.avoidHours && preferences.avoidHours[day]) {
      if (preferences.avoidHours[day].includes(hour)) {
        return {
          valid: false,
          reason: "AVOID_HOUR_PREFERENCE",
          detail: `${teacherMeta.name} - ${this.getDayName(
            day
          )} ${hour}. saat tercih etmiyor`,
          severity: "SOFT_MEDIUM",
          weight: 20,
        };
      }
    }

    // C) TERCİH EDİLEN SAATLER (bonus)
    if (preferences.preferredHours && preferences.preferredHours[day]) {
      if (preferences.preferredHours[day].includes(hour)) {
        return {
          valid: true,
          reason: "PREFERRED_HOUR",
          detail: `${teacherMeta.name} - Tercih edilen saat`,
          bonus: 10, // Puan bonusu
        };
      }
    }

    return { valid: true, reason: "PREFERENCE_OK" };
  }

  /**
   * ================================================================================
   * 4. ÖĞRETMEN ÇAKIŞMA KONTROLÜ (Aynı saatte başka sınıfta)
   * ================================================================================
   */
  checkTeacherConflict(teacherId, day, hour) {
    const teacherMeta = this.teacherMetadata[teacherId];

    if (!teacherMeta) {
      return { valid: true, reason: "NO_TEACHER_META" };
    }

    // Öğretmen o saatte başka yerde mi?
    const currentSchedule = teacherMeta.currentSchedule[day]?.[hour];

    if (currentSchedule) {
      return {
        valid: false,
        reason: "TEACHER_CONFLICT",
        detail: `${teacherMeta.name} zaten ${currentSchedule.classId} sınıfında`,
        severity: "HARD",
      };
    }

    // ConflictDetector modülü varsa ek kontrol
    if (this.modules.core.conflictDetector) {
      try {
        const conflicts = this.modules.core.conflictDetector.checkTeacherAt(
          this.state.schedule,
          teacherId,
          day,
          hour
        );

        if (conflicts.length > 0) {
          return {
            valid: false,
            reason: "TEACHER_CONFLICT_DETECTED",
            detail: `ConflictDetector: ${conflicts.length} çakışma`,
            severity: "HARD",
          };
        }
      } catch (error) {
        this.log(
          "WARN",
          "ConflictDetector",
          "Öğretmen çakışma kontrolü başarısız"
        );
      }
    }

    return { valid: true, reason: "NO_TEACHER_CONFLICT" };
  }

  /**
   * ================================================================================
   * 5. BLOK YERLEŞTİRME DOĞRULAMA
   * ================================================================================
   */
  validateBlockPlacement(lesson, classId, day, hour) {
    const lessonMeta = this.lessonMetadata[lesson.id];

    if (!lessonMeta || !lessonMeta.isBlockLesson) {
      return { valid: true, reason: "NOT_BLOCK_LESSON" };
    }

    // A) AYNI GÜN KONTROLÜ (Blok dersler aynı gün olmamalı)
    const blockSameDayCheck = this.checkBlockSameDay(lesson, classId, day);
    if (!blockSameDayCheck.valid) {
      return blockSameDayCheck;
    }

    // B) ARKA ARKAYA KONTROLÜ (Blok dersler arka arkaya olmamalı)
    const blockConsecutiveCheck = this.checkBlockConsecutive(
      lesson,
      classId,
      day,
      hour
    );
    if (!blockConsecutiveCheck.valid) {
      return blockConsecutiveCheck;
    }

    // C) BlockPlacementController entegrasyonu
    if (this.modules.block.blockPlacementController) {
      try {
        const blockValidation =
          this.modules.block.blockPlacementController.validatePlacement(
            this.state.schedule,
            lesson,
            classId,
            day,
            hour
          );

        if (!blockValidation.valid) {
          return blockValidation;
        }
      } catch (error) {
        this.log("WARN", "BlockPlacementController", "Blok doğrulama hatası");
      }
    }

    return { valid: true, reason: "BLOCK_PLACEMENT_OK" };
  }

  /**
   * ================================================================================
   * 6. BLOK AYNI GÜN KONTROLÜ
   * ================================================================================
   */
  checkBlockSameDay(lesson, classId, day) {
    // Bu dersin bu sınıfta bugün zaten bir bloğu yerleştirilmiş mi?
    const todaySchedule = this.state.schedule[classId]?.[day];

    if (!todaySchedule) {
      return { valid: true, reason: "NO_SCHEDULE_TODAY" };
    }

    // Bugün bu ders var mı?
    for (let h = 1; h <= 8; h++) {
      const slot = todaySchedule[h];
      if (slot && slot.id === lesson.id) {
        return {
          valid: false,
          reason: "BLOCK_SAME_DAY",
          detail: `${lesson.subjectName} zaten ${this.getDayName(
            day
          )} günü ${h}. saatte`,
          severity: "SOFT_HIGH",
          weight: 100, // Yüksek ceza
        };
      }
    }

    // BlockDayValidator modülü varsa kullan
    if (this.modules.block.blockDayValidator) {
      try {
        const validation = this.modules.block.blockDayValidator.validate(
          this.state.schedule,
          lesson,
          classId,
          day
        );

        if (!validation.valid) {
          return validation;
        }
      } catch (error) {
        this.log("WARN", "BlockDayValidator", "Aynı gün kontrolü başarısız");
      }
    }

    return { valid: true, reason: "NO_BLOCK_TODAY" };
  }

  /**
   * ================================================================================
   * 7. BLOK ARKA ARKAYA KONTROLÜ
   * ================================================================================
   */
  checkBlockConsecutive(lesson, classId, day, hour) {
    // Bir önceki ve bir sonraki saatte aynı ders var mı?
    const schedule = this.state.schedule[classId]?.[day];

    if (!schedule) {
      return { valid: true, reason: "NO_SCHEDULE" };
    }

    // Önceki saat kontrolü
    if (hour > 1) {
      const prevSlot = schedule[hour - 1];
      if (prevSlot && prevSlot.id === lesson.id) {
        return {
          valid: false,
          reason: "BLOCK_CONSECUTIVE",
          detail: `${lesson.subjectName} arka arkaya yerleştirildi`,
          severity: "SOFT_HIGH",
          weight: 80,
        };
      }
    }

    // Sonraki saat kontrolü
    if (hour < 8) {
      const nextSlot = schedule[hour + 1];
      if (nextSlot && nextSlot.id === lesson.id) {
        return {
          valid: false,
          reason: "BLOCK_CONSECUTIVE",
          detail: `${lesson.subjectName} arka arkaya yerleştirildi`,
          severity: "SOFT_HIGH",
          weight: 80,
        };
      }
    }

    // BlockConsecutiveCheck modülü varsa kullan
    if (this.modules.block.blockConsecutiveCheck) {
      try {
        const validation = this.modules.block.blockConsecutiveCheck.validate(
          this.state.schedule,
          lesson,
          classId,
          day,
          hour
        );

        if (!validation.valid) {
          return validation;
        }
      } catch (error) {
        this.log(
          "WARN",
          "BlockConsecutiveCheck",
          "Arka arkaya kontrolü başarısız"
        );
      }
    }

    return { valid: true, reason: "NOT_CONSECUTIVE" };
  }

  /**
   * ================================================================================
   * 8. GÜNLÜK DERS LİMİTİ KONTROLÜ
   * ================================================================================
   */
  checkDailyLimit(teacherId, day) {
    const teacherMeta = this.teacherMetadata[teacherId];

    if (!teacherMeta) {
      return { valid: true, reason: "NO_TEACHER_META" };
    }

    // Bugün kaç ders var?
    const todaySchedule = teacherMeta.currentSchedule[day];
    let dailyCount = 0;

    for (let hour = 1; hour <= 8; hour++) {
      if (todaySchedule[hour]) {
        dailyCount++;
      }
    }

    // Maksimum limit kontrolü
    if (dailyCount >= teacherMeta.dailyLimit.max) {
      return {
        valid: false,
        reason: "DAILY_LIMIT_EXCEEDED",
        detail: `${teacherMeta.name} - ${this.getDayName(
          day
        )} günü limit aşıldı (${dailyCount}/${teacherMeta.dailyLimit.max})`,
        severity: "SOFT_MEDIUM",
        weight: 30,
      };
    }

    return { valid: true, reason: "DAILY_LIMIT_OK", dailyCount };
  }

  /**
   * ================================================================================
   * 9. HAFTALIK BOŞLUK (GAP) KONTROLÜ
   * ================================================================================
   */
  checkWeeklyGaps(teacherId) {
    const teacherMeta = this.teacherMetadata[teacherId];

    if (!teacherMeta) {
      return { valid: true, reason: "NO_TEACHER_META" };
    }

    let totalGaps = 0;

    // Her gün için boşlukları hesapla
    for (let day = 1; day <= 5; day++) {
      const dailySchedule = teacherMeta.currentSchedule[day];

      let firstLesson = 0;
      let lastLesson = 0;
      let lessonCount = 0;

      // İlk ve son dersi bul
      for (let hour = 1; hour <= 8; hour++) {
        if (dailySchedule[hour]) {
          lessonCount++;
          if (firstLesson === 0) firstLesson = hour;
          lastLesson = hour;
        }
      }

      // Boşluk = (son ders - ilk ders + 1) - ders sayısı
      if (lessonCount > 1) {
        const dayGaps = lastLesson - firstLesson + 1 - lessonCount;
        totalGaps += dayGaps;
      }
    }

    // Limit kontrolü
    if (totalGaps > teacherMeta.weeklyGapLimit) {
      return {
        valid: false,
        reason: "WEEKLY_GAP_EXCEEDED",
        detail: `${teacherMeta.name} - Haftalık boşluk limiti aşıldı (${totalGaps}/${teacherMeta.weeklyGapLimit})`,
        severity: "SOFT_LOW",
        weight: 10,
      };
    }

    // FairnessEngine ile ek kontrol
    if (this.modules.optimization.fairnessEngine) {
      try {
        const fairness = this.modules.optimization.fairnessEngine.checkGaps(
          teacherMeta.currentSchedule
        );
        if (!fairness.fair) {
          return {
            valid: false,
            reason: "FAIRNESS_GAP_ISSUE",
            detail: fairness.detail,
            severity: "SOFT_LOW",
            weight: 15,
          };
        }
      } catch (error) {
        this.log("WARN", "FairnessEngine", "Gap kontrolü başarısız");
      }
    }

    return { valid: true, reason: "GAP_OK", gaps: totalGaps };
  }

  /**
   * ================================================================================
   * 10. VALİDATİON ENGİNE ENTEGRASYONU - DÜZELTİLDİ!
   * ================================================================================
   */
  validateWithEngine(lesson, classId, day, hour) {
    // ❌ ValidationEngine modülü şu anda kullanılamıyor
    // ✅ Her zaman manuel kontrol kullan (daha güvenilir)

    // Manuel kontrol - isValidMove fonksiyonunu kullan
    return this.isValidMove(lesson, classId, day, hour);
  }

  /**
   * ================================================================================
   * YARDIMCI FONKSİYONLAR
   * ================================================================================
   */

  getDayName(day) {
    const days = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
    return days[day] || "Bilinmeyen";
  }

  /**
   * ================================================================================
   * İHLAL PUANLAMA SİSTEMİ
   * ================================================================================
   */
  calculateViolationScore(validationResult) {
    if (validationResult.valid) {
      return validationResult.bonus || 0; // Bonus varsa ekle
    }

    // İhlal ağırlıkları
    const severityWeights = {
      HARD: 1000, // Sert kısıt - kesinlikle uyulmalı
      SOFT_HIGH: 100, // Yumuşak ama önemli
      SOFT_MEDIUM: 50, // Orta öncelik
      SOFT_LOW: 10, // Düşük öncelik
    };

    const severity = validationResult.severity || "SOFT_LOW";
    const baseWeight = severityWeights[severity] || 10;
    const customWeight = validationResult.weight || 0;

    return -(baseWeight + customWeight); // Negatif puan (ceza)
  }

  /**
   * ================================================================================
   * TOPLU DOĞRULAMA - TÜM PROGRAMI KONTROL ET
   * ================================================================================
   */
  validateFullSchedule() {
    this.log("INFO", "FullValidation", "Tüm program doğrulanıyor...");

    const violations = {
      hard: [], // Sert kısıt ihlalleri
      softHigh: [], // Yüksek öncelikli yumuşak ihlaller
      softMedium: [], // Orta öncelikli
      softLow: [], // Düşük öncelikli
    };

    let totalScore = 0;

    // Her sınıf, her gün, her saat için kontrol
    for (const classId in this.state.schedule) {
      for (let day = 1; day <= 5; day++) {
        for (let hour = 1; hour <= 8; hour++) {
          const lesson = this.state.schedule[classId][day][hour];

          if (lesson) {
            // Bu yerleştirme geçerli mi?
            const validation = this.isValidMove(lesson, classId, day, hour);

            if (!validation.valid) {
              const severity = validation.severity || "SOFT_LOW";

              if (severity === "HARD") {
                violations.hard.push({
                  classId,
                  day,
                  hour,
                  lesson,
                  validation,
                });
              } else if (severity === "SOFT_HIGH") {
                violations.softHigh.push({
                  classId,
                  day,
                  hour,
                  lesson,
                  validation,
                });
              } else if (severity === "SOFT_MEDIUM") {
                violations.softMedium.push({
                  classId,
                  day,
                  hour,
                  lesson,
                  validation,
                });
              } else {
                violations.softLow.push({
                  classId,
                  day,
                  hour,
                  lesson,
                  validation,
                });
              }

              totalScore += this.calculateViolationScore(validation);
            }
          }
        }
      }
    }

    // Özet
    const summary = {
      hard: violations.hard.length,
      softHigh: violations.softHigh.length,
      softMedium: violations.softMedium.length,
      softLow: violations.softLow.length,
      total:
        violations.hard.length +
        violations.softHigh.length +
        violations.softMedium.length +
        violations.softLow.length,
      score: totalScore,
    };

    this.log(
      "INFO",
      "FullValidation",
      `İhlaller: HARD=${summary.hard}, HIGH=${summary.softHigh}, MED=${summary.softMedium}, LOW=${summary.softLow}`
    );

    return { violations, summary };
  }

  /**
   * ================================================================================
   * BÖLÜM 3 BİTTİ - DEVAM EDECEK...
   * ================================================================================
   */

  /**
   * ================================================================================
   * BÖLÜM 4: TEACHER-BASED PLACEMENT - ÖĞRETMEN BAZLI YERLEŞTİRME
   * ================================================================================
   *
   * Bu bölüm:
   * 1. Öğretmen bazlı dağıtım yapar (sınıf bazlı değil)
   * 2. Önce kısıtlı öğretmenleri yerleştirir
   * 3. Sonra tercihli öğretmenleri yerleştirir
   * 4. Çoklu öğretmen desteği sağlar
   * 5. Domain-based akıllı yerleştirme yapar
   * ================================================================================
   */

  /**
   * ================================================================================
   * ANA ÖĞRETMEN BAZLI YERLEŞTİRME FONKSİYONU
   * ================================================================================
   */
  placeByTeacher(teacherId, options = {}) {
    this.log(
      "INFO",
      "TeacherPlacement",
      `Öğretmen bazlı yerleştirme: ${teacherId}`
    );

    const teacherMeta = this.teacherMetadata[teacherId];

    if (!teacherMeta) {
      this.log(
        "ERROR",
        "TeacherPlacement",
        `Öğretmen bulunamadı: ${teacherId}`
      );
      return { success: false, placed: 0, failed: 0 };
    }

    const stats = {
      success: true,
      teacherId: teacherId,
      teacherName: teacherMeta.name,
      totalLessons: teacherMeta.lessons.length,
      totalHours: teacherMeta.totalHours,
      placed: 0,
      failed: 0,
      details: [],
    };

    // Bu öğretmenin derslerini al
    const teacherLessons = this.getTeacherLessons(teacherId);

    if (teacherLessons.length === 0) {
      this.log(
        "WARN",
        "TeacherPlacement",
        `${teacherMeta.name} için ders bulunamadı`
      );
      return stats;
    }

    this.log(
      "INFO",
      "TeacherPlacement",
      `${teacherMeta.name}: ${teacherLessons.length} ders, ${teacherMeta.totalHours} saat`
    );

    // Dersleri öncelik sırasına göre yerleştir
    for (const lessonMeta of teacherLessons) {
      const lesson = this.lessons.find((l) => l.id === lessonMeta.id);

      if (!lesson) continue;

      // Bu ders zaten tamamen yerleştirilmiş mi?
      if (lessonMeta.placedHours >= lessonMeta.weeklyHours) {
        this.log(
          "DEBUG",
          "TeacherPlacement",
          `${lesson.subjectName} zaten yerleştirilmiş`
        );
        stats.placed += lessonMeta.placedHours;
        continue;
      }

      // Dersi yerleştir
      const placementResult = this.placeLessonForTeacher(
        lesson,
        lessonMeta,
        options
      );

      stats.placed += placementResult.placed;
      stats.failed += placementResult.failed;
      stats.details.push(placementResult);

      // Sürekli kontrol
      if (this.monitoring.enabled) {
        this.continuousCheck();
      }
    }

    // Başarı oranı
    const successRate =
      stats.totalHours > 0
        ? ((stats.placed / stats.totalHours) * 100).toFixed(1)
        : 0;

    this.log(
      "SUCCESS",
      "TeacherPlacement",
      `${teacherMeta.name}: ${stats.placed}/${stats.totalHours} saat yerleştirildi (${successRate}%)`
    );

    return stats;
  }

  /**
   * ================================================================================
   * ÖĞRETMENIN DERSLERİNİ AL (Öncelik Sırasına Göre)
   * ================================================================================
   */
  getTeacherLessons(teacherId) {
    const teacherMeta = this.teacherMetadata[teacherId];

    if (!teacherMeta) return [];

    // LessonMetadata'dan bu öğretmenin derslerini al
    const lessons = this.sortedLessons.filter((l) => l.teacherId === teacherId);

    // Öncelik sırasına göre zaten sıralı, ama ek filtreleme
    return lessons.sort((a, b) => {
      // 1. Blok dersler önce
      if (a.isBlockLesson && !b.isBlockLesson) return -1;
      if (!a.isBlockLesson && b.isBlockLesson) return 1;

      // 2. Daha az domain'i olan önce (zor yerleşenler)
      if (a.domains.length !== b.domains.length) {
        return a.domains.length - b.domains.length;
      }

      // 3. Daha fazla saati olan önce
      return b.weeklyHours - a.weeklyHours;
    });
  }

  /**
   * ================================================================================
   * TEK DERSİ YERLEŞTİR (Öğretmen için)
   * ================================================================================
   */
  placeLessonForTeacher(lesson, lessonMeta, options = {}) {
    const result = {
      lessonId: lesson.id,
      subjectName: lesson.subjectName,
      className: lesson.className,
      weeklyHours: lesson.weeklyHours,
      placed: 0,
      failed: 0,
      placements: [],
    };

    const remainingHours = lessonMeta.remainingHours;

    if (remainingHours === 0) {
      return result;
    }

    this.log(
      "DEBUG",
      "LessonPlacement",
      `${lesson.subjectName} (${lesson.className}): ${remainingHours} saat yerleştirilecek`
    );

    // Blok dersler için özel yerleştirme
    if (lessonMeta.isBlockLesson && remainingHours > 1) {
      return this.placeBlockForTeacher(lesson, lessonMeta, options);
    }

    // Normal ders yerleştirme (tek tek)
    return this.placeSingleHoursForTeacher(
      lesson,
      lessonMeta,
      remainingHours,
      options
    );
  }

  /**
   * ================================================================================
   * TEK SAAT YERLEŞTİRME (Normal Dersler)
   * ================================================================================
   */
  placeSingleHoursForTeacher(lesson, lessonMeta, hoursToPlace, options = {}) {
    const result = {
      lessonId: lesson.id,
      subjectName: lesson.subjectName,
      className: lesson.className,
      weeklyHours: lesson.weeklyHours,
      placed: 0,
      failed: 0,
      placements: [],
    };

    let placedCount = 0;

    // Domain'den uygun slotları dene
    for (const slot of lessonMeta.domains) {
      if (placedCount >= hoursToPlace) break;

      const { day, hour } = slot;

      // Doğrulama
      const validation = this.validateWithEngine(
        lesson,
        lesson.classId,
        day,
        hour
      );

      if (!validation.valid) {
        // İhlal kaydı
        result.failed++;
        continue;
      }

      // Yerleştir
      const placed = this.placeSlot(lesson, lesson.classId, day, hour);

      if (placed) {
        placedCount++;
        result.placed++;
        result.placements.push({ day, hour, score: validation.bonus || 0 });

        this.log(
          "DEBUG",
          "SinglePlacement",
          `${lesson.subjectName}: ${this.getDayName(
            day
          )} ${hour}. saat yerleştirildi`
        );
      } else {
        result.failed++;
      }
    }

    // Domain dışında da dene (fallback)
    if (placedCount < hoursToPlace) {
      const additionalPlacements = this.tryFallbackPlacement(
        lesson,
        lessonMeta,
        hoursToPlace - placedCount,
        options
      );

      result.placed += additionalPlacements.placed;
      result.failed += additionalPlacements.failed;
      result.placements.push(...additionalPlacements.placements);
    }

    return result;
  }

  /**
   * ================================================================================
   * BLOK YERLEŞTİRME (Blok Dersler)
   * ================================================================================
   */
  placeBlockForTeacher(lesson, lessonMeta, options = {}) {
    const result = {
      lessonId: lesson.id,
      subjectName: lesson.subjectName,
      className: lesson.className,
      weeklyHours: lesson.weeklyHours,
      placed: 0,
      failed: 0,
      placements: [],
    };

    // BlockPlacementController varsa kullan
    if (this.modules.block.blockPlacementController) {
      try {
        const blockResult =
          this.modules.block.blockPlacementController.placeBlock({
            schedule: this.state.schedule,
            lesson: lesson,
            lessonMeta: lessonMeta,
            teacherMeta: this.teacherMetadata[lesson.teacherId],
            constraints: this.processedConstraints,
            preferences: this.processedPreferences,
            validator: (l, c, d, h) => this.validateWithEngine(l, c, d, h),
          });

        if (blockResult.success) {
          // Yerleştirmeleri uygula
          for (const placement of blockResult.placements) {
            const placed = this.placeSlot(
              lesson,
              lesson.classId,
              placement.day,
              placement.hour
            );

            if (placed) {
              result.placed++;
              result.placements.push(placement);
            }
          }

          this.log(
            "SUCCESS",
            "BlockPlacement",
            `${lesson.subjectName}: ${result.placed} saatlik blok yerleştirildi`
          );

          return result;
        }
      } catch (error) {
        this.logError(
          "BlockPlacementController",
          "Blok yerleştirme hatası!",
          error
        );
      }
    }

    // Manuel blok yerleştirme (fallback)
    return this.manualBlockPlacement(lesson, lessonMeta, options);
  }

  /**
   * ================================================================================
   * BASİT BLOK YERLEŞTİRME (YENİ - TEST)
   * ================================================================================
   */
  simpleBlockPlacement(lesson, lessonMeta) {
    const result = {
      lessonId: lesson.id,
      subjectName: lesson.subjectName,
      className: lesson.className,
      weeklyHours: lesson.weeklyHours,
      placed: 0,
      failed: 0,
      placements: [],
    };

    const blockStructure = lessonMeta.blockStructure; // [2, 2] veya [3, 2]
    const classId = lesson.classId;

    console.log(
      `   🔹 ${lesson.subjectName} (${
        lesson.className
      }): Blok yapısı [${blockStructure.join(", ")}]`
    );

    // Her blok için yerleştirme
    for (let blockIndex = 0; blockIndex < blockStructure.length; blockIndex++) {
      const blockSize = blockStructure[blockIndex];
      let blockPlaced = false;

      console.log(
        `      Blok ${blockIndex + 1}: ${blockSize} saat aranıyor...`
      );

      // Her gün için dene
      for (let day = 1; day <= 5 && !blockPlaced; day++) {
        // Bu gün zaten bu ders var mı? (Aynı gün kontrolü)
        let hasSameDayLesson = false;
        for (let h = 1; h <= 8; h++) {
          if (this.state.schedule[classId]?.[day]?.[h]?.id === lesson.id) {
            hasSameDayLesson = true;
            break;
          }
        }

        if (hasSameDayLesson) {
          console.log(
            `         ${this.getDayName(day)}: Aynı gün kuralı - atlandı`
          );
          continue;
        }

        // Ardışık blockSize kadar boş slot bul
        for (
          let startHour = 1;
          startHour <= 9 - blockSize && !blockPlaced;
          startHour++
        ) {
          let canPlace = true;
          const reasons = [];

          // Tüm slotları kontrol et
          for (let i = 0; i < blockSize; i++) {
            const hour = startHour + i;

            // Slot dolu mu?
            if (this.state.schedule[classId]?.[day]?.[hour]) {
              canPlace = false;
              reasons.push(`Slot ${hour} dolu`);
              break;
            }

            // Öğretmen kısıtı var mı?
            const teacherMeta = this.teacherMetadata[lesson.teacherId];
            if (teacherMeta?.hasConstraints) {
              const dayConstraints = teacherMeta.constraints[day];
              if (dayConstraints && dayConstraints.includes(hour)) {
                canPlace = false;
                reasons.push(`Öğretmen kısıtı (${hour}. saat)`);
                break;
              }
            }

            // Öğretmen boş gün tercihi var mı?
            if (teacherMeta?.offDay === day) {
              canPlace = false;
              reasons.push(`Boş gün tercihi`);
              break;
            }

            // Öğretmen çakışması var mı?
            if (teacherMeta?.currentSchedule[day]?.[hour]) {
              canPlace = false;
              reasons.push(`Öğretmen meşgul (${hour}. saat)`);
              break;
            }
          }

          // Ardışık yerleştir
          if (canPlace) {
            for (let i = 0; i < blockSize; i++) {
              const hour = startHour + i;

              // Yerleştir
              const placed = this.placeSlot(lesson, classId, day, hour);

              if (placed) {
                result.placed++;
                result.placements.push({ day, hour, blockIndex });
              } else {
                // Yerleştirme başarısız, geri al
                for (let j = 0; j < i; j++) {
                  const rollbackHour = startHour + j;
                  this.state.schedule[classId][day][rollbackHour] = null;

                  const teacherMeta = this.teacherMetadata[lesson.teacherId];
                  if (teacherMeta?.currentSchedule[day]?.[rollbackHour]) {
                    teacherMeta.currentSchedule[day][rollbackHour] = null;
                    teacherMeta.placedHours--;
                  }

                  const lessonMeta = this.lessonMetadata[lesson.id];
                  if (lessonMeta) {
                    lessonMeta.placedHours--;
                    lessonMeta.remainingHours++;
                  }
                }
                canPlace = false;
                break;
              }
            }

            if (canPlace) {
              blockPlaced = true;
              console.log(
                `         ✅ ${this.getDayName(day)} ${startHour}-${
                  startHour + blockSize - 1
                }. saatler`
              );
            }
          }
        }
      }

      // Blok yerleştirilemediyse
      if (!blockPlaced) {
        result.failed += blockSize;
        console.log(
          `         ❌ ${blockSize} saatlik blok için uygun yer bulunamadı`
        );
      }
    }

    return result;
  }

  /**
   * ================================================================================
   * MANUEL BLOK YERLEŞTİRME (Fallback)
   * ================================================================================
   */
  manualBlockPlacement(lesson, lessonMeta, options = {}) {
    const result = {
      lessonId: lesson.id,
      subjectName: lesson.subjectName,
      className: lesson.className,
      weeklyHours: lesson.weeklyHours,
      placed: 0,
      failed: 0,
      placements: [],
    };

    const blockStructure = lessonMeta.blockStructure;
    const classId = lesson.classId;

    // Her blok için yerleştirme dene
    for (const blockSize of blockStructure) {
      if (result.placed >= lessonMeta.remainingHours) break;

      // Uygun gün-saat kombinasyonu bul
      const blockSlot = this.findBestBlockSlot(lesson, lessonMeta, blockSize);

      if (blockSlot) {
        // Bloğu yerleştir
        for (let i = 0; i < blockSize; i++) {
          if (result.placed >= lessonMeta.remainingHours) break;

          const slot = blockSlot.slots[i];
          const placed = this.placeSlot(lesson, classId, slot.day, slot.hour);

          if (placed) {
            result.placed++;
            result.placements.push(slot);
          }
        }

        this.log(
          "DEBUG",
          "ManualBlockPlacement",
          `${lesson.subjectName}: ${blockSize} saatlik blok yerleştirildi`
        );
      } else {
        result.failed += blockSize;
        this.log(
          "WARN",
          "ManualBlockPlacement",
          `${lesson.subjectName}: ${blockSize} saatlik blok için yer bulunamadı`
        );
      }
    }

    return result;
  }

  /**
   * ================================================================================
   * EN İYİ BLOK SLOT BULMA
   * ================================================================================
   */
  findBestBlockSlot(lesson, lessonMeta, blockSize) {
    const candidates = [];

    // Her gün için kontrol et
    for (let day = 1; day <= 5; day++) {
      // Bu gün zaten bu ders var mı? (Blok aynı gün kontrolü)
      const sameDayCheck = this.checkBlockSameDay(lesson, lesson.classId, day);
      if (!sameDayCheck.valid) continue;

      // Her saatten başlayarak blockSize kadar yer var mı?
      for (let startHour = 1; startHour <= 9 - blockSize; startHour++) {
        const blockSlots = [];
        let allValid = true;
        let totalScore = 0;

        // Blok boyutu kadar kontrol et
        for (let i = 0; i < blockSize; i++) {
          const hour = startHour + i;

          // Doğrulama
          const validation = this.validateWithEngine(
            lesson,
            lesson.classId,
            day,
            hour
          );

          if (!validation.valid) {
            allValid = false;
            break;
          }

          blockSlots.push({ day, hour });
          totalScore += this.calculateViolationScore(validation);
        }

        if (allValid) {
          candidates.push({
            day,
            startHour,
            blockSize,
            slots: blockSlots,
            score: totalScore,
          });
        }
      }
    }

    // En iyi skora sahip slot'u seç
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
  }

  /**
   * ================================================================================
   * FALLBACK YERLEŞTİRME (Domain dışı)
   * ================================================================================
   */
  tryFallbackPlacement(lesson, lessonMeta, hoursToPlace, options = {}) {
    const result = {
      placed: 0,
      failed: 0,
      placements: [],
    };

    this.log(
      "WARN",
      "FallbackPlacement",
      `${lesson.subjectName}: Domain dışı yerleştirme deneniyor (${hoursToPlace} saat)`
    );

    let placedCount = 0;

    // Tüm slotları dene (brute force)
    for (let day = 1; day <= 5; day++) {
      for (let hour = 1; hour <= 8; hour++) {
        if (placedCount >= hoursToPlace) break;

        // Doğrulama
        const validation = this.validateWithEngine(
          lesson,
          lesson.classId,
          day,
          hour
        );

        // Sert kısıt ihlali yoksa yerleştir (yumuşak ihlallere izin ver)
        if (validation.valid || validation.severity !== "HARD") {
          const placed = this.placeSlot(lesson, lesson.classId, day, hour);

          if (placed) {
            placedCount++;
            result.placed++;
            result.placements.push({
              day,
              hour,
              score: this.calculateViolationScore(validation),
              isFallback: true,
            });

            this.log(
              "DEBUG",
              "FallbackPlacement",
              `${lesson.subjectName}: ${this.getDayName(
                day
              )} ${hour}. saat (fallback)`
            );
          }
        }
      }
      if (placedCount >= hoursToPlace) break;
    }

    result.failed = hoursToPlace - placedCount;

    if (result.failed > 0) {
      this.log(
        "ERROR",
        "FallbackPlacement",
        `${lesson.subjectName}: ${result.failed} saat yerleştirilemedi!`
      );
    }

    return result;
  }

  /**
   * ================================================================================
   * SLOT YERLEŞTİRME (Atomik İşlem)
   * ================================================================================
   */
  placeSlot(lesson, classId, day, hour) {
    try {
      // Programa yerleştir
      if (!this.state.schedule[classId]) {
        this.state.schedule[classId] = {};
      }
      if (!this.state.schedule[classId][day]) {
        this.state.schedule[classId][day] = {};
      }

      this.state.schedule[classId][day][hour] = lesson;

      // Öğretmen programını güncelle
      const teacherMeta = this.teacherMetadata[lesson.teacherId];
      if (teacherMeta) {
        teacherMeta.currentSchedule[day][hour] = {
          classId: classId,
          lesson: lesson,
        };
        teacherMeta.placedHours++;
      }

      // Ders metadata'sını güncelle
      const lessonMeta = this.lessonMetadata[lesson.id];
      if (lessonMeta) {
        lessonMeta.placedHours++;
        lessonMeta.remainingHours--;
      }

      // IncrementalConflictCache güncelle
      if (this.modules.performance.incrementalConflictCache) {
        try {
          this.modules.performance.incrementalConflictCache.updateSlot(
            classId,
            day,
            hour,
            lesson
          );
        } catch (error) {
          // Sessiz
        }
      }

      // PatternMemory kaydet (RL için)
      if (this.modules.performance.patternMemory) {
        try {
          this.modules.performance.patternMemory.recordSuccess({
            action: "place",
            lesson: lesson,
            classId: classId,
            day: day,
            hour: hour,
            reward: 10,
          });
        } catch (error) {
          // Sessiz
        }
      }

      return true;
    } catch (error) {
      this.logError(
        "PlaceSlot",
        `Yerleştirme hatası: ${lesson.subjectName}`,
        error
      );
      return false;
    }
  }

  /**
   * ================================================================================
   * ÇOKLU ÖĞRETMEN PARALEL YERLEŞTİRME
   * ================================================================================
   */
  placeMultipleTeachers(teacherIds, options = {}) {
    this.log(
      "INFO",
      "MultiTeacherPlacement",
      `${teacherIds.length} öğretmen paralel yerleştiriliyor`
    );

    const results = [];

    // ParallelSolver varsa kullan
    if (this.modules.strategy.parallelSolver && teacherIds.length > 5) {
      try {
        const parallelResult = this.modules.strategy.parallelSolver.solve({
          teachers: teacherIds,
          placer: (tid) => this.placeByTeacher(tid, options),
        });

        return parallelResult;
      } catch (error) {
        this.logError("ParallelSolver", "Paralel yerleştirme hatası!", error);
      }
    }

    // Manuel sıralı yerleştirme (fallback)
    for (const teacherId of teacherIds) {
      const result = this.placeByTeacher(teacherId, options);
      results.push(result);
    }

    // Özet
    const totalPlaced = results.reduce((sum, r) => sum + r.placed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const totalHours = results.reduce((sum, r) => sum + r.totalHours, 0);

    this.log(
      "SUCCESS",
      "MultiTeacherPlacement",
      `Toplam: ${totalPlaced}/${totalHours} saat yerleştirildi`
    );

    return {
      success: true,
      teacherCount: teacherIds.length,
      totalHours: totalHours,
      placed: totalPlaced,
      failed: totalFailed,
      results: results,
    };
  }

  /**
   * ================================================================================
   * ÖNCELİK SIRASI İLE TÜM ÖĞRETMENLERİ YERLEŞTİR
   * ================================================================================
   */
  placeAllTeachersByPriority(options = {}) {
    console.log("\n" + "=".repeat(80));
    console.log("👨‍🏫 TÜM ÖĞRETMENLER ÖNCELİK SIRASINA GÖRE YERLEŞTİRİLİYOR");
    console.log("=".repeat(80));

    const startTime = Date.now();

    // Öncelik grupları
    const groups = {
      constrained: [], // Kısıtlı öğretmenler
      preferred: [], // Tercihli öğretmenler
      normal: [], // Normal öğretmenler
    };

    // Öğretmenleri grupla
    for (const teacherMeta of this.sortedTeachers) {
      if (teacherMeta.hasConstraints) {
        groups.constrained.push(teacherMeta.id);
      } else if (teacherMeta.hasPreferences) {
        groups.preferred.push(teacherMeta.id);
      } else {
        groups.normal.push(teacherMeta.id);
      }
    }

    console.log(`\n📊 Öncelik Grupları:`);
    console.log(`   1️⃣ Kısıtlı: ${groups.constrained.length} öğretmen`);
    console.log(`   2️⃣ Tercihli: ${groups.preferred.length} öğretmen`);
    console.log(`   3️⃣ Normal: ${groups.normal.length} öğretmen`);

    const results = {
      constrained: null,
      preferred: null,
      normal: null,
    };

    // 1. Kısıtlı öğretmenler
    console.log(`\n1️⃣ KISITLI ÖĞRETMENLER YERLEŞTİRİLİYOR...`);
    results.constrained = this.placeMultipleTeachers(
      groups.constrained,
      options
    );

    // 2. Tercihli öğretmenler
    console.log(`\n2️⃣ TERCİHLİ ÖĞRETMENLER YERLEŞTİRİLİYOR...`);
    results.preferred = this.placeMultipleTeachers(groups.preferred, options);

    // 3. Normal öğretmenler
    console.log(`\n3️⃣ NORMAL ÖĞRETMENLER YERLEŞTİRİLİYOR...`);
    results.normal = this.placeMultipleTeachers(groups.normal, options);

    // Toplam istatistikler
    const totalPlaced =
      (results.constrained?.placed || 0) +
      (results.preferred?.placed || 0) +
      (results.normal?.placed || 0);

    const totalHours =
      (results.constrained?.totalHours || 0) +
      (results.preferred?.totalHours || 0) +
      (results.normal?.totalHours || 0);

    const duration = Date.now() - startTime;
    const successRate =
      totalHours > 0 ? ((totalPlaced / totalHours) * 100).toFixed(1) : 0;

    console.log("\n" + "=".repeat(80));
    console.log(`✅ ÖĞRETMEN BAZLI YERLEŞTİRME TAMAMLANDI`);
    console.log(
      `   📊 Toplam: ${totalPlaced}/${totalHours} saat (${successRate}%)`
    );
    console.log(`   ⏱️  Süre: ${duration}ms`);
    console.log("=".repeat(80) + "\n");

    return {
      success: true,
      totalHours: totalHours,
      placed: totalPlaced,
      failed: totalHours - totalPlaced,
      successRate: parseFloat(successRate),
      duration: duration,
      groups: results,
    };
  }

  /**
   * ================================================================================
   * BÖLÜM 4 BİTTİ - DEVAM EDECEK...
   * ================================================================================
   */

  /**
   * ================================================================================
   * BÖLÜM 5: BLOCK PLACEMENT - BLOK YERLEŞTİRME DETAYLARI
   * ================================================================================
   *
   * Bu bölüm:
   * 1. Blok yapısını optimize eder (2+2, 3+2, vb.)
   * 2. Blok kurallarını zorunlu kılar (aynı gün yok, arka arkaya yok)
   * 3. Öğretmen kısıt/tercihlerine göre blok yerleştirir
   * 4. BlockPlacementController ile tam entegrasyon
   * 5. Blok swap ve repair işlemleri yapar
   * ================================================================================
   */

  /**
   * ================================================================================
   * GELİŞMİŞ BLOK YERLEŞTİRME - FULL CONTROL
   * ================================================================================
   */
  advancedBlockPlacement(lesson, lessonMeta, options = {}) {
    this.log(
      "INFO",
      "AdvancedBlockPlacement",
      `${lesson.subjectName}: ${lesson.weeklyHours} saatlik blok yerleştiriliyor`
    );

    const result = {
      lessonId: lesson.id,
      subjectName: lesson.subjectName,
      className: lesson.className,
      weeklyHours: lesson.weeklyHours,
      blockStructure: lessonMeta.blockStructure,
      placed: 0,
      failed: 0,
      blocks: [],
    };

    // BlockStructure modülü ile optimal yapıyı al
    if (this.modules.block.blockStructure) {
      try {
        const optimalStructure =
          this.modules.block.blockStructure.getOptimalBlocks(
            lesson.weeklyHours,
            {
              teacherConstraints:
                this.teacherMetadata[lesson.teacherId]?.constraints,
              classSchedule: this.state.schedule[lesson.classId],
              preferences: options.preferences || {},
            }
          );

        lessonMeta.blockStructure = optimalStructure;
        result.blockStructure = optimalStructure;

        this.log(
          "DEBUG",
          "BlockStructure",
          `Optimal yapı: [${optimalStructure.join(", ")}]`
        );
      } catch (error) {
        this.log(
          "WARN",
          "BlockStructure",
          "Optimal yapı hesaplanamadı, varsayılan kullanılıyor"
        );
      }
    }

    // Her blok için yerleştirme yap
    for (
      let blockIndex = 0;
      blockIndex < lessonMeta.blockStructure.length;
      blockIndex++
    ) {
      const blockSize = lessonMeta.blockStructure[blockIndex];

      if (result.placed >= lesson.weeklyHours) break;

      this.log(
        "DEBUG",
        "BlockPlacement",
        `Blok ${blockIndex + 1}: ${blockSize} saat yerleştiriliyor...`
      );

      // En iyi blok slotunu bul
      const blockSlot = this.findOptimalBlockSlot(
        lesson,
        lessonMeta,
        blockSize,
        options
      );

      if (blockSlot) {
        // Bloğu yerleştir
        const blockPlacement = this.executeBlockPlacement(lesson, blockSlot);

        if (blockPlacement.success) {
          result.placed += blockPlacement.placed;
          result.blocks.push(blockPlacement);

          this.log(
            "SUCCESS",
            "BlockPlacement",
            `Blok ${blockIndex + 1}: ${this.getDayName(blockSlot.day)} ${
              blockSlot.startHour
            }-${blockSlot.startHour + blockSize - 1} yerleştirildi`
          );
        } else {
          result.failed += blockSize;
          this.log(
            "ERROR",
            "BlockPlacement",
            `Blok ${blockIndex + 1}: Yerleştirilemedi`
          );
        }
      } else {
        result.failed += blockSize;
        this.log(
          "WARN",
          "BlockPlacement",
          `Blok ${blockIndex + 1}: Uygun slot bulunamadı`
        );

        // Fallback: Tek tek yerleştirmeyi dene
        if (options.allowFallback !== false) {
          const fallback = this.fallbackBlockPlacement(
            lesson,
            lessonMeta,
            blockSize,
            options
          );
          result.placed += fallback.placed;
          result.failed += fallback.failed;
          result.blocks.push(fallback);
        }
      }
    }

    const successRate =
      lesson.weeklyHours > 0
        ? ((result.placed / lesson.weeklyHours) * 100).toFixed(1)
        : 0;

    this.log(
      "INFO",
      "AdvancedBlockPlacement",
      `${lesson.subjectName}: ${result.placed}/${lesson.weeklyHours} saat (${successRate}%)`
    );

    return result;
  }

  /**
   * ================================================================================
   * OPTİMAL BLOK SLOT BULMA - GELİŞMİŞ SKORLAMA
   * ================================================================================
   */
  findOptimalBlockSlot(lesson, lessonMeta, blockSize, options = {}) {
    this.log(
      "DEBUG",
      "FindOptimalBlockSlot",
      `${lesson.subjectName}: ${blockSize} saatlik slot aranıyor...`
    );

    const candidates = [];
    const teacherMeta = this.teacherMetadata[lesson.teacherId];

    // Her gün için kontrol
    for (let day = 1; day <= 5; day++) {
      // Aynı gün kontrolü
      const sameDayCheck = this.checkBlockSameDay(lesson, lesson.classId, day);
      if (!sameDayCheck.valid) {
        this.log(
          "DEBUG",
          "SameDayCheck",
          `${this.getDayName(day)}: Aynı gün ihlali`
        );
        continue;
      }

      // Öğretmen boş gün kontrolü
      if (teacherMeta?.offDay === day) {
        this.log(
          "DEBUG",
          "OffDayCheck",
          `${this.getDayName(day)}: Öğretmen boş gün`
        );
        continue;
      }

      // Her başlangıç saati için kontrol
      for (let startHour = 1; startHour <= 9 - blockSize; startHour++) {
        const blockSlots = [];
        let allValid = true;
        let violationScore = 0;
        let bonusScore = 0;

        // Blok boyutu kadar kontrol et
        for (let i = 0; i < blockSize; i++) {
          const hour = startHour + i;

          // Detaylı doğrulama
          const validation = this.validateWithEngine(
            lesson,
            lesson.classId,
            day,
            hour
          );

          if (!validation.valid) {
            // Sert kısıt ihlali varsa bu blok geçersiz
            if (validation.severity === "HARD") {
              allValid = false;
              break;
            }
            // Yumuşak ihlaller skora eklenir
            violationScore += Math.abs(
              this.calculateViolationScore(validation)
            );
          } else {
            bonusScore += this.calculateViolationScore(validation);
          }

          blockSlots.push({ day, hour });
        }

        // Arka arkaya kontrolü
        if (allValid && blockSize > 1) {
          const consecutiveCheck = this.checkBlockConsecutive(
            lesson,
            lesson.classId,
            day,
            startHour
          );
          if (!consecutiveCheck.valid) {
            violationScore += 80; // Arka arkaya cezası
          }
        }

        if (allValid) {
          // Ek faktörler
          const dayScore = this.calculateDayScore(day, teacherMeta);
          const hourScore = this.calculateHourScore(startHour, blockSize);
          const balanceScore = this.calculateBalanceScore(lesson.classId, day);

          const totalScore =
            bonusScore - violationScore + dayScore + hourScore + balanceScore;

          candidates.push({
            day,
            startHour,
            blockSize,
            slots: blockSlots,
            score: totalScore,
            details: {
              violationScore: -violationScore,
              bonusScore,
              dayScore,
              hourScore,
              balanceScore,
            },
          });
        }
      }
    }

    if (candidates.length === 0) {
      this.log("WARN", "FindOptimalBlockSlot", "Hiç uygun slot bulunamadı");
      return null;
    }

    // En yüksek skora göre sırala
    candidates.sort((a, b) => b.score - a.score);

    const best = candidates[0];
    this.log(
      "SUCCESS",
      "FindOptimalBlockSlot",
      `En iyi slot: ${this.getDayName(best.day)} ${best.startHour}-${
        best.startHour + best.blockSize - 1
      } (Skor: ${best.score.toFixed(2)})`
    );

    // BlockDayValidator ile son kontrol
    if (this.modules.block.blockDayValidator) {
      try {
        const finalValidation =
          this.modules.block.blockDayValidator.validateFull(
            this.state.schedule,
            lesson,
            lesson.classId,
            best.day,
            best.slots
          );

        if (!finalValidation.valid && finalValidation.severity === "HARD") {
          this.log("ERROR", "BlockDayValidator", "Son kontrol başarısız!");
          return candidates[1] || null; // İkinci en iyi slot'u dene
        }
      } catch (error) {
        this.log("WARN", "BlockDayValidator", "Son kontrol yapılamadı");
      }
    }

    return best;
  }

  /**
   * ================================================================================
   * BLOK YERLEŞTİRME ÇALIŞTIRMA
   * ================================================================================
   */
  executeBlockPlacement(lesson, blockSlot) {
    const result = {
      success: false,
      blockSize: blockSlot.blockSize,
      day: blockSlot.day,
      startHour: blockSlot.startHour,
      placed: 0,
      slots: [],
    };

    try {
      // Her slotu sırayla yerleştir
      for (const slot of blockSlot.slots) {
        const placed = this.placeSlot(
          lesson,
          lesson.classId,
          slot.day,
          slot.hour
        );

        if (placed) {
          result.placed++;
          result.slots.push(slot);
        } else {
          // Yerleştirme başarısız, geri al
          this.log(
            "ERROR",
            "ExecuteBlockPlacement",
            "Yerleştirme başarısız, geri alınıyor..."
          );
          this.rollbackBlockPlacement(lesson, result.slots);
          return result;
        }
      }

      result.success = true;

      // LessonMetadata güncelle
      const lessonMeta = this.lessonMetadata[lesson.id];
      if (lessonMeta) {
        lessonMeta.placedBlocks++;
      }

      return result;
    } catch (error) {
      this.logError("ExecuteBlockPlacement", "Blok yerleştirme hatası!", error);
      this.rollbackBlockPlacement(lesson, result.slots);
      return result;
    }
  }

  /**
   * ================================================================================
   * BLOK YERLEŞTİRME GERİ ALMA (Rollback)
   * ================================================================================
   */
  rollbackBlockPlacement(lesson, placedSlots) {
    this.log(
      "WARN",
      "RollbackBlock",
      `${lesson.subjectName}: ${placedSlots.length} slot geri alınıyor...`
    );

    for (const slot of placedSlots) {
      try {
        // Programdan kaldır
        if (this.state.schedule[lesson.classId]?.[slot.day]?.[slot.hour]) {
          this.state.schedule[lesson.classId][slot.day][slot.hour] = null;
        }

        // Öğretmen programından kaldır
        const teacherMeta = this.teacherMetadata[lesson.teacherId];
        if (teacherMeta?.currentSchedule[slot.day]?.[slot.hour]) {
          teacherMeta.currentSchedule[slot.day][slot.hour] = null;
          teacherMeta.placedHours--;
        }

        // Ders metadata güncelle
        const lessonMeta = this.lessonMetadata[lesson.id];
        if (lessonMeta) {
          lessonMeta.placedHours--;
          lessonMeta.remainingHours++;
        }
      } catch (error) {
        this.logError("RollbackBlock", "Geri alma hatası!", error);
      }
    }
  }

  /**
   * ================================================================================
   * FALLBACK BLOK YERLEŞTİRME (Tek tek yerleştirme)
   * ================================================================================
   */
  fallbackBlockPlacement(lesson, lessonMeta, blockSize, options = {}) {
    this.log(
      "WARN",
      "FallbackBlock",
      `${lesson.subjectName}: ${blockSize} saat tek tek yerleştiriliyor...`
    );

    const result = {
      success: false,
      blockSize: blockSize,
      placed: 0,
      failed: 0,
      slots: [],
      isFallback: true,
    };

    // Tek tek yerleştirme mantığını kullan
    const singlePlacement = this.placeSingleHoursForTeacher(
      lesson,
      lessonMeta,
      blockSize,
      options
    );

    result.placed = singlePlacement.placed;
    result.failed = singlePlacement.failed;
    result.slots = singlePlacement.placements;
    result.success = result.placed > 0;

    return result;
  }

  /**
   * ================================================================================
   * GÜN SKORU HESAPLAMA (Öğretmen tercihi)
   * ================================================================================
   */
  calculateDayScore(day, teacherMeta) {
    if (!teacherMeta) return 0;

    let score = 0;

    // Boş gün tercihi kontrolü
    if (teacherMeta.offDay === day) {
      return -1000; // Çok yüksek ceza
    }

    // Bu günde kaç ders var?
    const todaySchedule = teacherMeta.currentSchedule[day];
    let lessonCount = 0;

    for (let hour = 1; hour <= 8; hour++) {
      if (todaySchedule[hour]) lessonCount++;
    }

    // Dağılım dengesi - hafta ortası tercih edilir
    if (day === 3) {
      score += 5; // Çarşamba bonus
    } else if (day === 1 || day === 5) {
      score -= 5; // Pazartesi/Cuma ceza
    }

    // Aşırı yük cezası
    if (lessonCount >= 6) {
      score -= 20;
    } else if (lessonCount >= 4) {
      score -= 10;
    }

    return score;
  }

  /**
   * ================================================================================
   * SAAT SKORU HESAPLAMA (Günün saati)
   * ================================================================================
   */
  calculateHourScore(startHour, blockSize) {
    let score = 0;

    // İlk saat ve son saat cezası
    if (startHour === 1) {
      score -= 5; // İlk saat cezası
    }

    const endHour = startHour + blockSize - 1;
    if (endHour === 8) {
      score -= 5; // Son saat cezası
    }

    // Öğleden sonra bloğu tercih edilir
    if (startHour >= 5 && endHour <= 7) {
      score += 10; // Öğleden sonra bonusu
    }

    // Öğle arası bloğu cezası
    if (startHour <= 4 && endHour >= 5) {
      score -= 15; // Öğle arasını kesen blok
    }

    return score;
  }

  /**
   * ================================================================================
   * DENGE SKORU HESAPLAMA (Sınıf yükü)
   * ================================================================================
   */
  calculateBalanceScore(classId, day) {
    let score = 0;

    // Bu sınıfın bu gündeki ders sayısı
    const daySchedule = this.state.schedule[classId]?.[day];
    if (!daySchedule) return 0;

    let lessonCount = 0;
    for (let hour = 1; hour <= 8; hour++) {
      if (daySchedule[hour]) lessonCount++;
    }

    // Denge: Her gün 5-6 ders ideal
    if (lessonCount >= 7) {
      score -= 20; // Çok yoğun
    } else if (lessonCount <= 2) {
      score += 10; // Az yoğun, yerleştir
    } else if (lessonCount >= 5 && lessonCount <= 6) {
      score += 5; // İdeal yoğunluk
    }

    return score;
  }

  /**
   * ================================================================================
   * BLOK SWAP (Blok değiştirme)
   * ================================================================================
   */
  swapBlock(lesson1, block1, lesson2, block2) {
    this.log(
      "INFO",
      "BlockSwap",
      `${lesson1.subjectName} <-> ${lesson2.subjectName} blok takas deneniyor...`
    );

    // BlockAwareSwap modülü varsa kullan
    if (this.modules.block.blockAwareSwap) {
      try {
        const swapResult = this.modules.block.blockAwareSwap.swap({
          schedule: this.state.schedule,
          block1: { lesson: lesson1, slots: block1 },
          block2: { lesson: lesson2, slots: block2 },
          validator: (l, c, d, h) => this.validateWithEngine(l, c, d, h),
        });

        if (swapResult.success) {
          // Swap'i uygula
          this.executeSwap(lesson1, block1, lesson2, block2);
          return { success: true, improvement: swapResult.improvement };
        }
      } catch (error) {
        this.logError("BlockAwareSwap", "Blok swap hatası!", error);
      }
    }

    // Manuel swap (fallback)
    return this.manualBlockSwap(lesson1, block1, lesson2, block2);
  }

  /**
   * ================================================================================
   * MANUEL BLOK SWAP
   * ================================================================================
   */
  manualBlockSwap(lesson1, block1, lesson2, block2) {
    // Blok boyutları aynı olmalı
    if (block1.length !== block2.length) {
      return { success: false, reason: "Block sizes don't match" };
    }

    // Her iki bloğu da doğrula
    let valid = true;

    for (let i = 0; i < block1.length; i++) {
      // Lesson1'i block2'ye yerleştir
      const validation1 = this.validateWithEngine(
        lesson1,
        lesson2.classId,
        block2[i].day,
        block2[i].hour
      );

      // Lesson2'yi block1'e yerleştir
      const validation2 = this.validateWithEngine(
        lesson2,
        lesson1.classId,
        block1[i].day,
        block1[i].hour
      );

      if (!validation1.valid || !validation2.valid) {
        valid = false;
        break;
      }
    }

    if (valid) {
      this.executeSwap(lesson1, block1, lesson2, block2);
      return { success: true };
    }

    return { success: false, reason: "Validation failed" };
  }

  /**
   * ================================================================================
   * SWAP ÇALIŞTIRMA
   * ================================================================================
   */
  executeSwap(lesson1, block1, lesson2, block2) {
    // Block1'i kaldır
    for (const slot of block1) {
      this.state.schedule[lesson1.classId][slot.day][slot.hour] = null;
    }

    // Block2'yi kaldır
    for (const slot of block2) {
      this.state.schedule[lesson2.classId][slot.day][slot.hour] = null;
    }

    // Lesson1'i block2'ye yerleştir
    for (const slot of block2) {
      this.state.schedule[lesson2.classId][slot.day][slot.hour] = lesson1;
    }

    // Lesson2'yi block1'e yerleştir
    for (const slot of block1) {
      this.state.schedule[lesson1.classId][slot.day][slot.hour] = lesson2;
    }

    this.log("SUCCESS", "ExecuteSwap", "Blok swap başarılı");
  }

  /**
   * ================================================================================
   * BLOK REPAIR (Hatalı blokları düzelt)
   * ================================================================================
   */
  repairBlocks() {
    this.log("INFO", "BlockRepair", "Hatalı bloklar taranıyor...");

    let repairedCount = 0;

    // Tüm dersleri kontrol et
    for (const lessonMeta of this.sortedLessons) {
      if (!lessonMeta.isBlockLesson) continue;

      const lesson = this.lessons.find((l) => l.id === lessonMeta.id);
      if (!lesson) continue;

      // Bu dersin yerleştirilmiş blokları
      const placedBlocks = this.findPlacedBlocks(lesson);

      // Blok kurallarını kontrol et
      for (const block of placedBlocks) {
        const violations = this.checkBlockViolations(lesson, block);

        if (violations.length > 0) {
          this.log(
            "WARN",
            "BlockRepair",
            `${lesson.subjectName}: ${violations.length} ihlal tespit edildi`
          );

          // Bloğu düzelt
          const repaired = this.repairSingleBlock(lesson, block, violations);
          if (repaired) {
            repairedCount++;
          }
        }
      }
    }

    this.log("SUCCESS", "BlockRepair", `${repairedCount} blok düzeltildi`);

    return { success: true, repairedCount };
  }

  /**
   * ================================================================================
   * YERLEŞTİRİLMİŞ BLOKLARI BUL
   * ================================================================================
   */
  findPlacedBlocks(lesson) {
    const blocks = [];
    const classSchedule = this.state.schedule[lesson.classId];

    if (!classSchedule) return blocks;

    for (let day = 1; day <= 5; day++) {
      const daySchedule = classSchedule[day];
      if (!daySchedule) continue;

      const daySlots = [];

      for (let hour = 1; hour <= 8; hour++) {
        if (daySchedule[hour]?.id === lesson.id) {
          daySlots.push({ day, hour });
        }
      }

      if (daySlots.length > 0) {
        blocks.push(daySlots);
      }
    }

    return blocks;
  }

  /**
   * ================================================================================
   * BLOK İHLALLERİNİ KONTROL ET
   * ================================================================================
   */
  checkBlockViolations(lesson, block) {
    const violations = [];

    // Aynı gün kontrolü (birden fazla gün varsa ihlal)
    const uniqueDays = new Set(block.map((s) => s.day));
    if (uniqueDays.size > 1) {
      violations.push({ type: "MULTIPLE_DAYS", severity: "HIGH" });
    }

    // Arka arkaya kontrolü
    for (let i = 1; i < block.length; i++) {
      if (
        block[i].hour === block[i - 1].hour + 1 &&
        block[i].day === block[i - 1].day
      ) {
        violations.push({ type: "CONSECUTIVE", severity: "HIGH" });
        break;
      }
    }

    return violations;
  }

  /**
   * ================================================================================
   * TEK BLOK DÜZELTME
   * ================================================================================
   */
  repairSingleBlock(lesson, block, violations) {
    this.log(
      "INFO",
      "RepairSingleBlock",
      `${lesson.subjectName} bloğu düzeltiliyor...`
    );

    // ScheduleRepairEngine kullan
    if (this.modules.optimization.scheduleRepairEngine) {
      try {
        const repairResult =
          this.modules.optimization.scheduleRepairEngine.repairBlock({
            schedule: this.state.schedule,
            lesson: lesson,
            block: block,
            violations: violations,
            validator: (l, c, d, h) => this.validateWithEngine(l, c, d, h),
          });

        if (repairResult.success) {
          this.log("SUCCESS", "RepairSingleBlock", "Blok başarıyla düzeltildi");
          return true;
        }
      } catch (error) {
        this.logError("ScheduleRepairEngine", "Blok düzeltme hatası!", error);
      }
    }

    // Manuel düzeltme (fallback)
    // Bloğu kaldır ve yeniden yerleştir
    this.rollbackBlockPlacement(lesson, block);

    const lessonMeta = this.lessonMetadata[lesson.id];
    const replacement = this.advancedBlockPlacement(lesson, lessonMeta, {});

    return replacement.placed > 0;
  }

  /**
   * ================================================================================
   * BÖLÜM 5 BİTTİ - DEVAM EDECEK...
   * ================================================================================
   */

  /**
   * ================================================================================
   * BÖLÜM 6: INITIAL SOLUTION - BAŞLANGIÇ ÇÖZÜMÜ OLUŞTURMA
   * ================================================================================
   *
   * Bu bölüm:
   * 1. 3 aşamalı başlangıç çözümü oluşturur
   * 2. Manuel yerleştirmeler zaten yapılmış durumda
   * 3. Önce blok dersler, sonra normal dersler
   * 4. Tüm kuralları uygular (kısıt, tercih, blok)
   * 5. Feasible (uygulanabilir) bir çözüm garanti eder
   * ================================================================================
   */

  /**
   * ================================================================================
   * ANA BAŞLANGIÇ ÇÖZÜMÜ FONKSİYONU
   * ================================================================================
   */
  generateInitialSolution(options = {}) {
    console.log("\n" + "=".repeat(80));
    console.log("🎯 BÖLÜM 6: BAŞLANGIÇ ÇÖZÜMÜ OLUŞTURULUYOR");
    console.log("=".repeat(80));

    const startTime = Date.now();

    const result = {
      success: false,
      phase1: null, // Manuel yerleştirmeler
      phase2: null, // Blok dersler
      phase3: null, // Kalan dersler
      totalPlaced: 0,
      totalFailed: 0,
      totalHours: 0,
      feasible: false,
      duration: 0,
    };

    try {
      // Toplam saat hesapla
      result.totalHours = this.lessons.reduce(
        (sum, l) => sum + l.weeklyHours,
        0
      );
      console.log(`\n📊 Toplam yerleştirilecek saat: ${result.totalHours}`);

      // PHASE 1: Manuel Yerleştirmeler (Zaten yapıldı, sadece kontrol)
      result.phase1 = this.verifyManualPlacements();

      // PHASE 2: Blok Dersler
      result.phase2 = this.placeAllBlocks(options);

      // PHASE 3: Kalan Normal Dersler
      result.phase3 = this.placeRemainingLessons(options);

      // Toplam istatistikler
      result.totalPlaced =
        (result.phase1?.placed || 0) +
        (result.phase2?.placed || 0) +
        (result.phase3?.placed || 0);

      result.totalFailed = result.totalHours - result.totalPlaced;

      // Feasibility kontrolü
      result.feasible = this.checkFeasibility();

      result.success = result.totalPlaced > 0;
      result.duration = Date.now() - startTime;

      // Özet rapor
      this.printInitialSolutionSummary(result);

      console.log("=".repeat(80) + "\n");

      return result;
    } catch (error) {
      this.logError(
        "InitialSolution",
        "Başlangıç çözümü oluşturma hatası!",
        error
      );
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * ================================================================================
   * PHASE 1: MANUEL YERLEŞTİRMELERİ DOĞRULA
   * ================================================================================
   */
  verifyManualPlacements() {
    console.log("\n🔒 PHASE 1: MANUEL YERLEŞTİRMELER DOĞRULANIYOR");
    console.log("-".repeat(80));

    const result = {
      phase: "MANUAL_PLACEMENTS",
      placed: 0,
      verified: 0,
      violations: [],
    };

    const manualCount = Object.keys(this.manualPlacements).length;

    if (manualCount === 0) {
      console.log("   ℹ️  Manuel yerleştirme yok");
      return result;
    }

    this.log(
      "INFO",
      "ManualVerification",
      `${manualCount} manuel yerleştirme kontrol ediliyor...`
    );

    // Her manuel yerleştirmeyi doğrula
    for (const [slotKey, lesson] of Object.entries(this.manualPlacements)) {
      const [classId, day, hour] = slotKey.split("_");

      // Yerleştirme doğrulama
      const validation = this.validateWithEngine(
        lesson,
        classId,
        parseInt(day),
        parseInt(hour)
      );

      result.placed++;

      if (validation.valid || validation.severity !== "HARD") {
        result.verified++;
      } else {
        result.violations.push({
          slotKey,
          lesson,
          validation,
        });
        this.log(
          "WARN",
          "ManualVerification",
          `⚠️ Manuel yerleştirme ihlali: ${lesson.subjectName} - ${validation.detail}`
        );
      }
    }

    console.log(`   ✅ Doğrulanan: ${result.verified}/${manualCount}`);
    if (result.violations.length > 0) {
      console.log(`   ⚠️  İhlal: ${result.violations.length}`);
    }

    this.log(
      "SUCCESS",
      "ManualVerification",
      "✅ Manuel yerleştirmeler doğrulandı"
    );

    return result;
  }

  /**
   * ================================================================================
   * PHASE 2: TÜM BLOK DERSLERİ YERLEŞTİR (DEBUG EKLENMIŞ)
   * ================================================================================
   */
  placeAllBlocks(options = {}) {
    console.log("\n📦 PHASE 2: BLOK DERSLERİ YERLEŞTİRİLİYOR");
    console.log("-".repeat(80));

    const result = {
      phase: "BLOCK_LESSONS",
      totalBlocks: 0,
      placed: 0,
      failed: 0,
      details: [],
    };

    // Blok dersleri filtrele
    const blockLessons = this.sortedLessons.filter((l) => l.isBlockLesson);
    result.totalBlocks = blockLessons.length;

    if (blockLessons.length === 0) {
      console.log("   ℹ️  Blok ders yok");
      return result;
    }

    console.log(`\n🎯 ${blockLessons.length} bloklu ders bulundu`);

    // ✅ RANDOMIZE: Her dağıtımda farklı sıra!
    const shuffledLessons = [...blockLessons].sort(() => Math.random() - 0.5);
    console.log(`   🔀 Sıralama randomize edildi`);

    // Her blok ders için
    for (const lessonMeta of shuffledLessons) {
      const lesson = this.lessons.find((l) => l.id === lessonMeta.id);
      if (!lesson || lessonMeta.remainingHours === 0) continue;

      console.log(`\n🔹 ${lesson.subjectName} (${lesson.className})`);
      console.log(`   Blok yapısı: [${lessonMeta.blockStructure.join("+")}]`);
      console.log(`   Toplam: ${lesson.weeklyHours} saat`);

      const blockStructure = lessonMeta.blockStructure;
      const classId = lesson.classId;
      let lessonPlaced = 0;
      let lessonFailed = 0;

      // Her blok için yerleştirme
      for (
        let blockIndex = 0;
        blockIndex < blockStructure.length;
        blockIndex++
      ) {
        const blockSize = blockStructure[blockIndex];
        let blockPlaced = false;

        console.log(
          `   🔸 Blok ${blockIndex + 1}: ${blockSize} saat aranıyor...`
        );

        // Her gün için dene
        for (let day = 1; day <= 5 && !blockPlaced; day++) {
          const dayName = [
            "",
            "Pazartesi",
            "Salı",
            "Çarşamba",
            "Perşembe",
            "Cuma",
          ][day];

          // ✅ DEBUG: 3. BLOKTAN İTİBAREN DETAYLI LOG
          if (blockIndex >= 2) {
            console.log(`      🔍 ${dayName} test ediliyor...`);
          }

          // ✅ AYNI GÜN KONTROLÜ
          let hasSameDayLesson = false;
          let existingHours = [];
          for (let h = 1; h <= 8; h++) {
            const slot = this.state.schedule[classId]?.[day]?.[h];
            if (slot && slot.id === lesson.id) {
              hasSameDayLesson = true;
              existingHours.push(h);
            }
          }

          if (hasSameDayLesson) {
            if (blockIndex >= 2) {
              console.log(
                `         ❌ Bu günde zaten ${existingHours.join(
                  ","
                )}. saatlerde var → Atlıyor`
              );
            }
            continue;
          }

          // ✅ DEBUG: BOŞ SLOTLARI GÖSTER
          if (blockIndex >= 2) {
            let emptySlots = [];
            for (let h = 1; h <= 8; h++) {
              if (!this.state.schedule[classId]?.[day]?.[h]) {
                emptySlots.push(h);
              }
            }
            console.log(
              `         ℹ️  Boş slotlar: ${
                emptySlots.length > 0 ? "[" + emptySlots.join(",") + "]" : "YOK"
              }`
            );
          }

          // Ardışık blockSize kadar boş slot bul
          for (
            let startHour = 1;
            startHour <= 9 - blockSize && !blockPlaced;
            startHour++
          ) {
            let canPlace = true;
            let blockingReason = "";

            // Tüm slotları kontrol et
            for (let i = 0; i < blockSize; i++) {
              const hour = startHour + i;

              // Slot dolu mu?
              if (this.state.schedule[classId]?.[day]?.[hour]) {
                canPlace = false;
                blockingReason = `Slot ${hour} dolu`;
                break;
              }

              // Öğretmen metadata
              const teacherMeta = this.teacherMetadata[lesson.teacherId];

              // Öğretmen kısıtı
              if (teacherMeta?.hasConstraints) {
                const dayConstraints = teacherMeta.constraints[day];
                if (dayConstraints?.includes(hour)) {
                  canPlace = false;
                  blockingReason = `Öğretmen kısıtı ${hour}. saat`;
                  break;
                }
              }

              // Boş gün tercihi
              if (teacherMeta?.offDay === day) {
                canPlace = false;
                blockingReason = `Öğretmen boş gün tercihi`;
                break;
              }

              // Öğretmen çakışması
              if (teacherMeta?.currentSchedule?.[day]?.[hour]) {
                canPlace = false;
                blockingReason = `Öğretmen ${hour}. saatte meşgul`;
                break;
              }
            }

            // ✅ DEBUG: NEDEN YERLEŞTİREMEDİ?
            if (!canPlace && blockIndex >= 2 && startHour === 1) {
              console.log(
                `         ⚠️  ${startHour}-${
                  startHour + blockSize - 1
                } aralığı: ${blockingReason}`
              );
            }

            // Ardışık yerleştir
            if (canPlace) {
              let allPlaced = true;
              const placedSlots = [];

              for (let i = 0; i < blockSize; i++) {
                const hour = startHour + i;
                const placed = this.placeSlot(lesson, classId, day, hour);

                if (placed) {
                  placedSlots.push({ day, hour });
                } else {
                  // Geri al
                  for (const slot of placedSlots) {
                    this.state.schedule[classId][slot.day][slot.hour] = null;

                    const teacherMeta = this.teacherMetadata[lesson.teacherId];
                    if (teacherMeta?.currentSchedule?.[slot.day]?.[slot.hour]) {
                      teacherMeta.currentSchedule[slot.day][slot.hour] = null;
                      teacherMeta.placedHours--;
                    }

                    lessonMeta.placedHours--;
                    lessonMeta.remainingHours++;
                  }
                  allPlaced = false;
                  break;
                }
              }

              if (allPlaced) {
                blockPlaced = true;
                lessonPlaced += blockSize;
                result.placed += blockSize;

                if (blockSize === 1) {
                  console.log(`      ✅ ${dayName} ${startHour}. saat`);
                } else {
                  console.log(
                    `      ✅ ${dayName} ${startHour}-${
                      startHour + blockSize - 1
                    }. saatler`
                  );
                }

                // Progress tracking
                if (this.modules.performance?.progressTracker) {
                  try {
                    this.modules.performance.progressTracker.update({
                      phase: "BLOCK_PLACEMENT",
                      current: result.placed,
                      total: blockLessons.reduce(
                        (sum, l) => sum + l.weeklyHours,
                        0
                      ),
                    });
                  } catch (error) {
                    // Sessiz
                  }
                }
              }
            }
          }
        }

        if (!blockPlaced) {
          lessonFailed += blockSize;
          result.failed += blockSize;
          console.log(
            `      ❌ ${blockSize} saatlik blok için uygun yer bulunamadı`
          );
        }
      }

      // Ders özeti
      console.log(
        `   📊 ${lesson.subjectName}: ${lessonPlaced}/${lesson.weeklyHours} saat yerleşti`
      );

      result.details.push({
        lessonId: lesson.id,
        subjectName: lesson.subjectName,
        className: lesson.className,
        weeklyHours: lesson.weeklyHours,
        placed: lessonPlaced,
        failed: lessonFailed,
      });

      // Sürekli kontrol
      if (this.monitoring?.enabled) {
        this.continuousCheck();
      }
    }

    const totalBlockHours = blockLessons.reduce(
      (sum, l) => sum + l.weeklyHours,
      0
    );
    const successRate =
      totalBlockHours > 0
        ? ((result.placed / totalBlockHours) * 100).toFixed(1)
        : 0;

    console.log(`\n📊 BLOK YERLEŞTİRME SONUCU:`);
    console.log(
      `   ✅ Yerleştirilen: ${result.placed}/${totalBlockHours} saat (${successRate}%)`
    );
    if (result.failed > 0) {
      console.log(`   ❌ Yerleştirilemedi: ${result.failed} saat`);
    }

    this.log(
      "SUCCESS",
      "BlockPlacement",
      `✅ Blok yerleştirme: ${result.placed}/${totalBlockHours}`
    );

    return result;
  }

  /**
   * ================================================================================
   * PHASE 3: KALAN DERSLERİ YERLEŞTİR (İYİLEŞTİRİLMİŞ)
   * ================================================================================
   */
  placeRemainingLessons(options = {}) {
    console.log("\n📚 PHASE 3: KALAN DERSLER YERLEŞTİRİLİYOR");
    console.log("-".repeat(80));

    const result = {
      phase: "REMAINING_LESSONS",
      totalLessons: 0,
      placed: 0,
      failed: 0,
      details: [],
    };

    // Yerleştirilmemiş dersleri bul
    const remainingLessons = this.sortedLessons.filter(
      (l) => l.remainingHours > 0
    );
    result.totalLessons = remainingLessons.length;

    if (remainingLessons.length === 0) {
      console.log("   ✅ Tüm dersler yerleştirilmiş");
      return result;
    }

    const totalRemainingHours = remainingLessons.reduce(
      (sum, l) => sum + l.remainingHours,
      0
    );

    console.log(
      `\n🎯 ${remainingLessons.length} derste ${totalRemainingHours} saat kaldı`
    );

    // HER DERSİN HER SAATİNİ TEK TEK YERLEŞTİR
    for (const lessonMeta of remainingLessons) {
      const lesson = this.lessons.find((l) => l.id === lessonMeta.id);
      if (!lesson) continue;

      console.log(
        `\n🔹 ${lesson.subjectName} (${lesson.className}): ${lessonMeta.remainingHours} saat`
      );

      let placed = 0;
      let failed = 0;

      // Kalan her saat için
      while (lessonMeta.remainingHours > 0 && placed < 50) {
        // 50 deneme limiti
        let hourPlaced = false;

        // Her gün için dene
        for (let day = 1; day <= 5 && !hourPlaced; day++) {
          // Her saat için dene
          for (let hour = 1; hour <= 8 && !hourPlaced; hour++) {
            const classId = lesson.classId;

            // Slot dolu mu?
            if (this.state.schedule[classId]?.[day]?.[hour]) {
              continue;
            }

            // Öğretmen kısıtı
            const teacherMeta = this.teacherMetadata[lesson.teacherId];
            if (teacherMeta?.hasConstraints) {
              const dayConstraints = teacherMeta.constraints[day];
              if (dayConstraints?.includes(hour)) {
                continue;
              }
            }

            // Boş gün tercihi
            if (teacherMeta?.offDay === day) {
              continue;
            }

            // Öğretmen çakışması
            if (teacherMeta?.currentSchedule?.[day]?.[hour]) {
              continue;
            }

            // BLOK KONTROLÜ: Aynı gün başka blok var mı?
            if (lessonMeta.isBlockLesson) {
              let hasSameDayBlock = false;
              for (let h = 1; h <= 8; h++) {
                if (
                  this.state.schedule[classId]?.[day]?.[h]?.id === lesson.id
                ) {
                  hasSameDayBlock = true;
                  break;
                }
              }
              if (hasSameDayBlock) {
                continue;
              }
            }

            // Yerleştir
            const success = this.placeSlot(lesson, classId, day, hour);

            if (success) {
              hourPlaced = true;
              placed++;
              const dayName = [
                "",
                "Pazartesi",
                "Salı",
                "Çarşamba",
                "Perşembe",
                "Cuma",
              ][day];
              console.log(`   ✅ ${dayName} ${hour}. saat`);
            }
          }
        }

        // Hiçbir slot bulunamadı
        if (!hourPlaced) {
          failed++;
          console.log(`   ❌ 1 saat için uygun slot bulunamadı`);
          break; // Bu dersten vazgeç, diğer derse geç
        }
      }

      result.placed += placed;
      result.failed += failed;

      result.details.push({
        lessonId: lesson.id,
        subjectName: lesson.subjectName,
        className: lesson.className,
        placed: placed,
        failed: failed,
      });

      // Sürekli kontrol
      if (this.monitoring?.enabled) {
        this.continuousCheck();
      }
    }

    const successRate =
      totalRemainingHours > 0
        ? ((result.placed / totalRemainingHours) * 100).toFixed(1)
        : 0;

    console.log(`\n📊 KALAN DERS YERLEŞTİRME SONUCU:`);
    console.log(
      `   ✅ Yerleştirilen: ${result.placed}/${totalRemainingHours} saat (${successRate}%)`
    );
    if (result.failed > 0) {
      console.log(`   ❌ Yerleştirilemedi: ${result.failed} saat`);
    }

    return result;
  }

  /**
   * ================================================================================
   * ÖĞRETMEN BAZLI KALAN DERS YERLEŞTİRME (KULLANIMDAN KALDIRILDI)
   * ================================================================================
   */
  placeRemainingByTeacher(remainingLessons, options = {}) {
    // Bu metod artık kullanılmıyor, placeRemainingLessons() direkt yerleştiriyor
    return [];
  }

  /**
   * ================================================================================
   * DERS BAZLI KALAN DERS YERLEŞTİRME (KULLANIMDAN KALDIRILDI)
   * ================================================================================
   */
  placeRemainingByLesson(remainingLessons, options = {}) {
    // Bu metod artık kullanılmıyor, placeRemainingLessons() direkt yerleştiriyor
    return [];
  }

  /**
   * ================================================================================
   * BAŞARISIZ DERSLERİ LOGLA
   * ================================================================================
   */
  logFailedLessons(remainingLessons) {
    console.log("\n   ❌ YERLEŞTİRİLEMEYEN DERSLER:");

    const failedLessons = remainingLessons.filter((l) => l.remainingHours > 0);

    if (failedLessons.length === 0) {
      console.log("      (Yok)");
      return;
    }

    for (const lessonMeta of failedLessons.slice(0, 10)) {
      // İlk 10'u göster
      const lesson = this.lessons.find((l) => l.id === lessonMeta.id);
      if (!lesson) continue;

      const teacherMeta = this.teacherMetadata[lesson.teacherId];

      console.log(`      • ${lesson.subjectName} (${lesson.className})`);
      console.log(`        Öğretmen: ${teacherMeta?.name || "?"}`);
      console.log(
        `        Kalan: ${lessonMeta.remainingHours}/${lessonMeta.weeklyHours} saat`
      );
      console.log(`        Domain: ${lessonMeta.domains.length} uygun slot`);

      // Neden yerleştirilemediğini analiz et
      const analysis = this.analyzeFailureReason(lesson, lessonMeta);
      console.log(`        Neden: ${analysis}`);
      console.log("");
    }

    if (failedLessons.length > 10) {
      console.log(`      ... ve ${failedLessons.length - 10} ders daha`);
    }
  }

  /**
   * ================================================================================
   * BAŞARISIZLIK NEDENİNİ ANALİZ ET
   * ================================================================================
   */
  analyzeFailureReason(lesson, lessonMeta) {
    const reasons = [];

    // 1. Domain kontrolü
    if (lessonMeta.domains.length === 0) {
      reasons.push("Uygun slot yok");
    } else if (lessonMeta.domains.length < lessonMeta.remainingHours) {
      reasons.push(
        `Yetersiz slot (${lessonMeta.domains.length}/${lessonMeta.remainingHours})`
      );
    }

    // 2. Öğretmen kısıtı
    const teacherMeta = this.teacherMetadata[lesson.teacherId];
    if (teacherMeta?.hasConstraints) {
      const constraintCount = Object.values(teacherMeta.constraints).reduce(
        (sum, arr) => sum + arr.length,
        0
      );
      reasons.push(`Öğretmen kısıtı (${constraintCount} saat kısıtlı)`);
    }

    // 3. Öğretmen boş gün
    if (teacherMeta?.offDay !== null) {
      reasons.push(`Boş gün tercihi (${this.getDayName(teacherMeta.offDay)})`);
    }

    // 4. Öğretmen aşırı yük
    if (teacherMeta) {
      const dailyLoad = {};
      for (let day = 1; day <= 5; day++) {
        let count = 0;
        for (let hour = 1; hour <= 8; hour++) {
          if (teacherMeta.currentSchedule[day][hour]) count++;
        }
        dailyLoad[day] = count;
      }

      const overloadedDays = Object.entries(dailyLoad).filter(
        ([_, count]) => count >= teacherMeta.dailyLimit.max
      ).length;

      if (overloadedDays >= 3) {
        reasons.push(`Öğretmen aşırı yüklü (${overloadedDays} gün dolu)`);
      }
    }

    // 5. Sınıf dolu
    let classFullDays = 0;
    for (let day = 1; day <= 5; day++) {
      let count = 0;
      for (let hour = 1; hour <= 8; hour++) {
        if (this.state.schedule[lesson.classId]?.[day]?.[hour]) count++;
      }
      if (count >= 7) classFullDays++;
    }

    if (classFullDays >= 3) {
      reasons.push(`Sınıf aşırı dolu (${classFullDays} gün)`);
    }

    return reasons.length > 0 ? reasons.join(", ") : "Bilinmeyen neden";
  }

  /**
   * ================================================================================
   * FEASİBİLİTY KONTROLÜ (Uygulanabilirlik)
   * ================================================================================
   */
  checkFeasibility() {
    this.log("INFO", "FeasibilityCheck", "Çözüm uygulanabilirlik kontrolü...");

    const checks = {
      hardConstraints: true,
      teacherConflicts: true,
      classConflicts: true,
      manualPlacements: true,
      blockRules: true,
    };

    // 1. Sert kısıt ihlalleri
    const validation = this.validateFullSchedule();
    if (validation.summary.hard > 0) {
      checks.hardConstraints = false;
      this.log(
        "ERROR",
        "FeasibilityCheck",
        `❌ ${validation.summary.hard} sert kısıt ihlali!`
      );
    }

    // 2. Öğretmen çakışmaları
    if (this.modules.core.conflictDetector) {
      try {
        const conflicts =
          this.modules.core.conflictDetector.detectTeacherConflicts(
            this.state.schedule
          );
        if (conflicts.length > 0) {
          checks.teacherConflicts = false;
          this.log(
            "ERROR",
            "FeasibilityCheck",
            `❌ ${conflicts.length} öğretmen çakışması!`
          );
        }
      } catch (error) {
        this.log(
          "WARN",
          "FeasibilityCheck",
          "Öğretmen çakışma kontrolü başarısız"
        );
      }
    }

    // 3. Sınıf çakışmaları
    const classConflicts = this.detectClassConflicts();
    if (classConflicts > 0) {
      checks.classConflicts = false;
      this.log(
        "ERROR",
        "FeasibilityCheck",
        `❌ ${classConflicts} sınıf çakışması!`
      );
    }

    // 4. Manuel yerleştirmeler korundu mu?
    const manualIntact = this.verifyManualIntegrity();
    if (!manualIntact) {
      checks.manualPlacements = false;
      this.log(
        "ERROR",
        "FeasibilityCheck",
        "❌ Manuel yerleştirmeler bozuldu!"
      );
    }

    // 5. Blok kuralları
    const blockViolations = this.countBlockViolations();
    if (blockViolations > 10) {
      // 10'dan fazla ihlal kabul edilemez
      checks.blockRules = false;
      this.log(
        "ERROR",
        "FeasibilityCheck",
        `❌ ${blockViolations} blok kuralı ihlali!`
      );
    }

    // Genel değerlendirme
    const feasible = Object.values(checks).every((c) => c === true);

    if (feasible) {
      this.log(
        "SUCCESS",
        "FeasibilityCheck",
        "✅ Çözüm uygulanabilir (feasible)"
      );
    } else {
      this.log("ERROR", "FeasibilityCheck", "❌ Çözüm uygulanabilir değil!");
      console.log("\n   Kontrol Sonuçları:");
      console.log(
        `      Sert Kısıtlar: ${checks.hardConstraints ? "✅" : "❌"}`
      );
      console.log(
        `      Öğretmen Çakışmaları: ${checks.teacherConflicts ? "✅" : "❌"}`
      );
      console.log(
        `      Sınıf Çakışmaları: ${checks.classConflicts ? "✅" : "❌"}`
      );
      console.log(
        `      Manuel Yerleştirmeler: ${checks.manualPlacements ? "✅" : "❌"}`
      );
      console.log(`      Blok Kuralları: ${checks.blockRules ? "✅" : "❌"}`);
    }

    return feasible;
  }

  /**
   * ================================================================================
   * SINIF ÇAKIŞMALARINI TESPİT ET
   * ================================================================================
   */
  detectClassConflicts() {
    let conflictCount = 0;

    for (const classId in this.state.schedule) {
      for (let day = 1; day <= 5; day++) {
        for (let hour = 1; hour <= 8; hour++) {
          const slot = this.state.schedule[classId][day][hour];

          // Aynı slota birden fazla ders yerleştirilmiş mi? (teorik olarak imkansız ama kontrol)
          if (Array.isArray(slot)) {
            conflictCount++;
          }
        }
      }
    }

    return conflictCount;
  }

  /**
   * ================================================================================
   * MANUEL YERLEŞTİRME BÜTÜNLÜĞÜNÜ KONTROL ET
   * ================================================================================
   */
  verifyManualIntegrity() {
    for (const [slotKey, expectedLesson] of Object.entries(
      this.manualPlacements
    )) {
      const [classId, day, hour] = slotKey.split("_");

      const actualLesson = this.state.schedule[classId]?.[day]?.[hour];

      if (!actualLesson || actualLesson.id !== expectedLesson.id) {
        this.log(
          "ERROR",
          "ManualIntegrity",
          `Manuel yerleştirme bozuldu: ${slotKey}`
        );
        return false;
      }
    }

    return true;
  }

  /**
   * ================================================================================
   * BLOK İHLALLERİNİ SAY
   * ================================================================================
   */
  countBlockViolations() {
    let violationCount = 0;

    for (const lessonMeta of this.sortedLessons) {
      if (!lessonMeta.isBlockLesson) continue;

      const lesson = this.lessons.find((l) => l.id === lessonMeta.id);
      if (!lesson) continue;

      const placedBlocks = this.findPlacedBlocks(lesson);

      for (const block of placedBlocks) {
        const violations = this.checkBlockViolations(lesson, block);
        violationCount += violations.length;
      }
    }

    return violationCount;
  }

  /**
   * ================================================================================
   * BAŞLANGIÇ ÇÖZÜMÜ ÖZET RAPORU
   * ================================================================================
   */
  printInitialSolutionSummary(result) {
    console.log("\n" + "=".repeat(80));
    console.log("📊 BAŞLANGIÇ ÇÖZÜMÜ ÖZET RAPORU");
    console.log("=".repeat(80));

    // Genel İstatistikler
    console.log("\n📈 GENEL İSTATİSTİKLER:");
    console.log(`   Toplam Saat: ${result.totalHours}`);
    console.log(
      `   Yerleştirilen: ${result.totalPlaced} (${(
        (result.totalPlaced / result.totalHours) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `   Yerleştirilemedi: ${result.totalFailed} (${(
        (result.totalFailed / result.totalHours) *
        100
      ).toFixed(1)}%)`
    );
    console.log(`   Süre: ${result.duration}ms`);
    console.log(
      `   Uygulanabilir: ${result.feasible ? "✅ EVET" : "❌ HAYIR"}`
    );

    // Phase Detayları
    console.log("\n📋 PHASE DETAYLARI:");

    if (result.phase1) {
      console.log(`   Phase 1 (Manuel): ${result.phase1.placed} saat`);
      if (result.phase1.violations.length > 0) {
        console.log(`      ⚠️  ${result.phase1.violations.length} ihlal`);
      }
    }

    if (result.phase2) {
      console.log(
        `   Phase 2 (Blok): ${result.phase2.placed}/${
          result.phase2.placed + result.phase2.failed
        } saat`
      );
      console.log(
        `      Başarı: ${
          result.phase2.placed > 0
            ? (
                (result.phase2.placed /
                  (result.phase2.placed + result.phase2.failed)) *
                100
              ).toFixed(1)
            : 0
        }%`
      );
    }

    if (result.phase3) {
      console.log(
        `   Phase 3 (Kalan): ${result.phase3.placed}/${
          result.phase3.placed + result.phase3.failed
        } saat`
      );
      console.log(
        `      Başarı: ${
          result.phase3.placed > 0
            ? (
                (result.phase3.placed /
                  (result.phase3.placed + result.phase3.failed)) *
                100
              ).toFixed(1)
            : 0
        }%`
      );
    }

    // Öğretmen İstatistikleri
    console.log("\n👨‍🏫 ÖĞRETMEN İSTATİSTİKLERİ:");
    const teacherStats = this.calculateTeacherStats();
    console.log(`   Toplam Öğretmen: ${teacherStats.total}`);
    console.log(
      `   Tam Yerleşen: ${teacherStats.full} (${(
        (teacherStats.full / teacherStats.total) *
        100
      ).toFixed(1)}%)`
    );
    console.log(`   Kısmi Yerleşen: ${teacherStats.partial}`);
    console.log(`   Hiç Yerleşmemiş: ${teacherStats.none}`);

    // Sınıf İstatistikleri
    console.log("\n🏫 SINIF İSTATİSTİKLERİ:");
    const classStats = this.calculateClassStats();
    console.log(`   Toplam Sınıf: ${classStats.total}`);
    console.log(`   Ortalama Doluluk: ${classStats.avgFill.toFixed(1)}%`);
    console.log(`   En Dolu: ${classStats.maxFill.toFixed(1)}%`);
    console.log(`   En Boş: ${classStats.minFill.toFixed(1)}%`);

    console.log("=".repeat(80));
  }

  /**
   * ================================================================================
   * ÖĞRETMEN İSTATİSTİKLERİ
   * ================================================================================
   */
  calculateTeacherStats() {
    const stats = {
      total: this.teachers.length,
      full: 0,
      partial: 0,
      none: 0,
    };

    for (const teacherMeta of Object.values(this.teacherMetadata)) {
      const fillRate =
        teacherMeta.totalHours > 0
          ? teacherMeta.placedHours / teacherMeta.totalHours
          : 0;

      if (fillRate >= 1.0) {
        stats.full++;
      } else if (fillRate > 0) {
        stats.partial++;
      } else {
        stats.none++;
      }
    }

    return stats;
  }

  /**
   * ================================================================================
   * SINIF İSTATİSTİKLERİ
   * ================================================================================
   */
  calculateClassStats() {
    const stats = {
      total: this.classes.length,
      avgFill: 0,
      maxFill: 0,
      minFill: 100,
    };

    let totalFillRate = 0;

    for (const cls of this.classes) {
      let filledSlots = 0;
      const totalSlots = 40; // 5 gün x 8 saat

      for (let day = 1; day <= 5; day++) {
        for (let hour = 1; hour <= 8; hour++) {
          if (this.state.schedule[cls.id]?.[day]?.[hour]) {
            filledSlots++;
          }
        }
      }

      const fillRate = (filledSlots / totalSlots) * 100;
      totalFillRate += fillRate;

      if (fillRate > stats.maxFill) stats.maxFill = fillRate;
      if (fillRate < stats.minFill) stats.minFill = fillRate;
    }

    stats.avgFill = totalFillRate / stats.total;

    return stats;
  }

  /**
   * ================================================================================
   * BÖLÜM 6 BİTTİ - DEVAM EDECEK...
   * ================================================================================
   */

  /**
   * ================================================================================
   * BÖLÜM 7: ALGORITHM INTEGRATION - 6 ALGORİTMA TAM ENTEGRASYONU
   * ================================================================================
   *
   * Bu bölüm:
   * 1. GeneticAlgorithm (GA) - Popülasyon bazlı evrim
   * 2. SimulatedAnnealing (SA) - Sıcaklık tabanlı arama
   * 3. TabuSearch (Tabu) - Yasaklı arama
   * 4. ReinforcementLearning (RL) - Öğrenen algoritma
   * 5. AntColonyOptimization (ACO) - Karınca kolonisi
   * 6. FuzzyLogicEngine (Fuzzy) - Bulanık mantık
   *
   * Pipeline: GA → SA → Tabu → RL → ACO → Fuzzy
   * MetaController ile orkestrasyon
   * AdaptiveStrategy ile dinamik strateji
   * ================================================================================
   */

  /**
   * ================================================================================
   * ANA ALGORİTMA ENTEGRASYON FONKSİYONU
   * ================================================================================
   */
  runAllAlgorithms(initialSolution, options = {}) {
    console.log("\n" + "=".repeat(80));
    console.log("🤖 BÖLÜM 7: TÜM ALGORİTMALAR ÇALIŞIYOR");
    console.log("=".repeat(80));

    const startTime = Date.now();

    const result = {
      success: false,
      initialFitness: 0,
      finalFitness: 0,
      improvement: 0,
      algorithms: {},
      bestSolution: null,
      bestAlgorithm: null,
      duration: 0,
      iterations: 0,
    };

    try {
      // Başlangıç fitness'ı hesapla
      result.initialFitness = this.calculateCompleteFitness(
        this.state.schedule
      );

      console.log(
        `\n📊 Başlangıç Fitness: ${result.initialFitness.toFixed(2)}`
      );
      console.log(
        `📊 Başlangıç Yerleştirme: ${initialSolution.totalPlaced}/${initialSolution.totalHours} saat\n`
      );

      // MetaController varsa onu kullan
      if (this.modules.core.metaController) {
        const metaResult = this.runWithMetaController(options);
        Object.assign(result, metaResult);
      } else {
        // Manuel pipeline çalıştır
        const pipelineResult = this.runManualPipeline(options);
        Object.assign(result, pipelineResult);
      }

      // Son fitness
      result.finalFitness = this.calculateCompleteFitness(
        result.bestSolution || this.state.schedule
      );
      result.improvement = result.finalFitness - result.initialFitness;
      result.duration = Date.now() - startTime;
      result.success = true;

      // Özet rapor
      this.printAlgorithmSummary(result);

      console.log("=".repeat(80) + "\n");

      return result;
    } catch (error) {
      this.logError(
        "AlgorithmIntegration",
        "Algoritma entegrasyonu hatası!",
        error
      );
      result.duration = Date.now() - startTime;
      return result;
    }
  }
  /**
   * ================================================================================
   * METACONTROLLER İLE ÇALIŞTIRMA (Akıllı Orkestrasyon)
   * ================================================================================
   */
  async runWithMetaController(options = {}) {
    console.log("🎛️  METACONTROLLER İLE AKILLI ORKESTRASYON\n");

    // ✅ Kontrol 1: metaController yüklü mü?
    if (!this.metaController) {
      const error = new Error("metaController modülü yüklenemedi!");
      this.logError(
        "MetaController",
        "MetaController modülü başlatılmamış veya eksik!",
        error
      );
      throw error;
    }

    // ✅ Kontrol 2: orchestrate metodu var mı?
    if (typeof this.metaController.orchestrate !== "function") {
      const error = new Error(
        "this.metaController is undefined or missing 'orchestrate' method."
      );
      this.logError(
        "MetaController",
        "MetaController modülü başlatılmamış veya eksik!",
        error
      );
      throw error;
    }

    this.log("INFO", "MetaController", "MetaController başlatılıyor...");

    const initialFitness = this.calculateCompleteFitness(this.state.schedule);

    const initialSolution = {
      schedule: this.state.schedule,
      fitness: initialFitness,
    };

    // 🔥 DÜZELTME: runAlgoCallback'i arrow function yap (this context'ini koru)
    // runAlgorithm yerine spesifik algo method'larını çağır (mapping ile)
    const runAlgoCallback = async (algoName, iterations, initialSchedule) => {
      console.log(
        `🔄 MetaCallback: ${algoName} (${iterations} iterasyon) çalıştırılıyor...`
      );

      // 🔥 DÜZELTME: Algo name'ini method ismine map et (runAlgorithm yok, direkt method çağır)
      const methodMap = {
        GeneticAlgorithm: "geneticAlgorithm",
        AntColonyOptimization: "antColonyOptimization",
        SimulatedAnnealing: "simulatedAnnealing",
        TabuSearch: "tabuSearch",
        // Diğer algoritmalar için genişletilebilir
      };
      const methodName =
        methodMap[algoName] ||
        algoName.toLowerCase().replace(/optimization|search/i, "");

      if (typeof this[methodName] !== "function") {
        console.error(
          `❌ ${algoName} metodu (${methodName}) bulunamadı! Fallback schedule dönülüyor.`
        );
        return {
          schedule: initialSchedule,
          fitness: this.calculateCompleteFitness
            ? this.calculateCompleteFitness(initialSchedule)
            : initialFitness,
        };
      }

      try {
        const result = await this[methodName](iterations, initialSchedule);
        console.log(
          `✅ ${algoName} tamamlandı, fitness: ${result.fitness || 0}`
        );
        return result || { schedule: initialSchedule, fitness: initialFitness };
      } catch (err) {
        console.error(`❌ ${algoName} iç hata:`, err);
        return {
          schedule: initialSchedule,
          fitness: this.calculateCompleteFitness
            ? this.calculateCompleteFitness(initialSchedule)
            : initialFitness,
        };
      }
    };

    try {
      // ✅ data objesi oluştur
      const data = {
        lessons: this.lessons,
        classes: this.classes,
        teachers: this.teachers,
        constraints: this.processedConstraints,
        preferences: this.processedPreferences,
      };

      // ✅ MetaController.orchestrate() çağrısı
      const metaResult = await this.metaController.orchestrate(
        data,
        initialSolution,
        runAlgoCallback
      );

      // Sonuç dönüştür
      const result = {
        algorithms: metaResult.algorithmResults || [],
        bestSolution: metaResult.schedule || initialSolution.schedule,
        bestAlgorithm: metaResult.strategy || "Unknown",
        iterations: metaResult.algorithmResults
          ? metaResult.algorithmResults.reduce(
              (sum, r) => sum + (r.iterations || 0),
              0
            )
          : 0,
        finalFitness: metaResult.fitness || initialFitness,
        initialFitness: initialFitness,
      };

      this.log(
        "SUCCESS",
        "MetaController",
        `✅ MetaController tamamlandı. Fitness: ${result.finalFitness.toFixed(
          2
        )}`
      );

      return result;
    } catch (error) {
      this.logError("MetaController", "MetaController hatası!", error);

      // Fallback
      this.log("WARN", "MetaController", "Manuel pipeline'a geçiliyor...");
      return {
        algorithms: [],
        bestSolution: initialSolution.schedule,
        bestAlgorithm: "Initial Fallback",
        iterations: 0,
        finalFitness: initialFitness,
        initialFitness: initialFitness,
      };
    }
  }
  /**
   * ================================================================================
   * MANUEL PİPELİNE (6 Algoritma Sıralı)
   * ================================================================================
   */
  runManualPipeline(options = {}) {
    console.log("⚙️  MANUEL PİPELİNE: 6 ALGORİTMA SIRALI ÇALIŞIYOR\n");

    const result = {
      algorithms: {},
      bestSolution: JSON.parse(JSON.stringify(this.state.schedule)),
      bestAlgorithm: "INITIAL",
      bestFitness: this.calculateCompleteFitness(this.state.schedule),
      iterations: 0,
    };

    // Pipeline sırası
    const pipeline = [
      { name: "GeneticAlgorithm", key: "ga", phase: "EXPLORATION" },
      { name: "SimulatedAnnealing", key: "sa", phase: "REFINEMENT" },
      { name: "TabuSearch", key: "tabu", phase: "LOCAL_SEARCH" },
      { name: "ReinforcementLearning", key: "rl", phase: "LEARNING" },
      { name: "AntColonyOptimization", key: "aco", phase: "SWARM" },
      { name: "FuzzyLogicEngine", key: "fuzzy", phase: "LOGIC" },
    ];

    // Her algoritmayı sırayla çalıştır
    for (const algo of pipeline) {
      console.log(`\n${"─".repeat(80)}`);
      console.log(`🔹 ${algo.phase}: ${algo.name}`);
      console.log("─".repeat(80));

      const algoResult = this.runSingleAlgorithm(
        algo.key,
        algo.name,
        result.bestSolution,
        options
      );

      result.algorithms[algo.key] = algoResult;
      result.iterations += algoResult.iterations || 0;

      // En iyi çözümü güncelle
      if (algoResult.success && algoResult.finalFitness > result.bestFitness) {
        result.bestSolution = algoResult.bestSolution;
        result.bestFitness = algoResult.finalFitness;
        result.bestAlgorithm = algo.name;

        console.log(
          `\n✨ YENİ EN İYİ ÇÖZÜM: ${result.bestFitness.toFixed(2)} (${
            algo.name
          })`
        );
      }

      // AdaptiveStrategy kontrolü
      if (this.modules.strategy.adaptiveStrategy) {
        const shouldContinue = this.checkAdaptiveStrategy(result, algo);
        if (!shouldContinue) {
          console.log(
            "\n⚡ AdaptiveStrategy: Pipeline erken sonlandırıldı (optimum bulundu)"
          );
          break;
        }
      }

      // Sürekli kontrol
      if (this.monitoring.enabled) {
        this.continuousCheck();
      }
    }

    console.log(`\n${"═".repeat(80)}`);
    console.log(`✅ PİPELİNE TAMAMLANDI`);
    console.log(
      `   En İyi: ${
        result.bestAlgorithm
      } (Fitness: ${result.bestFitness.toFixed(2)})`
    );
    console.log(`${"═".repeat(80)}`);

    return result;
  }

  /**
   * ================================================================================
   * TEK ALGORİTMA ÇALIŞTIRMA (Unified Interface)
   * ================================================================================
   */
  runSingleAlgorithm(
    algorithmKey,
    algorithmName,
    currentSolution,
    options = {}
  ) {
    this.log("INFO", algorithmName, "Başlatılıyor...");

    const startTime = Date.now();

    const result = {
      name: algorithmName,
      key: algorithmKey,
      success: false,
      initialFitness: 0,
      finalFitness: 0,
      improvement: 0,
      bestSolution: null,
      iterations: 0,
      duration: 0,
      error: null,
    };

    try {
      // Algoritma mevcut mu?
      if (!this.algorithms[algorithmKey]) {
        this.log("WARN", algorithmName, "❌ Algoritma yüklü değil");
        result.error = "Algorithm not loaded";
        return result;
      }

      // Başlangıç fitness
      result.initialFitness = this.calculateCompleteFitness(currentSolution);

      // Algoritma çağrısı
      let algoResult;

      switch (algorithmKey) {
        case "ga":
          algoResult = this.runGeneticAlgorithm(currentSolution, options);
          break;
        case "sa":
          algoResult = this.runSimulatedAnnealing(currentSolution, options);
          break;
        case "tabu":
          algoResult = this.runTabuSearch(currentSolution, options);
          break;
        case "rl":
          algoResult = this.runReinforcementLearning(currentSolution, options);
          break;
        case "aco":
          algoResult = this.runAntColonyOptimization(currentSolution, options);
          break;
        case "fuzzy":
          algoResult = this.runFuzzyLogicEngine(currentSolution, options);
          break;
        default:
          throw new Error(`Unknown algorithm: ${algorithmKey}`);
      }

      // Sonuçları işle
      result.bestSolution = algoResult.bestSolution || currentSolution;
      result.iterations = algoResult.iterations || 0;
      result.finalFitness = this.calculateCompleteFitness(result.bestSolution);
      result.improvement = result.finalFitness - result.initialFitness;
      result.duration = Date.now() - startTime;
      result.success = true;

      // Log
      const improvementPercent =
        result.initialFitness !== 0
          ? (
              (result.improvement / Math.abs(result.initialFitness)) *
              100
            ).toFixed(2)
          : 0;

      console.log(`\n📊 ${algorithmName} Sonuçları:`);
      console.log(`   Başlangıç: ${result.initialFitness.toFixed(2)}`);
      console.log(`   Son: ${result.finalFitness.toFixed(2)}`);
      console.log(
        `   İyileştirme: ${
          result.improvement > 0 ? "+" : ""
        }${result.improvement.toFixed(2)} (${improvementPercent}%)`
      );
      console.log(`   İterasyon: ${result.iterations}`);
      console.log(`   Süre: ${result.duration}ms`);

      this.log(
        "SUCCESS",
        algorithmName,
        `✅ Tamamlandı: ${result.improvement.toFixed(2)} iyileştirme`
      );

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.error = error.message;
      this.logError(algorithmName, "Algoritma hatası!", error);
      return result;
    }
  }

  /**
   * ================================================================================
   * 1. GENETIC ALGORITHM (GA)
   * ================================================================================
   */
  runGeneticAlgorithm(currentSolution, options = {}) {
    this.log("INFO", "GA", "🧬 Genetic Algorithm başlatılıyor...");

    try {
      // ✅ GA.optimize() = (initialSolution, data, onProgress)
      const result = this.algorithms.ga.optimize(
        currentSolution, // initialSolution
        {
          lessons: this.lessons,
          classes: this.classes,
          teachers: this.teachers,
        }, // data
        (progress) => {
          if (progress.generation % 10 === 0) {
            console.log(
              `   Gen ${progress.generation}: Best=${
                progress.bestFitness?.toFixed(2) || 0
              }`
            );
          }
        } // onProgress
      );

      return {
        bestSolution: result || currentSolution,
        iterations: 100,
        finalPopulation: null,
        convergence: null,
      };
    } catch (error) {
      this.logError("GA", "Genetic Algorithm hatası!", error);
      return { bestSolution: currentSolution, iterations: 0 };
    }
  }

  /**
   * ================================================================================
   * 2. SIMULATED ANNEALING (SA)
   * ================================================================================
   */
  runSimulatedAnnealing(currentSolution, options = {}) {
    this.log("INFO", "SA", "🌡️ Simulated Annealing başlatılıyor...");

    try {
      // ✅ SA.optimize() = (solution, onProgress)
      const result = this.algorithms.sa.optimize(
        currentSolution, // solution
        (progress) => {
          if (Math.random() < 0.1) {
            console.log(
              `   T=${progress.temperature?.toFixed(2) || 0}: Best=${
                progress.bestFitness?.toFixed(2) || 0
              }`
            );
          }
        } // onProgress
      );

      return {
        bestSolution: result || currentSolution,
        iterations: 100,
        coolingCurve: null,
      };
    } catch (error) {
      this.logError("SA", "Simulated Annealing hatası!", error);
      return { bestSolution: currentSolution, iterations: 0 };
    }
  }

  /**
   * ================================================================================
   * 3. TABU SEARCH
   * ================================================================================
   */
  runTabuSearch(currentSolution, options = {}) {
    this.log("INFO", "Tabu", "🚫 Tabu Search başlatılıyor...");

    try {
      // ✅ Tabu.optimize() = (solution, onProgress)
      const result = this.algorithms.tabu.optimize(
        currentSolution, // solution
        (progress) => {
          if (progress.iteration % 50 === 0) {
            console.log(
              `   Iter ${progress.iteration}: Best=${
                progress.bestFitness?.toFixed(2) || 0
              }`
            );
          }
        } // onProgress
      );

      return {
        bestSolution: result || currentSolution,
        iterations: 100,
        tabuList: null,
      };
    } catch (error) {
      this.logError("Tabu", "Tabu Search hatası!", error);
      return { bestSolution: currentSolution, iterations: 0 };
    }
  }

  /**
   * ================================================================================
   * 4. REINFORCEMENT LEARNING (RL)
   * ================================================================================
   */
  runReinforcementLearning(currentSolution, options = {}) {
    this.log("INFO", "RL", "🧠 Reinforcement Learning başlatılıyor...");

    try {
      // ✅ RL.learn() = (solution, fitness)
      const fitness = this.calculateCompleteFitness(currentSolution);

      this.algorithms.rl.learn(currentSolution, fitness);

      return {
        bestSolution: currentSolution,
        iterations: 1,
        qTable: this.algorithms.rl.qTable,
        learningCurve: null,
      };
    } catch (error) {
      this.logError("RL", "Reinforcement Learning hatası!", error);
      return { bestSolution: currentSolution, iterations: 0 };
    }
  }

  /**
   * ================================================================================
   * 5. ANT COLONY OPTIMIZATION (ACO)
   * ================================================================================
   */
  runAntColonyOptimization(currentSolution, options = {}) {
    this.log("INFO", "ACO", "🐜 Ant Colony Optimization başlatılıyor...");

    try {
      // ✅ ACO.optimize() = (initialSolution, data, onProgress)
      const result = this.algorithms.aco.optimize(
        currentSolution, // initialSolution
        {
          lessons: this.lessons,
          classes: this.classes,
          teachers: this.teachers,
        }, // data
        (progress) => {
          if (progress.iteration % 10 === 0) {
            console.log(
              `   Iter ${progress.iteration}: Best=${
                progress.bestFitness?.toFixed(2) || 0
              }`
            );
          }
        } // onProgress
      );

      return {
        bestSolution: result || currentSolution,
        iterations: 100,
        pheromoneMatrix: null,
      };
    } catch (error) {
      this.logError("ACO", "Ant Colony Optimization hatası!", error);
      return { bestSolution: currentSolution, iterations: 0 };
    }
  }

  /**
   * ================================================================================
   * 6. FUZZY LOGIC ENGINE
   * ================================================================================
   */
  runFuzzyLogicEngine(currentSolution, options = {}) {
    this.log("INFO", "Fuzzy", "🌫️ Fuzzy Logic Engine başlatılıyor...");

    try {
      // ✅ Fuzzy.optimize() = (config)
      const result = this.algorithms.fuzzy.optimize({
        solution: currentSolution,
      });

      return {
        bestSolution: result.solution || currentSolution,
        iterations: result.iterations || 1,
        fuzzyDecisions: null,
      };
    } catch (error) {
      this.logError("Fuzzy", "Fuzzy Logic Engine hatası!", error);
      return { bestSolution: currentSolution, iterations: 0 };
    }
  }

  /**
   * ================================================================================
   * YARDIMCI FONKSİYONLAR - ALGORİTMA DESTEĞİ
   * ================================================================================
   */

  /**
   * MUTASYON (GA için)
   */
  mutateSchedule(schedule) {
    const mutated = JSON.parse(JSON.stringify(schedule));
    const mutationCount = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < mutationCount; i++) {
      // Rastgele iki slot seç ve değiştir
      const classes = Object.keys(mutated);
      const class1 = classes[Math.floor(Math.random() * classes.length)];
      const class2 = classes[Math.floor(Math.random() * classes.length)];

      const day1 = Math.floor(Math.random() * 5) + 1;
      const hour1 = Math.floor(Math.random() * 8) + 1;
      const day2 = Math.floor(Math.random() * 5) + 1;
      const hour2 = Math.floor(Math.random() * 8) + 1;

      // Swap
      const temp = mutated[class1]?.[day1]?.[hour1];
      if (mutated[class1]?.[day1])
        mutated[class1][day1][hour1] = mutated[class2]?.[day2]?.[hour2];
      if (mutated[class2]?.[day2]) mutated[class2][day2][hour2] = temp;
    }

    return mutated;
  }

  /**
   * CROSSOVER (GA için)
   */
  crossoverSchedules(parent1, parent2) {
    const child = JSON.parse(JSON.stringify(parent1));
    const classes = Object.keys(child);

    // Tek noktalı crossover - rastgele sınıftan itibaren parent2'yi al
    const crossoverPoint = Math.floor(Math.random() * classes.length);

    for (let i = crossoverPoint; i < classes.length; i++) {
      const classId = classes[i];
      if (parent2[classId]) {
        child[classId] = JSON.parse(JSON.stringify(parent2[classId]));
      }
    }

    return child;
  }

  /**
   * KOMŞU OLUŞTURMA (SA için)
   */
  generateNeighbor(schedule) {
    const neighbor = JSON.parse(JSON.stringify(schedule));

    // Rastgele swap veya move
    const operation = Math.random() < 0.5 ? "swap" : "move";

    if (operation === "swap") {
      // İki slotu değiştir
      const classes = Object.keys(neighbor);
      const class1 = classes[Math.floor(Math.random() * classes.length)];
      const class2 = classes[Math.floor(Math.random() * classes.length)];

      const day1 = Math.floor(Math.random() * 5) + 1;
      const hour1 = Math.floor(Math.random() * 8) + 1;
      const day2 = Math.floor(Math.random() * 5) + 1;
      const hour2 = Math.floor(Math.random() * 8) + 1;

      const temp = neighbor[class1]?.[day1]?.[hour1];
      if (neighbor[class1]?.[day1])
        neighbor[class1][day1][hour1] = neighbor[class2]?.[day2]?.[hour2];
      if (neighbor[class2]?.[day2]) neighbor[class2][day2][hour2] = temp;
    } else {
      // Bir dersi başka yere taşı
      // (Implementation basitlik için swap gibi)
      return this.mutateSchedule(neighbor);
    }

    return neighbor;
  }

  /**
   * HAREKET OLUŞTURMA (Tabu için)
   */
  generateMoves(schedule) {
    const moves = [];
    const classes = Object.keys(schedule);

    // Her sınıf için olası hareketler
    for (const classId of classes) {
      for (let day1 = 1; day1 <= 5; day1++) {
        for (let hour1 = 1; hour1 <= 8; hour1++) {
          const lesson1 = schedule[classId]?.[day1]?.[hour1];
          if (!lesson1) continue;

          // Bu dersi başka yerlere taşıyabileceğimiz yerleri bul
          for (let day2 = 1; day2 <= 5; day2++) {
            for (let hour2 = 1; hour2 <= 8; hour2++) {
              if (day1 === day2 && hour1 === hour2) continue;

              moves.push({
                type: "move",
                lesson: lesson1,
                from: { classId, day: day1, hour: hour1 },
                to: { classId, day: day2, hour: hour2 },
              });
            }
          }
        }
      }
    }

    // Rastgele seç (çok fazla hareket var)
    const selectedMoves = [];
    const maxMoves = 20;

    for (let i = 0; i < maxMoves && moves.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * moves.length);
      selectedMoves.push(moves[randomIndex]);
      moves.splice(randomIndex, 1);
    }

    return selectedMoves;
  }

  /**
   * AKSİYON UZAYI OLUŞTURMA (RL için)
   */
  generateActionSpace() {
    const actions = [];

    // Olası aksiyonlar: swap, move, block_move
    for (const classId of this.classes.map((c) => c.id)) {
      for (let day = 1; day <= 5; day++) {
        for (let hour = 1; hour <= 8; hour++) {
          actions.push({
            type: "move",
            classId,
            day,
            hour,
            targetDay: null,
            targetHour: null,
          });
        }
      }
    }

    return actions;
  }

  /**
   * ÖDÜL HESAPLAMA (RL için)
   */
  calculateReward(action, schedule) {
    // Aksiyon sonrası fitness değişimi
    const currentFitness = this.calculateCompleteFitness(schedule);

    // Simüle et
    const newSchedule = this.applyAction(action, schedule);
    const newFitness = this.calculateCompleteFitness(newSchedule);

    return newFitness - currentFitness;
  }

  /**
   * AKSİYON UYGULAMA (RL için)
   */
  applyAction(action, schedule) {
    const newSchedule = JSON.parse(JSON.stringify(schedule));

    // Basit move aksiyonu
    if (action.type === "move" && action.targetDay && action.targetHour) {
      const lesson = newSchedule[action.classId]?.[action.day]?.[action.hour];
      if (lesson) {
        newSchedule[action.classId][action.day][action.hour] = null;
        if (!newSchedule[action.classId][action.targetDay]) {
          newSchedule[action.classId][action.targetDay] = {};
        }
        newSchedule[action.classId][action.targetDay][action.targetHour] =
          lesson;
      }
    }

    return newSchedule;
  }

  /**
   * HEURİSTİK HESAPLAMA (ACO için)
   */
  calculateHeuristic(lesson, day, hour) {
    // Validation skoru + domain skoru
    const validation = this.validateWithEngine(
      lesson,
      lesson.classId,
      day,
      hour
    );

    let heuristic = 1.0;

    if (validation.valid) {
      heuristic += 0.5;
    }

    // Bonus varsa ekle
    if (validation.bonus) {
      heuristic += validation.bonus / 10;
    }

    // Ceza varsa azalt
    if (validation.weight) {
      heuristic -= validation.weight / 100;
    }

    return Math.max(0.1, heuristic); // Minimum 0.1
  }

  /**
   * FUZZY KURALLAR OLUŞTURMA
   */
  generateFuzzyRules() {
    return [
      {
        if: "constraint_violation_low AND preference_match_high",
        then: "quality_high",
      },
      {
        if: "constraint_violation_medium AND preference_match_medium",
        then: "quality_medium",
      },
      { if: "constraint_violation_high", then: "quality_low" },
      { if: "gap_count_low AND daily_load_balanced", then: "quality_high" },
      { if: "gap_count_high OR daily_load_unbalanced", then: "quality_low" },
    ];
  }

  /**
   * FUZZIFICATION
   */
  fuzzify(value, sets) {
    const fuzzyValue = {};

    for (const [name, params] of Object.entries(sets)) {
      fuzzyValue[name] = this.membershipFunction(value, params);
    }

    return fuzzyValue;
  }

  /**
   * ÜYELİK FONKSİYONU (Triangular)
   */
  membershipFunction(value, params) {
    const [a, b, c] = params;

    if (value <= a || value >= c) return 0;
    if (value === b) return 1;
    if (value < b) return (value - a) / (b - a);
    return (c - value) / (c - b);
  }

  /**
   * DEFUZZIFICATION (Centroid)
   */
  defuzzify(fuzzyValue) {
    let numerator = 0;
    let denominator = 0;

    const values = { low: 0.15, medium: 0.5, high: 0.85 };

    for (const [name, membership] of Object.entries(fuzzyValue)) {
      numerator += values[name] * membership;
      denominator += membership;
    }

    return denominator > 0 ? numerator / denominator : 0.5;
  }

  /**
   * ================================================================================
   * ADAPTİVE STRATEGY KONTROLÜ
   * ================================================================================
   */
  checkAdaptiveStrategy(result, currentAlgo) {
    if (!this.modules.strategy.adaptiveStrategy) return true;

    try {
      const shouldContinue = this.modules.strategy.adaptiveStrategy.decide({
        currentBest: result.bestFitness,
        algorithmHistory: result.algorithms,
        currentAlgorithm: currentAlgo.name,
        improvementThreshold: 0.01, // %1'den az iyileştirme varsa dur
      });

      return shouldContinue;
    } catch (error) {
      this.log("WARN", "AdaptiveStrategy", "Strateji karar verme hatası");
      return true; // Devam et
    }
  }

  /**
   * ================================================================================
   * ALGORİTMA İLERLEME TAKIBI
   * ================================================================================
   */
  handleAlgorithmProgress(progress) {
    // ProgressTracker varsa güncelle
    if (this.modules.performance.progressTracker) {
      try {
        this.modules.performance.progressTracker.update(progress);
      } catch (error) {
        // Sessiz
      }
    }

    // AlgorithmVisualizer varsa güncelle
    if (this.modules.features.algorithmVisualizer) {
      try {
        this.modules.features.algorithmVisualizer.update(progress);
      } catch (error) {
        // Sessiz
      }
    }
  }

  /**
   * ================================================================================
   * ALGORİTMA ÖZET RAPORU
   * ================================================================================
   */
  printAlgorithmSummary(result) {
    // KRİTİK DÜZELTME: result objesi ve algoritma sonuçları kontrolü
    // Fallback durumunda 'result' boş gelebilir.
    if (!result || !result.algorithms || result.algorithms.length === 0) {
      console.log("\n" + "=".repeat(80));
      console.log("📊 ALGORİTMA ENTEGRASYONU ÖZET RAPORU");
      console.log("=".repeat(80));
      console.log(
        "\n⚠️ Algoritma entegrasyonu atlandı veya MetaController hata verdi."
      );
      console.log("📈 GENEL PERFORMANS: 0 iyileştirme.");
      console.log("=".repeat(80));
      return;
    }

    // NOT: MetaController'dan gelen 'result.algorithms' aslında 'algorithmResults' array'i.
    // Metot içi "algo" değişkenine erişim modelini (result.algorithms[key]) korumak için
    // result.algorithms'in bir obje olduğunu varsayarak devam ediyorum.
    // Eğer MetaController'dan array geliyorsa, döngü mantığı değişmelidir.
    // Ancak loglara göre result.algorithms'in bir obje olması bekleniyor (result.algorithms.ga).

    // Eğer runWithMetaController'dan gelen result, algoritmaları doğrudan bir obje içinde tutuyorsa:
    const algorithmsMap = result.algorithms; // { ga: {...}, sa: {...} }

    console.log("\n" + "=".repeat(80));
    console.log("📊 ALGORİTMA ENTEGRASYONU ÖZET RAPORU");
    console.log("=".repeat(80));

    // toFixed hatasını önlemek için fitness değerlerinin varlığını kontrol et
    const initialFitness =
      result.initialFitness !== undefined
        ? result.initialFitness.toFixed(2)
        : "N/A";
    const finalFitness =
      result.finalFitness !== undefined
        ? result.finalFitness.toFixed(2)
        : "N/A";

    console.log("\n📈 GENEL PERFORMANS:");
    console.log(`   Başlangıç Fitness: ${initialFitness}`);
    console.log(`   Son Fitness: ${finalFitness}`);
    console.log(
      `   İyileştirme: ${result.improvement > 0 ? "+" : ""}${
        result.improvement !== undefined ? result.improvement.toFixed(2) : "N/A"
      }`
    );
    console.log(`   Toplam İterasyon: ${result.iterations || 0}`);
    console.log(`   Toplam Süre: ${result.duration || 0}ms`);
    console.log(`   En İyi Algoritma: ${result.bestAlgorithm || "INITIAL"}`);

    console.log("\n🤖 ALGORİTMA DETAYLARI:");

    const algoOrder = ["ga", "sa", "tabu", "rl", "aco", "fuzzy"];
    const algoNames = {
      ga: "Genetic Algorithm",
      sa: "Simulated Annealing",
      tabu: "Tabu Search",
      rl: "Reinforcement Learning",
      aco: "Ant Colony Optimization",
      fuzzy: "Fuzzy Logic Engine",
    };

    for (const key of algoOrder) {
      // KRİTİK DÜZELTME: algoritmanın varlığını kontrol et
      const algo = algorithmsMap[key];
      if (!algo) continue;

      const status = algo.success ? "✅" : "❌";
      const improvement =
        algo.improvement > 0
          ? `+${algo.improvement.toFixed(2)}`
          : algo.improvement.toFixed(2);

      console.log(`   ${status} ${algoNames[key]}:`);
      console.log(`      İyileştirme: ${improvement}`);
      console.log(`      İterasyon: ${algo.iterations || 0}`);
      console.log(`      Süre: ${algo.duration || 0}ms`);
    }

    console.log("=".repeat(80));
  }

  /**
   * ================================================================================
   * BÖLÜM 7 BİTTİ - DEVAM EDECEK...
   * ================================================================================
   */

  /**
   * ================================================================================
   * BÖLÜM 8: SCORING & REPAIR - PUANLAMA VE ONARIM SİSTEMİ
   * ================================================================================
   *
   * Bu bölüm SİSTEMİN BEYNİDİR! 🧠
   *
   * ÖNEMİ:
   * - Tüm algoritmaların kalite ölçütü
   * - Hangi çözümün daha iyi olduğunu belirler
   * - İhlalleri tespit ve onarır
   * - Adalet mekanizmasını sağlar
   * - Optimizasyonun yönünü tayin eder
   *
   * MODÜLLER:
   * 1. ScheduleScoring - Detaylı fitness hesaplama
   * 2. FairnessEngine - Öğretmen adaleti
   * 3. MultiObjectiveOptimizer - Çok amaçlı optimizasyon
   * 4. ScheduleRepairEngine - Hata onarımı
   * 5. QualityAssurance - Kalite güvence
   * 6. SolutionStabilizer - Çözüm stabilizasyonu
   * ================================================================================
   */

  /**
   * ================================================================================
   * FITNESS HESAPLAMA - ANA METOD
   * ================================================================================
   */
  calculateCompleteFitness(schedule) {
    try {
      // ✅ Önce ScheduleScoring modülünü dene
      if (this.modules?.optimization?.scheduleScoring) {
        return this.calculateWithScheduleScoring(schedule);
      }

      // ✅ Fallback: Manuel hesaplama
      return this.calculateManualFitness(schedule);
    } catch (error) {
      this.logError("Fitness", "Fitness hesaplama hatası", error);

      // ✅ Fallback: Manuel hesaplama
      return this.calculateManualFitness(schedule);
    }
  }

  /**
   * ================================================================================
   * SCHEDULESCORING MODÜLÜ İLE HESAPLAMA
   * ================================================================================
   */
  calculateWithScheduleScoring(schedule) {
    try {
      // ✅ calculateFitness() sadece schedule parametresi alıyor
      const fitness =
        this.modules.optimization.scheduleScoring.calculateFitness(schedule);

      // Detaylı log (DEBUG mode'da)
      if (this.settings.debug) {
        console.log("\n🔍 FITNESS DETAYLARI:");
        console.log(`   TOTAL FITNESS: ${fitness}`);
      }

      return fitness;
    } catch (error) {
      this.logError("Fitness", "ScheduleScoring hatası", error);
      return this.calculateManualFitness(schedule);
    }
  }

  /**
   * ================================================================================
   * MANUEL FITNESS HESAPLAMA (FALLBACK)
   * ================================================================================
   */
  calculateManualFitness(schedule) {
    let fitness = 0;

    try {
      // Basit skor hesaplama
      for (const classId in schedule) {
        for (const day in schedule[classId]) {
          for (const time in schedule[classId][day]) {
            const lesson = schedule[classId][day][time];
            if (lesson) {
              fitness += 10; // Her yerleştirilmiş ders +10 puan
            }
          }
        }
      }

      return fitness;
    } catch (error) {
      this.logError("ManualFitness", "Manuel fitness hatası", error);
      return 0;
    }
  }
  /**
   * ================================================================================
   * 1. SERT KISIT İHLALLERİNİ SAY (HARD CONSTRAINTS)
   * ================================================================================
   */
  countHardConstraintViolations(schedule) {
    let violations = 0;

    // Her slot için kontrol
    for (const classId in schedule) {
      for (let day = 1; day <= 5; day++) {
        for (let hour = 1; hour <= 8; hour++) {
          const lesson = schedule[classId]?.[day]?.[hour];
          if (!lesson) continue;

          // A) Öğretmen kısıtı ihlali
          const teacherMeta = this.teacherMetadata[lesson.teacherId];
          if (teacherMeta?.hasConstraints) {
            const dayConstraints = teacherMeta.constraints[day];
            if (dayConstraints && dayConstraints.includes(hour)) {
              violations++;
            }
          }

          // B) Öğretmen çakışması (aynı saatte başka sınıfta)
          for (const otherClassId in schedule) {
            if (otherClassId === classId) continue;
            const otherLesson = schedule[otherClassId]?.[day]?.[hour];
            if (otherLesson && otherLesson.teacherId === lesson.teacherId) {
              violations++;
            }
          }

          // C) Manuel yerleştirme ihlali
          const slotKey = `${classId}_${day}_${hour}`;
          if (this.manualPlacements[slotKey]) {
            if (this.manualPlacements[slotKey].id !== lesson.id) {
              violations++;
            }
          }
        }
      }
    }

    return violations;
  }

  /**
   * ================================================================================
   * 2. YUMUŞAK KISIT İHLALLERİNİ SAY (SOFT CONSTRAINTS)
   * ================================================================================
   */
  countSoftConstraintViolations(schedule) {
    const violations = {
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const classId in schedule) {
      for (let day = 1; day <= 5; day++) {
        for (let hour = 1; hour <= 8; hour++) {
          const lesson = schedule[classId]?.[day]?.[hour];
          if (!lesson) continue;

          const teacherMeta = this.teacherMetadata[lesson.teacherId];

          // A) BOŞ GÜN TERCİHİ (HIGH)
          if (teacherMeta?.offDay === day) {
            violations.high++;
          }

          // B) GÜNLÜK LİMİT AŞIMI (MEDIUM)
          const dailyCount = this.countDailyLessons(
            schedule,
            lesson.teacherId,
            day
          );
          if (dailyCount > teacherMeta?.dailyLimit.max) {
            violations.medium++;
          }

          // C) TERCIH EDİLMEYEN SAATLER (LOW)
          if (teacherMeta?.preferences?.avoidHours?.[day]?.includes(hour)) {
            violations.low++;
          }
        }
      }
    }

    return violations;
  }

  /**
   * ================================================================================
   * 3. TÜM ÖĞRETMEN BOŞLUKLARINI HESAPLA (CRITICAL FOR FAIRNESS!)
   * ================================================================================
   */
  calculateAllTeacherGaps(schedule) {
    let totalGaps = 0;

    for (const teacherId in this.teacherMetadata) {
      const gaps = this.calculateTeacherGaps(schedule, teacherId);
      totalGaps += gaps;
    }

    return totalGaps;
  }

  /**
   * ================================================================================
   * TEK ÖĞRETMEN BOŞLUKLARINI HESAPLA
   * ================================================================================
   */
  calculateTeacherGaps(schedule, teacherId) {
    let totalGaps = 0;

    // Her gün için boşlukları hesapla
    for (let day = 1; day <= 5; day++) {
      const dailySchedule = [];

      // Bu öğretmenin bu günkü derslerini bul
      for (const classId in schedule) {
        for (let hour = 1; hour <= 8; hour++) {
          const lesson = schedule[classId]?.[day]?.[hour];
          if (lesson && lesson.teacherId === teacherId) {
            dailySchedule.push(hour);
          }
        }
      }

      if (dailySchedule.length === 0) continue;

      // Sırala
      dailySchedule.sort((a, b) => a - b);

      // İlk ve son ders arasındaki boşlukları say
      const firstLesson = dailySchedule[0];
      const lastLesson = dailySchedule[dailySchedule.length - 1];
      const totalSlots = lastLesson - firstLesson + 1;
      const gaps = totalSlots - dailySchedule.length;

      totalGaps += gaps;
    }

    return totalGaps;
  }

  /**
   * ================================================================================
   * 4. TÜM BLOK İHLALLERİNİ SAY
   * ================================================================================
   */
  countAllBlockViolations(schedule) {
    const violations = {
      sameDay: 0,
      consecutive: 0,
    };

    for (const lessonMeta of this.sortedLessons) {
      if (!lessonMeta.isBlockLesson) continue;

      const lesson = this.lessons.find((l) => l.id === lessonMeta.id);
      if (!lesson) continue;

      // Bu dersin yerleştirilmiş blokları
      const placedBlocks = this.findPlacedBlocksInSchedule(schedule, lesson);

      for (const block of placedBlocks) {
        const blockViolations = this.checkBlockViolations(lesson, block);

        for (const violation of blockViolations) {
          if (violation.type === "MULTIPLE_DAYS") {
            violations.sameDay++;
          } else if (violation.type === "CONSECUTIVE") {
            violations.consecutive++;
          }
        }
      }
    }

    return violations;
  }

  /**
   * ================================================================================
   * SCHEDULE'DAN BLOKLARI BUL
   * ================================================================================
   */
  findPlacedBlocksInSchedule(schedule, lesson) {
    const blocks = [];
    const classSchedule = schedule[lesson.classId];

    if (!classSchedule) return blocks;

    for (let day = 1; day <= 5; day++) {
      const daySchedule = classSchedule[day];
      if (!daySchedule) continue;

      const daySlots = [];

      for (let hour = 1; hour <= 8; hour++) {
        if (daySchedule[hour]?.id === lesson.id) {
          daySlots.push({ day, hour });
        }
      }

      if (daySlots.length > 0) {
        blocks.push(daySlots);
      }
    }

    return blocks;
  }

  /**
   * ================================================================================
   * 5. ADALET SKORU HESAPLA (FAIRNESS ENGINE)
   * ================================================================================
   */
  calculateFairnessScore(schedule) {
    try {
      // HER ZAMAN MANUEL HESAPLAMA KULLAN
      this.log(
        "INFO",
        "FairnessEngine",
        "Manuel adalet hesaplaması başlatıldı"
      );

      // 🔥 SADECE DERS ATAMASI OLAN ÖĞRETMENLERİ HESAPLA
      const assignedTeacherIds = this.getAssignedTeacherIds();

      if (assignedTeacherIds.length === 0) {
        this.log(
          "WARN",
          "FairnessEngine",
          "Hiç ders ataması olmayan öğretmen yok"
        );
        return 100; // Adil sayılır
      }

      this.log(
        "INFO",
        "FairnessEngine",
        `${assignedTeacherIds.length} öğretmen için adalet hesaplanıyor`
      );

      // 1. BOŞ GÜNLER HESAPLA (sadece atanmış öğretmenler için)
      const offDaysCounts = {};
      for (const teacherId of assignedTeacherIds) {
        offDaysCounts[teacherId] = this.countOffDays(schedule, teacherId);
      }

      // 2. GÜNLÜK DERS SAYILARI (sadece atanmış öğretmenler için)
      const dailyLoads = {};
      for (const teacherId of assignedTeacherIds) {
        dailyLoads[teacherId] = this.calculateDailyLoads(schedule, teacherId);
      }

      // 3. BOŞLUK SAYISI (günlük boşluklar, sadece atanmış öğretmenler için)
      const gaps = {};
      for (const teacherId of assignedTeacherIds) {
        gaps[teacherId] = this.calculateTeacherGaps(schedule, teacherId);
      }

      const gapValues = Object.values(gaps);
      if (gapValues.length === 0) return 100;

      const avgGap =
        gapValues.reduce((sum, g) => sum + g, 0) / gapValues.length;
      const gapVariance =
        gapValues.reduce((sum, g) => sum + Math.pow(g - avgGap, 2), 0) /
        gapValues.length;

      // Düşük varyans = yüksek adalet (0-50 puan)
      const gapFairness = Math.max(0, 50 - gapVariance * 5);

      // 4. HAFTALIK YÜK DENGESİ (sadece atanmış öğretmenler için)
      const weeklyLoads = {};
      for (const teacherId of assignedTeacherIds) {
        weeklyLoads[teacherId] = this.countTeacherLessons(schedule, teacherId);
      }

      const loadValues = Object.values(weeklyLoads);
      if (loadValues.length === 0) return gapFairness;

      const avgLoad =
        loadValues.reduce((sum, l) => sum + l, 0) / loadValues.length;
      const loadVariance =
        loadValues.reduce((sum, l) => sum + Math.pow(l - avgLoad, 2), 0) /
        loadValues.length;

      // Düşük varyans = yüksek adalet (0-50 puan)
      const loadFairness = Math.max(0, 50 - loadVariance);

      // 5. FİNAL SKOR (0-100)
      const finalScore = gapFairness + loadFairness;

      this.log(
        "INFO",
        "FairnessEngine",
        `Adalet Skoru: ${finalScore.toFixed(
          1
        )}/100 (Boşluk: ${gapFairness.toFixed(1)}, Yük: ${loadFairness.toFixed(
          1
        )})`
      );

      return finalScore;
    } catch (error) {
      this.logError("FairnessEngine", "Adalet hesaplama hatası", error);
      return 50; // Orta değer döndür
    }
  }

  /**
   * ================================================================================
   * YARDıMCı: DERS ATAMASI OLAN ÖĞRETMENLERİ BUL
   * ================================================================================
   */
  getAssignedTeacherIds() {
    const assignedTeachers = new Set();

    // Lessons array'inden tüm öğretmenleri topla
    for (const lesson of this.lessons) {
      if (!lesson.teacherId) continue;

      // Array ise (çoklu öğretmen)
      if (Array.isArray(lesson.teacherId)) {
        lesson.teacherId.forEach((tid) => assignedTeachers.add(parseInt(tid)));
      } else {
        // String veya number ise
        const tid = parseInt(lesson.teacherId);
        if (!isNaN(tid)) {
          assignedTeachers.add(tid);
        }
      }
    }

    return Array.from(assignedTeachers);
  }

  /**
   * ================================================================================
   * YARDıMCı: ÖĞRETMEN BOŞ GÜN SAYISI
   * ================================================================================
   */
  countOffDays(schedule, teacherId) {
    const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
    let offDays = 0;

    for (const day of days) {
      let hasLessonOnDay = false;

      for (const classId in schedule) {
        if (!schedule[classId][day]) continue;

        for (const hour in schedule[classId][day]) {
          const lesson = schedule[classId][day][hour];
          if (!lesson) continue;

          // Öğretmen kontrolü (array veya single)
          const lessonTeacherIds = Array.isArray(lesson.teacherId)
            ? lesson.teacherId
            : [lesson.teacherId];

          if (
            lessonTeacherIds
              .map((t) => parseInt(t))
              .includes(parseInt(teacherId))
          ) {
            hasLessonOnDay = true;
            break;
          }
        }
        if (hasLessonOnDay) break;
      }

      if (!hasLessonOnDay) {
        offDays++;
      }
    }

    return offDays;
  }

  /**
   * ================================================================================
   * YARDıMCı: ÖĞRETMEN GÜNLÜK DERS SAYILARI
   * ================================================================================
   */
  calculateDailyLoads(schedule, teacherId) {
    const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
    const dailyLoads = {};

    for (const day of days) {
      let dayLoad = 0;

      for (const classId in schedule) {
        if (!schedule[classId][day]) continue;

        for (const hour in schedule[classId][day]) {
          const lesson = schedule[classId][day][hour];
          if (!lesson) continue;

          const lessonTeacherIds = Array.isArray(lesson.teacherId)
            ? lesson.teacherId
            : [lesson.teacherId];

          if (
            lessonTeacherIds
              .map((t) => parseInt(t))
              .includes(parseInt(teacherId))
          ) {
            dayLoad++;
          }
        }
      }

      dailyLoads[day] = dayLoad;
    }

    return dailyLoads;
  }

  /**
   * ================================================================================
   * YARDıMCı: ÖĞRETMEN BOŞLUK SAYISI (GAPS)
   * ================================================================================
   */
  calculateTeacherGaps(schedule, teacherId) {
    const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
    let totalGaps = 0;

    for (const day of days) {
      const daySchedule = [];

      // Öğretmenin bu gündeki tüm derslerini topla
      for (const classId in schedule) {
        if (!schedule[classId][day]) continue;

        for (const hour in schedule[classId][day]) {
          const lesson = schedule[classId][day][hour];
          if (!lesson) continue;

          const lessonTeacherIds = Array.isArray(lesson.teacherId)
            ? lesson.teacherId
            : [lesson.teacherId];

          if (
            lessonTeacherIds
              .map((t) => parseInt(t))
              .includes(parseInt(teacherId))
          ) {
            daySchedule.push(parseInt(hour));
          }
        }
      }

      // Sıralı dersleri bul
      if (daySchedule.length > 0) {
        daySchedule.sort((a, b) => a - b);

        // İlk ders ile son ders arasındaki boşlukları say
        const firstHour = daySchedule[0];
        const lastHour = daySchedule[daySchedule.length - 1];
        const totalHours = lastHour - firstHour + 1;
        const gaps = totalHours - daySchedule.length;

        totalGaps += gaps;
      }
    }

    return totalGaps;
  }

  /**
   * ================================================================================
   * YARDıMCı: ÖĞRETMEN TOPLAM DERS SAYISI
   * ================================================================================
   */
  countTeacherLessons(schedule, teacherId) {
    let count = 0;

    for (const classId in schedule) {
      for (const day in schedule[classId]) {
        for (const hour in schedule[classId][day]) {
          const lesson = schedule[classId][day][hour];
          if (!lesson) continue;

          const lessonTeacherIds = Array.isArray(lesson.teacherId)
            ? lesson.teacherId
            : [lesson.teacherId];

          if (
            lessonTeacherIds
              .map((t) => parseInt(t))
              .includes(parseInt(teacherId))
          ) {
            count++;
          }
        }
      }
    }

    return count;
  }
  /**
   * ================================================================================
   * 6. TAMLIK BONUSU HESAPLA
   * ================================================================================
   */
  calculateCompletenessBonus(schedule) {
    let bonus = 0;

    for (const lessonMeta of this.sortedLessons) {
      const lesson = this.lessons.find((l) => l.id === lessonMeta.id);
      if (!lesson) continue;

      // Bu ders tamamen yerleştirilmiş mi?
      const placedHours = this.countLessonInSchedule(schedule, lesson);

      if (placedHours === lesson.weeklyHours) {
        bonus += 5; // Tam yerleştirilmiş ders bonusu
      } else if (placedHours > 0) {
        // Kısmi bonus
        bonus += (placedHours / lesson.weeklyHours) * 3;
      }
    }

    return bonus;
  }

  /**
   * ================================================================================
   * SCHEDULE'DA DERSİ SAY
   * ================================================================================
   */
  countLessonInSchedule(schedule, lesson) {
    let count = 0;

    const classSchedule = schedule[lesson.classId];
    if (!classSchedule) return 0;

    for (let day = 1; day <= 5; day++) {
      for (let hour = 1; hour <= 8; hour++) {
        if (classSchedule[day]?.[hour]?.id === lesson.id) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * ================================================================================
   * ÖĞRETMEN DERS SAYISI
   * ================================================================================
   */
  countTeacherLessons(schedule, teacherId) {
    let count = 0;

    for (const classId in schedule) {
      for (let day = 1; day <= 5; day++) {
        for (let hour = 1; hour <= 8; hour++) {
          const lesson = schedule[classId]?.[day]?.[hour];
          if (lesson && lesson.teacherId === teacherId) {
            count++;
          }
        }
      }
    }

    return count;
  }

  /**
   * ================================================================================
   * GÜNLÜK DERS SAYISI
   * ================================================================================
   */
  countDailyLessons(schedule, teacherId, day) {
    let count = 0;

    for (const classId in schedule) {
      for (let hour = 1; hour <= 8; hour++) {
        const lesson = schedule[classId]?.[day]?.[hour];
        if (lesson && lesson.teacherId === teacherId) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * ================================================================================
   * ÇOK AMAÇLI OPTİMİZASYON (MULTI-OBJECTIVE)
   * ================================================================================
   */
  calculateMultiObjectiveFitness(schedule) {
    console.log("\n🎯 ÇOK AMAÇLI OPTİMİZASYON");

    // MultiObjectiveOptimizer modülü varsa kullan
    if (this.modules.optimization.multiObjectiveOptimizer) {
      try {
        const moResult =
          this.modules.optimization.multiObjectiveOptimizer.optimize({
            schedule: schedule,
            objectives: [
              {
                name: "constraint_compliance",
                weight: 0.4,
                calculator: (s) => this.objectiveConstraintCompliance(s),
              },
              {
                name: "fairness",
                weight: 0.3,
                calculator: (s) => this.calculateFairnessScore(s),
              },
              {
                name: "efficiency",
                weight: 0.2,
                calculator: (s) => this.objectiveEfficiency(s),
              },
              {
                name: "quality",
                weight: 0.1,
                calculator: (s) => this.objectiveQuality(s),
              },
            ],
            normalization: "minmax",
          });

        console.log("   Detaylar:");
        for (const obj of moResult.objectives) {
          console.log(
            `      ${obj.name}: ${obj.score.toFixed(2)} (Ağırlık: ${
              obj.weight
            })`
          );
        }
        console.log(`   Toplam Skor: ${moResult.totalScore.toFixed(2)}`);

        return moResult.totalScore;
      } catch (error) {
        this.logError(
          "MultiObjectiveOptimizer",
          "Çok amaçlı optimizasyon hatası",
          error
        );
      }
    }

    // Fallback: Tek amaçlı
    return this.calculateCompleteFitness(schedule);
  }

  /**
   * ================================================================================
   * AMAÇ 1: KISIT UYUMU (Constraint Compliance)
   * ================================================================================
   */
  objectiveConstraintCompliance(schedule) {
    // Sert ve yumuşak kısıt ihlallerini sayar
    const hardViolations = this.countHardConstraintViolations(schedule);
    const softViolations = this.countSoftConstraintViolations(schedule);

    // Maksimum 100 puan üzerinden ihlallere göre puan düşülür
    let score = 100;
    score -= hardViolations * 10; // Her sert ihlal için yüksek ceza
    score -= softViolations.high * 5;
    score -= softViolations.medium * 2;
    score -= softViolations.low * 1;

    // Puanın 0'dan düşük olmaması sağlanır
    return Math.max(0, score);
  }

  /**
   * ================================================================================
   * AMAÇ 2: VERİMLİLİK (Efficiency - Boşluk Azaltma)
   * ================================================================================
   */
  objectiveEfficiency(schedule) {
    // Öğretmenlerdeki ders arası boşlukların (gaps) azlığı verimlilik göstergesidir
    const totalGaps = this.calculateAllTeacherGaps(schedule);
    const totalTeachers = this.teachers.length;

    // Öğretmen sayısı sıfırsa hatayı önle
    const avgGap = totalTeachers > 0 ? totalGaps / totalTeachers : 0;

    // 0 boşluk = 100 puan, her ortalama boşluk -5 puan
    return Math.max(0, 100 - avgGap * 5);
  }

  /**
   * ================================================================================
   * AMAÇ 3: KALİTE (Quality - Tam Yerleşim Oranı)
   * ================================================================================
   */
  objectiveQuality(schedule) {
    // Tamamen yerleştirilmiş derslerin toplam derse oranı
    let totalLessons = 0;
    let fullyPlaced = 0;

    for (const lesson of this.lessons) {
      totalLessons++;
      const placedHours = this.countLessonInSchedule(schedule, lesson);
      // lesson.weeklyHours değerinin tanımlı olduğundan emin olun
      if (placedHours === lesson.weeklyHours && lesson.weeklyHours > 0) {
        fullyPlaced++;
      }
    }

    // Toplam ders sayısı sıfırsa hatayı önle
    if (totalLessons === 0) return 0;

    return (fullyPlaced / totalLessons) * 100;
  }

  /**
   * ================================================================================
   * SCHEDULE ONARIM (REPAIR ENGINE)
   * ================================================================================
   */
  async repairSchedule(schedule, options = {}) {
    // Metot ASYNC olarak güncellendi
    console.log("\n🔧 SCHEDULE ONARIM BAŞLATILIYOR");

    this.log("INFO", "ScheduleRepair", "Hatalar tespit ediliyor...");

    // Onarım yapılacak programı tutmak için kopya oluştur
    let repairedSchedule = JSON.parse(JSON.stringify(schedule));
    let success = false;
    let improvement = 0;
    let fixedViolations = 0;

    // ScheduleRepairEngine modülü varsa kullan
    if (this.modules.optimization.scheduleRepairEngine) {
      try {
        const repairResult =
          await this.modules.optimization.scheduleRepairEngine.repair({
            // AWAIT eklendi
            schedule: repairedSchedule, // Kopya programı gönder
            constraints: this.processedConstraints,
            preferences: this.processedPreferences,
            teacherMetadata: this.teacherMetadata,
            lessonMetadata: this.lessonMetadata,
            manualPlacements: this.manualPlacements,
            validator: (l, c, d, h) => this.validateWithEngine(l, c, d, h),
            fitnessCalculator: (s) => this.calculateCompleteFitness(s),
            options: {
              maxAttempts: options.maxAttempts || 100,
              aggressiveness: options.aggressiveness || "medium",
              preserveManual: true,
            },
          });

        // Sonuçları al
        repairedSchedule = repairResult.repairedSchedule || repairedSchedule;
        fixedViolations = repairResult.fixedViolations || 0;
        improvement = repairResult.improvement || 0;
        success = true;

        console.log("   Düzeltilen ihlaller: " + fixedViolations);
        // .toFixed() hatasını önlemek için improvement değerini kontrol et
        console.log("   Fitness iyileştirmesi: +" + improvement.toFixed(2));
      } catch (error) {
        this.logError("ScheduleRepairEngine", "Onarım hatası", error);
        // KRİTİK DÜZELTME: Repair Engine hatası durumunda, manuel onarım hattına geçmek için success = false kalır.
        this.log(
          "WARN",
          "ScheduleRepair",
          "Repair Engine başarısız oldu. Manuel onarım deneniyor..."
        );
        // repairedSchedule hala try bloğuna girerkenki schedule kopyasıdır.
      }
    }

    // Repair Engine başarılı olmadıysa veya mevcut değilse manuel onarım yap
    if (!success) {
      repairedSchedule = this.manualRepairSchedule(repairedSchedule, options);
    }

    // Her durumda program objesini döndür
    return repairedSchedule;
  }

  /**
   * ================================================================================
   * MANUEL ONARIM
   * ================================================================================
   */
  manualRepairSchedule(schedule, options = {}) {
    this.log("INFO", "ManualRepair", "Manuel onarım başlatılıyor...");

    // schedule objesinin içeriğini koru
    const repaired = JSON.parse(JSON.stringify(schedule));
    let fixedCount = 0;

    // 1. Sert kısıt ihlallerini düzelt (ÖNCELİK!)
    fixedCount += this.fixHardConstraintViolations(repaired);

    // 2. Öğretmen çakışmalarını düzelt
    fixedCount += this.fixTeacherConflicts(repaired);

    // 3. Blok ihlallerini düzelt
    fixedCount += this.fixBlockViolationsInSchedule(repaired);

    console.log(`   ✅ ${fixedCount} ihlal düzeltildi`);

    return repaired;
  }

  /**
   * ================================================================================
   * SERT KISIT İHLALLERİNİ DÜZELT
   * ================================================================================
   */
  fixHardConstraintViolations(schedule) {
    let fixedCount = 0;

    for (const classId in schedule) {
      // schedule[classId] tanımlı değilse devam etmemek için kontrol eklendi
      if (!schedule[classId]) continue;

      for (let day = 1; day <= 5; day++) {
        // schedule[classId][day] tanımlı değilse devam etmemek için kontrol eklendi
        if (!schedule[classId][day]) continue;

        for (let hour = 1; hour <= 8; hour++) {
          const lesson = schedule[classId][day][hour];
          if (!lesson) continue;

          const teacherMeta = this.teacherMetadata[lesson.teacherId];

          // Öğretmen kısıtı ihlali var mı?
          if (teacherMeta?.hasConstraints) {
            const dayConstraints = teacherMeta.constraints?.[day]; // Safe access
            if (dayConstraints && dayConstraints.includes(hour)) {
              // Kısıtlı slota yerleştirilmiş, başka yere taşı
              const moved = this.moveToValidSlot(
                schedule,
                lesson,
                classId,
                day,
                hour
              );
              if (moved) {
                fixedCount++;
                this.log(
                  "DEBUG",
                  "FixHardConstraint",
                  `${lesson.subjectName} kısıt ihlalinden kurtarıldı`
                );
              }
            }
          }
        }
      }
    }

    return fixedCount;
  }

  /**
   * ================================================================================
   * ÖĞRETMEN ÇAKIŞMALARINI DÜZELT
   * ================================================================================
   */
  fixTeacherConflicts(schedule) {
    let fixedCount = 0;

    for (const classId in schedule) {
      // schedule[classId] tanımlı değilse devam etmemek için kontrol eklendi
      if (!schedule[classId]) continue;

      for (let day = 1; day <= 5; day++) {
        // schedule[classId][day] tanımlı değilse devam etmemek için kontrol eklendi
        if (!schedule[classId][day]) continue;

        for (let hour = 1; hour <= 8; hour++) {
          const lesson = schedule[classId][day][hour];
          if (!lesson) continue;

          // Aynı öğretmen başka sınıfta mı?
          for (const otherClassId in schedule) {
            if (otherClassId === classId) continue;
            // schedule[otherClassId] ve [day] kontrolü eklendi
            const otherLesson = schedule[otherClassId]?.[day]?.[hour];

            if (otherLesson && otherLesson.teacherId === lesson.teacherId) {
              // Çakışma var! Birini taşı
              const moved = this.moveToValidSlot(
                schedule,
                lesson,
                classId,
                day,
                hour
              );
              if (moved) {
                fixedCount++;
                this.log(
                  "DEBUG",
                  "FixTeacherConflict",
                  `${lesson.subjectName} çakışmadan kurtarıldı`
                );
              }
              break; // Taşıma başarılı olsun veya olmasın, çakışma kontrolü için döngüden çık
            }
          }
        }
      }
    }

    return fixedCount;
  }

  /**
   * ================================================================================
   * BLOK İHLALLERİNİ DÜZELT
   * ================================================================================
   */
  fixBlockViolationsInSchedule(schedule) {
    let fixedCount = 0;

    // this.sortedLessons'ın varlığını kontrol et
    if (!this.sortedLessons) return 0;

    for (const lessonMeta of this.sortedLessons) {
      if (!lessonMeta.isBlockLesson) continue;

      const lesson = this.lessons.find((l) => l.id === lessonMeta.id);
      if (!lesson) continue;

      const placedBlocks = this.findPlacedBlocksInSchedule(schedule, lesson);

      for (const block of placedBlocks) {
        const violations = this.checkBlockViolations(lesson, block);

        if (violations && violations.length > 0) {
          // violations null/undefined kontrolü eklendi
          // Bloğu kaldır ve yeniden yerleştir
          this.removeBlockFromSchedule(schedule, lesson, block);

          const replaceResult = this.replaceBlockInSchedule(
            schedule,
            lesson,
            block.length
          );

          if (replaceResult?.success) {
            // replaceResult varlığı kontrol edildi
            // İhlal sayısı kadar artırmak yerine, başarılı yerleştirilen ders saati kadar artırmak daha mantıklı olabilir.
            // Ancak mevcut mantığı koruyarak ihlal sayısını kullanıyorum.
            fixedCount += violations.length;
            this.log(
              "DEBUG",
              "FixBlockViolation",
              `${lesson.subjectName} blok ihlali düzeltildi`
            );
          }
        }
      }
    }

    return fixedCount;
  }

  /**
   * ================================================================================
   * DERS İ GEÇERLİ SLOTA TAŞI
   * ================================================================================
   */
  moveToValidSlot(schedule, lesson, currentClass, currentDay, currentHour) {
    // Mevcut yerden kaldır
    if (schedule[currentClass]?.[currentDay]?.[currentHour]) {
      schedule[currentClass][currentDay][currentHour] = null;
    }

    // Geçerli slot bul
    for (let day = 1; day <= 5; day++) {
      for (let hour = 1; hour <= 8; hour++) {
        // Aynı slot'u atlama
        if (day === currentDay && hour === currentHour) continue;

        // Validation
        const validation = this.validateWithEngine(
          lesson,
          currentClass,
          day,
          hour
        );

        if (validation.valid) {
          // Yerleştir
          if (!schedule[currentClass][day]) schedule[currentClass][day] = {};
          schedule[currentClass][day][hour] = lesson;
          return true;
        }
      }
    }

    // Geçerli slot bulunamadı, geri koy
    schedule[currentClass][currentDay][currentHour] = lesson;
    return false;
  }

  /**
   * ================================================================================
   * SCHEDULE'DAN BLOK KALDIR
   * ================================================================================
   */
  removeBlockFromSchedule(schedule, lesson, block) {
    for (const slot of block) {
      if (schedule[lesson.classId]?.[slot.day]?.[slot.hour]?.id === lesson.id) {
        schedule[lesson.classId][slot.day][slot.hour] = null;
      }
    }
  }

  /**
   * ================================================================================
   * SCHEDULE'A BLOK YERLEŞTİR (YENİDEN)
   * ================================================================================
   */
  replaceBlockInSchedule(schedule, lesson, blockSize) {
    // En iyi slot bul
    const blockSlot = this.findBestBlockSlotInSchedule(
      schedule,
      lesson,
      blockSize
    );

    if (!blockSlot) {
      return { success: false, placed: 0 };
    }

    // Yerleştir
    let placed = 0;
    for (const slot of blockSlot.slots) {
      if (!schedule[lesson.classId][slot.day]) {
        schedule[lesson.classId][slot.day] = {};
      }
      schedule[lesson.classId][slot.day][slot.hour] = lesson;
      placed++;
    }

    return { success: true, placed };
  }

  /**
   * ================================================================================
   * SCHEDULE'DA EN İYİ BLOK SLOT BUL
   * ================================================================================
   */
  findBestBlockSlotInSchedule(schedule, lesson, blockSize) {
    // findOptimalBlockSlot fonksiyonunu kullan ama schedule parametresiyle
    // (Bu fonksiyon this.state.schedule yerine parametre olarak gelen schedule'ı kullanmalı)

    const candidates = [];

    for (let day = 1; day <= 5; day++) {
      for (let startHour = 1; startHour <= 9 - blockSize; startHour++) {
        const blockSlots = [];
        let allValid = true;

        for (let i = 0; i < blockSize; i++) {
          const hour = startHour + i;

          // Schedule'da boş mu?
          if (schedule[lesson.classId]?.[day]?.[hour]) {
            allValid = false;
            break;
          }

          blockSlots.push({ day, hour });
        }

        if (allValid) {
          candidates.push({
            day,
            startHour,
            blockSize,
            slots: blockSlots,
            score: Math.random(), // Basit skorlama
          });
        }
      }
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
  }

  /**
   * ================================================================================
   * KALİTE GÜVENCE (QUALITY ASSURANCE)
   * ================================================================================
   */
  performQualityAssurance(schedule) {
    console.log("\n✅ KALİTE GÜVENCE KONTROLÜ");

    // QualityAssurance modülü varsa kullan
    if (this.modules.optimization.qualityAssurance) {
      try {
        const qaResult = this.modules.optimization.qualityAssurance.check({
          schedule: schedule,
          constraints: this.processedConstraints,
          preferences: this.processedPreferences,
          teacherMetadata: this.teacherMetadata,
          lessonMetadata: this.lessonMetadata,
          standards: {
            minFitness: -1000,
            maxHardViolations: 0,
            maxGapPerTeacher: 10,
            minCompletenessRate: 0.8,
          },
        });

        console.log("   Kalite Skoru: " + qaResult.score.toFixed(2) + "/100");
        console.log(
          "   Standartlar: " +
            (qaResult.meetsStandards ? "✅ UYGUN" : "❌ UYGUN DEĞİL")
        );

        if (!qaResult.meetsStandards) {
          console.log("   İhlaller:");
          for (const issue of qaResult.issues) {
            console.log(`      - ${issue.description}`);
          }
        }

        return qaResult;
      } catch (error) {
        this.logError("QualityAssurance", "Kalite güvence hatası", error);
      }
    }

    // Manuel kalite kontrolü
    return this.manualQualityCheck(schedule);
  }

  /**
   * ================================================================================
   * MANUEL KALİTE KONTROLÜ
   * ================================================================================
   */
  manualQualityCheck(schedule) {
    const qa = {
      score: 100,
      meetsStandards: true,
      issues: [],
    };

    // 1. Sert kısıt kontrolü
    const hardViolations = this.countHardConstraintViolations(schedule);
    if (hardViolations > 0) {
      qa.score -= 50;
      qa.meetsStandards = false;
      qa.issues.push({
        description: `${hardViolations} sert kısıt ihlali`,
        severity: "CRITICAL",
      });
    }

    // 2. Tamlik oranı
    const completeness = this.calculateCompletenessRate(schedule);
    if (completeness < 0.8) {
      qa.score -= 30;
      qa.meetsStandards = false;
      qa.issues.push({
        description: `Düşük tamamlanma: ${(completeness * 100).toFixed(1)}%`,
        severity: "HIGH",
      });
    }

    // 3. Boşluk kontrolü
    const avgGap =
      this.calculateAllTeacherGaps(schedule) / this.teachers.length;
    if (avgGap > 10) {
      qa.score -= 20;
      qa.issues.push({
        description: `Yüksek ortalama boşluk: ${avgGap.toFixed(1)}`,
        severity: "MEDIUM",
      });
    }

    return qa;
  }

  /**
   * ================================================================================
   * TAMAMLANMA ORANI
   * ================================================================================
   */
  calculateCompletenessRate(schedule) {
    let totalRequired = 0;
    let totalPlaced = 0;

    for (const lesson of this.lessons) {
      totalRequired += lesson.weeklyHours;
      totalPlaced += this.countLessonInSchedule(schedule, lesson);
    }

    return totalRequired > 0 ? totalPlaced / totalRequired : 0;
  }
  /**
   * ================================================================================
   * ÇÖZÜM STABİLİZASYONU
   * ================================================================================
   */
  stabilizeSolution(schedule) {
    console.log("\n🔒 ÇÖZÜM STABİLİZASYONU");

    if (!this.solutionStabilizer) {
      console.log(
        "   ⚠️ SolutionStabilizer modülü yok, stabilizasyon atlanıyor"
      );
      return schedule;
    }

    try {
      const result = this.solutionStabilizer.stabilize(
        schedule,
        {
          maxIterations: 10,
          threshold: 0.01,
        },
        (progress) => {
          // ✅ progress objesi olabilir veya undefined olabilir
          const iteration = progress?.iteration || 0;
          const improvement = progress?.improvement || 0;

          console.log(
            `   İterasyon: ${iteration}, İyileştirme: ${improvement.toFixed(2)}`
          );
        }
      );

      return result.schedule || schedule;
    } catch (error) {
      this.logError("SolutionStabilizer", "Stabilizasyon hatası", error);
      return schedule;
    }
  }

  /**
   * ================================================================================
   * BÖLÜM 8 BİTTİ - DEVAM EDECEK...
   * ================================================================================
   */

  /**
   * ================================================================================
   * BÖLÜM 9: FINAL VALIDATION - SON DOĞRULAMA VE KAPSAMLI RAPOR
   * ================================================================================
   *
   * Bu bölüm:
   * 1. Tüm sistemi son kez doğrular
   * 2. Kapsamlı kalite raporu oluşturur
   * 3. Eksik dersleri tespit eder
   * 4. İstatistiksel analiz yapar
   * 5. QualityAssurance tam kontrolü
   * 6. Çözümü stabilize eder
   * 7. Son onarımları yapar
   * ================================================================================
   */

  /**
   * ================================================================================
   * ANA FİNAL VALİDASYON FONKSİYONU
   * ================================================================================
   */
  finalValidation(schedule, options = {}) {
    console.log("\n" + "=".repeat(80));
    console.log("✅ BÖLÜM 9: FİNAL VALİDASYON - SON KONTROL");
    console.log("=".repeat(80));

    const startTime = Date.now();

    const result = {
      valid: false,
      schedule: schedule, // Gelen programı başlangıç olarak alır
      fitness: 0,
      violations: {
        hard: [],
        softHigh: [],
        softMedium: [],
        softLow: [],
      },
      statistics: {},
      qualityReport: {},
      missingLessons: [],
      recommendations: [],
      duration: 0,
    };

    try {
      // 1. SON ONARIM (Son kez düzelt)
      if (options.repair !== false) {
        console.log("\n🔧 1. SON ONARIM");
        const repairResult = this.repairSchedule(result.schedule, {
          maxAttempts: 200,
        });

        // KRİTİK DÜZELTME: repairSchedule'dan dönen objeden sadece schedule'ı al.
        // repairSchedule metodunun, ScheduleRepairEngine'in return formatına uyması beklenir.
        if (repairResult && repairResult.schedule) {
          result.schedule = repairResult.schedule;
          // İyileştirme veya düzeltilen ihlal sayısı da buradan loglanabilir.
          // this.logDebug(`Düzeltilen ihlaller: ${repairResult.fixedViolations || 0}`);
        }
      }

      // 2. ÇÖZÜM STABİLİZASYONU (Optimize et)
      if (options.stabilize !== false) {
        console.log("\n🔒 2. ÇÖZÜM STABİLİZASYONU");
        result.schedule = this.stabilizeSolution(result.schedule);
      }

      // 3. KAPSAMLı VALİDASYON
      console.log("\n🔍 3. KAPSAMLI VALİDASYON");
      result.violations = this.performComprehensiveValidation(result.schedule);

      // 4. FITNESS HESAPLAMA
      console.log("\n📊 4. FİNAL FITNESS");
      result.fitness = this.calculateCompleteFitness(result.schedule);

      // 5. İSTATİSTİKSEL ANALİZ
      console.log("\n📈 5. İSTATİSTİKSEL ANALİZ");
      result.statistics = this.performStatisticalAnalysis(result.schedule);

      // 6. KALİTE RAPORU
      console.log("\n✅ 6. KALİTE RAPORU");
      result.qualityReport = this.performQualityAssurance(result.schedule);

      // 7. EKSİK DERS TESPİTİ
      console.log("\n⚠️  7. EKSİK DERS TESPİTİ");
      result.missingLessons = this.findMissingLessons(result.schedule);

      // 9. GEÇERLİLİK KARARI
      result.valid = this.determineValidity(result);

      // 8. ÖNERİLER OLUŞTUR (Validasyon sonucuna göre)
      console.log("\n💡 8. ÖNERİLER");
      result.recommendations = this.generateRecommendations(result);

      result.duration = Date.now() - startTime;

      // 10. DETAYLI RAPOR
      this.printFinalValidationReport(result);

      console.log("=".repeat(80) + "\n");

      return result;
    } catch (error) {
      this.logError("FinalValidation", "Final validation hatası!", error);
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * ================================================================================
   * 1. KAPSAMLI VALİDASYON - TÜM İHLALLERİ TOPLA
   * ================================================================================
   */
  performComprehensiveValidation(schedule) {
    const violations = {
      hard: [],
      softHigh: [],
      softMedium: [],
      softLow: [],
    };

    // Her sınıf, her gün, her saat için kontrol
    for (const classId in schedule) {
      for (let day = 1; day <= 5; day++) {
        for (let hour = 1; hour <= 8; hour++) {
          const lesson = schedule[classId]?.[day]?.[hour];
          if (!lesson) continue;

          // Doğrulama
          const validation = this.validateWithEngine(
            lesson,
            classId,
            day,
            hour
          );

          if (!validation.valid) {
            const violationInfo = {
              classId,
              className:
                this.classes.find((c) => c.id === classId)?.name || classId,
              day,
              dayName: this.getDayName(day),
              hour,
              lesson: lesson,
              lessonName: lesson.subjectName,
              teacherName: this.teacherMetadata[lesson.teacherId]?.name || "?",
              reason: validation.reason,
              detail: validation.detail,
              severity: validation.severity,
            };

            // Şiddete göre kategorize et
            if (validation.severity === "HARD") {
              violations.hard.push(violationInfo);
            } else if (validation.severity === "SOFT_HIGH") {
              violations.softHigh.push(violationInfo);
            } else if (validation.severity === "SOFT_MEDIUM") {
              violations.softMedium.push(violationInfo);
            } else {
              violations.softLow.push(violationInfo);
            }
          }
        }
      }
    }

    // Özet
    console.log(`   Sert İhlal: ${violations.hard.length}`);
    console.log(`   Yumuşak Yüksek: ${violations.softHigh.length}`);
    console.log(`   Yumuşak Orta: ${violations.softMedium.length}`);
    console.log(`   Yumuşak Düşük: ${violations.softLow.length}`);
    console.log(
      `   Toplam: ${
        violations.hard.length +
        violations.softHigh.length +
        violations.softMedium.length +
        violations.softLow.length
      }`
    );

    return violations;
  }

  /**
   * ================================================================================
   * 2. İSTATİSTİKSEL ANALİZ - KAPSAMLI İSTATİSTİKLER
   * ================================================================================
   */
  performStatisticalAnalysis(schedule) {
    const stats = {
      general: {},
      teachers: {},
      classes: {},
      lessons: {},
      distribution: {},
      quality: {},
    };

    // GENEL İSTATİSTİKLER
    stats.general = {
      totalHours: this.lessons.reduce((sum, l) => sum + l.weeklyHours, 0),
      placedHours: this.countTotalPlacedHours(schedule),
      emptySlots: this.countEmptySlots(schedule),
      utilizationRate: 0,
    };
    stats.general.utilizationRate = (
      (stats.general.placedHours / stats.general.totalHours) *
      100
    ).toFixed(2);

    // ÖĞRETMEN İSTATİSTİKLERİ
    stats.teachers = this.analyzeTeacherStatistics(schedule);

    // SINIF İSTATİSTİKLERİ
    stats.classes = this.analyzeClassStatistics(schedule);

    // DERS İSTATİSTİKLERİ
    stats.lessons = this.analyzeLessonStatistics(schedule);

    // DAĞILIM ANALİZİ
    stats.distribution = this.analyzeDistribution(schedule);

    // KALİTE METRİKLERİ
    stats.quality = this.calculateQualityMetrics(schedule);

    // Özet çıktı
    console.log(`   Toplam Saat: ${stats.general.totalHours}`);
    console.log(
      `   Yerleştirilen: ${stats.general.placedHours} (${stats.general.utilizationRate}%)`
    );
    console.log(`   Boş Slot: ${stats.general.emptySlots}`);

    return stats;
  }

  /**
   * ================================================================================
   * ÖĞRETMEN İSTATİSTİKLERİ ANALİZİ
   * ================================================================================
   */
  analyzeTeacherStatistics(schedule) {
    const stats = {
      total: this.teachers.length,
      withLessons: 0,
      fullyPlaced: 0,
      partiallyPlaced: 0,
      notPlaced: 0,
      avgLoad: 0,
      avgGaps: 0,
      maxLoad: 0,
      minLoad: Infinity,
      details: [],
    };

    let totalLoad = 0;
    let totalGaps = 0;

    for (const teacherMeta of Object.values(this.teacherMetadata)) {
      const placedHours = this.countTeacherLessons(schedule, teacherMeta.id);
      const gaps = this.calculateTeacherGaps(schedule, teacherMeta.id);
      const fillRate =
        teacherMeta.totalHours > 0 ? placedHours / teacherMeta.totalHours : 0;

      totalLoad += placedHours;
      totalGaps += gaps;

      if (placedHours > stats.maxLoad) stats.maxLoad = placedHours;
      if (placedHours < stats.minLoad && placedHours > 0)
        stats.minLoad = placedHours;

      if (placedHours > 0) stats.withLessons++;

      if (fillRate >= 1.0) {
        stats.fullyPlaced++;
      } else if (fillRate > 0) {
        stats.partiallyPlaced++;
      } else {
        stats.notPlaced++;
      }

      stats.details.push({
        id: teacherMeta.id,
        name: teacherMeta.name,
        totalHours: teacherMeta.totalHours,
        placedHours: placedHours,
        fillRate: (fillRate * 100).toFixed(1),
        gaps: gaps,
        hasConstraints: teacherMeta.hasConstraints,
        hasPreferences: teacherMeta.hasPreferences,
      });
    }

    stats.avgLoad = (totalLoad / stats.total).toFixed(2);
    stats.avgGaps = (totalGaps / stats.total).toFixed(2);

    console.log(`   Öğretmen: ${stats.total}`);
    console.log(`   Tam Yerleşen: ${stats.fullyPlaced}`);
    console.log(`   Kısmi: ${stats.partiallyPlaced}`);
    console.log(`   Hiç Yerleşmemiş: ${stats.notPlaced}`);

    return stats;
  }

  /**
   * ================================================================================
   * SINIF İSTATİSTİKLERİ ANALİZİ
   * ================================================================================
   */
  analyzeClassStatistics(schedule) {
    const stats = {
      total: this.classes.length,
      avgFillRate: 0,
      maxFillRate: 0,
      minFillRate: 100,
      details: [],
    };

    let totalFillRate = 0;

    for (const cls of this.classes) {
      const classId = cls.id;
      let filledSlots = 0;
      const totalSlots = 40; // 5 gün x 8 saat

      for (let day = 1; day <= 5; day++) {
        for (let hour = 1; hour <= 8; hour++) {
          if (schedule[classId]?.[day]?.[hour]) {
            filledSlots++;
          }
        }
      }

      const fillRate = (filledSlots / totalSlots) * 100;
      totalFillRate += fillRate;

      if (fillRate > stats.maxFillRate) stats.maxFillRate = fillRate;
      if (fillRate < stats.minFillRate) stats.minFillRate = fillRate;

      stats.details.push({
        id: classId,
        name: cls.name,
        filledSlots: filledSlots,
        totalSlots: totalSlots,
        fillRate: fillRate.toFixed(2),
        emptySlots: totalSlots - filledSlots,
      });
    }

    stats.avgFillRate = (totalFillRate / stats.total).toFixed(2);

    console.log(`   Sınıf: ${stats.total}`);
    console.log(`   Ort. Doluluk: ${stats.avgFillRate}%`);

    return stats;
  }

  /**
   * ================================================================================
   * DERS İSTATİSTİKLERİ ANALİZİ
   * ================================================================================
   */
  analyzeLessonStatistics(schedule) {
    const stats = {
      total: this.lessons.length,
      fullyPlaced: 0,
      partiallyPlaced: 0,
      notPlaced: 0,
      blockLessons: 0,
      blockFullyPlaced: 0,
      details: [],
    };

    for (const lesson of this.lessons) {
      const placedHours = this.countLessonInSchedule(schedule, lesson);
      const fillRate =
        lesson.weeklyHours > 0 ? placedHours / lesson.weeklyHours : 0;

      const lessonMeta = this.lessonMetadata[lesson.id];

      if (fillRate >= 1.0) {
        stats.fullyPlaced++;
        if (lessonMeta?.isBlockLesson) stats.blockFullyPlaced++;
      } else if (fillRate > 0) {
        stats.partiallyPlaced++;
      } else {
        stats.notPlaced++;
      }

      if (lessonMeta?.isBlockLesson) {
        stats.blockLessons++;
      }

      stats.details.push({
        id: lesson.id,
        subjectName: lesson.subjectName,
        className: lesson.className,
        teacherName: this.teacherMetadata[lesson.teacherId]?.name || "?",
        weeklyHours: lesson.weeklyHours,
        placedHours: placedHours,
        fillRate: (fillRate * 100).toFixed(1),
        isBlock: lessonMeta?.isBlockLesson || false,
      });
    }

    console.log(`   Ders: ${stats.total}`);
    console.log(`   Tam Yerleşen: ${stats.fullyPlaced}`);
    console.log(`   Kısmi: ${stats.partiallyPlaced}`);
    console.log(`   Hiç Yerleşmemiş: ${stats.notPlaced}`);

    return stats;
  }

  /**
   * ================================================================================
   * DAĞILIM ANALİZİ (Günlere ve Saatlere Göre)
   * ================================================================================
   */
  analyzeDistribution(schedule) {
    const stats = {
      byDay: {},
      byHour: {},
      byDayHour: {},
    };

    // Günlere göre dağılım
    for (let day = 1; day <= 5; day++) {
      stats.byDay[day] = {
        name: this.getDayName(day),
        count: 0,
      };
    }

    // Saatlere göre dağılım
    for (let hour = 1; hour <= 8; hour++) {
      stats.byHour[hour] = 0;
    }

    // Sayım
    for (const classId in schedule) {
      for (let day = 1; day <= 5; day++) {
        for (let hour = 1; hour <= 8; hour++) {
          if (schedule[classId]?.[day]?.[hour]) {
            stats.byDay[day].count++;
            stats.byHour[hour]++;

            const key = `${day}_${hour}`;
            if (!stats.byDayHour[key]) {
              stats.byDayHour[key] = 0;
            }
            stats.byDayHour[key]++;
          }
        }
      }
    }

    // En yoğun gün
    let maxDayCount = 0;
    let busiestDay = 1;
    for (let day = 1; day <= 5; day++) {
      if (stats.byDay[day].count > maxDayCount) {
        maxDayCount = stats.byDay[day].count;
        busiestDay = day;
      }
    }

    // En yoğun saat
    let maxHourCount = 0;
    let busiestHour = 1;
    for (let hour = 1; hour <= 8; hour++) {
      if (stats.byHour[hour] > maxHourCount) {
        maxHourCount = stats.byHour[hour];
        busiestHour = hour;
      }
    }

    stats.busiestDay = this.getDayName(busiestDay);
    stats.busiestHour = busiestHour;

    console.log(`   En Yoğun Gün: ${stats.busiestDay} (${maxDayCount} ders)`);
    console.log(
      `   En Yoğun Saat: ${stats.busiestHour}. saat (${maxHourCount} ders)`
    );

    return stats;
  }

  /**
   * ================================================================================
   * KALİTE METRİKLERİ
   * ================================================================================
   */
  calculateQualityMetrics(schedule) {
    const metrics = {
      completeness: 0, // Tamamlanma oranı
      fairness: 0, // Adalet skoru
      efficiency: 0, // Verimlilik (boşluk azlığı)
      compliance: 0, // Kısıt uyumu
      balance: 0, // Denge
      overall: 0, // Genel kalite
    };

    // 1. Tamamlanma
    metrics.completeness = this.calculateCompletenessRate(schedule) * 100;

    // 2. Adalet
    metrics.fairness = this.calculateFairnessScore(schedule);

    // 3. Verimlilik
    const avgGap =
      this.calculateAllTeacherGaps(schedule) / this.teachers.length;
    metrics.efficiency = Math.max(0, 100 - avgGap * 5);

    // 4. Kısıt Uyumu
    metrics.compliance = this.objectiveConstraintCompliance(schedule);

    // 5. Denge
    metrics.balance = this.calculateBalanceScore(schedule);

    // 6. Genel Kalite (Ağırlıklı Ortalama)
    metrics.overall =
      metrics.completeness * 0.3 +
      metrics.fairness * 0.25 +
      metrics.efficiency * 0.2 +
      metrics.compliance * 0.15 +
      metrics.balance * 0.1;

    console.log(`   Tamamlanma: ${metrics.completeness.toFixed(1)}%`);
    console.log(`   Adalet: ${metrics.fairness.toFixed(1)}/100`);
    console.log(`   Verimlilik: ${metrics.efficiency.toFixed(1)}/100`);
    console.log(`   Genel Kalite: ${metrics.overall.toFixed(1)}/100`);

    return metrics;
  }

  /**
   * ================================================================================
   * GENEL DENGE SKORU
   * ================================================================================
   */
  calculateBalanceScore(schedule) {
    let score = 100;

    // Günlük denge
    const dailyCounts = {};
    for (let day = 1; day <= 5; day++) {
      dailyCounts[day] = 0;
      for (const classId in schedule) {
        for (let hour = 1; hour <= 8; hour++) {
          if (schedule[classId]?.[day]?.[hour]) {
            dailyCounts[day]++;
          }
        }
      }
    }

    const dailyValues = Object.values(dailyCounts);
    const avgDaily = dailyValues.reduce((sum, c) => sum + c, 0) / 5;
    const dailyVariance =
      dailyValues.reduce((sum, c) => sum + Math.pow(c - avgDaily, 2), 0) / 5;

    score -= dailyVariance / 10;

    // Saatlik denge
    const hourlyCounts = {};
    for (let hour = 1; hour <= 8; hour++) {
      hourlyCounts[hour] = 0;
      for (const classId in schedule) {
        for (let day = 1; day <= 5; day++) {
          if (schedule[classId]?.[day]?.[hour]) {
            hourlyCounts[hour]++;
          }
        }
      }
    }

    const hourlyValues = Object.values(hourlyCounts);
    const avgHourly = hourlyValues.reduce((sum, c) => sum + c, 0) / 8;
    const hourlyVariance =
      hourlyValues.reduce((sum, c) => sum + Math.pow(c - avgHourly, 2), 0) / 8;

    score -= hourlyVariance / 10;

    return Math.max(0, score);
  }

  /**
   * ================================================================================
   * 3. EKSİK DERS TESPİTİ
   * ================================================================================
   */
  findMissingLessons(schedule) {
    const missing = [];

    for (const lesson of this.lessons) {
      const placedHours = this.countLessonInSchedule(schedule, lesson);
      const missingHours = lesson.weeklyHours - placedHours;

      if (missingHours > 0) {
        const teacherMeta = this.teacherMetadata[lesson.teacherId];

        missing.push({
          lessonId: lesson.id,
          subjectName: lesson.subjectName,
          className: lesson.className,
          teacherName: teacherMeta?.name || "?",
          requiredHours: lesson.weeklyHours,
          placedHours: placedHours,
          missingHours: missingHours,
          fillRate: ((placedHours / lesson.weeklyHours) * 100).toFixed(1),
        });
      }
    }

    // Eksiklere göre sırala (en fazla eksik olan önce)
    missing.sort((a, b) => b.missingHours - a.missingHours);

    if (missing.length > 0) {
      console.log(`   ⚠️  ${missing.length} derste eksiklik var`);
      console.log(
        `   Toplam eksik saat: ${missing.reduce(
          (sum, m) => sum + m.missingHours,
          0
        )}`
      );

      // İlk 5'i göster
      for (let i = 0; i < Math.min(5, missing.length); i++) {
        const m = missing[i];
        console.log(
          `      ${i + 1}. ${m.subjectName} (${m.className}): ${
            m.missingHours
          } saat eksik`
        );
      }
    } else {
      console.log(`   ✅ Tüm dersler tamamen yerleştirilmiş!`);
    }

    return missing;
  }

  /**
   * ================================================================================
   * 4. ÖNERİLER OLUŞTUR
   * ================================================================================
   */
  generateRecommendations(validationResult) {
    const recommendations = [];

    // 1. Sert kısıt ihlali varsa
    if (validationResult.violations.hard.length > 0) {
      recommendations.push({
        priority: "CRITICAL",
        category: "CONSTRAINTS",
        title: "Sert Kısıt İhlalleri",
        description: `${validationResult.violations.hard.length} adet sert kısıt ihlali tespit edildi. Bu ihlaller mutlaka düzeltilmelidir.`,
        action:
          "Manuel olarak gözden geçirin ve düzeltin, veya onarım algoritmasını tekrar çalıştırın.",
      });
    }

    // 2. Eksik dersler varsa
    if (validationResult.missingLessons.length > 0) {
      const totalMissing = validationResult.missingLessons.reduce(
        (sum, m) => sum + m.missingHours,
        0
      );
      recommendations.push({
        priority: "HIGH",
        category: "COMPLETENESS",
        title: "Eksik Dersler",
        description: `${validationResult.missingLessons.length} derste toplam ${totalMissing} saat eksiklik var.`,
        action: "Manuel yerleştirme yapın veya kısıtları gevşetin.",
      });
    }

    // 3. Düşük kalite skoru
    if (validationResult.statistics.quality?.overall < 70) {
      recommendations.push({
        priority: "MEDIUM",
        category: "QUALITY",
        title: "Düşük Kalite Skoru",
        description: `Genel kalite skoru ${validationResult.statistics.quality.overall.toFixed(
          1
        )}/100. İyileştirme gerekiyor.`,
        action:
          "Algoritma parametrelerini ayarlayın veya daha fazla iterasyon çalıştırın.",
      });
    }

    // 4. Yüksek boşluk oranı
    const avgGap = parseFloat(
      validationResult.statistics.teachers?.avgGaps || 0
    );
    if (avgGap > 5) {
      recommendations.push({
        priority: "MEDIUM",
        category: "EFFICIENCY",
        title: "Yüksek Boşluk Oranı",
        description: `Öğretmen başına ortalama ${avgGap} boşluk var.`,
        action:
          "Boşlukları minimize etmek için algoritma ağırlıklarını ayarlayın.",
      });
    }

    // 5. Dengesiz dağılım
    if (validationResult.statistics.quality?.balance < 80) {
      recommendations.push({
        priority: "LOW",
        category: "BALANCE",
        title: "Dengesiz Dağılım",
        description: "Derslerin günlere ve saatlere dağılımı dengesiz.",
        action: "Dağılım dengesini artırmak için algoritma çalıştırın.",
      });
    }

    // 6. Yumuşak kısıt ihlalleri
    const totalSoft =
      validationResult.violations.softHigh.length +
      validationResult.violations.softMedium.length +
      validationResult.violations.softLow.length;

    if (totalSoft > 20) {
      recommendations.push({
        priority: "LOW",
        category: "PREFERENCES",
        title: "Çok Sayıda Tercih İhlali",
        description: `${totalSoft} adet yumuşak kısıt ihlali var.`,
        action: "Tercihleri gözden geçirin veya öncelikleri ayarlayın.",
      });
    }

    // Önceliğe göre sırala
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    console.log(`   ${recommendations.length} öneri oluşturuldu`);

    return recommendations;
  }

  /**
   * ================================================================================
   * 5. GEÇERLİLİK KARARI
   * ================================================================================
   */
  determineValidity(validationResult) {
    // Sert kısıt ihlali varsa geçersiz
    if (validationResult.violations.hard.length > 0) {
      console.log("\n❌ ÇÖZÜM GEÇERSİZ: Sert kısıt ihlali var!");
      return false;
    }

    // Çok fazla eksik ders varsa geçersiz
    const totalMissing = validationResult.missingLessons.reduce(
      (sum, m) => sum + m.missingHours,
      0
    );
    const totalRequired = this.lessons.reduce(
      (sum, l) => sum + l.weeklyHours,
      0
    );
    const missingRate = (totalMissing / totalRequired) * 100;

    if (missingRate > 20) {
      console.log(
        `\n❌ ÇÖZÜM GEÇERSİZ: Çok fazla eksik ders (%${missingRate.toFixed(1)})`
      );
      return false;
    }

    // Kalite skoru çok düşükse uyarı ver ama geçerli say
    if (validationResult.statistics.quality?.overall < 50) {
      console.log(
        `\n⚠️  ÇÖZÜM DÜŞÜK KALİTE: ${validationResult.statistics.quality.overall.toFixed(
          1
        )}/100`
      );
      return true;
    }

    console.log("\n✅ ÇÖZÜM GEÇERLİ VE UYGULANAB İLİR!");
    return true;
  }

  /**
   * ================================================================================
   * YARDIMCI FONKSİYONLAR
   * ================================================================================
   */

  countTotalPlacedHours(schedule) {
    let count = 0;
    for (const classId in schedule) {
      for (let day = 1; day <= 5; day++) {
        for (let hour = 1; hour <= 8; hour++) {
          if (schedule[classId]?.[day]?.[hour]) {
            count++;
          }
        }
      }
    }
    return count;
  }

  countEmptySlots(schedule) {
    const totalSlots = this.classes.length * 5 * 8; // sınıf x gün x saat
    const placedSlots = this.countTotalPlacedHours(schedule);
    return totalSlots - placedSlots;
  }

  /**
   * ================================================================================
   * DETAYLI FİNAL RAPORU
   * ================================================================================
   */
  printFinalValidationReport(result) {
    console.log("\n" + "=".repeat(80));
    console.log("📋 DETAYLI FİNAL VALİDASYON RAPORU");
    console.log("=".repeat(80));

    // 1. GENEL DURUM
    console.log("\n🎯 GENEL DURUM:");
    console.log(
      `   Geçerlilik: ${result.valid ? "✅ GEÇERLİ" : "❌ GEÇERSİZ"}`
    );
    console.log(`   Fitness: ${result.fitness.toFixed(2)}`);
    console.log(`   Süre: ${result.duration}ms`);

    // 2. İHLALLER
    console.log("\n⚠️  İHLAL DURUMU:");
    console.log(`   Sert Kısıt: ${result.violations.hard.length}`);
    console.log(`   Yumuşak Yüksek: ${result.violations.softHigh.length}`);
    console.log(`   Yumuşak Orta: ${result.violations.softMedium.length}`);
    console.log(`   Yumuşak Düşük: ${result.violations.softLow.length}`);

    // 3. İSTATİSTİKLER
    if (result.statistics.general) {
      console.log("\n📊 GENEL İSTATİSTİKLER:");
      console.log(`   Toplam Saat: ${result.statistics.general.totalHours}`);
      console.log(
        `   Yerleştirilen: ${result.statistics.general.placedHours} (${result.statistics.general.utilizationRate}%)`
      );
      console.log(`   Boş Slot: ${result.statistics.general.emptySlots}`);
    }

    if (result.statistics.teachers) {
      console.log("\n👨‍🏫 ÖĞRETMEN İSTATİSTİKLERİ:");
      console.log(`   Toplam: ${result.statistics.teachers.total}`);
      console.log(`   Tam Yerleşen: ${result.statistics.teachers.fullyPlaced}`);
      console.log(`   Kısmi: ${result.statistics.teachers.partiallyPlaced}`);
      console.log(
        `   Hiç Yerleşmemiş: ${result.statistics.teachers.notPlaced}`
      );
      console.log(
        `   Ortalama Yük: ${result.statistics.teachers.avgLoad} saat`
      );
      console.log(`   Ortalama Boşluk: ${result.statistics.teachers.avgGaps}`);
    }

    if (result.statistics.classes) {
      console.log("\n🏫 SINIF İSTATİSTİKLERİ:");
      console.log(`   Toplam: ${result.statistics.classes.total}`);
      console.log(
        `   Ortalama Doluluk: ${result.statistics.classes.avgFillRate}%`
      );
      console.log(
        `   En Dolu: ${result.statistics.classes.maxFillRate.toFixed(1)}%`
      );
      console.log(
        `   En Boş: ${result.statistics.classes.minFillRate.toFixed(1)}%`
      );
    }

    if (result.statistics.lessons) {
      console.log("\n📚 DERS İSTATİSTİKLERİ:");
      console.log(`   Toplam: ${result.statistics.lessons.total}`);
      console.log(`   Tam Yerleşen: ${result.statistics.lessons.fullyPlaced}`);
      console.log(`   Kısmi: ${result.statistics.lessons.partiallyPlaced}`);
      console.log(`   Hiç Yerleşmemiş: ${result.statistics.lessons.notPlaced}`);
      console.log(`   Blok Ders: ${result.statistics.lessons.blockLessons}`);
      console.log(
        `   Tam Yerleşen Blok: ${result.statistics.lessons.blockFullyPlaced}`
      );
    }

    // 4. KALİTE METRİKLERİ
    if (result.statistics.quality) {
      console.log("\n✨ KALİTE METRİKLERİ:");
      console.log(
        `   Tamamlanma: ${result.statistics.quality.completeness.toFixed(1)}%`
      );
      console.log(
        `   Adalet: ${result.statistics.quality.fairness.toFixed(1)}/100`
      );
      console.log(
        `   Verimlilik: ${result.statistics.quality.efficiency.toFixed(1)}/100`
      );
      console.log(
        `   Kısıt Uyumu: ${result.statistics.quality.compliance.toFixed(1)}/100`
      );
      console.log(
        `   Denge: ${result.statistics.quality.balance.toFixed(1)}/100`
      );
      console.log(
        `   >>> GENEL KALİTE: ${result.statistics.quality.overall.toFixed(
          1
        )}/100`
      );
    }

    // 5. EKSİK DERSLER
    if (result.missingLessons.length > 0) {
      console.log(`\n⚠️  EKSİK DERSLER (${result.missingLessons.length}):`);
      for (let i = 0; i < Math.min(10, result.missingLessons.length); i++) {
        const m = result.missingLessons[i];
        console.log(
          `   ${i + 1}. ${m.subjectName} (${m.className}) - ${m.teacherName}`
        );
        console.log(
          `      Gerekli: ${m.requiredHours}, Yerleştirilen: ${m.placedHours}, Eksik: ${m.missingHours}`
        );
      }
      if (result.missingLessons.length > 10) {
        console.log(`   ... ve ${result.missingLessons.length - 10} ders daha`);
      }
    }

    // 6. ÖNERİLER
    if (result.recommendations.length > 0) {
      console.log(`\n💡 ÖNERİLER (${result.recommendations.length}):`);
      for (let i = 0; i < result.recommendations.length; i++) {
        const rec = result.recommendations[i];
        const priorityEmoji = {
          CRITICAL: "🔴",
          HIGH: "🟠",
          MEDIUM: "🟡",
          LOW: "🟢",
        };
        console.log(
          `\n   ${priorityEmoji[rec.priority]} ${rec.priority}: ${rec.title}`
        );
        console.log(`      ${rec.description}`);
        console.log(`      Aksiyon: ${rec.action}`);
      }
    }

    console.log("\n" + "=".repeat(80));
  }

  /**
   * ================================================================================
   * BÖLÜM 9 BİTTİ - DEVAM EDECEK...
   * ================================================================================
   */

  /**
   * ================================================================================
   * BÖLÜM 10: SOLVE ORCHESTRATION - ANA ORKESTRASYON
   * ================================================================================
   *
   * Bu bölüm SİSTEMİN KALP ATIŞI! ❤️
   *
   * Tüm 9 bölümü koordine eder:
   * 1. CORE FOUNDATION ✅
   * 2. DATA PREPARATION ✅
   * 3. VALIDATION LAYER ✅
   * 4. TEACHER-BASED PLACEMENT ✅
   * 5. BLOCK PLACEMENT ✅
   * 6. INITIAL SOLUTION ✅
   * 7. ALGORITHM INTEGRATION ✅
   * 8. SCORING & REPAIR ✅
   * 9. FINAL VALIDATION ✅
   * 10. SOLVE ORCHESTRATION ← BİZ BURADAYIZ!
   *
   * solve() fonksiyonu dışarıdan çağrılan ANA FONKSİYONDUR.
   * ================================================================================
   */

  /**
   * ================================================================================
   * ANA SOLVE FONKSİYONU - TÜM SİSTEMİ ÇALIŞTIRIR
   * ================================================================================
   */
  solve(options = {}) {
    console.log("\n" + "█".repeat(80));
    console.log("🚀 SCHEDULE ALGORITHM V2 - SOLVE BAŞLADI");
    console.log("█".repeat(80));
    console.log(`⏰ Başlangıç Zamanı: ${new Date().toLocaleString("tr-TR")}`);
    console.log("█".repeat(80));

    const masterStartTime = Date.now();

    const result = {
      success: false,
      phase1_dataPreparation: null,
      phase2_initialSolution: null,
      phase3_algorithmOptimization: null,
      phase4_finalValidation: null,
      best: {
        schedule: null,
        fitness: -Infinity,
        algorithm: null,
      },
      statistics: {},
      duration: 0,
      error: null,
    };

    try {
      // ═══════════════════════════════════════════════════════════════════
      // PHASE 1: VERİ HAZIRLIĞI (BÖLÜM 2)
      // ═══════════════════════════════════════════════════════════════════
      console.log("\n" + "═".repeat(80));
      console.log("📦 PHASE 1/4: VERİ HAZIRLIĞI");
      console.log("═".repeat(80));

      const phase1Start = Date.now();
      result.phase1_dataPreparation = this.prepareData();
      const phase1Duration = Date.now() - phase1Start;

      if (!result.phase1_dataPreparation) {
        throw new Error("Veri hazırlığı başarısız!");
      }

      console.log(`\n✅ PHASE 1 TAMAMLANDI (${phase1Duration}ms)`);

      // ═══════════════════════════════════════════════════════════════════
      // PHASE 2: BAŞLANGIÇ ÇÖZÜMÜ (BÖLÜM 6)
      // ═══════════════════════════════════════════════════════════════════
      console.log("\n" + "═".repeat(80));
      console.log("🎯 PHASE 2/4: BAŞLANGIÇ ÇÖZÜMÜ OLUŞTURMA");
      console.log("═".repeat(80));

      const phase2Start = Date.now();
      result.phase2_initialSolution = this.generateInitialSolution(options);
      const phase2Duration = Date.now() - phase2Start;

      if (
        !result.phase2_initialSolution ||
        !result.phase2_initialSolution.success
      ) {
        this.log(
          "WARN",
          "InitialSolution",
          "Başlangıç çözümü optimal değil, devam ediliyor..."
        );
      }

      // Başlangıç çözümünü en iyi olarak kaydet
      result.best.schedule = JSON.parse(JSON.stringify(this.state.schedule));
      result.best.fitness = this.calculateCompleteFitness(result.best.schedule);
      result.best.algorithm = "INITIAL";

      console.log(`\n✅ PHASE 2 TAMAMLANDI (${phase2Duration}ms)`);
      console.log(`📊 Başlangıç Fitness: ${result.best.fitness.toFixed(2)}`);

      // ═══════════════════════════════════════════════════════════════════
      // PHASE 3: ALGORİTMA OPTİMİZASYONU (BÖLÜM 7)
      // ═══════════════════════════════════════════════════════════════════
      console.log("\n" + "═".repeat(80));
      console.log("🤖 PHASE 3/4: ALGORİTMA OPTİMİZASYONU");
      console.log("═".repeat(80));

      const phase3Start = Date.now();

      // Algoritmaları çalıştır
      result.phase3_algorithmOptimization = this.runAllAlgorithms(
        result.phase2_initialSolution,
        options
      );

      const phase3Duration = Date.now() - phase3Start;

      // En iyi çözümü güncelle
      if (result.phase3_algorithmOptimization.success) {
        if (
          result.phase3_algorithmOptimization.finalFitness > result.best.fitness
        ) {
          result.best.schedule =
            result.phase3_algorithmOptimization.bestSolution;
          result.best.fitness =
            result.phase3_algorithmOptimization.finalFitness;
          result.best.algorithm =
            result.phase3_algorithmOptimization.bestAlgorithm;

          // State'i güncelle
          this.state.schedule = JSON.parse(
            JSON.stringify(result.best.schedule)
          );

          console.log(
            `\n✨ YENİ EN İYİ ÇÖZÜM: ${result.best.fitness.toFixed(2)} (${
              result.best.algorithm
            })`
          );
        }
      }

      console.log(`\n✅ PHASE 3 TAMAMLANDI (${phase3Duration}ms)`);
      console.log(
        `📊 İyileştirme: ${
          result.phase3_algorithmOptimization.improvement > 0 ? "+" : ""
        }${result.phase3_algorithmOptimization.improvement.toFixed(2)}`
      );

      // ═══════════════════════════════════════════════════════════════════
      // PHASE 4: FİNAL VALİDASYON (BÖLÜM 9)
      // ═══════════════════════════════════════════════════════════════════
      console.log("\n" + "═".repeat(80));
      console.log("✅ PHASE 4/4: FİNAL VALİDASYON");
      console.log("═".repeat(80));

      const phase4Start = Date.now();

      result.phase4_finalValidation = this.finalValidation(
        result.best.schedule,
        {
          repair: options.finalRepair !== false,
          stabilize: options.finalStabilize !== false,
        }
      );

      const phase4Duration = Date.now() - phase4Start;

      // Son onarım sonrası en iyi çözümü güncelle
      if (result.phase4_finalValidation.schedule) {
        const finalFitness = this.calculateCompleteFitness(
          result.phase4_finalValidation.schedule
        );

        if (finalFitness > result.best.fitness) {
          result.best.schedule = result.phase4_finalValidation.schedule;
          result.best.fitness = finalFitness;
          this.state.schedule = JSON.parse(
            JSON.stringify(result.best.schedule)
          );

          console.log(
            `\n✨ FİNAL ONARIM İYİLEŞTİRMESİ: +${(
              finalFitness - result.best.fitness
            ).toFixed(2)}`
          );
        }
      }

      console.log(`\n✅ PHASE 4 TAMAMLANDI (${phase4Duration}ms)`);

      // ═══════════════════════════════════════════════════════════════════
      // BAŞARI DURUMU
      // ═══════════════════════════════════════════════════════════════════
      result.success = result.phase4_finalValidation.valid;

      // ═══════════════════════════════════════════════════════════════════
      // İSTATİSTİKLER
      // ═══════════════════════════════════════════════════════════════════
      result.statistics = {
        phases: {
          phase1: phase1Duration,
          phase2: phase2Duration,
          phase3: phase3Duration,
          phase4: phase4Duration,
        },
        lessons: result.phase2_initialSolution,
        algorithms: result.phase3_algorithmOptimization,
        validation: result.phase4_finalValidation,
        quality: result.phase4_finalValidation.statistics?.quality || {},
      };

      result.duration = Date.now() - masterStartTime;

      // ═══════════════════════════════════════════════════════════════════
      // FİNAL RAPOR
      // ═══════════════════════════════════════════════════════════════════
      this.printMasterSummaryReport(result);

      return result;
    } catch (error) {
      result.error = error.message;
      result.duration = Date.now() - masterStartTime;

      this.logError("SOLVE", "Solve işlemi kritik hata!", error);

      // Hata raporu
      this.printErrorReport(result, error);

      return result;
    }
  }

  /**
   * ================================================================================
   * MASTER ÖZET RAPORU - EN KAPSAMLI RAPOR
   * ================================================================================
   */
  printMasterSummaryReport(result) {
    console.log("\n" + "█".repeat(80));
    console.log("🏆 SCHEDULE ALGORITHM V2 - FİNAL RAPOR");
    console.log("█".repeat(80));

    // ═══════════════════════════════════════════════════════════════════
    // 1. GENEL DURUM
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n🎯 GENEL DURUM:");
    console.log("─".repeat(80));

    const statusEmoji = result.success ? "✅" : "⚠️";
    const statusText = result.success
      ? "BAŞARILI - GEÇERLİ ÇÖZÜM"
      : "TAMAMLANDI - İYİLEŞTİRME GEREKLİ";

    console.log(`   ${statusEmoji} Durum: ${statusText}`);
    console.log(`   🏅 En İyi Algoritma: ${result.best.algorithm}`);
    console.log(`   📊 En İyi Fitness: ${result.best.fitness.toFixed(2)}`);
    console.log(
      `   ⏱️  Toplam Süre: ${(result.duration / 1000).toFixed(2)} saniye`
    );
    console.log(
      `   🔢 Toplam İterasyon: ${
        result.phase3_algorithmOptimization?.iterations || 0
      }`
    );

    // ═══════════════════════════════════════════════════════════════════
    // 2. PHASE DURUMLARI
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n📋 PHASE DURUMLARI:");
    console.log("─".repeat(80));

    console.log(
      `   Phase 1 (Veri Hazırlığı):      ${result.statistics.phases.phase1}ms`
    );
    console.log(
      `   Phase 2 (Başlangıç Çözümü):    ${result.statistics.phases.phase2}ms`
    );
    console.log(
      `   Phase 3 (Algoritma):           ${result.statistics.phases.phase3}ms`
    );
    console.log(
      `   Phase 4 (Final Validasyon):    ${result.statistics.phases.phase4}ms`
    );
    console.log(`   ─────────────────────────────────────────`);
    console.log(`   TOPLAM:                        ${result.duration}ms`);

    // ═══════════════════════════════════════════════════════════════════
    // 3. YERLEŞTİRME İSTATİSTİKLERİ
    // ═══════════════════════════════════════════════════════════════════
    if (result.phase2_initialSolution) {
      console.log("\n📊 YERLEŞTİRME İSTATİSTİKLERİ:");
      console.log("─".repeat(80));

      const initial = result.phase2_initialSolution;
      const successRate =
        initial.totalHours > 0
          ? ((initial.totalPlaced / initial.totalHours) * 100).toFixed(1)
          : 0;

      console.log(`   Toplam Saat: ${initial.totalHours}`);
      console.log(`   Yerleştirilen: ${initial.totalPlaced} (${successRate}%)`);
      console.log(`   Yerleştirilemedi: ${initial.totalFailed}`);
      console.log(
        `   Uygulanabilir: ${initial.feasible ? "✅ EVET" : "❌ HAYIR"}`
      );

      if (initial.phase1) {
        console.log(
          `\n   Manuel Yerleştirmeler: ${initial.phase1.placed} saat`
        );
      }
      if (initial.phase2) {
        console.log(
          `   Blok Dersler: ${initial.phase2.placed}/${
            initial.phase2.placed + initial.phase2.failed
          } saat`
        );
      }
      if (initial.phase3) {
        console.log(
          `   Kalan Dersler: ${initial.phase3.placed}/${
            initial.phase3.placed + initial.phase3.failed
          } saat`
        );
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 4. ALGORİTMA PERFORMANSI
    // ═══════════════════════════════════════════════════════════════════
    if (result.phase3_algorithmOptimization) {
      console.log("\n🤖 ALGORİTMA PERFORMANSI:");
      console.log("─".repeat(80));

      const algo = result.phase3_algorithmOptimization;
      console.log(`   Başlangıç Fitness: ${algo.initialFitness.toFixed(2)}`);
      console.log(`   Final Fitness: ${algo.finalFitness.toFixed(2)}`);
      console.log(
        `   İyileştirme: ${
          algo.improvement > 0 ? "+" : ""
        }${algo.improvement.toFixed(2)} (${(
          (algo.improvement / Math.abs(algo.initialFitness)) *
          100
        ).toFixed(1)}%)`
      );

      console.log("\n   Algoritma Detayları:");

      const algoNames = {
        ga: "Genetic Algorithm",
        sa: "Simulated Annealing",
        tabu: "Tabu Search",
        rl: "Reinforcement Learning",
        aco: "Ant Colony Optimization",
        fuzzy: "Fuzzy Logic Engine",
      };

      for (const [key, name] of Object.entries(algoNames)) {
        const algoResult = algo.algorithms[key];
        if (!algoResult) continue;

        const status = algoResult.success ? "✅" : "❌";
        const improvement =
          algoResult.improvement > 0
            ? `+${algoResult.improvement.toFixed(2)}`
            : algoResult.improvement.toFixed(2);

        console.log(
          `      ${status} ${name}: ${improvement} (${algoResult.iterations} iter, ${algoResult.duration}ms)`
        );
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 5. KALİTE METRİKLERİ
    // ═══════════════════════════════════════════════════════════════════
    if (result.statistics.quality) {
      console.log("\n✨ KALİTE METRİKLERİ:");
      console.log("─".repeat(80));

      const q = result.statistics.quality;
      console.log(
        `   Tamamlanma:    ${
          q.completeness?.toFixed(1) || 0
        }%  ${this.getQualityBar(q.completeness || 0)}`
      );
      console.log(
        `   Adalet:        ${
          q.fairness?.toFixed(1) || 0
        }/100  ${this.getQualityBar(q.fairness || 0)}`
      );
      console.log(
        `   Verimlilik:    ${
          q.efficiency?.toFixed(1) || 0
        }/100  ${this.getQualityBar(q.efficiency || 0)}`
      );
      console.log(
        `   Kısıt Uyumu:   ${
          q.compliance?.toFixed(1) || 0
        }/100  ${this.getQualityBar(q.compliance || 0)}`
      );
      console.log(
        `   Denge:         ${
          q.balance?.toFixed(1) || 0
        }/100  ${this.getQualityBar(q.balance || 0)}`
      );
      console.log(`   ─────────────────────────────────────────────────`);
      console.log(
        `   GENEL KALİTE:  ${
          q.overall?.toFixed(1) || 0
        }/100  ${this.getQualityBar(q.overall || 0)}`
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // 6. İHLALLER
    // ═══════════════════════════════════════════════════════════════════
    if (result.phase4_finalValidation) {
      console.log("\n⚠️  İHLAL DURUMU:");
      console.log("─".repeat(80));

      const v = result.phase4_finalValidation.violations;
      const totalViolations =
        v.hard.length +
        v.softHigh.length +
        v.softMedium.length +
        v.softLow.length;

      if (totalViolations === 0) {
        console.log("   ✅ HİÇ İHLAL YOK - KUSURSUZ ÇÖZÜM!");
      } else {
        console.log(
          `   Sert Kısıt:      ${v.hard.length}      ${
            v.hard.length > 0 ? "❌ KRİTİK!" : "✅"
          }`
        );
        console.log(
          `   Yumuşak Yüksek:  ${v.softHigh.length}      ${
            v.softHigh.length > 10 ? "⚠️" : "✅"
          }`
        );
        console.log(
          `   Yumuşak Orta:    ${v.softMedium.length}      ${
            v.softMedium.length > 20 ? "⚠️" : "✅"
          }`
        );
        console.log(
          `   Yumuşak Düşük:   ${v.softLow.length}      ${
            v.softLow.length > 30 ? "⚠️" : "✅"
          }`
        );
        console.log(`   ─────────────────────────────────────`);
        console.log(`   TOPLAM:          ${totalViolations}`);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 7. EKSİK DERSLER
    // ═══════════════════════════════════════════════════════════════════
    if (result.phase4_finalValidation?.missingLessons) {
      const missing = result.phase4_finalValidation.missingLessons;

      if (missing.length > 0) {
        console.log("\n❌ EKSİK DERSLER:");
        console.log("─".repeat(80));

        const totalMissing = missing.reduce(
          (sum, m) => sum + m.missingHours,
          0
        );
        console.log(
          `   Toplam: ${missing.length} ders, ${totalMissing} saat eksik`
        );

        console.log("\n   En Kritik 5 Eksik:");
        for (let i = 0; i < Math.min(5, missing.length); i++) {
          const m = missing[i];
          console.log(
            `      ${i + 1}. ${m.subjectName} (${m.className}) - ${
              m.teacherName
            }`
          );
          console.log(
            `         ${m.placedHours}/${m.requiredHours} saat (${m.missingHours} eksik)`
          );
        }
      } else {
        console.log("\n✅ EKSİK DERS YOK:");
        console.log("─".repeat(80));
        console.log("   Tüm dersler başarıyla yerleştirildi!");
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 8. ÖNERİLER
    // ═══════════════════════════════════════════════════════════════════
    if (result.phase4_finalValidation?.recommendations) {
      const recs = result.phase4_finalValidation.recommendations;

      if (recs.length > 0) {
        console.log("\n💡 ÖNERİLER:");
        console.log("─".repeat(80));

        const criticalCount = recs.filter(
          (r) => r.priority === "CRITICAL"
        ).length;
        const highCount = recs.filter((r) => r.priority === "HIGH").length;

        if (criticalCount > 0) {
          console.log(`   🔴 ${criticalCount} KRİTİK öneri`);
        }
        if (highCount > 0) {
          console.log(`   🟠 ${highCount} YÜKSEK öncelikli öneri`);
        }
        console.log(`   Toplam: ${recs.length} öneri`);

        console.log("\n   En Önemli Öneriler:");
        for (let i = 0; i < Math.min(3, recs.length); i++) {
          const rec = recs[i];
          const emoji = { CRITICAL: "🔴", HIGH: "🟠", MEDIUM: "🟡", LOW: "🟢" };
          console.log(`\n      ${emoji[rec.priority]} ${rec.title}`);
          console.log(`         ${rec.description}`);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 9. SONRAKİ ADIMLAR
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n🎯 SONRAKİ ADIMLAR:");
    console.log("─".repeat(80));

    if (result.success) {
      console.log("   ✅ Çözüm geçerli ve uygulanabilir!");
      console.log("   📄 Programı kaydedin ve kullanın");
      console.log("   📊 İstatistikleri inceleyin");
      console.log("   💾 Export/backup yapın");
    } else {
      console.log("   ⚠️  Çözüm iyileştirme gerektirir");
      console.log("   🔧 Önerileri uygulayın");
      console.log("   🔄 Algoritmayı tekrar çalıştırın");
      console.log("   ⚙️  Parametreleri ayarlayın");
    }

    // ═══════════════════════════════════════════════════════════════════
    // 10. BİTİŞ
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n" + "█".repeat(80));
    console.log(`⏰ Bitiş Zamanı: ${new Date().toLocaleString("tr-TR")}`);
    console.log(
      `⏱️  Toplam Süre: ${(result.duration / 1000).toFixed(2)} saniye`
    );
    console.log("█".repeat(80));

    if (result.success) {
      console.log("🎉 TEBRİKLER! DERS PROGRAMI BAŞARIYLA OLUŞTURULDU!");
    } else {
      console.log("⚠️  PROGRAM OLUŞTURULDU AMA İYİLEŞTİRME ÖNERİLİR");
    }

    console.log("█".repeat(80) + "\n");
  }

  /**
   * ================================================================================
   * HATA RAPORU
   * ================================================================================
   */
  printErrorReport(result, error) {
    console.log("\n" + "█".repeat(80));
    console.log("❌ SCHEDULE ALGORITHM V2 - HATA RAPORU");
    console.log("█".repeat(80));

    console.log("\n🔴 HATA DETAYLARI:");
    console.log("─".repeat(80));
    console.log(`   Hata Mesajı: ${error.message}`);
    console.log(`   Hata Yeri: ${error.stack?.split("\n")[1] || "Bilinmiyor"}`);
    console.log(`   Süre: ${result.duration}ms`);

    console.log("\n📊 TAMAMLANAN PHASE'LER:");
    console.log("─".repeat(80));
    console.log(`   Phase 1: ${result.phase1_dataPreparation ? "✅" : "❌"}`);
    console.log(`   Phase 2: ${result.phase2_initialSolution ? "✅" : "❌"}`);
    console.log(
      `   Phase 3: ${result.phase3_algorithmOptimization ? "✅" : "❌"}`
    );
    console.log(`   Phase 4: ${result.phase4_finalValidation ? "✅" : "❌"}`);

    console.log("\n💡 ÖNERİLER:");
    console.log("─".repeat(80));
    console.log("   1. Veri girişlerini kontrol edin");
    console.log("   2. Kısıtların çakışmadığından emin olun");
    console.log("   3. Debug mode'da tekrar çalıştırın");
    console.log("   4. Log dosyalarını inceleyin");

    console.log("\n█".repeat(80) + "\n");
  }

  /**
   * ================================================================================
   * KALİTE BARI GÖRSELLEŞTİRME
   * ================================================================================
   */
  getQualityBar(value) {
    const barLength = 20;
    const filledLength = Math.round((value / 100) * barLength);
    const emptyLength = barLength - filledLength;

    let bar = "[";

    // Renk belirleme (console için)
    if (value >= 80) {
      bar += "█".repeat(filledLength);
    } else if (value >= 60) {
      bar += "▓".repeat(filledLength);
    } else if (value >= 40) {
      bar += "▒".repeat(filledLength);
    } else {
      bar += "░".repeat(filledLength);
    }

    bar += " ".repeat(emptyLength);
    bar += "]";

    return bar;
  }

  /**
   * ================================================================================
   * DEBUG MOD RAPORU
   * ================================================================================
   */
  printDebugReport() {
    if (!this.settings.debug) return;

    console.log("\n" + "═".repeat(80));
    console.log("🔍 DEBUG RAPORU");
    console.log("═".repeat(80));

    console.log("\n📝 LOG GEÇMİŞİ:");
    console.log("─".repeat(80));

    // Son 50 log
    const recentLogs = this.debugLog.slice(-50);

    for (const log of recentLogs) {
      const emoji = this.logLevels[log.level] || "📝";
      console.log(`${emoji} [${log.timestamp}] ${log.module}: ${log.message}`);
    }

    console.log("\n═".repeat(80));
  }

  /**
   * ================================================================================
   * EXPORT FONKSİYONU - SONUCU KAYDET
   * ================================================================================
   */
  exportResult(result, format = "json") {
    console.log("\n💾 SONUÇ EXPORT EDİLİYOR...");

    const exportData = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: "2.0",
        algorithm: "ScheduleAlgorithmV2",
      },
      result: result,
      schedule: result.best.schedule,
      settings: this.settings,
    };

    if (format === "json") {
      return JSON.stringify(exportData, null, 2);
    } else if (format === "csv") {
      // CSV export (basit versiyon)
      return this.exportToCSV(result.best.schedule);
    }

    return exportData;
  }

  /**
   * ================================================================================
   * CSV EXPORT
   * ================================================================================
   */
  exportToCSV(schedule) {
    let csv = "Sınıf,Gün,Saat,Ders,Öğretmen\n";

    for (const classId in schedule) {
      const className =
        this.classes.find((c) => c.id === classId)?.name || classId;

      for (let day = 1; day <= 5; day++) {
        for (let hour = 1; hour <= 8; hour++) {
          const lesson = schedule[classId]?.[day]?.[hour];

          if (lesson) {
            const teacherName =
              this.teacherMetadata[lesson.teacherId]?.name || "?";
            csv += `${className},${this.getDayName(day)},${hour},${
              lesson.subjectName
            },${teacherName}\n`;
          }
        }
      }
    }

    return csv;
  }

  /**
   * ================================================================================
   * BÖLÜM 10 BİTTİ - TÜM SİSTEM TAMAMLANDI! 🎉
   * ================================================================================
   */
} // Class sonu

// Export
if (typeof module !== "undefined" && module.exports) {
  module.exports = ScheduleAlgorithmV2;
}
