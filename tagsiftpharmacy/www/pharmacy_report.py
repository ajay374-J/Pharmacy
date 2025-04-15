import frappe
from frappe import _

@frappe.whitelist()
def get_stock_entry_items(from_date=None):
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
    print("$$$$$$$$$$$$$$$$$$$$$$$$",records)
    for item in records:
        # Ensure values are numeric
        package_size = item.get("package_size") or 0
        open_bottle = item.get("open_bottle") or 0
        close_bottle = item.get("close_bott") or 0

        # Calculate qty_in_hand
        try:
            qty_in_hand = (float(package_size) * float(close_bottle)) + float(open_bottle)
        except:
            qty_in_hand = 0

        item["qty_in_hand"] = qty_in_hand

    return records
