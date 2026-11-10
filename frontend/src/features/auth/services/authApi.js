import { apiRequest } from '../../../api/axiosClient';

export function registerUser(form) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(form)
  });
}

export function loginUser(form) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(form)
  });
}

export function updateUser(userId, form) {
  return apiRequest(`/auth/update/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(form)
  });
}
