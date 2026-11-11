(function () {
  const input = document.getElementById("avatar-imagem");
  const cameraButton = document.getElementById("abrir-camera");
  const video = document.getElementById("camera-video");
  const cameraPanel = document.getElementById("camera-painel");
  const captureButton = document.getElementById("capturar-foto");
  const message = document.getElementById("camera-aviso");
  const previewContainer = document.getElementById("imagem-preview-container");
  const preview = document.getElementById("imagem-preview");
  if (!input || !cameraButton || !video || !cameraPanel || !captureButton) return;

  let stream = null;
  let previewUrl = null;

  function pararCamera() {
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
    cameraPanel.hidden = true;
  }

  function mostrarPrevia(file) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    preview.src = previewUrl;
    previewContainer.hidden = false;
  }

  input.addEventListener("change", () => {
    pararCamera();
    if (input.files && input.files[0]) mostrarPrevia(input.files[0]);
  });

  cameraButton.addEventListener("click", async () => {
    message.textContent = "";
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      message.textContent = "A câmera não está disponível. Use HTTPS ou localhost, ou escolha uma imagem.";
      return;
    }
    try {
      pararCamera();
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      video.srcObject = stream;
      cameraPanel.hidden = false;
      await video.play();
    } catch (error) {
      pararCamera();
      message.textContent = error.name === "NotAllowedError"
        ? "Permita o acesso à câmera no navegador ou escolha uma imagem."
        : "Não foi possível abrir a câmera. Você também pode escolher uma imagem.";
    }
  });

  captureButton.addEventListener("click", () => {
    if (!video.videoWidth || !video.videoHeight) {
      message.textContent = "Aguarde a câmera iniciar antes de capturar.";
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        message.textContent = "Não foi possível capturar a foto. Tente novamente.";
        return;
      }
      const file = new File([blob], "foto-perfil.jpg", { type: "image/jpeg" });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      mostrarPrevia(file);
      message.textContent = "Foto pronta. Salve o perfil para usá-la.";
      pararCamera();
    }, "image/jpeg", 0.9);
  });

  window.addEventListener("pagehide", pararCamera);
})();
