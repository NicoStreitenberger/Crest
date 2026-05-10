const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Hide Tech Stack
app.disable('x-powered-by');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'strn-secret-key-2026',
    resave: false,
    saveUninitialized: true
}));

// Static Files
app.use(express.static(__dirname));

// Database Setup
const db = new sqlite3.Database('./strn-cms.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to SQLite database.');
});

// Initialize DB Tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);
    
    // Default admin
    db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
        if (!row) {
            db.run("INSERT INTO users (username, password) VALUES ('admin', 'admin')");
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        client TEXT,
        category TEXT,
        image TEXT,
        tags TEXT
    )`);

    // Insert sample projects if empty
    db.get("SELECT COUNT(*) as count FROM projects", (err, row) => {
        if (row.count === 0) {
            const stmt = db.prepare("INSERT INTO projects (title, client, category, image, tags) VALUES (?, ?, ?, ?, ?)");
            stmt.run("Fusion Bodyboard", "Fusion", "Physical Branding", "assets/project1.png", "Sports, Gear");
            stmt.run("LifeRun App", "LifeRun", "Digital Design", "https://images.unsplash.com/photo-1618761714954-0b8cd0026356?auto=format&fit=crop&w=800&q=80", "UX/UI");
            stmt.run("Modo Patria", "Modo Patria", "Brand Identity", "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=800&q=80", "Streetwear");
            stmt.finalize();
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        author TEXT,
        tags TEXT,
        date TEXT
    )`);

    // Insert initial blog posts
    db.get("SELECT COUNT(*) as count FROM posts", (err, row) => {
        if (row.count === 0) {
            const stmt = db.prepare("INSERT INTO posts (title, content, author, tags, date) VALUES (?, ?, ?, ?, ?)");
            stmt.run("The Power of Branding in 2026", "Exploring the evolution of digital identity...", "Nico Streitenberger", "Branding", new Date().toISOString());
            stmt.run("Digital Identity vs. Visual Identity", "Why a logo is not enough in the modern web...", "Nico Streitenberger", "Strategy", new Date().toISOString());
            stmt.run("Design Discipline in the Creative Process", "Lessons learned from extreme sports applied to UX...", "Nico Streitenberger", "Workflow", new Date().toISOString());
            stmt.finalize();
        }
    });
});

// Routes
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// API - Auth
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (row) {
            req.session.loggedIn = true;
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
    res.json({ loggedIn: !!req.session.loggedIn });
});

// API - Projects
app.get('/api/projects', (req, res) => {
    db.all("SELECT * FROM projects", [], (err, rows) => {
        res.json(rows);
    });
});

app.post('/api/projects', (req, res) => {
    if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' });
    const { title, client, category, image, tags } = req.body;
    db.run("INSERT INTO projects (title, client, category, image, tags) VALUES (?, ?, ?, ?, ?)", 
        [title, client, category, image, tags], function(err) {
            res.json({ id: this.lastID });
    });
});

app.delete('/api/projects/:id', (req, res) => {
    if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' });
    db.run("DELETE FROM projects WHERE id = ?", req.params.id, (err) => {
        res.json({ success: true });
    });
});

// API - Posts
app.get('/api/posts', (req, res) => {
    db.all("SELECT * FROM posts", [], (err, rows) => {
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`STRN Studio CMS running at http://localhost:${PORT}`);
});
