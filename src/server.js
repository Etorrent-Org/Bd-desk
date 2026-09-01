import { configFromEnv, assertProductionConfig } from './config.js';
import { createBdDeskApp } from './app.js';
const config=configFromEnv();
assertProductionConfig(config);
const server=createBdDeskApp(config);
server.listen(config.port,config.host,()=>console.log(`BD Desk http://${config.host}:${config.port}`));
