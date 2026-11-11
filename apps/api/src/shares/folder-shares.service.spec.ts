import { PRISMA_ERROR_CODE } from '../common/prisma/prisma-error-code.const';
import type { FoldersService } from '../folders/folders.service';
import type { PrismaService } from '../prisma/prisma.service';
import { FolderSharesService } from './folder-shares.service';

const FOLDER = '00000000-0000-4000-8000-000000000001';
const USER = '00000000-0000-4000-8000-000000000002';
const ROW = {
  folderId: FOLDER,
  token: 'A'.repeat(22),
  showNotes: false,
  tokenCreatedAt: new Date('2026-11-11T00:00:00Z'),
};

function uniqueViolation(): Error {
  return Object.assign(new Error('unique'), { code: PRISMA_ERROR_CODE.UniqueViolation });
}

function setup(updateMany: ReturnType<typeof vi.fn>) {
  const prisma = {
    folderShare: { updateMany, findFirst: vi.fn().mockResolvedValue(ROW) },
  } as unknown as PrismaService;
  const folders = {
    requireOwned: vi.fn().mockResolvedValue(undefined),
  } as unknown as FoldersService;
  return new FolderSharesService(prisma, folders);
}

describe('FolderSharesService reset (token collisions)', () => {
  it('retries a token that hit the unique index', async () => {
    const updateMany = vi
      .fn()
      .mockRejectedValueOnce(uniqueViolation())
      .mockResolvedValueOnce({ count: 1 });
    const result = await setup(updateMany).reset(USER, FOLDER);
    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ enabled: true, token: ROW.token });
  });

  it('gives up after three collisions and rethrows other errors at once', async () => {
    const colliding = vi.fn().mockRejectedValue(uniqueViolation());
    await expect(setup(colliding).reset(USER, FOLDER)).rejects.toThrow('unique');
    expect(colliding).toHaveBeenCalledTimes(3);

    const failing = vi.fn().mockRejectedValue(new Error('down'));
    await expect(setup(failing).reset(USER, FOLDER)).rejects.toThrow('down');
    expect(failing).toHaveBeenCalledTimes(1);
  });
});
