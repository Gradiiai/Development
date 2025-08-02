"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import { Label } from "@/components/ui/shared/label";
import { Switch } from "@/components/ui/shared/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/shared/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/shared/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/shared/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/shared/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  User,
  Bell,
  Shield,
  Eye,
  Mail,
  Phone,
  Globe,
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  DollarSign,
  Save,
  Upload,
  Camera,
  Trash2,
  Key,
  Download,
  FileText,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Palette,
  Languages,
  HelpCircle,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  X,
  Edit,
  Plus,
  Minus,
} from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { cn } from "@/lib/utils";

interface NotificationSettings {
  email: {
    newMessages: boolean;
    interviewReminders: boolean;
    applicationUpdates: boolean;
    jobRecommendations: boolean;
    weeklyDigest: boolean;
    marketingEmails: boolean;
  };
  push: {
    newMessages: boolean;
    interviewReminders: boolean;
    applicationDeadlines: boolean;
    jobMatches: boolean;
  };
  sms: {
    interviewReminders: boolean;
    urgentUpdates: boolean;
  };
}

interface PrivacySettings {
  profileVisibility: "public" | "private" | "recruiters_only";
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
  allowDirectMessages: boolean;
  showOnlineStatus: boolean;
  dataProcessingConsent: boolean;
  marketingConsent: boolean;
}

interface AccountSettings {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  timezone: string;
  language: string;
  currency: string;
  dateFormat: string;
  theme: "light" | "dark" | "system";
}

interface JobPreferences {
  jobTypes: string[];
  workArrangement: string[];
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  preferredLocations: string[];
  willingToRelocate: boolean;
  availabilityDate: string;
  experienceLevel: string;
}

const timezones = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Asia/Shanghai", label: "China Standard Time (CST)" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST)" },
];

const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "hi", label: "Hindi" },
];

const currencies = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "CAD", label: "Canadian Dollar (CAD)" },
  { value: "AUD", label: "Australian Dollar (AUD)" },
  { value: "JPY", label: "Japanese Yen (JPY)" },
  { value: "CNY", label: "Chinese Yuan (CNY)" },
  { value: "INR", label: "Indian Rupee (INR)" },
];

export default function CandidateSettings() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("account");
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();

  // Settings state
  const [accountSettings, setAccountSettings] = useState<AccountSettings>({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    timezone: "America/New_York",
    language: "en",
    currency: "USD",
    dateFormat: "MM/DD/YYYY",
    theme: "system",
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: {
      newMessages: true,
      interviewReminders: true,
      applicationUpdates: true,
      jobRecommendations: true,
      weeklyDigest: false,
      marketingEmails: false,
    },
    push: {
      newMessages: true,
      interviewReminders: true,
      applicationDeadlines: true,
      jobMatches: false,
    },
    sms: {
      interviewReminders: true,
      urgentUpdates: false,
    },
  });

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profileVisibility: "recruiters_only",
    showEmail: false,
    showPhone: false,
    showLocation: true,
    allowDirectMessages: true,
    showOnlineStatus: true,
    dataProcessingConsent: true,
    marketingConsent: false,
  });

  const [jobPreferences, setJobPreferences] = useState<JobPreferences>({
    jobTypes: ["full-time", "contract"],
    workArrangement: ["remote", "hybrid"],
    salaryRange: {
      min: 80000,
      max: 120000,
      currency: "USD",
    },
    preferredLocations: ["New York, NY", "San Francisco, CA"],
    willingToRelocate: true,
    availabilityDate: "2024-03-01",
    experienceLevel: "mid",
  });

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHasUnsavedChanges(false);
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to save settings",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Account deletion initiated",
        description: "You will receive an email with further instructions.",
      });
    } catch (error) {
      toast({
        title: "Failed to delete account",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const handleExportData = async () => {
    try {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Data export initiated",
        description: "You will receive a download link via email.",
      });
    } catch (error) {
      toast({
        title: "Failed to export data",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const AccountTab = () => (
    <div className="space-y-6">
      {/* Profile Picture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            Profile Picture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src="/avatars/john-doe.jpg" />
              <AvatarFallback className="text-lg">
                {accountSettings.firstName[0]}{accountSettings.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Button size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New
                </Button>
                <Button size="sm" variant="outline">
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Recommended: Square image, at least 400x400px
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={accountSettings.firstName}
                onChange={(e) => {
                  setAccountSettings(prev => ({ ...prev, firstName: e.target.value }));
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={accountSettings.lastName}
                onChange={(e) => {
                  setAccountSettings(prev => ({ ...prev, lastName: e.target.value }));
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={accountSettings.email}
              onChange={(e) => {
                setAccountSettings(prev => ({ ...prev, email: e.target.value }));
                setHasUnsavedChanges(true);
              }}
            />
            <p className="text-sm text-gray-600 mt-1">
              This email will be used for account notifications and login.
            </p>
          </div>
          
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={accountSettings.phone}
              onChange={(e) => {
                setAccountSettings(prev => ({ ...prev, phone: e.target.value }));
                setHasUnsavedChanges(true);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={accountSettings.timezone}
                onValueChange={(value) => {
                  setAccountSettings(prev => ({ ...prev, timezone: value }));
                  setHasUnsavedChanges(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="language">Language</Label>
              <Select
                value={accountSettings.language}
                onValueChange={(value) => {
                  setAccountSettings(prev => ({ ...prev, language: value }));
                  setHasUnsavedChanges(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={accountSettings.currency}
                onValueChange={(value) => {
                  setAccountSettings(prev => ({ ...prev, currency: value }));
                  setHasUnsavedChanges(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={accountSettings.theme}
                onValueChange={(value: "light" | "dark" | "system") => {
                  setAccountSettings(prev => ({ ...prev, theme: value }));
                  setHasUnsavedChanges(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center">
                      <Sun className="w-4 h-4 mr-2" />
                      Light
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center">
                      <Moon className="w-4 h-4 mr-2" />
                      Dark
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center">
                      <Monitor className="w-4 h-4 mr-2" />
                      System
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="w-5 h-5 mr-2" />
            Password & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Password</h4>
              <p className="text-sm text-gray-600">Last changed 3 months ago</p>
            </div>
            <Button variant="outline">
              Change Password
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Two-Factor Authentication</h4>
              <p className="text-sm text-gray-600">Add an extra layer of security</p>
            </div>
            <Button variant="outline">
              Enable 2FA
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const NotificationsTab = () => (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries({
            newMessages: "New messages from recruiters",
            interviewReminders: "Interview reminders and updates",
            applicationUpdates: "Application status changes",
            jobRecommendations: "Job recommendations",
            weeklyDigest: "Weekly activity digest",
            marketingEmails: "Marketing and promotional emails",
          }).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <Label htmlFor={`email-${key}`} className="font-medium">
                  {label}
                </Label>
              </div>
              <Switch
                id={`email-${key}`}
                checked={notificationSettings.email[key as keyof typeof notificationSettings.email]}
                onCheckedChange={(checked) => {
                  setNotificationSettings(prev => ({
                    ...prev,
                    email: { ...prev.email, [key]: checked }
                  }));
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Smartphone className="w-5 h-5 mr-2" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries({
            newMessages: "New messages",
            interviewReminders: "Interview reminders",
            applicationDeadlines: "Application deadlines",
            jobMatches: "New job matches",
          }).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <Label htmlFor={`push-${key}`} className="font-medium">
                  {label}
                </Label>
              </div>
              <Switch
                id={`push-${key}`}
                checked={notificationSettings.push[key as keyof typeof notificationSettings.push]}
                onCheckedChange={(checked) => {
                  setNotificationSettings(prev => ({
                    ...prev,
                    push: { ...prev.push, [key]: checked }
                  }));
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* SMS Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Phone className="w-5 h-5 mr-2" />
            SMS Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries({
            interviewReminders: "Interview reminders",
            urgentUpdates: "Urgent updates only",
          }).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <Label htmlFor={`sms-${key}`} className="font-medium">
                  {label}
                </Label>
              </div>
              <Switch
                id={`sms-${key}`}
                checked={notificationSettings.sms[key as keyof typeof notificationSettings.sms]}
                onCheckedChange={(checked) => {
                  setNotificationSettings(prev => ({
                    ...prev,
                    sms: { ...prev.sms, [key]: checked }
                  }));
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const PrivacyTab = () => (
    <div className="space-y-6">
      {/* Profile Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Profile Visibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="profileVisibility">Who can see your profile?</Label>
            <Select
              value={privacySettings.profileVisibility}
              onValueChange={(value: "public" | "private" | "recruiters_only") => {
                setPrivacySettings(prev => ({ ...prev, profileVisibility: value }));
                setHasUnsavedChanges(true);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public - Anyone can see</SelectItem>
                <SelectItem value="recruiters_only">Recruiters Only</SelectItem>
                <SelectItem value="private">Private - Only you</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium">Contact Information Visibility</h4>
            
            {Object.entries({
              showEmail: "Show email address",
              showPhone: "Show phone number",
              showLocation: "Show location",
            }).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <Label htmlFor={key} className="font-medium">
                  {label}
                </Label>
                <Switch
                  id={key}
                  checked={privacySettings[key as keyof PrivacySettings] as boolean}
                  onCheckedChange={(checked) => {
                    setPrivacySettings(prev => ({ ...prev, [key]: checked }));
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Communication Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Communication Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries({
            allowDirectMessages: "Allow direct messages from recruiters",
            showOnlineStatus: "Show when you're online",
          }).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key} className="font-medium">
                {label}
              </Label>
              <Switch
                id={key}
                checked={privacySettings[key as keyof PrivacySettings] as boolean}
                onCheckedChange={(checked) => {
                  setPrivacySettings(prev => ({ ...prev, [key]: checked }));
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Data & Consent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Data & Consent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries({
            dataProcessingConsent: "Allow processing of personal data for job matching",
            marketingConsent: "Receive marketing communications",
          }).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key} className="font-medium">
                {label}
              </Label>
              <Switch
                id={key}
                checked={privacySettings[key as keyof PrivacySettings] as boolean}
                onCheckedChange={(checked) => {
                  setPrivacySettings(prev => ({ ...prev, [key]: checked }));
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
          ))}
          
          <div className="pt-4 border-t">
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleExportData}>
                <Download className="w-4 h-4 mr-2" />
                Export My Data
              </Button>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Privacy Policy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const JobPreferencesTab = () => (
    <div className="space-y-6">
      {/* Job Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Briefcase className="w-5 h-5 mr-2" />
            Job Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Job Types</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["full-time", "part-time", "contract", "freelance", "internship"].map((type) => (
                <Badge
                  key={type}
                  variant={jobPreferences.jobTypes.includes(type) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    const newTypes = jobPreferences.jobTypes.includes(type)
                      ? jobPreferences.jobTypes.filter(t => t !== type)
                      : [...jobPreferences.jobTypes, type];
                    setJobPreferences(prev => ({ ...prev, jobTypes: newTypes }));
                    setHasUnsavedChanges(true);
                  }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ")}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <Label>Work Arrangement</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["remote", "hybrid", "on-site"].map((arrangement) => (
                <Badge
                  key={arrangement}
                  variant={jobPreferences.workArrangement.includes(arrangement) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    const newArrangements = jobPreferences.workArrangement.includes(arrangement)
                      ? jobPreferences.workArrangement.filter(a => a !== arrangement)
                      : [...jobPreferences.workArrangement, arrangement];
                    setJobPreferences(prev => ({ ...prev, workArrangement: newArrangements }));
                    setHasUnsavedChanges(true);
                  }}
                >
                  {arrangement.charAt(0).toUpperCase() + arrangement.slice(1).replace("-", " ")}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <Label>Experience Level</Label>
            <Select
              value={jobPreferences.experienceLevel}
              onValueChange={(value) => {
                setJobPreferences(prev => ({ ...prev, experienceLevel: value }));
                setHasUnsavedChanges(true);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                <SelectItem value="mid">Mid Level (3-5 years)</SelectItem>
                <SelectItem value="senior">Senior Level (6-10 years)</SelectItem>
                <SelectItem value="lead">Lead/Principal (10+ years)</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Salary & Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Salary & Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Salary Range</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label htmlFor="salaryMin" className="text-sm">Minimum</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  value={jobPreferences.salaryRange.min}
                  onChange={(e) => {
                    setJobPreferences(prev => ({
                      ...prev,
                      salaryRange: { ...prev.salaryRange, min: parseInt(e.target.value) || 0 }
                    }));
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="salaryMax" className="text-sm">Maximum</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  value={jobPreferences.salaryRange.max}
                  onChange={(e) => {
                    setJobPreferences(prev => ({
                      ...prev,
                      salaryRange: { ...prev.salaryRange, max: parseInt(e.target.value) || 0 }
                    }));
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>
            </div>
          </div>
          
          <div>
            <Label>Preferred Locations</Label>
            <div className="space-y-2 mt-2">
              {jobPreferences.preferredLocations.map((location, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={location}
                    onChange={(e) => {
                      const newLocations = [...jobPreferences.preferredLocations];
                      newLocations[index] = e.target.value;
                      setJobPreferences(prev => ({ ...prev, preferredLocations: newLocations }));
                      setHasUnsavedChanges(true);
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newLocations = jobPreferences.preferredLocations.filter((_, i) => i !== index);
                      setJobPreferences(prev => ({ ...prev, preferredLocations: newLocations }));
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setJobPreferences(prev => ({
                    ...prev,
                    preferredLocations: [...prev.preferredLocations, ""]
                  }));
                  setHasUnsavedChanges(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="willingToRelocate" className="font-medium">
              Willing to relocate
            </Label>
            <Switch
              id="willingToRelocate"
              checked={jobPreferences.willingToRelocate}
              onCheckedChange={(checked) => {
                setJobPreferences(prev => ({ ...prev, willingToRelocate: checked }));
                setHasUnsavedChanges(true);
              }}
            />
          </div>
          
          <div>
            <Label htmlFor="availabilityDate">Availability Date</Label>
            <Input
              id="availabilityDate"
              type="date"
              value={jobPreferences.availabilityDate}
              onChange={(e) => {
                setJobPreferences(prev => ({ ...prev, availabilityDate: e.target.value }));
                setHasUnsavedChanges(true);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const DangerZoneTab = () => (
    <div className="space-y-6">
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Danger Zone
          </CardTitle>
          <p className="text-sm text-gray-600">
            These actions are irreversible. Please proceed with caution.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <h4 className="font-medium text-red-600">Export Account Data</h4>
              <p className="text-sm text-gray-600">
                Download all your account data in JSON format
              </p>
            </div>
            <Button variant="outline" onClick={handleExportData}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <h4 className="font-medium text-red-600">Delete Account</h4>
              <p className="text-sm text-gray-600">
                Permanently delete your account and all associated data
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account
                    and remove all your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your account preferences and privacy settings
          </p>
        </div>
        
        {hasUnsavedChanges && (
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Unsaved changes
            </Badge>
            <Button onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="account" className="flex items-center">
            <User className="w-4 h-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="job-preferences" className="flex items-center">
            <Briefcase className="w-4 h-4 mr-2" />
            Job Preferences
          </TabsTrigger>
          <TabsTrigger value="danger" className="flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Danger Zone
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <AccountTab />
        </TabsContent>
        
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
        
        <TabsContent value="privacy">
          <PrivacyTab />
        </TabsContent>
        
        <TabsContent value="job-preferences">
          <JobPreferencesTab />
        </TabsContent>
        
        <TabsContent value="danger">
          <DangerZoneTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}