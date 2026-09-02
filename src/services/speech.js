/**
 * Speech-to-Text Voice Dictation Helper using Native Web Speech API
 * Optimized for Mobile (Android Chrome / iOS Safari) and Desktop browsers.
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

  // Session-level accumulator to prevent duplicate phrases across mobile resultIndex ticks
  let accumulatedFinal = '';

  recognition.onresult = (event) => {
    let currentInterim = '';

    // Only iterate from event.resultIndex to process new items and avoid re-reading past chunks
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const result = event.results[i];
      if (result.isFinal) {
        accumulatedFinal += result[0].transcript + ' ';
      } else {
        currentInterim += result[0].transcript;
      }
    }

    if (onResult) {
      onResult({
        final: accumulatedFinal.trim(),
        interim: currentInterim.trim(),
        full: [accumulatedFinal.trim(), currentInterim.trim()].filter(Boolean).join(' ')
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
