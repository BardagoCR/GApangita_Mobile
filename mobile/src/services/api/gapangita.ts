import type {
  Branch,
  Category,
  Claim,
  ClaimInput,
  Item,
  Location,
  ReportInput,
  SearchResponse,
  User,
} from '@/src/types/api';
import { Platform } from 'react-native';
import { ApiError, request } from './client';

export type SearchFilters = {
  name?: string;
  description?: string;
  type?: 'all' | 'lost' | 'found';
  categoryCode?: string;
  branchCode?: string;
  locationCode?: string;
  status?: 'open' | 'closed';
  unarchivePage?: boolean;
  browseAll?: boolean;
  page?: number;
  limit?: number;
};

export async function getCategories() {
  const rows = await request<(Category & { NAME?: string })[]>('/categories');
  return rows.map((row) => ({ ...row, name: row.name || row.NAME || '' }));
}

export async function getBranches() {
  const rows = await request<(Branch & { NAME?: string })[]>('/branches');
  return rows.map((row) => ({ ...row, name: row.name || row.NAME || '' }));
}

export async function getLocations(branchCode: string) {
  const rows = await request<(Location & { NAME?: string })[]>(`/locations/by-branch/${encodeURIComponent(branchCode)}`);
  return rows.map((row) => ({ ...row, name: row.name || row.NAME || '' }));
}

export async function searchItems(filters: SearchFilters = {}, signal?: AbortSignal) {
  const query = new URLSearchParams();
  if (filters.name) query.set('name_q', filters.name);
  if (filters.description) query.set('desc_q', filters.description);
  if (filters.type && filters.type !== 'all') query.set('filter', filters.type);
  if (filters.categoryCode) query.set('category_code', filters.categoryCode);
  if (filters.branchCode) query.set('branch_code', filters.branchCode);
  if (filters.locationCode) query.set('location_code', filters.locationCode);
  if (filters.status) query.set('status', filters.status);
  if (filters.unarchivePage) query.set('unarchive_page', '1');
  if (filters.browseAll) query.set('browse_all', '1');
  query.set('page', String(filters.page || 1));
  query.set('limit', String(filters.limit || 15));
  return request<SearchResponse>(`/search?${query.toString()}`, { signal });
}

export async function login(username: string, password: string) {
  return request<{ csrf_token: string; user: User }>('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function logout() {
  return request<{ message: string }>('/logout', { method: 'POST' });
}

async function appendImage(form: FormData, key: string, image: NonNullable<ReportInput['image']>) {
  if (Platform.OS === 'web') {
    if (image.file) {
      form.append(key, image.file, image.name);
      return;
    }
    const response = await fetch(image.uri);
    if (!response.ok) throw new Error('Could not read the selected photo.');
    form.append(key, await response.blob(), image.name);
    return;
  }

  form.append(key, {
    uri: image.uri,
    name: image.name,
    type: image.mimeType,
  } as unknown as Blob);
}

export async function submitReport(input: ReportInput) {
  const phone = input.contactNumber.trim();
  const email = input.email.trim();
  const digits = phone.replace(/\D/g, '');
  if (phone.length > 20 || !/^\+?[0-9 ()-]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
    throw new Error('Enter a valid contact number with 7 to 15 digits (maximum 20 characters).');
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address (maximum 254 characters).');
  if (input.image) {
    const size = input.image.size ?? input.image.file?.size;
    if (size !== undefined && (size <= 0 || size > 5 * 1024 * 1024)) {
      throw new Error('The report photo must be a non-empty image no larger than 5 MB. Choose a smaller photo.');
    }
    if (!/\.(jpe?g|png|gif|webp)$/i.test(input.image.name) || !['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(input.image.mimeType.toLowerCase())) {
      throw new Error('Unsupported report photo format. Choose a JPEG, PNG, GIF, or WebP image. HEIC and PDF are not supported for report photos.');
    }
  }
  if (!input.image) {
    return request<{ message: string; id: number }>('/items', {
      method: 'POST',
      body: JSON.stringify({ name: input.name.trim(), description: input.description.trim(), item_type: input.itemType,
        category_code: input.categoryCode, branch_code: input.branchCode, location_code: input.locationCode,
        date_found: input.dateFound.replace('T', ' '), public_color: input.publicColor, reporter_contact_number: phone, reporter_email: email }),
    });
  }
  const form = new FormData();
  form.append('reporter_contact_number', phone);
  form.append('reporter_email', email);
  form.append('name', input.name.trim());
  form.append('description', input.description.trim());
  form.append('item_type', input.itemType);
  form.append('category_code', input.categoryCode);
  form.append('branch_code', input.branchCode);
  form.append('location_code', input.locationCode);
  form.append('date_found', input.dateFound.replace('T', ' '));
  form.append('public_color', input.publicColor);
  if (input.image) {
    try {
      await appendImage(form, 'item_image', input.image);
    } catch {
      throw new Error('Could not read the report photo. Select it again or choose a different photo.');
    }
  }
  return request<{ message: string; id: number }>('/items', { method: 'POST', body: form });
}

export async function submitClaim(input: ClaimInput) {
  const fields: Record<string, string> = {
    item_code: input.itemCode,
    claimer_first_name: input.firstName.trim(),
    claimer_middle_name: input.middleName.trim(),
    claimer_last_name: input.lastName.trim(),
    contact_number: input.contactNumber.trim(),
    claimant_email: input.email.trim(),
    claimant_affiliation: input.affiliation,
    last_seen_location: input.lastSeenLocation.trim(),
    last_seen_date_time: input.lastSeenDateTime.trim(),
    item_description: input.itemDescription.trim(),
    identifying_features: input.identifyingFeatures.trim(),
    contents: input.contents.trim(),
    additional_evidence: input.additionalEvidence.trim(),
  };
  if (!input.evidence) {
    return request<{ message: string; item_code: string }>('/claims', { method: 'POST', body: JSON.stringify(fields) });
  }
  const evidenceSize = input.evidence.size ?? input.evidence.file?.size;
  if (evidenceSize !== undefined && (evidenceSize <= 0 || evidenceSize > 5 * 1024 * 1024)) {
    throw new Error('Evidence must be a non-empty file no larger than 5 MB. Choose a smaller file or remove it; evidence is optional.');
  }
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  try {
    await appendImage(form, 'evidence', input.evidence);
  } catch {
    throw new Error('Could not read the evidence attachment. Choose the file again, or remove it to submit without evidence.');
  }
  try {
    return await request<{ message: string; item_code: string }>('/claims', { method: 'POST', body: form });
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 0) {
      throw new ApiError(reason.message + ' If this only happens with an attachment, choose the file again. Evidence is optional; check whether the claim was saved before submitting again.', 0);
    }
    throw reason;
  }
}

export async function getClaimQueue() {
  return request<{ claims: Claim[] }>('/claims');
}

export async function getClaimDetails(itemCode: string, claimId?: number) {
  return request<Claim & { reporter_contact_number: string | null; reporter_email: string | null; item_description: string; item_name: string; item_description_private: string; item_status: string; location_code: string; item_file_path: string | null; public_color: string | null }>(claimId ? `/claim-records/${claimId}` : `/claims/${encodeURIComponent(itemCode)}`);
}

export async function updateClaimStatus(itemCode: string, status: Claim['status'], notes: string, claimId?: number) {
  return request<{ message: string }>(claimId ? `/claim-records/${claimId}/status` : `/claims/${encodeURIComponent(itemCode)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
  });
}

export async function getClaimEvidence(itemCode: string, claimId?: number) {
  return request<Blob>(claimId ? `/claim-records/${claimId}/evidence` : `/claims/${encodeURIComponent(itemCode)}/evidence`, {}, 'blob');
}

export async function getUnarchivedItem(itemCode: string) {
  return request<Record<string, string | number | null>>(`/unarchived/${encodeURIComponent(itemCode)}`);
}

export async function restoreItem(itemCode: string, reason: string) {
  return request<{ message: string }>('/items/unarchive', {
    method: 'POST',
    body: JSON.stringify({ item_code: itemCode, reason }),
  });
}

export function asItem(value: unknown): Item | null {
  if (!value || typeof value !== 'object' || !('item_code' in value)) return null;
  return value as Item;
}