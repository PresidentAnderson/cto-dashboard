#!/usr/bin/env python3

"""
Complete Database Setup Script - Python Version
Creates all database tables and admin user account
"""

import psycopg2
import hashlib
import json
from datetime import datetime

# Configuration
DATABASE_URL = "postgresql://postgres:Success*2026$$$@db.iithtbuedvwmtbagquxy.supabase.co:5432/postgres"
JWT_SECRET = "9eIYkI29Ui51haY7VtGuXFKg2y+gFWpwruK4y85gBHk="

ADMIN_EMAIL = "jonathan.mitchell.anderson@gmail.com"
ADMIN_PASSWORD = "J0n8th8n"
ADMIN_NAME = "Jonathan Anderson"
ADMIN_ROLE = "cto"

def hash_password(password):
    """Hash password using SHA-256 with JWT_SECRET (same as api/auth.js)"""
    return hashlib.sha256((password + JWT_SECRET).encode()).hexdigest()

def main():
    print("\n🚀 CTO Dashboard - Complete Database Setup\n")
    print("=" * 60)

    try:
        # Step 1: Connect to database
        print("\n📡 Connecting to Supabase...")
        conn = psycopg2.connect(
            DATABASE_URL,
            sslmode='require',
            connect_timeout=10
        )
        conn.autocommit = False
        cursor = conn.cursor()
        print("✅ Connected to database\n")

        # Step 2: Read and execute schema.sql
        print("📋 Creating database schema...")
        with open('database/schema.sql', 'r') as f:
            schema_sql = f.read()

        print("   • Executing schema.sql (409 lines)...")
        cursor.execute(schema_sql)
        conn.commit()
        print("✅ Database schema created successfully!\n")

        # Step 3: Verify tables
        print("🔍 Verifying tables...")
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        print(f"✅ Created {len(tables)} tables:")
        for table in tables:
            print(f"   • {table[0]}")
        print()

        # Step 4: Create admin user
        print("👤 Creating admin account...")

        # Check if user exists
        cursor.execute(
            "SELECT id, email FROM users WHERE email = %s",
            (ADMIN_EMAIL,)
        )
        existing = cursor.fetchone()

        if existing:
            print("⚠️  User already exists, updating...")
            cursor.execute(
                "UPDATE users SET name = %s, role = %s, updated_at = NOW() WHERE email = %s RETURNING id",
                (ADMIN_NAME, ADMIN_ROLE, ADMIN_EMAIL)
            )
            user_id = existing[0]
        else:
            cursor.execute(
                "INSERT INTO users (email, name, role, created_at, updated_at) VALUES (%s, %s, %s, NOW(), NOW()) RETURNING id",
                (ADMIN_EMAIL, ADMIN_NAME, ADMIN_ROLE)
            )
            user_id = cursor.fetchone()[0]
            print(f"✅ User created with ID: {user_id}")

        # Step 5: Store password hash
        password_hash = hash_password(ADMIN_PASSWORD)
        details = json.dumps({
            "email": ADMIN_EMAIL,
            "password_hash": password_hash
        })

        cursor.execute(
            """INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, created_at)
               VALUES (%s, %s, %s, %s, %s, NOW())""",
            (user_id, 'password_created', 'user', user_id, details)
        )
        print("✅ Password hash stored securely\n")

        conn.commit()

        # Step 6: Verify admin user
        print("🔍 Verifying admin account...")
        cursor.execute(
            "SELECT id, email, name, role, created_at FROM users WHERE email = %s",
            (ADMIN_EMAIL,)
        )
        user = cursor.fetchone()
        if user:
            print("✅ Admin account verified:")
            print(f"   • ID:    {user[0]}")
            print(f"   • Email: {user[1]}")
            print(f"   • Name:  {user[2]}")
            print(f"   • Role:  {user[3]}")
            print()

        # Step 7: Database statistics
        print("📊 Database Statistics:")
        cursor.execute("""
            SELECT
                (SELECT COUNT(*) FROM users) as user_count,
                (SELECT COUNT(*) FROM projects) as project_count,
                (SELECT COUNT(*) FROM bugs) as bug_count,
                (SELECT COUNT(*) FROM audit_log) as audit_log_count
        """)
        stats = cursor.fetchone()
        print(f"   • Users:     {stats[0]}")
        print(f"   • Projects:  {stats[1]}")
        print(f"   • Bugs:      {stats[2]}")
        print(f"   • Audit Log: {stats[3]}")
        print()

        # Success!
        print("=" * 60)
        print("\n✨ Setup Complete! ✨\n")
        print("🎯 Login Credentials:")
        print(f"   Email:    {ADMIN_EMAIL}")
        print(f"   Password: {ADMIN_PASSWORD}")
        print(f"   Role:     {ADMIN_ROLE}\n")
        print("🌐 Dashboard URL:")
        print("   https://cto-dashboard-qyypjst6d-axaiinovation.vercel.app\n")
        print("📝 Next Steps:")
        print("   1. Login to the dashboard")
        print("   2. Import projects: ./import-via-supabase.sh")
        print("   3. Add team members")
        print("   4. Customize branding\n")

        cursor.close()
        conn.close()

    except psycopg2.Error as e:
        print(f"\n❌ Database Error: {e}")
        print(f"\nError Code: {e.pgcode}")
        print(f"Error Details: {e.pgerror}")
        exit(1)
    except FileNotFoundError:
        print("\n❌ Error: database/schema.sql not found")
        print("   Make sure you're running this from the project root directory")
        exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

if __name__ == "__main__":
    main()
