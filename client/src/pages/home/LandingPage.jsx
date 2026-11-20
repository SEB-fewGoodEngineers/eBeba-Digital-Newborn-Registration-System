import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import ChildCareOutlined from "@mui/icons-material/ChildCareOutlined";
import LocalHospitalOutlined from "@mui/icons-material/LocalHospitalOutlined";
import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";
import NotificationsNone from "@mui/icons-material/NotificationsNone";
import ArrowForward from "@mui/icons-material/ArrowForward";

const guides = {
  "/for-parents": {
    title: "For parents",
    summary: "Link your baby, submit an application and download available documents.",
    heading: "Register your baby’s birth",
    introduction: "Once the hospital records the birth, you can apply for registration and follow your baby’s documents from your parent dashboard.",
    icon: ChildCareOutlined,
    steps: [
      ["Find your birth record number", "Sign in and open your inbox. Look for the notification from the hospital with your baby’s birth record number."],
      ["Link your baby and apply", "If your baby is not on your dashboard yet, select “Link my baby” and enter the record number. Open the registration application, review the details and submit it."],
      ["Follow the decision", "Check your inbox for updates or a request for corrections. When the signed certificate is available, download it from your baby’s dashboard."],
    ],
    note: "Before you start", detail: "Have your parent account details and your baby’s birth record number ready.",
    action: "Create a parent account", to: "/sign-up",
  },
  "/for-hospitals": {
    title: "For hospitals",
    summary: "Record a birth and give families the details they need to apply.",
    heading: "Record a newborn’s birth",
    introduction: "Hospital staff create the birth record that a parent uses to start registration. Begin with the details recorded at delivery.",
    icon: LocalHospitalOutlined,
    steps: [
      ["Sign in as hospital staff", "Use your assigned hospital account. Open Birth records and select the option to record a birth."],
      ["Enter and review the details", "Complete the newborn and parent fields. Check the date and place of birth and the parent identifiers before saving."],
      ["Confirm the birth record number", "Open the saved record and check its number. The parent can use that number to link the baby and submit a registration application."],
    ],
    note: "Staff access", detail: "Use an account assigned to your hospital. If you need access, contact your project administrator.",
    action: "Hospital staff sign in", to: "/sign-in",
  },
  "/for-fzo": {
    title: "Health Insurance Fund (FZO)",
    summary: "Follow approved registrations through health insurance processing and card issuance.",
    heading: "Process a newborn’s health insurance",
    introduction: "After the Ministry approves a registration, the Health Insurance Fund handles the newborn’s insurance record.",
    icon: AssignmentOutlined,
    steps: [
      ["Sign in with your FZO account", "Use your assigned staff account to open the insurance workspace."],
      ["Review the insurance record", "Find the newborn’s record and check the registration details and current insurance status."],
      ["Follow card issuance", "Complete the insurance steps for the record. Parents can see their baby’s insurance status on the dashboard."],
    ],
    note: "Waiting for approval", detail: "If the record shows “Waiting for MoI”, the Ministry still needs to approve the birth registration.",
    action: "FZO staff sign in", to: "/sign-in",
  },
  "/for-ministry": {
    title: "Ministry of Interior (MoI)",
    summary: "Review applications, request corrections and issue signed birth certificates.",
    heading: "Review a birth registration",
    introduction: "Ministry officers review the family’s application and the hospital birth record before issuing a birth certificate.",
    icon: AccountBalanceOutlined,
    steps: [
      ["Open the review queue", "Sign in with your Ministry account and select a pending registration."],
      ["Check the application", "Review the newborn and parent details. If information needs correcting, return the application with a comment explaining the change."],
      ["Approve and sign", "Approve the completed registration and sign the certificate. The parent can download it once it is available on their dashboard."],
    ],
    note: "Previously approved applications", detail: "Open an approved registration to view its existing certificate.",
    action: "Ministry staff sign in", to: "/sign-in",
  },
};
const benefits = [
  [AssignmentOutlined, "Simple steps", "One application for your baby’s registration."],
  [ChildCareOutlined, "Parent access", "Find your baby’s records in one place."],
  [AccountBalanceOutlined, "Connected institutions", "Follow each institution’s decision."],
  [NotificationsNone, "Inbox updates", "See when your application needs attention."],
];

export default function LandingPage() {
  const { pathname, hash } = useLocation();
  const page = pathname.replace(/\/$/, "") || "/";
  const guide = guides[page];
  const GuideIcon = guide?.icon;
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return (
    <div className="eb-public">
      <header className="eb-header"><div className="eb-bar">
        <Link className="eb-brand" to="/" aria-label="eBeba home"><ChildCareOutlined /> eBeba</Link>
        <span className="eb-tag">Digital newborn<br />registration</span>
        <nav aria-label="Public navigation">
          {Object.entries({ "/": "Home", "/for-parents": "For parents", "/for-hospitals": "For hospitals", "/for-fzo": "FZO", "/for-ministry": "Ministry", "/#faq": "FAQs", "/#about": "About eBeba" }).map(([url, label]) =>
            <Link key={url} to={url} aria-current={page + hash === url ? "page" : undefined}>{label}</Link>)}
        </nav>
        <div className="eb-actions"><Link className="eb-btn outline" to="/sign-up">Create account</Link><Link className="eb-btn" to="/sign-in">Sign in</Link></div>
      </div></header>
      <main className="eb-wrap">
        {guide ? <>
          <section className={'eb-guide-intro ' + (page === "/for-hospitals" ? "hospital" : "")}>
            <Link to="/">← Home</Link>
            <p className="eb-role"><GuideIcon /> {guide.title}</p>
            <h1>{guide.heading}</h1><p>{guide.introduction}</p>
          </section>
          <div className="eb-guide-layout"><ol className="eb-steps">
            {guide.steps.map(([title, copy]) => <li key={title}><h2>{title}</h2><p>{copy}</p></li>)}
          </ol><aside><h2>{guide.note}</h2><p>{guide.detail}</p><Link className="eb-btn" to={guide.to}>{guide.action}</Link>
            {page === "/for-parents" && <Link className="eb-secondary" to="/sign-in">Already have an account? Sign in</Link>}
          </aside></div>
        </> : <>
          <section className="eb-intro">
            <div><h1>Register your newborn<br /><em>in one place.</em></h1>
              <p>eBeba connects families, hospitals and public institutions. Apply online and follow your baby’s registration from the first birth record to the signed certificate.</p>
              <div className="eb-actions"><Link className="eb-btn" to="/sign-up">Get started <ArrowForward /></Link><a className="eb-btn outline" href="#access">How it works</a></div>
            </div>
            <div className="eb-family" role="img" aria-label="Parents holding their newborn in hospital" />
          </section>
          <div className="eb-benefits">{benefits.map(([Icon, title, copy]) => <div key={title}><Icon /><div><strong>{title}</strong><p>{copy}</p></div></div>)}</div>
          <section id="access" className="eb-access"><h2>Choose how to access eBeba</h2>
            <div className="eb-cards">{Object.entries(guides).map(([url, item]) => {
              const Icon = item.icon;
              return <article key={url}><Icon /><div><h3>{item.title}</h3><p>{item.summary}</p><Link className="eb-btn" to={url} aria-label={'Learn more: ' + item.title}>Learn more <ArrowForward /></Link></div></article>;
            })}</div>
          </section>
          <section id="faq" className="eb-faq"><h2>Frequently asked questions</h2>
            <details><summary>Where do I find my baby’s birth record number?</summary><p>Check your parent inbox after the hospital records the birth. If you cannot find the number, ask the hospital to check the record.</p></details>
            <details><summary>When can I download the certificate?</summary><p>Open your baby’s dashboard after approval. The download becomes available once the certificate has been signed and issued.</p></details>
          </section>
        </>}
      </main>
      <footer id="about"><FavoriteBorder /> <strong>About eBeba</strong> <span>A newborn registration demonstration. All records are fictional.</span></footer>
    </div>
  );
}
