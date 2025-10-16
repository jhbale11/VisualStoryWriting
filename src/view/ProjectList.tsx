import { Button, Card, CardBody, CardHeader, Chip, Divider, Input, Spinner } from "@nextui-org/react";
import { useEffect, useState } from "react";
import { FaPlus, FaSearch, FaTrash } from "react-icons/fa";
import { supabase, ProjectData } from '../lib/supabase';
import { useGlossaryStore } from '../model/GlossaryModel';

export default function ProjectList() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const loadProject = useGlossaryStore(state => state.loadProject);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('glossary_projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('이 프로젝트를 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('glossary_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      await loadProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('프로젝트 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleProjectClick = async (projectId: string) => {
    try {
      window.location.hash = `/glossary-builder?id=${projectId}`;
    } catch (error) {
      console.error('Error loading project:', error);
      alert('프로젝트 로드 중 오류가 발생했습니다.');
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 40px',
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', margin: 0 }}>
          내 프로젝트
        </h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            color="primary"
            startContent={<FaPlus />}
            onClick={() => window.location.hash = '/new'}
            style={{ background: 'white', color: '#667eea' }}
          >
            새 프로젝트
          </Button>
          <a
            href="#/launcher"
            style={{
              color: 'white',
              textDecoration: 'underline',
              fontSize: '14px',
              alignSelf: 'center'
            }}
          >
            Legacy Interface
          </a>
        </div>
      </div>

      <div style={{
        flexGrow: 1,
        padding: '0 40px 40px',
        overflowY: 'auto'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <Input
            placeholder="프로젝트 검색..."
            startContent={<FaSearch />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: 'white' }}
            classNames={{ inputWrapper: 'bg-white' }}
          />
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <Spinner size="lg" color="default" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '18px', color: '#666' }}>
              {searchQuery ? '검색 결과가 없습니다.' : '아직 프로젝트가 없습니다. 새 프로젝트를 만들어보세요!'}
            </p>
          </Card>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '20px'
          }}>
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                isPressable
                onClick={() => handleProjectClick(project.id!)}
                style={{
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                className="hover:scale-105 hover:shadow-lg"
              >
                <CardHeader style={{ padding: 0, marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, marginBottom: '5px' }}>
                      {project.name}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
                      {project.updated_at ? formatDate(project.updated_at) : ''}
                    </p>
                  </div>
                  <Button
                    isIconOnly
                    size="sm"
                    color="danger"
                    variant="light"
                    onClick={(e) => deleteProject(project.id!, e)}
                  >
                    <FaTrash />
                  </Button>
                </CardHeader>
                <Divider />
                <CardBody style={{ padding: '15px 0 0 0' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    {project.characters && (project.characters as any[]).length > 0 && (
                      <Chip size="sm" variant="flat" color="primary">
                        인물 {(project.characters as any[]).length}명
                      </Chip>
                    )}
                    {project.events && (project.events as any[]).length > 0 && (
                      <Chip size="sm" variant="flat" color="secondary">
                        사건 {(project.events as any[]).length}개
                      </Chip>
                    )}
                    {project.locations && (project.locations as any[]).length > 0 && (
                      <Chip size="sm" variant="flat" color="success">
                        장소 {(project.locations as any[]).length}개
                      </Chip>
                    )}
                    {project.terms && (project.terms as any[]).length > 0 && (
                      <Chip size="sm" variant="flat" color="warning">
                        용어 {(project.terms as any[]).length}개
                      </Chip>
                    )}
                  </div>
                  <p style={{
                    fontSize: '13px',
                    color: '#666',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    margin: 0
                  }}>
                    {project.full_text?.substring(0, 150)}...
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
