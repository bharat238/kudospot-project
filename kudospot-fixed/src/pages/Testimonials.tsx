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
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Check, Star, Trash2, Loader2, Link2, Clock, X, RotateCw, Copy, Search, Mail, Download, AlertCircle, MessageSquareQuote } from "lucide-react";
import { trackEvent } from "@/lib/track";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import KudoSpotIcon from "@/components/KudoSpotIcon";

import type { Database } from "@/integrations/supabase/types";
type Testimonial = Database["public"]["Tables"]["testimonials"]["Row"];

const tryCopyText = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
};

const Testimonials = () => {
  const { user } = useAuth();
  const { plan, canAddTestimonial, canDoAIRewrite, showUpgradeToast } = usePlanLimits();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [approvalRefreshKey, setApprovalRefreshKey] = useState(0);
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
    if (!user) { setPageLoading(false); return; }
    setPageLoading(true);
    setLoadError(null);
    const { data, error } = await supabase.from("testimonials").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load testimonials:", error.message);
      setLoadError("Your testimonials could not be loaded. Check your connection and try again.");
    } else {
      setItems(data || []);
    }
    setPageLoading(false);
  };

  useEffect(() => { void load(); }, [user]);
  
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
        .eq("id", editing.id)
        .eq("user_id", user.id);
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
        body: { testimonial_id: t.id, resend: Boolean(opts?.resend) },
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

  const createApprovalLink = async (t: Testimonial, opts?: { silent?: boolean; resend?: boolean }) => {
    if (!user || sendingIds.has(t.id)) return null;
    setSendingIds((current) => new Set(current).add(t.id));
    let emailDeliveryFailed = false;

    try {
      // Send via email when the customer has an address and an AI-assisted draft is ready.
      if (t.customer_email) {
        const { data: emailData, error: emailError } = await supabase.functions.invoke("send-approval-email", {
          body: { testimonial_id: t.id, resend: Boolean(opts?.resend) },
        });

        if (!emailError && emailData?.success) {
          if (emailData?.email_sent !== false) {
            trackEvent({ user_id: user.id, event_type: "approval_sent", entity_id: t.id, entity_type: "approval", campaign: t.campaign });
          }
          if (!opts?.silent) {
            if (emailData?.email_sent === false) {
              if (emailData?.approval_url) await tryCopyText(emailData.approval_url);
              toast.error(emailData.message || "An approval link was created, but the email was not delivered. Share the link manually.");
            } else if (emailData?.approval_url) {
              const copied = await tryCopyText(emailData.approval_url);
              toast.success(emailData.message || (copied
                ? "Approval email sent. The link was also copied."
                : "Approval email sent. Copy the link from the approval details if needed."));
            } else {
              toast.success("Approval email sent to " + t.customer_email);
            }
          }
          void load();
          return emailData?.approval_url || null;
        }

        // A failed email request can still fall back to a customer-shareable link.
        emailDeliveryFailed = true;
      }

      if (opts?.resend) {
        const { error: expireError } = await supabase
          .from("approval_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("testimonial_id", t.id)
          .eq("user_id", user.id)
          .is("used_at", null);
        if (expireError) throw expireError;
      }

      const { data, error } = await supabase
        .from("approval_tokens")
        .insert({ testimonial_id: t.id, user_id: user.id, campaign: t.campaign || null })
        .select("token")
        .single();
      if (error) throw error;

      const url = `${window.location.origin}/approve/${data.token}`;
      const copied = await tryCopyText(url);
      trackEvent({ user_id: user.id, event_type: "approval_sent", entity_id: t.id, entity_type: "approval", campaign: t.campaign });
      if (!opts?.silent) {
        const message = emailDeliveryFailed
          ? "Email delivery failed. A manual approval link was created."
          : !t.customer_email
            ? "Approval link created. No email is on file, so share the link manually."
            : opts?.resend
              ? "A fresh approval link was created and the previous link was invalidated."
              : "Approval link created. Share it with your customer.";
        if (emailDeliveryFailed) {
          toast.error(copied ? `${message} The link was copied to your clipboard.` : `${message} Copy the link and share it with the customer.`);
        } else {
          toast.success(copied ? message : `${message} Clipboard access was blocked; use Copy latest to try again.`);
        }
      }
      void load();
      return url;
    } catch (error: any) {
      toast.error(error?.message || "Failed to create approval link");
      return null;
    } finally {
      setSendingIds((current) => {
        const next = new Set(current);
        next.delete(t.id);
        return next;
      });
    }
  };

  const requestApprovalLink = async (t: Testimonial, opts?: { silent?: boolean; resend?: boolean }) => {
    const url = await createApprovalLink(t, opts);
    if (url && user) {
      setApprovalRefreshKey((current) => current + 1);
      await load();
      const { data } = await supabase.from("testimonials").select("*").eq("id", t.id).eq("user_id", user.id).maybeSingle();
      if (data) setActive(data);
    }
    return url;
  };

  const remove = async (id: string) => {
    if (!user || !confirm("Delete this testimonial?")) return;
    const { error } = await supabase.from("testimonials").delete().eq("id", id).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Testimonial deleted");
    setActive(null);
    await load();
  };

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkApprove = async () => {
    if (!user || selected.size === 0 || bulkApproving) return;

    const selectedItems = items.filter((item) => selected.has(item.id));
    const sendable = selectedItems.filter((item) =>
      Boolean(item.customer_email?.trim()) &&
      item.approval_status !== "approved" &&
      item.approval_status !== "declined" &&
      item.status !== "declined" &&
      item.status !== "published"
    );
    const skipped = selectedItems.length - sendable.length;
    if (sendable.length === 0) {
      toast.error("Each selected testimonial needs a valid customer email before you can request approval.");
      return;
    }

    setBulkApproving(true);
    try {
      const results = await Promise.all(sendable.map(async (item) => {
        try {
          const { data, error } = await supabase.functions.invoke("send-approval-email", {
            body: { testimonial_id: item.id },
          });
          if (error || !data?.success) return { item, success: false, manualShare: false, url: null };
          trackEvent({ user_id: user.id, event_type: "approval_sent", entity_id: item.id, entity_type: "approval", campaign: item.campaign ?? undefined });
          return { item, success: true };
        } catch {
          return { item, success: false };
        }
      }));

      const sent = results.filter((result) => result.success).length;
      const manualShare = results.filter((result) => result.manualShare).length;
      const failed = results.filter((result) => !result.success && !result.manualShare).length;
      if (sent > 0) toast.success(sent + " customer approval request" + (sent === 1 ? "" : "s") + " emailed. Testimonials remain private until customers approve.");
      if (manualShare > 0) toast.error(manualShare + " approval link" + (manualShare === 1 ? " was" : "s were") + " created, but email delivery failed. Open each testimonial and copy the latest link to share manually.");
      if (failed > 0 || skipped > 0) toast.error(failed + " request" + (failed === 1 ? "" : "s") + " failed and " + skipped + " item" + (skipped === 1 ? "" : "s") + " skipped. Check customer emails and retry.");

      setSelected(new Set());
      await load();
      if (active) {
        const { data } = await supabase.from("testimonials").select("*").eq("id", active.id).eq("user_id", user.id).maybeSingle();
        if (data) setActive(data);
      }
      setApprovalRefreshKey((current) => current + 1);
    } finally {
      setBulkApproving(false);
    }
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
              <TabsTrigger value="declined">Declined</TabsTrigger>
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
            <Button size="sm" onClick={bulkApprove} disabled={bulkApproving}>
              {bulkApproving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Mail className="h-3.5 w-3.5 mr-1" />} Send approval requests
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        </Card>
      )}

      {loadError ? (
        <Card className="rounded-2xl p-10 text-center"><AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" /><h2 className="font-semibold">Testimonials could not be loaded</h2><p className="mt-2 text-sm text-muted-foreground">{loadError}</p><Button variant="outline" className="mt-5" onClick={() => void load()}>Try again</Button></Card>
      ) : pageLoading ? (
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
        <Card className="rounded-2xl border-dashed p-10 text-center sm:p-14">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><KudoSpotIcon className="h-7 w-7" /></div>
          <h2 className="text-lg font-semibold">{search ? "No matching testimonials" : "Your testimonial library starts here"}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{search ? `No testimonials match "${search}". Try a different name or phrase.` : "Add a customer story or create a collection form. Use AI to clarify it, then ask the customer to approve the final version before publishing."}</p>
          {!search && <div className="mt-5 flex flex-wrap justify-center gap-2"><Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add testimonial</Button><Button asChild variant="outline"><a href="/collect">Create collection form</a></Button></div>}
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
                  refreshKey={approvalRefreshKey}
                  onResend={() => requestApprovalLink(active, { resend: true })}
                  onCopy={() => requestApprovalLink(active, { silent: false })}
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
                  <p className="w-full text-xs leading-5 text-muted-foreground">A customer must approve their final testimonial before it can be published. Send an email request or copy a manual link using the approval panel above.</p>
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

  if (approval_status === "approved" || status === "published") {
    return <span className="inline-flex items-center rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-success">Customer approved</span>;
  }
  if (approval_status === "declined" || status === "declined" || status === "rejected") {
    return <span className="inline-flex items-center rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-destructive">Declined</span>;
  }
  if (approval_status === "sent") {
    return <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800">Awaiting customer</span>;
  }
  if (status === "ai_rewritten" || testimonial.ai_rewritten_text) {
    return <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground">AI rewritten</span>;
  }
  if (status === "approved") {
    return <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800">Needs customer approval</span>;
  }
  return <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pending</span>;
};

const ApprovalWorkflow = ({ testimonial, refreshKey, onResend, onCopy, isSending }: { testimonial: any; refreshKey: number; onResend: () => void; onCopy: () => void; isSending: boolean }) => {
  const [tokens, setTokens] = useState<any[]>([]);

  useEffect(() => {
    let current = true;
    let query = supabase.from("approval_tokens").select("token,testimonial_id,user_id,used_at,created_at").eq("testimonial_id", testimonial.id).order("created_at", { ascending: false });
    if (testimonial.user_id) query = query.eq("user_id", testimonial.user_id);
    query.then(({ data, error }) => {
      if (!current) return;
      if (error) {
        toast.error("Approval link history could not be loaded.");
        setTokens([]);
      } else {
        setTokens(data || []);
      }
    });
    return () => { current = false; };
  }, [testimonial.id, testimonial.user_id, refreshKey]);

  const hasOpen = tokens.some((token) => !token.used_at);
  const customerApproved = testimonial.approval_status === "approved" || testimonial.status === "published";
  const customerDeclined = testimonial.approval_status === "declined" || testimonial.status === "declined" || testimonial.status === "rejected";
  const customerResponded = customerApproved || customerDeclined;
  const waiting = testimonial.approval_status === "sent" || hasOpen;
  const finalLabel = customerDeclined ? "Declined" : customerApproved ? "Approved" : "Awaiting response";
  const finalIcon = customerDeclined ? X : customerApproved ? Check : Clock;
  const finalActive = customerResponded || waiting;

  const steps = [
    { key: "collected", label: "Collected", icon: MessageSquareQuote, active: !waiting && !customerResponded, done: waiting || customerResponded },
    { key: "waiting", label: "Customer review", icon: Clock, active: waiting, done: customerResponded },
    { key: "final", label: finalLabel, icon: finalIcon, active: customerResponded, done: customerResponded },
  ];

  return (
    <Card className="rounded-2xl border-border/80 bg-muted/25 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div><div className="text-sm font-semibold">Customer approval</div><p className="mt-1 text-xs text-muted-foreground">Testimonials stay private until the customer approves them.</p></div>
        {tokens.length > 0 && <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium text-muted-foreground">{tokens.length} link{tokens.length === 1 ? "" : "s"} created</span>}
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {steps.map((step, index) => (
          <div key={step.key} className="min-w-0">
            <div className={"mb-2 flex h-8 w-8 items-center justify-center rounded-full " + (step.key === "final" && customerApproved ? "bg-success text-white" : step.key === "final" && customerDeclined ? "bg-destructive text-white" : step.active ? "bg-accent text-accent-foreground" : step.done ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground")}>
              <step.icon className="h-4 w-4" />
            </div>
            <div className={"text-[10px] leading-4 sm:text-xs " + (step.active ? "font-semibold text-foreground" : "text-muted-foreground")}>{step.label}</div>
          </div>
        ))}
      </div>
      {!customerResponded && (
        <div className="flex flex-wrap gap-2 border-t border-border/70 pt-3">
          {hasOpen ? (
            <Button size="sm" variant="outline" className="rounded-lg" onClick={onResend} disabled={isSending}>
              {isSending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RotateCw className="mr-1.5 h-3.5 w-3.5" />} Create fresh approval link
            </Button>
          ) : (
            <Button size="sm" className="rounded-lg" onClick={onCopy} disabled={isSending}>
              {isSending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Link2 className="mr-1.5 h-3.5 w-3.5" />} Request customer approval
            </Button>
          )}
          {tokens[0] && !tokens[0].used_at && (
            <Button size="sm" variant="ghost" onClick={async () => { const copied = await tryCopyText(`${window.location.origin}/approve/${tokens[0].token}`); if (copied) toast.success("Approval link copied"); else toast.error("Clipboard access was blocked. Copy the link from your browser after opening the preview."); }} disabled={isSending}>
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy latest link
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};
export default Testimonials;
