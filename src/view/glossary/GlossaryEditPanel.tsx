import { Button, Card, CardBody, CardHeader, Chip, Divider, Input, Select, SelectItem, Textarea } from '@nextui-org/react';
import { useState } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { GlossaryCharacter, GlossaryEvent, GlossaryLocation, GlossaryTerm, useGlossaryStore } from '../../model/GlossaryModel';

interface Props {
  type: 'character' | 'event' | 'location' | 'term';
  item: GlossaryCharacter | GlossaryEvent | GlossaryLocation | GlossaryTerm | null;
  onClose: () => void;
}

export default function GlossaryEditPanel({ type, item, onClose }: Props) {
  const updateCharacter = useGlossaryStore(state => state.updateCharacter);
  const updateEvent = useGlossaryStore(state => state.updateEvent);
  const updateLocation = useGlossaryStore(state => state.updateLocation);
  const updateTerm = useGlossaryStore(state => state.updateTerm);
  const deleteCharacter = useGlossaryStore(state => state.deleteCharacter);
  const deleteEvent = useGlossaryStore(state => state.deleteEvent);
  const deleteLocation = useGlossaryStore(state => state.deleteLocation);
  const deleteTerm = useGlossaryStore(state => state.deleteTerm);

  const [editData, setEditData] = useState<any>(item || {});

  if (!item) return null;

  const handleSave = () => {
    if (type === 'character') {
      updateCharacter(item.id, editData);
    } else if (type === 'event') {
      updateEvent(item.id, editData);
    } else if (type === 'location') {
      updateLocation(item.id, editData);
    } else if (type === 'term') {
      updateTerm(item.id, editData);
    }
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this item?')) {
      if (type === 'character') {
        deleteCharacter(item.id);
      } else if (type === 'event') {
        deleteEvent(item.id);
      } else if (type === 'location') {
        deleteLocation(item.id);
      } else if (type === 'term') {
        deleteTerm(item.id);
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
              <Input
                label="Korean Name"
                value={editData.korean_name || ''}
                onChange={(e) => setEditData({ ...editData, korean_name: e.target.value })}
              />
              <Input
                label="English Name"
                value={editData.english_name || ''}
                onChange={(e) => setEditData({ ...editData, english_name: e.target.value })}
              />
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
              <Input
                label="Gender"
                value={editData.gender || ''}
                onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
              />
              <Input
                label="Occupation"
                value={editData.occupation || ''}
                onChange={(e) => setEditData({ ...editData, occupation: e.target.value })}
              />
              <Textarea
                label="Physical Appearance"
                value={editData.physical_appearance || ''}
                onChange={(e) => setEditData({ ...editData, physical_appearance: e.target.value })}
                minRows={3}
              />
              <Textarea
                label="Personality"
                value={editData.personality || ''}
                onChange={(e) => setEditData({ ...editData, personality: e.target.value })}
                minRows={3}
              />
            </>
          )}

          {type === 'location' && (
            <Input
              label="Emoji"
              value={editData.emoji || ''}
              onChange={(e) => setEditData({ ...editData, emoji: e.target.value })}
            />
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
                  <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Traits</label>
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
                    />
                    <Button size="sm" isIconOnly variant="flat" color="danger" onPress={() => removeTrait(index)}>
                      <FaTrash />
                    </Button>
                  </div>
                ))}
              </div>

              <Divider style={{ margin: '20px 0' }} />

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Relationships</label>
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
                        placeholder="e.g., 친구, 적, 연인"
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
                label="Original Term"
                value={editData.original || ''}
                onChange={(e) => setEditData({ ...editData, original: e.target.value })}
              />
              <Input
                label="Translation"
                value={editData.translation || ''}
                onChange={(e) => setEditData({ ...editData, translation: e.target.value })}
              />
              <Textarea
                label="Context"
                value={editData.context || ''}
                onChange={(e) => setEditData({ ...editData, context: e.target.value })}
                minRows={3}
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
                <SelectItem key="other" value="other">Other</SelectItem>
              </Select>
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
