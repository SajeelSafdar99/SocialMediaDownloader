/**
 * Initialize Roles and Permissions
 * Run this once to set up the RBAC system
 */

import { db } from "../server/db";
import { roles, permissions, rolePermissions } from "../shared/schema";
import { eq } from "drizzle-orm";
import { loadEnv } from "../server/env";

loadEnv();

async function initializeRolesAndPermissions() {
  console.log("🔐 Initializing Roles and Permissions System\n");
  console.log("═══════════════════════════════════════════════════════════\n");

  try {
    // Define all permissions
    const permissionsList = [
      // Blog permissions
      { name: "blog.create", description: "Create blog posts", resource: "blog", action: "create" },
      { name: "blog.read", description: "View blog posts", resource: "blog", action: "read" },
      { name: "blog.update", description: "Update blog posts", resource: "blog", action: "update" },
      { name: "blog.delete", description: "Delete blog posts", resource: "blog", action: "delete" },
      { name: "blog.publish", description: "Publish blog posts", resource: "blog", action: "publish" },

      // User permissions
      { name: "users.create", description: "Create users", resource: "users", action: "create" },
      { name: "users.read", description: "View users", resource: "users", action: "read" },
      { name: "users.update", description: "Update users", resource: "users", action: "update" },
      { name: "users.delete", description: "Delete users", resource: "users", action: "delete" },
      { name: "users.assign_roles", description: "Assign roles to users", resource: "users", action: "assign_roles" },

      // Query permissions
      { name: "queries.read", description: "View queries", resource: "queries", action: "read" },
      { name: "queries.update", description: "Update queries", resource: "queries", action: "update" },
      { name: "queries.delete", description: "Delete queries", resource: "queries", action: "delete" },

      // Analytics permissions
      { name: "analytics.read", description: "View analytics", resource: "analytics", action: "read" },

      // Transaction permissions
      { name: "transactions.read", description: "View transactions", resource: "transactions", action: "read" },

      // Refund permissions
      { name: "refunds.read", description: "View refunds", resource: "refunds", action: "read" },
      { name: "refunds.create", description: "Create refunds", resource: "refunds", action: "create" },
      { name: "refunds.process", description: "Process refunds", resource: "refunds", action: "process" },

      // Email template permissions
      { name: "email_templates.read", description: "View email templates", resource: "email_templates", action: "read" },
      { name: "email_templates.update", description: "Update email templates", resource: "email_templates", action: "update" },
      { name: "smtp_config.read", description: "View SMTP configuration", resource: "smtp_config", action: "read" },
      { name: "smtp_config.update", description: "Update SMTP configuration", resource: "smtp_config", action: "update" },
    ];

    console.log("📝 Creating permissions...\n");

    // Insert permissions (skip if exists)
    const createdPermissions = [];
    for (const perm of permissionsList) {
      const [existing] = await db
        .select()
        .from(permissions)
        .where(eq(permissions.name, perm.name))
        .limit(1);

      if (!existing) {
        const [created] = await db
          .insert(permissions)
          .values(perm)
          .returning();
        createdPermissions.push(created);
        console.log(`   ✅ Created permission: ${perm.name}`);
      } else {
        createdPermissions.push(existing);
        console.log(`   ℹ️  Permission exists: ${perm.name}`);
      }
    }

    console.log(`\n✅ ${createdPermissions.length} permissions ready\n`);

    // Define roles with their permissions
    const roleDefinitions = [
      {
        name: "super_admin",
        description: "Super administrator with all permissions",
        permissionNames: permissionsList.map(p => p.name), // ALL permissions
      },
      {
        name: "admin",
        description: "Administrator with most permissions",
        permissionNames: [
          "blog.create", "blog.read", "blog.update", "blog.delete", "blog.publish",
          "users.create", "users.read", "users.update",
          "queries.read", "queries.update", "queries.delete",
          "analytics.read",
          "transactions.read",
          "refunds.read", "refunds.create", "refunds.process",
          "email_templates.read", "email_templates.update",
          "smtp_config.read", "smtp_config.update",
        ],
      },
      {
        name: "editor",
        description: "Content editor - can manage blog and queries",
        permissionNames: [
          "blog.create", "blog.read", "blog.update", "blog.delete", "blog.publish",
          "queries.read", "queries.update",
        ],
      },
      {
        name: "viewer",
        description: "Read-only access to analytics and logs",
        permissionNames: [
          "users.read",
          "analytics.read",
          "transactions.read",
        ],
      },
    ];

    console.log("👥 Creating roles...\n");

    for (const roleDef of roleDefinitions) {
      // Create or get role
      let role;
      const [existing] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, roleDef.name))
        .limit(1);

      if (!existing) {
        [role] = await db
          .insert(roles)
          .values({ name: roleDef.name, description: roleDef.description })
          .returning();
        console.log(`   ✅ Created role: ${roleDef.name}`);
      } else {
        role = existing;
        console.log(`   ℹ️  Role exists: ${roleDef.name}`);
      }

      // Delete existing permissions for this role
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));

      // Assign permissions to role
      const permissionsToAssign = createdPermissions.filter(p =>
        roleDef.permissionNames.includes(p.name)
      );

      if (permissionsToAssign.length > 0) {
        await db.insert(rolePermissions).values(
          permissionsToAssign.map(p => ({
            roleId: role.id,
            permissionId: p.id,
          }))
        );
        console.log(`      └─ Assigned ${permissionsToAssign.length} permissions`);
      }
    }

    console.log("\n✅ Roles and permissions initialized successfully!\n");
    console.log("═══════════════════════════════════════════════════════════\n");
    console.log("📋 Summary:\n");
    console.log(`   • super_admin: ${permissionsList.length} permissions (ALL)`);
    console.log(`   • admin:       ${roleDefinitions[1].permissionNames.length} permissions`);
    console.log(`   • editor:      ${roleDefinitions[2].permissionNames.length} permissions`);
    console.log(`   • viewer:      ${roleDefinitions[3].permissionNames.length} permissions`);
    console.log("\n💡 Next steps:");
    console.log("   1. Run: npm run admin:create:secure");
    console.log("   2. This will create a super_admin user");
    console.log("   3. Login and start managing your platform!\n");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

initializeRolesAndPermissions();
