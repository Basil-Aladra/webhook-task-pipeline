import { useEffect, useMemo, useRef } from "react";
import { LogEntry } from "../../hooks/useDashboard";

type NotificationSoundMonitorProps = {
  notifications: LogEntry[];
  soundEnabled: boolean;
};

function isHighSeverity(entry: LogEntry): boolean {
  return entry.level === "error";
}

function playFallbackTone(): void {
  const AudioContextCtor = window.AudioContext || (window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  }).webkitAudioContext;

  if (!AudioContextCtor) {
    return;
  }

  const audioContext = new AudioContextCtor();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.value = 880;
  gain.gain.value = 0.04;

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
  oscillator.stop(audioContext.currentTime + 0.18);

  window.setTimeout(() => {
    void audioContext.close();
  }, 250);
}

async function playAlertSound(audioElement: HTMLAudioElement): Promise<void> {
  audioElement.currentTime = 0;

  try {
    await audioElement.play();
    return;
  } catch {
    playFallbackTone();
  }
}

export function NotificationSoundMonitor({
  notifications,
  soundEnabled,
}: NotificationSoundMonitorProps): null {
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const latestHighSeverityIdRef = useRef<string | null>(null);
  const hasHydratedRef = useRef(false);

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
      ),
    [notifications],
  );

  useEffect(() => {
    const audio = new Audio("/alert.wav");
    audio.preload = "auto";
    alertAudioRef.current = audio;

    return () => {
      audio.pause();
      alertAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const latestHighSeverityNotification = sortedNotifications.find((entry) => isHighSeverity(entry));

    if (!latestHighSeverityNotification) {
      return;
    }

    if (!hasHydratedRef.current) {
      latestHighSeverityIdRef.current = latestHighSeverityNotification.id;
      hasHydratedRef.current = true;
      return;
    }

    if (
      soundEnabled &&
      latestHighSeverityIdRef.current !== latestHighSeverityNotification.id &&
      alertAudioRef.current
    ) {
      void playAlertSound(alertAudioRef.current);
    }

    latestHighSeverityIdRef.current = latestHighSeverityNotification.id;
  }, [sortedNotifications, soundEnabled]);

  return null;
}
