const fileInput = document.getElementById('csvFileInput');
let pendingConversion = null;

const getUniqueItemIds = (itemResults) => Array.from(new Set(itemResults.map((itemResult) => itemResult.itemId)));

const swapInterface = (back = false) => {
    const fileInputDiv = document.getElementById('fileInputDiv');
    const matchingDialog = document.getElementById('matchingDialog');
    fileInputDiv.style.display = back ? 'block' : 'none';
    matchingDialog.style.display = back ? 'none' : 'block';
    if (back) {
        matchingDialog.replaceChildren();
        pendingConversion = null;
        fileInput.value = '';
    }
};

const showItemNameMapping = (itemResults, file) => {
    pendingConversion = { itemResults, file };
    swapInterface();
    const template = document.getElementById('nameMatchingTemplate');
    const clone = template.content.cloneNode(true);
    const form = clone.querySelector('form');
    for (const itemId of getUniqueItemIds(itemResults)) {
        const itemNode = document.createElement('div');
        itemNode.classList.add('container-fluid', 'mb-3');
        const labelNode = document.createElement('label');
        const inputNode = document.createElement('input');
        inputNode.id = `itemName-${itemId}`;
        labelNode.htmlFor = inputNode.id;
        labelNode.classList.add('form-label');
        labelNode.textContent = `Friendly name for "${itemId}"`;
        inputNode.type = 'text';
        inputNode.name = 'itemName';
        inputNode.value = itemId;
        inputNode.dataset.itemId = itemId;
        inputNode.classList.add('form-control');
        itemNode.appendChild(labelNode);
        itemNode.appendChild(inputNode);
        form.appendChild(itemNode);
    }
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Convert with These Names';
    submitButton.classList.add('btn', 'btn-primary');
    form.appendChild(submitButton);
    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.textContent = 'Back';
    backButton.classList.add('btn', 'btn-secondary', 'ms-2');
    backButton.addEventListener('click', () => {
        swapInterface(true);
    });
    form.appendChild(backButton);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const itemNameMapping = new Map();
        form.querySelectorAll('input[name="itemName"]').forEach((input) => {
            const friendlyName = input.value.trim();
            itemNameMapping.set(input.dataset.itemId, friendlyName || input.dataset.itemId);
        });
        try {
            const outputRows = buildOutputRows(pendingConversion.itemResults, itemNameMapping);
            if (outputRows.length === 0) {
                throw new Error('No graded quiz item attempts were found in this CSV.');
            }
            downloadResults(outputRows, pendingConversion.file);
            swapInterface(true);
        } catch (error) {
            console.error('Error converting Canvas New Quizzes CSV:', error);
            showErrorMessage(error.message || 'The CSV file could not be converted.');
            swapInterface(true);
        }
    });
    document.getElementById('matchingDialog').replaceChildren(clone);
};

const showErrorMessage = (message) => {
    const template = document.getElementById('errorDialogTemplate');
    const clone = template.content.cloneNode(true);
    clone.querySelector('.errorDialogMessage').textContent = message;
    document.getElementById('notifications').replaceChildren(clone);
};

const clearErrorMessage = () => {
    document.getElementById('notifications').replaceChildren();
};

const getFileNameWithoutExtension = (fileName) => {
    const extensionIndex = fileName.toLowerCase().lastIndexOf('.csv');
    return extensionIndex === -1 ? fileName : fileName.substring(0, extensionIndex);
};

const getColumnIndex = (header, columnName) => header.findIndex((value) => value.trim() === columnName);

const findColumnIndexInRange = (header, columnName, startIndex, endIndex) => {
    for (let index = startIndex; index < endIndex; index += 1) {
        if (header[index].trim() === columnName) {
            return index;
        }
    }
    return -1;
};

const isBlankRow = (row) => row.every((value) => String(value ?? '').trim() === '');

const getNumericValue = (value) => {
    const parsedValue = Number(String(value ?? '').trim());
    return Number.isFinite(parsedValue) ? parsedValue : null;
};

// TODO: Update this function if Canvas changes the New Quizzes CSV export layout.
// Item blocks are located by their repeated 'ItemID' header rather than fixed offsets, since Canvas repeats item header names.
const readQuizFile = (rows) => {
    const [header, ...dataRows] = rows.filter((row) => !isBlankRow(row));
    if (!header) {
        throw new Error('The CSV file is empty.');
    }

    const studentIdIndex = getColumnIndex(header, 'ID');
    const attemptIndex = getColumnIndex(header, 'Attempt');
    const firstItemIndex = header.findIndex((value, index) => index > attemptIndex && value.trim() === 'ItemID');
    const summaryIndex = getColumnIndex(header, 'NumberOfCorrect');

    if (studentIdIndex === -1 || attemptIndex === -1) {
        throw new Error('This CSV does not include the required ID and Attempt columns.');
    }
    if (firstItemIndex === -1 || summaryIndex === -1 || summaryIndex <= firstItemIndex) {
        throw new Error('No Canvas New Quizzes item columns were found in this CSV.');
    }

    // Locate each repeated item block by its 'ItemID' column, so extra columns Canvas adds between blocks don't shift the offsets.
    const itemIdIndexes = [];
    for (let index = firstItemIndex; index < summaryIndex; index += 1) {
        if (header[index].trim() === 'ItemID') {
            itemIdIndexes.push(index);
        }
    }

    const itemResults = [];
    for (const row of dataRows) {
        const studentId = String(row[studentIdIndex] ?? '').trim();
        const attempt = getNumericValue(row[attemptIndex]);
        if (!studentId || attempt === null) {
            continue;
        }

        for (let blockIndex = 0; blockIndex < itemIdIndexes.length; blockIndex += 1) {
            const itemIdIndex = itemIdIndexes[blockIndex];
            const blockEnd = itemIdIndexes[blockIndex + 1] ?? summaryIndex;
            const earnedPointsIndex = findColumnIndexInRange(header, 'EarnedPoints', itemIdIndex + 1, blockEnd);
            const statusIndex = findColumnIndexInRange(header, 'Status', itemIdIndex + 1, blockEnd);

            const itemId = String(row[itemIdIndex] ?? '').trim();
            const earnedPoints = earnedPointsIndex === -1 ? null : getNumericValue(row[earnedPointsIndex]);
            const status = statusIndex === -1 ? '' : String(row[statusIndex] ?? '').trim();
            if (!itemId || earnedPoints === null || status !== 'Graded') {
                continue;
            }
            itemResults.push({ studentId, itemId, attempt, earnedPoints });
        }
    }
    return itemResults;
};

const buildOutputRows = (itemResults, itemNameMapping = new Map()) => {
    const attemptsByStudentAndItem = new Map();
    for (const itemResult of itemResults) {
        const key = `${itemResult.studentId}\u0000${itemResult.itemId}`;
        if (!attemptsByStudentAndItem.has(key)) {
            attemptsByStudentAndItem.set(key, []);
        }
        attemptsByStudentAndItem.get(key).push(itemResult);
    }

    return Array.from(attemptsByStudentAndItem.values()).map((attempts) => {
        const attemptsByNumber = new Map();
        attempts.forEach((itemResult) => attemptsByNumber.set(itemResult.attempt, itemResult));
        const sortedAttempts = Array.from(attemptsByNumber.values())
            .sort((first, second) => first.attempt - second.attempt);
        const firstCorrectAttemptIndex = sortedAttempts.findIndex((itemResult) => itemResult.earnedPoints > 0);
        const attemptsThroughFirstCorrect = firstCorrectAttemptIndex === -1
            ? sortedAttempts.length
            : firstCorrectAttemptIndex + 1;
        const itemId = sortedAttempts[0].itemId;
        return {
            id: sortedAttempts[0].studentId,
            rubric: itemNameMapping.get(itemId) || itemId,
            k: firstCorrectAttemptIndex === -1 ? sortedAttempts.length : firstCorrectAttemptIndex,
            bound: attemptsThroughFirstCorrect
        };
    });
};

const downloadResults = (outputRows, file) => {
    const csv = Papa.unparse(outputRows, { columns: ['id', 'rubric', 'k', 'bound'] });
    const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = csvUrl;
    downloadLink.download = `${getFileNameWithoutExtension(file.name)}-multiple-attempt.csv`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(csvUrl);
};

const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    Papa.parse(file, {
        skipEmptyLines: true,
        complete: (results) => {
            try {
                clearErrorMessage();
                const itemResults = readQuizFile(results.data);
                if (itemResults.length === 0) {
                    throw new Error('No graded quiz item attempts were found in this CSV.');
                }
                showItemNameMapping(itemResults, file);
            } catch (error) {
                console.error('Error converting Canvas New Quizzes CSV:', error);
                showErrorMessage(error.message || 'The CSV file could not be converted.');
                fileInput.value = '';
            }
        },
        error: (error) => {
            console.error('Error parsing CSV:', error);
            showErrorMessage('Error parsing CSV file. Please check the file and try again.');
            fileInput.value = '';
        }
    });
};

fileInput.addEventListener('change', handleFileSelect);