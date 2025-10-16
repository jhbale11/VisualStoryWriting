import { Button, Card, CardBody, CardHeader, Chip, Divider, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Tab, Tabs, Textarea, Tooltip, useDisclosure } from '@nextui-org/react';
import { useEffect, useState } from 'react';
import { FaBook, FaDownload, FaSearch, FaTrashAlt, FaUpload } from 'react-icons/fa';
import { FaLocationDot } from 'react-icons/fa6';
import { IoPersonCircle, IoSave } from 'react-icons/io5';
import { GlossaryCharacter, GlossaryEvent, GlossaryLocation, GlossaryTerm, useGlossaryStore } from '../model/GlossaryModel';

export default function GlossaryBuilder() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedTab, setSelectedTab] = useState('entities');
  const [glossaryTab, setGlossaryTab] = useState<'characters' | 'events' | 'locations' | 'terms'>('characters');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<{ type: 'character' | 'event' | 'location' | 'term', item: any } | null>(null);
  const { isOpen: isExportOpen, onOpen: onExportOpen, onClose: onExportClose } = useDisclosure();
  const { isOpen: isImportOpen, onOpen: onImportOpen, onClose: onImportClose } = useDisclosure();
  const [jsonData, setJsonData] = useState('');

  const glossaryCharacters = useGlossaryStore(state => state.characters);
  const glossaryEvents = useGlossaryStore(state => state.events);
  const glossaryLocations = useGlossaryStore(state => state.locations);
  const glossaryTerms = useGlossaryStore(state => state.terms);
  const projectName = useGlossaryStore(state => state.projectName);
  const projectId = useGlossaryStore(state => state.projectId);
  const exportToJSON = useGlossaryStore(state => state.exportToJSON);
  const importFromJSON = useGlossaryStore(state => state.importFromJSON);
  const saveProject = useGlossaryStore(state => state.saveProject);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const projectIdParam = urlParams.get('id');

    if (projectIdParam && !projectId) {
      useGlossaryStore.getState().loadProject(projectIdParam).catch(error => {
        console.error('Failed to load project from URL:', error);
      });
    }
  }, []);

  useEffect(() => {
    const autoSaveInterval = setInterval(async () => {
      if (glossaryCharacters.length > 0 || glossaryEvents.length > 0) {
        try {
          await saveProject();
          console.log('Project auto-saved');
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [glossaryCharacters, glossaryEvents, glossaryLocations, glossaryTerms]);


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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: 'white', borderBottom: '1px solid #ddd' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
            Glossary Builder
          </h1>
          {projectName && (
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              {projectName}
            </p>
          )}
        </div>
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

      <div style={{ display: 'flex', flexDirection: 'row', flexGrow: 1, height: '80%', overflow: 'hidden' }}>
        <div style={{ width: '60%', background: '#F3F4F6', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(key as string)}
            color="primary"
            variant="bordered"
            style={{ position: 'absolute', left: '50%', top: 10, transform: 'translate(-50%, 0)', zIndex: 10 }}
            classNames={{ tabList: 'bg-white' }}
          >
            <Tab key="entities" title={<span style={{ display: 'flex', alignItems: 'center', fontSize: 15 }}><IoPersonCircle style={{ marginRight: 3, fontSize: 22 }} /> Characters</span>} />
            <Tab key="locations" title={<span style={{ display: 'flex', alignItems: 'center', fontSize: 15 }}><FaLocationDot style={{ marginRight: 3, fontSize: 18 }} /> Locations</span>} />
            <Tab key="terms" title={<span style={{ display: 'flex', alignItems: 'center', fontSize: 15 }}><FaBook style={{ marginRight: 3, fontSize: 18 }} /> Terms</span>} />
          </Tabs>

          <div style={{ flex: 1, overflow: 'auto', padding: '60px 20px 20px' }}>
            {selectedTab === 'entities' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {glossaryCharacters.map((char) => (
                  <Card key={char.id} style={{ padding: '15px', background: 'white' }}>
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '10px' }}>{char.emoji}</div>
                      <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{char.name}</h3>
                      {char.korean_name && (
                        <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>{char.korean_name}</p>
                      )}
                    </div>
                    <Divider style={{ marginBottom: '10px' }} />
                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {char.description}
                    </p>
                    {char.traits.length > 0 && (
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {char.traits.slice(0, 3).map((trait, idx) => (
                          <Chip key={idx} size="sm" variant="flat" color="secondary">{trait}</Chip>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {selectedTab === 'locations' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {glossaryLocations.map((loc) => (
                  <Card key={loc.id} style={{ padding: '15px', background: 'white' }}>
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '10px' }}>{loc.emoji}</div>
                      <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{loc.name}</h3>
                    </div>
                    <Divider style={{ marginBottom: '10px' }} />
                    <p style={{ fontSize: '13px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                      {loc.description}
                    </p>
                  </Card>
                ))}
              </div>
            )}

            {selectedTab === 'terms' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                {glossaryTerms.map((term) => (
                  <Card key={term.id} style={{ padding: '15px', background: 'white' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>{term.original}</h3>
                      <p style={{ fontSize: '14px', color: '#888', marginTop: '5px' }}>→ {term.translation}</p>
                    </div>
                    <Divider style={{ marginBottom: '10px' }} />
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>{term.context}</p>
                    <Chip size="sm" variant="flat" color="secondary">{term.category}</Chip>
                  </Card>
                ))}
              </div>
            )}

            {selectedTab === 'entities' && glossaryCharacters.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                <IoPersonCircle style={{ fontSize: '64px', marginBottom: '20px' }} />
                <p>아직 추출된 인물이 없습니다.</p>
              </div>
            )}

            {selectedTab === 'locations' && glossaryLocations.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                <FaLocationDot style={{ fontSize: '64px', marginBottom: '20px' }} />
                <p>아직 추출된 장소가 없습니다.</p>
              </div>
            )}

            {selectedTab === 'terms' && glossaryTerms.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                <FaBook style={{ fontSize: '64px', marginBottom: '20px' }} />
                <p>아직 추출된 용어가 없습니다.</p>
              </div>
            )}
          </div>

          <div style={{ position: 'absolute', left: '50%', bottom: 20, transform: 'translateX(-50%)', background: 'white', padding: '10px 20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>
              {glossaryCharacters.length} characters · {glossaryEvents.length} events · {glossaryLocations.length} locations · {glossaryTerms.length} terms
            </span>
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
