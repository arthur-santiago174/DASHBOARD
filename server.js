const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname + "/public"));
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "123456",
    database: "DASHBOARD"
});
db.connect((err) => {
    if (err) {
        console.log("Erro no banco:", err);
        return;
    }
    console.log("Banco DASHBOARD conectado!");
});
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});
app.get("/tasks", (req, res) => {
    db.query(
        "SELECT * FROM tasks ORDER BY FIELD(priority, 'alta', 'media', 'baixa'), id DESC",
        (err, result) => {
            if (err) {
                return res.status(500).json(err);
            }
            res.json(result);
        }
    );
});
app.post("/tasks", (req, res) => {
    const { description, category, priority } = req.body;
    db.query(
        "INSERT INTO tasks (description, category, priority) VALUES (?,?,?)",
        [description, category, priority || 'media'],
        (err, result) => {
            if (err) {
                return res.status(500).json(err);
            }
            res.json(result);
        }
    );
});
app.put("/tasks/:id", (req, res) => {
    const id = req.params.id;
    const { completed, description, priority } = req.body;
    if (completed !== undefined) {
        db.query(
            "UPDATE tasks SET completed=? WHERE id=?",
            [completed, id],
            () => res.json("ok")
        );
    } else if (priority !== undefined) {
        db.query(
            "UPDATE tasks SET priority=? WHERE id=?",
            [priority, id],
            () => res.json("ok")
        );
    } else {
        db.query(
            "UPDATE tasks SET description=? WHERE id=?",
            [description, id],
            () => res.json("ok")
        );
    }
});
app.delete("/tasks/:id", (req, res) => {
    db.query(
        "DELETE FROM tasks WHERE id=?",
        [req.params.id],
        () => res.json("apagado")
    );
});
app.listen(3005, () => {
    console.log("Servidor rodando na porta 3005");
});