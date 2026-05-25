const fs = require('fs');

function getAllFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const path = dir + '/' + file;
        const stat = fs.statSync(path);
        if (stat && stat.isDirectory() && !path.includes('node_modules') && !path.includes('.git')) {
            results = results.concat(getAllFiles(path));
        } else if (file.endsWith('.html') && path !== './index.html') { // Skip index.html as we already rewrote it
            results.push(path);
        }
    });
    return results;
}

const files = getAllFiles('.');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // 1. Fix Icon Component
    content = content.replace(/name\.toLowerCase\(\)/g, 'name.replace(/([a-z0-9])([A-Z])/g, \'$1-$2\').toLowerCase()');
    
    // 2. Add Tailwind config for dark mode if not present
    if (!content.includes('tailwind.config')) {
        content = content.replace('</head>', `
    <script>
        tailwind.config = { darkMode: 'class' }
    </script>
</head>`);
    }

    // 3. Add CSS for dark mode
    if (!content.includes('.dark body')) {
        content = content.replace('body { background-color: var(--bg);', 'body { background-color: var(--bg); transition: background-color 0.3s, color 0.3s; }\n        .dark body { background-color: #020617; color: #f8fafc; }');
        content = content.replace('.mesh-gradient {', '.mesh-gradient { transition: all 0.5s;');
        content = content.replace('@keyframes meshMove', '.dark .mesh-gradient { background-color: #020617; background-image: radial-gradient(at 0% 0%, hsla(160, 100%, 15%, 1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(220, 100%, 15%, 1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(260, 100%, 15%, 1) 0, transparent 50%), radial-gradient(at 50% 50%, hsla(180, 100%, 10%, 1) 0, transparent 50%), radial-gradient(at 0% 100%, hsla(200, 100%, 15%, 1) 0, transparent 50%), radial-gradient(at 100% 100%, hsla(150, 100%, 15%, 1) 0, transparent 50%); }\n        @keyframes meshMove');
    }

    // 4. Inject script to read theme from localStorage on load
    if (!content.includes('localStorage.getItem(\\\'theme\\\')')) {
        content = content.replace('const App = () => (', `const App = () => {
            React.useEffect(() => {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                }
            }, []);
            return (`);
        content = content.replace('    <div className="flex w-full h-full">\n                <Sidebar', '    <div className="flex w-full h-full transition-colors duration-300">\n                <Sidebar');
        content = content.replace('</Sidebar>\n                <Dashboard />\n            </div>\n        );', '</Sidebar>\n                <Dashboard />\n            </div>\n            );\n        };');
        // also for TransactionsPage (it uses <TransactionsPage /> instead of <Dashboard />)
        content = content.replace('    <div className="flex w-full h-full">\n                <Sidebar activePage', '    <div className="flex w-full h-full transition-colors duration-300">\n                <Sidebar activePage');
        content = content.replace('    <TransactionsPage />\n            </div>\n        );', '    <TransactionsPage />\n            </div>\n            );\n        };');
    }

    // Replace basic tailwind classes
    const replacements = [
        { from: /bg-white(?!\/)/g, to: 'bg-white dark:bg-slate-800' },
        { from: /bg-white\/60/g, to: 'bg-white/60 dark:bg-slate-800/60' },
        { from: /bg-white\/40/g, to: 'bg-white/40 dark:bg-slate-800/40' },
        { from: /bg-white\/20/g, to: 'bg-white/20 dark:bg-slate-800/20' },
        { from: /bg-slate-50(?!\/)/g, to: 'bg-slate-50 dark:bg-slate-900/50' },
        { from: /bg-slate-100(?!\/)/g, to: 'bg-slate-100 dark:bg-slate-800/50' },
        { from: /text-slate-900/g, to: 'text-slate-900 dark:text-white' },
        { from: /text-slate-600/g, to: 'text-slate-600 dark:text-slate-300' },
        { from: /text-slate-500/g, to: 'text-slate-500 dark:text-slate-400' },
        { from: /border-slate-100/g, to: 'border-slate-100 dark:border-slate-700' },
        { from: /border-slate-200/g, to: 'border-slate-200 dark:border-slate-700/50' },
        { from: /border-white\/50/g, to: 'border-white/50 dark:border-white/10' },
        { from: /border-white\/30/g, to: 'border-white/30 dark:border-white/5' },
        { from: /glass/g, to: 'glass dark:border-white/10' }
    ];

    let newContent = content;
    
    newContent = newContent.replace(/className=["']([^"']+)["']/g, (match, p1) => {
        let classes = p1;
        replacements.forEach(r => {
            if (classes.match(r.from) && !classes.includes('dark:')) {
                classes = classes.replace(r.from, r.to);
            }
        });
        return `className="${classes}"`;
    });
    
    newContent = newContent.replace(/class=["']([^"']+)["']/g, (match, p1) => {
        let classes = p1;
        replacements.forEach(r => {
            if (classes.match(r.from) && !classes.includes('dark:')) {
                classes = classes.replace(r.from, r.to);
            }
        });
        return `class="${classes}"`;
    });

    if (content !== newContent) {
        fs.writeFileSync(file, newContent);
    }
});
