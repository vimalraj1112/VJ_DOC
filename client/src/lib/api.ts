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

/** Fetch a job's live state, including resolved output files. */
export async function getJob(jobId: string): Promise<import('./types').JobDetail> {
  const res = await http.get<{ success: boolean; data: import('./types').JobDetail; message?: string }>(`/jobs/${jobId}`);
  if (!res.data.success) throw new Error(res.data.message || 'Could not fetch the job.');
  return res.data.data;
}

/** Cancel an in-flight job. */
export async function cancelJob(jobId: string): Promise<void> {
  await http.delete(`/jobs/${jobId}`);
}

/** Create a signature request; returns the private signing link. */
export async function requestSignature(
  files: File[],
  options: Record<string, unknown> = {},
): Promise<import('./types').SignatureRequestCreated> {
  const form = new FormData();
  for (const file of files) form.append('files', file, file.name);
  form.append('options', JSON.stringify(options));

  const res = await http.post<{ success: boolean; data: import('./types').SignatureRequestCreated }>(
    '/signatures',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180_000 },
  );
  if (!res.data.success) throw new Error('Could not create the signature request.');
  return res.data.data;
}

/** Public signer-page details for a token. */
export async function getSignatureRequest(token: string): Promise<import('./types').SignatureRequestView> {
  const res = await http.get<{ success: boolean; data: import('./types').SignatureRequestView }>(`/signatures/${token}`);
  if (!res.data.success) throw new Error('Could not load this signing request.');
  return res.data.data;
}

/** Sign the request and download the signed PDF as a blob. */
export async function signSignatureRequest(token: string, name: string): Promise<Blob> {
  const res = await http.post<Blob>(`/signatures/${token}/sign`, { name }, { responseType: 'blob' });
  return res.data;
}

/** Cancel a pending signature request. */
export async function cancelSignatureRequest(token: string): Promise<void> {
  await http.delete(`/signatures/${token}`);
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