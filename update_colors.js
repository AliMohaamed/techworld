const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx') || file.endsWith('.css') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'apps', 'admin', 'src'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    content = content.replace(/#050505/g, '#1a1814'); // User: "backgrount for admin be #1a1814"
    content = content.replace(/#0b0b0b/g, '#24201a'); // Make panels slightly lighter so they don't blend in
    content = content.replace(/#101010/g, '#24201a'); // Same for modals
    
    // Inputs (bg-black/40 -> input, bg-black/30 -> cards/inputs)
    content = content.replace(/bg-black\/40/g, 'bg-[#2a261f]'); 
    content = content.replace(/bg-black\/30/g, 'bg-[#2a261f]');
    
    // Fix existing borders
    content = content.replace(/border-white\/10/g, 'border-white/5');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated ' + file);
    }
});
