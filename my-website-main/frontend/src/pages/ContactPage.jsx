import '../style/InfoPages.css';

export default function ContactPage() {
  return (
    <div className="info-page">
      <div className="info-container">
        <h1>Contact Us</h1>

        <p>
          Thank you for using Whispero Nepal.
        </p>

        <p>
          We value community feedback and continuously work to improve
          the platform experience, safety, and performance.
        </p>

        <h2>Support & Assistance</h2>
        <p>
          If you experience technical issues, bugs, account problems,
          moderation concerns, or need general support, feel free to contact us.
        </p>

        <h2>Report Content</h2>
        <p>
          Users can report inappropriate posts, harassment, spam,
          fake activity, or violations of community guidelines directly
          through the platform moderation system.
        </p>

        <h2>Business & Partnership</h2>
        <p>
          For collaboration, partnership, media inquiries, or business-related
          communication, contact the Whispero Nepal team using the information below.
        </p>

        <div className="contact-box">
          <p>Email: support@whisperonepal.com</p>
          <p>Website: www.whisperonepal.com</p>
        </div>

        <h2>Response Time</h2>
        <p>
          We aim to respond to important inquiries as quickly as possible,
          though response times may vary depending on request volume.
        </p>

        <p>
          Thank you for being part of the Whispero Nepal community.
        </p>
      </div>
    </div>
  );
}