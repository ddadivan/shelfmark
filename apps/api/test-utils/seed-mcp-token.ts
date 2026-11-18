import type { PrismaService } from '../src/prisma/prisma.service';
import { generateToken } from '../src/mcp/tokens/generate-token';
import type { SeededMcpToken } from './models/seeded-mcp-token.interface';

/**
 * A personal MCP token for `userId`, written straight to the database (no session needed), with its
 * secret for the `Authorization` header. The account still needs Pro to use it (`plan: 'pro'`).
 */
export async function seedMcpToken(
  prisma: PrismaService,
  userId: string,
  options: { includeNotes?: boolean; name?: string } = {},
): Promise<SeededMcpToken> {
  const generated = generateToken();
  const row = await prisma.mcpToken.create({
    data: {
      userId,
      name: options.name ?? 'Test client',
      includeNotes: options.includeNotes ?? false,
      tokenHash: generated.hash,
      last4: generated.last4,
    },
    select: { id: true },
  });
  return { id: row.id, secret: generated.secret };
}
