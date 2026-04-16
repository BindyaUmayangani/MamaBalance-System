"use client";

import { useEffect, useMemo, useState } from "react";

import LoadingState from "@/components/admin/LoadingState";
import "@/app/superadmin/styles/userManagement.css";
import "@/app/styles/RoleSettingsSupport.css";
import type { StaffRole } from "@/lib/auth/types";

type NotificationOption = {
  key: string;
  label: string;
};

type SettingsWorkspaceProps = {
  role: StaffRole;
  heading: string;
  description: string;
  detailLabel: string;
  detailKey: "organization" | "specialization" | "regionName";
  detailReadonly?: boolean;
};

type SettingsResponse = {
  profile: {
    displayName: string;
    loginEmail: string;
    contactEmail: string;
    phoneNumber: string;
    organization: string;
    specialization: string;
    regionName: string;
  };
  notificationPreferences: Record<string, boolean>;
  notificationOptions: NotificationOption[];
};

export default function SettingsWorkspace({
  heading,
  description,
  detailLabel,
  detailKey,
  detailReadonly = false,
}: SettingsWorkspaceProps) {
  const [initialData, setInitialData] = useState<SettingsResponse | null>(null);
  const [formData, setFormData] = useState<SettingsResponse["profile"] | null>(null);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [options, setOptions] = useState<NotificationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    setIsLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      const payload = (await response.json()) as SettingsResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load settings.");
      }

      setInitialData(payload);
      setFormData(payload.profile);
      setPreferences(payload.notificationPreferences || {});
      setOptions(payload.notificationOptions || []);
    } catch (caughtError) {
      setFeedback({
        type: "error",
        text:
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load settings.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!formData) return;

    try {
      setIsSaving(true);
      setFeedback(null);

      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: formData.displayName,
          contactEmail: formData.contactEmail,
          phoneNumber: formData.phoneNumber,
          organization: formData.organization,
          specialization: formData.specialization,
          notificationPreferences: preferences,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save settings.");
      }

      setFeedback({
        type: "success",
        text: "Settings saved successfully.",
      });
      await loadSettings();
    } catch (caughtError) {
      setFeedback({
        type: "error",
        text:
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to save settings.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    if (!initialData) return;

    setFormData(initialData.profile);
    setPreferences(initialData.notificationPreferences);
    setFeedback(null);
  }

  const detailValue = useMemo(() => formData?.[detailKey] || "", [detailKey, formData]);
  const header = (
    <div className="role-header">
      <h1>{heading}</h1>
      <p>{description}</p>
    </div>
  );

  if (isLoading && !formData) {
    return (
      <div className="role-page">
        {header}
        <LoadingState label="Loading settings..." />
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="role-page">
        {header}
        <LoadingState label={feedback?.text || "Unable to load settings."} variant="error" />
      </div>
    );
  }

  return (
    <div className="role-page">
      {header}

      <div className="role-grid settings-grid">
        <section className="role-card">
          <h3>Profile Settings</h3>
          <p className="faq-intro">
            Keep your account details up to date so support, notifications, and internal workflows stay accurate.
          </p>

          <div className="form-grid">
            <div className="role-field">
              <label>Display Name</label>
              <input
                value={formData.displayName}
                onChange={(event) =>
                  setFormData((prev) =>
                    prev ? { ...prev, displayName: event.target.value } : prev,
                  )
                }
              />
            </div>
            <div className="role-field">
              <label>{detailLabel}</label>
              <input
                value={detailValue}
                readOnly={detailReadonly}
                className={detailReadonly ? "readonly-field" : ""}
                onChange={(event) =>
                  setFormData((prev) =>
                    prev ? { ...prev, [detailKey]: event.target.value } : prev,
                  )
                }
              />
            </div>
            <div className="role-field">
              <label>Contact Email</label>
              <input
                value={formData.contactEmail}
                onChange={(event) =>
                  setFormData((prev) =>
                    prev ? { ...prev, contactEmail: event.target.value } : prev,
                  )
                }
              />
            </div>
            <div className="role-field">
              <label>Phone Number</label>
              <input
                value={formData.phoneNumber}
                onChange={(event) =>
                  setFormData((prev) =>
                    prev ? { ...prev, phoneNumber: event.target.value } : prev,
                  )
                }
              />
            </div>
            <div className="role-field wide">
              <label>Login Email</label>
              <input value={formData.loginEmail} readOnly className="readonly-field" />
            </div>
          </div>

          {feedback && <div className={`support-feedback ${feedback.type}`}>{feedback.text}</div>}

          <div className="role-actions">
            <button className="btn-outline" onClick={handleReset} disabled={isSaving}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </section>

        <section className="role-card">
          <h3>Notifications</h3>
          <p className="faq-intro">
            Choose which alerts stay active for your account. These preferences are saved to your profile.
          </p>

          <div className="switch-row">
            {options.map((option) => (
              <label className="switch-item" key={option.key}>
                <span>{option.label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(preferences[option.key])}
                  onChange={(event) =>
                    setPreferences((prev) => ({
                      ...prev,
                      [option.key]: event.target.checked,
                    }))
                  }
                />
              </label>
            ))}
          </div>

          <div className="settings-note">
            Login email is shown for reference only. Contact email, phone number, and notification preferences can be
            updated here.
          </div>
        </section>
      </div>
    </div>
  );
}
