const DEFAULT_API_BASE_URL = 'https://neptune-backend-kappa.vercel.app';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function getToken(): string | null {
  return localStorage.getItem('neptune_admin_access_token');
}

function normalizeStatus(value: string | null | undefined): 'ACTIVE' | 'INACTIVE' {
  return value === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
}

function normalizeAssignmentStatus(value: string | null | undefined): 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' {
  if (value === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (value === 'COMPLETED') return 'COMPLETED';
  return 'SCHEDULED';
}

function normalizeRequestStatus(value: string | null | undefined): 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED' {
  if (value === 'ACCEPTED') return 'ACCEPTED';
  if (value === 'COMPLETED') return 'COMPLETED';
  if (value === 'CANCELLED') return 'CANCELLED';
  return 'PENDING';
}

function pickFirst<T>(value: unknown, ...keys: string[]): T | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key] as T;
  }
  return undefined;
}

function textToJson(payload: string): unknown {
  if (!payload) return null;
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

function errorMessageFromBody(body: unknown, fallback: string): string {
  if (typeof body === 'string' && body) return body;
  if (typeof body === 'object' && body !== null) {
    const record = body as Record<string, unknown>;
    return (
      (typeof record.message === 'string' && record.message) ||
      (typeof record.error === 'string' && record.error) ||
      (typeof record.detail === 'string' && record.detail) ||
      fallback
    );
  }
  return fallback;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, requireAuth = true): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) {
    if (!headers.has('Content-Type') && options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }
  }

  if (requireAuth) {
    const token = getToken();
    if (!token) {
      throw new ApiError(401, 'Unauthorized: admin session is missing.');
    }
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const body = textToJson(text);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      errorMessageFromBody(body, `Request failed with status ${response.status}.`),
      body,
    );
  }

  return (body as T) ?? (undefined as T);
}

export function apiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export type AdminLoginResponse = {
  accessToken: string;
  user: {
    id: string;
    loginId: string;
    role: string;
    status: string;
  };
};

export async function loginAdmin(loginId: string, password: string): Promise<AdminLoginResponse> {
  return apiRequest<AdminLoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ loginId, password }),
  }, false);
}

export function getAdminToken(): string | null {
  return getToken();
}

export type ApiCollector = {
  id?: string;
  fullName?: string;
  name?: string;
  loginId?: string;
  username?: string;
  nic?: string;
  mobile?: string;
  phone?: string;
  address?: string;
  guardianName?: string;
  guardianMobile?: string;
  guardianPhone?: string;
  qrToken?: string;
  qrCode?: string;
  status?: string;
  area?: string;
  createdDate?: string;
  createdAt?: string;
  lastLogin?: string | null;
  lastLoginAt?: string | null;
};

export function mapCollector(record: ApiCollector | null | undefined) {
  if (!record) return null;
  return {
    id: record.id ?? '—',
    fullName: pickFirst<string>(record, 'fullName', 'name') ?? 'Unknown collector',
    loginId: pickFirst<string>(record, 'loginId', 'username') ?? '',
    nic: pickFirst<string>(record, 'nic', 'nationalId') ?? '',
    mobile: pickFirst<string>(record, 'mobile', 'phone') ?? '—',
    address: pickFirst<string>(record, 'address', 'streetAddress') ?? '—',
    guardianName: pickFirst<string>(record, 'guardianName') ?? '—',
    guardianMobile: pickFirst<string>(record, 'guardianMobile', 'guardianPhone') ?? '—',
    qrToken: pickFirst<string>(record, 'qrToken', 'qrCode') ?? '',
    status: normalizeStatus(pickFirst<string>(record, 'status')),
    area: pickFirst<string>(record, 'area') ?? 'Not assigned',
    createdDate: pickFirst<string>(record, 'createdDate', 'createdAt') ?? new Date().toISOString(),
    lastLogin: pickFirst<string | null>(record, 'lastLogin', 'lastLoginAt') ?? null,
  };
}

export type ApiRider = {
  id?: string;
  fullName?: string;
  name?: string;
  loginId?: string;
  username?: string;
  nic?: string;
  mobile?: string;
  phone?: string;
  address?: string;
  status?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  vehicleColour?: string;
  assignedVehicleId?: string | null;
  assignedVehicle?: { id?: string } | null;
  createdDate?: string;
  createdAt?: string;
  lastLogin?: string | null;
  lastLoginAt?: string | null;
};

export function mapRider(record: ApiRider | null | undefined) {
  if (!record) return null;
  const vehicleId = pickFirst<string | null>(record, 'assignedVehicleId', 'vehicleId') ??
    (typeof record.assignedVehicle === 'object' && record.assignedVehicle ? (record.assignedVehicle as { id?: string }).id ?? null : null);

  return {
    id: record.id ?? '—',
    fullName: pickFirst<string>(record, 'fullName', 'name') ?? 'Unknown rider',
    loginId: pickFirst<string>(record, 'loginId', 'username') ?? '',
    nic: pickFirst<string>(record, 'nic', 'nationalId') ?? '',
    mobile: pickFirst<string>(record, 'mobile', 'phone') ?? '—',
    address: pickFirst<string>(record, 'address', 'streetAddress') ?? '—',
    status: normalizeStatus(pickFirst<string>(record, 'status')),
    vehicleType: (pickFirst<string>(record, 'vehicleType') as 'TUK' | 'BIKE' | 'TRUCK') || 'TUK',
    vehicleNumber: pickFirst<string>(record, 'vehicleNumber') ?? '',
    vehicleColour: pickFirst<string>(record, 'vehicleColour', 'color') ?? 'GREEN',
    assignedVehicleId: vehicleId,
    createdDate: pickFirst<string>(record, 'createdDate', 'createdAt') ?? new Date().toISOString(),
    lastLogin: pickFirst<string | null>(record, 'lastLogin', 'lastLoginAt') ?? null,
  };
}

export type ApiVehicle = {
  id?: string;
  vehicleCode?: string;
  code?: string;
  vehicleType?: string;
  type?: string;
  status?: string;
  assignedRiderId?: string | null;
  riderId?: string | null;
  assignedRider?: { id?: string } | null;
  createdDate?: string;
  createdAt?: string;
};

export function mapVehicle(record: ApiVehicle | null | undefined) {
  if (!record) return null;
  const riderId = pickFirst<string | null>(record, 'assignedRiderId', 'riderId') ??
    (typeof record.assignedRider === 'object' && record.assignedRider ? (record.assignedRider as { id?: string }).id ?? null : null);

  return {
    id: record.id ?? '—',
    vehicleCode: pickFirst<string>(record, 'vehicleCode', 'code') ?? '—',
    vehicleType: (pickFirst<string>(record, 'vehicleType', 'type') as 'TRUCK' | 'TUK' | 'BIKE') || 'TUK',
    status: normalizeStatus(pickFirst<string>(record, 'status')),
    assignedRiderId: riderId,
    createdDate: pickFirst<string>(record, 'createdDate', 'createdAt') ?? new Date().toISOString(),
  };
}

export type ApiAssignment = {
  id?: string;
  date?: string;
  collectorId?: string;
  collector?: { id?: string } | null;
  area?: string;
  status?: string;
  requestIds?: string[];
  createdDate?: string;
  createdAt?: string;
};

export function mapAssignment(record: ApiAssignment | null | undefined) {
  if (!record) return null;
  const collectorId = pickFirst<string>(record, 'collectorId') ?? (typeof record.collector === 'object' && record.collector ? (record.collector as { id?: string }).id ?? '' : '');
  return {
    id: record.id ?? '—',
    date: pickFirst<string>(record, 'date') ?? new Date().toISOString().slice(0, 10),
    collectorId,
    area: pickFirst<string>(record, 'area') ?? '—',
    status: normalizeAssignmentStatus(pickFirst<string>(record, 'status')),
    requestIds: Array.isArray(record.requestIds) ? record.requestIds : [],
    createdDate: pickFirst<string>(record, 'createdDate', 'createdAt') ?? new Date().toISOString(),
  };
}

export type ApiCollectionRequest = {
  id?: string;
  collectorId?: string;
  collector?: { id?: string; fullName?: string; mobile?: string } | null;
  riderId?: string | null;
  rider?: { id?: string; fullName?: string; mobile?: string } | null;
  vehicleId?: string | null;
  vehicle?: { id?: string; vehicleCode?: string; vehicleType?: string } | null;
  latitude?: number | null;
  longitude?: number | null;
  location?: string;
  status?: string;
  requestedAt?: string | null;
  acceptedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  collection?: unknown;
  assignmentId?: string | null;
  totalWeight?: number | null;
  collectionDate?: string | null;
  acceptedDate?: string | null;
  cancelledDate?: string | null;
  createdDate?: string;
};

export function mapCollectionRequest(record: ApiCollectionRequest | null | undefined) {
  if (!record) return null;
  return {
    id: record.id ?? '—',
    collectorId: record.collectorId ?? record.collector?.id ?? '',
    riderId: record.riderId ?? record.rider?.id ?? null,
    vehicleId: record.vehicleId ?? record.vehicle?.id ?? null,
    location: record.location ?? '—',
    createdDate: record.createdDate ?? record.createdAt ?? record.requestedAt ?? new Date().toISOString(),
    status: normalizeRequestStatus(pickFirst<string>(record, 'status')),
    totalWeight: pickFirst<number | null>(record, 'totalWeight', 'weight') ?? null,
    collectionDate: pickFirst<string | null>(record, 'collectionDate', 'completedAt') ?? null,
    acceptedDate: pickFirst<string | null>(record, 'acceptedDate', 'acceptedAt') ?? null,
    cancelledDate: pickFirst<string | null>(record, 'cancelledDate', 'cancelledAt') ?? null,
    assignmentId: pickFirst<string | null>(record, 'assignmentId') ?? null,
  };
}

export async function fetchCollectors(): Promise<any[]> {
  const payload = await apiRequest<{ data?: ApiCollector[]; collectors?: ApiCollector[]; items?: ApiCollector[] } | ApiCollector[]>('/admin/collectors');
  const list = Array.isArray(payload) ? payload : payload?.data ?? payload?.collectors ?? payload?.items ?? [];
  return (list as ApiCollector[]).map(mapCollector).filter(Boolean);
}

export async function createCollector(data: Record<string, unknown>) {
  const payload = await apiRequest<ApiCollector>('/admin/collectors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return mapCollector(payload);
}

export async function updateCollector(id: string, data: Record<string, unknown>) {
  const payload = await apiRequest<ApiCollector>(`/admin/collectors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return mapCollector(payload);
}

export async function toggleCollectorStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
  const payload = await apiRequest<ApiCollector>(`/admin/collectors/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return mapCollector(payload);
}

export async function fetchRiders(): Promise<any[]> {
  const payload = await apiRequest<{ data?: ApiRider[]; riders?: ApiRider[]; items?: ApiRider[] } | ApiRider[]>('/admin/riders');
  const list = Array.isArray(payload) ? payload : payload?.data ?? payload?.riders ?? payload?.items ?? [];
  return (list as ApiRider[]).map(mapRider).filter(Boolean);
}

export async function createRider(data: Record<string, unknown>) {
  const payload = await apiRequest<ApiRider>('/admin/riders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return mapRider(payload);
}

export async function updateRider(id: string, data: Record<string, unknown>) {
  const payload = await apiRequest<ApiRider>(`/admin/riders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return mapRider(payload);
}

export async function toggleRiderStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
  const payload = await apiRequest<ApiRider>(`/admin/riders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return mapRider(payload);
}

export async function fetchVehicles(): Promise<any[]> {
  const payload = await apiRequest<{ data?: ApiVehicle[]; vehicles?: ApiVehicle[]; items?: ApiVehicle[] } | ApiVehicle[]>('/admin/vehicles');
  const list = Array.isArray(payload) ? payload : payload?.data ?? payload?.vehicles ?? payload?.items ?? [];
  return (list as ApiVehicle[]).map(mapVehicle).filter(Boolean);
}

export async function createVehicle(data: Record<string, unknown>) {
  const payload = await apiRequest<ApiVehicle>('/admin/vehicles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return mapVehicle(payload);
}

export async function updateVehicle(id: string, data: Record<string, unknown>) {
  const payload = await apiRequest<ApiVehicle>(`/admin/vehicles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return mapVehicle(payload);
}

export async function toggleVehicleStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
  const payload = await apiRequest<ApiVehicle>(`/admin/vehicles/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return mapVehicle(payload);
}

export async function fetchAssignments(): Promise<any[]> {
  const payload = await apiRequest<{ data?: ApiAssignment[]; assignments?: ApiAssignment[]; items?: ApiAssignment[] } | ApiAssignment[]>('/admin/assignments');
  const list = Array.isArray(payload) ? payload : payload?.data ?? payload?.assignments ?? payload?.items ?? [];
  return (list as ApiAssignment[]).map(mapAssignment).filter(Boolean);
}

export async function createAssignment(data: Record<string, unknown>) {
  const payload = await apiRequest<ApiAssignment>('/admin/assignments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return mapAssignment(payload);
}

export async function updateAssignment(id: string, data: Record<string, unknown>) {
  const payload = await apiRequest<ApiAssignment>(`/admin/assignments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return mapAssignment(payload);
}

export async function deleteAssignment(id: string): Promise<void> {
  await apiRequest<void>(`/admin/assignments/${id}`, { method: 'DELETE' });
}

export async function fetchCollectionRequests(): Promise<any[]> {
  const payload = await apiRequest<{ data?: ApiCollectionRequest[]; requests?: ApiCollectionRequest[]; items?: ApiCollectionRequest[] } | ApiCollectionRequest[]>('/admin/collection-requests');
  const list = Array.isArray(payload) ? payload : payload?.data ?? payload?.requests ?? payload?.items ?? [];
  return (list as ApiCollectionRequest[]).map(mapCollectionRequest).filter(Boolean);
}

export async function fetchCollectionRequestById(id: string): Promise<any> {
  const payload = await apiRequest<ApiCollectionRequest>(`/admin/collection-requests/${id}`);
  return mapCollectionRequest(payload);
}

export async function fetchCollectorById(id: string) {
  const payload = await apiRequest<ApiCollector>(`/admin/collectors/${id}`);
  return mapCollector(payload);
}

export async function fetchRiderById(id: string) {
  const payload = await apiRequest<ApiRider>(`/admin/riders/${id}`);
  return mapRider(payload);
}

export async function fetchVehicleById(id: string) {
  const payload = await apiRequest<ApiVehicle>(`/admin/vehicles/${id}`);
  return mapVehicle(payload);
}

export async function fetchAssignmentById(id: string) {
  const payload = await apiRequest<ApiAssignment>(`/admin/assignments/${id}`);
  return mapAssignment(payload);
}

export function getDashboardDateLabel(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
