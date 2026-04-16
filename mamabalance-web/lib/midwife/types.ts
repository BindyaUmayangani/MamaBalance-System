export type MidwifeObservationEntry = {
  timestamp: string;
  title: string;
  detailedNote: string;
  mood: string;
  sleep: string;
  appetite: string;
  nextObservationDate: string;
  observedBy: string;
};

export type MidwifeMedicationEntry = {
  name: string;
  dosage: string;
  frequency?: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  notes?: string;
  instructions?: string;
  reasonStopped?: string;
};

export type MidwifeMotherRecord = {
  uid: string;
  userId: string;
  username: string;
  name: string;
  risk: "low" | "moderate" | "high";
  upcomingCheckup: string;
  lastStatus: "overdue" | "completed" | "upcoming";
  lastEPDS: string;
  lastEPDSTestDate: string;
  assignedDoctor: string | null;
  assignedDoctorUid: string | null;
  assignedAt: string | null;
  nic: string;
  email: string;
  region: string;
  contact: string;
  birthday: string;
  address: string;
  guardianName: string;
  guardianContact: string;
  deliveryDate: string;
  children: string;
  epdsTrend: number[];
  observations: MidwifeObservationEntry[];
  activeMedications: MidwifeMedicationEntry[];
  medicationHistory: MidwifeMedicationEntry[];
};

export type MidwifeDoctorOption = {
  uid: string;
  name: string;
};
