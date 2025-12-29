/**
 * ============================================
 * SIMULATED ANNEALING V3.0 - BLOK ENTEGRE (FİNAL)
 * ============================================
 */

class SimulatedAnnealing {
  constructor(config = {}, constraintSystem) {
    this.config = {
      initialTemp: 1000,
      coolingRate: 0.95,
      minTemp: 0.1,
      iterationsPerTemp: 100,
      maxTotalIterations: 5000,
      useBlockAwareNeighbor: true,
      blockValidationWeight: 0.3,
      blockRepairEnabled: true,
      adaptiveCooling: true,
      ...config,
    };

    this.constraintSystem = constraintSystem;

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

    this.stats = {
      totalIterations: 0,
      acceptedMoves: 0,
      rejectedMoves: 0,
      blockAwareMoves: 0,
      normalMoves: 0,
      failedMoves: 0,
      blockRepairs: 0,
      blockViolations: 0,
      improvements: 0,
    };

    console.log("🔥 Simulated Annealing V3.0 (Blok Entegre) başlatıldı");
    console.log(`   📦 BlockAwareSwap: ${this.blockAwareSwap ? "✅" : "❌"}`);
    console.log(
      `   🔗 BlockConsecutiveCheck: ${this.blockConsecutiveCheck ? "✅" : "❌"}`
    );
    console.log(
      `   📅 BlockDayValidator: ${this.blockDayValidator ? "✅" : "❌"}`
    );
  }

  async optimize(solution, data, onProgress) {
    console.log("\n" + "=".repeat(70));
    console.log("🔥 SIMULATED ANNEALING - BLOK ENTEGRASYONU");
    console.log("=".repeat(70));

    this.data = data;

    let currentSolution = this.deepCopy(solution);
    let currentFitness = this.calculateFitness(currentSolution);

    let bestSolution = this.deepCopy(currentSolution);
    let bestFitness = currentFitness;

    let temperature = this.config.initialTemp;
    let iteration = 0;
    let stagnationCount = 0;
    const maxStagnation = 50;

    console.log(`\n🌡️ Başlangıç sıcaklık: ${temperature}`);
    console.log(`📊 Başlangıç fitness: ${currentFitness.toFixed(2)}`);

    while (
      temperature > this.config.minTemp &&
      iteration < this.config.maxTotalIterations
    ) {
      for (let i = 0; i < this.config.iterationsPerTemp; i++) {
        iteration++;
        this.stats.totalIterations++;

        if (iteration >= this.config.maxTotalIterations) {
          console.log(
            `⚠️ Maksimum iterasyon limitine ulaşıldı: ${this.config.maxTotalIterations}`
          );
          break;
        }

        const neighbor = this.generateNeighborBlockAware(currentSolution, data);
        const neighborFitness = this.calculateFitness(neighbor);

        const delta = neighborFitness - currentFitness;

        if (delta > 0) {
          currentSolution = neighbor;
          currentFitness = neighborFitness;
          this.stats.acceptedMoves++;
          this.stats.improvements++;
          stagnationCount = 0;

          if (currentFitness > bestFitness) {
            bestSolution = this.deepCopy(currentSolution);
            bestFitness = currentFitness;

            console.log(
              `🔥 SA İter ${iteration}: Yeni en iyi = ${bestFitness.toFixed(2)}`
            );
          }
        } else {
          const probability = Math.exp(delta / temperature);

          if (Math.random() < probability) {
            currentSolution = neighbor;
            currentFitness = neighborFitness;
            this.stats.acceptedMoves++;
          } else {
            this.stats.rejectedMoves++;
          }
          stagnationCount++;
        }

        if (stagnationCount > maxStagnation) {
          temperature = Math.min(temperature * 1.2, this.config.initialTemp);
          stagnationCount = 0;
        }
      }

      if (this.config.adaptiveCooling) {
        const totalMoves = this.stats.acceptedMoves + this.stats.rejectedMoves;
        const acceptanceRate =
          totalMoves > 0 ? this.stats.acceptedMoves / totalMoves : 0;

        if (acceptanceRate > 0.5) {
          temperature *= this.config.coolingRate;
        } else {
          temperature *= Math.sqrt(this.config.coolingRate);
        }
      } else {
        temperature *= this.config.coolingRate;
      }

      if (onProgress) {
        onProgress({
          temperature,
          iteration,
          bestFitness,
          currentFitness,
          progress: 1 - temperature / this.config.initialTemp,
          blockStats: {
            violations: this.stats.blockViolations,
            repairs: this.stats.blockRepairs,
            blockAwareMoves: this.stats.blockAwareMoves,
          },
        });
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("📊 SA SONUÇ İSTATİSTİKLERİ:");
    console.log("=".repeat(70));
    console.log(`   ✅ En iyi fitness: ${bestFitness.toFixed(2)}`);
    console.log(`   📊 Toplam iterasyon: ${this.stats.totalIterations}`);
    console.log(`   ✅ Kabul edilen: ${this.stats.acceptedMoves}`);
    console.log(`   ❌ Reddedilen: ${this.stats.rejectedMoves}`);
    console.log(`   🔄 Blok-aware move: ${this.stats.blockAwareMoves}`);
    console.log(`   🔸 Normal move: ${this.stats.normalMoves}`);
    console.log(`   ❌ Başarısız move: ${this.stats.failedMoves}`);
    console.log(`   🔧 Blok tamir: ${this.stats.blockRepairs}`);
    console.log(`   📈 İyileştirme: ${this.stats.improvements}`);

    const totalMoves = this.stats.totalIterations;
    const acceptRate =
      totalMoves > 0
        ? ((this.stats.acceptedMoves / totalMoves) * 100).toFixed(1)
        : 0;
    console.log(`   📉 Kabul oranı: ${acceptRate}%`);
    console.log("=".repeat(70) + "\n");

    return bestSolution;
  }

  generateNeighborBlockAware(solution, data) {
    const neighbor = this.deepCopy(solution);

    if (
      this.config.useBlockAwareNeighbor &&
      this.blockAwareSwap &&
      data &&
      data.lessons
    ) {
      try {
        const scheduleObj = this.createScheduleObject(neighbor);
        const result = this.blockAwareSwap.swapLessons(
          scheduleObj,
          data.lessons,
          { algorithm: "SA" }
        );

        if (result.success) {
          this.stats.blockAwareMoves++;
          return scheduleObj.data;
        } else {
          this.stats.failedMoves++;
          return this.generateNeighborNormal(neighbor);
        }
      } catch (error) {
        this.stats.failedMoves++;
        return this.generateNeighborNormal(neighbor);
      }
    } else {
      return this.generateNeighborNormal(neighbor);
    }
  }

  generateNeighborNormal(solution) {
    this.stats.normalMoves++;

    const moveType = Math.random();

    if (moveType < 0.5) {
      this.swapMove(solution);
    } else if (moveType < 0.8) {
      this.shiftMove(solution);
    } else {
      this.relocateMove(solution);
    }

    if (this.config.blockRepairEnabled) {
      solution = this.repairBlocks(solution, this.data);
    }

    return solution;
  }

  // ✅ FİTNESS HESAPLAMA (İSTATİSTİK ARTIRMA KALDIRILDI)
  calculateFitness(solution) {
    let fitness = 1000;

    // 1. NORMAL KISIT SİSTEMİ
    for (const classId in solution) {
      for (const day in solution[classId]) {
        for (const time in solution[classId][day]) {
          const lesson = solution[classId][day][time];

          if (lesson && this.constraintSystem) {
            try {
              const score = this.constraintSystem.evaluate(
                solution,
                lesson,
                day,
                time
              );
              fitness += score;
            } catch (e) {
              // Devam et
            }
          }
        }
      }
    }

    // 2. BLOK VALİDASYONU (✅ İSTATİSTİK YOK!)
    if (this.blockConsecutiveCheck && this.data && this.data.lessons) {
      try {
        const scheduleObj = this.createScheduleObject(solution);
        const consecutiveResult = this.blockConsecutiveCheck.quickValidate(
          scheduleObj,
          this.data.lessons
        );

        fitness -=
          consecutiveResult.penalty * this.config.blockValidationWeight;
      } catch (error) {
        // Devam et
      }
    }

    // 3. BLOK GÜN VALİDASYONU (✅ İSTATİSTİK YOK!)
    if (this.blockDayValidator && this.data && this.data.lessons) {
      try {
        const scheduleObj = this.createScheduleObject(solution);
        const dayResult = this.blockDayValidator.quickValidate(
          scheduleObj,
          this.data.lessons
        );

        fitness -= dayResult.penalty * this.config.blockValidationWeight;
      } catch (error) {
        // Devam et
      }
    }

    return Math.max(0.01, fitness);
  }

  repairBlocks(solution, data) {
    if (!this.blockConsecutiveCheck || !data || !data.lessons) {
      return solution;
    }

    try {
      const scheduleObj = this.createScheduleObject(solution);
      const checkResult = this.blockConsecutiveCheck.quickValidate(
        scheduleObj,
        data.lessons
      );

      if (!checkResult.valid && checkResult.violationCount > 0) {
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
      // Devam et
    }

    return solution;
  }

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

      placeLesson(classId, lessonObj, day, period, metadata = {}) {
        if (!this.data[classId]) this.data[classId] = {};
        if (!this.data[classId][day]) this.data[classId][day] = {};

        this.data[classId][day][period] = {
          lessonId: lessonObj.id,
          lessonName: lessonObj.subjectName,
          subjectName: lessonObj.subjectName,
          teacherId: lessonObj.teacherId,
          teacherName: lessonObj.teacherName || "",
          classId: classId,
          className: lessonObj.className,
          blockStructure: lessonObj.blockStructure || [1],
          blockSize: lessonObj.blockSize || 1,
          metadata,
        };
      },

      removeLesson(classId, day, period) {
        if (this.data[classId] && this.data[classId][day]) {
          delete this.data[classId][day][period];
        }
      },
    };
  }

  swapMove(solution) {
    const classes = Object.keys(solution);
    if (classes.length < 2) return;

    const class1 = classes[Math.floor(Math.random() * classes.length)];
    const class2 = classes[Math.floor(Math.random() * classes.length)];

    const day1 = Math.floor(Math.random() * 5);
    const day2 = Math.floor(Math.random() * 5);

    const time1 = Math.floor(Math.random() * 8);
    const time2 = Math.floor(Math.random() * 8);

    const slot1 = solution[class1]?.[day1]?.[time1];
    const slot2 = solution[class2]?.[day2]?.[time2];

    if (slot1 && slot2) {
      solution[class1][day1][time1] = slot2;
      solution[class2][day2][time2] = slot1;
    }
  }

  shiftMove(solution) {
    const classes = Object.keys(solution);
    if (classes.length === 0) return;

    const classId = classes[Math.floor(Math.random() * classes.length)];
    const day = Math.floor(Math.random() * 5);
    const time = Math.floor(Math.random() * 8);

    const lesson = solution[classId]?.[day]?.[time];
    if (lesson) {
      const newTime = Math.floor(Math.random() * 8);

      if (!solution[classId]?.[day]?.[newTime]) {
        delete solution[classId][day][time];
        solution[classId][day][newTime] = lesson;
      }
    }
  }

  relocateMove(solution) {
    const classes = Object.keys(solution);
    if (classes.length === 0) return;

    const classId = classes[Math.floor(Math.random() * classes.length)];
    const day = Math.floor(Math.random() * 5);
    const time = Math.floor(Math.random() * 8);

    const lesson = solution[classId]?.[day]?.[time];
    if (lesson) {
      const newDay = Math.floor(Math.random() * 5);

      if (!solution[classId]?.[newDay]?.[time]) {
        delete solution[classId][day][time];
        solution[classId][newDay][time] = lesson;
      }
    }
  }

  deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
}

if (typeof window !== "undefined") {
  window.SimulatedAnnealing = SimulatedAnnealing;
  console.log("✅ SimulatedAnnealing V3.0 (Blok Entegre) yüklendi");
}

SimulatedAnnealing.prototype.anneal = async function (config) {
  return await this.optimize(config.solution, config.data, config.onProgress);
};

console.log("✅ SimulatedAnnealing.anneal() wrapper eklendi");
