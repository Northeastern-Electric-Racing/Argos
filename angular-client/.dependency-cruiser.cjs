/**
 * dependency-cruiser config written by `aglint init` for the layering and banned-apis capabilities; edit freely.
 * It reads the sources through the `typescript` package that Angular's compiler needs anyway (tsPreCompilationDeps).
 * Argos keeps only no-circular and the network chokepoints (HttpClient in src/api/, socket.io in SocketService).
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      name: "http-only-in-api",
      severity: "error",
      comment: "HttpClient only from src/api/ (main.ts provides it)",
      from: { path: "^src/", pathNot: ["^src/api/", "^src/main\\.ts$", "\\.spec\\.ts$"] },
      to: { path: "@angular/common/(fesm2022/|types/)?http[.]" },
    },
    {
      name: "http-only-socket-service",
      severity: "error",
      comment: "socket.io only from SocketService",
      from: { path: "^src/", pathNot: ["^src/services/socket\\.service\\.ts$", "\\.spec\\.ts$"] },
      to: { path: "(^|/)node_modules/socket\\.io-client/" },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    doNotFollow: { path: "(^|/)node_modules/" },
    exclude: { path: "(^|/)(dist|out-tsc|coverage|tools|\\.angular)/" },
    preserveSymlinks: false,
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "types", "default"],
                              extensions: [".ts", ".js", ".mjs", ".d.ts"] },
  },
};
