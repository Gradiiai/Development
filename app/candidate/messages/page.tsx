"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import { Label } from "@/components/ui/shared/label";
import { Badge } from "@/components/ui/shared/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/shared/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/shared/dropdown-menu";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  MessageCircle,
  Send,
  Search,
  Filter,
  MoreVertical,
  Phone,
  Video,
  Calendar,
  Paperclip,
  Star,
  Archive,
  Trash2,
  Reply,
  Forward,
  Building2,
  User,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Loader2,
  FileText,
  Image,
  Download,
  ExternalLink,
  Mail,
  Users,
} from "lucide-react";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { useToast } from "@/shared/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  senderId: string;
  senderName: string;
  senderRole: "candidate" | "recruiter" | "hiring_manager" | "system";
  isRead: boolean;
  attachments?: {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  }[];
}

interface Conversation {
  id: string;
  subject: string;
  participants: {
    id: string;
    name: string;
    role: "candidate" | "recruiter" | "hiring_manager";
    avatar?: string;
    company?: string;
  }[];
  lastMessage: Message;
  unreadCount: number;
  isStarred: boolean;
  isArchived: boolean;
  relatedTo?: {
    type: "application" | "interview" | "general";
    id: string;
    title: string;
  };
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

const formatMessageTime = (date: Date) => {
  if (isToday(date)) {
    return format(date, "HH:mm");
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else {
    return format(date, "MMM d");
  }
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

// Default empty conversations array
const defaultConversations: Conversation[] = [];

export default function CandidateMessages() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>(defaultConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "starred" | "archived">("all");
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch conversations data
  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/candidates/messages');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      const data = await response.json();
      
      // Handle empty or null data
      if (!data || !Array.isArray(data)) {
        setConversations([]);
        setError(null);
        return;
      }
      
      // Convert date strings to Date objects with null safety
      const conversationsWithDates = data.map((conv: any) => ({
        ...conv,
        createdAt: conv.createdAt ? new Date(conv.createdAt) : new Date(),
        updatedAt: conv.updatedAt ? new Date(conv.updatedAt) : new Date(),
        lastMessage: conv.lastMessage ? {
          ...conv.lastMessage,
          timestamp: conv.lastMessage.timestamp ? new Date(conv.lastMessage.timestamp) : new Date(),
        } : null,
        messages: (conv.messages || []).map((msg: any) => ({
          ...msg,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        })),
      }));
      setConversations(conversationsWithDates);
      setError(null);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to load messages');
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load conversations on component mount
  useEffect(() => {
    if (session?.user) {
      fetchConversations();
    }
  }, [session]);

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = 
      conv.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.participants.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      conv.lastMessage.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filter === "all" ||
      (filter === "unread" && conv.unreadCount > 0) ||
      (filter === "starred" && conv.isStarred) ||
      (filter === "archived" && conv.isArchived);
    
    return matchesSearch && matchesFilter && !conv.isArchived;
  });

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages]);

  // Mark conversation as read when selected
  useEffect(() => {
    if (selectedConversation && selectedConversation.unreadCount > 0) {
      setConversations(prev => prev.map(conv => 
        conv.id === selectedConversation.id 
          ? { ...conv, unreadCount: 0, messages: conv.messages.map(msg => ({ ...msg, isRead: true })) }
          : conv
      ));
    }
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch('/api/candidates/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: newMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const sentMessage = await response.json();
      const messageWithDate = {
        ...sentMessage,
        timestamp: new Date(sentMessage.timestamp),
      };

      // Update conversations
      setConversations(prev => prev.map(conv => 
        conv.id === selectedConversation.id 
          ? {
              ...conv,
              messages: [...conv.messages, messageWithDate],
              lastMessage: messageWithDate,
              updatedAt: new Date(),
            }
          : conv
      ));

      // Update selected conversation
      setSelectedConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, messageWithDate],
        lastMessage: messageWithDate,
        updatedAt: new Date(),
      } : null);

      setNewMessage("");
      
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleStar = (conversationId: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, isStarred: !conv.isStarred }
        : conv
    ));
  };

  const handleArchive = (conversationId: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, isArchived: true }
        : conv
    ));
    
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(null);
      setShowMobileChat(false);
    }
  };

  const getUnreadCount = () => {
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
  };

  const ConversationList = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Messages</h2>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Filters */}
        <div className="flex space-x-2">
          {[
            { key: "all", label: "All", count: conversations.length },
            { key: "unread", label: "Unread", count: getUnreadCount() },
            { key: "starred", label: "Starred", count: conversations.filter(c => c.isStarred).length },
          ].map(({ key, label, count }) => (
            <Button
              key={key}
              variant={filter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(key as any)}
              className="text-xs"
            >
              {label} {count > 0 && `(${count})`}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No conversations found
            </h3>
            <p className="text-gray-600">
              {searchTerm ? "Try adjusting your search." : "Start a new conversation."}
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const otherParticipant = conversation.participants.find(p => p.role !== "candidate");
            
            return (
              <div
                key={conversation.id}
                className={cn(
                  "p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors",
                  selectedConversation?.id === conversation.id && "bg-blue-50 border-blue-200"
                )}
                onClick={() => {
                  setSelectedConversation(conversation);
                  setShowMobileChat(true);
                }}
              >
                <div className="flex items-start space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={otherParticipant?.avatar} />
                    <AvatarFallback>
                      {getInitials(otherParticipant?.name || "Unknown")}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {otherParticipant?.name || "Unknown"}
                        </h3>
                        {otherParticipant?.company && (
                          <Badge variant="outline" className="text-xs">
                            {otherParticipant.company}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        {conversation.isStarred && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                        <span className="text-xs text-gray-500">
                          {formatMessageTime(conversation.lastMessage.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm font-medium text-gray-900 mb-1 truncate">
                      {conversation.subject}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate flex-1">
                        {conversation.lastMessage.senderRole === "candidate" ? "You: " : ""}
                        {conversation.lastMessage.content}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <Badge className="ml-2 bg-blue-600">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                    
                    {conversation.relatedTo && (
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <Building2 className="w-3 h-3 mr-1" />
                        {conversation.relatedTo.title}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const ChatView = () => {
    if (!selectedConversation) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Select a conversation
            </h3>
            <p className="text-gray-600">
              Choose a conversation from the list to start messaging.
            </p>
          </div>
        </div>
      );
    }

    const otherParticipant = selectedConversation.participants.find(p => p.role !== "candidate");

    return (
      <div className="h-full flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setShowMobileChat(false)}
              >
                ←
              </Button>
              <Avatar className="w-10 h-10">
                <AvatarImage src={otherParticipant?.avatar} />
                <AvatarFallback>
                  {getInitials(otherParticipant?.name || "Unknown")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-gray-900">
                  {otherParticipant?.name || "Unknown"}
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>{otherParticipant?.company}</span>
                  <span>•</span>
                  <span className="capitalize">{otherParticipant?.role?.replace("_", " ")}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleStar(selectedConversation.id)}
              >
                <Star className={cn(
                  "w-4 h-4",
                  selectedConversation.isStarred ? "text-yellow-500 fill-current" : "text-gray-400"
                )} />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Video className="w-4 h-4 mr-2" />
                    Video Call
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Meeting
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleArchive(selectedConversation.id)}>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {selectedConversation.relatedTo && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center text-sm text-blue-800">
                <Building2 className="w-4 h-4 mr-2" />
                Related to: {selectedConversation.relatedTo.title}
              </div>
            </div>
          )}
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedConversation.messages.map((message) => {
            const isFromCandidate = message.senderRole === "candidate";
            
            return (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  isFromCandidate ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg p-3",
                    isFromCandidate
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  )}
                >
                  {!isFromCandidate && (
                    <div className="text-xs font-medium mb-1 opacity-75">
                      {message.senderName}
                    </div>
                  )}
                  
                  <div className="text-sm">{message.content}</div>
                  
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className={cn(
                            "flex items-center space-x-2 p-2 rounded border",
                            isFromCandidate
                              ? "bg-blue-500 border-blue-400"
                              : "bg-white border-gray-200"
                          )}
                        >
                          <FileText className="w-4 h-4" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {attachment.name}
                            </p>
                            <p className="text-xs opacity-75">
                              {(attachment.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn(
                              "h-6 w-6 p-0",
                              isFromCandidate
                                ? "hover:bg-blue-500 text-white"
                                : "hover:bg-gray-200"
                            )}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      "text-xs mt-1 opacity-75",
                      isFromCandidate ? "text-right" : "text-left"
                    )}
                  >
                    {format(message.timestamp, "HH:mm")}
                    {isFromCandidate && (
                      <span className="ml-1">
                        {message.isRead ? (
                          <CheckCircle2 className="w-3 h-3 inline" />
                        ) : (
                          <Circle className="w-3 h-3 inline" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message Input */}
        <div className="p-4 border-t bg-white">
          <div className="flex items-end space-x-2">
            <Button variant="ghost" size="sm">
              <Paperclip className="w-4 h-4" />
            </Button>
            
            <div className="flex-1">
              <Textarea
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="min-h-[40px] max-h-[120px] resize-none"
              />
            </div>
            
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              size="sm"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-4rem)]">
      {/* Desktop Layout */}
      <div className="hidden md:flex h-full">
        <div className="w-1/3 border-r bg-white">
          <ConversationList />
        </div>
        <div className="flex-1 bg-gray-50">
          <ChatView />
        </div>
      </div>
      
      {/* Mobile Layout */}
      <div className="md:hidden h-full">
        {!showMobileChat ? (
          <div className="bg-white h-full">
            <ConversationList />
          </div>
        ) : (
          <div className="bg-gray-50 h-full">
            <ChatView />
          </div>
        )}
      </div>
    </div>
  );
}