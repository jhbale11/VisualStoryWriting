import { Card, CardBody, Chip, Tooltip } from '@nextui-org/react';
import { GlossaryArc, GlossaryCharacter } from '../../model/GlossaryModel';

interface Props {
  arcs: GlossaryArc[];
  characters: GlossaryCharacter[];
  onCharacterSelect?: (characterId: string) => void;
  onArcSelect?: (arcId: string) => void;
}

export default function CharacterArcMatrix({
  arcs,
  characters,
  onCharacterSelect,
  onArcSelect,
}: Props) {
  if (arcs.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '40px',
        textAlign: 'center',
        color: '#999'
      }}>
        <div>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📖</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>No Arcs Found</div>
          <div style={{ fontSize: '13px' }}>
            Arcs will be automatically extracted when you process text.
          </div>
        </div>
      </div>
    );
  }

  // Check which characters appear in which arcs and count appearances
  const characterArcData: Record<string, {
    arcs: Set<string>;
    arcDetails: Record<string, {
      roleInArc?: string;
      firstAppearance?: boolean;
      relationshipCount: number;
    }>;
    totalAppearances: number;
  }> = {};

  characters.forEach(char => {
    characterArcData[char.id] = {
      arcs: new Set(),
      arcDetails: {},
      totalAppearances: 0,
    };

    arcs.forEach(arc => {
      const appearsInArc = arc.characters.some(arcChar => {
        const charName = typeof arcChar === 'string' ? arcChar : arcChar.name;
        return charName.toLowerCase() === char.name.toLowerCase() ||
               charName.toLowerCase() === char.korean_name?.toLowerCase();
      });

      if (appearsInArc) {
        characterArcData[char.id].arcs.add(arc.id);
        characterArcData[char.id].totalAppearances++;

        // Get role in arc
        const arcCharData = arc.characters.find(arcChar => {
          const charName = typeof arcChar === 'string' ? arcChar : arcChar.name;
          return charName.toLowerCase() === char.name.toLowerCase() ||
                 charName.toLowerCase() === char.korean_name?.toLowerCase();
        });

        const roleInArc = typeof arcCharData === 'string' ? undefined : arcCharData?.role_in_arc;
        const firstAppearance = typeof arcCharData === 'string' ? false : arcCharData?.first_appearance;

        // Count relationships in this arc for this character
        const relationshipCount = (arc.relationships || []).filter(rel =>
          rel.character_a.toLowerCase() === char.name.toLowerCase() ||
          rel.character_b.toLowerCase() === char.name.toLowerCase()
        ).length;

        characterArcData[char.id].arcDetails[arc.id] = {
          roleInArc,
          firstAppearance,
          relationshipCount,
        };
      }
    });
  });

  // Sort characters by total appearances (descending)
  const sortedCharacters = [...characters].sort((a, b) => 
    (characterArcData[b.id]?.totalAppearances || 0) - (characterArcData[a.id]?.totalAppearances || 0)
  );

  // Calculate column width based on number of arcs
  const arcColumnWidth = Math.max(60, Math.min(100, 600 / arcs.length));

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#f9fafb',
      overflowY: 'auto',
      overflowX: 'auto'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '20px 20px 12px 20px', 
        background: 'white',
        borderBottom: '2px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: 'bold', 
          marginBottom: '8px',
          color: '#667eea'
        }}>
          등장인물 출현 매트릭스
        </h3>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
          각 캐릭터가 어느 Arc에 등장하는지 확인하세요
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '16px', height: '16px', background: '#667eea', borderRadius: '4px' }} />
            <span>주요 등장</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '16px', height: '16px', background: '#e0e7ff', borderRadius: '4px' }} />
            <span>등장</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px' }}>⭐</span>
            <span>첫 등장</span>
          </div>
        </div>
      </div>

      {/* Matrix Container */}
      <div style={{ padding: '20px', minWidth: 'fit-content' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {/* Column Headers - Arc Names */}
          <div style={{ display: 'flex', marginBottom: '12px', position: 'sticky', top: '140px', zIndex: 9, background: '#f9fafb', paddingBottom: '8px' }}>
            <div style={{ 
              width: '200px', 
              flexShrink: 0,
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#888',
              display: 'flex',
              alignItems: 'flex-end',
              paddingBottom: '4px'
            }}>
              캐릭터
            </div>
            {arcs.map((arc, idx) => (
              <Tooltip key={arc.id} content={arc.description} placement="top">
                <div
                  style={{ 
                    width: `${arcColumnWidth}px`,
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#667eea',
                    textAlign: 'center',
                    cursor: 'pointer',
                    padding: '4px',
                    transition: 'all 0.2s',
                    borderRadius: '4px'
                  }}
                  onClick={() => onArcSelect?.(arc.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e0e7ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ marginBottom: '4px' }}>Arc {idx + 1}</div>
                  <div style={{ 
                    fontSize: '8px', 
                    color: '#888',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {arc.name}
                  </div>
                </div>
              </Tooltip>
            ))}
            <div style={{ 
              width: '80px',
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#888',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: '4px'
            }}>
              출현 횟수
            </div>
          </div>

          {/* Matrix Rows - Characters */}
          {sortedCharacters.map((char) => {
            const charData = characterArcData[char.id];
            if (!charData || charData.totalAppearances === 0) return null;

            return (
              <div
                key={char.id}
                style={{
                  display: 'flex',
                  marginBottom: '8px',
                  background: 'white',
                  borderRadius: '8px',
                  padding: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onClick={() => onCharacterSelect?.(char.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Character Info */}
                <div style={{ 
                  width: '200px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '24px' }}>{char.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontSize: '13px', 
                      fontWeight: 'bold',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {char.name}
                    </div>
                    {char.korean_name && (
                      <div style={{ 
                        fontSize: '10px', 
                        color: '#888',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {char.korean_name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Arc Cells */}
                {arcs.map((arc) => {
                  const arcDetail = charData.arcDetails[arc.id];
                  const appears = charData.arcs.has(arc.id);

                  return (
                    <Tooltip
                      key={arc.id}
                      content={
                        appears ? (
                          <div style={{ fontSize: '11px', maxWidth: '200px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{arc.name}</div>
                            {arcDetail?.roleInArc && (
                              <div>역할: {arcDetail.roleInArc}</div>
                            )}
                            {arcDetail?.firstAppearance && (
                              <div style={{ color: '#f59e0b' }}>⭐ 첫 등장</div>
                            )}
                            {arcDetail && arcDetail.relationshipCount > 0 && (
                              <div>관계: {arcDetail.relationshipCount}개</div>
                            )}
                          </div>
                        ) : '등장하지 않음'
                      }
                      placement="top"
                    >
                      <div
                        style={{
                          width: `${arcColumnWidth}px`,
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: appears 
                            ? (arcDetail?.relationshipCount && arcDetail.relationshipCount > 0 ? '#667eea' : '#e0e7ff')
                            : '#f3f4f6',
                          border: appears ? '2px solid #667eea' : '1px solid #e5e7eb',
                          borderRadius: '6px',
                          position: 'relative',
                          transition: 'all 0.2s'
                        }}
                      >
                        {appears && (
                          <>
                            {arcDetail?.firstAppearance && (
                              <span style={{ 
                                position: 'absolute', 
                                top: '2px', 
                                right: '2px',
                                fontSize: '12px'
                              }}>
                                ⭐
                              </span>
                            )}
                            <span style={{ 
                              fontSize: '18px',
                              color: arcDetail?.relationshipCount && arcDetail.relationshipCount > 0 ? 'white' : '#667eea'
                            }}>
                              ✓
                            </span>
                            {arcDetail && arcDetail.relationshipCount > 0 && (
                              <span style={{
                                position: 'absolute',
                                bottom: '2px',
                                right: '4px',
                                fontSize: '9px',
                                color: 'white',
                                fontWeight: 'bold'
                              }}>
                                {arcDetail.relationshipCount}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </Tooltip>
                  );
                })}

                {/* Total Appearances */}
                <div style={{
                  width: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Chip size="sm" color="secondary" variant="flat">
                    {charData.totalAppearances}
                  </Chip>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div style={{ 
        padding: '20px', 
        background: 'white',
        borderTop: '2px solid #e5e7eb',
        marginTop: 'auto'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ 
            padding: '12px', 
            background: '#f9fafb', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#667eea' }}>
              {arcs.length}
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
              Total Arcs
            </div>
          </div>
          <div style={{ 
            padding: '12px', 
            background: '#f9fafb', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#667eea' }}>
              {sortedCharacters.filter(c => characterArcData[c.id]?.totalAppearances > 0).length}
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
              Active Characters
            </div>
          </div>
          <div style={{ 
            padding: '12px', 
            background: '#f9fafb', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#667eea' }}>
              {Math.round(
                sortedCharacters.reduce((sum, c) => sum + (characterArcData[c.id]?.totalAppearances || 0), 0) / 
                Math.max(sortedCharacters.filter(c => characterArcData[c.id]?.totalAppearances > 0).length, 1) * 10
              ) / 10}
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
              Avg Appearances
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

