/** Lazy loader of the library page; the routes share it and the route reuse recognises it. */
export const loadLibraryPage = () => import('./library.page');
