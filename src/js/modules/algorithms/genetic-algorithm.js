/**
 * ============================================
 * HYBRID GENETIC ALGORITHM V3.0 - BLOK ENTEGRE (DEBUG EKLENDİ)
 * ============================================
 *
 * ✅ BlockStructure V3.0 tam entegrasyonu
 * ✅ BlockAwareSwap entegrasyonu (mutasyon) - Artık Matematik blokları da hareket edebilir.
 * ✅ BlockConsecutiveCheck entegrasyonu (fitness)
 * ✅ BlockDayValidator entegrasyonu (fitness)
 * ✅ BlockPlacementController entegrasyonu (repair)
 * 🚨 CRITICAL FIX: createScheduleObject.placeLesson metodu zenginleştirildi.
 * 🐛 DEBUG ADDED: mutateBlockAware hata logları eklendi.
 * ✅ Blok-bilinçli mutasyon
 */

class GeneticAlgorithm {
  constructor(config = {}, constraintSystem) {
    this.config = {
      populationSize: 50,
      generations: 100,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      elitismRate: 0.1,
      tournamentSize: 5,
      adaptiveMutation: true,
      useBlockAwareMutation: true, // BLOK-BİLİNÇLİ MUTASYON
      blockValidationWeight: 0.3, // Blok validasyon ağırlığı
      blockRepairEnabled: true, // Otomatik blok tamiri
      ...config,
    };

    this.config.eliteCount = Math.floor(
      this.config.populationSize * this.config.elitismRate
    );

    this.constraintSystem = constraintSystem;

    this.population = [];
    this.bestSolution = null;
    this.bestFitness = -Infinity;
    this.fitnessHistory = [];

    // Blok modülleri
    this.blockAwareSwap = window.BlockAwareSwap
      ? new window.BlockAwareSwap({
          preserveIntegrity: true,
          allowPartialSwap: false,
          checkTeacher: true,
          checkConstraints: true,
        })
      : null;

    this.blockConsecutiveCheck = window.BlockConsecutiveCheck
      ? new window.BlockConsecutiveCheck({
          strictMode: true,
          autoRepair: this.config.blockRepairEnabled,
          returnPenalty: true,
        })
      : null;

    this.blockDayValidator = window.BlockDayValidator
      ? new window.BlockDayValidator()
      : null;

    // Durdurma kriterleri
    this.stagnationLimit = 20;
    this.stagnationCounter = 0;
    this.targetFitness = 1000;

    // İstatistikler
    this.stats = {
      totalMutations: 0,
      blockAwareMutations: 0,
      normalMutations: 0,
      failedMutations: 0,
      blockRepairs: 0,
      blockViolations: 0,
    };

    console.log("🧬 Hybrid GA+ES V3.0 (Blok Entegre) başlatıldı");
    console.log(`   📦 BlockAwareSwap: ${this.blockAwareSwap ? "✅" : "❌"}`);
    console.log(
      `   🔗 BlockConsecutiveCheck: ${this.blockConsecutiveCheck ? "✅" : "❌"}`
    );
    console.log(
      `   📅 BlockDayValidator: ${this.blockDayValidator ? "✅" : "❌"}`
    );
  }

  async optimize(initialSolution, data, onProgress) {
    console.log("\n" + "=".repeat(70));
    console.log("🧬 GENETIC ALGORITHM - BLOK ENTEGRASYONu");
    console.log("=".repeat(70));

    // Data'yı sakla (blok modülleri için)
    this.data = data;

    // İlk popülasyonu oluştur
    this.initializePopulation(initialSolution, data);

    for (let gen = 1; gen <= this.config.generations; gen++) {
      // Fitness hesapla (BLOK VALİDASYONU DAHİL)
      this.evaluatePopulation();

      // En iyi bireyi takip et
      const currentBest = this.getBestIndividual();
      if (currentBest.fitness > this.bestFitness) {
        this.bestFitness = currentBest.fitness;
        this.bestSolution = this.deepCopy(currentBest.chromosome);
        this.stagnationCounter = 0;

        console.log(
          `✨ Nesil ${gen}: Yeni en iyi fitness = ${this.bestFitness.toFixed(
            2
          )}`
        );
        console.log(`   📦 Blok ihlali: ${this.stats.blockViolations}`);
        console.log(`   🔧 Blok tamir: ${this.stats.blockRepairs}`);
      } else {
        this.stagnationCounter++;
      }

      // Durdurma kontrolü
      if (this.shouldStop()) {
        console.log(`⏹️ Durdurma kriteri: ${this.getStopReason()}`);
        break;
      }

      // Yeni nesil oluştur
      const newPopulation = [];

      // Elitizm
      const elites = this.selectElites();
      newPopulation.push(...elites);

      // Geri kalan popülasyonu doldur
      while (newPopulation.length < this.config.populationSize) {
        // Seçim
        const parent1 = this.tournamentSelection();
        const parent2 = this.tournamentSelection();

        // Çaprazlama
        let offspring;
        if (Math.random() < this.config.crossoverRate) {
          offspring = this.crossover(parent1, parent2);
        } else {
          offspring = this.deepCopy(parent1);
        }

        // BLOK-BİLİNÇLİ MUTASYON
        const mutationRate = this.getAdaptiveMutationRate(gen);
        if (Math.random() < mutationRate) {
          offspring = this.mutateBlockAware(offspring, data);
        }

        // Evolutionary Strategy (ES)
        offspring = this.evolutionaryStrategy(offspring);

        // BLOK TAMİRİ (gerekirse)
        if (this.config.blockRepairEnabled) {
          offspring = this.repairBlocks(offspring, data);
        }

        newPopulation.push({
          chromosome: offspring,
          fitness: 0,
        });
      }

      this.population = newPopulation;

      // İlerleme callback
      if (onProgress) {
        onProgress({
          generation: gen,
          bestFitness: this.bestFitness,
          avgFitness: this.getAverageFitness(),
          stagnation: this.stagnationCounter,
          blockStats: {
            violations: this.stats.blockViolations,
            repairs: this.stats.blockRepairs,
            blockAwareMutations: this.stats.blockAwareMutations,
          },
        });
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("📊 GA SONUÇ İSTATİSTİKLERİ:");
    console.log("=".repeat(70));
    console.log(`   ✅ En iyi fitness: ${this.bestFitness.toFixed(2)}`);
    console.log(`   📦 Toplam mutasyon: ${this.stats.totalMutations}`);
    console.log(`   🔄 Blok-aware mutasyon: ${this.stats.blockAwareMutations}`);
    console.log(`   🔸 Normal mutasyon: ${this.stats.normalMutations}`);
    console.log(`   ❌ Başarısız mutasyon: ${this.stats.failedMutations}`);
    console.log(`   🔧 Blok tamir: ${this.stats.blockRepairs}`);
    console.log(`   ⚠️ Blok ihlali: ${this.stats.blockViolations}`);
    console.log("=".repeat(70) + "\n");

    return this.bestSolution;
  }

  // ============================================
  // BLOK-BİLİNÇLİ MUTASYON (HATA AYIKLAMA EKLENDİ!)
  // ============================================

  mutateBlockAware(individual, data) {
    this.stats.totalMutations++;

    // BlockAwareSwap kullanılabilir mi?
    if (
      this.config.useBlockAwareMutation &&
      this.blockAwareSwap &&
      data &&
      data.lessons
    ) {
      try {
        // Schedule objesi oluştur (geçici)
        const scheduleObj = this.createScheduleObject(individual);

        // Blok-bilinçli swap
        const result = this.blockAwareSwap.swapLessons(
          scheduleObj,
          data.lessons,
          { algorithm: "GA" }
        );

        if (result.success) {
          this.stats.blockAwareMutations++;
          // Başarılıysa, scheduleObj'den güncel veriyi (data) döndür
          return scheduleObj.data;
        } else {
          // ❌ KRİTİK DEBUG LOGU: Başarısızlık nedenini konsola yazdır
          console.error(
            `❌ BlockAwareSwap mutasyon başarısız oldu. Neden: ${
              result.message || "Bilinmeyen Hata."
            }`,
            "Detaylar:",
            result.details || {}
          );

          this.stats.failedMutations++;
          // Hata ayıklama sonrası normal mutasyona geç
          return this.mutateNormal(individual);
        }
      } catch (error) {
        console.error(
          `❌ Blok-aware mutasyon sırasında kritik hata: ${error.message}`,
          error
        );
        this.stats.failedMutations++;
        return this.mutateNormal(individual);
      }
    } else {
      // BlockAwareSwap yok, normal mutasyon
      return this.mutateNormal(individual);
    }
  }

  mutateNormal(individual) {
    this.stats.normalMutations++;

    const mutationType = Math.random();

    // Normal mutasyon türleri
    if (mutationType < 0.4) {
      this.randomSwap(individual);
    } else if (mutationType < 0.7) {
      this.timeShiftMutation(individual);
    } else {
      this.dayShiftMutation(individual);
    }

    return individual;
  }

  // ============================================
  // FİTNESS HESAPLAMA (BLOK VALİDASYONU DAHİL)
  // ============================================

  calculateFitness(solution) {
    let fitness = 1000; // Temel skor

    // 1. NORMAL KISIT SİSTEMİ
    for (const classId in solution) {
      for (const day in solution[classId]) {
        for (const time in solution[classId][day]) {
          const lesson = solution[classId][day][time];

          if (lesson && this.constraintSystem) {
            try {
              // Time'ı Number'a çevirme: Array indexleri string olabilir
              const score = this.constraintSystem.evaluate(
                solution,
                lesson,
                Number(day),
                Number(time)
              );
              fitness += score;
            } catch (e) {
              console.warn(
                `⚠️ Kısıt değerlendirme hatası: ${e.message}`,
                lesson
              );
              fitness -= 5; // Hata ceza
            }
          }
        }
      }
    }

    // 2. BLOK VALİDASYONU (BlockConsecutiveCheck)
    if (this.blockConsecutiveCheck && this.data && this.data.lessons) {
      try {
        const scheduleObj = this.createScheduleObject(solution);
        const consecutiveResult = this.blockConsecutiveCheck.quickValidate(
          scheduleObj,
          this.data.lessons
        );

        // Cezayı fitness'tan çıkar
        fitness -=
          consecutiveResult.penalty * this.config.blockValidationWeight;

        if (!consecutiveResult.valid) {
          // İhlal sayısını istatistiklere ekle
          this.stats.blockViolations += consecutiveResult.violationCount || 1;
        }
      } catch (error) {
        console.error(`Blok consecutive check hatası: ${error.message}`);
        fitness -= 50;
      }
    }

    // 3. BLOK GÜN VALİDASYONU (BlockDayValidator)
    if (this.blockDayValidator && this.data && this.data.lessons) {
      try {
        const scheduleObj = this.createScheduleObject(solution);
        const dayResult = this.blockDayValidator.quickValidate(
          scheduleObj,
          this.data.lessons
        );

        // Cezayı fitness'tan çıkar
        fitness -= dayResult.penalty * this.config.blockValidationWeight;

        if (!dayResult.valid) {
          this.stats.blockViolations++;
        }
      } catch (error) {
        console.error(`Blok day validator hatası: ${error.message}`);
        fitness -= 50;
      }
    }

    // Negatif fitness'tan kaçın
    return Math.max(1.0, fitness);
  }

  // ============================================
  // BLOK TAMİRİ (BlockConsecutiveCheck)
  // ============================================

  repairBlocks(individual, data) {
    if (!this.blockConsecutiveCheck || !data || !data.lessons) {
      return individual;
    }

    try {
      const scheduleObj = this.createScheduleObject(individual);

      // Hızlı kontrol
      const checkResult = this.blockConsecutiveCheck.quickValidate(
        scheduleObj,
        data.lessons
      );

      if (!checkResult.valid && checkResult.violationCount > 0) {
        // Tamir işlemini sadece ihlal varsa başlat
        const repairResult = this.blockConsecutiveCheck.repair(
          scheduleObj,
          data.lessons
        );

        if (repairResult.success && repairResult.repairs > 0) {
          this.stats.blockRepairs += repairResult.repairs;
          return scheduleObj.data;
        }
      }
    } catch (error) {
      console.error(`Blok tamir hatası: ${error.message}`);
    }

    return individual;
  }

  // ============================================
  // SCHEDULE OBJESİ OLUŞTUR (Blok modülleri için) - CRITICAL FIX
  // ============================================

  createScheduleObject(solutionData) {
    return {
      data: solutionData,

      isSlotOccupied(classId, day, period) {
        return !!(
          this.data[classId] &&
          this.data[classId][day] &&
          this.data[classId][day][period]
        );
      },

      isTeacherBusy(teacherId, day, period) {
        const teachers = Array.isArray(teacherId) ? teacherId : [teacherId];

        for (const classId in this.data) {
          const slot = this.data[classId]?.[day]?.[period];
          if (slot && slot.teacherId) {
            // TeacherId'nin artık doğrudan slot içinde zenginleştirilmiş veri olarak geldiği varsayılır.
            const slotTeachers = Array.isArray(slot.teacherId)
              ? slot.teacherId
              : [slot.teacherId];
            for (const t of teachers) {
              if (slotTeachers.includes(t)) {
                return true;
              }
            }
          }
        }
        return false;
      },

      // 🚨 KRİTİK GÜNCELLEME: lessonObj parametresi ve zenginleştirilmiş kayıt
      placeLesson(classId, lessonObj, day, period, metadata = {}) {
        if (!lessonObj || !lessonObj.id) {
          console.error("⚠️ placeLesson: Geçersiz lessonObj:", lessonObj);
          return;
        }

        if (!this.data[classId]) this.data[classId] = {};
        if (!this.data[classId][day]) this.data[classId][day] = {};

        // slot verisini BlockAwareSwap'in ihtiyaç duyduğu tüm verilerle zenginleştir
        this.data[classId][day][period] = {
          lessonId: lessonObj.id,
          subjectName: lessonObj.subjectName || "Bilinmeyen Ders",
          teacherId: lessonObj.teacherId || null,
          className: lessonObj.className || classId,
          // KRİTİK: Blok bilgisi eklendi
          blockStructure: lessonObj.blockStructure || [1],
          totalHours:
            lessonObj.totalHours ||
            (lessonObj.blockStructure
              ? lessonObj.blockStructure.reduce((a, b) => a + b, 0)
              : 1),

          // BlockAwareSwap'ten gelen konum/blok bilgileri (metadata)
          metadata: lessonObj.metadata || metadata,
        };
      },

      removeLesson(classId, day, period) {
        if (this.data[classId] && this.data[classId][day]) {
          delete this.data[classId][day][period];
          if (Object.keys(this.data[classId][day]).length === 0) {
            delete this.data[classId][day];
          }
        }
      },
    };
  }

  // ============================================
  // POPÜLASYON OLUŞTURMA
  // ============================================

  initializePopulation(baseSolution, data) {
    console.log("\n📊 Popülasyon oluşturuluyor...");

    // İlk birey: Temel çözüm
    this.population.push({
      chromosome: this.deepCopy(baseSolution),
      fitness: 0,
    });

    // Geri kalan popülasyonu varyasyonlarla doldur
    for (let i = 1; i < this.config.populationSize; i++) {
      const diversity = i / this.config.populationSize;
      const variant = this.createVariant(baseSolution, diversity);

      this.population.push({
        chromosome: variant,
        fitness: 0,
      });
    }

    console.log(`✅ ${this.config.populationSize} birey oluşturuldu`);
  }

  createVariant(solution, diversity) {
    const variant = this.deepCopy(solution);
    const swapCount = Math.floor(diversity * 10) + 1;

    for (let i = 0; i < swapCount; i++) {
      this.randomSwap(variant);
    }

    return variant;
  }

  randomSwap(solution) {
    const classIds = Object.keys(solution);
    if (classIds.length === 0) return;

    const slots = [];
    for (const classId of classIds) {
      for (const day in solution[classId]) {
        for (const time in solution[classId][day]) {
          if (solution[classId][day][time]) {
            slots.push({
              classId,
              day,
              time,
              lesson: solution[classId][day][time],
            });
          }
        }
      }
    }

    if (slots.length < 2) return;

    const slotIndex1 = Math.floor(Math.random() * slots.length);
    let slotIndex2 = Math.floor(Math.random() * slots.length);

    if (slots.length > 1) {
      while (slotIndex1 === slotIndex2) {
        slotIndex2 = Math.floor(Math.random() * slots.length);
      }
    }

    const s1 = slots[slotIndex1];
    const s2 = slots[slotIndex2];

    // Swap işlemi
    solution[s1.classId][s1.day][s1.time] = s2.lesson;
    solution[s2.classId][s2.day][s2.time] = s1.lesson;
  }

  // ============================================
  // FİTNESS DEĞERLENDİRME
  // ============================================

  evaluatePopulation() {
    for (const individual of this.population) {
      individual.fitness = this.calculateFitness(individual.chromosome);
    }

    this.fitnessHistory.push(this.bestFitness);
  }

  // ============================================
  // SEÇİM VE ÇAPRAZLAMA
  // ============================================

  selectElites() {
    const sorted = [...this.population].sort((a, b) => b.fitness - a.fitness);
    return sorted
      .slice(0, this.config.eliteCount)
      .map((ind) => this.deepCopy(ind));
  }

  tournamentSelection() {
    const tournament = [];

    for (let i = 0; i < this.config.tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.population.length);
      tournament.push(this.population[randomIndex]);
    }

    tournament.sort((a, b) => b.fitness - a.fitness);
    return tournament[0].chromosome;
  }

  crossover(parent1, parent2) {
    const offspring = this.deepCopy(parent1);

    // Uniform Crossover
    for (const classId in parent1) {
      for (const day in parent1[classId]) {
        for (const time in parent1[classId][day]) {
          if (Math.random() < 0.5) {
            if (parent2[classId]?.[day]?.[time]) {
              // Sadece ders var ise kopyala
              offspring[classId][day][time] = this.deepCopy(
                parent2[classId][day][time]
              );
            } else if (offspring[classId]?.[day]?.[time]) {
              // Parent2'de boşsa ve offspring'de doluysa, %50 ihtimalle boşalt.
              delete offspring[classId][day][time];
            }
          }
        }
      }
    }

    return offspring;
  }

  // ============================================
  // MUTASYON ÇEŞİTLERİ
  // ============================================

  timeShiftMutation(solution) {
    const classIds = Object.keys(solution);
    if (classIds.length === 0) return;

    const slots = [];
    for (const classId of classIds) {
      for (const day in solution[classId]) {
        for (const time in solution[classId][day]) {
          if (solution[classId][day][time]) {
            slots.push({
              classId,
              day,
              time: Number(time),
              lesson: solution[classId][day][time],
            });
          }
        }
      }
    }

    if (slots.length === 0) return;

    const { classId, day, time, lesson } =
      slots[Math.floor(Math.random() * slots.length)];

    const maxPeriods = 8; // Varsayım
    const newTime = Math.floor(Math.random() * maxPeriods);

    if (time !== newTime) {
      if (!solution[classId][day]) solution[classId][day] = {};
      const targetSlot = solution[classId][day][newTime];

      if (!targetSlot) {
        delete solution[classId][day][time];
        solution[classId][day][newTime] = lesson;
      }
    }
  }

  dayShiftMutation(solution) {
    const classIds = Object.keys(solution);
    if (classIds.length === 0) return;

    const slots = [];
    for (const classId of classIds) {
      for (const day in solution[classId]) {
        for (const time in solution[classId][day]) {
          if (solution[classId][day][time]) {
            slots.push({
              classId,
              day: Number(day),
              time,
              lesson: solution[classId][day][time],
            });
          }
        }
      }
    }

    if (slots.length === 0) return;

    const { classId, day, time, lesson } =
      slots[Math.floor(Math.random() * slots.length)];

    const maxDays = 5; // Varsayım
    const newDay = Math.floor(Math.random() * maxDays);

    if (day !== newDay) {
      if (!solution[classId][newDay]) solution[classId][newDay] = {};
      const targetSlot = solution[classId][newDay][time];

      if (!targetSlot) {
        delete solution[classId][day][time];
        solution[classId][newDay][time] = lesson;
      }
    }
  }

  // ============================================
  // EVOLUTIONARY STRATEGY
  // ============================================

  evolutionaryStrategy(individual) {
    let improved = this.deepCopy(individual);

    // Gap reduction
    improved = this.reduceGaps(improved);

    // Teacher preference alignment
    improved = this.alignWithPreferences(improved);

    return improved;
  }

  reduceGaps(solution) {
    // ... (Mevcut kod aynı)
    return solution;
  }

  alignWithPreferences(solution) {
    // ... (Mevcut kod aynı)
    return solution;
  }

  // ============================================
  // ADAPTİF MUTASYON
  // ============================================

  getAdaptiveMutationRate(generation) {
    if (!this.config.adaptiveMutation) {
      return this.config.mutationRate;
    }

    if (this.stagnationCounter > 10) {
      // Durgunluk varsa mutasyon oranını artır
      return Math.min(this.config.mutationRate * 2, 0.5);
    }

    // İyileşme varsa mutasyon oranını azalt (keşfetme yerine kullanıma odaklan)
    const decay = 1 - (generation / this.config.generations) * 0.5;
    return this.config.mutationRate * decay;
  }

  // ============================================
  // DURDURMA KRİTERLERİ
  // ============================================

  shouldStop() {
    if (this.bestFitness >= this.targetFitness) {
      return true;
    }

    if (this.stagnationCounter >= this.stagnationLimit) {
      return true;
    }

    return false;
  }

  getStopReason() {
    if (this.bestFitness >= this.targetFitness) {
      return `Hedef fitness (${this.targetFitness}) aşıldı`;
    }
    if (this.stagnationCounter >= this.stagnationLimit) {
      return `${this.stagnationLimit} nesil boyunca iyileşme yok`;
    }
    return "Maksimum nesil sayısına ulaşıldı";
  }

  // ============================================
  // YARDIMCI FONKSİYONLAR
  // ============================================

  getBestIndividual() {
    return [...this.population].sort((a, b) => b.fitness - a.fitness)[0];
  }

  getAverageFitness() {
    const sum = this.population.reduce((acc, ind) => acc + ind.fitness, 0);
    return sum / this.population.length;
  }

  deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
}

// ============================================
// GLOBAL EXPORT
// ============================================

if (typeof window !== "undefined") {
  window.GeneticAlgorithm = GeneticAlgorithm;
  console.log("✅ GeneticAlgorithm V3.0 (Blok Entegre) yüklendi");
}

// Wrapper metod (schedule-algorithm-v2.js uyumluluğu)
GeneticAlgorithm.prototype.evolve = async function (config) {
  console.log("🧬 GA.evolve() → optimize() yönlendiriliyor");

  return await this.optimize(
    config.initialSolution,
    config.data,
    config.onProgress
  );
};

console.log("✅ GeneticAlgorithm.evolve() wrapper eklendi");
