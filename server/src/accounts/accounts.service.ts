import { Injectable } from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';

import { PrismaService } from 'prisma/prisma.server';
import { Account, Prisma } from 'generated/prisma/client';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}
  async create(data: Prisma.AccountCreateInput): Promise<Account> {
    return this.prisma.account.create({
      data,
    });
  }

  findAll() {
    return this.prisma.account.findMany();
  }

  findOne(id: number) {
    return `This action returns a #${id} account`;
  }

  remove(id: number) {
    return `This action removes a #${id} account`;
  }
}
