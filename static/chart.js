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
  const n = array.length
  const mean = array.reduce((a, b) => a + b) / n
  return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
};

const buildData = (variable = 'Average Logistic', filterList = []) => {
  let l = [];
  if (filterList.length == 0) {
    let obj = {};
    let d = savedStudent.map(x => x[variable]);
    if (d.length > 1) {
      obj['data'] = d;
      obj['stroke'] = '#0d6efd';
      obj['label'] = variable;
      l.push(obj);
    }
    return l;
  }
  let inList = savedStudent.filter(x => filterList.includes(x['Variable']));
  let outList = savedStudent.filter(x => !filterList.includes(x['Variable']));
  let obj = {};
  let d = inList.map(x => x[variable]);
  if (d.length > 1) {
    obj['data'] = d;
    obj['stroke'] = '#0d6efd';
    obj['label'] = variable;
    obj['chartLabel'] = "Students in group";
    l.push(obj);
  }

  let obj2 = {};
  let d2 = outList.map(x => x[variable]);
  if (d2.length > 1) {
    obj2['data'] = d2;
    obj2['stroke'] = '#adb5bd';
    obj2['label'] = variable;
    obj2['chartLabel'] = "Students not in group";
    l.push(obj2);
  }
  return l;
};

const buildSumTable = async (l1, l2, target = '#StatData') => {
  $(target).empty();
  let getSummaryStats = await pyscript.interpreter.globals.get('calcMeansSDMW');
  let response = await getSummaryStats(l1, l2);
  let mean1, sd1, count1, mean2, sd2, count2, mw, textExtra, textExtra2;
  if (l2.length == 0) {
    [mean1, sd1, count1] = JSON.parse(response);
    textExtra = "";
    textExtra2 = "";
  } else {
    [mean1, sd1, count1, mean2, sd2, count2, mw] = JSON.parse(response);
    textExtra = " of students in group";
    textExtra2 = " of students not in group";
  }

  let m = document.createElement("tr");
  let td = document.createElement("td");
  td.textContent = "Mean" + textExtra;
  m.appendChild(td);
  td = document.createElement("td");
  td.textContent = Number.parseFloat(mean1).toFixed(3);
  m.appendChild(td);
  $(target).append(m);

  m = document.createElement("tr");
  td = document.createElement("td");
  td.textContent = "Standard Deviation" + textExtra;
  m.appendChild(td);
  td = document.createElement("td");
  td.textContent = Number.parseFloat(sd1).toFixed(3);
  m.appendChild(td);
  $(target).append(m);

  m = document.createElement("tr");
  td = document.createElement("td");
  td.textContent = "# of Estimates" + textExtra;
  m.appendChild(td);
  td = document.createElement("td");
  td.textContent = Number.parseFloat(count1).toFixed(0);
  m.appendChild(td);
  $(target).append(m);


  if (l2.length > 0) {
    m = document.createElement("tr");
    td = document.createElement("td");
    td.textContent = "Mean" + textExtra2;
    m.appendChild(td);
    td = document.createElement("td");
    td.textContent = Number.parseFloat(mean2).toFixed(3);
    m.appendChild(td);
    $(target).append(m);

    m = document.createElement("tr");
    td = document.createElement("td");
    td.textContent = "Standard Deviation" + textExtra2;
    m.appendChild(td);
    td = document.createElement("td");
    td.textContent = Number.parseFloat(sd2).toFixed(3);
    m.appendChild(td);
    $(target).append(m);

    m = document.createElement("tr");
    td = document.createElement("td");
    td.textContent = "# of Estimates" + textExtra2;
    m.appendChild(td);
    td = document.createElement("td");
    td.textContent = Number.parseFloat(count2).toFixed(0);
    m.appendChild(td);
    $(target).append(m);

    m = document.createElement("tr");
    td = document.createElement("td");
    td.textContent = "Mann-Whitney P-Value";
    m.appendChild(td);
    td = document.createElement("td");
    td.textContent = Number.parseFloat(mw).toFixed(3);
    m.appendChild(td);
    $(target).append(m);
  }
};

const getListsFromBD = (data) => {
  let l1 = [];
  let l2 = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i].data.length > 1) {
      if (i == 0) {
        l1 = data[i].data;
      }
      if (i == 1) {
        l2 = data[i].data;
      }
    }
  }
  return [l1, l2];
};


const buildGraphics = async (data, location = '#studentKDE') => {
  let silverFinal = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].data.length < 2) {
      continue;
    }
    silverFinal = Math.max(silverFinal, 1.06 * getStandardDeviation(data[i].data) * Math.pow(data[i].data.length, -0.2));
  }
  if (silverFinal == 0) {
    $('#alertBox').show();
    $('#alertBox').text("No data to plot.");
    $('#alertBox')[0].scrollIntoView();
    $("#alertBox").fadeTo(2000, 1000).slideUp(1000, () => {
      $("#alertBox").slideUp(1000);
    });
    return;
  }

  const contentWidth = Math.min(Math.max($('#rubricTableRow').width(), $('#fitTableRow').width(), $(location).width(), 480), 1320);
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
      svg.append("circle").attr("cx", width - 150).attr("cy", 30 + pos).attr("r", 6).style("fill", d.stroke);
      svg.append("text").attr("x", width - 130).attr("y", 30 + pos).text(d.chartLabel).style("font-size", "15px").attr("alignment-baseline", "middle");
    }
    pos += 30;
  }
};