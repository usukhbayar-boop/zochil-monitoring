import tracer from 'dd-trace';

tracer.init({
  logInjection: true,
  hostname: process.env.DD_AGENT_HOST,
  service: process.env.SERVICE_NAME || "api",
});

export default tracer;
