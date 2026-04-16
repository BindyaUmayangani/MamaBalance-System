"use client";

import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import ModalBase from "./ModalBase";

type Props = {
  user: {
    name: string;
    role: string;
    username?: string;
    email: string;
    image?: string;
    phone?: string;
    region?: string;
  };
  onClose: () => void;
  onBack: () => void; // 🔥 go back to Profile
};

export default function ViewProfileDetailsModal({
  user,
  onClose,
  onBack,
}: Props) {
  const showContactNumber =
    user.role === "Doctor" || user.role === "Midwife";

  return (
    <ModalBase onClose={onClose} showCloseIcon>
      <div className="profile-details-modal">
        {/* ================= HEADER ================= */}
        <div className="modal-header">
          <button
            className="modal-back"
            onClick={onBack}
            aria-label="Back to profile"
          >
            <ChevronLeft size={20} />
          </button>

          <h2 className="modal-title">View Details</h2>
        </div>

        {/* ================= AVATAR ================= */}
        <div className="profile-avatar-wrapper">
          <Image
            src={user.image || "/images/profile.png"}
            alt="Profile"
            width={120}
            height={120}
            className="profile-avatar"
          />
        </div>

        <h3 className="profile-name">{user.name}</h3>
        <span className="profile-role">{user.role}</span>

        {/* ================= DETAILS ================= */}
        <div className="profile-details">
          {user.username && (
            <div>
              <label>Username</label>
              <p>{user.username}</p>
            </div>
          )}

          <div>
            <label>Email Address</label>
            <p>{user.email}</p>
          </div>

          {user.region && (
            <div>
              <label>Region</label>
              <p>{user.region}</p>
            </div>
          )}

          {showContactNumber && user.phone && (
            <div>
              <label>Contact Number</label>
              <p>{user.phone}</p>
            </div>
          )}
        </div>
      </div>
    </ModalBase>
  );
}
