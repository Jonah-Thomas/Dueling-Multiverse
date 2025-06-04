# Dueling Multiverse

<img src="https://i.imgur.com/9MteXcC.png" alt="Dueling Multiverse Logo" width="200" style="display:block;margin:0 auto 24px;" />

A Next.js web application for building, saving, and dueling with custom Yu-Gi-Oh! decks.  
This project uses Firebase for authentication and data storage, and features a modern deck editor, player chat, and a duel room for real-time play.

---

## Features

- **Firebase Authentication**: Secure login with Google.
- **Deck Builder**: Create, edit, save, and delete Yu-Gi-Oh! decks.
- **Card Search & Filtering**: Find cards by type (Monster, Spell, Trap, All).
- **Deck Management**: Load, update, and remove your saved decks.
- **Duel Room**: Challenge other players in a head-to-head duel (WIP).
- **Persistent Chat**: Post and reply to messages with avatars.(WIP)
- **Responsive UI**: Built with React-Bootstrap and Next.js App Router.

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/Dueling-Multiverse.git
cd Dueling-Multiverse
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Firebase

- Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).
- Enable **Authentication** (Google sign-in).
- Create a **Realtime Database** and set rules as needed.
- Copy your Firebase config values into a new `.env` file (see `.env.sample` for structure).

### 4. Configure Next.js Image Domains

Make sure your `next.config.js` includes:
```js
images: {
  domains: [
    'images.ygoprodeck.com',
    'i.imgur.com',
    'lh3.googleusercontent.com'
  ],
},
```

### 5. Start the Development Server

```bash
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) to use the app.

---

## Project Structure

- `/src/app` - Main Next.js app pages (decks, duel, home, etc.)
- `/src/components` - Reusable UI components (NavBar, SignIn, etc.)
- `/src/api` - API utilities for cards and decks (Firebase)
- `/src/utils` - Auth context and helpers

---

## Screenshots

<img src="https://i.imgur.com/9MteXcC.png" alt="Dueling Multiverse Logo" width="200" />

---

## Deployment

You can deploy this app to [Netlify](https://www.netlify.com/) or [Vercel](https://vercel.com/):

- **Build Command:** `npm run build`
- **Publish Directory:** `.next`

**Remember:**  
Add your environment variables to your deployment platform.

---

## Credits

- Card images from [YGOPRODeck API](https://ygoprodeck.com/api-guide/)
- Built with [Next.js](https://nextjs.org/) and [Firebase](https://firebase.google.com/)

---

## License

MIT

---

**Enjoy dueling in the multiverse!**
