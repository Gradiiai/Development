import { db } from '@/lib/database/db';
import { candidateNotifications, candidateUsers, jobCampaigns, companies } from '@/lib/database/schema';
import { sendSimpleEmail } from '@/lib/services/email/service';
import { eq, and } from 'drizzle-orm';

interface NotificationData {
  candidateId: string;
  type: 'approved' | 'rejected' | 'next_round';
  title: string;
  message: string;
  metadata?: any;
}

export class CandidateNotificationService {
  /**
   * Send status notification to candidate
   */
  static async sendStatusNotification(
    candidateId: string,
    status: 'approved' | 'rejected' | 'next_round',
    campaignId: string,
    additionalData?: {
      rejectionReason?: string;
      nextRoundDetails?: string;
      interviewDate?: Date;
    }
  ) {
    try {
      // Get candidate and campaign details
      const [candidate] = await db
        .select({
          id: candidateUsers.id,
          email: candidateUsers.email,
          firstName: candidateUsers.firstName,
          lastName: candidateUsers.lastName
        })
        .from(candidateUsers)
        .where(eq(candidateUsers.id, candidateId))
        .limit(1);

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      const candidateName = `${candidate.firstName} ${candidate.lastName}`;

      const [campaign] = await db
        .select({
          id: jobCampaigns.id,
          campaignName: jobCampaigns.campaignName,
          companyId: jobCampaigns.companyId
        })
        .from(jobCampaigns)
        .where(eq(jobCampaigns.id, campaignId))
        .limit(1);

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const [company] = await db
        .select({
          name: companies.name
        })
        .from(companies)
        .where(eq(companies.id, campaign.companyId))
        .limit(1);

      // Prepare notification content based on status
      let notificationData: NotificationData;
      let emailSubject: string;
      let emailContent: string;

      switch (status) {
        case 'approved':
          notificationData = {
            candidateId,
            type: 'approved',
            title: 'Application Approved!',
            message: `Congratulations! Your application for ${campaign.campaignName} at ${company?.name || 'the company'} has been approved.`,
            metadata: {
              campaignId,
              companyName: company?.name,
              position: campaign.campaignName
            }
          };
          emailSubject = `Application Approved - ${campaign.campaignName}`;
          emailContent = this.generateApprovalEmailContent(
            candidateName,
            campaign.campaignName,
            company?.name || 'the company'
          );
          break;

        case 'rejected':
          notificationData = {
            candidateId,
            type: 'rejected',
            title: 'Application Update',
            message: `Thank you for your interest in ${campaign.campaignName} at ${company?.name || 'the company'}. After careful consideration, we have decided to move forward with other candidates.`,
            metadata: {
              campaignId,
              companyName: company?.name,
              position: campaign.campaignName,
              rejectionReason: additionalData?.rejectionReason
            }
          };
          emailSubject = `Application Update - ${campaign.campaignName}`;
          emailContent = this.generateRejectionEmailContent(
            candidateName,
            campaign.campaignName,
            company?.name || 'the company',
            additionalData?.rejectionReason
          );
          break;

        case 'next_round':
          notificationData = {
            candidateId,
            type: 'next_round',
            title: 'Proceeding to Next Round',
            message: `Great news! You have been selected to proceed to the next round for ${campaign.campaignName} at ${company?.name || 'the company'}.`,
            metadata: {
              campaignId,
              companyName: company?.name,
              position: campaign.campaignName,
              nextRoundDetails: additionalData?.nextRoundDetails,
              interviewDate: additionalData?.interviewDate
            }
          };
          emailSubject = `Next Round Invitation - ${campaign.campaignName}`;
          emailContent = this.generateNextRoundEmailContent(
            candidateName,
            campaign.campaignName,
            company?.name || 'the company',
            additionalData?.nextRoundDetails,
            additionalData?.interviewDate
          );
          break;

        default:
          throw new Error('Invalid notification status');
      }

      // Save notification to database
      await db.insert(candidateNotifications).values({
        candidateId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        metadata: notificationData.metadata,
        isRead: false,
        createdAt: new Date()
      });

      // Send email notification
      await sendSimpleEmail({
        to: candidate.email,
        subject: emailSubject,
        html: emailContent
      });

      return { success: true, message: 'Notification sent successfully' };

    } catch (error) {
      console.error('Error sending candidate notification:', error);
      throw error;
    }
  }

  /**
   * Generate approval email content
   */
  private static generateApprovalEmailContent(
    candidateName: string,
    position: string,
    companyName: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your application has been approved</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear ${candidateName},</p>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">
            We are pleased to inform you that your application for the position of <strong>${position}</strong> 
            at <strong>${companyName}</strong> has been approved!
          </p>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">
            Our team was impressed with your qualifications and experience. We believe you would be a great 
            addition to our organization.
          </p>
          
          <div style="background: #e8f5e8; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; color: #155724; font-weight: 500;">
              🚀 Next Steps: Our HR team will be in touch with you shortly regarding the next steps in the process.
            </p>
          </div>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">
            Thank you for your interest in joining our team. We look forward to working with you!
          </p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 5px;">Best regards,</p>
          <p style="font-size: 16px; color: #333; font-weight: 500;">${companyName} Hiring Team</p>
        </div>
      </div>
    `;
  }

  /**
   * Generate rejection email content
   */
  private static generateRejectionEmailContent(
    candidateName: string,
    position: string,
    companyName: string,
    rejectionReason?: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Application Update</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for your interest</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear ${candidateName},</p>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">
            Thank you for your interest in the position of <strong>${position}</strong> at <strong>${companyName}</strong> 
            and for taking the time to participate in our interview process.
          </p>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">
            After careful consideration, we have decided to move forward with other candidates whose experience 
            more closely aligns with our current needs.
          </p>
          
          ${rejectionReason ? `
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; color: #856404;">
                <strong>Feedback:</strong> ${rejectionReason}
              </p>
            </div>
          ` : ''}
          
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">
            We appreciate the time and effort you invested in this process. Your qualifications are impressive, 
            and we encourage you to apply for future opportunities that may be a better fit.
          </p>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">
            We wish you the best of luck in your job search and future endeavors.
          </p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 5px;">Best regards,</p>
          <p style="font-size: 16px; color: #333; font-weight: 500;">${companyName} Hiring Team</p>
        </div>
      </div>
    `;
  }

  /**
   * Generate next round email content
   */
  private static generateNextRoundEmailContent(
    candidateName: string,
    position: string,
    companyName: string,
    nextRoundDetails?: string,
    interviewDate?: Date
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎯 Next Round Invitation</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">You're moving forward!</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear ${candidateName},</p>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">
            Congratulations! We are pleased to inform you that you have been selected to proceed to the next round 
            of our interview process for the position of <strong>${position}</strong> at <strong>${companyName}</strong>.
          </p>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">
            Your performance in the previous round was impressive, and we are excited to learn more about you.
          </p>
          
          ${nextRoundDetails ? `
            <div style="background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; color: #0c5460;">
                <strong>Next Round Details:</strong> ${nextRoundDetails}
              </p>
            </div>
          ` : ''}
          
          ${interviewDate ? `
            <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; color: #155724;">
                <strong>📅 Scheduled Date:</strong> ${interviewDate.toLocaleDateString()} at ${interviewDate.toLocaleTimeString()}
              </p>
            </div>
          ` : ''}
          
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">
            Our team will reach out to you shortly with more details about the next steps. Please keep an eye 
            on your email for further instructions.
          </p>
          
          <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 20px;">
            Thank you for your continued interest in joining our team. We look forward to the next round!
          </p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 5px;">Best regards,</p>
          <p style="font-size: 16px; color: #333; font-weight: 500;">${companyName} Hiring Team</p>
        </div>
      </div>
    `;
  }

  /**
   * Get candidate notifications
   */
  static async getCandidateNotifications(candidateId: string, limit: number = 20) {
    try {
      const notifications = await db
        .select()
        .from(candidateNotifications)
        .where(eq(candidateNotifications.candidateId, candidateId))
        .orderBy(candidateNotifications.createdAt)
        .limit(limit);

      return notifications;
    } catch (error) {
      console.error('Error fetching candidate notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, candidateId: string) {
    try {
      await db
        .update(candidateNotifications)
        .set({ isRead: true })
        .where(
          and(
            eq(candidateNotifications.id, notificationId),
            eq(candidateNotifications.candidateId, candidateId)
          )
        );

      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }
}