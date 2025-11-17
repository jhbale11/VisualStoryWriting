import { Button, Card, CardBody, CardHeader, Chip, Divider, Input, Select, SelectItem, Textarea } from '@nextui-org/react';
import { useState, useEffect } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { GlossaryCharacter, GlossaryEvent, GlossaryLocation, GlossaryTerm, useGlossaryStore } from '../../model/GlossaryModel';

interface Props {
  type: 'character' | 'event' | 'location' | 'term';
  item: GlossaryCharacter | GlossaryEvent | GlossaryLocation | GlossaryTerm | null;
  onClose: () => void;
}

export default function GlossaryEditPanel({ type, item, onClose }: Props) {
  const arcs = useGlossaryStore(state => state.arcs);
  const updateArc = useGlossaryStore(state => state.updateArc);

  const [editData, setEditData] = useState<any>(item || {});

  // Sync editData when item changes
  useEffect(() => {
    if (item) {
      setEditData({ ...item });
    }
  }, [item]);

  if (!item) return null;

  // Find which arc contains this item
  const findArcContainingItem = () => {
    for (const arc of arcs) {
      if (type === 'character' && arc.characters?.some(c => c.id === item.id)) {
        return arc;
      } else if (type === 'event' && arc.events?.some(e => e.id === item.id)) {
        return arc;
      } else if (type === 'location' && arc.locations?.some(l => l.id === item.id)) {
        return arc;
      } else if (type === 'term' && arc.terms?.some(t => t.id === item.id)) {
        return arc;
      }
    }
    return null;
  };

  const handleSave = () => {
    const arc = findArcContainingItem();
    if (!arc) {
      console.error('Arc not found for item:', item.id);
      return;
    }

    // Ensure id is preserved
    const dataToSave = { ...editData, id: item.id };
    
    if (type === 'character') {
      const updatedCharacters = (arc.characters || []).map(c => 
        c.id === item.id ? dataToSave : c
      );
      updateArc(arc.id, { characters: updatedCharacters });
    } else if (type === 'event') {
      const updatedEvents = (arc.events || []).map(e => 
        e.id === item.id ? dataToSave : e
      );
      updateArc(arc.id, { events: updatedEvents });
    } else if (type === 'location') {
      const updatedLocations = (arc.locations || []).map(l => 
        l.id === item.id ? dataToSave : l
      );
      updateArc(arc.id, { locations: updatedLocations });
    } else if (type === 'term') {
      const updatedTerms = (arc.terms || []).map(t => 
        t.id === item.id ? dataToSave : t
      );
      updateArc(arc.id, { terms: updatedTerms });
    }
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this item?')) {
      const arc = findArcContainingItem();
      if (!arc) {
        console.error('Arc not found for item:', item.id);
        return;
      }

      if (type === 'character') {
        const updatedCharacters = (arc.characters || []).filter(c => c.id !== item.id);
        updateArc(arc.id, { characters: updatedCharacters });
      } else if (type === 'event') {
        const updatedEvents = (arc.events || []).filter(e => e.id !== item.id);
        updateArc(arc.id, { events: updatedEvents });
      } else if (type === 'location') {
        const updatedLocations = (arc.locations || []).filter(l => l.id !== item.id);
        updateArc(arc.id, { locations: updatedLocations });
      } else if (type === 'term') {
        const updatedTerms = (arc.terms || []).filter(t => t.id !== item.id);
        updateArc(arc.id, { terms: updatedTerms });
      }
      onClose();
    }
  };

  const addTrait = () => {
    const newTraits = [...(editData.traits || []), 'New Trait'];
    setEditData({ ...editData, traits: newTraits });
  };

  const removeTrait = (index: number) => {
    const newTraits = editData.traits.filter((_: any, i: number) => i !== index);
    setEditData({ ...editData, traits: newTraits });
  };

  const updateTrait = (index: number, value: string) => {
    const newTraits = [...editData.traits];
    newTraits[index] = value;
    setEditData({ ...editData, traits: newTraits });
  };

  const addRelationship = () => {
    const newRelationships = [...(editData.relationships || []), {
      character_name: '',
      relationship_type: '',
      description: '',
      sentiment: 'neutral'
    }];
    setEditData({ ...editData, relationships: newRelationships });
  };

  const removeRelationship = (index: number) => {
    const newRelationships = editData.relationships.filter((_: any, i: number) => i !== index);
    setEditData({ ...editData, relationships: newRelationships });
  };

  const updateRelationship = (index: number, field: string, value: string) => {
    const newRelationships = [...editData.relationships];
    newRelationships[index] = { ...newRelationships[index], [field]: value };
    setEditData({ ...editData, relationships: newRelationships });
  };

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      height: '100vh',
      width: '400px',
      background: 'white',
      boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
      zIndex: 1000,
      overflowY: 'auto',
      padding: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
          Edit {type.charAt(0).toUpperCase() + type.slice(1)}
        </h2>
        <Button size="sm" variant="flat" onPress={onClose}>
          Close
        </Button>
      </div>

      <Card>
        <CardBody style={{ gap: '15px' }}>
          <Input
            label="Name"
            value={editData.name || ''}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
          />

          {type === 'character' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Input
                  label="Korean Name (한글 이름)"
                  value={editData.korean_name || ''}
                  onChange={(e) => setEditData({ ...editData, korean_name: e.target.value })}
                />
                <Input
                  label="English Name"
                  value={editData.english_name || ''}
                  onChange={(e) => setEditData({ ...editData, english_name: e.target.value })}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Input
                  label="Korean Surname (성)"
                  value={editData.korean_surname || ''}
                  onChange={(e) => setEditData({ ...editData, korean_surname: e.target.value })}
                />
                <Input
                  label="Korean Given Name (이름)"
                  value={editData.korean_given_name || ''}
                  onChange={(e) => setEditData({ ...editData, korean_given_name: e.target.value })}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Input
                  label="Surname (Family Name)"
                  value={editData.surname || ''}
                  onChange={(e) => setEditData({ ...editData, surname: e.target.value })}
                />
                <Input
                  label="Given Name"
                  value={editData.given_name || ''}
                  onChange={(e) => setEditData({ ...editData, given_name: e.target.value })}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <Input
                  label="Emoji"
                  value={editData.emoji || ''}
                  onChange={(e) => setEditData({ ...editData, emoji: e.target.value })}
                />
                <Input
                  label="Age"
                  value={editData.age || ''}
                  onChange={(e) => setEditData({ ...editData, age: e.target.value })}
                />
                <Select
                  label="Gender"
                  selectedKeys={editData.gender ? [editData.gender] : []}
                  onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                >
                  <SelectItem key="male" value="male">Male</SelectItem>
                  <SelectItem key="female" value="female">Female</SelectItem>
                  <SelectItem key="other" value="other">Other</SelectItem>
                </Select>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Select
                  label="Role"
                  selectedKeys={editData.role ? [editData.role] : ['minor']}
                  onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                >
                  <SelectItem key="protagonist" value="protagonist">Protagonist</SelectItem>
                  <SelectItem key="antagonist" value="antagonist">Antagonist</SelectItem>
                  <SelectItem key="major" value="major">Major</SelectItem>
                  <SelectItem key="supporting" value="supporting">Supporting</SelectItem>
                  <SelectItem key="minor" value="minor">Minor</SelectItem>
                </Select>
                <Select
                  label="Age Group"
                  selectedKeys={editData.age_group ? [editData.age_group] : ['adult']}
                  onChange={(e) => setEditData({ ...editData, age_group: e.target.value })}
                >
                  <SelectItem key="child" value="child">Child</SelectItem>
                  <SelectItem key="teen" value="teen">Teen</SelectItem>
                  <SelectItem key="young_adult" value="young_adult">Young Adult</SelectItem>
                  <SelectItem key="adult" value="adult">Adult</SelectItem>
                  <SelectItem key="elderly" value="elderly">Elderly</SelectItem>
                </Select>
              </div>
              
              <Input
                label="Occupation"
                value={editData.occupation || ''}
                onChange={(e) => setEditData({ ...editData, occupation: e.target.value })}
                placeholder="e.g., Executive Director, Secretary, A-rank Esper"
              />
              
              <Input
                label="Speech Style (어투)"
                value={editData.speech_style || ''}
                onChange={(e) => setEditData({ ...editData, speech_style: e.target.value })}
                placeholder="e.g., formal (격식체), casual (반말), rough, archaic"
              />
              
              <Input
                label="First Appearance"
                value={editData.first_appearance || ''}
                onChange={(e) => setEditData({ ...editData, first_appearance: e.target.value })}
                placeholder="e.g., Chapter 1, during school entrance"
              />
              
              <Textarea
                label="Physical Appearance"
                value={editData.physical_appearance || ''}
                onChange={(e) => setEditData({ ...editData, physical_appearance: e.target.value })}
                minRows={3}
                placeholder="Detailed physical description"
              />
              <Textarea
                label="Personality"
                value={editData.personality || ''}
                onChange={(e) => setEditData({ ...editData, personality: e.target.value })}
                minRows={3}
                placeholder="Personality description"
              />
            </>
          )}

          {type === 'location' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Input
                  label="Korean Name (한글 이름)"
                  value={editData.korean_name || ''}
                  onChange={(e) => setEditData({ ...editData, korean_name: e.target.value })}
                />
                <Input
                  label="Emoji"
                  value={editData.emoji || ''}
                  onChange={(e) => setEditData({ ...editData, emoji: e.target.value })}
                />
              </div>
              <Select
                label="Type"
                selectedKeys={editData.type ? [editData.type] : []}
                onChange={(e) => setEditData({ ...editData, type: e.target.value })}
              >
                <SelectItem key="city" value="city">City</SelectItem>
                <SelectItem key="building" value="building">Building</SelectItem>
                <SelectItem key="room" value="room">Room</SelectItem>
                <SelectItem key="natural" value="natural">Natural</SelectItem>
                <SelectItem key="other" value="other">Other</SelectItem>
              </Select>
              <Textarea
                label="Atmosphere"
                value={editData.atmosphere || ''}
                onChange={(e) => setEditData({ ...editData, atmosphere: e.target.value })}
                minRows={2}
                placeholder="e.g., bustling and modern, ancient and mysterious"
              />
              <Textarea
                label="Significance"
                value={editData.significance || ''}
                onChange={(e) => setEditData({ ...editData, significance: e.target.value })}
                minRows={2}
                placeholder="e.g., protagonist's hometown, main setting"
              />
            </>
          )}

          <Textarea
            label="Description"
            value={editData.description || ''}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            minRows={3}
          />

          {type === 'character' && (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Personality Traits (특성)</label>
                  <Button size="sm" variant="flat" startContent={<FaPlus />} onPress={addTrait}>
                    Add Trait
                  </Button>
                </div>
                {editData.traits?.map((trait: string, index: number) => (
                  <div key={index} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                    <Input
                      size="sm"
                      value={trait}
                      onChange={(e) => updateTrait(index, e.target.value)}
                      placeholder="e.g., confident, analytical"
                    />
                    <Button size="sm" isIconOnly variant="flat" color="danger" onPress={() => removeTrait(index)}>
                      <FaTrash />
                    </Button>
                  </div>
                ))}
              </div>

              <Divider style={{ margin: '15px 0' }} />

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Abilities (능력)</label>
                  <Button size="sm" variant="flat" startContent={<FaPlus />} onPress={() => {
                    const newAbilities = [...(editData.abilities || []), 'New Ability'];
                    setEditData({ ...editData, abilities: newAbilities });
                  }}>
                    Add Ability
                  </Button>
                </div>
                {(editData.abilities || []).map((ability: string, index: number) => (
                  <div key={index} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                    <Input
                      size="sm"
                      value={ability}
                      onChange={(e) => {
                        const newAbilities = [...editData.abilities];
                        newAbilities[index] = e.target.value;
                        setEditData({ ...editData, abilities: newAbilities });
                      }}
                      placeholder="e.g., Cryokinesis, Master Swordsmanship"
                    />
                    <Button size="sm" isIconOnly variant="flat" color="danger" onPress={() => {
                      const newAbilities = editData.abilities.filter((_: any, i: number) => i !== index);
                      setEditData({ ...editData, abilities: newAbilities });
                    }}>
                      <FaTrash />
                    </Button>
                  </div>
                ))}
              </div>

              <Divider style={{ margin: '15px 0' }} />

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Relationships (관계)</label>
                  <Button size="sm" variant="flat" startContent={<FaPlus />} onPress={addRelationship}>
                    Add Relationship
                  </Button>
                </div>
                {editData.relationships?.map((rel: any, index: number) => (
                  <Card key={index} style={{ marginBottom: '10px', padding: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <Input
                        size="sm"
                        label="Character Name"
                        value={rel.character_name}
                        onChange={(e) => updateRelationship(index, 'character_name', e.target.value)}
                      />
                      <Input
                        size="sm"
                        label="Relationship Type"
                        placeholder="e.g., 친구, 적, 연인, 라이벌"
                        value={rel.relationship_type}
                        onChange={(e) => updateRelationship(index, 'relationship_type', e.target.value)}
                      />
                      <Select
                        size="sm"
                        label="Sentiment"
                        selectedKeys={[rel.sentiment || 'neutral']}
                        onChange={(e) => updateRelationship(index, 'sentiment', e.target.value)}
                      >
                        <SelectItem key="positive" value="positive">긍정적 (Positive)</SelectItem>
                        <SelectItem key="negative" value="negative">부정적 (Negative)</SelectItem>
                        <SelectItem key="neutral" value="neutral">중립적 (Neutral)</SelectItem>
                      </Select>
                      <Textarea
                        size="sm"
                        label="Description"
                        placeholder="관계에 대한 설명"
                        value={rel.description}
                        onChange={(e) => updateRelationship(index, 'description', e.target.value)}
                        minRows={2}
                      />
                      <Button size="sm" variant="flat" color="danger" startContent={<FaTrash />} onPress={() => removeRelationship(index)}>
                        Remove Relationship
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {type === 'event' && (
            <>
              <Input
                label="Source Location"
                value={editData.source_location || ''}
                onChange={(e) => setEditData({ ...editData, source_location: e.target.value })}
              />
              <Input
                label="Target Location"
                value={editData.target_location || ''}
                onChange={(e) => setEditData({ ...editData, target_location: e.target.value })}
              />
              <Select
                label="Importance"
                selectedKeys={[editData.importance || 'minor']}
                onChange={(e) => setEditData({ ...editData, importance: e.target.value })}
              >
                <SelectItem key="major" value="major">Major</SelectItem>
                <SelectItem key="minor" value="minor">Minor</SelectItem>
              </Select>
            </>
          )}

          {type === 'term' && (
            <>
              <Input
                label="Original Term (Korean)"
                value={editData.original || ''}
                onChange={(e) => setEditData({ ...editData, original: e.target.value })}
                placeholder="한글 용어"
              />
              <Input
                label="Translation (English)"
                value={editData.translation || ''}
                onChange={(e) => setEditData({ ...editData, translation: e.target.value })}
                placeholder="English translation"
              />
              <Textarea
                label="Context"
                value={editData.context || ''}
                onChange={(e) => setEditData({ ...editData, context: e.target.value })}
                minRows={2}
                placeholder="Usage context"
              />
              <Select
                label="Category"
                selectedKeys={[editData.category || 'other']}
                onChange={(e) => setEditData({ ...editData, category: e.target.value })}
              >
                <SelectItem key="name" value="name">Name</SelectItem>
                <SelectItem key="place" value="place">Place</SelectItem>
                <SelectItem key="item" value="item">Item</SelectItem>
                <SelectItem key="concept" value="concept">Concept</SelectItem>
                <SelectItem key="martial_arts" value="martial_arts">Martial Arts</SelectItem>
                <SelectItem key="cultural" value="cultural">Cultural</SelectItem>
                <SelectItem key="technical" value="technical">Technical</SelectItem>
                <SelectItem key="other" value="other">Other</SelectItem>
              </Select>
              <Input
                label="First Appearance"
                value={editData.first_appearance || ''}
                onChange={(e) => setEditData({ ...editData, first_appearance: e.target.value })}
                placeholder="e.g., Chapter 1 during school entrance"
              />
              <Textarea
                label="Translation Notes"
                value={editData.notes || ''}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                minRows={2}
                placeholder="Special notes for translation"
              />
            </>
          )}

          <Divider />

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button color="secondary" onPress={handleSave} style={{ flex: 1 }}>
              Save Changes
            </Button>
            <Button color="danger" variant="flat" onPress={handleDelete}>
              Delete
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
