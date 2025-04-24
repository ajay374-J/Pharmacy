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
    
    # Get the Drug Inventory details with the correct field name
    try:
        # Log the query parameters
        frappe.log_error(f"Fetching inventory for user: {user}, date: {from_date}")
        
        # Query to get the Drug Inventory details with the correct field name
        inventory_query = """
            SELECT 
                di.name, di.start_time, di.end_time, 
                di.person_responsible_from_update_inventory
            FROM `tabDrug Inventory` di
            WHERE di.owner = %s AND di.posting_date = %s
            LIMIT 1
        """
        
        inventory_details = frappe.db.sql(inventory_query, (user, from_date), as_dict=True)
        
        if inventory_details:
            inventory_details = inventory_details[0]
            # Log what we found
            # frappe.log_error(f"Found inventory details: {inventory_details}")
            
            # Map the field to person_responsible for consistency in the frontend
            if inventory_details.get('person_responsible_from_update_inventory'):
                inventory_details['person_responsible'] = inventory_details['person_responsible_from_update_inventory']
        else:
            frappe.log_error(f"No inventory details found for date: {from_date}")
            inventory_details = {
                "start_time": "",
                "end_time": "",
                "person_responsible": ""
            }
    except Exception as e:
        frappe.log_error(f"Error fetching inventory details: {str(e)}")
        inventory_details = {
            "start_time": "",
            "end_time": "",
            "person_responsible": ""
        }
    
    # Start with base query for controlled inventory items
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
        close_bottle = float(item.get("close_bottle") or 0)

        # Calculate qty_in_hand
        try:
            qty_in_hand = (package_size * close_bottle) + open_bottle
        except Exception as e:
            frappe.log_error(f"Error calculating quantity for item {item.get('drug_name')}: {str(e)}")
            qty_in_hand = 0

        item["qty_in_hand"] = qty_in_hand
    
    # Create a response object with both inventory details and records
    response = {
        "items": records,
        "details": inventory_details
    }

    # Log the final response structure
    # frappe.log_error(f"Returning response with {len(records)} items and details: {inventory_details}")

    return response

@frappe.whitelist()
def get_pharmacy_info():
    """
    Get pharmacy information for the current user
    """
    user = frappe.session.user
    
    # Get info from the User Details doctype for the current user
    user_details_info = frappe.db.get_value(
        "User Details",
        {"user": user},
        [
            "pharmacy_name",
            "pharmacist_name",
            "user_type",
            "user_name",
            "email",
            "phone_number",
            "nabp_number",
            "npi_number",
            "address_line_1",
            "address_line_2",
            "stateprovince",
            "citydistrict",
            "dae_registration_number",
            "postal_code",
            "country",
            "fax_number"
        ],
        as_dict=True
    )
    
    # Initialize default empty response
    response = {
        "pharmacy_name": "",
        "pharmacist_name":"",
        "registrant_name": "",
        "address": "",
        "city": "",
        "state": "",
        "zip_code": "",
        "dea_number": "",
        "user_type": ""
    }
    
    if user_details_info:
        # Get user type
        user_type = user_details_info.get("user_type", "")
        
        # Determine which name to display based on user_type
        display_name = ""
        if user_type == "Pharmacy":
            display_name = user_details_info.get("pharmacy_name", "")
        elif user_type == "Pharmacist":
            display_name = user_details_info.get("pharmacist_name", "")
        
        # Fill in the response with user details
        response = {
            "pharmacy_name": display_name or "",
            "pharmacist_name":display_name or "",
            "registrant_name": user_details_info.get("user_name", ""),
            "address": user_details_info.get("address_line_1", ""),
            "city": user_details_info.get("citydistrict", ""),
            "state": user_details_info.get("stateprovince", ""),
            "zip_code": user_details_info.get("postal_code", ""),
            "dea_number": user_details_info.get("dae_registration_number", ""),  # DEA number not found in the database fields, leaving empty
            "user_type": user_type  # Include user_type in response
        }
    
    return response

@frappe.whitelist()
def email_pdf_report(pdf_data=None, file_name=None, from_date=None, class_name=None):
    """
    Send pharmacy report as PDF attachment via email
    
    Args:
        pdf_data: Base64 encoded PDF data
        file_name: Name for the PDF file attachment
        from_date: Date of the inventory report
        class_name: Class filter applied to the report
    """
    try:
        # Get current user's email
        user = frappe.session.user
        user_email = frappe.db.get_value("User", user, "email")
        
        if not user_email:
            return {"success": False, "error": "User email not found"}
        
        if not pdf_data:
            return {"success": False, "error": "PDF data is missing"}
        
        if not file_name:
            file_name = "inventory_report.pdf"
        
        # Remove the data URI prefix to get just the base64 data
        base64_data = pdf_data
        if "data:application/pdf;base64," in pdf_data:
            base64_data = pdf_data.split("data:application/pdf;base64,")[1]
        
        # Import base64 to decode the data
        import base64
        from io import BytesIO
        
        # Decode base64 to binary
        pdf_binary = base64.b64decode(base64_data)
        
        # Prepare email subject
        class_text = f"Class {class_name}" if class_name and class_name != "All Classes" else "All Classes"
        subject = f"Controlled Substances Inventory Report - {class_text} - {from_date}"
        
        # Prepare email content
        content = f"""
        <p>Dear {user},</p>
        <p>Please find attached the controlled substances inventory report for {from_date} ({class_text}).</p>
        <p>This is an automated email from the pharmacy inventory system.</p>
        """
        
        # Create a temporary file if needed for attachment
        from frappe.utils.file_manager import save_file
        
        # Save as a file in Frappe
        file_doc = save_file(
            file_name, 
            pdf_binary, 
            "User", 
            user,
            is_private=1
        )
        
        # Send email with the file attachment
        frappe.sendmail(
            recipients=user_email,
            subject=subject,
            message=content,
            attachments=[{
                "fname": file_name,
                "fcontent": pdf_binary
            }]
        )
        
        # Log success
        frappe.log_error(f"Successfully sent inventory report email to {user_email}")
        return {"success": True, "email": user_email}
    
    except Exception as e:
        # Log error
        error_msg = f"Error sending inventory report email: {str(e)}"
        frappe.log_error(error_msg)
        return {"success": False, "error": error_msg}