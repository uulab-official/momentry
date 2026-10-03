import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Execute actual database/image-storage source with a disposable in-memory
// filesystem and controlled SQLite boundary. No device files or real DBs.
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = 'file:///fixture-documents/';
const activeImage = `${directory}current.jpg`;
const trashImage = `${directory}trash.jpg`;
const dataImage = 'data:image/png;base64,aGVsbG8=';
const entry = (id, imageUri) => ({ id, kind: 'diary', title: `fixture ${id}`, content: 'fixture only', entryDate: '2026-09-30', rating: 0, imageUri, sourceId: null, creator: null, releaseYear: null, createdAt: '2026-09-30T00:00:00Z', updatedAt: '2026-09-30T00:00:00Z' });

function fixture({ failTransaction = false, failInsert = false, failedRollback = false, sharedExistingUri = false, cleanupFailure = null } = {}) {
  let activeRows = [entry(1, activeImage)];
  let trashRows = [{ ...entry(2, sharedExistingUri ? activeImage : trashImage), deletedAt: '2026-10-02T00:00:00Z' }];
  const files = new Set([activeImage, trashImage]), removed = [], created = [];
  const transactionError = new Error('fixture transaction unavailable');
  const insertError = new Error('fixture SQLite insert failure');
  const rollbackError = new Error('fixture SQLite rollback failure', { cause: insertError });
  const cleanupError = new Error('fixture cleanup failure');
  const fs = {
    documentDirectory: directory,
    EncodingType: { Base64: 'base64' },
    getInfoAsync: async () => ({ exists: false }),
    copyAsync: async () => { throw new Error('unexpected file copy'); },
    downloadAsync: async () => { throw new Error('unexpected network download'); },
    writeAsStringAsync: async (uri) => { files.add(uri); created.push(uri); },
    deleteAsync: (uri) => {
      removed.push(uri);
      if (cleanupFailure === 'sync') throw cleanupError;
      if (cleanupFailure === 'async') return Promise.reject(cleanupError);
      files.delete(uri);
      return Promise.resolve();
    },
  };
  let transactionCalls = 0;
  const db = {
    execAsync: async (sql) => { assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS entries')); },
    getAllAsync: async (sql) => {
      if (sql === 'SELECT * FROM deleted_entries WHERE deletedAt < ?') return [];
      if (sql === 'SELECT * FROM entries ORDER BY entryDate DESC, id DESC') return activeRows.map((row) => ({ ...row }));
      if (sql === 'SELECT * FROM deleted_entries') return trashRows.map((row) => ({ ...row }));
      throw new Error(`Unexpected query: ${sql}`);
    },
    runAsync: async () => { throw new Error('unexpected out-of-transaction write'); },
    withExclusiveTransactionAsync: async (task) => {
      transactionCalls += 1;
      if (failTransaction) throw transactionError;
      let nextActive = [...activeRows], nextTrash = [...trashRows];
      try { await task({ runAsync: async (sql, ...values) => {
        if (failInsert && sql.startsWith('INSERT') && values[0] === 3) throw insertError;
        if (sql === 'DELETE FROM entries') { nextActive = []; return; }
        if (sql === 'DELETE FROM deleted_entries') { nextTrash = []; return; }
        const fields = ['id', 'kind', 'title', 'content', 'entryDate', 'rating', 'imageUri', 'sourceId', 'creator', 'releaseYear', 'createdAt', 'updatedAt'];
        if (sql.startsWith('INSERT INTO deleted_entries')) { fields.push('deletedAt'); nextTrash.push(Object.fromEntries(fields.map((key, i) => [key, values[i]]))); return; }
        if (sql.startsWith('INSERT INTO entries')) { nextActive.push(Object.fromEntries(fields.map((key, i) => [key, values[i]]))); return; }
        throw new Error(`Unexpected transaction query: ${sql}`);
      } }); } catch (error) {
        // This adversarial SDK boundary deliberately does not promise that
        // failed rollback restored rows. The source must still retain photos
        // referenced before the operation and preserve the returned error.
        if (failedRollback) { activeRows = nextActive; trashRows = nextTrash; throw rollbackError; }
        throw error;
      }
      activeRows = nextActive; trashRows = nextTrash;
    },
  };
  const modules = { 'expo-sqlite': { openDatabaseAsync: async () => db }, 'expo-file-system/legacy': fs, 'react-native': { Platform: { OS: 'ios' } } };
  const cache = new Map();
  function load(file) {
    file = path.resolve(root, file);
    if (!file.startsWith(path.resolve(root) + path.sep)) throw new Error('Outside app source');
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: false } }).outputText;
    const require = (id) => {
      if (Object.hasOwn(modules, id)) return modules[id];
      const target = id.startsWith('@/') ? path.resolve(root, id.slice(2)) : id.startsWith('.') ? path.resolve(path.dirname(file), id) : null;
      if (target && existsSync(`${target}.ts`)) return load(`${target}.ts`);
      throw new Error(`Unapproved module: ${id}`);
    };
    runInNewContext(code, { module, exports: module.exports, require, Date, Math, console }, { filename: file });
    return module.exports;
  }
  return { api: load('src/db/database.ts'), files, removed, created, transactionError, insertError, rollbackError, cleanupError, get activeRows() { return activeRows; }, get trashRows() { return trashRows; }, get transactionCalls() { return transactionCalls; } };
}

test('image preparation failure preserves a managed photo still referenced by an active record', async () => {
  const app = fixture();
  await assert.rejects(app.api.replaceEntries([entry(1, activeImage), entry(3, 'file:///missing-picker/photo.jpg')]), /사진 파일을 찾지 못/);
  assert.equal(app.files.has(activeImage), true);
  assert.equal(app.files.has(trashImage), true);
  assert.equal(app.activeRows[0].imageUri, activeImage);
  assert.equal(app.transactionCalls, 0);
});

test('image preparation failure preserves a managed photo still referenced by a trash record', async () => {
  const app = fixture();
  const existing = { ...entry(2, trashImage), deletedAt: '2026-10-02T00:00:00Z' };
  const invalid = { ...entry(3, 'file:///missing-picker/photo.jpg'), deletedAt: '2026-10-02T00:00:00Z' };
  await assert.rejects(app.api.replaceEntries([], [existing, invalid]), /사진 파일을 찾지 못/);
  assert.equal(app.files.has(trashImage), true);
  assert.equal(app.trashRows[0].imageUri, trashImage);
  assert.equal(app.transactionCalls, 0);
});

test('failed preparation still removes newly created backup photos and leaves existing records intact', async () => {
  const app = fixture();
  await assert.rejects(app.api.replaceEntries([entry(3, dataImage), entry(4, 'file:///missing-picker/photo.jpg')]), /사진 파일을 찾지 못/);
  assert.equal(app.created.length, 1);
  assert.equal(app.files.has(app.created[0]), false);
  assert.equal(app.files.has(activeImage), true);
  assert.equal(app.files.has(trashImage), true);
  assert.equal(app.activeRows[0].id, 1);
});

test('transaction rejection preserves reused active/trash photos while discarding newly created photos', async () => {
  const app = fixture({ failTransaction: true });
  await assert.rejects(app.api.replaceEntries([entry(1, activeImage), entry(3, dataImage)], [{ ...entry(2, trashImage), deletedAt: '2026-10-02T00:00:00Z' }]), /fixture transaction unavailable/);
  assert.equal(app.files.has(activeImage), true);
  assert.equal(app.files.has(trashImage), true);
  assert.equal(app.files.has(app.created[0]), false);
  assert.equal(app.activeRows[0].id, 1);
  assert.equal(app.trashRows[0].id, 2);
});

test('successful replacement retains reused photos and removes only obsolete photos afterward', async () => {
  const app = fixture();
  await app.api.replaceEntries([entry(1, activeImage), entry(3, dataImage)]);
  assert.equal(app.files.has(activeImage), true);
  assert.equal(app.files.has(app.created[0]), true);
  assert.equal(app.files.has(trashImage), false);
  assert.equal(app.activeRows.length, 2);
  assert.equal(app.trashRows.length, 0);
});

test('a shared photo referenced by active and trash records is preserved on failure', async () => {
  const app = fixture({ failTransaction: true, sharedExistingUri: true });
  await assert.rejects(app.api.replaceEntries([entry(1, activeImage)], [{ ...entry(2, activeImage), deletedAt: '2026-10-02T00:00:00Z' }]), (error) => error === app.transactionError);
  assert.equal(app.files.has(activeImage), true);
  assert.equal(app.removed.includes(activeImage), false);
  assert.equal(app.activeRows[0].imageUri, app.trashRows[0].imageUri);
});

test('duplicate newly prepared image URIs are removed only once after failure', async () => {
  const app = fixture({ failTransaction: true });
  const prepared = `${directory}newly-prepared-shared.jpg`;
  app.files.add(prepared);
  await assert.rejects(app.api.replaceEntries([entry(3, prepared)], [{ ...entry(4, prepared), deletedAt: '2026-10-02T00:00:00Z' }]), (error) => error === app.transactionError);
  assert.equal(app.files.has(prepared), false);
  assert.equal(app.removed.filter((uri) => uri === prepared).length, 1);
  assert.equal(app.files.has(activeImage), true);
});

test('partial image preparation followed by SQLite insert failure preserves old rows and photos', async () => {
  const app = fixture({ failInsert: true });
  await assert.rejects(app.api.replaceEntries([entry(1, activeImage), entry(3, dataImage)]), (error) => error === app.insertError);
  assert.equal(app.created.length, 1);
  assert.equal(app.files.has(app.created[0]), false);
  assert.equal(app.files.has(activeImage), true);
  assert.equal(app.files.has(trashImage), true);
  assert.equal(app.activeRows[0].id, 1);
  assert.equal(app.trashRows[0].id, 2);
});

test('a synchronous cleanup exception cannot mask the original transaction error', async () => {
  const app = fixture({ failTransaction: true, cleanupFailure: 'sync' });
  await assert.rejects(app.api.replaceEntries([entry(3, dataImage)]), (error) => error === app.transactionError);
  assert.equal(app.files.has(activeImage), true);
  assert.equal(app.files.has(trashImage), true);
});

test('an asynchronous cleanup exception cannot mask the original transaction error', async () => {
  const app = fixture({ failTransaction: true, cleanupFailure: 'async' });
  await assert.rejects(app.api.replaceEntries([entry(3, dataImage)]), (error) => error === app.transactionError);
  assert.equal(app.files.has(activeImage), true);
  assert.equal(app.files.has(trashImage), true);
});

test('an SDK rollback failure retains previously referenced photos and the unchanged SDK error', async () => {
  const app = fixture({ failInsert: true, failedRollback: true });
  await assert.rejects(app.api.replaceEntries([entry(1, activeImage), entry(3, dataImage)]), (error) => error === app.rollbackError && error.cause === app.insertError);
  assert.equal(app.files.has(activeImage), true);
  assert.equal(app.files.has(trashImage), true);
  assert.equal(app.files.has(app.created[0]), false);
  // Native SQLite recovery is not established when rollback itself fails.
});
