import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useGame() {
  const temperature = ref(80)
  const heat = ref(50)
  const wood = ref(10)
  const food = ref(5)
  const hide = ref(0)
  const tools = ref(0)
  const hunger = ref(0)
  const isDay = ref(true)
  const dayCount = ref(1)
  const isBlizzard = ref(false)
  const gameOver = ref(false)
  const gameOverReason = ref('')
  const actionLog = ref([])
  const digestionQueue = ref([])

  const DAY_DURATION = 30000
  const NIGHT_DURATION = 20000
  const HEAT_CONSUMPTION_RATE = 2
  const BLIZZARD_CHANCE = 0.15
  const HUNGER_DAY_RATE = 0.8
  const HUNGER_NIGHT_RATE = 1.5
  const DIGESTION_INTERVAL = 2000
  const DIGESTION_AMOUNT = 5
  const FOOD_DIGESTION_STEPS = 4

  let dayNightTimer = null
  let nightConsumptionTimer = null
  let autoSaveTimer = null
  let hungerTimer = null
  let digestionTimer = null

  const isNight = computed(() => !isDay.value)
  const isDanger = computed(() => temperature.value < 30)
  const canMakeFire = computed(() => wood.value >= 3)
  const canHunt = computed(() => tools.value > 0)
  const huntSuccessRate = computed(() => 0.3 + tools.value * 0.15)

  const hungerLevel = computed(() => {
    if (hunger.value < 20) return 'full'
    if (hunger.value < 50) return 'hungry'
    if (hunger.value < 80) return 'very_hungry'
    return 'starving'
  })

  const hungerLabel = computed(() => {
    const labels = {
      full: '饱食',
      hungry: '饥饿',
      very_hungry: '非常饥饿',
      starving: '极度饥饿'
    }
    return labels[hungerLevel.value]
  })

  const actionEfficiency = computed(() => {
    const multipliers = {
      full: 1.0,
      hungry: 0.9,
      very_hungry: 0.75,
      starving: 0.5
    }
    return multipliers[hungerLevel.value]
  })

  const tempCostMultiplier = computed(() => {
    const multipliers = {
      full: 1.0,
      hungry: 1.1,
      very_hungry: 1.25,
      starving: 1.5
    }
    return multipliers[hungerLevel.value]
  })

  const isDigesting = computed(() => digestionQueue.value.length > 0)

  function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString()
    actionLog.value.unshift({ message, type, timestamp })
    if (actionLog.value.length > 20) {
      actionLog.value.pop()
    }
  }

  function checkGameOver() {
    if (temperature.value <= 20) {
      gameOver.value = true
      gameOverReason.value = '体温过低，你在严寒中失去了意识...'
      stopTimers()
      addLog('游戏结束：体温过低！', 'danger')
      return
    }
    if (hunger.value >= 100) {
      gameOver.value = true
      gameOverReason.value = '你因长期饥饿而体力耗尽，倒在了雪地中...'
      stopTimers()
      addLog('游戏结束：饥饿致死！', 'danger')
      return
    }
    if (temperature.value >= 100) {
      temperature.value = 100
    }
  }

  function increaseHunger() {
    if (gameOver.value) return

    const rate = isDay.value ? HUNGER_DAY_RATE : HUNGER_NIGHT_RATE
    const multiplier = isBlizzard.value ? 1.5 : 1
    const increase = rate * multiplier

    const oldLevel = hungerLevel.value
    hunger.value = Math.min(100, hunger.value + increase)
    const newLevel = hungerLevel.value

    if (oldLevel !== newLevel) {
      if (newLevel === 'hungry') {
        addLog('你感到有些饥饿，行动效率开始下降...', 'warning')
      } else if (newLevel === 'very_hungry') {
        addLog('你非常饥饿，体温流失加快！', 'warning')
      } else if (newLevel === 'starving') {
        addLog('⚠️ 你已极度饥饿，再不进食将有生命危险！', 'danger')
      }
    }

    if (hungerLevel.value === 'starving') {
      temperature.value = Math.max(0, temperature.value - 0.5)
    }

    checkGameOver()
  }

  function processDigestion() {
    if (gameOver.value || digestionQueue.value.length === 0) return

    const item = digestionQueue.value[0]
    if (item.remainingSteps > 0) {
      const reduction = DIGESTION_AMOUNT
      hunger.value = Math.max(0, hunger.value - reduction)
      item.remainingSteps--

      if (item.remainingSteps === 0) {
        const tempBonus = Math.floor(Math.random() * 3) + 2
        temperature.value = Math.min(100, temperature.value + tempBonus)
        addLog(`食物消化完成，体温恢复 ${tempBonus}`, 'success')
        digestionQueue.value.shift()
      }
    } else {
      digestionQueue.value.shift()
    }

    if (digestionQueue.value.length === 0) {
      stopDigestion()
    }
  }

  function startDigestion() {
    if (digestionTimer) return
    digestionTimer = setInterval(() => {
      processDigestion()
    }, DIGESTION_INTERVAL)
  }

  function stopDigestion() {
    if (digestionTimer) {
      clearInterval(digestionTimer)
      digestionTimer = null
    }
  }

  function consumeHeat() {
    if (gameOver.value) return
    
    const multiplier = isBlizzard.value ? 2 : 1
    const consumption = HEAT_CONSUMPTION_RATE * multiplier
    
    if (heat.value >= consumption) {
      heat.value -= consumption
      if (temperature.value < 80) {
        temperature.value = Math.min(80, temperature.value + 1)
      }
    } else {
      heat.value = 0
      temperature.value = Math.max(0, temperature.value - consumption)
      addLog('热量不足！体温正在下降...', 'warning')
    }
    
    checkGameOver()
  }

  function startNightCycle() {
    addLog(`夜幕降临，第 ${dayCount.value} 天结束`, 'info')
    nightConsumptionTimer = setInterval(() => {
      consumeHeat()
    }, 1000)

    startHungerTimer()
    
    if (Math.random() < BLIZZARD_CHANCE) {
      triggerBlizzard()
    }
  }

  function startDayCycle() {
    dayCount.value++
    addLog(`天亮了，第 ${dayCount.value} 天开始`, 'success')
    isBlizzard.value = false
    if (nightConsumptionTimer) {
      clearInterval(nightConsumptionTimer)
      nightConsumptionTimer = null
    }
  }

  function startHungerTimer() {
    if (hungerTimer) return
    hungerTimer = setInterval(() => {
      increaseHunger()
    }, 1000)
  }

  function stopHungerTimer() {
    if (hungerTimer) {
      clearInterval(hungerTimer)
      hungerTimer = null
    }
  }

  function toggleDayNight() {
    isDay.value = !isDay.value
    if (isDay.value) {
      startDayCycle()
    } else {
      startNightCycle()
    }
  }

  function triggerBlizzard() {
    isBlizzard.value = true
    addLog('⚠️ 暴风雪来袭！所有消耗加倍！', 'danger')
  }

  function chopWood() {
    if (gameOver.value || isNight.value) return
    
    const blizzardMultiplier = isBlizzard.value ? 2 : 1
    const hungerMultiplier = tempCostMultiplier.value
    const tempCost = Math.round(5 * blizzardMultiplier * hungerMultiplier)
    
    temperature.value = Math.max(0, temperature.value - tempCost)
    const baseWood = Math.floor(Math.random() * 3) + 2
    const woodGained = Math.max(1, Math.floor(baseWood * actionEfficiency.value))
    wood.value += woodGained

    const efficiencyText = actionEfficiency.value < 1 ? ` (效率${Math.round(actionEfficiency.value * 100)}%)` : ''
    addLog(`砍柴：获得 ${woodGained} 木头，消耗 ${tempCost} 体温${efficiencyText}`, 'action')
    
    if (Math.random() < BLIZZARD_CHANCE * 0.5) {
      triggerBlizzard()
    }
    
    checkGameOver()
  }

  function hunt() {
    if (gameOver.value || isNight.value) return
    
    const blizzardMultiplier = isBlizzard.value ? 2 : 1
    const hungerMultiplier = tempCostMultiplier.value
    const tempCost = Math.round(8 * blizzardMultiplier * hungerMultiplier)
    
    temperature.value = Math.max(0, temperature.value - tempCost)
    
    const adjustedSuccessRate = huntSuccessRate.value * actionEfficiency.value
    
    if (Math.random() < adjustedSuccessRate) {
      const baseFood = Math.floor(Math.random() * 3) + 2
      const baseHide = Math.floor(Math.random() * 2) + 1
      const foodGained = Math.max(1, Math.floor(baseFood * actionEfficiency.value))
      const hideGained = Math.max(1, Math.floor(baseHide * actionEfficiency.value))
      food.value += foodGained
      hide.value += hideGained
      const efficiencyText = actionEfficiency.value < 1 ? ` (效率${Math.round(actionEfficiency.value * 100)}%)` : ''
      addLog(`狩猎成功：获得 ${foodGained} 食物，${hideGained} 兽皮，消耗 ${tempCost} 体温${efficiencyText}`, 'success')
    } else {
      addLog(`狩猎失败：消耗 ${tempCost} 体温，空手而归`, 'warning')
    }
    
    if (Math.random() < BLIZZARD_CHANCE * 0.5) {
      triggerBlizzard()
    }
    
    checkGameOver()
  }

  function makeTools() {
    if (gameOver.value || isNight.value) return
    if (wood.value < 2 || hide.value < 1) {
      addLog('材料不足：需要 2 木头和 1 兽皮', 'warning')
      return
    }
    
    const blizzardMultiplier = isBlizzard.value ? 2 : 1
    const hungerMultiplier = tempCostMultiplier.value
    const tempCost = Math.round(6 * blizzardMultiplier * hungerMultiplier)
    
    wood.value -= 2
    hide.value -= 1
    tools.value += 1
    temperature.value = Math.max(0, temperature.value - tempCost)
    
    const efficiencyText = tempCostMultiplier.value > 1 ? ` (消耗+${Math.round((tempCostMultiplier.value - 1) * 100)}%)` : ''
    addLog(`制作工具：获得 1 工具，消耗 ${tempCost} 体温${efficiencyText}`, 'success')
    checkGameOver()
  }

  function makeFire() {
    if (gameOver.value || !canMakeFire.value) {
      addLog('木头不足：生火需要 3 木头', 'warning')
      return
    }
    
    wood.value -= 3
    const heatGained = Math.floor(Math.random() * 20) + 25
    heat.value = Math.min(100, heat.value + heatGained)
    temperature.value = Math.min(100, temperature.value + 10)
    
    addLog(`生火：获得 ${heatGained} 热量，体温上升 10`, 'success')
  }

  function eatFood() {
    if (gameOver.value || food.value < 1) {
      addLog('没有食物了！', 'warning')
      return
    }
    
    food.value -= 1

    const instantTemp = Math.floor(Math.random() * 3) + 1
    temperature.value = Math.min(100, temperature.value + instantTemp)
    
    digestionQueue.value.push({
      remainingSteps: FOOD_DIGESTION_STEPS,
      totalSteps: FOOD_DIGESTION_STEPS
    })

    const queueSize = digestionQueue.value.length
    addLog(`进食：立即恢复 ${instantTemp} 体温，开始消化（队列中 ${queueSize} 份食物）`, 'success')

    startDigestion()
  }

  function startTimers() {
    dayNightTimer = setInterval(() => {
      toggleDayNight()
    }, isDay.value ? DAY_DURATION : NIGHT_DURATION)
    
    autoSaveTimer = setInterval(() => {
      saveGame('auto')
    }, 10000)

    startHungerTimer()

    if (digestionQueue.value.length > 0) {
      startDigestion()
    }
  }

  function stopTimers() {
    if (dayNightTimer) {
      clearInterval(dayNightTimer)
      dayNightTimer = null
    }
    if (nightConsumptionTimer) {
      clearInterval(nightConsumptionTimer)
      nightConsumptionTimer = null
    }
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
    }
    stopHungerTimer()
    stopDigestion()
  }

  function saveGame(slot = 'manual') {
    const gameState = {
      temperature: temperature.value,
      heat: heat.value,
      wood: wood.value,
      food: food.value,
      hide: hide.value,
      tools: tools.value,
      hunger: hunger.value,
      digestionQueue: digestionQueue.value,
      isDay: isDay.value,
      dayCount: dayCount.value,
      isBlizzard: isBlizzard.value,
      savedAt: Date.now()
    }
    localStorage.setItem(`snowSurvival_${slot}`, JSON.stringify(gameState))
    addLog(`游戏已保存到存档位：${slot === 'auto' ? '自动存档' : slot}`, 'info')
  }

  function loadGame(slot = 'auto') {
    const saved = localStorage.getItem(`snowSurvival_${slot}`)
    if (!saved) {
      addLog('没有找到存档', 'warning')
      return false
    }
    
    try {
      const gameState = JSON.parse(saved)
      temperature.value = gameState.temperature
      heat.value = gameState.heat
      wood.value = gameState.wood
      food.value = gameState.food
      hide.value = gameState.hide
      tools.value = gameState.tools
      hunger.value = gameState.hunger || 0
      digestionQueue.value = gameState.digestionQueue || []
      isDay.value = gameState.isDay
      dayCount.value = gameState.dayCount
      isBlizzard.value = gameState.isBlizzard
      gameOver.value = false
      gameOverReason.value = ''
      actionLog.value = []
      
      stopTimers()
      startTimers()
      
      if (!isDay.value) {
        startNightCycle()
      }
      
      addLog(`成功加载存档：${slot === 'auto' ? '自动存档' : slot}`, 'success')
      return true
    } catch (e) {
      addLog('存档损坏，无法加载', 'danger')
      return false
    }
  }

  function getSaveSlots() {
    const slots = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith('snowSurvival_')) {
        const slotName = key.replace('snowSurvival_', '')
        try {
          const data = JSON.parse(localStorage.getItem(key))
          slots.push({
            name: slotName,
            dayCount: data.dayCount,
            savedAt: data.savedAt
          })
        } catch (e) {}
      }
    }
    return slots
  }

  function deleteSave(slot) {
    localStorage.removeItem(`snowSurvival_${slot}`)
    addLog(`已删除存档：${slot}`, 'info')
  }

  function restartGame() {
    temperature.value = 80
    heat.value = 50
    wood.value = 10
    food.value = 5
    hide.value = 0
    tools.value = 0
    hunger.value = 0
    digestionQueue.value = []
    isDay.value = true
    dayCount.value = 1
    isBlizzard.value = false
    gameOver.value = false
    gameOverReason.value = ''
    actionLog.value = []
    
    stopTimers()
    startTimers()
    
    addLog('新游戏开始！祝你好运！', 'success')
  }

  onMounted(() => {
    startTimers()
    addLog('欢迎来到雪地生存！白天收集资源，夜晚保持温暖。', 'info')
  })

  onUnmounted(() => {
    stopTimers()
  })

  return {
    temperature,
    heat,
    wood,
    food,
    hide,
    tools,
    hunger,
    hungerLevel,
    hungerLabel,
    actionEfficiency,
    tempCostMultiplier,
    isDigesting,
    digestionQueue,
    isDay,
    isNight,
    dayCount,
    isBlizzard,
    gameOver,
    gameOverReason,
    actionLog,
    isDanger,
    canMakeFire,
    canHunt,
    huntSuccessRate,
    chopWood,
    hunt,
    makeTools,
    makeFire,
    eatFood,
    saveGame,
    loadGame,
    getSaveSlots,
    deleteSave,
    restartGame
  }
}
