import { useState, useEffect, useCallback } from 'react';
import { getSkillTemplates, createSkillTemplate, updateSkillTemplate, deleteSkillTemplate } from '@/lib/database/queries/campaigns';

interface SkillTemplate {
  id: string;
  name: string;
  category: string;
  skills: string; // JSON string of skills array
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SkillTemplateInput {
  name: string;
  category: string;
  skills: string[];
  description?: string;
  isActive?: boolean;
}

interface UseSkillTemplatesReturn {
  skillTemplates: SkillTemplate[];
  loading: boolean;
  error: string | null;
  refetch: (companyId?: string) => Promise<void>;
  createTemplate: (template: SkillTemplateInput, companyId?: string) => Promise<boolean>;
  updateTemplate: (id: string, template: Partial<SkillTemplateInput>) => Promise<boolean>;
  deleteTemplate: (id: string) => Promise<boolean>;
}

export function useSkillTemplates(): UseSkillTemplatesReturn {
  const [skillTemplates, setSkillTemplates] = useState<SkillTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSkillTemplates = useCallback(async (companyId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Don't fetch if no valid companyId is provided
      if (!companyId) {
        setSkillTemplates([]);
        setLoading(false);
        return;
      }
      
      const result = await getSkillTemplates(companyId);
      
      if (result.success && result.data) {
        // Map database schema to SkillTemplate interface
        const mappedTemplates = (result.data || []).map(template => ({
          id: template.id,
          name: template.templateName,
          category: template.jobCategory,
          skills: typeof template.skills === 'string' ? template.skills : JSON.stringify(template.skills || []),
          description: template.jobDuties || undefined,
          isActive: template.isDefault || false,
          createdAt: template.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: template.updatedAt?.toISOString() || new Date().toISOString()
        }));
        setSkillTemplates(mappedTemplates);
      } else {
        setError(result.error || 'Failed to fetch skill templates');
      }
    } catch (err) {
      setError('Failed to fetch skill templates');
      console.error('Error fetching skill templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (templateData: SkillTemplateInput, companyId?: string) => {
    try {
      setError(null);
      
      // Optimistic update
      const tempId = Date.now().toString();
      const newTemplate = {
        id: tempId,
        name: templateData.name,
        category: templateData.category,
        skills: JSON.stringify(templateData.skills),
        description: templateData.description || '',
        isActive: templateData.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setSkillTemplates(prev => [...prev, newTemplate]);
      
      const dbTemplateData = {
        companyId: companyId || '', // This should be passed from the component
        createdBy: 'current-user', // This should be the actual user ID
        templateName: templateData.name,
        jobCategory: templateData.category,
        skills: JSON.stringify(templateData.skills),
        jobDuties: templateData.description,
        isDefault: templateData.isActive ?? true
      };
      
      const result = await createSkillTemplate(dbTemplateData);
      
      if (result.success) {
        // Replace temp template with real one
        setSkillTemplates(prev => 
          prev.map(template => 
            template.id === tempId ? { ...template, id: result.data?.id || tempId } : template
          )
        );
        return true;
      } else {
        // Revert optimistic update
        setSkillTemplates(prev => prev.filter(template => template.id !== tempId));
        setError(result.error || 'Failed to create skill template');
        return false;
      }
    } catch (err) {
      setError('Failed to create skill template');
      console.error('Error creating skill template:', err);
      return false;
    }
  }, []);

  const updateTemplate = async (
    id: string,
    template: Partial<SkillTemplateInput>
  ): Promise<boolean> => {
    try {
      const updateData: any = { ...template };
      
      // Convert skills array to JSON string if provided
      if (template.skills) {
        updateData.skills = JSON.stringify(template.skills);
      }
      
      const result = await updateSkillTemplate(id, updateData);
      
      if (result.success) {
        // Update local state optimistically
        setSkillTemplates(prev => 
          prev.map(t => 
            t.id === id 
              ? { 
                  ...t, 
                  ...updateData,
                  skills: updateData.skills || t.skills,
                  updatedAt: new Date().toISOString()
                }
              : t
          )
        );
        return true;
      } else {
        setError(result.error || 'Failed to update skill template');
        return false;
      }
    } catch (err) {
      setError('Failed to update skill template');
      console.error('Error updating skill template:', err);
      return false;
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      const result = await deleteSkillTemplate(id);
      
      if (result.success) {
        // Update local state optimistically
        setSkillTemplates(prev => prev.filter(t => t.id !== id));
        return true;
      } else {
        setError(result.error || 'Failed to delete skill template');
        return false;
      }
    } catch (err) {
      setError('Failed to delete skill template');
      console.error('Error deleting skill template:', err);
      return false;
    }
  };

  useEffect(() => {
    // Don't auto-fetch on mount, wait for explicit refetch with companyId
  }, []);

  return {
    skillTemplates,
    loading,
    error,
    refetch: fetchSkillTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate
  };
}