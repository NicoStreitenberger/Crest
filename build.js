const fs = require('fs');
const path = require('path');

// Helper to copy directory recursively
function copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    let entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        let srcPath = path.join(src, entry.name);
        let destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Simple minifier for CSS (removes comments, extra whitespaces)
function minifyCSS(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .replace(/ ?\{ ?/g, '{') // Remove spaces around braces
        .replace(/ ?\} ?/g, '}')
        .replace(/ ?; ?/g, ';')
        .replace(/ ?: ?/g, ':')
        .replace(/ ?, ?/g, ',')
        .trim();
}

// Simple minifier for JS (removes block comments, inline comments, extra spaces)
function minifyJS(js) {
    return js
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .replace(/\/\/.*/g, '') // Remove inline comments
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .replace(/ ?= ?/g, '=')
        .replace(/ ?\+ ?/g, '+')
        .replace(/ ?\- ?/g, '-')
        .replace(/ ?\{ ?/g, '{')
        .replace(/ ?\} ?/g, '}')
        .replace(/ ?\( ?/g, '(')
        .replace(/ ?\) ?/g, ')')
        .replace(/ ?; ?/g, ';')
        .replace(/ ?, ?/g, ',')
        .trim();
}

console.log('Starting CREST Studio build...');

// Create dist directory
if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist');

// Copy HTML files
const files = fs.readdirSync('.');
for (let file of files) {
    if (file.endsWith('.html')) {
        fs.copyFileSync(file, path.join('dist', file));
        console.log(`Copied ${file}`);
    }
}

// Copy other static files
const staticFiles = ['robots.txt', 'sitemap.xml', '.htaccess', '_redirects'];
for (let file of staticFiles) {
    if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join('dist', file));
        console.log(`Copied ${file}`);
    }
}

// Copy assets
if (fs.existsSync('assets')) {
    copyDirSync('assets', 'dist/assets');
    console.log('Copied assets directory');
}

// Minify CSS
fs.mkdirSync('dist/css', { recursive: true });
if (fs.existsSync('css')) {
    const cssFiles = fs.readdirSync('css');
    for (let file of cssFiles) {
        if (file.endsWith('.css')) {
            const content = fs.readFileSync(path.join('css', file), 'utf8');
            fs.writeFileSync(path.join('dist/css', file), minifyCSS(content));
            console.log(`Minified CSS: ${file}`);
        }
    }
}

// Minify JS
fs.mkdirSync('dist/js', { recursive: true });
if (fs.existsSync('js')) {
    const jsFiles = fs.readdirSync('js');
    for (let file of jsFiles) {
        if (file.endsWith('.js')) {
            const content = fs.readFileSync(path.join('js', file), 'utf8');
            fs.writeFileSync(path.join('dist/js', file), minifyJS(content));
            console.log(`Minified JS: ${file}`);
        }
    }
}

console.log('CREST Studio build completed successfully.');
