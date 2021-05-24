///////////////////////////////////////////////////////////////////////
// Visier-Tableau Basic-auth Connector                               //
// Visier Data Connector API for Data Exports.                       //
// Author: Leonardo Zuniga                                           //
// GitHub: https://github.com/leozusa/visier-tableau-basic-auth      //
// Version 1.0                                                       //
///////////////////////////////////////////////////////////////////////

let dataCache;

let tableauConn = tableau.makeConnector();

tableauConn.init = function(initCallback) {
  tableau.authType = tableau.authTypeEnum.basic;
  if (
    tableau.phase == tableau.phaseEnum.interactivePhase &&
    tableau.connectionData.length > 0
  ) {
    const conData = JSON.parse(tableau.connectionData);
    $("#url").val(conData.dataUrl || "");
    $("#delimiter").val(conData.delimiter || ",");
    $("#username").val(tableau.username || "");
    $("#password").val(tableau.password || "");
  }
  initCallback();
};

tableauConn.getSchema = async function(schemaCallback) {
  let conData = JSON.parse(tableau.connectionData);
  let dataUrl = conData.dataUrl;
  let username = tableau.username;
  let password = tableau.password;
  let delimiter =
    conData.delimiter && conData.delimiter !== "" ? conData.delimiter : ",";
  let data =
    dataCache ||
    (await _retrieveCSVData({ dataUrl, username, password, delimiter }));
  let cols = [];

  for (let field in data.headers) {
    cols.push({
      id: field,
      alias: data.headers[field].alias,
      dataType: data.headers[field].dataType
    });
  }

  var vars = {};
  dataUrl.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
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
  let conData = JSON.parse(tableau.connectionData);
  let dataUrl = conData.dataUrl;
  let delimiter =
    conData.delimiter && conData.delimiter !== "" ? conData.delimiter : ",";
  let username = tableau.username;
  let password = tableau.password;
  let tableSchemas = [];
  let data =
    dataCache ||
    (await _retrieveCSVData({ dataUrl, username, password, delimiter }));
  let row_index = 0;
  let size = 10000;
  while (row_index < data.rows.length) {
    table.appendRows(data.rows.slice(row_index, size + row_index));
    row_index += size;
    tableau.reportProgress("Getting row: " + row_index);
  }

  doneCallback();
};

tableau.connectionName = "Visier Data";
tableau.registerConnector(tableauConn);

async function _submitData(){
  if (document.getElementById("error").innerHTML == "") {
    _submitDataToTableau();
  } else {
    _submitDataToBrowser()
  }
}

async function _submitDataToTableau() {
  let dataUrl = $("#url")
    .val()
    .trim();
  let delimiter = $("#delimiter").val();
  if (!dataUrl) return _error("No data entered.");
  const urlRegex = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/|ftp:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/gm;
  const result = dataUrl.match(urlRegex);
  if (result === null) {
    _error("WARNING: URL may not be valid...");
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  let connData = JSON.stringify({ dataUrl, delimiter });
  tableau.connectionData = connData;
  tableau.username = $("#username").val().trim();
  tableau.password = $("#password").val().trim();
  tableau.submit();
}

async function _retrieveCSVData({ dataUrl, username, password, delimiter }) {
  let proxy =
    "/proxy/" + dataUrl + "-dataset-" + btoa(`${username}:${password}`);
  let result = await $.post(proxy, { username, password });
  if (result.error) {
    if (tableau.phase !== "interactive") {
      console.error(result.error);
      tableau.abortWithError(result.error);
    } else {
      _error(result.error);
    }
    return;
  }
  dataCache = _csv2table(result.body, delimiter);
  return dataCache;
}

async function _submitDataToBrowser() {
  let dataUrl = $("#url").val().trim();
  let delimiter = $("#delimiter") && $("#delimiter").val() !== "" ? $("#delimiter").val() : ",";
  let username = $("#username").val().trim();
  let password = $("#password")
    .val()
    .trim();
  if (!dataUrl) return _error("No data entered.");
  const urlRegex = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/|ftp:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/gm;
  const urlcheck = dataUrl.match(urlRegex);
  if (urlcheck === null) {
    _error("WARNING: URL may not be valid...");
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  let connData = JSON.stringify({ dataUrl, delimiter });
  let proxy = "/proxy/" + dataUrl + "-dataset-" + btoa(`${username}:${password}`);
  let result = await $.post(proxy, { username, password });
  if (result.error) {
    _error(result.error);
    return;
  }
  var lines = result.body.split("\r\n"),
  output = [],
  i;
  for (i = 0; i < lines.length; i++)
    output.push("<tr><td>"
    + lines[i].split(delimiter).map(Function.prototype.call, String.prototype.trim).join("</td><td>")
    + "</td></tr>");
  document.getElementById('result').innerHTML = "<table>" + output.join("") + "</table>"
  return;
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
    // strings
    if (headers[field].string) {
      headers[field].dataType = "string";
      continue;
    }
    // nulls
    if (Object.keys(headers[field]).length === 1 && headers[field].null) {
      headers[field].dataType = "string";
      continue;
    }
    // floats
    if (headers[field].float) {
      headers[field].dataType = "float";
      continue;
    }
    // integers
    if (headers[field].int) {
      headers[field].dataType = "int";
      continue;
    }
    // booleans
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
