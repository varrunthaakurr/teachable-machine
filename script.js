// Emoji Mimic Website script using Teachable Machine and TensorFlow.js
const URL = "./model/";
const modelURL = URL + "model.json";
const metadataURL = URL + "metadata.json";

let model;
let maxPredictions;
let webcam;
let animationId;
let isCameraRunning = false;

const statusLabel = document.getElementById("prediction-label");
const confidenceLabel = document.getElementById("prediction-confidence");
const emojiCircle = document.getElementById("emoji-circle");
const emojiText = document.getElementById("emoji-text");
const webcamContainer = document.getElementById("webcam-container");
const loadingText = document.getElementById("loading-text");
const startBtn = document.getElementById("start-button");
const stopBtn = document.getElementById("stop-button");

// Map each class label to the corresponding emoji and styling.
const emojiMap = {
  "Thumbs Up": { emoji: "👍", label: "Thumbs Up", style: "up" },
  "Thumbs Down": { emoji: "👎", label: "Thumbs Down", style: "down" },
  "Neutral": { emoji: "😐", label: "Neutral", style: "neutral" }
};

async function loadModel() {
  loadingText.style.display = "block";
  loadingText.textContent = "Loading Teachable Machine model…";
  startBtn.disabled = true;
  stopBtn.disabled = true;

  try {
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
    loadingText.textContent = "Model ready — start your camera.";
    startBtn.disabled = false;
  } catch (error) {
    loadingText.textContent = "Unable to load model. Use a local server and ensure ./model/ contains model.json, metadata.json, and weights.bin.";
    console.error("Model load error:", error);
  }
}

function getEmojiResult(className) {
  const cleaned = String(className || "").trim();
  const normalized = cleaned.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const mapped = emojiMap[cleaned] || emojiMap[normalized];
  if (mapped) {
    return mapped;
  }

  if (normalized.includes("thumbs up") || normalized.includes("thumbsup") || normalized.includes("up")) {
    return { emoji: "👍", label: cleaned || "Thumbs Up", style: "up" };
  }
  if (normalized.includes("thumbs down") || normalized.includes("thumbsdown") || normalized.includes("down")) {
    return { emoji: "👎", label: cleaned || "Thumbs Down", style: "down" };
  }
  if (normalized.includes("neutral") || normalized.includes("normal") || normalized.includes("meh") || normalized.includes("face")) {
    return { emoji: "😐", label: cleaned || "Neutral", style: "neutral" };
  }

  return { emoji: "😐", label: cleaned || "Neutral", style: "neutral" };
}

async function startCamera() {
  if (!model) {
    await loadModel();
    if (!model) {
      return;
    }
  }

  if (isCameraRunning) {
    return;
  }

  webcam = new tmImage.Webcam(480, 360, true); // width, height, flip
  await webcam.setup({ facingMode: "user" });
  await webcam.play();

  webcamContainer.innerHTML = "";
  webcamContainer.appendChild(webcam.canvas);

  isCameraRunning = true;
  stopBtn.disabled = false;
  startBtn.disabled = true;
  loadingText.style.display = "none";
  runPredictionLoop();
}

function stopCamera() {
  if (!isCameraRunning || !webcam) {
    return;
  }

  window.cancelAnimationFrame(animationId);
  webcam.stop();
  webcam.pause();
  webcamContainer.innerHTML = "";
  isCameraRunning = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  loadingText.style.display = "block";
  loadingText.textContent = "Camera stopped. Click Start Camera to continue.";
  statusLabel.textContent = "--";
  confidenceLabel.textContent = "--";
  emojiText.textContent = "😎";
  emojiCircle.className = "emoji-circle neutral";
}

async function runPredictionLoop() {
  if (!isCameraRunning) {
    return;
  }

  webcam.update();
  await predict();
  animationId = window.requestAnimationFrame(runPredictionLoop);
}

async function predict() {
  if (!model || !webcam) {
    return;
  }

  const prediction = await model.predict(webcam.canvas);
  prediction.sort((a, b) => b.probability - a.probability);
  const best = prediction[0];

  if (!best) {
    return;
  }

  const confidence = (best.probability * 100).toFixed(1);
  const result = getEmojiResult(best.className);

  statusLabel.textContent = result.label;
  confidenceLabel.textContent = `${confidence}%`;
  emojiText.textContent = result.emoji;
  emojiCircle.className = `emoji-circle ${result.style}`;

  if (result.style === "up") {
    emojiCircle.style.background = "radial-gradient(circle at top, rgba(95, 255, 169, 0.24), rgba(15, 46, 67, 0.9))";
  } else if (result.style === "down") {
    emojiCircle.style.background = "radial-gradient(circle at top, rgba(255, 108, 114, 0.24), rgba(34, 15, 26, 0.9))";
  } else {
    emojiCircle.style.background = "radial-gradient(circle at top, rgba(203, 213, 225, 0.18), rgba(15, 18, 32, 0.95))";
  }
}

// Attach event handlers after DOM content is loaded.
document.addEventListener("DOMContentLoaded", () => {
  startBtn.addEventListener("click", startCamera);
  stopBtn.addEventListener("click", stopCamera);
  stopBtn.disabled = true;
  loadModel();
});
