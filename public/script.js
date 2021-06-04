///////////////////////////////////////////////////////////////////////
// Visier-Tableau Basic-auth Connector                               //
// Visier Data Connector API for Data Exports.                       //
// Author: Leonardo Zuniga                                           //
// GitHub: https://github.com/leozusa/visier-tableau-basic-auth      //
// Version 1.5                                                       //
///////////////////////////////////////////////////////////////////////

let dataCache;
if (typeof tableau === 'undefined') var tableau = {};
let tableauConn = tableau.makeConnector();

tableauConn.init = function(initCallback) {
  if ( tableau.connectionData && tableau.connectionData.length > 0 ) {
    let connData = JSON.parse(tableau.connectionData);
    $("#url").val(connData.dataUrl);
    $("#delimiter").val(connData.delimiter == "" ? connData.delimiter : ",");
    $("#username").val(tableau.username);
    $("#password").val(tableau.password);
  }
  initCallback();
};

tableauConn.getSchema = async function(schemaCallback) {
  let data = dataCache || (await _retrieveCSVData());  
  let cols = [];
  for (let field in data.headers) {
    cols.push({
      id: field,
      alias: data.headers[field].alias,
      dataType: data.headers[field].dataType
    });
  }
  var vars = {};
  JSON.parse(tableau.connectionData).dataUrl.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
      vars[key] = value.replace(/[^A-Za-z0-9_]/g, "_");
  });
  let tableSchema = {
    id: vars["id"],
    alias: vars["id"],
    columns: cols
  };
  schemaCallback([tableSchema]);
};

tableauConn.getData = async function(table, doneCallback) {
  let data = dataCache || (await _retrieveCSVData());
  let tableSchemas = [];
  let row_index = 0;
  let size = 10000;
  while (row_index < data.rows.length) {
    table.appendRows(data.rows.slice(row_index, size + row_index));
    row_index += size;
    tableau.reportProgress("Getting row: " + row_index);
  }
  doneCallback();
};

$(document).ready(function() {
  tableau.connectionName = "Visier Data";
  tableau.registerConnector(tableauConn);
});

async function _submitData(){
  let dataUrl = $("#url").val().trim();
  let delimiter = $("#delimiter") && $("#delimiter").val() !== "" ? $("#delimiter").val() : ",";
  if (!dataUrl) return _error("No data entered.");
  const urlRegex = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/|ftp:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/gm;
  const result = dataUrl.match(urlRegex);
  if (result === null) {
    _error("WARNING: URL may not be valid...");
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  tableau.connectionData = JSON.stringify({ dataUrl, delimiter });
  tableau.username = $("#username").val().trim();
  tableau.password = $("#password").val().trim();
  if (document.getElementById("error").innerHTML == "") {
    tableau.submit();
  } else {
    _submitDataToBrowser()
  }
}

async function _retrieveCSVData() {
  let delimiter = JSON.parse(tableau.connectionData).delimiter;
  dataCache = _csv2table(await _retrievePostData(), delimiter);
  return dataCache;
}

async function _submitDataToBrowser() {
  var delimiter = JSON.parse(tableau.connectionData).delimiter;
  var postdata = await _retrievePostData();
  var lines = postdata.split("\r\n"),
  output = [],
  i;
  for (i = 0; i < lines.length; i++)
    output.push("<tr><td>"
    + lines[i].split(delimiter).map(Function.prototype.call, String.prototype.trim).join("</td><td>")
    + "</td></tr>");
  document.getElementById('result').innerHTML = "<table>" + output.join("") + "</table>"
  return;
}

async function _retrievePostData() {
  let dataUrl = window.location.href + "proxy/" +  encodeURIComponent(JSON.parse(tableau.connectionData).dataUrl);
  let username = tableau.username;
  let password = tableau.password;
  let result = await $.post(dataUrl, { username, password });
  if (result.error) {
    if (tableau.phase !== "interactive") {
      console.error(result.error);
      tableau.abortWithError(result.error);
    } else {
      _error(result.error);
    }
    return;
  }
  return result.body;
}

function _csv2table(csv, delimiter) {
  let lines = Papa.parse(csv, {
    delimiter,
    newline: "\r\n",
    dynamicTyping: true
  }).data;
  let fields = lines.shift();
  let headers = {};
  let rows = [];

  for (let field of fields) {
    let newKey = field.replace(/[^A-Za-z0-9_]/g, "_");
    let safeToAdd = false;

    do {
      if (Object.keys(headers).includes(newKey)) {
        newKey += "_copy";
      } else {
        safeToAdd = true;
      }
    } while (!safeToAdd);

    headers[newKey] = { alias: field };
  }
  let counts = lines.map(line => line.length);
  let lineLength = counts.reduce((m, c) =>
    counts.filter(v => v === c).length > m ? c : m
  );

  for (let line of lines) {
    if (line.length === lineLength) {
      let obj = {};
      let headerKeys = Object.keys(headers);
      for (let field in headerKeys) {
        let header = headers[headerKeys[field]];
        let value = line[field];

        if (
          value === "" ||
          value === '""' ||
          value === "null" ||
          value === null
        ) {
          obj[headerKeys[field]] = null;
          header.null = header.null ? header.null + 1 : 1;
        } else if (value === "true" || value === true) {
          obj[headerKeys[field]] = true;
          header.bool = header.bool ? header.bool + 1 : 1;
        } else if (value === "false" || value === false) {
          obj[headerKeys[field]] = false;
          header.bool = header.bool ? header.bool + 1 : 1;
        } else if (typeof value === "object") {
          obj[headerKeys[field]] = value.toISOString();
          header.string = header.string ? header.string + 1 : 1;
        } else if (!isNaN(value)) {
          obj[headerKeys[field]] = value;
          if (parseInt(value) == value) {
            header.int = header.int ? header.int + 1 : 1;
          } else {
            header.float = header.float ? header.float + 1 : 1;
          }
        } else {
          obj[headerKeys[field]] = value;
          header.string = header.string ? header.string + 1 : 1;
        }
      }
      rows.push(obj);
    } else {
      console.log("Mismatched length. Row ommited.", line);
    }
  }

  for (let field in headers) {
    if (headers[field].string) {
      headers[field].dataType = "string";
      continue;
    }
    if (Object.keys(headers[field]).length === 1 && headers[field].null) {
      headers[field].dataType = "string";
      continue;
    }
    if (headers[field].float) {
      headers[field].dataType = "float";
      continue;
    }
    if (headers[field].int) {
      headers[field].dataType = "int";
      continue;
    }
    if (headers[field].bool) {
      headers[field].dataType = "bool";
      continue;
    }
    headers[field].dataType = "string";
  }

  return { headers, rows };
}

function _error(message) {
  $(".error")
    .fadeIn("fast")
    .delay(3000)
    .fadeOut("slow");
  $(".error").html(message);
  $("html, body").animate({ scrollTop: $(document).height() }, "fast");
}

$("#url").keypress(function(event) {
  if (event.keyCode === 13) {
    _submitDataToTableau();
  }
});

$("#delimiter").keydown(function(event) {
  if (event.keyCode === 9) {
    event.preventDefault();
    $("#delimiter").val("\t");
  }
});
