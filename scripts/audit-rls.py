import os
import re
import sys

def audit_migrations(migrations_dir):
    if not os.path.exists(migrations_dir):
        print(f"Migrations directory not found: {migrations_dir}")
        return True

    migration_files = [f for f in os.listdir(migrations_dir) if f.endswith('.sql')]
    if not migration_files:
        print("No SQL migrations found.")
        return True

    print(f"Auditing {len(migration_files)} migrations in {migrations_dir} for Row-Level Security (RLS)...")
    
    passed = True
    
    # regex matches CREATE TABLE (IF NOT EXISTS) public.<name>
    create_table_regex = re.compile(r'create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_"]+)', re.IGNORECASE)
    
    for filename in migration_files:
        filepath = os.path.join(migrations_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        tables = create_table_regex.findall(content)
        for table in tables:
            clean_table_name = table.replace('"', '')
            
            # Look for ENABLE ROW LEVEL SECURITY
            rls_pattern = rf'alter\s+table\s+(?:public\.)?{re.escape(table)}\s+enable\s+row\s+level\s+security'
            rls_match = re.search(rls_pattern, content, re.IGNORECASE)
            
            if not rls_match:
                print(f"\033[91m[FAIL]\033[0m Table '{clean_table_name}' in {filename} does not have Row-Level Security enabled!")
                passed = False
            else:
                print(f"\033[92m[PASS]\033[0m Table '{clean_table_name}' in {filename} has RLS enabled.")

    return passed

if __name__ == "__main__":
    migrations_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'supabase', 'migrations')
    success = audit_migrations(migrations_path)
    if not success:
        sys.exit(1)
    else:
        print("\033[92m[SUCCESS]\033[0m All tables have RLS enabled.")
        sys.exit(0)
