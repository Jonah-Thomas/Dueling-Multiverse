/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { signOut } from '../utils/auth';

export default function NavBar() {
  return (
    <Navbar collapseOnSelect expand="lg" bg="dark" variant="dark">
      <Container>
        <Link passHref href="/" className="navbar-brand d-flex align-items-center">
          {/* Circular image to the left */}
          <Image
            src="https://i.imgur.com/9MteXcC.png"
            alt="Logo"
            width={40}
            height={40}
            style={{
              borderRadius: '50%',
              objectFit: 'cover',
              marginRight: 12,
              border: '2px solid #fff4',
            }}
            priority
          />
          Dueling Multiverse
        </Link>
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="me-auto" style={{ display: 'flex', alignItems: 'center' }}>
            <Link className="nav-link" href="/">
              Home
            </Link>
            <Link className="nav-link" href="/decks">
              Deck Editor
            </Link>
          </Nav>
          <Button variant="light" onClick={signOut}>
            Sign Out
          </Button>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
