let excelData = []; // Placeholder for Excel data
let currentSheetName = ''; // Placeholder for the current sheet name

// Load the Google Sheets file when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const fileUrl = urlParams.get('fileUrl');

    if (fileUrl) {
        await loadExcelSheet(fileUrl);
    }
});

// Function to load Excel sheet data
async function loadExcelSheet(fileUrl) {
    try {
        const response = await fetch(fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        excelData = XLSX.utils.sheet_to_json(sheet, { defval: null });
        displaySheet(excelData);
    } catch (error) {
        console.error("Error loading Excel sheet:", error);
    }
}

// Display Sheet
function displaySheet(sheetData) {
    const sheetContentDiv = document.getElementById('sheet-content');
    sheetContentDiv.innerHTML = '';

    if (sheetData.length === 0) {
        sheetContentDiv.innerHTML = '<p>No data available</p>';
        return;
    }

    const table = document.createElement('table');
    const headerRow = document.createElement('tr');
    Object.keys(sheetData[0]).forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    sheetData.forEach(row => {
        const tr = document.createElement('tr');
        Object.values(row).forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell === null || cell === "" ? 'NULL' : cell;
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });

    sheetContentDiv.appendChild(table);
}

// Validate column range input
function validateColumnRange(input) {
    const regex = /^[A-Z](,[A-Z])*$|^([A-Z]-[A-Z])$/; // Accepts formats like "A", "A,B,C", or "A-Z"
    return regex.test(input);
}

// Apply Operation
function applyOperation() {
    const primaryColumn = document.getElementById('primary-column').value.trim();
    const operationColumnsInput = document.getElementById('operation-columns').value.trim();
    const operationType = document.getElementById('operation-type').value;
    const operation = document.getElementById('operation').value;
    const contentType = document.getElementById('content-type').value;

    const rowRangeFrom = parseInt(document.getElementById('row-range-from').value, 10);
    const rowRangeTo = parseInt(document.getElementById('row-range-to').value, 10);

    if (!primaryColumn || !operationColumnsInput) {
        alert('Please enter the primary column and columns to operate on.');
        return;
    }

    // Validate the operation columns
    if (!validateColumnRange(operationColumnsInput)) {
        alert('Invalid column range format. Please enter a valid format (e.g., A,B,C or A-Z).');
        return;
    }

    const operationColumns = operationColumnsInput.split(',').map(col => col.trim());
    filteredData = excelData.filter((row, index) => {
        // Check if the current row index is within the specified range
        if (index < rowRangeFrom - 1 || index > rowRangeTo - 1) return false;

        const isPrimaryNull = row[primaryColumn] === null || row[primaryColumn] === "";
        const columnChecks = operationColumns.map(col => {
            const cellValue = row[col];

            // Determine null or not-null based on content type
            let isNotNull = false;
            switch (contentType) {
                case 'all':
                    isNotNull = cellValue !== null && cellValue !== "";
                    break;
                case 'word':
                    isNotNull = /^[A-Za-z]+$/.test(cellValue);
                    break;
                case 'number':
                    isNotNull = Number.isInteger(cellValue);
                    break;
                case 'link':
                    isNotNull = /^(https?:\/\/[^\s]+)/.test(cellValue); // Simple URL regex
                    break;
            }

            return operation === 'null' ? !isNotNull : isNotNull;
        });

        return operationType === 'and' ? !isPrimaryNull && columnChecks.every(Boolean) : !isPrimaryNull && columnChecks.some(Boolean);
    });

    filteredData = filteredData.map(row => {
        const filteredRow = {};
        filteredRow[primaryColumn] = row[primaryColumn];
        operationColumns.forEach(col => filteredRow[col] = row[col] === null || row[col] === "" ? 'NULL' : row[col]);
        return filteredRow;
    });

    displaySheet(filteredData);
}

// Download Functions
function openDownloadModal() {
    document.getElementById('download-modal').style.display = 'flex';
}

function closeDownloadModal() {
    document.getElementById('download-modal').style.display = 'none';
}

function downloadFile() {
    const fileName = document.getElementById('filename').value || 'downloaded_data';
    const format = document.getElementById('file-format').value;
    const sheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');

    if (format === 'xlsx') {
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    } else if (format === 'csv') {
        XLSX.writeFile(workbook, `${fileName}.csv`);
    }

    closeDownloadModal();
}

// Event Listeners
document.getElementById('apply-operation').addEventListener('click', applyOperation);
document.getElementById('download-button').addEventListener('click', openDownloadModal);
document.getElementById('close-modal').addEventListener('click', closeDownloadModal);
document.getElementById('confirm-download').addEventListener('click', downloadFile);
