/* eslint-disable consistent-return */

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

  // Leave lobby logic (delete lobby if host leaves and no players remain)
  const handleLeave = async (lobby) => {
    const db = firebase.database();
    const lobbiesRef = db.ref('lobbies');
    const lobbyRef = lobbiesRef.child(lobby.firebaseKey);

    // Always treat players as an array of UIDs
    const players = Array.isArray(lobby.players) ? lobby.players : [];
    const newPlayers = players.filter((uid) => uid !== user.uid);
    const newDecks = { ...(lobby.decks || {}) };
    delete newDecks[user.uid];

    // If host leaves
    if (lobby.ownerId === user.uid) {
      if (newPlayers.length === 0) {
        // No players left, remove lobby
        await lobbyRef.remove();
        return;
      } 
        // Assign new owner (first player in the array)
        const newOwnerUid = newPlayers[0];
        await lobbyRef.update({
          players: newPlayers,
          decks: newDecks,
          owner: lobby.userProfiles?.[newOwnerUid]?.displayName || '',
          ownerId: newOwnerUid || '',
        });
        return;
      
    }

    // If not host, just update players and decks
    await lobbyRef.update({
      players: newPlayers,
      decks: newDecks,
    });
  };

  // Join lobby logic (use UID, not displayName)
  const handleJoin = async (lobby) => {
    // Only add user.uid if not already present
    const players = Array.isArray(lobby.players) ? lobby.players : [];
    const updatedPlayers = players.includes(user.uid) ? players : [...players, user.uid];
    const decks = { ...(lobby.decks || {}) };
    if (selectedDeck) {
      decks[user.uid] = selectedDeck;
    }
    await updateLobby(lobby.firebaseKey, { players: updatedPlayers, decks });

    // --- ADD THIS: ensure user is added to players and userProfiles objects for Field page sync ---
    const db = firebase.database();
    const lobbyRef = db.ref(`lobbies/${lobby.firebaseKey}`);

    // Add to players object (for Field page state)
    await lobbyRef.child(`players/${user.uid}`).set({
      deck: [], // Will be initialized in Field page if needed
      hand: [],
      graveyard: [],
      banished: [],
      field: {},
      fieldSpell: null,
    });

    // Add to userProfiles object (for display name/avatar)
    await lobbyRef.child(`userProfiles/${user.uid}`).set({
      displayName: user.displayName,
      photoURL: user.photoURL,
    });
  };

  // Listen for lobby start and redirect both players (fix: only redirect if user is in players array)
  useEffect(() => {
    if (!user) return;
    const db = firebase.database();
    const lobbiesRef = db.ref('lobbies');
    const handleValue = (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      Object.entries(data).forEach(([firebaseKey, lobby]) => {
        const isPlayer = Array.isArray(lobby.players) && lobby.players.includes(user.uid); // CHANGED: use uid
        if (isPlayer && lobby.started) {
          router.push(`/Field?lobby=${firebaseKey}`);
        }
      });
    };
    lobbiesRef.on('value', handleValue);
    return () => lobbiesRef.off('value', handleValue);
  }, [user, router]);

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
          const isPlayer = user && Array.isArray(lobby.players) && lobby.players.includes(user.uid); // CHANGED: use uid
          const hasJoined = isHost || isPlayer;
          const userHasDecks = Array.isArray(userDecks) && userDecks.length > 0;
          const userDeckId = lobby.decks && lobby.decks[user?.uid];

          // Enable Start Duel only if both players are present and both have decks
          const canStartDuel =
            user &&
            isHost &&
            !lobby.started &&
            Array.isArray(lobby.players) &&
            lobby.players.length === 1 && // Only one other player (host + 1)
            lobby.decks &&
            lobby.decks[lobby.ownerId] &&
            lobby.decks &&
            Object.keys(lobby.decks).length === 2 && // Both host and player have decks
            Object.values(lobby.decks).every(Boolean);

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
                {/* Host can start the duel if both players are present and both have selected decks */}
                {canStartDuel && (
                  <Button size="sm" variant="success" className="mt-3" onClick={() => handleStartDuel(lobby)}>
                    Start Duel
                  </Button>
                )}
                {/* Join button logic */}
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
