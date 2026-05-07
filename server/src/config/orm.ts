// data-source.ts
import { DataSource } from "typeorm";
import { Post } from "../tables/posts.js";

export const TypeORMConfig = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: process.env.PG_PASSWORD,
  database: "wind_db",
  synchronize: true, // 开发时自动建表，生产环境需修改 migrations
  entities: [Post],
});
