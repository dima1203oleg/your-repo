
// Security Scan Script
import { execSync } from 'child_process';

console.log('🔍 Running Security Scan...');

try {
    // Check for vulnerabilities
    console.log('📦 Checking for vulnerable dependencies...');
    execSync('npm audit --audit-level=high', { stdio: 'inherit' });
    
    // Check for secrets
    console.log('🔑 Checking for exposed secrets...');
    execSync('git-secrets --scan', { stdio: 'inherit' });
    
    // Check file permissions
    console.log('📁 Checking file permissions...');
    execSync('find . -type f -perm /o+w -not -path "./node_modules/*"', { stdio: 'inherit' });
    
    console.log('✅ Security scan completed');
} catch (error) {
    console.error('❌ Security scan failed:', error.message);
    process.exit(1);
}
