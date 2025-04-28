async function transcribeAudio() {
  const fileInput = document.getElementById('audioFile');
  const file = fileInput.files[0];
  if (!file) {
    alert('Please select an audio file!');
    return;
  }

  // 1. Upload the audio file to AssemblyAI
  const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      authorization: 'a1b381ccd87f469b9ea60f78b02ece0c'
    },
    body: file
  });

  const uploadData = await uploadResponse.json();
  const audioUrl = uploadData.upload_url;

  // 2. Start transcription request
  const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      authorization: 'a1b381ccd87f469b9ea60f78b02ece0c',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true,
      punctuate: true,
      format_text: true
    })
  });

  const transcriptData = await transcriptResponse.json();
  const transcriptId = transcriptData.id;

  // 3. Polling to check when transcription is ready
  let completed = false;
  let transcriptText = '';
  let wordCount = 0;
  while (!completed) {
    const checkResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: { authorization: 'a1b381ccd87f469b9ea60f78b02ece0c' }
    });
    const checkData = await checkResponse.json();

    if (checkData.status === 'completed') {
      completed = true;
      if (checkData.utterances) {
        let conversation = '';
        wordCount = 0;

        // 🔥 Smart Speaker Detection
        let speakerMap = {};
        checkData.utterances.slice(0, 5).forEach(utt => {
          const lowerText = utt.text.toLowerCase();
          if (lowerText.includes('thank you for calling') || lowerText.includes('how can i help')) {
            speakerMap[utt.speaker] = "Agent";
          } else if (lowerText.includes('i bought') || lowerText.includes('i need to return')) {
            speakerMap[utt.speaker] = "Customer";
          }
        });

        checkData.utterances.forEach(utt => {
          const speaker = speakerMap[utt.speaker] || (utt.speaker === 0 ? "Agent" : "Customer");
          conversation += `${speaker}: ${utt.text.trim()}\n`;
          wordCount += utt.text.split(' ').length;
        });

        transcriptText = conversation.trim();
        document.getElementById('outputText').value = transcriptText;
      } else {
        transcriptText = checkData.text;
        wordCount = transcriptText.split(' ').length;
        document.getElementById('outputText').value = transcriptText;
      }

      // Save for QA later
      window.latestTranscript = transcriptText;
      window.latestWordCount = wordCount;

    } else if (checkData.status === 'failed') {
      alert('Transcription failed!');
      return;
    } else {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}
