import "@/app/styles/RoleSettingsSupport.css";
import CustomerSupportSection from "@/components/common/support/CustomerSupportSection";

export default function DoctorHelpSupportPage() {
  return (
    <div className="role-page">
      <div className="role-header">
        <h1>Help & Support</h1>
        <p>Get quick answers and contact technical support when needed.</p>
      </div>

      <div className="role-grid">
        <section className="role-card">
          <h3>Frequently Asked Questions</h3>
          <p className="faq-intro">
            Check these common answers for observation, medication, checkup, and reporting workflows.
          </p>
          <div className="faq-accordion">
            <details className="faq-item">
              <summary>How do I update a mother observation?</summary>
              <p className="faq-answer">
                Open Medical Observation, choose the correct tab, click the edit icon on the row, update fields,
                and save.
              </p>
            </details>
            <details className="faq-item">
              <summary>How can I add or stop medication records?</summary>
              <p className="faq-answer">
                Go to Medication Management, use Add/Update for active plans, and use Stop to move a medication into
                history with a reason.
              </p>
            </details>
            <details className="faq-item">
              <summary>Where can I check upcoming checkups and overdue visits?</summary>
              <p className="faq-answer">
                Use Upcoming Checkup list view and filter by status. Overdue entries can be edited or rescheduled.
              </p>
            </details>
            <details className="faq-item">
              <summary>How do I export my analytics report?</summary>
              <p className="faq-answer">
                On Analytics, use the Export Reports action. If export is restricted, submit a support request from
                this page.
              </p>
            </details>
            <details className="faq-item">
              <summary>Why can’t I see a mother in my assigned list?</summary>
              <p className="faq-answer">
                The mother must already be assigned to you or routed through the correct regional workflow. If a
                high-risk mother was recently reassigned, refresh the page and confirm the doctor assignment was saved.
              </p>
            </details>
            <details className="faq-item">
              <summary>What should I do if medication history looks incomplete?</summary>
              <p className="faq-answer">
                Review whether the medication was stopped correctly and whether it was saved under the current mother
                record. If entries disappear after saving, report it as a data issue with the mother name and time.
              </p>
            </details>
            <details className="faq-item">
              <summary>How do I handle overdue checkups that were already completed offline?</summary>
              <p className="faq-answer">
                Open the relevant checkup entry, update the visit details or status if the workflow allows it, and add
                notes so the timeline reflects what happened during the offline consultation.
              </p>
            </details>
            <details className="faq-item">
              <summary>When should I contact support for analytics mismatches?</summary>
              <p className="faq-answer">
                Contact support when chart totals do not match the underlying records, recently updated data is missing,
                or export files contain incomplete or duplicated rows.
              </p>
            </details>
          </div>
        </section>

        <CustomerSupportSection
          intro="Contact customer support for observation history issues, medication workflows, and reporting problems."
          categoryOptions={[
            { value: "technical", label: "Technical" },
            { value: "data", label: "Data Issue" },
            { value: "account", label: "Account Access" },
          ]}
          defaultCategory="technical"
          defaultPriority="medium"
        />
      </div>
    </div>
  );
}
