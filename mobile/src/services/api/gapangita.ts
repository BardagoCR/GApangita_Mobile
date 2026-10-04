import type {
  Branch,
  Category,
  ClaimInput,
  Item,
  Location,
  ReportInput,
  SearchResponse,
  User,
} from '@/src/types/api';
import { Platform } from 'react-native';
import { request } from './client';

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

export async function searchItems(filters: SearchFilters = {}) {
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
  return request<SearchResponse>(`/search?${query.toString()}`);
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
  const form = new FormData();
  form.append('name', input.name.trim());
  form.append('description', input.description.trim());
  form.append('item_type', input.itemType);
  form.append('category_code', input.categoryCode);
  form.append('branch_code', input.branchCode);
  form.append('location_code', input.locationCode);
  form.append('date_found', input.dateFound.replace('T', ' '));
  if (input.image) await appendImage(form, 'item_image', input.image);
  return request<{ message: string; id: number }>('/items', { method: 'POST', body: form });
}

export async function submitClaim(input: ClaimInput) {
  const form = new FormData();
  form.append('item_code', input.itemCode);
  form.append('claimer_first_name', input.firstName.trim());
  form.append('claimer_middle_name', input.middleName.trim());
  form.append('claimer_last_name', input.lastName.trim());
  form.append('contact_number', input.contactNumber.trim());
  await appendImage(form, 'claimProof', input.proof);
  return request<{ message: string }>('/claims', { method: 'POST', body: form });
}

export async function getItemClaim(itemCode: string) {
  return request<Record<string, string | number | null>>(`/claims/${encodeURIComponent(itemCode)}`);
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