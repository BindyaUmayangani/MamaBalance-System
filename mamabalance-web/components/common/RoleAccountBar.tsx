import UserDropdown from "./UserDropdown";

type Props = {
  user: {
    name: string;
    role: string;
    region?: string;
  };
};

export default function RoleAccountBar({ user }: Props) {
  const displayName = user.name.trim() || user.role;

  return (
    <div className="role-account-bar">
      <div className="role-account-context" aria-label="Current workspace">
        <div className="role-account-copy">
          <strong>Welcome back, {displayName}</strong>
          <span>{user.role} workspace for MamaBalance care operations</span>
        </div>
        <span className="role-account-chip">Active session</span>
      </div>
      <UserDropdown user={user} variant="topbar" />
    </div>
  );
}
