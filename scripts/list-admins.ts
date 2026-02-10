import { listAdminUsers } from "../server/services/adminRecoveryService";
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

async function listAdmins() {
  console.log("📋 List All Admin Users\n");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("⚠️  This will display all admin users.");
  console.log("   You need the admin secret key to proceed.\n");

  const secretKey = await question("Admin secret key: ");

  if (!secretKey) {
    console.error("\n❌ Secret key is required!");
    rl.close();
    process.exit(1);
  }

  try {
    const admins = await listAdminUsers(secretKey);

    if (admins.length === 0) {
      console.log("\n⚠️  No admin users found!");
      console.log("   Create one with: npm run admin:create:secure\n");
    } else {
      console.log(`\n✅ Found ${admins.length} admin user(s):\n`);
      console.log("═══════════════════════════════════════════════════════════");

      admins.forEach((admin, index) => {
        console.log(`\n${index + 1}. Admin Details:`);
        console.log(`   ID:        ${admin.id}`);
        console.log(`   Username:  ${admin.username}`);
        console.log(`   Email:     ${admin.email}`);
        console.log(`   Role:      ${admin.role}`);
        console.log(`   2FA:       ${admin.twoFactorEnabled ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`   Created:   ${new Date(admin.createdAt!).toLocaleString()}`);
      });

      console.log("\n═══════════════════════════════════════════════════════════");
      console.log("\n💡 Available commands:");
      console.log("   npm run admin:reset-password    - Reset admin password");
      console.log("   npm run admin:delete            - Delete an admin");
      console.log("   npm run admin:disable-2fa       - Disable 2FA for admin");
      console.log("   npm run admin:create:secure     - Create new admin\n");
    }
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);

    if (error.message.includes('Invalid admin secret')) {
      console.log("\n💡 Tip: Make sure you're using the correct ADMIN_CREATION_SECRET");
      console.log("   Check your .env file.\n");
    }

    rl.close();
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

listAdmins();
