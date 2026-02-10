import { createSecureAdmin, generateAdminSecretKey } from "../server/services/secureAdminService";
import { loadEnv } from "../server/env";
import { db } from "../server/db";
import { roles, permissions, rolePermissions } from "../shared/schema";
import { eq } from "drizzle-orm";
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
    // Check if roles exist
    const existingRoles = await db.select().from(roles).limit(1);

    if (existingRoles.length > 0) {
      console.log("✅ Roles already initialized\n");
      return;
    }

    console.log("🔧 Initializing roles and permissions...\n");

    // Define all permissions
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

    // Insert permissions
    const createdPermissions = [];
    for (const perm of permissionsList) {
      const [created] = await db.insert(permissions).values(perm).returning();
      createdPermissions.push(created);
    }

    // Create super_admin role with all permissions
    const [superAdminRole] = await db
      .insert(roles)
      .values({
        name: "super_admin",
        description: "Super administrator with all permissions",
      })
      .returning();

    // Assign all permissions to super_admin
    await db.insert(rolePermissions).values(
      createdPermissions.map(p => ({
        roleId: superAdminRole.id,
        permissionId: p.id,
      }))
    );

    // Create other roles
    const [adminRole] = await db
      .insert(roles)
      .values({ name: "admin", description: "Administrator with most permissions" })
      .returning();

    const [editorRole] = await db
      .insert(roles)
      .values({ name: "editor", description: "Content editor" })
      .returning();

    const [viewerRole] = await db
      .insert(roles)
      .values({ name: "viewer", description: "Read-only access" })
      .returning();

    console.log("✅ Roles and permissions initialized successfully!\n");
  } catch (error: any) {
    console.error("⚠️  Warning: Could not initialize roles:", error.message);
    console.log("   You can run 'npm run admin:init-roles' manually if needed.\n");
  }
}

async function createAdminUser() {
  console.log("🔐 Secure Admin User Setup\n");
  console.log("═══════════════════════════════════════════════════════════");

  // Auto-initialize roles if needed
  await initializeRolesIfNeeded();

  // Check if ADMIN_CREATION_SECRET is set
  if (!process.env.ADMIN_CREATION_SECRET) {
    console.log("\n⚠️  ADMIN_CREATION_SECRET not found in environment!");
    console.log("\n📝 Generating a new admin creation secret...\n");

    const newSecret = generateAdminSecretKey();
    console.log("🔑 Your Admin Creation Secret (save this securely):");
    console.log(`   ${newSecret}\n`);
    console.log("📋 Add this to your .env file:");
    console.log(`   ADMIN_CREATION_SECRET=${newSecret}\n`);
    console.log("⚠️  Keep this secret safe! Anyone with this key can create admins.\n");
    console.log("═══════════════════════════════════════════════════════════\n");

    const proceed = await question("Continue with this secret? (yes/no): ");
    if (proceed.toLowerCase() !== "yes" && proceed.toLowerCase() !== "y") {
      console.log("\n❌ Operation cancelled.");
      rl.close();
      process.exit(0);
    }

    // Temporarily set it for this session
    process.env.ADMIN_CREATION_SECRET = newSecret;
  }

  console.log("\n📝 Enter admin details:\n");

  const username = await question("Admin username: ");
  const email = await question("Admin email: ");
  const password = await question("Admin password: ");
  const secretKey = await question("Admin creation secret key: ");

  if (!username || !email || !password || !secretKey) {
    console.error("\n❌ All fields are required!");
    rl.close();
    process.exit(1);
  }

  try {
    const { user, created } = await createSecureAdmin({
      username,
      email,
      password,
      secretKey,
    });

    if (created) {
      console.log(`\n✅ Admin user '${username}' has been created successfully!`);
    } else {
      console.log(`\n✅ User '${username}' has been updated to admin!`);
    }

    console.log(`📧 Email: ${email}`);
    console.log(`🔑 User ID: ${user.id}`);
    console.log(`\n🌐 You can now login at: http://localhost:5173/admin`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: [your password]`);
    console.log(`\n🔐 IMPORTANT: Enable 2FA after first login for extra security!\n`);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);

    if (error.message.includes('Invalid admin creation secret')) {
      console.log("\n💡 Tip: Make sure you're using the correct ADMIN_CREATION_SECRET");
      console.log("   Check your .env file or generate a new one.\n");
    }

    rl.close();
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

createAdminUser();
