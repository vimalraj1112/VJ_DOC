import axios from 'axios';

/** Thin axios wrapper. Vite proxies /api and /socket.io to the backend in dev. */
const http = axios.create({
  baseURL: '/api/v1',
  timeout: 120_000,
  headers: { 'Content-Type': 'application/json' },
});

/** Upload + process files for a tool. `options` become the tool's settings. */
export async function processTool(
  toolId: string,
  files: File[],
  options: Record<string, unknown> = {},
): Promise<import('./types').ProcessResponse> {
  const form = new FormData();
  for (const file of files) form.append('files', file, file.name);
  form.append('options', JSON.stringify(options));

  const res = await http.post<{ success: boolean; data: import('./types').ProcessResponse; message?: string }>(
    `/tools/${toolId}/process`,
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180_000,
    },
  );
  if (!res.data.success) throw new Error(res.data.message || 'Processing failed.');
  return res.data.data;
}

/** Fetch a processed file as a blob for downloading. */
export async function downloadFile(url: string): Promise<Blob> {
  const res = await axios.get<Blob>(url, { responseType: 'blob' });
  return res.data;
}

/** Cancel an in-flight job. */
export async function cancelJob(jobId: string): Promise<void> {
  await http.delete(`/jobs/${jobId}`);
}

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
    if (error.code === 'ECONNABORTED') return 'The request timed out. Try a smaller file.';
    return error.message || 'Something went wrong.';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}