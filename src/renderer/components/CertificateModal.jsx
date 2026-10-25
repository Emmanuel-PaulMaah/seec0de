import React, { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Award, Download, Loader2 } from 'lucide-react';
import { Dialog } from './ui/dialog';

function certificateId(trackId) {
  return `SC-${String(trackId || 'course').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}-${Date.now().toString(36).toUpperCase()}`;
}

export default function CertificateModal({ open, onClose, track, lessons = [], profileName = 'Learner' }) {
  const cardRef = useRef(null);
  const [id, setId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const issued = new Date();

  useEffect(() => {
    if (!open || !track) return;
    setId(certificateId(track.id));
    setError(null);
  }, [open, track?.id]);

  const download = async () => {
    if (!cardRef.current || busy) return;
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#0b0f14',
      });
      const link = document.createElement('a');
      link.download = `seec0de-certificate-${String(track?.id || 'course')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      setError(err?.message || 'Could not create the certificate image.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="certificate-dialog"
      title="Course certificate"
      description="Your completion certificate is generated locally on this device."
      footer={(
        <>
          <button type="button" className="upgrade-secondary-btn" onClick={onClose}>Close</button>
          <button type="button" className="certificate-download" onClick={download} disabled={busy}>
            {busy ? <Loader2 size={13} className="upgrade-spin" /> : <Download size={13} />}
            {busy ? 'Creating PNG…' : 'Download PNG'}
          </button>
        </>
      )}
    >
      <div className="certificate-frame" ref={cardRef}>
        <div className="certificate-mark"><Award size={26} /></div>
        <div className="certificate-brand">seec0de</div>
        <div className="certificate-kicker">Certificate of Completion</div>
        <div className="certificate-name">{profileName || 'Learner'}</div>
        <p className="certificate-copy">has completed every lesson in</p>
        <div className="certificate-course">{track?.name || 'Course'}</div>
        <div className="certificate-meta">
          <span>{lessons.length} lessons completed</span>
          <span>{issued.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div className="certificate-foot">
          <span>{track?.language ? String(track.language).toUpperCase() : 'SEEC0DE'}</span>
          <span>{id}</span>
        </div>
      </div>
      {error && <p role="alert" className="certificate-error">{error}</p>}
    </Dialog>
  );
}
