# Copyright (c) 2025, Jaideep and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class UserDetails(Document):
	def after_insert(self):
		user=frappe.db.get_value("User",{"name":self.email},"name")
		if user:
			self.db_set("user",user)
		if not user:
			doc=frappe.new_doc("User")
			doc.email=self.email
			doc.first_name=self.email
			doc.username=self.email
			doc.mobile_no=self.phone_number
			doc.phone=self.phone_number
			doc.user_type="Website User"
			doc.append("roles",{
				"role":"Pharmacy User"
			})
			doc.save(ignore_permissions=True)
			self.db_set("user",doc.name)
			self.db_set("owner",doc.name)

	def before_save(self):
		if self.user:
			doc=frappe.get_doc("User",self.user)
			doc.mobile_no=self.phone_number
			doc.phone=self.phone_number
			doc.save(ignore_permissions=True)
