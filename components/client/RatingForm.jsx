"use client";
import { useActionState, useState } from "react";
import SubmitButton from "./SubmitButton";
import Icon from "../Icon";

const LABELS = ["", "Sangat buruk", "Buruk", "Cukup", "Baik", "Sangat baik"];

export default function RatingForm({ action, initialRating = 0, initialFeedback = "" }) {
  const [state, formAction] = useActionState(action, null);
  const [rating, setRating] = useState(initialRating || 0);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="rating" value={rating || ""} />
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} aria-label={`${n} bintang`}
            className="rounded-md p-0.5 transition hover:scale-110">
            <Icon name="star" filled={n <= shown} className={`h-7 w-7 ${n <= shown ? "text-brand-500" : "text-stone-300"}`} />
          </button>
        ))}
        <span className="ml-2 text-sm font-semibold text-stone-600">{LABELS[shown]}</span>
      </div>
      <textarea name="feedback" rows={3} defaultValue={state?.values?.feedback ?? initialFeedback} placeholder="Feedback untuk supplier (opsional)" className="input" />
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <SubmitButton className="btn btn-accent w-full" pendingText="Menyimpan...">{initialRating ? "Perbarui Rating" : "Simpan Rating"}</SubmitButton>
    </form>
  );
}
