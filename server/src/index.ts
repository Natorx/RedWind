import "dotenv/config"
import fastify from "fastify";
import cors from '@fastify/cors';
import router from "./router.js";
import { TypeORMConfig } from "./config/orm.js";

const server = fastify({
  logger: !!(process.env.NODE_ENV !== "development"),
});
await server.register(cors, {
origin: true,
methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
credentials: true,
});

TypeORMConfig.initialize().then(()=>{
  console.log("✅ PGSql Connected!")
  server.register(router);
  return server.listen({ host:'0.0.0.0', port: Number(process.env.PORT) || 3006 });
}).then(()=>{
  console.log(`🚀 Redwind Fastify server running on port http://localhost:${process.env.PORT}`,);
})


