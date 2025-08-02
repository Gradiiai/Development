"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Badge } from "@/components/ui/shared/badge";
import { Input } from "@/components/ui/shared/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/shared/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/shared/dropdown-menu";
import {
  Bell,
  Search,
  Filter,
  MoreVertical,
  Check,
  Archive,
  Star,
  StarOff,
  Calendar,
  Briefcase,
  MessageSquare,
  FileText,
  Clock,
  CheckCircle2,
  Settings,
  Building2,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/shared/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "interview_scheduled" | "interview_reminder" | "application_update" | "message" | "document_request" | "feedback" | "system" | "offer";
  title: string;
  message: string;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  createdAt: Date;
  priority: "low" | "medium" | "high" | "urgent";
  actionUrl?: string;
  actionText?: string;
  metadata?: {
    companyName?: string;
    positionTitle?: string;
    interviewDate?: Date;
    applicationId?: string;
    documentType?: string;
    senderName?: string;
  };
}

export default function CandidateNotifications() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setError(null);
      
      // First try to fetch from our new notification service
      if (session?.user?.id) {
        const newNotificationsResponse = await fetch(`/api/candidate/notifications?userId=${session.user.id}`);
        const newNotificationsData = await newNotificationsResponse.json();
        
        if (newNotificationsData.success && newNotificationsData.notifications.length > 0) {
          // Convert new notification format to existing format
          const convertedNotifications = newNotificationsData.notifications.map((notif: any) => ({
            id: notif.id,
            type: notif.type === 'approved' ? 'application_update' : 
                  notif.type === 'rejected' ? 'application_update' : 
                  notif.type === 'next_round' ? 'interview_scheduled' : 'application_update',
            title: notif.title,
            message: notif.message,
            isRead: notif.isRead,
            isStarred: false,
            isArchived: false,
            createdAt: new Date(notif.createdAt),
            priority: notif.type === 'approved' ? 'high' : 
                     notif.type === 'rejected' ? 'medium' : 
                     notif.type === 'next_round' ? 'urgent' : 'medium',
            metadata: {
              companyName: notif.companyName,
              positionTitle: notif.campaignTitle,
            },
          }));
          
          setNotifications(convertedNotifications);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }
      
      // Fallback to existing API
      const response = await fetch('/api/candidates/notifications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        // Ensure data is an array and add null safety
        const data = Array.isArray(result.data) ? result.data : [];
        const formattedNotifications = data.map((notif: any) => ({
          ...notif,
          createdAt: new Date(notif.createdAt),
          metadata: {
            ...notif.metadata,
            interviewDate: notif.metadata?.interviewDate ? new Date(notif.metadata.interviewDate) : undefined,
          },
        }));
        setNotifications(formattedNotifications);
      } else {
        setError(result.error || 'Failed to fetch notifications');
      }
    } catch (err) {
      setError('Failed to fetch notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
    }
  }, [session]);

  // Refresh notifications
  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const filteredNotifications = notifications.filter(notification => {
    // Filter by tab
    if (activeTab === "unread" && notification.isRead) return false;
    if (activeTab === "starred" && !notification.isStarred) return false;
    if (activeTab === "archived" && !notification.isArchived) return false;
    if (activeTab !== "archived" && notification.isArchived) return false;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query) ||
        notification.metadata?.companyName?.toLowerCase().includes(query) ||
        notification.metadata?.positionTitle?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead && !n.isArchived).length;
  const starredCount = notifications.filter(n => n.isStarred && !n.isArchived).length;
  const archivedCount = notifications.filter(n => n.isArchived).length;

  // API call to update notification
  const updateNotification = async (notificationId: string, updates: Partial<Notification>) => {
    try {
      const response = await fetch(`/api/candidates/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (result.success) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, ...updates } : n
          )
        );
        return true;
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update notification",
          variant: "destructive",
        });
        return false;
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update notification",
        variant: "destructive",
      });
      return false;
    }
  };

  const markAsRead = async (notificationId: string) => {
    // Try new notification service first
    try {
      const newServiceResponse = await fetch('/api/candidate/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      });

      const newServiceData = await newServiceResponse.json();
      
      if (newServiceData.success) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        return;
      }
    } catch (err) {
      console.log('New service not available, falling back to old service');
    }
    
    // Fallback to old service
    updateNotification(notificationId, { isRead: true });
  };

  const markAsUnread = (notificationId: string) => {
    updateNotification(notificationId, { isRead: false });
  };

  const toggleStar = (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      updateNotification(notificationId, { isStarred: !notification.isStarred });
    }
  };

  const archiveNotification = (notificationId: string) => {
    updateNotification(notificationId, { isArchived: true });
    toast({
      title: "Notification archived",
      description: "The notification has been moved to archive.",
    });
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/candidates/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        toast({
          title: "Notification deleted",
          description: "The notification has been permanently deleted.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete notification",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/candidates/notifications/mark-all-read', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, isRead: true }))
        );
        toast({
          title: "All notifications marked as read",
          description: "All your notifications have been marked as read.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to mark all as read",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to mark all as read",
        variant: "destructive",
      });
    }
  };

  const bulkAction = async (action: "read" | "unread" | "star" | "archive" | "delete") => {
    try {
      const response = await fetch('/api/candidates/notifications/bulk-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds: selectedNotifications,
          action,
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (action === "delete") {
          setNotifications(prev => prev.filter(n => !selectedNotifications.includes(n.id)));
        } else {
          setNotifications(prev => 
            prev.map(n => {
              if (!selectedNotifications.includes(n.id)) return n;
              
              switch (action) {
                case "read":
                  return { ...n, isRead: true };
                case "unread":
                  return { ...n, isRead: false };
                case "star":
                  return { ...n, isStarred: true };
                case "archive":
                  return { ...n, isArchived: true };
                default:
                  return n;
              }
            })
          );
        }
        
        setSelectedNotifications([]);
        
        toast({
          title: "Bulk action completed",
          description: `${selectedNotifications.length} notifications updated.`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to perform bulk action",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to perform bulk action",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "interview_scheduled":
      case "interview_reminder":
        return Calendar;
      case "application_update":
        return Briefcase;
      case "message":
        return MessageSquare;
      case "document_request":
        return FileText;
      case "feedback":
        return Star;
      case "offer":
        return CheckCircle2;
      case "system":
        return Settings;
      default:
        return Bell;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    const Icon = getNotificationIcon(notification.type);
    
    return (
      <Card className={cn(
        "transition-all hover:shadow-md cursor-pointer",
        !notification.isRead && "border-l-4 border-l-blue-500 bg-blue-50/30",
        selectedNotifications.includes(notification.id) && "ring-2 ring-blue-500"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            {/* Selection Checkbox */}
            <input
              type="checkbox"
              checked={selectedNotifications.includes(notification.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedNotifications(prev => [...prev, notification.id]);
                } else {
                  setSelectedNotifications(prev => prev.filter(id => id !== notification.id));
                }
              }}
              className="mt-1"
            />
            
            {/* Icon */}
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
              notification.type === "offer" ? "bg-green-100" :
              notification.type === "interview_scheduled" || notification.type === "interview_reminder" ? "bg-blue-100" :
              notification.type === "application_update" ? "bg-purple-100" :
              "bg-gray-100"
            )}>
              <Icon className={cn(
                "w-5 h-5",
                notification.type === "offer" ? "text-green-600" :
                notification.type === "interview_scheduled" || notification.type === "interview_reminder" ? "text-blue-600" :
                notification.type === "application_update" ? "text-purple-600" :
                "text-gray-600"
              )} />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className={cn(
                      "text-sm font-medium",
                      !notification.isRead ? "text-gray-900" : "text-gray-700"
                    )}>
                      {notification.title}
                    </h3>
                    
                    {notification.priority !== "low" && (
                      <Badge className={cn("text-xs", getPriorityColor(notification.priority))}>
                        {notification.priority}
                      </Badge>
                    )}
                    
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {notification.message}
                  </p>
                  
                  {notification.metadata && (
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                      {notification.metadata.companyName && (
                        <div className="flex items-center space-x-1">
                          <Building2 className="w-3 h-3" />
                          <span>{notification.metadata.companyName}</span>
                        </div>
                      )}
                      {notification.metadata.positionTitle && (
                        <div className="flex items-center space-x-1">
                          <Briefcase className="w-3 h-3" />
                          <span>{notification.metadata.positionTitle}</span>
                        </div>
                      )}
                      {notification.metadata.interviewDate && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{format(notification.metadata.interviewDate, "MMM d, h:mm a")}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                    </span>
                    
                    {notification.actionUrl && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={notification.actionUrl}>
                          {notification.actionText || "View"}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center space-x-1 ml-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(notification.id);
                    }}
                  >
                    {notification.isStarred ? (
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    ) : (
                      <StarOff className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => notification.isRead ? markAsUnread(notification.id) : markAsRead(notification.id)}>
                        {notification.isRead ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Mark as unread
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Mark as read
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleStar(notification.id)}>
                        {notification.isStarred ? (
                          <>
                            <StarOff className="w-4 h-4 mr-2" />
                            Remove star
                          </>
                        ) : (
                          <>
                            <Star className="w-4 h-4 mr-2" />
                            Add star
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => archiveNotification(notification.id)}>
                        <Archive className="w-4 h-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteNotification(notification.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4">Error loading notifications</div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">
            Stay updated with your applications and interviews
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
          
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
          
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {selectedNotifications.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {selectedNotifications.length} selected
            </span>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Bulk Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => bulkAction("read")}>
                  <Eye className="w-4 h-4 mr-2" />
                  Mark as read
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkAction("unread")}>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Mark as unread
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkAction("star")}>
                  <Star className="w-4 h-4 mr-2" />
                  Add star
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkAction("archive")}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => bulkAction("delete")}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ml-2">
              {notifications.filter(n => !n.isArchived).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="starred">
            Starred
            {starredCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {starredCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived
            {archivedCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {archivedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No notifications found
                </h3>
                <p className="text-gray-600">
                  {searchQuery 
                    ? "Try adjusting your search terms"
                    : activeTab === "unread" 
                    ? "You're all caught up!"
                    : activeTab === "starred"
                    ? "No starred notifications yet"
                    : activeTab === "archived"
                    ? "No archived notifications"
                    : "You don't have any notifications yet"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}