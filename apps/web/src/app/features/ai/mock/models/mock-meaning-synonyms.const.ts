/**
 * Words the mock search by meaning treats as one (mock builds only), tuned to the demo library like
 * the API's `MOCK_EMBEDDING_SYNONYMS`: the first word of a group stands for the others.
 */
export const MOCK_MEANING_SYNONYMS: ReadonlyArray<readonly string[]> = [
  ['jacket', 'coat', 'overshirt', 'jumper', 'sweater', 'outerwear'],
  ['clothes', 'clothing', 'wear', 'outfit', 'garment'],
  ['warm', 'insulated', 'winter', 'cosy', 'cozy'],
  ['signal', 'signals', 'reactivity', 'reactive', 'signalstore', 'linkedsignal'],
  ['performance', 'fast', 'faster', 'speed', 'render', 'rendering', 'zoneless'],
  ['ramen', 'noodle', 'noodles'],
  ['course', 'courses', 'lesson', 'lessons', 'learn', 'tutorial'],
  ['accessibility', 'accessible', 'a11y', 'screen'],
  ['form', 'forms', 'validation', 'validator', 'validators'],
];
