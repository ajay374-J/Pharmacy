import frappe

def set_permission(self,method):
    self.append("roles",{
        "role":"Pharmacy User"
    })












@frappe.whitelist()
def get_user_details_case_insensitive():
    user = frappe.session.user.lower()
    result = frappe.db.sql("""
        SELECT name 
        FROM `tabUser Details`
        WHERE LOWER(user) = %s
        LIMIT 1
    """, (user,), as_dict=True)

    return result[0] if result else {}
