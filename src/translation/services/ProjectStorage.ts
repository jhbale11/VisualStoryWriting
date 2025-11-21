import { PrismaClient } from '../../generated/prisma';
import type { TranslationProject } from '../types';

// Singleton Prisma client
let prisma: PrismaClient | null = null;

const getPrismaClient = () => {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'file:./prisma/translation.db'
        }
      }
    });
  }
  return prisma;
};

export class ProjectStorage {
  private static instance: ProjectStorage;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = getPrismaClient();
  }

  static getInstance(): ProjectStorage {
    if (!ProjectStorage.instance) {
      ProjectStorage.instance = new ProjectStorage();
    }
    return ProjectStorage.instance;
  }

  // Convert TranslationProject to Prisma format
  private toDbFormat(project: TranslationProject) {
    return {
      id: project.id,
      name: project.name,
      type: project.type,
      status: project.status,
      created_at: project.created_at,
      updated_at: project.updated_at,
      file_content: project.file_content,
      glossary: project.glossary ? JSON.stringify(project.glossary) : null,
      chunks: JSON.stringify(project.chunks),
      chunk_size: project.chunk_size,
      overlap: project.overlap,
      translation_progress: project.translation_progress,
      max_retries: project.max_retries,
      enable_proofreader: project.enable_proofreader,
      language: project.language,
      agent_configs: JSON.stringify(project.agent_configs),
      prompts: project.prompts ? JSON.stringify(project.prompts) : null,
      is_archived: this.isCompleted(project),
    };
  }

  // Convert Prisma format to TranslationProject
  private fromDbFormat(dbProject: any): TranslationProject {
    return {
      id: dbProject.id,
      name: dbProject.name,
      type: dbProject.type,
      status: dbProject.status,
      created_at: dbProject.created_at,
      updated_at: dbProject.updated_at,
      file_content: dbProject.file_content,
      glossary: dbProject.glossary ? JSON.parse(dbProject.glossary) : undefined,
      chunks: JSON.parse(dbProject.chunks),
      chunk_size: dbProject.chunk_size,
      overlap: dbProject.overlap,
      translation_progress: dbProject.translation_progress,
      max_retries: dbProject.max_retries,
      enable_proofreader: dbProject.enable_proofreader,
      language: dbProject.language,
      agent_configs: JSON.parse(dbProject.agent_configs),
      prompts: dbProject.prompts ? JSON.parse(dbProject.prompts) : undefined,
    };
  }

  // Check if project is completed
  private isCompleted(project: TranslationProject): boolean {
    const completedStatuses = ['glossary_completed', 'translation_completed', 'review_completed'];
    return completedStatuses.includes(project.status);
  }

  // Save project to DB
  async saveProject(project: TranslationProject): Promise<void> {
    try {
      const dbProject = this.toDbFormat(project);
      await this.prisma.translationProject.upsert({
        where: { id: project.id },
        update: dbProject,
        create: dbProject,
      });
      console.log(`[ProjectStorage] Saved project ${project.id} to database`);
    } catch (error) {
      console.error('[ProjectStorage] Failed to save project:', error);
      throw error;
    }
  }

  // Archive completed project
  async archiveProject(project: TranslationProject): Promise<void> {
    try {
      const dbProject = this.toDbFormat(project);
      dbProject.is_archived = true;
      
      await this.prisma.translationProject.upsert({
        where: { id: project.id },
        update: dbProject,
        create: dbProject,
      });
      console.log(`[ProjectStorage] Archived project ${project.id}`);
    } catch (error) {
      console.error('[ProjectStorage] Failed to archive project:', error);
      throw error;
    }
  }

  // Get project from DB
  async getProject(projectId: string): Promise<TranslationProject | null> {
    try {
      const dbProject = await this.prisma.translationProject.findUnique({
        where: { id: projectId },
      });
      
      if (!dbProject) {
        return null;
      }
      
      return this.fromDbFormat(dbProject);
    } catch (error) {
      console.error('[ProjectStorage] Failed to get project:', error);
      return null;
    }
  }

  // List all projects (active and archived)
  async listProjects(options?: {
    includeArchived?: boolean;
    type?: 'translation' | 'glossary';
    limit?: number;
    offset?: number;
  }): Promise<TranslationProject[]> {
    try {
      const where: any = {};
      
      if (!options?.includeArchived) {
        where.is_archived = false;
      }
      
      if (options?.type) {
        where.type = options.type;
      }
      
      const dbProjects = await this.prisma.translationProject.findMany({
        where,
        orderBy: { updated_at: 'desc' },
        take: options?.limit,
        skip: options?.offset,
      });
      
      return dbProjects.map(p => this.fromDbFormat(p));
    } catch (error) {
      console.error('[ProjectStorage] Failed to list projects:', error);
      return [];
    }
  }

  // List archived projects
  async listArchivedProjects(options?: {
    type?: 'translation' | 'glossary';
    limit?: number;
    offset?: number;
  }): Promise<TranslationProject[]> {
    try {
      const where: any = { is_archived: true };
      
      if (options?.type) {
        where.type = options.type;
      }
      
      const dbProjects = await this.prisma.translationProject.findMany({
        where,
        orderBy: { updated_at: 'desc' },
        take: options?.limit,
        skip: options?.offset,
      });
      
      return dbProjects.map(p => this.fromDbFormat(p));
    } catch (error) {
      console.error('[ProjectStorage] Failed to list archived projects:', error);
      return [];
    }
  }

  // Delete project from DB
  async deleteProject(projectId: string): Promise<void> {
    try {
      await this.prisma.translationProject.delete({
        where: { id: projectId },
      });
      console.log(`[ProjectStorage] Deleted project ${projectId}`);
    } catch (error) {
      console.error('[ProjectStorage] Failed to delete project:', error);
      throw error;
    }
  }

  // Export project to JSON file
  async exportProjectToJson(projectId: string, exportPath: string): Promise<void> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      
      const fs = await import('fs/promises');
      await fs.writeFile(exportPath, JSON.stringify(project, null, 2), 'utf-8');
      
      // Record export in DB
      await this.prisma.projectExport.create({
        data: {
          project_id: projectId,
          export_path: exportPath,
        },
      });
      
      console.log(`[ProjectStorage] Exported project ${projectId} to ${exportPath}`);
    } catch (error) {
      console.error('[ProjectStorage] Failed to export project:', error);
      throw error;
    }
  }

  // Import project from JSON file
  async importProjectFromJson(jsonPath: string): Promise<TranslationProject> {
    try {
      const fs = await import('fs/promises');
      const jsonContent = await fs.readFile(jsonPath, 'utf-8');
      const project: TranslationProject = JSON.parse(jsonContent);
      
      // Generate new ID if project already exists
      const existingProject = await this.getProject(project.id);
      if (existingProject) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        project.id = `proj_${timestamp}_${random}`;
        project.name = `${project.name} (imported)`;
      }
      
      await this.saveProject(project);
      console.log(`[ProjectStorage] Imported project from ${jsonPath}`);
      
      return project;
    } catch (error) {
      console.error('[ProjectStorage] Failed to import project:', error);
      throw error;
    }
  }

  // Cleanup: Delete old archived projects (keep last N)
  async cleanupOldProjects(keepCount: number = 50): Promise<number> {
    try {
      const archivedProjects = await this.prisma.translationProject.findMany({
        where: { is_archived: true },
        orderBy: { updated_at: 'desc' },
        select: { id: true },
      });
      
      if (archivedProjects.length <= keepCount) {
        return 0;
      }
      
      const projectsToDelete = archivedProjects.slice(keepCount);
      const deleteIds = projectsToDelete.map(p => p.id);
      
      const result = await this.prisma.translationProject.deleteMany({
        where: {
          id: { in: deleteIds },
        },
      });
      
      console.log(`[ProjectStorage] Cleaned up ${result.count} old projects`);
      return result.count;
    } catch (error) {
      console.error('[ProjectStorage] Failed to cleanup old projects:', error);
      return 0;
    }
  }

  // Get storage statistics
  async getStorageStats(): Promise<{
    totalProjects: number;
    activeProjects: number;
    archivedProjects: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    try {
      const allProjects = await this.prisma.translationProject.findMany({
        select: {
          type: true,
          status: true,
          is_archived: true,
        },
      });
      
      const stats = {
        totalProjects: allProjects.length,
        activeProjects: allProjects.filter(p => !p.is_archived).length,
        archivedProjects: allProjects.filter(p => p.is_archived).length,
        byType: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
      };
      
      allProjects.forEach(p => {
        stats.byType[p.type] = (stats.byType[p.type] || 0) + 1;
        stats.byStatus[p.status] = (stats.byStatus[p.status] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('[ProjectStorage] Failed to get storage stats:', error);
      return {
        totalProjects: 0,
        activeProjects: 0,
        archivedProjects: 0,
        byType: {},
        byStatus: {},
      };
    }
  }

  // Close Prisma connection (for cleanup)
  async disconnect(): Promise<void> {
    if (prisma) {
      await prisma.$disconnect();
      prisma = null;
    }
  }
}

// Export singleton instance
export const projectStorage = ProjectStorage.getInstance();

