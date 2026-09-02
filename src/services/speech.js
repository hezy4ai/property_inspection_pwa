/**
 * Mobile-Safe Speech-to-Text Voice Dictation Helper using Web Speech API
 * Configured specifically for Android Chrome and iOS Safari to prevent phrase repetition.
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

  // Mobile-safe settings: disable interim results to eliminate Android Chrome repetition loop
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.lang = lang;

  recognition.onresult = (event) => {
    let finalChunk = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      
      // Android Chrome workaround: filter out false "final" results with 0 confidence
      const isActuallyFinal = result.isFinal && (result[0].confidence > 0 || result[0].confidence === undefined);

      if (isActuallyFinal) {
        finalChunk += result[0].transcript + ' ';
      }
    }

    const cleanText = finalChunk.trim();
    if (cleanText && onResult) {
      onResult(cleanText);
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
