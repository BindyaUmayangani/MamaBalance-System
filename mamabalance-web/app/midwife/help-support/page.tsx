import "@/app/styles/RoleSettingsSupport.css";
import CustomerSupportSection from "@/components/common/support/CustomerSupportSection";

export default function MidwifeHelpSupportPage() {
  return (
    <div className="role-page">
      <div className="role-header">
        <h1>Help & Support</h1>
        <p>Find guidance for visits, observations, and account-related issues.</p>
      </div>

      <div className="role-grid">
        <section className="role-card">
          <h3>Frequently Asked Questions</h3>
          <p className="faq-intro">
            Use this section for quick guidance on assigned mothers, visits, observations, and field support issues.
          </p>
          <div className="faq-accordion">
            <details className="faq-item">
              <summary>How do I assign or reassign a doctor for high-risk mothers?</summary>
              <p className="faq-answer">
                Open High Risk Mothers, click Assign Doctor or Reassign Doctor, select the doctor, and save.
              </p>
            </details>
            <details className="faq-item">
              <summary>How can I add home visit and clinic visit observations?</summary>
              <p className="faq-answer">
                Go to Observations and Visits, choose Home Visits or Clinic Visits tab, then use Add New Observation.
              </p>
            </details>
            <details className="faq-item">
              <summary>How do I reschedule overdue visits?</summary>
              <p className="faq-answer">
                In Upcoming Visits, filter by Overdue if needed, click Reschedule, pick a new date/time, and save.
              </p>
            </details>
            <details className="faq-item">
              <summary>Where can I view trend analytics for my assigned mothers?</summary>
              <p className="faq-answer">
                Open Analytics from the sidebar to view risk distribution, visit completion, and EPDS trend charts.
              </p>
            </details>
            <details className="faq-item">
              <summary>Why is a mother not appearing in my assigned mothers page?</summary>
              <p className="faq-answer">
                The mother must be assigned to your user account. If the assignment was changed recently, refresh the
                page and confirm the mother still belongs to your region and active workload.
              </p>
            </details>
            <details className="faq-item">
              <summary>How do I mark a finished visit correctly?</summary>
              <p className="faq-answer">
                Open Upcoming Visits and use the completed action for a finished visit so the status moves from
                Upcoming, Overdue, or Rescheduled into Completed.
              </p>
            </details>
            <details className="faq-item">
              <summary>What should I do if I entered visit or observation data with a mistake?</summary>
              <p className="faq-answer">
                Reopen the relevant workflow, edit the saved entry if the page supports updates, and correct the values
                immediately so follow-up staff do not act on outdated information.
              </p>
            </details>
            <details className="faq-item">
              <summary>When should I contact support from the field?</summary>
              <p className="faq-answer">
                Contact support if the page will not load, visits fail to save, assigned mothers are missing, or a
                device/browser issue prevents you from finishing a scheduled workflow on time.
              </p>
            </details>
          </div>
        </section>

        <CustomerSupportSection
          intro="Reach the support team for visit scheduling, assigned mother workflows, and field-device issues."
          categoryOptions={[
            { value: "workflow", label: "Workflow" },
            { value: "technical", label: "Technical" },
            { value: "account", label: "Account Access" },
          ]}
          defaultCategory="workflow"
          defaultPriority="medium"
        />
      </div>
    </div>
  );
}
