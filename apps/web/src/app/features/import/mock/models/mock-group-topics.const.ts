import type { MockGroupTopic } from './mock-group-topic.interface';

/** The topics the mock grouping knows, in tie-break order (`Reading` is a mock library folder). */
export const MOCK_GROUP_TOPICS: readonly MockGroupTopic[] = [
  {
    name: 'Recipes',
    words: ['recipe', 'ramen', 'sourdough', 'baking', 'cooking', 'food', 'seriouseats'],
  },
  {
    name: 'Development',
    words: ['angular', 'developer', 'github', 'gitlab', 'stackoverflow', 'typescript', 'npm'],
  },
  { name: 'Reading', words: ['news', 'blog', 'article', 'medium', 'wikipedia', 'essay'] },
  { name: 'Design', words: ['figma', 'dribbble', 'behance', 'design', 'typeface', 'colour'] },
  { name: 'Video', words: ['youtube', 'vimeo', 'video', 'watch'] },
  { name: 'Travel', words: ['travel', 'hotel', 'booking', 'trip', 'flight'] },
];
