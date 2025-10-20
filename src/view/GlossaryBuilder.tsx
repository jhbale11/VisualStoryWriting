import { Button, Card, CardBody, CardHeader, Chip, Divider, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Tab, Tabs, Textarea, Tooltip, useDisclosure } from '@nextui-org/react';
import { ReactFlowProvider, useKeyPress } from '@xyflow/react';
import React, { useEffect, useState } from 'react';
import { FaBook, FaDownload, FaSearch, FaTrashAlt, FaUpload } from 'react-icons/fa';
import { FaLocationDot } from 'react-icons/fa6';
import { IoPersonCircle, IoSave } from 'react-icons/io5';
import { TbArrowBigRightLinesFilled } from 'react-icons/tb';
import { GlossaryCharacter, GlossaryEvent, GlossaryLocation, GlossaryTerm, useGlossaryStore } from '../model/GlossaryModel';
import { LayoutUtils } from '../model/LayoutUtils';
import { useModelStore } from '../model/Model';
import ActionTimeline from './actionTimeline/ActionTimeline';
import EntitiesEditor from './entityActionView/EntitiesEditor';
import GlossaryEditPanel from './glossary/GlossaryEditPanel';
import LocationsEditor from './locationView/LocationsEditor';

export default function GlossaryBuilder() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedTab, setSelectedTab] = useState('entities');
  const [glossaryTab, setGlossaryTab] = useState<'characters' | 'events' | 'locations' | 'terms'>('characters');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<{ type: 'character' | 'event' | 'location' | 'term', item: any } | null>(null);
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
  const convertToModelFormat = useGlossaryStore(state => state.convertToModelFormat);
  const exportToJSON = useGlossaryStore(state => state.exportToJSON);
  const importFromJSON = useGlossaryStore(state => state.importFromJSON);

  const setEntityNodes = useModelStore(state => state.setEntityNodes);
  const setActionEdges = useModelStore(state => state.setActionEdges);
  const setLocationNodes = useModelStore(state => state.setLocationNodes);

  useEffect(() => {
    if (glossaryCharacters.length > 0 || glossaryEvents.length > 0) {
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
              <Tab key={'terms'} title={<span style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', fontSize: 15 }}><FaBook style={{ marginRight: 3, fontSize: 18 }} /> Terms Dictionary</span>} />
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

          <div style={{ height: `${100 - topHeight}%` }}>
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
                      onClick={() => setEditingItem({ type: 'term', item: term })}
                      style={{ cursor: 'pointer' }}
                    >
                      <CardHeader>
                        <div style={{ width: '100%' }}>
                          <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>
                            {term.original}
                          </h3>
                          <p style={{ fontSize: '14px', color: '#888', marginTop: '5px' }}>
                            → {term.translation}
                          </p>
                        </div>
                      </CardHeader>
                      <Divider />
                      <CardBody>
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
