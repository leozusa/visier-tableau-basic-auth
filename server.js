///////////////////////////////////////////////////////////////////////
// Visier-Tableau Basic-auth Connector                               //
// Visier Data Connector API for Data Exports.                       //
// Author: Leonardo Zuniga                                           //
// GitHub: https://github.com/leozusa/visier-tableau-basic-auth      //
// Version 1.5                                                       //
///////////////////////////////////////////////////////////////////////

const express = require("express");
const fetch = require("node-fetch");
var app = module.exports = express();

app.use(express.static("public"));
app.use(express.text());
app.use(express.urlencoded({ extended: false }))

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/proxy/*", async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  let url = decodeURIComponent(req.url.split("/proxy/")[1]);
  let auth = Buffer.from(`${username}:${password}`).toString("base64");
  let options = { method: "GET" };
  options["headers"] = {
    Authorization:
      `Basic ${auth}`
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
