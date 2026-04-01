import { Module } from '@nestjs/common';

import { AccountsModule } from './accounts/accounts.module';
import { PrismaService } from 'prisma/prisma.server';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [AccountsModule],
  controllers: [AppController],
  providers: [PrismaService,AppService],
})
export class AppModule {}
