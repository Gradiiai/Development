"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Badge } from "@/components/ui/shared/badge";
import { Checkbox } from "@/components/ui/shared/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/shared/input";
import { Label } from "@/components/ui/shared/label";
import { Skeleton } from "@/components/ui/shared/skeleton";
import { toast } from "sonner";
import {
  Linkedin,
  CheckCircle,
  ExternalLink,
  Copy,
  Edit3,
  Send,
  MapPin,
  DollarSign,
  Users,
  Calendar,
  RefreshCw,
  ThumbsUpIcon,
  MessageSquareText,
  Forward,
  ForwardIcon,
  Sparkles,
  SparklesIcon,
} from "lucide-react";

interface JobCampaign {
  id: string;
  campaignName: string;
  jobTitle: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  numberOfOpenings: number;
  status: string;
  createdAt: string;
  companyName: string;
}

interface LinkedInConnection {
  isConnected: boolean;
  organizationId?: string;
  profileId?: string;
  tokenExpiry?: string;
}

export default function LinkedInDashboard() {
  const { data: session } = useSession();
  const [linkedInStatus, setLinkedInStatus] = useState<LinkedInConnection>({
    isConnected: false,
  });
  const [campaigns, setCampaigns] = useState<JobCampaign[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postContent, setPostContent] = useState<{ [key: string]: string }>({});
  const [editingPost, setEditingPost] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchLinkedInStatus();
      fetchCampaigns();
    }
  }, [session]);

  const fetchLinkedInStatus = async () => {
    try {
      const response = await fetch("/api/linkedin/status");
      if (response.ok) {
        const data = await response.json();
        setLinkedInStatus(data);
      }
    } catch (error) {
      console.error("Error fetching LinkedIn status:", error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      if (!session?.user?.companyId) {
        toast.error("Company information not found");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `/api/campaigns/jobs?companyId=${session.user.companyId}`
      );
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.data || []);

        // Generate initial post content for all campaigns
        const initialContent: { [key: string]: string } = {};
        data.data?.forEach((campaign: JobCampaign) => {
          initialContent[campaign.id] = generatePostContent(campaign);
        });
        setPostContent(initialContent);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const generatePostContent = (campaign: JobCampaign) => {
    const formLink = `${window.location.origin}/jobs/apply/${campaign.id}`;
    const salaryText =
      campaign.salaryMin && campaign.salaryMax
        ? `${campaign.currency} ${campaign.salaryMin.toLocaleString()} - ${campaign.salaryMax.toLocaleString()}`
        : "Competitive salary";

    return `🚀 We're hiring! Join our team as a ${campaign.jobTitle}

📍 Location: ${campaign.location}
💰 Salary: ${salaryText}
👥 Openings: ${campaign.numberOfOpenings}

We're looking for talented individuals to join ${campaign.companyName}. This is a great opportunity to grow your career and make an impact!

Ready to apply? Click the link below:
${formLink}

#hiring #jobs #career #${campaign.jobTitle.replace(/\s+/g, "")}`;
  };

  const handleLinkedInConnect = async () => {
    setConnecting(true);
    try {
      const response = await fetch("/api/auth/linkedin/connect", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.authUrl;
      } else {
        throw new Error("Failed to initiate LinkedIn connection");
      }
    } catch (error) {
      console.error("Error connecting to LinkedIn:", error);
      toast.error("Failed to connect to LinkedIn");
    } finally {
      setConnecting(false);
    }
  };

  const handleCampaignSelect = (campaignId: string, checked: boolean) => {
    const newSelected = new Set(selectedCampaigns);
    if (checked) {
      newSelected.add(campaignId);
    } else {
      newSelected.delete(campaignId);
    }
    setSelectedCampaigns(newSelected);
  };

  const handlePostContentChange = (campaignId: string, content: string) => {
    setPostContent((prev) => ({
      ...prev,
      [campaignId]: content,
    }));
  };

  const copyFormLink = (campaignId: string) => {
    const formLink = `${window.location.origin}/jobs/apply/${campaignId}`;
    navigator.clipboard.writeText(formLink);
    toast.success("Form link copied to clipboard!");
  };

  const handlePostToLinkedIn = async (campaignId: string) => {
    if (!linkedInStatus.isConnected) {
      toast.error("Please connect your LinkedIn account first");
      return;
    }

    setPosting(true);
    try {
      const response = await fetch("/api/linkedin/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId,
          content: postContent[campaignId],
        }),
      });

      if (response.ok) {
        toast.success("Posted to LinkedIn successfully!");
        setSelectedCampaigns((prev) => {
          const newSet = new Set(prev);
          newSet.delete(campaignId);
          return newSet;
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to post to LinkedIn");
      }
    } catch (error: any) {
      console.error("Error posting to LinkedIn:", error);
      toast.error(error.message || "Failed to post to LinkedIn");
    } finally {
      setPosting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">LinkedIn Integration</h1>
            <p className="text-muted-foreground">
              Connect your LinkedIn account and post job campaigns to reach more
              candidates
            </p>
          </div>
          <Button onClick={fetchCampaigns} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* LinkedIn Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-blue-600" />
              LinkedIn Connection
            </CardTitle>
            <CardDescription>
              Connect your LinkedIn account to post job campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            {linkedInStatus.isConnected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Connected to LinkedIn</span>
                  {linkedInStatus.tokenExpiry && (
                    <Badge variant="secondary">
                      Expires:{" "}
                      {new Date(
                        linkedInStatus.tokenExpiry
                      ).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={handleLinkedInConnect}
                  variant="outline"
                  disabled={connecting}
                >
                  {connecting ? "Reconnecting..." : "Reconnect"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                  <span>Not connected to LinkedIn</span>
                </div>
                <Button
                  onClick={handleLinkedInConnect}
                  disabled={connecting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Linkedin className="h-4 w-4 mr-2" />
                  {connecting ? "Connecting..." : "Connect with LinkedIn"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Active Job Campaigns</CardTitle>
            <CardDescription>
              Select campaigns to post on LinkedIn and customize the post
              content
            </CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No active campaigns found
                </p>
                <Button
                  onClick={() =>
                    (window.location.href = "/dashboard/campaigns")
                  }
                  variant="outline"
                  className="mt-4"
                >
                  Create Campaign
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="border rounded-lg p-4 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedCampaigns.has(campaign.id)}
                          onCheckedChange={(checked) =>
                            handleCampaignSelect(
                              campaign.id,
                              checked as boolean
                            )
                          }
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {campaign.jobTitle}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {campaign.campaignName}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {campaign.location}
                            </div>
                            {campaign.salaryMin && campaign.salaryMax && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                {campaign.currency}{" "}
                                {campaign.salaryMin.toLocaleString()} -{" "}
                                {campaign.salaryMax.toLocaleString()}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {campaign.numberOfOpenings} opening
                              {campaign.numberOfOpenings !== 1 ? "s" : ""}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(campaign.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={
                          campaign.status === "active" ? "default" : "secondary"
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </div>

                    {selectedCampaigns.has(campaign.id) && (
                      <div className="space-y-4 border-t pt-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`post-${campaign.id}`}>
                            Post Content
                          </Label>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => copyFormLink(campaign.id)}
                              variant="outline"
                              size="sm"
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy Form Link
                            </Button>
                            <Button
                              onClick={() =>
                                setEditingPost(
                                  editingPost === campaign.id
                                    ? null
                                    : campaign.id
                                )
                              }
                              variant="outline"
                              size="sm"
                            >
                              <Edit3 className="h-4 w-4 mr-1" />
                              {editingPost === campaign.id ? "Preview" : "Edit"}
                            </Button>
                          </div>
                        </div>

                        {editingPost === campaign.id ? (
                          <Textarea
                            id={`post-${campaign.id}`}
                            value={postContent[campaign.id] || ""}
                            onChange={(
                              e: React.ChangeEvent<HTMLTextAreaElement>
                            ) =>
                              handlePostContentChange(
                                campaign.id,
                                e.target.value
                              )
                            }
                            rows={8}
                            placeholder="Write your LinkedIn post content..."
                          />
                        ) : (
                          <div className="flex p-4 rounded-lg">
                            {/* Left Content */}
                            <div className="w-1/2 mr-4">
                              <h1 className="font-bold mb-2 text-md">
                                Create a new Post
                              </h1>
                              <p className="text-xs text-muted-foreground mb-5">
                                Instantly create captivating posts for your
                                LinkedIn audience.
                              </p>
                              <div className="mb-4 text-xs">
                                <h1 className="font-bold">Campaign Name</h1>
                                <p className="p-3 border-[1px] border-black mt-2 rounded-lg">
                                  {campaign.campaignName}
                                </p>
                              </div>
                              <div className="mb-4 text-xs">
                                <h1 className="font-bold">Tone</h1>
                                {/* Drop down menu of 10 different tones */}
                                <select className="p-3 border-[1px] border-black mt-2 rounded-lg w-full">
                                  <option value="professional">
                                    Professional
                                  </option>
                                  <option value="casual">Casual</option>
                                  <option value="enthusiastic">
                                    Enthusiastic
                                  </option>
                                  <option value="informative">
                                    Informative
                                  </option>
                                  <option value="persuasive">Persuasive</option>
                                  <option value="friendly">Friendly</option>
                                  <option value="confident">Confident</option>
                                  <option value="inspirational">
                                    Inspirational
                                  </option>
                                  <option value="humorous">Humorous</option>
                                  <option value="concise">Concise</option>
                                </select>
                              </div>
                              <div className="mb-4 text-xs">
                                <div className="flex items-center justify-between mb-2">
                                  <h1 className="font-bold">Post Content</h1>
                                  <p className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-[10px] text-white rounded-3xl cursor-pointer">
                                    {" "}
                                    <SparklesIcon size={14} /> Enhance with AI
                                  </p>
                                </div>
                                <pre className="whitespace-pre-wrap text-sm font-sans p-3 border-[1px] border-black mt-2 rounded-lg w-full">
                                  {postContent[campaign.id] ||
                                    generatePostContent(campaign)}
                                </pre>
                              </div>
                              <div className="mb-4 text-xs">
                                <div className="flex items-center justify-between mb-2">
                                  <h1 className="font-bold">Upload an Image</h1>
                                  <p className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-[10px] text-white rounded-3xl cursor-pointer">
                                    {" "}
                                    <SparklesIcon size={14} /> Generate with AI
                                  </p>
                                </div>
                                <div className="p-3 border-[1px] border-black mt-2 rounded-lg">
                                  <p className="text-gray-500 text-xs">
                                    Upload an image to enhance your post
                                  </p>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="mt-2 w-full"
                                  />
                                </div>
                              </div>
                            </div>
                            {/* Right Content */}
                            <div className="w-1/2 bg-[#f5f5f5] flex flex-col justify-start items-center p-4 rounded-lg">
                              <div className="w-full h-max bg-white p-4 rounded-lg">
                                <div className="flex mb-5">
                                  <img
                                    src="https://media.licdn.com/dms/image/v2/D4D03AQHk9OLMiBfCgA/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1731484109725?e=2147483647&v=beta&t=IzSyRQwvqsHLxlMaKd0hRHDgQdDPBf5f2TKgS-CW1ok"
                                    alt="Profile-Picture.jpg"
                                    className="h-10 w-10 rounded-full mr-3"
                                  />
                                  <div>
                                    <h3 className="font-bold">
                                      Himanshu Bohra
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                      Software Engineer at XYZ Corp
                                    </p>
                                  </div>
                                </div>
                                <pre className="whitespace-pre-wrap text-sm font-sans">
                                  {postContent[campaign.id] ||
                                    generatePostContent(campaign)}
                                </pre>
                                <hr className="border-t border-black/50 my-4" />

                                <div className="flex justify-around items-center gap-4 text-sm text-gray-500">
                                  <div className="flex items-center gap-2">
                                    <p>Like</p>
                                    <ThumbsUpIcon size={18} />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <p>Comment</p>
                                    <MessageSquareText size={18} />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <p>Share</p>
                                    <ForwardIcon size={18} />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <p>Send</p>
                                    <Send size={18} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end">
                          <Button
                            onClick={() => handlePostToLinkedIn(campaign.id)}
                            disabled={!linkedInStatus.isConnected || posting}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {posting ? "Posting..." : "Post to LinkedIn"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedCampaigns.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Bulk Actions</CardTitle>
              <CardDescription>Actions for selected campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    selectedCampaigns.forEach((campaignId) => {
                      copyFormLink(campaignId);
                    });
                  }}
                  variant="outline"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All Form Links
                </Button>
                <Button
                  onClick={() => {
                    if (linkedInStatus.isConnected) {
                      selectedCampaigns.forEach((campaignId) => {
                        handlePostToLinkedIn(campaignId);
                      });
                    } else {
                      toast.error("Please connect your LinkedIn account first");
                    }
                  }}
                  disabled={!linkedInStatus.isConnected || posting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Post All to LinkedIn
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
