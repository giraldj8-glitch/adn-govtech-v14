import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

/* Compila todo (JS, CSS, GSAP y Three.js) en un único HTML que abre con doble clic. */
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
  build: { target: "es2020", outDir: "dist", assetsInlineLimit: 100000000, cssCodeSplit: false, chunkSizeWarningLimit: 2000 }
});
