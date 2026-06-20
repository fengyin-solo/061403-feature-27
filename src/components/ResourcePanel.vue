<template>
  <div class="resource-panel">
    <h3 class="panel-title">资源</h3>
    <div class="resources-grid">
      <div class="resource-item">
        <span class="resource-icon">🔥</span>
        <div class="resource-info">
          <span class="resource-name">热量</span>
          <div class="resource-bar-container">
            <div class="resource-bar" :style="{ width: heat + '%', background: getHeatColor() }"></div>
          </div>
          <span class="resource-value">{{ Math.round(heat) }}/100</span>
        </div>
      </div>
      <div class="resource-item hunger-item" :class="hungerLevel">
        <span class="resource-icon">🍽️</span>
        <div class="resource-info">
          <span class="resource-name">饥饿度
            <span v-if="isDigesting" class="digesting-badge">消化中</span>
          </span>
          <div class="resource-bar-container">
            <div class="resource-bar hunger-bar" :style="{ width: hunger + '%', background: getHungerColor() }"></div>
          </div>
          <span class="resource-value">{{ Math.round(hunger) }}/100 · {{ hungerLabel }}</span>
        </div>
      </div>
      <div class="resource-item">
        <span class="resource-icon">🪵</span>
        <div class="resource-info">
          <span class="resource-name">木头</span>
          <span class="resource-value-large">{{ wood }}</span>
        </div>
      </div>
      <div class="resource-item">
        <span class="resource-icon">🍖</span>
        <div class="resource-info">
          <span class="resource-name">食物</span>
          <span class="resource-value-large">{{ food }}</span>
        </div>
      </div>
      <div class="resource-item">
        <span class="resource-icon">🦊</span>
        <div class="resource-info">
          <span class="resource-name">兽皮</span>
          <span class="resource-value-large">{{ hide }}</span>
        </div>
      </div>
      <div class="resource-item">
        <span class="resource-icon">🔪</span>
        <div class="resource-info">
          <span class="resource-name">工具</span>
          <span class="resource-value-large">{{ tools }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  heat: { type: Number, default: 0 },
  hunger: { type: Number, default: 0 },
  hungerLevel: { type: String, default: 'full' },
  hungerLabel: { type: String, default: '饱食' },
  isDigesting: { type: Boolean, default: false },
  wood: { type: Number, default: 0 },
  food: { type: Number, default: 0 },
  hide: { type: Number, default: 0 },
  tools: { type: Number, default: 0 }
})

function getHeatColor() {
  if (props.heat > 60) return 'linear-gradient(to right, #ff6600, #ffcc00)'
  if (props.heat > 30) return 'linear-gradient(to right, #ff9933, #ffcc00)'
  return 'linear-gradient(to right, #cc3300, #ff6600)'
}

function getHungerColor() {
  if (props.hunger < 20) return 'linear-gradient(to right, #2ecc71, #27ae60)'
  if (props.hunger < 50) return 'linear-gradient(to right, #f39c12, #e67e22)'
  if (props.hunger < 80) return 'linear-gradient(to right, #e67e22, #d35400)'
  return 'linear-gradient(to right, #e74c3c, #c0392b)'
}
</script>

<style scoped>
.resource-panel {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.panel-title {
  color: white;
  font-size: 18px;
  margin-bottom: 15px;
  text-align: center;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.resources-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  transition: transform 0.2s;
}

.resource-item:hover {
  transform: translateX(5px);
  background: rgba(0, 0, 0, 0.3);
}

.resource-icon {
  font-size: 28px;
  width: 40px;
  text-align: center;
}

.resource-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resource-name {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
}

.resource-bar-container {
  height: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.resource-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.resource-value {
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.resource-value-large {
  color: white;
  font-size: 24px;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.hunger-item {
  transition: all 0.3s ease;
}

.hunger-item.very_hungry {
  background: rgba(230, 126, 34, 0.2);
  border-color: rgba(230, 126, 34, 0.5);
}

.hunger-item.starving {
  background: rgba(231, 76, 60, 0.2);
  border-color: rgba(231, 76, 60, 0.5);
  animation: hungerPulse 1.5s ease-in-out infinite;
}

@keyframes hungerPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4); }
  50% { box-shadow: 0 0 10px 2px rgba(231, 76, 60, 0.3); }
}

.digesting-badge {
  display: inline-block;
  background: rgba(46, 204, 113, 0.8);
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  margin-left: 6px;
  animation: digestGlow 2s ease-in-out infinite;
}

@keyframes digestGlow {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.hunger-bar {
  transition: width 0.5s ease, background 0.3s ease;
}
</style>
