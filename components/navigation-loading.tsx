"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";

export function NavigationLoading() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const routeKey = `${pathname}?${searchParams.toString()}`;

  function stopLoading() {
    setLoading(false);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function startLoading() {
    setLoading(true);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setLoading(false), 9000);
  }

  useEffect(() => {
    stopLoading();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.dataset.noRouteLoader === "true" || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const rawHref = anchor.getAttribute("href") || "";
      if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) return;

      try {
        const next = new URL(anchor.href, window.location.href);
        if (next.origin !== window.location.origin) return;
        const current = new URL(window.location.href);
        if (next.pathname === current.pathname && next.search === current.search && next.hash === current.hash) return;
        startLoading();
      } catch {
        // Bỏ qua đường dẫn không hợp lệ.
      }
    }

    function onSubmit(event: SubmitEvent) {
      const form = event.target as HTMLFormElement | null;
      if (!form || form.dataset.noRouteLoader === "true") return;
      const method = (form.method || "get").toLowerCase();
      if (method === "get") startLoading();
    }

    function onPageShow() {
      stopLoading();
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("pageshow", onPageShow);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loading) return null;

  return (
    <div className="route-loading-layer" role="status" aria-live="polite" aria-label="Đang tải nội dung">
      <div className="route-loading-bar" />
      <div className="route-loading-box">
        <LoaderCircle className="route-loading-spinner" size={24} />
        <div>
          <strong>Đang tải dữ liệu</strong>
          <span>Vui lòng chờ trong giây lát...</span>
        </div>
      </div>
    </div>
  );
}
