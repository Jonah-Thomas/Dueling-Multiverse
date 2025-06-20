/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/no-noninteractive-tabindex */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable react/no-array-index-key */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable no-nested-ternary */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable no-unused-vars */
/* eslint-disable react/button-has-type */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable consistent-return */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/utils/context/authContext';
import { getLobbies } from '@/api/lobbyApi';
import { getDeckWithCards } from '@/api/deckApi';
import Image from 'next/image';

// --- Firebase compat import ---
import firebase from '@/utils/firebase';

const cardBack = 'https://imgs.search.brave.com/GspYCJ5HyzqYgDlw8NmGJDzH7rVlpzJR2inx6RZL9SI/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvZW4vdGh1bWIv/Mi8yYi9ZdWdpb2hf/Q2FyZF9CYWNrLmpw/Zy8yNTBweC1ZdWdp/b2hfQ2FyZF9CYWNr/LmpwZw';

const zoneGridAreas = [
  [null, 'odeck', 'os1', 'os2', 'os3', 'os4', 'os5', 'oex'],
  ['ob', 'og', 'om1', 'om2', 'om3', 'om4', 'om5', 'of'],
  [null, 'dp', 'sp', 'lmL', 'mp1', 'lmR', 'mp2', 'ep'],
  ['f', 'm1', 'm2', 'm3', 'm4', 'm5', 'g', 'b'],
  ['ex', 's1', 's2', 's3', 's4', 's5', 'deck'],
];

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function FieldPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const lobbyKey = searchParams.get('lobby');
  const [lobby, setLobby] = useState(null);

  // --- Multiplayer synced state ---
  const [playerState, setPlayerState] = useState({
    deck: [],
    hand: [],
    graveyard: [],
    banished: [],
    field: {},
    fieldSpell: null,
    displayName: '',
    photoURL: '',
  });
  const [opponentState, setOpponentState] = useState({
    deck: [],
    hand: [],
    graveyard: [],
    banished: [],
    field: {},
    fieldSpell: null,
    displayName: '',
    photoURL: '',
  });
  const [opponentUid, setOpponentUid] = useState(null);
  const [selectedHandCard, setSelectedHandCard] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [pendingPlacement, setPendingPlacement] = useState(null); // { card, idx, type, faceDown, defense, special, tribute }

  // --- Firebase: subscribe to lobby state (with player info) ---
  useEffect(() => {
    if (!lobbyKey || !user) return;
    const lobbyRef = firebase.database().ref(`lobbies/${lobbyKey}`);
    const handleValue = (snapshot) => {
      const data = snapshot.val();
      // --- DEBUG LOGGING ---
      console.log('LOBBY DATA:', data);
      if (!data || !data.players) return;

      // Get all player UIDs
      const playerUids = Object.keys(data.players).filter((uid) => uid !== '0' && uid.length > 10);
      console.log('PLAYER UIDs:', playerUids, 'CURRENT UID:', user.uid);

      // Set your state
      setPlayerState({
        ...data.players[user.uid],
        displayName: user.displayName,
        photoURL: user.photoURL,
      });

      // Find opponent UID (first UID that is not you)
      const oppId = playerUids.find((id) => id !== user.uid);
      console.log('OPPONENT UID:', oppId);

      // Try to get opponent's displayName and photoURL from lobby if available
      let oppDisplayName = '';
      let oppPhotoURL = '';
      if (data && data.userProfiles && oppId) {
        oppDisplayName = data.userProfiles[oppId]?.displayName || '';
        oppPhotoURL = data.userProfiles[oppId]?.photoURL || '';
      }
      console.log('OPPONENT PROFILE:', { oppDisplayName, oppPhotoURL });

      setOpponentUid(oppId || null);
      setOpponentState(
        oppId && data.players[oppId]
          ? {
              ...data.players[oppId],
              displayName: oppDisplayName,
              photoURL: oppPhotoURL,
            }
          : {
              deck: [],
              hand: [],
              graveyard: [],
              banished: [],
              field: {},
              fieldSpell: null,
              displayName: '',
              photoURL: '',
            },
      );

      setLobby(data);
    };
    lobbyRef.on('value', handleValue);
    return () => lobbyRef.off('value', handleValue);
  }, [lobbyKey, user]);

  // --- On first join, store user profile info in lobby for display ---
  useEffect(() => {
    if (!lobbyKey || !user) return;
    const userProfile = { displayName: user.displayName, photoURL: user.photoURL };
    const userProfileRef = firebase.database().ref(`lobbies/${lobbyKey}/userProfiles/${user.uid}`);
    userProfileRef.set(userProfile);
  }, [lobbyKey, user]);

  // --- On first join, if no deck/hand in Firebase, initialize them for ALL players in the lobby ---
  useEffect(() => {
    if (!lobbyKey || !user) return;
    getLobbies().then((lobbies) => {
      const found = lobbies.find((l) => l.firebaseKey === lobbyKey);
      setLobby(found);
      if (found && found.decks) {
        // Initialize state for ALL players in the lobby
        Object.entries(found.decks).forEach(([uid, deckId]) => {
          getDeckWithCards(deckId).then((deckArr) => {
            const playerRef = firebase.database().ref(`lobbies/${lobbyKey}/players/${uid}`);
            playerRef.once('value').then((snap) => {
              if (!snap.exists()) {
                playerRef.set({
                  deck: shuffle(deckArr || []),
                  hand: [],
                  graveyard: [],
                  banished: [],
                  field: {},
                  fieldSpell: null,
                });
              }
            });
          });
        });
      }
    });
  }, [lobbyKey, user]);

  // --- Draw card action (syncs to Firebase) ---
  function drawCard(n = 1) {
    if (!user || !lobbyKey) return;
    if (!playerState.deck || playerState.deck.length === 0) return;
    const newDeck = playerState.deck.slice(n);
    const newHand = [...(playerState.hand || []), ...playerState.deck.slice(0, n)];
    firebase.database().ref(`lobbies/${lobbyKey}/players/${user.uid}`).update({
      deck: newDeck,
      hand: newHand,
    });
    setSelectedHandCard(null);
  }

  // --- Hand Card Actions (all update Firebase) ---
  function removeCardFromHandByIndex(idx) {
    if (typeof idx !== 'number' || idx < 0) return playerState.hand;
    return [...playerState.hand.slice(0, idx), ...playerState.hand.slice(idx + 1)];
  }

  function putCardOnTopOfDeck(card, idx) {
    const newHand = removeCardFromHandByIndex(idx);
    firebase
      .database()
      .ref(`lobbies/${lobbyKey}/players/${user.uid}`)
      .update({
        hand: newHand,
        deck: [card, ...(playerState.deck || [])],
      });
    setSelectedHandCard(null);
  }
  function putCardOnBottomOfDeck(card, idx) {
    const newHand = removeCardFromHandByIndex(idx);
    firebase
      .database()
      .ref(`lobbies/${lobbyKey}/players/${user.uid}`)
      .update({
        hand: newHand,
        deck: [...(playerState.deck || []), card],
      });
    setSelectedHandCard(null);
  }
  function sendCardToGrave(card, idx) {
    const newHand = removeCardFromHandByIndex(idx);
    firebase
      .database()
      .ref(`lobbies/${lobbyKey}/players/${user.uid}`)
      .update({
        hand: newHand,
        graveyard: [card, ...(playerState.graveyard || [])],
      });
    setSelectedHandCard(null);
  }
  function banishCardFromHand(card, idx) {
    const newHand = removeCardFromHandByIndex(idx);
    firebase
      .database()
      .ref(`lobbies/${lobbyKey}/players/${user.uid}`)
      .update({
        hand: newHand,
        banished: [card, ...(playerState.banished || [])],
      });
    setSelectedHandCard(null);
  }

  // --- Place Card on Field (by index) ---
  function placeCardOnField(card, idx, zoneId, { faceDown = false, defense = false, special = false, tribute = false } = {}) {
    // Add debug log at function entry
    console.log('[DEBUG] placeCardOnField called', { card, idx, zoneId, faceDown, defense, special, tribute });

    // Prevent placing if zone is occupied
    if (playerState.field && playerState.field[zoneId]) {
      setPendingPlacement(null);
      setSelectedHandCard(null);
      console.log(`[FIELD] Zone ${zoneId} is already occupied. Cannot place card.`);
      return;
    }
    // Remove the card from hand by index
    const newHand = removeCardFromHandByIndex(idx);
    console.log(`[FIELD] Placing card on field:`, {
      card,
      idx,
      zoneId,
      faceDown,
      defense,
      special,
      tribute,
      handBefore: playerState.hand,
      handAfter: newHand,
    });
    firebase
      .database()
      .ref(`lobbies/${lobbyKey}/players/${user.uid}`)
      .update({
        hand: newHand,
        field: {
          ...(playerState.field || {}),
          [zoneId]: {
            ...card,
            faceDown,
            defense,
            special,
            tribute,
          },
        },
      });
    setSelectedHandCard(null);
    setPendingPlacement(null);
  }

  // --- Helper: Get available zones for placement ---
  function getAvailableZones(card) {
    if (!card) return [];
    const type = (card.type || '').toLowerCase();
    if (type === 'monster') {
      // Monster zones: m1-m5
      return ['m1', 'm2', 'm3', 'm4', 'm5'];
    }
    if (type === 'spell' || type === 'trap') {
      // Spell/Trap zones: s1-s5
      return ['s1', 's2', 's3', 's4', 's5'];
    }
    return [];
  }

  // --- Render player info (name and avatar) ---
  function renderPlayerInfo(displayName, photoURL, label) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 8 }}>
        {photoURL ? (
          <img src={photoURL} alt={displayName} width={48} height={48} style={{ borderRadius: '50%', border: '2px solid #0af', marginBottom: 4 }} />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 24,
              marginBottom: 4,
            }}
          >
            {displayName ? displayName[0].toUpperCase() : '?'}
          </div>
        )}
        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{displayName || label}</span>
      </div>
    );
  }

  // --- Render Opponent's Hand (card backs only, with spacing for buttons if needed) ---
  function renderOpponentHand() {
    return (
      <div style={{ width: 900, margin: '0 auto', marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          {(opponentState.hand || []).map((_, idx) => (
            <div
              key={`opphand-${idx}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 80, // Space for possible future buttons
              }}
            >
              <Image
                src={cardBack}
                alt="Opponent card"
                width={72}
                height={104}
                style={{
                  borderRadius: 6,
                  boxShadow: '0 2px 8px #000a',
                  opacity: 1,
                }}
                draggable={false}
              />
              {/* Placeholder for spacing, or for future opponent hand actions */}
              <div style={{ height: 40 }} />
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', color: '#aaa', fontSize: 13, marginTop: 2 }}>Opponent's Hand ({opponentState.hand ? opponentState.hand.length : 0} cards)</div>
      </div>
    );
  }

  // --- Render Hand (Yu-Gi-Oh! style options for monsters, spells, and traps) ---
  function renderHand(hand) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
        {(hand || []).map((card, idx) => {
          const imgSrc = card.cardUrl || card.image || cardBack;
          const isSelected = selectedHandCard === card;
          const type = (card.type || '').toLowerCase();

          // Helper: Show monster options
          function renderMonsterOptions() {
            return (
              <>
                <button
                  onClick={() => {
                    console.log('[DEBUG] Set pendingPlacement', { card, idx, type: 'monster', faceDown: false, defense: false });
                    setPendingPlacement({ card, idx, type: 'monster', faceDown: false, defense: false });
                  }}
                >
                  Normal Summon (Attack)
                </button>
                <button
                  onClick={() => {
                    console.log('[DEBUG] Set pendingPlacement', { card, idx, type: 'monster', faceDown: true, defense: true });
                    setPendingPlacement({ card, idx, type: 'monster', faceDown: true, defense: true });
                  }}
                >
                  Set (Face Down Defense)
                </button>
                <button
                  onClick={() => {
                    console.log('[DEBUG] Set pendingPlacement', { card, idx, type: 'monster', faceDown: false, defense: false, special: true });
                    setPendingPlacement({ card, idx, type: 'monster', faceDown: false, defense: false, special: true });
                  }}
                >
                  Special Summon (Attack)
                </button>
                <button
                  onClick={() => {
                    console.log('[DEBUG] Set pendingPlacement', { card, idx, type: 'monster', faceDown: false, defense: true, special: true });
                    setPendingPlacement({ card, idx, type: 'monster', faceDown: false, defense: true, special: true });
                  }}
                >
                  Special Summon (Defense)
                </button>
                <button
                  onClick={() => {
                    console.log('[DEBUG] Set pendingPlacement', { card, idx, type: 'monster', faceDown: false, defense: false, tribute: true });
                    setPendingPlacement({ card, idx, type: 'monster', faceDown: false, defense: false, tribute: true });
                  }}
                >
                  Tribute Summon (Attack)
                </button>
                <button
                  onClick={() => {
                    console.log('[DEBUG] Set pendingPlacement', { card, idx, type: 'monster', faceDown: true, defense: true, tribute: true });
                    setPendingPlacement({ card, idx, type: 'monster', faceDown: true, defense: true, tribute: true });
                  }}
                >
                  Tribute Set (Face Down Defense)
                </button>
              </>
            );
          }

          // Helper: Show spell/trap options
          function renderSpellTrapOptions() {
            return (
              <>
                <button
                  onClick={() => {
                    console.log('[DEBUG] Set pendingPlacement', { card, idx, type, faceDown: false });
                    setPendingPlacement({ card, idx, type, faceDown: false });
                  }}
                >
                  Activate (Face Up)
                </button>
                <button
                  onClick={() => {
                    console.log('[DEBUG] Set pendingPlacement', { card, idx, type, faceDown: true });
                    setPendingPlacement({ card, idx, type, faceDown: true });
                  }}
                >
                  Set (Face Down)
                </button>
              </>
            );
          }

          return (
            <div key={`${card.id || card.name || idx}-${idx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
              <Image
                src={imgSrc}
                alt="card"
                width={72}
                height={104}
                style={{
                  borderRadius: 6,
                  boxShadow: isSelected ? '0 0 16px #0ff' : '0 2px 8px #000a',
                  cursor: 'pointer',
                  outline: isSelected ? '2px solid #0ff' : 'none',
                  opacity: isSelected ? 0.7 : 1,
                }}
                draggable={false}
                tabIndex={0}
                role="button"
                onClick={() => setSelectedHandCard(isSelected ? null : card)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedHandCard(card);
                }}
              />
              {/* Yu-Gi-Oh! style action buttons for the selected card */}
              {isSelected && !pendingPlacement && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {type === 'monster' ? renderMonsterOptions() : type === 'spell' || type === 'trap' ? renderSpellTrapOptions() : <span style={{ color: '#aaa', fontSize: 12 }}>Unknown card type</span>}
                  <button style={{ marginTop: 8 }} onClick={() => setSelectedHandCard(null)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // --- Deck zone rendering (for both players) ---
  function renderDeckZone(isOpponent = false) {
    const deck = isOpponent ? opponentState.deck : playerState.deck;
    return (
      <div
        style={{
          minWidth: 48,
          minHeight: 70,
          background: '#222',
          border: '1px solid #444',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <img
          src={cardBack}
          alt={isOpponent ? 'Opponent Deck' : 'Deck'}
          width={60}
          height={90}
          style={{
            borderRadius: 6,
            boxShadow: '0 2px 8px #000a',
            opacity: isOpponent ? 0.7 : 1,
          }}
          draggable={false}
        />
        <span style={{ color: '#fff', fontSize: 12 }}>{deck ? deck.length : 0} cards</span>
        {!isOpponent && (
          <button style={{ marginTop: 4 }} onClick={() => drawCard(1)}>
            Draw
          </button>
        )}
      </div>
    );
  }

  // --- Graveyard zone rendering (for both players) ---
  function renderGraveyardZone(isOpponent = false) {
    const gy = isOpponent ? opponentState.graveyard || [] : playerState.graveyard || [];
    const top = gy[0];
    return (
      <div
        style={{
          background: '#222',
          borderRadius: 6,
          minHeight: 70,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {top ? <Image src={top.cardUrl || top.image || cardBack} alt="GY" width={60} height={90} /> : <span style={{ color: '#fff' }}>Graveyard</span>}
        <span style={{ color: '#fff', fontSize: 12 }}>{gy.length} cards</span>
        {!isOpponent && (
          <button style={{ marginTop: 4 }} onClick={() => alert('Show graveyard modal')}>
            View
          </button>
        )}
      </div>
    );
  }

  // --- Banished zone rendering (for both players) ---
  function renderBanishedZone(isOpponent = false) {
    const ban = isOpponent ? opponentState.banished || [] : playerState.banished || [];
    const top = ban[0];
    return (
      <div
        style={{
          background: '#222',
          borderRadius: 6,
          minHeight: 70,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {top ? <Image src={top.cardUrl || top.image || cardBack} alt="Banished" width={60} height={90} /> : <span style={{ color: '#fff' }}>Banished</span>}
        <span style={{ color: '#fff', fontSize: 12 }}>{ban.length} cards</span>
        {!isOpponent && (
          <button style={{ marginTop: 4 }} onClick={() => alert('Show banished modal')}>
            View
          </button>
        )}
      </div>
    );
  }

  // --- Field rendering (with zone highlighting and placement) ---
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#222',
        color: '#fff',
        padding: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Opponent's info and hand above the field */}
      <div style={{ width: 900, margin: '0 auto', marginTop: 16, marginBottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {renderPlayerInfo(opponentState.displayName, opponentState.photoURL, 'Opponent')}
        {renderOpponentHand()}
      </div>

      {/* Field grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${zoneGridAreas.length}, 1fr)`,
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 4,
          width: 900,
          margin: '0 auto',
          background: '#191919',
          borderRadius: 12,
          padding: 12,
        }}
      >
        {zoneGridAreas.flat().map((zoneId, idx) => {
          if (!zoneId) return <div key={idx} />;
          // Deck, graveyard, banished, etc. (unchanged)
          if (zoneId === 'deck') return <div key={zoneId}>{renderDeckZone(false)}</div>;
          if (zoneId === 'odeck') return <div key={zoneId}>{renderDeckZone(true)}</div>;
          if (zoneId === 'g') return <div key={zoneId}>{renderGraveyardZone(false)}</div>;
          if (zoneId === 'og') return <div key={zoneId}>{renderGraveyardZone(true)}</div>;
          if (zoneId === 'b') return <div key={zoneId}>{renderBanishedZone(false)}</div>;
          if (zoneId === 'ob') return <div key={zoneId}>{renderBanishedZone(true)}</div>;
          if (zoneId === 'f') {
            const {fieldSpell} = playerState;
            return (
              <div key={zoneId} style={{ background: '#222', borderRadius: 6, minHeight: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {fieldSpell ? <Image src={fieldSpell.cardUrl || fieldSpell.image || cardBack} alt="Field Spell" width={60} height={90} /> : <span style={{ color: '#0ff' }}>Field Spell</span>}
              </div>
            );
          }
          if (zoneId === 'of') {
            const {fieldSpell} = opponentState;
            return (
              <div key={zoneId} style={{ background: '#222', borderRadius: 6, minHeight: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {fieldSpell ? <Image src={fieldSpell.cardUrl || fieldSpell.image || cardBack} alt="Field Spell" width={60} height={90} /> : <span style={{ color: '#0ff' }}>Field Spell</span>}
              </div>
            );
          }

          // --- Monster/Spell/Trap zones with highlight and placement ---
          if (zoneId.startsWith('o')) {
            // Opponent's zones: always use opponentState.field[cleanZoneId]
            const cleanZoneId = zoneId.slice(1);
            const card = opponentState.field ? opponentState.field[cleanZoneId] : null;
            return (
              <div key={zoneId} style={{ background: '#222', borderRadius: 6, minHeight: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {card ? (
                  <img
                    src={card.faceDown ? cardBack : card.cardUrl || card.image || cardBack}
                    alt="card"
                    style={{
                      width: 60,
                      height: 90,
                      borderRadius: 6,
                      objectFit: 'cover',
                      transform: card.defense ? 'rotate(90deg)' : 'none',
                    }}
                    draggable={false}
                  />
                ) : (
                  <span style={{ color: '#fff', fontSize: 14 }}>{cleanZoneId.toUpperCase()}</span>
                )}
              </div>
            );
          } 
            // Your zones: highlight if available for placement
            const card = playerState.field ? playerState.field[zoneId] : null;
            let highlight = false;
            if (pendingPlacement && !card) {
              const available = getAvailableZones(pendingPlacement.card);
              highlight = available.includes(zoneId);
            }
            return (
              <div
                key={zoneId}
                style={{
                  background: highlight ? '#0ff4' : '#222',
                  borderRadius: 6,
                  minHeight: 70,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  border: highlight ? '2px solid #0ff' : undefined,
                  cursor: highlight ? 'pointer' : undefined,
                  transition: 'background 0.2s, border 0.2s',
                }}
                onClick={() => {
                  if (highlight && pendingPlacement) {
                    console.log('[DEBUG] Zone clicked for placement', { zoneId, pendingPlacement });
                    placeCardOnField(pendingPlacement.card, pendingPlacement.idx, zoneId, {
                      faceDown: pendingPlacement.faceDown,
                      defense: pendingPlacement.defense,
                      special: pendingPlacement.special,
                      tribute: pendingPlacement.tribute,
                    });
                    setPendingPlacement(null);
                    setSelectedHandCard(null);
                  }
                }}
              >
                {card ? (
                  <>
                    <img
                      src={card.faceDown ? cardBack : card.cardUrl || card.image || cardBack}
                      alt="card"
                      style={{
                        width: 60,
                        height: 90,
                        borderRadius: 6,
                        objectFit: 'cover',
                        transform: card.defense ? 'rotate(90deg)' : 'none',
                      }}
                      draggable={false}
                    />
                    {/* Field card action buttons */}
                    <button style={{ marginTop: 4 }} onClick={() => sendCardToGrave(card)}>
                      Send to Graveyard
                    </button>
                    <button style={{ marginTop: 4 }} onClick={() => banishCardFromHand(card)}>
                      Banish
                    </button>
                  </>
                ) : (
                  <span style={{ color: '#fff', fontSize: 14 }}>{zoneId.toUpperCase()}</span>
                )}
              </div>
            );
          
        })}
      </div>

      {/* Your info and hand at the bottom */}
      <div style={{ margin: '32px auto 0', width: 740, textAlign: 'center', minHeight: 120 }}>
        {renderPlayerInfo(playerState.displayName, playerState.photoURL, 'You')}
        <h3 style={{ marginBottom: 8 }}>Your Hand</h3>
        {renderHand(playerState.hand)}
      </div>
      {/* Cancel placement overlay */}
      {pendingPlacement && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.15)',
              pointerEvents: 'auto',
            }}
            onClick={() => {
              setPendingPlacement(null);
              setSelectedHandCard(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
