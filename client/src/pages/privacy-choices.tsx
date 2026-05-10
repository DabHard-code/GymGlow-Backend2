export default function PrivacyChoicesPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <h1 className="text-3xl font-bold">GymGlow Privacy Choices</h1>

      <p className="text-sm text-muted-foreground">Last Updated: May 10, 2026</p>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Account and Data Deletion</h2>
        <p>
          If you can log in to GymGlow, you can delete your account from Settings.
          Account deletion removes your athlete profiles, analyses, session history,
          badges, challenge submissions, and competition activity from GymGlow systems.
        </p>
        <p>
          If you cannot log in, email us from the address connected to your account
          and request account deletion. We may ask for information needed to verify
          that you own the account before deleting it.
        </p>
        <p className="font-medium">support@gymglow.app</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Uploaded Videos</h2>
        <p>
          GymGlow uses uploaded videos only as temporary processing files for AI
          analysis. Videos are deleted after analysis completes or fails. GymGlow
          keeps the resulting scores, feedback, badge progress, and related activity
          records unless you delete the individual result or delete your account.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Individual Result Deletion</h2>
        <p>
          You can delete a saved analysis result from the athlete profile page. This
          removes the result and related analysis-based awards without deleting your
          whole account.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Billing Records</h2>
        <p>
          GymGlow attempts to cancel active billing during account deletion when
          possible. Payment records may remain with Stripe or other payment processors
          where required for legal, tax, fraud prevention, dispute, or payment
          compliance reasons.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Questions or Safety Reports</h2>
        <p>
          To report a privacy, safety, AI feedback, or content concern, contact us at:
        </p>
        <p className="font-medium">support@gymglow.app</p>
      </section>
    </div>
  );
}
