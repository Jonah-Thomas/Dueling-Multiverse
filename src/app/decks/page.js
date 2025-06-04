/* eslint-disable react/no-array-index-key */

'use client';

import { useState, useEffect } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useAuth } from '@/utils/context/authContext';
import getCards from '@/api/cardApi';
import { getDecks, createDeck, deleteDeck, updateDeck } from '@/api/deckApi';
import Image from 'next/image';

export default function DeckBuilder() {
  const { user } = useAuth();
  const userId = user?.uid || user?.email || 'guest';

  const [allCards, setAllCards] = useState([]);
  const [mainDeck, setMainDeck] = useState([]);
  const [extraDeck, setExtraDeck] = useState([]);
  const [sideDeck, setSideDeck] = useState([]);
  const [filter, setFilter] = useState('All');
  const [selectedDeck, setSelectedDeck] = useState('Main');
  const [deckName, setDeckName] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [savedDecks, setSavedDecks] = useState([]);
  const [selectedSavedDeck, setSelectedSavedDeck] = useState('');

  // Load cards from API on mount
  useEffect(() => {
    getCards().then(setAllCards);
  }, []);

  // Load decks from database on mount (for this user only)
  useEffect(() => {
    getDecks().then((decks) => {
      const userDecks = decks.filter((deck) => deck.owner === userId);
      setSavedDecks(userDecks);
    });
  }, [userId]);

  // Save deck handler (create or update)
  const handleSaveDeck = () => {
    if (!deckName.trim()) {
      setSavedMessage('Please enter a deck name.');
      return;
    }
    // Only save card IDs, not full objects
    const deckData = {
      name: deckName,
      owner: userId,
      mainDeck: mainDeck.map((card) => card.id),
      extraDeck: extraDeck.map((card) => card.id),
      sideDeck: sideDeck.map((card) => card.id),
      savedAt: Date.now(),
    };

    if (selectedSavedDeck) {
      updateDeck(selectedSavedDeck, deckData).then(() => {
        setSavedMessage('Deck updated!');
        getDecks().then((decks) => {
          const userDecks = decks.filter((deck) => deck.owner === userId);
          setSavedDecks(userDecks);
        });
        setTimeout(() => setSavedMessage(''), 2000);
      });
    } else {
      createDeck(deckData).then(() => {
        setSavedMessage('Deck saved!');
        getDecks().then((decks) => {
          const userDecks = decks.filter((deck) => deck.owner === userId);
          setSavedDecks(userDecks);
        });
        setTimeout(() => setSavedMessage(''), 2000);
      });
    }
  };

  // Load deck handler
  const handleLoadDeck = (firebaseKey) => {
    if (!firebaseKey) {
      setDeckName('');
      setMainDeck([]);
      setExtraDeck([]);
      setSideDeck([]);
      setSelectedSavedDeck('');
      setSavedMessage('Deck cleared.');
      setTimeout(() => setSavedMessage(''), 2000);
      return;
    }
    const deck = savedDecks.find((d) => d.firebaseKey === firebaseKey);
    if (deck) {
      setDeckName(deck.name);
      setMainDeck(deck.mainDeck ? deck.mainDeck.map((id) => allCards.find((card) => card.id === id)).filter(Boolean) : []);
      setExtraDeck(deck.extraDeck ? deck.extraDeck.map((id) => allCards.find((card) => card.id === id)).filter(Boolean) : []);
      setSideDeck(deck.sideDeck ? deck.sideDeck.map((id) => allCards.find((card) => card.id === id)).filter(Boolean) : []);
      setSelectedSavedDeck(firebaseKey);
      setSavedMessage(`Loaded deck: ${deck.name}`);
      setTimeout(() => setSavedMessage(''), 2000);
    }
  };

  // Delete deck handler
  const handleDeleteDeck = () => {
    if (!selectedSavedDeck) {
      setSavedMessage('No deck selected to delete.');
      setTimeout(() => setSavedMessage(''), 2000);
      return;
    }
    deleteDeck(selectedSavedDeck).then(() => {
      setSavedMessage('Deck deleted.');
      setDeckName('');
      setMainDeck([]);
      setExtraDeck([]);
      setSideDeck([]);
      setSelectedSavedDeck('');
      getDecks().then((decks) => {
        const userDecks = decks.filter((deck) => deck.owner === userId);
        setSavedDecks(userDecks);
      });
      setTimeout(() => setSavedMessage(''), 2000);
    });
  };

  const filteredCards = filter === 'All' ? allCards : allCards.filter((card) => card.type === filter);

  const handleAddCard = (card) => {
    if (selectedDeck === 'Main') setMainDeck([...mainDeck, card]);
    if (selectedDeck === 'Extra') setExtraDeck([...extraDeck, card]);
    if (selectedDeck === 'Side') setSideDeck([...sideDeck, card]);
  };

  // Remove a card from a deck by index
  const handleRemoveCard = (deckType, idx) => {
    if (deckType === 'Main') setMainDeck(mainDeck.filter((_, i) => i !== idx));
    if (deckType === 'Extra') setExtraDeck(extraDeck.filter((_, i) => i !== idx));
    if (deckType === 'Side') setSideDeck(sideDeck.filter((_, i) => i !== idx));
  };

  // Helper to render card images with click-to-remove, a11y, and optimized images
  const renderCardImages = (deck, deckType) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
      {deck.map((card, idx) => (
        <button
          key={`${card.id}-${idx}`}
          type="button"
          onClick={() => handleRemoveCard(deckType, idx)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
          aria-label={`Remove ${card.name} from ${deckType}`}
        >
          <Image
            src={card?.image}
            alt={card?.name}
            title="Click to remove"
            width={48}
            height={70}
            style={{
              borderRadius: 4,
              border: '2px solid #888',
              background: '#222',
              transition: 'border 0.2s',
            }}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: '#232136',
        color: 'white',
        fontFamily: 'sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          maxWidth: 1400,
          minHeight: 700,
        }}
      >
        {/* Left Buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            padding: '30px 10px 0 30px',
            minWidth: 120,
          }}
        >
          <Button variant={selectedDeck === 'Main' ? 'primary' : 'secondary'} className="mb-3" onClick={() => setSelectedDeck('Main')} style={{ width: 100 }}>
            Main Deck
          </Button>
          <Button variant={selectedDeck === 'Extra' ? 'primary' : 'secondary'} className="mb-3" onClick={() => setSelectedDeck('Extra')} style={{ width: 100 }}>
            Extra Deck
          </Button>
          <Button variant={selectedDeck === 'Side' ? 'primary' : 'secondary'} className="mb-3" onClick={() => setSelectedDeck('Side')} style={{ width: 100 }}>
            Side Deck
          </Button>
        </div>

        {/* Center Deck Editor */}
        <div
          style={{
            flex: 1,
            margin: '30px 20px',
            background: '#2a2740',
            borderRadius: 16,
            padding: 24,
            minWidth: 400,
            maxWidth: 700,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <h2 style={{ marginBottom: 20, textAlign: 'center' }}>Deck Editor</h2>
          <Form style={{ marginBottom: 16, width: '100%', maxWidth: 400 }}>
            <Form.Group>
              <Form.Label>Deck Name</Form.Label>
              <Form.Control type="text" value={deckName} onChange={(e) => setDeckName(e.target.value)} placeholder="Enter deck name" />
            </Form.Group>
          </Form>
          <Form.Group style={{ width: '100%', maxWidth: 400, marginBottom: 10 }}>
            <Form.Label>Load Saved Deck</Form.Label>
            <Form.Select
              value={selectedSavedDeck}
              onChange={(e) => {
                setSelectedSavedDeck(e.target.value);
                handleLoadDeck(e.target.value);
              }}
            >
              <option value="">Select a deck</option>
              {savedDecks.map((deck) => (
                <option key={deck.firebaseKey} value={deck.firebaseKey}>
                  {deck.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Button variant="success" onClick={handleSaveDeck} style={{ marginBottom: 10 }}>
            {selectedSavedDeck ? 'Update Deck' : 'Save Deck'}
          </Button>
          <Button variant="danger" onClick={handleDeleteDeck} style={{ marginBottom: 10, marginLeft: 10 }} disabled={!selectedSavedDeck}>
            Delete Deck
          </Button>
          {savedMessage && <div style={{ color: '#0f0', marginBottom: 10, textAlign: 'center' }}>{savedMessage}</div>}
          <div style={{ width: '100%', marginBottom: 16 }}>
            <strong>Main Deck:</strong> {mainDeck.length} cards
            <div style={{ minHeight: 40, marginBottom: 10, background: '#39365a', borderRadius: 8, padding: 8, display: 'flex', justifyContent: 'center' }}>{renderCardImages(mainDeck, 'Main')}</div>
            <strong>Extra Deck:</strong> {extraDeck.length} cards
            <div style={{ minHeight: 40, marginBottom: 10, background: '#39365a', borderRadius: 8, padding: 8, display: 'flex', justifyContent: 'center' }}>{renderCardImages(extraDeck, 'Extra')}</div>
            <strong>Side Deck:</strong> {sideDeck.length} cards
            <div style={{ minHeight: 40, background: '#39365a', borderRadius: 8, padding: 8, display: 'flex', justifyContent: 'center' }}>{renderCardImages(sideDeck, 'Side')}</div>
          </div>
          <div style={{ marginTop: 16, color: '#ccc', textAlign: 'center' }}>
            <em>Select a deck on the left, then add cards from the right.</em>
          </div>
        </div>

        {/* Right Card Filter & Card List */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            padding: '30px 30px 0 10px',
            minWidth: 220,
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <Button variant={filter === 'Monster' ? 'primary' : 'secondary'} className="me-2" onClick={() => setFilter('Monster')}>
              Monsters
            </Button>
            <Button variant={filter === 'Spell' ? 'primary' : 'secondary'} className="me-2" onClick={() => setFilter('Spell')}>
              Spells
            </Button>
            <Button variant={filter === 'Trap' ? 'primary' : 'secondary'} onClick={() => setFilter('Trap')}>
              Traps
            </Button>
            <Button variant={filter === 'All' ? 'primary' : 'secondary'} className="ms-2" onClick={() => setFilter('All')}>
              All
            </Button>
          </div>
          <div
            style={{
              background: '#39365a',
              borderRadius: 8,
              padding: 12,
              minHeight: 200,
              maxHeight: 400,
              overflowY: 'auto',
              width: 180,
            }}
          >
            <strong>Available Cards</strong>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {filteredCards.map((card, idx) => (
                <li key={`${card.id}-${idx}`} style={{ margin: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Image src={card.image} alt={card.name} title={card.name} width={48} height={70} style={{ borderRadius: 4, border: '1px solid #888', background: '#222' }} />
                  <Button size="sm" variant="success" onClick={() => handleAddCard(card)} style={{ marginLeft: 8 }}>
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
