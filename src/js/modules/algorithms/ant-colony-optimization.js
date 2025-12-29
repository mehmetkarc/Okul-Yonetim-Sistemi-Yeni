/**
 * ============================================
 * ANT COLONY OPTIMIZATION (ACO) V3.0 - BLOK ENTEGRE (FIXED FOR BLOCKCONSECUTIVECHECK)
 * ============================================
 *
 * 🔥 KRİTİK DÜZELTME 1: ACO'nun placeLesson metodunda blockIndex ve blockPosition meta verileri eklendi.
 * 🔥 KRİTİK DÜZELTME 2: Mock schedule objesindeki placeLesson metodu, BlockConsecutiveCheck'in beklediği imzaya uyarlandı.
 */

class AntColonyOptimization {
  constructor(config = {}, constraintSystem) {
    this.config = {
      antCount: 30,
      iterations: 100,
      alpha: 1.0,
      beta: 2.0,
      evaporationRate: 0.1,
      pheromoneDeposit: 1.0,
      useBlockAware: true, // ← YENİ
      blockValidationWeight: 0.3, // ← YENİ
      ...config,
    };

    this.constraintSystem = constraintSystem;
    this.pheromoneMatrix = {};
    this.bestSolution = null;
    this.bestFitness = -Infinity;

    // ✅ BLOK MODÜLLERİ
    this.blockAwareSwap = window.BlockAwareSwap
      ? new window.BlockAwareSwap({
          preserveIntegrity: true,
          allowPartialSwap: false,
        })
      : null;

    this.blockConsecutiveCheck = window.BlockConsecutiveCheck
      ? new window.BlockConsecutiveCheck({
          strictMode: true,
          autoRepair: true,
          returnPenalty: true,
        })
      : null;

    console.log("🐜 ACO V3.0 (Blok Entegre) başlatıldı");
    console.log(`  📦 BlockAwareSwap: ${this.blockAwareSwap ? "✅" : "❌"}`);
    console.log(
      `  🔗 BlockConsecutiveCheck: ${this.blockConsecutiveCheck ? "✅" : "❌"}`
    );
  }

  async optimize(initialSolution, data, onProgress) {
    console.log("🐜 Ant Colony Optimization başlatıldı");

    // ✅ DATA'YI SAKLA
    this.data = data;

    this.initializePheromones(initialSolution);

    for (let iter = 1; iter <= this.config.iterations; iter++) {
      const solutions = [];

      for (let ant = 0; ant < this.config.antCount; ant++) {
        const solution = this.constructSolution(data, initialSolution);
        const fitness = this.calculateFitness(solution);

        solutions.push({ solution, fitness });

        if (fitness > this.bestFitness) {
          this.bestFitness = fitness;
          this.bestSolution = this.deepCopy(solution);
          console.log(
            `🐜 İter ${iter}, Karınca ${ant}: Yeni en iyi = ${this.bestFitness.toFixed(
              2
            )}`
          );
        }
      }

      this.updatePheromones(solutions);

      if (onProgress) {
        onProgress({
          iteration: iter,
          bestFitness: this.bestFitness,
          avgFitness:
            solutions.reduce((sum, s) => sum + s.fitness, 0) / solutions.length,
        });
      }
    }

    console.log(
      `✅ ACO tamamlandı. En iyi fitness: ${this.bestFitness.toFixed(2)}`
    );
    return this.bestSolution;
  }

  initializePheromones(solution) {
    const initialPheromone = 1.0;

    if (!solution || Object.keys(solution).length === 0) {
      console.log("⚠️ Boş solution, pheromone matrix başlatılamadı");
      return;
    }

    for (const classId in solution) {
      this.pheromoneMatrix[classId] = {};

      for (let day = 0; day < 5; day++) {
        this.pheromoneMatrix[classId][day] = {};
        for (let time = 0; time < 8; time++) {
          this.pheromoneMatrix[classId][day][time] = initialPheromone;
        }
      }
    }

    console.log("✅ Pheromone matrix başlatıldı");
  }

  constructSolution(data, baseSolution) {
    const solution = {};

    for (const cls of data.classes) {
      solution[cls.id] = {};
      for (let day = 0; day < 5; day++) {
        solution[cls.id][day] = {};
      }
    }

    // ✅ TÜM ALANLARLA YERLEŞTİR
    for (const lesson of data.lessons) {
      const placement = this.selectPlacement(solution, lesson);

      if (placement) {
        this.placeLesson(solution, lesson, placement.day, placement.time);
      }
    }

    return solution;
  }

  selectPlacement(solution, lesson) {
    const candidates = [];

    for (let day = 0; day < 5; day++) {
      for (let time = 0; time < 8; time++) {
        if (this.canPlace(solution, lesson, day, time)) {
          const probability = this.calculateProbability(
            solution,
            lesson,
            day,
            time
          );
          candidates.push({ day, time, probability });
        }
      }
    }

    if (candidates.length === 0) return null;

    return this.rouletteWheelSelection(candidates);
  }

  calculateProbability(solution, lesson, day, time) {
    const pheromone =
      this.pheromoneMatrix[lesson.classId]?.[day]?.[time] || 1.0;

    let heuristic = 0.5;
    if (this.constraintSystem) {
      try {
        heuristic =
          this.constraintSystem.evaluate(solution, lesson, day, time) / 100;
      } catch (e) {
        heuristic = 0.5;
      }
    }

    const prob =
      Math.pow(pheromone, this.config.alpha) *
      Math.pow(Math.max(heuristic, 0.01), this.config.beta);

    return prob;
  }

  rouletteWheelSelection(candidates) {
    const totalProb = candidates.reduce((sum, c) => sum + c.probability, 0);

    if (totalProb === 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    let random = Math.random() * totalProb;

    for (const candidate of candidates) {
      random -= candidate.probability;
      if (random <= 0) return candidate;
    }

    return candidates[candidates.length - 1];
  }

  updatePheromones(solutions) {
    if (
      !this.pheromoneMatrix ||
      Object.keys(this.pheromoneMatrix).length === 0
    ) {
      return;
    }

    // Evaporation
    for (const classId in this.pheromoneMatrix) {
      if (!this.pheromoneMatrix[classId]) continue;

      for (const day in this.pheromoneMatrix[classId]) {
        if (!this.pheromoneMatrix[classId][day]) continue;

        for (const time in this.pheromoneMatrix[classId][day]) {
          this.pheromoneMatrix[classId][day][time] *=
            1 - this.config.evaporationRate;
        }
      }
    }

    // Deposit
    for (const { solution, fitness } of solutions) {
      if (!solution || typeof solution !== "object") continue;

      const depositAmount = this.config.pheromoneDeposit * (fitness / 1000);

      for (const classId in solution) {
        if (!solution[classId]) continue;

        if (!this.pheromoneMatrix[classId]) {
          this.pheromoneMatrix[classId] = {};
          for (let d = 0; d < 5; d++) {
            this.pheromoneMatrix[classId][d] = {};
            for (let t = 0; t < 8; t++) {
              this.pheromoneMatrix[classId][d][t] = 1.0;
            }
          }
        }

        for (const day in solution[classId]) {
          if (!solution[classId][day]) continue;

          if (!this.pheromoneMatrix[classId][day]) {
            this.pheromoneMatrix[classId][day] = {};
            for (let t = 0; t < 8; t++) {
              this.pheromoneMatrix[classId][day][t] = 1.0;
            }
          }

          for (const time in solution[classId][day]) {
            const lesson = solution[classId][day][time];
            if (!lesson) continue;

            if (!this.pheromoneMatrix[classId][day][time]) {
              this.pheromoneMatrix[classId][day][time] = 1.0;
            }

            this.pheromoneMatrix[classId][day][time] += depositAmount;
          }
        }
      }
    }
  }

  canPlace(solution, lesson, day, time) {
    const blockSize = lesson.blockSize || 1;
    // Toplam 8 ders saati varsayımıyla (0'dan 7'ye)
    if (time + blockSize > 8) return false;

    for (let i = 0; i < blockSize; i++) {
      const currentTime = time + i;
      if (solution[lesson.classId]?.[day]?.[currentTime]) return false;
    }

    return true;
  }

  // 🔥 KRİTİK DÜZELTME 1: blockIndex ve blockPosition EKLENDİ
  placeLesson(solution, lesson, day, time) {
    const blockSize = lesson.blockSize || 1;
    // Eğer lesson objesi blok indexini belirtiyorsa kullan (Multi-block lesson'larda), yoksa 0 kabul et.
    const blockIndex = lesson.blockIndex ?? 0;

    for (let i = 0; i < blockSize; i++) {
      const currentTime = time + i;

      // ✅ TÜM ALANLARI EKLE
      solution[lesson.classId][day][currentTime] = {
        lessonId: lesson.id,
        lessonName: lesson.subjectName,
        subjectName: lesson.subjectName,
        subjectCode: lesson.subjectCode,
        teacherId: lesson.teacherId,
        teacherName: lesson.teacherName,
        teacherCode: lesson.teacherCode,
        classId: lesson.classId,
        className: lesson.className,
        blockStructure: lesson.blockStructure,
        blockSize: lesson.blockSize,
        // BlockConsecutiveCheck'in ihtiyacı olan meta veriler
        blockIndex: blockIndex,
        blockPosition: i,
      };
    }
  }

  // ✅ FİTNESS HESAPLAMA (BLOK VALİDASYONU DAHİL)
  calculateFitness(solution) {
    let fitness = 1000;

    // 1. Normal kısıt sistemi
    for (const classId in solution) {
      for (const day in solution[classId]) {
        for (const time in solution[classId][day]) {
          const lesson = solution[classId][day][time];
          if (this.constraintSystem && lesson) {
            try {
              const score = this.constraintSystem.evaluate(
                solution,
                lesson,
                day,
                time
              );
              fitness += score;
            } catch (e) {
              // Devam
            }
          }
        }
      }
    }

    // 2. BLOK VALİDASYONU
    if (this.blockConsecutiveCheck && this.data && this.data.lessons) {
      try {
        const scheduleObj = this.createScheduleObject(solution);
        const result = this.blockConsecutiveCheck.quickValidate(
          scheduleObj,
          this.data.lessons
        );

        // Yüksek ceza (penalty), düşük fitness demektir
        fitness -= result.penalty * this.config.blockValidationWeight;
      } catch (error) {
        // Devam
      }
    }

    return fitness;
  }

  // ✅ SCHEDULE OBJESİ OLUŞTUR (BlockConsecutiveCheck ile uyumlu Mock)
  createScheduleObject(solutionData) {
    return {
      // Çözüm verisini tutar
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
            const slotTeachers = Array.isArray(slot.teacherId)
              ? slot.teacherId
              : [slot.teacherId];
            for (const t of teachers) {
              if (slotTeachers.includes(t)) return true;
            }
          }
        }
        return false;
      },

      // 🔥 KRİTİK DÜZELTME 2: BlockConsecutiveCheck'in beklediği imzaya uyarlandı
      // repairBlock metodu bu metodu (classId, lessonId, teacherId, day, period, metadata) ile çağırır
      placeLesson(classId, lessonId, teacherId, day, period, metadata = {}) {
        if (!this.data[classId]) this.data[classId] = {};
        if (!this.data[classId][day]) this.data[classId][day] = {};

        // Sadece BlockConsecutiveCheck'in ihtiyacı olan minimal veriyi kaydet
        this.data[classId][day][period] = {
          lessonId: lessonId,
          teacherId: teacherId,
          // BlockConsecutiveCheck'in getLessonPlacements metodu bu alanları okur
          blockIndex: metadata.blockIndex ?? 0,
          blockPosition: metadata.blockPosition ?? 0,
          blockSize: metadata.blockSize ?? 1,
          metadata: metadata, // Orijinal metadata da saklanabilir
        };
      },

      removeLesson(classId, day, period) {
        if (this.data[classId] && this.data[classId][day]) {
          delete this.data[classId][day][period];
        }
      },
    };
  }

  deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
}

window.AntColonyOptimization = AntColonyOptimization;

AntColonyOptimization.prototype.solve = async function (
  initialSolution,
  data,
  onProgress
) {
  return await this.optimize(initialSolution, data, onProgress);
};

console.log("🐜 AntColonyOptimization V3.0 (Blok Entegre) hazır!");
