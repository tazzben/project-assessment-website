const fileInput = document.getElementById('csvFileInput');
const output = document.getElementById('output');
let dataset = {
    data: [],
    allKeys: new Set(),
    kMapping: [],
    boundMapping: []
};

const extractTextBeforeLastDash = (str) => {
    const lastDashIndex = str.lastIndexOf(' - ');
    if (lastDashIndex === -1) {
        return str;
    }
    return str.substring(0, lastDashIndex);
};

const extractColumnsByKeyStart = (data, keyStart) =>{
    return data.map(row => {
        const filteredRow = {};
        Object.keys(row).forEach(key => {
            if (key.trim().startsWith(keyStart)) {
                filteredRow[key] = row[key];
            }
        });
        return filteredRow;
    });
};

const extractQuestionList = (allKeys) => {
    const keyList = new Set(Array.from(allKeys).filter(key => key.includes(' - ')));
    return new Set(
        Array.from(keyList).map(key => extractTextBeforeLastDash(key).trim())
    );
};

const sortBySecondItem = (data) =>{
    return data.sort((a, b) => {
        const aSecondItem = Object.values(a)[1];
        const bSecondItem = Object.values(b)[1];
        if (aSecondItem === undefined){
            return -1;
        }
        if (bSecondItem === undefined){
            return 1;
        }
        if (aSecondItem < bSecondItem) {
            return -1;
        }
        if (aSecondItem > bSecondItem) {
            return 1;
        }
        return 0;
    });
};

const showErrorMessage = (message) => {
    const template = document.getElementById('errorDialogTemplate');
    const clone = template.content.cloneNode(true);
    const errorDialog = clone.querySelector('.errorDialogMessage');
    errorDialog.textContent = message;
    document.getElementById('notifications').replaceChildren();
    document.getElementById('notifications').appendChild(clone);
};


const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: (results) => {
                clearErrorMessage();
                processData(results.data);
                showKMapping();
            },
            error: (error) => {
                console.error("Error parsing CSV: ", error);
                showErrorMessage('Error parsing CSV file. Please check the file and try again.');
                swapInterface(true);
            }
        });
    }
};

const clearErrorMessage = () => {
    document.getElementById('notifications').replaceChildren();
};

const getSortedData = (data, question) => {
    const filteredData = extractColumnsByKeyStart(data, question);
    const uniqueFilteredData = filteredData.filter((row, index, self) => 
        index === self.findIndex((t) => (
            Object.values(t)[0] === Object.values(row)[0]
        ))
    );

    let sortedData = sortBySecondItem(uniqueFilteredData);
    let k = 0;
    for (let i = 0; i < sortedData.length; i++) {
        if(Object.keys(sortedData[i]).length > 0){
            sortedData[i] = Object.assign({}, sortedData[i], { 'k': k });
            k = k + 1;
        }
    }
    return sortedData;
};

const showKMapping = () => {
    swapInterface();
    const template = document.getElementById('kMatchingTemplate');
    const clone = template.content.cloneNode(true);
    const form = clone.querySelector('form');
    const questionList = extractQuestionList(dataset.allKeys);
    if (questionList.size === 0) {
        showErrorMessage('No rubric rows found in the CSV file. Please check the file and try again.');
        swapInterface(true);
        return;
    }
    for (const question of questionList) {
        const sortedData = getSortedData(dataset.data, question);
        const container = document.createElement('div');
        container.classList.add('d-flex');
        container.classList.add('flex-row');
        container.classList.add('flex-wrap');
        container.classList.add('gap-3');
        const questionNode = document.createElement('div');
        questionNode.classList.add('container-fluid');
        questionNode.classList.add('mt-3');
        questionNode.textContent = 'Rubric row corresponding to "' + question + '"';
        form.appendChild(questionNode);
        let bound = 0;
        for (let i = 0; i < sortedData.length; i++) {
            if (Object.keys(sortedData[i]).length > 0){
                const k = sortedData[i]['k'];
                const criteria = Object.values(sortedData[i])[0];
                const kNode = document.createElement('div');
                kNode.classList.add('col-2');
                kNode.classList.add('border');
                kNode.classList.add('p-3');              
                const labelNode = document.createElement('label');
                const inputNode = document.createElement('input');
                labelNode.textContent = criteria;
                labelNode.classList.add('form-label');
                inputNode.id = `kValue-${question}-${criteria}`;
                labelNode.htmlFor = inputNode.id;
                inputNode.type = 'number';
                inputNode.name = 'kValue';
                inputNode.value = k;
                inputNode.min = 0;
                inputNode.dataset.criteria = criteria;
                inputNode.dataset.question = question;
                inputNode.classList.add('form-control');
                kNode.appendChild(labelNode);
                kNode.appendChild(inputNode);
                container.appendChild(kNode);
                bound = k;
            }
        }
        form.appendChild(container);
        const boundNode = document.createElement('div');
        const labelNode = document.createElement('label');
        const inputNode = document.createElement('input');
        boundNode.classList.add('container-fluid');
        boundNode.classList.add('mb-3');
        boundNode.classList.add('pb-3');
        boundNode.classList.add('pt-3');
        boundNode.classList.add('border-bottom');
        labelNode.classList.add('form-label');
        inputNode.classList.add('form-control');
        labelNode.textContent = 'Bound value for "' + question + '." This is the maximum k value for this rubric row.';
        inputNode.type = 'number';
        inputNode.name = 'boundValue';
        inputNode.value = bound;
        inputNode.min = 0;
        inputNode.dataset.question = question;
        boundNode.appendChild(labelNode);
        boundNode.appendChild(inputNode);
        form.appendChild(boundNode);
    }
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Map Criteria to k Values';
    submitButton.classList.add('btn', 'btn-primary');
    form.appendChild(submitButton);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        let kMapping = [];
        form.querySelectorAll('input[name="kValue"]').forEach(input => {
            const question = input.dataset.question;
            const criteria = input.dataset.criteria;
            const k = input.value;
            kMapping.push({  
                "question": question,
                "criteria": criteria,
                "k": k
            });
        });
        let boundMapping = [];
        form.querySelectorAll('input[name="boundValue"]').forEach(input => {
            const question = input.dataset.question;
            const bound = input.value;
            boundMapping.push({
                "question": question,
                "bound": bound
            });
        });
        dataset.kMapping = kMapping;
        dataset.boundMapping = boundMapping;
        processResults();
    });
    document.getElementById('matchingDialog').replaceChildren();
    document.getElementById('matchingDialog').appendChild(clone);
};


const processResults = () => {
    let csvStructure = [];
    dataset.data.forEach(row => {
        const studentId = Object.values(row)[0];
        for (const question of extractQuestionList(dataset.allKeys)) {
            const bound = findBoundValue(question);
            const filteredData = extractColumnsByKeyStart([row,], question);
            for (i = 0; i < filteredData.length; i++) {
                const criteria = Object.values(filteredData[i])[0];
                const k = findKValue(question, criteria);
                if (k !== null){
                    csvStructure.push({
                        "id" : studentId, 
                        "rubric": question, 
                        "k": k,
                        "bound": bound
                    });
                }
            }
        }
    });
    const csv = Papa.unparse(csvStructure);
    const csvBlob = new Blob([csv], {type: 'text/csv'});
    const csvUrl = URL.createObjectURL(csvBlob);
    let downloadLink = document.createElement('a');
    downloadLink.href = csvUrl;
    downloadLink.download = 'project_assessment.csv';
    downloadLink.click();
    swapInterface(true);
};

const findKValue = (question, criteria) => {
    const mapping = dataset.kMapping.find(mapping => mapping.question === question && mapping.criteria === criteria);
    if (mapping) {
        return mapping.k;
    }
    return null;
};

const findBoundValue = (question) => {
    const mapping = dataset.boundMapping.find(mapping => mapping.question === question);
    if (mapping) {
        return mapping.bound;
    }
    return null;
};

const processData = (data) => {
    const allKeys = data.reduce((keys, row) => {
        return new Set([...keys, ...Object.keys(row)]);
    }, new Set());
    dataset.allKeys = allKeys;
    dataset.data = data;
};

const swapInterface = (back = false) => {
    const fileInputDiv = document.getElementById('fileInputDiv');
    const output = document.getElementById('matchingDialog');
    fileInputDiv.style.display = back ? 'block' : 'none';
    output.style.display = back ? 'none' : 'block';
    if (back){
        dataset = {
            data: [],
            allKeys: new Set(),
            kMapping: [],
            boundMapping: []
        };
        fileInput.value = '';
    }
};


fileInput.addEventListener('change', handleFileSelect);