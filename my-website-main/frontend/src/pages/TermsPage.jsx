import React from 'react';
import { FileText } from 'lucide-react';

const TERMS_SECTIONS = [
  {
    number: '01',
    title: 'User Responsibilities',
    content: [
      'Users are responsible for all content they post, upload, or share on Whispero.',
      'Do not harass, threaten, bully, impersonate, or target other users.',
      'Spam, scams, misinformation, and manipulative behavior are prohibited.',
      'Users must comply with local laws while using the platform.',
      'Sharing illegal, harmful, or dangerous material is strictly forbidden.',
    ],
  },
  {
    number: '02',
    title: 'Community Conduct',
    content: [
      'Respect other users regardless of beliefs, opinions, identity, or background.',
      'Healthy discussions and disagreements are allowed when kept respectful.',
      'Hate speech, violent threats, extremist promotion, or abusive behavior are not allowed.',
      'Repeated toxic behavior may result in content removal or account restrictions.',
    ],
  },
  {
    number: '03',
    title: 'Anonymous Features',
    content: [
      'Certain features may allow anonymous participation or posting.',
      'Users must not misuse anonymity for harassment, threats, illegal activity, or spreading harmful content.',
      'Anonymous participation does not exempt users from moderation or platform rules.',
    ],
  },
  {
    number: '04',
    title: 'Content Moderation',
    content: [
      'We reserve the right to remove content that violates platform rules or harms community safety.',
      'Moderators may review reported content, rooms, posts, or user activity when necessary.',
      'Accounts or access may be suspended temporarily or permanently for serious violations.',
      'Moderation decisions are made to protect the health and safety of the community.',
    ],
    warning:
      'Severe violations involving threats, exploitation, illegal activity, or repeated abuse may result in immediate removal from the platform.',
  },
  {
    number: '05',
    title: 'Room & Chat Rules',
    content: [
      'Users joining rooms must follow all community standards and platform guidelines.',
      'Room creators or moderators may remove disruptive users when necessary.',
      'Temporary rooms, messages, or activity may expire automatically after a certain period.',
      'Do not share private personal information inside public chat rooms.',
    ],
  },
  {
    number: '06',
    title: 'Intellectual Property',
    content: [
      'Users retain ownership of content they create and upload.',
      'By posting content, users grant Whispero permission to display and distribute that content within the platform.',
      'Users must not upload copyrighted material they do not own or have permission to use.',
      'Trademark violations, piracy, or unauthorized redistribution are prohibited.',
    ],
  },
  {
    number: '07',
    title: 'Platform Availability',
    content: [
      'Features and services may change, improve, or become unavailable temporarily.',
      'Maintenance, security updates, or technical issues may occasionally interrupt service.',
      'We are not responsible for losses caused by outages, deleted content, or technical failures.',
    ],
  },
  {
    number: '08',
    title: 'Privacy & Data',
    content: [
      'Using Whispero also means accepting our Privacy Policy.',
      'Basic technical information may be collected to improve safety, moderation, and platform performance.',
      'Users should avoid sharing sensitive personal information publicly.',
    ],
  },
  {
    number: '09',
    title: 'Termination of Access',
    content: [
      'We reserve the right to suspend or terminate access to users who violate platform policies.',
      'Repeated abuse, illegal behavior, or attempts to harm the platform may result in permanent bans.',
      'Users may also stop using the platform at any time.',
    ],
  },
  {
    number: '10',
    title: 'Changes to Terms',
    content: [
      'These Terms may be updated periodically as the platform evolves.',
      'Continued use of Whispero after updates means users agree to the revised Terms.',
      'Users are encouraged to review the Terms regularly for updates or changes.',
    ],
  },
];

const TermsPage = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        padding: '32px 20px 100px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 34 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 18,
            background: 'rgba(239,159,39,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
            border: '1px solid rgba(239,159,39,0.16)',
          }}
        >
          <FileText size={24} color="#EF9F27" />
        </div>

        <h1
          style={{
            color: '#fff',
            fontSize: 42,
            fontWeight: 700,
            margin: 0,
            lineHeight: 1.1,
            letterSpacing: '-1px',
          }}
        >
          Terms of Use
        </h1>

        <p
          style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: 16,
            marginTop: 14,
            lineHeight: 1.7,
            maxWidth: 760,
          }}
        >
          By using Whispero Nepal, you agree to follow these rules,
          responsibilities, and community standards designed to keep the
          platform safe, respectful, and enjoyable for everyone.
        </p>
      </div>

      {/* Sections */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {TERMS_SECTIONS.map((section) => (
          <div
            key={section.number}
            style={{
              background: '#0A0A0A',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 24,
              padding: '26px 28px',
            }}
          >
            {/* Top */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                marginBottom: 18,
              }}
            >
              <span
                style={{
                  color: '#FF4D5A',
                  fontWeight: 700,
                  fontSize: 18,
                  minWidth: 30,
                }}
              >
                {section.number}
              </span>

              <h2
                style={{
                  color: '#fff',
                  fontSize: 24,
                  fontWeight: 600,
                  margin: 0,
                  letterSpacing: '-0.3px',
                }}
              >
                {section.title}
              </h2>
            </div>

            {/* Content */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {section.content.map((line, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'rgba(255,77,90,0.75)',
                      marginTop: 10,
                      flexShrink: 0,
                    }}
                  />

                  <p
                    style={{
                      color: 'rgba(255,255,255,0.62)',
                      fontSize: 15,
                      lineHeight: 1.8,
                      margin: 0,
                    }}
                  >
                    {line}
                  </p>
                </div>
              ))}
            </div>

            {/* Warning */}
            {section.warning && (
              <div
                style={{
                  marginTop: 22,
                  padding: '16px 18px',
                  borderRadius: 16,
                  background: 'rgba(230,57,70,0.12)',
                  border: '1px solid rgba(230,57,70,0.2)',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: '#FF8A93',
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  {section.warning}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 40,
          padding: '24px 28px',
          borderRadius: 22,
          background: 'rgba(239,159,39,0.08)',
          border: '1px solid rgba(239,159,39,0.14)',
        }}
      >
        <h3
          style={{
            color: '#fff',
            fontSize: 20,
            margin: '0 0 12px',
          }}
        >
          Agreement & Responsibility
        </h3>

        <p
          style={{
            color: 'rgba(255,255,255,0.62)',
            lineHeight: 1.8,
            margin: 0,
            fontSize: 15,
          }}
        >
          Our goal is to build a respectful anonymous community where users can
          safely express themselves. By continuing to use Whispero, users agree
          to behave responsibly and follow all platform rules and safety
          standards.
        </p>
      </div>
    </div>
  );
};

export default TermsPage;