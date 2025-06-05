/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/jsx-key */
/* eslint-disable no-unused-vars */

'use client';

import { useState, useEffect } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useAuth } from '@/utils/context/authContext';
import Image from 'next/image';
import { getPosts, createPost, deletePost } from '@/api/postApi';

function Home() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);

  // Load posts from API on mount
  useEffect(() => {
    getPosts().then((data) => {
      setMessages(data.sort((a, b) => a.timestamp - b.timestamp));
      setLoading(false);
    });
  }, []);

  // Remove messages older than 30 minutes every minute (optional, for UI only)
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages((msgs) => msgs.filter((msg) => Date.now() - msg.timestamp < 30 * 60 * 1000));
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Post a new message
  const handlePost = async (e) => {
    e.preventDefault();
    if (message.trim() !== '') {
      const newPost = {
        user: user.displayName,
        text: message,
        timestamp: Date.now(),
        photoURL: user.photoURL,
        replies: [],
      };
      await createPost(newPost);
      getPosts().then((data) => setMessages(data.sort((a, b) => a.timestamp - b.timestamp)));
      setMessage('');
    }
  };

  // Post a reply to a message
  const handleReply = async (msgIdx) => {
    if (replyText.trim() === '') return;
    const msg = messages[msgIdx];
    const updatedReplies = [
      ...(msg.replies || []),
      {
        user: user.displayName,
        text: replyText,
        timestamp: Date.now(),
        photoURL: user.photoURL,
      },
    ];
    // Update the post with the new replies array
    const updatedPost = { ...msg, replies: updatedReplies };
    // Remove firebaseKey before sending to API (if you want to PATCH, you may need to implement updatePost in your API)
    const { firebaseKey, ...postData } = updatedPost;
    await fetch(`${process.env.NEXT_PUBLIC_DATABASE_URL}/posts/${msg.firebaseKey}.json`, {
      method: 'PATCH',
      body: JSON.stringify({ replies: updatedReplies }),
      headers: { 'Content-Type': 'application/json' },
    });
    getPosts().then((data) => setMessages(data.sort((a, b) => a.timestamp - b.timestamp)));
    setReplyText('');
    setReplyingTo(null);
  };

  // Delete a post
  const handleDelete = async (firebaseKey) => {
    await deletePost(firebaseKey);
    getPosts().then((data) => setMessages(data.sort((a, b) => a.timestamp - b.timestamp)));
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#341A37',
      }}
    >
      <div
        className="text-center d-flex flex-column justify-content-center align-content-center"
        style={{
          flex: 1,
          padding: '30px',
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        <h1
          style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            marginBottom: '30px',
            width: '400px',
            height: '100px',
            lineHeight: '100px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '20px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Duelist Posts
        </h1>

        {/* Only show the post form if logged in */}
        {user ? (
          <Form onSubmit={handlePost} className="mb-3">
            <Form.Group controlId="messageInput">
              <Form.Control as="textarea" rows={2} placeholder="Type your message..." value={message} onChange={(e) => setMessage(e.target.value)} />
            </Form.Group>
            <Button variant="primary" type="submit" className="mt-2">
              Post Message
            </Button>
          </Form>
        ) : (
          <div style={{ color: '#fff', marginBottom: 20 }}>Please sign in to post a message.</div>
        )}

        {/* Always show the messages, even if logged out */}
        <div
          style={{
            maxHeight: '400px',
            minHeight: '400px',
            width: '400px',
            overflowY: 'auto',
            marginBottom: '40px',
            marginLeft: 'auto',
            marginRight: 'auto',
            background: 'rgba(0,0,0,0.15)',
            borderRadius: '15px',
            padding: '10px',
          }}
        >
          {loading ? (
            <div style={{ color: '#fff', textAlign: 'center' }}>Loading...</div>
          ) : (
            messages.map((msg, msgIdx) => (
              <div
                key={msg.firebaseKey}
                style={{
                  background: '#fff2',
                  color: 'white',
                  margin: '5px 0',
                  padding: '8px',
                  borderRadius: '5px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {msg.photoURL && (
                      <Image
                        src={msg.photoURL}
                        alt="profile"
                        width={32}
                        height={32}
                        style={{
                          borderRadius: '50%',
                          objectFit: 'cover',
                          marginRight: 8,
                          border: '2px solid #fff4',
                        }}
                      />
                    )}
                    <strong>{msg.user}:</strong>&nbsp;{msg.text}
                  </span>
                  <span style={{ fontSize: '0.85em', color: '#ccc', marginLeft: '15px', whiteSpace: 'nowrap' }}>{formatTime(msg.timestamp)}</span>
                  {/* Only show delete if logged in and user matches */}
                  {user && msg.user === user.displayName && (
                    <Button size="sm" variant="danger" style={{ marginLeft: 8 }} onClick={() => handleDelete(msg.firebaseKey)}>
                      Delete
                    </Button>
                  )}
                </div>
                <div style={{ marginTop: 6 }}>
                  {user && (
                    <Button size="sm" variant="secondary" onClick={() => setReplyingTo(msgIdx)} style={{ marginRight: 8 }}>
                      Reply
                    </Button>
                  )}
                </div>
                {/* Replies */}
                {msg.replies && msg.replies.length > 0 && (
                  <div style={{ marginTop: 8, marginLeft: 40 }}>
                    {msg.replies.map((reply) => (
                      <div
                        key={`${reply.timestamp}-${reply.user}`}
                        style={{
                          background: '#2228',
                          color: 'white',
                          margin: '4px 0',
                          padding: '6px',
                          borderRadius: '5px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center' }}>
                          {reply.photoURL && (
                            <Image
                              src={reply.photoURL}
                              alt="profile"
                              width={24}
                              height={24}
                              style={{
                                borderRadius: '50%',
                                objectFit: 'cover',
                                marginRight: 6,
                                border: '1px solid #fff4',
                              }}
                            />
                          )}
                          <strong>{reply.user}:</strong>&nbsp;{reply.text}
                        </span>
                        <span style={{ fontSize: '0.75em', color: '#ccc', marginLeft: '10px', whiteSpace: 'nowrap' }}>{formatTime(reply.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Reply input */}
                {replyingTo === msgIdx && (
                  <Form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleReply(msgIdx);
                    }}
                    style={{ marginTop: 8, marginLeft: 40 }}
                  >
                    <Form.Group controlId={`replyInput${msg.timestamp}`}>
                      <Form.Control as="textarea" rows={1} placeholder="Type your reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                    </Form.Group>
                    <Button variant="primary" type="submit" size="sm" className="mt-1">
                      Post Reply
                    </Button>
                    <Button
                      variant="light"
                      size="sm"
                      className="mt-1 ms-2"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText('');
                      }}
                    >
                      Cancel
                    </Button>
                  </Form>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      <footer style={{ backgroundColor: 'black', color: 'white', textAlign: 'center', width: '100%', padding: '10px 0' }}>All rights Reserved</footer>
    </div>
  );
}

export default Home;
