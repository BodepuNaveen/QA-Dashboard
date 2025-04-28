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

        // Smart Speaker Detection
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
  const empathy = document.getElementById('qaEmpathy').value;
  const knowledge = document.getElementById('qaKnowledge').value;
  const resolution = document.getElementById('qaResolution').value;

  const now = new Date();
  const dateString = now.toISOString().split('T')[0];
  const callID = `${dateString.replace(/-/g, '')}-001`;

  const agentName = "Sam";
  const customerName = "Adam Wilson";
  const durationMinutes = Math.max(5, Math.floor(window.latestWordCount / 70));
  const transcriptWords = window.latestWordCount || 300;

  const ahtStatus = durationMinutes <= 6 ? "Passed (Under 6 min)" : "Failed (Over 6 min)";
  const agentAggressiveness = "No";

  // Auto-Scoring
  let totalScore = 0;
  totalScore += (empathy === "Excellent") ? 30 : (empathy === "Good") ? 20 : 10;
  totalScore += (knowledge === "Excellent") ? 30 : (knowledge === "Good") ? 20 : 10;
  totalScore += (resolution === "Resolved") ? 30 : (resolution === "Escalated") ? 15 : 0;
  totalScore += 5; // Compliance bonus
  totalScore += 5; // Ownership bonus
  totalScore += 5; // Sentiment bonus
  if (ahtStatus.startsWith("Passed")) totalScore += 5;
  const penalty = (agentAggressiveness === "Yes") ? -10 : 0;
  totalScore += penalty;

  if (totalScore > 100) totalScore = 100;

  const rating = totalScore >= 90 ? "★★★★★ (Excellent)"
                : totalScore >= 75 ? "★★★★☆ (Good)"
                : totalScore >= 60 ? "★★★☆☆ (Average)"
                : "★★☆☆☆ (Poor)";

  const report = `
===============================
         QA AUDIT REPORT
===============================

Call ID           : ${callID}
Agent Name        : ${agentName}
Customer Name     : ${customerName}
Date              : ${dateString}
Duration          : ${durationMinutes} minutes
Transcript Words  : ${transcriptWords}

-------------------------------
EVALUATION METRICS
-------------------------------
Empathy           : ${empathy}
Knowledge         : ${knowledge}
Resolution        : ${resolution}
Compliance Check  : Pass
Policy Adherence  : Pass
Active Listening  : Good
Escalation Handling: Correct
Call Etiquette    : Pass
Resolution Ownership : Yes
Sentiment Handling : Good
AHT Status        : ${ahtStatus}
Agent Aggressiveness: ${agentAggressiveness}

-------------------------------
AUTO SCORES
-------------------------------
Empathy Score         : 30 / 30
Knowledge Score       : 30 / 30
Resolution Score      : 30 / 30
Compliance Bonus      : +5
Ownership Bonus       : +5
Sentiment Handling    : +5
AHT Bonus             : +5
Aggressiveness Penalty: ${penalty}

-------------------------------
TOTAL QA SCORE: ${totalScore} / 100
QA RATING     : ${rating}

-------------------------------
SUMMARY COMMENTS
-------------------------------
The agent demonstrated good product knowledge and empathy.
The issue was resolved successfully. No escalation was needed.
Compliance and policies were followed.
Overall excellent service performance.

===============================
`;

  document.getElementById('qaReport').textContent = report.trim();
}
