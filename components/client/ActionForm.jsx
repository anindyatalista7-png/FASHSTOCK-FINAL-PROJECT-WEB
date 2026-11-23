"use client";
import { useActionState } from "react";

/**
 * Form serbaguna untuk Server Action dengan signature (prevState, formData).
 * - confirmMessage: tampilkan konfirmasi sebelum submit
 * - Pesan error dari server ditampilkan di bawah form
 */
export default function ActionForm({ action, children, confirmMessage, className = "", errorClass = "" }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
      {state?.error && (
        <p role="alert" className={`mt-2 w-full rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ${errorClass}`}>
          {state.error}
        </p>
      )}
    </form>
  );
}
