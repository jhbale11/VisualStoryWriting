import { Card, CardBody, Chip } from '@nextui-org/react';
import { GlossaryArc, GlossaryCharacter } from '../../model/GlossaryModel';

interface Props {
  arc: GlossaryArc;
  characters: GlossaryCharacter[];
}

export default function ArcRelationshipView({ arc, characters }: Props) {
  if (!arc || arc.relationships.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#999',
        background: 'white',
        borderRadius: '12px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
        <div>No relationships in this arc</div>
      </div>
    );
  }

  // Group relationships by sentiment
  const positive = arc.relationships.filter(r => r.sentiment === 'positive');
  const negative = arc.relationships.filter(r => r.sentiment === 'negative');
  const neutral = arc.relationships.filter(r => r.sentiment === 'neutral');

  const getCharacterEmoji = (name: string) => {
    const char = characters.find(c => 
      c.name.toLowerCase() === name.toLowerCase() ||
      c.korean_name?.toLowerCase() === name.toLowerCase()
    );
    return char?.emoji || '👤';
  };

  const RelationshipCard = ({ rel, color }: { rel: typeof arc.relationships[0], color: string }) => (
    <Card style={{ 
      background: `${color}11`, 
      borderLeft: `3px solid ${color}`,
      transition: 'all 0.2s'
    }}>
      <CardBody>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '28px' }}>{getCharacterEmoji(rel.character_a)}</span>
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{rel.character_a}</span>
          </div>
          <div style={{ 
            fontSize: '20px',
            color: color
          }}>
            {rel.sentiment === 'positive' ? '↔' : rel.sentiment === 'negative' ? '⚔️' : '—'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '28px' }}>{getCharacterEmoji(rel.character_b)}</span>
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{rel.character_b}</span>
          </div>
          <Chip size="sm" variant="flat" style={{ marginLeft: 'auto' }}>
            {rel.relationship_type}
          </Chip>
        </div>
        <div style={{ fontSize: '13px', color: '#666', paddingLeft: '44px' }}>
          {rel.description}
        </div>
      </CardBody>
    </Card>
  );

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '20px',
      padding: '20px',
      background: '#f9fafb',
      borderRadius: '12px'
    }}>
      {/* Header */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
          Relationships in {arc.name}
        </h3>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
          <div>
            <span style={{ color: '#10b981' }}>●</span> Positive: {positive.length}
          </div>
          <div>
            <span style={{ color: '#ef4444' }}>●</span> Negative: {negative.length}
          </div>
          <div>
            <span style={{ color: '#6b7280' }}>●</span> Neutral: {neutral.length}
          </div>
        </div>
      </div>

      {/* Positive Relationships */}
      {positive.length > 0 && (
        <div>
          <div style={{ 
            fontSize: '13px', 
            fontWeight: 'bold', 
            color: '#10b981',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>💚</span> Positive Relationships
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {positive.map((rel, idx) => (
              <RelationshipCard key={idx} rel={rel} color="#10b981" />
            ))}
          </div>
        </div>
      )}

      {/* Negative Relationships */}
      {negative.length > 0 && (
        <div>
          <div style={{ 
            fontSize: '13px', 
            fontWeight: 'bold', 
            color: '#ef4444',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚔️</span> Negative Relationships
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {negative.map((rel, idx) => (
              <RelationshipCard key={idx} rel={rel} color="#ef4444" />
            ))}
          </div>
        </div>
      )}

      {/* Neutral Relationships */}
      {neutral.length > 0 && (
        <div>
          <div style={{ 
            fontSize: '13px', 
            fontWeight: 'bold', 
            color: '#6b7280',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>🤝</span> Neutral Relationships
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {neutral.map((rel, idx) => (
              <RelationshipCard key={idx} rel={rel} color="#6b7280" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

