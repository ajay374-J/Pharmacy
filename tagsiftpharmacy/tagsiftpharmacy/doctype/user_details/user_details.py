# Copyright (c) 2025, Jaideep and contributors
# For license information, please see license.txt

import frappe
from frappe.model.base_document import table_fields
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
			self.db_set("owner",doc.name)




	def validate_set_only_once(self):
		"""Validate that fields are not changed if not in insert"""
		set_only_once_fields = self.meta.get_set_only_once_fields()

		if set_only_once_fields and self._doc_before_save:
			# document exists before saving
			for field in set_only_once_fields:
				fail = False
				value = self.get(field.fieldname)
				original_value = self._doc_before_save.get(field.fieldname)

				if field.fieldtype in table_fields:
					fail = not self.is_child_table_same(field.fieldname)
				elif field.fieldtype in ("Date", "Datetime", "Time"):
					fail = str(value) != str(original_value)
				else:
					fail = value != original_value

				if fail:
					pass
					# print("######################################")
					# frappe.throw(
					# 	_("Value cannot be changed for {0}").format(
					# 		frappe.bold(self.meta.get_label(field.fieldname))
					# 	),
					# 	exc=frappe.CannotChangeConstantError,
					# )

		return False