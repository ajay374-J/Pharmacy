import frappe
from frappe import _

@frappe.whitelist()
def get_stock_entry_items(from_date=None):
    user = frappe.session.user
    data=[]
    filters = [
        ["Controlled Inventory C2", "owner", "=", user],
    ]

    if from_date:
        filters.append(["Controlled Inventory C2", "creation", ">=", from_date])
   

        data = frappe.db.get_all(
            "Controlled Inventory C2",
            fields=["ndc", "drug_name", "class", "count_type","manufurturer","package_size","inventory_on_hand"],
            filters=filters
        )
        
    return data
