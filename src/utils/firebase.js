import firebase from 'firebase/app';
import 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyCcWxfW631JnTwW911YhU6SkpERTkNfHGQ',
  authDomain: 'dueling-multiverse.firebaseapp.com',
  databaseURL: 'https://dueling-multiverse-default-rtdb.firebaseio.com/',
  projectId: 'dueling-multiverse',
  storageBucket: 'dueling-multiverse.firebasestorage.app',
  messagingSenderId: '757788423668',
  appId: '1:757788423668:web:5abbc87c2760be98afb5a1',
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const db = firebase.database();
export default firebase;
