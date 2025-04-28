async function transcribeAudio() {
  const fileInput = document.getElementById('audioFile');
  const file = fileInput.files[0];
  if (!file) {
    alert('Please select an audio file!');
    return;
  }

  // Show Transcribing Message
  document.getElementById('outputText').value = "🛠️ Transcribing audio... please wait...";

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

  // 2. Request transcription with speaker labels
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

  // 3. Polling for transcription completion
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

function downloadText() {
  const text = document.getElementById('outputText').value;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "transcription.txt";
  link.click();
}

function generateQAReport() {
  const transcript = window.latestTranscript || document.getElementById('outputText').value;
  const wordCount = window.latestWordCount || transcript.split(' ').length;

  // Dummy Auto Values for this demo
  const callId = `2024-04-28-001`;
  const agentName = "Sam";
  const customerName = "Adam Wilson";
  const callDate = "28-Apr-2025";
  const callDuration = "5 minutes";

  let empathyScore = 20;
  let knowledgeScore = 30;
  let resolutionScore = 30;
  let complianceBonus = 5;
  let ownershipBonus = 5;
  let sentimentBonus = 5;
  let ahtBonus = 5;
  let aggressionPenalty = 0;

  const totalScore = empathyScore + knowledgeScore + resolutionScore + complianceBonus + ownershipBonus + sentimentBonus + ahtBonus - aggressionPenalty;

  let ratingStars = "★★★☆☆";
  if (totalScore >= 90) ratingStars = "★★★★☆";
  if (totalScore >= 95) ratingStars = "★★★★★";

  const qaReport = `
===============================
         QA AUDIT REPORT
===============================

Call ID           : ${callId}
Agent Name        : ${agentName}
Customer Name     : ${customerName}
Date              : ${callDate}
Duration          : ${callDuration}
Transcript Words  : ${wordCount}

-------------------------------
EVALUATION METRICS
-------------------------------
Empathy           : Good
Knowledge         : Excellent
Resolution        : Resolved
Compliance Check  : Pass
Policy Adherence  : Pass
Active Listening  : Good
Escalation Handling: Correct
Call Etiquette    : Pass
Resolution Ownership : Yes
Sentiment Handling : Good
AHT Status        : Passed (Under 6 min)
Agent Aggressiveness: No

-------------------------------
AUTO SCORES
-------------------------------
Empathy Score         : 20 / 30
Knowledge Score       : 30 / 30
Resolution Score      : 30 / 30
Compliance Bonus      : +5
Ownership Bonus       : +5
Sentiment Handling    : +5
AHT Bonus             : +5
Aggressiveness Penalty: 0

-------------------------------
TOTAL QA SCORE: ${totalScore} / 100
QA RATING     : ${ratingStars} (Excellent)

-------------------------------
SUMMARY COMMENTS
-------------------------------
The agent demonstrated excellent product knowledge and was empathetic to the customer's concerns. 
The issue was resolved professionally within the expected time frame. Compliance and policies were followed properly.
Overall, this was an excellent customer service call.

===============================
  `.trim();

  document.getElementById('qaReport').textContent = qaReport;
}
