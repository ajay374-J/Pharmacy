

from frappe.website.doctype.web_form.web_form import WebForm
import frappe

class CustomWebForm(WebForm):
    def load_translations(self, context):
        messages = [
            "Sr",
            "Attach",
            "Next",
            "Previous",
            "Discard?",
            "Cancel",
            "Discard:Button in web form",
            "Edit:Button in web form",
            "See previous responses:Button in web form",
            "Edit your response:Button in web form",
            "Are you sure you want to discard the changes?",
            "Mandatory fields required::Error message in web form",
            "Invalid values for fields::Error message in web form",
            "Error:Title of error message in web form",
            "Page {0} of {1}",
            "Couldn't save, please check the data you have entered",
            "Validation Error",
            self.title,
            self.introduction_text,
            self.success_title,
            self.success_message,
            self.list_title,
            self.button_label,
            self.meta_title,
            self.meta_description,
        ]

        for field in self.web_form_fields:
            messages.extend([field.label, field.description])
            if field.fieldtype == "Select" and field.options:
                messages.extend(field.options.split("\n"))

        # When at least one field in self.web_form_fields has fieldtype "Table" then add "No data" to messages
        if any(field.fieldtype == "Table" for field in self.web_form_fields):
            messages.append("Move")
            messages.append("Insert Above")
            messages.append("Insert Below")
            messages.append("Duplicate")
            messages.append("Shortcuts")
            messages.append("Ctrl + Up")
            messages.append("Ctrl + Down")
            messages.append("ESC")
            messages.append("Editing Row")
            messages.append("Add / Remove Columns")
            messages.append("Fieldname")
            messages.append("Column Width")
            messages.append("Configure Columns")
            messages.append("Select Fields")
            messages.append("Select All")
            messages.append("Update")
            messages.append("Reset to default")
            messages.append("No Data")
            messages.append("Delete")
            messages.append("Delete All")
            messages.append("Add Row")
            messages.append("Add Multiple")
            messages.append("Download")
            messages.append("of")
            messages.append("Upload")
            messages.append("Last")
            messages.append("First")
            messages.append("No.")

        # Phone Picker
        if any(field.fieldtype == "Phone" for field in self.web_form_fields):
            messages.append("Search for countries...")

        # Dates
        if any(field.fieldtype == "Date" for field in self.web_form_fields):
            messages.append("Now")
            messages.append("Today")
            messages.append("Date {0} must be in format: {1}")
            messages.append("{0} to {1}")

        # Time
        if any(field.fieldtype == "Time" for field in self.web_form_fields):
            messages.append("Now")

        messages.extend(col.get("label") if col else "" for col in self.list_columns)

        context.translated_messages = frappe.as_json({message: frappe._(message) for message in messages if message})