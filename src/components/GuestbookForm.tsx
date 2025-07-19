import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { AlertCircle, Loader2, Send } from "lucide-react";
import { useState } from "react";

interface GuestbookFormProps {
  user: User | null;
  onEntryAdded: () => void;
}

export function GuestbookForm({ user, onEntryAdded }: GuestbookFormProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [remainingChars, setRemainingChars] = useState(500);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    setRemainingChars(500 - value.length);
    setError("");
  };

  const getClientIP = async (): Promise<string> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch("https://api.ipify.org?format=json", {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.ip || "unknown";
    } catch (error) {
      console.warn("Failed to get client IP:", error);
      return "unknown";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate message
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError("Please enter a message");
      return;
    }

    if (trimmedMessage.length > 500) {
      setError("Message is too long (max 500 characters)");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      let ipAddress = "";

      // For anonymous users, get IP address
      if (!user) {
        ipAddress = await getClientIP();
      }

      // Call the edge function for moderation and insertion
      const { data, error } = await supabase.functions.invoke(
        "moderate-and-insert",
        {
          body: {
            message: trimmedMessage,
            author_name: user?.user_metadata?.full_name || null,
            author_avatar: user?.user_metadata?.avatar_url || null,
            is_anonymous: !user,
            ip_address: !user ? ipAddress : null,
            user_id: user?.id || null,
          },
        }
      );

      // Handle edge function responses
      // For HTTP errors (4xx, 5xx), Supabase puts error details in both `error` and `data`
      if (data.success === false) {
        console.error("Edge function HTTP error:", error);
        console.log("DATA", data);
        // Check if we have detailed error information in the data
        if (data && typeof data === "object") {
          if (data.type === "moderation_failed") {
            setError(data.error || "Message violates content guidelines");
          } else if (data.type === "rate_limit_exceeded") {
            setError(
              data.error ||
                "Rate limit exceeded. Anonymous users can post 5 messages per hour."
            );
          } else if (data.type === "database_error") {
            setError(data.error || "Failed to save message to database.");
          } else if (data.type === "configuration_error") {
            setError("Service configuration error. Please try again later.");
          } else if (data.type === "server_error") {
            setError("Server error occurred. Please try again.");
          } else {
            setError(data.error || "Failed to submit message. Please try again.");
          }
        } else {
          // Generic error handling for network/HTTP errors
          setError(
            "Failed to submit message. Please check your connection and try again."
          );
        }
        return;
      }

      // For successful responses, check the data format
      if (!data || data.success !== true) {
        setError("Unexpected response format from server. Please try again.");
        return;
      }

      // Success! Clear the form and refresh entries
      setMessage("");
      setRemainingChars(500);
      setError(""); // Clear any previous errors

      // Call the refresh function to update the entries list
      onEntryAdded();

      console.log("Message posted successfully:", data.data);
    } catch (error) {
      console.error("Error submitting message:", error);

      // Provide more specific error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          setError(
            "Network error. Please check your connection and try again."
          );
        } else if (error.message.includes("AbortError")) {
          setError("Request timed out. Please try again.");
        } else {
          setError(`Error: ${error.message}`);
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">
          {user
            ? `Post as ${user.user_metadata?.full_name || "User"}`
            : "Post Anonymously"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={message}
              onChange={handleMessageChange}
              placeholder="Share your thoughts..."
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{remainingChars} characters remaining</span>
              {!user && <span>Anonymous users: 5 posts per hour limit</span>}
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={!message.trim() || isSubmitting || remainingChars < 0}
            className="w-full"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {isSubmitting ? "Posting..." : "Post Message"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
