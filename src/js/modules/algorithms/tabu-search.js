/**
 * ============================================
 * TABU SEARCH
 * ============================================
 * Tabu Arama - Döngüleri engelleme
 */

class TabuSearch {
  constructor(config = {}, constraintSystem) {
    // ✅ Config varsayılan değerlerle oluştur
    this.config = {
      maxIterations: 500,
      tabuTenure: 10,
      tabuListSize: 50,
      neighborhoodSize: 20,
      aspirationCriteria: true,
      ...config,
    };

    this.constraintSystem = constraintSystem;
    this.tabuList = [];
  }

  async optimize(solution, onProgress) {
    console.log("🚫 Tabu Search başlatıldı");

    let currentSolution = this.deepCopy(solution);
    let currentFitness = this.calculateFitness(currentSolution);

    let bestSolution = this.deepCopy(currentSolution);
    let bestFitness = currentFitness;

    for (let iter = 1; iter <= this.config.maxIterations; iter++) {
      // Komşu çözümleri üret
      const neighbors = this.generateNeighborhood(currentSolution);

      // En iyi tabu olmayan komşuyu seç
      let bestNeighbor = null;
      let bestNeighborFitness = -Infinity;

      for (const neighbor of neighbors) {
        const moveKey = this.getMoveKey(currentSolution, neighbor);

        // Tabu kontrolü
        if (this.isTabu(moveKey)) {
          // Aspiration criteria: Eğer şimdiye kadarki en iyiden daha iyiyse tabuyu gözardı et
          if (this.config.aspirationCriteria) {
            const fitness = this.calculateFitness(neighbor);
            if (fitness > bestFitness) {
              bestNeighbor = neighbor;
              bestNeighborFitness = fitness;
            }
          }
          continue;
        }

        const fitness = this.calculateFitness(neighbor);

        if (fitness > bestNeighborFitness) {
          bestNeighbor = neighbor;
          bestNeighborFitness = fitness;
        }
      }

      if (!bestNeighbor) {
        console.log("⚠️ Tabu Search: Geçerli komşu bulunamadı");
        break;
      }

      // Hareketi tabu listesine ekle
      const moveKey = this.getMoveKey(currentSolution, bestNeighbor);
      this.addToTabuList(moveKey);

      // Yeni çözümü kabul et
      currentSolution = bestNeighbor;
      currentFitness = bestNeighborFitness;

      // En iyiyi güncelle
      if (currentFitness > bestFitness) {
        bestSolution = this.deepCopy(currentSolution);
        bestFitness = currentFitness;
        console.log(
          `🚫 TS İter ${iter}: Yeni en iyi = ${bestFitness.toFixed(2)}`
        );
      }

      // İlerleme callback
      if (onProgress) {
        onProgress({
          iteration: iter,
          bestFitness,
          currentFitness,
          tabuListSize: this.tabuList.length,
          progress: iter / this.config.maxIterations,
        });
      }
    }

    console.log(
      `✅ Tabu Search tamamlandı. En iyi fitness: ${bestFitness.toFixed(2)}`
    );
    return bestSolution;
  }

  generateNeighborhood(solution) {
    const neighbors = [];

    for (let i = 0; i < this.config.neighborhoodSize; i++) {
      const neighbor = this.deepCopy(solution);

      // Random move
      const moveType = Math.random();

      if (moveType < 0.6) {
        this.swapMove(neighbor);
      } else if (moveType < 0.9) {
        this.shiftMove(neighbor);
      } else {
        this.insertMove(neighbor);
      }

      neighbors.push(neighbor);
    }

    return neighbors;
  }

  swapMove(solution) {
    const classes = Object.keys(solution);
    if (classes.length < 2) return;

    const class1 = classes[Math.floor(Math.random() * classes.length)];
    const class2 = classes[Math.floor(Math.random() * classes.length)];

    const day1 = Math.floor(Math.random() * 5) + 1;
    const day2 = Math.floor(Math.random() * 5) + 1;
    const time1 = Math.floor(Math.random() * 8) + 1;
    const time2 = Math.floor(Math.random() * 8) + 1;

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

    const day = Math.floor(Math.random() * 5) + 1;
    const time = Math.floor(Math.random() * 8) + 1;

    const lesson = solution[classId]?.[day]?.[time];
    if (lesson) {
      const newTime = Math.floor(Math.random() * 8) + 1;

      if (!solution[classId]?.[day]?.[newTime]) {
        delete solution[classId][day][time];
        solution[classId][day][newTime] = lesson;
      }
    }
  }

  insertMove(solution) {
    const classes = Object.keys(solution);
    if (classes.length === 0) return;

    const classId = classes[Math.floor(Math.random() * classes.length)];

    const day = Math.floor(Math.random() * 5) + 1;
    const time = Math.floor(Math.random() * 8) + 1;

    const lesson = solution[classId]?.[day]?.[time];
    if (lesson) {
      const newDay = Math.floor(Math.random() * 5) + 1;
      const newTime = Math.floor(Math.random() * 8) + 1;

      if (!solution[classId]?.[newDay]?.[newTime]) {
        delete solution[classId][day][time];
        solution[classId][newDay][newTime] = lesson;
      }
    }
  }

  getMoveKey(oldSolution, newSolution) {
    // İki çözüm arasındaki farkı anahtar olarak kullan
    const differences = [];

    for (const classId in newSolution) {
      for (const day in newSolution[classId]) {
        for (const time in newSolution[classId][day]) {
          const newLesson = newSolution[classId][day][time];
          const oldLesson = oldSolution[classId]?.[day]?.[time];

          if (JSON.stringify(newLesson) !== JSON.stringify(oldLesson)) {
            differences.push(`${classId}_${day}_${time}`);
          }
        }
      }
    }

    return differences.sort().join("|");
  }

  isTabu(moveKey) {
    return this.tabuList.includes(moveKey);
  }

  addToTabuList(moveKey) {
    this.tabuList.push(moveKey);

    // Tabu liste boyutunu sınırla
    if (this.tabuList.length > this.config.tabuListSize) {
      this.tabuList.shift(); // İlk elemanı çıkar (FIFO)
    }
  }

  calculateFitness(solution) {
    let fitness = 1000;

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
              // Hata durumunda devam et
            }
          }
        }
      }
    }

    return fitness;
  }

  deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
}

// 🌍 Global erişim
window.TabuSearch = TabuSearch;
console.log("⛔ TabuSearch global erişim aktif!");

// ✅ Wrapper metod ekle
TabuSearch.prototype.search = async function (config) {
  console.log("⛔ TS.search() → optimize() yönlendiriliyor");

  return await this.optimize(config.solution, config.onProgress);
};

console.log("✅ TabuSearch.search() wrapper eklendi");
