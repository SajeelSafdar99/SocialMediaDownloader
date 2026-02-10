import { resetAdminPassword } from "../server/services/adminRecoveryService";
import { loadEnv } from "../server/env";
import readline from "readline";

loadEnv();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function resetPassword() {
  console.log("🔐 Admin Password Reset\n");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("⚠️  This will reset the admin password.");
  console.log("   You need the admin secret key to proceed.\n");

  const username = await question("Admin username: ");
  const newPassword = await question("New password: ");
  const confirmPassword = await question("Confirm new password: ");
  const secretKey = await question("Admin secret key: ");

  if (!username || !newPassword || !secretKey) {
    console.error("\n❌ All fields are required!");
    rl.close();
    process.exit(1);
  }

  if (newPassword !== confirmPassword) {
    console.error("\n❌ Passwords do not match!");
    rl.close();
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error("\n❌ Password must be at least 8 characters!");
    rl.close();
    process.exit(1);
  }

  try {
    const result = await resetAdminPassword({
      username,
      newPassword,
      secretKey,
    });

    console.log(`\n✅ Password reset successfully for '${username}'!`);
    console.log(`\n🌐 You can now login at: http://localhost:5173/admin`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: [your new password]\n`);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);

    if (error.message.includes('Invalid admin secret')) {
      console.log("\n💡 Tip: Make sure you're using the correct ADMIN_CREATION_SECRET");
      console.log("   Check your .env file.\n");
    } else if (error.message.includes('User not found')) {
      console.log("\n💡 Tip: Check the username spelling.");
      console.log("   Use 'npm run admin:list' to see all admins.\n");
    }

    rl.close();
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

resetPassword();
