/**
 * Check User Roles
 * Quick script to see users and their role assignments
 */

import { db } from "../server/db";
import { users, roles } from "../shared/schema";
import { eq } from "drizzle-orm";
import { loadEnv } from "../server/env";

loadEnv();

async function checkUserRoles() {
  console.log("🔍 Checking User Roles\n");
  console.log("═══════════════════════════════════════════════════════════\n");

  try {
    // Get all users
    const allUsers = await db.select().from(users);

    console.log(`Found ${allUsers.length} users:\n`);

    for (const user of allUsers) {
      console.log(`👤 User: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role (base): ${user.role}`);
      console.log(`   Role ID (assigned): ${user.roleId || 'None'}`);

      if (user.roleId) {
        // Get the role details
        const [assignedRole] = await db
          .select()
          .from(roles)
          .where(eq(roles.id, user.roleId))
          .limit(1);

        if (assignedRole) {
          console.log(`   Assigned Role Name: ${assignedRole.name}`);
          console.log(`   ✅ CAN access admin panel`);
        } else {
          console.log(`   ⚠️  Role ID ${user.roleId} not found in roles table`);
        }
      } else if (user.role === 'admin') {
        console.log(`   ✅ CAN access admin panel (base admin role)`);
      } else {
        console.log(`   ❌ CANNOT access admin panel`);
      }

      console.log("");
    }

    // Show all available roles
    console.log("\n📋 Available Roles:\n");
    const allRoles = await db.select().from(roles);

    for (const role of allRoles) {
      console.log(`   ${role.id}. ${role.name} - ${role.description}`);
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    process.exit(0);
  }
}

checkUserRoles();
