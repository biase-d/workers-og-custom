import { build } from "esbuild";
import { dtsPlugin } from "esbuild-plugin-d.ts";

build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outdir: "dist",
  format: "esm",
  loader: {
    ".wasm": "base64",
  },
  minify: true,
  plugins: [dtsPlugin()],
}).catch(() => process.exit(1));
