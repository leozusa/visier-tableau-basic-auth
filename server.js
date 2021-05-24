///////////////////////////////////////////////////////////////////////
// Visier-Tableau Basic-auth Connector                               //
// Visier Data Connector API for Data Exports.                       //
// Author: Leonardo Zuniga                                           //
// GitHub: https://github.com/leozusa/visier-tableau-basic-auth      //
// Version 1.0                                                       //
///////////////////////////////////////////////////////////////////////

const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.use(express.static("public"));
app.use(express.text());

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/proxy/*", async (req, res) => {
  let base = req.url.split("/proxy/")[1].split("-dataset-");
  let url = base[0];
  let auth = base[1];
  let options = { method: "GET" };
  //let username = req.username;
  //let password = req.password;
  options["headers"] = {
    Authorization:
      `Basic ${auth}`// + Buffer.from(`${username}:${password}`).toString("base64")
  };

  try {
    let response = await fetch(url, options);
    let data = await response.text();
    response.ok
      ? res.send({ body: data })
      : res.send({ error: response.statusText });
  } catch (error) {
    res.send({ error: error.message });
  }
});

const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
