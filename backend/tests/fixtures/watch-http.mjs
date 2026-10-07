import {createRequire} from 'node:module';
import {fakeDatabase} from '../fakeDatabase.mjs';
const require=createRequire(import.meta.url);
const {createApp}=require('../../app');
const {readConfig}=require('../../src/l1_building_blocks/config');
const app=await createApp({db:fakeDatabase(),config:readConfig({CURSOR_SECRET:'test-only-'.repeat(5)}),
  logger:{info(){},error(){}}});
const server=app.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({url:`http://127.0.0.1:${server.address().port}`})));
async function stop() {
  server.close();server.closeAllConnections();await app.locals.close();
}
process.once('SIGTERM',stop);process.once('SIGINT',stop);
