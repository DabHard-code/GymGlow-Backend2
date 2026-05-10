export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <h1 className="text-3xl font-bold">GymGlow Privacy Policy</h1>

      <p className="text-sm text-muted-foreground">
        Last Updated: May 10, 2026
      </p>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Overview</h2>
        <p>
          GymGlow ("we", "our", or "us") is committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, and safeguard your information
          when you use the GymGlow platform.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Information We Collect</h2>
        <p>We may collect the following types of information:</p>
        <ul className="list-disc ml-6 text-sm space-y-1">
          <li>Account information (username, email, user ID)</li>
          <li>Athlete profile data (name, level, sport)</li>
          <li>Temporary uploaded videos for AI processing</li>
          <li>Challenge submissions and scores</li>
          <li>Subscription and billing status (processed via Stripe)</li>
          <li>Basic technical information (device type, browser, IP address)</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. Children's Privacy</h2>
        <p>
          GymGlow is designed for use by parents, guardians, and coaches managing
          athlete profiles. We do not knowingly collect personal information directly
          from children under 13 without parental involvement.
        </p>
        <p>
          Parents or guardians are responsible for managing athlete profiles and
          uploaded content. Videos should only be uploaded by someone who has the
          right and permission to share them for analysis.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. How We Use Information</h2>
        <p>We use collected information to:</p>
        <ul className="list-disc ml-6 text-sm space-y-1">
          <li>Provide skill tracking and challenge features</li>
          <li>Generate AI-based performance feedback</li>
          <li>Operate leaderboards and badge systems</li>
          <li>Process subscriptions and billing</li>
          <li>Improve platform functionality and performance</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. AI Processing</h2>
        <p>
          Uploaded videos may be analyzed using artificial intelligence systems
          to generate skill feedback and scoring insights. AI outputs are automated
          estimates and not official judging decisions.
        </p>
        <p>
          Videos are used for processing and are deleted after analysis completes
          or fails. GymGlow keeps the resulting scores, feedback, badge progress,
          and related activity records.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">6. Data Storage & Security</h2>
        <p>
          We use secure third-party providers (such as Supabase and Stripe)
          to store data and process payments. We implement reasonable safeguards
          to protect user information.
        </p>
        <p>
          Uploaded videos are not retained for playback or history after AI
          processing. Analysis results and account records may remain available
          in your account unless deleted according to account settings or support
          processes.
        </p>
        <p>
          No system is 100% secure, but we strive to protect your data using
          industry-standard practices.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">7. Data Sharing</h2>
        <p>
          We do not sell personal information.
        </p>
        <p>
          Information may be shared only with trusted service providers necessary
          to operate the platform, such as hosting, authentication, AI processing,
          storage, and payment providers.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">8. Account Deletion</h2>
        <p>
          Users may delete their account and associated app data from the
          Settings page. This removes athlete profiles, analyses, session
          history, badges, challenge submissions, and competition activity from
          GymGlow systems.
        </p>
        <p>
          Users may also delete individual analysis results from the athlete
          profile page without deleting the whole account.
        </p>
        <p>
          If you cannot log in, visit{" "}
          <a className="underline" href="/privacy-choices">
            Privacy Choices
          </a>{" "}
          for account and data deletion request instructions.
        </p>
        <p>
          Billing records may remain with payment processors where required for
          legal, tax, fraud prevention, or payment compliance reasons.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">9. Updates to This Policy</h2>
        <p>
          We may update this Privacy Policy periodically. Continued use of
          GymGlow after updates constitutes acceptance of the revised policy.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">10. Contact</h2>
        <p>
          For privacy-related questions, contact:
        </p>
        <p className="font-medium">support@gymglow.app</p>
      </section>
    </div>
  );
}
