import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { createEntry, getEntry, listEntries, removeEntry, updateEntry } from '@/src/db/database';
import { Entry, EntryDraft, EntryKind, ENTRY_KINDS } from '@/src/types/entry';

type ByKind<T> = Record<EntryKind, T>;

const emptyByKind = <T,>(value: T): ByKind<T> => ({ diary: value, movie: value, book: value });

type EntriesContextValue = {
  entriesFor: (kind: EntryKind) => Entry[];
  loadingFor: (kind: EntryKind) => boolean;
  errorFor: (kind: EntryKind) => string | null;
  refresh: (kind?: EntryKind) => Promise<void>;
  find: (id: number) => Promise<Entry | null>;
  add: (draft: EntryDraft) => Promise<number>;
  update: (id: number, draft: EntryDraft) => Promise<void>;
  remove: (id: number) => Promise<void>;
};

const EntriesContext = createContext<EntriesContextValue | null>(null);

export function EntriesProvider({ children }: PropsWithChildren) {
  const [entriesByKind, setEntriesByKind] = useState<ByKind<Entry[]>>(() => emptyByKind([]));
  const [loadingByKind, setLoadingByKind] = useState<ByKind<boolean>>(() => emptyByKind(true));
  const [errorByKind, setErrorByKind] = useState<ByKind<string | null>>(() => emptyByKind(null));
  const requestVersions = useRef<ByKind<number>>(emptyByKind(0));

  const refresh = useCallback(async (kind?: EntryKind) => {
    const kinds = kind ? [kind] : ENTRY_KINDS;
    await Promise.all(kinds.map(async (entryKind) => {
      const requestVersion = requestVersions.current[entryKind] + 1;
      requestVersions.current[entryKind] = requestVersion;
      setLoadingByKind((current) => ({ ...current, [entryKind]: true }));
      setErrorByKind((current) => ({ ...current, [entryKind]: null }));
      try {
        const nextEntries = await listEntries(entryKind);
        if (requestVersions.current[entryKind] !== requestVersion) return;
        setEntriesByKind((current) => ({ ...current, [entryKind]: nextEntries }));
      } catch {
        if (requestVersions.current[entryKind] !== requestVersion) return;
        setErrorByKind((current) => ({ ...current, [entryKind]: '기억을 불러오지 못했어요. 다시 시도해주세요.' }));
      } finally {
        if (requestVersions.current[entryKind] === requestVersion) {
          setLoadingByKind((current) => ({ ...current, [entryKind]: false }));
        }
      }
    }));
  }, []);

  const entriesFor = useCallback((kind: EntryKind) => entriesByKind[kind], [entriesByKind]);
  const loadingFor = useCallback((kind: EntryKind) => loadingByKind[kind], [loadingByKind]);
  const errorFor = useCallback((kind: EntryKind) => errorByKind[kind], [errorByKind]);
  const find = useCallback(async (id: number) => (await getEntry(id)) ?? null, []);
  const add = useCallback(async (draft: EntryDraft) => {
    const id = await createEntry(draft);
    await refresh(draft.kind);
    return id;
  }, [refresh]);
  const update = useCallback(async (id: number, draft: EntryDraft) => {
    await updateEntry(id, draft);
    await refresh();
  }, [refresh]);
  const remove = useCallback(async (id: number) => {
    await removeEntry(id);
    setEntriesByKind((current) => ({
      diary: current.diary.filter((entry) => entry.id !== id),
      movie: current.movie.filter((entry) => entry.id !== id),
      book: current.book.filter((entry) => entry.id !== id),
    }));
  }, []);

  const value = useMemo<EntriesContextValue>(() => ({
    entriesFor,
    loadingFor,
    errorFor,
    refresh,
    find,
    add,
    update,
    remove,
  }), [add, entriesFor, errorFor, find, loadingFor, refresh, remove, update]);

  return <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>;
}

export function useEntries() {
  const value = useContext(EntriesContext);
  if (!value) throw new Error('useEntries must be used inside EntriesProvider');
  return value;
}
