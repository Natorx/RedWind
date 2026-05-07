import fastify from "fastify";
import router from "./router.js";
import "dotenv/config"
import { TypeORMConfig } from "./config/orm.js";

const server = fastify({
  logger: !!(process.env.NODE_ENV !== "development"),
});
TypeORMConfig.initialize().then(()=>{
  console.log("✅ PGSql Connected!")
  server.register(router);
  return server.listen({ host:'0.0.0.0', port: Number(process.env.PORT) || 3006 });
}).then(()=>{
  console.log(`🚀 Redwind Fastify server running on port http://localhost:${process.env.PORT}`,);
}).catch((err)=>{
  console.error("❌Redwind Server Failed to start", err);
})


