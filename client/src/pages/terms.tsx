export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <h1 className="text-3xl font-bold">GymGlow Terms & Conditions</h1>

      <p className="text-sm text-muted-foreground">
        Last Updated: {new Date().toLocaleDateString()}
      </p>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
        <p>
          By accessing or using GymGlow ("the Platform"), you agree to be bound by
          these Terms & Conditions. If you do not agree, you may not use the
          Platform.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Description of Service</h2>
        <p>
          GymGlow provides tools for tracking athletic progress, uploading videos,
          participating in challenges, earning digital badges, and receiving AI-powered
          feedback for youth sports development.
        </p>
        <p>
          GymGlow is not affiliated with USA Gymnastics or any official governing body.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. Eligibility</h2>
        <p>
          GymGlow is intended for use by parents, guardians, coaches, and athletes
          under supervision. Users under 18 must have parental or guardian consent.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. User Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account
          credentials and for all activities that occur under your account.
        </p>
        <p>
          You agree to provide accurate information when creating athlete profiles.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Video Uploads & Content</h2>
        <p>
          By uploading content, you confirm that you have the legal right to share
          the video and that it does not infringe on the rights of others.
        </p>
        <p>
          You retain ownership of your uploaded content. By uploading, you grant
          GymGlow a limited license to temporarily process and analyze the content
          solely for providing Platform services.
        </p>
        <p>
          Uploaded videos are deleted after analysis completes or fails. GymGlow
          may keep the resulting scores, feedback, challenge results, badges,
          and activity records in your account.
        </p>
        <p>
          GymGlow reserves the right to remove content that violates community
          standards or applicable laws.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">6. AI Analysis Disclaimer</h2>
        <p>
          AI-generated feedback is provided for informational and educational
          purposes only. It does not constitute official judging, coaching,
          medical advice, or safety clearance.
        </p>
        <p>
          Users are responsible for consulting qualified coaches or professionals
          for official scoring, training decisions, and injury prevention.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">7. Subscriptions & Billing</h2>
        <p>
          Certain features require a paid subscription. By subscribing, you agree
          to recurring billing through our payment processor (e.g., Stripe).
        </p>
        <p>
          Subscriptions automatically renew unless canceled before the renewal
          date. You may manage or cancel your subscription at any time through
          your account settings.
        </p>
        <p>
          All payments are non-refundable unless required by law.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">8. Challenges & Badges</h2>
        <p>
          Challenge participation, badge awards, and scoring are determined by
          system rules and AI evaluation logic. GymGlow does not guarantee
          competitive placement or official competition results.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">9. Limitation of Liability</h2>
        <p>
          GymGlow is provided "as is" without warranties of any kind.
        </p>
        <p>
          GymGlow and its operators are not liable for injuries, damages,
          competition outcomes, data loss, or other consequences resulting
          from use of the Platform.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">10. Account Termination</h2>
        <p>
          We reserve the right to suspend or terminate accounts that violate
          these terms or misuse the Platform.
        </p>
        <p>
          You may delete your account from the Settings page. Account deletion
          removes your app data from GymGlow, while billing records may remain
          with payment processors where legally or operationally required.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">11. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the
          Platform after changes constitutes acceptance of the updated Terms.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">12. Contact</h2>
        <p>
          For questions regarding these Terms, contact:
        </p>
        <p className="font-medium">support@gymglow.app</p>
      </section>
    </div>
  );
}
