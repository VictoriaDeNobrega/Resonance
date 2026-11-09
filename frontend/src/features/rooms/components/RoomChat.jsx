import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';

export default function RoomChat({ messages, onSendMessage, currentUsername }) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
        <MessageSquare size={18} color="var(--accent)" />
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Chat en Vivo</h3>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', margin: 'auto' }}>
            No hay mensajes aún. ¡Saluda a los demás!
          </p>
        ) : (
          messages.map((m, idx) => {
            const isMe = m.senderName === currentUsername;
            if (m.isSystem) {
              return (
                <div key={idx} style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {m.message}
                </div>
              );
            }
            return (
              <div
                key={idx}
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  backgroundColor: isMe ? 'var(--accent)' : 'var(--bg-secondary)',
                  padding: '8px 12px',
                  borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  fontSize: '0.875rem'
                }}
              >
                {!isMe && <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '2px' }}>{m.senderName}</div>}
                <div>{m.message}</div>
                <div style={{ fontSize: '0.65rem', color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>
                  {m.timestamp}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escribe un mensaje..."
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '8px 12px',
            color: 'var(--text-main)',
            fontSize: '0.875rem'
          }}
        />
        <button type="submit" className="btn-primary" style={{ padding: '8px 12px' }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
