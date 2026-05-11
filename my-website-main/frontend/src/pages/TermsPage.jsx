import React from 'react';
import '../style/InfoPages.css';

export default function TermsPage() {
  return (
    <div className="info-page">

      <div className="info-topbar">
        <button className="info-back-btn">←</button>

        <div className="info-topbar-title">
          Terms & Conditions
        </div>
      </div>

      <div className="info-hero">
        <div className="info-hero-icon">
          📜
        </div>

        <div className="info-hero-title">
          Terms of Use
        </div>

        <div className="info-hero-desc">
          By using Whispero Nepal, you agree to follow these rules and
          community standards.
        </div>
      </div>

      <div className="info-sections">

        <div className="info-sec">
          <div className="info-sec-head">
            <div className="info-sec-num">01</div>
            <div className="info-sec-label">User Responsibility</div>
          </div>

          <div className="info-sec-body open">
            <div className="info-sec-inner">
              <ul>
                <li>No harassment or hate speech</li>
                <li>No illegal content</li>
                <li>No impersonation</li>
                <li>No spam or scams</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="info-sec">
          <div className="info-sec-head">
            <div className="info-sec-num">02</div>
            <div className="info-sec-label">Content Moderation</div>
          </div>

          <div className="info-sec-body open">
            <div className="info-sec-inner">
              <p>
                We reserve the right to remove posts or suspend accounts
                that violate our policies or harm the community.
              </p>
            </div>
          </div>
        </div>

        <div className="info-sec">
          <div className="info-sec-head">
            <div className="info-sec-num">03</div>
            <div className="info-sec-label">Platform Availability</div>
          </div>

          <div className="info-sec-body open">
            <div className="info-sec-inner">
              <p>
                Features and services may change or become unavailable
                temporarily due to maintenance or updates.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}