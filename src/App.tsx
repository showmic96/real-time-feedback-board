import type { User } from "@supabase/supabase-js";
import { Loader2, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthButton } from "./components/AuthButton";
import { GuestbookEntry as EntryComponent } from "./components/GuestbookEntry";
import { GuestbookForm } from "./components/GuestbookForm";
import { supabase, type GuestbookEntry } from "./lib/supabase";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchEntries();

    // Set up real-time subscription
    const subscription = supabase
      .channel("guestbook_entries")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "guestbook_entries" },
        () => {
          fetchEntries();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("guestbook_entries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching entries:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-primary mr-3" />
            <h1 className="text-4xl font-bold text-foreground">Guestbook</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Share your thoughts with the community
          </p>
        </div>

        {/* Auth Section */}
        <div className="flex justify-center mb-8">
          <AuthButton user={user} />
        </div>

        {/* Form Section */}
        <div className="mb-8">
          <GuestbookForm user={user} onEntryAdded={fetchEntries} />
        </div>

        {/* Entries Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Recent Messages ({entries.length})
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">
                Loading messages...
              </span>
            </div>
          ) : entries.length > 0 ? (
            <div className="space-y-4">
              {entries.map((entry) => (
                <EntryComponent key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No messages yet
              </h3>
              <p className="text-muted-foreground">
                Be the first to share your thoughts!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>Built with ❤️ using Vite, React, Supabase, and Tailwind CSS</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
