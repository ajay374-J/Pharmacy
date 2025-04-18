# patches/add_navbar_items.py

import frappe

def execute():
    website_settings = frappe.get_single("Website Settings")

    website_settings.append("top_bar_items",{
            "label": "Pharmacy Report",
            "url": "/pharmacy_report",
        })
    website_settings.append("top_bar_items",{
            "label": "Update Inventory",
            "url": "/controlled-inventory",
        })
    website_settings.append("top_bar_items",{
        "label": "Edit Profile",
        "url":"/update-details"
    })


    website_settings.save(ignore_permissions=True)
    frappe.db.commit()
