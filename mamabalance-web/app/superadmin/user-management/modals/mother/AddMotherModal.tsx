"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";

import {
  CreatedCredentials,
  GuardianProvisioning,
  ManagedUserRow,
  MotherCreatePayload,
  RegionOption,
} from "@/lib/admin/types";

type Props = {
  onClose: () => void;
  onCreated: () => Promise<void> | void;
  regionOptions: RegionOption[];
  midwifeOptions: ManagedUserRow[];
  doctorOptions: ManagedUserRow[];
  autoRegion?: string;
  hideRegionField?: boolean;
};

export default function AddMotherModal({
  onClose,
  onCreated,
  regionOptions,
  midwifeOptions,
  doctorOptions,
  autoRegion,
  hideRegionField,
}: Props) {
  const deliveryDateInputRef = useRef<HTMLInputElement | null>(null);
  const birthdateInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedRegion, setSelectedRegion] = useState(autoRegion || "");
  const [selectedMidwife, setSelectedMidwife] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [createdCredentials, setCreatedCredentials] =
    useState<CreatedCredentials | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    address: "",
    nic: "",
    guardianName: "",
    personalEmail: "",
    guardianContact: "",
    phoneNumber: "",
    deliveryDate: "",
    birthdate: "",
    noOfChildren: "1",
  });

  useEffect(() => {
    if (autoRegion) {
      setSelectedRegion(autoRegion);
    }
  }, [autoRegion]);

  const selectedRegionName = useMemo(
    () => regionOptions.find((region) => region.id === selectedRegion)?.name || selectedRegion,
    [regionOptions, selectedRegion],
  );

  const availableMidwives = useMemo(
    () =>
      midwifeOptions.filter(
        (midwife) => !selectedRegionName || midwife.region === selectedRegionName,
      ),
    [midwifeOptions, selectedRegionName],
  );

  const availableDoctors = useMemo(
    () =>
      doctorOptions.filter(
        (doctor) => !selectedRegionName || doctor.region === selectedRegionName,
      ),
    [doctorOptions, selectedRegionName],
  );

  function openDatePicker(input: HTMLInputElement | null) {
    if (!input) return;

    input.focus();

    if ("showPicker" in input && typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.click();
  }

  async function handleSave() {
    setError("");
    setIsSaving(true);

    try {
      if (!selectedMidwife) {
        throw new Error("Assigned midwife is required.");
      }

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "mother",
          fullName: form.fullName,
          personalEmail: form.personalEmail,
          phoneNumber: form.phoneNumber,
          nic: form.nic,
          regionId: selectedRegion,
          address: form.address,
          guardianName: form.guardianName,
          guardianContact: form.guardianContact,
          deliveryDate: form.deliveryDate,
          birthdate: form.birthdate,
          noOfChildren: Number(form.noOfChildren),
          assignedMidwifeUid: selectedMidwife,
          assignedDoctorUid: selectedDoctor,
        } satisfies MotherCreatePayload),
      });

      const payload = (await response.json()) as {
        error?: string;
        credentials?: CreatedCredentials;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to create the mother.");
      }

      await onCreated();
      setCreatedCredentials(payload.credentials || null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create the mother.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (createdCredentials) {
    return (
      <div className="modal-container">
        <h2 className="modal-title">MOTHER CREATED</h2>

        <div className="view-details view-user-modal">
          <div className="detail-row">
            <span className="detail-label">User ID</span>
            <span className="detail-value">{createdCredentials.userId}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Username</span>
            <span className="detail-value">{createdCredentials.username}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Login Email</span>
            <span className="detail-value">{createdCredentials.loginEmail}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Temporary Password</span>
            <span className="detail-value">{createdCredentials.temporaryPassword}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Credentials Email</span>
            <span className="detail-value">{createdCredentials.deliveryEmail}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Delivery Status</span>
            <span className="detail-value">
              {createdCredentials.deliveryQueued ? "Queued for email delivery" : "Created"}
            </span>
          </div>
        </div>

        {createdCredentials.guardianProvisioning ? (
          <GuardianProvisioningCard
            guardian={createdCredentials.guardianProvisioning}
          />
        ) : null}

        <div className="modal-actions">
          <button className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-container">
      <h2 className="modal-title">ADD NEW MOTHER</h2>

      <div className="modal-body-scroll">
        <div className="modal-form-grid">
          <div>
            <label>Full Name</label>
            <input
              value={form.fullName}
              onChange={(event) =>
                setForm((current) => ({ ...current, fullName: event.target.value }))
              }
              placeholder="Enter full name"
            />
          </div>

          <div>
            <label>Address</label>
            <input
              value={form.address}
              onChange={(event) =>
                setForm((current) => ({ ...current, address: event.target.value }))
              }
              placeholder="Enter address"
            />
          </div>

          <div>
            <label>NIC</label>
            <input
              value={form.nic}
              onChange={(event) =>
                setForm((current) => ({ ...current, nic: event.target.value }))
              }
              placeholder="Enter NIC"
            />
          </div>

          <div>
            <label>Guardian Name</label>
            <input
              value={form.guardianName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  guardianName: event.target.value,
                }))
              }
              placeholder="Enter guardian name"
            />
          </div>

          <div>
            <label>Current Email</label>
            <input
              type="email"
              value={form.personalEmail}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  personalEmail: event.target.value,
                }))
              }
              placeholder="Enter current email"
            />
          </div>

          <div>
            <label>Guardian Contact No</label>
            <input
              value={form.guardianContact}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  guardianContact: event.target.value,
                }))
              }
              placeholder="+94 71 234 5678"
            />
          </div>

          <div>
            <label>Contact Number</label>
            <input
              value={form.phoneNumber}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  phoneNumber: event.target.value,
                }))
              }
              placeholder="+94 71 234 5678"
            />
          </div>

          <div>
            <label>Delivery Date</label>
            <div className="field-control">
              <input
                ref={deliveryDateInputRef}
                type="date"
                value={form.deliveryDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    deliveryDate: event.target.value,
                  }))
                }
              />
              <button
                type="button"
                className="field-icon-button"
                onClick={() => openDatePicker(deliveryDateInputRef.current)}
                aria-label="Open delivery date calendar"
              >
                <CalendarDays size={18} className="field-icon" />
              </button>
            </div>
          </div>

          <div>
            <label>Birthdate</label>
            <div className="field-control">
              <input
                ref={birthdateInputRef}
                type="date"
                value={form.birthdate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    birthdate: event.target.value,
                  }))
                }
              />
              <button
                type="button"
                className="field-icon-button"
                onClick={() => openDatePicker(birthdateInputRef.current)}
                aria-label="Open birthdate calendar"
              >
                <CalendarDays size={18} className="field-icon" />
              </button>
            </div>
          </div>

          <div>
            <label>No of Children</label>
            <input
              value={form.noOfChildren}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  noOfChildren: event.target.value,
                }))
              }
              placeholder="Enter number of children"
            />
          </div>

          {!hideRegionField ? (
            <div>
              <label>Region</label>
              <div className="field-control">
                <select
                  value={selectedRegion}
                  onChange={(e) => {
                    setSelectedRegion(e.target.value);
                    setSelectedMidwife("");
                    setSelectedDoctor("");
                  }}
                >
                  <option value="">Select Region</option>
                  {regionOptions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} className="field-icon" />
              </div>
            </div>
          ) : null}

          {hideRegionField && autoRegion ? (
            <input type="hidden" value={autoRegion} />
          ) : null}

          <div>
            <label>Assign Midwife</label>
            <div className="field-control">
              <select
                value={selectedMidwife}
                onChange={(e) => setSelectedMidwife(e.target.value)}
                disabled={!selectedRegion}
                required
              >
                <option value="">
                  {selectedRegion ? "Select Midwife" : "Select region first"}
                </option>
                {availableMidwives.map((midwife) => (
                  <option key={midwife.uid} value={midwife.uid}>
                    {midwife.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} className="field-icon" />
            </div>
          </div>

          <div>
            <label>Assign Doctor</label>
            <div className="field-control">
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                disabled={!selectedRegion}
              >
                <option value="">
                  {selectedRegion ? "Select Doctor" : "Select region first"}
                </option>
                {availableDoctors.map((doctor) => (
                  <option key={doctor.uid} value={doctor.uid}>
                    {doctor.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} className="field-icon" />
            </div>
          </div>

          <div className="form-span-2">
            <div className="field-note">
              Mother credentials are generated automatically after saving and shared through the mother&apos;s current email.
            </div>
          </div>
        </div>
      </div>

      {error ? <p className="form-message error">{error}</p> : null}

      <div className="modal-actions">
        <button className="btn-outline" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

function GuardianProvisioningCard({
  guardian,
}: {
  guardian: GuardianProvisioning;
}) {
  return (
    <>
      <h3 className="modal-title" style={{ fontSize: "1rem", marginTop: "1rem" }}>
        GUARDIAN MOBILE ACCESS
      </h3>
      <div className="view-details view-user-modal">
        <div className="detail-row">
          <span className="detail-label">Status</span>
          <span className="detail-value">
            {guardian.status === "created" ? "Created automatically" : "Linked to existing guardian"}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Guardian ID</span>
          <span className="detail-value">{guardian.userId}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Guardian Name</span>
          <span className="detail-value">{guardian.displayName}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Guardian Phone</span>
          <span className="detail-value">{guardian.phoneNumber}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Login Method</span>
          <span className="detail-value">Phone OTP</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Guardian SMS</span>
          <span className="detail-value">
            {guardian.smsDeliveryStatus === "failed"
              ? "Guardian account created, but onboarding SMS failed"
              : "Onboarding SMS sent"}
          </span>
        </div>
      </div>
    </>
  );
}
