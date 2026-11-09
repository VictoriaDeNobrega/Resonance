import { apiRequest } from '../../../api/axiosClient';

export const roomApi = {
  createRoom: (data) => apiRequest('/rooms', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getRoomByCode: (code) => apiRequest(`/rooms/${code}`, {
    method: 'GET'
  }),

  closeRoom: (code, hostId) => apiRequest(`/rooms/${code}?hostId=${encodeURIComponent(hostId)}`, {
    method: 'DELETE'
  })
};
