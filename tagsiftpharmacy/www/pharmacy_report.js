frappe.ready(function () {
    // Store pharmacy data globally
    let pharmacyData = {};
    let userType = "";
    
    // First check if user has a profile
    // Check if user details exist for the current logged-in user
    frappe.call({
        method: "tagsiftpharmacy.tagsiftpharmacy.user.get_user_details_case_insensitive",
        callback: function(r) {
            console.log("Custom Method Response:", r.message);

            if (!r.message || !r.message.name) {
                console.log("User details not found, showing dialog");

                let d = new frappe.ui.Dialog({
                    title: __("User Profile Not Found"),
                    static: 1,
                    primary_action_label: __("Update Profile"),
                    primary_action: function () {
                        window.location.href = "/signup";
                    }
                });

                d.fields = [];

                d.$body.html(
                    '<div class="text-center">' +
                    __("You need to create a user profile before accessing this form.") +
                    '</div>'
                );

                d.$wrapper.find(".modal-header .close").remove();
                d.show();
            } else {
                console.log("User details found:", r.message.name);
                // continue your app logic here
                initPage();
            }
        }
    });
    
    // Initialize the page
    async function initPage() {
        try {
            // Fetch pharmacy info
            const pharmacyInfo = await fetchPharmacyInfo();
            populatePharmacyInfo(pharmacyInfo);
            
            // Fetch and populate class filter options
            await populateClassOptions();
            
            // Set default date to today if not already set
            const fromDateInput = document.querySelector("#from_date");
            if (!fromDateInput.value) {
                const today = new Date().toISOString().split('T')[0];
                fromDateInput.value = today;
            }
            
            // Fetch initial items
            await fetchItems(document.querySelector("#from_date").value, document.querySelector("#class_name").value);
        } catch (error) {
            console.error("Error initializing page:", error);
            frappe.msgprint("Error loading data. Please try again.");
        }
    }
    
    // Update page title based on selected class
    function updatePageTitle(className) {
        const pageTitle = document.getElementById("page_title");
        if (className){
            pageTitle.textContent = `CONTROLLED SUBSTANCES C-${className} INVENTORY LOG`;
        } else {
            pageTitle.textContent = "CONTROLLED SUBSTANCES INVENTORY LOG";
        }
    }
    
// Fetch class options and populate the dropdown
async function populateClassOptions() {
    try {
        const res = await frappe.call({
            method: "tagsiftpharmacy.www.pharmacy_report.get_class_options"
        });
        
        const classSelect = document.getElementById("class_name");
        const classes = res.message || [];
        
        // Keep the "All Classes" option and add the dynamic options
        classes.forEach(classOption => {
            const option = document.createElement("option");
            option.value = classOption.name;
            option.textContent = classOption.name;
            classSelect.appendChild(option);
        });
        
        // Add event listener to class dropdown to update page title and fetch data
        classSelect.addEventListener("change", function() {
            const selectedClass = this.value;
            const fromDate = document.getElementById('from_date').value;
            
            // Update page title
            updatePageTitle(selectedClass);
            
            // Fetch data for the selected class
            if (fromDate) {
                fetchItems(fromDate, selectedClass);
            }
        });
        
    } catch (error) {
        console.error("Error fetching class options:", error);
    }
}
    
    // Fetch pharmacy information from API
    async function fetchPharmacyInfo() {
        try {
            const res = await frappe.call({
                method: "tagsiftpharmacy.www.pharmacy_report.get_pharmacy_info"
            });
        
            pharmacyData = res.message || {
                pharmacy_name: "",
                address: "",
                city: "",
                state: "",
                zip_code: "",
                dea_number: "",
                user_type: ""
            };
            
            // Store the user type for later use
            userType = pharmacyData.user_type || "";
            
            return pharmacyData;
        } catch (error) {
            console.error("Error fetching pharmacy info:", error);
            return {};
        }
    }
    
    // Populate pharmacy info in the form
    function populatePharmacyInfo(info) {
        document.getElementById("pharmacy_name").value = info.pharmacy_name || "";
        document.getElementById("address").value = info.address || "";
        document.getElementById("city").value = info.city || "";
        document.getElementById("state").value = info.state || "";
        document.getElementById("zip_code").value = info.zip_code || "";
        document.getElementById("dea_number").value = info.dea_number || "";
        
        // Update the label based on user type
        const pharmacyNameLabel = document.getElementById("pharmacy_name_label");
        if (info.user_type === "Pharmacist") {
            pharmacyNameLabel.textContent = "Name Of Pharmacist:";
        } else {
            pharmacyNameLabel.textContent = "Name Of Pharmacy:";
        }
    }
    
    // Direct API call function for date changes - more reliable
    function handleDateChange() {
        const fromDate = document.getElementById('from_date').value;
        const className = document.getElementById('class_name').value;
        
        if (fromDate) {
            console.log("Date changed to:", fromDate);
            frappe.call({
                method: "tagsiftpharmacy.www.pharmacy_report.get_stock_entry_items",
                args: {
                    from_date: fromDate,
                    class_name: className
                },
                callback: function(r) {
                    console.log("Raw API response:", r);
                    if (r.message) {
                        const response = r.message;
                        
                        // Check if we have details in the response
                        if (response.details) {
                            console.log("Details found in response:", response.details);
                            
                            // Update the time fields - ensure they are the correct IDs
                            // For read-only fields, we might need to update their value and then make them readonly again
                            updateReadOnlyField("start_time", response.details.start_time || "");
                            updateReadOnlyField("end_time", response.details.end_time || "");
                            
                            // Use the correct person responsible field
                            const personName = response.details.person_responsible || "";
                            updateReadOnlyField("print_name", personName);
                            // updateReadOnlyField("signature_line", personName);
                        }
                        
                        // Update the table with items
                        if (response.items) {
                            updateTable(response.items);
                        } else if (Array.isArray(response)) {
                            updateTable(response);
                        }
                        
                        // Update page title based on selected class
                        updatePageTitle(className);
                    }
                }
            });
        }
    }
    
    // Helper function to update read-only fields
    function updateReadOnlyField(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            // Store the original readonly state
            const wasReadOnly = field.readOnly;
            
            // Temporarily make it editable if it was readonly
            if (wasReadOnly) {
                field.readOnly = false;
            }
            
            // Update the value
            field.value = value;
            console.log(`Updated ${fieldId} to:`, value);
            
            // Restore the readonly state
            if (wasReadOnly) {
                field.readOnly = true;
            }
        } else {
            console.error(`${fieldId} field not found in DOM`);
        }
    }
    
    // Fetch inventory items from API
    async function fetchItems(from_date, class_name) {
        try {
            console.log("Fetching items for date:", from_date, "class:", class_name);
            
            const res = await frappe.call({
                method: "tagsiftpharmacy.www.pharmacy_report.get_stock_entry_items",
                args: {
                    from_date,
                    class_name
                }
            });
            
            // Log the entire response to help with debugging
            console.log("API Response:", res.message);
            
            // The response now contains both items and details
            const response = res.message || {};
            
            if (typeof response === 'object' && !Array.isArray(response)) {
                // If response is an object (new format)
                console.log("Response is in object format with details");
                
                const items = response.items || [];
                const details = response.details || {};
                
                console.log("Details extracted:", details);
                
                // Update table with inventory items
                updateTable(items);
                
                // Update form fields with inventory details
                updateInventoryDetails(details);
            } else {
                // If response is an array (old format)
                console.log("Response is in array format (old format)");
                updateTable(Array.isArray(response) ? response : []);
            }
            
            // Update page title based on selected class
            updatePageTitle(class_name);
            
        } catch (error) {
            console.error("Error fetching items:", error);
            frappe.msgprint("Error loading inventory data. Please try again.");
        }
    }
    
    // Update form fields with inventory details
    function updateInventoryDetails(details) {
        console.log("Attempting to update inventory details with:", details);
        
        // Update time fields using the helper function for read-only fields
        updateReadOnlyField("start_time", details.start_time || "");
        updateReadOnlyField("end_time", details.end_time || "");
        
        // Use the correct person responsible field name
        const personName = details.person_responsible || "";
        
        // Update person responsible fields
        updateReadOnlyField("print_name", personName);
        // updateReadOnlyField("signature_line", personName);
    }
    
    // Update table with inventory items
    function updateTable(items) {
        const tbody = document.querySelector("#items_table tbody");
        tbody.innerHTML = "";
        
        if (items.length === 0) {
            const noDataRow = `
                <tr>
                    <td colspan="10" class="text-center">No data available for selected date</td>
                </tr>`;
            tbody.innerHTML = noDataRow;
            return;
        }
        
        items.forEach(item => {
            const row = `
                <tr>
                    <td>${item.ndc || ""}</td>
                    <td>${item.drug_name || ""}</td>
                    <td>${item.class || ""}</td>
                    <td>${item.count_type || ""}</td>
                    <td>${item.manufacturer || ""}</td>
                    <td>${item.package_size || 0}</td>
                    <td>${item.open_bottle || 0}</td>
                    <td>${item.close_bottle || 0}</td>
                    <td>${item.qty_in_hand || 0}</td>
                </tr>`;
            tbody.innerHTML += row;
        });
    }
    
    // Download CSV report
    function downloadCSVReport() {
        const rows = [];
        const pageTitle = document.getElementById("page_title").textContent;
        
        // Add header row with pharmacy info
        rows.push([pageTitle]);
        
        // Use the correct label based on user type
        const nameLabel = userType === "Pharmacist" ? "Pharmacist Name:" : "Pharmacy Name:";
        rows.push([`${nameLabel} ${pharmacyData.pharmacy_name || ''}`]);
        
        rows.push([`DEA Registration: ${pharmacyData.dea_number || ''}`]);
        rows.push([`Date: ${document.getElementById('from_date').value || ''}`]);
        rows.push([`Class Filter: ${document.getElementById('class_name').value || 'All Classes'}`]);
        rows.push([`Start Time: ${document.getElementById('start_time').value || ''}`]);
        rows.push([`End Time: ${document.getElementById('end_time').value || ''}`]);
        rows.push([`Person Responsible: ${document.getElementById('print_name').value || ''}`]);
        rows.push([]);  // Empty row
        
        // Add table headers
        const headers = Array.from(document.querySelectorAll("#items_table thead th"))
                             .map(th => th.innerText);
        rows.push(headers);
        
        // Add table data rows
        const dataRows = document.querySelectorAll("#items_table tbody tr");
        dataRows.forEach(row => {
            if (!row.querySelector("td[colspan]")) {  // Skip "no data" rows
                const cols = Array.from(row.querySelectorAll("td")).map(td => td.innerText);
                rows.push(cols);
            }
        });
        
        // Convert to CSV content
        const csvContent = rows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        
        // Create download link
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        const date = document.getElementById('from_date').value || new Date().toISOString().split('T')[0];
        const classFilter = document.getElementById('class_name').value || 'all';
        
        link.setAttribute("href", url);
        link.setAttribute("download", `C${classFilter || '2'}_inventory_report_${date}.csv`);
        link.style.visibility = "hidden";
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Generate and download PDF report
    function downloadPDFReport() {
        // Load jsPDF library if not already loaded
        if (typeof jsPDF === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = function() {
                const script2 = document.createElement('script');
                script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
                script2.onload = generatePDF;
                document.head.appendChild(script2);
            };
            document.head.appendChild(script);
        } else {
            generatePDF();
        }
    }
    
    // Generate PDF using jsPDF
    function generatePDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageTitle = document.getElementById("page_title").textContent;
        
        // Get signature and print name values
        const signatureName = document.getElementById("signature_line").value || "";
        const printName = document.getElementById("print_name").value || "";
        
        // Get start and end times
        const startTime = document.getElementById('start_time').value || "";
        const endTime = document.getElementById('end_time').value || "";
        
        // Set margins
        const margin = 15;
        const pageWidth = 210;  // A4 width in mm
        const contentWidth = pageWidth - (margin * 2);
        let yPos = margin;
        
        // Helper function for drawing boxes with text
        function drawFormField(text, y, fieldValue = "", boxHeight = 10) {
            // Draw the label
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(text, margin, y + 5);
            
            // Measure text width for positioning the line
            const textWidth = doc.getTextWidth(text);
            const lineStart = margin + textWidth + 2;
            
            // Draw the underline
            if (fieldValue) {
                doc.setFont('helvetica', 'normal');
                doc.text(fieldValue, lineStart + 2, y + 5);
            }
            
            // Draw underline extending to the end of the page
            doc.line(lineStart, y + 6, margin + contentWidth, y + 6);
            
            return y + boxHeight; // Return the new Y position
        }
        
        // Add title - use the dynamic page title
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        
        // Split the title into two lines for better formatting in PDF
        const titleParts = pageTitle.split('(');
        doc.text(titleParts[0].trim(), pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
        
        if (titleParts.length > 1) {
            doc.text(`(${titleParts[1]}`, pageWidth / 2, yPos, { align: 'center' });
        }
        yPos += 20;
        
        // Add pharmacy info with underlines - use the correct label based on user type
        const nameLabel = userType === "Pharmacist" ? "NAME OF PHARMACIST" : "NAME OF PHARMACY";
        yPos = drawFormField(nameLabel, yPos, pharmacyData.pharmacy_name || "");
        yPos += 5;
        
        
        yPos = drawFormField("Address:", yPos, pharmacyData.address || "");
        yPos += 5;
        
        // City, State, Zip on one line
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("City:", margin, yPos + 5);
        let textWidth = doc.getTextWidth("City:");
        let lineStart = margin + textWidth + 2;
        
        // City value and line
        const cityWidth = 60;
        if (pharmacyData.city) {
            doc.setFont('helvetica', 'normal');
            doc.text(pharmacyData.city, lineStart + 2, yPos + 5);
        }
        doc.line(lineStart, yPos + 6, lineStart + cityWidth, yPos + 6);
        
        // State label
        doc.setFont('helvetica', 'bold');
        const stateX = lineStart + cityWidth + 10;
        doc.text("State:", stateX, yPos + 5);
        textWidth = doc.getTextWidth("State:");
        lineStart = stateX + textWidth + 2;
        
        // State value and line
        const stateWidth = 40;
        if (pharmacyData.state) {
            doc.setFont('helvetica', 'normal');
            doc.text(pharmacyData.state, lineStart + 2, yPos + 5);
        }
        doc.line(lineStart, yPos + 6, lineStart + stateWidth, yPos + 6);
        
        // Zip code label
        doc.setFont('helvetica', 'bold');
        const zipX = lineStart + stateWidth + 10;
        doc.text("Zip code:", zipX, yPos + 5);
        textWidth = doc.getTextWidth("Zip code:");
        lineStart = zipX + textWidth + 2;
        
        // Zip value and line
        if (pharmacyData.zip_code) {
            doc.setFont('helvetica', 'normal');
            doc.text(pharmacyData.zip_code, lineStart + 2, yPos + 5);
        }
        doc.line(lineStart, yPos + 6, margin + contentWidth, yPos + 6);
        
        yPos += 15;
        
        // DEA Number
        yPos = drawFormField("DEA Registration Number:", yPos, pharmacyData.dea_number || "");
        yPos += 5;
        
        // Date of Inventory
        yPos = drawFormField("Date of Inventory:", yPos, document.getElementById('from_date').value || "");
        yPos += 5;
        
        // Class Filter
        const classFilter = document.getElementById('class_name').value;
        const classFilterText = classFilter ? classFilter : "All Classes";
        yPos = drawFormField("Class Filter:", yPos, classFilterText);
        yPos += 5;
        
        // Start Time
        yPos = drawFormField("Started Time:", yPos, startTime);
        yPos += 5;
        
        // End Time
        yPos = drawFormField("Ended Time:", yPos, endTime);
        yPos += 10;
        
        // Get table data
        const tableData = [];
        const tableRows = document.querySelectorAll("#items_table tbody tr");
        
        if (tableRows.length === 0 || tableRows[0].querySelector("td[colspan]")) {
            // No data
            tableData.push(['No data available for selected date']);
        } else {
            // Add table data rows
            tableRows.forEach(row => {
                const rowData = Array.from(row.querySelectorAll("td")).map(td => td.innerText);
                tableData.push(rowData);
            });
        }
        
        // Add table to PDF 
        doc.autoTable({
            head: [['NDC', 'DRUG NAME', 'CLASS', 'COUNT TYPE', 'MANUFACTURER', 'PACKAGE SIZE', 'OPEN BOTTLE', 'CLOSE BOTTLE', 'QTY IN HAND']],
            body: tableData.map(row => [
                row[0] || '', // NDC
                row[1] || '', // DRUG NAME
                row[2] || '', // CLASS
                row[3] || '', // COUNT TYPE
                row[4] || '', // MANUFACTURER
                row[5] || '', // PACKAGE SIZE
                row[6] || '', // OPEN BOTTLE
                row[7] || '', // CLOSE BOTTLE
                row[8] || ''  // QTY IN HAND
            ]),
            startY: yPos,
            theme: 'grid',
            headStyles: { 
                fillColor: [255, 255, 255], 
                textColor: [0, 102, 204], 
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle',
                fontSize: 10
            },
            styles: { 
                fontSize: 9, 
                cellPadding: 2,
                lineWidth: 0.1,
                lineColor: [0, 0, 0]
            },
            columnStyles: {
                0: { cellWidth: 18 }, // NDC
                1: { cellWidth: 40 }, // Drug Name
                2: { cellWidth: 12 }, // Class
                3: { cellWidth: 18 }, // Count Type
                4: { cellWidth: 25 }, // Manufacturer
                5: { cellWidth: 18 }, // Package Size
                6: { cellWidth: 18 }, // Open Bottle
                7: { cellWidth: 18 }, // Close Bottle
                8: { cellWidth: 18 }  // Qty in Hand
            }
        });
        
        // Add signature lines
        const finalY = doc.lastAutoTable.finalY + 30;
        const lineWidth = 100;
        const centerX = pageWidth / 2;
        
        // Signature line
        doc.line(centerX - (lineWidth/2), finalY, centerX + (lineWidth/2), finalY);
        doc.setFontSize(10);
        doc.text('Signature of Person Responsible for taking Inventory', centerX, finalY + 6, { align: 'center' });
        
        // Add signature value if provided
        if (signatureName) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(12);
            doc.text(signatureName, centerX, finalY - 2, { align: 'center' });
            doc.setFont('helvetica', 'normal');
        }
        
        // Print name line
        doc.line(centerX - (lineWidth/2), finalY + 20, centerX + (lineWidth/2), finalY + 20);
        doc.setFontSize(10);
        doc.text('Print Name of Person Responsible for taking Inventory', centerX, finalY + 26, { align: 'center' });
        
        // Add print name value if provided
        if (printName) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
            doc.text(printName, centerX, finalY + 18, { align: 'center' });
        }
        
        // Save the PDF
        const date = document.getElementById('from_date').value || new Date().toISOString().split('T')[0];
        const classValue = document.getElementById('class_name').value || '2';
        doc.save(`C${classValue || '2'}_inventory_log_${date}.pdf`);
    }
    
    // Add this function to send email with PDF attachment
    function emailPDFReport() {
        // Show loading message
        frappe.show_alert({
            message: __("Generating PDF and preparing email..."),
            indicator: 'blue'
        });
        
        // First generate the PDF data
        generatePDFData().then(pdfData => {
            // Get the PDF filename
            const date = document.getElementById('from_date').value || new Date().toISOString().split('T')[0];
            const classValue = document.getElementById('class_name').value || '2';
            const fileName = `C${classValue || '2'}_inventory_log_${date}.pdf`;
            
            // Call Frappe method to send email with PDF attachment
            frappe.call({
                method: "tagsiftpharmacy.www.pharmacy_report.email_pdf_report",
                args: {
                    pdf_data: pdfData,
                    file_name: fileName,
                    from_date: document.getElementById('from_date').value,
                    class_name: document.getElementById('class_name').value || 'All Classes'
                },
                callback: function(r) {
                    if (r.message && r.message.success) {
                        frappe.show_alert({
                            message: __("Email sent successfully to ") + r.message.email,
                            indicator: 'green'
                        });
                    } else {
                        frappe.show_alert({
                            message: __("Failed to send email. ") + (r.message?.error || ""),
                            indicator: 'red'
                        });
                    }
                }
            });
        }).catch(error => {
            console.error("Error generating PDF for email:", error);
            frappe.show_alert({
                message: __("Failed to generate PDF for email"),
                indicator: 'red'
            });
        });
    }

    // Function to generate PDF data for email attachment
    function generatePDFData() {
        return new Promise((resolve, reject) => {
            try {
                // Load jsPDF library if not already loaded
                if (typeof jsPDF === 'undefined') {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                    script.onload = function() {
                        const script2 = document.createElement('script');
                        script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
                        script2.onload = () => generatePDFForEmail(resolve, reject);
                        document.head.appendChild(script2);
                    };
                    document.head.appendChild(script);
                } else {
                    generatePDFForEmail(resolve, reject);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    // Function to generate PDF data and return it
    function generatePDFForEmail(resolve, reject) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageTitle = document.getElementById("page_title").textContent;
            
            // Get signature and print name values
            const signatureName = document.getElementById("signature_line").value || "";
            const printName = document.getElementById("print_name").value || "";
            
            // Get start and end times
            const startTime = document.getElementById('start_time').value || "";
            const endTime = document.getElementById('end_time').value || "";
            
            // Set margins
            const margin = 15;
            const pageWidth = 210;  // A4 width in mm
            const contentWidth = pageWidth - (margin * 2);
            let yPos = margin;
            
            // Helper function for drawing boxes with text
            function drawFormField(text, y, fieldValue = "", boxHeight = 10) {
                // Draw the label
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(text, margin, y + 5);
                
                // Measure text width for positioning the line
                const textWidth = doc.getTextWidth(text);
                const lineStart = margin + textWidth + 2;
                
                // Draw the underline
                if (fieldValue) {
                    doc.setFont('helvetica', 'normal');
                    doc.text(fieldValue, lineStart + 2, y + 5);
                }
                
                // Draw underline extending to the end of the page
                doc.line(lineStart, y + 6, margin + contentWidth, y + 6);
                
                return y + boxHeight; // Return the new Y position
            }
            
            // Add title - use the dynamic page title
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            
            // Split the title into two lines for better formatting in PDF
            const titleParts = pageTitle.split('(');
            doc.text(titleParts[0].trim(), pageWidth / 2, yPos, { align: 'center' });
            yPos += 10;
            
            if (titleParts.length > 1) {
                doc.text(`(${titleParts[1]}`, pageWidth / 2, yPos, { align: 'center' });
            }
            yPos += 20;
            
            // Add pharmacy info with underlines - use the correct label based on user type
            const nameLabel = userType === "Pharmacist" ? "NAME OF PHARMACIST" : "NAME OF PHARMACY";
            yPos = drawFormField(nameLabel, yPos, pharmacyData.pharmacy_name || "");
            yPos += 5;
            
            
            yPos = drawFormField("Address:", yPos, pharmacyData.address || "");
            yPos += 5;
            
            // City, State, Zip on one line
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text("City:", margin, yPos + 5);
            let textWidth = doc.getTextWidth("City:");
            let lineStart = margin + textWidth + 2;
            
            // City value and line
            const cityWidth = 60;
            if (pharmacyData.city) {
                doc.setFont('helvetica', 'normal');
                doc.text(pharmacyData.city, lineStart + 2, yPos + 5);
            }
            doc.line(lineStart, yPos + 6, lineStart + cityWidth, yPos + 6);
            
            // State label
            doc.setFont('helvetica', 'bold');
            const stateX = lineStart + cityWidth + 10;
            doc.text("State:", stateX, yPos + 5);
            textWidth = doc.getTextWidth("State:");
            lineStart = stateX + textWidth + 2;
            
            // State value and line
            const stateWidth = 40;
            if (pharmacyData.state) {
                doc.setFont('helvetica', 'normal');
                doc.text(pharmacyData.state, lineStart + 2, yPos + 5);
            }
            doc.line(lineStart, yPos + 6, lineStart + stateWidth, yPos + 6);
            
            // Zip code label
            doc.setFont('helvetica', 'bold');
            const zipX = lineStart + stateWidth + 10;
            doc.text("Zip code:", zipX, yPos + 5);
            textWidth = doc.getTextWidth("Zip code:");
            lineStart = zipX + textWidth + 2;
            
            // Zip value and line
            if (pharmacyData.zip_code) {
                doc.setFont('helvetica', 'normal');
                doc.text(pharmacyData.zip_code, lineStart + 2, yPos + 5);
            }
            doc.line(lineStart, yPos + 6, margin + contentWidth, yPos + 6);
            
            yPos += 15;
            
            // DEA Number
            yPos = drawFormField("DEA Registration Number:", yPos, pharmacyData.dea_number || "");
            yPos += 5;
            
            // Date of Inventory
            yPos = drawFormField("Date of Inventory:", yPos, document.getElementById('from_date').value || "");
            yPos += 5;
            
            // Class Filter
            const classFilter = document.getElementById('class_name').value;
            const classFilterText = classFilter ? classFilter : "All Classes";
            yPos = drawFormField("Class Filter:", yPos, classFilterText);
            yPos += 5;
            
            // Start Time
            yPos = drawFormField("Started Time:", yPos, startTime);
            yPos += 5;
            
            // End Time
            yPos = drawFormField("Ended Time:", yPos, endTime);
            yPos += 10;
            
            // Get table data
            const tableData = [];
            const tableRows = document.querySelectorAll("#items_table tbody tr");
            
            if (tableRows.length === 0 || tableRows[0].querySelector("td[colspan]")) {
                // No data
                tableData.push(['No data available for selected date']);
            } else {
                // Add table data rows
                tableRows.forEach(row => {
                    const rowData = Array.from(row.querySelectorAll("td")).map(td => td.innerText);
                    tableData.push(rowData);
                });
            }
            
            // Add table to PDF 
            doc.autoTable({
                head: [['NDC', 'DRUG NAME', 'CLASS', 'COUNT TYPE', 'MANUFACTURER', 'PACKAGE SIZE', 'OPEN BOTTLE', 'CLOSE BOTTLE', 'QTY IN HAND']],
                body: tableData.map(row => [
                    row[0] || '', // NDC
                    row[1] || '', // DRUG NAME
                    row[2] || '', // CLASS
                    row[3] || '', // COUNT TYPE
                    row[4] || '', // MANUFACTURER
                    row[5] || '', // PACKAGE SIZE
                    row[6] || '', // OPEN BOTTLE
                    row[7] || '', // CLOSE BOTTLE
                    row[8] || ''  // QTY IN HAND
                ]),
                startY: yPos,
                theme: 'grid',
                headStyles: { 
                    fillColor: [255, 255, 255], 
                    textColor: [0, 102, 204], 
                    fontStyle: 'bold',
                    halign: 'center',
                    valign: 'middle',
                    fontSize: 10
                },
                styles: { 
                    fontSize: 9, 
                    cellPadding: 2,
                    lineWidth: 0.1,
                    lineColor: [0, 0, 0]
                },
                columnStyles: {
                    0: { cellWidth: 18 }, // NDC
                    1: { cellWidth: 40 }, // Drug Name
                    2: { cellWidth: 12 }, // Class
                    3: { cellWidth: 18 }, // Count Type
                    4: { cellWidth: 25 }, // Manufacturer
                    5: { cellWidth: 18 }, // Package Size
                    6: { cellWidth: 18 }, // Open Bottle
                    7: { cellWidth: 18 }, // Close Bottle
                    8: { cellWidth: 18 }  // Qty in Hand
                }
            });
            
            // Add signature lines
            const finalY = doc.lastAutoTable.finalY + 30;
            const lineWidth = 100;
            const centerX = pageWidth / 2;
            
            // Signature line
            doc.line(centerX - (lineWidth/2), finalY, centerX + (lineWidth/2), finalY);
            doc.setFontSize(10);
            doc.text('Signature of Person Responsible for taking Inventory', centerX, finalY + 6, { align: 'center' });
            
            // Add signature value if provided
            if (signatureName) {
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(12);
                doc.text(signatureName, centerX, finalY - 2, { align: 'center' });
                doc.setFont('helvetica', 'normal');
            }
            
            // Print name line
            doc.line(centerX - (lineWidth/2), finalY + 20, centerX + (lineWidth/2), finalY + 20);
            doc.setFontSize(10);
            doc.text('Print Name of Person Responsible for taking Inventory', centerX, finalY + 26, { align: 'center' });
            
            // Add print name value if provided
            if (printName) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(12);
                doc.text(printName, centerX, finalY + 18, { align: 'center' });
            }
            
            // Convert PDF to base64 string
            const pdfData = doc.output('datauristring');
            resolve(pdfData);
        } catch (error) {
            console.error("Error generating PDF data:", error);
            reject(error);
        }
    }
    
    // Event listeners
    document.querySelector("#filter_btn").addEventListener("click", () => {
        const from_date = document.querySelector("#from_date").value;
        const class_name = document.querySelector("#class_name").value;
        
        if (!from_date) {
            frappe.msgprint("Please select a date");
            return;
        }
        fetchItems(from_date, class_name);
    });
    
    // Add event listener for date change to automatically fetch data
    document.querySelector("#from_date").addEventListener("change", handleDateChange);
    
    document.querySelector("#download_csv_btn").addEventListener("click", downloadCSVReport);
    document.querySelector("#download_pdf_btn").addEventListener("click", downloadPDFReport);
    
    // Add email button event listener
    document.querySelector("#email_pdf_btn").addEventListener("click", emailPDFReport);

    // Initialize page on load
    // initPage(); // This is now called from the user details check callback
});



            