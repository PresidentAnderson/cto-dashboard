#!/usr/bin/env python3

"""
Database Setup with IPv6 fallback
Tries multiple connection methods to bypass DNS issues
"""

import psycopg2
import sys

# Try multiple connection approaches
CONNECTION_ATTEMPTS = [
    # Attempt 1: Standard hostname
    {
        'host': 'db.iithtbuedvwmtbagquxy.supabase.co',
        'port': 5432,
        'database': 'postgres',
        'user': 'postgres',
        'password': 'Success*2026$$$',
        'sslmode': 'require'
    },
    # Attempt 2: IPv6 address
    {
        'host': '2600:1f16:1cd0:3300:b302:cf8b:1d42:4843',
        'port': 5432,
        'database': 'postgres',
        'user': 'postgres',
        'password': 'Success*2026$$$',
        'sslmode': 'require'
    },
    # Attempt 3: Connection pooler (port 6543)
    {
        'host': 'db.iithtbuedvwmtbagquxy.supabase.co',
        'port': 6543,
        'database': 'postgres',
        'user': 'postgres',
        'password': 'Success*2026$$$',
        'sslmode': 'require'
    },
]

def try_connection(config):
    """Try to connect with given configuration"""
    try:
        print(f"  Trying: {config['host']}:{config['port']}...", end=' ')
        conn = psycopg2.connect(**config, connect_timeout=10)
        print("✅ SUCCESS!")
        return conn
    except Exception as e:
        print(f"❌ Failed: {str(e)[:50]}")
        return None

def main():
    print("\n🔄 Attempting Database Connection...\n")
    print("=" * 60)

    conn = None
    for i, config in enumerate(CONNECTION_ATTEMPTS, 1):
        print(f"\nAttempt {i}:")
        conn = try_connection(config)
        if conn:
            break

    if not conn:
        print("\n" + "=" * 60)
        print("\n❌ All connection attempts failed")
        print("\n🔧 Please use Supabase SQL Editor:")
        print("   https://app.supabase.com/project/iithtbuedvwmtbagquxy/sql/new")
        print("\n   Then execute: database/complete-setup.sql")
        sys.exit(1)

    try:
        cursor = conn.cursor()

        print("\n" + "=" * 60)
        print("\n✅ Connected! Executing setup...\n")

        # Read and execute the complete setup SQL
        with open('database/complete-setup.sql', 'r') as f:
            sql = f.read()

        print("📋 Executing complete-setup.sql...")
        cursor.execute(sql)
        conn.commit()
        print("✅ Setup SQL executed successfully!")

        # Verify
        print("\n🔍 Verifying setup...")
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

        # Verify admin user
        cursor.execute("""
            SELECT email, name, role
            FROM users
            WHERE email = 'jonathan.mitchell.anderson@gmail.com'
        """)
        user = cursor.fetchone()
        if user:
            print(f"\n✅ Admin user created:")
            print(f"   • Email: {user[0]}")
            print(f"   • Name:  {user[1]}")
            print(f"   • Role:  {user[2]}")

        cursor.close()
        conn.close()

        print("\n" + "=" * 60)
        print("\n✨ Setup Complete! ✨\n")
        print("🎯 Login Credentials:")
        print("   Email:    jonathan.mitchell.anderson@gmail.com")
        print("   Password: J0n8th8n")
        print("   Role:     cto\n")
        print("🌐 Dashboard:")
        print("   https://cto-dashboard-qyypjst6d-axaiinovation.vercel.app\n")

    except Exception as e:
        print(f"\n❌ Error during setup: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
