"use client";
import Icon from "../Icon";

export default function PrintButton({ label = "Cetak" }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary">
      <Icon name="printer" className="h-4 w-4" /> {label}
    </button>
  );
}
