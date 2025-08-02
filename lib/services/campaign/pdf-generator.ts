import jsPDF from 'jspdf';

interface JobDescriptionData {
  campaignName: string;
  jobTitle: string;
  department: string;
  location: string;
  experienceLevel: string;
  employeeType: string;
  salaryMin?: number;
  salaryMax?: number;
  numberOfOpenings: number;
  jobDescription: string;
  jobDuties?: string;
  companyName: string;
  skills?: Array<{
    name: string;
    proficiencyLevel: string;
    weight: number;
    isRequired: boolean;
  }>;
  competencies?: Array<{
    name: string;
    weight: number;
  }>;
}

export function generateJobDescriptionPDF(data: JobDescriptionData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPosition = 30;

  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * fontSize * 0.4);
  };

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Job Description', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Company and Job Title
  doc.setFontSize(16);
  doc.text(data.companyName, margin, yPosition);
  yPosition += 10;
  doc.setFontSize(14);
  doc.text(data.jobTitle, margin, yPosition);
  yPosition += 15;

  // Job Details Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Job Details', margin, yPosition);
  yPosition += 8;
  
  doc.setFont('helvetica', 'normal');
  const jobDetails = [
    `Department: ${data.department}`,
    `Location: ${data.location}`,
    `Experience Level: ${data.experienceLevel}`,
    `Employment Type: ${data.employeeType}`,
    `Number of Openings: ${data.numberOfOpenings}`,
  ];
  
  if (data.salaryMin && data.salaryMax) {
    jobDetails.push(`Salary Range: $${data.salaryMin.toLocaleString()} - $${data.salaryMax.toLocaleString()}`);
  }
  
  jobDetails.forEach(detail => {
    doc.text(detail, margin, yPosition);
    yPosition += 6;
  });
  yPosition += 10;

  // Job Description Section
  doc.setFont('helvetica', 'bold');
  doc.text('Job Description', margin, yPosition);
  yPosition += 8;
  doc.setFont('helvetica', 'normal');
  yPosition = addWrappedText(data.jobDescription, margin, yPosition, pageWidth - 2 * margin);
  yPosition += 10;

  // Job Duties Section (if available)
  if (data.jobDuties) {
    doc.setFont('helvetica', 'bold');
    doc.text('Key Responsibilities', margin, yPosition);
    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    yPosition = addWrappedText(data.jobDuties, margin, yPosition, pageWidth - 2 * margin);
    yPosition += 10;
  }

  // Skills Section (if available)
  if (data.skills && data.skills.length > 0) {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('Required Skills', margin, yPosition);
    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    
    data.skills.forEach(skill => {
      const skillText = `• ${skill.name} (${skill.proficiencyLevel})${skill.isRequired ? ' - Required' : ''}`;
      doc.text(skillText, margin, yPosition);
      yPosition += 6;
    });
    yPosition += 10;
  }

  // Competencies Section (if available)
  if (data.competencies && data.competencies.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Key Competencies', margin, yPosition);
    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    
    data.competencies.forEach(competency => {
      doc.text(`• ${competency.name}`, margin, yPosition);
      yPosition += 6;
    });
  }

  // Footer
  const footerY = doc.internal.pageSize.height - 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, footerY);
  doc.text('Powered by Gradii', pageWidth - margin, footerY, { align: 'right' });

  return doc;
}

export function downloadJobDescriptionPDF(data: JobDescriptionData, filename?: string) {
  const doc = generateJobDescriptionPDF(data);
  const fileName = filename || `${data.jobTitle.replace(/\s+/g, '_')}_JD.pdf`;
  doc.save(fileName);
}

export function getJobDescriptionPDFBlob(data: JobDescriptionData): Blob {
  const doc = generateJobDescriptionPDF(data);
  return doc.output('blob');
}