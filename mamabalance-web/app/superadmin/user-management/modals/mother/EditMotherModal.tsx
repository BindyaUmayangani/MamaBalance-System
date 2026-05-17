"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronDown, MessageSquareText, ShieldCheck, UserRound } from "lucide-react";
import { GuardianProvisioning, ManagedMotherRow } from "@/lib/admin/types";

type RegionOption = {
  id: string;
  name: string;
};

type StaffOption = {
  uid: string;
  name: string;
  region: string;
};

type Props = {
  mother: ManagedMotherRow;
  regionOptions: RegionOption[];
  midwifeOptions: StaffOption[];
  doctorOptions: StaffOption[];
  onClose: () => void;
  onSave: (updatedMother: ManagedMotherRow) => void;
};

export default function EditMotherModal({
  mother,
  regionOptions,
  midwifeOptions,
  doctorOptions,
  onClose,
  onSave,
}: Props) {
  const deliveryDateInputRef = useRef<HTMLInputElement | null>(null);
  const birthdateInputRef = useRef<HTMLInputElement | null>(null);
  const [email, setEmail] = useState(mother.personalEmail || "");
  const [guardianName, setGuardianName] = useState(mother.guardianName || "");
  const [contact, setContact] = useState(mother.contact || "");
  const [guardianContact, setGuardianContact] = useState(
    mother.guardianContact || ""
  );
  const [deliveryDate, setDeliveryDate] = useState(mother.deliveryDate || "");
  const [birthdate, setBirthdate] = useState(mother.birthdate || "");
  const [noOfChildren, setNoOfChildren] = useState(
    mother.noOfChildren ? String(mother.noOfChildren) : ""
  );
  const [address, setAddress] = useState(mother.address || "");
  const guardianAccessAlreadyEnabled = Boolean(mother.guardianAccessEnabled);
  const [enableGuardianMobileAccess, setEnableGuardianMobileAccess] = useState(
    guardianAccessAlreadyEnabled,
  );
  const [saving, setSaving] = useState(false);
  const [saveOutcome, setSaveOutcome] = useState<{
    updatedMother: ManagedMotherRow;
    guardianProvisioning?: GuardianProvisioning;
  } | null>(null);

  useEffect(() => {
    if (!saveOutcome) {
      return;
    }

    const timer = window.setTimeout(() => {
      onSave(saveOutcome.updatedMother);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [onSave, saveOutcome]);

  const initialRegionId = useMemo(() => {
    const matched = regionOptions.find(
      (item) => item.name === mother.region || item.id === mother.region
    );
    return matched?.id || "";
  }, [regionOptions, mother.region]);

  const regionId = initialRegionId;

  const selectedRegionName = useMemo(
    () => regionOptions.find((item) => item.id === regionId)?.name || mother.region,
    [mother.region, regionId, regionOptions],
  );

  const availableMidwives = useMemo(
    () => midwifeOptions.filter((midwife) => midwife.region === selectedRegionName),
    [midwifeOptions, selectedRegionName],
  );

  const availableDoctors = useMemo(
    () => doctorOptions.filter((doctor) => doctor.region === selectedRegionName),
    [doctorOptions, selectedRegionName],
  );

  const initialMidwifeUid = useMemo(() => {
    const matched = midwifeOptions.find(
      (item) => item.name === mother.assignedMidwife
    );
    return matched?.uid || "";
  }, [midwifeOptions, mother.assignedMidwife]);

  const initialDoctorUid = useMemo(() => {
    const matched = doctorOptions.find(
      (item) => item.name === mother.assignedDoctor
    );
    return matched?.uid || "";
  }, [doctorOptions, mother.assignedDoctor]);

  const [assignedMidwifeUid, setAssignedMidwifeUid] = useState(initialMidwifeUid);
  const [assignedDoctorUid, setAssignedDoctorUid] = useState(initialDoctorUid);

  function openDatePicker(input: HTMLInputElement | null) {
    if (!input) return;

    input.focus();

    if ("showPicker" in input && typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.click();
  }

  if (saveOutcome) {
    return (
      <div className="modal-container success-popup">
        <div className="success-popup-hero">
          <div className="success-popup-icon">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h2 className="modal-title success-popup-title">Changes saved successfully</h2>
            <p className="success-popup-subtitle">
              {saveOutcome.guardianProvisioning
                ? "The mother record was updated and guardian mobile access is now ready."
                : "The mother record has been updated and synced with the latest care details."}
            </p>
          </div>
        </div>

        <div className="success-summary-card">
          <div className="success-summary-row">
            <span className="success-summary-label">Mother</span>
            <span className="success-summary-value">{saveOutcome.updatedMother.name}</span>
          </div>
          <div className="success-summary-row">
            <span className="success-summary-label">Region</span>
            <span className="success-summary-value">{saveOutcome.updatedMother.region}</span>
          </div>
          <div className="success-summary-row">
            <span className="success-summary-label">Assigned Midwife</span>
            <span className="success-summary-value">{saveOutcome.updatedMother.assignedMidwife}</span>
          </div>
          <div className="success-summary-row">
            <span className="success-summary-label">Assigned Doctor</span>
            <span className="success-summary-value">{saveOutcome.updatedMother.assignedDoctor}</span>
          </div>
        </div>

        {saveOutcome.guardianProvisioning ? (
          <div className="guardian-success-card">
            <div className="guardian-success-header">
              <div className="guardian-success-badge">
                <ShieldCheck size={18} />
                <span>Guardian Mobile Access</span>
              </div>
              <span
                className={`guardian-success-status ${
                  saveOutcome.guardianProvisioning.status === "created"
                    ? "is-created"
                    : "is-linked"
                }`}
              >
                {saveOutcome.guardianProvisioning.status === "created"
                  ? "New access created"
                  : "Existing account linked"}
              </span>
            </div>

            <div className="guardian-success-grid">
              <div className="guardian-success-item">
                <UserRound size={16} />
                <div>
                  <span className="guardian-success-label">Guardian ID</span>
                  <strong>{saveOutcome.guardianProvisioning.userId}</strong>
                </div>
              </div>
              <div className="guardian-success-item">
                <UserRound size={16} />
                <div>
                  <span className="guardian-success-label">Phone</span>
                  <strong>{saveOutcome.guardianProvisioning.phoneNumber}</strong>
                </div>
              </div>
              <div className="guardian-success-item">
                <ShieldCheck size={16} />
                <div>
                  <span className="guardian-success-label">Login</span>
                  <strong>Phone OTP</strong>
                </div>
              </div>
              <div className="guardian-success-item">
                <MessageSquareText size={16} />
                <div>
                  <span className="guardian-success-label">SMS delivery</span>
                  <strong>
                    {saveOutcome.guardianProvisioning.smsDeliveryStatus === "failed"
                      ? "SMS sending failed"
                      : "Onboarding SMS sent"}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="modal-actions">
          <button
            className="btn-primary"
            onClick={() => onSave(saveOutcome.updatedMother)}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-container">
      <h2 className="modal-title">UPDATE MOTHER’S DETAILS</h2>

      <p className="modal-identity-row">
        <strong>Full Name:</strong> {mother.name}
      </p>

      <div className="modal-body-scroll">
      <div className="modal-form-grid">
        <div>
          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label>Guardian Name</label>
          <input
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
          />
        </div>

        <div>
          <label>Contact Number</label>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>

        <div>
          <label>Guardian Contact No</label>
          <input
            value={guardianContact}
            onChange={(e) => setGuardianContact(e.target.value)}
          />
        </div>

        <div className="guardian-access-field">
          <label>Guardian Mobile Access</label>
          <label
            className={`guardian-access-option ${guardianAccessAlreadyEnabled ? "is-enabled" : ""}`}
          >
            <input
              type="checkbox"
              checked={enableGuardianMobileAccess}
              disabled={guardianAccessAlreadyEnabled}
              onChange={(e) => setEnableGuardianMobileAccess(e.target.checked)}
            />
            <span className="guardian-access-copy">
              <strong className="guardian-access-title">
                {guardianAccessAlreadyEnabled
                  ? "Guardian mobile access is already enabled"
                  : "Enable guardian mobile access"}
              </strong>
              <span className="guardian-access-description">
                {guardianAccessAlreadyEnabled
                  ? "This guardian can already sign in to the mobile app with phone OTP."
                  : "Create or link a guardian mobile account using the saved guardian name and contact number."}
              </span>
            </span>
          </label>
        </div>

        <div>
          <label>Assigned Midwife</label>
          <div className="field-control">
            <select
              value={assignedMidwifeUid}
              onChange={(e) => setAssignedMidwifeUid(e.target.value)}
              disabled={!regionId}
            >
              <option value="">
                {regionId ? "Select Midwife" : "No region assigned"}
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
          <label>Assigned Doctor</label>
          <div className="field-control">
            <select
              value={assignedDoctorUid}
              onChange={(e) => setAssignedDoctorUid(e.target.value)}
              disabled={!regionId}
            >
              <option value="">
                {regionId ? "No doctor assigned" : "No region assigned"}
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

        <div>
          <label>Delivery Date</label>
          <div className="field-control">
            <input
              ref={deliveryDateInputRef}
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
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
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
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
            value={noOfChildren}
            onChange={(e) => setNoOfChildren(e.target.value)}
          />
        </div>

        <div>
          <label>Address</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

      </div>
      </div>

      <div className="modal-actions">
        <button className="btn-outline" onClick={onClose} disabled={saving}>
          Cancel
        </button>

        <button
          className="btn-primary"
          disabled={saving}
          onClick={async () => {
            try {
              if (!assignedMidwifeUid) {
                throw new Error("Assigned midwife is required.");
              }

              setSaving(true);

              const res = await fetch("/api/admin/users?type=update", {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  uid: mother.uid,
                  email,
                  contact,
                  guardianName,
                  guardianContact,
                  deliveryDate,
                  birthdate,
                  noOfChildren: Number(noOfChildren || 0),
                  address,
                  assignedMidwifeUid,
                  assignedDoctorUid,
                  enableGuardianMobileAccess,
                }),
              });

              const data = (await res.json()) as {
                error?: string;
                guardianProvisioning?: GuardianProvisioning;
              };

              if (!res.ok) {
                throw new Error(data.error || "Failed to update mother");
              }

              const selectedMidwifeName =
                midwifeOptions.find((item) => item.uid === assignedMidwifeUid)?.name ||
                mother.assignedMidwife;

              const selectedDoctorName =
                doctorOptions.find((item) => item.uid === assignedDoctorUid)?.name ||
                (assignedDoctorUid ? mother.assignedDoctor : "-");

              setSaveOutcome({
                updatedMother: {
                ...mother,
                personalEmail: email,
                contact,
                region: selectedRegionName,
                status: mother.status,
                guardianName,
                guardianContact,
                guardianAccessEnabled:
                  guardianAccessAlreadyEnabled || enableGuardianMobileAccess,
                deliveryDate,
                birthdate,
                noOfChildren: Number(noOfChildren || 0),
                address,
                assignedMidwife: selectedMidwifeName,
                assignedDoctor: assignedDoctorUid ? selectedDoctorName : "-",
                },
                guardianProvisioning: data.guardianProvisioning,
              });
            } catch (error) {
              console.error(error);
              alert(
                error instanceof Error ? error.message : "Failed to update mother"
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
