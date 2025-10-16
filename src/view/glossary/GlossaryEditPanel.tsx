import { Button, Card, CardBody, CardHeader, Chip, Divider, Input, Select, SelectItem, Textarea } from '@nextui-org/react';
import { useState } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { GlossaryCharacter, GlossaryEvent, GlossaryLocation, useGlossaryStore } from '../../model/GlossaryModel';

interface Props {
  type: 'character' | 'event' | 'location';
  item: GlossaryCharacter | GlossaryEvent | GlossaryLocation | null;
  onClose: () => void;
}

export default function GlossaryEditPanel({ type, item, onClose }: Props) {
  const updateCharacter = useGlossaryStore(state => state.updateCharacter);
  const updateEvent = useGlossaryStore(state => state.updateEvent);
  const updateLocation = useGlossaryStore(state => state.updateLocation);
  const deleteCharacter = useGlossaryStore(state => state.deleteCharacter);
  const deleteEvent = useGlossaryStore(state => state.deleteEvent);
  const deleteLocation = useGlossaryStore(state => state.deleteLocation);

  const [editData, setEditData] = useState<any>(item || {});

  if (!item) return null;

  const handleSave = () => {
    if (type === 'character') {
      updateCharacter(item.id, editData);
    } else if (type === 'event') {
      updateEvent(item.id, editData);
    } else if (type === 'location') {
      updateLocation(item.id, editData);
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
                label="Emoji"
                value={editData.emoji || ''}
                onChange={(e) => setEditData({ ...editData, emoji: e.target.value })}
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
