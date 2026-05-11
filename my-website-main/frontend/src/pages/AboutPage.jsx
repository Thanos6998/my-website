import React from 'react';
import '../style/InfoPages.css';

export default function AboutPage() {
  return (
    <div className="info-page">
      <div className="info-container">
        <h1>About Whisper Nepal</h1>

        <p>
          Whisper Nepal is an anonymous social platform created for people to
          freely express thoughts, feelings, confessions, experiences, and
          emotions without revealing their identity.
        </p>

        <p>
          Our mission is to create a safe digital space where anyone can speak
          honestly without fear of judgment. Whether you want to share secrets,
          stories, personal struggles, funny moments, or life experiences,
          Whisper Nepal gives you a voice.
        </p>

        <h2>What You Can Do</h2>

        <ul>
          <li>Post anonymous confessions</li>
          <li>React and interact with posts</li>
          <li>Join random stranger chats</li>
          <li>Explore trending discussions</li>
          <li>Connect freely without revealing identity</li>
        </ul>

        <h2>Our Vision</h2>

        <p>
          We believe everyone deserves a place where they can express themselves
          openly. Whisper Nepal is designed to encourage honesty, emotional
          release, entertainment, and community interaction while protecting
          user privacy.
        </p>

        <h2>Privacy First</h2>

        <p>
          We do not encourage sharing personal information publicly. Your safety,
          anonymity, and comfort are important to us.
        </p>

        <h2>Community Driven</h2>

        <p>
          Whisper Nepal grows through its users. Every confession, reaction,
          discussion, and interaction helps build an engaging anonymous
          community for everyone.
        </p>

        <p>
          Thank you for being part of Whisper Nepal.
        </p>
      </div>
    </div>
  );
}