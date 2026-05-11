import React from 'react';
import '../style/InfoPages.css';

export default function GuidelinesPage() {
  return (
    <div className="info-page">

      <div className="info-topbar">
        <button className="info-back-btn">←</button>

        <div className="info-topbar-title">
          Community Guidelines
        </div>
      </div>

      <div className="info-hero">
        <div className="info-hero-icon">
          ❤️
        </div>

        <div className="info-hero-title">
          Keep The Community Safe
        </div>

        <div className="info-hero-desc">
          These guidelines help maintain a respectful and healthy
          environment for everyone.
        </div>
      </div>

      <div className="info-sections">

        <div className="info-sec">
          <div className="info-sec-head">
            <div className="info-sec-num">01</div>
            <div className="info-sec-label">Respect Others</div>
          </div>

          <div className="info-sec-body open">
            <div className="info-sec-inner">
              <p>
                Treat all users respectfully regardless of opinions,
                gender, religion, or background.
              </p>
            </div>
          </div>
        </div>

        <div className="info-sec">
          <div className="info-sec-head">
            <div className="info-sec-num">02</div>
            <div className="info-sec-label">Avoid Harmful Content</div>
          </div>

          <div className="info-sec-body open">
            <div className="info-sec-inner">
              <ul>
                <li>No bullying or threats</li>
                <li>No explicit violence</li>
                <li>No illegal activity</li>
                <li>No fake information</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="info-sec">
          <div className="info-sec-head">
            <div className="info-sec-num">03</div>
            <div className="info-sec-label">Report Violations</div>
          </div>

          <div className="info-sec-body open">
            <div className="info-sec-inner">
              <p>
                Use reporting features to help moderators keep the
                platform clean and safe.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}