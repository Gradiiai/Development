"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useJobCampaignStore } from '@/shared/store/jobCampaignStore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import { Label } from "@/components/ui/shared/label";
import { Badge } from "@/components/ui/shared/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/shared/switch";
import { Separator } from "@/components/ui/shared/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Trash2, 
  ArrowRight,
  ArrowLeft,
  Settings,
  Target,
  Brain,
  Award,
  Loader2,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { createScoringParameter, getScoringParameters } from '@/lib/database/queries/campaigns';

interface ScoringParameter {
  id?: string;
  parameterType: 'skill' | 'competency' | 'other';
  parameterName: string;
  proficiencyLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  weight: number; // percentage
  isRequired?: boolean;
}

interface SkillSetup {
  skillTemplate: string;
  skills: ScoringParameter[];
}

interface CompetencySetup {
  competencyScoring: boolean;
  competencies: ScoringParameter[];
}

interface OtherScoring {
  otherScoring: boolean;
  parameters: ScoringParameter[];
}

interface SkillTemplate {
  id: string;
  name: string;
  category?: string;
}

const proficiencyLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export default function ScoringParameters() {
  const router = useRouter();
  const { data: session } = useSession();
  const { state, setCurrentStep } = useJobCampaignStore();
  const { campaignId } = state;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillTemplates, setSkillTemplates] = useState<SkillTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Skill Setup State
  const [skillSetup, setSkillSetup] = useState<SkillSetup>({
    skillTemplate: '',
    skills: []
  });
  
  // Competency Setup State
  const [competencySetup, setCompetencySetup] = useState<CompetencySetup>({
    competencyScoring: false,
    competencies: []
  });
  
  // Other Scoring State
  const [otherScoring, setOtherScoring] = useState<OtherScoring>({
    otherScoring: false,
    parameters: []
  });

  // Fetch skill templates
  const fetchSkillTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await fetch('/api/content/skill-templates');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSkillTemplates([
            ...data.data,
            { id: 'custom', name: 'Custom Template' }
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching skill templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Load existing scoring parameters
  useEffect(() => {
    fetchSkillTemplates();
    const loadScoringParameters = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!campaignId) {
          setLoading(false);
          return;
        }
        
        const result = await getScoringParameters(campaignId);
        
        if (result.success && result.data && result.data.length > 0) {
          // Group parameters by type
          const skills = result.data.filter(p => p.parameterType === 'skill');
          const competencies = result.data.filter(p => p.parameterType === 'competency');
          const others = result.data.filter(p => p.parameterType === 'other');
          
          if (skills.length > 0) {
            setSkillSetup({
              skillTemplate: 'custom',
              skills: skills.map(s => ({
                id: s.id,
                parameterType: 'skill',
                parameterName: s.parameterName,
                proficiencyLevel: s.proficiencyLevel as any,
                weight: s.weight
              }))
            });
          }
          
          if (competencies.length > 0) {
            setCompetencySetup({
              competencyScoring: true,
              competencies: competencies.map(c => ({
                id: c.id,
                parameterType: 'competency',
                parameterName: c.parameterName,
                weight: c.weight
              }))
            });
          }
          
          if (others.length > 0) {
            setOtherScoring({
              otherScoring: true,
              parameters: others.map(o => ({
                id: o.id,
                parameterType: 'other',
                parameterName: o.parameterName,
                weight: o.weight
              }))
            });
          }
        }
      } catch (err) {
        setError('Failed to load scoring parameters');
        console.error('Error loading scoring parameters:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (campaignId) {
      loadScoringParameters();
    } else {
      setLoading(false);
    }
  }, [campaignId]);

  const addSkill = () => {
    setSkillSetup(prev => ({
      ...prev,
      skills: [...prev.skills, {
        parameterType: 'skill',
        parameterName: '',
        proficiencyLevel: 'Beginner',
        weight: 0
      }]
    }));
  };

  const removeSkill = (index: number) => {
    setSkillSetup(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const updateSkill = (index: number, field: keyof ScoringParameter, value: any) => {
    setSkillSetup(prev => ({
      ...prev,
      skills: prev.skills.map((skill, i) => 
        i === index ? { ...skill, [field]: value } : skill
      )
    }));
  };

  const addCompetency = () => {
    setCompetencySetup(prev => ({
      ...prev,
      competencies: [...prev.competencies, {
        parameterType: 'competency',
        parameterName: '',
        weight: 0
      }]
    }));
  };

  const removeCompetency = (index: number) => {
    setCompetencySetup(prev => ({
      ...prev,
      competencies: prev.competencies.filter((_, i) => i !== index)
    }));
  };

  const updateCompetency = (index: number, field: keyof ScoringParameter, value: any) => {
    setCompetencySetup(prev => ({
      ...prev,
      competencies: prev.competencies.map((comp, i) => 
        i === index ? { ...comp, [field]: value } : comp
      )
    }));
  };

  const addOtherParameter = () => {
    setOtherScoring(prev => ({
      ...prev,
      parameters: [...prev.parameters, {
        parameterType: 'other',
        parameterName: '',
        weight: 0
      }]
    }));
  };

  const removeOtherParameter = (index: number) => {
    setOtherScoring(prev => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index)
    }));
  };

  const updateOtherParameter = (index: number, field: keyof ScoringParameter, value: any) => {
    setOtherScoring(prev => ({
      ...prev,
      parameters: prev.parameters.map((param, i) => 
        i === index ? { ...param, [field]: value } : param
      )
    }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (!campaignId) {
        setError('Campaign ID not found. Please go back to the job details page.');
        return;
      }
      
      // Collect all parameters
      const allParameters: ScoringParameter[] = [
        ...skillSetup.skills,
        ...(competencySetup.competencyScoring ? competencySetup.competencies : []),
        ...(otherScoring.otherScoring ? otherScoring.parameters : [])
      ];
      
      // Validate parameters
      const validParameters = allParameters.filter(p => p.parameterName.trim() && p.weight > 0);
      
      if (validParameters.length === 0) {
        setError('Please add at least one scoring parameter with a name and weight.');
        return;
      }
      
      // Save parameters to database
      const results = [];
      for (const param of validParameters) {
        const result = await createScoringParameter({
          campaignId,
          parameterType: param.parameterType,
          parameterName: param.parameterName,
          weight: param.weight,
          proficiencyLevel: param.proficiencyLevel,
          isRequired: param.isRequired || false
        });
        results.push(result);
      }
      
      const allSuccessful = results.every(result => result.success);
      
      if (allSuccessful) {
        // Move to next step
        setCurrentStep(4);
        router.push('/dashboard/job-campaign/success');
      } else {
        setError('Failed to save some scoring parameters');
      }
    } catch (err) {
      setError('Failed to save scoring parameters');
      console.error('Error saving scoring parameters:', err);
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = () => {
    const allParameters = [
      ...skillSetup.skills,
      ...(competencySetup.competencyScoring ? competencySetup.competencies : []),
      ...(otherScoring.otherScoring ? otherScoring.parameters : [])
    ];
    return allParameters.some(p => p.parameterName.trim() && p.weight > 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading scoring parameters...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Scoring Parameters</h1>
              <p className="text-gray-600">Step 3 of 5: Configure Evaluation Criteria</p>
            </div>
            <Badge variant="outline" className="px-3 py-1">
              <Settings className="w-4 h-4 mr-1" />
              Step 3
            </Badge>
          </div>
          <Progress value={60} className="h-2" />
        </motion.div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Target className="w-5 h-5 text-blue-600" />
                Scoring Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Skill Setup */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Skill Setup</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="skill-template" className="text-sm font-medium mb-2 block">
                      Skill Template
                    </Label>
                    <Select 
                      value={skillSetup.skillTemplate} 
                      onValueChange={(value) => setSkillSetup(prev => ({ ...prev, skillTemplate: value }))}
                      disabled={loadingTemplates}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={loadingTemplates ? "Loading templates..." : "Choose a skill template"} />
                      </SelectTrigger>
                      <SelectContent>
                        {skillTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Skills</Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addSkill}
                        className="flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Skill
                      </Button>
                    </div>
                    
                    {skillSetup.skills.map((skill, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-center p-3 border rounded-lg">
                        <div className="col-span-4">
                          <Input
                            value={skill.parameterName}
                            onChange={(e) => updateSkill(index, 'parameterName', e.target.value)}
                            placeholder="Enter skill name"
                          />
                        </div>
                        <div className="col-span-3">
                          <Select 
                            value={skill.proficiencyLevel} 
                            onValueChange={(value) => updateSkill(index, 'proficiencyLevel', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Proficiency" />
                            </SelectTrigger>
                            <SelectContent>
                              {proficiencyLevels.map((level) => (
                                <SelectItem key={level} value={level}>
                                  {level}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3">
                          <Select 
                            value={skill.weight.toString()} 
                            onValueChange={(value) => updateSkill(index, 'weight', parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Score%" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10%</SelectItem>
                              <SelectItem value="20">20%</SelectItem>
                              <SelectItem value="30">30%</SelectItem>
                              <SelectItem value="40">40%</SelectItem>
                              <SelectItem value="50">50%</SelectItem>
                              <SelectItem value="60">60%</SelectItem>
                              <SelectItem value="70">70%</SelectItem>
                              <SelectItem value="80">80%</SelectItem>
                              <SelectItem value="90">90%</SelectItem>
                              <SelectItem value="100">100%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeSkill(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="col-span-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Competency Scoring */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Competency Scoring</h3>
                  </div>
                  <Switch 
                    checked={competencySetup.competencyScoring}
                    onCheckedChange={(checked) => setCompetencySetup(prev => ({ ...prev, competencyScoring: checked }))}
                  />
                </div>
                
                {competencySetup.competencyScoring && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Competency</Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addCompetency}
                        className="flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Competency
                      </Button>
                    </div>
                    
                    {competencySetup.competencies.map((competency, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-center p-3 border rounded-lg">
                        <div className="col-span-7">
                          <Input
                            value={competency.parameterName}
                            onChange={(e) => updateCompetency(index, 'parameterName', e.target.value)}
                            placeholder="Enter competency name"
                          />
                        </div>
                        <div className="col-span-3">
                          <Select 
                            value={competency.weight.toString()} 
                            onValueChange={(value) => updateCompetency(index, 'weight', parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Score%" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10%</SelectItem>
                              <SelectItem value="20">20%</SelectItem>
                              <SelectItem value="30">30%</SelectItem>
                              <SelectItem value="40">40%</SelectItem>
                              <SelectItem value="50">50%</SelectItem>
                              <SelectItem value="60">60%</SelectItem>
                              <SelectItem value="70">70%</SelectItem>
                              <SelectItem value="80">80%</SelectItem>
                              <SelectItem value="90">90%</SelectItem>
                              <SelectItem value="100">100%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeCompetency(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="col-span-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Other Scoring */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Other Scoring</h3>
                  </div>
                  <Switch 
                    checked={otherScoring.otherScoring}
                    onCheckedChange={(checked) => setOtherScoring(prev => ({ ...prev, otherScoring: checked }))}
                  />
                </div>
                
                {otherScoring.otherScoring && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Parameter Name</Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addOtherParameter}
                        className="flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Parameter
                      </Button>
                    </div>
                    
                    {otherScoring.parameters.map((parameter, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-center p-3 border rounded-lg">
                        <div className="col-span-7">
                          <Input
                            value={parameter.parameterName}
                            onChange={(e) => updateOtherParameter(index, 'parameterName', e.target.value)}
                            placeholder="Enter parameter name"
                          />
                        </div>
                        <div className="col-span-3">
                          <Select 
                            value={parameter.weight.toString()} 
                            onValueChange={(value) => updateOtherParameter(index, 'weight', parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Score%" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10%</SelectItem>
                              <SelectItem value="20">20%</SelectItem>
                              <SelectItem value="30">30%</SelectItem>
                              <SelectItem value="40">40%</SelectItem>
                              <SelectItem value="50">50%</SelectItem>
                              <SelectItem value="60">60%</SelectItem>
                              <SelectItem value="70">70%</SelectItem>
                              <SelectItem value="80">80%</SelectItem>
                              <SelectItem value="90">90%</SelectItem>
                              <SelectItem value="100">100%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeOtherParameter(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="col-span-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-between mt-8"
        >
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/job-campaign/interview-setup')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Interview Setup
          </Button>
          
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={handleSubmit}
              disabled={!isFormValid() || saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save as draft'}
            </Button>
            
            <Button 
              onClick={handleSubmit}
              disabled={!isFormValid() || saving}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Submit & Next'}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}