import { clientCredentials } from '../utils/client';

const endpoint = clientCredentials.databaseURL;

// Get all lobbies
export const getLobbies = () =>
  fetch(`${endpoint}/lobbies.json`)
    .then((res) => res.json())
    .then((data) =>
      data
        ? Object.entries(data).map(([firebaseKey, value]) => ({
            firebaseKey,
            ...value,
          }))
        : [],
    );

// Create a new lobby
export const createLobby = (lobby) =>
  fetch(`${endpoint}/lobbies.json`, {
    method: 'POST',
    body: JSON.stringify(lobby),
    headers: { 'Content-Type': 'application/json' },
  }).then((res) => res.json());

// Update a lobby by firebaseKey
export const updateLobby = (firebaseKey, lobby) =>
  fetch(`${endpoint}/lobbies/${firebaseKey}.json`, {
    method: 'PATCH',
    body: JSON.stringify(lobby),
    headers: { 'Content-Type': 'application/json' },
  }).then((res) => res.json());

// Delete a lobby by firebaseKey
export const deleteLobby = (firebaseKey) =>
  fetch(`${endpoint}/lobbies/${firebaseKey}.json`, {
    method: 'DELETE',
  });

export default {
  getLobbies,
  createLobby,
  updateLobby,
  deleteLobby,
};
