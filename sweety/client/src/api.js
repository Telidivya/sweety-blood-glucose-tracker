const TOKEN_KEY = 'sweety_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request(path, { method = 'GET', body } = {}) {
  const token = tokenStore.get();
  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // An expired token on a protected call sends the user back to the login page.
    if (response.status === 401 && token) window.dispatchEvent(new Event('auth:expired'));
    const error = new Error(data?.error?.message || 'Something went wrong. Please try again.');
    error.status = response.status;
    error.field = data?.error?.field;
    throw error;
  }
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  me: () => request('/auth/me'),

  listReadings: ({ page = 1, limit = 10 } = {}) =>
    request(`/readings?page=${page}&limit=${limit}`),
  addReading: (body) => request('/readings', { method: 'POST', body }),
  updateReading: (id, body) => request(`/readings/${id}`, { method: 'PUT', body }),
  deleteReading: (id) => request(`/readings/${id}`, { method: 'DELETE' }),

  // Patients read their own reports; doctors read an assigned patient's.
  report: (kind, date, patientId) =>
    patientId
      ? request(`/doctor/patients/${patientId}/reports/${kind}?date=${date}`)
      : request(`/reports/${kind}?date=${date}`),

  // Patient: manage which doctors can see my reports
  listDoctors: () => request('/care/doctors'),
  addDoctor: (email) => request('/care/doctors', { method: 'POST', body: { email } }),
  removeDoctor: (doctorId) => request(`/care/doctors/${doctorId}`, { method: 'DELETE' }),

  // Doctor: patients who shared their reports
  listPatients: () => request('/doctor/patients'),
};
