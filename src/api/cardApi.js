/* eslint-disable import/prefer-default-export */
import { clientCredentials } from '../utils/client';

const endpoint = clientCredentials.databaseURL;

const getCards = () =>
  new Promise((resolve, reject) => {
    fetch(`${endpoint}/cards.json`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data) {
          resolve(Object.values(data));
        } else {
          resolve([]);
        }
      })
      .catch(reject);
  });

export default getCards;
