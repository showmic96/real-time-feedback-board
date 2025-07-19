import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { Github, LogOut, User as UserIcon } from "lucide-react";

interface AuthButtonProps {
  user: User | null;
}

export function AuthButton({ user }: AuthButtonProps) {
  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (user) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt={user.user_metadata?.full_name || "User"}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <span className="text-sm font-medium">
            {user.user_metadata?.full_name || "User"}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Button variant="default" onClick={handleSignIn}>
      <Github className="w-4 h-4 mr-2" />
      Sign in with GitHub
    </Button>
  );
}
