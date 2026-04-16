"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Pencil } from "lucide-react";

import ModalBase from "./ModalBase";

type Props = {
  user: {
    name: string;
    role: string;
    email: string;
    image?: string;
  };
  onClose: () => void;
  onImageSave: (profileImage: string) => Promise<void>;
  onViewDetails: () => void;
  onChangePassword: () => void;
};

export default function ProfileModal({
  user,
  onClose,
  onImageSave,
  onViewDetails,
  onChangePassword,
}: Props) {
  const [profileImage, setProfileImage] = useState(
    user.image || "/images/profile.png",
  );
  const [imageChanged, setImageChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEditClick = () => {
    fileInputRef.current?.click();
  };

  const readSelectedImage = (
    event: React.ChangeEvent<HTMLInputElement>,
    onLoad: (imageUrl: string) => void,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;

      if (typeof result === "string") {
        onLoad(result);
        setImageChanged(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveImage = async () => {
    setIsSaving(true);
    setError("");

    try {
      await onImageSave(profileImage);
      setImageChanged(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update the images.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalBase onClose={onClose} showCloseIcon>
      <div className="profile-modal">
        <div className="profile-avatar-wrapper">
          <Image
            src={profileImage}
            alt="Profile"
            width={120}
            height={120}
            className="profile-avatar"
          />

          <span className="avatar-edit" onClick={handleEditClick}>
            <Pencil size={14} />
          </span>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) =>
              readSelectedImage(event, (imageUrl) => setProfileImage(imageUrl))
            }
          />
        </div>

        {imageChanged && (
          <button
            className="btn-primary save-image-btn"
            onClick={() => void handleSaveImage()}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Images"}
          </button>
        )}

        {error ? <p className="profile-message error">{error}</p> : null}

        <h2 className="profile-name">{user.name}</h2>
        <p className="profile-email">{user.email}</p>
        <span className="profile-role">{user.role}</span>

        <div className="profile-actions">
          <button className="btn-outline" onClick={onViewDetails}>
            View Profile Details
          </button>

          <button className="btn-primary" onClick={onChangePassword}>
            Change Password
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
