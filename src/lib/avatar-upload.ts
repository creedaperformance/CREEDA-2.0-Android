import { supabase } from './supabase';

const AVATAR_BUCKET = 'avatars';
const AVATAR_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'] as const;

function normalizeFileUri(fileUri: string) {
  return fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;
}

function inferAvatarFileMeta(fileUri: string) {
  const cleanedUri = fileUri.split('?')[0]?.toLowerCase() || '';

  if (cleanedUri.endsWith('.png')) {
    return { extension: 'png', contentType: 'image/png' };
  }

  if (cleanedUri.endsWith('.webp')) {
    return { extension: 'webp', contentType: 'image/webp' };
  }

  if (cleanedUri.endsWith('.heic')) {
    return { extension: 'heic', contentType: 'image/heic' };
  }

  if (cleanedUri.endsWith('.heif')) {
    return { extension: 'heif', contentType: 'image/heif' };
  }

  if (cleanedUri.endsWith('.jpeg')) {
    return { extension: 'jpeg', contentType: 'image/jpeg' };
  }

  return { extension: 'jpg', contentType: 'image/jpeg' };
}

function buildStandardAvatarPaths(userId: string) {
  return AVATAR_EXTENSIONS.map((extension) => `${userId}/avatar.${extension}`);
}

function extractAvatarObjectPath(publicUrl?: string | null) {
  if (!publicUrl) return null;

  try {
    const parsed = new URL(publicUrl);
    const normalizedPath = decodeURIComponent(parsed.pathname);
    const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
    const markerIndex = normalizedPath.indexOf(marker);

    if (markerIndex === -1) return null;

    return normalizedPath.slice(markerIndex + marker.length);
  } catch {
    return null;
  }
}

function dedupePaths(paths: Array<string | null | undefined>) {
  return [...new Set(paths.filter((value): value is string => Boolean(value?.trim())))];
}

function readFileAsBlob(fileUri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new TypeError('Failed to read the captured image.'));
    xhr.responseType = 'blob';
    xhr.open('GET', normalizeFileUri(fileUri), true);
    xhr.send(null);
  });
}

export async function deleteStoredAvatar(userId: string, currentUrl?: string | null) {
  const pathsToRemove = dedupePaths([
    ...buildStandardAvatarPaths(userId),
    extractAvatarObjectPath(currentUrl),
  ]);

  if (pathsToRemove.length === 0) return;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove(pathsToRemove);
  if (error) {
    throw new Error(error.message || 'Failed to remove avatar.');
  }
}

export async function uploadAvatarFromFileUri(
  fileUri: string,
  userId: string,
  currentUrl?: string | null
) {
  const blob = await readFileAsBlob(fileUri);
  const fileMeta = inferAvatarFileMeta(fileUri);
  const filePath = `${userId}/avatar.${fileMeta.extension}`;

  await deleteStoredAvatar(userId, currentUrl);

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(filePath, blob, {
    upsert: true,
    contentType: fileMeta.contentType,
  });

  if (error) {
    throw new Error(error.message || 'Failed to upload avatar.');
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

  return `${publicUrl}?v=${Date.now()}`;
}
