async function transcribeAudio() {
  const fileInput = document.getElementById('audioFile');
  const file = fileInput.files[0];
  if (!file) {
    alert('Please select an audio file!');
    return;
  }

  document.getElementById('outputText').value = 'Uploading and transcribing... Please wait...';

  // Upload audio
  const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: { authorization: 'a1b381ccd87f469b9ea60f78b02ece0c' },
    body: file
  });
  const uploadData = await uploadResponse.json();
  const audioUrl = uploadData.upload_url;

  // Request transcription with speaker labels
  const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      authorization: 'a1b381ccd87f469b9ea60f78b02ece0c',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true
    })
  });
  const transcriptData = await transcriptResponse.json();
  const transcriptId = transcriptData.id;

  // Poll for transcription completion
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
        checkData.utterances.forEach(utt => {
          const speaker = utt.speaker === 0 ? "Agent" : "Customer";
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
      // Save for report
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
  const fields = {
    Empathy: document.getElementById('qaEmpathy').value,
    Knowledge: document.getElementById('qaKnowledge').value,
    Resolution: document.getElementById('qaResolution').value,
    Compliance: document.getElementById('qaCompliance').value,
    Policy: document.getElementById('qaPolicy').value,
    Listening: document.getElementById('qaListening').value,
    Escalation: document.getElementById('qaEscalation').value,
    Etiquette: document.getElementById('qaEtiquette').value,
    Ownership: document.getElementById('qaOwnership').value,
    Sentiment: document.getElementById('qaSentiment').value
  };

  // Score calculations
  let empathyScore = fields.Empathy === 'Excellent' ? 30 : fields.Empathy === 'Good' ? 20 : fields.Empathy === 'Average' ? 10 : 0;
  let knowledgeScore = fields.Knowledge === 'Excellent' ? 30 : fields.Knowledge === 'Good' ? 20 : fields.Knowledge === 'Average' ? 10 : 0;
  let resolutionScore = fields.Resolution === 'Resolved' ? 30 : fields.Resolution === 'Escalated' ? 15 : 5;
  let complianceBonus = fields.Compliance === 'Pass' ? 5 : 0;
  let policyBonus = fields.Policy === 'Pass' ? 5 : 0;
  let ownershipBonus = fields.Ownership === 'Yes' ? 5 : 0;
  let sentimentBonus = fields.Sentiment === 'Good' ? 5 : 0;
  let ahtBonus = 5; // Assuming AHT passed
  let aggressivenessPenalty = 0; // Assuming agent not aggressive

  // Total score calculation
  let totalScore = empathyScore + knowledgeScore + resolutionScore +
                   complianceBonus + policyBonus + ownershipBonus +
                   sentimentBonus + ahtBonus - aggressivenessPenalty;

  if (totalScore > 100) totalScore = 100; // Capping at 100

  // Rating stars
  let ratingStars = totalScore >= 90 ? "★★★★★ (Excellent)" :
                    totalScore >= 75 ? "★★★★☆ (Good)" :
                    totalScore >= 60 ? "★★★☆☆ (Average)" :
                    "★★☆☆☆ (Poor)";

  const today = new Date();
  const callID = `2024-04-28-001`;
  const agentName = "Sam";
  const customerName = "Adam Wilson";
  const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const durationStr = "5 minutes"; // (hardcoded estimate for now)

  const report = `
===============================
         QA AUDIT REPORT
===============================

Call ID           : ${callID}
Agent Name        : ${agentName}
Customer Name     : ${customerName}
Date              : ${dateStr}
Duration          : ${durationStr}
Transcript Words  : ${window.latestWordCount || 0}

-------------------------------
EVALUATION METRICS
-------------------------------
Empathy           : ${fields.Empathy}
Knowledge         : ${fields.Knowledge}
Resolution        : ${fields.Resolution}
Compliance Check  : ${fields.Compliance}
Policy Adherence  : ${fields.Policy}
Active Listening  : ${fields.Listening}
Escalation Handling: ${fields.Escalation}
Call Etiquette    : ${fields.Etiquette}
Resolution Ownership : ${fields.Ownership}
Sentiment Handling : ${fields.Sentiment}
AHT Status        : Passed (Under 6 min)
Agent Aggressiveness: No

-------------------------------
AUTO SCORES
-------------------------------
Empathy Score         : ${empathyScore} / 30
Knowledge Score       : ${knowledgeScore} / 30
Resolution Score      : ${resolutionScore} / 30
Compliance Bonus      : +${complianceBonus}
Ownership Bonus       : +${ownershipBonus}
Sentiment Handling    : +${sentimentBonus}
AHT Bonus             : +${ahtBonus}
Aggressiveness Penalty: ${aggressivenessPenalty}

-------------------------------
TOTAL QA SCORE: ${totalScore} / 100
QA RATING     : ${ratingStars}

-------------------------------
SUMMARY COMMENTS
-------------------------------
The agent demonstrated excellent product knowledge and was empathetic to the customer's concerns. 
The issue was resolved professionally within the expected time frame. Compliance and policies were followed properly.
Overall, this was an excellent customer service call.

===============================
`;

  document.getElementById('qaReport').textContent = report.trim();
  document.getElementById('downloadQAReport').style.display = 'block';
}

function downloadQAReport() {
  const report = document.getElementById('qaReport').textContent;
  const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "qa_audit_report.txt";
  link.click();
}
