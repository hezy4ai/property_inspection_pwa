/**
 * Native Mobile & Desktop PDF Downloader & Sharer
 * Triggers direct binary file download to device storage and native Web Share API.
 */

export async function downloadPdfToDevice(pdfUrl, fileName = 'Inspection_Report.pdf') {
  if (!pdfUrl) return;

  try {
    const response = await fetch(pdfUrl);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 2000);
  } catch (err) {
    console.warn('[PDF Downloader] Direct blob download fallback:', err);
    window.open(pdfUrl, '_blank');
  }
}

export async function shareOrOpenPdf(pdfUrl, title = 'Inspection Report') {
  if (!pdfUrl) return;

  // If Web Share API supports file sharing
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const file = new File([blob], `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`, {
        type: 'application/pdf'
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: title,
          text: `Official Property Inspection Certificate for ${title}`,
          files: [file]
        });
        return;
      } else {
        await navigator.share({
          title: title,
          url: pdfUrl
        });
        return;
      }
    } catch (shareErr) {
      if (shareErr.name !== 'AbortError') {
        console.warn('[PDF Sharer] Web Share fallback:', shareErr);
        window.open(pdfUrl, '_blank');
      }
      return;
    }
  }

  // Fallback for browsers without share API
  window.open(pdfUrl, '_blank');
}
