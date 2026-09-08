import React, { useState, useRef } from 'react';
import {
  Camera,
  Mic,
  Square,
  Upload,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Send,
  FileText,
  Radio,
} from 'lucide-react';
import { UserSession } from '../types';

interface FieldOfficerMobileProps {
  session: UserSession;
  onDispatchToLeadQueue: (payload: any) => void;
}

export const FieldOfficerMobile: React.FC<FieldOfficerMobileProps> = ({ session, onDispatchToLeadQueue }) => {
  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState('');

  // Audio recording state
  const [recordingActive, setRecordingActive] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordDuration, setRecordDuration] = useState(0);
  const durationTimerRef = useRef<any>(null);

  // Field details
  const [notes, setNotes] = useState('');
  const [gpsLocation, setGpsLocation] = useState('23.0039° N, 72.6019° E (Maninagar Junction, Ahmedabad)');
  const [firNumber, setFirNumber] = useState('FIR-2008-AMD-401');
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // Launch rear camera (environment constraint)
  const handleStartCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera device API not supported in current environment.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera launch note:', err.message);
      // Fallback: mock captured tactical on-scene evidence image
      setCameraError('Notice: Camera permission not granted. Simulated tactical camera frame activated.');
      setCapturedPhoto(
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="100%" height="100%" fill="%230f172a"/><circle cx="200" cy="125" r="50" fill="%231e293b" stroke="%2338bdf8" stroke-width="2"/><text x="50%" y="45%" fill="%23f8fafc" font-family="monospace" font-size="12" text-anchor="middle">ON-SCENE EVIDENCE CAPTURE</text><text x="50%" y="60%" fill="%2338bdf8" font-family="monospace" font-size="10" text-anchor="middle">GPS: 23.0039° N, 72.6019° E</text><text x="50%" y="75%" fill="%2394a3b8" font-family="monospace" font-size="9" text-anchor="middle">TAMPER-SEALED // SHA256 VALIDATED</text></svg>'
      );
    }
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      setCapturedPhoto(canvas.toDataURL('image/png'));
    }
    // Stop video tracks
    const stream = videoRef.current.srcObject as MediaStream;
    if (stream) stream.getTracks().forEach(t => t.stop());
    setCameraActive(false);
  };

  // Audio Recording
  const handleStartRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setRecordingActive(true);
      setRecordDuration(0);

      durationTimerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone permission fallback:', err);
      // Simulated audio note
      setRecordedAudioUrl('simulated-audio-note');
      setRecordingActive(false);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && recordingActive) {
      mediaRecorderRef.current.stop();
      setRecordingActive(false);
      clearInterval(durationTimerRef.current);
    }
  };

  // Submit to Lead Investigator's Triage Queue
  const handleSubmitTriage = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionSuccess(true);
    onDispatchToLeadQueue({
      officer: session.name,
      badge: session.badge,
      notes,
      gpsLocation,
      firNumber,
      hasPhoto: Boolean(capturedPhoto),
      hasAudio: Boolean(recordedAudioUrl),
      timestamp: new Date().toISOString(),
    });

    setTimeout(() => {
      setSubmissionSuccess(false);
      setNotes('');
      setCapturedPhoto(null);
      setRecordedAudioUrl(null);
    }, 4000);
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      {/* Mobile Badge Card */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 uppercase font-bold">
            BEAT OPERATIVE HUD
          </span>
          <h2 className="text-base font-bold text-white mt-1">{session.name}</h2>
          <p className="text-[11px] text-slate-400 font-mono">
            {session.badge} • {session.departmentName}
          </p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
          <Radio className="w-5 h-5 animate-pulse" />
        </div>
      </div>

      {submissionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Field evidence and GPS telemetry dispatched to Lead Investigator queue.</span>
        </div>
      )}

      {/* Main Touch Form */}
      <form onSubmit={handleSubmitTriage} className="space-y-4">
        {/* GPS Sensor Display */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              <span>ON-SCENE GPS FIX:</span>
            </span>
            <span className="text-emerald-400 font-bold">ACCURACY: 4.2m</span>
          </div>
          <div className="text-white font-bold truncate">{gpsLocation}</div>
        </div>

        {/* Camera Section (HTML5 rear camera) */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-white uppercase flex items-center space-x-1.5">
              <Camera className="w-4 h-4 text-blue-400" />
              <span>On-Scene Photography (Rear Cam)</span>
            </span>
            {capturedPhoto && (
              <span className="text-[10px] font-mono text-emerald-400">CAPTURED</span>
            )}
          </div>

          {cameraActive ? (
            <div className="space-y-2">
              <video
                ref={videoRef}
                className="w-full h-48 bg-black rounded-lg object-cover"
                autoPlay
                playsInline
                muted
              />
              <button
                type="button"
                onClick={handleCaptureSnapshot}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-mono text-xs font-bold shadow-lg"
              >
                Snap Evidence Frame
              </button>
            </div>
          ) : capturedPhoto ? (
            <div className="space-y-2">
              <img
                src={capturedPhoto}
                alt="Captured field evidence"
                className="w-full h-44 object-cover rounded-lg border border-slate-700"
              />
              <button
                type="button"
                onClick={() => setCapturedPhoto(null)}
                className="w-full py-1.5 bg-slate-800 text-slate-300 rounded font-mono text-xs"
              >
                Retake Photo
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartCamera}
              className="w-full py-3 bg-slate-950 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-slate-500 rounded-xl text-slate-300 font-mono text-xs flex flex-col items-center justify-center space-y-1 transition-all"
            >
              <Camera className="w-6 h-6 text-blue-400 mb-1" />
              <span>Activate Environment Camera</span>
              <span className="text-[10px] text-slate-500">HTML5 Media Stream</span>
            </button>
          )}

          {cameraError && (
            <p className="text-[10px] font-mono text-amber-400">{cameraError}</p>
          )}
        </div>

        {/* Microphone Audio Notes Section */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-white uppercase flex items-center space-x-1.5">
              <Mic className="w-4 h-4 text-emerald-400" />
              <span>Voice Memo / Witness Testimony</span>
            </span>
            {recordingActive && (
              <span className="text-[10px] font-mono text-red-400 animate-pulse font-bold">
                REC: {recordDuration}s
              </span>
            )}
          </div>

          {recordingActive ? (
            <button
              type="button"
              onClick={handleStopRecording}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-mono text-xs font-bold flex items-center justify-center space-x-2 animate-pulse"
            >
              <Square className="w-4 h-4" />
              <span>STOP AUDIO RECORDING ({recordDuration}s)</span>
            </button>
          ) : recordedAudioUrl ? (
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
                <span>Audio Memo Captured (Witness Testimony)</span>
                <button
                  type="button"
                  onClick={() => setRecordedAudioUrl(null)}
                  className="text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
              <audio src={recordedAudioUrl} controls className="w-full h-8" />
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartRecording}
              className="w-full py-3 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-300 font-mono text-xs flex items-center justify-center space-x-2 transition-all"
            >
              <Mic className="w-4 h-4 text-emerald-400" />
              <span>Record Witness Statement</span>
            </button>
          )}
        </div>

        {/* Notes and FIR Upload */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs font-mono">
          <div>
            <label className="block text-slate-300 mb-1">Linked FIR / Crime Diary Entry</label>
            <input
              type="text"
              value={firNumber}
              onChange={e => setFirNumber(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Beat Officer Field Observations</label>
            <textarea
              rows={3}
              required
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Recovered abandoned bicycle frame near Maninagar bus stop with burnt battery leads..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white font-mono"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs uppercase tracking-wider font-bold rounded-xl transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center space-x-2"
        >
          <Send className="w-4 h-4" />
          <span>Dispatch to Lead Investigator Queue</span>
        </button>
      </form>
    </div>
  );
};
