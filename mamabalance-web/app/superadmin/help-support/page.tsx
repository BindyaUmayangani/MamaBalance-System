import "@/app/styles/RoleSettingsSupport.css";
import CustomerSupportSection from "@/components/common/support/CustomerSupportSection";

export default function SuperadminHelpSupportPage() {
  return (
    <div className="role-page">
      <div className="role-header">
        <h1>Help & Support</h1>
        <p>Get platform support for administrative and system-wide operations.</p>
      </div>

      <div className="role-grid">
        <section className="role-card">
          <h3>Frequently Asked Questions</h3>
          <p className="faq-intro">
            Use these quick answers for the most common platform administration tasks before opening a support ticket.
          </p>
          <div className="faq-accordion">
            <details className="faq-item">
              <summary>How do I manage regional admins and permissions?</summary>
              <p className="faq-answer">
                Use Admin Management to add or edit regional admins and update their assigned region and role access.
              </p>
            </details>
            <details className="faq-item">
              <summary>How can I update region and user assignments safely?</summary>
              <p className="faq-answer">
                Update regions first in Region Management, then update user assignments in User Management to keep data
                consistent.
              </p>
            </details>
            <details className="faq-item">
              <summary>Where can I export full analytics and reporting data?</summary>
              <p className="faq-answer">
                Open Analytics & Reports, set the required filters, and use the export action to generate reports.
              </p>
            </details>
            <details className="faq-item">
              <summary>How do I resolve platform-level account conflicts?</summary>
              <p className="faq-answer">
                Check duplicate emails/usernames in User Management and reset credentials through admin tools if needed.
              </p>
            </details>
            <details className="faq-item">
              <summary>What should I do before disabling or removing a staff account?</summary>
              <p className="faq-answer">
                Reassign any region ownership, assigned mothers, or pending operational responsibilities first, then
                disable the account so reporting history stays intact.
              </p>
            </details>
            <details className="faq-item">
              <summary>Why am I seeing validation errors when creating or updating users?</summary>
              <p className="faq-answer">
                Most validation errors come from duplicate emails, missing required fields, invalid regional
                assignments, or role-specific rules such as region restrictions for regional admins.
              </p>
            </details>
            <details className="faq-item">
              <summary>How do I verify whether a support issue is system-wide or limited to one role?</summary>
              <p className="faq-answer">
                Compare the same workflow across roles, regions, and accounts. If multiple roles are affected, include
                the exact page name and time range when escalating it as a platform issue.
              </p>
            </details>
            <details className="faq-item">
              <summary>When should I contact customer support instead of fixing it directly?</summary>
              <p className="faq-answer">
                Contact support for authentication issues, broken analytics exports, data inconsistencies across
                regions, failed image uploads, or anything that looks like a backend or infrastructure problem.
              </p>
            </details>
          </div>
        </section>

        <CustomerSupportSection
          intro="Reach customer support for system-wide operations, analytics exports, permissions, and platform incidents."
          categoryOptions={[
            { value: "platform", label: "Platform Operations" },
            { value: "technical", label: "Technical" },
            { value: "account", label: "Account Access" },
          ]}
          defaultCategory="platform"
          defaultPriority="high"
        />
      </div>
    </div>
  );
}
