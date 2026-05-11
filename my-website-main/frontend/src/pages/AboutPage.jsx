import React from 'react';
import '../style/InfoPages.css';

export default function AboutPage() {
  return (
    <div className="info-page">

      <div className="info-topbar">
        <button className="info-back-btn">←</button>

        <div className="info-topbar-title">
          About Us
        </div>
      </div>

      <div className="info-hero">
        <div className="info-hero-icon">
          🔥
        </div>

        <div className="info-hero-title">
          Welcome to Whispero Nepal
        </div>

        <div className="info-hero-desc">
          Whispero Nepal is an anonymous social platform where people can
          freely share confessions, thoughts, emotions, stories, and connect
          with strangers without revealing their identity.
        </div>
      </div>

      <div className="info-sections">

        <div className="info-sec">
          <div className="info-sec-head">
            <div className="info-sec-num">01</div>
            <div className="info-sec-label">Our Mission</div>
          </div>

          <div className="info-sec-body open">
            <div className="info-sec-inner">
              <p>
                Our mission is to create a safe and modern anonymous space
                where people can express themselves honestly without fear
                of judgement. We believe everyone deserves a voice.
              </p>
            </div>
          </div>
        </div>

        <div className="info-sec">
          <div className="info-sec-head">
            <div className="info-sec-num">02</div>
            <div className="info-sec-label">What You Can Do</div>
          </div>

          <div className="info-sec-body open">
            <div className="info-sec-inner">
              <ul>
                <li>Post anonymous confessions</li>
                <li>Upload photos and videos</li>
                <li>Chat randomly with strangers</li>
                <li>React and comment on posts</li>
                <li>Explore trending confessions</li>
                <li>Connect with people safely</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="info-sec">
          <div className="info-sec-head">
            <div className="info-sec-num">03</div>
            <div className="info-sec-label">Community</div>
          </div>

          <div className="info-sec-body open">
            <div className="info-sec-inner">
              <p>
                Whispero Nepal is built for respectful conversations and
                emotional freedom. We encourage positivity, support,
                understanding, and responsible use of anonymity.
              </p>

              <div className="info-note-box">
                Anonymous does not mean harmful. Respect every user.
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}