import React from 'react';
import { Button } from 'react-bootstrap';
import Image from 'next/image';
import { signIn } from '../utils/auth';

function Signin() {
  return (
    <div
      className="text-center d-flex flex-column justify-content-center align-content-center"
      style={{
        height: '90vh',
        padding: '30px',
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: '#341A37',
      }}
    >
      <Image src="https://i.imgur.com/9MteXcC.png" alt="Dueling Logo" className="mb-4" width={480} height={350} style={{ paddingLeft: '120px' }} priority />
      <h1>Welcome to a new Multiverse!</h1>
      <p> Click the button below to Enter a New Dueling Experience!</p>
      <Button type="button" size="lg" className="copy-btn" onClick={signIn} style={{ marginLeft: '30px' }}>
        Duel!
      </Button>
    </div>
  );
}

export default Signin;
