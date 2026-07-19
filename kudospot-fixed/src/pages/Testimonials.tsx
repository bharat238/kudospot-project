import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Check, Star, Trash2, Loader2, Link2, Clock, X, RotateCw, Copy, CheckSquare, Search, Send, Mail, Download } from "lucide-react";
import { trackEvent } from "@/lib/track";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import KudoSpotIcon from "@/components/KudoSpotIcon";

import type { Database } from "@/integrations/supabase/types";
type Testimonial = Database["public"]["Tables"]["testimonials"]["Row"];

const Testimonials = () => {
  const { user } = useAuth();
  const { plan, canAddTestimonial, canDoAIRewrite, showUpgradeToast } = usePlanLimits();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Testimonial | null>(null);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [rewritingIds, setRewritingIds] = useState<Set<string>>(new Set());
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // form state
  const [form, setForm] = useState({ customer_name: "", customer_role: "", customer_company: "", customer_email: "", original_text: "", rating: 5 });
  const [formErrors, setFormErrors] = useState<{ customer_name?: string; original_text?: string }>({});

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("testimonials").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setItems(data || []);
    setPageLoading(false);
  };

  useEffect(() => { load(); }, [user]);
  
  // When editing changes, pre-fill the form
  useEffect(() => {
    if (editing) {
      setForm({
        customer_name: editing.customer_name || "",
        customer_role: editing.customer_role || "",
        customer_company: editing.customer_company || "",
        customer_email: editing.customer_email || "",
        original_text: editing.original_text || "",
        rating: editing.rating || 5,
      });
      setOpen(true);
    } else {
      setForm({ customer_name: "", customer_role: "", customer_company: "", customer_email: "", original_text: "", rating: 5 });
    }
  }, [editing]);

  const filtered = items.filter((t) => {
    const matchesFilter = filter === "all" || t.status === filter;
    const s = search.toLowerCase();
    const matchesSearch = !search ||
      t.customer_name?.toLowerCase().includes(s) ||
      t.customer_company?.toLowerCase().includes(s) ||
      t.original_text?.toLowerCase().includes(s) ||
      t.ai_rewritten_text?.toLowerCase().includes(s);
    return matchesFilter && matchesSearch;
  });

  const addTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validate
    const errors: { customer_name?: string; original_text?: string } = {};
    if (!form.customer_name.trim()) errors.customer_name = "Customer name is required";
    if (!form.original_text.trim()) errors.original_text = "Testimonial is required";
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fill in all required fields");
      return;
    }
    
    setFormErrors({});
    
    if (editing) {
      // Update existing testimonial
      const { error } = await supabase
        .from("testimonials")
        .update({ ...form })
        .eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Testimonial updated");
      setEditing(null);
    } else {
      // Create new testimonial
      if (!canAddTestimonial(items.length)) return showUpgradeToast("more testimonials");
      const { error } = await supabase
        .from("testimonials")
        .insert({ ...form, user_id: user.id, status: "pending", source: "manual" });
      if (error) return toast.error(error.message);
      toast.success("Testimonial added");
    }
    
    setForm({ customer_name: "", customer_role: "", customer_company: "", customer_email: "", original_text: "", rating: 5 });
    setOpen(false);
    load();
  };

  const rewrite = async (t: Testimonial) => {
    if (plan === "free") {
      const rewrittenCount = items.filter((i) => i.ai_rewritten_text).length;
      if (!canDoAIRewrite(rewrittenCount)) return showUpgradeToast("more AI rewrites");
    }
    setRewritingIds(prev => new Set(prev).add(t.id));
    try {
      const { data, error } = await supabase.functions.invoke("rewrite-testimonial", {
        body: { testimonial_id: t.id },
      });
      if (error) throw error;
      toast.success("AI rewrite complete!");
      const updated = { ...t, ai_rewritten_text: data.rewritten, status: "ai_rewritten" };
      setActive(updated);
      load();
    } catch (e: any) {
      toast.error(e.message || "Rewrite failed");
    } finally {
      setRewritingIds(prev => {
        const next = new Set(prev);
        next.delete(t.id);
        return next;
      });
    }
  };

  const approve = async (t: Testimonial) => {
    try {
      const text = t.ai_rewritten_text || t.original_text;
      const { error } = await supabase.from("testimonials").update({ approved_text: text, status: "approved", approved_at: new Date().toISOString() }).eq("id", t.id);
      if (error) throw error;
      toast.success("Testimonial approved!");
      trackEvent({
        user_id: user!.id,
        event_type: "approval_approved",
        entity_id: t.id,
        entity_type: "approval",
        campaign: t.campaign ?? undefined,
      });
      
      // Feature 9: Trigger approval email
      if (t.customer_email && t.ai_rewritten_text) {
        supabase.functions.invoke("send-approval-email", { body: { testimonial_id: t.id } });
        toast.info("Approval email sent to customer.");
      }

      setActive(null); load();
    } catch (e: any) {
      toast.error(e.message || "Approval failed");
    }
  };

  const sendApproval = async (testimonialId: string) => {
    if (sendingIds.has(testimonialId)) return;
    setSendingIds(prev => new Set(prev).add(testimonialId));
    try {
      const { error } = await supabase.functions.invoke("send-approval-email", {
        body: { testimonial_id: testimonialId }
      });
      if (error) throw error;
      toast.success("Approval email sent to customer!");
      load();
    } catch (e: any) {
      toast.error("Failed to send approval email");
    } finally {
      setSendingIds(prev => {
        const next = new Set(prev);
        next.delete(testimonialId);
        return next;
      });
    }
  };

  const createApprovalLink = async (t: Testimonial, opts?: { silent?: boolean; resend?: boolean }) => {
    if (!user) return null;
    if (sendingIds.has(t.id)) return null;
    setSendingIds(prev => new Set(prev).add(t.id));

    try {
      // If customer email exists, send via email automatically
      if (t.customer_email && t.ai_rewritten_text) {
        try {
          const { data: emailData, error: emailError } = await supabase.functions.invoke("send-approval-email", {
            body: { testimonial_id: t.id },
          });
          if (emailError) throw emailError;
          trackEvent({ user_id: user.id, event_type: "approval_sent", entity_id: t.id, entity_type: "approval", campaign: t.campaign });
          if (!opts?.silent) {
            if (emailData?.approval_url) {
              await navigator.clipboard.writeText(emailData.approval_url);
              toast.success(emailData.message || "Approval email sent! Link also copied to clipboard.");
            } else {
              toast.success("Approval email sent to " + t.customer_email);
            }
          }
          load();
          return emailData?.approval_url || null;
        } catch (e: any) {
          toast.error(e.message || "Email send failed — falling back to link copy");
        }
      }

      // Fallback: create token and copy link manually
      if (opts?.resend) {
        await supabase.from("approval_tokens").update({ used_at: new Date().toISOString() }).eq("testimonial_id", t.id).is("used_at", null);
      }
      const { data, error } = await supabase.from("approval_tokens").insert({ testimonial_id: t.id, user_id: user.id, campaign: t.campaign || null }).select("token").single();
      if (error) throw error;
      const url = `${window.location.origin}/approve/${data.token}`;
      await navigator.clipboard.writeText(url);
      trackEvent({ user_id: user.id, event_type: "approval_sent", entity_id: t.id, entity_type: "approval", campaign: t.campaign });
      if (!opts?.silent) {
        if (!t.customer_email) {
          toast.success("Approval link copied. No email on file — paste it and send manually.");
        } else if (!t.ai_rewritten_text) {
          toast.success("Approval link copied. Run AI Rewrite first for best results.");
        } else {
          toast.success(opts?.resend ? "Fresh link copied — old one invalidated" : "Approval link copied — share it with your customer");
        }
      }
      load();
      return url;
    } catch (e: any) {
      toast.error(e.message || "Failed to create approval link");
      return null;
    } finally {
      setSendingIds(prev => {
        const next = new Set(prev);
        next.delete(t.id);
        return next;
      });
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setActive(null);
    load();
  };

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkApprove = async () => {
    if (selected.size === 0) return;
    setBulkApproving(true);
    const ids = Array.from(selected);
    const updates = ids.map((id) => {
      const it = items.find((i) => i.id === id);
      const text = it?.ai_rewritten_text || it?.original_text || "";
      return supabase.from("testimonials").update({ approved_text: text, status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
    });
    await Promise.all(updates);
    toast.success(`${ids.length} testimonial${ids.length === 1 ? "" : "s"} approved`);
    setSelected(new Set());
    setBulkApproving(false);
    load();
  };

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast.error("No testimonials to export.");
      return;
    }

    const headers = [
      "customer_name",
      "customer_role",
      "customer_company",
      "customer_email",
      "rating",
      "status",
      "source",
      "campaign",
      "original_text",
      "ai_rewritten_text",
      "approved_text",
      "created_at",
    ];

    const escape = (val: any): string => {
      if (val === null || val === undefined) return "";
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filtered.map((t) =>
      [
        escape(t.customer_name),
        escape(t.customer_role),
        escape(t.customer_company),
        escape(t.customer_email),
        escape(t.rating),
        escape(t.status),
        escape(t.source),
        escape(t.campaign),
        escape(t.original_text),
        escape(t.ai_rewritten_text),
        escape(t.approved_text),
        escape(t.created_at),
      ].join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.download = `kudospot-testimonials-${filter}-${date}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} testimonial${filtered.length === 1 ? "" : "s"} as CSV`);
  };

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-1">Testimonials</h1>
          <p className="text-muted-foreground">Collect, rewrite, approve.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Dialog open={open} onOpenChange={(o) => {
            if (!o) { setEditing(null); }
            setOpen(o);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4 mr-1" /> Add testimonial
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit testimonial" : "New testimonial"}</DialogTitle>
                <DialogDescription>{editing ? "Update the testimonial details." : "Add a new testimonial to your collection."}</DialogDescription>
              </DialogHeader>
              <form onSubmit={addTestimonial} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Customer name *</Label>
                    <Input 
                      required 
                      value={form.customer_name} 
                      onChange={(e) => {
                        setForm({ ...form, customer_name: e.target.value });
                        if (formErrors.customer_name) {
                          setFormErrors(prev => ({ ...prev, customer_name: undefined }));
                        }
                      }} 
                      className={formErrors.customer_name ? "border-red-500" : ""}
                    />
                    {formErrors.customer_name && <p className="text-sm text-red-500 mt-1">{formErrors.customer_name}</p>}
                  </div>
                  <div><Label>Role</Label><Input value={form.customer_role} onChange={(e) => setForm({ ...form, customer_role: e.target.value })} /></div>
                </div>
                <div><Label>Company</Label><Input value={form.customer_company} onChange={(e) => setForm({ ...form, customer_company: e.target.value })} /></div>
                <div>
                  <Label>Customer email</Label>
                  <Input
                    type="email"
                    placeholder="customer@example.com"
                    value={form.customer_email}
                    onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Add email to send automatic approval requests</p>
                </div>
                <div><Label>Rating</Label>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button type="button" key={n} onClick={() => setForm({ ...form, rating: n })}>
                        <Star className={`h-6 w-6 ${n <= form.rating ? "fill-warning text-warning" : "text-muted"}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Testimonial *</Label>
                  <Textarea 
                    required 
                    rows={5} 
                    value={form.original_text} 
                    onChange={(e) => {
                      setForm({ ...form, original_text: e.target.value });
                      if (formErrors.original_text) {
                        setFormErrors(prev => ({ ...prev, original_text: undefined }));
                      }
                    }} 
                    placeholder="Paste the original testimonial here…" 
                    className={formErrors.original_text ? "border-red-500" : ""}
                  />
                  {formErrors.original_text && <p className="text-sm text-red-500 mt-1">{formErrors.original_text}</p>}
                </div>
                <Button type="submit" className="w-full">{editing ? "Save changes" : "Add"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Tabs value={filter} onValueChange={setFilter} className="flex-1">
          <div className="overflow-x-auto">
            <TabsList>
              <TabsTrigger value="all">All ({items.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="ai_rewritten">Rewritten</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search testimonials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {selected.size > 0 && (
        <Card className="p-3 mb-4 flex items-center justify-between bg-primary-light/30 border-primary/20">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={bulkApprove} disabled={bulkApproving} className="bg-success hover:bg-success/90">
              {bulkApproving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckSquare className="h-3.5 w-3.5 mr-1" />} Approve all
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        </Card>
      )}

      {pageLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-2.5 bg-muted rounded w-1/4" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2.5 bg-muted rounded w-full" />
                <div className="h-2.5 bg-muted rounded w-4/5" />
                <div className="h-2.5 bg-muted rounded w-3/5" />
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-16 text-center text-muted-foreground">
          <KudoSpotIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
          {search ? `No testimonials match "${search}"` : "No testimonials here yet."}
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((t) => (
            <Card key={t.id} className="p-5 cursor-pointer hover:shadow-card transition relative" onClick={() => setActive(t)}>
              <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggleSelect(t.id)} />
              </div>
              <div className="flex items-start gap-3 mb-3 pr-8">
                <div className="h-10 w-10 rounded-full bg-primary-light text-primary font-semibold flex items-center justify-center">{t.customer_name?.[0]?.toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{t.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{[t.customer_role, t.customer_company].filter(Boolean).join(" · ")}</div>
                </div>
                <StatusPill testimonial={t} />
              </div>
              {t.rating && <div className="flex mb-2">{[...Array(t.rating)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />)}</div>}
              <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{t.ai_rewritten_text || t.original_text}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Detail modal */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between pr-6">
                  <span>{active.customer_name}</span>
                  <StatusPill testimonial={active} />
                </DialogTitle>
                <DialogDescription>View and manage this testimonial.</DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                <div className="text-sm text-muted-foreground">{[active.customer_role, active.customer_company].filter(Boolean).join(" · ")}</div>

                {/* Approval workflow panel */}
                <ApprovalWorkflow
                  testimonial={active}
                  onResend={() => createApprovalLink(active, { resend: true })}
                  onCopy={() => createApprovalLink(active, { silent: false })}
                  isSending={sendingIds.has(active.id)}
                />

                <div className={`grid ${active.ai_rewritten_text ? "md:grid-cols-2" : ""} gap-4`}>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Original</div>
                    <Card className="p-4 bg-secondary/50">
                      <p className="text-sm leading-relaxed">{active.original_text}</p>
                    </Card>
                  </div>
                  {active.ai_rewritten_text && (
                    <div>
                      <div className="text-xs font-semibold text-primary uppercase mb-2 flex items-center gap-1">
                        <KudoSpotIcon className="h-3 w-3" /> AI Rewritten
                      </div>
                      <Card className="p-4 border-primary bg-primary-light/30">
                        <p className="text-sm leading-relaxed">{active.ai_rewritten_text}</p>
                      </Card>
                    </div>
                  )}
                </div>

                {active.status === "rejected" && active.rejection_reason && (
                  <Card className="p-4 border-destructive/30 bg-destructive/5">
                    <div className="text-xs font-semibold text-destructive uppercase mb-1">Customer feedback</div>
                    <p className="text-sm">{active.rejection_reason}</p>
                  </Card>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => { setActive(null); setEditing(active); }}>
                    Edit
                  </Button>
                  {!active.ai_rewritten_text && (
                    <Button onClick={() => rewrite(active)} disabled={rewritingIds.has(active.id)}>
                      {rewritingIds.has(active.id) ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Rewriting…</> : <><KudoSpotIcon className="h-4 w-4 mr-1" /> AI Rewrite</>}
                    </Button>
                  )}
                  {active.ai_rewritten_text && active.status !== "approved" && (
                    <Button onClick={() => rewrite(active)} disabled={rewritingIds.has(active.id)} variant="outline">
                      {rewritingIds.has(active.id) ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <KudoSpotIcon className="h-4 w-4 mr-1" />} Regenerate
                    </Button>
                  )}
                  {active.status !== "approved" && active.status !== "declined" && (
                    <Button onClick={() => approve(active)} variant="default" className="bg-success hover:bg-success/90">
                      <Check className="h-4 w-4 mr-1" /> Approve & Send Email
                    </Button>
                  )}
                  {active.ai_rewritten_text && active.customer_email && active.approval_status !== "approved" && (
                    <Button variant="outline" size="sm" onClick={() => sendApproval(active.id)} disabled={sendingIds.has(active.id)}>
                      {sendingIds.has(active.id) ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Sending…</> : <><Mail className="h-3.5 w-3.5 mr-1" /> {active.approval_status === "sent" ? "Resend approval email" : "Send for approval"}</>}
                    </Button>
                  )}
                  <Button variant="ghost" className="text-destructive ml-auto" onClick={() => remove(active.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

const StatusPill = ({ testimonial }: { testimonial: any }) => {
  const { status, approval_status } = testimonial;
  
  if (status === "approved") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20">Approved</span>;
  }
  if (status === "declined") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/20">Declined</span>;
  }
  if (approval_status === "sent") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">Awaiting Approval</span>;
  }
  if (approval_status === "approved") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20">Customer approved ✓</span>;
  }
  if (status === "ai_rewritten") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-primary-light text-primary border border-primary/20">Rewritten</span>;
  }
  
  return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-secondary text-muted-foreground border border-border">Pending</span>;
};

const ApprovalWorkflow = ({ testimonial, onResend, onCopy, isSending }: { testimonial: any; onResend: () => void; onCopy: () => void; isSending: boolean }) => {
  const [tokens, setTokens] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("approval_tokens").select("*").eq("testimonial_id", testimonial.id).order("created_at", { ascending: false }).then(({ data }) => setTokens(data || []));
  }, [testimonial.id]);

  const hasOpen = tokens.some((t) => !t.used_at);
  const status = testimonial.status;

  const steps = [
    { key: "pending", label: "Pending", icon: Clock, active: status === "pending" || status === "ai_rewritten", done: status === "approved" || status === "rejected" },
    { key: "approved", label: "Approved", icon: Check, active: status === "approved", done: status === "approved" },
    { key: "rejected", label: "Rejected", icon: X, active: status === "rejected", done: status === "rejected" },
  ];

  return (
    <Card className="p-4 bg-secondary/30">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Approval workflow</div>
        {tokens.length > 0 && <span className="text-xs text-muted-foreground">{tokens.length} request{tokens.length === 1 ? "" : "s"} sent</span>}
      </div>
      <div className="flex items-center gap-2 mb-3">
        {steps.filter((s) => s.key !== "rejected" || status === "rejected").map((s, i, arr) => (
          <div key={s.key} className="flex items-center gap-2 flex-1">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center ${s.active && s.key === "approved" ? "bg-success text-white" : s.active && s.key === "rejected" ? "bg-destructive text-white" : s.active ? "bg-warning text-white" : s.done ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}>
              <s.icon className="h-3.5 w-3.5" />
            </div>
            <span className={`text-sm ${s.active ? "font-semibold" : "text-muted-foreground"}`}>{s.label}</span>
            {i < arr.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        ))}
      </div>
      {status !== "approved" && status !== "rejected" && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {hasOpen ? (
            <Button size="sm" variant="outline" onClick={onResend} disabled={isSending}>
              {isSending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RotateCw className="h-3.5 w-3.5 mr-1" />} Resend approval link
            </Button>
          ) : (
            <Button size="sm" onClick={onCopy} disabled={!testimonial.ai_rewritten_text || isSending}>
              {isSending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Link2 className="h-3.5 w-3.5 mr-1" />} Send approval link
            </Button>
          )}
          {tokens[0] && (
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/approve/${tokens[0].token}`); toast.success("Latest link copied"); }} disabled={isSending}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy latest
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

export default Testimonials;
