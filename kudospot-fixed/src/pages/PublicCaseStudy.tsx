import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import KudoSpotIcon from "@/components/KudoSpotIcon";
import { trackEvent } from "@/lib/track";

const PublicCaseStudy = () => {
  const { slug } = useParams();
  const [cs, setCs] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("case_studies").select("*").eq("published_slug", slug).eq("is_published", true).maybeSingle();
      setCs(data); setLoading(false);
      if (data) {
        supabase.rpc("increment_case_study_views", { cs_id: data.id }).then(() => {});
        trackEvent({ user_id: data.user_id, event_type: "case_study_view", entity_id: data.id, entity_type: "case_study", campaign: data.campaign });
      }
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!cs) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Case study not found.</div>;

  return (
    <article className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase mb-4">
          <KudoSpotIcon className="h-3.5 w-3.5" /> Case study {cs.client_name && `· ${cs.client_name}`}
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{cs.title}</h1>

        {cs.pull_quote && (
          <blockquote className="border-l-4 border-primary pl-6 my-10 text-2xl font-medium italic text-foreground/90">
            "{cs.pull_quote}"
          </blockquote>
        )}

        {Array.isArray(cs.key_stats) && cs.key_stats.length > 0 && (
          <div className="grid sm:grid-cols-3 gap-4 my-10">
            {cs.key_stats.map((s: string, i: number) => (
              <div key={i} className="bg-primary-light/40 rounded-2xl p-5 text-center">
                <div className="font-semibold text-primary">{s}</div>
              </div>
            ))}
          </div>
        )}

        <Section title="The Challenge" body={cs.challenge} />
        <Section title="The Solution" body={cs.solution} />
        <Section title="The Results" body={cs.results} />

        {cs.about_client && (
          <div className="mt-12 pt-8 border-t">
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">About the client</div>
            <p className="text-muted-foreground">{cs.about_client}</p>
          </div>
        )}

        <footer className="mt-16 pt-8 border-t text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <KudoSpotIcon className="h-6 w-6 opacity-50" />
          Powered by KudoSpot
        </footer>
      </div>
    </article>
  );
};

const Section = ({ title, body }: { title: string; body: string }) => {
  if (!body) return null;
  return (
    <section className="my-10">
      <h2 className="text-2xl font-bold mb-3">{title}</h2>
      <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{body}</p>
    </section>
  );
};

export default PublicCaseStudy;
