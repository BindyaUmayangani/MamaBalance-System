"use client";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function ExportReportModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const exportPdf = async () => {
    const element = document.getElementById("analytics-page");
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const width = 210;
    const height = (canvas.height * width) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 10, width, height);
    pdf.save("EPDS_Analytics_Report.pdf");
  };

  return (
    <>
      <h2 className="modal-title">Export Report</h2>

      <label>Report Type</label>
      <select>
        <option>EPDS Summary Report</option>
        <option>Region Performance Report</option>
      </select>

      <label>Date Range</label>
      <select>
        <option>This Month</option>
        <option>Last 3 Months</option>
      </select>

      <div className="modal-actions">
        <button className="btn-close" onClick={onClose}>
          Cancel
        </button>

        <button className="btn-primary" onClick={exportPdf}>
          Export PDF
        </button>
      </div>
    </>
  );
}
