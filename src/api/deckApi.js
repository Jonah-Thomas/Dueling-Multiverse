import { clientCredentials } from '../utils/client';

const endpoint = clientCredentials.databaseURL;

// Get all decks
const getDecks = () =>
  new Promise((resolve, reject) => {
    fetch(`${endpoint}/decks.json`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data) {
          // Return an array of decks with their Firebase keys
          resolve(Object.entries(data).map(([firebaseKey, deck]) => ({ firebaseKey, ...deck })));
        } else {
          resolve([]);
        }
      })
      .catch(reject);
  });

// Create a new deck
const createDeck = (deckObj) =>
  new Promise((resolve, reject) => {
    fetch(`${endpoint}/decks.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deckObj),
    })
      .then((response) => response.json())
      .then(resolve)
      .catch(reject);
  });

// Delete a deck by Firebase key
const deleteDeck = (firebaseKey) =>
  new Promise((resolve, reject) => {
    fetch(`${endpoint}/decks/${firebaseKey}.json`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(resolve)
      .catch(reject);
  });

// Update (remake) a deck by Firebase key
const updateDeck = (firebaseKey, deckObj) =>
  new Promise((resolve, reject) => {
    fetch(`${endpoint}/decks/${firebaseKey}.json`, {
      method: 'PATCH', // or 'PUT' if you want to replace the whole object
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deckObj),
    })
      .then((response) => response.json())
      .then(resolve)
      .catch(reject);
  });

export { getDecks, createDeck, deleteDeck, updateDeck };
