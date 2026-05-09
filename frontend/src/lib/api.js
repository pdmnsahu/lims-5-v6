const BASE = 'https://lims-5-v6.onrender.com/api';

function getToken() { return localStorage.getItem('coal_lims_token'); }

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function upload(path, formData) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login:   (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  me:      ()                    => request('/auth/me'),

  // Users
  getUsers:      (role)          => request(`/users${role ? `?role=${role}` : ''}`),
  createUser:    (data)          => request('/users', { method: 'POST', body: data }),
  updateUser:    (id, data)      => request(`/users/${id}`, { method: 'PATCH', body: data }),
  deleteUser:    (id)            => request(`/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id)            => request(`/users/${id}/reset-password`, { method: 'POST' }),

  // Clients
  getClients:   ()               => request('/clients'),
  createClient: (data)           => request('/clients', { method: 'POST', body: data }),
  updateClient: (id, data)       => request(`/clients/${id}`, { method: 'PATCH', body: data }),
  deleteClient: (id)             => request(`/clients/${id}`, { method: 'DELETE' }),

  // Sample Groups
  getSampleGroups:    ()         => request('/sample-groups'),
  getSampleGroup:     (id)       => request(`/sample-groups/${id}`),
  createSampleGroup:  (data)     => request('/sample-groups', { method: 'POST', body: data }),
  updateSampleGroup:  (id, data) => request(`/sample-groups/${id}`, { method: 'PATCH', body: data }),
  deleteSampleGroup:  (id)       => request(`/sample-groups/${id}`, { method: 'DELETE' }),

  // Samples
  getSamples:      (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v != null && v !== ''))).toString();
    return request(`/samples${qs ? `?${qs}` : ''}`);
  },
  getSample:       (id)          => request(`/samples/${id}`),
  deleteSample:    (id)          => request(`/samples/${id}`, { method: 'DELETE' }),
  assignLabId:     (id, lab)     => request(`/samples/${id}/lab-id`, { method: 'PATCH', body: { lab_internal_id: lab } }),
  editSampleRefId: (id, ref)     => request(`/samples/${id}/ref-id`, { method: 'PATCH', body: { sample_ref_id: ref } }),
  getSampleTests:  (id)          => request(`/samples/${id}/tests`),
  assignTest:      (id, data)    => request(`/samples/${id}/tests`, { method: 'POST', body: data }),

  // Bulk assign
  bulkAssign: (data)             => request('/bulk-assign', { method: 'POST', body: data }),

  // Tests
  getTests:           ()         => request('/tests'),
  getTest:            (id)       => request(`/tests/${id}`),
  getSampleApproval:  ()         => request('/tests/sample-approval'),
  submitTest:         (id, data) => request(`/tests/${id}/submit`,          { method: 'PATCH', body: data }),
  reviewTest:         (id, data) => request(`/tests/${id}/review`,          { method: 'PATCH', body: data }),
  reassignTest:       (id, data) => request(`/tests/${id}/reassign`,        { method: 'PATCH', body: data }),
  deleteTest:         (id)       => request(`/tests/${id}`,                 { method: 'DELETE' }),
  revokeApproval:     (id, reason) => request(`/tests/${id}/revoke-approval`, { method: 'PATCH', body: { reason } }),

  // Test Definitions
  getTestDefinitions: ()         => request('/test-definitions'),

  // Upload
  uploadCalorimeter: (testId, file) => {
    const fd = new FormData(); fd.append('image', file);
    return upload(`/upload/calorimeter/${testId}`, fd);
  },

  // Reports
  getSampleReport: (sampleId)    => request(`/reports/sample/${sampleId}`),
  getGroupReport:  (id)          => request(`/reports/group/${id}`),
  getOverview:     ()            => request('/reports/overview'),

  // Ambient readings
  getAmbientReadings: (limit)    => request(`/ambient${limit ? `?limit=${limit}` : ''}`),
  getAmbientToday:    ()         => request('/ambient/today'),
  getAmbientByDate:   (date)     => request(`/ambient/${date}`),
  saveAmbient:        (date, data) => request(`/ambient/${date}`, { method: 'PUT', body: data }),

  // Audit
  getAuditLogs:    (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v !== '' && v != null))).toString();
    return request(`/audit${qs ? `?${qs}` : ''}`);
  },
  getAuditActors:  ()            => request('/audit/actors'),
  getAuditActions: ()            => request('/audit/actions'),

  // Lab Settings
  getSettings:     ()            => request('/settings'),
  updateSettings:  (data)        => request('/settings', { method: 'PUT', body: data }),
  uploadSettingsImage: (field, file) => {
    const fd = new FormData(); fd.append('image', file);
    return upload(`/settings/upload/${field}`, fd);
  },
};