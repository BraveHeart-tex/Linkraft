export interface ParsedBookmark {
  url: string;
  title: string;
  description?: string;
  addDate?: string;
  icon?: string;
  collectionName?: string;
}

export interface ParsedCollection {
  name: string;
  description?: string;
}
