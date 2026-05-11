import React from 'react';
import '../style/InfoPages.css';

export default function PrivacyPage() {
  return (
    <div className="info-page">

      <div className="info-topbar">
        <button className="info-back-btn">←</button>

        <div className="info-topbar-title">
          Privacy Policy
        </div>
      </div>

      <div className="info-hero">
        <div className="info-hero-icon">
          🔒
        </div>

        <div className="info-hero-title">
          Your Privacy Matters
        </div>

        <div className="info-hero-desc">
          We respect your privacy and work to keep your identity protected
          while using Whispero Nepal.
        </div>
      </div>

      <div className="info-sections">

        <div className="info-sec">
          <div className="info-sec-head">
            <div className="info-sec-num">01</div>
            <div className="info-sec-label">Information We Collect</div>
          </div>

          <div className="info-sec-body open">
            <div className="info-sec-inner">
              <ul>
                <li>Anonymous posts and messages</li>
                <li>Uploaded media files</li>
                <li>Basic device/browser data</li>
                <li>Login information if required</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="info-sec">
          <div className="info-sec-head">
            <div className="info-sec-num">02</div>
            <div className="info-sec-label">How We Use Data</div>
          </div>

          <div className="info-sec-body open">
            <div className="info-sec-inner">
              <p>
                We use collected data to improve platform safety,
                performance, moderation, and user experience.
              </p>
            </div>
          </div>
        </div>

        <div className="info-sec">
          <div className="info-sec-head">
            <div className="info-sec-num">03</div>
            <div className="info-sec-label">Media Storage</div>
          </div>

          <div className="info-sec-body open">
            <div className="info-sec-inner">
              <p>
                Uploaded images and videos may be securely stored using
                third-party cloud storage providers such as Cloudinary.
              </p>

              <div className="info-note-box">
                Expired posts may be automatically removed after 24 hours.
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}