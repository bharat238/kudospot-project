import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Plus, Copy, ExternalLink, Trash2, Upload, X, GripVertical,
  Mail, Send, Clock, CheckCircle2, AlertCircle, Users, ToggleLeft, QrCode
} from "lucide-react";
import { QRCodeModal } from "@/components/QRCodeModal";
import type { Json, Tables } from "@/integrations/supabase/types";

// ─── blank form template ────────────────────────────────────────────────────
const blank = {
  form_name: "",
  headline: "Share your experience",
  subheadline: "We'd love to hear how it went.",
  brand_color: "#C8F34C",
  thank_you_message: "Thank you! Your feedback means a lot.",
  collect_rating: true,
  collect_video: false,
  logo_url: null as string | null,
  campaign: "" as string,
  questions: [
    "What problem were you trying to solve?",
    "What did you love most?",
    "What specific result did you get?",
  ] as string[],
};

// ─── default 3-email drip sequence ─────────────────────────────────────────
const DEFAULT_SEQ_EMAILS = [
  {
    delay_days: 0,
    subject: "Quick question — how has your experience been?",
    body: "Hi [Customer Name],\n\nI hope you are enjoying working with us. I would love to feature your experience — it only takes 2 minutes.\n\n[FORM LINK]\n\nThank you!\n[Your Name]",
  },
  {
    delay_days: 4,
    subject: "Your experience matters to us",
    body: "Hi [Customer Name],\n\nJust a friendly follow-up! If you have a moment, we would love to hear how things are going.\n\n[FORM LINK]\n\nThanks so much!\n[Your Name]",
  },
  {
    delay_days: 10,
    subject: "Last ask — I promise!",
    body: "Hi [Customer Name],\n\nI won't bother you again after this — but if you have had a good experience, even one sentence would mean the world.\n\n[FORM LINK]\n\nThank you for your time!\n[Your Name]",
  },
];

// ─── helper to parse a simple CSV ──────────────────────────────────────────
const parseCSV = (text: string): { name: string; email: string }[] => {
  // Handle quoted values (including commas and escaped quotes), BOMs and CRLF files.
  const source = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field.trim());
      field = "";
    } else if (char === "\n") {
      row.push(field.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  row.push(field.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  if (rows.length < 2) return [];

  const header = rows[0].map((value) => value.toLowerCase().trim());
  const nameIdx = header.findIndex((value) => value === "name" || value === "customer name");
  const emailIdx = header.findIndex((value) => value === "email" || value === "customer email");
  if (emailIdx === -1) return [];

  return rows.slice(1).flatMap((cols) => {
    const email = (cols[emailIdx] || "").trim();
    const name = nameIdx !== -1 ? (cols[nameIdx] || "").trim() : "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? [{ name, email }] : [];
  });
};

type CollectionFormRow = Tables<"collection_forms">;
type EmailSequenceRow = Tables<"email_sequences">;
type EmailSendRow = Tables<"email_sends">;
type SequenceEmail = { delay_days: number; subject: string; body: string };
type CollectionFormDraft = {
  form_name: string;
  headline: string;
  subheadline: string;
  brand_color: string;
  thank_you_message: string;
  collect_rating: boolean;
  collect_video: boolean;
  logo_url: string | null;
  campaign: string;
  questions: string[];
};

const normalizeSequenceEmails = (value: Json | null | undefined): SequenceEmail[] => {
  if (!Array.isArray(value)) return DEFAULT_SEQ_EMAILS;
  return (value as unknown[]).flatMap((item): SequenceEmail[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    return [{
      delay_days: typeof record.delay_days === "number" ? record.delay_days : 0,
      subject: typeof record.subject === "string" ? record.subject : "",
      body: typeof record.body === "string" ? record.body : "",
    }];
  });
};

// ────────────────────────────────────────────────────────────────────────────
const Collect = () => {
  const { user } = useAuth();

  // Forms tab
  const [forms, setForms] = useState<CollectionFormRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CollectionFormRow | null>(null);
  const [form, setForm] = useState<CollectionFormDraft>(blank);
  const [uploading, setUploading] = useState(false);
  const [qrModal, setQrModal] = useState<{ 
    open: boolean; 
    formUrl: string; 
    formName: string; 
  }>({ open: false, formUrl: "", formName: "" });

  // Sequences tab
  const [sequences, setSequences] = useState<EmailSequenceRow[]>([]);
  const [seqOpen, setSeqOpen] = useState(false);
  const [editingSeq, setEditingSeq] = useState<EmailSequenceRow | null>(null);
  const [seqForm, setSeqForm] = useState<{ sequence_name: string; emails: SequenceEmail[] }>({ sequence_name: "Standard 3-step ask", emails: DEFAULT_SEQ_EMAILS });
  const [savingSeq, setSavingSeq] = useState(false);
  const [updatingSeqId, setUpdatingSeqId] = useState<string | null>(null);

  // Send Requests tab
  const [sendForm, setSendForm] = useState({ customer_name: "", customer_email: "", form_id: "" });
  const [csvRows, setCsvRows] = useState<{ name: string; email: string }[]>([]);
  const [sends, setSends] = useState<EmailSendRow[]>([]);
  const [sending, setSending] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // ── loaders ────────────────────────────────────────────────────────────
  const loadForms = async () => {
    if (!user) return;
    const { data } = await supabase.from("collection_forms").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setForms(data || []);
  };

  const loadSequences = async () => {
    if (!user) return;
    const { data } = await supabase.from("email_sequences").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setSequences(data || []);
  };

  const loadSends = async () => {
    if (!user) return;
    const { data } = await supabase.from("email_sends").select("*").eq("user_id", user.id).order("sent_at", { ascending: false }).limit(30);
    setSends(data || []);
  };

  useEffect(() => {
    loadForms();
    loadSequences();
    loadSends();
  }, [user]);
  
  // Auto-select the first form when there's only one
  useEffect(() => {
    if (forms.length === 1 && !sendForm.form_id) {
      setSendForm(prev => ({ ...prev, form_id: forms[0].id }));
    }
  }, [forms]);

  // ── forms CRUD ────────────────────────────────────────────────────────
  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload = { ...form, questions: form.questions?.filter((q: string) => q.trim()) || [] };
    if (editing) {
      const { error } = await supabase.from("collection_forms").update(payload).eq("id", editing.id).eq("user_id", user.id);
      if (error) return toast.error(error.message);
      toast.success("Form updated");
    } else {
      const { error } = await supabase.from("collection_forms").insert({ ...payload, user_id: user.id });
      if (error) return toast.error(error.message);
      toast.success("Form created");
    }
    setOpen(false); setEditing(null); setForm(blank); loadForms();
  };

  const removeForm = async (id: string) => {
    if (!user || !window.confirm("Delete this collection form? Its public collection link will stop working.")) return;
    const { error } = await supabase.from("collection_forms").delete().eq("id", id).eq("user_id", user.id);
    if (error) return toast.error(error.message || "The collection form could not be deleted.");
    toast.success("Collection form deleted");
    void loadForms();
  };

  const startEdit = (f: CollectionFormRow) => {
    setEditing(f);
    setForm({
      form_name: f.form_name || blank.form_name,
      headline: f.headline || blank.headline,
      subheadline: f.subheadline || blank.subheadline,
      brand_color: f.brand_color || blank.brand_color,
      thank_you_message: f.thank_you_message || blank.thank_you_message,
      collect_rating: f.collect_rating ?? blank.collect_rating,
      collect_video: f.collect_video ?? blank.collect_video,
      logo_url: f.logo_url,
      campaign: f.campaign || "",
      questions: Array.isArray(f.questions) ? f.questions.filter((question): question is string => typeof question === "string") : blank.questions,
    });
    setOpen(true);
  };

  const uploadLogo = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("form-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("form-assets").getPublicUrl(path);
      setForm((current) => ({ ...current, logo_url: data.publicUrl }));
      toast.success("Logo uploaded");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const updateQ = (i: number, v: string) => {
    const qs = [...(form.questions || [])]; qs[i] = v; setForm((current) => ({ ...current, questions: qs }));
  };
  const addQ = () => setForm((current) => ({ ...current, questions: [...current.questions, ""] }));
  const removeQ = (i: number) => setForm((current) => ({ ...current, questions: current.questions.filter((_, j) => j !== i) }));

  const publicUrl = (slug: string) => `${window.location.origin}/collect/${slug}`;
  const wallUrl = (slug: string) => `${window.location.origin}/wall/${slug}`;

  // ── sequences CRUD ────────────────────────────────────────────────────
  const startNewSeq = () => {
    setEditingSeq(null);
    setSeqForm({ sequence_name: "Standard 3-step ask", emails: DEFAULT_SEQ_EMAILS });
    setSeqOpen(true);
  };
  const startEditSeq = (s: EmailSequenceRow) => {
    setEditingSeq(s);
    setSeqForm({ sequence_name: s.sequence_name, emails: normalizeSequenceEmails(s.emails) });
    setSeqOpen(true);
  };

  const saveSeq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !seqForm.sequence_name) return toast.error("Sequence name required");
    setSavingSeq(true);
    const payload = { sequence_name: seqForm.sequence_name, emails: seqForm.emails, user_id: user.id };
    if (editingSeq) {
      const { error } = await supabase.from("email_sequences").update(payload).eq("id", editingSeq.id).eq("user_id", user.id);
      if (error) { toast.error(error.message); setSavingSeq(false); return; }
      toast.success("Sequence updated");
    } else {
      const { error } = await supabase.from("email_sequences").insert(payload);
      if (error) { toast.error(error.message); setSavingSeq(false); return; }
      toast.success("Sequence created");
    }
    setSavingSeq(false); setSeqOpen(false); loadSequences();
  };

  const removeSeq = async (id: string) => {
    if (!user || !window.confirm("Delete this email template sequence?")) return;
    const { error } = await supabase.from("email_sequences").delete().eq("id", id).eq("user_id", user.id);
    if (error) return toast.error(error.message || "The sequence could not be deleted.");
    toast.success("Email sequence deleted");
    void loadSequences();
  };

  const toggleSeq = async (seq: EmailSequenceRow) => {
    if (!user || updatingSeqId === seq.id) return;
    setUpdatingSeqId(seq.id);
    const next = !seq.is_active;
    const { error } = await supabase.from("email_sequences").update({ is_active: next }).eq("id", seq.id).eq("user_id", user.id);
    setUpdatingSeqId(null);
    if (error) return toast.error(error.message || "The sequence status could not be changed.");
    toast.success(next ? "Sequence activated" : "Sequence deactivated");
    void loadSequences();
  };

  const updateSeqEmail = (emailIdx: number, field: keyof SequenceEmail, value: string) => {
    const emails = seqForm.emails.map((email, index) => {
      if (index !== emailIdx) return email;
      if (field === "delay_days") return { ...email, delay_days: Number(value) };
      return { ...email, [field]: value };
    });
    setSeqForm((current) => ({ ...current, emails }));
  };

  // ── send requests ─────────────────────────────────────────────────────
  const handleCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) toast.error("No valid rows found. CSV must have 'email' (and optionally 'name') columns.");
      else { setCsvRows(rows); toast.success(`${rows.length} contacts loaded`); }
    };
    reader.readAsText(file);
  };

  const getFirstForm = () => forms[0];

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  };

  const copyLink = async (value: string, label = "Link") => {
    const copied = await copyToClipboard(value);
    if (copied) toast.success(`${label} copied to clipboard`);
    else toast.error("Your browser blocked clipboard access. You can still copy the link from the form list.");
    return copied;
  };

  const sendSingleRequest = async () => {
    if (!user || !sendForm.customer_email) return toast.error("Customer email is required");
    const email = sendForm.customer_email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Enter a valid email address");
    if (sending) return;
    setSending(true);
    try {
      const targetForm = forms.find((formItem) => formItem.id === sendForm.form_id) || getFirstForm();
      const { error } = await supabase.from("email_sends").insert({
        user_id: user.id,
        customer_email: email,
        customer_name: sendForm.customer_name.trim() || null,
        status: "pending",
      });
      if (error) throw error;

      if (targetForm) {
        const copied = await copyToClipboard(publicUrl(targetForm.public_slug));
        toast.success(copied
          ? `Contact logged. The collection link is copied; paste it into your email to send the invitation to ${email}.`
          : `Contact logged for ${email}. Copy the collection link from the form list and send it manually.`);
      } else {
        toast.success("Contact logged. Create a collection form to generate an invitation link.");
      }
      setSendForm({ customer_name: "", customer_email: "", form_id: "" });
      void loadSends();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "The contact could not be logged. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const sendAllCSV = async () => {
    if (!user || csvRows.length === 0 || sending) return;
    setSending(true);
    try {
      const inserts = csvRows.map((row) => ({
        user_id: user.id,
        customer_email: row.email.trim(),
        customer_name: row.name.trim() || null,
        status: "pending",
      }));
      const { error } = await supabase.from("email_sends").insert(inserts);
      if (error) throw error;
      const total = inserts.length;
      const targetForm = getFirstForm();
      if (targetForm) {
        const copied = await copyToClipboard(publicUrl(targetForm.public_slug));
        toast.success(copied
          ? `${total} contacts logged. The collection link is copied; paste it into your bulk email to send the invitations.`
          : `${total} contacts logged. Copy the collection link from the form list and include it in your bulk email.`);
      } else {
        toast.success(`${total} contacts logged. Create a collection form to generate an invitation link.`);
      }
      setCsvRows([]);
      if (csvInputRef.current) csvInputRef.current.value = "";
      void loadSends();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "The contacts could not be logged. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === "sent") return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    if (status === "pending") return <Clock className="h-3.5 w-3.5 text-warning" />;
    return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  // ────────────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Collect</h1>
        <p className="text-muted-foreground">Create collection forms, prepare outreach links, and organize reusable email templates.</p>
      </div>

      <Tabs defaultValue="forms">
        <div className="mb-6 max-w-full overflow-x-auto"><TabsList className="min-w-max">
          <TabsTrigger value="forms">Collection Forms</TabsTrigger>
          <TabsTrigger value="sequences">Email Sequences</TabsTrigger>
          <TabsTrigger value="send">Request links</TabsTrigger>
        </TabsList>

        {/* ═══════════════════ FORMS TAB ═══════════════════ */}
        <TabsContent value="forms">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Share these links with customers to collect testimonials.</p>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(blank); } }}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditing(null); setForm(blank); setOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> New form
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit form" : "New collection form"}</DialogTitle>
                  <DialogDescription>{editing ? "Update your collection form settings." : "Create a new collection form to gather testimonials."}</DialogDescription>
                </DialogHeader>
                <form onSubmit={saveForm} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label>Form name (internal)</Label><Input required value={form.form_name} onChange={(e) => setForm({ ...form, form_name: e.target.value })} placeholder="e.g. Post-purchase ask" /></div>
                    <div><Label>Campaign tag</Label><Input value={form.campaign || ""} onChange={(e) => setForm({ ...form, campaign: e.target.value })} placeholder="e.g. spring-launch" /></div>
                  </div>

                  <div className="border rounded-lg p-4 space-y-4 bg-secondary/20">
                    <div className="text-sm font-semibold">Branding</div>
                    <div>
                      <Label>Logo</Label>
                      <div className="mt-2 flex items-center gap-3">
                        {form.logo_url && (
                          <div className="relative">
                            <img src={form.logo_url} alt="Logo" className="h-12 object-contain border rounded p-1 bg-white" />
                            <button type="button" onClick={() => setForm({ ...form, logo_url: null })} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"><X className="h-3 w-3" /></button>
                          </div>
                        )}
                        <label className="cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md hover:bg-secondary">
                            <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : form.logo_url ? "Replace" : "Upload logo"}
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Brand color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input type="color" value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} className="w-14 h-10 p-1" />
                          <Input value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} placeholder="#C8F34C" />
                        </div>
                      </div>
                      <div className="flex items-end gap-4 pb-2">
                        <div className="flex items-center gap-2"><Switch checked={form.collect_rating} onCheckedChange={(v) => setForm({ ...form, collect_rating: v })} /><span className="text-sm">Rating</span></div>
                        <div className="flex items-center gap-2 opacity-50"><Switch disabled /><span className="text-sm">Video (soon)</span></div>
                      </div>
                    </div>
                  </div>

                  <div><Label>Headline</Label><Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></div>
                  <div><Label>Subheadline</Label><Textarea rows={2} value={form.subheadline || ""} onChange={(e) => setForm({ ...form, subheadline: e.target.value })} /></div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Prompts shown to customer</Label>
                      <Button type="button" size="sm" variant="outline" onClick={addQ}><Plus className="h-3 w-3 mr-1" /> Add</Button>
                    </div>
                    <div className="space-y-2">
                      {(form.questions || []).map((q: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <Input value={q} onChange={(e) => updateQ(i, e.target.value)} placeholder={`Question ${i + 1}`} />
                          <Button type="button" size="icon" variant="ghost" onClick={() => removeQ(i)}><X className="h-4 w-4" /></Button>
                        </div>
                      ))}
                      {(form.questions || []).length === 0 && <p className="text-xs text-muted-foreground">No prompts — customer sees a blank textarea.</p>}
                    </div>
                  </div>

                  <div><Label>Thank-you message</Label><Textarea rows={2} value={form.thank_you_message} onChange={(e) => setForm({ ...form, thank_you_message: e.target.value })} /></div>
                  <Button type="submit" className="w-full">{editing ? "Save changes" : "Create form"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {forms.length === 0 ? (
            <Card className="p-16 text-center text-muted-foreground">No forms yet. Create one to start collecting.</Card>
          ) : (
            <div className="grid gap-4">
              {forms.map((form) => (
                <Card key={form.id} className="p-5">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {form.logo_url && <img src={form.logo_url} alt="" className="h-8 w-8 object-contain rounded border bg-white p-0.5" />}
                      <div className="min-w-0">
                        <div className="font-semibold truncate flex items-center gap-2">
                          {form.form_name}
                          {form.campaign && <span className="text-[10px] uppercase tracking-wide bg-primary-light text-primary px-1.5 py-0.5 rounded font-semibold">{form.campaign}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{form.headline}</div>
                      </div>
                      <span className="h-3 w-3 rounded-full border shrink-0" style={{ background: form.brand_color }} />
                    </div>
                    <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setQrModal({
                            open: true,
                            formUrl: `https://kudospot.pages.dev/collect/${form.public_slug}`,
                            formName: form.form_name,
                          })
                        }
                      >
                        <QrCode className="h-3.5 w-3.5 mr-1" />
                        QR
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => startEdit(form)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeForm(form.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-[#e8eaed] bg-[#f7f8fa] p-2">
                    <div className="text-xs font-semibold uppercase text-muted-foreground px-1 min-w-[60px]">Form</div>
                    <code className="min-w-0 flex-1 break-all text-xs sm:truncate">{publicUrl(form.public_slug)}</code>
                    <Button size="sm" variant="ghost" onClick={() => void copyLink(publicUrl(form.public_slug), "Collection link")}><Copy className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => window.open(publicUrl(form.public_slug), "_blank", "noopener,noreferrer")}><ExternalLink className="h-3.5 w-3.5" /></Button>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-[#dfe7cc] bg-[#f7faef] p-2">
                    <div className="text-xs font-semibold uppercase text-primary px-1 min-w-[60px]">Wall</div>
                    <code className="text-xs flex-1 truncate">{wallUrl(form.public_slug)}</code>
                    <Button size="sm" variant="ghost" className="text-primary" onClick={() => void copyLink(wallUrl(form.public_slug), "Wall of Love link")}><Copy className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="text-primary" onClick={() => window.open(wallUrl(form.public_slug), "_blank", "noopener,noreferrer")}><ExternalLink className="h-3.5 w-3.5" /></Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════ SEQUENCES TAB ═══════════════════ */}
        <TabsContent value="sequences">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">Reusable email copy for manual outreach. These templates do not send emails automatically.</p>
            <Dialog open={seqOpen} onOpenChange={setSeqOpen}>
              <DialogTrigger asChild>
                <Button onClick={startNewSeq}><Plus className="h-4 w-4 mr-1" /> New sequence</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingSeq ? "Edit sequence" : "New email sequence"}</DialogTitle>
                  <DialogDescription>{editingSeq ? "Update your email sequence settings." : "Create a new email sequence to request testimonials."}</DialogDescription>
                </DialogHeader>
                <form onSubmit={saveSeq} className="space-y-5">
                  <div>
                    <Label>Sequence name</Label>
                    <Input required value={seqForm.sequence_name} onChange={(e) => setSeqForm((s) => ({ ...s, sequence_name: e.target.value }))} placeholder="Standard 3-step ask" />
                  </div>

                  {seqForm.emails.map((email, idx) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-3 bg-secondary/10">
                      <div className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email {idx + 1}
                        {idx === 0 ? " — Send immediately" : ` — Send after ${email.delay_days} days`}
                      </div>
                      {idx > 0 && (
                        <div className="flex items-center gap-2">
                          <Label className="w-32 shrink-0">Send after (days)</Label>
                          <Input type="number" min={1} max={60} value={email.delay_days} onChange={(e) => updateSeqEmail(idx, "delay_days", e.target.value)} className="w-24" />
                        </div>
                      )}
                      <div>
                        <Label>Subject line</Label>
                        <Input value={email.subject} onChange={(e) => updateSeqEmail(idx, "subject", e.target.value)} />
                      </div>
                      <div>
                        <Label>Body</Label>
                        <Textarea rows={5} value={email.body} onChange={(e) => updateSeqEmail(idx, "body", e.target.value)} className="font-mono text-sm" />
                        <p className="text-xs text-muted-foreground mt-1">Use [Customer Name], [FORM LINK], [Your Name] as placeholders.</p>
                      </div>
                    </div>
                  ))}

                  <Button type="submit" disabled={savingSeq} className="w-full">
                    {savingSeq ? "Saving…" : editingSeq ? "Save changes" : "Create sequence"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {sequences.length === 0 ? (
            <Card className="p-16 text-center text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-3 opacity-30" />
              No sequences yet. Create your first 3-step email template.
            </Card>
          ) : (
            <div className="grid gap-4">
              {sequences.map((seq) => (
                <Card key={seq.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {seq.sequence_name}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${seq.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                          {seq.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {normalizeSequenceEmails(seq.emails).length} emails
                        {normalizeSequenceEmails(seq.emails).length > 0 && ` · Day 0, ${normalizeSequenceEmails(seq.emails).slice(1).map((email) => `Day ${email.delay_days}`).join(", ")}`}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" disabled={updatingSeqId === seq.id} onClick={() => toggleSeq(seq)} title={seq.is_active ? "Deactivate" : "Activate"}>
                        <ToggleLeft className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => startEditSeq(seq)}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeSeq(seq.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════ SEND REQUESTS TAB ═══════════════════ */}
        <TabsContent value="send">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Manual send */}
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold mb-1">Send to one person</h2>
                <p className="text-sm text-muted-foreground">Logs the contact and prepares a form link. You send the invitation from your email app.</p>
              </div>
              <Card className="p-5 space-y-4">
                <div>
                  <Label>Customer name</Label>
                  <Input value={sendForm.customer_name} onChange={(e) => setSendForm((s) => ({ ...s, customer_name: e.target.value }))} placeholder="Jane Doe" />
                </div>
                <div>
                  <Label>Customer email *</Label>
                  <Input type="email" value={sendForm.customer_email} onChange={(e) => setSendForm((s) => ({ ...s, customer_email: e.target.value }))} placeholder="jane@example.com" required />
                </div>
                {forms.length > 1 && (
                  <div>
                    <Label>Collection form</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={sendForm.form_id}
                      onChange={(e) => setSendForm((s) => ({ ...s, form_id: e.target.value }))}
                    >
                      <option value="">First form ({forms[0]?.form_name})</option>
                      {forms.map((f) => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                    </select>
                  </div>
                )}
                <Button className="w-full" onClick={sendSingleRequest} disabled={sending || !sendForm.customer_name || !sendForm.customer_email}>
                  <Send className="h-4 w-4 mr-1" /> Log & copy link
                </Button>
                {forms.length === 0 && (
                  <p className="text-xs text-warning text-center">Create a collection form first to get a shareable link.</p>
                )}
              </Card>
            </div>

            {/* CSV bulk send */}
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold mb-1">Send to many people</h2>
                <p className="text-sm text-muted-foreground">Upload a CSV with <code className="text-xs bg-muted px-1 py-0.5 rounded">name</code> and <code className="text-xs bg-muted px-1 py-0.5 rounded">email</code> columns, then add the copied link to your bulk email.</p>
              </div>
              <Card className="p-5 space-y-4">
                <div>
                  <label className="cursor-pointer block">
                    <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleCSV(e.target.files[0])} />
                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-secondary/30 transition">
                      <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Click to upload CSV</p>
                      <p className="text-xs text-muted-foreground mt-1">Columns: name, email</p>
                    </div>
                  </label>
                </div>

                {csvRows.length > 0 && (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground flex justify-between">
                        <span>{csvRows.length} contacts loaded</span>
                        <button onClick={() => setCsvRows([])} className="text-destructive hover:underline">Clear</button>
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y text-sm">
                        {csvRows.slice(0, 20).map((r, i) => (
                          <div key={i} className="px-3 py-2 flex justify-between">
                            <span>{r.name || "—"}</span>
                            <span className="text-muted-foreground">{r.email}</span>
                          </div>
                        ))}
                        {csvRows.length > 20 && <div className="px-3 py-2 text-xs text-muted-foreground">…and {csvRows.length - 20} more</div>}
                      </div>
                    </div>
                    <Button className="w-full" onClick={sendAllCSV} disabled={sending}>
                      <Send className="h-4 w-4 mr-1" /> Log {csvRows.length} contacts & copy link
                    </Button>
                  </>
                )}
              </Card>
            </div>
          </div>

          {/* Send history */}
          {sends.length > 0 && (
            <div className="mt-8">
              <h2 className="font-semibold mb-3">Recently prepared requests</h2>
              <Card className="overflow-hidden">
                <div className="divide-y text-sm">
                  {sends.map((s) => (
                    <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        {statusIcon(s.status)}
                        <span className="font-medium truncate">{s.customer_name || "—"}</span>
                        <span className="text-muted-foreground truncate">{s.customer_email}</span>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {new Date(s.sent_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <QRCodeModal 
        open={qrModal.open} 
        onOpenChange={(open) => setQrModal((prev) => ({ ...prev, open }))} 
        formUrl={qrModal.formUrl} 
        formName={qrModal.formName} 
      />
    </AppShell>
  );
};

export default Collect;
