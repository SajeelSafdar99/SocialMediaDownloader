import { db } from "../server/db";
import { users, roles, permissions, rolePermissions } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
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

async function initializeRolesIfNeeded() {
  try {
    const existingRoles = await db.select().from(roles).limit(1);
    if (existingRoles.length > 0) {
      console.log("✅ Roles already initialized\n");
      return;
    }

    console.log("🔧 Initializing roles and permissions...\n");

    const permissionsList = [
      { name: "blog.create", description: "Create blog posts", resource: "blog", action: "create" },
      { name: "blog.read", description: "View blog posts", resource: "blog", action: "read" },
      { name: "blog.update", description: "Update blog posts", resource: "blog", action: "update" },
      { name: "blog.delete", description: "Delete blog posts", resource: "blog", action: "delete" },
      { name: "blog.publish", description: "Publish blog posts", resource: "blog", action: "publish" },
      { name: "users.create", description: "Create users", resource: "users", action: "create" },
      { name: "users.read", description: "View users", resource: "users", action: "read" },
      { name: "users.update", description: "Update users", resource: "users", action: "update" },
      { name: "users.delete", description: "Delete users", resource: "users", action: "delete" },
      { name: "users.assign_roles", description: "Assign roles to users", resource: "users", action: "assign_roles" },
      { name: "queries.read", description: "View queries", resource: "queries", action: "read" },
      { name: "queries.update", description: "Update queries", resource: "queries", action: "update" },
      { name: "queries.delete", description: "Delete queries", resource: "queries", action: "delete" },
      { name: "analytics.read", description: "View analytics", resource: "analytics", action: "read" },
      { name: "transactions.read", description: "View transactions", resource: "transactions", action: "read" },
      { name: "refunds.read", description: "View refunds", resource: "refunds", action: "read" },
      { name: "refunds.create", description: "Create refunds", resource: "refunds", action: "create" },
      { name: "refunds.process", description: "Process refunds", resource: "refunds", action: "process" },
      { name: "email_templates.read", description: "View email templates", resource: "email_templates", action: "read" },
      { name: "email_templates.update", description: "Update email templates", resource: "email_templates", action: "update" },
      { name: "smtp_config.read", description: "View SMTP configuration", resource: "smtp_config", action: "read" },
      { name: "smtp_config.update", description: "Update SMTP configuration", resource: "smtp_config", action: "update" },
    ];

    const createdPermissions = [];
    for (const perm of permissionsList) {
      const [created] = await db.insert(permissions).values(perm).returning();
      createdPermissions.push(created);
    }

    const [superAdminRole] = await db
      .insert(roles)
      .values({ name: "super_admin", description: "Super administrator with all permissions" })
      .returning();

    await db.insert(rolePermissions).values(
      createdPermissions.map(p => ({ roleId: superAdminRole.id, permissionId: p.id }))
    );

    await db.insert(roles).values({ name: "admin", description: "Administrator" });
    await db.insert(roles).values({ name: "editor", description: "Content editor" });
    await db.insert(roles).values({ name: "viewer", description: "Read-only access" });

    console.log("✅ Roles and permissions initialized!\n");
  } catch (error: any) {
    console.log("⚠️  Warning: Could not initialize roles:", error.message, "\n");
  }
}

async function createAdminUser() {
  console.log("🔐 Admin User Setup (Simple Method)\n");
  console.log("⚠️  NOTE: This is the basic admin creation method.");
  console.log("   For enhanced security with secret key + 2FA support,");
  console.log("   use: npm run admin:create:secure\n");

  await initializeRolesIfNeeded();

  const username = await question("Enter admin username: ");
  const email = await question("Enter admin email: ");
  const password = await question("Enter admin password: ");

  if (!username || !email || !password) {
    console.error("❌ All fields are required!");
    process.exit(1);
  }

  try {
    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    // Get super_admin role
    const [superAdminRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, "super_admin"))
      .limit(1);

    if (existingUser) {
      console.log(`\n⚠️  User '${username}' already exists.`);
      const update = await question("Do you want to update them to admin? (yes/no): ");

      if (update.toLowerCase() === "yes" || update.toLowerCase() === "y") {
        await db
          .update(users)
          .set({
            role: "admin",
            roleId: superAdminRole?.id,
            isPremium: true,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));

        console.log(`\n✅ User '${username}' has been updated to super admin!`);
        console.log(`🎉 Granted ALL ${superAdminRole ? '18' : ''} permissions!`);
      } else {
        console.log("\n❌ Operation cancelled.");
      }
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(password, 10);

      const [newUser] = await db
        .insert(users)
        .values({
          username,
          email,
          password: hashedPassword,
          role: "admin",
          roleId: superAdminRole?.id,
          isPremium: true,
        })
        .returning();

      console.log(`\n✅ Admin user '${username}' has been created successfully!`);
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 User ID: ${newUser.id}`);
      console.log(`🛡️ Role: super_admin (ALL permissions)`);
    }

    console.log(`\n🌐 You can now login at: http://localhost:5173/admin`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: [your password]`);
    console.log(`\n💡 TIP: Enable 2FA after login for extra security!\n`);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

createAdminUser();
