import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type PatientSummaryObservation = {
  id: string;
  source: "doctor" | "homeVisit" | "clinicVisit";
  timestamp: string;
  title: string;
  detailedNote: string;
  mood: string;
  sleep: string;
  appetite: string;
  nextObservationDate: string;
  observedBy: string;
};

export type PatientSummaryMedication = {
  id: string;
  name: string;
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

export type PatientSummaryResponse = {
  uid: string;
  userId: string;
  name: string;
  username: string;
  email: string;
  personalEmail: string;
  nic: string;
  region: string;
  contact: string;
  createdOn: string;
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
  deliveryDate: string;
  noOfChildren: number;
  epdsHistory: Array<{
    id: string;
    score: number;
    submittedAt: string | null;
    label: string;
  }>;
  observations: PatientSummaryObservation[];
  medications: PatientSummaryMedication[];
};

const MAMA_TEAL: [number, number, number] = [73, 157, 133];
const MAMA_RED: [number, number, number] = [220, 38, 38];
const MAMA_ORANGE: [number, number, number] = [249, 115, 22];
const MAMA_GRAY: [number, number, number] = [31, 41, 55];
const MAMA_BORDER: [number, number, number] = [203, 213, 225];
const MAMA_LABEL_BG: [number, number, number] = [241, 245, 249];
const MAMA_ROW_ALT: [number, number, number] = [248, 250, 252];
const MAMA_PANEL_BG: [number, number, number] = [252, 254, 253];

function addHeader(pdf: jsPDF, patient: PatientSummaryResponse) {
  const width = pdf.internal.pageSize.width;

  pdf.setFillColor(MAMA_TEAL[0], MAMA_TEAL[1], MAMA_TEAL[2]);
  pdf.rect(0, 0, width, 34, "F");
  pdf.setTextColor("#ffffff");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("MamaBalance", 14, 14);
  pdf.setFontSize(12);
  pdf.text("Patient Summary Report", 14, 22);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`Generated: ${new Date().toLocaleString("en-LK")}`, width - 14, 14, { align: "right" });
  pdf.text(`Patient ID: ${patient.userId}`, width - 14, 21, { align: "right" });
  pdf.text(`Risk: ${patient.riskStatus.toUpperCase()}`, width - 14, 28, { align: "right" });
}

function addFooter(pdf: jsPDF) {
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(229, 231, 235);
    pdf.line(14, pdf.internal.pageSize.height - 16, pdf.internal.pageSize.width - 14, pdf.internal.pageSize.height - 16);
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text("Confidential - MamaBalance Patient Summary", 14, pdf.internal.pageSize.height - 10);
    pdf.text(`Page ${page} of ${pageCount}`, pdf.internal.pageSize.width - 14, pdf.internal.pageSize.height - 10, {
      align: "right",
    });
  }
}

function riskBand(score: number) {
  if (score >= 20) return "High";
  if (score >= 10) return "Moderate";
  return "Low";
}

function sourceLabel(source: PatientSummaryObservation["source"]) {
  if (source === "doctor") return "Doctor";
  if (source === "clinicVisit") return "Midwife Clinic Visit";
  return "Midwife Home Visit";
}

function addSectionTitle(pdf: jsPDF, title: string, y: number) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(MAMA_GRAY[0], MAMA_GRAY[1], MAMA_GRAY[2]);
  pdf.text(title, 14, y);
}

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return String(value);
  const trimmed = value.trim();
  return trimmed ? trimmed : "-";
}

function addPersonalDetailsSection(pdf: jsPDF, patient: PatientSummaryResponse) {
  const left = 14;
  const top = 48;
  const width = pdf.internal.pageSize.width - 28;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(MAMA_TEAL[0], MAMA_TEAL[1], MAMA_TEAL[2]);
  pdf.text("Profile Overview", left + 4, top + 2);

  autoTable(pdf, {
    startY: top + 5,
    theme: "plain",
    margin: { left: left + 3, right: left + 3 },
    tableWidth: width - 6,
    pageBreak: "avoid",
    styles: {
      fontSize: 8.2,
      cellPadding: { top: 2.6, right: 3, bottom: 2.6, left: 3 },
      textColor: MAMA_GRAY,
      lineColor: MAMA_BORDER,
      lineWidth: 0.2,
      overflow: "linebreak",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: "bold", fillColor: MAMA_LABEL_BG },
      1: { cellWidth: 44 },
      2: { cellWidth: 20, fontStyle: "bold", fillColor: MAMA_LABEL_BG },
      3: { cellWidth: 44 },
      4: { cellWidth: 20, fontStyle: "bold", fillColor: MAMA_LABEL_BG },
      5: { cellWidth: 44 },
    },
    bodyStyles: { minCellHeight: 9 },
    alternateRowStyles: { fillColor: MAMA_ROW_ALT },
    didParseCell: (hookData) => {
      if (hookData.section !== "body") return;
      hookData.cell.styles.fillColor = hookData.row.index % 2 === 0 ? MAMA_PANEL_BG : MAMA_ROW_ALT;
      if (hookData.column.index % 2 === 0) {
        hookData.cell.styles.fillColor = MAMA_LABEL_BG;
        hookData.cell.styles.fontStyle = "bold";
      }
    },
    body: [
      ["Name", displayValue(patient.name), "Username", displayValue(patient.username), "User ID", displayValue(patient.userId)],
      ["NIC", displayValue(patient.nic), "Age", displayValue(patient.age), "Birthdate", displayValue(patient.birthdate)],
      ["Phone", displayValue(patient.contact), "Email", displayValue(patient.email), "Personal Email", displayValue(patient.personalEmail)],
      ["Region", displayValue(patient.region), "Assigned Doctor", displayValue(patient.assignedDoctor), "Assigned Midwife", displayValue(patient.assignedMidwife)],
      ["Guardian", displayValue(patient.guardianName), "Guardian Contact", displayValue(patient.guardianContact), "Children", displayValue(patient.noOfChildren)],
      ["Delivery Date", displayValue(patient.deliveryDate), "Created On", displayValue(patient.createdOn), "Last EPDS", patient.lastEpdScore > 0 ? String(patient.lastEpdScore) : "-"],
      [
        "Last EPDS Date",
        displayValue(patient.lastEpdTestDate),
        "Address",
        {
          content: displayValue(patient.address),
          colSpan: 3,
          styles: {
            cellPadding: { top: 2.6, right: 3, bottom: 3.2, left: 3 },
          },
        },
      ],
    ],
  });
}

export function generatePatientSummaryPdf(patient: PatientSummaryResponse) {
  const pdf = new jsPDF("l", "mm", "a4");
  addHeader(pdf, patient);

  addSectionTitle(pdf, "Personal Details", 44);
  addPersonalDetailsSection(pdf, patient);

  pdf.addPage();
  addHeader(pdf, patient);
  addSectionTitle(pdf, "EPDS Assessment History", 44);
  autoTable(pdf, {
    startY: 48,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3, textColor: MAMA_GRAY, overflow: "linebreak" },
    headStyles: { fillColor: MAMA_TEAL, textColor: "#ffffff", fontStyle: "bold" },
    body: patient.epdsHistory.length > 0
      ? patient.epdsHistory.map((item, index) => [
          String(index + 1),
          item.label,
          item.submittedAt ? new Date(item.submittedAt).toLocaleString("en-LK") : "-",
          String(item.score),
          riskBand(item.score),
        ])
      : [["-", "No EPDS assessments found", "-", "-", "-"]],
    head: [["#", "Assessment", "Submitted At", "Score", "Risk Band"]],
  });

  const doctorObservations = patient.observations.filter((item) => item.source === "doctor");
  const midwifeObservations = patient.observations.filter((item) => item.source !== "doctor");

  pdf.addPage();
  addHeader(pdf, patient);
  addSectionTitle(pdf, "Doctor Observations", 44);
  autoTable(pdf, {
    startY: 48,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: MAMA_GRAY, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: MAMA_TEAL, textColor: "#ffffff", fontStyle: "bold" },
    head: [["Timestamp", "Title", "Mood", "Sleep", "Appetite", "Next Observation", "Observed By", "Notes"]],
    body: doctorObservations.length > 0
      ? doctorObservations.map((item) => [
          item.timestamp,
          item.title,
          item.mood,
          item.sleep,
          item.appetite,
          item.nextObservationDate,
          item.observedBy,
          item.detailedNote,
        ])
      : [["-", "No doctor observations found", "-", "-", "-", "-", "-", "-"]],
  });

  pdf.addPage();
  addHeader(pdf, patient);
  addSectionTitle(pdf, "Midwife Observations", 44);
  autoTable(pdf, {
    startY: 48,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: MAMA_GRAY, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: MAMA_ORANGE, textColor: "#ffffff", fontStyle: "bold" },
    head: [["Timestamp", "Source", "Title", "Mood", "Sleep", "Appetite", "Next Observation", "Observed By", "Notes"]],
    body: midwifeObservations.length > 0
      ? midwifeObservations.map((item) => [
          item.timestamp,
          sourceLabel(item.source),
          item.title,
          item.mood,
          item.sleep,
          item.appetite,
          item.nextObservationDate,
          item.observedBy,
          item.detailedNote,
        ])
      : [["-", "-", "No midwife observations found", "-", "-", "-", "-", "-", "-"]],
  });

  pdf.addPage();
  addHeader(pdf, patient);
  addSectionTitle(pdf, "Medication Information", 44);
  autoTable(pdf, {
    startY: 48,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: MAMA_GRAY, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: MAMA_RED, textColor: "#ffffff", fontStyle: "bold" },
    head: [["Medication", "Dosage", "Frequency", "Status", "Start Date", "End Date", "Prescribed By", "Notes / Instructions"]],
    body: patient.medications.length > 0
      ? patient.medications.map((item) => [
          item.name || "-",
          item.dosage ? `${item.dosage} mg` : "-",
          item.frequency || "-",
          item.status,
          item.startDate || "-",
          item.endDate || "Present",
          item.prescribedBy || "-",
          [
            item.notes ? `Notes: ${item.notes}` : "",
            item.instructions ? `Instructions: ${item.instructions}` : "",
            item.reasonStopped ? `Reason Stopped: ${item.reasonStopped}` : "",
          ].filter(Boolean).join("\n") || "-",
        ])
      : [["No medications found", "-", "-", "-", "-", "-", "-", "-"]],
  });

  addFooter(pdf);

  const safeName = patient.name.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  pdf.save(`patient_summary_${safeName || patient.userId}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
