import { execSync } from "child_process";
import { join } from "path";
import { fileURLToPath } from "url";

const scriptDir = join(fileURLToPath(import.meta.url), "..");

try {
  execSync(`sh ${join(scriptDir, "deploy.sh")}`, { stdio: "inherit" });
} catch (err) {
  console.error("❌ Deployment script failed:", err.message);
  process.exit(1);
}
