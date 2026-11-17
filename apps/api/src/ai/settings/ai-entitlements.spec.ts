import { aiEntitlements } from './ai-entitlements';

const FREE = {
  email: 'ada@example.com',
  emailVerified: true,
  isDemo: false,
  plan: 'free',
  aiPack: false,
};

describe('aiEntitlements', () => {
  it('is free without a pack, a plan or full access', () => {
    expect(aiEntitlements(FREE, new Set())).toEqual({ plan: 'free', aiTier: 'free' });
  });

  it('gives Pro and the AI pack to a full-access email, ignoring case and spaces', () => {
    const account = { ...FREE, email: ' Ada@Example.COM ' };
    expect(aiEntitlements(account, new Set(['ada@example.com']))).toEqual({
      plan: 'pro',
      aiTier: 'ai-pack',
    });
  });

  it('reads the stored plan and AI pack separately', () => {
    expect(aiEntitlements({ ...FREE, aiPack: true }, new Set())).toEqual({
      plan: 'free',
      aiTier: 'ai-pack',
    });
    expect(aiEntitlements({ ...FREE, plan: 'pro' }, new Set())).toEqual({
      plan: 'pro',
      aiTier: 'free',
    });
  });

  it('never matches an email that does not normalise', () => {
    expect(
      aiEntitlements({ ...FREE, email: 'ädä@example.com' }, new Set(['ädä@example.com'])),
    ).toEqual({ plan: 'free', aiTier: 'free' });
  });

  it('ignores a full-access email the provider did not verify', () => {
    const account = { ...FREE, emailVerified: false };
    expect(aiEntitlements(account, new Set(['ada@example.com']))).toEqual({
      plan: 'free',
      aiTier: 'free',
    });
  });

  it('never gives full access to a demo user', () => {
    const account = { ...FREE, isDemo: true };
    expect(aiEntitlements(account, new Set(['ada@example.com']))).toEqual({
      plan: 'free',
      aiTier: 'free',
    });
  });

  it('keeps a stored AI pack for an unverified email', () => {
    expect(aiEntitlements({ ...FREE, emailVerified: false, aiPack: true }, new Set())).toEqual({
      plan: 'free',
      aiTier: 'ai-pack',
    });
  });
});
