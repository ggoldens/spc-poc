// getting dom elements
const startPanel = document.getElementById("startPanel");
const videoCallDiv = document.getElementById("videoCall");
const divNewPublisher = document.getElementById("newPublisher");
const startBtn = document.getElementById("startBtn");
const btnNewPublisher = document.getElementById("newPublisherBtn");

const iceServers = {
    'iceServers': [
        { 'urls': 'stun:stun.services.mozilla.com' },
        { 'urls': 'stun:stun.l.google.com:19302' }
    ]
}
const streamConstraints = { video: true };

let localStream;
let rtcPeerConnection;
let isCaller;

// Let's do this
const socket = io();

const createDomVideoElement = () => {
  const videoElement = document.createElement('video');
  videoElement.autoplay = true;
  videoElement.playsinline = true;
  videoElement.setAttribute('autoplay', true);
  videoElement.setAttribute('playsinline', true);
  return videoElement;
};

const negotiate = async () => {
  const sessionDescription = await rtcPeerConnection.createOffer();
  rtcPeerConnection.setLocalDescription(sessionDescription);
  socket.emit('offer', {
    type: 'offer',
    sdp: sessionDescription,
  });
};

// handler functions
const onIceCandidate = (event) => {
  if (event.candidate) {
    console.log('sending ice candidate');
    socket.emit('candidate', {
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  }
};

const onAddStream = (event) => {
  const videoEl = createDomVideoElement();
  videoEl.srcObject = event.streams[0];
  videoCallDiv.appendChild(videoEl);
};

btnNewPublisher.onclick = async () => {
  const stream = await navigator.mediaDevices.getUserMedia(streamConstraints);
  stream.getTracks().forEach(t => rtcPeerConnection.addTrack(t, stream)); 
  await negotiate();
};

startBtn.onclick = () => {
  socket.emit('create or join');
  startPanel.style = "display: none;";
  videoCallDiv.style = "display: block;";
  divNewPublisher.style = "display: block;";
};

// message handlers
socket.on('created', async () => {
  const localVideo = createDomVideoElement();
  videoCallDiv.appendChild(localVideo);
  const stream = await navigator.mediaDevices.getUserMedia(streamConstraints);
  localStream = stream;
  localVideo.srcObject = stream;
  isCaller = true;
});

socket.on('joined', function () {
  console.log('ready to subscribe!');
  divNewPublisher.style = "display: none;";
  socket.emit('ready');
});

socket.on('candidate', function (event) {
  const candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate
  });
  rtcPeerConnection.addIceCandidate(candidate);
});

socket.on('ready', async () => {
  if (isCaller) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.ontrack = onAddStream;
    if (localStream) {
      localStream.getTracks().forEach(t => rtcPeerConnection.addTrack(t, localStream));
    }
    await negotiate();
  }
});

socket.on('offer', function (event) {
  if (!isCaller) {
    if (!rtcPeerConnection) {
      rtcPeerConnection = new RTCPeerConnection(iceServers);
    }
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.ontrack = onAddStream;
    if (localStream) {
      localStream.getTracks().forEach(t => rtcPeerConnection.addTrack(t, localStream));
    }
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
    rtcPeerConnection.createAnswer()
      .then(sessionDescription => {
        rtcPeerConnection.setLocalDescription(sessionDescription);
        socket.emit('answer', {
          type: 'answer',
          sdp: sessionDescription
        });
      })
      .catch(error => {
        console.log(error)
      });
  }
});

socket.on('answer', function (event) {
  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
});