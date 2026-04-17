"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Eye, FileText, Filter, ChevronDown, FileDown } from "lucide-react";

import FilterModal from "@/app/superadmin/user-management/modals/FilterModal";
import Pagination from "@/app/superadmin/components/Pagination";
import LoadingState from "@/components/admin/LoadingState";
import { useMidwifeMothers } from "@/app/components/midwife/useMidwifeMothers";
import { generatePatientSummaryPdf, type PatientSummaryResponse } from "@/lib/doctor/patientSummaryPdf";
import "@/app/superadmin/styles/userManagement.css";
import "@/app/doctor/styles/AssignedMothers.css";

type ObservationEntry = {
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
};

type MedicationEntry = {
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

type MotherRecord = {
  uid?: string;
  userId: string;
  username: string;
  name: string;
  risk: "low" | "moderate" | "high";
  upcomingCheckup: string;
  lastStatus: "overdue" | "completed" | "upcoming";
  lastEPDS: string;
  lastEPDSTestDate: string;
  assignedDoctor: string | null;
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
  observations: ObservationEntry[];
  activeMedications: MedicationEntry[];
  medicationHistory: MedicationEntry[];
};

export default function MidwifeAssignedMothersTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mothers: backendMothers, isLoading, error } = useMidwifeMothers("assigned");
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedMother, setSelectedMother] = useState<MotherRecord | null>(null);
  const [selectedObservationMother, setSelectedObservationMother] = useState<MotherRecord | null>(null);
  const [observationPage, setObservationPage] = useState(1);
  const [observationFilter, setObservationFilter] = useState("all");
  const [activeMedicationPage, setActiveMedicationPage] = useState(1);
  const [medicationHistoryPage, setMedicationHistoryPage] = useState(1);
  const [liveObservations, setLiveObservations] = useState<MidwifeObservationApiRecord[]>([]);
  const [liveMedications, setLiveMedications] = useState<MidwifeMedicationApiRecord[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState("");
  const [downloadingMotherUid, setDownloadingMotherUid] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [localHighlightedUserId, setLocalHighlightedUserId] = useState("");
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const pageSize = 6;
  const highlightedUserId = searchParams.get("highlight") || "";
  const activeHighlightedUserId = localHighlightedUserId || highlightedUserId;

  function matchesHighlightedMother(mother: MotherRecord, highlight: string) {
    if (!highlight) {
      return false;
    }

    return mother.uid === highlight || mother.userId === highlight;
  }

  const columns = [
    { key: "userId", label: "User ID" },
    { key: "username", label: "Username" },
    { key: "name", label: "Name" },
    { key: "risk", label: "Risk Level" },
    { key: "assignedDoctor", label: "Assigned Doctor" },
    { key: "checkup", label: "Upcoming Checkup Date" },
    { key: "status", label: "Last Checkup Status" },
    { key: "epds", label: "Last EPDS Score" },
    { key: "epdsDate", label: "Last EPDS Test Date" },
  ] as const;

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    userId: true,
    username: true,
    name: true,
    risk: true,
    assignedDoctor: true,
    checkup: true,
    status: true,
    epds: true,
    epdsDate: true,
  });

  const seedMothers: MotherRecord[] = [
    {
      userId: "MO001",
      username: "ayesha01",
      name: "Ayesha Perera",
      risk: "moderate",
      assignedDoctor: null,
      upcomingCheckup: "2026-04-12 10:00 AM",
      lastStatus: "upcoming",
      lastEPDS: "16",
      lastEPDSTestDate: "2026-04-05",
      nic: "200145337901",
      email: "ayesha@gmail.com",
      region: "Homagama",
      contact: "0712345678",
      birthday: "2001-01-14",
      address: "12 Lake Road, Homagama",
      guardianName: "Chathuri Perera",
      guardianContact: "0711122233",
      deliveryDate: "2026-02-18",
      children: "1",
      epdsTrend: [17, 16, 15, 16],
      observations: [
        {
          timestamp: "2026-04-08 09:30 AM",
          title: "Home Visit Wellness Review",
          detailedNote: "Mother reported improved mood with occasional evening stress and reduced rest.",
          mood: "Anxious",
          sleep: "Moderate",
          appetite: "Good",
          nextObservationDate: "2026-04-15 09:30 AM",
          observedBy: "Midwife Nadeesha Silva",
        },
        {
          timestamp: "2026-04-01 10:15 AM",
          title: "Routine Postnatal Visit",
          detailedNote: "Daily coping plan discussed and home support was encouraged.",
          mood: "Normal",
          sleep: "Moderate",
          appetite: "Good",
          nextObservationDate: "2026-04-08 09:30 AM",
          observedBy: "Midwife Nadeesha Silva",
        },
      ],
      activeMedications: [
        {
          name: "Escitalopram",
          dosage: "5",
          frequency: "Daily morning",
          startDate: "2026-03-28",
          endDate: "2026-04-28",
          prescribedBy: "Dr. Nipuni Harshika",
          notes: "Continue monitoring emotional response weekly.",
          instructions: "Take one tablet after breakfast.",
        },
      ],
      medicationHistory: [
        {
          name: "Sertraline",
          dosage: "25",
          startDate: "2026-02-10",
          endDate: "2026-03-20",
          prescribedBy: "Dr. Nipuni Harshika",
          reasonStopped: "Shifted to a better tolerated treatment.",
        },
      ],
    },
    {
      userId: "MO002",
      username: "dinali02",
      name: "Dinali Silva",
      risk: "high",
      assignedDoctor: "Dr. Nipuni Harshika",
      upcomingCheckup: "2026-04-10 11:30 AM",
      lastStatus: "overdue",
      lastEPDS: "12",
      lastEPDSTestDate: "2026-04-04",
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
      epdsTrend: [14, 13, 13, 12],
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
      userId: "MO003",
      username: "kavindi03",
      name: "Kavindi Fernando",
      risk: "low",
      assignedDoctor: null,
      upcomingCheckup: "2026-04-14 09:00 AM",
      lastStatus: "completed",
      lastEPDS: "7",
      lastEPDSTestDate: "2026-04-01",
      nic: "200245337933",
      email: "kavindi@gmail.com",
      region: "Homagama",
      contact: "0719988776",
      birthday: "2002-03-09",
      address: "23 Main Street, Homagama",
      guardianName: "Rashmi Fernando",
      guardianContact: "0712233445",
      deliveryDate: "2026-02-10",
      children: "1",
      epdsTrend: [8, 8, 7, 7],
      observations: [
        {
          timestamp: "2026-04-03 08:45 AM",
          title: "Stable Follow-up Visit",
          detailedNote: "Stable mood and sleep; continue routine wellness checks.",
          mood: "Normal",
          sleep: "Good",
          appetite: "Good",
          nextObservationDate: "2026-04-10 08:45 AM",
          observedBy: "Midwife Nadeesha Silva",
        },
      ],
      activeMedications: [],
      medicationHistory: [],
    },
    {
      userId: "MO004",
      username: "tharushi04",
      name: "Tharushi Nimal",
      risk: "high",
      assignedDoctor: "Dr. Shehan Perera",
      upcomingCheckup: "2026-04-09 02:30 PM",
      lastStatus: "upcoming",
      lastEPDS: "19",
      lastEPDSTestDate: "2026-04-06",
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
      epdsTrend: [20, 19, 19, 18],
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
      userId: "MO005",
      username: "nimali05",
      name: "Nimali Fernando",
      risk: "moderate",
      assignedDoctor: null,
      upcomingCheckup: "2026-04-16 09:30 AM",
      lastStatus: "upcoming",
      lastEPDS: "15",
      lastEPDSTestDate: "2026-04-08",
      nic: "200445337955",
      email: "nimali@gmail.com",
      region: "Homagama",
      contact: "0715566778",
      birthday: "2001-10-04",
      address: "15 Garden Lane, Homagama",
      guardianName: "Lakshani Fernando",
      guardianContact: "0712211445",
      deliveryDate: "2026-02-21",
      children: "1",
      epdsTrend: [16, 15, 15, 15],
      observations: [
        {
          timestamp: "2026-04-08 09:00 AM",
          title: "Routine Midwife Observation",
          detailedNote: "Mild stress discussed and rest schedule was reinforced.",
          mood: "Anxious",
          sleep: "Moderate",
          appetite: "Good",
          nextObservationDate: "2026-04-15 09:00 AM",
          observedBy: "Midwife Nadeesha Silva",
        },
      ],
      activeMedications: [
        {
          name: "Escitalopram",
          dosage: "5",
          frequency: "Daily morning",
          startDate: "2026-04-02",
          endDate: "2026-05-02",
          prescribedBy: "Dr. Nipuni Harshika",
          notes: "Continue routine observation of mood and sleep.",
          instructions: "Take every morning after food.",
        },
      ],
      medicationHistory: [],
    },
    {
      userId: "MO006",
      username: "sachini06",
      name: "Sachini Perera",
      risk: "high",
      assignedDoctor: "Dr. Nadeeja Rathnayake",
      upcomingCheckup: "2026-04-11 01:30 PM",
      lastStatus: "overdue",
      lastEPDS: "20",
      lastEPDSTestDate: "2026-04-07",
      nic: "200545337966",
      email: "sachini@gmail.com",
      region: "Kaduwela",
      contact: "0708899001",
      birthday: "2000-12-28",
      address: "22 River Road, Kaduwela",
      guardianName: "Chathura Perera",
      guardianContact: "0701112233",
      deliveryDate: "2026-01-18",
      children: "1",
      epdsTrend: [21, 20, 20, 19],
      observations: [
        {
          timestamp: "2026-04-07 01:15 PM",
          title: "Urgent High-Risk Follow-up",
          detailedNote: "Reduced appetite and poor sleep continued; doctor contact was maintained.",
          mood: "Depressed",
          sleep: "Poor",
          appetite: "Reduced",
          nextObservationDate: "2026-04-10 01:15 PM",
          observedBy: "Midwife Nadeesha Silva",
        },
      ],
      activeMedications: [
        {
          name: "Olanzapine",
          dosage: "5",
          frequency: "At bedtime",
          startDate: "2026-04-01",
          endDate: "2026-05-01",
          prescribedBy: "Dr. Nadeeja Rathnayake",
          notes: "Observe daytime sedation and alertness.",
          instructions: "Take before sleep as prescribed.",
        },
      ],
      medicationHistory: [
        {
          name: "Lorazepam",
          dosage: "1",
          startDate: "2026-03-05",
          endDate: "2026-03-19",
          prescribedBy: "Dr. Nadeeja Rathnayake",
          reasonStopped: "Short-term support cycle completed.",
        },
      ],
    },
    {
      userId: "MO007",
      username: "vidushi07",
      name: "Vidushi Silva",
      risk: "low",
      assignedDoctor: null,
      upcomingCheckup: "2026-04-18 11:00 AM",
      lastStatus: "completed",
      lastEPDS: "8",
      lastEPDSTestDate: "2026-04-03",
      nic: "200645337977",
      email: "vidushi@gmail.com",
      region: "Homagama",
      contact: "0714455667",
      birthday: "2002-07-03",
      address: "23 Lake Road, Homagama",
      guardianName: "Malsha Karunaratne",
      guardianContact: "0715566778",
      deliveryDate: "2026-02-09",
      children: "2",
      epdsTrend: [9, 8, 8, 8],
      observations: [
        {
          timestamp: "2026-04-03 10:10 AM",
          title: "Routine Recovery Review",
          detailedNote: "Mother reported stable sleep and reduced anxiety over the past week.",
          mood: "Normal",
          sleep: "Good",
          appetite: "Good",
          nextObservationDate: "2026-04-10 10:10 AM",
          observedBy: "Midwife Nadeesha Silva",
        },
      ],
      activeMedications: [],
      medicationHistory: [],
    },
    {
      userId: "MO008",
      username: "tharanga08",
      name: "Tharanga Kularathna",
      risk: "moderate",
      assignedDoctor: null,
      upcomingCheckup: "2026-04-13 10:15 AM",
      lastStatus: "upcoming",
      lastEPDS: "13",
      lastEPDSTestDate: "2026-04-09",
      nic: "200745337988",
      email: "tharanga@gmail.com",
      region: "Homagama",
      contact: "0713344556",
      birthday: "2001-05-17",
      address: "54 Temple Lane, Homagama",
      guardianName: "Nethmi Kularathna",
      guardianContact: "0716677001",
      deliveryDate: "2026-02-27",
      children: "1",
      epdsTrend: [14, 14, 13, 13],
      observations: [
        {
          timestamp: "2026-04-09 09:45 AM",
          title: "Moderate Stress Monitoring",
          detailedNote: "Stress level improved slightly, but rest pattern still needs monitoring.",
          mood: "Anxious",
          sleep: "Moderate",
          appetite: "Good",
          nextObservationDate: "2026-04-16 09:45 AM",
          observedBy: "Midwife Nadeesha Silva",
        },
      ],
      activeMedications: [
        {
          name: "Sertraline",
          dosage: "25",
          frequency: "Daily morning",
          startDate: "2026-04-04",
          endDate: "2026-05-04",
          prescribedBy: "Dr. Nipuni Harshika",
          notes: "Continue routine follow-up through midwife visits.",
          instructions: "Take one tablet after breakfast.",
        },
      ],
      medicationHistory: [],
    },
  ];

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
    modalLayer.setAttribute("id", "midwife-assigned-mothers-modal-root");
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

  const mothersWithLiveDetails = useMemo<MotherRecord[]>(() => {
    return backendMothers.map((mother) => {
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
  }, [backendMothers, liveMedications, liveObservations]);

  const filteredData = useMemo(() => {
    const search = searchTerm.toLowerCase();

    return mothersWithLiveDetails
      .filter(
        (mother) =>
          mother.name.toLowerCase().includes(search) ||
          mother.username.toLowerCase().includes(search) ||
          mother.userId.toLowerCase().includes(search),
      )
      .filter((mother) => (riskFilter ? mother.risk === riskFilter : true))
      .filter((mother) => (statusFilter ? mother.lastStatus === statusFilter : true));
  }, [mothersWithLiveDetails, riskFilter, searchTerm, statusFilter]);

  const highlightedIndex = filteredData.findIndex(
    (mother) => matchesHighlightedMother(mother, activeHighlightedUserId),
  );
  const highlightedPage =
    highlightedIndex >= 0 ? Math.floor(highlightedIndex / pageSize) + 1 : null;
  const effectiveCurrentPage = highlightedPage ?? currentPage;

  useEffect(() => {
    if (!highlightedUserId) {
      return;
    }

    const scrollTimeoutId = window.setTimeout(() => {
      const row = document.querySelector(
        `[data-highlight-keys~="${highlightedUserId}"]`,
      );
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);

    const clearTimeoutId = window.setTimeout(() => {
      setLocalHighlightedUserId("");
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("highlight");
      window.history.replaceState({}, "", nextUrl.toString());
    }, 10000);

    return () => {
      window.clearTimeout(scrollTimeoutId);
      window.clearTimeout(clearTimeoutId);
    };
  }, [effectiveCurrentPage, highlightedUserId]);

  function triggerRowHighlight(highlightKey: string) {
    setLocalHighlightedUserId(highlightKey);

    window.setTimeout(() => {
      setLocalHighlightedUserId((current) => (current === highlightKey ? "" : current));
    }, 10000);
  }

  async function downloadPatientSummary(mother: MotherRecord) {
    if (!mother.uid) return;
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

  const totalItems = filteredData.length;
  const hasActiveSearchOrFilter =
    searchTerm.trim().length > 0 ||
    riskFilter.trim().length > 0 ||
    statusFilter.trim().length > 0;
  const paginatedData = filteredData.slice(
    (effectiveCurrentPage - 1) * pageSize,
    effectiveCurrentPage * pageSize,
  );
  const observationItemsPerPage = 3;
  const medicationItemsPerPage = 1;
  const selectedObservationDetails = selectedObservationMother
    ? mothersWithLiveDetails.find(
      (mother) =>
        mother.uid === selectedObservationMother.uid ||
        mother.userId === selectedObservationMother.userId,
    ) ?? selectedObservationMother
    : null;

  function getObservationSource(entry: ObservationEntry) {
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
  const chartPoints = selectedMother
    ? selectedMother.epdsTrend.map((value, index) => ({
      x: 48 + index * 84,
      y: 210 - value * 6,
      value,
    }))
    : [];

  void seedMothers;

  return (
    <div className="assigned-page">
      <div className="role-header">
        <h1>Assigned Mothers</h1>
        <p>
          Review mothers currently assigned to your care and track their risk,
          doctor assignment, and visit status.
        </p>
      </div>

      <div className="filter-row midwife-assigned-filter-row">
        <div className="search-box midwife-table-search">
          <Search size={18} />
          <input
            placeholder="Search by mother ID, username, or name"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="filter-row-actions midwife-filter-row-actions">
          <div className="filter-select-wrap midwife-filter-select-wrap">
            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Risk Level: All</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
            <span className="filter-select-icon">
              <ChevronDown size={18} />
            </span>
          </div>

          <div className="filter-select-wrap midwife-filter-select-wrap">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
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

          <button className="filter-btn midwife-filter-btn" onClick={() => setShowFilterModal(true)}>
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading assigned mothers..." />
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
                    ? "No matching mothers found"
                    : "No assigned mothers yet"}
                </h3>
                <p>
                  {hasActiveSearchOrFilter
                    ? "Try a different name, ID, username, or clear the current filters."
                    : "Assigned mothers will appear here once they are linked to your care list."}
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
                      <span>Mother profile details</span>
                      <span>Upcoming checkup schedule</span>
                      <span>Latest EPDS summary</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    {visibleColumns.userId && <th>User ID</th>}
                    {visibleColumns.username && <th>Username</th>}
                    {visibleColumns.name && <th>Name</th>}
                    {visibleColumns.risk && <th>Risk Level</th>}
                    {visibleColumns.assignedDoctor && <th>Assigned Doctor</th>}
                    {visibleColumns.checkup && <th>Upcoming Checkup Date</th>}
                    {visibleColumns.status && <th>Last Checkup Status</th>}
                    {visibleColumns.epds && <th>Last EPDS Score</th>}
                    {visibleColumns.epdsDate && <th>Last EPDS Test Date</th>}
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedData.map((mother) => (
                    <tr
                      key={mother.userId}
                      data-highlight-keys={`${mother.uid || ""} ${mother.userId}`}
                      className={
                        matchesHighlightedMother(mother, activeHighlightedUserId)
                          ? "dashboard-highlight-row"
                          : ""
                      }
                    >
                      {visibleColumns.userId && <td>{mother.userId}</td>}
                      {visibleColumns.username && <td>{mother.username}</td>}
                      {visibleColumns.name && <td>{mother.name}</td>}

                      {visibleColumns.risk && (
                        <td>
                          <span className={`table-risk-badge ${mother.risk}`}>
                            {getRiskLabel(mother.risk)}
                          </span>
                        </td>
                      )}

                      {visibleColumns.assignedDoctor && (
                        <td>{mother.risk === "high" ? mother.assignedDoctor || "-" : "-"}</td>
                      )}

                      {visibleColumns.checkup && <td>{mother.upcomingCheckup}</td>}

                      {visibleColumns.status && (
                        <td>
                          <span className={`status ${mother.lastStatus}`}>{mother.lastStatus}</span>
                        </td>
                      )}

                      {visibleColumns.epds && <td>{mother.lastEPDS}</td>}
                      {visibleColumns.epdsDate && <td>{mother.lastEPDSTestDate}</td>}

                      <td className="actions">
                        <Eye
                          size={18}
                          onClick={() => {
                            triggerRowHighlight(mother.uid || mother.userId);
                            setSelectedMother(mother);
                          }}
                        />
                        <FileText
                          size={18}
                          className="observation-icon"
                          onClick={() => {
                            triggerRowHighlight(mother.uid || mother.userId);
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

      {showFilterModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <FilterModal
              columns={columns}
              visibleColumns={visibleColumns}
              setVisibleColumns={setVisibleColumns}
              onClose={() => setShowFilterModal(false)}
            />
          </div>
        </div>
      )}

      {selectedMother && portalRoot && createPortal(
        <div className="modal-overlay assigned-mothers-modal-overlay" onClick={() => setSelectedMother(null)}>
          <div className="modal-card mother-profile-modal" onClick={(event) => event.stopPropagation()}>
            <div className="profile-banner">
              <div>
                <h2>Mother Profile: {selectedMother.name}</h2>
              </div>
              <span className={`profile-risk-badge ${selectedMother.risk}`}>
                {getRiskLabel(selectedMother.risk)}
              </span>
            </div>

            <div className="profile-top-grid">
              <div className="profile-panel">
                <h3>Personal Info</h3>
                <div className="profile-info-list">
                  <p><span>Name:</span> <strong>{selectedMother.name}</strong></p>
                  <p><span>NIC:</span> <strong>{selectedMother.nic}</strong></p>
                  <p><span>Email:</span> <strong>{selectedMother.email}</strong></p>
                  <p><span>Region:</span> <strong>{selectedMother.region}</strong></p>
                  <p><span>Contact No:</span> <strong>{selectedMother.contact}</strong></p>
                  <p><span>Birthday:</span> <strong>{selectedMother.birthday}</strong></p>
                  <p><span>Address:</span> <strong>{selectedMother.address}</strong></p>
                  <p><span>Guardian Name:</span> <strong>{selectedMother.guardianName}</strong></p>
                  <p><span>Guardian Contact No:</span> <strong>{selectedMother.guardianContact}</strong></p>
                  <p><span>Delivery Date:</span> <strong>{selectedMother.deliveryDate}</strong></p>
                  <p><span>No of Children:</span> <strong>{selectedMother.children}</strong></p>
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
              <button className="btn-outline" onClick={() => void downloadPatientSummary(selectedMother)} disabled={downloadingMotherUid === selectedMother.uid}>
                {downloadingMotherUid === selectedMother.uid ? "Generating..." : "Download Summary Report"}
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
                    <div className="inline-pagination centered">
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
