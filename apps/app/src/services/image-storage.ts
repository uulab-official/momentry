import * as FileSystem from 'expo-file-system/legacy';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const DATA_IMAGE_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\r\n]+)$/i;

function extensionForUri(uri: string) {
  const match = uri.split('?')[0].match(/\.([a-z0-9]{2,5})$/i);
  return match?.[1]?.toLowerCase() ?? 'jpg';
}

function newImagePath(extension: string) {
  const directory = FileSystem.documentDirectory;
  if (!directory) return null;
  return `${directory}momentry-image-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
}

function isDataImageUri(uri: string) {
  return DATA_IMAGE_PATTERN.test(uri);
}

function isAppImageUri(uri: string) {
  return Boolean(FileSystem.documentDirectory && uri.startsWith(FileSystem.documentDirectory));
}

async function ensureImageSize(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || info.isDirectory) throw new Error('사진 파일을 찾지 못했어요. 다시 선택해주세요.');
  if (typeof info.size === 'number' && info.size > MAX_IMAGE_BYTES) {
    throw new Error('사진이 너무 커요. 8MB 이하의 사진을 선택해주세요.');
  }
}

/** Store a picker URI in the app sandbox so it survives cache cleanup. */
export async function persistImageUri(uri: string | null) {
  if (!uri || isAppImageUri(uri)) return uri;
  const destination = newImagePath(extensionForUri(uri));
  if (!destination) return uri;

  if (isDataImageUri(uri)) {
    const match = uri.match(DATA_IMAGE_PATTERN);
    if (!match) return uri;
    const base64 = match[2].replace(/\s/g, '');
    if (base64.length * 0.75 > MAX_IMAGE_BYTES) throw new Error('사진이 너무 커요. 8MB 이하의 사진을 선택해주세요.');
    await FileSystem.writeAsStringAsync(destination, base64, { encoding: FileSystem.EncodingType.Base64 });
    return destination;
  }

  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    await ensureImageSize(uri);
    await FileSystem.copyAsync({ from: uri, to: destination });
    return destination;
  }

  if (uri.startsWith('https://') || uri.startsWith('http://')) {
    try {
      const downloaded = await FileSystem.downloadAsync(uri, destination);
      await ensureImageSize(downloaded.uri);
      return downloaded.uri;
    } catch {
      await deleteStoredImage(destination);
      return uri;
    }
  }

  return uri;
}

/** Convert a sandbox file back to a portable data URI for a Momentry JSON backup. */
export async function toBackupImageUri(uri: string | null) {
  if (!uri || isDataImageUri(uri)) return uri;
  if (uri.startsWith('https://') || uri.startsWith('http://')) {
    const persisted = await persistImageUri(uri);
    if (persisted === uri) return uri;
    try {
      return await toBackupImageUri(persisted);
    } finally {
      await deleteStoredImage(persisted);
    }
  }
  if (!uri.startsWith('file://')) return uri;
  await ensureImageSize(uri);
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return `data:image/${extensionForUri(uri)};base64,${base64}`;
}

export async function deleteStoredImage(uri: string | null) {
  if (!uri || !isAppImageUri(uri)) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
}
