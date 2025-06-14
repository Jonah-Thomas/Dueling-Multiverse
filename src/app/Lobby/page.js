'use client';

import { useState, useEffect } from 'react';
import { Button, Form, Card } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import { createLobby, updateLobby, deleteLobby } from '@/api/lobbyApi';
import { getUserDecks } from '@/api/deckApi';
import { useAuth } from '@/utils/context/authContext';
import firebase from 'firebase/app';
import 'firebase/database';

export default function LobbyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [lobbies, setLobbies] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [userDecks, setUserDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState('');

  // Presence: Set user online in Firebase
  useEffect(() => {
    if (user) {
      const db = firebase.database();
      const onlineRef = db.ref(`onlineUsers/${user.uid}`);
      onlineRef.set(true);
      onlineRef.onDisconnect().set(false);
    }
  }, [user]);

  // Real-time lobbies
  useEffect(() => {
    const db = firebase.database();
    const lobbiesRef = db.ref('lobbies');
    const handleValue = (snapshot) => {
      const data = snapshot.val();
      const lobbyList = data
        ? Object.entries(data).map(([firebaseKey, value]) => ({
            firebaseKey,
            ...value,
          }))
        : [];
      setLobbies(lobbyList);
    };
    lobbiesRef.on('value', handleValue);
    return () => lobbiesRef.off('value', handleValue);
  }, []);

  // Fetch user decks when user logs in
  useEffect(() => {
    if (user) {
      getUserDecks(user.uid).then((decks) => {
        setUserDecks(Array.isArray(decks) ? decks : []);
        if (Array.isArray(decks) && decks.length > 0) setSelectedDeck(decks[0].firebaseKey);
      });
    }
  }, [user]);

  // Create or update lobby (host NOT in players array)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const lobbyData = {
      title,
      description,
      owner: user.displayName,
      ownerId: user.uid,
      players: [],
      maxPlayers: Number(maxPlayers),
      createdAt: Date.now(),
      started: false,
      decks: { [user.uid]: selectedDeck }, // Host's deck is set here
    };
    if (editingKey) {
      await updateLobby(editingKey, lobbyData);
    } else {
      await createLobby(lobbyData);
    }
    setTitle('');
    setDescription('');
    setMaxPlayers(2);
    setEditingKey(null);
  };

  // Edit lobby
  const handleEdit = (lobby) => {
    setTitle(lobby.title);
    setDescription(lobby.description);
    setMaxPlayers(lobby.maxPlayers);
    setEditingKey(lobby.firebaseKey);
  };

  // Delete lobby
  const handleDelete = async (firebaseKey) => {
    await deleteLobby(firebaseKey);
  };

  // Check if both users are online
  const areBothOnline = async (hostId, clientId) => {
    const db = firebase.database();
    const hostRef = db.ref(`onlineUsers/${hostId}`);
    const clientRef = db.ref(`onlineUsers/${clientId}`);
    const [hostSnap, clientSnap] = await Promise.all([hostRef.once('value'), clientRef.once('value')]);
    return !!hostSnap.val() && !!clientSnap.val();
  };

  // Handle deck selection for a lobby (for after joining, if you want to allow changing)
  const handleDeckSelect = async (lobby, deckId) => {
    const decks = { ...(lobby.decks || {}) };
    decks[user.uid] = deckId;
    await updateLobby(lobby.firebaseKey, { decks });
  };

  // Host starts the duel
  const handleStartDuel = async (lobby) => {
    await updateLobby(lobby.firebaseKey, { started: true });
    router.push(`/Field?lobby=${lobby.firebaseKey}`);
  };

  // Leave lobby logic (no-unused-vars and no-restricted-syntax fixed)
  const handleLeave = async (lobby) => {
    const db = firebase.database();
    const lobbiesRef = db.ref('lobbies');
    const lobbyRef = lobbiesRef.child(lobby.firebaseKey);

    // Remove user from players array and decks
    const newPlayers = (lobby.players || []).filter((name) => name !== user.displayName);
    const newDecks = { ...(lobby.decks || {}) };
    delete newDecks[user.uid];

    // If host leaves, assign new owner if possible
    const updates = { players: newPlayers, decks: newDecks };
    if (lobby.ownerId === user.uid) {
      if (newPlayers.length > 0) {
        // Assign new owner to the first player
        const usersRef = db.ref('users');
        let newOwnerId = null;
        const newOwnerName = newPlayers[0];
        // Use array find instead of for...of
        await usersRef.once('value').then((snap) => {
          const users = snap.val() || {};
          const found = Object.entries(users).find(([, u]) => u.displayName === newOwnerName);
          if (found) {
            const [newId] = found; // Use array destructuring
            newOwnerId = newId;
          }
        });
        updates.owner = newOwnerName;
        updates.ownerId = newOwnerId || '';
      } else {
        // No players left, remove lobby
        await lobbyRef.remove();
        return;
      }
    }
    await lobbyRef.update(updates);
  };

  // Route to field if single player (owner) is present and user joins
  const handleJoin = async (lobby) => {
    const bothOnline = await areBothOnline(lobby.ownerId, user.uid);
    if (!bothOnline) {
      alert('Both host and client must be online to join this lobby.');
      return;
    }
    const updatedPlayers = Array.isArray(lobby.players) ? [...lobby.players, user.displayName] : [user.displayName];
    const decks = { ...(lobby.decks || {}) };
    if (selectedDeck) {
      decks[user.uid] = selectedDeck;
    }
    await updateLobby(lobby.firebaseKey, { players: updatedPlayers, decks });

    // If only one player (owner) is present, route to field
    if (updatedPlayers.length === 1 && lobby.ownerId) {
      router.push(`/Field?lobby=${lobby.firebaseKey}&owner=${lobby.ownerId}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#341A37', padding: 40 }}>
      <h1 style={{ color: '#fff', textAlign: 'center', marginBottom: 32 }}>Duel Lobbies</h1>
      {/* Deck selection BEFORE creating or joining a lobby */}
      {user && Array.isArray(userDecks) && userDecks.length > 0 && (
        <Form.Group className="mb-4" style={{ maxWidth: 400, margin: '0 auto' }}>
          <Form.Label style={{ color: '#fff' }}>Select Your Deck</Form.Label>
          <Form.Select value={selectedDeck} onChange={(e) => setSelectedDeck(e.target.value)}>
            {userDecks.map((deck) => (
              <option key={deck.firebaseKey} value={deck.firebaseKey}>
                {deck.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      )}
      <Form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '0 auto 32px', background: '#2a2740', padding: 24, borderRadius: 12 }}>
        <Form.Group className="mb-3">
          <Form.Label style={{ color: '#fff' }}>Lobby Title</Form.Label>
          <Form.Control value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label style={{ color: '#fff' }}>Description</Form.Label>
          <Form.Control as="textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} required />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label style={{ color: '#fff' }}>Max Players</Form.Label>
          <Form.Control type="number" min={1} max={2} value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} required />
        </Form.Group>
        <Button type="submit" variant="success" className="me-2" disabled={!selectedDeck}>
          {editingKey ? 'Update Lobby' : 'Create Lobby'}
        </Button>
        {editingKey && (
          <Button
            variant="secondary"
            onClick={() => {
              setEditingKey(null);
              setTitle('');
              setDescription('');
              setMaxPlayers(2);
            }}
          >
            Cancel
          </Button>
        )}
      </Form>
      <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center' }}>
        {lobbies.map((lobby) => {
          const isHost = user && lobby.ownerId === user.uid;
          const isPlayer = user && Array.isArray(lobby.players) && lobby.players.includes(user.displayName);
          const hasJoined = isHost || isPlayer;
          const userHasDecks = Array.isArray(userDecks) && userDecks.length > 0;
          const userDeckId = lobby.decks && lobby.decks[user?.uid];

          return (
            <Card key={lobby.firebaseKey} style={{ width: 320, background: '#222', color: '#fff', borderRadius: 12 }}>
              <Card.Body>
                <div>
                  <strong style={{ fontSize: '1.1rem' }}>{lobby.title}</strong>
                  <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                    {(Array.isArray(lobby.players) ? lobby.players.length : 0) + 1} / {lobby.maxPlayers} players
                  </div>
                </div>
                <Card.Text>{lobby.description}</Card.Text>
                <Card.Text style={{ fontSize: 12, color: '#aaa' }}>Created by {lobby.owner}</Card.Text>
                {user && isHost && (
                  <>
                    <Button size="sm" variant="primary" className="me-2" onClick={() => handleEdit(lobby)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(lobby.firebaseKey)}>
                      Delete
                    </Button>
                  </>
                )}
                {/* Deck selection for joined players (optional: allow changing after join) */}
                {user && hasJoined && userHasDecks && (
                  <Form.Group className="mt-3">
                    <Form.Label style={{ color: '#fff' }}>Change Deck</Form.Label>
                    <Form.Select
                      value={userDeckId || selectedDeck}
                      onChange={async (e) => {
                        setSelectedDeck(e.target.value);
                        await handleDeckSelect(lobby, e.target.value);
                      }}
                    >
                      {userDecks.map((deck) => (
                        <option key={deck.firebaseKey} value={deck.firebaseKey}>
                          {deck.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                )}
                {/* Host can start the duel if at least one player joined and all have selected decks */}
                {user && isHost && !lobby.started && (
                  <Button size="sm" variant="success" className="mt-3" onClick={() => handleStartDuel(lobby)} disabled={!lobby.decks || !lobby.decks[lobby.ownerId]}>
                    Start Duel (Solo)
                  </Button>
                )}
                {user && isHost && !lobby.started && Array.isArray(lobby.players) && lobby.players.length > 0 && (
                  <Button
                    size="sm"
                    variant="success"
                    className="mt-3 ms-2"
                    onClick={() => handleStartDuel(lobby)}
                    disabled={
                      !lobby.decks ||
                      !lobby.decks[lobby.ownerId] ||
                      lobby.players.some((playerName) => {
                        // Find the deck for this player by matching displayName to the deck's owner name
                        // If you store player UID instead of displayName, adjust accordingly
                        const playerUid = Object.keys(lobby.decks).find((uid) => {
                          const deckObj = userDecks.find((d) => d.firebaseKey === lobby.decks[uid]);
                          return deckObj && deckObj.ownerName === playerName;
                        });
                        return !playerUid || !lobby.decks[playerUid];
                      })
                    }
                  >
                    Start Duel
                  </Button>
                )}
                {/* Join button logic with presence check */}
                {user && !isHost && !isPlayer && (Array.isArray(lobby.players) ? lobby.players.length : 0) + 1 < lobby.maxPlayers && (
                  <Button size="sm" variant="success" className="mt-3" onClick={() => handleJoin(lobby)} disabled={!selectedDeck}>
                    Join
                  </Button>
                )}
                {user && !isHost && isPlayer && (
                  <Button size="sm" variant="secondary" className="mt-3" disabled>
                    Joined
                  </Button>
                )}
                {lobby.started && <div style={{ marginTop: 10, color: '#0f0', fontWeight: 'bold' }}>Duel Started!</div>}
                {/* Leave button for host or player */}
                {hasJoined && (
                  <Button size="sm" variant="warning" className="mt-3 me-2" onClick={() => handleLeave(lobby)}>
                    Leave Lobby
                  </Button>
                )}
              </Card.Body>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
