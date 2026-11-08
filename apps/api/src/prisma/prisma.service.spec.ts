import { PrismaService } from './prisma.service';

const UNREACHABLE_URL = 'postgresql://user:secret@127.0.0.1:1/db';

describe('PrismaService', () => {
  it('does not connect on construction', () => {
    expect(() => new PrismaService(UNREACHABLE_URL)).not.toThrow();
  });

  it('disconnects on module destroy', async () => {
    const service = new PrismaService(UNREACHABLE_URL);
    const disconnect = vi.spyOn(service, '$disconnect').mockResolvedValue();
    await service.onModuleDestroy();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('destroys cleanly when it never connected', async () => {
    await expect(new PrismaService(UNREACHABLE_URL).onModuleDestroy()).resolves.toBeUndefined();
  });
});
