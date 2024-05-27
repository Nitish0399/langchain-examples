require("dotenv").config();
const express = require("express");
const app = express();
const port = 5001;

const example1 = require("./example1.js");
const example2 = require("./example2.js");
const example3 = require("./example3.js");
const example4 = require("./example4.js");

// example1();
// example2();
example3();
// example4();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
