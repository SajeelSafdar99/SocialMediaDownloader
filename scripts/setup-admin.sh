#!/bin/bash

# Script to set up admin panel

echo "🔧 Setting up Admin Panel..."

# Create first admin user
echo ""
echo "📝 You need to create an admin user in the database."
echo ""
echo "Run this SQL command in your database:"
echo ""
echo "UPDATE users SET role = 'admin' WHERE username = 'YOUR_USERNAME';"
echo ""
echo "Replace YOUR_USERNAME with your actual username."
echo ""
echo "Or use this command to create a new admin user:"
echo ""
cat << 'EOF'
INSERT INTO users (username, email, password, role, "is_premium", "created_at", "updated_at")
VALUES ('admin', 'admin@yourdomain.com', 'HASHED_PASSWORD_HERE', 'admin', true, NOW(), NOW());
EOF
echo ""
echo "⚠️  Remember to hash the password using bcrypt before inserting!"
echo ""
echo "✅ Admin routes are registered at: /api/admin/*"
echo "✅ Admin panel will be accessible at: /admin (or admin.yourdomain.com with proper DNS/proxy setup)"
echo ""
echo "📋 Next Steps:"
echo "1. Create an admin user in the database"
echo "2. Build the admin panel: npm run build"
echo "3. Access admin panel at: http://localhost:5006/admin"
echo "4. Login with your admin credentials"
echo ""
echo "🔐 Security Notes:"
echo "- Change ADMIN_JWT_SECRET in .env file"
echo "- Use strong passwords for admin accounts"
echo "- Enable HTTPS in production"
echo "- Set up proper subdomain routing with your web server/proxy"
echo ""
