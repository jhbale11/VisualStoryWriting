import { Button, Card, CardBody, CardHeader, Chip, Divider, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Tab, Tabs, Textarea, Tooltip, useDisclosure, Select, SelectItem } from '@nextui-org/react';
import { ReactFlowProvider, useKeyPress } from '@xyflow/react';
import React, { useEffect, useState } from 'react';
import { FaDownload, FaSearch, FaTrashAlt, FaUpload, FaPlus } from 'react-icons/fa';
import { FaLocationDot } from 'react-icons/fa6';
import { FiFeather, FiTrash } from 'react-icons/fi';
import { IoPersonCircle, IoSave } from 'react-icons/io5';
import { TbArrowBigRightLinesFilled } from 'react-icons/tb';
import { GlossaryCharacter, GlossaryEvent, GlossaryLocation, GlossaryTerm, useGlossaryStore } from '../model/GlossaryModel';
import { LayoutUtils } from '../model/LayoutUtils';
import { useModelStore } from '../model/Model';
import ActionTimeline from './actionTimeline/ActionTimeline';
import EntitiesEditor from './entityActionView/EntitiesEditor';
import GlossaryEditPanel from './glossary/GlossaryEditPanel';
import CharacterRelationshipGraph from './glossary/CharacterRelationshipGraph';
import LocationsEditor from './locationView/LocationsEditor';

function StoryFeaturesTab() {
  const storySummary = useGlossaryStore((state) => state.story_summary);
  const keyEvents = useGlossaryStore((state) => state.key_events_and_arcs);
  const styleGuide = useGlossaryStore((state) => state.style_guide);
  const worldBuildingNotes = useGlossaryStore((state) => state.world_building_notes);
  const honorifics = useGlossaryStore((state) => state.honorifics);
  const recurringPhrases = useGlossaryStore((state) => state.recurring_phrases);
  
  const updateStorySummary = useGlossaryStore((state) => state.updateStorySummary);
  const updateStyleGuide = useGlossaryStore((state) => state.updateStyleGuide);
  const addKeyEvent = useGlossaryStore((state) => state.addKeyEvent);
  const updateKeyEvent = useGlossaryStore((state) => state.updateKeyEvent);
  const deleteKeyEvent = useGlossaryStore((state) => state.deleteKeyEvent);
  const addWorldBuildingNote = useGlossaryStore((state) => state.addWorldBuildingNote);
  const updateWorldBuildingNote = useGlossaryStore((state) => state.updateWorldBuildingNote);
  const deleteWorldBuildingNote = useGlossaryStore((state) => state.deleteWorldBuildingNote);
  const addHonorific = useGlossaryStore((state) => state.addHonorific);
  const updateHonorific = useGlossaryStore((state) => state.updateHonorific);
  const deleteHonorific = useGlossaryStore((state) => state.deleteHonorific);
  const addRecurringPhrase = useGlossaryStore((state) => state.addRecurringPhrase);
  const updateRecurringPhrase = useGlossaryStore((state) => state.updateRecurringPhrase);
  const deleteRecurringPhrase = useGlossaryStore((state) => state.deleteRecurringPhrase);

  const [editingHonorific, setEditingHonorific] = React.useState<{ original: string; korean: string; explanation: string } | null>(null);
  const [editingPhrase, setEditingPhrase] = React.useState<{ original: string; korean: string; translation: string } | null>(null);

  // Debug: Log data to console
  React.useEffect(() => {
    console.log('Story Features Data:', {
      storySummary,
      keyEventsCount: keyEvents?.length || 0,
      worldBuildingNotesCount: worldBuildingNotes?.length || 0,
      honorificsCount: Object.keys(honorifics || {}).length,
      recurringPhrasesCount: Object.keys(recurringPhrases || {}).length,
      styleGuide
    });
  }, [storySummary, keyEvents, worldBuildingNotes, honorifics, recurringPhrases, styleGuide]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <Card>
        <CardHeader>
          <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Story Summary (작품 요약)</h3>
        </CardHeader>
        <Divider />
        <CardBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <Textarea
              label="Logline (한 문장 요약)"
              value={storySummary?.logline || ''}
              onChange={(e) => updateStorySummary({ logline: e.target.value })}
              placeholder="A one-sentence, tantalizing summary of the entire story."
              minRows={2}
            />
            <Textarea
              label="Blurb (뒷표지 소개)"
              value={storySummary?.blurb || ''}
              onChange={(e) => updateStorySummary({ blurb: e.target.value })}
              placeholder="A short, enticing paragraph describing the main plot, core conflict, and stakes."
              minRows={4}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Key Story Arcs (주요 스토리 아크)</h3>
            <Button
              size="sm"
              variant="flat"
              startContent={<FaPlus />}
              onPress={() => addKeyEvent('New key event')}
            >
              Add Event
            </Button>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          {keyEvents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {keyEvents.map((event, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                  <div style={{ 
                    minWidth: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    background: '#667eea', 
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginTop: '8px'
                  }}>
                    {index + 1}
                  </div>
                  <Textarea
                    value={event}
                    onChange={(e) => updateKeyEvent(index, e.target.value)}
                    minRows={2}
                    style={{ flex: 1 }}
                  />
                  <Button
                    size="sm"
                    isIconOnly
                    variant="flat"
                    color="danger"
                    onPress={() => deleteKeyEvent(index)}
                  >
                    <FiTrash />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#888', fontStyle: 'italic' }}>No key events extracted yet. Click "Add Event" to add one manually, or extract from text.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>World Building Notes (세계관 노트)</h3>
            <Button
              size="sm"
              variant="flat"
              startContent={<FaPlus />}
              onPress={() => addWorldBuildingNote('New world building note')}
            >
              Add Note
            </Button>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          {worldBuildingNotes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {worldBuildingNotes.map((note, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                  <Textarea
                    value={note}
                    onChange={(e) => updateWorldBuildingNote(index, e.target.value)}
                    minRows={2}
                    style={{ flex: 1 }}
                  />
                  <Button
                    size="sm"
                    isIconOnly
                    variant="flat"
                    color="danger"
                    onPress={() => deleteWorldBuildingNote(index)}
                  >
                    <FiTrash />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#888', fontStyle: 'italic' }}>No world building notes extracted yet. Click "Add Note" to add one manually, or extract from text.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Style & Genre (스타일 & 장르)</h3>
        </CardHeader>
        <Divider />
        <CardBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Input
                label="Genre (장르)"
                value={styleGuide?.genre || ''}
                onChange={(e) => updateStyleGuide({ genre: e.target.value })}
                placeholder="e.g., Fantasy Romance, School Life"
              />
              <Input
                label="Content Rating"
                value={styleGuide?.content_rating || ''}
                onChange={(e) => updateStyleGuide({ content_rating: e.target.value })}
                placeholder="e.g., Teen, Young Adult, Mature"
              />
            </div>

            <Textarea
              label="Sub-genres (하위 장르, comma-separated)"
              value={styleGuide?.sub_genres?.join(', ') || ''}
              onChange={(e) => updateStyleGuide({ sub_genres: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="e.g., slice of life, drama, action"
              minRows={2}
            />

            <Textarea
              label="Themes (테마, comma-separated)"
              value={styleGuide?.themes?.join(', ') || ''}
              onChange={(e) => updateStyleGuide({ themes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="e.g., trauma, power dynamics, romance"
              minRows={2}
            />

            <Textarea
              label="Tone (톤)"
              value={styleGuide?.tone || ''}
              onChange={(e) => updateStyleGuide({ tone: e.target.value })}
              placeholder="e.g., Romantic and intimate, with underlying tension"
              minRows={2}
            />

            <Input
              label="Formality Level"
              value={styleGuide?.formality_level || ''}
              onChange={(e) => updateStyleGuide({ formality_level: e.target.value })}
              placeholder="e.g., high, medium, low"
            />

            <Input
              label="Dialogue Style"
              value={styleGuide?.dialogue_style || ''}
              onChange={(e) => updateStyleGuide({ dialogue_style: e.target.value })}
              placeholder="e.g., natural, age-appropriate"
            />

            <Textarea
              label="Narrative Vocabulary"
              value={styleGuide?.narrative_vocabulary || ''}
              onChange={(e) => updateStyleGuide({ narrative_vocabulary: e.target.value })}
              placeholder="e.g., Descriptive and emotional, focusing on sensory details"
              minRows={2}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Translation Guidelines (번역 가이드)</h3>
        </CardHeader>
        <Divider />
        <CardBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <Input
              label="Name Format"
              value={styleGuide?.name_format || ''}
              onChange={(e) => updateStyleGuide({ name_format: e.target.value })}
              placeholder="e.g., english_given_name english_surname"
            />

            <Textarea
              label="Honorific Usage"
              value={styleGuide?.honorific_usage || ''}
              onChange={(e) => updateStyleGuide({ honorific_usage: e.target.value })}
              placeholder="Guidelines for translating Korean honorifics"
              minRows={3}
            />

            <Textarea
              label="Formal Speech Level"
              value={styleGuide?.formal_speech_level || ''}
              onChange={(e) => updateStyleGuide({ formal_speech_level: e.target.value })}
              placeholder="How to match English formality to Korean speech levels"
              minRows={2}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Narrative Style (서술 스타일)</h3>
        </CardHeader>
        <Divider />
        <CardBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <Input
                label="Point of View"
                value={styleGuide.narrative_style?.point_of_view || ''}
                onChange={(e) => updateStyleGuide({
                  narrative_style: { ...styleGuide.narrative_style, point_of_view: e.target.value }
                })}
                placeholder="e.g., first-person, third-person"
              />

              <Input
                label="Tense"
                value={styleGuide.narrative_style?.tense || ''}
                onChange={(e) => updateStyleGuide({
                  narrative_style: { ...styleGuide.narrative_style, tense: e.target.value }
                })}
                placeholder="e.g., past, present"
              />

              <Input
                label="Voice"
                value={styleGuide.narrative_style?.voice || ''}
                onChange={(e) => updateStyleGuide({
                  narrative_style: { ...styleGuide.narrative_style, voice: e.target.value }
                })}
                placeholder="e.g., introspective"
              />
            </div>

            <Textarea
              label="Common Expressions (comma-separated)"
              value={styleGuide.narrative_style?.common_expressions?.join(', ') || ''}
              onChange={(e) => updateStyleGuide({
                narrative_style: {
                  ...styleGuide.narrative_style,
                  common_expressions: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                }
              })}
              placeholder="e.g., 입술을 깨물었다, 몸을 떨었다"
              minRows={2}
            />

            <Textarea
              label="Atmosphere Descriptors (comma-separated)"
              value={styleGuide.narrative_style?.atmosphere_descriptors?.join(', ') || ''}
              onChange={(e) => updateStyleGuide({
                narrative_style: {
                  ...styleGuide.narrative_style,
                  atmosphere_descriptors: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                }
              })}
              placeholder="e.g., tense, intimate, sensual"
              minRows={2}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Honorifics (경어)</h3>
            <Button
              size="sm"
              variant="flat"
              startContent={<FaPlus />}
              onPress={() => setEditingHonorific({ original: '', korean: '', explanation: '' })}
            >
              Add Honorific
            </Button>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          {Object.keys(honorifics).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {editingHonorific && !editingHonorific.original && (
                <div style={{ padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '2px solid #667eea' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 style={{ fontWeight: 'bold', fontSize: '14px', margin: 0 }}>Add New Honorific</h4>
                    <Input
                      label="Korean Honorific (한글)"
                      value={editingHonorific.korean}
                      onChange={(e) => setEditingHonorific({ ...editingHonorific, korean: e.target.value })}
                      placeholder="e.g., 님, 씨, 군"
                      size="sm"
                    />
                    <Textarea
                      label="Translation/Explanation"
                      value={editingHonorific.explanation}
                      onChange={(e) => setEditingHonorific({ ...editingHonorific, explanation: e.target.value })}
                      placeholder="Explain how to translate this honorific"
                      minRows={2}
                      size="sm"
                    />
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => setEditingHonorific(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        color="primary"
                        onPress={() => {
                          if (editingHonorific.korean && editingHonorific.explanation) {
                            addHonorific(editingHonorific.korean, editingHonorific.explanation);
                            setEditingHonorific(null);
                          }
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {Object.entries(honorifics).map(([korean, explanation], idx) => (
                <React.Fragment key={idx}>
                  <div style={{ padding: '10px', background: '#f9fafb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{korean}</span>
                        <span style={{ color: '#888' }}>→</span>
                      </div>
                      <span style={{ fontSize: '13px', color: '#666' }}>{explanation}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <Button
                        size="sm"
                        isIconOnly
                        variant="flat"
                        onPress={() => setEditingHonorific({ original: korean, korean, explanation })}
                      >
                        ✏️
                      </Button>
                      <Button
                        size="sm"
                        isIconOnly
                        variant="flat"
                        color="danger"
                        onPress={() => deleteHonorific(korean)}
                      >
                        <FiTrash />
                      </Button>
                    </div>
                  </div>
                  {editingHonorific && editingHonorific.original === korean && (
                    <div style={{ padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '2px solid #667eea' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h4 style={{ fontWeight: 'bold', fontSize: '14px', margin: 0 }}>Edit Honorific</h4>
                        <Input
                          label="Korean Honorific (한글)"
                          value={editingHonorific.korean}
                          onChange={(e) => setEditingHonorific({ ...editingHonorific, korean: e.target.value })}
                          placeholder="e.g., 님, 씨, 군"
                          size="sm"
                        />
                        <Textarea
                          label="Translation/Explanation"
                          value={editingHonorific.explanation}
                          onChange={(e) => setEditingHonorific({ ...editingHonorific, explanation: e.target.value })}
                          placeholder="Explain how to translate this honorific"
                          minRows={2}
                          size="sm"
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                          <Button
                            size="sm"
                            variant="flat"
                            onPress={() => setEditingHonorific(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            color="primary"
                            onPress={() => {
                              if (editingHonorific.korean && editingHonorific.explanation) {
                                updateHonorific(editingHonorific.original, editingHonorific.korean, editingHonorific.explanation);
                                setEditingHonorific(null);
                              }
                            }}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <>
              {editingHonorific && (
                <div style={{ padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '2px solid #667eea', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 style={{ fontWeight: 'bold', fontSize: '14px', margin: 0 }}>Add New Honorific</h4>
                    <Input
                      label="Korean Honorific (한글)"
                      value={editingHonorific.korean}
                      onChange={(e) => setEditingHonorific({ ...editingHonorific, korean: e.target.value })}
                      placeholder="e.g., 님, 씨, 군"
                      size="sm"
                    />
                    <Textarea
                      label="Translation/Explanation"
                      value={editingHonorific.explanation}
                      onChange={(e) => setEditingHonorific({ ...editingHonorific, explanation: e.target.value })}
                      placeholder="Explain how to translate this honorific"
                      minRows={2}
                      size="sm"
                    />
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => setEditingHonorific(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        color="primary"
                        onPress={() => {
                          if (editingHonorific.korean && editingHonorific.explanation) {
                            addHonorific(editingHonorific.korean, editingHonorific.explanation);
                            setEditingHonorific(null);
                          }
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <p style={{ color: '#888', fontStyle: 'italic' }}>No honorifics extracted yet. Click "Add Honorific" to add one manually, or extract from text.</p>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Recurring Phrases (반복 구문)</h3>
            <Button
              size="sm"
              variant="flat"
              startContent={<FaPlus />}
              onPress={() => setEditingPhrase({ original: '', korean: '', translation: '' })}
            >
              Add Phrase
            </Button>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          {Object.keys(recurringPhrases).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {editingPhrase && !editingPhrase.original && (
                <div style={{ padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '2px solid #667eea' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 style={{ fontWeight: 'bold', fontSize: '14px', margin: 0 }}>Add New Phrase</h4>
                    <Input
                      label="Korean Phrase (한글 구문)"
                      value={editingPhrase.korean}
                      onChange={(e) => setEditingPhrase({ ...editingPhrase, korean: e.target.value })}
                      placeholder="e.g., 그때 그 순간"
                      size="sm"
                    />
                    <Input
                      label="English Translation"
                      value={editingPhrase.translation}
                      onChange={(e) => setEditingPhrase({ ...editingPhrase, translation: e.target.value })}
                      placeholder="e.g., at that very moment"
                      size="sm"
                    />
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => setEditingPhrase(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        color="primary"
                        onPress={() => {
                          if (editingPhrase.korean && editingPhrase.translation) {
                            addRecurringPhrase(editingPhrase.korean, editingPhrase.translation);
                            setEditingPhrase(null);
                          }
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {Object.entries(recurringPhrases).map(([korean, translation], idx) => (
                <React.Fragment key={idx}>
                  <div style={{ padding: '10px', background: '#f9fafb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{korean}</span>
                      <span style={{ color: '#888' }}>→</span>
                      <span style={{ fontSize: '13px', color: '#667eea' }}>{translation}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <Button
                        size="sm"
                        isIconOnly
                        variant="flat"
                        onPress={() => setEditingPhrase({ original: korean, korean, translation })}
                      >
                        ✏️
                      </Button>
                      <Button
                        size="sm"
                        isIconOnly
                        variant="flat"
                        color="danger"
                        onPress={() => deleteRecurringPhrase(korean)}
                      >
                        <FiTrash />
                      </Button>
                    </div>
                  </div>
                  {editingPhrase && editingPhrase.original === korean && (
                    <div style={{ padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '2px solid #667eea' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h4 style={{ fontWeight: 'bold', fontSize: '14px', margin: 0 }}>Edit Phrase</h4>
                        <Input
                          label="Korean Phrase (한글 구문)"
                          value={editingPhrase.korean}
                          onChange={(e) => setEditingPhrase({ ...editingPhrase, korean: e.target.value })}
                          placeholder="e.g., 그때 그 순간"
                          size="sm"
                        />
                        <Input
                          label="English Translation"
                          value={editingPhrase.translation}
                          onChange={(e) => setEditingPhrase({ ...editingPhrase, translation: e.target.value })}
                          placeholder="e.g., at that very moment"
                          size="sm"
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                          <Button
                            size="sm"
                            variant="flat"
                            onPress={() => setEditingPhrase(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            color="primary"
                            onPress={() => {
                              if (editingPhrase.korean && editingPhrase.translation) {
                                updateRecurringPhrase(editingPhrase.original, editingPhrase.korean, editingPhrase.translation);
                                setEditingPhrase(null);
                              }
                            }}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <>
              {editingPhrase && (
                <div style={{ padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '2px solid #667eea', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 style={{ fontWeight: 'bold', fontSize: '14px', margin: 0 }}>Add New Phrase</h4>
                    <Input
                      label="Korean Phrase (한글 구문)"
                      value={editingPhrase.korean}
                      onChange={(e) => setEditingPhrase({ ...editingPhrase, korean: e.target.value })}
                      placeholder="e.g., 그때 그 순간"
                      size="sm"
                    />
                    <Input
                      label="English Translation"
                      value={editingPhrase.translation}
                      onChange={(e) => setEditingPhrase({ ...editingPhrase, translation: e.target.value })}
                      placeholder="e.g., at that very moment"
                      size="sm"
                    />
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() => setEditingPhrase(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        color="primary"
                        onPress={() => {
                          if (editingPhrase.korean && editingPhrase.translation) {
                            addRecurringPhrase(editingPhrase.korean, editingPhrase.translation);
                            setEditingPhrase(null);
                          }
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <p style={{ color: '#888', fontStyle: 'italic' }}>No recurring phrases extracted yet. Click "Add Phrase" to add one manually, or extract from text.</p>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default function GlossaryBuilder() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedTab, setSelectedTab] = useState('entities');
  const [glossaryTab, setGlossaryTab] = useState<'characters' | 'events' | 'locations' | 'terms' | 'features'>('characters');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<{ type: 'character' | 'event' | 'location' | 'term', item: any } | null>(null);
  const [editingTerm, setEditingTerm] = useState<{ id?: string; original: string; translation: string; context: string; category: string; notes: string } | null>(null);
  const escapePressed = useKeyPress(['Escape']);
  const { isOpen: isExportOpen, onOpen: onExportOpen, onClose: onExportClose } = useDisclosure();
  const { isOpen: isImportOpen, onOpen: onImportOpen, onClose: onImportClose } = useDisclosure();
  const [jsonData, setJsonData] = useState('');
  const [topHeight, setTopHeight] = useState(70);
  const [isDragging, setIsDragging] = useState(false);

  const visualPanelRef = React.createRef<HTMLDivElement>();

  const glossaryCharacters = useGlossaryStore(state => state.characters);
  const glossaryEvents = useGlossaryStore(state => state.events);
  const glossaryLocations = useGlossaryStore(state => state.locations);
  const glossaryTerms = useGlossaryStore(state => state.terms);
  const storySummary = useGlossaryStore(state => state.story_summary);
  const keyEvents = useGlossaryStore(state => state.key_events_and_arcs);
  const honorifics = useGlossaryStore(state => state.honorifics);
  const recurringPhrases = useGlossaryStore(state => state.recurring_phrases);
  const worldBuildingNotes = useGlossaryStore(state => state.world_building_notes);
  const styleGuide = useGlossaryStore(state => state.style_guide);
  const targetLanguage = useGlossaryStore(state => state.target_language);
  const fullText = useGlossaryStore(state => state.fullText);
  const convertToModelFormat = useGlossaryStore(state => state.convertToModelFormat);
  const exportToJSON = useGlossaryStore(state => state.exportToJSON);
  const importFromJSON = useGlossaryStore(state => state.importFromJSON);
  const addTerm = useGlossaryStore(state => state.addTerm);
  const updateTerm = useGlossaryStore(state => state.updateTerm);
  const deleteTerm = useGlossaryStore(state => state.deleteTerm);

  const setEntityNodes = useModelStore(state => state.setEntityNodes);
  const setActionEdges = useModelStore(state => state.setActionEdges);
  const setLocationNodes = useModelStore(state => state.setLocationNodes);

  // Load project data on mount
  useEffect(() => {
    try {
      const currentId = localStorage.getItem('vsw.currentProjectId');
      if (currentId) {
        const raw = localStorage.getItem('vsw.projects') || '[]';
        const arr = JSON.parse(raw);
        const project = arr.find((p: any) => p.id === currentId);
        
        if (project && project.glossary) {
          // Load glossary data
          useGlossaryStore.setState({
            characters: project.glossary.characters || [],
            events: project.glossary.events || [],
            locations: project.glossary.locations || [],
            terms: project.glossary.terms || [],
            fullText: project.glossary.fullText || '',
            story_summary: project.glossary.story_summary || { logline: '', blurb: '' },
            key_events_and_arcs: project.glossary.key_events_and_arcs || [],
            honorifics: project.glossary.honorifics || {},
            recurring_phrases: project.glossary.recurring_phrases || {},
            world_building_notes: project.glossary.world_building_notes || [],
            style_guide: project.glossary.style_guide || {
              tone: '',
              formality_level: 'medium',
              themes: [],
              genre: '',
              sub_genres: [],
              content_rating: '',
              name_format: '',
              honorific_usage: '',
              formal_speech_level: '',
              dialogue_style: '',
              narrative_vocabulary: '',
              narrative_style: {
                point_of_view: '',
                tense: '',
                voice: '',
                common_expressions: [],
                atmosphere_descriptors: []
              }
            },
            target_language: project.glossary.target_language || 'en',
          });
        }
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  }, []);

  useEffect(() => {
    if ((glossaryCharacters.length > 0 || glossaryEvents.length > 0) &&
        useModelStore.getState().entityNodes.length === 0 &&
        useModelStore.getState().actionEdges.length === 0 &&
        useModelStore.getState().locationNodes.length === 0) {
      const { entityNodes, actionEdges, locationNodes } = convertToModelFormat();
      setEntityNodes(entityNodes);
      setActionEdges(actionEdges);
      setLocationNodes(locationNodes);

      const center = { x: visualPanelRef.current!.clientWidth / 2, y: visualPanelRef.current!.clientHeight / 2 };
      LayoutUtils.optimizeNodeLayout('entity', entityNodes, setEntityNodes, center, 120, 100);
      LayoutUtils.optimizeNodeLayout('location', locationNodes, setLocationNodes, center, 120);
    }
  }, [glossaryCharacters, glossaryEvents, glossaryLocations]);

  useEffect(() => {
    if (escapePressed) {
      useModelStore.getState().setSelectedNodes([]);
      useModelStore.getState().setSelectedEdges([]);
      useModelStore.getState().setFilteredActionsSegment(null, null);
    }
  }, [escapePressed]);

  useEffect(() => {
    const center = { x: visualPanelRef.current!.clientWidth / 2, y: visualPanelRef.current!.clientHeight / 2 };
    LayoutUtils.optimizeNodeLayout('entity', useModelStore.getState().entityNodes, useModelStore.getState().setEntityNodes, center, 120, 100);
    LayoutUtils.optimizeNodeLayout('location', useModelStore.getState().locationNodes, useModelStore.getState().setLocationNodes, center, 120);
  }, [selectedTab]);

  // Auto-save on glossary changes
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      try {
        const currentId = localStorage.getItem('vsw.currentProjectId');
        if (!currentId) return; // Don't auto-save if no project is selected

        const raw = localStorage.getItem('vsw.projects') || '[]';
        const arr = JSON.parse(raw);
        const projectIndex = arr.findIndex((p: any) => p.id === currentId);
        
        if (projectIndex >= 0) {
          const glossaryState = useGlossaryStore.getState();
          arr[projectIndex] = {
            ...arr[projectIndex],
            updatedAt: Date.now(),
            glossary: {
              characters: glossaryState.characters,
              events: glossaryState.events,
              locations: glossaryState.locations,
              terms: glossaryState.terms,
              fullText: glossaryState.fullText,
              story_summary: glossaryState.story_summary,
              key_events_and_arcs: glossaryState.key_events_and_arcs,
              honorifics: glossaryState.honorifics,
              recurring_phrases: glossaryState.recurring_phrases,
              world_building_notes: glossaryState.world_building_notes,
              style_guide: glossaryState.style_guide,
              target_language: glossaryState.target_language,
            },
            view: {
              entityNodes: useModelStore.getState().entityNodes,
              actionEdges: useModelStore.getState().actionEdges,
              locationNodes: useModelStore.getState().locationNodes,
              textState: useModelStore.getState().textState,
              isReadOnly: useModelStore.getState().isReadOnly,
              relationsPositions: JSON.parse(localStorage.getItem('vsw.relations.positions') || '{}')
            }
          };
          localStorage.setItem('vsw.projects', JSON.stringify(arr));
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(saveTimer);
  }, [
    glossaryCharacters, 
    glossaryEvents, 
    glossaryLocations, 
    glossaryTerms, 
    storySummary,
    keyEvents,
    honorifics,
    recurringPhrases,
    worldBuildingNotes,
    styleGuide,
    targetLanguage,
    fullText
  ]);

  const handleExport = () => {
    const json = exportToJSON();
    setJsonData(json);
    onExportOpen();
  };

  const handleDownload = () => {
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'glossary.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    try {
      importFromJSON(jsonData);
      onImportClose();
      setJsonData('');
    } catch (error) {
      alert('Failed to import JSON');
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const container = document.getElementById('visual-container');
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const newHeight = ((e.clientY - containerRect.top) / containerRect.height) * 100;
          setTopHeight(Math.max(30, Math.min(85, newHeight)));
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: 'white', borderBottom: '1px solid #ddd' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
          Glossary Builder
        </h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button size="sm" variant="bordered" onClick={() => { try {
            const raw = localStorage.getItem('vsw.projects') || '[]';
            const arr = JSON.parse(raw);
            const currentId = localStorage.getItem('vsw.currentProjectId');
            const glossaryState = useGlossaryStore.getState();

            const snapshot = {
              id: currentId || (globalThis.crypto && 'randomUUID' in globalThis.crypto ? crypto.randomUUID() : `p-${Date.now()}`),
              name: (arr.find((p: any) => p.id === currentId)?.name) || `Project ${new Date().toLocaleString()}`,
              updatedAt: Date.now(),
              glossary: {
                characters: glossaryState.characters,
                events: glossaryState.events,
                locations: glossaryState.locations,
                terms: glossaryState.terms,
                fullText: glossaryState.fullText,
                story_summary: glossaryState.story_summary,
                key_events_and_arcs: glossaryState.key_events_and_arcs,
                honorifics: glossaryState.honorifics,
                recurring_phrases: glossaryState.recurring_phrases,
                world_building_notes: glossaryState.world_building_notes,
                style_guide: glossaryState.style_guide,
                target_language: glossaryState.target_language,
              },
              view: {
                entityNodes: useModelStore.getState().entityNodes,
                actionEdges: useModelStore.getState().actionEdges,
                locationNodes: useModelStore.getState().locationNodes,
                textState: useModelStore.getState().textState,
                isReadOnly: useModelStore.getState().isReadOnly,
                relationsPositions: JSON.parse(localStorage.getItem('vsw.relations.positions') || '{}')
              }
            } as any;

            let next = arr as any[];
            const idx = arr.findIndex((p: any) => p.id === snapshot.id);
            if (idx >= 0) { next[idx] = snapshot; } else { next = [snapshot, ...arr]; }
            localStorage.setItem('vsw.projects', JSON.stringify(next));
            localStorage.setItem('vsw.currentProjectId', snapshot.id);
          } catch {} }}>Save</Button>
          <Button size="sm" variant="flat" onClick={() => { window.location.hash = '/'; }}>Back to Projects</Button>
          <Tooltip content="Import JSON">
            <Button size="sm" variant="flat" startContent={<FaUpload />} onClick={onImportOpen}>
              Import
            </Button>
          </Tooltip>
          <Tooltip content="Export to JSON">
            <Button size="sm" color="secondary" variant="flat" startContent={<IoSave />} onClick={handleExport}>
              Export
            </Button>
          </Tooltip>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', flexGrow: 1, height: '80%' }}>
        <div id="visual-container" className='flex flex-col' style={{ position: 'relative', width: '60%' }}>
          <div style={{ width: '100%', height: `${topHeight}%`, background: '#F3F4F6', borderBottom: '1px solid #DDDDDF' }} ref={visualPanelRef}>
            {selectedTab === 'entities' && <ReactFlowProvider><EntitiesEditor /></ReactFlowProvider>}
            {selectedTab === 'locations' && <ReactFlowProvider><LocationsEditor /></ReactFlowProvider>}
            {selectedTab === 'relations' && (
              <div style={{ width: '100%', height: '100%', background: '#F9FAFB' }}>
                <CharacterRelationshipGraph
                  characters={glossaryCharacters}
                  onCharacterSelect={(char) => {}}
                />
              </div>
            )}
            <Tabs
              keyboardActivation='manual'
              onSelectionChange={setSelectedTab as any}
              selectedKey={selectedTab}
              color='primary'
              variant='bordered'
              style={{ position: 'absolute', left: '50%', top: 10, transform: 'translate(-50%, 0)' }}
              classNames={{ tabList: 'bg-white' }}
            >
              <Tab key={'entities'} title={<span style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', fontSize: 15 }}><IoPersonCircle style={{ marginRight: 3, fontSize: 22 }} /> Characters & Events</span>} />
              <Tab key={'locations'} title={<span style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', fontSize: 15 }}><FaLocationDot style={{ marginRight: 3, fontSize: 18 }} /> Locations</span>} />
              <Tab key={'relations'} title={<span style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', fontSize: 15 }}>Relations</span>} />
            </Tabs>

            <Button style={{ position: 'absolute', right: 10, top: 10, fontSize: 18 }} isIconOnly onClick={(e) => {
              LayoutUtils.stopAllSimulations();
              useModelStore.getState().setActionEdges([]);
              useModelStore.getState().setLocationNodes([]);
              useModelStore.getState().setEntityNodes([]);
              useModelStore.getState().setFilteredActionsSegment(null, null);
              useModelStore.getState().setHighlightedActionsSegment(null, null);
              useGlossaryStore.getState().reset();
            }}><FaTrashAlt /></Button>

            <div style={{ position: 'absolute', left: '50%', bottom: 20, transform: 'translateX(-50%)', display: 'flex', gap: '10px', background: 'white', padding: '10px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>
                {glossaryCharacters.length} characters · {glossaryEvents.length} events · {glossaryLocations.length} locations · {glossaryTerms.length} terms
              </span>
            </div>
          </div>

          <div
            onMouseDown={handleMouseDown}
            style={{
              height: '8px',
              background: isDragging ? '#667eea' : '#e5e7eb',
              cursor: 'ns-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: isDragging ? 'none' : 'background 0.2s',
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: '40px',
                height: '4px',
                background: isDragging ? 'white' : '#9ca3af',
                borderRadius: '2px',
                transition: 'background 0.2s',
              }}
            />
          </div>

          <div style={{ height: `${100 - topHeight}%`, display: 'flex', flexDirection: 'column' }}>
            <ReactFlowProvider><ActionTimeline /></ReactFlowProvider>
          </div>
        </div>

        <div style={{ width: '40%', background: 'white', borderLeft: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #ddd' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>Glossary</h2>
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startContent={<FaSearch />}
              size="sm"
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
              <Chip
                onClick={() => setGlossaryTab('characters')}
                color={glossaryTab === 'characters' ? 'secondary' : 'default'}
                variant={glossaryTab === 'characters' ? 'solid' : 'bordered'}
                style={{ cursor: 'pointer' }}
              >
                Characters ({glossaryCharacters.length})
              </Chip>
              <Chip
                onClick={() => setGlossaryTab('events')}
                color={glossaryTab === 'events' ? 'secondary' : 'default'}
                variant={glossaryTab === 'events' ? 'solid' : 'bordered'}
                style={{ cursor: 'pointer' }}
              >
                Events ({glossaryEvents.length})
              </Chip>
              <Chip
                onClick={() => setGlossaryTab('locations')}
                color={glossaryTab === 'locations' ? 'secondary' : 'default'}
                variant={glossaryTab === 'locations' ? 'solid' : 'bordered'}
                style={{ cursor: 'pointer' }}
              >
                Locations ({glossaryLocations.length})
              </Chip>
              <Chip
                onClick={() => setGlossaryTab('terms')}
                color={glossaryTab === 'terms' ? 'secondary' : 'default'}
                variant={glossaryTab === 'terms' ? 'solid' : 'bordered'}
                style={{ cursor: 'pointer' }}
              >
                Terms ({glossaryTerms.length})
              </Chip>
              <Chip
                onClick={() => setGlossaryTab('features')}
                color={glossaryTab === 'features' ? 'secondary' : 'default'}
                variant={glossaryTab === 'features' ? 'solid' : 'bordered'}
                style={{ cursor: 'pointer', paddingTop: '6px', paddingBottom: '6px', height: 'auto', minHeight: '32px' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                  <FiFeather style={{ marginRight: '4px' }} /> Story Features
                </span>
              </Chip>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {glossaryTab === 'characters' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {glossaryCharacters
                  .filter(char => char.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((char) => (
                    <Card
                      key={char.id}
                      isPressable
                      isHoverable
                      onClick={() => setEditingItem({ type: 'character', item: char })}
                      style={{ cursor: 'pointer' }}
                    >
                      <CardHeader>
                        <div>
                          <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>
                            {char.emoji} {char.name}
                          </h3>
                          {char.korean_name && (
                            <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
                              {char.korean_name}
                            </p>
                          )}
                        </div>
                      </CardHeader>
                      <Divider />
                      <CardBody>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                          {char.description}
                        </p>
                        {char.traits.length > 0 && (
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {char.traits.slice(0, 3).map((trait, idx) => (
                              <Chip key={idx} size="sm" variant="flat" color="secondary">
                                {trait}
                              </Chip>
                            ))}
                            {char.traits.length > 3 && (
                              <Chip size="sm" variant="flat">
                                +{char.traits.length - 3}
                              </Chip>
                            )}
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  ))}
              </div>
            )}

            {glossaryTab === 'events' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {glossaryEvents
                  .filter(event => event.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((event) => (
                    <Card
                      key={event.id}
                      isPressable
                      isHoverable
                      onClick={() => setEditingItem({ type: 'event', item: event })}
                      style={{ cursor: 'pointer' }}
                    >
                      <CardHeader>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'start' }}>
                          <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>
                            {event.name}
                          </h3>
                          <Chip
                            size="sm"
                            color={event.importance === 'major' ? 'secondary' : 'default'}
                            variant="flat"
                          >
                            {event.importance}
                          </Chip>
                        </div>
                      </CardHeader>
                      <Divider />
                      <CardBody>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                          {event.description}
                        </p>
                        {event.characters_involved.length > 0 && (
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {event.characters_involved.map((charName, idx) => (
                              <Chip key={idx} size="sm" variant="bordered">
                                {charName}
                              </Chip>
                            ))}
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  ))}
              </div>
            )}

            {glossaryTab === 'locations' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {glossaryLocations
                  .filter(loc => loc.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((loc) => (
                    <Card
                      key={loc.id}
                      isPressable
                      isHoverable
                      onClick={() => setEditingItem({ type: 'location', item: loc })}
                      style={{ cursor: 'pointer' }}
                    >
                      <CardHeader>
                        <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>
                          {loc.emoji} {loc.name}
                        </h3>
                      </CardHeader>
                      <Divider />
                      <CardBody>
                        <p style={{ fontSize: '14px', color: '#666' }}>
                          {loc.description}
                        </p>
                      </CardBody>
                    </Card>
                  ))}
              </div>
            )}

            {glossaryTab === 'terms' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                  <Button
                    size="sm"
                    color="secondary"
                    variant="flat"
                    startContent={<FaPlus />}
                    onPress={() => setEditingTerm({ original: '', translation: '', context: '', category: 'general', notes: '' })}
                  >
                    Add Term
                  </Button>
                </div>

                {editingTerm && (
                  <Card style={{ background: '#f0f9ff', border: '2px solid #667eea' }}>
                    <CardBody>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 style={{ fontWeight: 'bold', fontSize: '15px', margin: 0 }}>
                          {editingTerm.id ? 'Edit Term' : 'Add New Term'}
                        </h4>
                        <Input
                          label="Original (Korean)"
                          value={editingTerm.original}
                          onChange={(e) => setEditingTerm({ ...editingTerm, original: e.target.value })}
                          placeholder="e.g., 수능"
                          size="sm"
                        />
                        <Input
                          label="Translation"
                          value={editingTerm.translation}
                          onChange={(e) => setEditingTerm({ ...editingTerm, translation: e.target.value })}
                          placeholder="e.g., CSAT"
                          size="sm"
                        />
                        <Select
                          label="Category"
                          selectedKeys={[editingTerm.category]}
                          onChange={(e) => setEditingTerm({ ...editingTerm, category: e.target.value })}
                          size="sm"
                        >
                          <SelectItem key="general" value="general">General</SelectItem>
                          <SelectItem key="name" value="name">Name</SelectItem>
                          <SelectItem key="place" value="place">Place</SelectItem>
                          <SelectItem key="item" value="item">Item</SelectItem>
                          <SelectItem key="concept" value="concept">Concept</SelectItem>
                          <SelectItem key="martial_arts" value="martial_arts">Martial Arts</SelectItem>
                          <SelectItem key="cultural" value="cultural">Cultural</SelectItem>
                          <SelectItem key="technical" value="technical">Technical</SelectItem>
                          <SelectItem key="other" value="other">Other</SelectItem>
                        </Select>
                        <Textarea
                          label="Context"
                          value={editingTerm.context}
                          onChange={(e) => setEditingTerm({ ...editingTerm, context: e.target.value })}
                          placeholder="Context where this term appears"
                          minRows={2}
                          size="sm"
                        />
                        <Textarea
                          label="Notes"
                          value={editingTerm.notes}
                          onChange={(e) => setEditingTerm({ ...editingTerm, notes: e.target.value })}
                          placeholder="Translation notes or additional information"
                          minRows={2}
                          size="sm"
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                          <Button
                            size="sm"
                            variant="flat"
                            onPress={() => setEditingTerm(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            color="secondary"
                            onPress={() => {
                              if (editingTerm.original && editingTerm.translation) {
                                if (editingTerm.id) {
                                  updateTerm(editingTerm.id, {
                                    original: editingTerm.original,
                                    translation: editingTerm.translation,
                                    context: editingTerm.context,
                                    category: editingTerm.category as any,
                                    notes: editingTerm.notes
                                  });
                                } else {
                                  addTerm({
                                    id: `term_${Date.now()}`,
                                    original: editingTerm.original,
                                    translation: editingTerm.translation,
                                    context: editingTerm.context,
                                    category: editingTerm.category as any,
                                    notes: editingTerm.notes
                                  });
                                }
                                setEditingTerm(null);
                              }
                            }}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )}

                {glossaryTerms
                  .filter(term =>
                    term.original.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    term.translation.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((term) => (
                    <Card
                      key={term.id}
                      isPressable
                      isHoverable
                      style={{ cursor: 'pointer' }}
                    >
                      <CardHeader>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div style={{ flex: 1 }} onClick={() => setEditingItem({ type: 'term', item: term })}>
                            <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>
                              {term.original}
                            </h3>
                            <p style={{ fontSize: '14px', color: '#888', marginTop: '5px' }}>
                              → {term.translation}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            isIconOnly
                            variant="flat"
                            color="danger"
                            onPress={() => deleteTerm(term.id)}
                          >
                            <FiTrash />
                          </Button>
                        </div>
                      </CardHeader>
                      <Divider />
                      <CardBody onClick={() => setEditingItem({ type: 'term', item: term })}>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                          {term.context}
                        </p>
                        <Chip size="sm" variant="flat" color="secondary">
                          {term.category}
                        </Chip>
                      </CardBody>
                    </Card>
                  ))}
              </div>
            )}

            {glossaryTab === 'features' && <StoryFeaturesTab />}
          </div>
        </div>
      </div>

      {editingItem && (
        <GlossaryEditPanel
          type={editingItem.type}
          item={editingItem.item}
          onClose={() => setEditingItem(null)}
        />
      )}

      <Modal isOpen={isExportOpen} onClose={onExportClose} size="3xl">
        <ModalContent>
          <ModalHeader>Export Glossary</ModalHeader>
          <ModalBody>
            <Textarea
              value={jsonData}
              readOnly
              minRows={20}
              maxRows={30}
              style={{ fontFamily: 'monospace' }}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onExportClose}>
              Close
            </Button>
            <Button color="secondary" startContent={<FaDownload />} onPress={handleDownload}>
              Download JSON
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isImportOpen} onClose={onImportClose} size="3xl">
        <ModalContent>
          <ModalHeader>Import Glossary</ModalHeader>
          <ModalBody>
            <Textarea
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder="Paste your JSON here..."
              minRows={20}
              maxRows={30}
              style={{ fontFamily: 'monospace' }}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onImportClose}>
              Cancel
            </Button>
            <Button color="secondary" onPress={handleImport}>
              Import
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
