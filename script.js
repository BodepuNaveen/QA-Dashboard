async function transcribeAudio() {
  const fileInput = document.getElementById('audioFile');
  const file = fileInput.files[0];
  if (!file) {
    alert('Please select an audio file!');
    return;
  }
  document.getElementById('outputText').value = 'Uploading and transcribing...';
  const response = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: { authorization: 'a1b381ccd87f469b9ea60f78b02ece0c' },
    body: file
  });
  const data = await response.json();
  const audioUrl = data.upload_url;
  const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      authorization: 'a1b381ccd87f469b9ea60f78b02ece0c',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ audio_url: audioUrl })
  });
  const transcriptData = await transcriptRes.json();
  const transcriptId = transcriptData.id;

  let completed = false;
  while (!completed) {
    const checkRes = await fetch('https://api.assemblyai.com/v2/transcript/' + transcriptId, {
      headers: { authorization: 'a1b381ccd87f469b9ea60f78b02ece0c' }
    });
    const checkData = await checkRes.json();
    if (checkData.status === 'completed') {
      completed = true;
      document.getElementById('outputText').value = checkData.text;
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

  let score = 0;
  if (fields.Empathy === 'Excellent') score += 30;
  else if (fields.Empathy === 'Good') score += 20;
  else if (fields.Empathy === 'Average') score += 10;

  if (fields.Knowledge === 'Excellent') score += 30;
  else if (fields.Knowledge === 'Good') score += 20;
  else if (fields.Knowledge === 'Average') score += 10;

  if (fields.Resolution === 'Resolved') score += 30;
  else if (fields.Resolution === 'Escalated') score += 15;
  else if (fields.Resolution === 'Pending') score += 5;

  if (fields.Compliance === 'Pass') score += 5;
  if (fields.Policy === 'Pass') score += 5;
  if (fields.Listening === 'Excellent') score += 10;
  else if (fields.Listening === 'Good') score += 5;
  if (fields.Escalation === 'Correct') score += 5;
  if (fields.Etiquette === 'Pass') score += 5;
  if (fields.Ownership === 'Yes') score += 5;
  if (fields.Sentiment === 'Good') score += 5;

  let rating = 'Poor';
  if (score >= 90) rating = 'Excellent';
  else if (score >= 75) rating = 'Good';
  else if (score >= 60) rating = 'Average';

  const report = `
===============================
         QA AUDIT REPORT
===============================
Empathy            : ${fields.Empathy}
Knowledge          : ${fields.Knowledge}
Resolution         : ${fields.Resolution}
Compliance Check   : ${fields.Compliance}
Policy Adherence   : ${fields.Policy}
Active Listening   : ${fields.Listening}
Escalation Handling: ${fields.Escalation}
Call Etiquette     : ${fields.Etiquette}
Resolution Ownership: ${fields.Ownership}
Sentiment Handling : ${fields.Sentiment}

-------------------------------
TOTAL QA SCORE     : ${score} / 100
QA RATING          : ${rating}
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