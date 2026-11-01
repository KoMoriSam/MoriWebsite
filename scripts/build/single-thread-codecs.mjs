const CODECS = [
  { suffix: "/@jsquash/avif/encode.js", threaded: "./codec/enc/avif_enc_mt.js", single: "./codec/enc/avif_enc.js" },
  { suffix: "/@jsquash/oxipng/optimise.js", threaded: "./codec/pkg-parallel/squoosh_oxipng.js", single: "./codec/pkg/squoosh_oxipng.js" },
];

const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  if (typeof node.type === "string") callback(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => visit(child, callback));
    else if (value && typeof value === "object") visit(value, callback);
  }
};

export function stripThreadedCodecs(source, id, parse) {
  const codec = CODECS.find(({ suffix }) => id.replaceAll("\\", "/").split("?")[0].endsWith(suffix));
  if (!codec) return null;
  if (!source.includes(codec.threaded) || !source.includes(codec.single)) {
    throw new Error(`Unexpected codec layout: ${id}`);
  }
  const ast = parse(source);
  const edits = [];
  let branches = 0;
  let threadImports = 0;
  visit(ast, (node) => {
    if (node.type === "ImportDeclaration" && node.source.value === "wasm-feature-detect") {
      if (node.specifiers.length !== 1 || node.specifiers[0].imported?.name !== "threads") {
        throw new Error(`Unexpected codec feature imports: ${id}`);
      }
      edits.push({ start: node.start, end: node.end, text: "" });
      threadImports++;
    }
    if (node.type === "IfStatement" && /\bthreads\s*\(/.test(source.slice(node.test.start, node.test.end))) {
      branches++;
      edits.push({ start: node.start, end: node.end, text: node.alternate ? source.slice(node.alternate.start, node.alternate.end) : "" });
    }
    if (node.type === "FunctionDeclaration" && node.id?.name === "initMT") {
      edits.push({ start: node.start, end: node.end, text: "" });
    }
  });
  if (branches !== 1 || threadImports !== 1) throw new Error(`Unexpected codec thread selection: ${id}`);
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  }
  if (source.includes(codec.threaded) || /\bthreads\s*\(/.test(source)) {
    throw new Error(`Threaded codec was not fully removed: ${id}`);
  }
  parse(source);
  return source;
}

// This deployment has no COOP/COEP headers, so WebAssembly threads cannot run.
// Keep encoding in the existing conversion worker and ship only the usable codecs.
export function singleThreadCodecs() {
  return {
    name: "single-thread-image-codecs",
    apply: "build",
    enforce: "pre",
    transform(source, id) {
      const code = stripThreadedCodecs(source, id, (value) => this.parse(value));
      return code === null ? null : { code, map: null };
    },
  };
}
