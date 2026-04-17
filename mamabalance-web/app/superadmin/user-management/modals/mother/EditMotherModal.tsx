"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { ManagedMotherRow } from "@/lib/admin/types";

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
  const [status, setStatus] = useState<"active" | "inactive">(
    mother.status === "inactive" ? "inactive" : "active"
  );
  const [saving, setSaving] = useState(false);

  const initialRegionId = useMemo(() => {
    const matched = regionOptions.find(
      (item) => item.name === mother.region || item.id === mother.region
    );
    return matched?.id || "";
  }, [regionOptions, mother.region]);

  const [regionId, setRegionId] = useState(initialRegionId);

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

        <div>
          <label>Region</label>
          <div className="field-control">
            <select
              value={regionId}
              onChange={(e) => {
                setRegionId(e.target.value);
                setAssignedMidwifeUid("");
                setAssignedDoctorUid("");
              }}
            >
              <option value="" disabled>
                Select region
              </option>
              {regionOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown size={18} className="field-icon" />
          </div>
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
                {regionId ? "Select Midwife" : "Select region first"}
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
                {regionId ? "No doctor assigned" : "Select region first"}
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

        <div>
          <label>Status</label>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="status"
                checked={status === "active"}
                onChange={() => setStatus("active")}
              />
              <span className="custom-radio" />
              <span className="radio-text">Active</span>
            </label>

            <label className="radio-option">
              <input
                type="radio"
                name="status"
                checked={status === "inactive"}
                onChange={() => setStatus("inactive")}
              />
              <span className="custom-radio" />
              <span className="radio-text">Inactive</span>
            </label>
          </div>
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
                  regionId,
                  status,
                  guardianName,
                  guardianContact,
                  deliveryDate,
                  birthdate,
                  noOfChildren: Number(noOfChildren || 0),
                  address,
                  assignedMidwifeUid,
                  assignedDoctorUid,
                }),
              });

              const data = await res.json();

              if (!res.ok) {
                throw new Error(data.error || "Failed to update mother");
              }

              const selectedMidwifeName =
                midwifeOptions.find((item) => item.uid === assignedMidwifeUid)?.name ||
                mother.assignedMidwife;

              const selectedDoctorName =
                doctorOptions.find((item) => item.uid === assignedDoctorUid)?.name ||
                (assignedDoctorUid ? mother.assignedDoctor : "-");

              onSave({
                ...mother,
                personalEmail: email,
                contact,
                region: selectedRegionName,
                status,
                guardianName,
                guardianContact,
                deliveryDate,
                birthdate,
                noOfChildren: Number(noOfChildren || 0),
                address,
                assignedMidwife: selectedMidwifeName,
                assignedDoctor: assignedDoctorUid ? selectedDoctorName : "-",
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
