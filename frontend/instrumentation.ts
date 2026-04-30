// instrumentation.ts — Next.js OTel SDK initialisation (Node.js runtime only)
// Enabled via `experimental.instrumentationHook: true` in next.config.ts
// This file runs once at server startup before any request is handled.
//
// Only traces SSR requests — browser-side spans are not supported here.
// To disable: remove OTEL_EXPORTER_OTLP_ENDPOINT from environment.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { getNodeAutoInstrumentations } = await import(
      "@opentelemetry/auto-instrumentations-node"
    );
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    );
    const { Resource } = await import("@opentelemetry/resources");
    const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = await import(
      "@opentelemetry/semantic-conventions"
    );

    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    if (!endpoint) return; // OTel disabled when endpoint not set

    const sdk = new NodeSDK({
      resource: new Resource({
        [ATTR_SERVICE_NAME]:
          process.env.OTEL_SERVICE_NAME ?? "pulse-frontend",
        [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "unknown",
      }),
      traceExporter: new OTLPTraceExporter({
        url: `${endpoint}/v1/traces`,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          // Reduce noise: disable fs and DNS auto-instrumentation
          "@opentelemetry/instrumentation-fs": { enabled: false },
          "@opentelemetry/instrumentation-dns": { enabled: false },
        }),
      ],
    });

    sdk.start();

    process.on("SIGTERM", () => {
      sdk.shutdown().catch(console.error);
    });
  }
}
