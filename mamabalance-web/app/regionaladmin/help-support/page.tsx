import "@/app/styles/RoleSettingsSupport.css";
import CustomerSupportSection from "@/components/common/support/CustomerSupportSection";

export default function RegionalAdminHelpSupportPage() {
  return (
    <div className="role-page">
      <div className="role-header">
        <h1>Help & Support</h1>
        <p>Use support tools for regional operations and escalate support tickets directly to the superadmin team.</p>
      </div>

      <div className="role-grid">
        <section className="role-card">
          <h3>Frequently Asked Questions</h3>
          <p className="faq-intro">
            These answers cover the day-to-day regional management issues most often handled from this page.
          </p>
          <div className="faq-accordion">
            <details className="faq-item">
              <summary>How do I manage doctors and midwives in my region?</summary>
              <p className="faq-answer">
                Use User Management tabs, filter by role, then add, edit, or review records assigned to your region.
              </p>
            </details>
            <details className="faq-item">
              <summary>How can I publish educational resources for my area?</summary>
              <p className="faq-answer">
                Open Educational Resources, create new content with title/category, and save to make it available.
              </p>
            </details>
            <details className="faq-item">
              <summary>Where can I export regional analytics data?</summary>
              <p className="faq-answer">
                In Regional Analytics, apply filters and use Export to download report snapshots for your district.
              </p>
            </details>
            <details className="faq-item">
              <summary>How do I report user account access issues?</summary>
              <p className="faq-answer">
                Submit a support ticket from this page with the affected username, role, and error details. Regional admin tickets are routed directly to the superadmin team.
              </p>
            </details>
            <details className="faq-item">
              <summary>Why can’t I create users outside my own region?</summary>
              <p className="faq-answer">
                Regional admins are restricted to users assigned to their own region. If you need a cross-region change,
                escalate it to the superadmin team instead of trying to bypass the validation.
              </p>
            </details>
            <details className="faq-item">
              <summary>What should I check if a doctor or midwife is missing from assignment lists?</summary>
              <p className="faq-answer">
                Confirm the user is active, assigned to your region, and saved with the correct role. Recently created
                accounts may also need a page refresh before they appear in dropdowns.
              </p>
            </details>
            <details className="faq-item">
              <summary>How can I keep region data clean when updating staff records?</summary>
              <p className="faq-answer">
                Update one field group at a time, verify the region before saving, and re-check mother, doctor, or
                midwife assignments after any change that affects ownership.
              </p>
            </details>
            <details className="faq-item">
              <summary>When should I raise a support ticket for educational content issues?</summary>
              <p className="faq-answer">
                Raise a ticket if content fails to save, images do not upload, category filters behave incorrectly, or
                published items are missing for users who should be able to see them.
              </p>
            </details>
          </div>
        </section>

        <CustomerSupportSection
          intro="Use customer support for regional user management issues, publishing problems, and escalated account access cases sent directly to the superadmin team."
          categoryOptions={[
            { value: "regional", label: "Regional Operations" },
            { value: "technical", label: "Technical" },
            { value: "account", label: "Account Access" },
          ]}
          defaultCategory="regional"
          defaultPriority="medium"
        />
      </div>
    </div>
  );
}
