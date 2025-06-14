import { clientCredentials } from '../utils/client';

const endpoint = clientCredentials.databaseURL;

// Helper to fetch a single card by ID from the cards API
const getCardById = (cardId) =>
  fetch(`${endpoint}/cards.json?orderBy="id"&equalTo="${cardId}"`)
    .then((res) => res.json())
    .then((data) => {
      // data is an object with firebase keys, so get the first value
      const values = Object.values(data || {});
      return values.length > 0 ? values[0] : null;
    });

// Get a deck by Firebase key and return full card objects from the cards API
export const getDeckWithCards = async (deckId) => {
  // Fetch the deck object
  const deckRes = await fetch(`${endpoint}/decks/${deckId}.json`);
  const deckObj = await deckRes.json();
  if (!deckObj) return [];

  // Support both "cards" and "mainDeck" arrays
  const cardIds = deckObj.cards || deckObj.mainDeck || [];

  // Fetch all card objects in parallel
  const cardObjects = await Promise.all(cardIds.map((cardId) => getCardById(cardId)));

  // Filter out any nulls (missing cards)
  return cardObjects.filter(Boolean);
};

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

// Get all decks for a user by UID
export const getUserDecks = (uid) =>
  fetch(`${endpoint}/decks.json?orderBy="owner"&equalTo="${uid}"`)
    .then((res) => res.json())
    .then((data) =>
      data
        ? Object.entries(data).map(([firebaseKey, value]) => ({
            firebaseKey,
            ...value,
          }))
        : [],
    );

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
