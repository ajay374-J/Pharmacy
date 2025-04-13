frappe.ready(function () {
    async function fetchItems(from_date) {
        const res = await frappe.call({
            method: "tagsiftpharmacy.www.pharmacy_report.get_stock_entry_items",
            args: {
                from_date
            }
        });

        const tbody = document.querySelector("#items_table tbody");
        tbody.innerHTML = "";

        res.message.forEach(item => {
            const row = `
                <tr>
                    <td>${item.ndc}</td>
                    <td>${item.drug_name}</td>
                    <td>${item.class}</td>
                    <td>${item.count_type}</td>
                    <td>${item.manufurturer}</td>
                    <td>${item.package_size}</td>
                    <td>${item.inventory_on_hand}</td>
                </tr>`;
            tbody.innerHTML += row;
        });
    }

    function downloadCSVFromTable() {
        const rows = [];
        const headers = Array.from(document.querySelectorAll("#items_table thead th"))
                             .map(th => th.innerText);
        rows.push(headers);

        const dataRows = document.querySelectorAll("#items_table tbody tr");
        dataRows.forEach(row => {
            const cols = Array.from(row.querySelectorAll("td")).map(td => td.innerText);
            rows.push(cols);
        });

        const csvContent = rows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");

        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "drug_inventory_report.csv");
        link.style.visibility = "hidden";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    document.querySelector("#filter_btn").addEventListener("click", () => {
        const from_date = document.querySelector("#from_date").value;
        fetchItems(from_date);
    });

    document.querySelector("#download_btn").addEventListener("click", downloadCSVFromTable);

    // Load initial data
    fetchItems();
});
