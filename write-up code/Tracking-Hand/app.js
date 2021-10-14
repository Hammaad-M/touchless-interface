async function setupWebcam(videoRef) {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const webcamStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
      },
    });
    if ("srcObject" in videoRef) {
      videoRef.srcObject = webcamStream;
    } else {
      videoRef.src = window.URL.createObjectURL(webcamStream);
    }
    return new Promise((resolve) => {
      videoRef.addEventListener('loadeddata', (event) => {
        console.log("video ready")
        webcamWidth = videoRef.videoWidth;
        webcamHeight = videoRef.videoHeight;
        videoRef.setAttribute("playsinline", true);
        resolve();
      });
    });
  } else {
    alert("No webcam detected!");
  }
}

function getHandCoords(hand) {
  const [palmX, palmY, palmZ] = hand.palmBase[0];
  // const meanX = ( boundingBox.topLeft[0] + boundingBox.bottomRight[0] ) / 2;
  // const meanY = ( boundingBox.topLeft[1] + boundingBox.bottomRight[1] ) / 2;
  return [( palmX / webcamWidth ) * 100, ( palmY / webcamHeight ) * 100];
}
function updateTargetClass(handOpen, target) {
  if (!handOpen) {
    target.classList.add("target-select");
    return;
  } 
  target.classList.remove("target-select");
}

async function main() {
  console.log("running")
  const videoRef = document.querySelector("video");

  // Load the MediaPipe handpose model.
  const model = await handpose.load();
  // Setup Webcam
  await setupWebcam(videoRef);

  // Main Loop 
  setInterval(async () => {
    // Detect hands from WebCam video feed
    const predictions = await model.estimateHands(videoRef);
    if (predictions.length > 0) {
      const prediction = predictions[0];
      const [xPos, yPos] = getHandCoords(prediction.annotations);
        target.style.right = xPos + "%";
        target.style.top = yPos + "%";
    }
  }, 50);
}

