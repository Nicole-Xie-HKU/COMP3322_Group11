const { createApp } = require('./app');
const { readConfig } = require('./src/l1_building_blocks/config');
async function main() {
  const config = readConfig(), app = await createApp({ config });
  const server = app.listen(config.port,config.host,() => console.log(JSON.stringify({ event: 'listening', port: config.port, apiPrefix: config.apiPrefix })));
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  let stopping = false;
  async function stop() {
    if (stopping) return; stopping = true;
    const deadline = setTimeout(() => process.exit(1),10000).unref();
    server.close(async () => { await app.locals.close(); clearTimeout(deadline); });
    server.closeIdleConnections();
  }
  process.on('SIGTERM',stop); process.on('SIGINT',stop);
  server.on('error',async error => { console.error(JSON.stringify({ event: 'server_error', code: error.code })); await app.locals.close(); process.exitCode = 1; });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
