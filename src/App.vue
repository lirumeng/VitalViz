<script setup>
import MimicDashboard from "./components/MimicDashboard.vue";
</script>

<template>
  <main class="app-shell">
    <section class="hero">
      <p class="eyebrow">VitalViz Clinical Explorer</p>
      <h1>MIMIC-III Demo 临床探索看板</h1>
      <p class="intro">
        这个版本围绕患者概览、ICU 监护、检验分析和用药分析四个主题组织数据，
        直接从本地 CSV 拉取并生成可切换的探索视图。
      </p>
    </section>
    <MimicDashboard />
  </main>
</template>
