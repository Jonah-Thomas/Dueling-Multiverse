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

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/utils/context/authContext';
import { getLobbies } from '@/api/lobbyApi';
import { getDeckWithCards } from '@/api/deckApi';
import Image from 'next/image';

const cardBack = 'https://imgs.search.brave.com/GspYCJ5HyzqYgDlw8NmGJDzH7rVlpzJR2inx6RZL9SI/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvZW4vdGh1bWIv/Mi8yYi9ZdWdpb2hf/Q2FyZF9CYWNrLmpw/Zy8yNTBweC1ZdWdp/b2hfQ2FyZF9CYWNr/LmpwZw';

const ZONES = [
  { id: 'ex', label: 'Extra Deck' },
  { id: 'f', label: 'Field Card Zone' },
  { id: 'm1', label: 'Monster Card Zone' },
  { id: 'm2', label: 'Monster Card Zone' },
  { id: 'm3', label: 'Monster Card Zone' },
  { id: 'm4', label: 'Monster Card Zone' },
  { id: 'm5', label: 'Monster Card Zone' },
  { id: 'deck', label: 'Deck Zone' },
  { id: 'g', label: 'Graveyard' },
  { id: 'b', label: 'Banished' },
  { id: 's1', label: 'Spell/Trap Card Zone' },
  { id: 's2', label: 'Spell/Trap Card Zone' },
  { id: 's3', label: 'Spell/Trap Card Zone' },
  { id: 's4', label: 'Spell/Trap Card Zone' },
  { id: 's5', label: 'Spell/Trap Card Zone' },
  { id: 'lmL', label: 'Link Monster Zone L' },
  { id: 'lmR', label: 'Link Monster Zone R' },
  { id: 'dp', label: 'DP' },
  { id: 'sp', label: 'SP' },
  { id: 'mp1', label: 'MP1' },
  { id: 'bp', label: 'BP' },
  { id: 'mp2', label: 'MP2' },
  { id: 'ep', label: 'EP' },
];

const zoneGridAreas = [
  [null, 'deck', 's1', 's2', 's3', 's4', 's5', 'ex'],
  ['b', 'g', 'm1', 'm2', 'm3', 'm4', 'm5', 'f'],
  [null, 'dp', 'sp', 'lmL', 'mp1', 'lmR', 'mp2', 'ep'],
  ['f', 'm1', 'm2', 'm3', 'm4', 'm5', 'g', 'b'],
  ['ex', 's1', 's2', 's3', 's4', 's5', 'deck'],
];

const isMonsterZone = (zoneId) => ['m1', 'm2', 'm3', 'm4', 'm5'].includes(zoneId);
const isSpellTrapZone = (zoneId) => ['s1', 's2', 's3', 's4', 's5'].includes(zoneId);
const isMonsterCard = (card) => card?.type?.toLowerCase().includes('monster');
const isSpellCard = (card) => card?.type?.toLowerCase().includes('spell');
const isTrapCard = (card) => card?.type?.toLowerCase().includes('trap');
const isSpellTrapCard = (card) => isSpellCard(card) || isTrapCard(card);

function getZoneStyle(zoneId, isOpponent = false, highlight = false) {
  return {
    width: 80,
    height: 110,
    margin: 5,
    padding: 5,
    border: highlight ? '2px solid #0ff' : '2px dashed #fff4',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: highlight ? '#112233' : 'rgba(0,0,0,0.15)',
    position: 'relative',
    flex: '0 0 auto',
    boxSizing: 'border-box',
    transition: 'border 0.2s, background 0.2s',
  };
}

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

  const [playerFields, setPlayerFields] = useState({ you: {}, opponent: {} });
  const [openFieldAction, setOpenFieldAction] = useState(null);
  const [playerDeck, setPlayerDeck] = useState([]);
  const [yourHand, setYourHand] = useState([]);
  const [graveyard, setGraveyard] = useState([]);
  const [banished, setBanished] = useState([]);
  const [fieldSpellCard, setFieldSpellCard] = useState(null);

  const [selectedHandCard, setSelectedHandCard] = useState(null);
  const [zoneMenu, setZoneMenu] = useState(null); // {zoneId, x, y}
  const [viewingDeck, setViewingDeck] = useState(false);
  const [viewingGraveyard, setViewingGraveyard] = useState(false);
  const [viewingBanished, setViewingBanished] = useState(false);
  const [deckFaceUp, setDeckFaceUp] = useState(false);

  // Feature: highlight monster or spell/trap zones for placement
  const [pendingPlacement, setPendingPlacement] = useState(null);

  // Blue button style for all field card actions
  const blueBtn = {
    background: '#0af',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '4px 10px',
    margin: '2px 0',
    fontWeight: 'bold',
    fontSize: 13,
    cursor: 'pointer',
  };

  // Load and shuffle decks from lobby using deckId
  useEffect(() => {
    if (lobbyKey && user) {
      getLobbies().then((lobbies) => {
        const found = lobbies.find((l) => l.firebaseKey === lobbyKey);
        setLobby(found);
        if (found && found.decks) {
          const yourDeckId = found.decks[user.uid];
          if (yourDeckId) {
            getDeckWithCards(yourDeckId).then((deckArr) => setPlayerDeck(shuffle(deckArr || [])));
          }
        }
      });
    }
  }, [lobbyKey, user]);

  // --- Hand Card Actions ---
  function putCardOnTopOfDeck(card) {
    setYourHand((prev) => prev.filter((c) => c !== card));
    setPlayerDeck((prev) => [card, ...prev]);
    setSelectedHandCard(null);
  }
  function putCardOnBottomOfDeck(card) {
    setYourHand((prev) => prev.filter((c) => c !== card));
    setPlayerDeck((prev) => [...prev, card]);
    setSelectedHandCard(null);
  }
  function sendCardToGrave(card) {
    setYourHand((prev) => prev.filter((c) => c !== card));
    setGraveyard((prev) => [card, ...prev]);
    setSelectedHandCard(null);
  }
  function banishCardFromHand(card) {
    setYourHand((prev) => prev.filter((c) => c !== card));
    setBanished((prev) => [card, ...prev]);
    setSelectedHandCard(null);
  }

  // --- Place Card on Field ---
  function placeCardOnField(card, zoneId, { faceDown = false, defense = false } = {}) {
    setPlayerFields((prev) => ({
      ...prev,
      you: {
        ...prev.you,
        [zoneId]: {
          ...card,
          faceDown,
          defense,
        },
      },
    }));
    setYourHand((prev) => prev.filter((c) => c !== card));
    setSelectedHandCard(null);
    setPendingPlacement(null);
  }

  // --- Add to Hand from Graveyard/Banished ---
  function handleAddToHandFromGrave(idx) {
    setYourHand((prev) => [graveyard[idx], ...prev]);
    setGraveyard((prev) => prev.filter((_, i) => i !== idx));
  }
  function handleAddToHandFromBanished(idx) {
    setYourHand((prev) => [banished[idx], ...prev]);
    setBanished((prev) => prev.filter((_, i) => i !== idx));
  }

  // --- Draw Cards ---
  function drawCards(n = 1) {
    if (playerDeck.length === 0) return;
    setYourHand((prev) => [...prev, ...playerDeck.slice(0, n)]);
    setPlayerDeck((prev) => prev.slice(n));
    setZoneMenu(null);
  }

  // --- Render Hand ---
  function renderHand(hand) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
        {(hand || []).map((card, idx) => {
          const imgSrc = card.cardUrl || card.image || cardBack;
          return (
            <div key={`${card.id || card.name || idx}-${idx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Image
                src={imgSrc}
                alt="card"
                width={72}
                height={104}
                style={{
                  borderRadius: 6,
                  boxShadow: selectedHandCard === card ? '0 0 16px #0ff' : '0 2px 8px #000a',
                  cursor: 'pointer',
                  outline: selectedHandCard === card ? '2px solid #0ff' : 'none',
                  opacity: selectedHandCard === card ? 0.7 : 1,
                }}
                draggable={false}
                tabIndex={0}
                role="button"
                onClick={() => setSelectedHandCard(card)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedHandCard(card);
                }}
              />
              {selectedHandCard === card && (
                <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button style={blueBtn} onClick={() => putCardOnTopOfDeck(card)}>
                    Put on Top of Deck
                  </button>
                  <button style={blueBtn} onClick={() => putCardOnBottomOfDeck(card)}>
                    Put on Bottom of Deck
                  </button>
                  <button style={blueBtn} onClick={() => sendCardToGrave(card)}>
                    Send to Graveyard
                  </button>
                  <button style={blueBtn} onClick={() => banishCardFromHand(card)}>
                    Banish
                  </button>
                  {/* Monster placement: only one button */}
                  {isMonsterCard(card) && (
                    <>
                      <button
                        style={blueBtn}
                        onClick={() => {
                          setPendingPlacement({ ...card, type: 'monster' });
                          setSelectedHandCard(null);
                        }}
                      >
                        Place in Monster Zone
                      </button>
                      <button
                        style={blueBtn}
                        onClick={() => {
                          setPendingPlacement({ ...card, type: 'monster', defense: true });
                          setSelectedHandCard(null);
                        }}
                      >
                        Place in Monster Zone (Defense)
                      </button>
                    </>
                  )}
                  {/* Spell/Trap placement: only one button */}
                  {isSpellTrapCard(card) && (
                    <>
                      <button
                        style={blueBtn}
                        onClick={() => {
                          setPendingPlacement({ ...card, type: 'spelltrap', faceDown: false });
                          setSelectedHandCard(null);
                        }}
                      >
                        Place in Spell/Trap Zone (Face-up)
                      </button>
                      <button
                        style={blueBtn}
                        onClick={() => {
                          setPendingPlacement({ ...card, type: 'spelltrap', faceDown: true });
                          setSelectedHandCard(null);
                        }}
                      >
                        Place in Spell/Trap Zone (Face-down)
                      </button>
                    </>
                  )}
                  {/* Field Spell: only one button */}
                  {isSpellCard(card) && card.type?.toLowerCase().includes('field') && (
                    <button
                      style={blueBtn}
                      onClick={() => {
                        if (!fieldSpellCard) {
                          setFieldSpellCard(card);
                          setYourHand((prev) => prev.filter((c) => c !== card));
                          setSelectedHandCard(null);
                        }
                      }}
                    >
                      Place in Field Spell Zone
                    </button>
                  )}
                  <button style={{ ...blueBtn, background: '#f44', color: '#fff', marginTop: 4 }} onClick={() => setSelectedHandCard(null)}>
                    Exit
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // --- Render Deck/Grave/Banished Menus ---
  function renderZoneMenu() {
    if (!zoneMenu) return null;
    const { zoneId, x, y } = zoneMenu;
    if (zoneId === 'deck') {
      return (
        <div
          style={{
            position: 'fixed',
            left: x,
            top: y,
            background: '#222',
            border: '2px solid #0ff',
            borderRadius: 8,
            zIndex: 1001,
            padding: 12,
          }}
        >
          <button style={blueBtn} onClick={() => drawCards(1)}>
            Draw 1 Card
          </button>
          <button style={blueBtn} onClick={() => drawCards(5)}>
            Draw 5 Cards
          </button>
          <button
            style={blueBtn}
            onClick={() => {
              setViewingDeck(true);
              setZoneMenu(null);
            }}
          >
            View Deck
          </button>
          <button
            style={blueBtn}
            onClick={() => {
              setDeckFaceUp((f) => !f);
              setZoneMenu(null);
            }}
          >
            {deckFaceUp ? 'Show Card Back' : 'Flip Deck Upside Down'}
          </button>
          <button style={{ ...blueBtn, background: '#f44', color: '#fff', marginTop: 4 }} onClick={() => setZoneMenu(null)}>
            Exit
          </button>
        </div>
      );
    }
    if (zoneId === 'g') {
      return (
        <div
          style={{
            position: 'fixed',
            left: x,
            top: y,
            background: '#222',
            border: '2px solid #0ff',
            borderRadius: 8,
            zIndex: 1001,
            padding: 12,
          }}
        >
          <button
            style={blueBtn}
            onClick={() => {
              setViewingGraveyard(true);
              setZoneMenu(null);
            }}
          >
            View Graveyard
          </button>
          <button style={{ ...blueBtn, background: '#f44', color: '#fff', marginTop: 4 }} onClick={() => setZoneMenu(null)}>
            Exit
          </button>
        </div>
      );
    }
    if (zoneId === 'b') {
      return (
        <div
          style={{
            position: 'fixed',
            left: x,
            top: y,
            background: '#222',
            border: '2px solid #0ff',
            borderRadius: 8,
            zIndex: 1001,
            padding: 12,
          }}
        >
          <button
            style={blueBtn}
            onClick={() => {
              setViewingBanished(true);
              setZoneMenu(null);
            }}
          >
            View Banished
          </button>
          <button style={{ ...blueBtn, background: '#f44', color: '#fff', marginTop: 4 }} onClick={() => setZoneMenu(null)}>
            Exit
          </button>
        </div>
      );
    }
    return null;
  }

  // --- Render Deck Modal ---
  function renderDeckView() {
    return (
      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        role="dialog"
        tabIndex={0}
        onClick={() => setViewingDeck(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setViewingDeck(false);
        }}
      >
        <h2 style={{ color: '#fff', marginBottom: 16 }}>Your Deck</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 900 }}>
          {playerDeck.map((card, idx) => (
            <Image key={`${card.id || card.name || idx}-${idx}`} src={card.cardUrl || card.image || cardBack} alt={card.name} title={card.name} width={72} height={104} style={{ borderRadius: 6, boxShadow: '0 2px 8px #000a', background: '#222' }} draggable={false} />
          ))}
        </div>
        <div style={{ color: '#fff', marginTop: 16, fontSize: 14 }}>(Click anywhere or press Escape to close)</div>
      </div>
    );
  }

  // --- Render Graveyard Modal ---
  function renderGraveyardView() {
    return (
      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        role="dialog"
        tabIndex={0}
        onClick={() => setViewingGraveyard(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setViewingGraveyard(false);
        }}
      >
        <h2 style={{ color: '#fff', marginBottom: 16 }}>Your Graveyard</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 900 }}>
          {graveyard.map((card, idx) => (
            <div key={`${card.id || card.name || idx}-${idx}`} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Image src={card.cardUrl || card.image || cardBack} alt={card.name} title={card.name} width={72} height={104} style={{ borderRadius: 6, boxShadow: '0 2px 8px #000a', background: '#222' }} draggable={false} />
              <button
                type="button"
                style={{ ...blueBtn, marginTop: 6, marginBottom: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToHandFromGrave(idx);
                }}
              >
                Add to Hand
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          style={{ ...blueBtn, background: '#f44', color: '#fff', marginTop: 24 }}
          onClick={(e) => {
            e.stopPropagation();
            setViewingGraveyard(false);
          }}
        >
          Exit
        </button>
      </div>
    );
  }

  // --- Render Banished Modal ---
  function renderBanishedView() {
    return (
      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        role="dialog"
        tabIndex={0}
        onClick={() => setViewingBanished(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setViewingBanished(false);
        }}
      >
        <h2 style={{ color: '#fff', marginBottom: 16 }}>Your Banished Zone</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 900 }}>
          {banished.map((card, idx) => (
            <div key={`${card.id || card.name || idx}-${idx}`} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Image src={card.cardUrl || card.image || cardBack} alt={card.name} title={card.name} width={72} height={104} style={{ borderRadius: 6, boxShadow: '0 2px 8px #000a', background: '#222' }} draggable={false} />
              <button
                type="button"
                style={{ ...blueBtn, marginTop: 6, marginBottom: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToHandFromBanished(idx);
                }}
              >
                Add to Hand
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          style={{ ...blueBtn, background: '#f44', color: '#fff', marginTop: 24 }}
          onClick={(e) => {
            e.stopPropagation();
            setViewingBanished(false);
          }}
        >
          Exit
        </button>
      </div>
    );
  }

  // --- Field rendering ---
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
      <div
        style={{
          position: 'relative',
          width: 900,
          height: 650,
          margin: '0 auto',
          background: '#333',
          border: '4px solid #444',
          borderRadius: 18,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 80px)',
            gridTemplateRows: 'repeat(5, 110px)',
            gap: 4,
            justifyContent: 'center',
            alignItems: 'center',
            width: 'auto',
            height: 'auto',
          }}
        >
          {zoneGridAreas.map((row, rowIdx) =>
            row.map((zoneId, colIdx) => {
              if (!zoneId || zoneId === '') return <div key={`empty-${rowIdx}-${colIdx}`} />;
              const zone = ZONES.find((z) => z.id === zoneId) || { id: zoneId, label: zoneId.toUpperCase() };
              let player = null;
              let isOpponent = false;
              if (rowIdx <= 1) {
                player = 'opponent';
                isOpponent = true;
              } else if (rowIdx >= 3) {
                player = 'you';
              }

              // Highlight monster zones for pending placement
              const highlightMonster = pendingPlacement && pendingPlacement.type === 'monster' && isMonsterZone(zoneId) && !playerFields.you[zoneId];
              const highlightMonsterDefense = pendingPlacement && pendingPlacement.type === 'monster' && pendingPlacement.defense && isMonsterZone(zoneId) && !playerFields.you[zoneId];
              const highlightSpellTrap = pendingPlacement && pendingPlacement.type === 'spelltrap' && isSpellTrapZone(zoneId) && !playerFields.you[zoneId];

              if (highlightMonster || highlightMonsterDefense || highlightSpellTrap) {
                return (
                  <div
                    key={`${zoneId}-${rowIdx}-${colIdx}`}
                    style={getZoneStyle(zoneId, isOpponent, true)}
                    onClick={() => {
                      placeCardOnField(pendingPlacement, zoneId, highlightSpellTrap ? { faceDown: pendingPlacement.faceDown } : { defense: !!pendingPlacement.defense });
                      setPendingPlacement(null);
                    }}
                  >
                    <span style={{ color: '#0ff', fontWeight: 'bold' }}>{zone.label}</span>
                  </div>
                );
              }

              // Deck, Graveyard, Banished: show button overlay, not card
              if (zoneId === 'deck' && player === 'you') {
                return (
                  <div
                    key={`${zoneId}-${rowIdx}-${colIdx}`}
                    style={{ ...getZoneStyle(zoneId, isOpponent), cursor: 'pointer', position: 'relative', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                    onClick={(e) => {
                      e.preventDefault();
                      setZoneMenu({ zoneId: 'deck', x: e.clientX, y: e.clientY });
                    }}
                  >
                    {playerDeck.length > 0 ? deckFaceUp ? <Image src={playerDeck[0].cardUrl || playerDeck[0].image || cardBack} alt="Top of Deck" width={60} height={90} style={{ borderRadius: 6, boxShadow: '0 2px 8px #000a', background: '#222' }} draggable={false} /> : <img src={cardBack} alt="Deck" style={{ width: 60, height: 90, borderRadius: 6, boxShadow: '0 2px 8px #000a' }} draggable={false} /> : <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Deck</span>}
                    <span style={{ color: '#fff', fontSize: 12 }}>{playerDeck.length} cards</span>
                  </div>
                );
              }
              if (zoneId === 'g' && player === 'you') {
                const topGrave = graveyard[0];
                return (
                  <div
                    key={`${zoneId}-${rowIdx}-${colIdx}`}
                    style={{ ...getZoneStyle(zoneId, isOpponent), cursor: 'pointer', position: 'relative', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                    onClick={(e) => {
                      e.preventDefault();
                      setZoneMenu({ zoneId: 'g', x: e.clientX, y: e.clientY });
                    }}
                  >
                    {topGrave ? <Image src={topGrave.cardUrl || topGrave.image || cardBack} alt="Top of Graveyard" width={60} height={90} style={{ borderRadius: 6, boxShadow: '0 2px 8px #000a', background: '#222' }} draggable={false} /> : <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Graveyard</span>}
                    <span style={{ color: '#fff', fontSize: 12 }}>{graveyard.length} cards</span>
                  </div>
                );
              }
              if (zoneId === 'b' && player === 'you') {
                const topBanished = banished[0];
                return (
                  <div
                    key={`${zoneId}-${rowIdx}-${colIdx}`}
                    style={{ ...getZoneStyle(zoneId, isOpponent), cursor: 'pointer', position: 'relative', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                    onClick={(e) => {
                      e.preventDefault();
                      setZoneMenu({ zoneId: 'b', x: e.clientX, y: e.clientY });
                    }}
                  >
                    {topBanished ? <Image src={topBanished.cardUrl || topBanished.image || cardBack} alt="Top of Banished" width={60} height={90} style={{ borderRadius: 6, boxShadow: '0 2px 8px #000a', background: '#222' }} draggable={false} /> : <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Banished</span>}
                    <span style={{ color: '#fff', fontSize: 12 }}>{banished.length} cards</span>
                  </div>
                );
              }
              // Field Spell
              if (zoneId === 'f' && player === 'you') {
                // Only highlight if a field spell is selected from hand and can be placed
                const highlightFieldSpell = !fieldSpellCard && selectedHandCard && isSpellCard(selectedHandCard) && selectedHandCard.type?.toLowerCase().includes('field');
                return (
                  <div
                    key={`${zoneId}-${rowIdx}-${colIdx}`}
                    style={{
                      gridColumn: colIdx + 1,
                      gridRow: rowIdx + 1,
                      ...getZoneStyle(zoneId, isOpponent, highlightFieldSpell),
                      cursor: highlightFieldSpell ? 'pointer' : 'default',
                    }}
                    onClick={
                      highlightFieldSpell
                        ? () => {
                            setFieldSpellCard(selectedHandCard);
                            setYourHand((prev) => prev.filter((c) => c !== selectedHandCard));
                            setSelectedHandCard(null);
                          }
                        : undefined
                    }
                  >
                    {fieldSpellCard ? (
                      <Image
                        src={fieldSpellCard.cardUrl || fieldSpellCard.image}
                        alt={fieldSpellCard.name}
                        width={72}
                        height={104}
                        style={{
                          borderRadius: 6,
                          boxShadow: '0 2px 8px #0ff',
                          background: '#222',
                        }}
                        draggable={false}
                      />
                    ) : (
                      <span style={{ color: '#0ff', fontWeight: 'bold', fontSize: 14 }}>
                        Field Spell Zone
                        <br />
                        {highlightFieldSpell ? 'Click to place Field Spell' : ''}
                      </span>
                    )}
                  </div>
                );
              }

              // Default zone rendering (including monsters/spells/traps)
              return (
                <div
                  key={`${zoneId}-${rowIdx}-${colIdx}`}
                  style={{
                    gridColumn: colIdx + 1,
                    gridRow: rowIdx + 1,
                    ...getZoneStyle(zoneId, isOpponent),
                  }}
                >
                  {player && playerFields[player][zoneId] ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <img
                        src={playerFields[player][zoneId].faceDown ? cardBack : playerFields[player][zoneId].cardUrl || playerFields[player][zoneId].image || cardBack}
                        alt="card"
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: 6,
                          padding: 0,
                          boxSizing: 'border-box',
                          objectFit: 'cover',
                          transition: 'transform 0.2s',
                          transform: playerFields[player][zoneId].defense ? 'rotate(90deg)' : 'none',
                        }}
                        draggable={false}
                      />
                      {/* Show "Actions" button only, not actions by default */}
                      {player === 'you' && (
                        <>
                          {!openFieldAction || openFieldAction !== zoneId ? (
                            <button
                              style={{
                                ...blueBtn,
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                zIndex: 11,
                                padding: '2px 8px',
                                fontSize: 16,
                                borderRadius: 16,
                                minWidth: 0,
                              }}
                              onClick={() => setOpenFieldAction(zoneId)}
                            >
                              ⋮
                            </button>
                          ) : null}
                          {/* Action overlay */}
                          {openFieldAction === zoneId && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 4,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                zIndex: 20,
                                pointerEvents: 'auto',
                                gap: 4,
                                background: '#222',
                                border: '2px solid #0af',
                                borderRadius: 8,
                                padding: 8,
                              }}
                            >
                              {/* Face up/down */}
                              {playerFields[player][zoneId].faceDown ? (
                                <button
                                  style={blueBtn}
                                  onClick={() => {
                                    setPlayerFields((prev) => ({
                                      ...prev,
                                      you: {
                                        ...prev.you,
                                        [zoneId]: {
                                          ...prev.you[zoneId],
                                          faceDown: false,
                                        },
                                      },
                                    }));
                                  }}
                                >
                                  Set Face Up
                                </button>
                              ) : (
                                <button
                                  style={blueBtn}
                                  onClick={() => {
                                    setPlayerFields((prev) => ({
                                      ...prev,
                                      you: {
                                        ...prev.you,
                                        [zoneId]: {
                                          ...prev.you[zoneId],
                                          faceDown: true,
                                        },
                                      },
                                    }));
                                  }}
                                >
                                  Set Face Down
                                </button>
                              )}
                              {/* Change position (attack/defense) for monsters */}
                              {isMonsterZone(zoneId) && isMonsterCard(playerFields[player][zoneId]) && (
                                <button
                                  style={blueBtn}
                                  onClick={() => {
                                    setPlayerFields((prev) => ({
                                      ...prev,
                                      you: {
                                        ...prev.you,
                                        [zoneId]: {
                                          ...prev.you[zoneId],
                                          defense: !prev.you[zoneId].defense,
                                        },
                                      },
                                    }));
                                  }}
                                >
                                  {playerFields[player][zoneId].defense ? 'Set Attack Position' : 'Set Defense Position'}
                                </button>
                              )}
                              {/* Send to Graveyard */}
                              <button
                                style={blueBtn}
                                onClick={() => {
                                  setPlayerFields((prev) => ({
                                    ...prev,
                                    you: { ...prev.you, [zoneId]: undefined },
                                  }));
                                  setGraveyard((prev) => [playerFields[player][zoneId], ...prev]);
                                  setOpenFieldAction(null);
                                }}
                              >
                                Send to Graveyard
                              </button>
                              {/* Banish */}
                              <button
                                style={blueBtn}
                                onClick={() => {
                                  setPlayerFields((prev) => ({
                                    ...prev,
                                    you: { ...prev.you, [zoneId]: undefined },
                                  }));
                                  setBanished((prev) => [playerFields[player][zoneId], ...prev]);
                                  setOpenFieldAction(null);
                                }}
                              >
                                Banish
                              </button>
                              {/* Send to Deck */}
                              <button
                                style={blueBtn}
                                onClick={() => {
                                  setPlayerFields((prev) => ({
                                    ...prev,
                                    you: { ...prev.you, [zoneId]: undefined },
                                  }));
                                  setPlayerDeck((prev) => [playerFields[player][zoneId], ...prev]);
                                  setOpenFieldAction(null);
                                }}
                              >
                                Send to Deck
                              </button>
                              {/* Exit */}
                              <button style={{ ...blueBtn, background: '#f44', color: '#fff', marginTop: 4 }} onClick={() => setOpenFieldAction(null)}>
                                Exit
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: '#fff', fontSize: 14 }}>{zone.label}</span>
                  )}
                </div>
              );
            }),
          )}
        </div>
      </div>
      {/* Your hand at the bottom */}
      <div style={{ margin: '32px auto 0', width: 740, textAlign: 'center', minHeight: 120 }}>
        <h3 style={{ marginBottom: 8 }}>Your Hand</h3>
        {renderHand(yourHand)}
      </div>
      {/* Zone menu overlays */}
      {renderZoneMenu()}
      {/* Deck modal */}
      {viewingDeck && renderDeckView()}
      {/* Graveyard modal */}
      {viewingGraveyard && renderGraveyardView()}
      {/* Banished modal */}
      {viewingBanished && renderBanishedView()}
    </div>
  );
}
