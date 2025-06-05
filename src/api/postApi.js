import { clientCredentials } from '../utils/client';

const endpoint = clientCredentials.databaseURL;

// Get all posts
export const getPosts = () =>
  fetch(`${endpoint}/posts.json`)
    .then((res) => res.json())
    .then((data) =>
      data
        ? Object.entries(data).map(([firebaseKey, value]) => ({
            firebaseKey,
            ...value,
          }))
        : [],
    );

// Create a new post
export const createPost = (post) =>
  fetch(`${endpoint}/posts.json`, {
    method: 'POST',
    body: JSON.stringify(post),
    headers: { 'Content-Type': 'application/json' },
  }).then((res) => res.json());

// Delete a post by firebaseKey
export const deletePost = (firebaseKey) =>
  fetch(`${endpoint}/posts/${firebaseKey}.json`, {
    method: 'DELETE',
  });

// Export all functions
export default {
  getPosts,
  createPost,
  deletePost,
};
