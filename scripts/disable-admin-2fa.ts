import { disableAdmin2FA, listAdminUsers } from "../server/services/adminRecoveryService";
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

async function disable2FA() {
  console.log("🔓 Disable Admin 2FA\n");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("⚠️  This will disable Two-Factor Authentication for an admin.");
  console.log("   Use this if you lost access to your authenticator app.");
  console.log("   You need the admin secret key to proceed.\n");

  const secretKey = await question("Admin secret key: ");

  if (!secretKey) {
    console.error("\n❌ Secret key is required!");
    rl.close();
    process.exit(1);
  }

  try {
    // First, list all admins with 2FA
    const admins = await listAdminUsers(secretKey);
    const adminsWithd2FA = admins.filter(admin => admin.twoFactorEnabled);

    if (adminsWithd2FA.length === 0) {
      console.log("\n⚠️  No admins have 2FA enabled!");
      rl.close();
      process.exit(0);
    }

    console.log(`\n📋 Admins with 2FA enabled:\n`);
    adminsWithd2FA.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.username} (${admin.email})`);
    });

    console.log("\n═══════════════════════════════════════════════════════════\n");

    const username = await question("Username to disable 2FA: ");

    if (!username) {
      console.error("\n❌ Username is required!");
      rl.close();
      process.exit(1);
    }

    const result = await disableAdmin2FA({
      username,
      secretKey,
    });

    console.log(`\n✅ 2FA has been disabled for '${username}'!`);
    console.log(`\n🌐 You can now login at: http://localhost:5173/admin`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: [your password]`);
    console.log(`   No 2FA code required\n`);
    console.log("💡 Re-enable 2FA after login for security!\n");

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);

    if (error.message.includes('Invalid admin secret')) {
      console.log("\n💡 Tip: Make sure you're using the correct ADMIN_CREATION_SECRET");
      console.log("   Check your .env file.\n");
    } else if (error.message.includes('User not found')) {
      console.log("\n💡 Tip: Check the username spelling.");
      console.log("   Use 'npm run admin:list' to see all admins.\n");
    } else if (error.message.includes('2FA is not enabled')) {
      console.log("\n💡 This user doesn't have 2FA enabled.\n");
    }

    rl.close();
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

disable2FA();
