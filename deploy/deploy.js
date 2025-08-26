const { execSync } = require("child_process");
const os = require("os");
const path = require("path");

const scriptDir = __dirname;

try {
  if (os.platform() === "win32") {
    console.log("Running Windows .bat deploy script...");
    execSync(path.join(scriptDir, "deploy.bat"), { stdio: "inherit" });
  } else {
    console.log("Running Unix/Linux .sh deploy script...");
    execSync(`sh ${path.join(scriptDir, "deploy.sh")}`, { stdio: "inherit" });
  }
} catch (err) {
  console.error("❌ Deployment script failed:", err.message);
  process.exit(1);
}
