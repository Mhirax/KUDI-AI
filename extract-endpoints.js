/**
 * Extract all endpoints from controller files without requiring Prisma
 * Parses @Get, @Post, @Put, @Delete decorators directly from source files
 */

const fs = require('fs');
const path = require('path');

const endpoints = {
  'Identity': [],
  'Accounts': [],
  'Transfers': [],
  'Cards': [],
  'Compliance': [],
  'Funding': [],
  'Ledger': [],
  'Bills': [],
  'Loans': [],
  'Rewards': [],
  'Savings': [],
  'Notifications': []
};

function getModuleName(filePath) {
  const match = filePath.match(/modules\/([^\/]+)\//);
  return match ? match[1] : null;
}

function getModuleLabel(moduleName) {
  const map = {
    'identity': 'Identity',
    'accounts': 'Accounts',
    'transfers': 'Transfers',
    'cards': 'Cards',
    'compliance': 'Compliance',
    'funding': 'Funding',
    'ledger': 'Ledger',
    'bills': 'Bills',
    'loans': 'Loans',
    'rewards': 'Rewards',
    'savings': 'Savings',
    'notifications': 'Notifications'
  };
  return map[moduleName] || moduleName;
}

function extractEndpoints(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const results = [];
  
  // Get controller path from @Controller decorator
  const controllerMatch = content.match(/@Controller\(['"]([^'"]+)['"]\)/);
  const controllerPath = controllerMatch ? controllerMatch[1] : '';
  
  // Find all @Get, @Post, @Put, @Delete decorators
  const httpMethods = ['Get', 'Post', 'Put', 'Delete', 'Patch'];
  
  httpMethods.forEach(method => {
    const regex = new RegExp(`@${method}\\(['"]([^'"]*)['"](\\)|,)`, 'g');
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const path = match[1];
      const fullPath = path ? `${controllerPath}/${path}` : controllerPath;
      
      results.push({
        method: method.toUpperCase(),
        path: fullPath
      });
    }
  });
  
  return results;
}

function findControllerFiles(dir) {
  let controllers = [];
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      controllers = controllers.concat(findControllerFiles(filePath));
    } else if (file.endsWith('.controller.ts')) {
      controllers.push(filePath);
    }
  });
  
  return controllers;
}

// Find all controller files
const modulesDir = path.join(__dirname, 'modules');
const controllers = findControllerFiles(modulesDir);

console.log(`Found ${controllers.length} controller files\n`);

// Extract endpoints from each controller
controllers.forEach(controllerPath => {
  const moduleName = getModuleName(controllerPath);
  const moduleLabel = getModuleLabel(moduleName);
  
  const eps = extractEndpoints(controllerPath);
  
  if (moduleLabel && endpoints[moduleLabel] && eps.length > 0) {
    endpoints[moduleLabel].push(...eps);
  }
});

// Generate markdown documentation
let markdown = `# Kudi AI Bank - API Endpoints Documentation
**Generated: ${new Date().toISOString()}**
**Total Endpoints: ${Object.values(endpoints).reduce((a, b) => a + b.length, 0)}**

---

## 📋 Table of Contents

`;

Object.keys(endpoints).forEach(module => {
  if (endpoints[module].length > 0) {
    markdown += `- [${module}](#${module.toLowerCase()}) (${endpoints[module].length} endpoints)\n`;
  }
});

markdown += `\n---\n\n`;

// Generate endpoint sections
Object.keys(endpoints).forEach(module => {
  if (endpoints[module].length > 0) {
    markdown += `## ${module}\n\n`;
    
    endpoints[module].forEach(ep => {
      const methodColor = {
        'GET': '🟢',
        'POST': '🔵',
        'PUT': '🟠',
        'DELETE': '🔴',
        'PATCH': '🟣'
      }[ep.method] || '⚪';
      
      markdown += `| ${methodColor} ${ep.method} | \`/api/v1/${ep.path}\` |\n`;
    });
    
    markdown += `\n`;
  }
});

// Generate table format documentation
markdown += `\n---\n\n## 📊 Complete Endpoint Reference\n\n`;
markdown += `| Module | Method | Path | Count |\n`;
markdown += `|--------|--------|------|-------|\n`;

Object.keys(endpoints).forEach(module => {
  if (endpoints[module].length > 0) {
    endpoints[module].forEach((ep, idx) => {
      markdown += `| ${idx === 0 ? module : ''} | ${ep.method} | /api/v1/${ep.path} | ${idx === 0 ? endpoints[module].length : ''} |\n`;
    });
  }
});

// Save files
fs.writeFileSync('API_ENDPOINTS_REFERENCE.md', markdown);
console.log('✅ Generated: API_ENDPOINTS_REFERENCE.md');

// Generate JSON format
const json = {
  generated: new Date().toISOString(),
  totalEndpoints: Object.values(endpoints).reduce((a, b) => a + b.length, 0),
  endpoints: endpoints
};

fs.writeFileSync('endpoints.json', JSON.stringify(json, null, 2));
console.log('✅ Generated: endpoints.json');

// Print summary
console.log('\n📊 Endpoint Summary:\n');
Object.keys(endpoints).forEach(module => {
  if (endpoints[module].length > 0) {
    console.log(`${module}: ${endpoints[module].length} endpoints`);
  }
});
