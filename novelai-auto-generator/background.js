// background.js
// Handles downloads and relays progress/messages between popup and content

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request?.type === 'DOWNLOAD_IMAGE') {
    const { imageUrl, characterName = 'default', index = 0 } = request;
    const filename = `NovelAI/${characterName}/image_${Date.now()}_${index}.png`;

    chrome.downloads.download(
      {
        url: imageUrl,
        filename,
        saveAs: false,
        conflictAction: 'uniquify'
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download error:', chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        console.log(`Downloaded: ${filename} (id=${downloadId})`);
        sendResponse({ success: true, downloadId, filename });
      }
    );

    return true; // keep channel open for async sendResponse
  }

  if (request?.type === 'GENERATION_PROGRESS' || request?.type === 'GENERATION_COMPLETE' || request?.type === 'GENERATION_ERROR') {
    // Relay to popup
    chrome.runtime.sendMessage(request);
    sendResponse({ ok: true });
    return true;
  }
});
