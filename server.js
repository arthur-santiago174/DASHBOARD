const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname + "/public"));

const db = mysql.createConnection({
    host: process.env.MYSQLHOST || "localhost",
    user: process.env.MYSQLUSER || "root",
    password: process.env.MYSQLPASSWORD || "123456",
    database: process.env.MYSQLDATABASE || "DASHBOARD",
    port: process.env.MYSQLPORT || 3306
});

db.connect((err) => {
    if (err) {
        console.log("Erro no banco:", err);
        return;
    }
    console.log("Banco conectado!");
});

// ... (resto das rotas continua igual) ...

app.listen(process.env.PORT || 3005, () => {
    console.log("Servidor rodando");
});