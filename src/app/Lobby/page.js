'use client';

import { useState, useEffect } from 'react';
import { Button, Form, Card } from 'react-bootstrap';
import { getLobbies, createLobby, updateLobby, deleteLobby } from '@/api/lobbyApi';
import { useAuth } from '@/utils/context/authContext';
import firebase from 'firebase/app';
import 'firebase/database';

export default function LobbyPage() {
  const { user } = useAuth();
  const [lobbies, setLobbies] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [maxPlayers, setMaxPlayers] = useState(2);

  // Presence: Set user online in Firebase
  useEffect(() => {
    if (user) {
      const db = firebase.database();
      const onlineRef = db.ref(`onlineUsers/${user.uid}`);
      onlineRef.set(true);
      onlineRef.onDisconnect().set(false);
    }
  }, [user]);

  // Load lobbies
  useEffect(() => {
    getLobbies().then(setLobbies);
  }, []);

  // Create or update lobby
  const handleSubmit = async (e) => {
    e.preventDefault();
    const lobbyData = {
      title,
      description,
      owner: user.displayName,
      ownerId: user.uid,
      players: [user.displayName],
      maxPlayers: Number(maxPlayers),
      createdAt: Date.now(),
    };
    if (editingKey) {
      await updateLobby(editingKey, lobbyData);
    } else {
      await createLobby(lobbyData);
    }
    getLobbies().then(setLobbies);
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
    getLobbies().then(setLobbies);
  };

  // Check if both users are online
  const areBothOnline = async (hostId, clientId) => {
    const db = firebase.database();
    const hostRef = db.ref(`onlineUsers/${hostId}`);
    const clientRef = db.ref(`onlineUsers/${clientId}`);
    const [hostSnap, clientSnap] = await Promise.all([hostRef.once('value'), clientRef.once('value')]);
    return !!hostSnap.val() && !!clientSnap.val();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#341A37', padding: 40 }}>
      <h1 style={{ color: '#fff', textAlign: 'center', marginBottom: 32 }}>Duel Lobbies</h1>
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
        <Button type="submit" variant="success" className="me-2">
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
        {lobbies.map((lobby) => (
          <Card key={lobby.firebaseKey} style={{ width: 320, background: '#222', color: '#fff', borderRadius: 12 }}>
            <Card.Body>
              <div>
                <strong style={{ fontSize: '1.1rem' }}>{lobby.title}</strong>
                <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                  {Array.isArray(lobby.players) ? lobby.players.length : 0} / {lobby.maxPlayers} players
                </div>
              </div>
              <Card.Text>{lobby.description}</Card.Text>
              <Card.Text style={{ fontSize: 12, color: '#aaa' }}>Created by {lobby.owner}</Card.Text>
              {user && lobby.ownerId === user.uid && (
                <>
                  <Button size="sm" variant="primary" className="me-2" onClick={() => handleEdit(lobby)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(lobby.firebaseKey)}>
                    Delete
                  </Button>
                </>
              )}
              {/* Join button logic with presence check */}
              {user && lobby.ownerId !== user.uid && (!Array.isArray(lobby.players) || !lobby.players.includes(user.displayName)) && (Array.isArray(lobby.players) ? lobby.players.length : 0) < lobby.maxPlayers && (
                <Button
                  size="sm"
                  variant="success"
                  onClick={async () => {
                    const bothOnline = await areBothOnline(lobby.ownerId, user.uid);
                    if (!bothOnline) {
                      alert('Both host and client must be online to join this lobby.');
                      return;
                    }
                    const updatedPlayers = Array.isArray(lobby.players) ? [...lobby.players, user.displayName] : [user.displayName];
                    await updateLobby(lobby.firebaseKey, { players: updatedPlayers });
                    getLobbies().then(setLobbies);
                  }}
                >
                  Join
                </Button>
              )}
              {user && lobby.ownerId !== user.uid && Array.isArray(lobby.players) && lobby.players.includes(user.displayName) && (
                <Button size="sm" variant="secondary" disabled>
                  Joined
                </Button>
              )}
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
}
