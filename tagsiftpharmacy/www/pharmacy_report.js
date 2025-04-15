frappe.ready(function () {
    // Store pharmacy data globally
    let pharmacyData = {};
    
    // Initialize the page
    async function initPage() {
        try {
            // Fetch pharmacy info
            const pharmacyInfo = await fetchPharmacyInfo();
            populatePharmacyInfo(pharmacyInfo);
            
            // Fetch initial items
            await fetchItems(document.querySelector("#from_date").value);
        } catch (error) {
            console.error("Error initializing page:", error);
            frappe.msgprint("Error loading data. Please try again.");
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
                registrant_name: "",
                address: "",
                city: "",
                state: "",
                zip_code: "",
                dea_number: ""
            };
            
            return pharmacyData;
        } catch (error) {
            console.error("Error fetching pharmacy info:", error);
            return {};
        }
    }
    
    // Populate pharmacy info in the form
    function populatePharmacyInfo(info) {
        document.getElementById("pharmacy_name").value = info.pharmacy_name || "";
        document.getElementById("registrant_name").value = info.registrant_name || "";
        document.getElementById("address").value = info.address || "";
        document.getElementById("city").value = info.city || "";
        document.getElementById("state").value = info.state || "";
        document.getElementById("zip_code").value = info.zip_code || "";
        document.getElementById("dea_number").value = info.dea_number || "";
    }
    
    // Fetch inventory items from API
    async function fetchItems(from_date) {
        try {
            const res = await frappe.call({
                method: "tagsiftpharmacy.www.pharmacy_report.get_stock_entry_items",
                args: {
                    from_date
                }
            });
            
            updateTable(res.message || []);
        } catch (error) {
            console.error("Error fetching items:", error);
            frappe.msgprint("Error loading inventory data. Please try again.");
        }
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
                    <td>${item.inventory_on_hand || 0}</td>
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
        
        // Add header row with pharmacy info
        rows.push([`Pharmacy Name: ${pharmacyData.pharmacy_name || ''}`]);
        rows.push([`DEA Registration: ${pharmacyData.dea_number || ''}`]);
        rows.push([`Date: ${document.getElementById('from_date').value || ''}`]);
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
        
        link.setAttribute("href", url);
        link.setAttribute("download", `C2_inventory_report_${date}.csv`);
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
        
        // Add title
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('CONTROLLED SUBSTANCES', pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
        doc.text('(C-II) INVENTORY LOG', pageWidth / 2, yPos, { align: 'center' });
        yPos += 20;
        
        // Add pharmacy info with underlines
        yPos = drawFormField("NAME OF PHARMACY", yPos, pharmacyData.pharmacy_name || "");
        yPos += 5;
        
        yPos = drawFormField("Name of REGISTRANT on DEA Registration:", yPos, pharmacyData.registrant_name || "");
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
        yPos += 10;
        
        // Checkboxes for Opening/Closing
        const opening = document.getElementById('opening_checkbox').checked;
        const closing = document.getElementById('closing_checkbox').checked;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text("Inventory Taken at:", margin, yPos + 5);
        
        // Draw checkbox for Opening
        doc.rect(margin + 40, yPos + 2, 4, 4);
        if (opening) {
            // Draw X inside checkbox
            doc.line(margin + 40, yPos + 2, margin + 44, yPos + 6);
            doc.line(margin + 40, yPos + 6, margin + 44, yPos + 2);
        }
        doc.text("Opening or", margin + 46, yPos + 5);
        
        // Draw checkbox for Closing
        doc.rect(margin + 80, yPos + 2, 4, 4);
        if (closing) {
            // Draw X inside checkbox
            doc.line(margin + 80, yPos + 2, margin + 84, yPos + 6);
            doc.line(margin + 80, yPos + 6, margin + 84, yPos + 2);
        }
        doc.text("Closing of business", margin + 86, yPos + 5);
        
        yPos += 10;
        
        // Start and End times
        const startTime = document.getElementById('start_time').value || "";
        const endTime = document.getElementById('end_time').value || "";
        
        doc.text("OR Started at (time):", margin, yPos + 5);
        doc.line(margin + 40, yPos + 6, margin + 80, yPos + 6);
        if (startTime) {
            doc.text(startTime, margin + 42, yPos + 5);
        }
        
        doc.text("and Ended at (time):", margin + 85, yPos + 5);
        doc.line(margin + 130, yPos + 6, margin + 170, yPos + 6);
        if (endTime) {
            doc.text(endTime, margin + 132, yPos + 5);
        }
        
        yPos += 15;
        
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
        
        // Add table to PDF - matching the C2 INVENTORY table from screenshot 2
        doc.autoTable({
            head: [['NDC', 'DRUG NAME', 'CLASS', 'COUNT TYPE', 'MANUFACTURER', 'PACKAGE SIZE', 'INVENTORY ON HAND', 'QTY IN BAG']],
            body: tableData.map(row => [
                row[0] || '', // NDC
                row[1] || '', // DRUG NAME
                row[2] || '', // CLASS
                row[3] || '', // COUNT TYPE
                row[4] || '', // MANUFACTURER
                row[5] || '', // PACKAGE SIZE
                row[6] || '', // INVENTORY ON HAND
                row[9] || ''  // QTY IN BAG (using QTY IN HAND)
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
                6: { cellWidth: 25 }, // Inventory On Hand
                7: { cellWidth: 15 }  // Qty in Bag
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
        
        // Print name line
        doc.line(centerX - (lineWidth/2), finalY + 20, centerX + (lineWidth/2), finalY + 20);
        doc.text('Print Name of Person Responsible for taking Inventory', centerX, finalY + 26, { align: 'center' });
        
        // Save the PDF
        const date = document.getElementById('from_date').value || new Date().toISOString().split('T')[0];
        doc.save(`C2_inventory_log_${date}.pdf`);
    }
    
    // Event listeners
    document.querySelector("#filter_btn").addEventListener("click", () => {
        const from_date = document.querySelector("#from_date").value;
        if (!from_date) {
            frappe.msgprint("Please select a date");
            return;
        }
        fetchItems(from_date);
    });
    
    document.querySelector("#download_csv_btn").addEventListener("click", downloadCSVReport);
    document.querySelector("#download_pdf_btn").addEventListener("click", downloadPDFReport);
    
    // Opening/closing checkbox logic
    document.getElementById("opening_checkbox").addEventListener("change", function() {
        if (this.checked) {
            document.getElementById("closing_checkbox").checked = false;
        }
    });
    
    document.getElementById("closing_checkbox").addEventListener("change", function() {
        if (this.checked) {
            document.getElementById("opening_checkbox").checked = false;
        }
    });
    
    // Initialize page on load
    initPage();
});