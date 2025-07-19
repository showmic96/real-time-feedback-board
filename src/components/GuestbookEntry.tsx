import { Card, CardContent } from "@/components/ui/card";
import type { GuestbookEntry as Entry } from "@/lib/supabase";
import { formatTimeAgo } from "@/lib/utils";
import { MessageSquare, User } from "lucide-react";

interface GuestbookEntryProps {
  entry: Entry;
}

export function GuestbookEntry({ entry }: GuestbookEntryProps) {
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {entry.author_avatar ? (
              <img
                src={entry.author_avatar}
                alt={entry.author_name || "Anonymous"}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                {entry.is_anonymous ? (
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <User className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-sm">
                {entry.is_anonymous ? "Anonymous" : entry.author_name || "User"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTimeAgo(new Date(entry.created_at))}
              </span>
            </div>
            <p className="text-sm text-foreground break-words whitespace-pre-wrap">
              {entry.message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
