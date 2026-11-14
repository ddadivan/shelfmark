import type { PrismaService } from '../prisma/prisma.service';
import { UserActivityService, utcDay } from './user-activity.service';

function setup(executeRaw = vi.fn(() => Promise.resolve(1))) {
  const prisma = { $executeRaw: executeRaw } as unknown as PrismaService;
  return { service: new UserActivityService(prisma), executeRaw };
}

const MORNING = new Date('2026-11-14T08:00:00Z');
const EVENING = new Date('2026-11-14T23:59:00Z');
const NEXT_DAY = new Date('2026-11-15T00:01:00Z');

describe('UserActivityService', () => {
  it('formats the UTC day', () => {
    expect(utcDay(new Date('2026-11-14T23:59:59.999Z'))).toBe('2026-11-14');
  });

  it('writes a user once per UTC day and again on the next day', async () => {
    const { service, executeRaw } = setup();
    await service.touch('u1', MORNING);
    await service.touch('u1', EVENING);
    await service.touch('u2', EVENING);
    expect(executeRaw).toHaveBeenCalledTimes(2);
    await service.touch('u1', NEXT_DAY);
    expect(executeRaw).toHaveBeenCalledTimes(3);
  });

  it('writes the UTC day as a bound parameter, never the time', async () => {
    const { service, executeRaw } = setup();
    await service.touch('u1', EVENING);
    const values = (executeRaw.mock.calls[0] as unknown[]).slice(1);
    expect(values).toEqual(['2026-11-14', 'u1', '2026-11-14']);
  });

  it('never rejects when the write fails, and tries again on the next request', async () => {
    const executeRaw = vi
      .fn<() => Promise<number>>()
      .mockRejectedValueOnce(new Error('database down'))
      .mockResolvedValue(1);
    const { service } = setup(executeRaw);
    const warn = vi.spyOn(
      (service as unknown as { logger: { warn: (m: string) => void } }).logger,
      'warn',
    );
    warn.mockImplementation(() => undefined);
    await expect(service.touch('u1', MORNING)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith('Could not record the activity day');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('u1');
    await service.touch('u1', MORNING);
    expect(executeRaw).toHaveBeenCalledTimes(2);
  });
});
