// DOM Elements
const balanceEL = document.getElementById('balance-amount');
const incomeEL = document.getElementById('income-amount');
const expenseEL = document.getElementById('expense-amount');
const list = document.getElementById('transaction-list');
const form = document.getElementById('transaction-form');
const description = document.getElementById('description');
const amount = document.getElementById('amount');
const type = document.getElementById('type');
const category = document.getElementById('category');
const date = document.getElementById('date');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const transactionIdField = document.getElementById('transaction-id');
const filterType = document.getElementById('filter-type');
const searchInput = document.getElementById('search-input');
const themeIcon = document.getElementById('theme-icon');
const voiceFab = document.getElementById('voice-fab');
const voiceOverlay = document.getElementById('voice-overlay');
const closeVoiceBtn = document.getElementById('close-voice');

// Categories
const incomeCategories = ['Salary', 'Freelance', 'Investments', 'Gift', 'Other'];
const expenseCategories = ['Food', 'Rent', 'Utilities', 'Transportation', 'Entertainment', 'Health', 'Shopping', 'Other'];

// State
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let editMode = false;
let myChart; // Chart instance

// Initialize App
function init() {
    // Set Date to Today
    date.valueAsDate = new Date();

    // Load Theme
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        document.documentElement.classList.remove('dark');
    }

    updateCategories();
    renderList();
    updateValues();
    updateChart();
}

// Update Categories based on Type
function updateCategories() {
    const selectedType = type.value;
    category.innerHTML = ''; // Clear existing

    const cats = selectedType === 'income' ? incomeCategories : expenseCategories;

    cats.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.innerText = cat;
        category.appendChild(option);
    });
}

// Add Transaction
function addTransaction(e) {
    e.preventDefault();

    if (description.value.trim() === '' || amount.value.trim() === '') {
        alert('Please add a description and amount');
        return;
    }

    const transaction = {
        id: editMode ? transactionIdField.value : generateID(),
        description: description.value,
        amount: +amount.value,
        type: type.value,
        category: category.value,
        date: date.value
    };

    if (editMode) {
        // Update existing
        const index = transactions.findIndex(t => t.id === transaction.id);
        if (index !== -1) {
            transactions[index] = transaction;
        }
        editMode = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Transaction';
        submitBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
        submitBtn.classList.add('bg-primary', 'hover:bg-indigo-600');
        cancelEditBtn.classList.add('hidden');
        cancelEditBtn.classList.remove('flex');
    } else {
        // Add new
        transactions.push(transaction);
    }

    updateLocalStorage();
    renderList();
    updateValues();
    updateChart();
    resetForm();
}

// Generate Random ID
function generateID() {
    return Math.floor(Math.random() * 100000000).toString();
}

// Render List
function renderList() {
    const searchTerm = searchInput.value.toLowerCase();
    const filter = filterType.value;

    list.innerHTML = '';

    const filteredTransactions = transactions.filter(transaction => {
        const matchesSearch = transaction.description.toLowerCase().includes(searchTerm) || transaction.category.toLowerCase().includes(searchTerm);
        const matchesFilter = filter === 'all' || transaction.type === filter;
        return matchesSearch && matchesFilter;
    });

    if (filteredTransactions.length === 0) {
        list.innerHTML = `
            <tr class="text-center text-gray-400 py-8">
                <td colspan="5" class="py-8">No transactions found.</td>
            </tr>
        `;
        return;
    }

    // Sort by Date (Newest first)
    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    filteredTransactions.forEach(transaction => {
        const sign = transaction.type === 'income' ? '+' : '-';
        const colorClass = transaction.type === 'income' ? 'text-success' : 'text-danger';
        const item = document.createElement('tr');

        item.className = 'border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition';

        item.innerHTML = `
            <td class="py-3 px-2">
                <div class="font-medium text-gray-800 dark:text-gray-200">${transaction.description}</div>
            </td>
            <td class="py-3 px-2">
                <span class="text-xs font-semibold px-2 py-1 rounded-full ${transaction.type === 'income' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}">
                    ${transaction.category}
                </span>
            </td>
            <td class="py-3 px-2 text-gray-500 dark:text-gray-400 text-sm">
                ${new Date(transaction.date).toLocaleDateString()}
            </td>
            <td class="py-3 px-2 text-right font-bold ${colorClass}">
                ${sign}৳${Math.abs(transaction.amount).toFixed(2)}
            </td>
            <td class="py-3 px-2 text-center">
                <button class="text-blue-500 hover:text-blue-700 mx-1" onclick="editTransaction('${transaction.id}')" title="Edit">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="text-red-500 hover:text-red-700 mx-1" onclick="deleteTransaction('${transaction.id}')" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        list.appendChild(item);
    });
}

// Update Values (Balance, Income, Expense)
function updateValues() {
    const amounts = transactions.map(transaction => transaction.type === 'income' ? transaction.amount : -transaction.amount);

    const total = amounts.reduce((acc, item) => acc + item, 0).toFixed(2);

    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0)
        .toFixed(2);

    const expense = (transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0) * -1)
        .toFixed(2);

    balanceEL.innerText = `৳${total}`;
    incomeEL.innerText = `+৳${income}`;
    expenseEL.innerText = `-৳${Math.abs(expense)}`;

    // Balance Color Logic
    if (total < 0) {
        balanceEL.className = 'text-3xl font-bold mt-2 text-danger';
    } else {
        balanceEL.className = 'text-3xl font-bold mt-2 text-success';
    }
}

// Delete Transaction
function deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        transactions = transactions.filter(transaction => transaction.id !== id);
        updateLocalStorage();
        renderList();
        updateValues();
        updateChart();
    }
}

// Edit Transaction
function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    // Populate Form
    description.value = transaction.description;
    amount.value = transaction.amount;
    type.value = transaction.type;
    date.value = transaction.date;
    transactionIdField.value = transaction.id;

    // Update categories first to ensure correct category is selected
    updateCategories();
    category.value = transaction.category;

    // UI Changes
    editMode = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Update Transaction';
    submitBtn.classList.remove('bg-primary', 'hover:bg-indigo-600');
    submitBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-600');

    cancelEditBtn.classList.remove('hidden');
    cancelEditBtn.classList.add('flex');

    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth' });
}

// Reset Form
function resetForm() {
    form.reset();
    date.valueAsDate = new Date();
    updateCategories();

    editMode = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Transaction';
    submitBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
    submitBtn.classList.add('bg-primary', 'hover:bg-indigo-600');
    cancelEditBtn.classList.add('hidden');
    cancelEditBtn.classList.remove('flex');
}

// Update Local Storage
function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Chart.js - Update Chart
function updateChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');

    // Aggregate expenses by category
    const categoryTotals = {};
    transactions.forEach(t => {
        if (t.type === 'expense') {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        }
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    // Empty state for chart
    if (labels.length === 0) {
        if (myChart) {
            myChart.destroy();
            myChart = null;
        }
        // Optionally show "No Data" text on canvas parent
        return;
    }

    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'
    ];

    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Expenses',
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                }
            }
        }
    });
}

// Export Data
function exportData() {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Import Data
function importData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                if (confirm('Importing will replace your current data. Are you sure?')) {
                    transactions = data;
                    updateLocalStorage();
                    init();
                    alert('Data imported successfully!');
                }
            } else {
                alert('Invalid file format.');
            }
        } catch (err) {
            alert('Error reading file.');
        }
    };
    reader.readAsText(file);
    // Reset input
    input.value = '';
}

// Toggle Theme
function toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }
}

// Filter Functions
function filterTransactions() {
    renderList();
}

// Event Listeners
form.addEventListener('submit', addTransaction);
type.addEventListener('change', updateCategories);

// --- Voice Assistant Implementation ---

let recognition;
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'bn-BD'; // Bangla (Bangladesh)

    recognition.onstart = () => {
        voiceOverlay.classList.remove('hidden');
        document.getElementById('interim-transcript').innerText = '';
        setTimeout(() => voiceOverlay.classList.add('active'), 10);
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                const transcript = event.results[i][0].transcript;
                processVoiceCommand(transcript);
                stopVoiceUI();
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        document.getElementById('interim-transcript').innerText = interimTranscript;
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopVoiceUI();
    };

    recognition.onend = () => {
        // Automatically close UI if it stayed open
        setTimeout(stopVoiceUI, 500);
    };
}

function stopVoiceUI() {
    voiceOverlay.classList.remove('active');
    setTimeout(() => voiceOverlay.classList.add('hidden'), 500);
}

function processVoiceCommand(text) {
    console.log('Voice Command:', text);
    
    // Convert Bangla digits to English
    const banglaToEnglishMap = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    };
    
    let normalizedText = text.replace(/[০-৯]/g, s => banglaToEnglishMap[s]);
    
    // Parsing Logic
    let parsedAmount = normalizedText.match(/\d+/);
    if (parsedAmount) parsedAmount = parseInt(parsedAmount[0]);

    let parsedType = 'expense'; // Default
    const incomeKeywords = ['পেলাম', 'জমা', 'আয়', 'আসল', 'বেতন', 'স্যালারি', 'বকশিশ', 'উপহার', 'পাবো', 'ঢুকলো', 'ইনকাম', 'রিসিভড', 'পেয়েছি'];
    const expenseKeywords = ['খরচ', 'দিলাম', 'গেল', 'কিনলাম', 'কেনাকাটা', 'ভাড়া', 'বিল', 'পেমেন্ট', 'ব্যয়', 'মাইনাস', 'দিয়েছি'];

    if (incomeKeywords.some(word => normalizedText.includes(word))) {
        parsedType = 'income';
    } else if (expenseKeywords.some(word => normalizedText.includes(word))) {
        parsedType = 'expense';
    }

    let parsedCategory = 'Other';
    const catMap = {
        'খাবার': 'Food',
        'নাস্তা': 'Food',
        'বেতন': 'Salary',
        'স্যালারি': 'Salary',
        'ভাড়া': 'Rent',
        'বিদ্যুৎ': 'Utilities',
        'গ্যাস': 'Utilities',
        'পানি': 'Utilities',
        'যাতায়াত': 'Transportation',
        'রিকশা': 'Transportation',
        'বাস': 'Transportation',
        'শপিং': 'Shopping',
        'বাজার': 'Shopping',
        'উপহার': 'Gift',
        'ফ্রিল্যান্স': 'Freelance',
        'ইনভেস্ট': 'Investments',
        'মেডিসিন': 'Health',
        'ডাক্তার': 'Health',
        'মুভি': 'Entertainment'
    };

    for (const [key, value] of Object.entries(catMap)) {
        if (normalizedText.includes(key)) {
            parsedCategory = value;
            break;
        }
    }

    // Date Logic
    let parsedDate = new Date();
    if (normalizedText.includes('কাল') || normalizedText.includes('গতকাল')) {
        parsedDate.setDate(parsedDate.getDate() - 1);
    } else if (normalizedText.includes('পরশু')) {
        parsedDate.setDate(parsedDate.getDate() - 2);
    }

    // Auto-fill and Add
    if (parsedAmount) {
        // Construct English Description based on category and type
        let englishDescription = parsedCategory + (parsedType === 'income' ? ' (Received)' : ' (Spent)');
        
        // Try to refine description if possible (e.g. if specific item mentioned)
        // For now, sticking to category-based for reliability as per core requirement
        
        description.value = englishDescription; 
        amount.value = parsedAmount;
        type.value = parsedType;
        updateCategories();
        category.value = parsedCategory;
        date.valueAsDate = parsedDate;

        // Auto add
        document.getElementById('submit-btn').click();
        
        // Notification
        showNotification(`Success: ${parsedAmount} added for ${parsedCategory}`);
    } else {
        showNotification("Couldn't detect amount. Try again.");
    }
}

function showNotification(msg) {
    // Simple toast or alert
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-pulse';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

voiceFab.addEventListener('click', () => {
    if (recognition) {
        try {
            recognition.start();
        } catch (e) {
            recognition.stop();
        }
    } else {
        alert("Speech Recognition not supported in this browser.");
    }
});

closeVoiceBtn.addEventListener('click', () => {
    if (recognition) recognition.stop();
    stopVoiceUI();
});

// Init on load
init();
