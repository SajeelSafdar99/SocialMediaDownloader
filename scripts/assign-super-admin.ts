/**
 * Assign Super Admin Role to Existing User
 * Use this to upgrade an existing admin to super_admin
 */

import { db } from "../server/db";
import { users, roles } from "../shared/schema";
import { eq } from "drizzle-orm";
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

async function assignSuperAdminRole() {
  console.log("🔐 Assign Super Admin Role to User\n");
  console.log("═══════════════════════════════════════════════════════════\n");

  try {
    // Get super_admin role
    const [superAdminRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, "super_admin"))
      .limit(1);

    if (!superAdminRole) {
      console.error("\n❌ super_admin role not found!");
      console.log("💡 Run: npm run admin:init-roles first\n");
      rl.close();
      process.exit(1);
    }

    // List all admin users
    const adminUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"));

    if (adminUsers.length === 0) {
      console.log("❌ No admin users found!\n");
      rl.close();
      process.exit(1);
    }

    console.log("📋 Existing Admin Users:\n");
    adminUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email})`);
      console.log(`   ID: ${user.id}, Role ID: ${user.roleId || "Not assigned"}\n`);
    });

    const username = await question("Enter username to assign super_admin role: ");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      console.log(`\n❌ User '${username}' not found!\n`);
      rl.close();
      process.exit(1);
    }

    // Update user with super_admin role
    await db
      .update(users)
      .set({
        roleId: superAdminRole.id,
        role: "admin",
        isPremium: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    console.log(`\n✅ Successfully assigned super_admin role to '${username}'!`);
    console.log(`\n📝 User Details:`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email:    ${user.email}`);
    console.log(`   Role ID:  ${superAdminRole.id} (super_admin)`);
    console.log(`\n🎉 User now has ALL 18 permissions!\n`);
    console.log(`💡 Login at: http://localhost:5173/admin\n`);

  } catch (error) {
    console.error("\n❌ Error:", error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

assignSuperAdminRole();
