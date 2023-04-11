import tracer from "dd-trace";

tracer.init({
  hostname: process.env.IS_DOCKER ? "172.17.0.1" : undefined,
  sampleRate: 1,
  // TODO: Enabling log injection would let us associate logs with traces, but this requires setting up a json
  // logger rather than using console.log
  // logInjection: true
});
tracer.use('express', {
  service: 'forummagnum'
})

export default tracer;
