let chartWidths = {
  widthMin: 480,
  widthMax: 1300,
  defaultWidthMin: 480,
  defaultWidthMax: 1300,
  printWidthMin: 480,
  printWidthMax: 920,
};

const kernelDensityEstimator = (kernel, X) => {
  return (V) => {
    return X.map((x) => {
      return [x, d3.mean(V, (v) => {
        return kernel(x - v);
      })];
    });
  };
};

const kernelEpanechnikov = (k) => {
  return (v) => {
    return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
  };
};

const getStandardDeviation = (array) => {
  const n = array.length;
  const mean = array.reduce((a, b) => a + b) / n;
  return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
};

const buildData = (variable = 'Average Logistic', filterLists = [], filterFileNames = []) => {
  let l = [];
  if (filterLists.length == 0) {
    let obj = {};
    let d = savedStudent.map(x => x[variable]);
    if (d.length > 1) {
      obj['data'] = d;
      obj['stroke'] = '#0D6EFD';
      obj['label'] = variable;
      l.push(obj);
    }
    return l;
  }
  let pos = 0;
  let colors = ['#0D6EFD', '#5D35DB', '#FC290D', '#000000', '#A83798', '#47856D', '#3543DB', '#35ACDB', '#9335DB'];
  for (const filterList of filterLists) {
    let inList = savedStudent.filter(x => filterList.includes(x['Variable']));
    let obj = {};
    let d = inList.map(x => x[variable]);
    if (d.length > 1) {
      obj['data'] = d;
      obj['stroke'] = colors[pos % colors.length];
      obj['label'] = variable;
      obj['chartLabel'] = "Students in " + filterFileNames[pos];
      l.push(obj);
    }
    pos++;
  }
  let outList = savedStudent.filter(x => !filterLists.flat().includes(x['Variable']));
  let obj2 = {};
  let d2 = outList.map(x => x[variable]);
  if (d2.length > 1) {
    obj2['data'] = d2;
    obj2['stroke'] = '#ADB5BD';
    obj2['label'] = variable;
    obj2['chartLabel'] = "Students not in " + (filterFileNames.length > 1 ? "any group" : filterFileNames[0]);
    l.push(obj2);
  }
  return l;
};

const buildSumTable = async (l = [], target = '#StatData', filterFileNames = []) => {
  $(target).empty();
  const [response, p] = await calcMeansSDMW(...l.map(x => JSON.stringify(x)));
  const res = JSON.parse(response);
  let posL = 0; 
  const resLength = res.length;
  for (const rowItem of res) {
    let textExtra = "";
    if (resLength > 1 && posL < filterFileNames.length) {
      textExtra = " of students in " + filterFileNames[posL];
    } else if (resLength > 1 && posL >= filterFileNames.length) {
      textExtra = " of students not in " + (filterFileNames.length > 1 ? "any group" : filterFileNames[0]);
    }
    let pos = 0;
    for (const item of ["Mean", "Standard Deviation", "# of Estimates"]) {
      let m = document.createElement("tr");
      let td = document.createElement("td");
      td.textContent = item + textExtra;
      m.appendChild(td);
      td = document.createElement("td");
      const round = pos == 2 ? 0 : 3;
      td.textContent = Number.parseFloat(rowItem[pos]).toFixed(round);
      m.appendChild(td);
      $(target).append(m);
      pos++;
    }
    posL++;
  }

  if (resLength > 1) {
    let m = document.createElement("tr");
    let td = document.createElement("td");
    td.textContent = resLength > 2 ?  "Kruskal-Wallis p-value" : "Mann-Whitney p-value";
    m.appendChild(td);
    td = document.createElement("td");
    td.textContent = Number.parseFloat(p).toFixed(3);
    m.appendChild(td);
    $(target).append(m);
  }
};

const getListsFromBD = (data) => {
  let lists = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i].data.length > 1) {
      lists.push(data[i].data);
    }
  }
  return lists;
};


const updateInfoTooltip = (el, bandwidth) => {
  let text = "Graph based on a bandwidth of " + bandwidth.toFixed(3) + ". Bandwidth calculated using Silverman's method.";
  // $(el).attr('title', text);
  $(el).attr('data-bs-title', text);
  $(el).tooltip('update');
};


const buildGraphics = async (data, location = '#studentKDE', infoEl = '#amlInfo') => {
  let silverFinal = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].data.length < 2) {
      continue;
    }
    silverFinal = Math.max(silverFinal, 1.06 * getStandardDeviation(data[i].data) * Math.pow(data[i].data.length, -0.2));
  }
  if (silverFinal == 0) {
    showAlertBox("No data to plot.");
    return;
  }
  updateInfoTooltip(infoEl, silverFinal);
  const contentWidth = Math.min(Math.max($('#rubricTableRow').width(), $('#fitTableRow').width(), $(location).width(), chartWidths.widthMin), chartWidths.widthMax);
  $(location).empty();


  const margin = {
      top: 30,
      right: 30,
      bottom: 30,
      left: 50
    },
    width = contentWidth - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;
  const svg = d3.select(location)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  let xMin = 0;
  let xMax = 0;
  for (let i = 0; i < data.length; i++) {
    xMin = Math.min(xMin, Math.min(...data[i].data));
    xMax = Math.max(xMax, Math.max(...data[i].data));
  }
  const x = d3.scaleLinear().domain([xMin, xMax]).range([0, width]);

  const kde = kernelDensityEstimator(kernelEpanechnikov(silverFinal), x.ticks(1000));
  svg.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x));

  let densityHeight = 0;
  for (let i = 0; i < data.length; i++) {
    data[i].density = kde(data[i].data);
    densityHeight = Math.max(densityHeight, Math.max(...data[i].density.map(x => x[1])));
  }

  const y = d3.scaleLinear().range([height, 0]).domain([0, densityHeight]);
  svg.append("g").call(d3.axisLeft(y));
  let pos = 0;
  for (let d of data) {
    svg.append("path")
      .attr("fill", "none")
      .attr("class", "mypath")
      .datum(d.density)
      .attr("stroke", d.stroke)
      .attr("stroke-width", 3)
      .attr("stroke-linejoin", "round")
      .attr("d", d3.line()
        .curve(d3.curveBasis)
        .x( (d) => {
          return x(d[0]);
        })
        .y( (d) => {
          return y(d[1]);
        })
      );
    if (data.length > 1) {
      svg.append("circle").attr("cx", width - 20).attr("cy", 30 + pos).attr("r", 6).style("fill", d.stroke);
      svg.append("text").attr("x", width - 40).attr("y", 30 + pos).attr("text-anchor", "end").text(d.chartLabel).style("font-size", "15px").attr("alignment-baseline", "middle");
    }
    pos += 30;
  }
};