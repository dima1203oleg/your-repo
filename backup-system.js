// Automated Backup System for Predator Analytics
// Comprehensive backup and recovery solution

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { createGzip, createGunzip } from 'zlib';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { join } from 'path';

class BackupSystem {
    constructor() {
        this.config = {
            backupDir: './backups',
            retentionDays: 30,
            compression: true,
            encryption: false,
            cloudBackup: false,
            schedule: 'daily'
        };
        
        this.backupTypes = {
            full: 'Full System Backup',
            incremental: 'Incremental Backup',
            config: 'Configuration Backup',
            data: 'Data Backup',
            logs: 'Logs Backup'
        };
        
        this.ensureBackupDirectory();
    }

    ensureBackupDirectory() {
        if (!existsSync(this.config.backupDir)) {
            mkdirSync(this.config.backupDir, { recursive: true });
        }
        
        const subdirs = ['full', 'incremental', 'config', 'data', 'logs'];
        subdirs.forEach(dir => {
            const fullPath = join(this.config.backupDir, dir);
            if (!existsSync(fullPath)) {
                mkdirSync(fullPath, { recursive: true });
            }
        });
    }

    generateBackupId() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const random = Math.random().toString(36).substring(2, 8);
        return `${timestamp}-${random}`;
    }

    async createBackup(type = 'full') {
        const backupId = this.generateBackupId();
        const startTime = Date.now();
        
        console.log(`🔄 Starting ${this.backupTypes[type]} - ID: ${backupId}`);
        
        try {
            let backupData = {};
            
            switch (type) {
                case 'full':
                    backupData = await this.createFullBackup(backupId);
                    break;
                case 'incremental':
                    backupData = await this.createIncrementalBackup(backupId);
                    break;
                case 'config':
                    backupData = await this.createConfigBackup(backupId);
                    break;
                case 'data':
                    backupData = await this.createDataBackup(backupId);
                    break;
                case 'logs':
                    backupData = await this.createLogsBackup(backupId);
                    break;
                default:
                    throw new Error(`Unknown backup type: ${type}`);
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            const backupInfo = {
                id: backupId,
                type: type,
                timestamp: new Date().toISOString(),
                duration: duration,
                size: backupData.size,
                files: backupData.files,
                status: 'success'
            };
            
            // Save backup metadata
            this.saveBackupMetadata(backupInfo);
            
            console.log(`✅ Backup completed: ${backupId} (${duration}ms, ${backupData.size} bytes)`);
            
            return backupInfo;
            
        } catch (error) {
            console.error(`❌ Backup failed: ${error.message}`);
            
            const backupInfo = {
                id: backupId,
                type: type,
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
                error: error.message,
                status: 'failed'
            };
            
            this.saveBackupMetadata(backupInfo);
            throw error;
        }
    }

    async createFullBackup(backupId) {
        let backupPath = join(this.config.backupDir, 'full', `${backupId}.tar`);
        const files = [];
        let totalSize = 0;
        
        // Files to backup
        const backupItems = [
            { path: './package.json', name: 'package.json' },
            { path: './package-lock.json', name: 'package-lock.json' },
            { path: './tsconfig.json', name: 'tsconfig.json' },
            { path: './vite.config.ts', name: 'vite.config.ts' },
            { path: './real-backend', name: 'backend' },
            { path: './services', name: 'services' },
            { path: './components', name: 'components' },
            { path: './views', name: 'views' },
            { path: './context', name: 'context' },
            { path: './types.ts', name: 'types.ts' },
            { path: './App.tsx', name: 'App.tsx' },
            { path: './index.tsx', name: 'index.tsx' }
        ];
        
        // Create tar archive
        try {
            const tarCommand = `tar -cf ${backupPath} ${backupItems.map(item => item.path).join(' ')}`;
            execSync(tarCommand);
            
            // Get file size (cross-platform)
            let stats;
            try {
                stats = execSync(`stat -f%z ${backupPath}`).toString().trim();
            } catch (error) {
                // Fallback for different stat versions
                stats = execSync(`wc -c < ${backupPath}`).toString().trim();
            }
            totalSize = parseInt(stats);
            
            files.push(...backupItems.map(item => item.path));
            
            // Compress if enabled
            if (this.config.compression) {
                await this.compressFile(backupPath, `${backupPath}.gz`);
                execSync(`rm ${backupPath}`);
                const compressedPath = `${backupPath}.gz`;
                
                let compressedStats;
                try {
                    compressedStats = execSync(`stat -f%z ${compressedPath}`).toString().trim();
                } catch (error) {
                    compressedStats = execSync(`wc -c < ${compressedPath}`).toString().trim();
                }
                totalSize = parseInt(compressedStats);
                backupPath = compressedPath;
            }
            
        } catch (error) {
            throw new Error(`Failed to create full backup: ${error.message}`);
        }
        
        return { path: backupPath, size: totalSize, files: files };
    }

    async createIncrementalBackup(backupId) {
        // Get last full backup
        const lastFullBackup = this.getLastBackup('full');
        if (!lastFullBackup) {
            console.log('No full backup found, creating full backup instead');
            return this.createFullBackup(backupId);
        }
        
        const backupPath = join(this.config.backupDir, 'incremental', `${backupId}.tar`);
        const files = [];
        let totalSize = 0;
        
        // Find modified files since last backup
        const lastBackupTime = new Date(lastFullBackup.timestamp).getTime();
        
        try {
            // Find recently modified files
            const findCommand = `find . -type f -newermt "${lastFullBackup.timestamp}" -not -path "./backups/*" -not -path "./node_modules/*" -not -path "./dist/*" -not -path "./.git/*"`;
            const modifiedFiles = execSync(findCommand, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
            
            if (modifiedFiles.length === 0) {
                console.log('No modified files found since last backup');
                return { path: null, size: 0, files: [] };
            }
            
            // Create incremental backup
            const tarCommand = `tar -cf ${backupPath} ${modifiedFiles.join(' ')}`;
            execSync(tarCommand);
            
            let stats;
            try {
                stats = execSync(`stat -f%z ${backupPath}`).toString().trim();
            } catch (error) {
                stats = execSync(`wc -c < ${backupPath}`).toString().trim();
            }
            totalSize = parseInt(stats);
            files.push(...modifiedFiles);
            
            // Compress if enabled
            if (this.config.compression) {
                await this.compressFile(backupPath, `${backupPath}.gz`);
                execSync(`rm ${backupPath}`);
                backupPath = `${backupPath}.gz`;
                
                let compressedStats;
                try {
                    compressedStats = execSync(`stat -f%z ${backupPath}`).toString().trim();
                } catch (error) {
                    compressedStats = execSync(`wc -c < ${backupPath}`).toString().trim();
                }
                totalSize = parseInt(compressedStats);
            }
            
        } catch (error) {
            throw new Error(`Failed to create incremental backup: ${error.message}`);
        }
        
        return { path: backupPath, size: totalSize, files: files };
    }

    async createConfigBackup(backupId) {
        const backupPath = join(this.config.backupDir, 'config', `${backupId}.tar`);
        const files = [];
        let totalSize = 0;
        
        const configFiles = [
            './package.json',
            './package-lock.json',
            './tsconfig.json',
            './vite.config.ts',
            './.env.example',
            './Dockerfile',
            './docker-compose.prod.yml',
            './nginx/nginx.conf',
            './prometheus/prometheus.yml'
        ].filter(file => existsSync(file));
        
        try {
            const tarCommand = `tar -cf ${backupPath} ${configFiles.join(' ')}`;
            execSync(tarCommand);
            
            let stats;
            try {
                stats = execSync(`stat -f%z ${backupPath}`).toString().trim();
            } catch (error) {
                stats = execSync(`wc -c < ${backupPath}`).toString().trim();
            }
            totalSize = parseInt(stats);
            files.push(...configFiles);
            
            if (this.config.compression) {
                await this.compressFile(backupPath, `${backupPath}.gz`);
                execSync(`rm ${backupPath}`);
                backupPath = `${backupPath}.gz`;
                
                let compressedStats;
                try {
                    compressedStats = execSync(`stat -f%z ${backupPath}`).toString().trim();
                } catch (error) {
                    compressedStats = execSync(`wc -c < ${backupPath}`).toString().trim();
                }
                totalSize = parseInt(compressedStats);
            }
            
        } catch (error) {
            throw new Error(`Failed to create config backup: ${error.message}`);
        }
        
        return { path: backupPath, size: totalSize, files: files };
    }

    async createDataBackup(backupId) {
        const backupPath = join(this.config.backupDir, 'data', `${backupId}.tar`);
        const files = [];
        let totalSize = 0;
        
        const dataDirs = [
            './data',
            './logs',
            './ua-sources'
        ].filter(dir => existsSync(dir));
        
        try {
            const tarCommand = `tar -cf ${backupPath} ${dataDirs.join(' ')}`;
            execSync(tarCommand);
            
            let stats;
            try {
                stats = execSync(`stat -f%z ${backupPath}`).toString().trim();
            } catch (error) {
                stats = execSync(`wc -c < ${backupPath}`).toString().trim();
            }
            totalSize = parseInt(stats);
            files.push(...dataDirs);
            
            if (this.config.compression) {
                await this.compressFile(backupPath, `${backupPath}.gz`);
                execSync(`rm ${backupPath}`);
                backupPath = `${backupPath}.gz`;
                
                let compressedStats;
                try {
                    compressedStats = execSync(`stat -f%z ${backupPath}`).toString().trim();
                } catch (error) {
                    compressedStats = execSync(`wc -c < ${backupPath}`).toString().trim();
                }
                totalSize = parseInt(compressedStats);
            }
            
        } catch (error) {
            throw new Error(`Failed to create data backup: ${error.message}`);
        }
        
        return { path: backupPath, size: totalSize, files: files };
    }

    async createLogsBackup(backupId) {
        const backupPath = join(this.config.backupDir, 'logs', `${backupId}.tar`);
        const files = [];
        let totalSize = 0;
        
        if (existsSync('./logs')) {
            try {
                const tarCommand = `tar -cf ${backupPath} ./logs`;
                execSync(tarCommand);
                
                let stats;
            try {
                stats = execSync(`stat -f%z ${backupPath}`).toString().trim();
            } catch (error) {
                stats = execSync(`wc -c < ${backupPath}`).toString().trim();
            }
                totalSize = parseInt(stats);
                files.push('./logs');
                
                if (this.config.compression) {
                    await this.compressFile(backupPath, `${backupPath}.gz`);
                    execSync(`rm ${backupPath}`);
                    backupPath = `${backupPath}.gz`;
                    
                    let compressedStats;
                try {
                    compressedStats = execSync(`stat -f%z ${backupPath}`).toString().trim();
                } catch (error) {
                    compressedStats = execSync(`wc -c < ${backupPath}`).toString().trim();
                }
                    totalSize = parseInt(compressedStats);
                }
                
            } catch (error) {
                throw new Error(`Failed to create logs backup: ${error.message}`);
            }
        }
        
        return { path: backupPath, size: totalSize, files: files };
    }

    async compressFile(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            const gzip = createGzip();
            const source = createReadStream(inputPath);
            const destination = createWriteStream(outputPath);
            
            pipeline(source, gzip, destination)
                .then(resolve)
                .catch(reject);
        });
    }

    saveBackupMetadata(backupInfo) {
        const metadataPath = join(this.config.backupDir, 'metadata.json');
        let metadata = [];
        
        if (existsSync(metadataPath)) {
            try {
                const data = readFileSync(metadataPath, 'utf8');
                metadata = JSON.parse(data);
            } catch (error) {
                console.log('Creating new metadata file');
            }
        }
        
        metadata.push(backupInfo);
        
        // Keep only recent backups in metadata
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
        
        metadata = metadata.filter(backup => 
            new Date(backup.timestamp) > cutoffDate
        );
        
        writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    getLastBackup(type) {
        const metadataPath = join(this.config.backupDir, 'metadata.json');
        
        if (!existsSync(metadataPath)) {
            return null;
        }
        
        try {
            const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
            const typeBackups = metadata.filter(backup => backup.type === type && backup.status === 'success');
            
            if (typeBackups.length === 0) {
                return null;
            }
            
            // Return most recent backup
            return typeBackups.reduce((latest, backup) => {
                return new Date(backup.timestamp) > new Date(latest.timestamp) ? backup : latest;
            });
            
        } catch (error) {
            console.error('Error reading backup metadata:', error.message);
            return null;
        }
    }

    async restoreBackup(backupId, targetDir = './restored') {
        console.log(`🔄 Starting restore from backup: ${backupId}`);
        
        const metadata = this.getBackupMetadata();
        const backup = metadata.find(b => b.id === backupId);
        
        if (!backup) {
            throw new Error(`Backup not found: ${backupId}`);
        }
        
        if (backup.status !== 'success') {
            throw new Error(`Backup failed, cannot restore: ${backupId}`);
        }
        
        // Find backup file
        const backupFile = this.findBackupFile(backupId, backup.type);
        if (!backupFile) {
            throw new Error(`Backup file not found: ${backupId}`);
        }
        
        // Create target directory
        if (!existsSync(targetDir)) {
            mkdirSync(targetDir, { recursive: true });
        }
        
        try {
            // Extract backup
            if (backupFile.endsWith('.gz')) {
                execSync(`tar -xzf ${backupFile} -C ${targetDir}`);
            } else {
                execSync(`tar -xf ${backupFile} -C ${targetDir}`);
            }
            
            console.log(`✅ Backup restored successfully to: ${targetDir}`);
            return { success: true, targetDir: targetDir };
            
        } catch (error) {
            throw new Error(`Failed to restore backup: ${error.message}`);
        }
    }

    findBackupFile(backupId, type) {
        const typeDir = join(this.config.backupDir, type);
        const extensions = this.config.compression ? ['.tar.gz', '.tar'] : ['.tar'];
        
        for (const ext of extensions) {
            const filePath = join(typeDir, `${backupId}${ext}`);
            if (existsSync(filePath)) {
                return filePath;
            }
        }
        
        return null;
    }

    getBackupMetadata() {
        const metadataPath = join(this.config.backupDir, 'metadata.json');
        
        if (!existsSync(metadataPath)) {
            return [];
        }
        
        try {
            return JSON.parse(readFileSync(metadataPath, 'utf8'));
        } catch (error) {
            console.error('Error reading backup metadata:', error.message);
            return [];
        }
    }

    cleanupOldBackups() {
        console.log('🧹 Cleaning up old backups...');
        
        const metadata = this.getBackupMetadata();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
        
        let deletedCount = 0;
        
        metadata.forEach(backup => {
            if (new Date(backup.timestamp) < cutoffDate) {
                const backupFile = this.findBackupFile(backup.id, backup.type);
                if (backupFile && existsSync(backupFile)) {
                    try {
                        execSync(`rm ${backupFile}`);
                        deletedCount++;
                        console.log(`  🗑️ Deleted old backup: ${backup.id}`);
                    } catch (error) {
                        console.error(`  ❌ Failed to delete ${backup.id}: ${error.message}`);
                    }
                }
            }
        });
        
        // Update metadata
        const updatedMetadata = metadata.filter(backup => 
            new Date(backup.timestamp) >= cutoffDate
        );
        
        const metadataPath = join(this.config.backupDir, 'metadata.json');
        writeFileSync(metadataPath, JSON.stringify(updatedMetadata, null, 2));
        
        console.log(`✅ Cleanup complete. Deleted ${deletedCount} old backups.`);
        return deletedCount;
    }

    generateBackupReport() {
        const metadata = this.getBackupMetadata();
        
        console.log('\n📊 BACKUP SYSTEM REPORT');
        console.log('=' .repeat(60));
        
        const totalBackups = metadata.length;
        const successfulBackups = metadata.filter(b => b.status === 'success').length;
        const failedBackups = metadata.filter(b => b.status === 'failed').length;
        
        console.log(`\n📋 Backup Statistics:`);
        console.log(`  • Total Backups: ${totalBackups}`);
        console.log(`  • Successful: ${successfulBackups} (${Math.round(successfulBackups/totalBackups*100)}%)`);
        console.log(`  • Failed: ${failedBackups} (${Math.round(failedBackups/totalBackups*100)}%)`);
        
        // Backup types
        const typeStats = {};
        metadata.forEach(backup => {
            if (!typeStats[backup.type]) {
                typeStats[backup.type] = { count: 0, totalSize: 0 };
            }
            if (backup.status === 'success') {
                typeStats[backup.type].count++;
                typeStats[backup.type].totalSize += backup.size || 0;
            }
        });
        
        console.log(`\n📁 Backup Types:`);
        Object.entries(typeStats).forEach(([type, stats]) => {
            const sizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
            console.log(`  • ${this.backupTypes[type]}: ${stats.count} backups (${sizeMB} MB)`);
        });
        
        // Recent backups
        const recentBackups = metadata
            .filter(b => b.status === 'success')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);
        
        if (recentBackups.length > 0) {
            console.log(`\n🕒 Recent Backups:`);
            recentBackups.forEach(backup => {
                const date = new Date(backup.timestamp).toLocaleString();
                const sizeMB = (backup.size / 1024 / 1024).toFixed(2);
                console.log(`  • ${backup.id}: ${date} (${sizeMB} MB)`);
            });
        }
        
        // Storage usage
        const totalSize = Object.values(typeStats).reduce((sum, stats) => sum + stats.totalSize, 0);
        const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
        console.log(`\n💾 Total Storage Used: ${totalSizeMB} MB`);
        
        // Recommendations
        console.log(`\n💡 Recommendations:`);
        if (failedBackups > 0) {
            console.log(`  • Investigate ${failedBackups} failed backups`);
        }
        
        if (totalSizeMB > 1000) {
            console.log(`  • Consider reducing backup retention period`);
        }
        
        if (successfulBackups === 0) {
            console.log(`  • No successful backups - check backup configuration`);
        }
        
        return {
            totalBackups,
            successfulBackups,
            failedBackups,
            totalSize,
            typeStats
        };
    }

    async runScheduledBackup() {
        console.log('🕐 Running scheduled backup...');
        
        try {
            // Create full backup on first run or weekly
            const lastFull = this.getLastBackup('full');
            const now = new Date();
            const shouldCreateFull = !lastFull || 
                (now - new Date(lastFull.timestamp)) > (7 * 24 * 60 * 60 * 1000); // 7 days
            
            const backupType = shouldCreateFull ? 'full' : 'incremental';
            const result = await this.createBackup(backupType);
            
            // Cleanup old backups
            this.cleanupOldBackups();
            
            return result;
            
        } catch (error) {
            console.error('Scheduled backup failed:', error.message);
            throw error;
        }
    }
}

// Run backup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const backupSystem = new BackupSystem();
    
    const command = process.argv[2] || 'report';
    
    switch (command) {
        case 'full':
            backupSystem.createBackup('full').catch(console.error);
            break;
        case 'incremental':
            backupSystem.createBackup('incremental').catch(console.error);
            break;
        case 'config':
            backupSystem.createBackup('config').catch(console.error);
            break;
        case 'data':
            backupSystem.createBackup('data').catch(console.error);
            break;
        case 'logs':
            backupSystem.createBackup('logs').catch(console.error);
            break;
        case 'scheduled':
            backupSystem.runScheduledBackup().catch(console.error);
            break;
        case 'cleanup':
            backupSystem.cleanupOldBackups();
            break;
        case 'report':
            backupSystem.generateBackupReport();
            break;
        default:
            console.log('Usage: node backup-system.js [full|incremental|config|data|logs|scheduled|cleanup|report]');
    }
}

export default BackupSystem;
