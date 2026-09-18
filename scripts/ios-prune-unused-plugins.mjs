import { readFile, writeFile } from "node:fs/promises";

const configPath = "ios/App/App/capacitor.config.json";
const podfilePath = "ios/App/Podfile";
const unusedOnIOS = new Set(["SpeechRecognition", "PushNotificationsPlugin"]);

const raw = await readFile(configPath, "utf8");
const config = JSON.parse(raw);

if (!Array.isArray(config.packageClassList)) {
  throw new Error(`Missing packageClassList in ${configPath}`);
}

config.packageClassList = config.packageClassList.filter(
  (plugin) => typeof plugin !== "string" || !unusedOnIOS.has(plugin),
);

await writeFile(configPath, `${JSON.stringify(config, null, "\t")}\n`);

const podfile = await readFile(podfilePath, "utf8");
const prunedPodfile = podfile
  .split("\n")
  .filter(
    (line) =>
      !line.includes("CapacitorCommunitySpeechRecognition") &&
      !line.includes("CapacitorPushNotifications"),
  )
  .join("\n");
await writeFile(podfilePath, prunedPodfile);

for (const plugin of unusedOnIOS) {
  if (config.packageClassList.includes(plugin)) {
    throw new Error(`Failed to remove unused iOS plugin ${plugin}`);
  }
}

if (
  prunedPodfile.includes("CapacitorCommunitySpeechRecognition") ||
  prunedPodfile.includes("CapacitorPushNotifications")
) {
  throw new Error("Failed to remove unused pods from the iPhone Podfile");
}

console.log("Removed Android-only and unused push plugins from the iOS package.");