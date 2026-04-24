"use client";

import { CheckCircle2, PencilLine, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Toast = {
  id: string;
  message: string;
  action: ToastAction;
};

const TOAST_DURATION_MS = 4200;
type ToastAction = "create" | "update" | "delete";

type ToastPayload = {
  action: ToastAction;
  message: string;
};

function createToastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getRequestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function getRequestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.method.toUpperCase();
  }

  return "GET";
}

function normalizeApiUrl(rawUrl: string) {
  try {
    return new URL(rawUrl, window.location.origin);
  } catch {
    return null;
  }
}

function resourceLabel(pathname: string) {
  if (pathname.includes("/medicine-suggestions")) return "Medicine suggestion";
  if (pathname.includes("/medicines")) return "Medicine";
  if (pathname.includes("/medications")) return "Medication";
  if (pathname.includes("/checkups")) return "Checkup";
  if (pathname.includes("/observations")) return "Observation";
  if (pathname.includes("/visits")) return "Visit";
  if (pathname.includes("/regions")) return "Region";
  if (pathname.includes("/content")) return "Educational content";
  if (pathname.includes("/users")) return "User account";
  if (pathname.includes("/settings")) return "Settings";
  if (pathname.includes("/support/tickets")) return "Support ticket";
  return "Record";
}

function inferSuccessToast(method: string, url: URL): ToastPayload | null {
  const pathname = url.pathname;
  if (!pathname.startsWith("/api/")) return null;
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return null;

  const silentPaths = [
    "/api/auth/",
    "/api/doctor/messaging",
    "/api/midwife/messaging",
    "/api/superadmin/notifications",
    "/api/regionaladmin/notifications",
    "/api/doctor/notifications",
    "/api/midwife/notifications",
  ];

  if (silentPaths.some((path) => pathname.startsWith(path))) {
    return null;
  }

  const label = resourceLabel(pathname);
  const type = url.searchParams.get("type")?.toLowerCase();

  if (method === "DELETE" || type === "delete") {
    return {
      action: "delete",
      message: `${label} deleted successfully.`,
    };
  }

  if (method === "PUT" || method === "PATCH" || type === "update") {
    return {
      action: "update",
      message: `${label} updated successfully.`,
    };
  }

  if (type === "provision-phone-auth") {
    return {
      action: "update",
      message: "Phone login provisioning updated successfully.",
    };
  }

  if (pathname.includes("/settings")) {
    return {
      action: "update",
      message: "Settings updated successfully.",
    };
  }

  if (method === "POST") {
    return {
      action: "create",
      message: `${label} created successfully.`,
    };
  }

  return null;
}

function toastTitle(action: ToastAction) {
  if (action === "delete") return "Deleted";
  if (action === "update") return "Updated";
  return "Created";
}

function ToastIcon({ action }: { action: ToastAction }) {
  if (action === "delete") return <Trash2 size={20} aria-hidden="true" />;
  if (action === "update") return <PencilLine size={20} aria-hidden="true" />;
  return <CheckCircle2 size={20} aria-hidden="true" />;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const actions = useMemo(
    () => ({
      show(message: string) {
        const id = createToastId();
        setToasts((current) => [...current, { id, message, action: "create" }]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, TOAST_DURATION_MS);
      },
      showPayload(payload: ToastPayload) {
        const id = createToastId();
        setToasts((current) => [...current, { id, ...payload }]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, TOAST_DURATION_MS);
      },
      dismiss(id: string) {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      },
    }),
    [],
  );

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = getRequestMethod(input, init);
      const url = normalizeApiUrl(getRequestUrl(input));
      const response = await originalFetch(input, init);

      if (response.ok && url) {
        const payload = inferSuccessToast(method, url);
        if (payload) {
          actions.showPayload(payload);
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [actions]);

  return (
    <>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div
            className={`app-toast app-toast-${toast.action}`}
            key={toast.id}
            role="status"
          >
            <div className="app-toast-icon">
              <ToastIcon action={toast.action} />
            </div>
            <div className="app-toast-copy">
              <strong>{toastTitle(toast.action)}</strong>
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => actions.dismiss(toast.id)}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
