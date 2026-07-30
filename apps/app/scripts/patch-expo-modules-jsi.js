#!/usr/bin/env node

// Xcode 26.1.1 / Swift 6.2.1 rejects `weak let` declarations because weak
// references can be cleared at runtime. expo-modules-jsi 57.0.4 ships 16 such
// declarations. Six reference types then need an explicit unchecked Sendable
// conformance because their weak storage is mutable. Keep this narrow and
// version-checked until Expo publishes a compatible patch.

const fs = require('node:fs');
const path = require('node:path');

const packageRoot = path.dirname(require.resolve('expo-modules-jsi/package.json'));
const packageVersion = require(path.join(packageRoot, 'package.json')).version;
const sourceRoot = path.join(packageRoot, 'apple', 'Sources', 'ExpoModulesJSI');
const supportedVersions = new Set(['57.0.4']);
const expectedReplacementCount = 16;

if (!supportedVersions.has(packageVersion)) {
  throw new Error(
    `Review the expo-modules-jsi Swift compatibility shim for version ${packageVersion}.`,
  );
}

function swiftFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return swiftFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.swift') ? [entryPath] : [];
  });
}

let replacementCount = 0;

for (const file of swiftFiles(sourceRoot)) {
  const original = fs.readFileSync(file, 'utf8');
  const weakDeclaration = /^(\s*(?:(?:private|internal|public)(?:\([^)]+\))?\s+)?)(?:nonisolated\(unsafe\)\s+)?weak (?:let|var)\b/gm;
  const matches = original.match(weakDeclaration) ?? [];
  if (matches.length === 0) continue;

  replacementCount += matches.length;
  fs.writeFileSync(
    file,
    original.replace(weakDeclaration, '$1weak var'),
  );
}

const patchedWeakCount = swiftFiles(sourceRoot).reduce((count, file) => {
  const source = fs.readFileSync(file, 'utf8');
  return count + (source.match(/\bweak var\b/g) ?? []).length;
}, 0);

if (
  replacementCount !== 0 &&
  replacementCount !== expectedReplacementCount
) {
  throw new Error(
    `Expected ${expectedReplacementCount} weak declarations, found ${replacementCount}.`,
  );
}

if (patchedWeakCount !== expectedReplacementCount) {
  throw new Error(
    `Expected ${expectedReplacementCount} weak var declarations, found ${patchedWeakCount}.`,
  );
}

const uncheckedSendableReplacements = new Map([
  ['internal final class HostFunctionContext: Sendable {', 'internal final class HostFunctionContext: @unchecked Sendable {'],
  ['internal final class UnownedThisHostFunctionContext: Sendable {', 'internal final class UnownedThisHostFunctionContext: @unchecked Sendable {'],
  ['internal final class HostObjectContext: Sendable {', 'internal final class HostObjectContext: @unchecked Sendable {'],
  ['public final class JavaScriptPropNameID: JavaScriptType {', 'public final class JavaScriptPropNameID: JavaScriptType, @unchecked Sendable {'],
  ['public final class JavaScriptError: Error, Sendable {', 'public final class JavaScriptError: Error, @unchecked Sendable {'],
  ['public final class JavaScriptValue: JavaScriptType, Equatable, Escapable {', 'public final class JavaScriptValue: JavaScriptType, Equatable, Escapable, @unchecked Sendable {'],
]);

let uncheckedSendableCount = 0;

for (const file of swiftFiles(sourceRoot)) {
  let source = fs.readFileSync(file, 'utf8');
  let changed = false;

  for (const [originalDeclaration, patchedDeclaration] of uncheckedSendableReplacements) {
    if (source.includes(patchedDeclaration)) {
      uncheckedSendableCount += 1;
      continue;
    }
    if (!source.includes(originalDeclaration)) continue;

    source = source.replace(originalDeclaration, patchedDeclaration);
    uncheckedSendableCount += 1;
    changed = true;
  }

  if (changed) fs.writeFileSync(file, source);
}

if (uncheckedSendableCount !== uncheckedSendableReplacements.size) {
  throw new Error(
    `Expected ${uncheckedSendableReplacements.size} unchecked Sendable declarations, found ${uncheckedSendableCount}.`,
  );
}

const dateSourcePath = path.join(sourceRoot, 'Coding', 'JavaScriptCodable+Date.swift');
const dateSource = fs.readFileSync(dateSourcePath, 'utf8');
fs.writeFileSync(
  dateSourcePath,
  dateSource
    .replace('throws -> Foundation.Date {', 'throws -> Date {')
    .replace('return Foundation.Date(timeIntervalSince1970:', 'return Date(timeIntervalSince1970:'),
);

// SDK 57.0.2 introduced the optional JavaScriptCodable Date conformance, but
// Xcode 26.1.1 cannot type-check its package build. Momentry does not expose a
// custom Expo module using Date, so exclude only this optional conformance.
const packageManifestPath = path.join(packageRoot, 'apple', 'Package.swift');
let packageManifest = fs.readFileSync(packageManifestPath, 'utf8');
const dateExclude = '        "Coding/JavaScriptCodable+Date.swift",';

if (!packageManifest.includes(dateExclude)) {
  const swiftSettingsAnchor = '      swiftSettings: [';
  if (!packageManifest.includes(swiftSettingsAnchor)) {
    throw new Error('Review the expo-modules-jsi Package.swift Date exclusion.');
  }
  packageManifest = packageManifest.replace(
    swiftSettingsAnchor,
    `      exclude: [\n${dateExclude}\n      ],\n${swiftSettingsAnchor}`,
  );
  fs.writeFileSync(packageManifestPath, packageManifest);
}

console.log(
  'expo-modules-jsi Xcode 26.1.1 weak-reference shim is applied.',
);
