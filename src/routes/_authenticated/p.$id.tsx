import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hydratePosts, type Post } from "@/lib/social";
import { PostCard } from "@/components/PostCard";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/p/$id")({
  component: PostPage,
});

function PostPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("id,author_id,kind,caption,likes_count,comments_count,created_at")
        .eq("id", id)
        .maybeSingle();
      if (!data) {
        setPost(null);
        setLoading(false);
        return;
      }
      const [hydrated] = await hydratePosts([data as Post]);
      setPost(hydrated);
      setLoading(false);
    })();
  }, [id]);

  return (
    <div className="flex flex-col h-full">
      <header className="app-header flex items-center gap-3 px-4 pt-5 pb-3 border-b">
        <button onClick={() => navigate({ to: "/feed" })} aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Post</h1>
      </header>
      <main className="app-content">
        {loading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : !post ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Post não encontrado.</p>
            <Link to="/feed" className="text-primary text-sm mt-2 inline-block">
              Voltar ao feed
            </Link>
          </div>
        ) : (
          <div className="max-w-xl mx-auto">
            <PostCard post={post} />
          </div>
        )}
      </main>
    </div>
  );
}
