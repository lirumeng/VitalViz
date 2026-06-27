<script setup>
import * as d3 from "d3";
import { computed } from "vue";

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ""
  },
  data: {
    type: Array,
    default: () => []
  },
  color: {
    type: String,
    default: "#0f766e"
  },
  valueSuffix: {
    type: String,
    default: ""
  },
  percentage: {
    type: Boolean,
    default: false
  }
});

const width = 560;
const rowHeight = 34;
const margin = { top: 18, right: 70, bottom: 18, left: 140 };

const displayData = computed(() => props.data.slice(0, 8));
const chartHeight = computed(
  () => margin.top + margin.bottom + displayData.value.length * rowHeight
);

const xScale = computed(() =>
  d3
    .scaleLinear()
    .domain([0, d3.max(displayData.value, (item) => item.value) ?? 0])
    .nice()
    .range([margin.left, width - margin.right])
);

function formatValue(value) {
  if (props.percentage) {
    return `${d3.format(".1f")(value)}%`;
  }

  if (Math.abs(value) >= 1000) {
    return `${d3.format(",.0f")(value)}${props.valueSuffix}`;
  }

  if (Number.isInteger(value)) {
    return `${value}${props.valueSuffix}`;
  }

  return `${d3.format(".1f")(value)}${props.valueSuffix}`;
}
</script>

<template>
  <article class="viz-card">
    <div class="viz-card-head">
      <h3>{{ title }}</h3>
      <p v-if="description">{{ description }}</p>
    </div>

    <div v-if="displayData.length" class="chart-scroll">
      <svg
        class="chart-svg"
        :viewBox="`0 0 ${width} ${chartHeight}`"
        role="img"
        :aria-label="title"
      >
        <g
          v-for="(item, index) in displayData"
          :key="item.label"
          :transform="`translate(0, ${margin.top + index * rowHeight})`"
        >
          <text
            :x="margin.left - 12"
            y="19"
            text-anchor="end"
            class="chart-label"
          >
            {{ item.label }}
          </text>
          <rect
            :x="margin.left"
            y="6"
            :width="xScale(item.value) - margin.left"
            height="16"
            rx="8"
            :fill="color"
            opacity="0.9"
          />
          <text
            :x="xScale(item.value) + 8"
            y="19"
            text-anchor="start"
            class="chart-value"
          >
            {{ formatValue(item.value) }}
          </text>
        </g>
      </svg>
    </div>

    <p v-else class="empty-hint">暂无可展示数据</p>
  </article>
</template>
