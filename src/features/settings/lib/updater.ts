import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

export async function checkForUpdates(silent = true): Promise<void> {
  try {
    const update = await check();
    if (!update) {
      if (!silent) alert("You are on the latest version.");
      return;
    }

    const confirmed = confirm(
      `Update ${update.version} is available.\n\n${update.body ?? ""}\n\nInstall now?`,
    );
    if (!confirmed) return;

    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          console.log(`[Pigeon] Downloading ${event.data.contentLength} bytes`);
          break;
        case "Progress":
          console.log(`[Pigeon] Downloaded chunk: ${event.data.chunkLength}`);
          break;
        case "Finished":
          console.log("[Pigeon] Download finished, installing...");
          break;
      }
    });

    await relaunch();
  } catch (_err) {}
}
