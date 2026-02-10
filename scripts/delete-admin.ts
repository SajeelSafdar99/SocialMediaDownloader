import { deleteAdminUser, listAdminUsers } from "../server/services/adminRecoveryService";
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

async function deleteAdmin() {
  console.log("🗑️  Delete Admin User\n");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("⚠️  WARNING: This will permanently delete an admin user!");
  console.log("   You need the admin secret key to proceed.\n");

  const secretKey = await question("Admin secret key: ");

  if (!secretKey) {
    console.error("\n❌ Secret key is required!");
    rl.close();
    process.exit(1);
  }

  try {
    // First, list all admins
    const admins = await listAdminUsers(secretKey);

    if (admins.length === 0) {
      console.log("\n⚠️  No admin users found!");
      rl.close();
      process.exit(0);
    }

    if (admins.length === 1) {
      console.log("\n⚠️  Cannot delete the only admin user!");
      console.log("   Create another admin first with: npm run admin:create:secure\n");
      rl.close();
      process.exit(1);
    }

    console.log(`\n📋 Current admin users:\n`);
    admins.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.username} (${admin.email}) - 2FA: ${admin.twoFactorEnabled ? 'Enabled' : 'Disabled'}`);
    });

    console.log("\n═══════════════════════════════════════════════════════════\n");

    const username = await question("Username to delete: ");

    if (!username) {
      console.error("\n❌ Username is required!");
      rl.close();
      process.exit(1);
    }

    // Confirm deletion
    const confirm = await question(`\n⚠️  Are you sure you want to delete '${username}'? (yes/no): `);

    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log("\n❌ Operation cancelled.");
      rl.close();
      process.exit(0);
    }

    const result = await deleteAdminUser({
      username,
      secretKey,
    });

    console.log(`\n✅ Admin '${username}' has been deleted successfully!`);
    console.log(`   User ID: ${result.deletedUser.id}\n`);

    console.log("💡 Remaining admins:");
    const remainingAdmins = await listAdminUsers(secretKey);
    remainingAdmins.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.username} (${admin.email})`);
    });
    console.log("");

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);

    if (error.message.includes('Invalid admin secret')) {
      console.log("\n💡 Tip: Make sure you're using the correct ADMIN_CREATION_SECRET");
      console.log("   Check your .env file.\n");
    } else if (error.message.includes('User not found')) {
      console.log("\n💡 Tip: Check the username spelling.");
      console.log("   Use 'npm run admin:list' to see all admins.\n");
    } else if (error.message.includes('Cannot delete the last admin')) {
      console.log("\n💡 Tip: You cannot delete the last admin.");
      console.log("   Create another admin first.\n");
    }

    rl.close();
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

deleteAdmin();
