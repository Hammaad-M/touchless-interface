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
      console.log(prediction);
    }
  }, 50);
}