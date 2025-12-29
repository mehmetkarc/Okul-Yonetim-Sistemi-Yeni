/**
 * ============================================
 * SOLVER PIPELINE - 4 Aşamalı Çözüm Sistemi
 * ============================================
 * Dağıtımı 4 aşamada gerçekleştirir:
 * 1. Preprocessing (Ön işleme)
 * 2. Initial Solution (İlk çözüm)
 * 3. Optimization (İyileştirme)
 * 4. Validation (Doğrulama)
 *
 * V2 ÖZELLİKLERİ:
 * - Dinamik Stage Ekleme/Çıkarma
 * - Esnek Pipeline Yapısı
 * - Stage Sıralama
 * - Conditional Execution
 * - Advanced Error Handling
 * * GÜNCELLEMELER:
 * - Optimization aşamasına Hard Constraint ihlali cezası eklendi.
 * - Local Search (trySwap, tryMove, tryReduceGaps) fonksiyonları Hard Constraint kontrolü için güncellendi.
 */

class SolverPipeline {
  constructor(config = {}) {
    this.config = {
      maxRetries: 3,
      timeoutPerStage: 30000, // 30 saniye
      enableParallel: false,
      strictMode: true,
      enableLogging: true,
      enableMetrics: true,
      ...config,
    };

    // Dinamik stage sistemi
    this.stages = [];
    this.stageMap = new Map();
    this.stageOrder = [];

    // Built-in stages (opsiyonel)
    this.builtInStages = {
      preprocessing: null,
      initialSolution: null,
      optimization: null,
      validation: null,
    };

    this.metrics = {
      totalTime: 0,
      stageTime: {},
      retries: {},
      success: false,
      stageResults: {},
    };

    this.executionHistory = [];
    this.currentStage = null;

    if (this.config.enableLogging) {
      console.log("🔄 SolverPipeline V2 başlatıldı");
      console.log("  • Dinamik Stage Support: ENABLED");
      console.log("  • Max Retries:", this.config.maxRetries);
      console.log("  • Timeout:", this.config.timeoutPerStage + "ms");
    }
  }

  // ============================================
  // STAGE MANAGEMENT - YENİ!
  // ============================================

  /**
   * Yeni bir stage ekler
   * @param {string} name - Stage adı
   * @param {Function} handler - Stage fonksiyonu
   * @param {Object} options - Stage seçenekleri
   */
  addStage(name, handler, options = {}) {
    if (!name || typeof name !== "string") {
      throw new Error("Stage name must be a non-empty string");
    }

    if (typeof handler !== "function") {
      throw new Error("Stage handler must be a function");
    }

    if (this.stageMap.has(name)) {
      if (this.config.enableLogging) {
        console.warn(`⚠️ Stage '${name}' zaten var, üzerine yazılıyor`);
      }
    }

    const stage = {
      name,
      handler,
      options: {
        enabled: true,
        required: true,
        timeout: this.config.timeoutPerStage,
        maxRetries: this.config.maxRetries,
        condition: null, // Koşullu çalıştırma için
        ...options,
      },
      metadata: {
        addedAt: Date.now(),
        executionCount: 0,
        lastExecuted: null,
        lastDuration: null,
        lastResult: null,
      },
    };

    this.stageMap.set(name, stage);

    // Order'a ekle (eğer yoksa)
    if (!this.stageOrder.includes(name)) {
      this.stageOrder.push(name);
    }

    if (this.config.enableLogging) {
      console.log(`  ✅ Stage eklendi: '${name}'`);
    }

    return this;
  }

  /**
   * Stage'i kaldırır
   */
  removeStage(name) {
    if (!this.stageMap.has(name)) {
      if (this.config.enableLogging) {
        console.warn(`⚠️ Stage '${name}' bulunamadı`);
      }
      return false;
    }

    this.stageMap.delete(name);
    const index = this.stageOrder.indexOf(name);
    if (index > -1) {
      this.stageOrder.splice(index, 1);
    }

    if (this.config.enableLogging) {
      console.log(`  🗑️ Stage kaldırıldı: '${name}'`);
    }

    return true;
  }

  /**
   * Stage'i aktif/pasif yapar
   */
  toggleStage(name, enabled = true) {
    const stage = this.stageMap.get(name);
    if (!stage) {
      throw new Error(`Stage '${name}' bulunamadı`);
    }

    stage.options.enabled = enabled;

    if (this.config.enableLogging) {
      console.log(`  🔄 Stage '${name}' ${enabled ? "aktif" : "pasif"} edildi`);
    }

    return this;
  }

  /**
   * Stage sırasını değiştirir
   */
  setStageOrder(order) {
    if (!Array.isArray(order)) {
      throw new Error("Order must be an array");
    }

    // Tüm stage'lerin var olduğunu kontrol et
    for (const name of order) {
      if (!this.stageMap.has(name)) {
        throw new Error(`Stage '${name}' bulunamadı`);
      }
    }

    this.stageOrder = [...order];

    if (this.config.enableLogging) {
      console.log("  🔄 Stage sırası güncellendi:", this.stageOrder);
    }

    return this;
  }

  /**
   * Belirli bir stage'den sonra yeni stage ekler
   */
  addStageAfter(afterStageName, name, handler, options = {}) {
    this.addStage(name, handler, options);

    const afterIndex = this.stageOrder.indexOf(afterStageName);
    if (afterIndex === -1) {
      throw new Error(`Stage '${afterStageName}' bulunamadı`);
    }

    // Önce sıradan çıkar
    const nameIndex = this.stageOrder.indexOf(name);
    if (nameIndex > -1) {
      this.stageOrder.splice(nameIndex, 1);
    }

    // Sonra istenen yerden sonra ekle
    this.stageOrder.splice(afterIndex + 1, 0, name);

    if (this.config.enableLogging) {
      console.log(
        `  ✅ Stage '${name}' → '${afterStageName}' sonrasına eklendi`
      );
    }

    return this;
  }

  /**
   * Belirli bir stage'den önce yeni stage ekler
   */
  addStageBefore(beforeStageName, name, handler, options = {}) {
    this.addStage(name, handler, options);

    const beforeIndex = this.stageOrder.indexOf(beforeStageName);
    if (beforeIndex === -1) {
      throw new Error(`Stage '${beforeStageName}' bulunamadı`);
    }

    // Önce sıradan çıkar
    const nameIndex = this.stageOrder.indexOf(name);
    if (nameIndex > -1) {
      this.stageOrder.splice(nameIndex, 1);
    }

    // Sonra istenen yerden önce ekle
    this.stageOrder.splice(beforeIndex, 0, name);

    if (this.config.enableLogging) {
      console.log(
        `  ✅ Stage '${name}' → '${beforeStageName}' öncesine eklendi`
      );
    }

    return this;
  }

  /**
   * Tüm stage'leri listeler
   */
  getStages() {
    return this.stageOrder.map((name) => {
      const stage = this.stageMap.get(name);
      return {
        name: stage.name,
        enabled: stage.options.enabled,
        required: stage.options.required,
        executionCount: stage.metadata.executionCount,
        lastDuration: stage.metadata.lastDuration,
      };
    });
  }

  /**
   * Belirli bir stage bilgisini döndürür
   */
  getStage(name) {
    return this.stageMap.get(name);
  }

  /**
   * Stage var mı kontrol eder
   */
  hasStage(name) {
    return this.stageMap.has(name);
  }

  /**
   * Tüm stage'leri temizler
   */
  clearStages() {
    this.stages = [];
    this.stageMap.clear();
    this.stageOrder = [];

    if (this.config.enableLogging) {
      console.log("  🗑️ Tüm stage'ler temizlendi");
    }

    return this;
  }

  /**
   * Stage istatistiklerini döndürür
   */
  getStageStats(name) {
    const stage = this.stageMap.get(name);
    if (!stage) return null;

    return {
      name: stage.name,
      executionCount: stage.metadata.executionCount,
      lastExecuted: stage.metadata.lastExecuted,
      lastDuration: stage.metadata.lastDuration,
      lastResult: stage.metadata.lastResult,
      averageDuration:
        this.metrics.stageTime[name] / (stage.metadata.executionCount || 1),
    };
  }

  // ============================================
  // PIPELINE EXECUTION - YENİ EXECUTE METODU!
  // ============================================

  /**
   * Pipeline'ı çalıştırır (dinamik stage'lerle)
   */
  async execute(data, options = {}) {
    console.log("\n" + "=".repeat(60));
    console.log("🔄 SOLVER PIPELINE EXECUTION BAŞLADI");
    console.log("=".repeat(60));

    const startTime = Date.now();
    const result = {
      success: false,
      data: null,
      stages: {},
      errors: [],
      warnings: [],
      metrics: {},
    };

    try {
      // Çalıştırılabilir stage'leri bul
      const executableStages = this.getExecutableStages();

      if (executableStages.length === 0) {
        throw new Error("Çalıştırılabilir stage bulunamadı");
      }

      console.log(`\n📋 ${executableStages.length} stage çalıştırılacak:`);
      executableStages.forEach((stage, i) => {
        console.log(`  ${i + 1}. ${stage.name}`);
      });

      let currentData = data;

      // Her stage'i sırayla çalıştır
      for (let i = 0; i < executableStages.length; i++) {
        const stage = executableStages[i];

        console.log(`\n${"=".repeat(60)}`);
        console.log(
          `📦 STAGE ${i + 1}/${
            executableStages.length
          }: ${stage.name.toUpperCase()}`
        );
        console.log("=".repeat(60));

        this.currentStage = stage.name;

        // Condition kontrolü
        if (stage.options.condition) {
          const shouldExecute = await this.evaluateCondition(
            stage.options.condition,
            currentData,
            result
          );

          if (!shouldExecute) {
            console.log(`  ⏭️ Stage atlandı (condition: false)`);
            result.stages[stage.name] = {
              success: true,
              skipped: true,
              reason: "condition_not_met",
            };
            continue;
          }
        }

        // Stage'i çalıştır
        const stageResult = await this.executeStage(
          stage,
          currentData,
          options
        );

        result.stages[stage.name] = stageResult;

        // Başarısız ve required ise dur
        if (!stageResult.success) {
          if (stage.options.required) {
            throw new Error(
              `Required stage '${stage.name}' başarısız: ${stageResult.error}`
            );
          } else {
            console.log(
              `  ⚠️ Stage başarısız ama required değil, devam ediliyor`
            );
            result.warnings.push({
              stage: stage.name,
              message: stageResult.error,
            });
          }
        }

        // Data'yı güncelle
        if (stageResult.data !== undefined) {
          currentData = stageResult.data;
        }

        // Metadata güncelle
        stage.metadata.executionCount++;
        stage.metadata.lastExecuted = Date.now();
        stage.metadata.lastDuration = stageResult.duration;
        stage.metadata.lastResult = stageResult.success ? "success" : "failed";
      }

      // Başarılı!
      result.success = true;
      result.data = currentData;
      result.solution = currentData; // ✅ EKLE - Hem data hem solution olarak döndür
      this.metrics.totalTime = Date.now() - startTime;
      this.metrics.success = true;

      // Execution history'ye ekle
      this.executionHistory.push({
        timestamp: Date.now(),
        duration: this.metrics.totalTime,
        success: true,
        stageCount: executableStages.length,
      });

      console.log("\n" + "=".repeat(60));
      console.log("✅ PIPELINE EXECUTION BAŞARIYLA TAMAMLANDI");
      console.log(`⏱️ Toplam Süre: ${this.formatTime(this.metrics.totalTime)}`);
      console.log(`📊 Çalıştırılan Stage: ${executableStages.length}`);
      console.log("=".repeat(60) + "\n");

      return result;
    } catch (error) {
      console.error("\n❌ PIPELINE EXECUTION HATASI:", error.message);

      result.success = false;
      result.error = error.message;
      result.errors.push({
        stage: this.currentStage,
        message: error.message,
        timestamp: Date.now(),
      });

      this.metrics.totalTime = Date.now() - startTime;
      this.metrics.success = false;

      // Execution history'ye ekle
      this.executionHistory.push({
        timestamp: Date.now(),
        duration: this.metrics.totalTime,
        success: false,
        error: error.message,
        stageCount: 0,
      });

      return result;
    } finally {
      this.currentStage = null;
    }
  }

  /**
   * Çalıştırılabilir stage'leri döndürür
   */
  getExecutableStages() {
    const executable = [];

    for (const name of this.stageOrder) {
      const stage = this.stageMap.get(name);

      if (!stage) {
        console.warn(`⚠️ Stage '${name}' bulunamadı, atlanıyor`);
        continue;
      }

      if (!stage.options.enabled) {
        if (this.config.enableLogging) {
          console.log(`  ⏭️ Stage '${name}' disabled, atlanıyor`);
        }
        continue;
      }

      executable.push(stage);
    }

    return executable;
  }

  /**
   * Condition'ı değerlendirir
   */
  async evaluateCondition(condition, data, result) {
    if (typeof condition === "function") {
      try {
        return await condition(data, result);
      } catch (error) {
        console.error("Condition evaluation error:", error);
        return false;
      }
    }

    return !!condition;
  }

  /**
   * Tek bir stage'i çalıştırır
   */
  async executeStage(stage, data, options) {
    const startTime = Date.now();
    const maxRetries = stage.options.maxRetries;

    this.metrics.retries[stage.name] = 0;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`  🔄 Deneme ${attempt}/${maxRetries}`);

        // Timeout kontrolü ile çalıştır
        const result = await this.runWithTimeout(
          () => stage.handler(data, options),
          stage.options.timeout
        );

        const duration = Date.now() - startTime;

        // Metrics güncelle
        if (!this.metrics.stageTime[stage.name]) {
          this.metrics.stageTime[stage.name] = 0;
        }
        this.metrics.stageTime[stage.name] += duration;

        console.log(`  ✅ Başarılı (${this.formatTime(duration)})`);

        // Callback varsa çağır
        if (options.onStageComplete) {
          options.onStageComplete({
            stage: stage.name,
            success: true,
            result,
            duration,
            attempt,
          });
        }

        return {
          success: true,
          data: result.data !== undefined ? result.data : result,
          duration,
          attempts: attempt,
          ...result,
        };
      } catch (error) {
        console.log(`  ❌ Deneme ${attempt} başarısız: ${error.message}`);
        this.metrics.retries[stage.name] = attempt;

        if (attempt === maxRetries) {
          const duration = Date.now() - startTime;

          if (options.onStageComplete) {
            options.onStageComplete({
              stage: stage.name,
              success: false,
              error: error.message,
              duration,
              attempt,
            });
          }

          return {
            success: false,
            error: error.message,
            duration,
            attempts: attempt,
          };
        }

        // Kısa bekleme (exponential backoff)
        await this.sleep(500 * attempt);
      }
    }
  }

  // ============================================
  // ESKİ ANA PIPELINE FONKSİYONU (BACKWARD COMPATIBILITY)
  // ============================================

  async solve(data, callbacks = {}) {
    console.log("\n" + "=".repeat(60));
    console.log("🔄 SOLVER PIPELINE BAŞLADI (Legacy Mode)");
    console.log("=".repeat(60));

    const startTime = Date.now();
    const result = {
      success: false,
      solution: null,
      metrics: this.metrics,
      stages: {},
      errors: [],
    };

    try {
      // STAGE 1: PREPROCESSING
      console.log("\n📦 STAGE 1: PREPROCESSING");
      this.currentStage = "preprocessing"; // 🌟 GÜNCELLEME: currentStage ataması
      const preprocessResult = await this.runStage(
        "preprocessing",
        () => this.preprocessingStage(data),
        callbacks.onPreprocessing
      );
      this.currentStage = null; // 🌟 GÜNCELLEME

      if (!preprocessResult.success) {
        throw new Error("Preprocessing başarısız: " + preprocessResult.error);
      }

      result.stages.preprocessing = preprocessResult;
      const processedData = preprocessResult.data;

      // STAGE 2: INITIAL SOLUTION
      console.log("\n🎯 STAGE 2: INITIAL SOLUTION");
      this.currentStage = "initialSolution"; // 🌟 GÜNCELLEME: currentStage ataması
      const initialResult = await this.runStage(
        "initialSolution",
        () => this.initialSolutionStage(processedData),
        callbacks.onInitialSolution
      );
      this.currentStage = null; // 🌟 GÜNCELLEME

      if (!initialResult.success) {
        throw new Error("Initial solution başarısız: " + initialResult.error);
      }

      result.stages.initialSolution = initialResult;
      let solution = initialResult.solution;

      // STAGE 3: OPTIMIZATION
      console.log("\n⚡ STAGE 3: OPTIMIZATION");
      this.currentStage = "optimization"; // 🌟 GÜNCELLEME: currentStage ataması
      const optimizationResult = await this.runStage(
        "optimization",
        () => this.optimizationStage(solution, processedData),
        callbacks.onOptimization
      );
      this.currentStage = null; // 🌟 GÜNCELLEME

      if (optimizationResult.success) {
        solution = optimizationResult.solution;
        result.stages.optimization = optimizationResult;
      } else {
        console.log("⚠️ Optimizasyon başarısız, ilk çözüm kullanılıyor");
        result.stages.optimization = {
          success: false,
          error: optimizationResult.error,
        };
      }

      // STAGE 4: VALIDATION
      console.log("\n✅ STAGE 4: VALIDATION");
      this.currentStage = "validation"; // 🌟 GÜNCELLEME: currentStage ataması
      const validationResult = await this.runStage(
        "validation",
        () => this.validationStage(solution, processedData),
        callbacks.onValidation
      );
      this.currentStage = null; // 🌟 GÜNCELLEME

      result.stages.validation = validationResult;

      if (!validationResult.success) {
        if (this.config.strictMode) {
          throw new Error("Validation başarısız: " + validationResult.error);
        } else {
          console.log(
            "⚠️ Validation başarısız ama strict mode kapalı, devam ediliyor"
          );
        }
      }

      // Başarılı!
      result.success = true;
      result.solution = solution;
      this.metrics.totalTime = Date.now() - startTime;
      this.metrics.success = true;

      console.log("\n" + "=".repeat(60));
      console.log("✅ PIPELINE BAŞARIYLA TAMAMLANDI");
      console.log(`⏱️ Toplam Süre: ${this.formatTime(this.metrics.totalTime)}`);
      console.log("=".repeat(60) + "\n");

      return result;
    } catch (error) {
      console.error("\n❌ PIPELINE HATASI:", error.message);

      result.success = false;
      result.error = error.message;
      result.errors.push({
        stage: this.getCurrentStage(),
        message: error.message,
        timestamp: Date.now(),
      });

      this.metrics.totalTime = Date.now() - startTime;
      this.metrics.success = false;

      return result;
    } finally {
      this.currentStage = null;
    }
  }

  // ============================================
  // STAGE RUNNER (Her aşama için ortak)
  // ============================================

  async runStage(stageName, stageFunction, callback) {
    const startTime = Date.now();
    const maxRetries = this.config.maxRetries;

    this.metrics.retries[stageName] = 0;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`  🔄 Deneme ${attempt}/${maxRetries}`);

        // Timeout kontrolü ile çalıştır
        const result = await this.runWithTimeout(
          stageFunction,
          this.config.timeoutPerStage
        );

        const duration = Date.now() - startTime;
        this.metrics.stageTime[stageName] = duration;

        console.log(`  ✅ Başarılı (${this.formatTime(duration)})`);

        if (callback) {
          callback({ success: true, result, duration, attempt });
        }

        return {
          success: true,
          ...result,
          duration,
          attempts: attempt,
        };
      } catch (error) {
        console.log(`  ❌ Deneme ${attempt} başarısız: ${error.message}`);
        this.metrics.retries[stageName] = attempt;

        if (attempt === maxRetries) {
          const duration = Date.now() - startTime;
          this.metrics.stageTime[stageName] = duration;

          if (callback) {
            callback({
              success: false,
              error: error.message,
              duration,
              attempt,
            });
          }

          return {
            success: false,
            error: error.message,
            duration,
            attempts: attempt,
          };
        }

        // Kısa bekleme
        await this.sleep(500 * attempt);
      }
    }
  }

  // ============================================
  // STAGE 1: PREPROCESSING
  // ============================================

  async preprocessingStage(data) {
    console.log("  📋 Veriler hazırlanıyor...");

    const processed = {
      lessons: [],
      classes: data.classes || [],
      teachers: data.teachers || [],
      constraints: {},
      metadata: {},
    };

    // 1. Dersleri işle
    if (!data.lessons || data.lessons.length === 0) {
      throw new Error("Dağıtılacak ders bulunamadı");
    }

    processed.lessons = data.lessons.map((lesson, index) => ({
      ...lesson,
      id: lesson.id || `lesson_${index}`,
      priority: this.calculateLessonPriority(lesson),
      constraints: this.extractLessonConstraints(lesson),
    }));

    console.log(`    ✅ ${processed.lessons.length} ders işlendi`);

    // 2. Kısıtları topla
    processed.constraints = {
      hard: this.collectHardConstraints(data),
      soft: this.collectSoftConstraints(data),
    };

    console.log(
      `    ✅ ${processed.constraints.hard.length} hard, ${processed.constraints.soft.length} soft kısıt`
    );

    // 3. Metadata oluştur
    processed.metadata = {
      totalSlots: processed.classes.length * 5 * 8,
      totalLessons: processed.lessons.length,
      fillRate: (
        (processed.lessons.length / (processed.classes.length * 5 * 8)) *
        100
      ).toFixed(1),
      processedAt: new Date().toISOString(),
    };

    console.log(`    📊 Doluluk oranı: ${processed.metadata.fillRate}%`);

    // 4. Constraint preprocessor çalıştır (varsa)
    if (window.ConstraintPreprocessor) {
      const preprocessor = new window.ConstraintPreprocessor();
      processed.preprocessed = await preprocessor.preprocess(processed);
      console.log("    ✅ Constraint preprocessor çalıştı");
    }

    return { data: processed };
  }

  calculateLessonPriority(lesson) {
    let priority = 100;

    // Blok derslere öncelik
    if (lesson.blockSize > 1) priority += 50;

    // Sınırlı öğretmenlere öncelik
    if (lesson.teacherId) priority += 30;

    // Sabah derslerine öncelik
    if (lesson.preferredTime && lesson.preferredTime <= 4) priority += 20;

    return priority;
  }

  extractLessonConstraints(lesson) {
    const constraints = [];

    // Öğretmen kısıtları
    if (window.PreferenceManager && lesson.teacherId) {
      const prefs = window.PreferenceManager.getTeacherPreferences(
        lesson.teacherId
      );
      if (prefs) {
        constraints.push({ type: "teacher_preference", data: prefs });
      }
    }

    // Blok kısıtları
    if (lesson.blockSize > 1) {
      constraints.push({
        type: "block",
        size: lesson.blockSize,
        mustBeConsecutive: true,
      });
    }

    return constraints;
  }

  collectHardConstraints(data) {
    const hard = [];

    // Öğretmen çakışması yasak
    hard.push({
      type: "teacher_conflict",
      priority: 1000,
      validator: (solution, lesson, day, time) => {
        return !this.isTeacherBusy(solution, lesson.teacherId, day, time);
      },
    });

    // Sınıf çakışması yasak
    hard.push({
      type: "class_conflict",
      priority: 1000,
      validator: (solution, lesson, day, time) => {
        return !solution[lesson.classId]?.[day]?.[time];
      },
    });

    // Blok bütünlüğü
    hard.push({
      type: "block_integrity",
      priority: 800,
      validator: (solution, lesson, day, time) => {
        if (lesson.blockSize <= 1) return true;

        for (let i = 1; i < lesson.blockSize; i++) {
          if (solution[lesson.classId]?.[day]?.[time + i]) {
            return false;
          }
        }
        return true;
      },
    });

    return hard;
  }

  collectSoftConstraints(data) {
    const soft = [];

    // Boşluk minimizasyonu
    soft.push({
      type: "minimize_gaps",
      weight: 50,
      evaluator: (solution) => {
        let gaps = 0;
        for (const classId in solution) {
          for (const day in solution[classId]) {
            const times = Object.keys(solution[classId][day])
              .map(Number)
              .sort((a, b) => a - b);
            for (let i = 0; i < times.length - 1; i++) {
              gaps += times[i + 1] - times[i] - 1;
            }
          }
        }
        return -gaps * 10; // Negatif çünkü minimize etmek istiyoruz
      },
    });

    // Öğretmen tercihleri
    soft.push({
      type: "teacher_preferences",
      weight: 80,
      evaluator: (solution) => {
        let score = 0;
        if (window.PreferenceManager) {
          for (const classId in solution) {
            for (const day in solution[classId]) {
              for (const time in solution[classId][day]) {
                const lesson = solution[classId][day][time];
                if (
                  window.PreferenceManager.saatMusaitMi(
                    day,
                    time,
                    lesson.teacherId
                  )
                ) {
                  score += 10;
                }
              }
            }
          }
        }
        return score;
      },
    });

    return soft;
  }

  isTeacherBusy(solution, teacherId, day, time) {
    for (const classId in solution) {
      if (solution[classId]?.[day]?.[time]?.teacherId === teacherId) {
        return true;
      }
    }
    return false;
  }

  // ============================================
  // STAGE 2: INITIAL SOLUTION
  // ============================================

  async initialSolutionStage(processedData) {
    console.log("  🎯 İlk çözüm oluşturuluyor...");

    const solution = {};

    // Boş program yapısı oluştur
    for (const cls of processedData.classes) {
      solution[cls.id] = {};
      for (let day = 1; day <= 5; day++) {
        solution[cls.id][day] = {};
      }
    }

    // Dersleri öncelik sırasına göre sırala
    const sortedLessons = [...processedData.lessons].sort(
      (a, b) => b.priority - a.priority
    );

    console.log(`    📋 ${sortedLessons.length} ders yerleştirilecek`);

    let placedCount = 0;
    let failedCount = 0;

    // Her dersi yerleştirmeye çalış
    for (const lesson of sortedLessons) {
      const placed = await this.placeLessonGreedy(
        solution,
        lesson,
        processedData
      );

      if (placed) {
        placedCount++;
      } else {
        failedCount++;
        console.log(
          `    ⚠️ Yerleştirilemedi: ${lesson.subjectName} (${lesson.className})`
        );
      }
    }

    console.log(`    ✅ Yerleştirilen: ${placedCount}`);
    console.log(`    ❌ Başarısız: ${failedCount}`);

    if (placedCount === 0) {
      throw new Error("Hiçbir ders yerleştirilemedi");
    }

    return {
      solution,
      stats: {
        placed: placedCount,
        failed: failedCount,
        successRate: ((placedCount / sortedLessons.length) * 100).toFixed(1),
      },
    };
  }

  async placeLessonGreedy(solution, lesson, processedData) {
    // Tüm olası slotları dene
    const slots = [];

    for (let day = 1; day <= 5; day++) {
      for (let time = 1; time <= 8; time++) {
        if (this.canPlaceLesson(solution, lesson, day, time, processedData)) {
          const score = this.scoreSlot(
            solution,
            lesson,
            day,
            time,
            processedData
          );
          slots.push({ day, time, score });
        }
      }
    }

    if (slots.length === 0) {
      return false;
    }

    // En iyi slotu seç
    slots.sort((a, b) => b.score - a.score);
    const best = slots[0];

    // Yerleştir
    this.placeLesson(solution, lesson, best.day, best.time);

    return true;
  }

  canPlaceLesson(solution, lesson, day, time, processedData) {
    // Hard constraint kontrolü
    for (const constraint of processedData.constraints.hard) {
      if (!constraint.validator(solution, lesson, day, time)) {
        return false;
      }
    }

    // Blok için tüm saatleri kontrol
    if (lesson.blockSize > 1) {
      if (time + lesson.blockSize - 1 > 8) {
        return false;
      }

      for (let i = 1; i < lesson.blockSize; i++) {
        // Not: Blok dersin sonraki saatleri için sadece çakışma kontrolü yapılmalı
        // çünkü Hard Constraint kontrolü bir sonraki saati zaten kontrol eder.
        if (solution[lesson.classId]?.[day]?.[time + i]) {
          return false;
        }
        // Öğretmen çakışması kontrolü
        if (this.isTeacherBusy(solution, lesson.teacherId, day, time + i)) {
          return false;
        }
      }
    }

    return true;
  }

  scoreSlot(solution, lesson, day, time, processedData) {
    let score = 100;

    // Soft constraint değerlendirmesi
    // Slot skorlaması için geçici bir çözüm yaratıp sadece o anki dersin yerleşimini değerlendirmek daha doğru olurdu.
    // Ancak mevcut yapıyı koruyarak genel çözümü değerlendiriyoruz (bu maliyetli bir yaklaşımdır).
    const tempSolution = this.deepCopy(solution);
    this.placeLesson(tempSolution, lesson, day, time);

    for (const constraint of processedData.constraints.soft) {
      const constraintScore = constraint.evaluator(tempSolution);
      score += constraintScore * (constraint.weight / 100);
    }

    // Sabah saatleri bonus
    if (time <= 4) score += 20;

    // Öğleden sonra ceza
    if (time >= 6) score -= 10;

    return score;
  }

  placeLesson(solution, lesson, day, time) {
    for (let i = 0; i < (lesson.blockSize || 1); i++) {
      solution[lesson.classId][day][time + i] = {
        lessonId: lesson.id,
        subjectId: lesson.subjectId,
        subjectCode: lesson.subjectCode,
        subjectName: lesson.subjectName,
        teacherId: lesson.teacherId,
        teacherCode: lesson.teacherCode,
        teacherName: lesson.teacherName,
        classId: lesson.classId,
        className: lesson.className,
        blockIndex: i,
        blockSize: lesson.blockSize || 1,
        color: lesson.color,
      };
    }
  }

  // ============================================
  // STAGE 3: OPTIMIZATION
  // ============================================

  async optimizationStage(solution, processedData) {
    console.log("  ⚡ Çözüm optimize ediliyor...");

    let optimized = this.deepCopy(solution);
    let currentScore = this.evaluateSolution(optimized, processedData);
    let improvements = 0;

    const maxIterations = 50;

    for (let iter = 0; iter < maxIterations; iter++) {
      // Local search yap
      const improved = await this.localSearch(optimized, processedData);
      const newScore = this.evaluateSolution(improved, processedData);

      if (newScore > currentScore + 1) {
        optimized = improved;
        currentScore = newScore;
        improvements++;
        console.log(
          `    ✨ İterasyon ${iter + 1}: Skor ${currentScore.toFixed(2)}`
        );
      } else if (improvements > 0 && iter - improvements > 10) {
        console.log(`    ⏹️ ${iter + 1} iterasyonda durdu`);
        break;
      }
    }

    console.log(`    ✅ ${improvements} iyileştirme yapıldı`);

    return {
      solution: optimized,
      score: currentScore,
      improvements,
    };
  }

  async localSearch(solution, processedData) {
    const neighbors = [];

    // 1. Swap operasyonu
    // 🌟 GÜNCELLEME: processedData parametresi eklendi
    const swapped = this.trySwap(solution, processedData);
    if (swapped) neighbors.push(swapped);

    // 2. Move operasyonu
    // 🌟 GÜNCELLEME: processedData parametresi eklendi
    const moved = this.tryMove(solution, processedData);
    if (moved) neighbors.push(moved);

    // 3. Gap reduction
    // 🌟 GÜNCELLEME: processedData parametresi eklendi
    const gapReduced = this.tryReduceGaps(solution, processedData);
    if (gapReduced) neighbors.push(gapReduced);

    // En iyi komşuyu seç
    if (neighbors.length === 0) {
      return solution;
    }

    let bestNeighbor = neighbors[0];
    let bestScore = this.evaluateSolution(bestNeighbor, processedData);

    for (let i = 1; i < neighbors.length; i++) {
      const score = this.evaluateSolution(neighbors[i], processedData);
      if (score > bestScore) {
        bestNeighbor = neighbors[i];
        bestScore = score;
      }
    }

    return bestNeighbor;
  }
  // BÖLÜM 2 BAŞLANGICI

  // 🌟 GÜNCELLEME: processedData parametresi eklendi
  trySwap(solution, processedData) {
    const modified = this.deepCopy(solution);

    // Rastgele iki dersi seç ve takas et
    const lessons = this.getAllLessons(modified);
    if (lessons.length < 2) return null;

    const idx1 = Math.floor(Math.random() * lessons.length);
    const idx2 = Math.floor(Math.random() * lessons.length);

    if (idx1 === idx2) return null;

    const l1 = lessons[idx1];
    const l2 = lessons[idx2];

    // Geçici olarak yer değiştir
    const tempLesson = l1.data;
    const l1NewData = l2.data;
    const l2NewData = tempLesson;

    // Önce yerleri boşalt
    delete modified[l1.classId][l1.day][l1.time];
    delete modified[l2.classId][l2.day][l2.time];

    // Yeni yerleştirmenin Hard Constraint'leri bozup bozmadığını kontrol et
    // Basit bir takas olduğu için sadece yeni yerlerdeki çakışmaları kontrol etmek yeterli.
    const canPlaceL1 = this.canPlaceLesson(
      modified,
      l1NewData,
      l1.day,
      l1.time,
      processedData
    );
    const canPlaceL2 = this.canPlaceLesson(
      modified,
      l2NewData,
      l2.day,
      l2.time,
      processedData
    );

    if (canPlaceL1 && canPlaceL2) {
      // Yerleştirme başarılı
      this.placeLesson(modified, l1NewData, l1.day, l1.time);
      this.placeLesson(modified, l2NewData, l2.day, l2.time);
      return modified;
    }

    // Takas başarısız, orijinali geri yükle (veya sadece null döndür)
    // En basit yöntem: null döndürmek
    return null;
  }

  // 🌟 GÜNCELLEME: processedData parametresi eklendi
  tryMove(solution, processedData) {
    const modified = this.deepCopy(solution);

    // Rastgele bir dersi farklı bir slota taşı
    const lessons = this.getAllLessons(modified);
    if (lessons.length === 0) return null;

    const lesson = lessons[Math.floor(Math.random() * lessons.length)];

    // Mevcut slotu boşalt
    delete modified[lesson.classId][lesson.day][lesson.time];

    // Yeni slot bul (Rastgele bir boş slot bulmak yerine ilk boş slotu deniyoruz)
    for (let day = 1; day <= 5; day++) {
      for (let time = 1; time <= 8; time++) {
        // Sadece boş slota değil, blok dersler için yeterli boş alana bakmalıyız.
        // canPlaceLesson metodu bunu kontrol edecektir.
        if (
          this.canPlaceLesson(modified, lesson.data, day, time, processedData)
        ) {
          // Yerleştir
          this.placeLesson(modified, lesson.data, day, time);
          return modified;
        }
      }
    }

    // Yer bulunamadı, geri koy
    this.placeLesson(modified, lesson.data, lesson.day, lesson.time); // Orijinal yerine geri koy
    return null;
  }

  // 🌟 GÜNCELLEME: processedData parametresi eklendi
  tryReduceGaps(solution, processedData) {
    const modified = this.deepCopy(solution);

    for (const classId in modified) {
      for (const day in modified[classId]) {
        const times = Object.keys(modified[classId][day])
          .map(Number)
          .sort((a, b) => a - b);

        // Boşlukları kapat
        for (let i = 0; i < times.length - 1; i++) {
          const gap = times[i + 1] - times[i] - 1;

          if (gap > 0) {
            const targetTime = times[i] + 1;
            const sourceTime = times[i + 1];

            const lessonToMove = modified[classId][day][sourceTime];

            // Blok ders bütünlüğünü ve yeni yerleşimi kontrol et
            if (lessonToMove && !modified[classId][day][targetTime]) {
              // Orijinal yerden sil
              for (let k = 0; k < lessonToMove.blockSize; k++) {
                delete modified[classId][day][sourceTime + k];
              }

              // Yeni pozisyon için Hard Constraint kontrolü
              if (
                this.canPlaceLesson(
                  modified,
                  lessonToMove,
                  day,
                  targetTime,
                  processedData
                )
              ) {
                // Yeni pozisyona yerleştir
                this.placeLesson(modified, lessonToMove, day, targetTime);
                return modified; // İlk başarılı hamleden sonra dön
              } else {
                // Başarısız oldu, orijinali geri koy. (Bu adımda sadece hareket ettirilen dersi geri koymak yeterli)
                this.placeLesson(modified, lessonToMove, day, sourceTime);
              }
            }
          }
        }
      }
    }

    return null;
  }

  getAllLessons(solution) {
    const lessons = [];

    for (const classId in solution) {
      for (const day in solution[classId]) {
        for (const time in solution[classId][day]) {
          const lesson = solution[classId][day][time];
          // Sadece blok dersin ilk saati için ekle, tekrar eden blok dersleri atla
          if (lesson.blockIndex === 0 || lesson.blockSize === 1) {
            lessons.push({
              classId,
              day: Number(day),
              time: Number(time),
              data: lesson,
            });
          }
        }
      }
    }

    return lessons;
  }

  // 🌟 YENİ FONKSİYON: Hard Constraint ihlallerini sayar
  countHardViolations(solution, processedData) {
    let violations = 0;

    // Çözümdeki tüm yerleşimleri döngüye al
    for (const classId in solution) {
      for (const day in solution[classId]) {
        for (const time in solution[classId][day]) {
          const lesson = solution[classId][day][time];

          // Sadece blok dersin ilk saati veya tekil ders için kontrol et (tekrar sayımı önler)
          if (lesson.blockIndex === 0 || lesson.blockSize === 1) {
            for (const constraint of processedData.constraints.hard) {
              // Validator'ı çağır, Hard Constraint ihlali varsa sayacı artır
              if (!constraint.validator(solution, lesson, day, time)) {
                violations++;
              }
            }
          }
        }
      }
    }
    return violations;
  }

  // 🌟 GÜNCELLEME: Hard Constraint ihlali cezası eklendi
  evaluateSolution(solution, processedData) {
    const hardViolations = this.countHardViolations(solution, processedData);

    if (hardViolations > 0) {
      // Kritik ceza: Her ihlal için çok yüksek negatif puan
      return -10000 * hardViolations;
    }

    let score = 0;

    // Soft constraint değerlendirmesi
    for (const constraint of processedData.constraints.soft) {
      score += constraint.evaluator(solution) * (constraint.weight / 100);
    }

    return score;
  }

  // ============================================
  // STAGE 4: VALIDATION
  // ============================================

  async validationStage(solution, processedData) {
    console.log("  ✅ Çözüm doğrulanıyor...");

    const violations = [];
    const warnings = [];

    // 1. Hard constraint kontrolü
    for (const constraint of processedData.constraints.hard) {
      for (const classId in solution) {
        for (const day in solution[classId]) {
          for (const time in solution[classId][day]) {
            const lesson = solution[classId][day][time];

            if (!constraint.validator(solution, lesson, day, time)) {
              // Sadece blok dersin ilk saatinde raporla
              if (lesson.blockIndex === 0 || lesson.blockSize === 1) {
                violations.push({
                  type: constraint.type,
                  message: `${constraint.type} ihlali: ${lesson.className} - Gün ${day}, Saat ${time}`,
                  severity: "critical",
                  constraint: constraint.type,
                });
              }
            }
          }
        }
      }
    }

    console.log(`    ${violations.length} ihlal bulundu`);

    // 2. Soft constraint kontrolü
    for (const constraint of processedData.constraints.soft) {
      const score = constraint.evaluator(solution);

      if (score < 0) {
        warnings.push({
          type: constraint.type,
          message: `${constraint.type} düşük skor: ${score}`,
          severity: "warning",
        });
      }
    }

    console.log(`    ${warnings.length} uyarı bulundu`);

    // 3. İstatistikler
    const stats = {
      totalLessons: this.countLessons(solution),
      violations: violations.length,
      warnings: warnings.length,
      isValid: violations.length === 0,
    };

    if (violations.length > 0) {
      return {
        success: false,
        error: `${violations.length} kritik ihlal bulundu`,
        violations,
        warnings,
        stats,
      };
    }

    return {
      success: true,
      violations,
      warnings,
      stats,
    };
  }

  countLessons(solution) {
    let count = 0;
    for (const classId in solution) {
      for (const day in solution[classId]) {
        for (const time in solution[classId][day]) {
          const lesson = solution[classId][day][time];
          // Blok derslerin yalnızca ilk parçasını say
          if (lesson.blockIndex === 0 || lesson.blockSize === 1) {
            count++;
          }
        }
      }
    }
    return count;
  }

  // ============================================
  // YARDIMCI FONKSİYONLAR
  // ============================================

  async runWithTimeout(fn, timeout) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), timeout)
      ),
    ]);
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  getCurrentStage() {
    if (this.currentStage) return this.currentStage;

    // Legacy mode için bu kısım şu an çalışmaz, ama yine de bırakalım.
    for (const stage in this.builtInStages) {
      if (this.builtInStages[stage] === "running") {
        return stage;
      }
    }
    return "unknown";
  }

  formatTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  }

  // ============================================
  // RAPORLAMA
  // ============================================

  getReport() {
    return {
      success: this.metrics.success,
      totalTime: this.formatTime(this.metrics.totalTime),
      stages: Object.keys(this.metrics.stageTime).map((stage) => ({
        name: stage,
        duration: this.formatTime(this.metrics.stageTime[stage]),
        retries: this.metrics.retries[stage] || 0,
      })),
      metrics: this.metrics,
      stageCount: this.stageMap.size,
      executionHistory: this.executionHistory,
    };
  }

  printReport() {
    const report = this.getReport();

    console.log("\n" + "=".repeat(60));
    console.log("📊 PIPELINE RAPORU");
    console.log("=".repeat(60));

    console.log(`\n✅ Başarı: ${report.success ? "Evet" : "Hayır"}`);
    console.log(`⏱️ Toplam Süre: ${report.totalTime}`);
    console.log(`📦 Toplam Stage: ${report.stageCount}`);

    if (report.stages.length > 0) {
      console.log("\n📋 Stage Detayları:");
      report.stages.forEach((stage, i) => {
        console.log(
          `  ${i + 1}. ${stage.name}: ${stage.duration} (${
            stage.retries
          } retry)`
        );
      });
    }

    if (this.executionHistory.length > 0) {
      console.log(`\n📈 Toplam Execution: ${this.executionHistory.length} kez`);
      const successCount = this.executionHistory.filter(
        (e) => e.success
      ).length;
      console.log(
        `  • Başarılı: ${successCount} (${(
          (successCount / this.executionHistory.length) *
          100
        ).toFixed(1)}%)`
      );
    }

    console.log("=".repeat(60) + "\n");
  }

  // ============================================
  // STAGE INFO
  // ============================================

  printStageInfo() {
    console.log("\n" + "=".repeat(60));
    console.log("📦 STAGE BİLGİLERİ");
    console.log("=".repeat(60));

    if (this.stageMap.size === 0) {
      console.log("\n⚠️ Tanımlı stage yok");
    } else {
      console.log(`\n📊 Toplam Stage: ${this.stageMap.size}`);
      console.log("\n🔢 Stage Sırası:");
      this.stageOrder.forEach((name, i) => {
        console.log(`  ${i + 1}. ${name}`);
      });

      console.log("\n📋 Stage Detayları:");
      this.stageMap.forEach((stage, name) => {
        console.log(`\n  • ${name}`);
        console.log(`    Enabled: ${stage.options.enabled ? "✅" : "❌"}`);
        console.log(`    Required: ${stage.options.required ? "✅" : "❌"}`);
        console.log(`    Timeout: ${stage.options.timeout}ms`);
        console.log(`    Max Retries: ${stage.options.maxRetries}`);
        console.log(`    Execution Count: ${stage.metadata.executionCount}`);

        if (stage.metadata.lastExecuted) {
          const lastDate = new Date(stage.metadata.lastExecuted);
          console.log(`    Last Executed: ${lastDate.toLocaleString()}`);
          console.log(
            `    Last Duration: ${this.formatTime(stage.metadata.lastDuration)}`
          );
          console.log(`    Last Result: ${stage.metadata.lastResult}`);
        }
      });
    }

    console.log("\n" + "=".repeat(60) + "\n");
  }

  // ============================================
  // RESET & CLEAR
  // ============================================

  reset() {
    this.metrics = {
      totalTime: 0,
      stageTime: {},
      retries: {},
      success: false,
      stageResults: {},
    };

    this.executionHistory = [];
    this.currentStage = null;

    // Stage metadata'ları sıfırla
    this.stageMap.forEach((stage) => {
      stage.metadata.executionCount = 0;
      stage.metadata.lastExecuted = null;
      stage.metadata.lastDuration = null;
      stage.metadata.lastResult = null;
    });

    if (this.config.enableLogging) {
      console.log("🔄 Pipeline reset edildi");
    }

    return this;
  }

  fullReset() {
    this.reset();
    this.clearStages();

    if (this.config.enableLogging) {
      console.log("🔄 Pipeline full reset edildi (tüm stage'ler silindi)");
    }

    return this;
  }
}

// Global export
if (typeof window !== "undefined") {
  window.SolverPipeline = SolverPipeline;
  console.log("✅ SolverPipeline V2 (Dinamik) yüklendi");
  console.log("  • addStage() metodu eklendi");
  console.log("  • execute() metodu eklendi");
  console.log("  • Esnek stage yönetimi aktif");
}

// Node.js export
if (typeof module !== "undefined" && module.exports) {
  module.exports = SolverPipeline;
}

// 🌍 Global erişim
window.SolverPipeline = SolverPipeline;
console.log("📦 SolverPipeline V2 (Dinamik) global erişim aktif!");
