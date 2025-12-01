// Blockchain Audit System for Predator Analytics
// Immutable audit trail using blockchain technology

import { EventEmitter } from 'events';
import { createHash, randomBytes } from 'crypto';
import { writeFileSync, readFileSync, existsSync } from 'fs';

class BlockchainAuditSystem extends EventEmitter {
    constructor() {
        super();
        this.chain = [];
        this.difficulty = 4;
        this.pendingTransactions = [];
        this.miningReward = 100;
        this.auditLogs = [];
        
        this.config = {
            enableMining: true,
            enableAuditLogging: true,
            enableProofOfWork: true,
            blockInterval: 10000, // 10 seconds
            maxTransactionsPerBlock: 10,
            enableSmartContracts: true,
            enableDigitalSignatures: true
        };
        
        this.initializeBlockchain();
    }

    initializeBlockchain() {
        console.log('⛓️ Initializing Blockchain Audit System...');
        
        // Load existing blockchain or create genesis block
        if (existsSync('./blockchain-data.json')) {
            this.loadBlockchain();
        } else {
            this.createGenesisBlock();
        }
        
        // Start mining if enabled
        if (this.config.enableMining) {
            this.startMining();
        }
        
        // Start audit logging
        if (this.config.enableAuditLogging) {
            this.startAuditLogging();
        }
        
        console.log('✅ Blockchain Audit System initialized');
    }

    createGenesisBlock() {
        const genesisBlock = {
            index: 0,
            timestamp: Date.now(),
            transactions: [{
                from: 'genesis',
                to: 'predator-analytics',
                amount: 0,
                type: 'system_init',
                data: {
                    message: 'Predator Analytics Blockchain Initialized',
                    version: '1.0.0',
                    creator: 'autonomous-system'
                }
            }],
            nonce: 0,
            previousHash: '0'.repeat(64)
        };
        
        genesisBlock.hash = this.calculateHash(genesisBlock);
        this.chain.push(genesisBlock);
        
        console.log('🎯 Genesis block created');
    }

    calculateHash(block) {
        const data = JSON.stringify({
            index: block.index,
            timestamp: block.timestamp,
            transactions: block.transactions,
            nonce: block.nonce,
            previousHash: block.previousHash
        });
        
        return createHash('sha256').update(data).digest('hex');
    }

    createTransaction(from, to, amount, type, data = {}) {
        const transaction = {
            id: this.generateTransactionId(),
            from: from,
            to: to,
            amount: amount,
            type: type,
            data: data,
            timestamp: Date.now()
        };
        
        // Add digital signature if enabled
        if (this.config.enableDigitalSignatures) {
            transaction.signature = this.signTransaction(transaction);
        }
        
        this.pendingTransactions.push(transaction);
        this.emit('transactionCreated', transaction);
        
        return transaction;
    }

    generateTransactionId() {
        return randomBytes(16).toString('hex');
    }

    signTransaction(transaction) {
        const data = JSON.stringify(transaction);
        return createHash('sha256').update(data).digest('hex');
    }

    minePendingTransactions(minerAddress) {
        if (this.pendingTransactions.length === 0) {
            console.log('⛏️ No transactions to mine');
            return null;
        }
        
        const block = {
            index: this.chain.length,
            timestamp: Date.now(),
            transactions: this.pendingTransactions.slice(0, this.config.maxTransactionsPerBlock),
            nonce: 0,
            previousHash: this.getLastBlock().hash
        };
        
        // Add mining reward transaction
        block.transactions.push({
            from: 'network',
            to: minerAddress,
            amount: this.miningReward,
            type: 'mining_reward',
            data: {
                blockIndex: block.index,
                timestamp: block.timestamp
            }
        });
        
        // Mine the block
        if (this.config.enableProofOfWork) {
            block.hash = this.mineBlock(block);
        } else {
            block.hash = this.calculateHash(block);
        }
        
        // Add block to chain
        this.chain.push(block);
        
        // Remove mined transactions from pending
        this.pendingTransactions = this.pendingTransactions.slice(this.config.maxTransactionsPerBlock);
        
        // Save blockchain
        this.saveBlockchain();
        
        console.log(`⛏️ Block #${block.index} mined with ${block.transactions.length} transactions`);
        this.emit('blockMined', block);
        
        return block;
    }

    mineBlock(block) {
        let hash;
        let nonce = 0;
        
        const target = '0'.repeat(this.difficulty);
        
        do {
            block.nonce = nonce;
            hash = this.calculateHash(block);
            nonce++;
        } while (!hash.startsWith(target));
        
        return hash;
    }

    getLastBlock() {
        return this.chain[this.chain.length - 1];
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];
            
            // Check if current block's hash is valid
            if (currentBlock.hash !== this.calculateHash(currentBlock)) {
                return false;
            }
            
            // Check if current block points to previous block
            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
            
            // Check proof of work
            if (this.config.enableProofOfWork) {
                if (!currentBlock.hash.startsWith('0'.repeat(this.difficulty))) {
                    return false;
                }
            }
        }
        
        return true;
    }

    getBalance(address) {
        let balance = 0;
        
        this.chain.forEach(block => {
            block.transactions.forEach(transaction => {
                if (transaction.from === address) {
                    balance -= transaction.amount;
                }
                if (transaction.to === address) {
                    balance += transaction.amount;
                }
            });
        });
        
        return balance;
    }

    getTransactionHistory(address) {
        const transactions = [];
        
        this.chain.forEach(block => {
            block.transactions.forEach(transaction => {
                if (transaction.from === address || transaction.to === address) {
                    transactions.push({
                        ...transaction,
                        blockIndex: block.index,
                        blockHash: block.hash,
                        blockTimestamp: block.timestamp
                    });
                }
            });
        });
        
        return transactions.sort((a, b) => b.timestamp - a.timestamp);
    }

    startMining() {
        setInterval(() => {
            if (this.pendingTransactions.length > 0) {
                this.minePendingTransactions('predator-miner');
            }
        }, this.config.blockInterval);
    }

    startAuditLogging() {
        setInterval(() => {
            this.createAuditEntry();
        }, 60000); // Every minute
    }

    createAuditEntry() {
        const auditData = {
            systemMetrics: this.getSystemMetrics(),
            blockchainMetrics: this.getBlockchainMetrics(),
            timestamp: Date.now()
        };
        
        this.createTransaction(
            'system-audit',
            'audit-log',
            0,
            'audit_entry',
            auditData
        );
        
        this.auditLogs.push(auditData);
        
        // Keep only recent audit logs
        if (this.auditLogs.length > 1000) {
            this.auditLogs = this.auditLogs.slice(-500);
        }
    }

    getSystemMetrics() {
        try {
            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            
            return {
                cpu: (cpuUsage.user + cpuUsage.system) / 1000000,
                memory: memUsage.heapUsed / memUsage.heapTotal * 100,
                uptime: process.uptime(),
                timestamp: Date.now()
            };
        } catch (error) {
            return { cpu: 0, memory: 0, uptime: 0, timestamp: Date.now() };
        }
    }

    getBlockchainMetrics() {
        return {
            blockCount: this.chain.length,
            pendingTransactions: this.pendingTransactions.length,
            totalTransactions: this.chain.reduce((sum, block) => sum + block.transactions.length, 0),
            difficulty: this.difficulty,
            isValid: this.isChainValid(),
            lastBlockHash: this.getLastBlock().hash,
            lastBlockTimestamp: this.getLastBlock().timestamp
        };
    }

    // Smart contract functionality
    deploySmartContract(name, code, owner) {
        const contract = {
            id: this.generateTransactionId(),
            name: name,
            code: code,
            owner: owner,
            state: {},
            createdAt: Date.now(),
            transactions: []
        };
        
        this.createTransaction(
            owner,
            'smart-contract',
            0,
            'contract_deploy',
            contract
        );
        
        return contract;
    }

    executeSmartContract(contractId, function_name, args, caller) {
        // Simplified smart contract execution
        const transaction = this.createTransaction(
            caller,
            'smart-contract',
            0,
            'contract_execution',
            {
                contractId: contractId,
                function: function_name,
                args: args
            }
        );
        
        return transaction;
    }

    // Audit trail functionality
    getAuditTrail(fromDate, toDate) {
        const fromTimestamp = new Date(fromDate).getTime();
        const toTimestamp = new Date(toDate).getTime();
        
        const auditTrail = [];
        
        this.chain.forEach(block => {
            block.transactions.forEach(transaction => {
                if (transaction.timestamp >= fromTimestamp && transaction.timestamp <= toTimestamp) {
                    auditTrail.push({
                        ...transaction,
                        blockIndex: block.index,
                        blockHash: block.hash
                    });
                }
            });
        });
        
        return auditTrail;
    }

    verifyAuditIntegrity() {
        const integrityReport = {
            isValid: this.isChainValid(),
            blockCount: this.chain.length,
            verifiedBlocks: 0,
            corruptedBlocks: [],
            totalTransactions: 0,
            auditTrailLength: 0
        };
        
        this.chain.forEach((block, index) => {
            const expectedHash = this.calculateHash(block);
            
            if (block.hash === expectedHash) {
                integrityReport.verifiedBlocks++;
            } else {
                integrityReport.corruptedBlocks.push({
                    index: index,
                    actualHash: block.hash,
                    expectedHash: expectedHash
                });
            }
            
            integrityReport.totalTransactions += block.transactions.length;
            
            block.transactions.forEach(transaction => {
                if (transaction.type === 'audit_entry') {
                    integrityReport.auditTrailLength++;
                }
            });
        });
        
        return integrityReport;
    }

    // API methods
    getBlockchainInfo() {
        return {
            chain: this.chain,
            pendingTransactions: this.pendingTransactions,
            difficulty: this.difficulty,
            miningReward: this.miningReward,
            isValid: this.isChainValid(),
            metrics: this.getBlockchainMetrics(),
            auditLogs: this.auditLogs.slice(-10)
        };
    }

    getBlockByIndex(index) {
        return this.chain[index] || null;
    }

    getBlockByHash(hash) {
        return this.chain.find(block => block.hash === hash) || null;
    }

    getTransactionById(id) {
        for (const block of this.chain) {
            const transaction = block.transactions.find(tx => tx.id === id);
            if (transaction) {
                return {
                    ...transaction,
                    blockIndex: block.index,
                    blockHash: block.hash
                };
            }
        }
        
        // Check pending transactions
        return this.pendingTransactions.find(tx => tx.id === id) || null;
    }

    // Configuration methods
    updateDifficulty(newDifficulty) {
        this.difficulty = newDifficulty;
        console.log(`⚙️ Mining difficulty updated to ${newDifficulty}`);
    }

    updateMiningReward(newReward) {
        this.miningReward = newReward;
        console.log(`⚙️ Mining reward updated to ${newReward}`);
    }

    // Persistence methods
    saveBlockchain() {
        try {
            const data = {
                chain: this.chain,
                pendingTransactions: this.pendingTransactions,
                difficulty: this.difficulty,
                miningReward: this.miningReward,
                auditLogs: this.auditLogs,
                config: this.config,
                timestamp: Date.now()
            };
            
            writeFileSync('./blockchain-data.json', JSON.stringify(data, null, 2));
            console.log('💾 Blockchain saved to file');
        } catch (error) {
            console.error('Error saving blockchain:', error);
        }
    }

    loadBlockchain() {
        try {
            const data = JSON.parse(readFileSync('./blockchain-data.json', 'utf8'));
            
            this.chain = data.chain || [];
            this.pendingTransactions = data.pendingTransactions || [];
            this.difficulty = data.difficulty || 4;
            this.miningReward = data.miningReward || 100;
            this.auditLogs = data.auditLogs || [];
            this.config = { ...this.config, ...data.config };
            
            console.log('📂 Blockchain loaded from file');
        } catch (error) {
            console.error('Error loading blockchain:', error);
            this.createGenesisBlock();
        }
    }

    // Export methods
    exportAuditTrail(format = 'json') {
        const auditTrail = this.getAuditTrail(
            new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            new Date()
        );
        
        if (format === 'json') {
            return JSON.stringify(auditTrail, null, 2);
        } else if (format === 'csv') {
            let csv = 'Transaction ID,Type,From,To,Amount,Timestamp,Block Index,Block Hash\n';
            auditTrail.forEach(tx => {
                csv += `${tx.id},${tx.type},${tx.from},${tx.to},${tx.amount},${tx.timestamp},${tx.blockIndex},${tx.blockHash}\n`;
            });
            return csv;
        }
        
        return auditTrail;
    }

    generateAuditReport() {
        const integrity = this.verifyAuditIntegrity();
        const metrics = this.getBlockchainMetrics();
        
        return {
            timestamp: Date.now(),
            integrity: integrity,
            metrics: metrics,
            recentTransactions: this.chain.slice(-5).flatMap(block => block.transactions),
            pendingTransactions: this.pendingTransactions.length,
            auditLogsCount: this.auditLogs.length,
            systemStatus: integrity.isValid ? 'HEALTHY' : 'CORRUPTED'
        };
    }

    shutdown() {
        console.log('🔄 Shutting down Blockchain Audit System...');
        
        // Save blockchain
        this.saveBlockchain();
        
        // Generate final audit report
        const report = this.generateAuditReport();
        writeFileSync('./blockchain-audit-report.json', JSON.stringify(report, null, 2));
        
        console.log('✅ Blockchain Audit System shutdown complete');
    }
}

// Run blockchain audit system if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const blockchain = new BlockchainAuditSystem();
    
    // Demo transactions
    setInterval(() => {
        blockchain.createTransaction(
            'user-' + Math.random().toString(36).substr(2, 9),
            'system',
            Math.random() * 10,
            'api_call',
            {
                endpoint: '/api/v1/connectors/prozorro',
                responseTime: Math.random() * 1000,
                status: 'success'
            }
        );
    }, 5000);
    
    // Display blockchain status every 30 seconds
    setInterval(() => {
        const metrics = blockchain.getBlockchainMetrics();
        console.log(`⛓️ Blockchain Status: ${metrics.blockCount} blocks, ${metrics.pendingTransactions} pending, valid: ${metrics.isValid}`);
    }, 30000);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        blockchain.shutdown();
        process.exit(0);
    });
    
    console.log('🎊 Blockchain Audit System started!');
    console.log('⛓️ Mining transactions and maintaining audit trail...');
}

export default BlockchainAuditSystem;
