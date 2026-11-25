/**
 * Shape version of a stored `ReaderArticle`. 1 was plain text (before spans, notes, tables); 2 adds
 * inline spans, nested lists, notes, tables, code languages and figures. A stored article with an
 * older version is read as it is (upgraded) and extracted again when the page can be fetched.
 */
export const READER_ARTICLE_VERSION = 2;
