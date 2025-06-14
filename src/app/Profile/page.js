'use client';

import { useAuth } from '@/utils/context/authContext';
import { Card, Button } from 'react-bootstrap';

export default function ProfilePage() {
  const { user, signOut } = useAuth();

  if (!user) {
    return <div style={{ color: '#fff', textAlign: 'center', marginTop: 60 }}>Please sign in to view your profile.</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#341A37', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Card style={{ width: 350, background: '#222', color: '#fff', borderRadius: 16, padding: 24 }}>
        <Card.Body className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.photoURL || 'https://via.placeholder.com/100'}
            alt="Profile"
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              objectFit: 'cover',
              marginBottom: 16,
              border: '3px solid #fff4',
            }}
          />
          <Card.Title style={{ fontSize: '1.5rem', marginBottom: 8 }}>{user.displayName || 'No Name'}</Card.Title>
          <Card.Text style={{ color: '#aaa', marginBottom: 16 }}>{user.email}</Card.Text>
          <Button variant="danger" onClick={signOut}>
            Sign Out
          </Button>
        </Card.Body>
      </Card>
    </div>
  );
}
