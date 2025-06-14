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

  // Deck type state
  const [deckType, setDeckType] = useState('yugioh'); // 'yugioh' or 'mtg'
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

  // Load cards from API on mount or deckType change
  useEffect(() => {
    getCards(deckType).then((cards) => {
      setAllCards(cards.filter((card) => (card.game || 'yugioh') === deckType));
    });
    setMainDeck([]);
    setExtraDeck([]);
    setSideDeck([]);
    setDeckName('');
    setSelectedSavedDeck('');
    setFilter('All');
  }, [deckType]);

  // Load decks from database on mount (for this user and public decks for this game)
  useEffect(() => {
    getDecks().then((decks) => {
      const userDecks = decks.filter((deck) => (deck.owner === userId || deck.owner === 'public') && (deck.game || 'yugioh') === deckType);
      setSavedDecks(userDecks);
    });
  }, [userId, deckType]);

  // Save deck handler (create or update)
  const handleSaveDeck = () => {
    if (!deckName.trim()) {
      setSavedMessage('Please enter a deck name.');
      setTimeout(() => setSavedMessage(''), 2000);
      return;
    }
    const deckData = {
      name: deckName,
      owner: userId,
      game: deckType,
      mainDeck: mainDeck.map((card) => card.id),
      savedAt: Date.now(),
    };
    if (deckType === 'yugioh') {
      deckData.extraDeck = extraDeck.map((card) => card.id);
      deckData.sideDeck = sideDeck.map((card) => card.id);
    }
    if (selectedSavedDeck) {
      updateDeck(selectedSavedDeck, deckData).then(() => {
        setSavedMessage('Deck updated!');
        getDecks().then((decks) => {
          const userDecks = decks.filter((deck) => deck.owner === userId && (deck.game || 'yugioh') === deckType);
          setSavedDecks(userDecks);
        });
        setTimeout(() => setSavedMessage(''), 2000);
      });
    } else {
      createDeck(deckData).then(() => {
        setSavedMessage('Deck saved!');
        getDecks().then((decks) => {
          const userDecks = decks.filter((deck) => deck.owner === userId && (deck.game || 'yugioh') === deckType);
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
      // Support both mainDeck (yugioh) and cards (mtg/public)
      if (deckType === 'mtg') {
        const cardIds = deck.mainDeck || deck.cards || [];
        setMainDeck(cardIds.map((id) => allCards.find((card) => card.id === id)).filter(Boolean));
        setExtraDeck([]);
        setSideDeck([]);
      } else if (deckType === 'yugioh') {
        setMainDeck(deck.mainDeck ? deck.mainDeck.map((id) => allCards.find((card) => card.id === id)).filter(Boolean) : []);
        setExtraDeck(deck.extraDeck ? deck.extraDeck.map((id) => allCards.find((card) => card.id === id)).filter(Boolean) : []);
        setSideDeck(deck.sideDeck ? deck.sideDeck.map((id) => allCards.find((card) => card.id === id)).filter(Boolean) : []);
      }
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
        const userDecks = decks.filter((deck) => deck.owner === userId && (deck.game || 'yugioh') === deckType);
        setSavedDecks(userDecks);
      });
      setTimeout(() => setSavedMessage(''), 2000);
    });
  };

  // Only these types can go in Extra Deck (Yu-Gi-Oh!)
  const EXTRA_TYPES = ['Fusion', 'Synchro', 'XYZ', 'Link'];

  // Add card to deck with rules
  const handleAddCard = (card) => {
    if (!deckName.trim()) {
      setSavedMessage('Please enter a deck name before adding cards.');
      setTimeout(() => setSavedMessage(''), 2000);
      return;
    }

    // Count copies in the relevant deck section
    let deckSection = mainDeck;
    if (deckType === 'yugioh') {
      if (selectedDeck === 'Main') deckSection = mainDeck;
      else if (selectedDeck === 'Extra') deckSection = extraDeck;
      else if (selectedDeck === 'Side') deckSection = sideDeck;
    }
    const copies = deckSection.filter((c) => c.id === card.id).length;
    if (copies >= 3) {
      setSavedMessage('You can only have up to 3 copies of the same card in a deck.');
      setTimeout(() => setSavedMessage(''), 2000);
      return;
    }

    if (deckType === 'yugioh') {
      if (selectedDeck === 'Main') {
        if (mainDeck.length >= 60) {
          setSavedMessage('Main Deck cannot exceed 60 cards.');
          setTimeout(() => setSavedMessage(''), 2000);
          return;
        }
        if (!EXTRA_TYPES.includes(card.type)) setMainDeck([...mainDeck, card]);
        else {
          setSavedMessage('This card can only go in the Extra Deck.');
          setTimeout(() => setSavedMessage(''), 2000);
        }
      } else if (selectedDeck === 'Extra') {
        if (extraDeck.length >= 15) {
          setSavedMessage('Extra Deck cannot exceed 15 cards.');
          setTimeout(() => setSavedMessage(''), 2000);
          return;
        }
        if (EXTRA_TYPES.includes(card.type)) setExtraDeck([...extraDeck, card]);
        else {
          setSavedMessage('Only Fusion, Synchro, XYZ, or Link cards allowed in Extra Deck.');
          setTimeout(() => setSavedMessage(''), 2000);
        }
      } else if (selectedDeck === 'Side') {
        if (sideDeck.length >= 15) {
          setSavedMessage('Side Deck cannot exceed 15 cards.');
          setTimeout(() => setSavedMessage(''), 2000);
          return;
        }
        setSideDeck([...sideDeck, card]);
      }
    } else if (deckType === 'mtg') {
      if (mainDeck.length >= 100) {
        setSavedMessage('MTG deck cannot exceed 100 cards.');
        setTimeout(() => setSavedMessage(''), 2000);
        return;
      }
      setMainDeck([...mainDeck, card]);
    }
  };

  // Remove a card from a deck by index
  const handleRemoveCard = (deckTypeToRemove, cardId) => {
    if (deckType === 'yugioh') {
      if (deckTypeToRemove === 'Main') setMainDeck(mainDeck.filter((card) => card.id !== cardId));
      if (deckTypeToRemove === 'Extra') setExtraDeck(extraDeck.filter((card) => card.id !== cardId));
      if (deckTypeToRemove === 'Side') setSideDeck(sideDeck.filter((card) => card.id !== cardId));
    } else if (deckType === 'mtg') {
      setMainDeck(mainDeck.filter((card) => card.id !== cardId));
    }
  };

  // Filter cards based on the selected filter and deckType
  const filteredCards = allCards.filter((card) => {
    if (deckType === 'yugioh') {
      if (filter === 'All') return true;
      return card.type === filter;
    }
    if (deckType === 'mtg') {
      if (filter === 'All') return true;
      if (filter === 'Creature') return card.type?.toLowerCase().includes('creature');
      if (filter === 'Spell') return card.type?.toLowerCase().includes('instant') || card.type?.toLowerCase().includes('sorcery');
      if (filter === 'Artifact') return card.type?.toLowerCase().includes('artifact');
      return true;
    }
    return true;
  });

  // Helper to render card images with click-to-remove, a11y, and optimized images
  const renderCardImages = (deck, deckTypeToRender) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
      {deck.map((card, idx) => (
        <button
          key={`${card.id}-${idx}`}
          type="button"
          onClick={() => handleRemoveCard(deckTypeToRender, card.id)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
          aria-label={`Remove ${card.name} from ${deckTypeToRender}`}
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

  // Deck type dropdown and filter buttons
  const yugiohFilters = (
    <>
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
    </>
  );
  const mtgFilters = (
    <>
      <Button variant={filter === 'Creature' ? 'primary' : 'secondary'} className="me-2" onClick={() => setFilter('Creature')}>
        Creatures
      </Button>
      <Button variant={filter === 'Spell' ? 'primary' : 'secondary'} className="me-2" onClick={() => setFilter('Spell')}>
        Spells
      </Button>
      <Button variant={filter === 'Artifact' ? 'primary' : 'secondary'} className="me-2" onClick={() => setFilter('Artifact')}>
        Artifacts
      </Button>
      <Button variant={filter === 'All' ? 'primary' : 'secondary'} className="ms-2" onClick={() => setFilter('All')}>
        All
      </Button>
    </>
  );

  // Find the selected deck object
  const selectedDeckObj = savedDecks.find((d) => d.firebaseKey === selectedSavedDeck);

  // Determine if the selected deck is public
  const isPublicDeck = selectedDeckObj?.owner === 'public';

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
          {/* Deck Type Dropdown */}
          <Form.Group style={{ marginBottom: 20, width: 120 }}>
            <Form.Label>Deck Type</Form.Label>
            <Form.Select value={deckType} onChange={(e) => setDeckType(e.target.value)} style={{ width: 120 }}>
              <option value="yugioh">Yu-Gi-Oh!</option>
              <option value="mtg">Magic: The Gathering</option>
            </Form.Select>
          </Form.Group>
          {/* Deck Section Buttons */}
          {deckType === 'yugioh' && (
            <>
              <Button variant={selectedDeck === 'Main' ? 'primary' : 'secondary'} className="mb-3" onClick={() => setSelectedDeck('Main')} style={{ width: 100 }}>
                Main Deck
              </Button>
              <Button variant={selectedDeck === 'Extra' ? 'primary' : 'secondary'} className="mb-3" onClick={() => setSelectedDeck('Extra')} style={{ width: 100 }}>
                Extra Deck
              </Button>
              <Button variant={selectedDeck === 'Side' ? 'primary' : 'secondary'} className="mb-3" onClick={() => setSelectedDeck('Side')} style={{ width: 100 }}>
                Side Deck
              </Button>
            </>
          )}
          {deckType === 'mtg' && (
            <Button variant="primary" className="mb-3" style={{ width: 100 }} disabled>
              Main Deck
            </Button>
          )}
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
                const val = e.target.value;
                setSelectedSavedDeck(val);
                if (!val) {
                  setDeckName('');
                  setMainDeck([]);
                  setExtraDeck([]);
                  setSideDeck([]);
                  setSavedMessage('Deck cleared.');
                  setTimeout(() => setSavedMessage(''), 2000);
                } else {
                  handleLoadDeck(val);
                }
              }}
            >
              <option value="">Select a deck</option>
              {savedDecks.map((deck, idx) => (
                <option key={`${deck.firebaseKey}-${idx}`} value={deck.firebaseKey}>
                  {deck.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          {!isPublicDeck && (
            <>
              <Button variant="success" onClick={handleSaveDeck} style={{ marginBottom: 10 }}>
                {selectedSavedDeck ? 'Save Deck' : 'Create Deck'}
              </Button>
              <Button variant="danger" onClick={handleDeleteDeck} style={{ marginBottom: 10, marginLeft: 10 }} disabled={!selectedSavedDeck}>
                Delete Deck
              </Button>
            </>
          )}
          {isPublicDeck && <div style={{ color: '#ff0', marginBottom: 10, textAlign: 'center' }}>This is a public deck. You can view it, but not update or delete it.</div>}
          {savedMessage && <div style={{ color: '#0f0', marginBottom: 10, textAlign: 'center' }}>{savedMessage}</div>}
          <div style={{ width: '100%', marginBottom: 16 }}>
            <strong>Main Deck:</strong> {mainDeck.length} cards {deckType === 'mtg' && <span style={{ color: '#0ff' }}>(Max 100)</span>}
            <div style={{ minHeight: 40, marginBottom: 10, background: '#39365a', borderRadius: 8, padding: 8, display: 'flex', justifyContent: 'center' }}>{renderCardImages(mainDeck, 'Main')}</div>
            {deckType === 'yugioh' && (
              <>
                <strong>Extra Deck:</strong> {extraDeck.length} cards
                <div style={{ minHeight: 40, marginBottom: 10, background: '#39365a', borderRadius: 8, padding: 8, display: 'flex', justifyContent: 'center' }}>{renderCardImages(extraDeck, 'Extra')}</div>
                <strong>Side Deck:</strong> {sideDeck.length} cards
                <div style={{ minHeight: 40, background: '#39365a', borderRadius: 8, padding: 8, display: 'flex', justifyContent: 'center' }}>{renderCardImages(sideDeck, 'Side')}</div>
              </>
            )}
          </div>
          <div style={{ marginTop: 16, color: '#ccc', textAlign: 'center' }}>
            <em>{deckType === 'yugioh' ? 'Select a deck on the left, then add cards from the right.' : 'Magic: The Gathering decks use only a Main Deck (max 100 cards).'}</em>
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
          <div style={{ marginBottom: 16 }}>{deckType === 'yugioh' ? yugiohFilters : mtgFilters}</div>
          <div
            style={{
              background: '#39365a',
              borderRadius: 8,
              padding: 12,
              minHeight: 200,
              maxHeight: 400,
              overflowY: 'auto',
              width: 260,
            }}
          >
            <strong>Available Cards</strong>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {filteredCards.map((card, idx) => (
                <li key={`${card.id}-${idx}`} style={{ marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleAddCard(card)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: 'inherit',
                    }}
                    aria-label={`Add ${card.name} to deck`}
                  >
                    <Image
                      src={card.image}
                      alt={card.name}
                      width={40}
                      height={58}
                      style={{
                        borderRadius: 4,
                        border: '1px solid #888',
                        background: '#222',
                        marginRight: 8,
                      }}
                    />
                    <span>{card.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
