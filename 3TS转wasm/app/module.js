const fs = require("fs");
const path = require("path");
const wasm = new WebAssembly.Module(
  fs.readFileSync(path.join(__dirname, "../", "./dist/module.optimized.wasm")),
  {}
);
module.exports = new WebAssembly.Instance(wasm).exports;