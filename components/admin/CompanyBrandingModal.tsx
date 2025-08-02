'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shared/dialog';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { toast } from 'sonner';
import { Upload, X, Palette, Type, Image, Settings, Eye, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyBrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
}

interface BrandingData {
  id?: string;
  companyId: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  brandName?: string;
  tagline?: string;
  fontFamily: string;
  customCss?: string;
  themeMode: 'light' | 'dark' | 'auto';
  isActive: boolean;
}

const defaultBranding: Partial<BrandingData> = {
  primaryColor: '#3B82F6',
  secondaryColor: '#1E40AF',
  accentColor: '#F59E0B',
  backgroundColor: '#FFFFFF',
  textColor: '#1F2937',
  fontFamily: 'Inter',
  themeMode: 'light',
  isActive: true,
};

const fontOptions = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Source Sans Pro',
  'Nunito',
  'Raleway',
  'Ubuntu',
];

export function CompanyBrandingModal({ isOpen, onClose, companyId, companyName }: CompanyBrandingModalProps) {
  const [branding, setBranding] = useState<BrandingData>({ ...defaultBranding, companyId } as BrandingData);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<{ logo: boolean; favicon: boolean }>({ logo: false, favicon: false });
  const [activeTab, setActiveTab] = useState('colors');
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (isOpen && companyId) {
      fetchBranding();
    }
  }, [isOpen, companyId]);

  const fetchBranding = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/companies/branding?companyId=${companyId}`);
      
      if (response.ok) {
        const data = await response.json();
        setBranding({ ...defaultBranding, ...data });
      } else {
        // Use defaults if no branding exists
        setBranding({ ...defaultBranding, companyId } as BrandingData);
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
      toast.error('Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const method = branding.id ? 'PUT' : 'POST';
      
      const response = await fetch('/api/admin/companies/branding', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(branding),
      });

      if (response.ok) {
        const updatedBranding = await response.json();
        setBranding(updatedBranding);
        toast.success('Branding settings saved successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save branding settings');
      }
    } catch (error) {
      console.error('Error saving branding:', error);
      toast.error('Failed to save branding settings');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'logo' | 'favicon') => {
    try {
      setUploading(prev => ({ ...prev, [type]: true }));
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', companyId);
      formData.append('type', type);

      const response = await fetch('/api/admin/companies/branding/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setBranding(prev => ({
          ...prev,
          [type === 'logo' ? 'logoUrl' : 'faviconUrl']: result.fileUrl,
        }));
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`);
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to upload ${type}`);
      }
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(`Failed to upload ${type}`);
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleFileRemove = async (type: 'logo' | 'favicon') => {
    try {
      const response = await fetch(`/api/admin/companies/branding/upload?companyId=${companyId}&type=${type}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBranding(prev => ({
          ...prev,
          [type === 'logo' ? 'logoUrl' : 'faviconUrl']: undefined,
        }));
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} removed successfully`);
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to remove ${type}`);
      }
    } catch (error) {
      console.error(`Error removing ${type}:`, error);
      toast.error(`Failed to remove ${type}`);
    }
  };

  const handleReset = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/companies/branding?companyId=${companyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBranding({ ...defaultBranding, companyId } as BrandingData);
        toast.success('Branding reset to defaults');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to reset branding');
      }
    } catch (error) {
      console.error('Error resetting branding:', error);
      toast.error('Failed to reset branding');
    } finally {
      setLoading(false);
    }
  };

  const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center space-x-2">
        <div 
          className="w-10 h-10 rounded border-2 border-gray-300 cursor-pointer"
          style={{ backgroundColor: value }}
          onClick={() => document.getElementById(`color-${label}`)?.click()}
        />
        <Input
          id={`color-${label}`}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-16 h-10 p-1 border-0"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
          placeholder="#000000"
        />
      </div>
    </div>
  );

  const FileUpload = ({ type, currentUrl }: { type: 'logo' | 'favicon'; currentUrl?: string }) => (
    <div className="space-y-4">
      <Label className="text-sm font-medium">
        {type === 'logo' ? 'Company Logo' : 'Favicon'}
      </Label>
      
      {currentUrl ? (
        <div className="space-y-2">
          <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <img 
              src={currentUrl} 
              alt={type} 
              className="max-h-28 max-w-full object-contain"
            />
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFileRemove(type)}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Remove
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(currentUrl, '_blank')}
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              Click to upload {type}
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG, SVG up to 5MB
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, type);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading[type]}
          />
        </div>
      )}
      
      {uploading[type] && (
        <div className="text-center text-sm text-gray-600">
          Uploading {type}...
        </div>
      )}
    </div>
  );

  const PreviewCard = () => (
    <Card className="w-full" style={{ 
      backgroundColor: branding.backgroundColor,
      color: branding.textColor,
      fontFamily: branding.fontFamily
    }}>
      <CardHeader style={{ borderBottomColor: branding.primaryColor }}>
        <div className="flex items-center space-x-3">
          {branding.logoUrl && (
            <img src={branding.logoUrl} alt="Logo" className="h-8 w-auto" />
          )}
          <div>
            <CardTitle style={{ color: branding.primaryColor }}>
              {branding.brandName || companyName}
            </CardTitle>
            {branding.tagline && (
              <p className="text-sm opacity-75">{branding.tagline}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button style={{ backgroundColor: branding.primaryColor, color: branding.backgroundColor }}>
          Primary Button
        </Button>
        <Button variant="outline" style={{ 
          borderColor: branding.secondaryColor, 
          color: branding.secondaryColor 
        }}>
          Secondary Button
        </Button>
        <Badge style={{ backgroundColor: branding.accentColor, color: branding.backgroundColor }}>
          Accent Badge
        </Badge>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Palette className="w-5 h-5" />
            <span>Company Branding - {companyName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="colors" className="flex items-center space-x-2">
                <Palette className="w-4 h-4" />
                <span>Colors</span>
              </TabsTrigger>
              <TabsTrigger value="assets" className="flex items-center space-x-2">
                <Image className="w-4 h-4" />
                <span>Assets</span>
              </TabsTrigger>
              <TabsTrigger value="typography" className="flex items-center space-x-2">
                <Type className="w-4 h-4" />
                <span>Typography</span>
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Advanced</span>
              </TabsTrigger>
            </TabsList>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="space-y-6">
                <TabsContent value="colors" className="space-y-4 mt-0">
                  <ColorPicker
                    label="Primary Color"
                    value={branding.primaryColor}
                    onChange={(value) => setBranding(prev => ({ ...prev, primaryColor: value }))}
                  />
                  <ColorPicker
                    label="Secondary Color"
                    value={branding.secondaryColor}
                    onChange={(value) => setBranding(prev => ({ ...prev, secondaryColor: value }))}
                  />
                  <ColorPicker
                    label="Accent Color"
                    value={branding.accentColor}
                    onChange={(value) => setBranding(prev => ({ ...prev, accentColor: value }))}
                  />
                  <ColorPicker
                    label="Background Color"
                    value={branding.backgroundColor}
                    onChange={(value) => setBranding(prev => ({ ...prev, backgroundColor: value }))}
                  />
                  <ColorPicker
                    label="Text Color"
                    value={branding.textColor}
                    onChange={(value) => setBranding(prev => ({ ...prev, textColor: value }))}
                  />
                </TabsContent>

                <TabsContent value="assets" className="space-y-4 mt-0">
                  <FileUpload type="logo" currentUrl={branding.logoUrl} />
                  <FileUpload type="favicon" currentUrl={branding.faviconUrl} />
                </TabsContent>

                <TabsContent value="typography" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label>Brand Name</Label>
                    <Input
                      value={branding.brandName || ''}
                      onChange={(e) => setBranding(prev => ({ ...prev, brandName: e.target.value }))}
                      placeholder="Enter brand name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tagline</Label>
                    <Input
                      value={branding.tagline || ''}
                      onChange={(e) => setBranding(prev => ({ ...prev, tagline: e.target.value }))}
                      placeholder="Enter company tagline"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Font Family</Label>
                    <Select
                      value={branding.fontFamily}
                      onValueChange={(value) => setBranding(prev => ({ ...prev, fontFamily: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fontOptions.map((font) => (
                          <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                            {font}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label>Theme Mode</Label>
                    <Select
                      value={branding.themeMode}
                      onValueChange={(value: 'light' | 'dark' | 'auto') => setBranding(prev => ({ ...prev, themeMode: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Custom CSS</Label>
                    <Textarea
                      value={branding.customCss || ''}
                      onChange={(e) => setBranding(prev => ({ ...prev, customCss: e.target.value }))}
                      placeholder="Enter custom CSS rules..."
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>
                </TabsContent>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Preview</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewMode(!previewMode)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {previewMode ? 'Edit' : 'Preview'}
                  </Button>
                </div>
                <PreviewCard />
              </div>
            </div>
          </Tabs>

          <div className="flex justify-between pt-4 border-t">
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={loading}
              >
                Reset to Defaults
              </Button>
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}