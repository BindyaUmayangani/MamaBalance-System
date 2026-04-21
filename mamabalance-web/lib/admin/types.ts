export type ManagedRole = "regionaladmin" | "doctor" | "midwife" | "mother";

export type StatusValue = "active" | "inactive";

export type RegionOption = {
  id: string;
  name: string;
};

export type ManagedUserRow = {
  uid: string;
  userId: string;
  name: string;
  username: string;
  email: string;
  personalEmail?: string;
  nic: string;
  region: string;
  contact: string;
  createdOn: string;
  status: StatusValue;
  role: ManagedRole;
};

export type ManagedMotherRow = ManagedUserRow & {
  role: "mother";
  riskStatus: string;
  assignedMidwife: string;
  assignedDoctor: string;
  lastEpdScore: number;
  lastEpdTestDate: string;
  age: string;
  birthdate: string;
  address: string;
  guardianName: string;
  guardianContact: string;
  guardianAccessEnabled?: boolean;
  deliveryDate: string;
  noOfChildren: number;
};

export type StaffCreatePayload = {
  role: Exclude<ManagedRole, "mother">;
  fullName: string;
  personalEmail: string;
  nic: string;
  contactNumber: string;
  regionId: string;
};

export type MotherCreatePayload = {
  role: "mother";
  fullName: string;
  personalEmail: string;
  phoneNumber: string;
  nic: string;
  regionId: string;
  address: string;
  guardianName: string;
  guardianContact: string;
  deliveryDate: string;
  birthdate: string;
  noOfChildren: number;
  assignedMidwifeUid: string;
  assignedDoctorUid: string;
};

export type CreatedCredentials = {
  userId: string;
  username: string;
  loginEmail: string;
  temporaryPassword: string;
  deliveryEmail: string;
  deliveryQueued: boolean;
  guardianProvisioning?: GuardianProvisioning;
};

export type GuardianProvisioning = {
  uid: string;
  userId: string;
  displayName: string;
  phoneNumber: string;
  status: "created" | "linked";
  loginMethod: "phone_otp";
  smsDeliveryStatus?: "sent" | "failed";
};
