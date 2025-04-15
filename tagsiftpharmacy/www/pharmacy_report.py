import frappe
from frappe import _

@frappe.whitelist()
def get_stock_entry_items(from_date=None):
    """
    Get controlled inventory items based on date
    """
    user = frappe.session.user
    
    query = """
        SELECT 
            ci.ndc, ci.drug_name, ci.class, ci.count_type, 
            ci.manufacturer, ci.package_size, ci.inventory_on_hand,
            ci.open_bottle, ci.close_bott as close_bottle
        FROM `tabDrug Inventory` di 
        JOIN `tabControlled Inventory` ci ON di.name = ci.parent 
        WHERE di.owner = %s AND di.posting_date = %s
    """
    
    records = frappe.db.sql(query, (user, from_date), as_dict=True)
    
    for item in records:
        # Ensure values are numeric
        package_size = float(item.get("package_size") or 0)
        open_bottle = float(item.get("open_bottle") or 0)
        close_bottle = float(item.get("close_bott") or 0)

        # Calculate qty_in_hand
        try:
            qty_in_hand = (package_size * close_bottle) + open_bottle
        except Exception as e:
            frappe.log_error(f"Error calculating quantity for item {item.get('drug_name')}: {str(e)}")
            qty_in_hand = 0

        item["qty_in_hand"] = qty_in_hand

    return records

@frappe.whitelist()
def get_pharmacy_info():
    """
    Get pharmacy information for the current user
    """
    user = frappe.session.user
    
    try:
        # Get the user document to access user details
        user_details = frappe.get_doc("User", user)
        
        if user_details:
            # Get pharmacy_name (company name)
            pharmacy_name = ""
            try:
                company = frappe.get_value("User", user, "company")
                if company:
                    company_doc = frappe.get_doc("Company", company)
                    pharmacy_name = company_doc.company_name
            except Exception:
                pharmacy_name = ""
            
            # Get DEA info
            dea_info = {}
            try:
                company = frappe.get_value("User", user, "company")
                if company:
                    dea_info = frappe.db.get_value(
                        "Pharmacy Settings", 
                        {"company": company},
                        ["registrant_name", "dea_number"],
                        as_dict=True
                    ) or {}
            except Exception:
                dea_info = {}
            
            # Return only the exact fields requested
            return {
                "pharmacy_name": pharmacy_name or "",
                "registrant_name": dea_info.get("registrant_name", ""),
                "address": getattr(user_details, "address_line1", "") or "",
                "city": getattr(user_details, "city_district", "") or "",
                "state": getattr(user_details, "state_province", "") or "",
                "zip_code": getattr(user_details, "postal_code", "") or "",
                "dea_number": dea_info.get("dea_number", "")
            }
    except Exception as e:
        frappe.log_error(f"Error fetching pharmacy info: {str(e)}")
    
    # Return empty data if we couldn't get the information
    return {
        "pharmacy_name": "",
        "registrant_name": "",
        "address": "",
        "city": "",
        "state": "",
        "zip_code": "",
        "dea_number": ""
    }