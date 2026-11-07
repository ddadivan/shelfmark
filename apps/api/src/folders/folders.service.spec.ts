import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { FoldersService } from './folders.service';

const USER = '019a0000-0000-7000-8000-000000000001';
const FOLDER = '019a0000-0000-7000-8000-000000000002';

function serviceFailingWith(error: unknown): FoldersService {
  const prisma = { $transaction: () => Promise.reject(error) } as unknown as PrismaService;
  return new FoldersService(prisma);
}

function p2003(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('fk', { code: 'P2003', clientVersion: 'test' });
}

describe('FoldersService foreign key violations', () => {
  it('maps P2003 on create (parent deleted concurrently) to 404', async () => {
    await expect(
      serviceFailingWith(p2003()).create(USER, { name: 'x', parentId: FOLDER }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps P2003 on update to 404', async () => {
    await expect(
      serviceFailingWith(p2003()).update(USER, FOLDER, { parentId: FOLDER }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rethrows other errors unchanged', async () => {
    const other = new Error('boom');
    await expect(serviceFailingWith(other).create(USER, { name: 'x' })).rejects.toBe(other);
  });
});
