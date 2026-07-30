export type EntryKind = 'diary' | 'movie' | 'book';

export const ENTRY_KINDS: EntryKind[] = ['diary', 'movie', 'book'];

export type Entry = {
  id: number;
  kind: EntryKind;
  title: string;
  content: string;
  entryDate: string;
  rating: number;
  imageUri: string | null;
  sourceId: string | null;
  creator: string | null;
  releaseYear: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeletedEntry = Entry & {
  deletedAt: string;
};

export type EntryDraft = Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>;

export const ENTRY_LABEL: Record<EntryKind, string> = {
  diary: '일기',
  movie: '영화',
  book: '책',
};
