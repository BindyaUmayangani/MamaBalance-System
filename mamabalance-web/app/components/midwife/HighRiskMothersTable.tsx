"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, FileText, Search, ChevronDown, FileDown } from "lucide-react";

import "@/app/doctor/styles/AssignedMothers.css";
import "@/app/midwife/styles/HighRiskMothers.css";
import Pagination from "@/app/superadmin/components/Pagination";
import LoadingState from "@/components/admin/LoadingState";
import { useMidwifeMothers } from "@/app/components/midwife/useMidwifeMothers";
import { generatePatientSummaryPdf, type PatientSummaryResponse } from "@/lib/doctor/patientSummaryPdf";
import "@/app/superadmin/styles/userManagement.css";

type HighRiskMother = {
  uid: string;
  userId: string;
  username: string;
  name: string;
  risk: "high";
  upcomingCheckup: string;
  lastStatus: "overdue" | "completed" | "upcoming";
  lastEPDS: string;
  lastEPDSTestDate: string;
  assignedDoctor: string | null;
  assignedDoctorUid?: string | null;
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
  observations: {
    id?: string;
    timestamp: string;
    title: string;
    detailedNote: string;
    mood: string;
    sleep: string;
    appetite: string;
    nextObservationDate: string;
    observedBy: string;
    source?: "doctor" | "homeVisit" | "clinicVisit";
  }[];
  activeMedications: {
    id?: string;
    name: string;
    dosage: string;
    frequency?: string;
    startDate: string;
    endDate?: string;
    prescribedBy: string;
    status?: "Active" | "Completed" | "Stopped";
    notes?: string;
    instructions?: string;
  }[];
  medicationHistory: {
    id?: string;
    name: string;
    dosage: string;
    frequency?: string;
    startDate: string;
    endDate?: string;
    prescribedBy: string;
    status?: "Active" | "Completed" | "Stopped";
    notes?: string;
    instructions?: string;
    reasonStopped?: string;
  }[];
};

type MidwifeObservationApiRecord = {
  id: string;
  source: "doctor" | "homeVisit" | "clinicVisit";
  motherUid: string;
  timestamp: string;
  title: string;
  note: string;
  mood: string;
  sleep: string;
  appetite: string;
  upcomingCheckup: string;
  observedBy: string;
};

type MidwifeMedicationApiRecord = {
  id: string;
  motherUid: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string;
  prescribedBy: string;
  status: "Active" | "Completed" | "Stopped";
  notes: string;
  instructions: string;
  reasonStopped?: string;
};

const AVAILABLE_DOCTORS = [
  "Dr. Nipuni Harshika",
  "Dr. Shehan Perera",
  "Dr. Nadeeja Rathnayake",
  "Dr. Kavisha Fernando",
];

const INITIAL_HIGH_RISK_MOTHERS: HighRiskMother[] = [
  {
    userId: "MO002",
    username: "dinali02",
    name: "Dinali Silva",
    risk: "high",
    upcomingCheckup: "2026-04-10 11:30 AM",
    lastStatus: "overdue",
    lastEPDS: "19",
    lastEPDSTestDate: "2026-04-04",
    assignedDoctor: "Dr. Nipuni Harshika",
    assignedAt: "2026-04-05 10:00 AM",
    nic: "200045337922",
    email: "dinali@gmail.com",
    region: "Kaduwela",
    contact: "0764455667",
    birthday: "2000-08-11",
    address: "44 Temple Road, Kaduwela",
    guardianName: "Madhavi Silva",
    guardianContact: "0763344556",
    deliveryDate: "2026-01-26",
    children: "1",
    epdsTrend: [20, 20, 19, 19],
    observations: [
      {
        timestamp: "2026-04-06 11:00 AM",
        title: "High-Risk Home Monitoring",
        detailedNote: "Persistent stress observed and urgent doctor review was already advised.",
        mood: "Anxious",
        sleep: "Poor",
        appetite: "Reduced",
        nextObservationDate: "2026-04-09 11:00 AM",
        observedBy: "Midwife Nadeesha Silva",
      },
    ],
    activeMedications: [
      {
        name: "Fluoxetine",
        dosage: "10",
        frequency: "Daily morning",
        startDate: "2026-04-01",
        endDate: "2026-05-01",
        prescribedBy: "Dr. Nipuni Harshika",
        notes: "High-risk case with close doctor follow-up.",
        instructions: "Take at the same time every morning.",
      },
      {
        name: "Clonazepam",
        dosage: "5",
        frequency: "Night time",
        startDate: "2026-04-03",
        endDate: "2026-04-24",
        prescribedBy: "Dr. Nipuni Harshika",
        notes: "Short-term support for sleep disturbance.",
        instructions: "Use at night only as prescribed.",
      },
    ],
    medicationHistory: [
      {
        name: "Lorazepam",
        dosage: "1",
        startDate: "2026-03-02",
        endDate: "2026-03-18",
        prescribedBy: "Dr. Nipuni Harshika",
        reasonStopped: "Short-term anxiety support completed.",
      },
    ],
  },
  {
    userId: "MO004",
    username: "tharushi04",
    name: "Tharushi Nimal",
    risk: "high",
    upcomingCheckup: "2026-04-09 02:30 PM",
    lastStatus: "upcoming",
    lastEPDS: "21",
    lastEPDSTestDate: "2026-04-06",
    assignedDoctor: "Dr. Shehan Perera",
    assignedAt: "2026-04-06 09:45 AM",
    nic: "200345337944",
    email: "tharushi@gmail.com",
    region: "Kaduwela",
    contact: "0703344556",
    birthday: "2003-06-18",
    address: "87 Station Road, Kaduwela",
    guardianName: "Kasun Nimal",
    guardianContact: "0706677889",
    deliveryDate: "2026-01-30",
    children: "2",
    epdsTrend: [22, 21, 21, 20],
    observations: [
      {
        timestamp: "2026-04-07 02:00 PM",
        title: "Clinic Support Review",
        detailedNote: "Mother reported better family support but anxiety remains moderate.",
        mood: "Anxious",
        sleep: "Moderate",
        appetite: "Reduced",
        nextObservationDate: "2026-04-14 02:00 PM",
        observedBy: "Midwife Nadeesha Silva",
      },
    ],
    activeMedications: [
      {
        name: "Sertraline",
        dosage: "25",
        frequency: "Daily morning",
        startDate: "2026-03-22",
        endDate: "2026-04-22",
        prescribedBy: "Dr. Shehan Perera",
        notes: "Monitor routine response after clinic review.",
        instructions: "Take after breakfast each day.",
      },
    ],
    medicationHistory: [],
  },
  {
    userId: "MO006",
    username: "anudi06",
    name: "Anudi Ekanayake",
    risk: "high",
    upcomingCheckup: "2026-04-12 09:00 AM",
    lastStatus: "upcoming",
    lastEPDS: "18",
    lastEPDSTestDate: "2026-04-07",
    assignedDoctor: null,
    assignedAt: null,
    nic: "200845337906",
    email: "anudi@gmail.com",
    region: "Homagama",
    contact: "0714455778",
    birthday: "2002-04-20",
    address: "67 River View, Homagama",
    guardianName: "Lasitha Ekanayake",
    guardianContact: "0718899003",
    deliveryDate: "2026-02-05",
    children: "1",
    epdsTrend: [19, 19, 18, 18],
    observations: [
      {
        timestamp: "2026-04-08 08:20 AM",
        title: "High-Risk Review Visit",
        detailedNote: "Mother remains anxious but continues follow-up plan well.",
        mood: "Anxious",
        sleep: "Moderate",
        appetite: "Good",
        nextObservationDate: "2026-04-15 08:20 AM",
        observedBy: "Midwife Nadeesha Silva",
      },
    ],
    activeMedications: [],
    medicationHistory: [],
  },
  {
    userId: "MO008",
    username: "kavindi08",
    name: "Kavindi Perera",
    risk: "high",
    upcomingCheckup: "2026-04-13 10:00 AM",
    lastStatus: "upcoming",
    lastEPDS: "20",
    lastEPDSTestDate: "2026-04-08",
    assignedDoctor: "Dr. Nadeeja Rathnayake",
    assignedAt: "2026-04-08 11:20 AM",
    nic: "200945337908",
    email: "kavindi@gmail.com",
    region: "Kaduwela",
    contact: "0712233998",
    birthday: "2001-09-14",
    address: "10 Temple Road, Kaduwela",
    guardianName: "Ruwani Perera",
    guardianContact: "0713004455",
    deliveryDate: "2026-02-02",
    children: "1",
    epdsTrend: [21, 20, 20, 19],
    observations: [
      {
        timestamp: "2026-04-08 10:00 AM",
        title: "Medication Response Follow-up",
        detailedNote: "Observed mild improvement with continued doctor-supervised treatment.",
        mood: "Anxious",
        sleep: "Moderate",
        appetite: "Reduced",
        nextObservationDate: "2026-04-15 10:00 AM",
        observedBy: "Midwife Nadeesha Silva",
      },
    ],
    activeMedications: [
      {
        name: "Escitalopram",
        dosage: "10",
        frequency: "Daily morning",
        startDate: "2026-04-04",
        endDate: "2026-05-04",
        prescribedBy: "Dr. Nadeeja Rathnayake",
        notes: "Maintain close observation of mood and rest.",
        instructions: "Take after breakfast every day.",
      },
    ],
    medicationHistory: [],
  },
  {
    userId: "MO009",
    username: "sachini09",
    name: "Sachini Fernando",
    risk: "high",
    upcomingCheckup: "2026-04-14 12:30 PM",
    lastStatus: "overdue",
    lastEPDS: "22",
    lastEPDSTestDate: "2026-04-08",
    assignedDoctor: null,
    assignedAt: null,
    nic: "201045337909",
    email: "sachini.f@gmail.com",
    region: "Kaduwela",
    contact: "0709988771",
    birthday: "2000-11-10",
    address: "34 Main Street, Kaduwela",
    guardianName: "Chamari Fernando",
    guardianContact: "0703344221",
    deliveryDate: "2026-01-18",
    children: "1",
    epdsTrend: [23, 22, 22, 21],
    observations: [
      {
        timestamp: "2026-04-08 12:00 PM",
        title: "Urgent High-Risk Check",
        detailedNote: "Persistent low mood and appetite concerns were escalated for doctor review.",
        mood: "Depressed",
        sleep: "Poor",
        appetite: "Reduced",
        nextObservationDate: "2026-04-10 12:00 PM",
        observedBy: "Midwife Nadeesha Silva",
      },
    ],
    activeMedications: [],
    medicationHistory: [],
  },
  {
    userId: "MO010",
    username: "tharanga10",
    name: "Tharanga Silva",
    risk: "high",
    upcomingCheckup: "2026-04-15 09:45 AM",
    lastStatus: "completed",
    lastEPDS: "18",
    lastEPDSTestDate: "2026-04-09",
    assignedDoctor: "Dr. Kavisha Fernando",
    assignedAt: "2026-04-09 08:55 AM",
    nic: "201145337910",
    email: "tharanga.s@gmail.com",
    region: "Homagama",
    contact: "0717766554",
    birthday: "2001-12-02",
    address: "16 Lake View, Homagama",
    guardianName: "Nirmala Silva",
    guardianContact: "0712244880",
    deliveryDate: "2026-02-11",
    children: "2",
    epdsTrend: [19, 18, 18, 17],
    observations: [
      {
        timestamp: "2026-04-09 09:30 AM",
        title: "Recovery Follow-up",
        detailedNote: "Mood is stabilizing after recent interventions and continued monitoring was advised.",
        mood: "Normal",
        sleep: "Moderate",
        appetite: "Good",
        nextObservationDate: "2026-04-16 09:30 AM",
        observedBy: "Midwife Nadeesha Silva",
      },
    ],
    activeMedications: [
      {
        name: "Sertraline",
        dosage: "25",
        frequency: "Daily morning",
        startDate: "2026-04-01",
        endDate: "2026-05-01",
        prescribedBy: "Dr. Kavisha Fernando",
        notes: "Observe weekly emotional stabilization.",
        instructions: "Take each morning with food.",
      },
    ],
    medicationHistory: [],
  },
  {
    userId: "MO011",
    username: "nethmi11",
    name: "Nethmi Karunaratne",
    risk: "high",
    upcomingCheckup: "2026-04-16 11:15 AM",
    lastStatus: "upcoming",
    lastEPDS: "19",
    lastEPDSTestDate: "2026-04-09",
    assignedDoctor: null,
    assignedAt: null,
    nic: "201245337911",
    email: "nethmi@gmail.com",
    region: "Homagama",
    contact: "0711122990",
    birthday: "2002-02-08",
    address: "88 Hill Road, Homagama",
    guardianName: "Sajini Karunaratne",
    guardianContact: "0715511220",
    deliveryDate: "2026-02-24",
    children: "1",
    epdsTrend: [20, 20, 19, 19],
    observations: [
      {
        timestamp: "2026-04-09 11:15 AM",
        title: "Initial High-Risk Review",
        detailedNote: "Newly identified high-risk case and regular follow-up plan was discussed.",
        mood: "Anxious",
        sleep: "Moderate",
        appetite: "Reduced",
        nextObservationDate: "2026-04-16 11:15 AM",
        observedBy: "Midwife Nadeesha Silva",
      },
    ],
    activeMedications: [],
    medicationHistory: [],
  },
];

void AVAILABLE_DOCTORS;
void INITIAL_HIGH_RISK_MOTHERS;

export default function HighRiskMothersTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    mothers,
    doctors,
    isLoading,
    error,
    assignDoctor,
  } = useMidwifeMothers("high-risk");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [selectedMother, setSelectedMother] = useState<HighRiskMother | null>(null);
  const [selectedObservationMother, setSelectedObservationMother] = useState<HighRiskMother | null>(null);
  const [observationPage, setObservationPage] = useState(1);
  const [observationFilter, setObservationFilter] = useState("all");
  const [activeMedicationPage, setActiveMedicationPage] = useState(1);
  const [medicationHistoryPage, setMedicationHistoryPage] = useState(1);
  const [liveObservations, setLiveObservations] = useState<MidwifeObservationApiRecord[]>([]);
  const [liveMedications, setLiveMedications] = useState<MidwifeMedicationApiRecord[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState("");
  const [downloadingMotherUid, setDownloadingMotherUid] = useState("");

  const [editingMotherId, setEditingMotherId] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [localHighlightedMotherId, setLocalHighlightedMotherId] = useState("");
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const pageSize = 6;
  const highlightedMotherId = searchParams.get("highlight") || "";
  const activeHighlightedMotherId = localHighlightedMotherId || highlightedMotherId;

  function matchesHighlightedMother(mother: HighRiskMother, highlight: string) {
    if (!highlight) {
      return false;
    }

    return mother.uid === highlight || mother.userId === highlight;
  }

  useEffect(() => {
    let isMounted = true;

    async function loadModalDetails() {
      setDetailsLoading(true);
      setDetailsError("");

      try {
        const [observationsResponse, medicationsResponse] = await Promise.all([
          fetch("/api/midwife/observations", { cache: "no-store" }),
          fetch("/api/midwife/medications", { cache: "no-store" }),
        ]);
        const [observationsPayload, medicationsPayload] = await Promise.all([
          observationsResponse.json() as Promise<{
            observations?: MidwifeObservationApiRecord[];
            error?: string;
          }>,
          medicationsResponse.json() as Promise<{
            medications?: MidwifeMedicationApiRecord[];
            error?: string;
          }>,
        ]);

        if (!observationsResponse.ok) {
          throw new Error(observationsPayload.error || "Unable to load observations.");
        }

        if (!medicationsResponse.ok) {
          throw new Error(medicationsPayload.error || "Unable to load medications.");
        }

        if (isMounted) {
          setLiveObservations(observationsPayload.observations || []);
          setLiveMedications(medicationsPayload.medications || []);
        }
      } catch (caughtError) {
        if (isMounted) {
          setLiveObservations([]);
          setLiveMedications([]);
          setDetailsError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load care details.",
          );
        }
      } finally {
        if (isMounted) {
          setDetailsLoading(false);
        }
      }
    }

    void loadModalDetails();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const modalLayer = document.createElement("div");
    modalLayer.setAttribute("id", "midwife-high-risk-modal-root");
    Object.assign(modalLayer.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483646",
      pointerEvents: "none",
    });
    document.body.appendChild(modalLayer);
    setPortalRoot(modalLayer);

    return () => {
      modalLayer.remove();
    };
  }, []);

  useEffect(() => {
    const shouldLockScroll = Boolean(selectedMother || selectedObservationMother);

    if (!shouldLockScroll) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [selectedMother, selectedObservationMother]);

  const mothersWithLiveDetails = useMemo<HighRiskMother[]>(() => {
    return mothers.map((mother) => {
      const observations = liveObservations
        .filter((entry) => entry.motherUid === mother.uid)
        .map((entry) => ({
          id: entry.id,
          timestamp: entry.timestamp,
          title: entry.title,
          detailedNote: entry.note,
          mood: entry.mood,
          sleep: entry.sleep,
          appetite: entry.appetite,
          nextObservationDate: entry.upcomingCheckup,
          observedBy: entry.observedBy,
          source: entry.source,
        }));
      const medications = liveMedications.filter((entry) => entry.motherUid === mother.uid);
      const mapMedication = (entry: MidwifeMedicationApiRecord) => ({
        id: entry.id,
        name: entry.medicationName,
        dosage: entry.dosage,
        frequency: entry.frequency,
        startDate: entry.startDate,
        endDate: entry.endDate,
        prescribedBy: entry.prescribedBy,
        status: entry.status,
        notes: entry.notes,
        instructions: entry.instructions,
        reasonStopped: entry.reasonStopped,
      });

      return {
        ...mother,
        observations,
        activeMedications: medications.filter((entry) => entry.status === "Active").map(mapMedication),
        medicationHistory: medications.filter((entry) => entry.status !== "Active").map(mapMedication),
      };
    });
  }, [liveMedications, liveObservations, mothers]);

  const filteredData = useMemo(() => {
    const search = searchTerm.toLowerCase();

    return mothersWithLiveDetails
      .filter(
        (mother) =>
          mother.name.toLowerCase().includes(search) ||
          mother.username.toLowerCase().includes(search) ||
          mother.userId.toLowerCase().includes(search),
      )
      .filter((mother) => (statusFilter ? mother.lastStatus === statusFilter : true))
      .filter((mother) => {
        if (!doctorFilter) return true;
        if (doctorFilter === "assigned") return !!mother.assignedDoctor;
        if (doctorFilter === "unassigned") return !mother.assignedDoctor;
        return mother.assignedDoctorUid === doctorFilter;
      });
  }, [doctorFilter, mothersWithLiveDetails, searchTerm, statusFilter]);

  const totalItems = filteredData.length;
  const hasActiveSearchOrFilter =
    searchTerm.trim().length > 0 ||
    statusFilter.trim().length > 0 ||
    doctorFilter.trim().length > 0;
  const highlightedIndex = filteredData.findIndex((mother) =>
    matchesHighlightedMother(mother, activeHighlightedMotherId),
  );
  const highlightedPage =
    highlightedIndex >= 0 ? Math.floor(highlightedIndex / pageSize) + 1 : null;
  const effectiveCurrentPage = highlightedPage ?? currentPage;

  useEffect(() => {
    if (!highlightedMotherId) {
      return;
    }

    const scrollTimeoutId = window.setTimeout(() => {
      const row = document.querySelector(
        `[data-highlight-keys~="${highlightedMotherId}"]`,
      );
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);

    const clearTimeoutId = window.setTimeout(() => {
      setLocalHighlightedMotherId("");
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("highlight");
      window.history.replaceState({}, "", nextUrl.toString());
    }, 10000);

    return () => {
      window.clearTimeout(scrollTimeoutId);
      window.clearTimeout(clearTimeoutId);
    };
  }, [effectiveCurrentPage, highlightedMotherId]);

  function triggerRowHighlight(highlightKey: string) {
    setLocalHighlightedMotherId(highlightKey);

    window.setTimeout(() => {
      setLocalHighlightedMotherId((current) =>
        current === highlightKey ? "" : current,
      );
    }, 10000);
  }

  async function downloadPatientSummary(mother: HighRiskMother) {
    setDownloadingMotherUid(mother.uid);
    try {
      const response = await fetch(`/api/midwife/mothers/${encodeURIComponent(mother.uid)}/summary`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as PatientSummaryResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to generate patient summary report.");
      }
      generatePatientSummaryPdf(payload);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to generate patient summary report.");
    } finally {
      setDownloadingMotherUid("");
    }
  }

  const paginatedData = filteredData.slice(
    (effectiveCurrentPage - 1) * pageSize,
    effectiveCurrentPage * pageSize,
  );

  const doctorOptions = useMemo(() => {
    return doctors;
  }, [doctors]);

  const observationItemsPerPage = 3;
  const medicationItemsPerPage = 1;
  const selectedProfileDetails = selectedMother
    ? mothersWithLiveDetails.find(
        (mother) =>
          mother.uid === selectedMother.uid || mother.userId === selectedMother.userId,
      ) ?? selectedMother
    : null;
  const selectedObservationDetails = selectedObservationMother
    ? mothersWithLiveDetails.find(
        (mother) =>
          mother.uid === selectedObservationMother.uid ||
          mother.userId === selectedObservationMother.userId,
      ) ?? selectedObservationMother
    : null;

  function getObservationSource(entry: HighRiskMother["observations"][number]) {
    if (entry.source) {
      return entry.source;
    }

    const searchableText = `${entry.title} ${entry.observedBy}`.toLowerCase();

    if (searchableText.includes("doctor") || searchableText.includes("dr.")) {
      return "doctor";
    }

    if (searchableText.includes("clinic")) {
      return "clinicVisit";
    }

    return "homeVisit";
  }

  const filteredObservationEntries = selectedObservationDetails
    ? selectedObservationDetails.observations.filter((entry) =>
        observationFilter === "all" ? true : getObservationSource(entry) === observationFilter,
      )
    : [];

  const selectedObservationEntries = selectedObservationDetails
    ? filteredObservationEntries.slice(
        (observationPage - 1) * observationItemsPerPage,
        observationPage * observationItemsPerPage,
      )
    : [];

  const selectedActiveMedications = selectedObservationDetails
    ? selectedObservationDetails.activeMedications.slice(
        (activeMedicationPage - 1) * medicationItemsPerPage,
        activeMedicationPage * medicationItemsPerPage,
      )
    : [];

  const selectedMedicationHistory = selectedObservationDetails
    ? selectedObservationDetails.medicationHistory.slice(
        (medicationHistoryPage - 1) * medicationItemsPerPage,
        medicationHistoryPage * medicationItemsPerPage,
      )
    : [];

  const observationTotalPages = selectedObservationDetails
    ? Math.max(1, Math.ceil(filteredObservationEntries.length / observationItemsPerPage))
    : 1;

  const activeMedicationTotalPages = selectedObservationDetails
    ? Math.max(1, Math.ceil(selectedObservationDetails.activeMedications.length / medicationItemsPerPage))
    : 1;

  const medicationHistoryTotalPages = selectedObservationDetails
    ? Math.max(1, Math.ceil(selectedObservationDetails.medicationHistory.length / medicationItemsPerPage))
    : 1;

  const getRiskLabel = (risk: string) => `${risk.charAt(0).toUpperCase()}${risk.slice(1)}`;
  const formatDosage = (value: string) => value.replace(/mg/gi, "").trim();
  const chartPoints = selectedProfileDetails
    ? selectedProfileDetails.epdsTrend.map((value, index) => ({
        x: 48 + index * 84,
        y: 210 - value * 6,
        value,
      }))
    : [];

  const handleOpenAssignModal = (mother: HighRiskMother) => {
    setEditingMotherId(mother.uid);
    setSelectedDoctor(mother.assignedDoctorUid ?? "");
    setAssignmentError("");
  };

  const handleSaveDoctor = async () => {
    if (!editingMotherId || !selectedDoctor) return;

    try {
      setIsSavingAssignment(true);
      setAssignmentError("");
      await assignDoctor(editingMotherId, selectedDoctor);
      setEditingMotherId(null);
      setSelectedDoctor("");
    } catch (caughtError) {
      setAssignmentError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to assign doctor.",
      );
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const editingMother = mothers.find((mother) => mother.uid === editingMotherId) ?? null;

  return (
    <div className="assigned-page">
      <div className="role-header">
        <h1>High Risk Mothers</h1>
        <p>
          Monitor high-risk mothers, check follow-up status, and manage doctor
          assignments.
        </p>
      </div>

      <div className="filter-row midwife-assigned-filter-row">
        <div className="search-box midwife-table-search">
          <Search size={18} />
          <input
            placeholder="Search high-risk mothers by ID, username, or name"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="filter-row-actions midwife-filter-row-actions">
          <div className="filter-select-wrap midwife-filter-select-wrap">
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Last Checkup Status: All</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
              <option value="upcoming">Upcoming</option>
            </select>
            <span className="filter-select-icon">
              <ChevronDown size={18} />
            </span>
          </div>

          <div className="filter-select-wrap midwife-filter-select-wrap">
            <select
              value={doctorFilter}
              onChange={(event) => {
                setDoctorFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Doctor Assignment: All</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
              {doctorOptions.map((doctor) => (
                <option key={doctor.uid} value={doctor.uid}>
                  {doctor.name}
                </option>
              ))}
            </select>
            <span className="filter-select-icon">
              <ChevronDown size={18} />
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading high-risk mothers..." />
      ) : error ? (
        <LoadingState label={error} variant="error" />
      ) : (
        <>
          <div className="table-card">
            {paginatedData.length === 0 ? (
              <div className="doctor-empty-state">
                <div className="doctor-empty-state-icon" aria-hidden="true">
                  <Search size={26} strokeWidth={2.2} />
                </div>
                <h3>
                  {hasActiveSearchOrFilter
                    ? "No matching high-risk mothers found"
                    : "No high-risk mothers found"}
                </h3>
                <p>
                  {hasActiveSearchOrFilter
                    ? "Try a different name, ID, username, or clear the current filters."
                    : "High-risk mothers will appear here once they require closer follow-up."}
                </p>
                <div className="doctor-empty-state-tips">
                  {hasActiveSearchOrFilter ? (
                    <>
                      <span>Check spelling</span>
                      <span>Try fewer keywords</span>
                      <span>Clear filters</span>
                    </>
                  ) : (
                    <>
                      <span>High-risk care review</span>
                      <span>Doctor assignment</span>
                      <span>Latest EPDS summary</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Username</th>
                    <th>Name</th>
                    <th>Risk Level</th>
                    <th>Upcoming Checkup Date</th>
                    <th>Last Checkup Status</th>
                    <th>Last EPDS Score</th>
                    <th>Last EPDS Test Date</th>
                    <th>Assigned Doctor</th>
                    <th>Assigned On</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedData.map((mother) => (
                    <tr
                      key={mother.uid}
                      data-highlight-keys={`${mother.uid} ${mother.userId}`}
                      className={
                        matchesHighlightedMother(mother, activeHighlightedMotherId)
                          ? "dashboard-highlight-row"
                          : ""
                      }
                    >
                      <td>{mother.userId}</td>
                      <td>{mother.username}</td>
                      <td>{mother.name}</td>
                      <td>
                        <span className={`table-risk-badge ${mother.risk}`}>
                          {getRiskLabel(mother.risk)}
                        </span>
                      </td>
                      <td>{mother.upcomingCheckup}</td>
                      <td>
                        <span className={`status ${mother.lastStatus}`}>{mother.lastStatus}</span>
                      </td>
                      <td>{mother.lastEPDS}</td>
                      <td>{mother.lastEPDSTestDate}</td>
                      <td>{mother.assignedDoctor ?? "-"}</td>
                      <td>{mother.assignedAt ?? "-"}</td>
                      <td className="actions high-risk-actions">
                        <button
                          type="button"
                          className={`assign-doctor-btn ${mother.assignedDoctor ? "reassign" : ""}`}
                          onClick={() => {
                            triggerRowHighlight(mother.uid);
                            handleOpenAssignModal(mother);
                          }}
                        >
                          {mother.assignedDoctor ? "Reassign Doctor" : "Assign Doctor"}
                        </button>
                        <div className="high-risk-action-icons">
                          <Eye
                            size={18}
                            onClick={() => {
                              triggerRowHighlight(mother.uid);
                              setSelectedMother(mother);
                            }}
                          />
                          <FileText
                            size={18}
                            className="observation-icon"
                            onClick={() => {
                              triggerRowHighlight(mother.uid);
                              setSelectedObservationMother(mother);
                              setObservationPage(1);
                              setObservationFilter("all");
                              setActiveMedicationPage(1);
                              setMedicationHistoryPage(1);
                            }}
                          />
                          <FileDown
                            size={18}
                            className={downloadingMotherUid === mother.uid ? "report-icon loading" : "report-icon"}
                            onClick={() => void downloadPatientSummary(mother)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <Pagination
            currentPage={effectiveCurrentPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {editingMother && (
        <div className="modal-overlay">
          <div className="modal-card assign-doctor-modal">
            <h2 className="modal-title">
              {editingMother.assignedDoctor ? "Reassign Doctor" : "Assign Doctor"}
            </h2>

            <p className="assign-mother-name">
              <strong>Mother:</strong> {editingMother.name}
            </p>

            <label htmlFor="doctor-select">Select Doctor</label>
            <select
              id="doctor-select"
              value={selectedDoctor}
              onChange={(event) => setSelectedDoctor(event.target.value)}
            >
              <option value="">Select a doctor</option>
              {doctorOptions.map((doctor) => (
                <option key={doctor.uid} value={doctor.uid}>
                  {doctor.name}
                </option>
              ))}
            </select>

            {assignmentError ? (
              <p style={{ color: "#dc2626", marginTop: "12px" }}>{assignmentError}</p>
            ) : null}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setEditingMotherId(null);
                  setSelectedDoctor("");
                  setAssignmentError("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveDoctor}
                disabled={!selectedDoctor || isSavingAssignment}
              >
                {isSavingAssignment ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProfileDetails && portalRoot && createPortal(
        <div className="modal-overlay assigned-mothers-modal-overlay" onClick={() => setSelectedMother(null)}>
          <div className="modal-card mother-profile-modal" onClick={(event) => event.stopPropagation()}>
            <div className="profile-banner">
              <div>
                <h2>Mother Profile: {selectedProfileDetails.name}</h2>
              </div>
              <span className={`profile-risk-badge ${selectedProfileDetails.risk}`}>
                {getRiskLabel(selectedProfileDetails.risk)}
              </span>
            </div>

            <div className="profile-top-grid">
              <div className="profile-panel">
                <h3>Personal Info</h3>
                <div className="profile-info-list">
                  <p><span>Name:</span> <strong>{selectedProfileDetails.name}</strong></p>
                  <p><span>NIC:</span> <strong>{selectedProfileDetails.nic}</strong></p>
                  <p><span>Email:</span> <strong>{selectedProfileDetails.email}</strong></p>
                  <p><span>Region:</span> <strong>{selectedProfileDetails.region}</strong></p>
                  <p><span>Contact No:</span> <strong>{selectedProfileDetails.contact}</strong></p>
                  <p><span>Birthday:</span> <strong>{selectedProfileDetails.birthday}</strong></p>
                  <p><span>Address:</span> <strong>{selectedProfileDetails.address}</strong></p>
                  <p><span>Guardian Name:</span> <strong>{selectedProfileDetails.guardianName}</strong></p>
                  <p><span>Guardian Contact No:</span> <strong>{selectedProfileDetails.guardianContact}</strong></p>
                  <p><span>Delivery Date:</span> <strong>{selectedProfileDetails.deliveryDate}</strong></p>
                  <p><span>No of Children:</span> <strong>{selectedProfileDetails.children}</strong></p>
                </div>
              </div>

              <div className="profile-panel">
                <h3>EPDS Score Trend</h3>
                <div className="epds-chart-card">
                  <svg viewBox="0 0 360 250" className="epds-chart" aria-label="EPDS score trend">
                    {[0, 5, 10, 15, 20, 25, 30].map((tick) => {
                      const y = 210 - tick * 6;
                      return (
                        <g key={tick}>
                          <line x1="52" y1={y} x2="320" y2={y} className="chart-grid-line" />
                          <text x="18" y={y + 4} className="chart-axis-label">
                            {String(tick).padStart(2, "0")}
                          </text>
                        </g>
                      );
                    })}
                    <polyline
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="2"
                      points={chartPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                    />
                    {chartPoints.map((point, index) => (
                      <g key={`${point.value}-${index}`}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="6"
                          className={`chart-point ${index === chartPoints.length - 1 ? "latest" : ""}`}
                        >
                          <title>EPDS score: {point.value}</title>
                        </circle>
                      </g>
                    ))}
                    {["1st Week", "2nd Week", "3rd Week", "4th Week"].map((label, index) => (
                      <text key={label} x={48 + index * 84} y="236" className="chart-axis-label x-axis">
                        {label}
                      </text>
                    ))}
                  </svg>
                  <p className="chart-month-label">April</p>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => void downloadPatientSummary(selectedProfileDetails)} disabled={downloadingMotherUid === selectedProfileDetails.uid}>
                {downloadingMotherUid === selectedProfileDetails.uid ? "Generating..." : "Download Summary Report"}
              </button>
              <button className="btn-outline" onClick={() => setSelectedMother(null)}>
                Close
              </button>
            </div>
          </div>
        </div>,
        portalRoot,
      )}

      {selectedObservationDetails && portalRoot && createPortal(
        <div className="modal-overlay assigned-mothers-modal-overlay" onClick={() => setSelectedObservationMother(null)}>
          <div className="modal-card mother-observation-modal" onClick={(event) => event.stopPropagation()}>
            <div className="profile-banner compact">
              <div>
                <h2>{selectedObservationDetails.name} Overview</h2>
              </div>
              <span className={`profile-risk-badge ${selectedObservationDetails.risk}`}>
                {getRiskLabel(selectedObservationDetails.risk)}
              </span>
            </div>

            {detailsError && (
              <div className="profile-section-card">
                <p className="empty-inline-state">{detailsError}</p>
              </div>
            )}

            <div className="profile-section-card">
              <div className="section-card-header">
                <h3>Observation Timeline</h3>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <select
                    value={observationFilter}
                    onChange={(event) => {
                      setObservationFilter(event.target.value);
                      setObservationPage(1);
                    }}
                    className="internal-modal-select"
                    style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #d1eae0", fontSize: "0.85rem" }}
                  >
                    <option value="all">All Sources</option>
                    <option value="doctor">Doctor&apos;s Observation</option>
                    <option value="homeVisit">Home Visit</option>
                    <option value="clinicVisit">Clinic Visit</option>
                  </select>
                  <button
                    className="section-link-btn"
                    type="button"
                    onClick={() => router.push(`/midwife/observations-and-visits?search=${selectedObservationDetails.username}`)}
                  >
                    View All
                  </button>
                </div>
              </div>

              <div className="observation-table-shell">
                <table className="timeline-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Title</th>
                      <th>Mood</th>
                      <th>Sleep</th>
                      <th>Appetite</th>
                      <th>Next Observation</th>
                      <th>Observed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailsLoading ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
                          Loading observations...
                        </td>
                      </tr>
                    ) : selectedObservationEntries.map((entry) => (
                      <tr key={entry.id || entry.timestamp}>
                        <td>{entry.timestamp}</td>
                        <td>{entry.title}</td>
                        <td>{entry.mood}</td>
                        <td>{entry.sleep}</td>
                        <td>{entry.appetite}</td>
                        <td>{entry.nextObservationDate}</td>
                        <td>{entry.observedBy}</td>
                      </tr>
                    ))}
                    {!detailsLoading && selectedObservationEntries.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
                          No observations found for this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="inline-pagination">
                <button
                  className={`pager-btn ${observationPage === 1 ? "disabled" : ""}`}
                  onClick={() => observationPage > 1 && setObservationPage(observationPage - 1)}
                >
                  &lt;
                </button>
                <span className="pager-indicator">{observationPage}</span>
                <button
                  className={`pager-btn ${observationPage === observationTotalPages ? "disabled" : ""}`}
                  onClick={() =>
                    observationPage < observationTotalPages && setObservationPage(observationPage + 1)
                  }
                >
                  &gt;
                </button>
              </div>
            </div>

            <div className="profile-section-card">
              <div className="section-card-header">
                <h3>Medication</h3>
              </div>

              <div className="medication-panels" style={{ maxHeight: "400px", overflowY: "auto", display: "flex", gap: "20px" }}>
                <div className="medication-panel active-medication-panel" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <h4>
                    Active Medications{" "}
                    <span className="medication-count-chip">
                      {selectedObservationDetails.activeMedications.length}
                    </span>
                  </h4>
                  <div style={{ flex: 1 }}>
                  {detailsLoading ? (
                    <div className="medication-copy medication-card" style={{ textAlign: "center", fontStyle: "italic", color: "#666" }}>
                      Loading medications...
                    </div>
                  ) : selectedActiveMedications.length > 0 ? (
                    selectedActiveMedications.map((med) => (
                      <div key={med.id || med.name} className="medication-copy medication-card">
                        <p><span>Medication Name:</span> {med.name}</p>
                        <p><span>Dosage:</span> {formatDosage(med.dosage)} mg</p>
                        <p><span>Frequency:</span> {med.frequency || "-"}</p>
                        <p><span>Start Date:</span> {med.startDate}</p>
                        <p><span>End Date:</span> {med.endDate || "-"}</p>
                        <p><span>Prescribed by:</span> {med.prescribedBy}</p>
                        <p><span>Notes:</span> {med.notes || "-"}</p>
                        <p><span>Instructions:</span> {med.instructions || "-"}</p>
                      </div>
                    ))
                  ) : (
                    <div className="medication-copy medication-card" style={{ textAlign: "center", fontStyle: "italic", color: "#666" }}>
                      No active medications currently noted.
                    </div>
                  )}
                  </div>
                  {!detailsLoading && selectedObservationDetails.activeMedications.length > 0 && (
                    <div className="inline-pagination centered">
                      <button
                        className={`pager-btn ${activeMedicationPage === 1 ? "disabled" : ""}`}
                        onClick={() => activeMedicationPage > 1 && setActiveMedicationPage(activeMedicationPage - 1)}
                      >
                        &lt;
                      </button>
                      <span className="pager-indicator">{activeMedicationPage}</span>
                      <button
                        className={`pager-btn ${activeMedicationPage === activeMedicationTotalPages ? "disabled" : ""}`}
                        onClick={() =>
                          activeMedicationPage < activeMedicationTotalPages &&
                          setActiveMedicationPage(activeMedicationPage + 1)
                        }
                      >
                        &gt;
                      </button>
                    </div>
                  )}
                </div>

                <div className="medication-panel history-medication-panel" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <h4>
                    Medication History{" "}
                    <span className="medication-count-chip ghost">
                      {selectedObservationDetails.medicationHistory.length}
                    </span>
                  </h4>
                  <div style={{ flex: 1 }}>
                  {detailsLoading ? (
                    <div className="medication-copy medication-card history" style={{ textAlign: "center", fontStyle: "italic", color: "#666" }}>
                      Loading medication history...
                    </div>
                  ) : selectedObservationDetails.medicationHistory.length > 0 ? (
                    selectedMedicationHistory.map((med) => (
                      <div key={med.id || `${med.name}-${med.startDate}`} className="medication-copy medication-card history">
                        <p><span>Medication Name:</span> {med.name}</p>
                        <p><span>Dosage:</span> {formatDosage(med.dosage)} mg</p>
                        <p><span>Start Date:</span> {med.startDate}</p>
                        <p><span>End Date:</span> {med.endDate || "-"}</p>
                        <p><span>Prescribed by:</span> {med.prescribedBy}</p>
                        <p><span>Reason Stopped:</span> {med.reasonStopped || "-"}</p>
                      </div>
                    ))
                  ) : (
                    <div className="medication-copy medication-card history" style={{ textAlign: "center", fontStyle: "italic", color: "#666" }}>
                      No medication history found.
                    </div>
                  )}
                  </div>

                  {!detailsLoading && selectedObservationDetails.medicationHistory.length > 0 && (
                  <div className="inline-pagination history centered">
                    <button
                      className={`pager-btn ${medicationHistoryPage === 1 ? "disabled" : ""}`}
                      onClick={() =>
                        medicationHistoryPage > 1 && setMedicationHistoryPage(medicationHistoryPage - 1)
                      }
                    >
                      &lt;
                    </button>
                    <span className="pager-indicator">{medicationHistoryPage}</span>
                    <button
                      className={`pager-btn ${medicationHistoryPage === medicationHistoryTotalPages ? "disabled" : ""}`}
                      onClick={() =>
                        medicationHistoryPage < medicationHistoryTotalPages &&
                        setMedicationHistoryPage(medicationHistoryPage + 1)
                      }
                    >
                      &gt;
                    </button>
                  </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setSelectedObservationMother(null)}>
                Close
              </button>
            </div>
          </div>
        </div>,
        portalRoot,
      )}
    </div>
  );
}
