import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { listDeletedEntries, listEntries, replaceEntries } from '@/src/db/database';
import { toBackupImageUri } from '@/src/services/image-storage';
import { DeletedEntry, Entry, EntryKind } from '@/src/types/entry';

const BACKUP_SCHEMA = 'momentry.backup';
const BACKUP_VERSION = 2;
const LEGACY_BACKUP_VERSION = 1;
const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
const MAX_BACKUP_ENTRIES = 10_000;
const TRASH_RETENTION_DAYS = 30;
const ENTRY_KINDS = new Set<EntryKind>(['diary', 'movie', 'book']);
const ENTRY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 20_000;
const MAX_IMAGE_URI_LENGTH = 16 * 1024 * 1024;

type BackupPayloadV2 = {
  schema: typeof BACKUP_SCHEMA;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  entries: Entry[];
  deletedEntries: DeletedEntry[];
};

type BackupPayload = BackupPayloadV2;

export type ImportResult = {
  entryCount: number;
  deletedEntryCount: number;
  exportedAt: string;
};

export type ImportCandidate = ImportResult & {
  entries: Entry[];
  deletedEntries: DeletedEntry[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown, field: string, maxLength = MAX_IMAGE_URI_LENGTH) {
  if (value !== null && typeof value !== 'string') throw new Error(`${field} 형식이 올바르지 않아요.`);
  if (typeof value === 'string' && value.length > maxLength) throw new Error(`${field}가 너무 커요.`);
  return value as string | null;
}

function localDateString(value = new Date()) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function validEntryDate(value: string) {
  if (!ENTRY_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value
    && value >= '2000-01-01'
    && value <= localDateString();
}

function validTimestamp(value: string) {
  return value.length > 0 && !Number.isNaN(Date.parse(value));
}

function validateEntry(value: unknown, index: number): Entry {
  if (!isRecord(value)) throw new Error(`${index + 1}번째 기록을 읽을 수 없어요.`);
  const kind = value.kind;
  if (typeof value.id !== 'number' || !Number.isSafeInteger(value.id) || value.id < 1) throw new Error(`${index + 1}번째 기록의 ID가 올바르지 않아요.`);
  if (typeof kind !== 'string' || !ENTRY_KINDS.has(kind as EntryKind)) throw new Error(`${index + 1}번째 기록의 종류가 올바르지 않아요.`);
  if (typeof value.title !== 'string' || value.title.trim().length === 0 || value.title.length > MAX_TITLE_LENGTH) throw new Error(`${index + 1}번째 기록의 제목이 올바르지 않아요.`);
  if (typeof value.content !== 'string' || value.content.length > MAX_CONTENT_LENGTH || typeof value.entryDate !== 'string' || !validEntryDate(value.entryDate)) throw new Error(`${index + 1}번째 기록의 본문 또는 날짜가 올바르지 않아요.`);
  if (typeof value.rating !== 'number' || !Number.isInteger(value.rating) || value.rating < 0 || value.rating > 5) throw new Error(`${index + 1}번째 기록의 별점이 올바르지 않아요.`);
  if (kind === 'diary' && value.rating !== 0) throw new Error(`${index + 1}번째 일기 별점이 올바르지 않아요.`);
  if (typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string' || !validTimestamp(value.createdAt) || !validTimestamp(value.updatedAt)) throw new Error(`${index + 1}번째 기록의 생성 시간이 올바르지 않아요.`);
  return {
    id: value.id,
    kind: kind as EntryKind,
    title: value.title,
    content: value.content,
    entryDate: value.entryDate,
    rating: value.rating,
    imageUri: nullableString(value.imageUri, '사진'),
    sourceId: nullableString(value.sourceId, '원본 ID'),
    creator: nullableString(value.creator, '저자'),
    releaseYear: nullableString(value.releaseYear, '발행 연도'),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function validateDeletedEntry(value: unknown, index: number): DeletedEntry {
  if (!isRecord(value)) throw new Error(`${index + 1}번째 최근 삭제 기록을 읽을 수 없어요.`);
  const entry = validateEntry(value, index);
  if (typeof value.deletedAt !== 'string' || !validTimestamp(value.deletedAt)) {
    throw new Error(`${index + 1}번째 최근 삭제 기록의 삭제 시간이 올바르지 않아요.`);
  }
  return { ...entry, deletedAt: value.deletedAt };
}

function validatePayload(value: unknown): BackupPayload {
  if (!isRecord(value) || value.schema !== BACKUP_SCHEMA || (value.version !== LEGACY_BACKUP_VERSION && value.version !== BACKUP_VERSION)) {
    throw new Error('모멘트리 백업 파일이 아니거나 지원하지 않는 버전이에요.');
  }
  if (typeof value.exportedAt !== 'string' || !validTimestamp(value.exportedAt) || !Array.isArray(value.entries)) throw new Error('백업 파일 구조가 올바르지 않아요.');
  if (value.entries.length > MAX_BACKUP_ENTRIES) throw new Error('한 번에 가져올 수 있는 기록은 10,000개까지예요.');
  const entries = value.entries.map(validateEntry);
  const ids = new Set(entries.map((entry) => entry.id));
  if (ids.size !== entries.length) throw new Error('백업 파일에 중복된 기록 ID가 있어요.');
  if (value.version === LEGACY_BACKUP_VERSION) {
    return { schema: BACKUP_SCHEMA, version: BACKUP_VERSION, exportedAt: value.exportedAt, entries, deletedEntries: [] };
  }
  if (!Array.isArray(value.deletedEntries) || value.deletedEntries.length > MAX_BACKUP_ENTRIES) {
    throw new Error('최근 삭제 기록이 올바르지 않거나 너무 많아요.');
  }
  const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const deletedEntries = value.deletedEntries
    .map(validateDeletedEntry)
    .filter((entry) => Date.parse(entry.deletedAt) >= cutoff);
  const deletedIds = new Set(deletedEntries.map((entry) => entry.id));
  if (deletedIds.size !== deletedEntries.length) throw new Error('백업 파일에 중복된 최근 삭제 기록 ID가 있어요.');
  if (deletedEntries.some((entry) => ids.has(entry.id))) throw new Error('활성 기록과 최근 삭제 기록에 중복된 ID가 있어요.');
  return { schema: BACKUP_SCHEMA, version: BACKUP_VERSION, exportedAt: value.exportedAt, entries, deletedEntries };
}

function fileNameDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function downloadWebBackup(contents: string, fileName: string) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('이 브라우저에서는 백업 파일을 다운로드할 수 없어요.');
  }
  const blob = new Blob([contents], { type: 'application/json;charset=utf-8' });
  if (blob.size > MAX_BACKUP_BYTES) {
    throw new Error('사진을 포함한 백업 파일은 100MB까지 만들 수 있어요. 큰 사진을 줄인 뒤 다시 시도해주세요.');
  }
  const uri = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = uri;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(uri), 1_000);
}

export async function exportBackup() {
  const payload: BackupPayload = {
    schema: BACKUP_SCHEMA,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    entries: [],
    deletedEntries: [],
  };
  for (const entry of await listEntries()) {
    payload.entries.push({ ...entry, imageUri: await toBackupImageUri(entry.imageUri) });
  }
  for (const entry of await listDeletedEntries()) {
    payload.deletedEntries.push({ ...entry, imageUri: await toBackupImageUri(entry.imageUri) });
  }
  const contents = JSON.stringify(payload);
  const fileName = `momentry-backup-${fileNameDate(new Date())}.json`;
  if (Platform.OS === 'web') {
    downloadWebBackup(contents, fileName);
    return { entryCount: payload.entries.length, deletedEntryCount: payload.deletedEntries.length };
  }

  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error('백업 파일을 만들 저장 공간을 찾지 못했어요.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('이 기기에서는 파일 공유를 사용할 수 없어요.');
  const uri = `${directory}${fileName}`;
  try {
    await FileSystem.writeAsStringAsync(uri, contents, { encoding: FileSystem.EncodingType.UTF8 });
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && typeof info.size === 'number' && info.size > MAX_BACKUP_BYTES) {
      throw new Error('사진을 포함한 백업 파일은 100MB까지 만들 수 있어요. 큰 사진을 줄인 뒤 다시 시도해주세요.');
    }
    await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: '모멘트리 백업 내보내기', UTI: 'public.json' });
    return { entryCount: payload.entries.length, deletedEntryCount: payload.deletedEntries.length };
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
  }
}

export async function pickBackup(): Promise<ImportCandidate | null> {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: ['application/json', 'text/plain'] });
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  const source = result.assets[0];
  if (source.size && source.size > MAX_BACKUP_BYTES) throw new Error('백업 파일은 100MB까지 가져올 수 있어요.');
  const raw = Platform.OS === 'web' && source.file
    ? await source.file.text()
    : await FileSystem.readAsStringAsync(source.uri, { encoding: FileSystem.EncodingType.UTF8 });
  if (raw.length > MAX_BACKUP_BYTES) throw new Error('백업 파일은 100MB까지 가져올 수 있어요.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('JSON 백업 파일을 읽지 못했어요.');
  }
  const payload = validatePayload(parsed);
  return {
    entryCount: payload.entries.length,
    deletedEntryCount: payload.deletedEntries.length,
    exportedAt: payload.exportedAt,
    entries: payload.entries,
    deletedEntries: payload.deletedEntries,
  };
}

export async function importBackup(candidate: ImportCandidate): Promise<ImportResult> {
  await replaceEntries(candidate.entries, candidate.deletedEntries);
  return {
    entryCount: candidate.entryCount,
    deletedEntryCount: candidate.deletedEntryCount,
    exportedAt: candidate.exportedAt,
  };
}
