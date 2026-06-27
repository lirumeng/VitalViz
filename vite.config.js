import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => ({
  base: mode === "github" ? "/VitalViz/" : "/",
  plugins: [vue()]
}));
