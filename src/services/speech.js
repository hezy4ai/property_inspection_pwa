/**
 * Speech-to-Text Voice Dictation Helper using Native Web Speech API
 * Robust single-stream engine for Mobile (Android Chrome / iOS Safari) and Desktop.
 */

export function isSpeechRecognitionSupported() {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

export function createSpeechRecognizer({ onResult, onError, onEnd, lang = 'en-US' } = {}) {
  if (!isSpeechRecognitionSupported()) {
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang;

  recognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';

    // Reconstruct the exact live transcript from event.results on every tick
    for (let i = 0; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    const liveText = (finalTranscript + interimTranscript).trim();

    if (onResult) {
      onResult({
        final: finalTranscript.trim(),
        interim: interimTranscript.trim(),
        full: liveText
      });
    }
  };

  recognition.onerror = (event) => {
    console.warn('[Speech Engine] Recognition error:', event.error);
    if (onError) {
      onError(event.error);
    }
  };

  recognition.onend = () => {
    if (onEnd) {
      onEnd();
    }
  };

  return recognition;
}
