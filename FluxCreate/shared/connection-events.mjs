export const CONNECTION_CHANGED = 'fluxcreate:connection-changed';
const CHANNEL = 'fluxcreate-connection';

/** Notifications contain no credential, account detail, or request payload. */
export function notifyConnectionChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CONNECTION_CHANGED));
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage('changed');
    channel.close();
  } catch { /* Focus refresh also works when cross-tab messaging is unavailable. */ }
}

export function subscribeConnectionChanges(refresh, {focus = true} = {}) {
  if (typeof window === 'undefined') return () => {};
  const changed = () => refresh();
  window.addEventListener(CONNECTION_CHANGED, changed);
  if (focus) window.addEventListener('focus', changed);
  let channel;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = event => {if (event.data === 'changed') changed();};
  } catch { /* This tab still receives local changes and focus events. */ }
  return () => {
    window.removeEventListener(CONNECTION_CHANGED, changed);
    if (focus) window.removeEventListener('focus', changed);
    channel?.close();
  };
}
