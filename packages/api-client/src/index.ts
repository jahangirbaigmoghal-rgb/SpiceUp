import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5001';

/** Create a configured Axios instance for TakeawayPOS API. */
function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    withCredentials: true, // httpOnly cookie auth
    headers: { 'Content-Type': 'application/json' },
    timeout: 15_000,
  });

  // Request interceptor — attach idempotency key and tenant ID
  client.interceptors.request.use((config) => {
    if (config.method === 'post' || config.method === 'put') {
      if (!config.headers['X-Idempotency-Key']) {
        config.headers['X-Idempotency-Key'] =
          `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      }
    }
    
    // Attach tenant ID from localStorage if available
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const tenantId = localStorage.getItem('tenantId');
      if (tenantId) {
        config.headers['X-Tenant-ID'] = tenantId;
      }
    }
    
    return config;
  });

  // Response interceptor — handle 401 globally
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        // Redirect to login — each app handles its own auth flow
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const api = createApiClient();

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  loginPin: (data: { pin: string; terminalId: string }) =>
    api.post('/auth/login-pin', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  openShift: (data: { floatPence: number; terminalId: string }) =>
    api.post('/auth/shift/open', data),
  closeShift: (data: { closingCashPence: number }) =>
    api.post('/auth/shift/close', data),
  currentShift: () => api.get('/auth/shift/current'),
};

// ─── Menu ──────────────────────────────────────────────────────────────────
export const menuApi = {
  categories: (params?: Record<string, unknown>) =>
    api.get('/menu/categories', { params }),
  items: (params?: Record<string, unknown>) =>
    api.get('/menu/items', { params }),
  item: (id: string) => api.get(`/menu/items/${id}`),
  createItem: (data: unknown) => api.post('/menu/items', data),
  updateItem: (id: string, data: unknown) => api.put(`/menu/items/${id}`, data),
  deleteItem: (id: string) => api.delete(`/menu/items/${id}`),
  toggleAvailability: (id: string, isAvailable: boolean) =>
    api.patch(`/menu/items/${id}/availability`, { isAvailable }),
  createCategory: (data: unknown) => api.post('/menu/categories', data),
  updateCategory: (id: string, data: unknown) => api.put(`/menu/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/menu/categories/${id}`),
  modifierGroups: () => api.get('/menu/modifiers'),
  createModifierGroup: (data: unknown) => api.post('/menu/modifiers', data),
  updateModifierGroup: (id: string, data: unknown) => api.put(`/menu/modifiers/${id}`, data),
  deleteModifierGroup: (id: string) => api.delete(`/menu/modifiers/${id}`),

  // Components
  components: () => api.get('/menu/components'),
  createComponent: (data: unknown) => api.post('/menu/components', data),
  updateComponent: (id: string, data: unknown) => api.put(`/menu/components/${id}`, data),
  deleteComponent: (id: string) => api.delete(`/menu/components/${id}`),

  // Labels
  labels: () => api.get('/menu/labels'),
  createLabel: (data: unknown) => api.post('/menu/labels', data),
  updateLabel: (id: string, data: unknown) => api.put(`/menu/labels/${id}`, data),
  deleteLabel: (id: string) => api.delete(`/menu/labels/${id}`),

  // Departments
  departments: () => api.get('/menu/departments'),
  createDepartment: (data: unknown) => api.post('/menu/departments', data),
  updateDepartment: (id: string, data: unknown) => api.put(`/menu/departments/${id}`, data),
  deleteDepartment: (id: string) => api.delete(`/menu/departments/${id}`),

  // Manual Products
  manualProducts: () => api.get('/menu/manual-products'),
  createManualProduct: (data: unknown) => api.post('/menu/manual-products', data),
  updateManualProduct: (id: string, data: unknown) => api.put(`/menu/manual-products/${id}`, data),
  deleteManualProduct: (id: string) => api.delete(`/menu/manual-products/${id}`),

  // Short Hands
  shorthands: () => api.get('/menu/shorthands'),
  createShortHand: (data: unknown) => api.post('/menu/shorthands', data),
  updateShortHand: (id: string, data: unknown) => api.put(`/menu/shorthands/${id}`, data),
  deleteShortHand: (id: string) => api.delete(`/menu/shorthands/${id}`),

  // Product Times
  productTimes: () => api.get('/menu/product-times'),
  createProductTime: (data: unknown) => api.post('/menu/product-times', data),
  updateProductTime: (id: string, data: unknown) => api.put(`/menu/product-times/${id}`, data),
  deleteProductTime: (id: string) => api.delete(`/menu/product-times/${id}`),

  // Variations
  variations: (params?: Record<string, unknown>) => api.get('/menu/variations', { params }),
  createVariation: (data: unknown) => api.post('/menu/variations', data),
  updateVariation: (id: string, data: unknown) => api.put(`/menu/variations/${id}`, data),
  deleteVariation: (id: string) => api.delete(`/menu/variations/${id}`),

  // Bundles
  bundles: (params?: Record<string, unknown>) => api.get('/menu/bundles', { params }),
  createBundle: (data: unknown) => api.post('/menu/bundles', data),
  updateBundle: (id: string, data: unknown) => api.put(`/menu/bundles/${id}`, data),
  deleteBundle: (id: string) => api.delete(`/menu/bundles/${id}`),
};

// ─── Orders ────────────────────────────────────────────────────────────────
export const ordersApi = {
  list: (params?: Record<string, unknown>) => api.get('/orders', { params }),
  create: (data: unknown, idempotencyKey: string) =>
    api.post('/orders', data, {
      headers: { 'X-Idempotency-Key': idempotencyKey },
    } as AxiosRequestConfig),
  get: (id: string) => api.get(`/orders/${id}`),
  getByRef: (ref: string) => api.get(`/orders/ref/${ref}`),
  updateStatus: (id: string, status: string, data?: unknown) =>
    api.put(`/orders/${id}/status`, { status, ...(data as any) }),
  cancel: (id: string, reason: string) =>
    api.post(`/orders/${id}/cancel`, { reason }),
  refund: (id: string, data: unknown) =>
    api.post(`/orders/${id}/refund`, data),
  myOrders: () => api.get('/orders/my-orders'),
};

// ─── Delivery ──────────────────────────────────────────────────────────────
export const deliveryApi = {
  validateZone: (data: { postcode: string }) =>
    api.post('/delivery/validate', data),
  zones: () => api.get('/delivery/zones'),
  createZone: (data: unknown) => api.post('/delivery/zones', data),
  updateZone: (id: string, data: unknown) => api.put(`/delivery/zones/${id}`, data),
  deleteZone: (id: string) => api.delete(`/delivery/zones/${id}`),
};

// ─── Payments ──────────────────────────────────────────────────────────────
export const paymentsApi = {
  createIntent: (data: { amountPence: number; orderId: string }) =>
    api.post('/payments/intent', data),
};

// ─── Reports ───────────────────────────────────────────────────────────────
export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard'),
  sales: (params: Record<string, unknown>) => api.get('/reports/sales', { params }),
  zReport: (date: string) => api.get('/reports/zreport', { params: { date } }),
  vatReport: (params: Record<string, unknown>) => api.get('/reports/vat', { params }),
  voiceAgent: (params?: Record<string, unknown>) =>
    api.get('/reports/voice-agent', { params }),
  voiceCalls: (params?: Record<string, unknown>) =>
    api.get('/reports/voice-calls', { params }),
};

// ─── Settings ──────────────────────────────────────────────────────────────
export const settingsApi = {
  get: () => api.get('/settings'),
  getPublic: () => api.get('/settings/public'),
  update: (data: unknown) => api.put('/settings', data),
};

// ─── Promotions ────────────────────────────────────────────────────────────
export const promotionsApi = {
  list: () => api.get('/promotions'),
  create: (data: unknown) => api.post('/promotions', data),
  update: (id: string, data: unknown) => api.put(`/promotions/${id}`, data),
  delete: (id: string) => api.delete(`/promotions/${id}`),
  validate: (code: string, orderData: unknown) =>
    api.post('/promotions/validate', { code, ...(orderData as any) }),
};

export default api;
