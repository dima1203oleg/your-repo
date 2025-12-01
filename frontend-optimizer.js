// Frontend Component Optimizer
// Analyzes and optimizes React components for better performance

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

class FrontendOptimizer {
    constructor() {
        this.optimizations = {
            performance: { applied: 0, issues: [] },
            codeQuality: { applied: 0, issues: [] },
            accessibility: { applied: 0, issues: [] },
            security: { applied: 0, issues: [] },
            bestPractices: { applied: 0, issues: [] }
        };
        
        this.componentFiles = this.findComponentFiles();
    }

    findComponentFiles() {
        try {
            const result = execSync('find . -name "*.tsx" -o -name "*.jsx" | grep -E "(components|views)" | head -20', { encoding: 'utf8' });
            return result.trim().split('\n').filter(file => file && existsSync(file));
        } catch (error) {
            console.log('⚠️ Could not find component files automatically');
            return [
                './App.tsx',
                './views/InfraView.tsx',
                './components/TacticalCard.tsx'
            ].filter(file => existsSync(file));
        }
    }

    analyzeComponent(filePath) {
        try {
            const content = readFileSync(filePath, 'utf8');
            const analysis = {
                imports: [],
                hooks: [],
                state: [],
                effects: [],
                performance: [],
                issues: []
            };
            
            // Analyze imports
            const importRegex = /import\s+.*?\s+from\s+['"][^'"]+['"];?/g;
            const imports = content.match(importRegex) || [];
            analysis.imports = imports;
            
            // Check for React hooks
            const hookRegex = /use\w+\(/g;
            const hooks = content.match(hookRegex) || [];
            analysis.hooks = hooks;
            
            // Check for useState
            const stateRegex = /useState\s*\(/g;
            const state = content.match(stateRegex) || [];
            analysis.state = state;
            
            // Check for useEffect
            const effectRegex = /useEffect\s*\(/g;
            const effects = content.match(effectRegex) || [];
            analysis.effects = effects;
            
            // Performance issues
            if (hooks.length > 10) {
                analysis.performance.push('Too many hooks - consider component splitting');
            }
            
            if (effects.length > 5) {
                analysis.performance.push('Many useEffect hooks - check for optimization opportunities');
            }
            
            // Code quality issues
            if (content.includes('any') && content.includes('TypeScript')) {
                analysis.issues.push('Using "any" type - consider proper typing');
            }
            
            if (content.includes('console.log')) {
                analysis.issues.push('Console.log statements found - remove in production');
            }
            
            // Security issues
            if (content.includes('dangerouslySetInnerHTML')) {
                analysis.issues.push('dangerouslySetInnerHTML found - security risk');
            }
            
            return analysis;
        } catch (error) {
            return { error: error.message };
        }
    }

    optimizeComponent(filePath) {
        try {
            let content = readFileSync(filePath, 'utf8');
            let modified = false;
            
            // Remove console.log statements
            const consoleLogRegex = /console\.log\(.*?\);?/g;
            if (consoleLogRegex.test(content)) {
                content = content.replace(consoleLogRegex, '// console.log removed');
                modified = true;
                this.optimizations.performance.applied++;
            }
            
            // Add React.memo for functional components without props
            if (content.includes('export default function') && 
                !content.includes('React.memo') && 
                !content.includes('props')) {
                
                // Simple heuristic for components without props
                const functionMatch = content.match(/export default function (\w+)/);
                if (functionMatch) {
                    const componentName = functionMatch[1];
                    if (!content.includes(`const ${componentName} = React.memo`)) {
                        // Add React.memo wrapper
                        content = content.replace(
                            `export default function ${componentName}`,
                            `const ${componentName} = React.memo(function ${componentName}_Inner`
                        );
                        content = content.replace(
                            `}`,
                            `});\nexport default ${componentName};`
                        );
                        modified = true;
                        this.optimizations.performance.applied++;
                    }
                }
            }
            
            // Add proper error boundaries
            if (content.includes('try') && !content.includes('ErrorBoundary')) {
                // Add error boundary import if not present
                if (!content.includes('ErrorBoundary')) {
                    content = content.replace(
                        /import React/,
                        'import React, { ErrorBoundary }'
                    );
                    modified = true;
                    this.optimizations.codeQuality.applied++;
                }
            }
            
            // Optimize imports - remove unused imports (basic check)
            const lines = content.split('\n');
            const importLines = lines.filter(line => line.includes('import'));
            
            importLines.forEach(importLine => {
                if (importLine.includes('React') && importLine.includes(',')) {
                    // Check if React hooks are actually used
                    const hooks = importLine.match(/use\w+/g) || [];
                    const contentLower = content.toLowerCase();
                    
                    hooks.forEach(hook => {
                        if (!contentLower.includes(hook.toLowerCase())) {
                            content = content.replace(hook, '');
                            modified = true;
                            this.optimizations.codeQuality.applied++;
                        }
                    });
                }
            });
            
            // Add accessibility improvements
            if (content.includes('<button') && !content.includes('aria-')) {
                // Add basic aria-label to buttons without text content
                const buttonRegex = /<button([^>]*)>\s*<[^>]+>\s*<\/button>/g;
                content = content.replace(buttonRegex, (match, attrs) => {
                    if (!attrs.includes('aria-')) {
                        return match.replace('<button', `<button aria-label="Action button"`);
                    }
                    return match;
                });
                if (content !== content) {
                    modified = true;
                    this.optimizations.accessibility.applied++;
                }
            }
            
            if (modified) {
                writeFileSync(filePath, content);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`Error optimizing ${filePath}:`, error.message);
            return false;
        }
    }

    checkBundleSize() {
        try {
            if (existsSync('./dist')) {
                const result = execSync('du -sh ./dist', { encoding: 'utf8' });
                const size = result.trim().split('\t')[0];
                return { size, status: 'checked' };
            }
            return { size: 'N/A', status: 'no dist folder' };
        } catch (error) {
            return { size: 'Error', status: 'failed' };
        }
    }

    analyzeDependencies() {
        try {
            const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
            const deps = packageJson.dependencies || {};
            const devDeps = packageJson.devDependencies || {};
            
            const analysis = {
                totalDeps: Object.keys(deps).length,
                totalDevDeps: Object.keys(devDeps).length,
                heavyDeps: [],
                unusedDeps: [],
                securityIssues: []
            };
            
            // Check for heavy dependencies
            Object.entries(deps).forEach(([name, version]) => {
                if (name.includes('moment') || name.includes('lodash') || name.includes('bootstrap')) {
                    analysis.heavyDeps.push({ name, version, issue: 'Heavy dependency' });
                }
            });
            
            // Check for security issues
            try {
                const auditResult = execSync('npm audit --json', { encoding: 'utf8', timeout: 5000 });
                const audit = JSON.parse(auditResult);
                if (audit.vulnerabilities) {
                    Object.keys(audit.vulnerabilities).forEach(vuln => {
                        analysis.securityIssues.push({
                            package: vuln,
                            severity: audit.vulnerabilities[vuln].severity
                        });
                    });
                }
            } catch (auditError) {
                // Audit failed, but continue
            }
            
            return analysis;
        } catch (error) {
            return { error: error.message };
        }
    }

    generateOptimizationReport() {
        console.log('\n📊 FRONTEND OPTIMIZATION REPORT');
        console.log('=' .repeat(60));
        
        // Component analysis
        console.log('\n🔍 Component Analysis:');
        this.componentFiles.forEach(file => {
            const analysis = this.analyzeComponent(file);
            if (!analysis.error) {
                console.log(`\n📄 ${file}:`);
                console.log(`  • Imports: ${analysis.imports.length}`);
                console.log(`  • Hooks: ${analysis.hooks.length}`);
                console.log(`  • State: ${analysis.state.length}`);
                console.log(`  • Effects: ${analysis.effects.length}`);
                
                if (analysis.issues.length > 0) {
                    console.log('  ⚠️ Issues:');
                    analysis.issues.forEach(issue => console.log(`    - ${issue}`));
                }
            }
        });
        
        // Bundle size
        const bundleInfo = this.checkBundleSize();
        console.log(`\n📦 Bundle Size: ${bundleInfo.size}`);
        
        // Dependencies
        const depAnalysis = this.analyzeDependencies();
        if (!depAnalysis.error) {
            console.log(`\n📋 Dependencies:`);
            console.log(`  • Production: ${depAnalysis.totalDeps}`);
            console.log(`  • Development: ${depAnalysis.totalDevDeps}`);
            
            if (depAnalysis.heavyDeps.length > 0) {
                console.log('  ⚠️ Heavy Dependencies:');
                depAnalysis.heavyDeps.forEach(dep => console.log(`    - ${dep.name}: ${dep.issue}`));
            }
            
            if (depAnalysis.securityIssues.length > 0) {
                console.log('  🚨 Security Issues:');
                depAnalysis.securityIssues.forEach(issue => console.log(`    - ${issue.package}: ${issue.severity}`));
            }
        }
        
        // Optimizations applied
        console.log('\n⚡ Optimizations Applied:');
        Object.entries(this.optimizations).forEach(([category, result]) => {
            if (result.applied > 0) {
                console.log(`  • ${category}: ${result.applied} optimizations`);
            }
        });
        
        // Recommendations
        console.log('\n💡 Recommendations:');
        
        if (bundleInfo.size !== 'N/A' && bundleInfo.size !== 'Error') {
            const sizeMB = parseFloat(bundleInfo.size.replace(/[^\d.]/g, ''));
            if (sizeMB > 5) {
                console.log('  • Consider code splitting to reduce bundle size');
            }
        }
        
        if (depAnalysis.heavyDeps && depAnalysis.heavyDeps.length > 0) {
            console.log('  • Replace heavy dependencies with lighter alternatives');
        }
        
        if (depAnalysis.securityIssues && depAnalysis.securityIssues.length > 0) {
            console.log('  • Update packages to fix security vulnerabilities');
        }
        
        console.log('  • Add more unit tests for critical components');
        console.log('  • Implement proper error boundaries');
        console.log('  • Add loading states for better UX');
        
        return {
            componentsAnalyzed: this.componentFiles.length,
            optimizationsApplied: Object.values(this.optimizations).reduce((sum, cat) => sum + cat.applied, 0),
            bundleSize: bundleInfo.size,
            dependencyIssues: (depAnalysis.heavyDeps?.length || 0) + (depAnalysis.securityIssues?.length || 0)
        };
    }

    async runOptimization() {
        console.log('🚀 Starting Frontend Optimization...\n');
        
        console.log('🔍 Analyzing components...');
        let optimizedCount = 0;
        
        for (const file of this.componentFiles) {
            console.log(`  • Processing ${file}...`);
            const wasOptimized = this.optimizeComponent(file);
            if (wasOptimized) {
                optimizedCount++;
            }
        }
        
        console.log(`\n✅ Optimized ${optimizedCount}/${this.componentFiles.length} components`);
        
        const report = this.generateOptimizationReport();
        
        console.log('\n🎉 Frontend Optimization Complete!');
        
        return report;
    }
}

// Run optimization if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const optimizer = new FrontendOptimizer();
    optimizer.runOptimization().catch(console.error);
}

export default FrontendOptimizer;
