import { Button, Card, CardBody, CardHeader, Chip, Divider, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Tab, Tabs, Textarea, Tooltip, useDisclosure, Select, SelectItem } from '@nextui-org/react';
import { useKeyPress } from '@xyflow/react';
import React, { useEffect, useState } from 'react';
import { FaDownload, FaSearch, FaTrashAlt, FaUpload, FaPlus } from 'react-icons/fa';
import { FiFeather, FiTrash } from 'react-icons/fi';
import { IoSave } from 'react-icons/io5';
import { TbArrowBigRightLinesFilled } from 'react-icons/tb';
import { GlossaryCharacter, GlossaryTerm, useGlossaryStore, generateGlossaryString, restoreGlossarySnapshot, serializeGlossaryState } from '../model/GlossaryModel';
import { LayoutUtils } from '../model/LayoutUtils';
import { useModelStore } from '../model/Model';
import GlossaryEditPanel from './glossary/GlossaryEditPanel';
import ArcRelationshipGraph from './glossary/ArcRelationshipGraph';
import CharacterArcMatrix from './glossary/CharacterArcMatrix';
import { glossaryProjectStorage } from '../glossary/services/GlossaryProjectStorage';
import type { GlossaryProjectRecord } from '../glossary/types';
import { applyViewSnapshot, captureViewSnapshot } from '../glossary/utils/viewSnapshots';

function StoryFeaturesTab() {
  const storySummary = useGlossaryStore((state) => state.story_summary);
  const arcs = useGlossaryStore((state) => state.arcs);
  const styleGuide = useGlossaryStore((state) => state.style_guide);
  const honorifics = useGlossaryStore((state) => state.honorifics);
  const recurringPhrases = useGlossaryStore((state) => state.recurring_phrases);

  const updateStorySummary = useGlossaryStore((state) => state.updateStorySummary);
  const updateStyleGuide = useGlossaryStore((state) => state.updateStyleGuide);
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
      arcsCount: arcs?.length || 0,
      honorificsCount: Object.keys(honorifics || {}).length,
      recurringPhrasesCount: Object.keys(recurringPhrases || {}).length,
      styleGuide
    });
  }, [storySummary, arcs, honorifics, recurringPhrases, styleGuide]);

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
          <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Story Arcs Overview (스토리 아크 개요)</h3>
        </CardHeader>
        <Divider />
        <CardBody>
          {arcs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {arcs.map((arc, index) => (
                <Card key={arc.id} shadow="sm">
                  <CardBody>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                        <div style={{
                          minWidth: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#667eea',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}>
                          {index + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>{arc.name}</h4>
                          {arc.theme && <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#888' }}>Theme: {arc.theme}</p>}
                        </div>
                      </div>
                      <Chip size="sm" variant="flat">{arc.characters?.length || 0} characters</Chip>
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#666' }}>{arc.description}</p>
                    {arc.key_events && arc.key_events.length > 0 && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
                        <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Key Events:</p>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px' }}>
                          {arc.key_events.map((event, i) => (
                            <li key={i} style={{ marginBottom: '2px' }}>{event}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : (
            <p style={{ color: '#888', fontStyle: 'italic' }}>No story arcs extracted yet. Process text to extract arcs automatically.</p>
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
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    return localStorage.getItem('vsw.currentProjectId');
  });
  const previousProjectIdRef = React.useRef<string | null>(currentProjectId);
  const [glossaryTab, setGlossaryTab] = useState<'characters' | 'terms' | 'features' | 'arcs'>('characters');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArcFilter, setSelectedArcFilter] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ type: 'character' | 'event' | 'location' | 'term', item: any } | null>(null);
  const [editingTerm, setEditingTerm] = useState<{ id?: string; original: string; translation: string; context: string; category: string; notes: string } | null>(null);
  const escapePressed = useKeyPress(['Escape']);
  const { isOpen: isExportOpen, onOpen: onExportOpen, onClose: onExportClose } = useDisclosure();
  const { isOpen: isImportOpen, onOpen: onImportOpen, onClose: onImportClose } = useDisclosure();
  const [jsonData, setJsonData] = useState('');
  const [compactData, setCompactData] = useState('');
  const [exportTab, setExportTab] = useState<'json' | 'compact'>('compact');
  const [topHeight, setTopHeight] = useState(70);
  const [isReconsolidating, setIsReconsolidating] = useState(false);

  // Download State
  const { isOpen: isDownloadModalOpen, onOpen: onDownloadModalOpen, onClose: onDownloadModalClose } = useDisclosure();
  const [downloadFilename, setDownloadFilename] = useState('glossary_compact.txt');

  const visualPanelRef = React.createRef<HTMLDivElement>();

  const glossaryArcs = useGlossaryStore(state => state.arcs);
  const storySummary = useGlossaryStore(state => state.story_summary);
  const honorifics = useGlossaryStore(state => state.honorifics);
  const recurringPhrases = useGlossaryStore(state => state.recurring_phrases);
  const styleGuide = useGlossaryStore(state => state.style_guide);
  const targetLanguage = useGlossaryStore(state => state.target_language);
  const fullText = useGlossaryStore(state => state.fullText);
  const rawChunks = useGlossaryStore(state => state.raw_chunks);
  const convertToModelFormat = useGlossaryStore(state => state.convertToModelFormat);
  const exportToJSON = useGlossaryStore(state => state.exportToJSON);
  const importFromJSON = useGlossaryStore(state => state.importFromJSON);
  const isGlossaryLoading = useGlossaryStore(state => state.isLoading);
  const processedChunks = useGlossaryStore(state => state.processedChunks);
  const totalChunks = useGlossaryStore(state => state.totalChunks);

  const [projectMeta, setProjectMeta] = useState<{ name?: string; status?: string; processedChunks?: number; totalChunks?: number } | null>(null);

  // Extract all data from arcs - merge character info from all appearances
  const glossaryCharacters = React.useMemo(() => {
    const characterMap = new Map<string, GlossaryCharacter>();

    console.log(`🔍 Processing ${glossaryArcs.length} arcs for characters...`);
    glossaryArcs.forEach((arc, idx) => {
      console.log(`   Arc ${idx}: ${arc.name} - ${arc.characters?.length || 0} characters`);
      (arc.characters || []).forEach(char => {
        if (!char.name) {
          console.warn(`     ⚠️ Character without name in arc ${arc.name}`);
          return;
        }

        // Use name (+ korean_name if available) as unique key
        const englishName = (char.name || '').toLowerCase().trim();
        const koreanName = (char.korean_name || '').toLowerCase().trim();
        const uniqueKey = koreanName ? `${englishName}|${koreanName}` : englishName;

        const existing = characterMap.get(uniqueKey);
        if (existing) {
          // Merge: take the most complete information
          console.log(`     🔄 Merging character: ${char.name}`);
          characterMap.set(uniqueKey, {
            ...existing,
            // Take longest/most complete fields
            description: (char.description?.length || 0) > (existing.description?.length || 0) ? char.description : existing.description,
            speech_style: (char.speech_style?.length || 0) > (existing.speech_style?.length || 0) ? char.speech_style : existing.speech_style,
            physical_appearance: (char.physical_appearance?.length || 0) > (existing.physical_appearance?.length || 0) ? char.physical_appearance : existing.physical_appearance,
            personality: (char.personality?.length || 0) > (existing.personality?.length || 0) ? char.personality : existing.personality,
            // Merge arrays
            traits: [...new Set([...(existing.traits || []), ...(char.traits || [])])],
            abilities: [...new Set([...(existing.abilities || []), ...(char.abilities || [])])],
            name_variants: { ...(existing.name_variants || {}), ...(char.name_variants || {}) },
            // Use first non-empty values
            age: char.age || existing.age,
            gender: char.gender || existing.gender,
            occupation: char.occupation || existing.occupation,
            // Keep most important role
            role: (char.role === 'protagonist' || existing.role === 'protagonist') ? 'protagonist' :
              (char.role === 'antagonist' || existing.role === 'antagonist') ? 'antagonist' :
                (char.role === 'major' || existing.role === 'major') ? 'major' :
                  (existing.role || char.role),
          });
        } else {
          console.log(`     ✅ Adding character: ${char.name} (${char.korean_name || 'no korean name'})`);
          characterMap.set(uniqueKey, char);
        }
      });
    });

    const chars = Array.from(characterMap.values());
    console.log(`📊 Extracted ${chars.length} unique characters from ${glossaryArcs.length} arcs`);
    chars.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.name} (${c.korean_name || 'no korean'}) - Role: ${c.role}`);
    });
    return chars;
  }, [glossaryArcs]);

  // Events removed - not used in translation glossary
  // Locations removed - not needed for translation glossary

  const glossaryTerms = React.useMemo(() => {
    const terms: GlossaryTerm[] = [];
    const seenIds = new Set<string>();

    glossaryArcs.forEach(arc => {
      (arc.terms || []).forEach(term => {
        // Ensure term has an id and valid category
        const category = term.category as 'name' | 'place' | 'item' | 'concept' | 'cultural' | 'other' | undefined;
        const termWithId: GlossaryTerm = {
          id: (term as any).id || `term-${term.original}-${Date.now()}-${Math.random()}`,
          original: term.original,
          translation: term.translation,
          context: term.context,
          category: category || 'other',
        };

        if (!seenIds.has(termWithId.id)) {
          terms.push(termWithId);
          seenIds.add(termWithId.id);
        }
      });
    });
    return terms;
  }, [glossaryArcs]);

  // Filter characters and events by arc
  const filteredCharacters = selectedArcFilter
    ? (() => {
      const arc = glossaryArcs.find(a => a.id === selectedArcFilter);
      return arc ? (arc.characters || []) : [];
    })()
    : glossaryCharacters;

  // filteredEvents removed - Events tab not used

  const setEntityNodes = useModelStore(state => state.setEntityNodes);
  const setActionEdges = useModelStore(state => state.setActionEdges);
  const setLocationNodes = useModelStore(state => state.setLocationNodes);

  // Monitor currentProjectId changes in localStorage
  useEffect(() => {
    const checkProjectId = setInterval(() => {
      const storedId = localStorage.getItem('vsw.currentProjectId');
      if (storedId !== currentProjectId) {
        console.log(`🔄 Project ID changed: ${currentProjectId} -> ${storedId}`);
        setCurrentProjectId(storedId);
      }
    }, 500);

    return () => clearInterval(checkProjectId);
  }, [currentProjectId]);

  const loadFromLegacyLocalStorage = (projectId: string) => {
    try {
      const raw = localStorage.getItem('vsw.projects') || '[]';
      const arr = JSON.parse(raw);
      const project = arr.find((p: any) => p.id === projectId);
      if (project && project.glossary) {
        const glossaryData = project.glossary;
        useGlossaryStore.setState({
          arcs: JSON.parse(JSON.stringify(glossaryData.arcs || [])),
          fullText: glossaryData.fullText || '',
          story_summary: JSON.parse(JSON.stringify(glossaryData.story_summary || { logline: '', blurb: '' })),
          honorifics: JSON.parse(JSON.stringify(glossaryData.honorifics || {})),
          recurring_phrases: JSON.parse(JSON.stringify(glossaryData.recurring_phrases || {})),
          style_guide: JSON.parse(JSON.stringify(glossaryData.style_guide || useGlossaryStore.getState().style_guide)),
          target_language: glossaryData.target_language || 'en',
          raw_chunks: JSON.parse(JSON.stringify(glossaryData.raw_chunks || [])),
          isLoading: false,
        });
        setProjectMeta({
          name: project.name,
          status: 'ready',
        });
        return true;
      }
    } catch (e) {
      console.warn('[GlossaryBuilder] Legacy localStorage load failed:', e);
    }
    return false;
  };

  const saveToGlossaryStorage = async (projectId: string) => {
    const existing = await glossaryProjectStorage.getProject(projectId);
    const snapshot = serializeGlossaryState(useGlossaryStore.getState());
    const view = captureViewSnapshot();
    const record: GlossaryProjectRecord = {
      id: projectId,
      name: existing?.name || projectMeta?.name || `Glossary Project ${new Date().toLocaleString()}`,
      updatedAt: Date.now(),
      glossary: snapshot,
      view,
      status: (existing?.status || projectMeta?.status || 'ready') as any,
      totalChunks: existing?.totalChunks ?? projectMeta?.totalChunks,
      processedChunks: existing?.processedChunks ?? projectMeta?.processedChunks,
    };
    await glossaryProjectStorage.saveProject(record);
    setProjectMeta({
      name: record.name,
      status: record.status,
      totalChunks: record.totalChunks,
      processedChunks: record.processedChunks,
    });
  };

  // Load project data when currentProjectId changes
  useEffect(() => {
    if (!currentProjectId) {
      console.log('⚠️ No project ID found');
      return;
    }

    const previousProjectId = previousProjectIdRef.current;
    const isProjectChanged = previousProjectId !== currentProjectId;

    console.log(`🔄 Loading project: ${currentProjectId}`, {
      previousProject: previousProjectId,
      isProjectChanged,
    });

    // Only reset if project actually changed (not on initial load or same project)
    if (isProjectChanged && previousProjectId !== null) {
      console.log('🧹 Resetting glossary store (project changed)...');

      // Save current project before switching
      try {
        if (previousProjectId) {
          const raw = localStorage.getItem('vsw.projects') || '[]';
          const arr = JSON.parse(raw);
          const prevProjectIndex = arr.findIndex((p: any) => p.id === previousProjectId);

          if (prevProjectIndex >= 0) {
            const glossaryState = useGlossaryStore.getState();
            const glossarySnapshot = {
              arcs: JSON.parse(JSON.stringify(glossaryState.arcs)),
              fullText: glossaryState.fullText,
              story_summary: JSON.parse(JSON.stringify(glossaryState.story_summary)),
              honorifics: JSON.parse(JSON.stringify(glossaryState.honorifics)),
              recurring_phrases: JSON.parse(JSON.stringify(glossaryState.recurring_phrases)),
              style_guide: JSON.parse(JSON.stringify(glossaryState.style_guide)),
              target_language: glossaryState.target_language,
            };

            arr[prevProjectIndex] = {
              ...arr[prevProjectIndex],
              updatedAt: Date.now(),
              glossary: glossarySnapshot,
            };
            localStorage.setItem('vsw.projects', JSON.stringify(arr));
            console.log(`💾 Saved previous project: ${previousProjectId} (${glossaryState.arcs.length} arcs)`);
          }
        }
      } catch (error) {
        console.error('Failed to save previous project:', error);
      }

      // Reset glossary store
      useGlossaryStore.setState({
        arcs: [],
        fullText: '',
        story_summary: { logline: '', blurb: '' },
        honorifics: {},
        recurring_phrases: {},
        style_guide: {
          name_format: 'english_given_name english_surname',
          tone: 'Standard',
          formality_level: 'medium',
          themes: [],
          genre: 'Web Novel',
          sub_genres: [],
          content_rating: 'Teen',
          honorific_usage: 'Keep Korean honorifics with explanation on first use',
          formal_speech_level: 'Match English formality to Korean speech level',
          dialogue_style: 'natural',
          narrative_style: {
            point_of_view: 'third-person',
            tense: 'past',
            voice: 'neutral',
            common_expressions: [],
            atmosphere_descriptors: []
          }
        },
        target_language: 'en',
        isLoading: false,
      });
    }

    // Load new project data (Primary: IndexedDB glossaryProjectStorage; fallback: legacy localStorage)
    (async () => {
      try {
        const record = await glossaryProjectStorage.getProject(currentProjectId);
        if (record?.glossary) {
          // Avoid clobbering live data when staying on same project and not loading.
          const currentState = useGlossaryStore.getState();
          const hasCurrentData = currentState.arcs.length > 0 || (currentState.raw_chunks?.length || 0) > 0;
          if (!isProjectChanged && hasCurrentData && !currentState.isLoading) {
            previousProjectIdRef.current = currentProjectId;
            setProjectMeta({
              name: record.name,
              status: record.status,
              totalChunks: record.totalChunks,
              processedChunks: record.processedChunks,
            });
            applyViewSnapshot(record.view);
            return;
          }

          restoreGlossarySnapshot(record.glossary, {
            fullTextFallback: record.glossary.fullText || '',
          });
          applyViewSnapshot(record.view);
          setProjectMeta({
            name: record.name,
            status: record.status,
            totalChunks: record.totalChunks,
            processedChunks: record.processedChunks,
          });
          return;
        }

        // Legacy fallback
        const ok = loadFromLegacyLocalStorage(currentProjectId);
        if (!ok) {
          console.log(`ℹ️ No glossary data found for project ${currentProjectId}`);
        }
      } catch (error) {
        console.error('Failed to load project:', error);
        loadFromLegacyLocalStorage(currentProjectId);
      } finally {
        previousProjectIdRef.current = currentProjectId;
      }
    })();
  }, [currentProjectId]);

  // Auto-select first arc when arcs are loaded
  useEffect(() => {
    if (glossaryArcs.length > 0 && !selectedArcFilter) {
      setSelectedArcFilter(glossaryArcs[0].id);
      console.log(`🎯 Auto-selected first arc for visualization: ${glossaryArcs[0].name}`);
    }
  }, [glossaryArcs, selectedArcFilter]);

  useEffect(() => {
    if (glossaryCharacters.length > 0 &&
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
  }, [glossaryCharacters]);

  useEffect(() => {
    if (escapePressed) {
      useModelStore.getState().setSelectedNodes([]);
      useModelStore.getState().setSelectedEdges([]);
      useModelStore.getState().setFilteredActionsSegment(null, null);
    }
  }, [escapePressed]);

  // Auto-save on glossary changes
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      try {
        if (!currentProjectId) {
          console.log('⏸️ Skipping auto-save: no project selected');
          return;
        }

        const glossaryState = useGlossaryStore.getState();
        // Don't save if currently loading (extraction in progress)
        if (glossaryState.isLoading) {
          console.log('⏸️ Skipping auto-save: extraction in progress');
          return;
        }

        saveToGlossaryStorage(currentProjectId).catch((e) => {
          console.error('❌ Auto-save failed (glossaryProjectStorage):', e);
        });
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
      }
    }, 3000); // Debounce for 3 seconds to avoid conflicts with manual editing

    return () => clearTimeout(saveTimer);
  }, [
    currentProjectId,
    glossaryArcs,
    storySummary,
    honorifics,
    recurringPhrases,
    styleGuide,
    targetLanguage,
    fullText,
    rawChunks
  ]);

  const handleExport = () => {
    const json = exportToJSON();
    setJsonData(json);

    // Generate compact string
    const state = useGlossaryStore.getState();
    const compact = generateGlossaryString(state);
    setCompactData(compact);

    onExportOpen();
  };

  const handleDownloadClick = () => {
    // Set default filename based on export tab
    const defaultFilename = exportTab === 'compact' ? 'glossary_compact.txt' : 'glossary.json';
    setDownloadFilename(defaultFilename);
    onDownloadModalOpen();
  };

  const handleDownloadConfirm = () => {
    if (exportTab === 'compact') {
      const blob = new Blob([compactData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFilename;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFilename;
      a.click();
      URL.revokeObjectURL(url);
    }
    onDownloadModalClose();
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

  const handleReconsolidateFromRaw = async () => {
    if (isReconsolidating) return;

    const state = useGlossaryStore.getState();
    if (!state.raw_chunks || state.raw_chunks.length === 0) {
      console.warn('No raw chunks available for reconsolidation');
      return;
    }

    // Prevent reconsolidation before all chunks finish to avoid partial results.
    if ((state.totalChunks || 0) > 0 && (state.processedChunks || 0) < (state.totalChunks || 0)) {
      console.warn('Re-consolidation blocked: chunks still processing');
      return;
    }

    setIsReconsolidating(true);
    try {
      console.log('🔄 Re-consolidating from stored raw chunks (LLM-only, no re-extraction)...');
          await state.consolidateResults();

      const updatedArcs = useGlossaryStore.getState().arcs;
      if (updatedArcs.length > 0) {
        setSelectedArcFilter(updatedArcs[0].id);
      }
      setGlossaryTab('characters');

      console.log('✅ Re-consolidation from raw chunks completed');
    } catch (error) {
      console.error('Failed to reconsolidate from raw chunks', error);
    } finally {
      setIsReconsolidating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: 'white', borderBottom: '1px solid #ddd' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
          Glossary Builder
          {projectMeta?.name ? (
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#666', marginLeft: '10px' }}>
              — {projectMeta.name}
              {(projectMeta.status === 'processing' || isGlossaryLoading) && (
                <span style={{ marginLeft: '8px', color: '#2563eb' }}>
                  (Processing {(projectMeta.processedChunks ?? processedChunks)}/{((projectMeta.totalChunks ?? totalChunks) || '?')}, raw {rawChunks.length})
                </span>
              )}
            </span>
          ) : null}
        </h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button size="sm" variant="bordered" onClick={() => {
            try {
              if (!currentProjectId) {
                console.error('No project ID found');
                return;
              }
              saveToGlossaryStorage(currentProjectId)
                .then(() => console.log(`💾 Manually saved project (IDB): ${currentProjectId}`))
                .catch((e) => console.error('Failed to save project:', e));
            } catch (error) {
              console.error('Failed to save project:', error);
            }
          }}>Save</Button>
          <Button size="sm" variant="flat" onClick={() => { window.location.hash = '/'; }}>← Back to Home</Button>
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
          {glossaryArcs.length === 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              padding: '40px',
              textAlign: 'center',
              color: '#999',
              background: '#F9FAFB'
            }}>
              <div>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔗</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>No Arcs Yet</div>
                <div style={{ fontSize: '14px' }}>
                  Process text to extract story arcs and character relationships
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Top: Arc Relationships Graph */}
              <div style={{ width: '100%', height: `${topHeight}%`, background: '#F3F4F6', position: 'relative', display: 'flex', flexDirection: 'column' }} ref={visualPanelRef}>
                {/* Arc Selection Bar */}
                <div style={{
                  padding: '12px 16px',
                  background: 'white',
                  borderBottom: '2px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexShrink: 0
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#667eea', whiteSpace: 'nowrap' }}>
                    📖 Arc:
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1, overflowY: 'auto', maxHeight: '60px' }}>
                    {glossaryArcs.map((arc, idx) => (
                      <Chip
                        key={arc.id}
                        onClick={() => setSelectedArcFilter(arc.id)}
                        color={selectedArcFilter === arc.id ? 'secondary' : 'default'}
                        variant={selectedArcFilter === arc.id ? 'solid' : 'bordered'}
                        size="sm"
                        style={{ cursor: 'pointer', fontSize: '11px' }}
                      >
                        {idx + 1}. {arc.name.length > 20 ? arc.name.substring(0, 20) + '...' : arc.name}
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* Arc Relationships Graph */}
                <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                  {selectedArcFilter && (() => {
                    const selectedArc = glossaryArcs.find(a => a.id === selectedArcFilter);
                    return selectedArc ? (
                      <ArcRelationshipGraph
                        arc={selectedArc}
                        characters={glossaryCharacters}
                      />
                    ) : null;
                  })()}
                  {!selectedArcFilter && (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#999', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                        Select an Arc
                      </div>
                      <div style={{ fontSize: '13px' }}>
                        Choose an arc above to see interactive relationship graph
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Resizer */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startY = e.clientY;
                  const startTopHeight = topHeight;

                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const container = document.getElementById('visual-container');
                    if (!container) return;
                    const rect = container.getBoundingClientRect();
                    const deltaY = moveEvent.clientY - startY;
                    const deltaPercent = (deltaY / rect.height) * 100;
                    const newTopHeight = startTopHeight + deltaPercent;
                    setTopHeight(Math.min(Math.max(newTopHeight, 30), 70));
                  };

                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };

                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
                style={{
                  height: '8px',
                  background: '#e5e7eb',
                  cursor: 'ns-resize',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                  zIndex: 10
                }}
              >
                <div style={{
                  width: '40px',
                  height: '4px',
                  background: '#9ca3af',
                  borderRadius: '2px',
                }} />
              </div>

              {/* Bottom: Character Arc Matrix */}
              <div style={{ height: `${100 - topHeight}%`, overflow: 'auto', background: '#F9FAFB' }}>
                <CharacterArcMatrix
                  arcs={glossaryArcs}
                  characters={glossaryCharacters}
                  onArcSelect={(arcId) => setSelectedArcFilter(arcId)}
                  onCharacterSelect={(charId) => {
                    const char = glossaryCharacters.find(c => c.id === charId);
                    if (char) {
                      setEditingItem({ type: 'character', item: char });
                    }
                  }}
                />
              </div>
            </>
          )}

          {/* Reset Button - Top Right */}
          {glossaryArcs.length > 0 && (
            <>
              <Button
                style={{ position: 'absolute', right: 10, top: 10, fontSize: 18, zIndex: 100 }}
                isIconOnly
                onClick={() => {
                  LayoutUtils.stopAllSimulations();
                  useModelStore.getState().setActionEdges([]);
                  useModelStore.getState().setLocationNodes([]);
                  useModelStore.getState().setEntityNodes([]);
                  useModelStore.getState().setFilteredActionsSegment(null, null);
                  useModelStore.getState().setHighlightedActionsSegment(null, null);
                  useGlossaryStore.getState().reset();
                }}
              >
                <FaTrashAlt />
              </Button>

              <div style={{ position: 'absolute', left: '50%', bottom: 20, transform: 'translateX(-50%)', display: 'flex', gap: '10px', background: 'white', padding: '10px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 100 }}>
                <span style={{ fontSize: '14px', color: '#666' }}>
                  {glossaryArcs.length} arcs · {glossaryCharacters.length} characters · {glossaryTerms.length} terms
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right Panel - Glossary Editor */}
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

            <Card style={{ marginTop: '12px', background: '#f8fafc' }}>
              <CardBody style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                  Raw Chunk Status
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: '#475569' }}>
                  <Chip size="sm" variant="flat" color="secondary">
                    Raw {rawChunks.length} chunks
                  </Chip>
                  <Chip size="sm" variant="flat" color="primary">
                    Processed {processedChunks}/{totalChunks || '?'}
                  </Chip>
                </div>
                <Button
                  size="sm"
                  color="secondary"
                  variant="flat"
                  startContent={<TbArrowBigRightLinesFilled />}
                  isDisabled={
                    isGlossaryLoading ||
                    isReconsolidating ||
                    rawChunks.length === 0 ||
                    ((totalChunks || 0) > 0 && (processedChunks || 0) < (totalChunks || 0))
                  }
                  onPress={handleReconsolidateFromRaw}
                >
                  Re-consolidate from raw chunks (LLM)
                </Button>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  모든 chunk 추출이 끝난 후 LLM 기반 consolidate만 다시 실행합니다. 재추출 없이 저장된 raw 데이터로만 갱신합니다.
                </div>
              </CardBody>
            </Card>

            {/* Arc Filter */}
            {glossaryArcs.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#666' }}>
                  Filter by Arc:
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Chip
                    onClick={() => setSelectedArcFilter(null)}
                    color={!selectedArcFilter ? 'primary' : 'default'}
                    variant={!selectedArcFilter ? 'solid' : 'bordered'}
                    size="sm"
                    style={{ cursor: 'pointer' }}
                  >
                    All
                  </Chip>
                  {glossaryArcs.map((arc) => (
                    <Chip
                      key={arc.id}
                      onClick={() => setSelectedArcFilter(arc.id)}
                      color={selectedArcFilter === arc.id ? 'primary' : 'default'}
                      variant={selectedArcFilter === arc.id ? 'solid' : 'bordered'}
                      size="sm"
                      style={{ cursor: 'pointer' }}
                    >
                      {arc.name}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
              <Chip
                onClick={() => setGlossaryTab('characters')}
                color={glossaryTab === 'characters' ? 'secondary' : 'default'}
                variant={glossaryTab === 'characters' ? 'solid' : 'bordered'}
                style={{ cursor: 'pointer' }}
              >
                Characters ({filteredCharacters.length})
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
                onClick={() => setGlossaryTab('arcs')}
                color={glossaryTab === 'arcs' ? 'secondary' : 'default'}
                variant={glossaryTab === 'arcs' ? 'solid' : 'bordered'}
                style={{ cursor: 'pointer' }}
              >
                Arcs ({glossaryArcs.length})
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
                {filteredCharacters.length === 0 ? (
                  <div style={{
                    padding: '60px 20px',
                    textAlign: 'center',
                    color: '#999',
                    background: '#f9fafb',
                    borderRadius: '12px'
                  }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>👥</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
                      No Characters Found
                    </div>
                    <div style={{ fontSize: '14px', marginBottom: '20px' }}>
                      {glossaryArcs.length === 0
                        ? 'Extract glossary from text to see characters'
                        : selectedArcFilter
                          ? 'No characters in this arc'
                          : 'Characters will appear here once extracted'}
                    </div>
                    {glossaryArcs.length > 0 && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        💡 Tip: Check if arcs contain character data in the Arcs tab
                      </div>
                    )}
                  </div>
                ) : (
                  filteredCharacters
                    .filter(char => {
                      const name = (char.name || '').toLowerCase();
                      const query = (searchQuery || '').toLowerCase();
                      return name.includes(query);
                    })
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
                              <p style={{ fontSize: '14px', color: '#888', margin: '2px 0 0 0' }}>
                                {char.korean_name}
                              </p>
                            )}
                            {char.age && (
                              <p style={{ fontSize: '13px', color: '#667eea', margin: '4px 0 0 0', fontWeight: '500' }}>
                                연령: {char.age}
                              </p>
                            )}
                          </div>
                        </CardHeader>
                        <Divider />
                        <CardBody>
                          {char.speech_style && (
                            <div style={{ marginBottom: '10px', padding: '8px', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                              <div style={{ fontSize: '11px', color: '#667eea', fontWeight: 'bold', marginBottom: '4px' }}>
                                💬 말투 특징
                              </div>
                              <div style={{ fontSize: '13px', color: '#555' }}>
                                {char.speech_style}
                              </div>
                            </div>
                          )}
                          {char.physical_appearance && (
                            <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                              <span style={{ fontWeight: 'bold', color: '#888' }}>외형:</span> {char.physical_appearance}
                            </p>
                          )}
                          <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                            {char.description}
                          </p>
                          {char.name_variants && Object.keys(char.name_variants).length > 0 && (
                            <div style={{ marginBottom: '10px' }}>
                              <div style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', marginBottom: '4px' }}>
                                호칭/별명:
                              </div>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {Object.entries(char.name_variants).map(([, value], idx) => (
                                  <Chip key={idx} size="sm" variant="bordered" color="primary" style={{ fontSize: '11px' }}>
                                    {value}
                                  </Chip>
                                ))}
                              </div>
                            </div>
                          )}
                          {char.traits && char.traits.length > 0 && (
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
                    ))
                )}
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
                              // Note: Term editing is now managed within arcs
                              console.warn('Term editing is deprecated - terms should be managed within arcs');
                              setEditingTerm(null);
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
                  .filter(term => {
                    const o = (term.original || '').toLowerCase();
                    const t = (term.translation || '').toLowerCase();
                    const q = (searchQuery || '').toLowerCase();
                    return o.includes(q) || t.includes(q);
                  })
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
                            onPress={() => {
                              // Note: Term deletion is now managed within arcs
                              console.warn('Term deletion is deprecated - terms should be managed within arcs');
                            }}
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

            {glossaryTab === 'arcs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {glossaryArcs.length === 0 ? (
                  <p style={{ color: '#888', fontStyle: 'italic' }}>
                    No arcs extracted yet. Arcs will be automatically detected during glossary extraction.
                  </p>
                ) : (
                  glossaryArcs.map((arc, index) => (
                    <Card key={arc.id} style={{ background: '#f9fafb' }}>
                      <CardHeader>
                        <div style={{ width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                            <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0, color: '#667eea' }}>
                              Arc {index + 1}: {arc.name}
                            </h3>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {arc.theme && (
                                <Chip size="sm" color="secondary" variant="bordered">
                                  {arc.theme}
                                </Chip>
                              )}
                              <Chip size="sm" color="primary" variant="flat">
                                Chunks {arc.start_chunk !== undefined ? arc.start_chunk : '?'} - {arc.end_chunk !== undefined ? arc.end_chunk : '?'}
                              </Chip>
                            </div>
                          </div>
                          <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                            {arc.description}
                          </p>
                        </div>
                      </CardHeader>
                      <Divider />
                      <CardBody>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {arc.characters && arc.characters.length > 0 && (
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', marginBottom: '6px' }}>
                                Characters ({arc.characters.length})
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {arc.characters.map((arcChar, idx) => {
                                  const charName = typeof arcChar === 'string' ? arcChar : arcChar.name;
                                  const role = typeof arcChar === 'string' ? '' : (arcChar as any).role || '';
                                  return (
                                    <Chip
                                      key={idx}
                                      size="sm"
                                      variant="flat"
                                      color="secondary"
                                      title={role || undefined}
                                    >
                                      {charName} {role && `(${role})`}
                                    </Chip>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', marginBottom: '6px' }}>
                              Relationships ({arc.relationships?.length || 0})
                            </div>
                            {arc.relationships && arc.relationships.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {arc.relationships.map((rel, idx) => (
                                  <div key={idx} style={{ fontSize: '12px', color: '#555', padding: '8px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                      <span style={{ fontWeight: 'bold', color: '#333' }}>{rel.character_a}</span>
                                      <span style={{ fontSize: '16px' }}>
                                        {rel.sentiment === 'positive' ? '↔️' : rel.sentiment === 'negative' ? '⚔️' : '—'}
                                      </span>
                                      <span style={{ fontWeight: 'bold', color: '#333' }}>{rel.character_b}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '8px' }}>
                                      <div style={{ fontSize: '11px' }}>
                                        <span style={{ color: '#888', fontWeight: '600' }}>유형:</span>
                                        <span style={{ marginLeft: '6px', color: '#555' }}>{rel.relationship_type}</span>
                                      </div>
                                      {rel.addressing && (
                                        <div style={{ fontSize: '11px' }}>
                                          <span style={{ color: '#888', fontWeight: '600' }}>호칭:</span>
                                          <span style={{ marginLeft: '6px', color: '#667eea', fontWeight: 'bold' }}>"{rel.addressing}"</span>
                                        </div>
                                      )}
                                      {rel.description && (
                                        <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', marginTop: '2px' }}>
                                          {rel.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', padding: '8px', background: '#f9fafb', borderRadius: '6px' }}>
                                No relationships extracted for this arc
                              </div>
                            )}
                          </div>

                          {arc.key_events && arc.key_events.length > 0 && (
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', marginBottom: '6px' }}>
                                Key Events ({arc.key_events.length})
                              </div>
                              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#555' }}>
                                {arc.key_events.map((event, idx) => (
                                  <li key={idx} style={{ marginBottom: '4px' }}>{event}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {arc.background_changes && arc.background_changes.length > 0 && (
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', marginBottom: '6px' }}>
                                Background Changes ({arc.background_changes.length})
                              </div>
                              <div style={{ fontSize: '12px', color: '#555' }}>
                                {arc.background_changes.join(' • ')}
                              </div>
                            </div>
                          )}

                          {arc.terms && arc.terms.length > 0 && (
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', marginBottom: '6px' }}>
                                Translation Terms ({arc.terms.length})
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {arc.terms.slice(0, 5).map((term, idx) => (
                                  <div key={idx} style={{ fontSize: '11px', padding: '4px 8px', background: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                                    <span style={{ fontWeight: 'bold', color: '#667eea' }}>{term.original}</span>
                                    {' → '}
                                    <span style={{ color: '#555' }}>{term.translation}</span>
                                    {term.category && (
                                      <span style={{ marginLeft: '6px', fontSize: '10px', color: '#888', fontStyle: 'italic' }}>
                                        ({term.category})
                                      </span>
                                    )}
                                  </div>
                                ))}
                                {arc.terms.length > 5 && (
                                  <div style={{ fontSize: '10px', color: '#888', fontStyle: 'italic', paddingLeft: '8px' }}>
                                    +{arc.terms.length - 5} more terms
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  ))
                )}
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
            <Tabs
              selectedKey={exportTab}
              onSelectionChange={(key) => setExportTab(key as 'json' | 'compact')}
            >
              <Tab key="compact" title="Compact Format (For LLM)">
                <Textarea
                  value={compactData}
                  readOnly
                  minRows={20}
                  maxRows={30}
                  style={{ fontFamily: 'monospace' }}
                />
              </Tab>
              <Tab key="json" title="JSON Data">
                <Textarea
                  value={jsonData}
                  readOnly
                  minRows={20}
                  maxRows={30}
                  style={{ fontFamily: 'monospace' }}
                />
              </Tab>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onExportClose}>
              Close
            </Button>
            <Button color="secondary" startContent={<FaDownload />} onPress={handleDownloadClick}>
              Download
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

      {/* Download Filename Modal */}
      <Modal
        isOpen={isDownloadModalOpen}
        onClose={onDownloadModalClose}
        classNames={{
          wrapper: "z-[99999]",
          backdrop: "z-[99998]"
        }}
      >
        <ModalContent>
          <ModalHeader>Download Glossary</ModalHeader>
          <ModalBody>
            <Input
              label="Filename"
              value={downloadFilename}
              onValueChange={setDownloadFilename}
              placeholder="Enter filename"
              autoFocus
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onDownloadModalClose}>
              Cancel
            </Button>
            <Button color="primary" onPress={handleDownloadConfirm}>
              Download
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
