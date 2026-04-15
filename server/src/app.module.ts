import { Module } from '@nestjs/common';

import { AccountsModule } from './accounts/accounts.module';
import { PrismaService } from 'prisma/prisma.server';

import { PrinterModule } from './printer/printer.module';
import { CrawlerModule } from './crawler/crawler.module';

@Module({
  imports: [AccountsModule, PrinterModule, CrawlerModule],
  controllers: [],
  providers: [PrismaService],
})
export class AppModule {}
