# Copyright (c) 2025, Jaideep and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class UserDetails(Document):
	def after_insert(self):
		doc=frappe.new_doc("User")
		doc.email=self.email
		doc.first_name=self.user_name
		doc.username=self.user_name
		doc.user_type="Website User"
		doc.save(ignore_permissions=True)
		self.db_set("user",doc.name)
