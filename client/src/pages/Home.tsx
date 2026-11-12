import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  BarChart3,
  Bot,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Inbox,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Tag,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

type View = "overview" | "queue" | "calendar";
type Tone = "professional" | "casual" | "punchy";
type Platform = "LinkedIn" | "X" | "Instagram";

const toneMeta: Record<Tone, { label: string; className: string; accent: string }> = {
  professional: { label: "Professional", className: "bg-[#d9f5a3]/10 text-[#d9f5a3] border-[#d9f5a3]/20", accent: "#d9f5a3" },
  casual: { label: "Casual", className: "bg-[#8aa5ff]/10 text-[#a4b7ff] border-[#8aa5ff]/20", accent: "#8aa5ff" },
  punchy: { label: "Punchy", className: "bg-[#ff8b78]/10 text-[#ff9e8e] border-[#ff8b78]/20", accent: "#ff8b78" },
};

const navItems: Array<{ id: View; label: string; icon: typeof Inbox }> = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "queue", label: "Approval queue", icon: Inbox },
  { id: "calendar", label: "Content calendar", icon: CalendarDays },
];

function formatDate(value: Date | string | null, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  if (!value) return "Unscheduled";
  return new Intl.DateTimeFormat("en-US", options).format(new Date(value));
}

function formatDateTime(value: Date | string | null) {
  if (!value) return "Unscheduled";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function toLocalInput(value: Date) {
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function getStatusLabel(status: string) {
  return status === "posted" ? "Would post" : status[0].toUpperCase() + status.slice(1);
}

function ToneChip({ tone }: { tone: Tone }) {
  const meta = toneMeta[tone];
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.08em] ${meta.className}`}>{meta.label}</span>;
}

function PlatformMark({ platform }: { platform: Platform }) {
  return <span className="inline-flex items-center gap-1.5 text-[11px] text-[#aab0c2]"><span className="grid h-5 w-5 place-items-center rounded-md bg-[#202741] text-[10px] font-display font-bold text-white">{platform === "LinkedIn" ? "in" : platform === "Instagram" ? "ig" : "𝕏"}</span>{platform}</span>;
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-[#8aa5ff]/10 text-[#a4b7ff] border-[#8aa5ff]/20",
    approved: "bg-[#d9f5a3]/10 text-[#d9f5a3] border-[#d9f5a3]/20",
    scheduled: "bg-[#b59dff]/10 text-[#c9baff] border-[#b59dff]/20",
    posted: "bg-[#64d7bd]/10 text-[#7ce5ce] border-[#64d7bd]/20",
    rejected: "bg-[#ff8b78]/10 text-[#ff9e8e] border-[#ff8b78]/20",
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.08em] ${styles[status] ?? styles.draft}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{getStatusLabel(status)}</span>;
}

function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-[12px] font-semibold uppercase tracking-[0.12em] text-[#c4c9d8]">{children}</h2>{action}</div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="rounded-2xl border border-dashed border-[#2b334e] bg-[#11162a]/60 px-6 py-12 text-center"><div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#202741] text-[#c9f36a]"><Inbox size={19} /></div><p className="font-display text-sm font-semibold text-white">{title}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#8990a5]">{body}</p></div>;
}

function PostCard({ post, onRefresh }: { post: any; onRefresh: (jumpToDate?: Date) => void }) {
  const [editing, setEditing] = useState(false);
  const [copy, setCopy] = useState(post.copy);
  const [scheduleAt, setScheduleAt] = useState(toLocalInput(post.scheduledAt ? new Date(post.scheduledAt) : new Date(Date.now() + 86_400_000)));
  const approve = trpc.content.approve.useMutation({ onSuccess: () => { toast.success("Draft approved"); onRefresh(); }, onError: (error) => toast.error(error.message) });
  const reject = trpc.content.reject.useMutation({ onSuccess: () => { toast("Draft moved to rejected"); onRefresh(); }, onError: (error) => toast.error(error.message) });
  const schedule = trpc.content.schedule.useMutation({
    onSuccess: (_, variables) => {
      toast.success("Post added to the calendar");
      onRefresh(new Date(variables.scheduledAt));
    },
    onError: (error) => toast.error(error.message),
  });

  const saveApproval = async () => {
    await approve.mutateAsync({ id: post.id, copy });
  };

  return <article className="group rounded-2xl border border-[#2b334e] bg-[#151a2e]/90 p-5 shadow-[0_12px_40px_rgba(0,0,0,.12)] transition duration-200 hover:-translate-y-0.5 hover:border-[#465172] rise-in">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2"><ToneChip tone={post.tone} /><PlatformMark platform={post.platform} /><span className="text-[11px] text-[#606981]">·</span><span className="text-[11px] text-[#8990a5]">{formatDate(post.createdAt)}</span></div>
      <div className="flex items-center gap-2"><StatusPill status={post.status} /><button className="rounded-md p-1.5 text-[#8990a5] transition hover:bg-[#202741] hover:text-white"><MoreHorizontal size={16} /></button></div>
    </div>
    <h3 className="mt-4 font-display text-[17px] font-semibold leading-6 text-white">{post.title}</h3>
    {editing ? <textarea value={copy} onChange={(event) => setCopy(event.target.value)} className="mt-3 min-h-32 w-full resize-y rounded-xl border border-[#465172] bg-[#101526] p-3 text-sm leading-6 text-[#f5f4ef] outline-none focus:border-[#c9f36a]" /> : <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#b5bac9]">{post.copy}</p>}
    <div className="mt-4 flex items-center gap-2 text-xs text-[#8990a5]"><Tag size={13} className="text-[#69738d]" />{post.hashtags || "No hashtags yet"}</div>

    {post.status === "draft" && <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#2b334e] pt-4"><button onClick={() => setEditing(!editing)} className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-[#b5bac9] transition hover:bg-[#202741] hover:text-white"><Pencil size={14} />{editing ? "Close editor" : "Edit copy"}</button><div className="flex items-center gap-2"><button onClick={() => reject.mutate({ id: post.id })} className="rounded-lg border border-[#2b334e] px-3 py-2 text-xs font-semibold text-[#b5bac9] transition hover:border-[#ff8b78]/50 hover:text-[#ff9e8e]">Reject</button><button onClick={saveApproval} disabled={approve.isPending} className="inline-flex items-center gap-2 rounded-lg bg-[#c9f36a] px-3.5 py-2 text-xs font-bold text-[#101522] transition hover:bg-[#ddff91] active:scale-[.97] disabled:opacity-50"><Check size={14} />{approve.isPending ? "Saving…" : "Approve"}</button></div></div>}
    {post.status === "approved" && <div className="mt-5 border-t border-[#2b334e] pt-4"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium text-[#b5bac9]">Choose a send time</span><span className="font-mono text-[10px] uppercase tracking-[.08em] text-[#8990a5]">Simulated posting</span></div><div className="flex flex-wrap gap-2"><input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-[#2b334e] bg-[#101526] px-3 py-2 text-xs text-white outline-none focus:border-[#c9f36a]" /><button onClick={() => schedule.mutate({ id: post.id, scheduledAt: new Date(scheduleAt).toISOString() })} disabled={schedule.isPending} className="inline-flex items-center gap-2 rounded-lg bg-[#8b7cf6] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#9b8eff] active:scale-[.97] disabled:opacity-50"><Clock3 size={14} />{schedule.isPending ? "Saving…" : "Schedule"}</button></div></div>}
    {post.status === "scheduled" && <div className="mt-5 flex items-center justify-between border-t border-[#2b334e] pt-4"><div className="flex items-center gap-2 text-xs text-[#b5bac9]"><Clock3 size={14} className="text-[#b59dff]" />{formatDateTime(post.scheduledAt)}</div><span className="text-[10px] font-mono uppercase tracking-[.08em] text-[#8990a5]">Awaiting dispatcher</span></div>}
    {post.status === "posted" && <div className="mt-5 flex items-center gap-2 border-t border-[#2b334e] pt-4 text-xs text-[#7ce5ce]"><ShieldCheck size={14} />Marked as would post · {formatDateTime(post.usedAt)}</div>}
  </article>;
}

function Generator({ onGenerated }: { onGenerated: () => void }) {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform>("LinkedIn");
  const generate = trpc.content.generate.useMutation({ onSuccess: (data) => { toast.success(`3 variants created via ${data.provider === "groq" ? "Groq Llama" : "demo mode"}`); setTopic(""); onGenerated(); }, onError: (error) => toast.error(error.message) });
  return <section className="relative overflow-hidden rounded-[22px] border border-[#3a4466] bg-[#1a2038] p-5 shadow-[0_20px_60px_rgba(0,0,0,.16)] sm:p-6"><div className="noise absolute inset-0" /><div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#7d6bff]/15 blur-3xl" /><div className="relative"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#c9f36a]/20 bg-[#c9f36a]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.12em] text-[#d9f5a3]"><WandSparkles size={12} />Draft engine</div><h1 className="font-display text-[24px] font-semibold tracking-[-.03em] text-white sm:text-[28px]">Turn a thought into a <span className="text-[#d9f5a3]">content runway.</span></h1><p className="mt-2 max-w-xl text-sm leading-6 text-[#aab0c2]">Give the engine a topic. You get three distinct angles, then you stay in control of what ships.</p></div><div className="hidden rounded-2xl border border-[#465172] bg-[#12172a]/50 p-3 sm:block"><Bot size={21} className="text-[#c9f36a]" /><p className="mt-2 text-[10px] font-mono uppercase tracking-[.08em] text-[#8990a5]">Human in the loop</p></div></div><div className="mt-6 flex flex-col gap-2 sm:flex-row"><input value={topic} onChange={(event) => setTopic(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && topic.trim()) generate.mutate({ topic, platform }); }} placeholder="e.g. Launching a sustainable creator workflow" className="min-w-0 flex-1 rounded-xl border border-[#465172] bg-[#101526]/80 px-4 py-3.5 text-sm text-white outline-none placeholder:text-[#69738d] focus:border-[#c9f36a]" /><select value={platform} onChange={(event) => setPlatform(event.target.value as Platform)} className="rounded-xl border border-[#465172] bg-[#101526]/80 px-3 text-sm text-[#d8dbea] outline-none focus:border-[#c9f36a]"><option>LinkedIn</option><option>X</option><option>Instagram</option></select><button onClick={() => topic.trim() && generate.mutate({ topic, platform })} disabled={!topic.trim() || generate.isPending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c9f36a] px-5 py-3.5 text-sm font-bold text-[#101522] transition hover:bg-[#ddff91] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"><Sparkles size={16} />{generate.isPending ? "Writing…" : "Generate variants"}</button></div><div className="mt-3 flex items-center gap-2 text-[11px] text-[#8990a5]"><Zap size={13} className="text-[#ffbf68]" />Three tones · one approval queue · zero autopilot</div></div></section>;
}

function MiniStat({ label, value, detail, icon: Icon, tone }: { label: string; value: string | number; detail: string; icon: typeof FileText; tone: "lime" | "violet" | "coral" | "mint" }) {
  const colors = { lime: "text-[#d9f5a3] bg-[#d9f5a3]/10", violet: "text-[#c9baff] bg-[#b59dff]/10", coral: "text-[#ff9e8e] bg-[#ff8b78]/10", mint: "text-[#7ce5ce] bg-[#64d7bd]/10" };
  return <div className="rounded-2xl border border-[#2b334e] bg-[#151a2e]/90 p-4"><div className="flex items-start justify-between"><div className={`grid h-8 w-8 place-items-center rounded-lg ${colors[tone]}`}><Icon size={16} /></div><ArrowUpRight size={15} className="text-[#566078]" /></div><p className="mt-4 font-display text-2xl font-semibold text-white">{value}</p><p className="mt-1 text-xs font-medium text-[#c4c9d8]">{label}</p><p className="mt-1 text-[11px] text-[#6f7890]">{detail}</p></div>;
}

function Overview({ posts, analytics, onRefresh }: { posts: any[]; analytics: any; onRefresh: (jumpToDate?: Date) => void }) {
  const draftCount = posts.filter((post) => post.status === "draft").length;
  const scheduledCount = posts.filter((post) => post.status === "scheduled").length;
  const postedCount = posts.filter((post) => post.status === "posted").length;
  return <div className="space-y-6"><Generator onGenerated={onRefresh} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MiniStat label="Awaiting review" value={draftCount} detail="Drafts in your queue" icon={Inbox} tone="lime" /><MiniStat label="Scheduled" value={scheduledCount} detail="Ready for the dispatcher" icon={Clock3} tone="violet" /><MiniStat label="Used content" value={postedCount} detail="Marked as would post" icon={Send} tone="mint" /><MiniStat label="Total variants" value={analytics?.total ?? posts.length} detail="Across all tones" icon={FileText} tone="coral" /></div><div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]"><div><SectionLabel action={<button onClick={() => onRefresh()} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8990a5] transition hover:text-white"><RefreshCw size={13} />Refresh</button>}>Latest drafts</SectionLabel><div className="space-y-3">{posts.filter((post) => post.status === "draft").slice(0, 2).map((post) => <PostCard key={post.id} post={post} onRefresh={onRefresh} />)}{draftCount === 0 && <EmptyState title="The queue is clear" body="Generate a new set of variants when the next idea arrives." />}</div></div><div><SectionLabel>Preference signal</SectionLabel><PreferencePanel analytics={analytics} /></div></div></div>;
}

function PreferencePanel({ analytics }: { analytics: any }) {
  const toneCounts = analytics?.toneCounts ?? [];
  const max = Math.max(...toneCounts.map((item: any) => item.used), 1);
  return <div className="rounded-2xl border border-[#2b334e] bg-[#151a2e]/90 p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-display text-[17px] font-semibold text-white">Your content signal</p><p className="mt-1 text-xs leading-5 text-[#8990a5]">A simple feedback loop from what you mark as used.</p></div><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#b59dff]/10 text-[#c9baff]"><BarChart3 size={17} /></div></div><div className="mt-6 space-y-5">{toneCounts.map((item: any) => <div key={item.tone}><div className="mb-2 flex items-center justify-between text-xs"><span className="text-[#d8dbea]">{toneMeta[item.tone as Tone]?.label ?? item.tone}</span><span className="font-mono text-[#8990a5]">{item.used} used / {item.total} total</span></div><div className="h-2 overflow-hidden rounded-full bg-[#252c45]"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(item.used / max * 100, item.total ? 8 : 0)}%`, backgroundColor: toneMeta[item.tone as Tone]?.accent ?? "#c9f36a" }} /></div></div>)}</div><div className="mt-6 border-t border-[#2b334e] pt-4 text-xs leading-5 text-[#8990a5]">This is preference learning, not engagement data. Connect a platform later for reach and performance metrics.</div></div>;
}

function Queue({ posts, onRefresh }: { posts: any[]; onRefresh: (jumpToDate?: Date) => void }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? posts.filter((post) => ["draft", "approved", "scheduled"].includes(post.status)) : posts.filter((post) => post.status === filter);
  return <div><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-mono uppercase tracking-[.12em] text-[#8990a5]">Editorial control room</p><h1 className="mt-1 font-display text-2xl font-semibold text-white">Approval queue</h1><p className="mt-1 text-sm text-[#8990a5]">Review, refine, and decide what earns a spot on the calendar.</p></div><div className="flex items-center gap-1 rounded-xl border border-[#2b334e] bg-[#151a2e] p-1">{["all", "draft", "approved", "scheduled"].map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-lg px-3 py-2 text-[11px] font-semibold capitalize transition ${filter === item ? "bg-[#c9f36a] text-[#101522]" : "text-[#8990a5] hover:text-white"}`}>{item}</button>)}</div></div><div className="grid gap-4 lg:grid-cols-2">{filtered.map((post) => <PostCard key={post.id} post={post} onRefresh={onRefresh} />)}</div>{filtered.length === 0 && <EmptyState title="Nothing in this view" body="Try another filter, or generate a new set of content variants." />}</div>;
}

function CalendarView({ posts, monthAnchor, onMonthChange }: { posts: any[]; monthAnchor: Date; onMonthChange: (next: Date) => void }) {
  const scheduledPosts = posts.filter((post) => post.scheduledAt);
  const approvedUnscheduled = posts.filter((post) => post.status === "approved" && !post.scheduledAt);

  const cells = useMemo(() => {
    const first = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
  }, [monthAnchor]);

  const postsByDay = useMemo(() => scheduledPosts.reduce<Record<string, any[]>>((acc, post) => {
    const key = new Date(post.scheduledAt).toISOString().slice(0, 10);
    acc[key] = [...(acc[key] ?? []), post];
    return acc;
  }, {}), [scheduledPosts]);

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(monthAnchor);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-[.12em] text-[#8990a5]">Publishing rhythm</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-white">Content calendar</h1>
          <p className="mt-1 text-sm text-[#8990a5]">Approved posts become scheduled beats. The dispatcher simulates the handoff.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => onMonthChange(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-[#2b334e] bg-[#151a2e] text-[#aab0c2] transition hover:border-[#465172] hover:text-white"><ChevronLeft size={16} /></button>
          <span className="min-w-32 text-center font-display text-sm font-semibold text-white">{monthLabel}</span>
          <button onClick={() => onMonthChange(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-[#2b334e] bg-[#151a2e] text-[#aab0c2] transition hover:border-[#465172] hover:text-white"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Approved / awaiting schedule tray */}
      {approvedUnscheduled.length > 0 && (
        <div className="mb-5 rounded-2xl border border-[#d9f5a3]/20 bg-[#d9f5a3]/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Check size={14} className="text-[#d9f5a3]" />
            <span className="font-mono text-[10px] uppercase tracking-[.12em] text-[#d9f5a3]">Approved · awaiting schedule ({approvedUnscheduled.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {approvedUnscheduled.map((post) => (
              <div key={post.id} className="rounded-xl border border-[#d9f5a3]/20 bg-[#151a2e] px-3 py-2 max-w-xs">
                <div className="mb-1 flex items-center gap-2">
                  <PlatformMark platform={post.platform} />
                  <ToneChip tone={post.tone} />
                </div>
                <p className="text-[12px] font-medium text-white line-clamp-1">{post.title}</p>
                <p className="mt-0.5 text-[10px] text-[#8990a5]">Go to the queue to pick a send time</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <div className="overflow-hidden rounded-2xl border border-[#2b334e] bg-[#151a2e]/90">
        <div className="grid grid-cols-7 border-b border-[#2b334e]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="px-3 py-3 text-center text-[10px] font-mono uppercase tracking-[.1em] text-[#69738d]">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date) => {
            const key = date.toISOString().slice(0, 10);
            const dayPosts = postsByDay[key] ?? [];
            const inMonth = date.getMonth() === monthAnchor.getMonth();
            return (
              <div key={key} className={`min-h-28 border-b border-r border-[#2b334e] p-2.5 ${inMonth ? "bg-[#151a2e]" : "bg-[#11162a]/60"}`}>
                <div className={`mb-2 text-xs font-mono ${inMonth ? "text-[#b5bac9]" : "text-[#4f5972]"}`}>{date.getDate()}</div>
                <div className="space-y-1.5">
                  {dayPosts.map((post) => (
                    <div key={post.id} className="rounded-lg border border-[#b59dff]/20 bg-[#b59dff]/10 p-2">
                      <div className="mb-1 flex items-center justify-between gap-1">
                        <span className="text-[9px] font-mono uppercase tracking-[.06em] text-[#c9baff]">{post.platform}</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#b59dff]" />
                      </div>
                      <p className="line-clamp-2 text-[11px] font-medium leading-4 text-[#e8e5ff]">{post.title}</p>
                      <p className="mt-1 text-[9px] text-[#a198cd]">{formatDate(post.scheduledAt, { hour: "numeric", minute: "2-digit" })}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-[#8990a5]">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#d9f5a3]" />Approved (unscheduled)</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#b59dff]" />Scheduled</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#64d7bd]" />Would post</span>
        <span className="ml-auto inline-flex items-center gap-2 text-[#69738d]"><ShieldCheck size={13} />No platform is connected in demo mode</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [monthAnchor, setMonthAnchor] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const queue = trpc.content.queue.useQuery({});
  const analytics = trpc.content.analytics.useQuery();
  const monthInput = useMemo(() => ({ from: new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1).toISOString(), to: new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0, 23, 59, 59).toISOString() }), [monthAnchor]);
  const calendar = trpc.content.calendar.useQuery(monthInput, { refetchOnMount: "always" });
  const utils = trpc.useUtils();
  const refresh = (jumpToDate?: Date) => {
    void utils.content.queue.invalidate();
    void utils.content.analytics.invalidate();
    void utils.content.calendar.invalidate();
    if (jumpToDate) setMonthAnchor(new Date(jumpToDate.getFullYear(), jumpToDate.getMonth(), 1));
  };
  const posts = queue.data ?? [];
  const draftCount = posts.filter((post) => post.status === "draft").length;

  return <div className="min-h-screen bg-transparent"><div className="fixed inset-0 -z-10 noise" /><div className="mx-auto flex min-h-screen max-w-[1600px]"><aside className={`fixed inset-y-0 left-0 z-30 flex w-[252px] flex-col border-r border-[#2b334e] bg-[#101526] px-4 py-5 transition-transform duration-200 lg:static lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}><div className="flex items-center justify-between px-3"><div className="flex items-center gap-2.5"><div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#c9f36a] text-[#101522]"><Sparkles size={17} strokeWidth={2.5} /></div><div><p className="font-display text-[15px] font-bold tracking-[-.02em] text-white">Signal Desk</p><p className="font-mono text-[9px] uppercase tracking-[.13em] text-[#69738d]">Social content agent</p></div></div><button onClick={() => setMobileOpen(false)} className="rounded-lg p-1 text-[#8990a5] hover:bg-[#202741] lg:hidden"><X size={17} /></button></div><div className="mt-10 px-3"><p className="mb-3 font-mono text-[10px] uppercase tracking-[.14em] text-[#566078]">Workspace</p><nav className="space-y-1">{navItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setView(id); setMobileOpen(false); }} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${view === id ? "bg-[#202741] font-semibold text-white" : "text-[#8990a5] hover:bg-[#181e33] hover:text-[#d8dbea]"}`}><span className="flex items-center gap-3"><Icon size={16} className={view === id ? "text-[#c9f36a]" : "text-[#69738d]"} />{label}</span>{id === "queue" && draftCount > 0 && <span className="rounded-full bg-[#c9f36a] px-1.5 py-0.5 text-[10px] font-bold text-[#101522]">{draftCount}</span>}</button>)}</nav></div><div className="mt-8 px-3"><p className="mb-3 font-mono text-[10px] uppercase tracking-[.14em] text-[#566078]">System</p><div className="rounded-xl border border-[#2b334e] bg-[#151a2e] p-3"><div className="flex items-center gap-2 text-xs font-medium text-[#d8dbea]"><span className="h-2 w-2 rounded-full bg-[#7ce5ce] shadow-[0_0_0_4px_rgba(100,215,189,.1)]" />Demo dispatcher live</div><p className="mt-2 text-[11px] leading-5 text-[#69738d]">Scheduled items are marked as “would post” in this build.</p></div></div><div className="mt-auto border-t border-[#2b334e] px-3 pt-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="grid h-8 w-8 place-items-center rounded-full bg-[#8b7cf6] font-display text-xs font-bold text-white">SD</div><div><p className="text-xs font-semibold text-white">Studio owner</p><p className="text-[10px] text-[#69738d]">Human approval mode</p></div></div><button className="rounded-lg p-1.5 text-[#69738d] hover:bg-[#202741] hover:text-white"><MoreHorizontal size={15} /></button></div></div></aside><main className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex h-[70px] items-center justify-between border-b border-[#2b334e]/80 bg-[#0d1122]/85 px-5 backdrop-blur-xl sm:px-8"><div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-[#aab0c2] hover:bg-[#202741] lg:hidden"><Menu size={19} /></button><div><p className="font-mono text-[10px] uppercase tracking-[.15em] text-[#69738d]">Tuesday, September 18, 2026</p><p className="font-display text-sm font-semibold text-white">Good morning, studio.</p></div></div><div className="flex items-center gap-2 sm:gap-3"><div className="hidden items-center gap-2 rounded-full border border-[#2b334e] bg-[#151a2e] px-3 py-1.5 text-[11px] text-[#8990a5] sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#7ce5ce]" />All systems nominal</div><button onClick={() => setView("queue")} className="inline-flex items-center gap-2 rounded-lg border border-[#2b334e] bg-[#151a2e] px-3 py-2 text-xs font-semibold text-[#d8dbea] transition hover:border-[#465172] hover:text-white"><Plus size={14} />New draft</button></div></header><div className="mx-auto max-w-[1320px] px-5 py-7 sm:px-8 sm:py-9"><div className="mb-7 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.15em] text-[#69738d]">{view === "overview" ? "Workspace overview" : view === "queue" ? "Editorial workspace" : "Publishing workspace"}</p><h1 className="mt-1 font-display text-3xl font-semibold tracking-[-.04em] text-white">{view === "overview" ? "Make the next post easier." : view === "queue" ? "Choose what earns a spot." : "See the rhythm at a glance."}</h1></div><div className="hidden items-center gap-2 text-xs text-[#8990a5] md:flex"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#c9f36a]" />Human approval required</span></div></div>{queue.isLoading ? <div className="rounded-2xl border border-[#2b334e] bg-[#151a2e] p-10 text-center text-sm text-[#8990a5]">Loading your workspace…</div> : view === "overview" ? <Overview posts={posts} analytics={analytics.data} onRefresh={refresh} /> : view === "queue" ? <Queue posts={posts} onRefresh={refresh} /> : <CalendarView posts={calendar.data ?? []} monthAnchor={monthAnchor} onMonthChange={setMonthAnchor} />}</div></main></div></div>;
}
