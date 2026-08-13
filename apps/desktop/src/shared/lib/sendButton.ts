/** Click the Send button on the active (visible) request tab. */
export function clickVisibleSendButton(): void {
  const sendBtn = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-send-btn]")).find(
    (el) => el.offsetParent !== null && !el.disabled,
  );
  sendBtn?.click();
}
