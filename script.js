// Contract configuration
const CONTRACT_ADDRESS = "0xf2411036288eb63c63a30633aecc7c94429d22c8";
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 in hex

// Contract ABI - Essential functions for our DApp
const CONTRACT_ABI = [
    "function fund() public payable",
    "function withdraw() public",
    "function cheaperWithdraw() public",
    "function getBalance() public view returns (uint256)",
    "function getNumberOfFunders() public view returns (uint256)",
    "function getAddressToAmountFunded(address) public view returns (uint256)",
    "function getOwner() external view returns (address)",
    "function MINIMUM_USD() public view returns (uint256)",
    "event Funded(address indexed funder, uint256 amount)",
    "event Withdrawn(address indexed owner, uint256 amount)"
];

// Global variables
let provider;
let signer;
let contract;
let userAddress;
let isOwner = false;

// DOM elements
const connectBtn = document.getElementById('connectBtn');
const walletInfo = document.getElementById('walletInfo');
const walletStatus = document.getElementById('walletStatus');
const networkWarning = document.getElementById('networkWarning');
const contractStats = document.getElementById('contractStats');
const fundBtn = document.getElementById('fundBtn');
const fundAmount = document.getElementById('fundAmount');
const fundStatus = document.getElementById('fundStatus');
const withdrawBtn = document.getElementById('withdrawBtn');
const cheaperWithdrawBtn = document.getElementById('cheaperWithdrawBtn');
const withdrawStatus = document.getElementById('withdrawStatus');
const ownerSection = document.getElementById('ownerSection');
const recentActivity = document.getElementById('recentActivity');

// Initialize the app with enhanced MetaMask detection
window.addEventListener('load', async () => {
    console.log('🚀 DApp loaded, checking dependencies...');
    
    // Wait for ethers.js to be available
    let attempts = 0;
    while (!window.ethers && attempts < 50) {
        console.log(`⏳ Waiting for ethers.js... (${attempts + 1}/50)`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!window.ethers) {
        console.error('❌ ethers.js failed to load');
        showStatus('error', 'Failed to load required libraries. Please refresh the page.', 'fundStatus');
        return;
    }
    
    console.log('✅ ethers.js loaded successfully');
    
    // Force MetaMask recognition early
    if (window.ethereum) {
        forceMetaMaskRecognition();
    }
    
    // Set up connect button immediately
    setupConnectButton();
    
    console.log('🚀 Starting enhanced MetaMask detection...');
    await detectMetaMask();
});

// Enhanced MetaMask detection function
async function detectMetaMask() {
    console.log('🔍 Starting MetaMask detection...');
    
    // Check if this is Brave browser first
    let isBrave = false;
    try {
        isBrave = navigator.brave && await navigator.brave.isBrave();
    } catch (e) {
        console.log('  Brave detection failed:', e);
    }
    console.log('🦁 Brave browser detected:', isBrave);
    
    // Method 1: Check immediately
    console.log('🔍 Method 1 - Immediate check:');
    console.log('  window.ethereum:', window.ethereum);
    console.log('  typeof window.ethereum:', typeof window.ethereum);
    
    if (window.ethereum) {
        console.log('✅ Ethereum provider found immediately!');
        
        // Special handling for Brave browser
        if (isBrave) {
            console.log('🦁 Brave detected - checking provider type...');
            console.log('  isMetaMask:', window.ethereum.isMetaMask);
            console.log('  isBraveWallet:', window.ethereum.isBraveWallet);
            console.log('  providers array:', window.ethereum.providers);
            
            // If it's Brave Wallet, show conflict message
            if (window.ethereum.isBraveWallet || (!window.ethereum.isMetaMask && !window.ethereum.providers)) {
                showBraveWalletConflict();
                return;
            }
            
            // If there are multiple providers, find MetaMask
            if (window.ethereum.providers) {
                const metamaskProvider = window.ethereum.providers.find(p => p.isMetaMask);
                if (metamaskProvider) {
                    console.log('✅ MetaMask found in providers array!');
                    window.ethereum = metamaskProvider;
                    await initializeWithMetaMask();
                    return;
                } else {
                    console.log('❌ MetaMask not found in providers array');
                    showBraveWalletConflict();
                    return;
                }
            }
        }
        
        // For non-Brave or when MetaMask is properly configured
        if (window.ethereum.isMetaMask) {
            console.log('✅ MetaMask confirmed!');
            await initializeWithMetaMask();
            return;
        } else {
            console.log('⚠️ Ethereum provider found but not MetaMask');
            console.log('  Provider details:', {
                isMetaMask: window.ethereum.isMetaMask,
                constructor: window.ethereum.constructor?.name,
                _metamask: window.ethereum._metamask
            });
        }
    }
    
    // Method 2: Wait for injection (some versions inject later)
    console.log('🔍 Method 2 - Waiting for injection...');
    for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log(`  Attempt ${i + 1}/10 - window.ethereum:`, window.ethereum);
        
        if (window.ethereum) {
            console.log('✅ MetaMask found after waiting!');
            await initializeWithMetaMask();
            return;
        }
    }
    
    // Method 3: Listen for ethereum object injection
    console.log('🔍 Method 3 - Listening for injection event...');
    let eventListenerTimeout;
    
    const ethereumListener = () => {
        console.log('✅ MetaMask injected via event!');
        clearTimeout(eventListenerTimeout);
        window.removeEventListener('ethereum#initialized', ethereumListener);
        initializeWithMetaMask();
    };
    
    window.addEventListener('ethereum#initialized', ethereumListener, { once: true });
    
    // Method 4: Check for other provider indicators and Brave browser specifics
    console.log('🔍 Method 4 - Checking for provider indicators...');
    console.log('  window.web3:', window.web3);
    console.log('  window.metamask:', window.metamask);
    console.log('  navigator.brave:', navigator.brave);
    
    // Brave browser specific checks
    console.log('🔍 Is Brave browser:', isBrave);
    
    if (isBrave) {
        console.log('🦁 Brave browser detected - checking wallet providers...');
        
        // In Brave, MetaMask might be under different properties
        console.log('  window.ethereum providers:', window.ethereum?.providers);
        console.log('  window.ethereum.providers length:', window.ethereum?.providers?.length);
        
        // Check if Brave wallet is interfering
        if (window.ethereum?.providers) {
            const metamaskProvider = window.ethereum.providers.find(p => p.isMetaMask);
            console.log('  MetaMask provider found:', metamaskProvider);
            
            if (metamaskProvider) {
                console.log('✅ MetaMask found in Brave providers!');
                // Override window.ethereum with MetaMask specifically
                window.ethereum = metamaskProvider;
                await initializeWithMetaMask();
                return;
            }
        }
        
        // Check for Brave's native wallet interference
        if (window.ethereum && !window.ethereum.isMetaMask) {
            console.log('⚠️ Non-MetaMask provider detected in Brave (likely Brave Wallet)');
            console.log('  Current provider:', {
                isMetaMask: window.ethereum.isMetaMask,
                isBraveWallet: window.ethereum.isBraveWallet,
                constructor: window.ethereum.constructor.name
            });
            
            // Provide specific Brave instructions
            showBraveWalletConflict();
            return;
        }
    }
    
    // Method 5: Document ready state check
    if (document.readyState !== 'complete') {
        console.log('🔍 Method 5 - Document not fully loaded, waiting...');
        window.addEventListener('load', async () => {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (window.ethereum) {
                console.log('✅ MetaMask found after document load!');
                await initializeWithMetaMask();
                return;
            }
        });
    }
    
    // Set timeout for event listener and show error if nothing found
    eventListenerTimeout = setTimeout(() => {
        console.log('❌ All detection methods failed');
        window.removeEventListener('ethereum#initialized', ethereumListener);
        showMetaMaskNotFound();
    }, 5000);
}

// Initialize app when MetaMask is found
async function initializeWithMetaMask() {
    console.log('🎉 Initializing with MetaMask...');
    
    if (!window.ethereum) {
        console.error('❌ window.ethereum not available during initialization');
        showMetaMaskNotFound();
        return;
    }
    
    console.log('✅ MetaMask provider confirmed');
    console.log('🔍 MetaMask version info:', {
        isMetaMask: window.ethereum.isMetaMask,
        networkVersion: window.ethereum.networkVersion,
        selectedAddress: window.ethereum.selectedAddress
    });
    
    try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        console.log('✅ Provider created successfully');
        
        // Check if already connected
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        console.log('📋 Existing accounts:', accounts);
        
        if (accounts.length > 0) {
            console.log('🔄 Auto-connecting to existing account...');
            await connectWallet();
        } else {
            console.log('📝 No existing accounts, waiting for user to connect');
            // Show connect button and basic UI
            showConnectWalletUI();
        }
        
    } catch (error) {
        console.error('❌ Error during MetaMask initialization:', error);
        showStatus('error', `Failed to initialize MetaMask: ${error.message}`, 'fundStatus');
    }
}

// Show the connect wallet UI
function showConnectWalletUI() {
    console.log('🎨 Showing connect wallet UI');
    const button = document.getElementById('connectBtn');
    if (button) {
        button.style.display = 'inline-block';
        button.disabled = false;
        button.textContent = 'Connect MetaMask';
        setupConnectButton(); // Ensure the event listener is attached
    } else {
        console.error('❌ Connect button element not found');
    }
    showStatus('info', '🦊 MetaMask detected! Click "Connect Wallet" to get started.', 'fundStatus');
}

// Show Brave wallet conflict error with specific instructions
function showBraveWalletConflict() {
    console.error('🦁 Brave Wallet detected instead of MetaMask');
    
    showStatus('error', 'Brave Wallet detected - MetaMask needs configuration', 'fundStatus');
    
    const helpText = document.createElement('div');
    helpText.innerHTML = `
        <div style="margin-top: 15px; padding: 20px; background: #fff3cd; border-radius: 8px; color: #856404; line-height: 1.5;">
            <strong>🦁 Brave Browser + MetaMask Setup</strong><br><br>
            
            <strong>🎯 The Issue:</strong><br>
            Brave browser has its own built-in crypto wallet that conflicts with MetaMask.<br><br>
            
            <strong>🔧 Solution - Choose One:</strong><br><br>
            
            <strong>Option 1: Disable Brave Wallet (Recommended)</strong><br>
            1. Go to <code>brave://settings/web3</code><br>
            2. Set "Default Ethereum wallet" to <strong>"MetaMask (extension)"</strong><br>
            3. Set "Default Solana wallet" to <strong>"None"</strong><br>
            4. Refresh this page<br><br>
            
            <strong>Option 2: Use Chrome/Firefox</strong><br>
            1. Open this page in Chrome or Firefox<br>
            2. Make sure MetaMask extension is installed<br>
            3. Connect normally<br><br>
            
            <strong>Option 3: Use Brave Wallet Instead</strong><br>
            1. Remove MetaMask extension<br>
            2. Use Brave's built-in wallet<br>
            3. Note: Some features might work differently<br><br>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px;">
                <a href="brave://settings/web3" style="background: #ff6b35; color: white; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-weight: 500;">
                    🦁 Open Brave Wallet Settings
                </a>
                
                <button onclick="location.reload()" style="background: #28a745; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    🔄 Refresh After Changes
                </button>
                
                <button onclick="detectMetaMask()" style="background: #007bff; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    🔍 Try Detection Again
                </button>
                
                <button onclick="showDemoMode()" style="background: #17a2b8; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    📱 View Demo Mode
                </button>
            </div>
        </div>
    `;
    document.getElementById('fundStatus').appendChild(helpText);
}

// Show MetaMask not found error with helpful instructions
function showMetaMaskNotFound() {
    console.error('❌ MetaMask not detected after all attempts');
    
    // Check what browser extensions are present
    console.log('🔍 Browser info:', {
        userAgent: navigator.userAgent,
        vendor: navigator.vendor,
        extensions: Object.keys(window).filter(key => 
            key.toLowerCase().includes('eth') || 
            key.toLowerCase().includes('meta') ||
            key.toLowerCase().includes('web3') ||
            key.toLowerCase().includes('wallet')
        )
    });
    
    showStatus('error', 'MetaMask not detected after multiple attempts', 'fundStatus');
    
    // Show comprehensive help
    const helpText = document.createElement('div');
    helpText.innerHTML = `
        <div style="margin-top: 15px; padding: 20px; background: #fff3cd; border-radius: 8px; color: #856404; line-height: 1.5;">
            <strong>🦊 MetaMask Troubleshooting</strong><br><br>
            
            <strong>📥 Don't have MetaMask?</strong><br>
            1. Visit <a href="https://metamask.io" target="_blank" style="color: #667eea; text-decoration: underline;">metamask.io</a><br>
            2. Install the browser extension<br>
            3. Set up your wallet<br>
            4. Return to this page<br><br>
            
            <strong>🔧 Have MetaMask but still seeing this?</strong><br>
            1. Make sure MetaMask is <strong>enabled</strong> in your browser<br>
            2. Refresh this page (Ctrl+F5 or Cmd+Shift+R)<br>
            3. Try opening in <strong>incognito/private</strong> mode<br>
            4. Disable other wallet extensions temporarily<br>
            5. Make sure you're not in "Private browsing" mode<br>
            6. Try a different browser<br><br>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px;">
                <button onclick="location.reload()" style="background: #28a745; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    🔄 Refresh Page
                </button>
                
                <button onclick="detectMetaMask()" style="background: #007bff; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    🔍 Try Detection Again
                </button>
                
                <button onclick="showDemoMode()" style="background: #17a2b8; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    📱 View Demo Mode
                </button>
            </div>
        </div>
    `;
    document.getElementById('fundStatus').appendChild(helpText);
}

// Connect wallet function - ensure it's properly attached
function setupConnectButton() {
    const button = document.getElementById('connectBtn');
    if (!button) {
        console.error('❌ Connect button not found in DOM');
        return;
    }
    
    // Remove any existing listeners
    button.removeEventListener('click', handleConnectClick);
    
    // Add the click handler
    button.addEventListener('click', handleConnectClick);
    console.log('✅ Connect button event listener attached');
}

async function handleConnectClick(event) {
    event.preventDefault();
    console.log('🖱️ Connect button clicked');
    
    // Show immediate feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Connecting...';
    button.disabled = true;
    
    try {
        // Double-check MetaMask is still available
        if (!window.ethereum) {
            console.error('❌ MetaMask not available when connect clicked');
            showStatus('error', 'MetaMask connection lost. Please refresh the page.', 'fundStatus');
            return;
        }
        
        console.log('🔗 Attempting to connect wallet...');
        await connectWallet();
        
    } catch (error) {
        console.error('❌ Error in connect button handler:', error);
        showStatus('error', `Connection failed: ${error.message}`, 'fundStatus');
    } finally {
        // Reset button state
        button.textContent = originalText;
        button.disabled = false;
    }
}

// Force MetaMask to recognize this site
function forceMetaMaskRecognition() {
    console.log('🔄 Forcing MetaMask recognition...');
    
    // Try multiple methods to get MetaMask's attention
    if (window.ethereum) {
        try {
            // Method 1: Request permissions
            window.ethereum.request({ method: 'wallet_getPermissions' })
                .catch(e => console.log('Permissions check:', e.message));
            
            // Method 2: Request chain ID
            window.ethereum.request({ method: 'eth_chainId' })
                .catch(e => console.log('Chain ID check:', e.message));
                
            // Method 3: Request network version
            window.ethereum.request({ method: 'net_version' })
                .catch(e => console.log('Network version check:', e.message));
                
        } catch (error) {
            console.log('MetaMask recognition attempt failed:', error);
        }
    }
}

// Direct click handler as backup
async function handleConnectClickDirect() {
    console.log('🖱️ Direct connect button clicked (backup handler)');
    
    if (!window.ethereum) {
        console.error('❌ MetaMask not available');
        alert('MetaMask not detected. Please install MetaMask extension and refresh the page.');
        return;
    }
    
    // Force recognition before attempting connection
    forceMetaMaskRecognition();
    
    const button = document.getElementById('connectBtn');
    if (button) {
        button.textContent = 'Connecting...';
        button.disabled = true;
    }
    
    try {
        await connectWallet();
    } catch (error) {
        console.error('❌ Connection error:', error);
        alert(`Connection failed: ${error.message}`);
    } finally {
        if (button) {
            button.textContent = 'Connect MetaMask';
            button.disabled = false;
        }
    }
}

async function connectWallet() {
    console.log('🔗 Attempting to connect wallet...');
    console.log('🔍 window.ethereum available:', !!window.ethereum);
    console.log('🔍 window.ethereum.isMetaMask:', window.ethereum?.isMetaMask);
    
    try {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask not installed');
        }

        console.log('📞 Requesting account access...');
        console.log('🔍 About to call eth_requestAccounts...');
        
        // Force MetaMask to recognize this as a web3 site
        console.log('🔗 Forcing MetaMask connection...');
        
        // Request account access with timeout
        const accounts = await Promise.race([
            window.ethereum.request({ method: 'eth_requestAccounts' }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout - MetaMask did not respond')), 30000)
            )
        ]);
        console.log('✅ Accounts received:', accounts);
        
        // Set up provider and signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();
        console.log('👤 User address:', userAddress);
        
        // Check network
        const network = await provider.getNetwork();
        console.log('🌐 Current network:', network);
        
        if (network.chainId !== 11155111) { // Sepolia chain ID
            console.warn('⚠️ Wrong network detected. Current:', network.chainId, 'Expected: 11155111');
            networkWarning.classList.remove('hidden');
            showStatus('error', 'Please switch to Sepolia Testnet', 'fundStatus');
            
            // Try to switch to Sepolia
            try {
                await switchToSepolia();
                return; // Function will be called again after network switch
            } catch (switchError) {
                console.error('❌ Failed to switch network:', switchError);
            }
            return;
        } else {
            console.log('✅ Correct network (Sepolia)');
            networkWarning.classList.add('hidden');
        }

        // Set up contract
        console.log('📄 Setting up contract...');
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        console.log('✅ Contract initialized');
        
        // Update UI
        updateConnectionStatus();
        await loadContractData();
        
        // Set up event listeners
        setupEventListeners();
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        
        console.log('🎉 Wallet connected successfully!');
        
    } catch (error) {
        console.error('❌ Error connecting wallet:', error);
        
        if (error.code === 4001) {
            showStatus('error', 'Connection rejected by user', 'fundStatus');
        } else if (error.code === -32002) {
            showStatus('error', 'MetaMask is already processing a request. Please check MetaMask.', 'fundStatus');
        } else {
            showStatus('error', `Failed to connect wallet: ${error.message}`, 'fundStatus');
        }
    }
}

function updateConnectionStatus() {
    connectBtn.style.display = 'none';
    walletInfo.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #28a745;">🟢 Connected</span>
            <span style="font-family: monospace; font-size: 0.9em;">
                ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}
            </span>
            <button onclick="disconnectWallet()" class="btn" style="padding: 5px 10px; font-size: 0.8em;">
                Disconnect
            </button>
        </div>
    `;
    walletInfo.classList.remove('hidden');
    
    // Enable buttons
    fundBtn.disabled = false;
}

async function loadContractData() {
    try {
        // Load contract stats
        const balance = await provider.getBalance(CONTRACT_ADDRESS);
        const numFunders = await contract.getNumberOfFunders();
        const userContribution = await contract.getAddressToAmountFunded(userAddress);
        const owner = await contract.getOwner();
        
        // Update stats display
        document.getElementById('contractBalance').textContent = 
            parseFloat(ethers.utils.formatEther(balance)).toFixed(4);
        document.getElementById('totalFunders').textContent = numFunders.toString();
        document.getElementById('userContribution').textContent = 
            parseFloat(ethers.utils.formatEther(userContribution)).toFixed(4);
        
        // Check if user is owner
        isOwner = owner.toLowerCase() === userAddress.toLowerCase();
        if (isOwner) {
            ownerSection.style.display = 'block';
            withdrawBtn.disabled = false;
            cheaperWithdrawBtn.disabled = false;
            showStatus('info', 'You are the contract owner', 'withdrawStatus');
        } else {
            ownerSection.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error loading contract data:', error);
        showStatus('error', 'Failed to load contract data', 'fundStatus');
    }
}

function setupEventListeners() {
    // Fund button
    fundBtn.addEventListener('click', fundContract);
    
    // Withdraw buttons
    withdrawBtn.addEventListener('click', () => withdrawFunds(false));
    cheaperWithdrawBtn.addEventListener('click', () => withdrawFunds(true));
    
    // Remove any existing event listeners to prevent duplicates
    contract.removeAllListeners("Funded");
    contract.removeAllListeners("Withdrawn");
    
    // Listen for contract events
    contract.on("Funded", (funder, amount) => {
        if (funder.toLowerCase() === userAddress.toLowerCase()) {
            showStatus('success', 
                `Successfully funded ${ethers.utils.formatEther(amount)} ETH!`, 
                'fundStatus'
            );
            loadContractData();
        }
        addToRecentActivity(`💰 ${funder.slice(0, 6)}...${funder.slice(-4)} funded ${ethers.utils.formatEther(amount)} ETH`);
    });
    
    contract.on("Withdrawn", (owner, amount) => {
        if (owner.toLowerCase() === userAddress.toLowerCase()) {
            showStatus('success', 
                `Successfully withdrew ${ethers.utils.formatEther(amount)} ETH!`, 
                'withdrawStatus'
            );
            loadContractData();
        }
        addToRecentActivity(`💸 Owner withdrew ${ethers.utils.formatEther(amount)} ETH`);
    });
}

async function fundContract() {
    try {
        const amount = fundAmount.value;
        if (!amount || parseFloat(amount) <= 0) {
            showStatus('error', 'Please enter a valid amount', 'fundStatus');
            return;
        }
        
        // Convert to Wei
        const amountWei = ethers.utils.parseEther(amount.toString());
        
        // Update button state
        setButtonLoading(fundBtn, 'fundBtnText', true);
        showStatus('info', 'Transaction pending... Please confirm in MetaMask', 'fundStatus');
        
        // Send transaction
        const tx = await contract.fund({ value: amountWei });
        
        showStatus('info', 'Transaction submitted! Waiting for confirmation...', 'fundStatus');
        addTransactionHash(tx.hash, 'fundStatus');
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        showStatus('success', 'Funding successful! 🎉', 'fundStatus');
        fundAmount.value = '';
        await loadContractData();
        
    } catch (error) {
        console.error('Error funding contract:', error);
        if (error.code === 4001) {
            showStatus('error', 'Transaction cancelled by user', 'fundStatus');
        } else if (error.reason) {
            showStatus('error', `Transaction failed: ${error.reason}`, 'fundStatus');
        } else {
            showStatus('error', 'Transaction failed. Please try again.', 'fundStatus');
        }
    } finally {
        setButtonLoading(fundBtn, 'fundBtnText', false);
    }
}

async function withdrawFunds(cheaper = false) {
    try {
        if (!isOwner) {
            showStatus('error', 'Only the contract owner can withdraw funds', 'withdrawStatus');
            return;
        }
        
        const btnElement = cheaper ? cheaperWithdrawBtn : withdrawBtn;
        const btnTextElement = cheaper ? 'cheaperWithdrawBtnText' : 'withdrawBtnText';
        
        // Update button state
        setButtonLoading(btnElement, btnTextElement, true);
        showStatus('info', 'Transaction pending... Please confirm in MetaMask', 'withdrawStatus');
        
        // Send transaction
        const tx = cheaper ? await contract.cheaperWithdraw() : await contract.withdraw();
        
        showStatus('info', 'Transaction submitted! Waiting for confirmation...', 'withdrawStatus');
        addTransactionHash(tx.hash, 'withdrawStatus');
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        showStatus('success', 'Withdrawal successful! 💰', 'withdrawStatus');
        await loadContractData();
        
    } catch (error) {
        console.error('Error withdrawing funds:', error);
        if (error.code === 4001) {
            showStatus('error', 'Transaction cancelled by user', 'withdrawStatus');
        } else if (error.reason) {
            showStatus('error', `Transaction failed: ${error.reason}`, 'withdrawStatus');
        } else {
            showStatus('error', 'Transaction failed. Please try again.', 'withdrawStatus');
        }
    } finally {
        const btnElement = cheaper ? cheaperWithdrawBtn : withdrawBtn;
        const btnTextElement = cheaper ? 'cheaperWithdrawBtnText' : 'withdrawBtnText';
        setButtonLoading(btnElement, btnTextElement, false);
    }
}

function setButtonLoading(button, textElementId, loading) {
    const textElement = document.getElementById(textElementId);
    if (loading) {
        button.disabled = true;
        textElement.innerHTML = '<span class="loading"></span>Processing...';
    } else {
        button.disabled = false;
        textElement.innerHTML = textElement.getAttribute('data-original') || 
            (textElementId.includes('fund') ? 'Fund Project' : 
             textElementId.includes('cheaper') ? 'Cheaper Withdraw' : 'Withdraw All Funds');
    }
}

function showStatus(type, message, containerId) {
    const container = document.getElementById(containerId);
    let statusDiv = container.querySelector('.status');
    
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.className = 'status';
        container.appendChild(statusDiv);
    }
    
    statusDiv.className = `status ${type}`;
    statusDiv.innerHTML = message;
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

function addTransactionHash(hash, containerId) {
    const container = document.getElementById(containerId);
    const txDiv = document.createElement('div');
    txDiv.className = 'tx-hash';
    txDiv.innerHTML = `
        <strong>Transaction Hash:</strong><br>
        <a href="https://sepolia.etherscan.io/tx/${hash}" target="_blank">${hash}</a>
    `;
    container.appendChild(txDiv);
}

function addToRecentActivity(message) {
    const activity = document.getElementById('recentActivity');
    const timestamp = new Date().toLocaleTimeString();
    
    if (activity.children.length === 0) {
        activity.innerHTML = '';
    }
    
    const activityItem = document.createElement('div');
    activityItem.style.cssText = `
        padding: 12px; 
        margin: 8px 0; 
        background: rgba(168, 85, 247, 0.1); 
        border-radius: 8px; 
        border-left: 3px solid #a855f7;
        color: #e4e4e7;
        border: 1px solid rgba(168, 85, 247, 0.2);
    `;
    activityItem.innerHTML = `<strong style="color: #c084fc;">${timestamp}</strong> - ${message}`;
    
    activity.insertBefore(activityItem, activity.firstChild);
    
    // Keep only last 5 activities
    while (activity.children.length > 5) {
        activity.removeChild(activity.lastChild);
    }
}

function disconnectWallet() {
    userAddress = null;
    contract = null;
    signer = null;
    isOwner = false;
    
    connectBtn.style.display = 'inline-block';
    walletInfo.classList.add('hidden');
    fundBtn.disabled = true;
    withdrawBtn.disabled = true;
    cheaperWithdrawBtn.disabled = true;
    ownerSection.style.display = 'none';
    
    // Clear status messages
    document.getElementById('fundStatus').innerHTML = '';
    document.getElementById('withdrawStatus').innerHTML = '';
    
    // Reset stats
    document.getElementById('contractBalance').textContent = '--';
    document.getElementById('totalFunders').textContent = '--';
    document.getElementById('userContribution').textContent = '--';
    
    recentActivity.innerHTML = '<p style="color: #666;">Connect your wallet to see recent transactions...</p>';
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        disconnectWallet();
    } else {
        connectWallet();
    }
}

function handleChainChanged(chainId) {
    window.location.reload();
}

// Demo mode function for users without MetaMask
function showDemoMode() {
    console.log('📱 Entering demo mode');
    
    // Simulate connected wallet
    connectBtn.style.display = 'none';
    walletInfo.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: #ffc107;">🔶 Demo Mode</span>
            <span style="font-family: monospace; font-size: 0.9em;">
                0x1234...5678
            </span>
            <button onclick="location.reload()" class="btn" style="padding: 5px 10px; font-size: 0.8em;">
                Exit Demo
            </button>
        </div>
    `;
    walletInfo.classList.remove('hidden');
    
    // Show demo stats
    document.getElementById('contractBalance').textContent = '2.5432';
    document.getElementById('totalFunders').textContent = '12';
    document.getElementById('userContribution').textContent = '0.0500';
    
    // Enable buttons but make them show demo messages
    fundBtn.disabled = false;
    fundBtn.onclick = () => {
        showStatus('info', '📱 Demo Mode: This would send a real transaction with MetaMask installed!', 'fundStatus');
    };
    
    // Show demo message
    showStatus('info', '📱 Demo Mode Active - Install MetaMask to interact with the real contract!', 'fundStatus');
    
    // Add demo activity
    const activity = document.getElementById('recentActivity');
    activity.innerHTML = `
        <div style="padding: 10px; margin: 5px 0; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #ffc107;">
            <strong>Demo Mode</strong> - Install MetaMask to see real transactions
        </div>
    `;
}

// Utility function to switch to Sepolia network
async function switchToSepolia() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
    } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: SEPOLIA_CHAIN_ID,
                            chainName: 'Sepolia Testnet',
                            nativeCurrency: {
                                name: 'Sepolia ETH',
                                symbol: 'SEP',
                                decimals: 18,
                            },
                            rpcUrls: ['https://sepolia.infura.io/v3/'],
                            blockExplorerUrls: ['https://sepolia.etherscan.io/'],
                        },
                    ],
                });
            } catch (addError) {
                console.error('Error adding Sepolia network:', addError);
            }
        }
    }
}

// Function to copy the real Ethereum address
function copyRealAddress() {
    const realAddress = "0x1234567890123456789012345678901234567890";
    
    // Try using the modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(realAddress).then(() => {
            showCopySuccess();
        }).catch(err => {
            console.error('Failed to copy with clipboard API:', err);
            fallbackCopyTextToClipboard(realAddress);
        });
    } else {
        // Fallback for older browsers or non-secure contexts
        fallbackCopyTextToClipboard(realAddress);
    }
}

// Fallback copy method for older browsers
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showCopySuccess();
        } else {
            showCopyError();
        }
    } catch (err) {
        console.error('Fallback copy failed:', err);
        showCopyError();
    }
    
    document.body.removeChild(textArea);
}

// Show success message when address is copied
function showCopySuccess() {
    const button = document.querySelector('.copy-btn-small');
    const originalHTML = button.innerHTML;
    
    button.innerHTML = '✓';
    button.style.background = 'rgba(34, 197, 94, 0.3)';
    
    setTimeout(() => {
        button.innerHTML = originalHTML;
        button.style.background = 'rgba(34, 197, 94, 0.1)';
    }, 2000);
    
    // Show a temporary notification
    const notification = document.createElement('div');
    notification.innerHTML = '✓ Address copied to clipboard!';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        font-weight: 600;
        box-shadow: 0 10px 25px rgba(34, 197, 94, 0.3);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

// Show error message if copying fails
function showCopyError() {
    const notification = document.createElement('div');
    notification.innerHTML = '❌ Failed to copy address';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        font-weight: 600;
        box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}