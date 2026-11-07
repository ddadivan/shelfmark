import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { TagsService } from './tags.service';

function serviceFailingWith(error: unknown): TagsService {
  const prisma = { $transaction: () => Promise.reject(error) } as unknown as PrismaService;
  return new TagsService(prisma);
}

describe('TagsService merge errors', () => {
  it('maps a foreign key violation (target deleted concurrently) to 404', async () => {
    const service = serviceFailingWith(Object.assign(new Error('fk'), { code: 'P2003' }));
    await expect(service.merge('u', 'a', 'b')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rethrows other errors unchanged', async () => {
    const failure = new Error('boom');
    await expect(serviceFailingWith(failure).merge('u', 'a', 'b')).rejects.toBe(failure);
  });
});
