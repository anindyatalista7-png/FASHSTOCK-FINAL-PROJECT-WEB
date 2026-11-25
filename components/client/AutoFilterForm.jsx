
"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AutoFilterForm({ children, className }) {
  const router = useRouter();
  const pathname = usePathname();
  const timer = useRef(null);

  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, []);

  function applyFilters(form) {
    const formData = new FormData(form);
    const params = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value.trim() !== "") {
        params.append(key, value);
      }
    }

    params.delete("page");

    const query = params.toString();

    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function onChange(event) {
    const field = event.target;
    const form = event.currentTarget;

    clearTimeout(timer.current);

    if (
      field.tagName === "SELECT" ||
      field.type === "checkbox" ||
      field.type === "date"
    ) {
      applyFilters(form);
    } else if (
      field.type === "text" ||
      field.type === "search"
    ) {
      timer.current = setTimeout(() => applyFilters(form), 700);
    }
  }

  function onSubmit(event) {
    event.preventDefault();
    clearTimeout(timer.current);
    applyFilters(event.currentTarget);
  }

  return (
    <form
      method="GET"
      className={className}
      onChange={onChange}
      onSubmit={onSubmit}
    >
      {children}
    </form>
  );
}
