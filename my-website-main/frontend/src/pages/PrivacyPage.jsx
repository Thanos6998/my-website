import React from 'react';
import { ShieldAlert } from 'lucide-react';

const PRIVACY_SECTIONS = [
  {
    number: '01',
    title: 'Information We Collect',
    content: [
      'Anonymous posts, room messages, and shared content.',
      'Uploaded media such as images and attachments.',
      'Basic device, browser, and connection information.',
      'Account or login information where applicable.',
      'Usage activity used to improve platform performance and safety.',
    ],
  },
  {
    number: '02',
    title: 'How We Use Data',
    content: [
      'We use collected information to operate and improve Whispero.',
      'Data helps us maintain moderation, platform security, and abuse prevention.',
      'Analytics may be used to improve user experience and platform reliability.',
      'We may review reported content to investigate policy violations.',
    ],
  },
  {
    number: '03',
    title: 'Anonymous Features',
    content: [
      'Whispero supports anonymous participation in certain areas of the platform.',
      'Anonymous features are designed to encourage open communication and comfort.',
      'Users should not assume absolute anonymity in cases involving abuse, threats, illegal activity, or platform security investigations.',
    ],
  },
  {
    number: '04',
    title: 'Media Storage',
    content: [
      'Uploaded images and media may be stored securely using third-party cloud providers.',
      'Media uploads may be compressed, optimized, or moderated for platform safety.',
      'Certain temporary or expired content may be automatically removed after a defined period.',
    ],
    warning:
      'Expired posts, temporary rooms, or inactive content may be automatically deleted after a certain time.',
  },
  {
    number: '05',
    title: 'Cookies & Analytics',
    content: [
      'Cookies and similar technologies may be used to improve user experience.',
      'These tools help maintain sessions, remember preferences, and analyze traffic.',
      'Users may disable cookies through browser settings, though some features may stop functioning properly.',
    ],
  },
  {
    number: '06',
    title: 'Data Protection & Security',
    content: [
      'We implement reasonable security measures to help protect user information.',
      'Security systems are used to reduce spam, abuse, unauthorized access, and malicious activity.',
      'No online service can guarantee complete security, and users should also take precautions to protect their accounts.',
    ],
  },
  {
    number: '07',
    title: 'Sharing of Information',
    content: [
      'We do not sell personal information to advertisers or third parties.',
      'Limited information may be shared with trusted infrastructure or hosting providers necessary to operate the platform.',
      'Information may also be disclosed when legally required or necessary to protect users and platform safety.',
    ],
  },
  {
    number: '08',
    title: 'User Responsibilities',
    content: [
      'Users are responsible for the content they share, upload, or post.',
      'Do not share passwords, financial information, government IDs, or sensitive personal details.',
      'Users should avoid posting private information publicly inside rooms or conversations.',
    ],
  },
  {
    number: '09',
    title: 'Children’s Privacy',
    content: [
      'Whispero is not intended for children under the minimum legal age required in their country.',
      'If unauthorized underage usage is discovered, associated accounts or data may be removed.',
      'Parents or guardians may contact us regarding safety concerns involving minors.',
    ],
  },
  {
    number: '10',
    title: 'Policy Updates',
    content: [
      'This Privacy Policy may be updated periodically as the platform evolves.',
      'Major changes may be reflected through updated notices or revised policy dates.',
      'Continued use of Whispero after updates means users accept the revised policy.',
    ],
  },
];

const PrivacyPage = () => {
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
          <ShieldAlert size={24} color="#EF9F27" />
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
          Your Privacy Matters
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
          We respect your privacy and work to keep your identity protected while
          using Whispero. This page explains how information may be collected,
          used, stored, and protected while using our platform and community
          features.
        </p>
      </div>

      {/* Cards */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {PRIVACY_SECTIONS.map((section) => (
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

            {/* Warning Box */}
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

      {/* Footer Notice */}
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
          Privacy & Safety Commitment
        </h3>

        <p
          style={{
            color: 'rgba(255,255,255,0.62)',
            lineHeight: 1.8,
            margin: 0,
            fontSize: 15,
          }}
        >
          We continuously work to improve privacy protection, moderation
          systems, and platform security. Users are encouraged to use Whispero
          responsibly and avoid sharing sensitive personal information publicly.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPage;