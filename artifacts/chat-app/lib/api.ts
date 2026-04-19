const domain = process.env.EXPO_PUBLIC_DOMAIN;
export const API_BASE = domain ? `https://${domain}/api` : '/api';

export async function uploadImageToImgBB(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const res = await fetch(`${API_BASE}/upload-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64, name: `chat-${Date.now()}` }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? 'Upload failed');
  }

  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error('No URL returned from upload');
  return data.url;
}

export async function uploadFileToFileIO(
  uri: string,
  name: string,
  type: string
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const res = await fetch(`${API_BASE}/upload-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: base64, name, type }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? 'File upload failed');
  }

  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error('No URL returned from file upload');
  return data.url;
}
