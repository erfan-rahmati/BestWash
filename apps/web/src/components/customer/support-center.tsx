"use client";

import {
  LoaderCircle,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Send,
  Ticket,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  ApiError,
  createTicket,
  getPublicContent,
  getTicket,
  getTickets,
  replyTicket,
  type SupportTicket,
} from "../../lib/api/account";
import { formatDateTime } from "../../lib/format";
import {
  safeGoogleMapsEmbedUrl,
  safeHttpUrl,
  safeTelephoneUrl,
} from "../../lib/safe-url";
import { GuestGate } from "./guest-gate";

const categories = [
  ["BOOKING", "رزرو"],
  ["PAYMENT", "پرداخت و کیف پول"],
  ["VEHICLE", "خودرو"],
  ["ACCOUNT", "حساب کاربری"],
  ["OTHER", "سایر"],
] as const;

export function SupportCenter() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [creating, setCreating] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("BOOKING");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contact, setContact] = useState<{
    phone?: string;
    address?: string;
    whatsapp?: string;
    bale?: string;
    mapUrl?: string;
    mapEmbedUrl?: string;
  }>({});
  function load() {
    getTickets()
      .then(setTickets)
      .catch((err) =>
        setUnauthorized(err instanceof ApiError && err.status === 401),
      )
      .finally(() => setLoaded(true));
  }
  useEffect(() => {
    void load();
    getPublicContent()
      .then((data) =>
        setContact((data.content.contact ?? {}) as typeof contact),
      )
      .catch(() => null);
  }, []);
  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const ticket = await createTicket({ subject, category, message });
      setTickets((current) => [ticket, ...current]);
      setSelected(ticket);
      setCreating(false);
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت درخواست انجام نشد.");
    } finally {
      setSaving(false);
    }
  }
  async function openTicket(ticket: SupportTicket) {
    const detail = await getTicket(ticket.id);
    setSelected(detail);
  }
  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setSaving(true);
    try {
      await replyTicket(selected.id, reply);
      setReply("");
      setSelected(await getTicket(selected.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "ارسال پاسخ انجام نشد.");
    } finally {
      setSaving(false);
    }
  }
  if (!loaded)
    return (
      <div className="flex min-h-52 items-center justify-center">
        <LoaderCircle className="animate-spin text-blue-600" />
      </div>
    );
  if (unauthorized)
    return <GuestGate title="برای ارتباط با پشتیبانی وارد شوید" />;
  const directPhone = safeTelephoneUrl(contact.phone) || "/contact";
  const messenger = safeHttpUrl(contact.whatsapp) || "/contact";
  const mapUrl = safeHttpUrl(contact.mapUrl, "https://www.google.com/maps");
  const mapEmbedUrl = safeGoogleMapsEmbedUrl(
    contact.mapEmbedUrl,
    contact.address,
  );
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <a
          href={directPhone}
          className="flex min-h-14 items-center gap-2 rounded-[16px] border border-blue-100 bg-blue-50 px-3"
        >
          <Phone size={17} className="text-blue-600" />
          <span className="text-[10px] font-bold text-slate-700">
            تماس مستقیم
          </span>
        </a>
        <a
          href={messenger}
          target={messenger.startsWith("http") ? "_blank" : undefined}
          rel="noreferrer"
          className="flex min-h-14 items-center gap-2 rounded-[16px] border border-emerald-100 bg-emerald-50 px-3"
        >
          <MessageCircle size={17} className="text-emerald-600" />
          <span className="text-[10px] font-bold text-slate-700">
            پشتیبانی واتساپ
          </span>
        </a>
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          className="col-span-2 overflow-hidden rounded-[18px] border border-[var(--bw-border)] bg-white"
        >
          <div className="h-36 bg-slate-100">
            <iframe
              title="نقشه مجموعه BestWash"
              src={mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="pointer-events-none h-full w-full border-0"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-3">
            <MapPin size={17} className="shrink-0 text-blue-600" />
            <span className="text-[10px] leading-5 text-slate-600">
              {contact.address || "بابلسر، مجموعه کارواش اتوماتیک BestWash"}
            </span>
          </div>
        </a>
      </div>
      <button
        onClick={() => {
          setCreating(true);
          setSelected(null);
        }}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-blue-600 text-[11px] font-black text-white shadow-[var(--bw-shadow-blue)]"
      >
        <Plus size={18} />
        درخواست پشتیبانی جدید
      </button>
      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-[13px] bg-red-50 p-3 text-[10px] text-red-600"
        >
          {error}
        </p>
      ) : null}
      {creating ? (
        <div className="mt-4 rounded-[24px] border border-[var(--bw-border)] bg-white p-5">
          <div className="flex items-center">
            <h2 className="text-[13px] font-black">درخواست جدید</h2>
            <button
              onClick={() => setCreating(false)}
              className="mr-auto flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"
            >
              <X size={17} />
            </button>
          </div>
          <label className="mt-4 block text-[11px] font-bold text-slate-600">
            موضوع
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-[14px] border border-[var(--bw-border)] px-3 text-[12px] outline-none"
            />
          </label>
          <label className="mt-4 block text-[11px] font-bold text-slate-600">
            دسته‌بندی
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-[14px] border border-[var(--bw-border)] bg-white px-3 text-[11px] outline-none"
            >
              {categories.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-[11px] font-bold text-slate-600">
            شرح درخواست
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              className="mt-2 w-full resize-none rounded-[14px] border border-[var(--bw-border)] p-3 text-[11px] leading-6 outline-none"
            />
          </label>
          <button
            disabled={
              saving || subject.trim().length < 4 || message.trim().length < 10
            }
            onClick={() => void submit()}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-blue-600 text-[11px] font-black text-white disabled:opacity-50"
          >
            {saving ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : (
              <Send size={17} />
            )}
            ثبت درخواست
          </button>
        </div>
      ) : null}
      {selected ? (
        <div className="mt-4 rounded-[24px] border border-[var(--bw-border)] bg-white p-5">
          <button
            onClick={() => setSelected(null)}
            className="mb-4 text-[10px] font-bold text-blue-700"
          >
            بازگشت به فهرست
          </button>
          <div className="flex items-start">
            <div>
              <p className="text-[13px] font-black">{selected.subject}</p>
              <p dir="ltr" className="mt-1 text-left text-[9px] text-slate-400">
                {selected.code}
              </p>
            </div>
            <span className="mr-auto rounded-full bg-emerald-50 px-3 py-1 text-[9px] font-black text-emerald-700">
              {selected.status === "CLOSED" ? "بسته‌شده" : "در حال پیگیری"}
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {selected.messages.map((item) => (
              <div
                key={item.id}
                className={`max-w-[88%] rounded-[17px] p-3 ${item.authorType === "CUSTOMER" ? "mr-auto bg-blue-600 text-white" : "ml-auto bg-slate-100 text-slate-700"}`}
              >
                <p className="text-[10px] leading-6">{item.body}</p>
                <p
                  className={`mt-1 text-[8px] ${item.authorType === "CUSTOMER" ? "text-blue-100" : "text-slate-400"}`}
                >
                  {formatDateTime(item.createdAt)}
                </p>
              </div>
            ))}
          </div>
          {selected.status !== "CLOSED" ? (
            <div className="mt-5 flex gap-2">
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={2}
                placeholder="پاسخ شما..."
                className="min-w-0 flex-1 resize-none rounded-[14px] border border-[var(--bw-border)] p-3 text-[10px] outline-none"
              />
              <button
                onClick={() => void sendReply()}
                disabled={saving || !reply.trim()}
                className="flex w-12 items-center justify-center rounded-[14px] bg-blue-600 text-white disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          ) : null}
        </div>
      ) : !creating ? (
        <div className="mt-4 space-y-3">
          {tickets.length ? (
            tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => void openTicket(ticket)}
                className="flex w-full items-center gap-3 rounded-[20px] border border-[var(--bw-border)] bg-white p-4 text-right"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-blue-50 text-blue-600">
                  <Ticket size={18} />
                </span>
                <div>
                  <p className="text-[11px] font-black text-slate-700">
                    {ticket.subject}
                  </p>
                  <p className="mt-1 text-[9px] text-slate-400">
                    {formatDateTime(ticket.updatedAt)}
                  </p>
                </div>
                <span className="mr-auto text-[9px] font-bold text-blue-700">
                  مشاهده
                </span>
              </button>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-blue-200 bg-blue-50 p-8 text-center">
              <MessageCircle className="mx-auto text-blue-500" />
              <p className="mt-3 text-[11px] text-slate-600">
                هنوز درخواست پشتیبانی ثبت نکرده‌اید.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
