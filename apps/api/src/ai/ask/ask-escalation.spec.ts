import { AskEscalation, ASK_ESCALATION_REFUSAL } from './ask-escalation';

function setup(options: { text?: boolean; started?: number; allowance?: boolean } = {}) {
  const usage = {
    reserveDeep: vi.fn(() => Promise.resolve(options.allowance ?? true)),
    refundDeep: vi.fn(() => Promise.resolve()),
  };
  const escalation = new AskEscalation(
    usage,
    'user-a',
    'ai-pack',
    '2026-11-19',
    { hasText: options.text ?? false },
    options.started ?? Date.now(),
    { escalateBeforeMs: 10_000 },
  );
  return { usage, escalation };
}

describe('AskEscalation (ADR 0055 point 1)', () => {
  it('accepts once before any text and reserves the deep answer on the question day', async () => {
    const { usage, escalation } = setup();
    expect(await escalation.gate('synthesis')).toBeNull();
    expect(usage.reserveDeep).toHaveBeenCalledWith('user-a', 'ai-pack', '2026-11-19');
    expect(escalation.reserved).toBe(true);
    expect(await escalation.gate('unsure')).toBe(ASK_ESCALATION_REFUSAL.Once);
    expect(usage.reserveDeep).toHaveBeenCalledTimes(1);
  });

  it('refuses after text, after the time limit and when the deep allowance is used up', async () => {
    expect(await setup({ text: true }).escalation.gate('unsure')).toBe(
      ASK_ESCALATION_REFUSAL.AfterText,
    );
    expect(await setup({ started: Date.now() - 10_001 }).escalation.gate('unsure')).toBe(
      ASK_ESCALATION_REFUSAL.Late,
    );
    const usedUp = setup({ allowance: false });
    expect(await usedUp.escalation.gate('multi_step')).toBe(ASK_ESCALATION_REFUSAL.UsedUp);
    expect(usedUp.escalation.reserved).toBe(false);
  });

  it('refunds a reserved deep answer once, and nothing when none was reserved', async () => {
    const { usage, escalation } = setup();
    await escalation.refund();
    expect(usage.refundDeep).not.toHaveBeenCalled();
    await escalation.gate('synthesis');
    await escalation.refund();
    await escalation.refund();
    expect(usage.refundDeep).toHaveBeenCalledTimes(1);
  });
});
