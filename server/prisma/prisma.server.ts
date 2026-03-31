import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
// import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL || "postgresql://postgres:nn20142026@localhost:5432/wind_db?schema=public",
      password: process.env.DB_PASSWORD || 'nn20142026',
    });
    // const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
    super({ adapter });
  }
}
