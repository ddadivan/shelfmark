// Mirror the contract mocks (MOCK_ID, MOCK_NAME in libs/shared/contracts); the e2e project cannot
// import from them.
export const MOCK_FIXTURE = {
  readingId: '00000000-0000-4000-8000-000000000101',
  readingName: 'Reading',
  tagDocs: 'docs',
  searchWord: 'signals',
} as const;
