import React, { useState } from 'react';
import { SkipForward } from 'lucide-react';

export default function VoteSkipButton({ voteStatus, onVoteSkip }) {
  const [hasVoted, setHasVoted] = useState(false);

  const handleVote = () => {
    if (hasVoted) return;
    onVoteSkip();
    setHasVoted(true);
  };

  const { votesCount = 0, requiredVotes = 1 } = voteStatus || {};
  const progressPercent = Math.min(100, Math.round((votesCount / requiredVotes) * 100));

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px' }}>
      <button
        onClick={handleVote}
        disabled={hasVoted}
        className="btn-secondary"
        style={{
          opacity: hasVoted ? 0.7 : 1,
          borderColor: hasVoted ? 'var(--success)' : 'var(--border)',
          color: hasVoted ? 'var(--success)' : 'var(--text-main)'
        }}
        title="Votar para saltar a la siguiente canción"
      >
        <SkipForward size={16} />
        <span>{hasVoted ? 'Voto Registrado' : 'Votar para Saltar'}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          ({votesCount}/{requiredVotes})
        </span>
      </button>

      <div style={{ height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            backgroundColor: 'var(--accent)',
            transition: 'width 0.3s ease'
          }}
        />
      </div>
    </div>
  );
}
