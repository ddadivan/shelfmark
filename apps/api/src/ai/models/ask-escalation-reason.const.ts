/**
 * Why the quick model asks for a deeper answer (ADR 0055 point 1): several dependent counts or
 * filters, a synthesis across many links, the user asked for depth, or it is unsure.
 */
export const ASK_ESCALATION_REASON = {
  MultiStep: 'multi_step',
  Synthesis: 'synthesis',
  DepthRequested: 'depth_requested',
  Unsure: 'unsure',
} as const;
