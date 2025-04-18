import frappe
from frappe import _

@frappe.whitelist()
def get_class_options():
    """
    Get available class options from the Class doctype
    """
    try:
        # Fetch all classes from the Class doctype
        classes = frappe.get_all("Class", fields=["name"])
        return classes
    except Exception as e:
        frappe.log_error(f"Error fetching class options: {str(e)}")
        return []

@frappe.whitelist()
def get_stock_entry_items(from_date=None, class_name=None):
    """
    Get controlled inventory items based on date and class_name filter
    
    Args:
        from_date: Date for which to fetch inventory
        class_name: Class filter (optional) - references the Class doctype
    """
    user = frappe.session.user
    
    # Start with base query
    query = """
        SELECT 
            ci.ndc, ci.drug_name, ci.class, ci.count_type, 
            ci.manufacturer, ci.package_size, ci.inventory_on_hand,
            ci.open_bottle, ci.close_bott as close_bottle
        FROM `tabDrug Inventory` di 
        JOIN `tabControlled Inventory` ci ON di.name = ci.parent 
        WHERE di.owner = %s AND di.posting_date = %s
    """
    
    # Prepare query parameters
    params = [user, from_date]
    
    # Add class filter if provided
    if class_name:
        query += " AND ci.class = %s"
        params.append(class_name)
    
    # Execute query
    records = frappe.db.sql(query, tuple(params), as_dict=True)
    
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
    First checks the screenshot doctype, then falls back to user details
    """
    user = frappe.session.user
    # try:
        # First try to get info from the User Details doctype for the current user
    user_details_info = frappe.db.get_value(
        "User Details",  # Correct doctype name
        {"user": user},
        [
            "pharmacy_name",
            "user_name",
            "email",
            "phone_number",
            "nabp_number",
            "npi_number",
            "address_line_1",
            "address_line_2",
            "stateprovince",
            "citydistrict",
            "postal_code",
            "country",
            "fax_number"
        ],
        as_dict=True
    )
    if user_details_info:
        # If we found matching data in the User Details doctype
        return {
            "pharmacy_name": user_details_info.get("pharmacy_name", ""),
            "registrant_name": user_details_info.get("user_name", ""),
            "address": user_details_info.get("address_line_1", ""),
            "city": user_details_info.get("citydistrict", ""),
            "state": user_details_info.get("stateprovince", ""),
            "zip_code": user_details_info.get("postal_code", ""),
            "dea_number": ""  # DEA number not found in screenshot, leaving empty
        }
    