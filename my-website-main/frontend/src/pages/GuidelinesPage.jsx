import React from 'react';
import { Heart } from 'lucide-react';

const GUIDELINES = [
  {
    number: '01',
    title: 'Respect Others',
    content: [
      'Treat all users respectfully regardless of opinions, gender, religion, nationality, or background.',
      'Healthy discussions and disagreements are allowed, but personal attacks are not.',
      'Be mindful that real people are behind every account and message.'
    ]
  },
  {
    number: '02',
    title: 'No Harassment or Bullying',
    content: [
      'Do not threaten, harass, intimidate, or repeatedly target other users.',
      'Hate campaigns, coordinated attacks, stalking, and abusive behavior are strictly prohibited.',
      'Encouraging self-harm or emotional abuse toward others is forbidden.'
    ]
  },
  {
    number: '03',
    title: 'No Hate Speech',
    content: [
      'Content attacking people based on race, religion, ethnicity, gender, sexual orientation, disability, or nationality is not allowed.',
      'Extremist propaganda, violent ideologies, and discriminatory slurs are prohibited.',
      'We aim to maintain a safe and welcoming environment for everyone.'
    ]
  },
  {
    number: '04',
    title: 'Avoid Harmful Content',
    content: [
      'Do not share graphic violence, illegal activity, or dangerous material.',
      'Content promoting terrorism, criminal activity, or exploitation is strictly forbidden.',
      'Fake emergency information or intentionally misleading harmful content may result in account suspension.'
    ]
  },
  {
    number: '05',
    title: 'No Spam or Manipulation',
    content: [
      'Repeated unwanted messages, scams, advertisements, and spam are prohibited.',
      'Users may not manipulate engagement, flood rooms, or disrupt conversations intentionally.',
      'Bots or automated systems may not be used without permission.'
    ]
  },
  {
    number: '06',
    title: 'Privacy & Personal Information',
    content: [
      'Never share private personal information belonging to yourself or others.',
      'This includes addresses, passwords, banking information, phone numbers, IDs, or private photos.',
      'Doxxing or exposing someone’s identity without consent will result in severe moderation action.'
    ]
  },
  {
    number: '07',
    title: 'Anonymous Features',
    content: [
      'Anonymous participation exists to support open expression and comfort.',
      'Anonymous features must never be used for abuse, threats, harassment, or illegal behavior.',
      'Severe misuse of anonymity may result in permanent bans and internal security investigation.'
    ]
  },
  {
    number: '08',
    title: 'Room & Chat Conduct',
    content: [
      'Keep conversations healthy, respectful, and relevant to the room topic.',
      'Do not raid rooms, intentionally derail discussions, or provoke users for disruption.',
      'Room moderators and platform administrators may remove harmful content when necessary.'
    ]
  },
  {
    number: '09',
    title: 'Media & Upload Rules',
    content: [
      'Uploaded images or media must comply with platform safety standards.',
      'Illegal, exploitative, or non-consensual content is strictly prohibited.',
      'Users are responsible for the media they upload or share.'
    ]
  },
  {
    number: '10',
    title: 'Report Violations',
    content: [
      'Use reporting systems responsibly to help moderators maintain platform safety.',
      'False or malicious reports may themselves result in moderation action.',
      'If you encounter dangerous or illegal activity, report it immediately.'
    ]
  },
  {
    number: '11',
    title: 'Moderation & Enforcement',
    content: [
      'Moderators may remove content, mute users, suspend accounts, or permanently ban violators.',
      'Severe violations may bypass warnings entirely.',
      'Repeated violations increase the severity of enforcement actions.'
    ]
  },
  {
    number: '12',
    title: 'Platform Safety',
    content: [
      'We continuously work to improve platform security, moderation, and community protection.',
      'Users are encouraged to help create a positive environment through respectful participation.',
      'Whispero reserves the right to take action against activity that threatens community safety.'
    ]
  },
];

const GuidelinesPage = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        padding: '32px 20px 100px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 18,
            background: 'rgba(230,57,70,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
            border: '1px solid rgba(230,57,70,0.15)',
          }}
        >
          <Heart size={24} color="#E63946" fill="#E63946" />
        </div>

        <h1
          style={{
            color: '#fff',
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: '-1px',
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Keep The Community Safe
        </h1>

        <p
          style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: 16,
            marginTop: 14,
            lineHeight: 1.7,
            maxWidth: 700,
          }}
        >
          These guidelines help maintain a respectful, safe, and welcoming
          environment for everyone using Whispero. By participating in chats,
          rooms, and discussions, you agree to follow these community standards.
        </p>
      </div>

      {/* Guideline Cards */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {GUIDELINES.map((item) => (
          <div
            key={item.number}
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
                  color: '#E63946',
                  fontWeight: 700,
                  fontSize: 18,
                  minWidth: 30,
                }}
              >
                {item.number}
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
                {item.title}
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
              {item.content.map((line, index) => (
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
                      background: 'rgba(230,57,70,0.7)',
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
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div
        style={{
          marginTop: 40,
          padding: '24px 28px',
          borderRadius: 22,
          background: 'rgba(230,57,70,0.06)',
          border: '1px solid rgba(230,57,70,0.12)',
        }}
      >
        <h3
          style={{
            color: '#fff',
            fontSize: 20,
            margin: '0 0 12px',
          }}
        >
          Help Us Keep Whispero Safe
        </h3>

        <p
          style={{
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.8,
            margin: 0,
            fontSize: 15,
          }}
        >
          If you encounter harmful behavior, harassment, illegal activity,
          dangerous content, or abuse of anonymous features, please report it
          immediately. Community safety is a shared responsibility.
        </p>
      </div>
    </div>
  );
};

export default GuidelinesPage;