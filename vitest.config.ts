import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    test: {
        environment: "node",
        globals: true,
        include: ["tests/**/*.spec.ts", "src/**/*.spec.ts"],
        exclude: ["node_modules", "dist"],
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
        "#application": resolve(__dirname, "./src/application"),
        "#composition": resolve(__dirname, "./src/composition"),
        "#domain": resolve(__dirname, "./src/domain"),
        "#infrastructure": resolve(__dirname, "./src/infrastructure"),
        "#shared": resolve(__dirname, "./src/shared"),
        application: resolve(__dirname, "./src/application"),
        composition: resolve(__dirname, "./src/composition"),
        domain: resolve(__dirname, "./src/domain"),
        infrastructure: resolve(__dirname, "./src/infrastructure"),
        shared: resolve(__dirname, "./src/shared"),
      },
    },
});
