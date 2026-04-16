"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { signOut } from "firebase/auth";

import ProfileModal from "./modals/ProfileModal";
import ViewProfileDetailsModal from "./modals/ViewProfileDetailsModal";
import ChangePasswordModal from "./modals/ChangePasswordModal";
import LogoutModal from "./modals/LogoutModal";
import { firebaseAuth } from "@/lib/firebase/client";

type UserType = {
  name: string;
  role: string;
  username?: string;
  email: string;
  image?: string;
  region?: string;
  phone?: string;
};

type Props = {
  user?: Partial<UserType>;
};

type SessionUserResponse = {
  user?: {
    displayName: string | null;
    role: string;
    username?: string | null;
    email: string | null;
    personalEmail?: string | null;
    profileImage?: string | null;
    regionName?: string | null;
    phoneNumber?: string | null;
  } | null;
};

function formatRoleLabel(role: string | undefined) {
  switch (role) {
    case "superadmin":
      return "Super Admin";
    case "regionaladmin":
      return "Regional Admin";
    case "doctor":
      return "Doctor";
    case "midwife":
      return "Midwife";
    default:
      return role || "";
  }
}

export default function UserDropdown({ user: fallbackUser }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeModal, setActiveModal] = useState<
    "profile" | "details" | "password" | "logout" | null
  >(null);
  const [user, setUser] = useState<UserType>({
    name: fallbackUser?.name || "MamaBalance User",
    role: fallbackUser?.role || "",
    username: fallbackUser?.username,
    email: fallbackUser?.email || "",
    region: fallbackUser?.region,
    phone: fallbackUser?.phone,
    image: fallbackUser?.image || "/images/profile.png",
  });

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const payload = (await response.json()) as SessionUserResponse;

        if (!response.ok || !payload.user) {
          return;
        }

        setUser({
          name:
            payload.user.displayName ||
            fallbackUser?.name ||
            "MamaBalance User",
          role: formatRoleLabel(payload.user.role),
          username:
            payload.user.username || fallbackUser?.username || undefined,
          email:
            payload.user.personalEmail ||
            payload.user.email ||
            fallbackUser?.email ||
            "",
          region:
            payload.user.regionName || fallbackUser?.region || undefined,
          phone:
            payload.user.phoneNumber || fallbackUser?.phone || undefined,
          image:
            payload.user.profileImage ||
            fallbackUser?.image ||
            "/images/profile.png",
        });
      } catch {
        // Keep fallback data if the profile fetch fails.
      }
    }

    void loadUser();
  }, [fallbackUser]);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await signOut(firebaseAuth);
      router.replace("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
      setActiveModal(null);
    }
  }

  async function handleProfileImagesSave(profileImage: string) {
    const response = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ profileImage }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || "Unable to update the profile.");
    }

    setUser((prev) => ({
      ...prev,
      image: profileImage,
    }));
  }

  return (
    <>
      <div className="user-dropdown-wrapper" ref={ref}>
        <div className="sidebar-user" onClick={() => setOpen(!open)}>
          {user.image ? (
            <Image
              src={user.image}
              className="user-avatar-img"
              alt="User"
              width={44}
              height={44}
            />
          ) : (
            <div className="user-avatar-fallback">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="user-info">
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </div>
        </div>

        {open && (
          <div className="user-dropdown">
            <button
              onClick={() => {
                setActiveModal("profile");
                setOpen(false);
              }}
            >
              <User size={16} />
              Profile
            </button>

            <button
              className="logout"
              onClick={() => {
                setActiveModal("logout");
                setOpen(false);
              }}
            >
              <LogOut size={16} />
              Log Out
            </button>
          </div>
        )}
      </div>

      {activeModal === "profile" && (
        <ProfileModal
          user={user}
          onClose={() => setActiveModal(null)}
          onImageSave={handleProfileImagesSave}
          onViewDetails={() => setActiveModal("details")}
          onChangePassword={() => setActiveModal("password")}
        />
      )}

      {activeModal === "details" && (
        <ViewProfileDetailsModal
          user={user}
          onClose={() => setActiveModal(null)}
          onBack={() => setActiveModal("profile")}
        />
      )}

      {activeModal === "password" && (
        <ChangePasswordModal
          onClose={() => setActiveModal(null)}
          onBack={() => setActiveModal("profile")}
        />
      )}

      {activeModal === "logout" && (
        <LogoutModal
          isSubmitting={isLoggingOut}
          onClose={() => setActiveModal(null)}
          onConfirm={() => void handleLogout()}
        />
      )}
    </>
  );
}
