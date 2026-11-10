import axiosClient from '../../../api/axiosClient';

// Exportamos un objeto con las funciones exclusivas de canciones
export const songsApi = {
  getFilteredSongs: async (filters = {}) => {
    // Armamos la URL con los parámetros de búsqueda (?searchTerm=x&artist=y)
    const params = new URLSearchParams();
    if (filters.searchTerm) params.append('searchTerm', filters.searchTerm);
    if (filters.artist) params.append('artist', filters.artist);
    if (filters.album) params.append('album', filters.album);

    // Usamos el cliente global para hacer la petición GET
    const response = await axiosClient.get(`/songs?${params.toString()}`);
    return response.data; // Retorna la lista de canciones
  }
};