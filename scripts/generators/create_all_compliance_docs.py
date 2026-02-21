#!/usr/bin/env python3
"""
Master script to create all Phase 4 Compliance & Monitoring documentation files.
This imports individual content modules and generates all 20 documentation files.
"""

import os
import sys

# Add the scripts directory to path
sys.path.append(os.path.dirname(__file__))

# Import content generators
from compliance_content import gdpr, ccpa, accessibility, audit, retention

def write_file(filepath, content):
    """Write content to file"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Created: {filepath}")

def main():
    BASE = 'c:/Users/AA/KitchenXpertProject/docs/compliance'

    print("="*70)
    print(" KitchenXpert - Phase 4 Compliance & Monitoring Documentation")
    print("="*70)
    print()

    files_created = 0

    # GDPR Files (6 files)
    print("[1/5] Creating GDPR documentation...")
    gdpr_files = {
        'overview.md': gdpr.get_overview(),
        'data-processing.md': gdpr.get_data_processing(),
        'consent-management.md': gdpr.get_consent_management(),
        'data-subject-rights.md': gdpr.get_data_subject_rights(),
        'data-breach-protocol.md': gdpr.get_data_breach_protocol(),
        'dpia.md': gdpr.get_dpia(),
    }
    for filename, content in gdpr_files.items():
        write_file(f"{BASE}/gdpr/{filename}", content)
        files_created += 1

    # CCPA Files (3 files)
    print("[2/5] Creating CCPA documentation...")
    ccpa_files = {
        'overview.md': ccpa.get_overview(),
        'consumer-rights.md': ccpa.get_consumer_rights(),
        'opt-out-mechanism.md': ccpa.get_opt_out_mechanism(),
    }
    for filename, content in ccpa_files.items():
        write_file(f"{BASE}/ccpa/{filename}", content)
        files_created += 1

    # Accessibility Files (4 files)
    print("[3/5] Creating Accessibility documentation...")
    accessibility_files = {
        'wcag-compliance.md': accessibility.get_wcag_compliance(),
        'aria-guidelines.md': accessibility.get_aria_guidelines(),
        'keyboard-navigation.md': accessibility.get_keyboard_navigation(),
        'screen-readers.md': accessibility.get_screen_readers(),
    }
    for filename, content in accessibility_files.items():
        write_file(f"{BASE}/accessibility/{filename}", content)
        files_created += 1

    # Audit Files (4 files)
    print("[4/5] Creating Audit documentation...")
    audit_files = {
        'audit-log-structure.md': audit.get_audit_log_structure(),
        'event-types.md': audit.get_event_types(),
        'compliance-reporting.md': audit.get_compliance_reporting(),
        'log-retention.md': audit.get_log_retention(),
    }
    for filename, content in audit_files.items():
        write_file(f"{BASE}/audit/{filename}", content)
        files_created += 1

    # Data Retention Files (3 files)
    print("[5/5] Creating Data Retention documentation...")
    retention_files = {
        'policy.md': retention.get_policy(),
        'implementation.md': retention.get_implementation(),
        'archiving.md': retention.get_archiving(),
    }
    for filename, content in retention_files.items():
        write_file(f"{BASE}/data-retention/{filename}", content)
        files_created += 1

    print()
    print("="*70)
    print(f"✓ Successfully created all {files_created} compliance documentation files!")
    print("="*70)
    print()
    print("Files created:")
    print(f"  • GDPR: 6 files")
    print(f"  • CCPA: 3 files")
    print(f"  • Accessibility: 4 files")
    print(f"  • Audit: 4 files")
    print(f"  • Data Retention: 3 files")
    print()
    print("Total: 20 production-ready compliance documentation files")

if __name__ == "__main__":
    main()
