let showData = false;
const screenWidth = window.screen.width;
const screenHeight = window.screen.height; 
let webcamWidth, webcamHeight;
const HAND_OPEN_BUFFER = 2;
const statusDisplay = document.getElementById("status");
let failed = false;
let start = false;

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

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createObjects() {
  const getOffset = () => (Math.floor(Math.random() * 85) + "%");
  const numObjects = 8  ;
  const container = document.querySelector(".container");
  const colors = ["red", "blue", "green", "purple"];
  const sizes = [1, 2, 3];
  
  for (let i = 0; i < numObjects; i++) {
    const div = document.createElement('div');
    div.classList.add("object");
    div.style["background-color"] = randomElement(colors);
    const size = randomElement(sizes);
    div.style["width"] = size + "rem";
    div.style["height"] = size + "rem";
    div.style["top"] = getOffset(); 
    div.style["right"] = getOffset();
    container.appendChild(div);
  }
}

function canGrabItem(xPos, yPos) {
  const getUnits = (string) => parseInt(string.replace("%", ""));
  const absDiff = (x, y) => Math.abs(x - y);
  const items = document.querySelectorAll('.object');
  let leastDistanceX = screenWidth;  
  let leastDistanceY = screenHeight;
  let closestItem;
  items.forEach((item) => {
    const itemX = getUnits(item.style.right);
    const itemY = getUnits(item.style.top);
    const distX = absDiff(itemX, xPos);
    const distY = absDiff(itemY, yPos);
    if (distX < leastDistanceX && distY < leastDistanceY) {
      leastDistanceX = distX;
      leastDistanceY = distY;
      closestItem = item;
    }
  });
  
  if (leastDistanceX < 10 && leastDistanceY < 10) {
    return closestItem;
  }
  return null;
}
async function attempt(code, onSuccess, onError) {
  if (failed) {
    return;
  }
  let result;
  try {
    result = await code();
  } catch(err) {
    onError(err);
    return;
  }
  onSuccess();
  return result;
}
function fail(message) {
  statusDisplay.textContent = message;
  failed = true;  
}

async function main() {
  console.log("running")
  const videoRef = document.querySelector("video");
  const target = document.querySelector(".target");

  // Load the MediaPipe handpose model.
  const model = await attempt(
    async () => await handpose.load(), 
    () => statusDisplay.textContent = "Setting up Webcam", 
    () => fail("Failed to Load Model"),
  );
  await attempt(
    async () => await setupWebcam(videoRef), 
    () => statusDisplay.textContent = "Creating UI",
    () => fail("Failed to Access Webcam"),
  )
  await attempt(
    () => createObjects(),
    () => statusDisplay.textContent = "Preparing",
    () => fail("Failed to create UI"),
  )
  if (failed) {
    return;
  }
  let holdingItem = false;
  let heldItem;

  // Warmup Model
  await model.estimateHands(videoRef);

  statusDisplay.textContent = "Ready!";
  document.querySelector(".start-button").style.display = "inherit";

  setInterval(async () => {
    if (!start) {
      return;
    }
    const predictions = await model.estimateHands(videoRef);
    if (predictions.length > 0) {
      const prediction = predictions[0];
      if (prediction.handInViewConfidence > 0.85) { 
        const handOpen = isHandOpen(prediction.annotations, HAND_OPEN_BUFFER);
        updateTargetClass(handOpen, target);
        const [xPos, yPos] = getHandCoords(prediction.annotations);
        target.style.right = xPos + "%";
        target.style.top = yPos + "%";
        if (!holdingItem && !handOpen) {
          const grabbedItem = canGrabItem(xPos, yPos);
          if (grabbedItem !== null) {
            holdingItem = true;
            heldItem = grabbedItem;
          }
        } else if (holdingItem && handOpen) {
          holdingItem = false;
        } else if (holdingItem) {
          heldItem.style.right = xPos + "%";
          heldItem.style.top = yPos + "%";
        }
      }
    } else {
      updateTargetClass(true, target);
    }
  }, 50);
}

// UI UTILS
function btnCallback() {
  showData = true;
}
function updateTargetClass(handOpen, target) {
  if (!handOpen) {
    target.classList.add("target-select");
    return;
  } 
  target.classList.remove("target-select");
}
function finishLoading() {
  document.getElementById("loading").style.display = "none";
  document.getElementById("main").style.display = "initial";
  start = true;
}