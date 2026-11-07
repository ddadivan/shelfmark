import { Logger } from '@nestjs/common';
import { EXPORT_FORMAT } from '@shelfmark/contracts';
import type { PrismaService } from '../prisma/prisma.service';
import { ExportService } from './export.service';

describe('ExportService stream failure', () => {
  it('logs only the error class and aborts the stream', async () => {
    const secret = 'user-secret-value';
    const prisma = {
      folder: { findMany: async () => [] },
      link: {
        findMany: async () => {
          throw new TypeError(secret);
        },
      },
    } as unknown as PrismaService;
    const logged: string[] = [];
    vi.spyOn(Logger.prototype, 'error').mockImplementation((message: unknown) => {
      logged.push(String(message));
    });
    const file = await new ExportService(prisma).prepare('user-id', {
      format: EXPORT_FORMAT.Json,
    });
    await expect(
      (async () => {
        for await (const chunk of file.body) void chunk;
      })(),
    ).rejects.toThrow(TypeError);
    expect(logged).toEqual(['Export stream failed: TypeError']);
    expect(logged.join()).not.toContain(secret);
  });
});
