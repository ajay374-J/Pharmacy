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

    document.querySelector("#filter_btn").addEventListener("click", () => {
        const from_date = document.querySelector("#from_date").value;
        fetchItems(from_date);
    });

    // Load initial data
    fetchItems();
});
