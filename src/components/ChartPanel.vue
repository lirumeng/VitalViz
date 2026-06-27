<script setup>
import * as d3 from "d3";
import { computed, nextTick, onMounted, ref, watch } from "vue";

const chartHost = ref(null);
const loading = ref(true);
const errorMessage = ref("");
const rows = ref([]);

const totalValue = computed(() =>
  rows.value.reduce((sum, item) => sum + item.value, 0)
);

async function loadCsv() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await fetch("/data/metrics.csv");

    if (!response.ok) {
      throw new Error(`CSV 请求失败: ${response.status}`);
    }

    const raw = await response.text();
    rows.value = d3.csvParse(raw, (row) => ({
      category: row.category,
      value: Number(row.value)
    })).filter((row) => row.category && Number.isFinite(row.value));
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "未知错误";
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

function renderChart(data) {
  const container = chartHost.value;

  if (!container) {
    return;
  }

  const width = 720;
  const height = 420;
  const margin = { top: 24, right: 24, bottom: 56, left: 56 };

  d3.select(container).selectAll("*").remove();

  if (!data.length) {
    return;
  }

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", "CSV 数据柱状图");

  const x = d3
    .scaleBand()
    .domain(data.map((item) => item.category))
    .range([margin.left, width - margin.right])
    .padding(0.24);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (item) => item.value) ?? 0])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .call((g) => g.select(".domain").attr("stroke", "#94a3b8"))
    .call((g) => g.selectAll("text").attr("fill", "#475569"));

  svg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).ticks(6))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick line").attr("x2", width - margin.left - margin.right).attr("stroke", "#e2e8f0"))
    .call((g) => g.selectAll("text").attr("fill", "#475569"));

  svg
    .append("g")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", (item) => x(item.category) ?? 0)
    .attr("y", (item) => y(item.value))
    .attr("width", x.bandwidth())
    .attr("height", (item) => y(0) - y(item.value))
    .attr("rx", 12)
    .attr("fill", "#0f766e");

  svg
    .append("g")
    .selectAll("text")
    .data(data)
    .join("text")
    .attr("x", (item) => (x(item.category) ?? 0) + x.bandwidth() / 2)
    .attr("y", (item) => y(item.value) - 10)
    .attr("text-anchor", "middle")
    .attr("fill", "#134e4a")
    .attr("font-size", 12)
    .attr("font-weight", 600)
    .text((item) => item.value);
}

onMounted(loadCsv);

watch(rows, async (data) => {
  await nextTick();
  renderChart(data);
});
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <div>
        <h2>CSV 柱状图示例</h2>
        <p>数据来源：`public/data/metrics.csv`，页面通过 HTTP 请求拉取。</p>
      </div>
      <button class="reload-button" type="button" @click="loadCsv">
        重新请求数据
      </button>
    </div>

    <div class="stats">
      <article>
        <span>记录数</span>
        <strong>{{ rows.length }}</strong>
      </article>
      <article>
        <span>总值</span>
        <strong>{{ totalValue }}</strong>
      </article>
      <article>
        <span>请求状态</span>
        <strong>{{ loading ? "加载中" : errorMessage ? "失败" : "成功" }}</strong>
      </article>
    </div>

    <div v-if="loading" class="feedback">正在请求 CSV 数据...</div>
    <div v-else-if="errorMessage" class="feedback error">{{ errorMessage }}</div>
    <div v-else ref="chartHost" class="chart-host"></div>
  </section>
</template>
