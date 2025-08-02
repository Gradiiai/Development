"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/shared/dialog";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import { Label } from "@/components/ui/shared/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportCreated?: () => void;
}

interface ReportFormData {
  title: string;
  description: string;
  reportType: string;
  dateRange: string;
  companyId?: string;
}

export function CreateReportModal({ isOpen, onClose, onReportCreated }: CreateReportModalProps) {
  const [formData, setFormData] = useState<ReportFormData>({
    title: "",
    description: "",
    reportType: "",
    dateRange: "",
    companyId: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: keyof ReportFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.reportType || !formData.dateRange) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch("/api/admin/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create report");
      }

      const result = await response.json();
      toast.success("Report created successfully!");
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        reportType: "",
        dateRange: "",
        companyId: ""
      });
      
      onReportCreated?.();
      onClose();
    } catch (error) {
      console.error("Error creating report:", error);
      toast.error("Failed to create report. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Report</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Report Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Enter report title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Enter report description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportType">Report Type *</Label>
            <Select value={formData.reportType} onValueChange={(value) => handleInputChange("reportType", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="analytics">Analytics Report</SelectItem>
                <SelectItem value="performance">Performance Report</SelectItem>
                <SelectItem value="usage">Usage Report</SelectItem>
                <SelectItem value="financial">Financial Report</SelectItem>
                <SelectItem value="compliance">Compliance Report</SelectItem>
                <SelectItem value="custom">Custom Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateRange">Date Range *</Label>
            <Select value={formData.dateRange} onValueChange={(value) => handleInputChange("dateRange", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="last90days">Last 90 Days</SelectItem>
                <SelectItem value="last6months">Last 6 Months</SelectItem>
                <SelectItem value="lastyear">Last Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyId">Company ID (Optional)</Label>
            <Input
              id="companyId"
              value={formData.companyId}
              onChange={(e) => handleInputChange("companyId", e.target.value)}
              placeholder="Enter company ID for company-specific reports"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}