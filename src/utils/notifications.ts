export const showErrorMessage = (message: string) => {
  figma.notify(message, { error: true });
  figma.ui.postMessage({ type: "showError", message });
};

export const showInfoMessage = (message: string) => {
  figma.notify(message);
  figma.ui.postMessage({ type: "showInfo", message });
};