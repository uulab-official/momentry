import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { deleteStoredImage, persistImageUri } from '@/src/services/image-storage';
import { DeletedEntry, Entry, EntryDraft } from '@/src/types/entry';

let databasePromise: ReturnType<typeof SQLite.openDatabaseAsync> | null = null;

const ENTRY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 20_000;
const TRASH_RETENTION_DAYS = 30;

async function withWriteTransaction(
  db: SQLite.SQLiteDatabase,
  task: (transaction: SQLite.SQLiteDatabase) => Promise<void>,
) {
  if (Platform.OS === 'web') {
    await db.withTransactionAsync(() => task(db));
    return;
  }
  await db.withExclusiveTransactionAsync((transaction) => task(transaction));
}

function localDateString(value = new Date()) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function validateDraft(draft: EntryDraft) {
  const title = draft.title.trim();
  if (!title || title.length > MAX_TITLE_LENGTH) throw new Error('제목은 1자 이상 120자 이내로 입력해주세요.');
  if (draft.content.length > MAX_CONTENT_LENGTH) throw new Error('내용은 20,000자 이내로 입력해주세요.');
  if (!ENTRY_DATE_PATTERN.test(draft.entryDate)) throw new Error('기록 날짜 형식이 올바르지 않아요.');
  const parsed = new Date(`${draft.entryDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== draft.entryDate || draft.entryDate < '2000-01-01' || draft.entryDate > localDateString()) {
    throw new Error('2000-01-01부터 오늘까지의 날짜만 기록할 수 있어요.');
  }
  if (!Number.isInteger(draft.rating) || draft.rating < 0 || draft.rating > 5 || (draft.kind === 'diary' && draft.rating !== 0)) {
    throw new Error('별점 값을 확인해주세요.');
  }
  return { ...draft, title };
}

async function database() {
  if (!databasePromise) databasePromise = SQLite.openDatabaseAsync('momentry.db');
  const db = await databasePromise;
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL CHECK(kind IN ('diary', 'movie', 'book')),
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      entryDate TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 0,
      imageUri TEXT,
      sourceId TEXT,
      creator TEXT,
      releaseYear TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS entries_kind_date ON entries(kind, entryDate DESC, id DESC);
    CREATE TABLE IF NOT EXISTS deleted_entries (
      id INTEGER PRIMARY KEY,
      kind TEXT NOT NULL CHECK(kind IN ('diary', 'movie', 'book')),
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      entryDate TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 0,
      imageUri TEXT,
      sourceId TEXT,
      creator TEXT,
      releaseYear TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      deletedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS deleted_entries_date ON deleted_entries(deletedAt DESC);
  `);
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const expired = await db.getAllAsync<DeletedEntry>('SELECT * FROM deleted_entries WHERE deletedAt < ?', cutoff);
  if (expired.length > 0) {
    await db.runAsync('DELETE FROM deleted_entries WHERE deletedAt < ?', cutoff);
    await Promise.all(expired.map((entry) => deleteStoredImage(entry.imageUri)));
  }
  return db;
}

export async function replaceEntries(entries: Entry[], deletedEntries: DeletedEntry[] = []) {
  const db = await database();
  const existingEntries = await listEntries();
  const existingDeletedEntries = await db.getAllAsync<DeletedEntry>('SELECT * FROM deleted_entries');
  const persistedEntries: Entry[] = [];
  const persistedDeletedEntries: DeletedEntry[] = [];
  try {
    for (const entry of entries) {
      persistedEntries.push({ ...entry, imageUri: await persistImageUri(entry.imageUri) });
    }
    for (const entry of deletedEntries) {
      persistedDeletedEntries.push({ ...entry, imageUri: await persistImageUri(entry.imageUri) });
    }
    await withWriteTransaction(db, async (transaction) => {
      await transaction.runAsync('DELETE FROM entries');
      await transaction.runAsync('DELETE FROM deleted_entries');
      for (const entry of persistedEntries) {
        await transaction.runAsync(
          `INSERT INTO entries
            (id, kind, title, content, entryDate, rating, imageUri, sourceId, creator, releaseYear, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          entry.id,
          entry.kind,
          entry.title,
          entry.content,
          entry.entryDate,
          entry.rating,
          entry.imageUri,
          entry.sourceId,
          entry.creator,
          entry.releaseYear,
          entry.createdAt,
          entry.updatedAt,
        );
      }
      for (const entry of persistedDeletedEntries) {
        await transaction.runAsync(
          `INSERT INTO deleted_entries
            (id, kind, title, content, entryDate, rating, imageUri, sourceId, creator, releaseYear, createdAt, updatedAt, deletedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          entry.id,
          entry.kind,
          entry.title,
          entry.content,
          entry.entryDate,
          entry.rating,
          entry.imageUri,
          entry.sourceId,
          entry.creator,
          entry.releaseYear,
          entry.createdAt,
          entry.updatedAt,
          entry.deletedAt,
        );
      }
    });
  } catch (error) {
    await Promise.all([...persistedEntries, ...persistedDeletedEntries].map((entry) => deleteStoredImage(entry.imageUri)));
    throw error;
  }
  const nextImageUris = new Set([...persistedEntries, ...persistedDeletedEntries].map((entry) => entry.imageUri));
  await Promise.all([...existingEntries, ...existingDeletedEntries]
    .filter((entry) => !nextImageUris.has(entry.imageUri))
    .map((entry) => deleteStoredImage(entry.imageUri)));
}

export async function listEntries(kind?: Entry['kind']) {
  const db = await database();
  if (kind) {
    return db.getAllAsync<Entry>('SELECT * FROM entries WHERE kind = ? ORDER BY entryDate DESC, id DESC', kind);
  }
  return db.getAllAsync<Entry>('SELECT * FROM entries ORDER BY entryDate DESC, id DESC');
}

export async function getEntry(id: number) {
  const db = await database();
  return db.getFirstAsync<Entry>('SELECT * FROM entries WHERE id = ?', id);
}

export async function createEntry(draft: EntryDraft) {
  const validDraft = validateDraft(draft);
  const db = await database();
  const now = new Date().toISOString();
  const imageUri = await persistImageUri(validDraft.imageUri);
  try {
    const result = await db.runAsync(
      `INSERT INTO entries
        (kind, title, content, entryDate, rating, imageUri, sourceId, creator, releaseYear, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      validDraft.kind,
      validDraft.title,
      validDraft.content.trim(),
      validDraft.entryDate,
      validDraft.rating,
      imageUri,
      validDraft.sourceId,
      validDraft.creator,
      validDraft.releaseYear,
      now,
      now,
    );
    return result.lastInsertRowId;
  } catch (error) {
    await deleteStoredImage(imageUri);
    throw error;
  }
}

export async function updateEntry(id: number, draft: EntryDraft) {
  const validDraft = validateDraft(draft);
  const db = await database();
  const existing = await db.getFirstAsync<Entry>('SELECT * FROM entries WHERE id = ?', id);
  if (!existing) throw new Error('수정할 기록을 찾지 못했어요.');
  const imageUri = await persistImageUri(validDraft.imageUri);
  try {
    const result = await db.runAsync(
      `UPDATE entries SET
        kind = ?, title = ?, content = ?, entryDate = ?, rating = ?, imageUri = ?,
        sourceId = ?, creator = ?, releaseYear = ?, updatedAt = ?
        WHERE id = ?`,
      validDraft.kind,
      validDraft.title,
      validDraft.content.trim(),
      validDraft.entryDate,
      validDraft.rating,
      imageUri,
      validDraft.sourceId,
      validDraft.creator,
      validDraft.releaseYear,
      new Date().toISOString(),
      id,
    );
    if (result.changes !== 1) throw new Error('수정할 기록을 찾지 못했어요.');
  } catch (error) {
    if (imageUri !== existing.imageUri) await deleteStoredImage(imageUri);
    throw error;
  }
  if (imageUri !== existing.imageUri) await deleteStoredImage(existing.imageUri);
}

export async function removeEntry(id: number) {
  const db = await database();
  const existing = await db.getFirstAsync<Entry>('SELECT * FROM entries WHERE id = ?', id);
  if (!existing) return;
  await withWriteTransaction(db, async (transaction) => {
    await transaction.runAsync('DELETE FROM deleted_entries WHERE id = ?', id);
    await transaction.runAsync(
      `INSERT INTO deleted_entries
        (id, kind, title, content, entryDate, rating, imageUri, sourceId, creator, releaseYear, createdAt, updatedAt, deletedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      existing.id,
      existing.kind,
      existing.title,
      existing.content,
      existing.entryDate,
      existing.rating,
      existing.imageUri,
      existing.sourceId,
      existing.creator,
      existing.releaseYear,
      existing.createdAt,
      existing.updatedAt,
      new Date().toISOString(),
    );
    await transaction.runAsync('DELETE FROM entries WHERE id = ?', id);
  });
}

export async function listDeletedEntries() {
  const db = await database();
  return db.getAllAsync<DeletedEntry>('SELECT * FROM deleted_entries ORDER BY deletedAt DESC');
}

export async function restoreEntry(id: number) {
  const db = await database();
  const deleted = await db.getFirstAsync<DeletedEntry>('SELECT * FROM deleted_entries WHERE id = ?', id);
  if (!deleted) throw new Error('복원할 기록을 찾지 못했어요.');
  await withWriteTransaction(db, async (transaction) => {
    await transaction.runAsync(
      `INSERT INTO entries
        (id, kind, title, content, entryDate, rating, imageUri, sourceId, creator, releaseYear, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      deleted.id,
      deleted.kind,
      deleted.title,
      deleted.content,
      deleted.entryDate,
      deleted.rating,
      deleted.imageUri,
      deleted.sourceId,
      deleted.creator,
      deleted.releaseYear,
      deleted.createdAt,
      deleted.updatedAt,
    );
    await transaction.runAsync('DELETE FROM deleted_entries WHERE id = ?', id);
  });
}
