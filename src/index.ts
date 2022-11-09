import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import {
  ConsoleMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";

const main = async () => {
  let { meterProvider, meter } = setUp();

  const counter = meter.createCounter("counter_name");

  //use the same counter but different attributes for the first time
  // for (let att_val of ["att_val1", "att_val2"]) {

  //for better readability only one set of attributes is used
  for (let att_val of ["att_val1"]) {
    counter.add(1, { att_key: att_val });
    counter.add(1, { att_key: att_val });
    //wait for otel agent to flush to aws cloudwatch
    await new Promise((resolve) => setTimeout(resolve, 2000));
    counter.add(1, { att_key: att_val });
    counter.add(1, { att_key: att_val });
    // wait for periodic exporter to flush to otel agent
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  await meterProvider.forceFlush();
  await meterProvider.shutdown();
};

function setUp() {
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: `backend`,
  });

  const meterProvider = new MeterProvider({
    resource,
  });

  const oltpMetricExporter = new OTLPMetricExporter({
    url: "http://localhost:4317",
  });
  const consoleMetricExporter = new ConsoleMetricExporter();

  meterProvider.addMetricReader(
    new PeriodicExportingMetricReader({
      exporter: consoleMetricExporter,
      exportIntervalMillis: 100,
    })
  );
  meterProvider.addMetricReader(
    new PeriodicExportingMetricReader({
      exporter: oltpMetricExporter,
      exportIntervalMillis: 100,
    })
  );

  let meter = meterProvider.getMeter("metrics");
  return { meterProvider, meter };
}

main().catch((e) => {
  console.log(e);
});
